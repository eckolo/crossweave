'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const {load,conditions:cfg}=require('./load.cjs'),source=require('../input.json');
const seeds=JSON.parse(cp.execFileSync('python3',[path.join(__dirname,'../reward_build_inputs.py')],{maxBuffer:32e6}));
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const variants=process.argv[2]?process.argv[2].split(','):Object.keys(cfg.variants);
const cohort=process.argv[3]||'main',bank=cfg[cohort+'_seeds'];assert(bank);
let predictions=0,restores=0;
const rows=[];
function run(runtime,profile,counts,route,seed,policy,id){
  const {AH,AI}=runtime,out=runtime.depart(source,seeds.find(s=>s.seed===seed),profile,counts,route,id,{comparison:true});
  let g=out.game,savedOnce=false;const actions=[];
  const instrument=()=>{
    const original=g.play;
    g.play=function(w,ch){
      const pred=this.predict(ch,w),before=this.s.actors.P.hp;
      original.call(this,w,ch);const row=[...this.trace].reverse().find(x=>x.type==='action');
      // Resolve public predictions for every actor; learned bonuses apply to P.
      for(const key of ['actual_hp_loss','hp_restored','hit_gain','mode'])assert.equal(row[key],pred[key],id+': '+w+'/'+key);
      if(w==='P')assert.equal(row.action_cost,pred.action_cost,id+': action_cost');
      if(runtime.variant.engine==='AM1')for(const key of ['posture_before','posture_after','posture_overflow','posture_multiplier'])assert.equal(row[key],pred[key],id+': '+key);
      predictions++;
      actions.push({actor:w,target:ch.target,mode:row.mode,gain:row.hit_gain,connected:row.hit_connected,damage:row.actual_hp_loss,
        purpose:ch.target?this.bundle.actor_specs[ch.target]?.purpose:null,P_hp:before,posture:row.posture_before});
    };
  };instrument();
  while(!g.s.outcome){
    g.advance();if(g.s.outcome)break;
    if(!savedOnce&&g.s.actors.P.actions>=9){
      const saved=g.save(),h=hash(saved);g=new AI.Game(out.bundle,saved);assert.equal(hash(g.save()),h);savedOnce=true;restores++;instrument();
    }
    g.step(AH.choose(g,policy));
  }
  const player=actions.filter(a=>a.actor==='P'&&a.mode==='attack');
  const group=purpose=>{const all=player.filter(a=>a.purpose===purpose);return {attacks:all.length,breaks:all.filter(a=>a.connected).length,progress:all.filter(a=>a.damage>0).length,zero_gain:all.filter(a=>a.gain===0).length,blocked:all.filter(a=>a.connected&&a.damage===0).length};};
  const first=g.s.events.find(e=>e.victim==='V0'&&e.event==='traversed');
  return {outcome:g.s.outcome,actions:g.s.actors.P.actions,hp:g.s.actors.P.hp,rebuilds:g.s.actors.P.rebuilds,
    first_passage:first?.P_actions??null,road:group('passage'),fog:group('terminal'),support:group('support'),
    state_sha256:hash(g.save()),earned:g.s.outcome==='cutoff'?null:AH.finish(out.profile,g).points-profile.points};
}
for(const id of variants){
  const runtime=load(id),{AH}=runtime;
  for(const route of cfg.routes)for(const build of cfg.builds)for(const skills of cfg.skills)for(const policy of cfg.policies)for(const seed of bank){
    const profile=AH.reallocate(AH.initialProfile(2),skills),counts=AH.countsFor(source,build);
    const key=[id,route,build,skills.join('+')||'none',policy,seed].join('/');
    rows.push({variant:id,route,build,skills,policy,seed,...run(runtime,profile,counts,route,seed,policy,key)});
  }
  console.log(JSON.stringify({completed:id,cohort,runs:rows.filter(r=>r.variant===id).length}));
}
const mean=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*100)/100:null;
function summary(rs){
  const clear=rs.filter(r=>r.outcome==='clear');
  return {n:rs.length,clear:clear.length,defeat:rs.filter(r=>r.outcome==='defeat').length,cutoff:rs.filter(r=>r.outcome==='cutoff').length,
    clear_actions:mean(clear.map(r=>r.actions)),all_actions:mean(rs.map(r=>r.actions)),clear_hp:mean(clear.map(r=>r.hp)),
    ...Object.fromEntries(['road','fog','support'].map(k=>[k,Object.fromEntries(Object.keys(rs[0][k]).map(metric=>[metric,rs.reduce((n,r)=>n+r[k][metric],0)]))]))};
}
const aggregate=variants.map(variant=>({variant,total:summary(rows.filter(r=>r.variant===variant)),routes:Object.fromEntries(cfg.routes.map(route=>[route,summary(rows.filter(r=>r.variant===variant&&r.route===route))]))}));
const result={trial:'AM1',cohort,conditions_sha256:hash(fs.readFileSync(path.join(__dirname,'conditions.json'),'utf8')),seed_bank_sha256:hash(seeds),predictions,restores,aggregate,rows};
fs.writeFileSync(path.join(__dirname,cohort+'-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({predictions,restores,aggregate},null,2));
