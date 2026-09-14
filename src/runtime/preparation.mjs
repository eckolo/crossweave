// BD distinction: inspect / copy preview / explicit apply. AU free-base deck and AQ capacity.
import C from '../content/m1.mjs';
import {copy,check,unique,sum,canonical} from './common.mjs';
const bases=Object.keys(C.rules.learning.bases);
export const funds=e=>e.profile.points*100+e.remainder;
export const paid=e=>sum(Object.values(e.profile.learned))*100;
export function setFunds(e,n){check(Number.isSafeInteger(n)&&n>=0,'invalid_funds');e.profile.points=Math.floor(n/100);e.remainder=n%100;}
export const blueprint=(kind,base)=>({kind,base,affixes:[],key:`AO1:${kind}:${base}`});
export function planFor(s) {return {retain_learning:Object.keys(s.economy.profile.learned).sort(),cancel_learning:[],candidate:null,
  purchase_timing:'after_preparation',next_preparation:{learn:[],equipment:copy(s.economy.aq.equipped),deck:copy(s.au.deck)}};}
export function checkPlanShape(plan) {
  check(plan&&typeof plan==='object'&&!Array.isArray(plan),'explicit_plan_required','plan');
  for(const k of ['retain_learning','cancel_learning'])check(unique(plan[k]),'invalid_learning_list',k);
  check(plan.candidate===null||typeof plan.candidate==='string','candidate_or_null_required','candidate');
  check(['before_preparation','after_preparation'].includes(plan.purchase_timing),'purchase_timing_required','purchase_timing');
  const p=plan.next_preparation;
  check(p&&typeof p==='object','explicit_preparation_required','next_preparation');
  check(unique(p.learn),'invalid_additional_learning','next_preparation.learn');
  check(unique(p.equipment),'invalid_equipment_list','next_preparation.equipment');
  check(Array.isArray(p.deck)&&p.deck.every(x=>typeof x==='string'),'invalid_deck','next_preparation.deck');
}
export function validateDeck(deck) {
  check(Array.isArray(deck)&&deck.length===12,'invalid_deck_size','next_preparation.deck',{required:12});
  const counts={};
  for(const id of deck){check(typeof id==='string'&&id.startsWith('base:')&&C.initial.free_card_bases.includes(id.slice(5)),
    id?.startsWith('owned:')?'feature_not_connected':'unknown_selection_handle','next_preparation.deck',{related_ids:[id]});
    const base=id.slice(5);counts[base]=(counts[base]||0)+1;check(counts[base]<=2,'deck_base_cap_exceeded','next_preparation.deck',{related_ids:[id]});}
  return counts;
}
export function validateEquipment(e, ids) {
  check(unique(ids),'duplicate_equipment','next_preparation.equipment');
  let cost=0;
  for(const id of ids){const base=id.slice(5);
    check(id.startsWith('base:')&&bases.includes(base),'unknown_selection_handle','next_preparation.equipment',{related_ids:[id]});
    check(Object.hasOwn(e.profile.learned,base),'unlearned_equipment_base','next_preparation.equipment',{related_ids:[id]});cost+=C.rules.equipment.base_cost[base];}
  check(cost<=8,'equipment_capacity_exceeded','next_preparation.equipment',{capacity:8,used:cost});return cost;
}
export function current(s) {
  const e=s.economy,counts=validateDeck(s.au.deck),used=validateEquipment(e,e.aq.equipped);
  return {economy:{unspent_units:funds(e),paid_learning_units:paid(e),learned:Object.keys(e.profile.learned).sort().map(base=>({base,paid_units:e.profile.learned[base]*100}))},
    equipment:{entries:e.aq.equipped.map(id=>({id,blueprint:blueprint('passive',id.slice(5)),cost:C.rules.equipment.base_cost[id.slice(5)]})),capacity:8,used,remaining:8-used,legal:true},
    deck:{composition:Object.entries(counts).sort().map(([base,count])=>({id:'base:'+base,blueprint:blueprint('card',base),count})),order_semantics:'unordered_composition',size:12,required_size:12,per_base_cap:2,base_counts:counts,legal:true},owned:[]};
}
export function inspectPreparation(s) {return {schema:'BD1-current-public',ok:true,...current(s),candidates:[],
  free_card_options:C.initial.free_card_bases.map(base=>'base:'+base).sort(),
  learning_options:bases.map(base=>({base,cost_units:C.rules.learning.cost_units[base]}))};}
export function preview(s, plan) {
  const before=current(s), next=copy(s);let stage='input';const stages=[];
  try {
    checkPlanShape(plan);
    check(plan.candidate===null,'feature_not_connected','candidate',{feature:'purchase'});
    const e=next.economy,retained=plan.retain_learning,canceled=plan.cancel_learning,prep=plan.next_preparation;
    check(!retained.some(x=>canceled.includes(x))&&canonical([...retained,...canceled].sort())===canonical(Object.keys(e.profile.learned).sort()),'learning_partition_required','cancel_learning');
    stage='cancellation';const refund=sum(canceled.map(id=>e.profile.learned[id]*100)),oldEquipment=copy(e.aq.equipped);
    for(const id of canceled)delete e.profile.learned[id];
    e.aq.equipped=e.aq.equipped.filter(id=>!canceled.includes(id.slice(5)));setFunds(e,funds(e)+refund);
    const cancellation={bases:copy(canceled),refund_units:refund,unequipped:oldEquipment.filter(id=>!e.aq.equipped.includes(id)),inventory_preserved:true,unspent_after_units:funds(e)};
    stages.push({stage,unspent_units:funds(e),paid_learning_units:paid(e)});
    stage='learning';let spent=0;
    for(const id of prep.learn){check(bases.includes(id),'unknown_passive_base','next_preparation.learn',{related_ids:[id]});
      check(!Object.hasOwn(e.profile.learned,id),'already_learned','next_preparation.learn',{related_ids:[id]});
      spent+=C.rules.learning.cost_units[id];}
    check(funds(e)>=spent,'insufficient_unspent_funds','next_preparation.learn',{required_units:spent,available_units:funds(e)});
    for(const id of prep.learn)e.profile.learned[id]=C.rules.learning.cost_units[id]/100;
    setFunds(e,funds(e)-spent);stages.push({stage,unspent_units:funds(e),paid_learning_units:paid(e)});
    stage='preparation';validateEquipment(e,prep.equipment);validateDeck(prep.deck);
    e.aq.equipped=copy(prep.equipment).sort();next.au.deck=copy(prep.deck).sort();
    const after=current(next);
    const difference=(a,b)=>{const map=new Map();for(const id of a)map.set(id,(map.get(id)||0)-1);for(const id of b)map.set(id,(map.get(id)||0)+1);
      return {removed:[...map].filter(([,n])=>n<0).map(([id,n])=>({id,count:-n})),added:[...map].filter(([,n])=>n>0).map(([id,n])=>({id,count:n}))};};
    const afterCancellation={unspent_units:cancellation.unspent_after_units,paid_learning_units:before.economy.paid_learning_units-refund,
      learned:before.economy.learned.filter(x=>retained.includes(x.base))};
    const atPurchase=plan.purchase_timing==='before_preparation'?afterCancellation:after.economy;
    return {ok:true,next,display:{schema:'BD1-preparation-preview',ok:true,read_only:true,execution:'copy_only',units_per_point:100,current:before,
      purchase_timing:plan.purchase_timing,candidate_consideration:{timing:plan.purchase_timing==='before_preparation'?'before_cancellation_and_preparation':'after_preparation',economy:plan.purchase_timing==='before_preparation'?before.economy:atPurchase},
      stages:{after_cancellation:afterCancellation,before_purchase:copy(atPurchase),after_purchase:copy(atPurchase),prepared:after.economy},
      cancellation:{bases:copy(canceled),actual_refund_units:refund,equipment_removed:cancellation.unequipped.map(id=>({id,count:1}))},
      purchase:{requested:null,performed_on_copy:false,cost_units:0,requested_price_units:0,funds_before_purchase_units:atPurchase.unspent_units,selected_in_preparation:false,item:null},
      learning:{retained:copy(retained),newly_learned:prep.learn.filter(id=>!Object.hasOwn(s.economy.profile.learned,id)),relearned:prep.learn.filter(id=>Object.hasOwn(s.economy.profile.learned,id)),
        removed_at_end:Object.keys(s.economy.profile.learned).filter(id=>!Object.hasOwn(e.profile.learned,id)),payment_units:spent,paid_learning_before_units:before.economy.paid_learning_units,paid_learning_after_units:paid(e)},
      prepared:after,differences:{equipment:difference(s.economy.aq.equipped,e.aq.equipped),deck:difference(s.au.deck,next.au.deck),existing_possessions_preserved:true,owned_but_ineligible_after:[]},refusal:null}};
  } catch(error) {return {ok:false,display:{schema:'BD1-preparation-preview',ok:false,read_only:true,execution:'copy_only',current:before,stages,draft_discarded:true,
    refusal:{code:error.code||'invalid_plan',stage,field:error.field||null,related_ids:error.details?.related_ids||[],details:error.details||{}}}};}
}
export function draftFor(s,plan,revision) {
  const comparison=preview(s,plan);
  return {based_on_revision:revision,plan:copy(plan),intent:'explicit',dirty:canonical(plan)!==canonical(planFor(s)),valid:comparison.ok,
    errors:comparison.ok?[]:[comparison.display.refusal]};
}
