import C from '../content/m1.mjs';
import I from './information.mjs';
import * as K from './knowledge.mjs';
import {cardSpec,restoreGame} from './game.mjs';
import {check,integer,unique,canonical,copy} from './common.mjs';
import {validateDeck,validateEquipment,checkPlanShape,draftFor,funds,paid} from './preparation.mjs';
import {eligible} from './story.mjs';
import {rewardLedger,receiptSignature} from './settlement.mjs';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function safeID(x,field) {check(typeof x==='string'&&x.length>0&&x.length<=1024&&!['__proto__','prototype','constructor'].includes(x),'invalid_identifier',field);}
function rng(state) {return Array.isArray(state)&&state.length===625&&state.slice(0,624).every(n=>integer(n)&&n<=0xffffffff)&&integer(state[624])&&state[624]<=624;}
export function validateDocument(d) {
  check(object(d)&&d.schema==='CW-M1-save-1','unsupported_save_schema');
  check(d.rule_set_id===C.rule_set_id,'unsupported_rule_set');check(d.content_set_id===C.content_set_id,'unsupported_content_set');
  check(d.engine_version===C.engine_version,'unsupported_engine_version');
  for(const key of ['revision','session','draft','casebook','request_log','public_history'])check(Object.hasOwn(d,key),'missing_save_field',key);
  check(integer(d.revision)&&typeof d.view_nonce==='string'&&d.view_nonce.length>0,'invalid_revision');
  const s=d.session;check(object(s)&&['home','exploring','return'].includes(s.phase)&&integer(s.nextRun),'invalid_session');
  safeID(s.campaign_id,'campaign_id');check(object(d.casebook)&&object(d.casebook['SCN-001']),'missing_casebook');
  const c=d.casebook['SCN-001'],e=s.economy;
  check(object(e)&&e.schema==='AP1'&&e.profile?.schema==='AH1'&&object(e.inventory)&&object(e.profile.learned),'invalid_economy');
  check(integer(e.profile.points)&&integer(e.remainder)&&e.remainder<100&&integer(funds(e))&&integer(paid(e)),'invalid_funds');
  check(Object.entries(e.profile.learned).every(([id,n])=>Object.hasOwn(C.rules.learning.bases,id)&&integer(n)),'invalid_learning');
  check(unique(e.profile.unlocked)&&e.profile.unlocked.every(id=>Object.hasOwn(C.cards,id))&&C.initial.unlocked.every(id=>e.profile.unlocked.includes(id)),'invalid_unlocks');
  check(object(e.profile.materials)&&Object.entries(e.profile.materials).every(([id,n])=>id==='M'&&integer(n)),'invalid_materials');
  check(Object.keys(e.inventory).length===0&&e.at?.current===null&&Object.keys(e.at.batches).length===0,'feature_not_connected','inventory_or_offers');
  check(Array.isArray(e.at.pending_contexts)&&unique(e.at.pending_contexts.map(x=>x.run)),'invalid_pending_offers');
  validateDeck(s.au?.deck);check(e.aq?.policy==='cost','unsupported_equipment_policy');validateEquipment(e,e.aq.equipped);
  check(canonical(K.validate(e.profile.knowledge))===canonical(e.profile.knowledge),'invalid_knowledge');
  if(d.draft!==null){checkPlanShape(d.draft.plan);check(integer(d.draft.based_on_revision)&&d.draft.based_on_revision<=d.revision,'invalid_draft_revision');
    const computed=draftFor(s,d.draft.plan,d.draft.based_on_revision);for(const key of ['dirty','valid','errors'])check(canonical(computed[key])===canonical(d.draft[key]),'invalid_draft',key);}
  check(object(s.receipts)&&object(d.request_log)&&Array.isArray(d.public_history),'invalid_ledgers');
  for(const [id,row] of Object.entries(d.request_log)){safeID(id,'request_id');check(typeof row.signature==='string'&&integer(row.committed_revision)&&row.committed_revision<=d.revision,'invalid_request_log');}
  const runs=Object.keys(s.receipts);
  for(const [run,r] of Object.entries(s.receipts)) {
    check(r.run===run&&integer(r.index)&&r.seed===r.index&&run===JSON.stringify(['CW-M1-run-1',s.campaign_id,r.index]),'invalid_receipt_run');
    check(r.content_set_id===C.content_set_id&&r.case_id==='SCN-001'&&['clear','withdrawal','defeat'].includes(r.outcome)&&r.signature===receiptSignature(r),'invalid_receipt');
    check(r.settlement_event_id===JSON.stringify(['CW-M1-settlement-1',run]),'invalid_settlement_event');
    check(unique(r.kept)&&unique(r.lost)&&!r.kept.some(k=>r.lost.includes(k))&&canonical([...r.kept,...r.lost].sort())===canonical(Object.keys(r.reward_ledger).sort()),'invalid_reward_partition');
    for(const [key,row] of Object.entries(r.reward_ledger)) {
      const spec=C.rewards[row.reward_id];check(spec&&row.run===run&&key===JSON.stringify(['CW-M1-reward-1',run,spec.id,spec.source_event_id])&&row.source_event_id===spec.source_event_id&&canonical(row.items)===canonical(spec.items),'invalid_reward_reference');
      check(r.kept.includes(key)===(r.outcome==='clear'||r.outcome==='withdrawal'&&row.protected),'invalid_reward_retention');
    }
    const gained=r.kept.flatMap(k=>r.reward_ledger[k].items).filter(x=>x.kind==='points').reduce((n,x)=>n+x.amount_units,0);
    check(gained===r.gained_units&&integer(r.unspent_after_units)&&integer(r.paid_learning_units)&&r.home_hp===40&&integer(r.expedition_end_hp)&&r.expedition_end_hp<=40,'invalid_receipt_funds');
    check(e.profile.returns[run]===r.signature,'invalid_profile_receipt');
  }
  check(integer(c.attempts)&&['unresolved','resolved'].includes(c.status)&&unique(c.visible_clue_ids)&&unique(c.read_text_ids)&&object(c.first_clue_events)&&object(c.run_achievements),'invalid_case');
  const active=s.active;
  if(s.phase==='home')check(active===null&&s.game===null&&e.profile.phase==='home'&&e.profile.run===null,'invalid_home');
  else {
    check(object(active)&&object(s.game)&&active.case_id==='SCN-001'&&active.content_set_id===C.content_set_id,'invalid_active');
    check(integer(active.index)&&active.seed===active.index&&active.run===JSON.stringify(['CW-M1-run-1',s.campaign_id,active.index]),'invalid_run');
    const before=active.departure_case_state;check(before&&integer(before.attempts_before)&&before.attempts_before===active.index,'invalid_departure_case');
    const mode=before.status==='resolved'?'revisit':before.status==='unresolved'?(before.attempts_before?'retry':'first'):null;
    check(mode&&active.mode===mode,'invalid_saved_mode');
    const setID=mode==='revisit'?'SCN-001-SET-REVISIT':'SCN-001-SET-UNRESOLVED';check(active.target_set_id===setID&&canonical(active.targets)===canonical(C.target_sets[setID].slot_map),'invalid_target_reference');
    check(unique(active.published_scene_ids)&&active.published_scene_ids.every(id=>C.scenes[id])&&unique(active.read_text_ids)&&unique(active.published_clue_ids)&&unique(active.emitted_conditionals),'invalid_active_story');
    const game=restoreGame(s);game.assert();check(game.s.ah.run===active.run,'invalid_game_run');
    check(Object.values(s.game.rng).every(rng)&&Object.values(s.game.future_rng).every(rng),'invalid_rng');
    for(const w of ['P','V0','E1','V1'])for(const purpose of ['initial','allocation','generation','selection','target']) {
      const key=w+'|'+purpose;check(rng(s.game.future_rng[key]),'missing_future_rng');if(game.s.actors[w])check(rng(s.game.rng[key]),'missing_actor_rng');
    }
    for(const card of Object.values(game.s.cards))check(cardSpec(card.type)&&canonical(I.card(card))===canonical(I.card(cardSpec(card.type))),'invalid_card_registry');
    for(const [w,a] of Object.entries(game.s.actors)){check(w==='P'||active.targets[w],'unknown_actor');const spec=w==='P'?C.rules.player:C.targets[active.targets[w]].spec;
      check(a.max_hp===spec.hp&&a.max_posture===spec.max_posture&&a.hand_size===spec.hand_size,'invalid_actor_spec');}
    check(canonical(K.validate(game.s.ah.knowledge))===canonical(game.s.ah.knowledge),'invalid_game_knowledge');
    check(canonical(active.reward_ledger)===canonical(rewardLedger(s)),'invalid_active_reward_ledger');
    if(s.phase==='return'){
      const r=s.receipts[active.run];check(r&&game.s.outcome===r.outcome&&game.s.settlement?.reason===r.outcome&&r.expedition_end_hp===game.s.actors.P.hp,'invalid_saved_return');
      check(canonical(r.reward_ledger)===canonical(active.reward_ledger)&&r.unspent_after_units===funds(e)&&r.paid_learning_units===paid(e)&&e.profile.phase==='home'&&e.profile.run===null,'invalid_return_economy');
    }else {check(!game.s.outcome&&!game.s.settlement&&!s.receipts[active.run]&&e.profile.phase==='exploring'&&e.profile.run===active.run,'invalid_saved_exploration');runs.push(active.run);}
  }
  check(new Set(runs).size===s.nextRun&&c.attempts===s.nextRun,'invalid_attempts');
  for(let i=0;i<s.nextRun;i++)check(runs.includes(JSON.stringify(['CW-M1-run-1',s.campaign_id,i])),'missing_run');
  const first=Object.values(s.receipts).find(r=>r.settlement_event_id===c.first_resolved_event);
  check(c.status==='resolved'?first?.outcome==='clear'&&first.mode!=='revisit'&&Object.values(first.reward_ledger).some(r=>r.reward_id==='SCN-001-RW03'):c.first_resolved_event===null&&!Object.values(s.receipts).some(r=>r.outcome==='clear'&&r.mode!=='revisit'),'invalid_case_resolution');
  if(c.first_route_checked_event!==null){const r=Object.values(s.receipts).find(r=>r.settlement_event_id===c.first_route_checked_event);check(r?.outcome==='clear'&&r.mode==='revisit','invalid_route_checked');}
  for(const event of d.public_history){check(typeof event.id==='string'&&C.scenes[event.scene_id]&&Array.isArray(event.text_ids)&&object(event.context),'invalid_public_event');
    for(const id of event.text_ids)check(C.texts[id]&&eligible(C.texts[id].eligible_when,event.context),'invalid_text_provenance');}
  for(const id of c.visible_clue_ids){const clue=C.clues[id],event=d.public_history.find(e=>e.id===c.first_clue_events[id]);
    check(clue&&event&&clue.publication_text_ids.some(t=>event.text_ids.includes(t))&&(id!=='SCN-001-CL05'||event.kind==='displayed'),'invalid_clue_provenance');}
  for(const id of c.read_text_ids)check(C.texts[id]&&d.public_history.some(e=>e.kind==='displayed'&&e.text_ids.includes(id)),'invalid_read_provenance');
  if(s.scene){const sc=s.scene;check(C.scenes[sc.id]&&typeof sc.pause==='boolean'&&unique(sc.text_ids)&&unique(sc.optional_text_ids),'invalid_scene');
    const ev=d.public_history.find(e=>e.id===sc.publication_event_id);check(ev?.scene_id===sc.id,'invalid_scene_publication');
    for(const id of sc.text_ids)check(C.texts[id]&&d.public_history.some(e=>e.scene_id===sc.id&&e.text_ids.includes(id)),'unpublished_scene_text');
    for(const id of sc.optional_text_ids)check(C.texts[id]?.kind==='detail'&&eligible(C.texts[id].eligible_when,sc.context),'invalid_optional_text');}
  for(const ctx of e.at.pending_contexts){const r=s.receipts[ctx.run];check(r&&r.kept.length&&ctx.seed===r.seed&&ctx.index===r.index&&ctx.tier==='I'&&canonical(ctx.sources)===canonical([...r.kept].sort()),'invalid_pending_offer_context');}
  return copy(d);
}
