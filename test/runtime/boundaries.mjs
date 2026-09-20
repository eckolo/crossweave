import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {restoreGame} from '../../src/runtime/game.mjs';
import {draftFor,planFor} from '../../src/runtime/preparation.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {rewardLedger,receiptSignature} from '../../src/runtime/settlement.mjs';
import C from '../../src/content/m1.mjs';
import {eligible} from '../../src/runtime/story.mjs';
import {MemoryStore,assert,equal,execute,command,currentPlan} from './support.mjs';

export async function boundaries(saved) {
  const checks=[],storage=new MemoryStore(),api=createCampaign({storage});let n=0;
  async function imported(doc){const slot='boundary-'+(++n);const c=await api.importSave({slot_id:slot,document:structuredClone(doc),request_id:'import-'+n});return {c,slot};}
  async function unchanged(c,cmd,code){const before=c.exportSave(),res=await c.execute(cmd);assert(res.display_data.error?.code===code,JSON.stringify({expected:code,actual:res.display_data.error}));equal(c.exportSave(),before,'failure changed controller');return res;}
  const fresh=await api.create({slot_id:'fresh',...versions,request_id:'create'}),initial=fresh.exportSave();
  for(let i=0;i<3;i++)fresh.inspect();equal(fresh.exportSave(),initial,'inspect mutates story');checks.push('inspect_pure_no_clue_or_read');
  const plan=currentPlan(fresh);plan.next_preparation.deck.pop();await execute(fresh,'save_draft',{plan});
  assert(!fresh.inspect().display_data.draft.valid,'incomplete saved draft valid');
  equal((await api.open({slot_id:'fresh'})).exportSave(),fresh.exportSave(),'draft not saved');
  await unchanged(fresh,command(fresh,'depart',{case_id:'SCN-001'}),'dirty_draft');
  await unchanged(fresh,command(fresh,'commit_preparation',{plan}),'invalid_deck_size');
  checks.push('invalid_draft_persists_and_failed_commit_preserves');await execute(fresh,'discard_draft',{});
  const cmd=command(fresh,'depart',{case_id:'SCN-001'});storage.failNext=true;await unchanged(fresh,cmd,'storage_write_failed');equal(await storage.load('fresh'),fresh.exportSave(),'store partial depart');
  const success=await fresh.execute(cmd);assert(success.display_data.operation?.status==='committed','retry after storage failure');
  const at=fresh.exportSave(),rep=await fresh.execute(cmd);assert(rep.display_data.operation?.status==='replayed','same request not replayed');equal(fresh.exportSave(),at,'duplicate departure');
  await unchanged(fresh,{...cmd,payload:{case_id:'other'}},'request_conflict');await unchanged(fresh,command(fresh,'depart',{case_id:'SCN-001'}),'already_exploring');
  checks.push('write_failure_and_departure_replay_no_increment');
  const stale=await api.open({slot_id:'fresh'}),staleCmd=command(stale,'withdraw',{});await execute(fresh,'continue_scene',{scene_id:fresh.inspect().display_data.scene.id});
  await unchanged(stale,staleCmd,'stale_revision');checks.push('stale_controller_preserves_memory');
  const other=await api.open({slot_id:'fresh'}),losing=command(other,'withdraw',{});
  storage.beforeCommit=async()=>{await execute(fresh,'withdraw',{});};
  await unchanged(other,losing,'stale_revision');checks.push('post_compute_cas_loser_no_partial_effect');
  const sameSlot=await imported(saved.entry),peer=await api.open({slot_id:sameSlot.slot}),duplicate=command(sameSlot.c,'withdraw',{});
  storage.beforeCommit=async()=>{const r=await peer.execute(duplicate);assert(r.display_data.operation.status==='committed','race winner');};
  const raced=await sameSlot.c.execute(duplicate);assert(raced.display_data.operation?.status==='replayed','same request race must replay');
  equal(sameSlot.c.exportSave(),peer.exportSave(),'race exact state');checks.push('same_request_concurrent_cas_replays_winner');
  const returned=await api.open({slot_id:'fresh'}),beforeReturn=returned.exportSave();
  const cancel=currentPlan(returned);cancel.cancel_learning=[];
  returned.previewPreparation({view_token:returned.inspect().meta.view_token,plan:cancel});equal(returned.exportSave(),beforeReturn,'return comparison writes');
  await unchanged(returned,command(returned,'commit_preparation',{plan:cancel}),'return_not_acknowledged');
  const ack=command(returned,'ack_return',{});await returned.execute(ack);const afterAck=returned.exportSave();await returned.execute(ack);equal(returned.exportSave(),afterAck,'ack duplicated receipt');
  assert(returned.inspect().display_data.draft.valid&&!returned.inspect().display_data.draft.dirty,'ack draft');
  await unchanged(returned,command(returned,'ack_return',{}),'not_return');await execute(returned,'depart',{case_id:'SCN-001'});
  assert(returned.inspect().display_data.case.available_mode==='retry','unresolved next mode');checks.push('return_preview_ack_new_draft_retry');
  // Natural home had 300 total earned, PS01 paid 200, unspent 100.
  const grow=await imported(saved.home),g=grow.c,pc=currentPlan(g);pc.cancel_learning=['PS01'];pc.retain_learning=[];pc.next_preparation.equipment=[];
  const pre=g.exportSave(),comparison=g.previewPreparation({view_token:g.inspect().meta.view_token,plan:pc}).display_data.preparation_comparison;
  assert(comparison.cancellation.actual_refund_units===200&&comparison.prepared.economy.unspent_units===300,'explicit refund');
  equal(g.exportSave(),pre,'refund preview applied');storage.failNext=true;await unchanged(g,command(g,'commit_preparation',{plan:pc}),'storage_write_failed');
  await execute(g,'commit_preparation',{plan:pc});assert(g.inspect().display_data.home.equipment.entries.length===0,'cancel did not unequip');checks.push('explicit_refund_and_storage_failure_preserve_paid_funds');
  const forbidden=currentPlan(g);forbidden.next_preparation.deck[0]='base:nt_flow';await unchanged(g,command(g,'commit_preparation',{plan:forbidden}),'unknown_selection_handle');
  const noLearn=currentPlan(g);noLearn.next_preparation.equipment=['base:PS02'];await unchanged(g,command(g,'commit_preparation',{plan:noLearn}),'unlearned_equipment_base');
  const buying=currentPlan(g);buying.candidate='choice-1';await unchanged(g,command(g,'commit_preparation',{plan:buying}),'feature_not_connected');checks.push('kept_unlock_not_free_card_and_unconnected_purchase');
  // Explicit historical-paid boundary: retain total earned=300, paid PS01=300, unspent=0.
  const historical=structuredClone(saved.home);historical.session.economy.profile.learned.PS01=3;historical.session.economy.profile.points=0;
  historical.draft=draftFor(historical.session,planFor(historical.session),historical.revision);const hist=(await imported(historical)).c;
  const ph=currentPlan(hist);ph.cancel_learning=['PS01'];ph.retain_learning=[];ph.next_preparation.equipment=[];
  assert(hist.previewPreparation({view_token:hist.inspect().meta.view_token,plan:ph}).display_data.preparation_comparison.cancellation.actual_refund_units===300,'historical paid refund');checks.push('historical_exact_paid_refund_boundary');
  const portImport=await imported(saved.port),port=portImport.c,portState=port.exportSave().session.game;
  assert(port.inspect().display_data.scene.id==='SCN-001-S03','port checkpoint');
  const unavailable='SCN-001-DETAIL06';await unchanged(port,command(port,'continue_scene',{scene_id:'SCN-001-S03',advance:false,displayed_text_ids:[unavailable]}),'text_not_available');
  await execute(port,'continue_scene',{scene_id:'SCN-001-S03'});equal(port.exportSave().session.game,portState,'port changed time/hp/cards/rng');
  assert(!port.inspect().display_data.case.visible_clue_ids.includes('SCN-001-CL05'),'availability gave clue');
  const cause=port.exportSave(),sid=port.inspect().display_data.scene.id;port.inspect();equal(port.exportSave(),cause,'inspect gave optional clue');
  await execute(port,'continue_scene',{scene_id:sid,advance:false,displayed_text_ids:['SCN-001-DETAIL06']});
  equal(port.exportSave().session.game,cause.session.game,'optional detail advanced game');assert(port.inspect().display_data.case.visible_clue_ids.includes('SCN-001-CL05'),'opened detail missing clue');
  equal((await api.open({slot_id:portImport.slot})).exportSave(),port.exportSave(),'optional detail reopen');
  checks.push('port_no_heal_or_shuffle_optional_clue_only_on_display');
  const firstClue=port.exportSave().casebook['SCN-001'].first_clue_events['SCN-001-CL05'];
  await execute(port,'continue_scene',{scene_id:sid,advance:false,displayed_text_ids:['SCN-001-DETAIL06']});
  assert(port.exportSave().casebook['SCN-001'].first_clue_events['SCN-001-CL05']===firstClue,'first clue replaced');
  const withdrawal=(await imported(saved.port)).c;await execute(withdrawal,'withdraw',{});
  assert(withdrawal.inspect().display_data.return_receipt.gained_units===100,'protected withdrawal funds');
  assert(withdrawal.exportSave().session.receipts[withdrawal.exportSave().session.active.run].end_id==='SCN-001-END-W1','port before cause W1');
  assert(!withdrawal.inspect().display_data.case.visible_clue_ids.includes('SCN-001-CL03'),'withdraw invented cause');
  await execute(port,'withdraw',{});assert(port.exportSave().session.receipts[port.exportSave().session.active.run].end_id==='SCN-001-END-W2','after cause W2');
  checks.push('protected_withdrawal_W1_W2_and_first_clue_provenance');
  const unprotected=(await imported(saved.entry)).c;await execute(unprotected,'withdraw',{});
  assert(unprotected.inspect().display_data.return_receipt.gained_units===0,'pre-protection withdrawal');
  assert(unprotected.exportSave().session.receipts[unprotected.exportSave().session.active.run].end_id==='SCN-001-END-W0','W0');
  const defeated=(await imported(saved['second-return'])).c,firstResolved=defeated.exportSave().casebook['SCN-001'].first_resolved_event;
  assert(defeated.inspect().display_data.return_receipt.outcome==='defeat'&&defeated.inspect().display_data.case.status==='resolved','defeat rolled back case');
  assert(defeated.inspect().display_data.return_receipt.gained_units===0&&defeated.inspect().display_data.return_receipt.home_hp===40,'defeat settlement');
  await execute(defeated,'ack_return',{});await execute(defeated,'depart',{case_id:'SCN-001'});
  assert(defeated.inspect().display_data.case.available_mode==='revisit'&&defeated.exportSave().casebook['SCN-001'].first_resolved_event===firstResolved,'revisit reset first resolution');
  checks.push('W0_and_defeat_preserve_prior_growth_case_revisit');
  // 3 registered cards: live actor sources, construction explicitly separate from natural play.
  for(const [type,source] of [['nt_flow',saved.entry],['nt_pressure',saved.entry],['nt_stop',saved.port]])for(const matched of [false,true]){
    const f=actionFixture(source,type,{matched,unusedType:matched?null:'f'}),loaded=await imported(f),cc=loaded.c,v=cc.inspect(),ch=v.display_data.exploration.legal_actions[0];
    const detail=v.display_data.details[ch.card_id],pre=cc.previewAction({view_token:v.meta.view_token,choice:ch}).display_data.action_preview;
    assert(detail.life===2&&pre.action_cost===(type==='nt_pressure'?(matched?12:8):10),'NT cost/life '+type);
    if(type==='nt_stop')assert(detail.primary.evasion===20&&detail.primary.crit_gain===20&&detail.field.power===2&&detail.field.hit===20,'nt_stop exact stats');
    if(!matched)assert(pre.mode==='place'&&pre.hp_restored===0,'placement effect');
    if(!matched)assert(pre.unused_hand_expiry.some(x=>x.expires&&x.destination==='shared_recovery'),'normal unused expiry');
    equal((await api.open({slot_id:loaded.slot})).exportSave(),cc.exportSave(),'NT restored exact');
    await execute(cc,'play',{choice:ch});const action=cc.exportSave().session.action_history.findLast(x=>x.type==='action'&&x.actor==='P');
    assert(action.action_cost===pre.action_cost&&action.actual_hp_loss===pre.actual_hp_loss&&action.hp_restored===pre.hp_restored,'prediction vs execution '+type);
  }
  checks.push('three_NT_cards_place_match_cost_stats_restore_actual','unused_hand_expiry_shared_recovery');
  const doomed=(await imported(actionFixture(saved.port,'nt_stop',{unusedType:'j'}))).c,dv=doomed.inspect(),dc=dv.display_data.exploration.legal_actions[0];
  const doomedCard=dv.display_data.exploration.hand.find(c=>c.type==='j');assert(doomedCard.origin==='E1'&&doomedCard.doomed,'retired origin fixture');
  assert(doomed.previewAction({view_token:dv.meta.view_token,choice:dc}).display_data.action_preview.unused_hand_expiry.find(c=>c.id===doomedCard.id).destination==='destroyed','retired origin expiry exception');
  await execute(doomed,'play',{choice:dc});assert(doomed.exportSave().session.game.state.cards[doomedCard.id].destroyed,'retired origin not destroyed');checks.push('retired_origin_expiry_distinct_from_normal_recovery');
  const grass=(await imported(actionFixture(saved.entry,'salve',{hp:22}))).c,gv=grass.inspect(),gc=gv.display_data.exploration.legal_actions[0];
  assert(grass.previewAction({view_token:gv.meta.view_token,choice:gc}).display_data.action_preview.hp_restored===0,'grass place recovered');
  await execute(grass,'play',{choice:gc});assert(grass.inspect().display_data.exploration.self.hp===22,'grass immediate recovery');checks.push('salve_placement_no_healing');
  // Counterfactual remaining-HP boundary, derived from the fixed failed revisit.
  const clearDoc=revisitClearFixture(saved['second-return'],saved.home),clear=(await imported(clearDoc)).c,cv=clear.inspect(),choice=cv.display_data.exploration.legal_actions.find(c=>c.target==='V1');
  assert(choice,'revisit terminal choice');await execute(clear,'play',{choice});const clearView=clear.inspect().display_data;
  assert(clearView.return_receipt.outcome==='clear'&&clearView.case.status==='resolved'&&clearView.return_receipt.gained_units===300,'revisit clear boundary');
  assert(clear.exportSave().casebook['SCN-001'].first_resolved_event===firstResolved&&clear.exportSave().casebook['SCN-001'].first_route_checked_event,'route checked without replacing resolution');
  assert(clear.exportSave().session.receipts[clear.exportSave().session.active.run].end_id==='SCN-001-END-R','revisit end R');
  const beforeRead=clear.exportSave().session.economy;await execute(clear,'continue_scene',{scene_id:clearView.scene.id});equal(clear.exportSave().session.economy,beforeRead,'clear text paid twice');
  checks.push('constructed_revisit_clear_route_checked_once_no_extra_bonus');
  const revisitEntry=defeated.exportSave();
  // A persisted unresolved first/return snapshot cannot be reclassified merely by current status.
  for(const [name,mutate,code] of [
    ['old_schema',d=>{d.schema='PT-NT-001-v1';},'unsupported_save_schema'],
    ['engine',d=>{d.engine_version='unknown';},'unsupported_engine_version'],
    ['missing_case',d=>{delete d.casebook;},'missing_save_field'],
    ['mode',d=>{d.session.active.mode='revisit';},'invalid_saved_mode'],
    ['attempts',d=>{d.casebook['SCN-001'].attempts++;},'invalid_attempts'],
    ['funds',d=>{d.session.economy.profile.points=10;},'invalid_economy_total'],
    ['rng',d=>{d.session.game.rng['P|initial'][624]=625;},'invalid_rng'],
    ['nt_cost',d=>{Object.values(d.session.game.state.cards).find(c=>c.type==='nt_pressure').place_cost=10;},'invalid_card_registry'],
    ['scene',d=>{d.session.scene.text_ids.push('SCN-001-DETAIL06');},'unpublished_scene_text']
  ]){const bad=structuredClone(saved.entry);mutate(bad);let error=null;try{await api.importSave({slot_id:'bad-'+name,document:bad,request_id:'bad'});}catch(e){error=e;}
    assert(error?.code===code,JSON.stringify({name,expected:code,actual:error?.code}));assert(await storage.load('bad-'+name)===null,'bad import wrote slot');}
  let missing=null;try{await api.open({slot_id:'missing'});}catch(e){missing=e;}assert(missing?.code==='save_not_found','missing open auto-created');
  const sourceBad=structuredClone(saved.return),receipt=Object.values(sourceBad.session.receipts)[0];
  Object.values(receipt.reward_ledger)[0].catalogue_version='unregistered-catalogue';receipt.signature=receiptSignature(receipt);sourceBad.session.economy.profile.returns[receipt.run]=receipt.signature;
  let refError=null;try{await api.importSave({slot_id:'bad-reward-source',document:sourceBad,request_id:'bad-source'});}catch(e){refError=e;}
  assert(refError?.code==='invalid_reward_source'&&await storage.load('bad-reward-source')===null,'reward source reference not validated');
  let existing=null;try{await api.create({slot_id:'fresh',...versions,request_id:'again'});}catch(e){existing=e;}assert(existing?.code==='slot_not_empty','create overwrote existing');
  checks.push('unsupported_corrupt_reference_saves_rejected_empty_slot','reward_catalogue_reference_not_just_signature','missing_open_no_new_game_existing_create_rejected');
  return {ok:true,checks,boundary_origins:{natural_checkpoints:Object.keys(saved),synthetic:['historical paid amount 300','three-card hand/field/time placement','salve HP22 placement','revisit defeat snapshot rebased to unsettled with P HP40 and V1 HP1/hit99; not natural clear']},revisitEntry};
  return {ok:true,checks};
}

export function revisitClearFixture(returned,home) {
  const d=structuredClone(returned),s=d.session,a=s.active,run=a.run;
  delete s.receipts[run];s.economy=structuredClone(home.session.economy);s.economy.profile.phase='exploring';s.economy.profile.run=run;s.phase='exploring';
  d.draft=null;s.game.state.outcome=null;s.game.state.settlement=null;s.game.state.actors.P.hp=40;s.game.state.actors.V1.hp=1;s.game.state.actors.V1.hit=99;s.game.state.actors.V1.guard=null;
  s.game.state.events=s.game.state.events.filter(e=>e.event!=='player_defeated');s.game.state.boundary_number=s.game.state.events.length;
  s.action_history=s.action_history.filter(e=>e.event!=='player_defeated');
  d.public_history=d.public_history.filter(e=>!(e.run===run&&e.scene_id==='SCN-001-S06'));
  a.published_scene_ids=a.published_scene_ids.filter(id=>id!=='SCN-001-S06');
  const event=d.public_history.findLast(e=>e.run===run&&e.scene_id==='SCN-001-S04R'&&e.kind==='scene');
  s.scene={id:event.scene_id,pause:false,text_ids:[...event.text_ids],optional_text_ids:Object.entries(C.texts).filter(([,t])=>t.kind==='detail'&&eligible(t.eligible_when,event.context)).map(([id])=>id),publication_event_id:event.id,context:structuredClone(event.context)};
  return actionFixture(d,'h',{matched:true,hp:40,now:s.game.state.now});
}

// Boundary-only state construction. Not exported from the production API.
export function actionFixture(document,type,{matched=false,hp=22,remaining=2,now=142,unusedType=null}={}) {
  const d=structuredClone(document),s=d.session,g=restoreGame(s);
  for(const id of [...g.s.actors.P.hand]){g.s.cards[id].remaining=null;g.s.actors.P.deck.push(id);}g.s.actors.P.hand=[];
  function remove(id){for(const a of Object.values(g.s.actors)){a.hand=a.hand.filter(x=>x!==id);a.deck=a.deck.filter(x=>x!==id);}g.s.pool=g.s.pool.filter(x=>x!==id);for(const [attr,x] of Object.entries(g.s.field))if(x===id)delete g.s.field[attr];g.s.cards[id].remaining=null;}
  const card=Object.values(g.s.cards).find(c=>c.type===type&&!c.destroyed);assert(card,'fixture card not present '+type);remove(card.id);card.remaining=Math.min(remaining,card.life);g.s.actors.P.hand.push(card.id);
  const old=g.s.field[card.attr];if(old){delete g.s.field[card.attr];g.recover(old,'boundary_field');}
  if(matched){const field=Object.values(g.s.cards).find(c=>c.id!==card.id&&c.attr===card.attr&&!c.destroyed);assert(field,'matching fixture field');remove(field.id);g.s.field[card.attr]=field.id;}
  if(unusedType){const unused=Object.values(g.s.cards).find(c=>c.type===unusedType&&!c.destroyed&&c.id!==card.id);assert(unused,'unused fixture card');remove(unused.id);unused.remaining=1;g.s.actors.P.hand.push(unused.id);}
  g.s.actors.P.hp=hp;g.s.actors.P.crit=0;g.s.actors.P.guard=null;g.s.ready=true;g.s.now=now;
  for(const [w,a] of Object.entries(g.s.actors))if(a.active)a.next_at=w==='P'?now:now+30;
  g.s.pending_scene=null;g.s.diagnostic=null;s.scene.pause=false;s.game=g.save();s.active.reward_ledger=rewardLedger(s);validateDocument(d);return d;
}
