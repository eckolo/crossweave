// Frozen D03 plan semantics for legacy validation/migration. Not a current public command contract.
// BD copy preview / explicit apply, using AP possessions and the pinned AU/AQ limits.
import C from '../content/m1.mjs';
import {copy,check,unique,sum,canonical} from './common.mjs';
import {blueprint,equipmentCost} from './affixes.mjs';
import {funds,paid,setFunds,resolve,ownedHandle,conversionUnits} from './items.mjs';
import {candidate,candidateRef,purchase} from './offers.mjs';
export {blueprint,funds,paid,setFunds};
const bases=Object.keys(C.rules.learning.bases);
export function planFor(s){return {retain_learning:Object.keys(s.economy.profile.learned).sort(),cancel_learning:[],candidate:null,
  purchase_timing:'after_preparation',next_preparation:{learn:[],equipment:copy(s.economy.aq.equipped),deck:copy(s.au.deck)}};}
export function checkPlanShape(plan){
  check(plan&&typeof plan==='object'&&!Array.isArray(plan),'explicit_plan_required','plan');
  for(const k of ['retain_learning','cancel_learning'])check(unique(plan[k]),'invalid_learning_list',k);
  check(plan.candidate===null||typeof plan.candidate==='string','candidate_or_null_required','candidate');
  check(['before_preparation','after_preparation'].includes(plan.purchase_timing),'purchase_timing_required','purchase_timing');
  const p=plan.next_preparation;check(p&&typeof p==='object','explicit_preparation_required','next_preparation');
  check(unique(p.learn),'invalid_additional_learning','next_preparation.learn');
  check(unique(p.equipment),'invalid_equipment_list','next_preparation.equipment');
  check(Array.isArray(p.deck)&&p.deck.every(x=>typeof x==='string'),'invalid_deck','next_preparation.deck');
}
function selection(e,id,kind,field){try{return resolve(e,id,kind);}catch(error){error.field=field;throw error;}}
export function validateDeck(deck,e={inventory:{}}){
  check(Array.isArray(deck)&&deck.length===C.rules.deck.size,'invalid_deck_size','next_preparation.deck',{required:C.rules.deck.size});
  const counts={},owned=new Set();
  for(const id of deck){const row=selection(e,id,'card','next_preparation.deck');
    if(row.uid!==null){check(!owned.has(row.uid),'duplicate_owned_card','next_preparation.deck',{related_ids:[id]});owned.add(row.uid);}
    const base=row.blueprint.base;counts[base]=(counts[base]||0)+1;
    check(counts[base]<=C.rules.deck.per_base_cap,'deck_base_cap_exceeded','next_preparation.deck',{related_ids:[id]});
  }
  return counts;
}
export function canonicalDeck(e,deck){
  validateDeck(deck,e);return deck.map(id=>resolve(e,id,'card')).sort((a,b)=>a.blueprint.base.localeCompare(b.blueprint.base)||a.blueprint.key.localeCompare(b.blueprint.key)||a.id.localeCompare(b.id)).map(x=>x.id);
}
export function validateEquipment(e,ids){
  check(unique(ids),'duplicate_equipment','next_preparation.equipment');
  const cost=sum(ids.map(id=>selection(e,id,'passive','next_preparation.equipment').cost));
  check(cost<=C.rules.equipment.cost_limit,'equipment_capacity_exceeded','next_preparation.equipment',{capacity:C.rules.equipment.cost_limit,used:cost});return cost;
}
const economyView=e=>({unspent_units:funds(e),paid_learning_units:paid(e),learned:Object.keys(e.profile.learned).sort().map(base=>({base,paid_units:e.profile.learned[base]*100}))});
export function current(s){
  const e=s.economy,counts=validateDeck(s.au.deck,e),used=validateEquipment(e,e.aq.equipped),groups=new Map();
  for(const id of s.au.deck){const row=groups.get(id)||{id,blueprint:resolve(e,id,'card').blueprint,count:0};row.count++;groups.set(id,row);}
  return {economy:economyView(e),equipment:{entries:e.aq.equipped.map(id=>{const r=resolve(e,id,'passive');return {id,blueprint:r.blueprint,cost:r.cost};}),capacity:C.rules.equipment.cost_limit,used,remaining:C.rules.equipment.cost_limit-used,legal:true},
    deck:{composition:[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id)),order_semantics:'unordered_composition',size:s.au.deck.length,required_size:C.rules.deck.size,per_base_cap:C.rules.deck.per_base_cap,base_counts:counts,legal:true},
    owned:Object.values(e.inventory).sort((a,b)=>a.uid.localeCompare(b.uid)).map(item=>{
      const b=item.blueprint,id=ownedHandle(item.uid),passive=b.kind==='passive',eligible=!passive||Object.hasOwn(e.profile.learned,b.base);
      return {id,blueprint:copy(b),owned:true,quantity:1,locked:item.locked,band:item.band,conversion_units:conversionUnits(item.band),
        selection_kind:passive?'equipment':'deck',eligible,eligibility_reason:eligible?'owned_and_base_requirement_met':'owned_but_base_not_learned',
        equipment_cost:passive?equipmentCost(b):null,selected:(passive?e.aq.equipped:s.au.deck).includes(id)};
    })};
}
export function inspectPreparation(s){
  const e=s.economy,b=e.at.batches[e.at.current];
  return {schema:'BD1-current-public',ok:true,...current(s),candidates:(b?.candidates||[]).map(c=>({id:candidateRef(b.id,c.id),blueprint:copy(c.blueprint),
    price_units:c.price_units,band:c.band,available:b.purchased===null,affordable_now:b.purchased===null&&funds(e)>=c.price_units})),
    free_card_options:C.initial.free_card_bases.map(base=>'base:'+base).sort(),learning_options:bases.map(base=>({base,cost_units:C.rules.learning.cost_units[base]}))};
}
const diff=(a,b)=>{const m=new Map();for(const id of a)m.set(id,(m.get(id)||0)-1);for(const id of b)m.set(id,(m.get(id)||0)+1);
  return {removed:[...m].filter(([,n])=>n<0).map(([id,n])=>({id,count:-n})),added:[...m].filter(([,n])=>n>0).map(([id,n])=>({id,count:n}))};};
export function preview(s,plan,{operation=null}={}){
  const before=current(s),next=copy(s);let stage='input',purchaseRequest=null;
  try{
    checkPlanShape(plan);
    const e=next.economy,retained=plan.retain_learning,canceled=plan.cancel_learning,prep=plan.next_preparation;
    check(!retained.some(x=>canceled.includes(x))&&canonical([...retained,...canceled].sort())===canonical(Object.keys(e.profile.learned).sort()),'learning_partition_required','cancel_learning');
    const requested=plan.candidate===null?null:candidate(e,plan.candidate).c;
    stage='cancellation';const refund=sum(canceled.map(id=>e.profile.learned[id]*100)),oldEquipment=copy(e.aq.equipped);
    e.aq.equipped=e.aq.equipped.filter(id=>!canceled.includes(resolve(e,id,'passive').blueprint.base));
    for(const id of canceled)delete e.profile.learned[id];setFunds(e,funds(e)+refund);
    const removed=oldEquipment.filter(id=>!e.aq.equipped.includes(id)),afterCancellation=economyView(e);
    let beforePurchase,afterPurchase,bought=null,spent=0;
    function buy(){
      stage='purchase';beforePurchase=economyView(e);
      if(requested){
        purchaseRequest={candidate:plan.candidate,price_units:requested.price_units,funds_before_purchase_units:funds(e),shortage_units:Math.max(0,requested.price_units-funds(e))};
        let op=operation||'D03-preview';while(!operation&&Object.hasOwn(e.at.purchases,op))op+='-next';
        bought=purchase(e,plan.candidate,op);
      }
      afterPurchase=economyView(e);
    }
    function prepare(){
      stage='learning';
      for(const id of prep.learn){
        check(bases.includes(id),'unknown_passive_base','next_preparation.learn',{related_ids:[id]});
        check(!Object.hasOwn(e.profile.learned,id),'already_learned','next_preparation.learn',{related_ids:[id]});spent+=C.rules.learning.cost_units[id];
      }
      check(funds(e)>=spent,'insufficient_unspent_funds','next_preparation.learn',{required_units:spent,available_units:funds(e)});
      for(const id of prep.learn)e.profile.learned[id]=C.rules.learning.cost_units[id]/100;setFunds(e,funds(e)-spent);
      const resolvePurchase=id=>{if(id!=='$purchase')return id;check(bought,'purchase_not_yet_available','next_preparation',{related_ids:[id]});return ownedHandle(bought.uid);};
      stage='equipment';const equipment=prep.equipment.map(resolvePurchase);validateEquipment(e,equipment);e.aq.equipped=[...equipment].sort();
      stage='deck';next.au.deck=canonicalDeck(e,prep.deck.map(resolvePurchase));
    }
    if(plan.purchase_timing==='before_preparation'){buy();prepare();}else{prepare();buy();}
    const after=current(next);
    return {ok:true,next,purchase_uid:bought?.uid||null,display:{schema:'BD1-preparation-preview',ok:true,read_only:true,execution:'copy_only',units_per_point:100,current:before,purchase_timing:plan.purchase_timing,
      candidate_consideration:{timing:plan.purchase_timing==='before_preparation'?'before_cancellation_and_preparation':'after_preparation',economy:plan.purchase_timing==='before_preparation'?before.economy:beforePurchase},
      stages:{after_cancellation:afterCancellation,before_purchase:beforePurchase,after_purchase:afterPurchase,prepared:after.economy},
      cancellation:{bases:copy(canceled),actual_refund_units:refund,equipment_removed:removed.map(id=>({id,count:1}))},
      purchase:{requested:plan.candidate,performed_on_copy:!!bought,cost_units:bought?requested.price_units:0,requested_price_units:requested?.price_units||0,
        funds_before_purchase_units:beforePurchase.unspent_units,selected_in_preparation:!!bought&&after.owned.find(x=>x.id===ownedHandle(bought.uid)).selected,
        item:bought?{candidate:plan.candidate,item:'$purchase',blueprint:copy(bought.blueprint),cost_units:requested.price_units}:null},
      learning:{retained:copy(retained),newly_learned:prep.learn.filter(id=>!Object.hasOwn(s.economy.profile.learned,id)),relearned:prep.learn.filter(id=>Object.hasOwn(s.economy.profile.learned,id)),
        removed_at_end:Object.keys(s.economy.profile.learned).filter(id=>!Object.hasOwn(e.profile.learned,id)),payment_units:spent,paid_learning_before_units:before.economy.paid_learning_units,paid_learning_after_units:paid(e)},
      prepared:after,differences:{equipment:diff(s.economy.aq.equipped,e.aq.equipped),deck:diff(s.au.deck,next.au.deck),existing_possessions_preserved:true,owned_but_ineligible_after:after.owned.filter(x=>!x.eligible).map(x=>x.id)},refusal:null}};
  }catch(error){return {ok:false,display:{schema:'BD1-preparation-preview',ok:false,read_only:true,execution:'copy_only',current:before,draft_discarded:true,
    refusal:{code:error.code||'invalid_plan',stage,field:error.field||null,related_ids:error.details?.related_ids||[],details:error.details||{},purchase_request:purchaseRequest}}};}
}
export function draftFor(s,plan,revision){
  const result=preview(s,plan);return {based_on_revision:revision,plan:copy(plan),intent:'explicit',dirty:canonical(plan)!==canonical(planFor(s)),valid:result.ok,errors:result.ok?[]:[result.display.refusal]};
}
