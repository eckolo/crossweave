import C from '../content/m1.mjs';
import * as K from './knowledge.mjs';
import {copy,check,canonical} from './common.mjs';
import {funds,paid,setFunds} from './preparation.mjs';
export function rewardLedger(s) {
  return Object.fromEntries(Object.entries(s.game.state.rewards).map(([id,r])=>{
    const spec=C.rewards[id],a=s.active,t=C.targets[spec?.target_id];
    check(spec&&a.targets[r.source]===t.id,'unknown_reward');
    const key=JSON.stringify(['CW-M1-reward-1',a.run,id,spec.source_event_id]);
    return [key,{key,reward_id:id,run:a.run,case_id:a.case_id,mode:a.mode,target_set_id:a.target_set_id,target_id:t.id,
      catalogue_version:t.catalogue_version,content_set_id:C.content_set_id,source_event_id:spec.source_event_id,
      legacy_engine_key:spec.legacy_engine_key,protected:r.protected,items:copy(spec.items)}];
  }));
}
export const receiptSignature = r => canonical(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='signature')));
export function settle(d) {
  const s=d.session,a=s.active,g=s.game.state,e=s.economy,c=d.casebook[a.case_id],outcome=g.outcome;
  check(['clear','withdrawal','defeat'].includes(outcome)&&g.settlement?.reason===outcome,'unsettled_expedition');
  check(!Object.hasOwn(s.receipts,a.run),'duplicate_settlement');
  if(outcome==='clear')check(g.events.some(ev=>ev.victim==='V1'&&ev.event==='traversed')&&g.rewards[a.mode==='revisit'?'SCN-001-RW05':'SCN-001-RW03'],'invalid_clear');
  const ledger=rewardLedger(s),kept=[],lost=[];
  for(const [key,row] of Object.entries(ledger))(outcome==='clear'||outcome==='withdrawal'&&row.protected?kept:lost).push(key);
  check(canonical(g.settlement.kept.slice().sort())===canonical(kept.map(k=>ledger[k].reward_id).sort())&&canonical(g.settlement.lost.slice().sort())===canonical(lost.map(k=>ledger[k].reward_id).sort()),'invalid_settlement_partition');
  const previousKnowledge=copy(e.profile.knowledge),previousCase=copy(c),oldUnlocked=[...e.profile.unlocked];
  e.profile.knowledge=K.carry(previousKnowledge,g.ah.knowledge,outcome);
  let gained=0;
  for(const key of kept)for(const item of ledger[key].items){
    if(item.kind==='points')gained+=item.amount_units;
    else if(item.kind==='material')e.profile.materials[item.type]=(e.profile.materials[item.type]||0)+item.amount;
    else if(item.kind==='unlock'&&!e.profile.unlocked.includes(item.type))e.profile.unlocked.push(item.type);
  }
  setFunds(e,funds(e)+gained);e.profile.phase='home';e.profile.run=null;
  const event=JSON.stringify(['CW-M1-settlement-1',a.run]),achievements=[];
  if(outcome==='clear'&&a.mode!=='revisit'){
    c.status='resolved';c.first_resolved_event??=event;
    achievements.push(JSON.stringify(['CW-M1-achievement-1','SCN-001-ACH-RESOLVED',a.case_id]));
  }
  if(outcome==='clear'&&a.mode==='revisit'){
    c.first_route_checked_event??=event;
    achievements.push(JSON.stringify(['CW-M1-achievement-1','SCN-001-ACH-ROUTE-CHECKED',a.case_id]));
  }
  const newUnlocks=e.profile.unlocked.filter(id=>!oldUnlocked.includes(id));
  for(const base of newUnlocks)achievements.push(JSON.stringify(['CW-M1-achievement-1','SCN-001-ACH-UNLOCK',base]));
  const newKnowledge=e.profile.knowledge.events.filter(ev=>!previousKnowledge.events.some(old=>old.id===ev.id));
  for(const ev of newKnowledge.filter(ev=>ev.kind==='initial_catalogue_grant'))achievements.push(JSON.stringify(['CW-M1-achievement-1','SCN-001-ACH-CATALOGUE',JSON.stringify([ev.profile,ev.version])]));
  c.run_achievements[a.run]=[...new Set([...(c.run_achievements[a.run]||[]),...achievements])];
  if(outcome==='clear'&&!e.profile.clears.includes('A'))e.profile.clears.push('A');
  const receipt={run:a.run,index:a.index,seed:a.seed,outcome,mode:a.mode,case_id:a.case_id,target_set_id:a.target_set_id,content_set_id:C.content_set_id,
    settlement_event_id:event,source_events:Object.values(ledger).map(r=>r.source_event_id),reward_ledger:ledger,kept,lost,
    gained_units:gained,unspent_after_units:funds(e),paid_learning_units:paid(e),
    kept_items:kept.flatMap(key=>ledger[key].items.filter(x=>x.kind!=='unlock').map(x=>({...copy(x),protected:ledger[key].protected}))),
    lost_items:lost.flatMap(key=>ledger[key].items.map(x=>copy(x))),new_unlocks:newUnlocks,new_knowledge:newKnowledge,
    knowledge_changes:{observations:newKnowledge.filter(ev=>ev.kind==='observed_card').length,catalogues:newKnowledge.filter(ev=>ev.kind==='initial_catalogue_grant').map(ev=>({profile:ev.profile,version:ev.version})),retained_on_all_outcomes:true},
    case_changes:{before:previousCase.status,after:c.status,resolved_now:previousCase.status!=='resolved'&&c.status==='resolved',route_checked_now:!previousCase.first_route_checked_event&&!!c.first_route_checked_event},
    expedition_end_hp:g.actors.P.hp,home_hp:40,offer_batch_id:null,
    end_id:outcome==='clear'?(a.mode==='revisit'?'SCN-001-END-R':'SCN-001-END-C'):outcome==='defeat'?'SCN-001-END-E':!Object.values(ledger).some(r=>['SCN-001-RW01','SCN-001-RW04'].includes(r.reward_id))?'SCN-001-END-W0':a.published_scene_ids.some(id=>['SCN-001-S04','SCN-001-S04R'].includes(id))?'SCN-001-END-W2':'SCN-001-END-W1'};
  receipt.signature=receiptSignature(receipt);s.receipts[a.run]=receipt;e.profile.returns[a.run]=receipt.signature;
  // D03 receives qualifying sources AFTER kept unlocks, without fake candidates/items.
  if(kept.length)e.at.pending_contexts.push({run:a.run,seed:a.seed,index:a.index,route:'A',tier:'I',sources:[...kept].sort(),
    card_bases:e.profile.unlocked.filter(id=>C.cards[id]).sort(),status:'generation_not_connected'});
  a.reward_ledger=ledger;s.phase='return';
}
