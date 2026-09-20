import {migrateLegacyDefense,validateDefense,validateLegacyDefense} from './defense.mjs';
import C from '../content/m1.mjs';
import I from './information.mjs';
import * as K from './knowledge.mjs';
import {cardSpec,restoreGame} from './game.mjs';
import {check,integer,unique,canonical,copy} from './common.mjs';
import {validateDeck,validateEquipment,checkPlanShape,draftFor,funds,paid} from './preparation.mjs';
import {eligible} from './story.mjs';
import {rewardLedger,receiptSignature} from './settlement.mjs';
import {contentFor} from './content.mjs';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function safeID(x,field) {check(typeof x==='string'&&x.length>0&&x.length<=1024&&!['__proto__','prototype','constructor'].includes(x),'invalid_identifier',field);}
function rng(state) {return Array.isArray(state)&&state.length===625&&state.slice(0,624).every(n=>integer(n)&&n<=0xffffffff)&&integer(state[624])&&state[624]<=624;}
function validate(d) {
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
  check(Array.isArray(s.action_history),'invalid_action_history');
  for(const row of s.action_history){
    check(object(row)&&['action','boundary'].includes(row.type),'invalid_action_history');
    // Optional additive field: old saves keep missing names, never inferred from the registry.
    if(Object.hasOwn(row,'card_name'))check(row.type==='action'&&typeof row.card_id==='string'&&typeof row.card_name==='string'&&row.card_name.length>0,'invalid_history_card_name');
  }
  for(const [id,row] of Object.entries(d.request_log)){safeID(id,'request_id');check(typeof row.signature==='string'&&integer(row.committed_revision)&&row.committed_revision<=d.revision,'invalid_request_log');}
  const runs=Object.keys(s.receipts);
  for(const [run,r] of Object.entries(s.receipts)) {
    const content=contentFor(r.content_set_id);
    check(r.run===run&&integer(r.index)&&r.seed===r.index&&run===JSON.stringify(['CW-M1-run-1',s.campaign_id,r.index]),'invalid_receipt_run');
    check(r.case_id==='SCN-001'&&['clear','withdrawal','defeat'].includes(r.outcome)&&r.signature===receiptSignature(r),'invalid_receipt');
    check(['first','retry','revisit'].includes(r.mode)&&(r.index===0?r.mode==='first':r.mode!=='first'),'invalid_receipt_mode');
    const setID=r.mode==='revisit'?'SCN-001-SET-REVISIT':'SCN-001-SET-UNRESOLVED';
    check(r.target_set_id===setID,'invalid_receipt_target_set');
    check(r.settlement_event_id===JSON.stringify(['CW-M1-settlement-1',run]),'invalid_settlement_event');
    check(unique(r.kept)&&unique(r.lost)&&!r.kept.some(k=>r.lost.includes(k))&&canonical([...r.kept,...r.lost].sort())===canonical(Object.keys(r.reward_ledger).sort()),'invalid_reward_partition');
    for(const [key,row] of Object.entries(r.reward_ledger)) {
      const spec=content.rewards[row.reward_id];check(spec&&row.run===run&&key===JSON.stringify(['CW-M1-reward-1',run,spec.id,spec.source_event_id])&&row.source_event_id===spec.source_event_id&&canonical(row.items)===canonical(spec.items),'invalid_reward_reference');
      const target=content.targets[spec.target_id];
      check(row.key===key&&row.case_id===r.case_id&&row.mode===r.mode&&row.target_set_id===r.target_set_id&&row.content_set_id===content.content_set_id&&
        row.target_id===target.id&&row.catalogue_version===target.catalogue_version&&row.legacy_engine_key===spec.legacy_engine_key&&content.target_sets[setID].targets.includes(target.id),'invalid_reward_source');
      check(typeof row.protected==='boolean','invalid_reward_protection');
      check(r.kept.includes(key)===(r.outcome==='clear'||r.outcome==='withdrawal'&&row.protected),'invalid_reward_retention');
    }
    const gained=r.kept.flatMap(k=>r.reward_ledger[k].items).filter(x=>x.kind==='points').reduce((n,x)=>n+x.amount_units,0);
    check(gained===r.gained_units&&integer(r.unspent_after_units)&&integer(r.paid_learning_units)&&r.home_hp===40&&integer(r.expedition_end_hp)&&r.expedition_end_hp<=40,'invalid_receipt_funds');
    check(e.profile.returns[run]===r.signature,'invalid_profile_receipt');
    if(r.outcome==='clear')check(Object.values(r.reward_ledger).some(row=>row.reward_id===(r.mode==='revisit'?'SCN-001-RW05':'SCN-001-RW03')),'invalid_clear_receipt');
    check(canonical([...r.source_events].sort())===canonical(Object.values(r.reward_ledger).map(row=>row.source_event_id).sort()),'invalid_receipt_sources');
  }
  const receipts=Object.values(s.receipts);
  check(funds(e)+paid(e)===receipts.reduce((n,r)=>n+r.gained_units,0),'invalid_economy_total');
  const keptItems=receipts.flatMap(r=>r.kept.flatMap(k=>r.reward_ledger[k].items));
  const unlocked=[...new Set([...C.initial.unlocked,...keptItems.filter(x=>x.kind==='unlock').map(x=>x.type)])].sort();
  check(canonical([...e.profile.unlocked].sort())===canonical(unlocked),'invalid_unlock_provenance');
  const materialCount=keptItems.filter(x=>x.kind==='material').reduce((n,x)=>n+x.amount,0);
  check((e.profile.materials.M||0)===materialCount,'invalid_material_provenance');
  check(integer(c.attempts)&&['unresolved','resolved'].includes(c.status)&&unique(c.visible_clue_ids)&&unique(c.read_text_ids)&&object(c.first_clue_events)&&object(c.run_achievements),'invalid_case');
  const active=s.active;
  if(s.phase==='home')check(active===null&&s.game===null&&e.profile.phase==='home'&&e.profile.run===null,'invalid_home');
  else {
    check(object(active)&&object(s.game)&&active.case_id==='SCN-001','invalid_active');
    const content=contentFor(active.content_set_id);
    check(integer(active.index)&&active.seed===active.index&&active.run===JSON.stringify(['CW-M1-run-1',s.campaign_id,active.index]),'invalid_run');
    const before=active.departure_case_state;check(before&&integer(before.attempts_before)&&before.attempts_before===active.index,'invalid_departure_case');
    const mode=before.status==='resolved'?'revisit':before.status==='unresolved'?(before.attempts_before?'retry':'first'):null;
    check(mode&&active.mode===mode,'invalid_saved_mode');
    const setID=mode==='revisit'?'SCN-001-SET-REVISIT':'SCN-001-SET-UNRESOLVED';check(active.target_set_id===setID&&canonical(active.targets)===canonical(content.target_sets[setID].slot_map),'invalid_target_reference');
    check(unique(active.published_scene_ids)&&active.published_scene_ids.every(id=>C.scenes[id])&&unique(active.read_text_ids)&&unique(active.published_clue_ids)&&unique(active.emitted_conditionals),'invalid_active_story');
    check(s.game.state?.defense_rule==='D56'&&object(s.game.state.actors),'invalid_defense_state');
    for(const a of Object.values(s.game.state.actors))validateDefense(a,s.game.state.actors);
    const game=restoreGame(s);game.assert();check(game.s.ah.run===active.run,'invalid_game_run');
    check(game.s.pending_scene===null&&integer(game.s.now)&&integer(s.game.next_card_number),'invalid_game_checkpoint');
    check(canonical([...game.s.ah.learned].sort())===canonical(Object.keys(e.profile.learned).sort())&&canonical(game.s.ah.equipped)===canonical(e.aq.equipped),'invalid_run_preparation');
    check(Object.values(s.game.rng).every(rng)&&Object.values(s.game.future_rng).every(rng),'invalid_rng');
    for(const w of ['P','V0','E1','V1'])for(const purpose of ['initial','allocation','generation','selection','target']) {
      const key=w+'|'+purpose;check(rng(s.game.future_rng[key]),'missing_future_rng');if(game.s.actors[w])check(rng(s.game.rng[key]),'missing_actor_rng');
    }
    for(const [id,card] of Object.entries(game.s.cards))check(card.id===id&&typeof card.destroyed==='boolean'&&typeof card.doomed==='boolean'&&cardSpec(card.type,active.content_set_id)&&canonical(I.card(card))===canonical(I.card(cardSpec(card.type,active.content_set_id))),'invalid_card_registry');
    const playerInitial=Object.values(game.s.cards).filter(c=>c.origin==='P'&&c.birth==='initial').map(c=>'base:'+c.type).sort();
    check(canonical(playerInitial)===canonical([...s.au.deck].sort()),'invalid_initial_player_cards');
    for(const [w,a] of Object.entries(game.s.actors)){check(w==='P'||active.targets[w],'unknown_actor');const spec=w==='P'?content.rules.player:content.targets[active.targets[w]].spec;
      check(a.max_hp===spec.hp&&a.max_posture===spec.max_posture&&a.hand_size===spec.hand_size,'invalid_actor_spec');
      if(w!=='P'){
        const t=content.targets[active.targets[w]],authored=I.empty();
        I.add(authored,{id:'registry',run:'registry',version:t.catalogue_version,profile:t.knowledge_profile_id,
          kind:'initial_catalogue_grant',complete:true,evidence:'content registry',
          cards:Object.entries(t.initial_card_counts).filter(([,n])=>n>0).map(([type,n])=>({card:cardSpec(type,active.content_set_id),initial_count:n}))});
        check(canonical(game.s.ah.catalogues[t.catalogue_version]?.[t.knowledge_profile_id])===canonical(authored.events[0].cards),'invalid_authored_catalogue');
      }
    }
    check(!game.s.actors.V1||game.s.actors.V0.active===false,'invalid_target_transition');
    check(canonical(K.validate(game.s.ah.knowledge))===canonical(game.s.ah.knowledge),'invalid_game_knowledge');
    check(canonical(active.reward_ledger)===canonical(rewardLedger(s)),'invalid_active_reward_ledger');
    if(s.phase==='return'){
      const r=s.receipts[active.run];check(r&&game.s.outcome===r.outcome&&game.s.settlement?.reason===r.outcome&&r.expedition_end_hp===game.s.actors.P.hp,'invalid_saved_return');
      check(r.outcome==='defeat'?game.s.actors.P.hp===0:game.s.actors.P.hp>0,'invalid_outcome_hp');
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
  if(s.phase==='exploring'&&!s.scene?.pause&&!s.game.state.diagnostic)check(s.game.state.ready,'invalid_unpaused_checkpoint');
  for(const ctx of e.at.pending_contexts){const r=s.receipts[ctx.run];check(r&&r.kept.length&&ctx.seed===r.seed&&ctx.index===r.index&&ctx.tier==='I'&&canonical(ctx.sources)===canonical([...r.kept].sort()),'invalid_pending_offer_context');}
  return copy(d);
}
export function validateDocument(d) {
  try {
    // Only complete, known old version pairs may migrate. Never mutate the supplied document.
    const legacy=['0.1','0.2','0.3','0.4'].find(v=>d?.rule_set_id==='CW-M1-rules-'+v&&d?.engine_version==='CW-M1-engine-'+v);
    if(legacy){
      check(d.content_set_id==='CW-M1-SCN001-0.1','unsupported_content_set');
      if(d.session?.active)check(d.session.active.content_set_id===d.content_set_id,'invalid_active_content_version');
      for(const r of Object.values(d.session?.receipts||{}))check(r.content_set_id===d.content_set_id,'invalid_receipt_content_version');
    }
    // Check raw values before JSON copying: NaN/Infinity must not become null (unlimited).
    if(legacy&&d.session?.game){
      const state=d.session.game.state;
      if(['0.3','0.4'].includes(legacy)){
        check(state?.defense_rule==='D56'&&object(state.actors),'invalid_defense_state');
        for(const a of Object.values(state.actors))validateDefense(a,state.actors,{allowRetiredEffects:legacy==='0.3'});
      }else validateLegacyDefense(state);
    }
    const current=legacy?copy(d):d;
    if(legacy){
      if(current.session?.game){
        const state=current.session.game.state;
        if(['0.1','0.2'].includes(legacy))migrateLegacyDefense(state);
        // Old versions retained current effects on retired actor records. Historical logs stay intact.
        if(legacy!=='0.4')for(const a of Object.values(state.actors))if(!a.active)a.defense_effects=[];
      }
      // The installed registry advances; each active run and receipt keeps its authored
      // content version. Existing effect tuples/history are never recalculated.
      current.rule_set_id=C.rule_set_id;current.engine_version=C.engine_version;current.content_set_id=C.content_set_id;
    }
    return validate(current);
  }
  catch(error){if(typeof error.code==='string')throw error;throw Object.assign(new Error('invalid_save'),{code:'invalid_save',field:null,details:{}});}
}
