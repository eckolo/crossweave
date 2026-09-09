const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {spawnSync}=require('child_process');
const T=require('./terrain.js'),E=require('./ecology.js'),Core=require('./engine.js');
const root=__dirname,source=JSON.parse(fs.readFileSync(path.join(root,'input.json'),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x)),digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const seeded=spawnSync('python3',[path.join(root,'event_inputs.py')],{encoding:'utf8',maxBuffer:10000000});
assert.equal(seeded.status,0,seeded.stderr);const inputs=JSON.parse(seeded.stdout);

function bundleFor(build,input){
  const b=T.prepare(source,build);
  b.initial.state.seed='Z'+input.seed;
  for(const key of Object.keys(b.initial.rng))b.initial.rng[key]=copy(input.states[key]);
  for(const key of Object.keys(b.future_rng))b.future_rng[key]=copy(input.states[key]);
  for(const [w,a] of Object.entries(b.initial.state.actors)){
    a.deck.sort();const rng=new Core.MT(b.initial.rng[w+'|initial']);rng.shuffle(a.deck);b.initial.rng[w+'|initial']=rng.state();
  }
  return b;
}
function phase(game){
  if(game.s.current_event==='rock'||game.s.current_event==='open_rock')return 'terrain';
  return game.s.actors.E1?.active?'enemy':'exit';
}
function choose(game,route,policy){
  const s=game.public(),p=s.actors.P,missing=p.max_hp-p.hp;
  const heals=p.hand.filter(c=>c.kind==='heal'&&s.field[c.attr]&&(missing>=16||missing>0&&c.remaining===1));
  if(heals.length)return {card_id:heals.sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
  const other=p.hand.filter(c=>c.kind!=='heal'),hand=other.length?other:p.hand;
  const order=route==='rock'?['O','E1','V0','V1']:['V0','E1','V1','O'];
  const target=order.find(w=>s.actors[w]?.active);
  const attacks=hand.filter(c=>c.kind==='attack'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target})}));
  attacks.sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.c.power-a.c.power||a.c.remaining-b.c.remaining);
  const guards=hand.filter(c=>c.kind==='guard'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target:null})}));
  // Both policies rank guards by publicly determined defense first, then evasion.
  guards.sort((a,b)=>b.p.guard.value-a.p.guard.value||b.p.guard.evasion-a.p.guard.evasion||a.c.remaining-b.c.remaining);
  const useful=guards.find(x=>x.p.guard.value>0||x.p.guard.evasion>0);
  if(policy==='guard_exposed'&&!p.guard&&p.hit>=50&&useful)return {card_id:useful.c.id,target:null};
  if(attacks.length)return {card_id:attacks[0].c.id,target};
  if(guards.length)return {card_id:guards[0].c.id,target:null};
  return {card_id:[...hand].sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
}
function counters(){return {decisions:0,guard_only:0,no_attack_card:0,no_matched_attack:0,zero_gain_all_attacks:0,max_no_attack_streak:0,
  attacks:0,zero_gain_attacks:0,weak_attacks:0,weak_positive_gain:0,guards:0,damage_received:0,healed:0,damage_dealt:0,
  damage_before_guard:0,damage_avoided_by_guard:0,guarded_hits:0,rebuilds:[],borrowed_guard_draws:0};}
function run(input,build,scenario,route,policy){
  const b=bundleFor(build,input);let game=new T.Game(b);
  if(scenario==='fresh_enemy'){
    game.retire('O');game.retire('V0');game.s.current_event='followup';game.enter('V1',0);game.enter('E1',0);game.trace=[];
  }
  const start=digest(game.save()),phases={terrain:counters(),enemy:counters(),exit:counters()};
  let predictions=0,reloads=0,decisions=0,streak=0,streakPhase=null;
  const milestones=[];
  function absorb(){
    for(const r of game.trace){
      if(r.type==='boundary')milestones.push({...r,hp:r.P_hp});
      if(r.type==='action'){
        const p=phases[r.z_phase];
        if(r.actor==='P'){
          p.damage_dealt+=r.actual_hp_loss;p.healed+=r.hp_restored;
          if(r.mode==='guard')p.guards++;
          if(r.mode==='attack'){p.attacks++;if(r.hit_gain===0)p.zero_gain_attacks++;if(r.weak){p.weak_attacks++;if(r.hit_gain>0)p.weak_positive_gain++;}}
        }
        if(r.target==='P'){
          p.damage_received+=r.actual_hp_loss;
          if(r.guard_counterfactual){
            p.guarded_hits++;p.damage_before_guard+=r.guard_counterfactual.without;p.damage_avoided_by_guard+=r.guard_counterfactual.without-r.damage;
          }
        }
      }
      if(r.type==='rebuild'&&r.actor==='P'){
        const cards=[...r.received,...r.generated].map(id=>game.s.cards[id]);
        phases[r.z_phase].rebuilds.push({cycle:r.cycle,total:cards.length,guard:cards.filter(c=>c.kind==='guard').length,weak:cards.filter(c=>c.type.startsWith('weak_')).length});
      }
      if(r.type==='draw'&&r.actor==='P'){
        const c=game.s.cards[r.card_id];if(c.kind==='guard'&&c.origin!=='P')phases[r.z_phase].borrowed_guard_draws++;
      }
    }
    game.trace=[];
  }
  // Diagnostic class changes logs only, never policy or combat state.
  const basePlay=T.Game.prototype.play,baseLog=T.Game.prototype.log;
  function instrument(g){
    g.log=function(type,data={}){baseLog.call(this,type,{...data,z_phase:phase(this),...(type==='boundary'?{P_hp:this.s.actors.P.hp}:{})});};
    g.play=function(w,choice){
    const before=phase(this);
    const c=this.s.cards[choice.card_id],m=this.s.cards[this.s.field[c.attr]],d=choice.target?this.s.actors[choice.target]:null;
    let cf=null;
    if(c.kind==='attack'&&m&&choice.target==='P'&&d.guard){
      const gain=Math.max(0,c.hit+m.field_hit-this.evasion('P')),total=d.hit+gain;
      if(total>=100){const a=this.s.actors[w],am=1+Math.floor((a.crit+this.crit(w,c))/100),hm=1+Math.floor(total/100);
        cf={without:Math.max(0,(c.power+m.field_power)*am-this.passive('P','damage_reduction'))*hm};}
    }
    basePlay.call(this,w,choice);const row=this.trace[this.trace.length-1];row.z_phase=before;if(cf)row.guard_counterfactual=cf;
  };}
  instrument(game);
  while(!game.s.outcome){
    let steps=0;
    while(!game.s.ready&&!game.s.outcome&&(scenario!=='fresh_enemy'||game.s.actors.E1.active)){assert(++steps<10000);game.step();}
    absorb();if(game.s.outcome)break;
    if(scenario==='fresh_enemy'&&!game.s.actors.E1.active)break;
    const key=phase(game),m=phases[key],s=game.public(),hand=s.actors.P.hand;
    decisions++;m.decisions++;
    if(hand.every(c=>c.kind==='guard'))m.guard_only++;
    if(!hand.some(c=>c.kind==='attack'))m.no_attack_card++;
    const options=game.choices().map(c=>({choice:c,pred:game.predict(c)})),attacks=options.filter(x=>x.pred.mode==='attack');
    if(!attacks.length)m.no_matched_attack++;else if(attacks.every(x=>x.pred.hit_gain===0))m.zero_gain_all_attacks++;
    if(streakPhase!==key){streak=0;streakPhase=key;}
    streak=attacks.length?0:streak+1;m.max_no_attack_streak=Math.max(m.max_no_attack_streak,streak);
    // Check first decision of each phase and every eleventh decision thereafter.
    if(m.decisions===1||decisions%11===0)for(const x of options){
      const test=new T.Game(b,game.save());test.step(x.choice);const row=test.trace.findLast(r=>r.type==='action');
      for(const k of ['mode','crit_added','actual_hp_loss','hit_gain','hit_connected','hp_restored'])assert.deepEqual(row[k],x.pred[k]);predictions++;
    }
    game.step(choose(game,route,policy));absorb();
    if(scenario==='fresh_enemy'&&!game.s.actors.E1.active)break;
    if(decisions%17===0){const save=game.save();game=new T.Game(b,copy(save));assert.deepEqual(game.save(),save);instrument(game);reloads++;}
  }
  const damage=Object.values(phases).reduce((n,p)=>n+p.damage_received,0),healed=Object.values(phases).reduce((n,p)=>n+p.healed,0);
  assert.equal(game.s.actors.P.hp,60+healed-damage);
  return {seed:input.seed,build,scenario,route,policy,start_hash:start,phases,milestones,decisions,predictions,reloads,
    outcome:scenario==='fresh_enemy'&&!game.s.actors.E1.active?'enemy_defeated':game.s.outcome,hp:game.s.actors.P.hp,final_hash:digest(game.save())};
}
function fixtures(){
  const b=T.prepare(source),g=new T.Game(b);
  assert.equal(g.evasion('O'),0);assert.equal(g.passive('O','damage_reduction'),8);
  for(const w of ['P','V0'])assert.equal(g.evasion(w),20);
  g.enter('E1',10);g.enter('V1',10);for(const w of ['E1','V1'])assert.equal(g.evasion(w),20);
  g.s.actors.P.guard={value:1,evasion:30,uses:2};assert.equal(g.evasion('P'),50);
  const restored=new T.Game(b,copy(g.save()));assert.equal(restored.evasion('O'),0);assert.equal(restored.evasion('P'),50);
  g.retire('O');assert.equal(g.evasion('P'),30);for(const w of ['V0','E1','V1'])assert.equal(g.evasion(w),0);
  const legacy=E.prepare(source,'shared50');assert.equal(new T.Game(legacy).evasion('O'),20);
  for(const [build,count] of [['guard5',5],['guard3',3],['guard0',0]]){
    const b=T.prepare(source,build),cards=b.initial.state.actors.P.deck.map(id=>b.initial.state.cards[id]);
    assert.equal(cards.length,12);assert.equal(cards.filter(c=>c.kind==='guard').length,count);assert.equal(cards.filter(c=>c.kind==='heal').length,1);
    assert.deepEqual('ABCD'.split('').map(a=>cards.filter(c=>c.attr===a).length),[4,4,2,2]);
    for(const type of new Set(cards.map(c=>c.type)))assert(cards.filter(c=>c.type===type).length<=2);
  }
  return {status:'PASS',checks:['source excluded, others included','later entrants included','source retirement removes cover, own guard remains','own reduction unchanged','save restore','old all scope still reproduces','three builds preserve 12 cards, attribute counts, healing and copy cap']};
}
const runs=[];
for(const input of inputs)for(const build of Object.keys(T.builds))for(const policy of ['attack_first','guard_exposed']){
  for(const route of ['rock','environment'])runs.push(run(input,build,'chain',route,policy));
  runs.push(run(input,build,'fresh_enemy','rock',policy));
}
const result={version:'Z1',input_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'input.json'))).digest('hex'),
  method:'8 Z seed sets, 3 builds, 2 public policies. Full chain with 2 initial routes plus fresh enemy controls. Dependent scenario comparisons, not player win rates.',
  builds:T.builds,fixtures:fixtures(),runs};
fs.writeFileSync(path.join(root,'event_results.json'),JSON.stringify(result,null,2)+'\n');
const summary=[];
for(const scenario of ['chain','fresh_enemy'])for(const route of scenario==='chain'?['rock','environment']:['rock'])for(const build of Object.keys(T.builds)){
  const rows=runs.filter(r=>r.scenario===scenario&&r.route===route&&r.build===build);
  const totals=phase=>Object.fromEntries(['decisions','guard_only','no_attack_card','no_matched_attack','guards','damage_received','healed','damage_avoided_by_guard','weak_attacks','weak_positive_gain','borrowed_guard_draws'].map(k=>[k,rows.reduce((n,r)=>n+r.phases[phase][k],0)]));
  summary.push({scenario,route,build,runs:rows.length,completed:rows.filter(r=>['clear','enemy_defeated'].includes(r.outcome)).length,terrain_pass:rows.filter(r=>r.milestones.some(m=>['rock_destroyed','V0_traversed'].includes(m.event))).length,terrain:totals('terrain'),enemy:totals('enemy')});
}
console.log(JSON.stringify({fixtures:result.fixtures,runs:runs.length,predictions:runs.reduce((n,r)=>n+r.predictions,0),reloads:runs.reduce((n,r)=>n+r.reloads,0),summary},null,2));
