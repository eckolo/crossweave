// View-token-scoped handles. Saves keep exact UIDs/batch references; UI never receives them.
import {copy,check} from './common.mjs';
import {candidateRef} from './offers.mjs';
import {ownedHandle} from './items.mjs';
import C from '../content/m1.mjs';
import {preparationContract,pendingRef} from './preparation.mjs';
export function handles(s,plans=[],purchaseUid=null,pendingItems=[]){
  const encodeMap=new Map(),decodeMap=new Map(),e=s.economy;
  const bind=(internal,publicID)=>{encodeMap.set(internal,publicID);decodeMap.set(publicID,internal);};
  Object.keys(e.inventory).sort().forEach((uid,i)=>{const id='owned-'+(i+1);bind(ownedHandle(uid),id);encodeMap.set(uid,id);});
  const b=e.at.batches[e.at.current];
  for(const c of b?.candidates||[])bind(candidateRef(b.id,c.id),c.id);
  for(const base of Object.keys(C.rules.learning.bases))bind('basic:'+base,'basic:'+base);
  let missing=0,expired=0;
  for(const p of plans.filter(Boolean)){
    const prep=p.composition||p.next_preparation;
    for(const id of [...prep.equipment,...prep.deck])if(id.startsWith('owned:')&&!encodeMap.has(id))bind(id,'missing-owned-'+(++missing));
    for(const id of (p.acquire||[p.candidate]).filter(x=>x!==null))if(!encodeMap.has(id))bind(id,'expired-candidate-'+(++expired));
  }
  for(const [internal,publicID]of [...encodeMap])if(!internal.startsWith('owned:')&&(internal.startsWith('basic:')||publicID.startsWith('choice-')||publicID.startsWith('expired-candidate-')))
    bind(pendingRef(internal),pendingRef(publicID));
  for(const row of pendingItems){const id=encodeMap.get(row.pending_selection_id);bind(row.id,id);encodeMap.set(row.uid,id);}
  if(purchaseUid){bind(ownedHandle(purchaseUid),'$purchase');encodeMap.set(purchaseUid,'$purchase');}
  const encodeString=x=>encodeMap.get(x)??x;
  function encode(x){
    if(typeof x==='string')return encodeString(x);
    if(Array.isArray(x))return x.map(encode);
    if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[encodeString(k),encode(v)]));
    return x;
  }
  function selection(id,field,{allowPurchase=false}={}){
    check(typeof id==='string','unknown_selection_handle',field);
    if(id.startsWith('base:')||allowPurchase&&id==='$purchase')return id;
    const internal=decodeMap.get(id);
    check(internal?.startsWith('owned:'),'unknown_selection_handle',field,{related_ids:[id]});return internal;
  }
  function candidate(id){
    if(id===null)return null;
    const internal=decodeMap.get(id);check(internal&&!internal.startsWith('owned:')&&!internal.startsWith('pending:'),'stale_or_unknown_candidate','candidate',{related_ids:[id]});return internal;
  }
  function plan(p){
    const out=copy(p);
    if(s.economy.unified){
      check(p.schema===preparationContract,'preparation_contract_changed','plan',{required:preparationContract});
      out.acquire=out.acquire.map(candidate);
      const decode=id=>{if(id.startsWith('pending:')){const found=decodeMap.get(id);check(found?.startsWith('pending:'),'unknown_selection_handle','composition',{related_ids:[id]});return found;}return selection(id,'composition');};
      out.composition.equipment=out.composition.equipment.map(decode);out.composition.deck=out.composition.deck.map(decode);return out;
    }
    out.candidate=candidate(out.candidate);
    out.next_preparation.equipment=out.next_preparation.equipment.map(id=>selection(id,'next_preparation.equipment',{allowPurchase:true}));
    out.next_preparation.deck=out.next_preparation.deck.map(id=>selection(id,'next_preparation.deck',{allowPurchase:true}));return out;
  }
  return {encode,selection,candidate,plan};
}
