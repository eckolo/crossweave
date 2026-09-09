/* AA: observe Z's same 144 runs, then fork complete action boundaries for HP-only diagnostics. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {spawnSync}=require('child_process');
const T=require('./terrain.js'),Core=require('./engine.js');
const root=__dirname,read=n=>fs.readFileSync(path.join(root,n),'utf8');
const source=JSON.parse(read('input.json')),previous=JSON.parse(read('event_results.json'));
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const seeded=spawnSync('python3',[path.join(root,'event_inputs.py')],{encoding:'utf8',maxBuffer:10000000});
assert.equal(seeded.status,0,seeded.stderr);const inputs=JSON.parse(seeded.stdout);
const policies=['attack_first','guard_exposed'];
function phase(g){return ['rock','open_rock'].includes(g.s.current_event)?'terrain':g.s.actors.E1?.active?'enemy':'exit';}
// These two functions preserve Z's public policies and seed setup; all 144 final hashes are checked below.
function bundleFor(build,input){
  const b=T.prepare(source,build);b.initial.state.seed='Z'+input.seed;
  for(const key of Object.keys(b.initial.rng))b.initial.rng[key]=copy(input.states[key]);
  for(const key of Object.keys(b.future_rng))b.future_rng[key]=copy(input.states[key]);
  for(const [w,a] of Object.entries(b.initial.state.actors)){
    a.deck.sort();const rng=new Core.MT(b.initial.rng[w+'|initial']);rng.shuffle(a.deck);b.initial.rng[w+'|initial']=rng.state();
  }return b;
}
function choose(g,route,policy,followup='enemy_first'){
  const s=g.public(),p=s.actors.P,missing=p.max_hp-p.hp;
  const heals=p.hand.filter(c=>c.kind==='heal'&&s.field[c.attr]&&(missing>=16||missing>0&&c.remaining===1));
  if(heals.length)return {card_id:heals.sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
  const other=p.hand.filter(c=>c.kind!=='heal'),hand=other.length?other:p.hand;
  const order=followup==='exit_first'&&s.current_event==='followup'?['V1','E1','V0','O']:route==='rock'?['O','E1','V0','V1']:['V0','E1','V1','O'];
  const target=order.find(w=>s.actors[w]?.active);
  const attacks=hand.filter(c=>c.kind==='attack'&&s.field[c.attr]).map(c=>({c,p:g.predict({card_id:c.id,target})}));
  attacks.sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.c.power-a.c.power||a.c.remaining-b.c.remaining);
  const guards=hand.filter(c=>c.kind==='guard'&&s.field[c.attr]).map(c=>({c,p:g.predict({card_id:c.id,target:null})}));
  guards.sort((a,b)=>b.p.guard.value-a.p.guard.value||b.p.guard.evasion-a.p.guard.evasion||a.c.remaining-b.c.remaining);
  const useful=guards.find(x=>x.p.guard.value>0||x.p.guard.evasion>0);
  if(policy==='guard_exposed'&&!p.guard&&p.hit>=50&&useful)return {card_id:useful.c.id,target:null};
  if(attacks.length)return {card_id:attacks[0].c.id,target};
  if(guards.length)return {card_id:guards[0].c.id,target:null};
  return {card_id:[...hand].sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
}
function bag(g,ids,initial){
  const cards=ids.map(id=>g.s.cards[id]);
  return {total:cards.length,initial:cards.filter(c=>initial.has(c.id)).length,
    initial_attack:cards.filter(c=>initial.has(c.id)&&c.kind==='attack').length,
    guards:cards.filter(c=>c.kind==='guard').length,enemy_guards:cards.filter(c=>c.origin==='E1'&&c.kind==='guard').length,
    weak:cards.filter(c=>c.type.startsWith('weak_')).length,doomed:cards.filter(c=>c.doomed).length};
}
function snapshot(g,initial){
  const p=g.s.actors.P;
  return {time:g.s.now,p_actions:p.actions,hp:p.hp,crit:p.crit,hit:p.hit,guard:copy(p.guard),rebuilds:p.rebuilds,
    own:bag(g,[...p.hand,...p.deck],initial),hand:bag(g,p.hand,initial),deck:bag(g,p.deck,initial),pool:bag(g,g.s.pool,initial),
    field:bag(g,Object.values(g.s.field),initial),
    other_private:Object.fromEntries(Object.entries(g.s.actors).filter(([w,a])=>w!=='P'&&a.active).map(([w,a])=>[w,bag(g,[...a.hand,...a.deck],initial)])),
    initial_live:Object.values(g.s.cards).filter(c=>initial.has(c.id)&&!c.destroyed).length,
    enemy_origin_live:Object.values(g.s.cards).filter(c=>c.origin==='E1'&&!c.destroyed).length,
    live:g.live(),actors:Object.fromEntries(Object.entries(g.s.actors).map(([w,a])=>[w,{hp:a.hp,active:a.active}]))};
}
function meter(){return {decisions:0,no_attack_card:0,no_matched_attack:0,max_no_matched_attack_streak:0,
  no_positive_hit_attack:0,no_positive_damage_attack:0,initial_card_in_hand:0,initial_matched_main_available:0,
  initial_attack_available:0,combo_available:0,initial_combo_available:0,
  initial_main_used:0,initial_material_used:0,combo_used:0,initial_combo_used:0,guards_used:0,enemy_guards_used:0,
  enemy_guard_received:0,enemy_guard_draws:0,enemy_guard_available_decisions:0,damage_received:0,healed:0,
  damage_main_origin:{p_initial:0,p_generated:0,enemy:0,environment:0,other:0},
  damage_using_initial_material:0,damage_using_positive_initial_material:0,positive_initial_material_hits:0,
  weak_attacks:0,initial_attacks:0,damage_dealt:0,
  rebuilds:[],first_enemy_guard_received:null,first_enemy_guard_draw:null,first_enemy_guard_available:null,first_enemy_guard_used:null};}
class Observed extends T.Game{
  constructor(b,saved=null){super(b,saved);this.initialIds=new Set(b.initial.state.actors.P.deck);this.checkpoints={};}
  log(type,data={}){
    super.log(type,{...data,aa_phase:phase(this),p_actions:this.s.actors.P.actions,p_hp:this.s.actors.P.hp,p_rebuilds:this.s.actors.P.rebuilds});
  }
  play(w,choice){
    const before=phase(this),c=this.s.cards[choice.card_id],m=this.s.cards[this.s.field[c.attr]],eventCount=this.s.events.length;
    const context={main_origin:c.origin,main_type:c.type,main_initial:this.initialIds.has(c.id),
      material_initial:!!m&&this.initialIds.has(m.id),material_origin:m?.origin??null,material_type:m?.type??null,
      material_power:m?.field_power??0,material_hit:m?.field_hit??0};
    super.play(w,choice);
    const row=this.trace[this.trace.length-1];assert.equal(row.type,'action');Object.assign(row,context,{aa_phase:before});
    // Save after the entire action, expiry, dispatch, action counter and public memory have completed.
    for(const event of this.s.events.slice(eventCount)){
      const key=event.to_event==='followup'&&event.from_event!=='followup'?'entry':event.event==='enemy_defeated'?'enemy_exit':null;
      if(key&&!this.checkpoints[key])this.checkpoints[key]={saved:this.save(),state:snapshot(this,this.initialIds),event:copy(event)};
    }
  }
}
function stamp(g,r=null){return {p_actions:r?r.p_actions:g.s.actors.P.actions,hp:r?r.p_hp:g.s.actors.P.hp,rebuilds:r?r.p_rebuilds:g.s.actors.P.rebuilds,time:r?r.time:g.s.now};}
function runObserved(input,build,scenario,route,policy){
  const b=bundleFor(build,input),g=new Observed(b);
  if(scenario==='fresh_enemy'){g.retire('O');g.retire('V0');g.s.current_event='followup';g.enter('V1',0);g.enter('E1',0);g.trace=[];}
  const startHash=hash(g.save()),stats={terrain:meter(),enemy:meter(),exit:meter()},damageExamples=[];
  let streak=0,lastPhase=null,decisions=0;
  function absorb(){
    for(const r of g.trace){
      const st=stats[r.aa_phase];
      if(r.type==='rebuild'&&r.actor==='P'){
        const ids=[...r.received,...r.generated],info=bag(g,ids,g.initialIds);
        st.rebuilds.push({...stamp(g,r),cycle:r.cycle,...info});
        st.enemy_guard_received+=info.enemy_guards;
        if(info.enemy_guards&&!st.first_enemy_guard_received)st.first_enemy_guard_received=stamp(g,r);
      }
      if(r.type==='draw'&&r.actor==='P'){
        const c=g.s.cards[r.card_id];if(c.kind==='guard'&&c.origin==='E1'){
          st.enemy_guard_draws++;if(!st.first_enemy_guard_draw)st.first_enemy_guard_draw=stamp(g,r);
        }
      }
      if(r.type!=='action')continue;
      if(r.actor==='P'){
        st.damage_dealt+=r.actual_hp_loss;st.healed+=r.hp_restored;
        if(r.mode!=='place'&&r.main_initial)st.initial_main_used++;
        if(r.material_initial)st.initial_material_used++;
        if(r.mode==='guard'){st.guards_used++;if(r.main_origin==='E1'){
          st.enemy_guards_used++;if(!st.first_enemy_guard_used)st.first_enemy_guard_used=stamp(g,r);
        }}
        if(r.mode==='attack'){
          if(r.weak)st.weak_attacks++;if(r.main_initial)st.initial_attacks++;
          if(r.main_type==='h'&&r.material_type==='l'){st.combo_used++;if(r.main_initial||r.material_initial)st.initial_combo_used++;}
        }
      }
      if(r.target==='P'){
        st.damage_received+=r.actual_hp_loss;
        const category=r.main_initial?'p_initial':r.main_origin==='P'?'p_generated':r.main_origin==='E1'?'enemy':r.main_origin.startsWith('V')?'environment':'other';
        st.damage_main_origin[category]+=r.actual_hp_loss;
        if(r.material_initial)st.damage_using_initial_material+=r.actual_hp_loss;
        if(r.material_initial&&(r.material_power>0||r.material_hit>0)){
          st.damage_using_positive_initial_material+=r.actual_hp_loss;if(r.hit_connected)st.positive_initial_material_hits++;
        }
        if(r.actual_hp_loss>=8&&damageExamples.length<5)damageExamples.push({phase:r.aa_phase,p_actions:r.p_actions,hp_after:r.p_hp,actor:r.actor,
          main_type:r.main_type,main_origin:r.main_origin,main_initial:r.main_initial,material_type:r.material_type,material_origin:r.material_origin,
          material_power:r.material_power,material_hit:r.material_hit,actual_hp_loss:r.actual_hp_loss,crit_before:r.crit_before});
      }
    }g.trace=[];
  }
  while(!g.s.outcome){
    let n=0;while(!g.s.ready&&!g.s.outcome&&(scenario!=='fresh_enemy'||g.s.actors.E1.active)){assert(++n<10000);g.step();}
    absorb();if(g.s.outcome||scenario==='fresh_enemy'&&!g.s.actors.E1.active)break;
    const key=phase(g),st=stats[key],pub=g.public(),hand=pub.actors.P.hand;
    decisions++;st.decisions++;
    if(!hand.some(c=>c.kind==='attack'))st.no_attack_card++;
    const options=g.choices().map(choice=>({choice,c:g.s.cards[choice.card_id],pred:g.predict(choice)}));
    const attacks=options.filter(x=>x.pred.mode==='attack');
    if(!attacks.length)st.no_matched_attack++;
    if(!attacks.some(x=>x.pred.hit_gain>0))st.no_positive_hit_attack++;
    if(!attacks.some(x=>x.pred.actual_hp_loss>0))st.no_positive_damage_attack++;
    if(lastPhase!==key){streak=0;lastPhase=key;}streak=attacks.length?0:streak+1;st.max_no_matched_attack_streak=Math.max(st.max_no_matched_attack_streak,streak);
    if(hand.some(c=>g.initialIds.has(c.id)))st.initial_card_in_hand++;
    if(options.some(x=>x.pred.mode!=='place'&&g.initialIds.has(x.c.id)))st.initial_matched_main_available++;
    if(attacks.some(x=>g.initialIds.has(x.c.id)))st.initial_attack_available++;
    const combos=attacks.filter(x=>x.c.type==='h'&&g.s.cards[g.s.field[x.c.attr]]?.type==='l');
    if(combos.length)st.combo_available++;
    if(combos.some(x=>g.initialIds.has(x.c.id)||g.initialIds.has(g.s.field[x.c.attr])))st.initial_combo_available++;
    const borrowedGuard=options.some(x=>x.pred.mode==='guard'&&x.c.origin==='E1'&&(x.pred.guard.value>0||x.pred.guard.evasion>0));
    if(borrowedGuard){st.enemy_guard_available_decisions++;if(!st.first_enemy_guard_available)st.first_enemy_guard_available=stamp(g);}
    g.step(choose(g,route,policy));absorb();
  }
  const damage=Object.values(stats).reduce((n,s)=>n+s.damage_received,0),healed=Object.values(stats).reduce((n,s)=>n+s.healed,0);
  assert.equal(g.s.actors.P.hp,60+healed-damage);
  for(const s of Object.values(stats))assert.equal(s.damage_received,Object.values(s.damage_main_origin).reduce((a,b)=>a+b,0));
  const outcome=scenario==='fresh_enemy'&&!g.s.actors.E1.active?'enemy_defeated':g.s.outcome;
  const old=previous.runs.find(r=>r.seed===input.seed&&r.build===build&&r.scenario===scenario&&r.route===route&&r.policy===policy);
  assert(old);assert.equal(startHash,old.start_hash);assert.equal(hash(g.save()),old.final_hash);assert.equal(outcome,old.outcome);assert.equal(decisions,old.decisions);
  return {bundle:b,checkpoints:g.checkpoints,row:{seed:input.seed,build,scenario,route,policy,decisions,outcome,hp:g.s.actors.P.hp,stats,damage_examples:damageExamples,
    checkpoints:Object.fromEntries(Object.entries(g.checkpoints).map(([k,v])=>[k,{state:v.state,event:v.event}])),final_hash:hash(g.save())}};
}
function continuation(b,checkpoint,route,policy,restoreHp,followup='enemy_first'){
  const s=copy(checkpoint.saved),before=copy(s),oldHp=s.state.actors.P.hp;
  if(restoreHp)s.state.actors.P.hp=s.state.actors.P.max_hp;
  const replacement=copy(s);replacement.state.actors.P.hp=oldHp;assert.deepEqual(replacement,before);
  const g=new T.Game(b,s),startActions=g.s.actors.P.actions;let damage=0,healed=0,decisions=0;
  function absorb(){for(const r of g.trace)if(r.type==='action'){if(r.target==='P')damage+=r.actual_hp_loss;if(r.actor==='P')healed+=r.hp_restored;}g.trace=[];}
  while(!g.s.outcome){g.advance();absorb();if(g.s.outcome)break;decisions++;g.step(choose(g,route,policy,followup));absorb();}
  assert.equal(g.s.actors.P.hp,(restoreHp?60:oldHp)+healed-damage);
  return {intervention:restoreHp?'restore_hp_to_60':followup==='exit_first'?'followup_exit_first':'none',hp_added:restoreHp?60-oldHp:0,start_actions:startActions,decisions,
    outcome:g.s.outcome,hp:g.s.actors.P.hp,damage_received:damage,healed,
    enemy_defeated:g.s.events.some(e=>e.event==='enemy_defeated'),kept:g.s.settlement?.kept??[],lost:g.s.settlement?.lost??[],final_hash:hash(g.save())};
}
function runStudy(){
const runs=[];let baselineChecks=0,resumeChecks=0,hpControls=0;
for(const input of inputs)for(const build of Object.keys(T.builds))for(const policy of policies){
  for(const [scenario,route] of [['chain','rock'],['chain','environment'],['fresh_enemy','rock']]){
    const {bundle,checkpoints,row}=runObserved(input,build,scenario,route,policy);baselineChecks++;
    row.hp_controls={};
    if(scenario==='chain')for(const key of ['entry','enemy_exit'])if(checkpoints[key]){
      const plain=continuation(bundle,checkpoints[key],route,policy,false);assert.equal(plain.final_hash,row.final_hash);resumeChecks++;
      row.hp_controls[key]=continuation(bundle,checkpoints[key],route,policy,true);hpControls++;
    }runs.push(row);
  }
}
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const summary=[];
for(const scenario of ['chain','fresh_enemy'])for(const route of scenario==='chain'?['rock','environment']:['rock'])for(const build of Object.keys(T.builds)){
  const rows=runs.filter(r=>r.scenario===scenario&&r.route===route&&r.build===build),entered=rows.filter(r=>r.checkpoints.entry),exited=rows.filter(r=>r.checkpoints.enemy_exit);
  const sum=(phase,key)=>rows.reduce((n,r)=>n+r.stats[phase][key],0);
  summary.push({scenario,route,build,n:rows.length,entered:entered.length,enemy_defeated:exited.length,clear:rows.filter(r=>r.outcome==='clear').length,
    died_before_entry:rows.filter(r=>r.outcome==='defeat'&&!r.checkpoints.entry&&scenario==='chain').length,
    died_with_enemy:rows.filter(r=>r.outcome==='defeat'&&!r.checkpoints.enemy_exit&&(scenario==='fresh_enemy'||r.checkpoints.entry)).length,
    died_after_enemy:exited.filter(r=>r.outcome==='defeat').length,
    entry_hp_median:median(entered.map(r=>r.checkpoints.entry.state.hp)),exit_hp_median:median(exited.map(r=>r.checkpoints.enemy_exit.state.hp)),
    entry_hp_control_clears:rows.filter(r=>r.hp_controls.entry?.outcome==='clear').length,
    exit_hp_control_clears:rows.filter(r=>r.hp_controls.enemy_exit?.outcome==='clear').length,
    stages:Object.fromEntries(['terrain','enemy','exit'].map(ph=>[ph,{
      decisions:sum(ph,'decisions'),damage:sum(ph,'damage_received'),initial_main_damage:rows.reduce((n,r)=>n+r.stats[ph].damage_main_origin.p_initial,0),
      initial_material_damage:sum(ph,'damage_using_initial_material'),positive_initial_material_damage:sum(ph,'damage_using_positive_initial_material'),
      no_matched_attack:sum(ph,'no_matched_attack'),initial_attack_available:sum(ph,'initial_attack_available'),combo_available:sum(ph,'combo_available'),
      initial_main_used:sum(ph,'initial_main_used'),initial_material_used:sum(ph,'initial_material_used'),
      enemy_guard_draws:sum(ph,'enemy_guard_draws'),runs_with_enemy_guard_draw:rows.filter(r=>r.stats[ph].enemy_guard_draws>0).length,
      enemy_guards_used:sum(ph,'enemy_guards_used'),runs_with_enemy_guard_use:rows.filter(r=>r.stats[ph].enemy_guards_used>0).length,
      first_guard_draw_after_entry_median:median(rows.filter(r=>r.stats[ph].first_enemy_guard_draw).map(r=>r.stats[ph].first_enemy_guard_draw.p_actions-(r.checkpoints.entry?.state.p_actions||0))),
      max_no_matched_attack_streak:Math.max(...rows.map(r=>r.stats[ph].max_no_matched_attack_streak))
    }]))});
}
const files=['engine.js','feedback.js','ecology.js','terrain.js','input.json','event_inputs.py','event_study.cjs','event_results.json'];
const output={version:'AA1',base_commit:'7f2ee7a9bc7fd707c8819d427357a7ec5df96e05',
  method:'Same 144 Z input/policy conditions. 96 chained explorations and 48 fresh-enemy controls are separate. HP-only continuations fork whole completed actions; no card/order/RNG changes at the fork. Dependent deterministic comparisons, not player win rates.',
  definitions:{initial:'Exact IDs in the initial P deck, excluding later P-generated cards.',
    opportunity:'Counts P decisions with at least one matching legal option; multi-target duplicates count once. Immediate damage zero is not identical to no progress.',
    damage_main_origin:'Observed actual HP loss partitioned by the origin of the main attack card. This does not isolate causal damage contributions.',
    damage_material:'Observed HP loss on attacks using the specified material, overlapping with main-origin categories; do not add these measures.',
    first_guard_time:'Completed P actions at acquisition/draw/availability/use, relative to the completed entry action. A draw can occur just before the next decision. Missing means not observed, not zero waiting time.',
    hp_control:'Set only P HP to 60 after the completed entry/enemy-retirement action. Later HP-dependent choices may change. Artificial diagnostic, not adopted checkpoint healing.',
    followup:'Enemy and environment coexist, then remaining environment continues after enemy retirement. P action cutoff remains 160 absolute actions.'},
  sources:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')])),
  checks:{baseline_final_hashes:baselineChecks,unmodified_boundary_continuations:resumeChecks,hp_only_controls:hpControls,hp_conservation:true},summary,runs};
fs.writeFileSync(path.join(root,'continuity_results.json'),JSON.stringify(output)+'\n');
console.log(JSON.stringify({checks:output.checks,summary},null,2));
}
module.exports={inputs,T,copy,hash,bundleFor,choose,runObserved,continuation};
if(require.main===module)runStudy();
