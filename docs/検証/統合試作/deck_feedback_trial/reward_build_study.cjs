'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const AH=require('./expedition_choices.js'),P=require('./reward_preparation.js'),L=require('./expedition_loop.js');
const source=require('./input.json'),{cfg}=P,copy=AH.copy;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const raw=spawnSync('python3',[path.join(__dirname,'reward_build_inputs.py')],{encoding:'utf8',maxBuffer:32*1024*1024});
assert.equal(raw.status,0,raw.stderr);const inputs=JSON.parse(raw.stdout);
const builds=Object.fromEntries(Object.keys(cfg.builds).map(id=>[id,P.countsFor(source,id)]));
const checks={deck_plans:0,selected_predictions:0,content_transitions:0,borrowed_hand_knowledge:0};
function controlledProfile(id,skills){
  const p=AH.initialProfile(cfg.budget);p.unlocked.push(...cfg.builds[id].unlocks);
  return AH.reallocate(p,skills);
}
for(const [id,counts] of Object.entries(builds)){
  const p=controlledProfile(id,[]),before=AH.countsFor(source,cfg.builds[id].base);
  const a=P.plan(source,p,before,counts,['PS02']);
  assert.equal(a.view.points.after,0);assert.equal(a.view.points.spent,2);
  assert.deepEqual(a.view.composition_before.attributes,a.view.composition_after.attributes);
  const b=P.plan(source,a.profile,counts,counts,['PS03']);
  assert.equal(b.view.points.refunded,2);assert.equal(b.view.points.spent,2);assert.equal(b.view.points.after,0);
  assert.deepEqual(b.view.deck_change,[]);assert.equal(b.profile.points,0);
  checks.deck_plans++;
}
{
  const p=AH.initialProfile(2),before=hash(p),initial=builds.I_guard3;
  assert.throws(()=>P.plan(source,p,initial,builds.A_brace1_guard3,['PS02']),/Unavailable/);
  assert.throws(()=>P.plan(source,p,initial,{...initial,f:3},['PS02']),/Invalid count/);
  assert.throws(()=>P.plan(source,p,initial,initial,['PS02','PS03']),/Insufficient/);
  assert.equal(hash(p),before);
  assert.throws(()=>P.plan(source,{...p,phase:'exploring'},initial,initial,[]),/requires return/);
  const a=P.depart(source,inputs[0],p,initial,'AI-baseline','C32',{comparison:true});
  const b=AH.depart(source,inputs[0],p,initial,'C','AI-baseline',{comparison:true});
  assert.deepEqual(a.game.save(),b.game.save());assert.deepEqual(a.bundle,b.bundle);
  const c=P.depart(source,inputs[0],p,initial,'AI-baseline','C24',{comparison:true});
  const expected=copy(b.bundle);expected.actor_specs.V0.hp=24;
  expected.initial.state.actors.V0.hp=expected.initial.state.actors.V0.max_hp=24;
  assert.deepEqual(c.bundle,expected);
}
function play(out,policy){
  const g=out.game,metrics={first_stage:null,player:{pre:{actions:0,borrowed:0},post:{actions:0,borrowed:0}},
    selected_rewards:{},triggers:{PS02:0,PS03:0,PS04:0},heal_used:0,heal_restored:0};
  while(!g.s.outcome){
    g.advance();if(g.s.outcome)break;
    const ch=AH.choose(g,policy),c=g.s.cards[ch.card_id],v=g.predict(ch),n=g.trace.length;
    const own={hp:g.s.actors.P.hp};
    g.step(ch);
    const action=g.trace.slice(n).findLast(r=>r.type==='action'&&r.actor==='P');
    for(const k of ['actual_hp_loss','hit_gain','hp_restored','mode','action_cost'])assert.deepEqual(action[k],v[k]);
    checks.selected_predictions++;
    const phase=metrics.first_stage?'post':'pre';metrics.player[phase].actions++;
    if(c.origin!=='P')metrics.player[phase].borrowed++;
    if(['brace','stored','sharp'].includes(c.type)){
      const key=c.type+'/'+c.origin+'/'+action.mode;metrics.selected_rewards[key]=(metrics.selected_rewards[key]||0)+1;
    }
    for(const id of action.passives)metrics.triggers[id]++;
    if(action.mode==='heal'){metrics.heal_used++;metrics.heal_restored+=action.hp_restored;}
    const event=g.s.events.find(e=>e.victim==='V0'&&e.event==='traversed');
    if(event&&!metrics.first_stage){
      metrics.first_stage={actions:g.s.actors.P.actions,hp:g.s.actors.P.hp,player_rebuilds:g.s.actors.P.rebuilds,
        support_active:!!g.s.actors.V1?.active,pending:copy(g.s.ah.pending)};
      assert(g.s.actors.E1?.active,'Goal enemy must enter after passage');checks.content_transitions++;
    }
    // No independent passive or HP reset is applied by this adapter.
    assert.equal(g.s.actors.P.hp,own.hp+action.hp_restored);
  }
  const actions=g.trace.filter(r=>r.type==='action');
  const rewardExternal={};
  for(const a of actions)if(a.actor!=='P'){
    const c=g.s.cards[a.card_id];if(c.origin==='P'&&['brace','stored','sharp'].includes(c.type)){
      const key=c.type+'/'+a.actor+'/'+a.mode;rewardExternal[key]=(rewardExternal[key]||0)+1;
    }
  }
  return {outcome:g.s.outcome,actions:g.s.actors.P.actions,hp:g.s.actors.P.hp,time:g.s.now,
    kept:g.s.settlement?.kept||[],lost:g.s.settlement?.lost||[],
    events:g.s.events.map(e=>({victim:e.victim,event:e.event,actions:e.P_actions})),...metrics,reward_external:rewardExternal,
    state_sha256:hash(g.save())};
}
const runs=[];
for(const cohort of ['main','unseen']){
  const seeds=cohort==='main'?cfg.main_seeds:cfg.unseen_seeds;
  const ids=cohort==='main'?Object.keys(builds):cfg.unseen_builds;
  const skillSets=cohort==='main'?cfg.skill_sets:cfg.unseen_skills;
  for(const variant of Object.keys(cfg.variants))for(const id of ids)for(const skills of skillSets)for(const policy of cfg.policies)for(const seed of seeds){
    const skill=skills.join('+')||'none',run=`AI-${cohort}-${variant}-${id}-${skill}-${policy}-${seed}`;
    const out=P.depart(source,inputs[seed],controlledProfile(id,skills),builds[id],run,variant,{comparison:true});
    runs.push({cohort,variant,build:id,skill,policy,seed,budget:2,...play(out,policy)});
  }
  console.error(cohort+': '+runs.length+' runs complete');
}
assert.equal(runs.length,1344);
const journeys=[];
for(const entrance of cfg.journey.entrances)for(const seed of cfg.journey.seeds){
  const init=AH.initialProfile(),counts=builds.I_guard3;
  const first=AH.depart(source,inputs[seed],init,counts,entrance,`AI-entry-${entrance}-${seed}`);
  first.game=new P.Game(first.bundle);
  // Entrance traversal semantics differ; use the existing engine directly here.
  while(!first.game.s.outcome){first.game.advance();if(!first.game.s.outcome)first.game.step(AH.choose(first.game,cfg.journey.policy));}
  const entry={outcome:first.game.s.outcome,actions:first.game.s.actors.P.actions};
  const record={entrance,seed,entry,branches:[]};journeys.push(record);
  if(entry.outcome!=='clear')continue;
  const returned=AH.finish(first.profile,first.game),owned=entrance==='A'?'brace':'stored';
  assert(returned.unlocked.includes(owned));assert(AH.destinations(returned).includes('C'));
  record.earned={points:returned.points,unlocked:returned.unlocked,materials:returned.materials};
  for(const branch of cfg.journey.variants){
    const id=branch==='keep_initial'?'I_guard3':entrance==='A'?'A_brace1_guard3':'B_stored1_guard3';
    let profile=returned;const prepared=P.plan(source,profile,counts,builds[id],[cfg.journey.first_skill]);
    profile=prepared.profile;const attemptSeed=(seed+1)%8;
    const out=P.depart(source,inputs[attemptSeed],profile,builds[id],`AI-natural-${entrance}-${seed}-${branch}`);
    const result=play(out,cfg.journey.policy),next=AH.finish(out.profile,out.game);
    assert(next.unlocked.includes(owned));assert.deepEqual(next.materials.M||0,(profile.materials.M||0)+(result.outcome==='clear'?out.game.s.settlement.kept.reduce((n,k)=>n+AH.cfg.routes.C.rewards[out.game.s.rewards[k].source].filter(x=>x.kind==='material').reduce((a,x)=>a+x.amount,0),0):0));
    const item={branch,build:id,preparation:prepared.view,seed:attemptSeed,...result,retry:null};record.branches.push(item);
    if(result.outcome==='defeat'){
      const change=P.plan(source,next,builds[id],builds[id],[cfg.journey.retry_skill]);
      assert.equal(change.view.points.refunded,2);assert.equal(change.view.points.spent,2);
      assert.equal(change.profile.points,next.points);assert.deepEqual(change.profile.knowledge,next.knowledge);
      const retrySeed=(seed+2)%8;
      const retry=P.depart(source,inputs[retrySeed],change.profile,builds[id],`AI-retry-${entrance}-${seed}-${branch}`);
      const retryResult=play(retry,cfg.journey.policy);
      const final=AH.finish(retry.profile,retry.game);assert(final.unlocked.includes(owned));
      item.retry={seed:retrySeed,preparation:change.view,...retryResult};
    }
  }
}
{
  const out=P.depart(source,inputs[1],AH.initialProfile(2),builds.I_guard3,'AI-hand-ledger','C32',{comparison:true});
  const g=out.game;
  while(!g.s.outcome){g.advance();if(g.s.actors.P.actions===26||g.s.outcome)break;g.step(AH.choose(g,'progress_first'));}
  assert.equal(g.s.actors.P.actions,26);assert(!g.s.outcome);
  const event=g.s.ah.knowledge.events.find(e=>e.kind==='observed_card'&&e.actor==='P'&&e.profile==='C/E1'&&e.card.type==='j');
  assert(event,'Newly seen borrowed hand must be recorded');
  assert(!g.s.ah.knowledge.events.some(e=>e.kind==='initial_catalogue_grant'&&e.profile==='C/E1'));
  const restored=new P.Game(out.bundle,g.save());assert.deepEqual(restored.save(),g.save());
  // Settlement fixture: it checks retention, not a claimed natural defeat.
  restored.settle('defeat');const returned=AH.finish(out.profile,restored);
  assert(returned.knowledge.events.some(e=>e.id===event.id));checks.borrowed_hand_knowledge++;
}
function aggregate(keys){
  const groups={};for(const r of runs){const id=keys.map(k=>r[k]).join('/');
    const a=groups[id]??={n:0,clear:0,defeat:0,cutoff:0,actions:0,enemy_reached:0,entry_actions:0,entry_hp:0,heal_used:0};
    a.n++;a[r.outcome]++;a.actions+=r.actions;a.heal_used+=r.heal_used;
    if(r.first_stage){a.enemy_reached++;a.entry_actions+=r.first_stage.actions;a.entry_hp+=r.first_stage.hp;}}
  return groups;
}
const result={trial:cfg.trial,base_commit:cfg.base_commit,inputs_sha256:hash(cfg),builds,checks,
  by_cohort_variant:aggregate(['cohort','variant']),by_build:aggregate(['cohort','variant','build']),
  by_skill:aggregate(['cohort','variant','skill']),by_policy:aggregate(['cohort','variant','policy']),journeys};
fs.writeFileSync(path.join(__dirname,'reward_build_results.json'),JSON.stringify(result,null,2).slice(0,-2)+',\n  "runs": [\n'+runs.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ]\n}\n');
console.log(JSON.stringify({checks,by_cohort_variant:result.by_cohort_variant,by_build:result.by_build,
  by_skill:result.by_skill,by_policy:result.by_policy,
  journeys:journeys.map(j=>({entrance:j.entrance,seed:j.seed,entry:j.entry,branches:j.branches.map(b=>({branch:b.branch,outcome:b.outcome,retry:b.retry?.outcome}))}))},null,2));
