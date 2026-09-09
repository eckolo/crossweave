const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const E=require('./ecology.js'),F=require('./feedback.js'),Core=require('./engine.js');
const root=__dirname,input=JSON.parse(fs.readFileSync(path.join(root,'input.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x)),digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Same public decision ordering as X; no future/deck-order access.
function choose(game,priority,mode){
  const s=game.public(),p=s.actors.P,missing=p.max_hp-p.hp;
  const heals=p.hand.filter(c=>c.kind==='heal'&&s.field[c.attr]&&(missing>=16||missing>0&&c.remaining===1));
  if(heals.length)return {card_id:heals.sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
  const other=p.hand.filter(c=>c.kind!=='heal'),hand=other.length?other:p.hand;
  const target=(priority==='obstacle_first'?['O','E1','V0','V1']:['V0','V1','O','E1']).find(w=>s.actors[w]?.active);
  const attacks=hand.filter(c=>c.kind==='attack'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target})}));
  attacks.sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.c.power-a.c.power||a.c.remaining-b.c.remaining);
  if(attacks.length)return {card_id:attacks[0].c.id,target};
  const guards=hand.filter(c=>c.kind==='guard'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target:null})}));
  const key=x=>mode==='evasion'?x.p.guard.evasion:mode==='critical'?x.p.crit_added:x.c.power;
  guards.sort((a,b)=>key(b)-key(a)||b.p.guard.value-a.p.guard.value||a.c.remaining-b.c.remaining);
  if(guards.length)return {card_id:guards[0].c.id,target:null};
  return {card_id:[...hand].sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
}
function run(profile,priority,mode){
  const bundle=E.prepare(input,profile);bundle.initial.state.policy=priority;
  let game=new E.Game(bundle),streak=0;
  const prefix=[],examples=[];
  const m={profile,priority,guard_mode:mode,decisions:0,weak_guard_only:0,no_matched_attack:0,all_attack_hit_zero:0,no_HP_damage_option:0,max_no_hit_option_streak:0,
    P_attacks:0,P_zero_hit:0,NPC_attacks:0,NPC_zero_hit:0,P_weak_attacks:0,P_weak_zero_hit:0,NPC_weak_attacks:0,NPC_weak_zero_hit:0,
    P_zero_hit_with_crit_gain:0,NPC_zero_hit_with_crit_gain:0,NPC_zero_hit_with_alternative:0,P_bank_max:0,NPC_bank_max:0,P_damage:0,P_heal:0,
    full_heal_decisions:0,full_heal_with_damage_attack:0,full_heal_ends_guard:0,reloads:0,predictions:0,rebuild_composition:[],X_state_matches:0};
  const reference=profile==='local20'?new Core.Game(F.prepare(input,'roles')):null;
  if(reference)reference.s.policy=priority;
  function absorb(){
    for(const r of game.trace){
      if(r.type==='rebuild'&&r.actor==='P'){
        const cards=[...r.received,...r.generated].map(id=>game.s.cards[id]);
        m.rebuild_composition.push({cycle:r.cycle,total:cards.length,weak:cards.filter(c=>c.type.startsWith('weak_')).length,guard:cards.filter(c=>c.kind==='guard').length});
      }
      if(r.type!=='action')continue;
      const side=r.actor==='P'?'P':'NPC';m[side+'_bank_max']=Math.max(m[side+'_bank_max'],r.crit_before,r.crit_after);
      if(r.target==='P')m.P_damage+=r.actual_hp_loss;if(r.actor==='P')m.P_heal+=r.hp_restored;
      if(r.mode==='attack'){
        m[side+'_attacks']++;
        if(r.hit_gain===0){m[side+'_zero_hit']++;if(r.crit_added>0)m[side+'_zero_hit_with_crit_gain']++;if(side==='NPC'&&r.attack_progress_possible_same_target)m.NPC_zero_hit_with_alternative++;}
        if(r.weak){m[side+'_weak_attacks']++;if(r.hit_gain===0)m[side+'_weak_zero_hit']++;}
      }
    }
    game.trace=[];
  }
  while(!game.s.outcome){
    game.advance();absorb();if(reference)reference.advance();
    if(game.s.outcome)break;
    const s=game.public(),p=s.actors.P;
    if(reference){assert.deepEqual(game.save(),reference.save());m.X_state_matches++;}
    m.decisions++;
    const choices=game.choices().map(choice=>({choice,pred:game.predict(choice)}));
    const attacks=choices.filter(x=>x.pred.mode==='attack'),noProgress=!attacks.some(x=>x.pred.hit_gain>0);
    if(!attacks.length)m.no_matched_attack++;else if(noProgress)m.all_attack_hit_zero++;
    if(!attacks.some(x=>x.pred.actual_hp_loss>0))m.no_HP_damage_option++;
    streak=noProgress?streak+1:0;m.max_no_hit_option_streak=Math.max(streak,m.max_no_hit_option_streak);
    if(p.hand.every(c=>c.kind==='guard'||c.type.startsWith('weak_')))m.weak_guard_only++;
    const heal=choices.find(x=>x.pred.mode==='heal'&&x.pred.hp_restored>=16);
    if(heal){m.full_heal_decisions++;if(attacks.some(x=>x.pred.actual_hp_loss>0))m.full_heal_with_damage_attack++;if(p.guard)m.full_heal_ends_guard++;}
    if(noProgress&&attacks.length&&!examples.length)examples.push({profile,priority,mode,prefix:clone(prefix),public:s,choices,meaning:'現在の全合法攻撃の命中加算0。永続的な詰みの証明ではない。'});
    for(const x of choices){
      const test=new E.Game(bundle,game.save());test.step(x.choice);
      const row=test.trace.find(r=>r.type==='action');
      for(const key of ['mode','crit_added','actual_hp_loss','hit_gain','hit_connected','hp_restored'])assert.deepEqual(row[key],x.pred[key]);
      if(x.pred.mode==='guard')assert.deepEqual(test.s.actors.P.guard,x.pred.guard);
      m.predictions++;
    }
    const c=choose(game,priority,mode);prefix.push(c);game.step(c);absorb();if(reference)reference.step(c);
    if(m.decisions%11===0){const save=game.save();game=new E.Game(bundle,clone(save));assert.deepEqual(game.save(),save);m.reloads++;}
  }
  if(reference)assert.deepEqual(game.save(),reference.save());
  assert.equal(game.s.actors.P.hp,60+m.P_heal-m.P_damage);
  return {metrics:{...m,outcome:game.s.outcome,hp:game.s.actors.P.hp,events:game.s.events,final_hash:digest(game.save())},examples};
}
function fixtures(){
  const b=E.prepare(input,'shared50'),g=new E.Game(b);
  for(const w of ['P','O','V0'])assert.equal(g.passive(w,'evasion'),20);
  assert.equal(g.passive('O','damage_reduction'),8);assert.equal(g.passive('P','damage_reduction'),0);
  g.enter('E1',10);g.enter('V1',10);
  for(const w of ['P','O','V0','E1','V1'])assert.equal(g.passive(w,'evasion'),20);
  g.s.actors.P.guard={value:1,evasion:30,uses:2};assert.equal(g.evasion('P'),50);
  assert(Object.values(g.s.cards).filter(c=>c.type.startsWith('weak_')).every(c=>c.hit===50));
  const id=g.newCard('P','basic','A');g.s.actors.P.deck.push(id);assert.equal(g.s.cards[id].hit,50);
  const save=g.save(),restored=new E.Game(b,clone(save));assert.equal(restored.evasion('P'),50);
  g.retire('O');for(const w of ['P','V0','E1','V1'])assert.equal(g.passive(w,'evasion'),0);
  assert.equal(g.evasion('P'),30);assert.equal(g.passive('O','damage_reduction'),0);g.assert();
  return {status:'PASS',checks:['all current actors including rock','new enemy/environment receives same cover','rock retirement removes cover from everyone','individual reduction stays on rock','guard stacks with cover and survives rock removal','initial/future/basic weak hit equal regardless of owner','saved global passive restores']};
}
const runs=[],examples=[];
for(const profile of Object.keys(E.profiles))for(const priority of ['environment_first','obstacle_first'])for(const mode of ['defense','evasion','critical']){
  const r=run(profile,priority,mode);runs.push(r.metrics);examples.push(...r.examples);
}
const result={version:'Y1',input_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'input.json'))).digest('hex'),profiles:E.profiles,
  scope:'Same seed32 entrance. Scope V0/all × weak hit20/50 × two target priorities × three guard priorities. Dependent deterministic comparisons, not player win rates.',fixtures:fixtures(),runs};
fs.writeFileSync(path.join(root,'ecology_results.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'ecology_cases.json'),JSON.stringify(examples,null,2)+'\n');
console.log(JSON.stringify({fixtures:result.fixtures,runs:runs.map(({rebuild_composition,events,...r})=>r),examples:examples.length},null,2));
