// Legacy functions remain only to validate/migrate old saves and share unchanged deck/capacity checks.
// Two-stage acquisitions and composition. Preview is a copy; commit reuses it once.
import C from '../content/m1.mjs';
import A from '../content/acquisition.mjs';
import {copy,check,unique,canonical,sum} from './common.mjs';
import {equipmentCost} from './affixes.mjs';
import {funds,paid,ownedHandle,convertible} from './items.mjs';
import {candidateRef,purchase} from './offers.mjs';
import {basicOptions,acquireBasic} from './possessions.mjs';
import * as legacy from './preparation-legacy.mjs';
export {blueprint,funds,paid,setFunds,validateDeck,validateEquipment,canonicalDeck} from './preparation-legacy.mjs';
export const preparationContract='CW-M1-preparation-2';
export const pendingRef=id=>'pending:'+id;
export function planFor(s){
  if(!s.economy.unified)return legacy.planFor(s);
  return {schema:preparationContract,acquire:[],composition:{equipment:copy(s.economy.aq.equipped),deck:copy(s.au.deck)},migration_review:null};
}
export function checkPlanShape(p){
  if(p?.schema!==preparationContract)return legacy.checkPlanShape(p);
  check(Object.keys(p).every(k=>['schema','acquire','composition','migration_review'].includes(k)),'unexpected_plan_field','plan');
  check(unique(p.acquire),'invalid_acquisition_list','acquire');
  check(p.composition&&Object.keys(p.composition).every(k=>['equipment','deck'].includes(k)),'explicit_preparation_required','composition');
  check(unique(p.composition.equipment),'invalid_equipment_list','composition.equipment');
  check(Array.isArray(p.composition.deck)&&p.composition.deck.every(id=>typeof id==='string'),'invalid_deck','composition.deck');
  check(p.migration_review===null||p.migration_review==='legacy_draft_requires_review','invalid_migration_review','migration_review');
}
export function current(s){
  const v=legacy.current(s);if(!s.economy.unified)return v;
  v.economy={unspent_units:funds(s.economy),historical_learning_units:paid(s.economy),refundable_units:0};
  for(const row of v.owned){
    row.group_key=row.blueprint.key;row.eligible=true;row.eligibility_reason='owned';
    row.convertible=convertible(s.economy,row.id.slice(6));if(!row.convertible)row.conversion_units=0;
    row.location=row.selected?'composition':'possession';row.pending=false;
  }
  const groups=new Map();
  for(const row of v.owned){
    const key=row.group_key,g=groups.get(key)||{group_key:key,blueprint:copy(row.blueprint),quantity:0,selected_quantity:0,selection_ids:[],possession_ids:[],composition_ids:[]};
    g.quantity++;g.selected_quantity+=Number(row.selected);g.selection_ids.push(row.id);g[row.selected?'composition_ids':'possession_ids'].push(row.id);groups.set(key,g);
  }
  v.groups=[...groups.values()];return v;
}
export function inspectPreparation(s){
  if(!s.economy.unified)return legacy.inspectPreparation(s);
  const e=s.economy,b=e.at.batches[e.at.current];
  const candidates=b&&b.purchased===null?b.candidates.map(c=>({id:candidateRef(b.id,c.id),blueprint:copy(c.blueprint),price_units:c.price_units,band:c.band,
    group_id:'return-offer',group_limit:1,available_quantity:1,available:true,affordable_now:funds(e)>=c.price_units})):[];
  const acquisition=[...basicOptions(e).filter(r=>r.available),...candidates].map(r=>({...r,pending_selection_id:pendingRef(r.id)}));
  return {schema:'CW-M1-preparation-current-2',ok:true,contract:preparationContract,policy_version:A.version,...current(s),
    acquisition,acquisition_groups:[...basicOptions(e).map(r=>({id:r.group_id,status:r.available?'available':'acquired',limit:r.group_limit})),
      {id:'return-offer',status:b?.purchased?'acquired':candidates.length?'available':'none',limit:1}],
    candidates};
}
export function preview(s,plan,{operation=null}={}){
  if(!s.economy.unified)return legacy.preview(s,plan,{operation});
  const before=current(s),next=copy(s),acquired=[];let stage='input';
  try{
    check(plan?.schema===preparationContract,'preparation_contract_changed','plan',{required:preparationContract});checkPlanShape(plan);
    check(plan.migration_review===null,'migrated_draft_requires_review','migration_review');
    const e=next.economy,options=inspectPreparation(s).acquisition,selected=plan.acquire.map(id=>{
      const row=options.find(r=>r.id===id);check(row,'acquisition_not_available','acquire',{related_ids:[id]});return row;
    });
    const groups={};for(const row of selected){groups[row.group_id]=(groups[row.group_id]||0)+1;
      check(groups[row.group_id]<=row.group_limit,'acquisition_group_limit','acquire',{related_ids:[row.id],limit:row.group_limit});}
    const cost=sum(selected.map(r=>r.price_units));stage='acquisition';
    check(funds(e)>=cost,'insufficient_unspent_funds','acquire',{required_units:cost,available_units:funds(e),shortage_units:Math.max(0,cost-funds(e))});
    let op=operation||'D03R-preview';while(!operation&&(Object.hasOwn(e.at.purchases,op)||Object.values(e.unified.purchases).some(r=>r.operation===op)))op+='-next';
    for(const row of selected){const item=row.id.startsWith('basic:')?acquireBasic(e,row.id,op):purchase(e,row.id,op);
      acquired.push({acquisition:row.id,pending_selection_id:pendingRef(row.id),id:ownedHandle(item.uid),uid:item.uid,price_units:row.price_units});}
    const pending=new Map(acquired.map(r=>[r.pending_selection_id,r.id]));
    const selection=id=>{if(!id.startsWith('pending:'))return id;
      check(pending.has(id),'unselected_acquisition','composition',{related_ids:[id]});return pending.get(id);};
    stage='composition';const equipment=plan.composition.equipment.map(selection);legacy.validateEquipment(e,equipment);e.aq.equipped=[...equipment].sort();
    next.au.deck=legacy.canonicalDeck(e,plan.composition.deck.map(selection));
    const after=inspectPreparation(next),pendingIDs=new Set(acquired.map(r=>r.id));
    for(const row of after.owned)row.pending=pendingIDs.has(row.id);
    return {ok:true,next,pending_items:acquired,display:{schema:'CW-M1-preparation-preview-2',ok:true,read_only:true,execution:'copy_only',
      contract:preparationContract,units_per_point:100,current:before,prepared:after,
      acquisitions:acquired.map(({uid,...r})=>r),payment:{cost_units:cost,refund_units:0,unspent_before_units:funds(s.economy),unspent_after_units:funds(e)},
      cancellation:{refund_units:0,meaning:'remove_unpaid_estimate'},refusal:null}};
  }catch(error){return {ok:false,pending_items:acquired,display:{schema:'CW-M1-preparation-preview-2',ok:false,read_only:true,execution:'copy_only',contract:preparationContract,
    current:before,prepared:null,payment:null,refusal:{code:error.code||'invalid_plan',stage,field:error.field?.replace('next_preparation.','composition.')||null,related_ids:error.details?.related_ids||[],details:error.details||{}}}};}
}
export function draftFor(s,plan,revision){
  if(!s.economy.unified)return legacy.draftFor(s,plan,revision);
  const result=preview(s,plan),pending=new Map((result.pending_items||[]).flatMap(r=>[[r.id,r.pending_selection_id],[r.uid,r.pending_selection_id]]));
  // Store pending references, not temporary purchase UIDs, in invalid draft diagnostics.
  const map=x=>typeof x==='string'?(pending.get(x)||x):Array.isArray(x)?x.map(map):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,map(v)])):x;
  return {based_on_revision:revision,plan:copy(plan),intent:'explicit',dirty:canonical(plan)!==canonical(planFor(s)),valid:result.ok,errors:result.ok?[]:[map(result.display.refusal)]};
}
