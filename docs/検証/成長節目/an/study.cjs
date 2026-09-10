'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../統合試作/deck_feedback_trial');
const cfg=require('./conditions.json'),{load}=require(path.join(root,'posture_am/load.cjs'));
const runtime=load(cfg.variant),{AH,AI}=runtime,{Session}=runtime.req('posture_am/session.js');
const source=require(path.join(root,'input.json'));
const seeds=JSON.parse(cp.execFileSync('python3',[path.join(root,'reward_build_inputs.py')],{maxBuffer:32e6}));
const copy=AH.copy,total=p=>p.points+Object.values(p.learned).reduce((a,b)=>a+b,0);
const sum=a=>a.reduce((x,y)=>x+y,0),average=a=>a.length?sum(a)/a.length:null;
const histogram=items=>items.reduce((out,x)=>(out[x]=(out[x]||0)+1,out),{});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sourcePaths=['input.json','choice_inputs.json','reward_build_inputs.py','expedition_choices.js','reward_preparation.js','expedition_loop.js','terrain.js','knowledge.js','information.js','engine.js','posture_am/load.cjs','posture_am/engine.js','posture_am/conditions.json','posture_am/selection.json','posture_am/session.js','posture_am/journey-results.json'];
const sources=Object.fromEntries(sourcePaths.map(p=>[p,hash(path.join(root,p))]));
let restores=0,settlements=0,actions=0;
const repetition=[];
for(const learning of cfg.repetition.learning_policies)for(const offset of cfg.seed_offsets){
  const bank=seeds.map((_,i)=>seeds[(offset+i)%seeds.length]),s=new Session(source,bank),runs=[];
  assert.equal(total(s.data.profile),0);
  while(total(s.data.profile)<cfg.repetition.target_total_points&&runs.length<cfg.repetition.max_expeditions){
    if(s.data.phase==='return')s.home();
    const before=total(s.data.profile),skills=[];let spent=0;
    if(learning==='learn_affordable')for(const id of cfg.repetition.learning_priority){
      if(spent+AH.cfg.skills[id].cost<=before){skills.push(id);spent+=AH.cfg.skills[id].cost;}
    }
    s.depart(cfg.repetition.route,s.data.counts,skills);
    while(!s.game.s.outcome&&!Object.values(s.game.s.rewards).some(r=>r.protected)){
      s.action(AH.choose(s.game,cfg.repetition.policy));actions++;
    }
    const boundaryOutcome=s.game.s.outcome||null;
    if(!s.game.s.outcome){
      const next=new Session(source,bank,s.save());assert.deepEqual(next.save(),s.save());
      const player=copy(s.game.s.actors.P);s.withdraw();next.withdraw();
      assert.deepEqual(s.save(),next.save());assert.deepEqual(player,s.game.s.actors.P);restores++;
    }
    assert.notEqual(s.game.s.outcome,'cutoff');
    assert.equal(total(s.data.profile),before+s.data.receipt.gained_points);
    assert.deepEqual(AH.finish(s.data.profile,s.game),s.data.profile);settlements++;
    runs.push({index:runs.length,seed:bank[runs.length%bank.length].seed,skills,
      outcome:s.game.s.outcome,boundaryOutcome,actions:s.game.s.actors.P.actions,hp:s.game.s.actors.P.hp,
      gained:s.data.receipt.gained_points,total:total(s.data.profile),available:s.data.profile.points,
      learned:copy(s.data.profile.learned),kept:copy(s.data.receipt.kept),lost:copy(s.data.receipt.lost),
      clears:[...s.data.profile.clears],destinations:AH.destinations(s.data.profile)});
  }
  if(s.data.phase==='return')s.home();
  const reached=total(s.data.profile)>=cfg.repetition.target_total_points;
  if(reached){const plan=s.plan(s.data.counts,Object.keys(AH.cfg.skills));assert.equal(Object.keys(plan.profile.learned).length,4);assert.equal(total(plan.profile),total(s.data.profile));}
  repetition.push({learning,offset,reached,runs,expeditions:runs.length,actions:sum(runs.map(r=>r.actions)),
    total:total(s.data.profile),clears:[...s.data.profile.clears],destinations:AH.destinations(s.data.profile)});
}
const power=[];
for(const route of cfg.power_probe.routes)for(const skills of cfg.power_probe.skill_sets)for(const policy of cfg.power_probe.policies)for(const seed of cfg.seed_offsets){
  const profile=AH.reallocate(AH.initialProfile(cfg.power_probe.initial_points),skills);
  const counts=AH.countsFor(source,cfg.power_probe.build);
  const {game,bundle}=runtime.depart(source,seeds[seed],profile,counts,route,`AN1-power-${route}-${skills.join('+')}-${policy}-${seed}`,{comparison:true});
  game.advance();let restored=false;
  while(!game.s.outcome){
    const choice=AH.choose(game,policy);
    if(!restored&&game.s.actors.P.actions>=10){
      const next=new AI.Game(bundle,game.save());assert.deepEqual(next.save(),game.save());
      game.step(choice);game.advance();next.step(choice);next.advance();assert.deepEqual(next.save(),game.save());restores++;restored=true;
    }else {game.step(choice);game.advance();}
    actions++;
  }
  assert.notEqual(game.s.outcome,'cutoff');
  power.push({route,skills,policy,seed,outcome:game.s.outcome,actions:game.s.actors.P.actions,hp:game.s.actors.P.hp,
    signature:crypto.createHash('sha256').update(JSON.stringify(game.save())).digest('hex')});
}
assert.equal(power.length,384);
const old=require(path.join(root,'posture_am/journey-results.json'));
const natural=old.rows.map(row=>{
  let earned=0;return {route:row.route,seed:row.seed,stages:['first','C','retry'].filter(k=>row[k]).map(k=>{
    const r=row[k];earned+=r.receipt.gained_points;const spent=k==='first'?0:2;
    assert.equal(r.points+spent,earned);
    return {stage:k,outcome:r.outcome,actions:r.actions,gained:r.receipt.gained_points,total:earned,available:r.points,spent};
  })};
});
const repetitionSummary=cfg.repetition.learning_policies.map(learning=>{
  const rows=repetition.filter(r=>r.learning===learning),runs=rows.flatMap(r=>r.runs),reached=rows.filter(r=>r.reached);
  return {learning,cohorts:rows.length,reached:reached.length,expeditions:histogram(rows.map(r=>r.expeditions)),
    minActions:Math.min(...reached.map(r=>r.actions)),maxActions:Math.max(...reached.map(r=>r.actions)),averageActions:average(reached.map(r=>r.actions)),
    outcomes:histogram(runs.map(r=>r.outcome)),totalPoints:histogram(rows.map(r=>r.total)),
    routeClearCount:rows.filter(r=>r.clears.length).length,cOpened:rows.filter(r=>r.destinations.includes('C')).length};
});
const powerSummary=cfg.power_probe.routes.flatMap(route=>cfg.power_probe.skill_sets.map(skills=>{
  const rows=power.filter(r=>r.route===route&&JSON.stringify(r.skills)===JSON.stringify(skills)),clears=rows.filter(r=>r.outcome==='clear');
  return {route,skills,n:rows.length,clears:clears.length,meanClearActions:average(clears.map(r=>r.actions)),meanClearHP:average(clears.map(r=>r.hp))};
}));
const paired=cfg.power_probe.routes.map(route=>{
  const rows=power.filter(r=>r.route===route&&r.skills.length===4),base=power.filter(r=>r.route===route&&r.skills.length===1);
  const pairs=rows.map(r=>[base.find(b=>b.seed===r.seed&&b.policy===r.policy),r]);
  const both=pairs.filter(([a,b])=>a.outcome==='clear'&&b.outcome==='clear');
  return {route,bothClear:both.length,oneSkillMeanActions:average(both.map(([a])=>a.actions)),allSkillsMeanActions:average(both.map(([,b])=>b.actions)),
    newClear:pairs.filter(([a,b])=>a.outcome!=='clear'&&b.outcome==='clear').length,
    lostClear:pairs.filter(([a,b])=>a.outcome==='clear'&&b.outcome!=='clear').length};
});
const naturalSummary=['A','B'].map(route=>{
  const rows=natural.filter(r=>r.route===route),c=rows.flatMap(r=>r.stages.filter(s=>s.stage==='C'));
  return {route,starts:rows.length,cAttempts:c.length,cClear:c.filter(r=>r.outcome==='clear').length,
    totalAfterCClear:histogram(c.filter(r=>r.outcome==='clear').map(r=>r.total)),
    totalAfterAllRecordedStages:histogram(rows.map(r=>r.stages.at(-1).total))};
});
for(const [p,h]of Object.entries(sources))assert.equal(hash(path.join(root,p)),h);
const out={trial:cfg.trial,base_commit:cfg.base_commit,conditions_sha256:hash(path.join(__dirname,'conditions.json')),
  sources,checks:{restores,settlements,player_actions:actions,power_comparisons:power.length,repetition_cohorts:repetition.length},
  summary:{repetition:repetitionSummary,power:powerSummary,paired,natural:naturalSummary},repetition,power,natural};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(out,null,2)+'\n');
process.stdout.write(JSON.stringify({checks:out.checks,summary:out.summary},null,2)+'\n');
