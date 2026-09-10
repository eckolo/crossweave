'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const H=require('./hybrid_rewards.js'),L=require('./expedition_loop.js');
const {inputs,choose,hash,copy}=require('./continuity_study.cjs');
const source=require('./input.json'),old=require('./loop_results.json');
const counts={f:2,h:2,l:2,g:2,r:2,read:1,salve:1};
const checks={settlement_bundles:0,repeated_return:0,payment_choices:0,invalid_payment_atomic:0,duplicate_card_case:0,
  natural_endpoints:0,held_rewards_survive_later_death:0,reward_visibility:0};
function fixture(id,rewards,reason,prior=H.initialProfile()){
  const d=H.depart(source,inputs[0],prior,counts,id);
  for(const [key,protectedValue] of Object.entries(rewards)){d.game.acquire(key,'explicit-fixture');d.game.s.rewards[key].protected=protectedValue;}
  d.game.settle(reason);return d;
}
const settlements=[];
for(const f of [
  {id:'unprotected',reason:'withdrawal',r:{R:false},p:0,m:0,c:false},
  {id:'protected',reason:'withdrawal',r:{R:true,T0:true,E:false},p:2,m:1,c:true},
  {id:'clear',reason:'clear',r:{R:false,T0:true,E:false,T1:true},p:5,m:2,c:true},
  {id:'death',reason:'defeat',r:{R:true,T0:true,E:false,T1:false},p:0,m:0,c:false}
]){
  const d=fixture(f.id,f.r,f.reason),state=hash(d.game.save()),out=H.finish(d.profile,f.id,d.game);
  assert.equal(out.points,f.p);assert.equal(out.materials.hard_fragment||0,f.m);assert.equal(out.unlocked.includes('brace'),f.c);
  assert.equal(hash(d.game.save()),state);assert.deepEqual(H.finish(JSON.parse(JSON.stringify(out)),f.id,d.game),out);
  settlements.push({fixture:f.id,receipt:d.game.s.settlement,holdings:H.holdings(out)});checks.settlement_bundles++;checks.repeated_return++;
}
const d=fixture('payment-source',{R:false,E:false,T1:true},'clear'),home=H.finish(d.profile,'payment-source',d.game);
const payments=[];
for(const op of ['retain','point_hp','material_card','mixed_cost']){
  const out=op==='retain'?copy(home):op==='point_hp'?H.buy(home,'hp','vitality'):H.useMaterial(home,'use',op==='material_card'?'stored_card':'material_toughness');
  const next=H.depart(source,inputs[1],out,counts,'payment-next-'+op);
  assert.equal(next.game.s.actors.P.hp,60+out.hp_bonus);assert.equal(next.game.passive('P','damage_reduction'),out.reduction_bonus);
  if(op==='material_card'){assert(out.unlocked.includes('stored'));assert.equal(out.points,home.points);}
  if(op==='point_hp')assert.deepEqual(out.materials,home.materials);
  if(op==='mixed_cost'){assert.equal(out.points,2);assert.equal(out.materials.hard_fragment,1);}
  if(['material_card','mixed_cost'].includes(op)){
    const recipe=op==='material_card'?'stored_card':'material_toughness';
    assert.deepEqual(H.useMaterial(JSON.parse(JSON.stringify(out)),'use',recipe),out);
    assert.throws(()=>H.useMaterial(out,'use',recipe==='stored_card'?'material_toughness':'stored_card'));
  }
  payments.push({operation:op,points:out.points,materials:out.materials,stored_unlocked:out.unlocked.includes('stored'),next_hp:next.game.s.actors.P.hp,next_reduction:next.game.passive('P','damage_reduction')});checks.payment_choices++;
}
for(const p of [{...copy(home),points:1},{...copy(home),materials:{}},{...copy(home),materials:{wrong_material:9}}]){
  const before=JSON.stringify(p);assert.throws(()=>H.useMaterial(p,'missing','material_toughness'));assert.equal(JSON.stringify(p),before);checks.invalid_payment_atomic++;
}
assert.throws(()=>H.useMaterial(d.profile,'early','stored_card'));
assert.throws(()=>H.finish(H.depart(source,inputs[0],H.initialProfile(),counts,'ongoing').profile,'ongoing',H.depart(source,inputs[0],H.initialProfile(),counts,'ongoing').game));
const one=fixture('card-first',{T0:true},'withdrawal'),first=H.finish(one.profile,'card-first',one.game);
const two=fixture('card-repeat',{T0:true},'withdrawal',first),second=H.finish(two.profile,'card-repeat',two.game);
assert.equal(first.points,1);assert.equal(second.points,2);assert.equal(second.pending_card_duplicates.length,1);checks.duplicate_card_case++;
const fresh=H.depart(source,inputs[0],H.initialProfile(),counts,'view');assert.deepEqual(H.rewardsView(fresh.game.public()),[]);checks.reward_visibility++;
fresh.game.acquire('R','explicit-fixture');const view=H.rewardsView(fresh.game.public());assert.equal(view.length,1);assert.equal(view[0].components.length,2);assert(!JSON.stringify(view).includes('brace'));checks.reward_visibility++;
// Two actual engine runs use the same profile/build plan as AE's early-return journey.
let p=H.initialProfile(),build=copy(counts);const runs=[];
for(const [index,seed] of [0,1].entries()){
  const id='AF-natural-'+index,start=H.depart(source,inputs[seed],p,build,id),g=start.game;
  while(!g.s.outcome&&g.s.actors.P.actions<240){
    g.advance();g.trace=[];if(g.s.outcome)break;
    g.step(choose(g,'environment','attack_first','enemy_first'));g.trace=[];
    if(!g.s.outcome&&g.s.rewards.T0?.protected)g.settle('withdrawal');
  }
  assert(g.s.outcome,'Unsettled fixture');
  const expected=old.natural_runs.find(r=>r.mode==='choose'&&r.route==='environment_return'&&r.seed===seed);
  assert.equal(hash(g.save()),expected.final_hash);checks.natural_endpoints++;
  const before=copy(p);p=H.finish(start.profile,id,g);
  if(index===1){assert.equal(p.points,before.points);assert.deepEqual(p.unlocked,before.unlocked);checks.held_rewards_survive_later_death++;}
  runs.push({id,seed,deck:copy(build),outcome:g.s.outcome,p_actions:g.s.actors.P.actions,receipt:g.s.settlement,points:p.points,materials:p.materials,
    new_unlocks:p.unlocked.filter(t=>!before.unlocked.includes(t)),final_hash:hash(g.save())});
  if(index===0){build.l--;build.brace=1;L.validateDeck(build,p,L.catalog(source));}
}
const files=['hybrid_inputs.json','hybrid_rewards.js','hybrid_study.cjs','expedition_loop.js','loop_inputs.json','loop_results.json',
 'continuity_study.cjs','input.json','terrain.js','ecology.js','feedback.js','engine.js','event_inputs.py','event_results.json','knowledge.js','information.js'];
const result={trial:'AF1',base_commit:H.cfg.base_commit,limits:H.cfg.limits,checks,synthetic_settlements:settlements,synthetic_payments:payments,
  duplicate_fixture:{points_after_first:first.points,points_after_repeat:second.points,pending:second.pending_card_duplicates},natural_runs:runs,
  sources:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')]))};
fs.writeFileSync(path.join(__dirname,'hybrid_results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checks,payments,natural_runs:runs},null,2));
