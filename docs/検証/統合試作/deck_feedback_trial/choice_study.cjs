'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const AH=require('./expedition_choices.js'),source=require('./input.json');
const {cfg,copy}=AH,hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const generated=spawnSync('python3',[path.join(__dirname,'choice_inputs.py')],{encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(generated.status,0,generated.stderr);const inputs=JSON.parse(generated.stdout);
const checks={predicted_actions:0,prediction_purity:0,resumed_steps:0,continuing_actors:0,card_effect_restorations:0};
class Checked extends AH.Game{
  play(w,ch){
    const before=copy(this.s.cards[ch.card_id]);
    const purity=this.s.actors[w].actions===0,saved=purity?hash(this.save()):null,prediction=this.predict(ch,w);
    if(purity){assert.equal(hash(this.save()),saved);checks.prediction_purity++;}
    const hp=this.s.actors[w].hp,start=this.trace.length;
    super.play(w,ch);
    const row=this.trace.slice(start).findLast(r=>r.type==='action'&&r.actor===w);
    for(const key of ['mode','actual_hp_loss','hit_gain','hit_connected','hp_restored','crit_added','action_cost'])assert.deepEqual(row[key],prediction[key],key);
    if(prediction.guard)assert.deepEqual(this.s.actors[w].guard,prediction.guard);
    assert.equal(this.s.actors[w].hp-hp,row.hp_restored);
    for(const key of ['power','hit','field_power','field_hit','crit_gain'])assert.equal(this.s.cards[ch.card_id][key],before[key]);
    checks.predicted_actions++;checks.card_effect_restorations++;
  }
  dispatch(victim,attacker){
    const before=copy(this.s.actors),pending=copy(this.s.ah.pending);
    super.dispatch(victim,attacker);
    for(const [w,a] of Object.entries(before))if(w!==victim&&a.active&&this.s.actors[w].active){
      assert.deepEqual(this.s.actors[w],a,'Continuing actor was reset');checks.continuing_actors++;
    }
    assert.deepEqual(this.s.ah.pending,pending,'Boundary reset passive state');
  }
}
const builds=Object.fromEntries(cfg.builds.map(b=>[b,AH.countsFor(source,b)]));
function fixture(route='A',skills=[],seed=0,run='fixture'){
  const profile=AH.reallocate(AH.initialProfile(skills.length*2),skills);
  const out=AH.depart(source,inputs[seed],profile,builds.guard5,route,run,{comparison:true});
  out.game=new Checked(out.bundle);return out;
}
function drive(out,policy,stop=null,resume=false){
  const g=out.game;let checked=false;
  while(!g.s.outcome){
    g.advance();if(g.s.outcome)break;
    if(stop?.(g)){g.settle('withdrawal');break;}
    const ch=AH.choose(g,policy);
    if(resume&&!checked&&g.s.actors.P.actions===6){
      const saved=g.save(),restored=new AH.Game(out.bundle,copy(saved));
      assert.deepEqual(restored.save(),saved);assert.deepEqual(AH.choose(restored,policy),ch);
      restored.step(ch);restored.advance();g.step(ch);g.advance();
      assert.deepEqual(g.save(),restored.save());checks.resumed_steps++;checked=true;
    }else g.step(ch);
  }
  return out;
}
function summarize(out,meta){
  const g=out.game,actions=g.trace.filter(r=>r.type==='action'&&r.actor==='P');
  const phase=rows=>({actions:rows.length,borrowed:rows.filter(r=>r.origin!=='P').length,
    attack:rows.filter(r=>r.mode==='attack').length,guard:rows.filter(r=>r.mode==='guard').length,
    place:rows.filter(r=>r.mode==='place').length,damage:rows.reduce((n,r)=>n+r.actual_hp_loss,0)});
  const triggers=Object.fromEntries(Object.keys(cfg.skills).map(id=>[id,actions.filter(r=>r.passives.includes(id)).length]));
  return {...meta,outcome:g.s.outcome,actions:g.s.actors.P.actions,hp:g.s.actors.P.hp,time:g.s.now,
    kept:g.s.settlement?.kept||[],lost:g.s.settlement?.lost||[],
    points:g.s.settlement?AH.finish(out.profile,g).points-out.profile.points:0,
    events:copy(g.s.events),triggers,before_rebuild:phase(actions.filter(r=>r.player_rebuilds===0)),
    after_rebuild:phase(actions.filter(r=>r.player_rebuilds>0)),
    action_signature:hash(actions.map(r=>[r.card_id,r.target,r.mode])),
    state_signature:hash(g.save()),knowledge_events:g.s.ah.knowledge.events.length};
}

// Wiring fixtures are separate from naturally reached matrix outcomes.
const unit=[];
{
  let p=AH.initialProfile(6);p.materials.M=3;p.unlocked.push('brace');
  p=AH.reallocate(p,['PS01','PS02']);assert.equal(p.points,2);
  p=AH.reallocate(p,['PS03']);assert.equal(p.points,4);
  p=AH.reallocate(p,[]);assert.equal(p.points,6);assert.equal(p.materials.M,3);assert(p.unlocked.includes('brace'));
  assert.deepEqual(AH.reallocate(p,[]),p);
  assert.throws(()=>AH.reallocate(AH.initialProfile(),['PS01']),/Insufficient/);
  assert.throws(()=>AH.reallocate(p,['PS01','PS01']),/Duplicate/);
  const old=copy(p);old.points=0;old.learned={PS01:5};assert.equal(AH.reallocate(old,[]).points,5);
  const out=fixture('A',['PS01']);assert.throws(()=>AH.reallocate(out.profile,[]),/requires return/);
  assert.throws(()=>AH.depart(source,inputs[0],p,builds.guard5,'C','locked'),/locked/);
  unit.push('Full historical-cost refund, atomic rejection, idempotent respec, holdings preserved, no in-run learning, C initially locked');
}
function rig(g,type,matched=true){
  // Explicit synthetic fixture: rearrange known locations, never part of the outcome matrix.
  const p=g.s.actors.P;p.deck.push(...p.hand);p.hand=[];
  const id=p.deck.find(id=>g.s.cards[id].type===type);assert(id);
  p.deck.splice(p.deck.indexOf(id),1);p.hand=[id];g.s.cards[id].remaining=g.s.cards[id].life;
  const c=g.s.cards[id];
  for(const field of Object.values(g.s.field))g.recover(field,'fixture_clear');g.s.field={};
  if(matched){const material=g.newCard('E1','initial',c.attr);g.s.field[c.attr]=material;}
  g.s.ready=true;g.assert();return {card_id:id,target:matched&&c.kind==='attack'?'E1':null};
}
{
  const {game:g}=fixture('A',['PS01','PS02','PS03','PS04']);
  let ch=rig(g,'g');g.play('P',ch);assert(g.s.ah.pending.after_guard);
  ch=rig(g,'f',false);assert.equal(g.predict(ch).action_cost,8);g.play('P',ch);assert(!g.s.ah.pending.after_guard);
  ch=rig(g,'l',true);const last=g.s.ah.pending.last_match_attr;assert.equal(last,'D');assert(g.predict(ch).passives.includes('PS02'));
  g.play('P',ch);assert.equal(g.s.cards[ch.card_id].hit,50);
  ch=rig(g,'r');g.s.ah.pending.borrowed_guard=true;assert(g.predict(ch).passives.includes('PS03'));g.play('P',ch);assert(!g.s.ah.pending.borrowed_guard);
  ch=rig(g,'g');g.s.cards[ch.card_id].origin='E1';g.play('P',ch);assert(g.s.ah.pending.borrowed_guard);
  ch=rig(g,'salve');g.s.actors.P.hp=30;assert.equal(g.predict(ch).hp_restored,20);g.play('P',ch);assert(g.s.cards[ch.card_id].destroyed);
  unit.push('PS01 one-action expiry, PS02 previous matched attribute, PS03 consumption and borrowed rearm, PS04 healing and destruction');
}
{
  const {game:g,bundle}=fixture('B');
  // Direct boundary fixture confirms floor and continuation without reporting a natural traversal.
  g.s.actors.V0.hp=0;g.dispatch('V0','P');g.s.actors.V1.hp=1;
  let ch=rig(g,'h');ch.target='V1';g.s.actors.V1.hit=99;
  assert.equal(g.predict(ch).actual_hp_loss,0);g.play('P',ch);assert.equal(g.s.actors.V1.hp,1);
  assert.equal(Object.keys(g.s.rewards).length,1);assert(!g.s.outcome);
  const restored=new AH.Game(bundle,g.save());assert.deepEqual(restored.save(),g.save());
  unit.push('Weak-environment HP floor gives no extra reward or clear; replacement and save preserve state');
}
const runs=[];
for(const route of Object.keys(cfg.routes))for(const build of cfg.builds)for(const skills of cfg.skill_sets)for(const policy of cfg.policies)for(const input of inputs){
  const skill=skills.join('+')||'none',run=`AH-${route}-${build}-${skill}-${policy}-${input.seed}`;
  const profile=AH.reallocate(AH.initialProfile(skills.length*2),skills);
  const out=AH.depart(source,input,profile,builds[build],route,run,{comparison:true});out.game=new Checked(out.bundle);
  drive(out,policy,null,true);runs.push(summarize(out,{route,build,skill,budget:skills.length*2,policy,seed:input.seed}));
}
assert.equal(runs.length,672);

// Predeclared sequence: A seed0 -> free respec -> B seed1 -> C if eligible.
// Starting skill budget is zero; no grant is invented if the first attempt fails.
let profile=AH.initialProfile();const journey=[];
for(const [i,route] of ['A','B','C'].entries()){
  if(!AH.destinations(profile).includes(route)){journey.push({route,skipped:'still_locked'});continue;}
  const total=profile.points+Object.values(profile.learned).reduce((a,b)=>a+b,0);
  const desired=total>=2?[i===1?'PS02':'PS04']:[];
  profile=AH.reallocate(profile,desired);
  const out=AH.depart(source,inputs[i],profile,builds.guard5,route,'AH-journey-'+i);out.game=new Checked(out.bundle);
  drive(out,'progress_first');journey.push(summarize(out,{route,seed:i,learned:desired,points_before:profile.points}));
  if(!out.game.s.settlement)break;
  profile=AH.finish(out.profile,out.game);assert.deepEqual(AH.finish(profile,out.game),profile);
  const record=journey.at(-1);record.points_after=profile.points;record.clears=[...profile.clears];record.unlocked=[...profile.unlocked];
  assert.equal(out.game.s.actors.P.max_hp,60);
}
const returns=[];
for(const reason of ['withdrawal','defeat']){
  const out=fixture('A',[],0,'AH-return-'+reason);
  drive(out,'progress_first',g=>g.s.rewards['A/V0']?.protected);
  if(reason==='defeat'){
    // Settlement wiring only: start from the reached protected state; no claimed natural death.
    out.game.s.settlement=null;out.game.s.outcome=null;out.game.settle('defeat');
  }
  const p=AH.finish(out.profile,out.game);assert.deepEqual(AH.finish(p,out.game),p);
  if(reason==='defeat'){assert.equal(p.points,0);assert.equal(Object.keys(p.materials).length,0);}
  assert.deepEqual(p.knowledge,out.game.s.ah.knowledge);
  returns.push({requested:reason,actual:out.game.s.outcome,fixture:reason==='defeat',kept:out.game.s.settlement.kept,lost:out.game.s.settlement.lost,
    points:p.points,knowledge_events:p.knowledge.events.length});
}
// Supplemental checks fixed after the first matrix: both entrances independently,
// seeds 0 then 1, guard5, progress_first, initial cards only, PS02 if affordable.
const single_entrance_journeys=[];
for(const entrance of ['A','B']){
  let p=AH.initialProfile();const records=[];
  for(const [i,route] of [entrance,'C'].entries()){
    if(!AH.destinations(p).includes(route)){records.push({route,skipped:'locked'});break;}
    if(i&&p.points>=2)p=AH.reallocate(p,['PS02']);
    const out=AH.depart(source,inputs[i],p,builds.guard5,route,`AH-single-${entrance}-${i}`);out.game=new Checked(out.bundle);
    drive(out,'progress_first');records.push(summarize(out,{route,seed:i,learned:Object.keys(p.learned)}));
    if(!out.game.s.settlement)break;p=AH.finish(out.profile,out.game);
    assert(AH.destinations(p).includes('C'));
  }
  single_entrance_journeys.push({entrance,records,clears:p.clears});
}
{
  const out=fixture('A',['PS02'],0,'AH-private-check'),g=out.game;g.advance();
  const publicBefore=g.public(),choice=AH.choose(g,'progress_first'),snapshot=g.save();
  const changed=new AH.Game(out.bundle,copy(snapshot));
  for(const [w,a] of Object.entries(changed.s.actors))if(w!=='P')for(const id of [...a.hand,...a.deck]){
    changed.s.cards[id].type='PRIVATE';changed.s.cards[id].attr='PRIVATE';changed.s.cards[id].hit=999;
  }
  assert.deepEqual(changed.public(),publicBefore);assert.deepEqual(AH.choose(changed,'progress_first'),choice);
  drive(out,'progress_first',g=>g.s.rewards['A/V0']?.protected);
  assert(!g.s.ah.knowledge.events.some(e=>e.profile==='A/E1'&&e.kind==='initial_catalogue_grant'));
  assert(g.s.ah.knowledge.events.some(e=>e.profile==='A/E1'&&e.kind==='observed_card'));
  unit.push('Opponent private-card mutations do not change choices or public view; a living retired enemy gives no initial catalogue');
}
const group=(keys)=>{
  const result={};
  for(const r of runs){const id=keys.map(k=>r[k]).join('/');const x=result[id]??={n:0,clear:0,defeat:0,cutoff:0,actions:0,points:0,triggers:{PS01:0,PS02:0,PS03:0,PS04:0}};
    x.n++;x[r.outcome]++;x.actions+=r.actions;x.points+=r.points;for(const id of Object.keys(x.triggers))x.triggers[id]+=r.triggers[id];}
  return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,{...v,mean_actions:v.actions/v.n,mean_points:v.points/v.n}]));
};
const result={trial:cfg.trial,base_commit:cfg.base_commit,inputs_sha256:hash(cfg),builds,checks,unit,
  matrix_scope:{runs:runs.length,route_gate_bypassed_for_comparison:true,skill_budget_controlled:true},
  by_route:group(['route']),by_route_build:group(['route','build']),by_route_skill:group(['route','skill']),
  by_route_policy:group(['route','policy']),journey,single_entrance_journeys,return_checks:returns,final_preparation:AH.preparation(profile),runs};
const {runs:matrix,...summary}=result;
fs.writeFileSync(path.join(__dirname,'choice_results.json'),JSON.stringify(summary,null,2).slice(0,-2)+',\n  "runs": [\n'+matrix.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ]\n}\n');
console.log(JSON.stringify({runs:runs.length,checks,by_route:result.by_route,by_route_build:result.by_route_build,
  by_route_skill:result.by_route_skill,by_route_policy:result.by_route_policy,journey,return_checks:returns},null,2));
