// AP ownership/conversion and AU/AQ selection. All mutation is on the caller's transaction copy.
import C from '../content/m1.mjs';
import A from '../content/acquisition.mjs';
import {copy,check,unique,sum,canonical,integer} from './common.mjs';
import {blueprint,validateBlueprint,equipmentCost} from './affixes.mjs';
export const funds=e=>e.profile.points*100+e.remainder;
export const paid=e=>sum(Object.values(e.profile.learned))*100;
export function setFunds(e,n){check(integer(n),'invalid_funds');e.profile.points=Math.floor(n/100);e.remainder=n%100;}
export const ownedHandle=uid=>'owned:'+uid;
export function resolve(e,id,kind,{requireLearned=true}={}){
  check(typeof id==='string','unknown_selection_handle');let b,uid=null;
  if(id.startsWith('base:')){
    check(!e.unified,'legacy_selection_not_supported',null,{related_ids:[id]});
    const base=id.slice(5);
    check(kind==='card'?C.initial.free_card_bases.includes(base):Object.hasOwn(C.rules.learning.bases,base),'unknown_selection_handle',null,{related_ids:[id]});
    b=blueprint(kind,base);
  }else{
    check(id.startsWith('owned:'),'unknown_selection_handle',null,{related_ids:[id]});uid=id.slice(6);
    const item=Object.hasOwn(e.inventory,uid)?e.inventory[uid]:null;
    check(item,'missing_possession',null,{related_ids:[id]});b=validateBlueprint(item.blueprint);
  }
  check(b.kind===kind,'wrong_selection_kind',null,{related_ids:[id]});
  if(kind==='passive'&&requireLearned&&!e.unified)check(Object.hasOwn(e.profile.learned,b.base),'unlearned_equipment_base',null,{related_ids:[id]});
  return {id,uid,blueprint:copy(b),...(kind==='passive'?{cost:equipmentCost(b)}:{})};
}
export function references(d){
  const s=d.session,out={};
  const add=(ids,label)=>{for(const [i,id]of (ids||[]).entries())if(id.startsWith('owned:'))out[label+':'+i]=id.slice(6);};
  add(s.economy.aq.equipped,'equipment');add(s.au.deck,'confirmed_deck');
  if(d.draft){const p=d.draft.plan.composition||d.draft.plan.next_preparation;add(p.equipment,'saved_draft_equipment');add(p.deck,'saved_draft_deck');}
  return out;
}
export function syncReferences(d){d.session.economy.references=references(d);}
export function itemUsage(d,uid){
  return [...new Set(Object.entries(references(d)).filter(([,x])=>x===uid).map(([slot])=>slot.split(':')[0]))];
}
export function conversionUnits(band){
  const value=C.rules.conversion.value_bands_units[band];check(integer(value),'unknown_value_band');
  const [n,den]=C.rules.conversion.rate;return Math.floor(value*n/den);
}
export const convertible=(e,uid)=>e.unified?.grants[uid]?.source!=='initial_card'||A.initial_cards_convertible;
const freeAccess=(e,b)=>!e.unified&&!b.affixes.length&&(b.kind==='card'?C.initial.free_card_bases.includes(b.base):Object.hasOwn(e.profile.learned,b.base));
export function quote(d,ids){
  check(unique(ids)&&ids.length>0,'duplicate_or_empty_conversion','item_ids');
  const e=d.session.economy,selected=new Set(ids),rows=[];
  for(const id of [...ids].sort()){
    check(id.startsWith('owned:'),'not_saleable_possession','item_ids',{related_ids:[id]});
    const uid=id.slice(6),item=Object.hasOwn(e.inventory,uid)?e.inventory[uid]:null;
    check(item,'missing_possession','item_ids',{related_ids:[id]});
    check(convertible(e,uid),'initial_grant_not_convertible','item_ids',{related_ids:[id]});
    check(!item.locked,'item_locked','item_ids',{related_ids:[id]});
    const usage=itemUsage(d,uid);check(!usage.length,'item_in_use','item_ids',{related_ids:[id],references:usage});
    const retained=Object.values(e.inventory).some(x=>x.blueprint.key===item.blueprint.key&&!selected.has(ownedHandle(x.uid)));
    rows.push({id,blueprint:copy(item.blueprint),band:item.band,units:conversionUnits(item.band),remaining_same_variant:retained,
      free_option_retained:freeAccess(e,item.blueprint),loses_variant_access:!retained&&!freeAccess(e,item.blueprint)});
  }
  const units=sum(rows.map(x=>x.units));check(integer(units)&&integer(funds(e)+units),'invalid_conversion_total');
  return {schema:'CW-M1-conversion-1',ok:true,read_only:true,item_ids:[...ids].sort(),items:rows,units,total_units:units,removed_count:rows.length,
    point_gain:Math.floor((e.remainder+units)/100),remainder_after:(e.remainder+units)%100,
    unspent_before_units:funds(e),unspent_after_units:funds(e)+units,learning_refund_units:0,knowledge_and_unlocks_preserved:true};
}
export function convert(d,ids,operation){
  const e=d.session.economy,q=quote(d,ids),uids=q.item_ids.map(x=>x.slice(6));
  check(!Object.hasOwn(e.sales,operation),'duplicate_conversion_operation');
  const records=uids.map(uid=>copy(e.inventory[uid]));
  for(const uid of uids)delete e.inventory[uid];setFunds(e,q.unspent_after_units);
  e.sales[operation]={signature:canonical({ids:uids}),ids:uids,units:q.units,items:records};return q;
}
export function setLock(e,id,locked){
  check(typeof locked==='boolean','invalid_lock','locked');
  check(typeof id==='string'&&id.startsWith('owned:')&&Object.hasOwn(e.inventory,id.slice(6)),'missing_possession','item_id',{related_ids:[id]});
  e.inventory[id.slice(6)].locked=locked;
}
