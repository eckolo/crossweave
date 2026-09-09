const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {Game}=require('./engine.js'),F=require('./feedback.js');
const root=__dirname,input=JSON.parse(fs.readFileSync(path.join(root,'input.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function choose(game,priority,guardMode){
  const s=game.public(),p=s.actors.P,missing=p.max_hp-p.hp;
  const heals=p.hand.filter(c=>c.kind==='heal'&&s.field[c.attr]&&(missing>=16||missing>0&&c.remaining===1));
  if(heals.length)return {card_id:heals.sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
  const other=p.hand.filter(c=>c.kind!=='heal'),hand=other.length?other:p.hand;
  const target=(priority==='obstacle_first'?['O','E1','V0','V1']:['V0','V1','O','E1']).find(w=>s.actors[w]?.active);
  const attacks=hand.filter(c=>c.kind==='attack'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target})}));
  attacks.sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.c.power-a.c.power||a.c.remaining-b.c.remaining);
  if(attacks.length)return {card_id:attacks[0].c.id,target};
  const guards=hand.filter(c=>c.kind==='guard'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target:null})}));
  const key=x=>guardMode==='evasion'?x.p.guard.evasion:guardMode==='critical'?x.p.crit_added:x.c.power;
  guards.sort((a,b)=>key(b)-key(a)||b.p.guard.value-a.p.guard.value||a.c.remaining-b.c.remaining);
  if(guards.length)return {card_id:guards[0].c.id,target:null};
  return {card_id:[...hand].sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
}
function playRun(profile,priority,guardMode){
  const bundle=F.prepare(input,profile);bundle.initial.state.policy=priority;
  let game=new Game(bundle),predictions=0,reloads=0;
  const m={profile,priority,guardMode,decisions:0,no_attack_hand:0,all_guard_hand:0,max_all_guard_streak:0,guard_hand_cards_by_origin:{},guard_uses_by_type:{},crit_attacks:0,connected_attacks:0,crit_sum:0,matches:0,damage_received:0,healing:0,healing_opportunity:0};
  let streak=0;
  while(!game.s.outcome){
    game.advance();if(game.s.outcome)break;
    const p=game.s.actors.P,cards=p.hand.map(id=>game.s.cards[id]);m.decisions++;
    if(!cards.some(c=>c.kind==='attack'))m.no_attack_hand++;
    if(cards.every(c=>c.kind==='guard')){
      m.all_guard_hand++;streak++;m.max_all_guard_streak=Math.max(streak,m.max_all_guard_streak);
      for(const c of cards)m.guard_hand_cards_by_origin[c.origin]=(m.guard_hand_cards_by_origin[c.origin]||0)+1;
    }else streak=0;
    const catalog=F.catalogue(game);
    assert.equal(catalog.reduce((n,r)=>n+r.remaining,0),p.deck.length);
    assert.equal(catalog.reduce((n,r)=>n+r.hand,0),p.hand.length);
    for(const c of game.choices()){
      const pred=game.predict(c),test=new Game(bundle,game.save());test.step(c);
      const row=test.trace.find(r=>r.type==='action');
      for(const key of ['mode','crit_added','actual_hp_loss','hit_gain','hit_connected','hp_restored'])assert.deepEqual(row[key],pred[key]);
      if(pred.mode==='guard')assert.deepEqual(test.s.actors.P.guard,pred.guard);
      if(pred.hp_restored>0)m.healing_opportunity++;
      predictions++;
    }
    const choice=choose(game,priority,guardMode),c=game.s.cards[choice.card_id],pred=game.predict(choice);
    if(pred.mode!=='place'){m.matches++;m.crit_sum+=pred.crit_added;}
    if(pred.mode==='guard')m.guard_uses_by_type[c.type]=(m.guard_uses_by_type[c.type]||0)+1;
    if(pred.mode==='attack'&&pred.hit_connected){m.connected_attacks++;if(p.crit+pred.crit_added>=100)m.crit_attacks++;}
    m.healing+=pred.hp_restored;
    game.step(choice);
    if(m.decisions%7===0){const save=game.save(),restored=new Game(bundle,clone(save));assert.deepEqual(restored.save(),save);game=restored;reloads++;}
    game.advance();
    for(const row of game.trace.filter(r=>r.type==='action')){
      if(row.target==='P')m.damage_received+=row.actual_hp_loss;
    }
    game.trace=[];
  }
  assert.equal(game.s.actors.P.hp,60+m.healing-m.damage_received,'HP accounting');
  return {...m,outcome:game.s.outcome,hp:game.s.actors.P.hp,rebuilds:game.s.actors.P.rebuilds,predictions,reloads,final_hash:digest(game.save())};
}
function findRecoveryCheckpoint(){
  const bundle=F.prepare(input,'roles');
  // One unchanged entrance, ascending deterministic player-choice seeds.
  // Select at the first eligible state, without consulting its final outcome.
  for(let seed=0;seed<128;seed++){
    let rand=seed+1;const random=()=>{rand=(Math.imul(rand,1664525)+1013904223)>>>0;return rand/4294967296;};
    const game=new Game(bundle),prefix=[];
    for(let n=0;n<40&&!game.s.outcome;n++){
      game.advance();if(game.s.outcome)break;
      const p=game.public().actors.P;
      const healing=game.choices().filter(c=>game.predict(c).hp_restored>=16);
      const other=p.hand.filter(c=>c.kind!=='heal');
      if(p.rebuilds>=1&&p.hp<=44&&p.hp>=20&&game.s.actors.E1?.active&&game.s.actors.V1.hp>=30&&healing.length&&other.length>=2&&p.hand.some(c=>c.kind==='heal'&&c.remaining>=3)){
        return {found:true,profile:'roles',entrance_seed:32,player_choice_seed:seed,prefix,at_action:p.actions+1,hp:p.hp,rebuilds:p.rebuilds,
          selection:'first ascending player seed / first state; no terminal-outcome filter',checkpoint:game.save()};
      }
      const eligible=game.choices().filter(c=>game.s.cards[c.card_id].kind!=='heal');
      const choices=eligible.length?eligible:game.choices(),choice=choices[Math.floor(random()*choices.length)];
      prefix.push(choice);game.step(choice);game.trace=[];
    }
  }
  return {found:false,entrance_seed:32,attempted_player_choice_seeds:128};
}
function checks(){
  // The aggregate must ignore the enemy's private hand/deck and deck order.
  const b=F.prepare(input,'roles'),g=new Game(b);g.advance();
  const before=F.catalogue(g);g.s.actors.P.deck.reverse();assert.deepEqual(F.catalogue(g),before);
  g.s.actors.V0.deck.reverse();
  const hidden=g.s.cards[g.s.actors.V0.deck[0]],oldAttr=hidden.attr;
  hidden.attr='UNSEEN';assert.deepEqual(F.catalogue(g),before);
  assert(!F.attributes(g).includes('UNSEEN'));hidden.attr=oldAttr;
  // Both present cards and later imports use the same stats, regardless of holder.
  g.enter('E1',10);
  const r=Object.values(g.s.cards).filter(c=>c.type==='r');assert(r.some(c=>c.origin==='E1'));assert(r.every(c=>c.crit_gain===40));
  const read=Object.values(g.s.cards).find(c=>c.type==='read');assert.equal(read.evasion,30);assert.equal(read.power,1);
  const mixed=F.prepare(input,'roles_mix'),p=mixed.initial.state.actors.P;
  const types=p.deck.map(id=>mixed.initial.state.cards[id].type),attrs=p.deck.map(id=>mixed.initial.state.cards[id].attr).sort();
  assert.equal(types.filter(t=>['g','r','read'].includes(t)).length,3);
  for(const t of new Set(types))assert(types.filter(x=>x===t).length<=2);
  assert.deepEqual(attrs,input.initial.state.actors.P.deck.map(id=>input.initial.state.cards[id].attr).sort());
  return {status:'PASS',checks:['own remaining totals and hand totals','deck order / enemy private cards do not change catalogue','unseen attribute not enumerated','future enemy card retains role stats','3-guard construction keeps 12 cards, attributes, copy limit']};
}
const runs=[];
for(const profile of Object.keys(F.PROFILES))for(const priority of ['environment_first','obstacle_first'])for(const mode of ['defense','evasion','critical'])runs.push(playRun(profile,priority,mode));
const result={version:'X1',input_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'input.json'))).digest('hex'),scope:'One fixed entrance seed32, four profiles, two target priorities, three public guard priorities. Dependent deterministic comparisons; not population win rates or player psychology.',profiles:F.PROFILES,checks:checks(),runs};
fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(result,null,2)+'\n');
const checkpoint=findRecoveryCheckpoint();
if(checkpoint.found){
  const b=F.prepare(input,checkpoint.profile),g=new Game(b);
  for(const c of checkpoint.prefix){g.advance();g.step(c);}
  g.advance();assert.deepEqual(g.save(),checkpoint.checkpoint,'checkpoint replay from entrance');
  checkpoint.replay_verified=true;
  checkpoint.current_choices=g.choices().map(c=>({choice:c,card:g.s.cards[c.card_id].name,prediction:g.predict(c)}));
}
fs.writeFileSync(path.join(root,'recovery_checkpoint.json'),JSON.stringify(checkpoint,null,2)+'\n');
console.log(JSON.stringify({checks:result.checks,totals:{runs:runs.length,predictions:runs.reduce((n,r)=>n+r.predictions,0),reloads:runs.reduce((n,r)=>n+r.reloads,0)},runs,checkpoint:{...checkpoint,checkpoint:undefined}},null,2));
