'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const copy=x=>JSON.parse(JSON.stringify(x));
const Proposed=require('./engine.js').Game,Old=require('../engine.js').Game;
const cfg=require('../../../体勢/入力.json');
function bundle(maximum = 100) {
  const actor = role => ({role, acts:true, hp:100000, max_hp:100000, hit:0, crit:0,
    guard:null, hand:[], deck:[], active:true, next_at:0, actions:0, hand_size:1,
    initial_size:12, cap:12, minimum:1, passives:[], rebuilds:0, max_posture:maximum});
  return {config:{}, initial:{state:{actors:{P:actor('P'), E1:actor('E'), V0:actor('V')},
    cards:{}, field:{}, pool:[], now:0, rules:'corrected', outcome:null, current_event:'AL1-fixture',
    ready:true, rewards:{}, boundary_number:0}, next_card_number:0,
    memory:{recent:{P:[],E1:[],V0:[]}, observed_types:{E1:[],V0:[]}}, rng:{}}};
}
function attack(game, opts = {}) {
  const {who='P', target='V0', hit=50, power=10, crit=0, fieldHit=0,
    fieldPower=0, match=true} = opts;
  const a = game.s.actors[who], number = Object.keys(game.s.cards).length;
  const card = {id:'a'+number, type:'fixture', origin:who, birth:'initial', attr:'A', kind:'attack',
    power, hit, crit_gain:crit, field_power:0, field_hit:0, life:2, remaining:2,
    doomed:false, destroyed:false};
  game.s.cards[card.id]=card; a.hand.push(card.id);
  if (match) {
    assert(!game.s.field.A);
    const material = {...card, id:'m'+number, origin:target, remaining:null,
      power:0, hit:0, field_power:fieldPower, field_hit:fieldHit};
    game.s.cards[material.id]=material; game.s.field.A=material.id;
  }
  game.assert();
  const choice={card_id:card.id,target:match?target:null};
  const prediction=copy(game.predict(choice,who));
  game.play(who,choice);
  const actual=copy(game.trace.findLast(e=>e.type==='action'));
  for (const key of ['actual_hp_loss','hit_gain','hit_connected'])
    assert.equal(prediction[key],actual[key],'prediction differs: '+key);
  return {prediction,actual,remaining:game.s.actors[target].max_posture-game.s.actors[target].hit,
    accumulated:game.s.actors[target].hit, attacker_crit:game.s.actors[who].crit,
    defender_crit:game.s.actors[target].crit, guard:copy(game.s.actors[target].guard)};
}
const rows=[];
for (const maximum of cfg.maximums) for (const gain of cfg.hit_gains) {
  const g=new Proposed(bundle(maximum));
  const result=attack(g,{hit:gain,power:cfg.net_attack});
  const connected=gain>=maximum;
  const multiplier=connected?1+Math.floor((gain-maximum)/100):0;
  assert.equal(result.actual.hit_connected,connected);
  assert.equal(result.actual.actual_hp_loss,cfg.net_attack*multiplier);
  assert.equal(result.accumulated,connected?0:gain);
  rows.push({maximum,gain,multiplier,damage:result.actual.actual_hp_loss,
    remaining_after_resolution:result.remaining});
}
const reference=[];
for (const gain of cfg.hit_gains) {
  const old=attack(new Old(bundle()),{hit:gain});
  const next=attack(new Proposed(bundle()),{hit:gain});
  assert.equal(old.actual.hit_connected,next.actual.hit_connected);
  assert.equal(old.accumulated,next.accumulated);
  if (gain>=100) assert.equal(old.actual.actual_hp_loss-next.actual.actual_hp_loss,10);
  reference.push({gain,old_damage:old.actual.actual_hp_loss,proposed_damage:next.actual.actual_hp_loss});
}
function sequence(K, maximum, hit, length) {
  const g=new K(bundle(maximum)), series=[];
  for(let i=0;i<length;i++) series.push(attack(g,{hit}).actual.actual_hp_loss);
  return {maximum,hit,series,total:series.reduce((a,b)=>a+b,0)};
}
const sequences=[sequence(Old,100,50,4),sequence(Proposed,100,50,4),
  sequence(Proposed,1,50,4),sequence(Proposed,100,20,5),sequence(Proposed,1,20,5)];
assert.deepEqual(sequences.map(s=>s.series),[[0,20,0,20],[0,10,0,10],[10,10,10,10],[0,0,0,0,10],[10,10,10,10,10]]);
const checks=[];
{
  const g=new Proposed(bundle(100)); g.s.actors.P.crit=80;
  let r=attack(g,{hit:50,crit:20});assert.equal(r.attacker_crit,100);assert.equal(r.actual.actual_hp_loss,0);
  r=attack(g,{hit:50});assert.equal(r.actual.actual_hp_loss,20);assert.equal(r.attacker_crit,0);
  checks.push('未到達時の攻撃会心保持、到達時の発動・リセット');
}
{
  const g=new Proposed(bundle(20));
  g.s.actors.V0.guard={value:10,evasion:0,uses:2};g.s.actors.V0.crit=100;
  let r=attack(g,{hit:10});assert.equal(r.guard.uses,2);assert.equal(r.defender_crit,100);
  r=attack(g,{hit:10});assert.equal(r.actual.actual_hp_loss,0);assert.equal(r.guard.uses,1);
  assert.equal(r.remaining,20);assert.equal(r.defender_crit,0);
  checks.push('削り切っても防御で0ダメージ、防御回数と防御会心消費、体勢全回復');
}
{
  const g=new Proposed(bundle(1));
  g.s.actors.V0.passives=[{target:'V0',kind:'evasion',value:20}];
  assert.equal(attack(g,{hit:20}).actual.actual_hp_loss,0);
  assert.equal(attack(g,{hit:20,fieldHit:1}).actual.actual_hp_loss,10);
  assert.equal(attack(g,{hit:20,fieldHit:-100}).actual.hit_gain,0);
  checks.push('低い体勢でも回避で正味0なら進まない。場補正・非負の加算を保持');
}
{
  const g=new Proposed(bundle(20));
  assert.equal(attack(g,{hit:30,match:false}).actual.actual_hp_loss,0);
  assert.equal(g.s.actors.V0.hit,0);
  checks.push('属性不一致の設置では体勢を削らない');
}
{
  const g=new Proposed(bundle(100));
  assert.equal(attack(g,{hit:60,power:30}).actual.actual_hp_loss,0);
  const r=attack(g,{who:'E1',hit:40,power:3});
  assert.equal(r.actual.actual_hp_loss,3);assert.equal(r.remaining,100);
  checks.push('対象に蓄積を共有し、削り切った最後の攻撃の威力で解決');
}
{
  const b=bundle(150),g=new Proposed(b);attack(g,{hit:100});
  const resumed=new Proposed(b,copy(g.save()));
  assert.deepEqual(copy(g.save()),copy(resumed.save()));
  assert.equal(attack(g,{hit:50}).actual.actual_hp_loss,10);
  assert.equal(attack(resumed,{hit:50}).actual.actual_hp_loss,10);
  assert.deepEqual(copy(g.save()),copy(resumed.save()));
  checks.push('100超の最大体勢と未到達蓄積を保存復元し、同じ次行動へ継続');
}
{
  for(const invalid of [0,-1]) assert.throws(()=>new Proposed(bundle(invalid)));
  const rawAtZero=1+Math.floor((0-0)/100);assert.equal(rawAtZero,1);
  checks.push('最大体勢0では加算0の式が1倍になるため、今回候補は最大値1以上');
}
{
  const g=new Proposed(bundle(250));assert.equal(attack(g,{hit:20}).actual.actual_hp_loss,0);
  checks.push('高体勢の未到達時は式の負倍率を適用せずダメージ判定を行わない');
}

const saved=new Proposed(bundle()).save();delete saved.state.posture_rule;
assert.throws(()=>new Proposed(bundle(),saved),/Incompatible/);
checks.push('旧式の途中状態をAMセーブとして黙って復元しない');
const report={trial:'AM1',threshold_cases:rows.length,old_comparisons:reference.length,rows,reference,sequences,checks};
fs.writeFileSync(path.join(__dirname,'boundary-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({threshold_cases:rows.length,old_comparisons:reference.length,boundaries:checks.length}));
