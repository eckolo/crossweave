/* AG1: actual fixed-engine journeys; no invented clear rate or human choice. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const A=require('./journey_knowledge.js'),H=require('./hybrid_rewards.js');
const {inputs,choose,hash,copy}=require('./continuity_study.cjs');
const source=require('./input.json'),previous=require('./loop_results.json');
const Recorded=A.recorderFor(source);
const initialBuild={f:2,h:2,l:2,g:2,r:2,read:1,salve:1};
const plan=[{seed:0,route:'environment',stopAtProtection:false},
  {seed:0,route:'environment_return',stopAtProtection:true},
  {seed:1,route:'environment_return',stopAtProtection:true}];
const checks={natural_endpoints:0,af_reward_parity:0,preparation_views:0,return_replays:0,
  old_return_after_later_runs:0,conflicting_knowledge_rejected:0};
let profile=A.initialProfile(),build=copy(initialBuild);
const beforeFirst=A.preparation(source,profile);
assert.deepEqual(beforeFirst.knowledge.knowledge,[]);
assert(!beforeFirst.card_choices.some(v=>v.card.type==='brace'));
checks.preparation_views++;
const rows=[],completed=[];
for(const [index,step] of plan.entries()){
  const run='AG-natural-'+(index+1),before=copy(profile),usedBuild=copy(build);
  const start=A.depart(source,inputs.find(v=>v.seed===step.seed),profile,usedBuild,run);
  const game=new Recorded(start.bundle,run,profile.knowledge);
  assert.equal(game.s.actors.P.hp,60);assert.equal(game.s.pool.length,0);
  assert.equal(Object.keys(game.s.field).length,0);
  while(!game.s.outcome&&game.s.actors.P.actions<240){
    game.advance();game.trace=[];if(game.s.outcome)break;
    game.step(choose(game,'environment','attack_first','enemy_first'));game.trace=[];
    if(step.stopAtProtection&&!game.s.outcome&&game.s.rewards.T0?.protected)game.settle('withdrawal');
  }
  assert(game.s.outcome,'Unsettled exploration');
  const old=previous.natural_runs.find(v=>v.mode==='choose'&&v.route===step.route&&v.seed===step.seed);
  assert.equal(hash(game.save()),old.final_hash);checks.natural_endpoints++;
  const engineBefore=hash(game.save()),sourceBefore=JSON.stringify(start.profile);
  const af=H.finish({...start.profile,schema:'AF1'},run,game);
  profile=A.finish(start.profile,run,game,game.knowledge);
  assert.equal(JSON.stringify(start.profile),sourceBefore);
  assert.equal(hash(game.save()),engineBefore);
  for(const key of ['points','materials','unlocked','pending_card_duplicates','hp_bonus','reduction_bonus','returns']){
    assert.deepEqual(profile[key],af[key]);
  }
  checks.af_reward_parity++;
  assert.deepEqual(A.finish(copy(profile),run,game,copy(game.knowledge)),profile);checks.return_replays++;
  for(const event of before.knowledge.events)assert(profile.knowledge.events.some(v=>v.id===event.id));
  const view=A.preparation(source,JSON.parse(JSON.stringify(profile)));
  const known=view.knowledge.knowledge.flatMap(v=>v.confirmed_reward_candidates);
  const unlocked=view.card_choices.some(v=>v.card.type==='brace');
  assert(known.some(v=>v.reward_key==='T0'));
  if(index===0){
    assert.equal(game.s.outcome,'defeat');assert(game.s.rewards.T0.protected);
    assert.deepEqual(game.s.settlement.lost,['T0']);assert.equal(profile.points,0);
    assert(!unlocked);assert.deepEqual(profile.materials,{});
    assert(profile.knowledge.events.some(v=>v.kind==='initial_catalogue_grant'&&v.profile==='weak-terrain-Z'));
    assert(!profile.knowledge.events.some(v=>v.kind==='initial_catalogue_grant'&&v.profile==='core-enemy-Z'));
  }else{
    assert.equal(profile.points,1);assert(unlocked);
    if(index===1){assert.equal(game.s.outcome,'withdrawal');build.l--;build.brace=1;}
    else {assert.equal(game.s.outcome,'defeat');assert.deepEqual(profile.unlocked,before.unlocked);}
  }
  checks.preparation_views++;
  rows.push({run,seed:step.seed,policy:step.route,deck:usedBuild,outcome:game.s.outcome,
    p_actions:game.s.actors.P.actions,settlement:copy(game.s.settlement),points:profile.points,
    materials:copy(profile.materials),brace_selectable:unlocked,
    knowledge_events:profile.knowledge.events.length,confirmed_reward_candidates:known,
    initial_catalogues:profile.knowledge.events.filter(v=>v.kind==='initial_catalogue_grant').map(v=>v.profile),
    new_public_facts:profile.knowledge.events.filter(v=>!before.knowledge.events.some(x=>x.id===v.id)).length,
    final_hash:hash(game.save())});
  completed.push({run,game,ledger:copy(game.knowledge)});
}
const first=completed[0];
assert.deepEqual(A.finish(copy(profile),first.run,first.game,first.ledger),profile);checks.old_return_after_later_runs++;
const changed=copy(first.ledger);changed.events.find(v=>v.kind==='observed_reward').label+='（異なる記録）';
const finalBefore=JSON.stringify(profile);
assert.throws(()=>A.finish(profile,first.run,first.game,changed),/Conflicting knowledge receipt/);
assert.equal(JSON.stringify(profile),finalBefore);checks.conflicting_knowledge_rejected++;
const files=['journey_knowledge.js','journey_knowledge_study.cjs','hybrid_rewards.js','hybrid_inputs.json',
  'expedition_loop.js','loop_inputs.json','loop_results.json','knowledge.js','information.js','information_inputs.json',
  'input.json','terrain.js','ecology.js','feedback.js','engine.js','continuity_study.cjs','event_inputs.py'];
const output={trial:'AG1',base_commit:'16fab1028a4f7895ad7414b9edf8fc41ab4802aa',
  purpose:'D41/D42 knowledge and D43 typed rewards through death, return, next preparation',
  limits:['Fixed Z content; not the proposed A/B/C destinations or D46 unlock implementation.',
    'Deterministic public policy and documented build swap; not user play, win rates or reward balance.',
    'Three existing natural endpoints; no newly authored victory or guaranteed encounter.',
    'Return/profile roundtrip checked; no new ongoing-run save UI or complete application.'],
  checks,first_visit:beforeFirst,journeys:rows,
  sources:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')]))};
fs.writeFileSync(path.join(__dirname,'journey_knowledge_results.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({checks,journeys:rows},null,2));
