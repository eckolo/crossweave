// View-token-scoped handles. Saves keep exact UIDs/batch references; UI never receives them.
import {copy,check} from './common.mjs';
import {candidateRef} from './offers.mjs';
import {ownedHandle} from './items.mjs';
export function handles(s,plans=[],purchaseUid=null){
  const encodeMap=new Map(),decodeMap=new Map(),e=s.economy;
  const bind=(internal,publicID)=>{encodeMap.set(internal,publicID);decodeMap.set(publicID,internal);};
  Object.keys(e.inventory).sort().forEach((uid,i)=>{const id='owned-'+(i+1);bind(ownedHandle(uid),id);encodeMap.set(uid,id);});
  const b=e.at.batches[e.at.current];
  for(const c of b?.candidates||[])bind(candidateRef(b.id,c.id),c.id);
  let missing=0,expired=0;
  for(const p of plans.filter(Boolean)){
    for(const id of [...p.next_preparation.equipment,...p.next_preparation.deck])if(id.startsWith('owned:')&&!encodeMap.has(id))bind(id,'missing-owned-'+(++missing));
    if(p.candidate!==null&&!encodeMap.has(p.candidate))bind(p.candidate,'expired-candidate-'+(++expired));
  }
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
    const internal=decodeMap.get(id);check(internal&&!internal.startsWith('owned:'),'stale_or_unknown_candidate','candidate',{related_ids:[id]});return internal;
  }
  function plan(p){
    const out=copy(p);out.candidate=candidate(out.candidate);
    out.next_preparation.equipment=out.next_preparation.equipment.map(id=>selection(id,'next_preparation.equipment',{allowPurchase:true}));
    out.next_preparation.deck=out.next_preparation.deck.map(id=>selection(id,'next_preparation.deck',{allowPurchase:true}));return out;
  }
  return {encode,selection,candidate,plan};
}
