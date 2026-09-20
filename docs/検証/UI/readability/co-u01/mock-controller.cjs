'use strict';
// CO-U01 contract mock. No game, RNG, Campaign save or persistent storage.
// Replace this file with the design-owned controller in CO-U02; do not ship it.
function createMockController(F, example='return') {
 const copy=x=>JSON.parse(JSON.stringify(x)),sum=a=>a.reduce((s,v)=>s+v,0);
 const fail=(code,details={})=>{throw {code,details};};
 let revision=10, phase=example==='return'||example==='nt'?'return':'home';
 const key=example==='empty'?'empty':example==='purchased'?'purchased':'bc';
 let home=copy(F.homes[key]), details=copy(F.details[key]), draft=null;
 let offers={status:example==='empty'?'none':example==='purchased'?'purchased':'available',carried_from_previous_return:example==='carried',refresh_rule:'eligible_return'};
 let receipt=copy(F.return_receipt),last=null,failNext=false,serial=0;
 let connections=example!=='disconnected',nt=example==='nt';
 const locks=new Set(),trace=[],ledger=new Map();
 if(example==='capacity')home.economy={unspent_units:300,paid_learning_units:800,learned:['PS01','PS02','PS03','PS04'].map(base=>({base,paid_units:200}))};
 if(nt){home=null;receipt=copy(F.proposed_return.return_receipt);connections=false;}
 const currentPlan=()=>home?{retain_learning:home.economy.learned.map(x=>x.base),cancel_learning:[],candidate:null,purchase_timing:'before_preparation',next_preparation:{learn:[],equipment:home.equipment.entries.map(x=>x.id),deck:home.deck.composition.flatMap(x=>Array(x.count).fill(x.id))}}:null;
 const token=()=>`mock-view-${revision}`;
 function maps(){const enc={},dec={};if(home){home.owned.forEach((o,i)=>{enc[o.id]=`item-${revision}-${i+1}`;dec[enc[o.id]]=o.id;});home.candidates.forEach((o,i)=>{enc[o.id]=`offer-${revision}-${i+1}`;dec[enc[o.id]]=o.id;});}return {enc,dec};}
 function mapPlan(p,map){if(!p)return null;const id=v=>map[v]||v;return {...copy(p),candidate:p.candidate===null?null:id(p.candidate),next_preparation:{...copy(p.next_preparation),equipment:p.next_preparation.equipment.map(id),deck:p.next_preparation.deck.map(id)}};}
 function decode(p){if(!p||!Array.isArray(p.retain_learning)||!Array.isArray(p.cancel_learning)||!p.next_preparation||!['learn','equipment','deck'].every(k=>Array.isArray(p.next_preparation[k])))fail('invalid_plan');return mapPlan(p,maps().dec);}
 function validateToken(t){if(t!==token())fail('stale_view');}
 function ability(type){if(!home)return {available:false,reasons:['feature_not_connected']};if(!connections&&['convert_items','purchase'].includes(type))return {available:false,reasons:['feature_not_connected']};return {available:true,reasons:[]};}
 function project(comparison=null,quote=null,error=null,operation=null){
  const {enc}=maps(),id=v=>enc[v]||v;let h=copy(home),d={};
  if(h){h.owned=h.owned.map(o=>({...o,id:id(o.id),locked:locks.has(o.id)}));h.candidates=h.candidates.map(o=>({...o,id:id(o.id),affordable_now:o.price_units<=h.economy.unspent_units}));h.deck.composition=h.deck.composition.map(o=>({...o,id:id(o.id)}));h.equipment.entries=h.equipment.entries.map(o=>({...o,id:id(o.id)}));h.offers=copy(offers);for(const [k,v]of Object.entries(details))d[id(k)]=copy(v);}
  const p=draft||currentPlan();let errors=[];if(p){try{evaluate(p);}catch(e){errors=[e];}}
  return {schema:'CW-M1-view-1',meta:{revision,view_token:token()},display_data:{phase,capabilities:Object.fromEntries(['purchase','convert_items','commit_preparation','save_draft','depart'].map(t=>[t,ability(t)])),home:h,details:d,draft:p?{plan:mapPlan(p,enc),dirty:JSON.stringify(p)!==JSON.stringify(currentPlan()),valid:errors.length===0,errors,based_on_current:true}:null,return_receipt:copy(receipt),case:nt?copy(F.proposed_return.case):null,preparation_comparison:comparison,conversion_quote:quote,error,operation}};
 }
 function resolve(id,h,selectedCandidate){
  if(id==='$purchase'){if(!selectedCandidate)fail('purchase_not_selected');return {id,blueprint:copy(selectedCandidate.blueprint),cost:details[selectedCandidate.id]?.equipment_cost||0};}
  if(id.startsWith('base:')){const base=id.slice(5);if(h.free_card_options.includes(id))return {id,blueprint:{kind:'card',base,affixes:[]},cost:0};if(h.learning_options.some(x=>x.base===base))return {id,blueprint:{kind:'passive',base,affixes:[]},cost:F.mock_only.equipment_costs[base]};}
  const found=h.owned.find(x=>x.id===id);if(!found)fail('unknown_selection_handle',{ids:[id]});return {...found,cost:found.equipment_cost||0};
 }
 function evaluate(p){
  if(!home)fail('feature_not_connected');const h=copy(home),initial=home.economy;let money=initial.unspent_units,learned=copy(initial.learned);
  const checkUnique=(a,code)=>{if(new Set(a).size!==a.length)fail(code);};
  checkUnique([...p.retain_learning,...p.cancel_learning],'learning_partition');
  if(JSON.stringify([...p.retain_learning,...p.cancel_learning].sort())!==JSON.stringify(initial.learned.map(x=>x.base).sort()))fail('learning_partition');
  if(!['before_preparation','after_preparation'].includes(p.purchase_timing))fail('invalid_purchase_timing');
  const refund=sum(learned.filter(x=>p.cancel_learning.includes(x.base)).map(x=>x.paid_units));money+=refund;learned=learned.filter(x=>!p.cancel_learning.includes(x.base));
  const stages={after_cancellation:{unspent_units:money,paid_learning_units:sum(learned.map(x=>x.paid_units)),learned:copy(learned)}},candidate=p.candidate===null?null:h.candidates.find(x=>x.id===p.candidate);
  if(p.candidate&&!candidate)fail('stale_candidate');
  if(candidate&&!connections)fail('feature_not_connected');
  if(candidate&&!candidate.available)fail('candidate_unavailable');
  let purchaseCost=0,learningCost=0;
  const purchase=()=>{stages.before_purchase={unspent_units:money,paid_learning_units:sum(learned.map(x=>x.paid_units)),learned:copy(learned)};if(candidate){purchaseCost=candidate.price_units;if(money<purchaseCost)fail('insufficient_unspent_funds',{price_units:purchaseCost,funds_before_purchase_units:money,shortage_units:purchaseCost-money});money-=purchaseCost;}stages.after_purchase={unspent_units:money,paid_learning_units:sum(learned.map(x=>x.paid_units)),learned:copy(learned)};};
  const prepare=()=>{checkUnique(p.next_preparation.learn,'duplicate_learning');for(const base of p.next_preparation.learn){const opt=h.learning_options.find(o=>o.base===base);if(!opt||learned.some(l=>l.base===base))fail('invalid_learning');if(money<opt.cost_units)fail('insufficient_learning_funds',{shortage_units:opt.cost_units-money});money-=opt.cost_units;learningCost+=opt.cost_units;learned.push({base,paid_units:opt.cost_units});}};
  if(p.purchase_timing==='before_preparation'){purchase();prepare();}else{prepare();purchase();}
  const equip=p.next_preparation.equipment.map(id=>resolve(id,h,candidate));checkUnique(p.next_preparation.equipment,'duplicate_equipment');
  for(const e of equip)if(e.blueprint.kind!=='passive'||!learned.some(x=>x.base===e.blueprint.base))fail('unlearned_equipment_base',{ids:[e.id],base:e.blueprint.base});
  const used=sum(equip.map(x=>x.cost));if(used>h.equipment.capacity)fail('equipment_capacity_exceeded',{used,capacity:h.equipment.capacity});
  const cards=p.next_preparation.deck.map(id=>resolve(id,h,candidate));if(cards.some(x=>x.blueprint.kind!=='card'))fail('invalid_deck_kind');
  if(cards.length!==h.deck.required_size)fail('deck_size',{size:cards.length,required_size:h.deck.required_size});
  checkUnique(cards.filter(x=>!x.id.startsWith('base:')).map(x=>x.id),'duplicate_owned_card');
  const counts={};for(const c of cards)counts[c.blueprint.base]=(counts[c.blueprint.base]||0)+1;
  if(Object.values(counts).some(n=>n>h.deck.per_base_cap))fail('deck_base_cap',{cap:h.deck.per_base_cap});
  const paid=sum(learned.map(x=>x.paid_units));stages.prepared={unspent_units:money,paid_learning_units:paid,learned:copy(learned)};
  h.economy={unspent_units:money,paid_learning_units:paid,learned};h.equipment={entries:equip.map(e=>({id:e.id,blueprint:e.blueprint,cost:e.cost})),used,capacity:h.equipment.capacity,remaining:h.equipment.capacity-used,legal:true};
  const groups=new Map();for(const c of cards){if(!groups.has(c.id))groups.set(c.id,{id:c.id,blueprint:c.blueprint,count:0});groups.get(c.id).count++;}
  h.deck={...h.deck,composition:[...groups.values()],size:cards.length,base_counts:counts,legal:true};
  if(candidate)h.owned.push({id:'$purchase',blueprint:copy(candidate.blueprint),owned:true,equipment_cost:details[candidate.id].equipment_cost,selection_kind:candidate.blueprint.kind==='card'?'deck':'equipment'});
  h.owned=h.owned.map(o=>({...o,eligible:o.blueprint.kind==='card'||learned.some(l=>l.base===o.blueprint.base),selected:p.next_preparation.deck.includes(o.id)||p.next_preparation.equipment.includes(o.id)}));
  const difference=(a,b)=>{const m=new Map();for(const id of a)m.set(id,(m.get(id)||0)-1);for(const id of b)m.set(id,(m.get(id)||0)+1);return {removed:[...m].filter(x=>x[1]<0).map(([id,n])=>({id,count:-n})),added:[...m].filter(x=>x[1]>0).map(([id,n])=>({id,count:n}))};};
  return {home:h,candidate,comparison:{schema:'BD1-preparation-preview',ok:true,read_only:true,units_per_point:100,stages,cancellation:{bases:p.cancel_learning,actual_refund_units:refund,equipment_removed:home.equipment.entries.filter(e=>p.cancel_learning.includes(e.blueprint.base)).map(e=>({id:e.id,count:1}))},purchase:{requested:p.candidate,performed_on_copy:!!candidate,cost_units:purchaseCost,selected_in_preparation:p.next_preparation.deck.includes('$purchase')||p.next_preparation.equipment.includes('$purchase')},learning:{payment_units:learningCost,paid_learning_before_units:initial.paid_learning_units,paid_learning_after_units:paid},prepared:{economy:h.economy,equipment:h.equipment,deck:h.deck,owned:h.owned},differences:{equipment:difference(currentPlan().next_preparation.equipment,p.next_preparation.equipment),deck:difference(currentPlan().next_preparation.deck,p.next_preparation.deck),existing_possessions_preserved:true}}};
 }
 function projectComparison(c){const m=maps().enc,walk=x=>{if(typeof x==='string')return m[x]||x;if(Array.isArray(x))return x.map(walk);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v)]));return x;};return walk(c);}
 function inspect(){trace.push({method:'inspect',revision});return project();}
 function previewPreparation({view_token,plan}){trace.push({method:'previewPreparation',args:copy({view_token,plan})});try{validateToken(view_token);const e=evaluate(decode(plan));return project(projectComparison(e.comparison));}catch(e){return project({ok:false,read_only:true,refusal:{code:e.code,details:e.details||{}},draft_discarded:true});}}
 function quoteInternal(ids){if(!connections||!home)fail('feature_not_connected');if(!ids.length||new Set(ids).size!==ids.length)fail('invalid_conversion_selection');const refs=[...currentPlan().next_preparation.deck,...currentPlan().next_preparation.equipment,...(draft?.next_preparation.deck||[]),...(draft?.next_preparation.equipment||[])];
  const items=ids.map(id=>{const o=home.owned.find(x=>x.id===id);if(!o)fail('unknown_selection_handle');if(locks.has(id))fail('item_locked',{ids:[id]});if(refs.includes(id))fail('item_in_use',{ids:[id]});if(o.blueprint.affixes.length)fail('conversion_value_not_connected',{ids:[id]});return {id,blueprint:o.blueprint,units:F.mock_only.ordinary_conversion_units};});const total=sum(items.map(x=>x.units));return {items,total_units:total,unspent_before_units:home.economy.unspent_units,unspent_after_units:home.economy.unspent_units+total,removed_count:items.length};}
 function quoteConversion({view_token,item_ids}){trace.push({method:'quoteConversion',args:copy({view_token,item_ids})});try{validateToken(view_token);return project(null,projectComparison(quoteInternal(item_ids.map(id=>maps().dec[id]||id))));}catch(e){return project(null,null,e);}}
 function execute(command){trace.push({method:'execute',command:copy(command)});try{
  const sig=JSON.stringify({type:command.type,payload:command.payload}),prior=ledger.get(command.request_id);if(prior){if(prior.sig!==sig)fail('request_conflict');return project(null,null,null,{status:'replayed',committed_revision:prior.revision});}
  if(command.expected_revision!==revision)fail('stale_revision');validateToken(command.view_token);
  if(phase!=='home'&&command.type!=='ack_return')fail('return_not_acknowledged');
  const {type,payload}=command;let nextHome=copy(home),nextDraft=copy(draft),nextOffers=copy(offers),nextDetails=copy(details),nextPhase=phase,nextLocks=new Set(locks);
  if(type==='ack_return'){if(phase!=='return')fail('not_return');nextPhase='home';nextDraft=null;}
  else if(type==='save_draft'){nextDraft=decode(payload.plan);}
  else if(type==='discard_draft')nextDraft=null;
  else if(type==='commit_preparation'){
   const p=decode(payload.plan),evaluated=evaluate(p);nextHome=evaluated.home;
   if(evaluated.candidate){const fresh='mock-owned-'+revision,d=details[evaluated.candidate.id];nextDetails[fresh]=copy(d);const replace=id=>id==='$purchase'?fresh:id;nextHome.owned=nextHome.owned.map(o=>({...o,id:replace(o.id)}));nextHome.deck.composition=nextHome.deck.composition.map(o=>({...o,id:replace(o.id)}));nextHome.equipment.entries=nextHome.equipment.entries.map(o=>({...o,id:replace(o.id)}));nextHome.candidates=nextHome.candidates.map(c=>({...c,available:false}));nextOffers.status='purchased';}nextDraft=null;
  }else if(type==='convert_items'){const ids=payload.item_ids.map(id=>maps().dec[id]||id),q=quoteInternal(ids);nextHome.economy.unspent_units=q.unspent_after_units;nextHome.owned=nextHome.owned.filter(o=>!ids.includes(o.id));for(const id of ids)delete nextDetails[id];}
  else if(type==='set_item_lock'){const id=maps().dec[payload.item_id];if(!home.owned.some(o=>o.id===id))fail('unknown_selection_handle');if(payload.locked)nextLocks.add(id);else nextLocks.delete(id);}
  else if(type==='depart'){if(draft&&JSON.stringify(draft)!==JSON.stringify(currentPlan()))fail('dirty_draft');if(!home)fail('feature_not_connected');evaluate(currentPlan());fail('content_not_ready');}
  else fail('feature_not_connected');
  if(failNext){failNext=false;fail('storage_write_failed');}
  home=nextHome;draft=nextDraft;offers=nextOffers;details=nextDetails;phase=nextPhase;locks.clear();for(const id of nextLocks)locks.add(id);revision++;ledger.set(command.request_id,{sig,revision});last=copy(command);return project(null,null,null,{status:'committed',committed_revision:revision});
 }catch(e){return project(null,null,{code:e.code||'invalid_request',details:e.details||{}});}}
 return {inspect,previewPreparation,quoteConversion,execute,testing:{trace:()=>copy(trace),last:()=>copy(last),failNext:()=>{failNext=true;},stale:()=>{revision++;if(home?.candidates.length){const c=home.candidates[0];c.available=false;offers.carried_from_previous_return=true;}},snapshot:()=>JSON.stringify({home,draft,offers,phase,revision,locks:[...locks]}),reopen:()=>project()}};
}
if(typeof module!=='undefined')module.exports={createMockController};
