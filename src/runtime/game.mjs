// Shared AM resolver + AH passive/route rules + AI borrowed-card observation.
// Scenario content is injected from the pinned M1 registry. No player policy.
import C from '../content/m1.mjs';
import {CoreGame, MT} from './core.mjs';
import I from './information.mjs';
import * as K from './knowledge.mjs';
import {runStreams} from './random.mjs';
import {copy, check} from './common.mjs';
import {abilityChanges} from './action-public.mjs';
import {contentFor} from './content.mjs';
import {blueprint,compileCard,variantSpec,adjustedEffect} from './affixes.mjs';
import {resolve} from './items.mjs';
import {economyVersion} from './versions.mjs';

export const cardSpec = (type,contentSet=C.content_set_id) => {
  const content=contentFor(contentSet);return content.cards[type]?.card||content.runtime_supply_cards[type]||variantSpec(type,contentSet);
};
export function bundleFor(targetSet,contentSet=C.content_set_id) {
  const C=contentFor(contentSet);
  const set = C.target_sets[targetSet];
  check(set, 'unknown_target_set');
  return {actor_specs: {P: C.rules.player, ...Object.fromEntries(Object.entries(set.slot_map).map(([w,id]) => [w, C.targets[id].spec]))},
    target_set_id: targetSet, targets: set.slot_map,content_set_id:contentSet};
}
export class Game extends CoreGame {
  constructor(bundle, saved) { super(bundle, saved);this.content=contentFor(bundle.content_set_id||C.content_set_id); }
  save() { return {...super.save(), future_rng: copy(this.bundle.future_rng)}; }
  cost(type, match) { const spec = cardSpec(type,this.content.content_set_id); check(spec, 'unknown_card_base'); return match ? spec.match_cost : spec.place_cost; }
  stats(c) { Object.assign(c, copy(cardSpec(c.type,this.content.content_set_id))); }
  enter(w, at) {
    const C=this.content;
    check(!this.s.actors[w], 'duplicate_actor');
    const spec = this.bundle.actor_specs[w], role = w === 'P' ? 'P' : w[0];
    const a = {role, acts: true, hp: spec.hp, max_hp: spec.hp, hit: 0, max_posture: spec.max_posture,
      crit: 0, defense_effects: [], hand: [], deck: [], active: true, next_at: at, actions: 0,
      hand_size: spec.hand_size, initial_size: 12, cap: 12, minimum: spec.hand_size, passives: [], rebuilds: 0};
    this.s.actors[w] = a;
    for (const purpose of ['initial','allocation','generation','selection','target']) {
      const key = w + '|' + purpose; this.rng[key] = new MT(this.bundle.future_rng[key]);
    }
    const t = C.targets[this.bundle.targets[w]];
    // Preserve AH/AM authored order BEFORE shuffling and apply NT replacements in place.
    const types = role === 'V'
      ? ['weak_A','weak_A', ...Array(6).fill('weak_B'), 'weak_C','weak_C','weak_D','weak_D']
      : ['f','f','h','h','l','l','j','j','g','g','r','r'];
    for (const replacement of t.initial_replacements) {
      let n = 0;
      for (let i=0; i<types.length && n<replacement.count; i++) if(types[i]===replacement.base) {types[i]=replacement.replacement; n++;}
    }
    for (const type of types) a.deck.push(this.newCard(w, 'initial', null, cardSpec(type,C.content_set_id)));
    this.stream(w, 'initial').shuffle(a.deck);
    this.memory.recent[w] = []; this.memory.observed_types[w] = [];
    const ledger = I.empty();
    I.add(ledger, {id: 'authored-'+t.id, run: 'M1-authoring', version: t.catalogue_version, profile: t.knowledge_profile_id,
      kind: 'initial_catalogue_grant', complete: true, evidence: 'Pinned authored initial cards before actions',
      cards: types.map(type => ({card: cardSpec(type,C.content_set_id), initial_count: 1}))});
    this.s.ah.catalogues[t.catalogue_version] = {[t.knowledge_profile_id]: ledger.events[0].cards};
    this.fact(w, {kind: 'encounter'});
    this.log('enter', {actor: w, first_at: at});
  }
  fact(w, data) {
    const C=this.content;
    const ah = this.s.ah, t = C.targets[this.bundle.targets[w]];
    K.receive(ah.knowledge, {id: `${ah.run}:${++ah.seq}`, run: ah.run, version: t.catalogue_version,
      profile: t.knowledge_profile_id, actor: w, time: this.s.now, ...data}, 'first_resolution', ah.catalogues);
  }
  target(w) { return this.bundle.actor_specs[w].targets.find(id => this.s.actors[id]?.active); }
  observeOwnedCards(ids) {
    const C=this.content;
    const ah=this.s.ah;
    for(const id of ids){
      const c=this.s.cards[id];if(c.origin==='P')continue;
      const t=C.targets[this.bundle.targets[c.origin]],signature=I.signature(c);
      if(!ah.knowledge.events.some(e=>e.kind==='observed_card'&&e.run===ah.run&&e.profile===t.knowledge_profile_id&&e.version===t.catalogue_version&&I.signature(e.card)===signature))
        this.fact(c.origin,{kind:'observed_card',actor:'P',card:c});
    }
  }
  rebuild(w) {
    super.rebuild(w);
    // All kinds in the player's rebuilt deck are public (basic design 6.3),
    // even before the next draw. Retain that knowledge across return.
    if(w==='P')this.observeOwnedCards(this.s.actors.P.deck);
  }
  refill(w) {
    super.refill(w);
    if (w !== 'P') return;
    const ah = this.s.ah;
    this.observeOwnedCards(this.s.actors.P.hand);
    for (const id of this.s.actors.P.hand) {
      const c = this.s.cards[id]; if (c.origin === 'P') continue;
      if (['nt_flow','nt_pressure','nt_stop'].includes(c.type) && !ah.known_bases_at_departure.includes(c.type)) ah.borrowed_first[c.type] = true;
    }
  }
  equipment() {
    return this.s.ah.equipment_entries||this.s.ah.equipped.map(id=>({id,blueprint:blueprint('passive',id.slice(5))}));
  }
  hasPassive(base) { return this.equipment().some(x=>x.blueprint.base===base); }
  effect(w,c) {
    const out={ids:[],hit:0,power:0,discount:0};if(w!=='P')return out;
    const match=!!this.s.field[c.attr],p=this.s.ah.pending;
    for(const entry of this.equipment()) {
      const b=entry.blueprint,base=b.base,input=this.content.rules.learning.bases[base];
      const part={ids:[],hit:0,power:0,discount:0};
      if(base==='PS01'&&p.after_guard&&!match){part.ids.push(base);part.discount=input.placement_discount;}
      if(base==='PS02'&&match&&c.kind==='attack'&&p.last_match_attr&&p.last_match_attr!==c.attr){part.ids.push(base);part.hit=input.hit_bonus;}
      if(base==='PS03'&&match&&c.kind==='guard'&&p.borrowed_guard){part.ids.push(base);part.power=input.guard_bonus;}
      if(base==='PS04'&&match&&c.kind==='heal'&&c.consume_on_recover){part.ids.push(base);part.power=input.heal_bonus;}
      const adjusted=adjustedEffect(part,b,c,w);out.ids.push(...adjusted.ids);
      for(const field of ['hit','power','discount'])out[field]+=adjusted[field];
    }
    return out;
  }
  predict(choice, w='P') {
    // Fork without save()/state(), which refreshes N on the source object.
    const after=new this.constructor(copy(this.bundle),{state:copy(this.s),next_card_number:this.number,memory:copy(this.memory),
      rng:Object.fromEntries(Object.entries(this.rng).map(([key,rng])=>[key,rng.state()]))});
    after.play(w,choice); // Exactly one resolution, including departures. Never advance()/NPC/refill.
    const row=after.trace.findLast(x=>x.type==='action'&&x.actor===w);
    const keys=['mode','crit_added','actual_hp_loss','hit_gain','hit_connected','posture_before','posture_after',
      'posture_overflow','posture_multiplier','hp_restored','passives','action_cost'];
    return {...Object.fromEntries(keys.map(k=>[k,copy(row[k])])),guard:row.mode==='guard'?after.guard(w):null,
      resolution_scope:'after_current_action_before_next_actor',actor_changes:abilityChanges(this,after)};
  }
  play(w, choice) {
    const c=this.s.cards[choice.card_id], played=I.card(c), match=!!this.s.field[c.attr], e=this.effect(w,c), base={power:c.power,hit:c.hit};
    try {c.power+=e.power;c.hit+=e.hit;super.play(w,choice);} finally {Object.assign(c,base);}
    const cost=Math.max(1,this.cost(c.type,match)-e.discount)*(this.bundle.actor_specs[w].action_cost_scale||1);
    if(this.s.actors[w].active)this.s.actors[w].next_at=this.s.now+cost;
    const row=this.trace.findLast(x=>x.type==='action'&&x.actor===w);
    Object.assign(row,{passives:e.ids,action_cost:cost,card_name:played.name});
    if(w==='P') {
      const ah=this.s.ah, p=ah.pending;
      p.after_guard=this.hasPassive('PS01')&&match&&c.kind==='guard';
      if(match) {p.last_match_attr=c.attr;if(c.kind==='guard')p.borrowed_guard=false;
        if(this.hasPassive('PS03')&&c.origin!=='P')p.borrowed_guard=true;}
    } else this.fact(w,{kind:'observed_card',card:played});
  }
  dispatch(victim, attacker) {
    const C=this.content;
    const old=this.s.current_event;
    if(victim==='P')this.settle('defeat');
    else {
      const t=C.targets[this.bundle.targets[victim]], reward=C.rewards[t.reward_id], tr=C.transitions[reward.source_event_id];
      const key=reward.id;
      this.acquire(key,victim);
      if(tr.protect)for(const r of Object.values(this.s.rewards))r.protected=true;
      this.fact(victim,{kind:'resolution',result:tr.trigger.result});
      this.fact(victim,{kind:'observed_reward',reward_key:key,label:reward.items.map(x=>x.kind==='points'?`${x.amount_units/100}習得点`:x.kind==='unlock'?`札解放:${cardSpec(x.type).name}`:`素材 ${x.type} ${x.amount}`).join('、')});
      if(victim==='E1')this.s.ah.enemy_result='defeated';
      this.retire(victim);
      for(const id of tr.retire_surviving_targets) {
        const w=C.targets[id].runtime_actor_id;
        if(this.s.actors[w]?.active){this.fact(w,{kind:'resolution',result:'retired'});this.retire(w);if(w==='E1')this.s.ah.enemy_result='retired';}
      }
      for(const id of tr.enter_targets)this.enter(C.targets[id].runtime_actor_id,this.s.now);
      if(tr.pause_scene_id)this.s.pending_scene=tr.pause_scene_id;
      if(victim==='V0')this.s.current_event='A/terminal';
      if(tr.terminal){this.s.current_event='A/finished';this.settle('clear');}
    }
    const row={number:++this.s.boundary_number,event:victim==='P'?'player_defeated':victim[0]==='V'?'traversed':'defeated',victim,attacker,time:this.s.now,
      P_actions:this.s.actors.P.actions,from_event:old,to_event:this.s.current_event};
    this.s.events.push(row);this.log('boundary',row);
  }
  advance() {
    let steps=0;
    while(!this.s.ready&&!this.s.outcome&&!this.s.pending_scene&&!this.s.diagnostic) {
      if(++steps>10000){this.s.diagnostic='step_budget';break;} this.step();
    }
  }
}
export async function departGame({target_set_id, run, seed, deck, equipped, learned, knowledge,inventory={},content_set_id=C.content_set_id}) {
  const content=contentFor(content_set_id);
  const bundle=bundleFor(target_set_id,content_set_id); bundle.future_rng=await runStreams(seed);
  const rng=Object.fromEntries(Object.entries(bundle.future_rng).filter(([k])=>k.startsWith('P|')));
  const cards={}, ids=[...deck].sort().map((handle,i)=>{
    const id='P_initial_'+String(i+1).padStart(4,'0');
    const row=resolve({inventory,profile:{learned:Object.fromEntries(learned.map(x=>[x,0]))}},handle,'card');
    const spec=row.uid===null?cardSpec(row.blueprint.base,content_set_id):compileCard(row.blueprint,content_set_id);
    cards[id]={...copy(spec),id,origin:'P',birth:'initial',remaining:null,doomed:false,destroyed:false,selection_id:handle};return id;
  });
  const shuffle=new MT(rng['P|initial']);shuffle.shuffle(ids);rng['P|initial']=shuffle.state();
  const p={role:'P',acts:true,hp:40,max_hp:40,hit:0,max_posture:100,crit:0,defense_effects:[],hand:[],deck:ids,active:true,next_at:0,actions:0,
    hand_size:3,initial_size:12,cap:12,minimum:3,passives:[],rebuilds:0};
  const known=[...new Set(knowledge.events.flatMap(e=>e.kind==='observed_card'?[e.card.type]:e.kind==='initial_catalogue_grant'?e.cards.map(r=>r.card.type):[]))];
  const equipment_entries=equipped.map(id=>resolve({inventory,profile:{learned:Object.fromEntries(learned.map(x=>[x,0]))}},id,'passive'));
  const state={economy_version:economyVersion,posture_rule:'AM1',defense_rule:'D56',actors:{P:p},cards,pool:[],field:{},rewards:{},events:[],boundary_number:0,now:0,ready:false,outcome:null,settlement:null,
    rules:'corrected',p_size:12,current_event:'A/start',pending_scene:null,diagnostic:null,
    ah:{run,learned:copy(learned),equipped:copy(equipped),equipment_entries,pending:{after_guard:false,last_match_attr:null,borrowed_guard:false},
      knowledge:copy(knowledge),catalogues:{},seq:0,enemy_result:null,borrowed_first:{},known_bases_at_departure:known}};
  const initial={state,next_card_number:12,memory:{recent:{P:[]},observed_types:{}},rng};
  const game=new Game(bundle,initial);
  for(const id of content.target_sets[target_set_id].initial_targets)game.enter(content.targets[id].runtime_actor_id,0);
  game.assert();return game.save();
}
export const restoreGame = session => new Game({...bundleFor(session.active.target_set_id,session.active.content_set_id),future_rng:session.game.future_rng},session.game);
