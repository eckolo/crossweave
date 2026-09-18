import C from '../content/m1.mjs';
import {passiveLabels,statLabels} from '../content/display.mjs';
import I from './information.mjs';
import {restoreGame} from './game.mjs';
import {inspectPreparation,draftFor,planFor} from './preparation.mjs';
import {publicStory,nextMode} from './story.mjs';
import {copy} from './common.mjs';
import {publicContract,persistentSources} from './action-public.mjs';
import {knowledgeKey,deckCatalogue,actionHistory} from './references-public.mjs';
export const token = d => d.view_nonce;
const ability=(available,reason)=>({available,reasons:available?[]:[reason]});
export function capabilities(d) {
  const s=d.session,home=s.phase==='home',exploring=s.phase==='exploring',returned=s.phase==='return';
  const dirty=d.draft?.dirty===true;
  const ops=Object.fromEntries(['save_draft','discard_draft','commit_preparation'].map(op=>[op,ability(home,returned?'return_not_acknowledged':'exploring')]));
  for(const op of ['purchase','convert_items','set_item_lock','quoteConversion','owned_items','affixes'])ops[op]=ability(false,'feature_not_connected');
  ops.previewPreparation=ability(home||returned,'exploring');
  ops.depart=ability(home&&!dirty,home?'dirty_draft':returned?'return_not_acknowledged':'already_exploring');
  ops.play=ability(exploring&&!s.scene?.pause&&s.game.state.ready&&!s.game.state.diagnostic,exploring?(s.scene?.pause?'scene_paused':s.game.state.diagnostic||'not_player_turn'):'not_exploring');
  ops.previewAction=copy(ops.play);ops.withdraw=ability(exploring,'not_exploring');
  ops.continue_scene=ability(!!s.scene?.pause&&!s.game?.state.diagnostic,'scene_not_paused');
  ops.record_displayed_text=ability(!!s.scene&&(home?['SCN-001-S01','SCN-001-S01R'].includes(s.scene.id):true),'scene_not_available');
  ops.ack_return=ability(returned&&!s.scene?.pause,returned?'scene_paused':'not_return');
  return ops;
}
function cardDetail(c) {
  return {name:c.name,base_name:c.name,base_id:c.type,kind:'card',affixes:[],primary:{kind:c.kind,power:c.power,hit:c.hit,evasion:c.evasion,crit_gain:c.crit_gain},
    field:{power:c.field_power,hit:c.field_hit},life:c.life,action_intervals:{place:c.place_cost,match:c.match_cost},
    recovery_rule:c.consume_on_recover?'consumed_on_recovery':c.doomed?'destroyed_on_recovery_retired_origin':c.birth==='filler'?'destroyed_on_recovery_filler':'shared_recovery',
    trigger_text:null,effect_text:null,equipment_cost:null,learning_cost_units:null};
}
function passiveDetail(base) {
  const input=C.rules.learning.bases[base];
  const triggers={PS01:'直前の本人行動が防御一致で、今回が設置',PS02:'直前の本人の一致と異なる属性で攻撃一致',PS03:'他主体由来の札で本人が一致し、その後に防御一致',PS04:'消耗する回復札で本人が回復一致'};
  const effects={PS01:`行動間隔を${input.placement_discount}短縮（最小1）`,PS02:`探査を${input.hit_bonus}加算`,PS03:`身構の基礎値を${input.guard_bonus}加算（使用後に消費）`,PS04:`回復量を${input.heal_bonus}加算（最大余力まで）`};
  return {name:passiveLabels[base],base_name:passiveLabels[base],base_id:base,kind:'passive',affixes:[],primary:null,field:null,life:null,action_intervals:null,recovery_rule:null,
    trigger_text:triggers[base],effect_text:effects[base],equipment_cost:C.rules.equipment.base_cost[base],learning_cost_units:C.rules.learning.cost_units[base]};
}
export function project(d, extras={}) {
  const s=d.session,story=publicStory(d),details={},home=['home','return'].includes(s.phase)?inspectPreparation(s):null;
  // Kept unlock names/details are public, independently of free deck eligibility.
  // UI never needs to parse a knowledge-history label or read the private registry.
  for(const base of s.economy.profile.unlocked)details['base:'+base]=cardDetail(C.cards[base].card);
  if(home){home.offers={status:'none',refresh_rule:'eligible_return',carried_from_previous_return:false,connected:false,reason:'feature_not_connected'};
    for(const base of Object.keys(C.rules.learning.bases))details['base:'+base]=passiveDetail(base);}
  const ledger=s.game?.state.ah.knowledge||s.economy.profile.knowledge;
  const knownTargets=Object.values(C.targets).filter(t=>ledger.encounters.some(e=>e.profile===t.knowledge_profile_id));
  const knowledge_views=knownTargets.map(t=>({key:knowledgeKey(t),target_id:t.id,catalogue_version:t.catalogue_version,name:t.display_name,...I.profileView(ledger,t.knowledge_profile_id,t.catalogue_version,s.active?.run||null,t.runtime_actor_id),
    encountered:true}));
  let exploration=null;
  if(s.phase==='exploring'){
    const game=restoreGame(s),p=game.public(),actors={};
    for(const [id,a] of Object.entries(p.actors)){
      const t=id==='P'?null:C.targets[s.active.targets[id]];
      actors[id]={id,name:t?.display_name||'本人',purpose:t?.purpose||'self',remaining_label:t?.remaining_label||'余力',action_label:t?.action_label||null,
        hp:a.hp,max_hp:a.max_hp,hit:a.hit,posture_remaining:a.posture_remaining,max_posture:a.max_posture,crit:a.crit,guard:a.guard,evasion:a.evasion,
        reduction:a.reduction,active:a.active,next_at:a.next_at,hand_count:a.hand_count,deck_count:a.deck_count,actions:a.actions,
        knowledge_key:t?knowledgeKey(t):null,knowledge_status:t?'encountered':'self',persistent_sources:persistentSources(game,id)};
    }
    const hand=p.actors.P.hand.map(c=>({id:c.id,...I.card(c),remaining:c.remaining,origin:c.origin,doomed:c.doomed}));
    const field=Object.fromEntries(Object.entries(p.field).map(([attr,c])=>[attr,{id:c.id,...I.card(c),origin:c.origin,doomed:c.doomed}]));
    for(const c of [...p.actors.P.hand,...Object.values(p.field)])details[c.id]=cardDetail(c);
    const deck_catalogue=deckCatalogue(game);
    for(const row of deck_catalogue.entries)details[row.detail_id]=cardDetail(row.card);
    exploration={now:p.now,self:actors.P,actors,hand,field,recovery_count:p.pool_count,legal_actions:s.scene?.pause||s.game.state.diagnostic?[]:game.choices(),
      public_history:actionHistory(s.action_history),passive_state:copy(s.game.state.ah.pending),diagnostic:s.game.state.diagnostic,
      deck_catalogue,other_decks:Object.fromEntries(Object.entries(actors).filter(([id])=>id!=='P').map(([id,a])=>[id,
        {status:'unknown',count:a.deck_count,entries:null,reason:'current_private_composition',knowledge_key:a.knowledge_key}])),
      shared_recovery:{status:'count_only',count:p.pool_count,entries:null,reason:'composition_not_published'}};
  }
  const stored=d.draft||draftFor(s,planFor(s),d.revision);
  const draft=home?{plan:copy(stored.plan),dirty:stored.dirty,valid:stored.valid,errors:copy(stored.errors),based_on_current:stored.based_on_revision===d.revision}:null;
  const receipt=s.phase==='return'?s.receipts[s.active.run]:null;
  const return_receipt=receipt?copy(Object.fromEntries(['outcome','gained_units','unspent_after_units','paid_learning_units','kept_items','lost_items','new_unlocks','knowledge_changes','case_changes','expedition_end_hp','home_hp'].map(k=>[k,receipt[k]]))):null;
  return {schema:'CW-M1-view-1',meta:{revision:d.revision,view_token:token(d)},display_data:{public_contract:publicContract,phase:s.phase,capabilities:capabilities(d),home,details,stat_labels:statLabels,
    knowledge_views,texts:story.texts,text_history:story.text_history,action_history:actionHistory(s.action_history),draft,preparation_comparison:null,conversion_quote:null,case:{id:'SCN-001',status:d.casebook['SCN-001'].status,attempts:d.casebook['SCN-001'].attempts,
      available_mode:s.active?.mode||nextMode(d.casebook['SCN-001']),objective_text_id:story.objective,visible_clue_ids:copy(d.casebook['SCN-001'].visible_clue_ids),unlocked_card_ids:copy(s.economy.profile.unlocked)},
    scene:story.scene,exploration,action_preview:null,return_receipt,operation:null,error:null,...extras}};
}
export function actionPreview(d,choice) {
  const g=restoreGame(d.session),p=g.public(),v=g.predict(choice),chosen=g.s.cards[choice.card_id];
  const order={V:0,P:1,E:2};
  const current_reservations=Object.entries(g.s.actors).filter(([,a])=>a.active&&a.acts).sort(([x,a],[y,b])=>a.next_at-b.next_at||order[a.role]-order[b.role]||x.localeCompare(y)).map(([actor,a])=>({actor,at:a.next_at}));
  return {supported:true,...v,matched_field_id:p.field[chosen.attr]?.id||null,passive_effects:v.passives,
    next_self_reservation:p.now+v.action_cost,current_reservations,
    unused_hand_expiry:p.actors.P.hand.filter(c=>c.id!==chosen.id).map(c=>({id:c.id,remaining_before:c.remaining,remaining_after:c.remaining-1,expires:c.remaining===1,
      destination:c.remaining!==1?'hand':c.consume_on_recover||c.doomed||c.birth==='filler'?'destroyed':'shared_recovery'})),
    limits:['current_action_only','current_reservations_not_future_order','next_self_turn_arrival_not_guaranteed']};
}
