// Durable acquisitions other than the existing return-offer ledger.
import C from '../content/m1.mjs';
import A from '../content/acquisition.mjs';
import {blueprint} from './affixes.mjs';
import {copy,check,canonical,integer} from './common.mjs';
import {funds,setFunds,ownedHandle} from './items.mjs';
export const grantUID=(kind,base,index)=>JSON.stringify(['CW-M1-grant-1',kind,base,index]);
export const basicUID=(operation,base)=>JSON.stringify(['CW-M1-basic-1',operation,base]);
export const basicRef=base=>'basic:'+base;
export function grants(learned){
  const out={};
  for(const base of [...C.initial.free_card_bases].sort())for(let i=0;i<A.initial_card_quantity;i++){
    const uid=grantUID('card',base,i);out[uid]={blueprint:blueprint('card',base),band:A.value_band,source:'initial_card',paid_units:0};
  }
  for(const base of Object.keys(learned).sort()){
    const uid=grantUID('passive',base,0);out[uid]={blueprint:blueprint('passive',base),band:A.value_band,source:'legacy_learning',paid_units:learned[base]*100};
  }
  return out;
}
export function initializePossessions(e,origin='new'){
  check(!e.unified,'already_initialized_possessions');
  const rows=grants(e.profile.learned);
  e.unified={version:A.version,origin,legacy_learning:copy(e.profile.learned),grants:rows,purchases:{}};
  for(const [uid,row]of Object.entries(rows)){
    check(!Object.hasOwn(e.inventory,uid),'duplicate_grant');e.inventory[uid]={uid,blueprint:copy(row.blueprint),band:row.band,locked:false};
  }
}
export function mapLegacySelections(ids,kind){
  const counts={};return ids.map(id=>{
    if(!id.startsWith('base:'))return id;
    const base=id.slice(5),i=counts[base]||0;counts[base]=i+1;
    return ownedHandle(grantUID(kind,base,i));
  });
}
export function basicOptions(e){
  return Object.keys(A.basic_passive_prices).sort().map(base=>{
    const count=Object.values(e.inventory).filter(item=>item.blueprint.kind==='passive'&&item.blueprint.base===base&&
      (e.unified.grants[item.uid]?.source==='legacy_learning'||Object.values(e.unified.purchases).some(r=>r.uid===item.uid))).length;
    return {id:basicRef(base),blueprint:blueprint('passive',base),price_units:A.basic_passive_prices[base],band:A.value_band,
      group_id:basicRef(base),group_limit:A.basic_passive_stock,available_quantity:Math.max(0,A.basic_passive_stock-count),
      available:count<A.basic_passive_stock,affordable_now:funds(e)>=A.basic_passive_prices[base]&&count<A.basic_passive_stock};
  });
}
export function acquireBasic(e,ref,operation){
  const row=basicOptions(e).find(x=>x.id===ref);check(row,'unknown_acquisition','acquire',{related_ids:[ref]});
  check(row.available,'basic_stock_exhausted','acquire',{related_ids:[ref]});
  check(funds(e)>=row.price_units,'insufficient_unspent_funds','acquire',{required_units:row.price_units,available_units:funds(e)});
  const base=row.blueprint.base,uid=basicUID(operation,base),key=JSON.stringify([operation,base]);
  check(!Object.hasOwn(e.unified.purchases,key)&&!Object.hasOwn(e.inventory,uid),'duplicate_acquisition');
  setFunds(e,funds(e)-row.price_units);e.inventory[uid]={uid,blueprint:copy(row.blueprint),band:row.band,locked:false};
  e.unified.purchases[key]={operation,base,uid,units:row.price_units};return e.inventory[uid];
}
export function validatePossessions(e){
  const u=e.unified;check(u&&u.version===A.version&&['new','migrated'].includes(u.origin),'unsupported_acquisition_version');
  check(canonical(u.legacy_learning)===canonical(e.profile.learned)&&
    (u.origin!=='new'||!Object.keys(u.legacy_learning).length),'changed_legacy_payment_history');
  check(canonical(u.grants)===canonical(grants(u.legacy_learning)),'invalid_grant_ledger');
  check(u.purchases&&typeof u.purchases==='object'&&!Array.isArray(u.purchases),'invalid_basic_purchase_ledger');
  const acquired=new Map(Object.entries(u.grants));let spent=0;
  for(const [key,r]of Object.entries(u.purchases)){
    check(typeof r.operation==='string'&&r.operation.length>0&&Object.hasOwn(A.basic_passive_prices,r.base)&&
      key===JSON.stringify([r.operation,r.base])&&r.uid===basicUID(r.operation,r.base)&&r.units===A.basic_passive_prices[r.base]&&!acquired.has(r.uid),'invalid_basic_purchase');
    acquired.set(r.uid,{blueprint:blueprint('passive',r.base),band:A.value_band,source:'basic_purchase'});spent+=r.units;
  }
  check(integer(spent),'invalid_acquisition_total');
  for(const row of basicOptions(e)){
    const count=Object.values(e.inventory).filter(item=>item.blueprint.kind==='passive'&&item.blueprint.base===row.blueprint.base&&acquired.has(item.uid)).length;
    check(count<=A.basic_passive_stock,'basic_stock_exceeded');
  }
  return {acquired,spent};
}
