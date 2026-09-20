// Stored, versioned AT batches. Generation never consumes the exploration RNG.
import C from '../content/m1.mjs';
import E from '../content/economy.mjs';
import {copy,check,canonical,integer,unique} from './common.mjs';
import {blueprint,variants,validateBlueprint} from './affixes.mjs';
import {sha256} from './hash.mjs';
import {funds,setFunds,conversionUnits} from './items.mjs';
import {economyVersion} from './versions.mjs';
const cfg=E.offers,cache=new Map(),pools=new Map();
export const batchID=r=>JSON.stringify(['CW-M1-offer-1',r.run,r.content_set_id]);
export const candidateRef=(batch,choice)=>JSON.stringify(['CW-M1-candidate-1',batch,choice]);
export const purchaseUID=(batch,choice)=>JSON.stringify(['AT1',batch,choice]);
export function initialize(e){e.runtime_version=economyVersion;e.at={version:cfg.version,current:null,batches:{},purchases:{},returns:{},pending_contexts:[]};}
function pool(context){
  const key=canonical([context.content_set_id,context.card_bases]);if(pools.has(key))return pools.get(key);
  const rows=[...context.card_bases.map(base=>['card',base]),...cfg.passive_pool.map(base=>['passive',base])]
    .flatMap(([kind,base])=>variants(kind,base,context.content_set_id))
    .filter(b=>!b.affixes.length||b.affixes.some(id=>E.affixes[b.kind][id].benefit));
  if(pools.size>=64)pools.clear();pools.set(key,rows);return rows;
}
// Separate deterministic draw for empty/short-pool boundary tests; not a public mutation API.
export function drawCandidates(context,entries){
  const tier=cfg.tiers[context.tier];check(tier&&cfg.passive_base_weights[context.route],'unknown_offer_tier');
  let serial=0;
  const word=purpose=>parseInt(sha256(JSON.stringify([cfg.namespace,context.seed,context.index,context.route,context.tier,context.sources,purpose,serial++])).slice(0,8),16);
  const draw=(xs,weight,purpose)=>{
    const positive=xs.map(x=>({x,w:weight(x)})).filter(x=>x.w>0),total=positive.reduce((n,x)=>n+x.w,0);
    check(total>0,'no_eligible_offer');let n=word(purpose)%total;
    for(const row of positive){if(n<row.w)return row.x;n-=row.w;}
  };
  const count=tier.count[0]+word('count')%(tier.count[1]-tier.count[0]+1),candidates=[],used=new Set();
  for(let i=0;i<count;i++){
    let eligible=entries.filter(b=>!used.has(b.key)&&tier.affix_count_weights[b.affixes.length]>0);
    if(!eligible.length)break;
    if(i===1){const other=eligible.filter(b=>b.kind+':'+b.base!==candidates[0].blueprint.kind+':'+candidates[0].blueprint.base);if(other.length)eligible=other;}
    const kind=draw([...new Set(eligible.map(b=>b.kind))],k=>cfg.kind_weights[k],'kind');
    const base=draw([...new Set(eligible.filter(b=>b.kind===kind).map(b=>b.base))],b=>kind==='passive'?cfg.passive_base_weights[context.route][b]:cfg.card_base_weight,'base');
    const v=eligible.filter(b=>b.kind===kind&&b.base===base);
    const length=draw([...new Set(v.map(b=>b.affixes.length))],n=>tier.affix_count_weights[n],'affix-count');
    const b=draw(v.filter(b=>b.affixes.length===length),()=>1,'variant');
    candidates.push({id:'choice-'+i,blueprint:copy(b),price_units:cfg.price_units,band:cfg.value_band});used.add(b.key);
  }
  return candidates;
}
export function generate(context){
  const key=canonical(context);if(cache.has(key))return copy(cache.get(key));
  const rows=drawCandidates(context,pool(context));if(cache.size>=128)cache.clear();cache.set(key,rows);return copy(rows);
}
export function contextFor(s,r){
  if(!r.kept.length)return null;
  const retained=r.kept.map(k=>r.reward_ledger[k]),tiers=retained.map(row=>cfg.event_tiers[row.source_event_id]);
  check(tiers.every(t=>cfg.tiers[t]),'unrated_offer_source');
  const tier=tiers.sort((a,b)=>cfg.tiers[b].rank-cfg.tiers[a].rank)[0];
  const unlocked=[...new Set([...C.initial.unlocked,...Object.values(s.receipts).filter(x=>x.index<=r.index)
    .flatMap(x=>x.kept.flatMap(k=>x.reward_ledger[k].items)).filter(x=>x.kind==='unlock').map(x=>x.type)])].sort();
  return {run:r.run,seed:r.seed,index:r.index,route:'A',tier,sources:[...r.kept].sort(),card_bases:unlocked,
    case_id:r.case_id,mode:r.mode,target_set_id:r.target_set_id,content_set_id:r.content_set_id,
    reward_ids:retained.map(x=>x.reward_id).sort(),source_event_ids:retained.map(x=>x.source_event_id).sort(),
    target_ids:retained.map(x=>x.target_id).sort(),catalogue_versions:retained.map(x=>x.catalogue_version).sort()};
}
export function receiveReturn(s,r){
  const e=s.economy,context=contextFor(s,r),id=context?batchID(r):null;
  if(Object.hasOwn(e.at.returns,r.run)){
    check(canonical(e.at.returns[r.run])===canonical({receipt_signature:r.signature,batch:id}),'conflicting_offer_return');return;
  }
  e.at.returns[r.run]={receipt_signature:r.signature,batch:id};
  if(context){
    check(!Object.hasOwn(e.at.batches,id),'duplicate_offer_batch');
    const candidates=generate(context);e.at.batches[id]={id,version:cfg.version,context,candidates,purchased:null};e.at.current=id;
    for(const c of candidates)e.known[c.blueprint.key]=copy(c.blueprint);
  }
}
export function candidate(e,ref){
  const batch=e.at.batches[e.at.current];
  const c=batch?.candidates.find(x=>candidateRef(batch.id,x.id)===ref);
  check(c,'stale_or_unknown_candidate','candidate',{related_ids:[ref]});return {batch,c};
}
export function purchase(e,ref,operation){
  const {batch,c}=candidate(e,ref);
  check(batch.purchased===null,'offer_already_purchased','candidate',{related_ids:[ref]});
  check(funds(e)>=c.price_units,'insufficient_unspent_funds','candidate',{required_units:c.price_units,available_units:funds(e)});
  const uid=purchaseUID(batch.id,c.id);check(!Object.hasOwn(e.inventory,uid)&&!Object.hasOwn(e.at.purchases,operation),'duplicate_purchase');
  setFunds(e,funds(e)-c.price_units);
  e.inventory[uid]={uid,blueprint:copy(c.blueprint),band:c.band,locked:false};
  batch.purchased=operation;e.at.purchases[operation]={batch:batch.id,choice:c.id,units:c.price_units,uid,
    signature:canonical({batch:batch.id,choice:c.id})};return e.inventory[uid];
}
export function validateEconomy(s){
  const e=s.economy,a=e.at;
  check(e.runtime_version===economyVersion&&a?.version===cfg.version,'unsupported_economy_version');
  for(const x of [a.batches,a.purchases,a.returns,e.sales,e.known,e.references])check(x&&typeof x==='object'&&!Array.isArray(x),'invalid_economy_ledger');
  check(Array.isArray(a.pending_contexts)&&a.pending_contexts.length===0,'pending_offer_migration_required');
  const rs=Object.values(s.receipts).sort((x,y)=>x.index-y.index),expectedBatches=[],known={};let last=null;
  check(canonical(Object.keys(a.returns).sort())===canonical(rs.map(r=>r.run).sort()),'invalid_offer_return_ledger');
  for(const r of rs){
    const ctx=contextFor(s,r),id=ctx?batchID(r):null;
    check(canonical(a.returns[r.run])===canonical({receipt_signature:r.signature,batch:id}),'invalid_offer_return');
    if(!ctx)continue;last=id;expectedBatches.push(id);
    const b=a.batches[id];check(b&&b.id===id&&b.version===cfg.version&&canonical(b.context)===canonical(ctx),'invalid_offer_context');
    check(canonical(b.candidates)===canonical(generate(ctx)),'changed_saved_candidates');
    check(b.purchased===null||Object.hasOwn(a.purchases,b.purchased),'missing_purchase_receipt');
    for(const c of b.candidates)known[c.blueprint.key]=c.blueprint;
  }
  check(a.current===last&&canonical(Object.keys(a.batches).sort())===canonical(expectedBatches.sort()),'invalid_current_offer');
  check(canonical(e.known)===canonical(known),'invalid_known_blueprints');
  const acquired=new Map();let spent=0,converted=0;
  for(const [operation,r]of Object.entries(a.purchases)){
    const b=a.batches[r.batch],c=b?.candidates.find(x=>x.id===r.choice);
    check(c&&b.purchased===operation&&r.uid===purchaseUID(b.id,c.id)&&r.units===c.price_units&&r.signature===canonical({batch:b.id,choice:c.id}),'invalid_purchase_receipt');
    check(!acquired.has(r.uid),'duplicate_purchase_uid');acquired.set(r.uid,{blueprint:c.blueprint,band:c.band});spent+=r.units;
  }
  const sold=new Set();
  for(const sale of Object.values(e.sales)){
    check(unique(sale.ids)&&sale.ids.length>0&&sale.signature===canonical({ids:[...sale.ids].sort()})&&Array.isArray(sale.items)&&sale.items.length===sale.ids.length,'invalid_sale_receipt');
    let units=0;
    for(const [i,uid]of sale.ids.entries()){
      const original=acquired.get(uid),item=sale.items[i];
      check(original&&!sold.has(uid)&&item?.uid===uid&&item.locked===false&&canonical(item.blueprint)===canonical(original.blueprint)&&item.band===original.band,'invalid_sold_item');
      units+=conversionUnits(item.band);sold.add(uid);
    }
    check(units===sale.units,'invalid_conversion_units');converted+=units;
  }
  for(const [uid,item]of Object.entries(e.inventory)){
    const original=acquired.get(uid);check(original&&!sold.has(uid)&&item.uid===uid&&typeof item.locked==='boolean'&&canonical(item.blueprint)===canonical(original.blueprint)&&item.band===original.band,'invalid_inventory_provenance');
    validateBlueprint(item.blueprint);
  }
  check(acquired.size===Object.keys(e.inventory).length+sold.size,'missing_purchased_item');
  check(integer(spent)&&integer(converted),'invalid_economy_total');return {spent,converted};
}
