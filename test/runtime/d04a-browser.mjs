// D04A resume harness. Must run in actual, same-origin browser documents.
// No MemoryStore/fake IndexedDB fallback and no UI/game implementation.
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {IndexedDBStore} from '../../src/runtime/storage.mjs';
import {canonical,copy} from '../../src/runtime/common.mjs';
import {assert,command,currentPlan} from './support.mjs';
const same=(a,b,label)=>assert(canonical(a)===canonical(b),label);
const home=c=>c.inspect().display_data.home;
const now=()=>new Date().toISOString();
export const pageID=crypto.randomUUID();
export async function digest(document){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(document))))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function storeFor(run){
  assert(/^[0-9a-f-]{36}$/.test(run),'dedicated run UUID required');
  assert(globalThis.indexedDB&&isSecureContext,'real IndexedDB / secure context required');
  return new IndexedDBStore({database:'crossweave-CW-M1-D04A-'+run});
}
async function summary(d){
  const e=d.session.economy;
  return {sha256:await digest(d),schema:d.schema,engine:d.engine_version,revision:d.revision,phase:d.session.phase,
    funds_units:e.profile.points*100+e.remainder,owned:Object.keys(e.inventory).length,receipts:Object.keys(d.session.receipts).length,
    requests:Object.keys(d.request_log).length,migrations:Object.keys(d.request_log).filter(k=>k.startsWith('migration-')).length,
    draft_dirty:d.draft?.dirty??false,review_required:d.acquisition_migration?.review_required??false,
    profile_sha256:await digest(e.profile),inventory_sha256:await digest(e.inventory),composition_sha256:await digest({deck:d.session.au.deck,equipment:e.aq.equipped}),
    offers_sha256:await digest(e.at),receipts_sha256:await digest(d.session.receipts),game_sha256:await digest(d.session.game),history_sha256:await digest({public:d.public_history,actions:d.session.action_history})};
}
async function record(state,name,action){
  try{const details=await action();state.checks.push({name,status:'passed',at:now(),page_id:pageID,...details});}
  catch(e){state.checks.push({name,status:'failed',at:now(),page_id:pageID,error:e.code||e.message});throw e;}
}
async function checkpoint(state,storage,slot,c){
  const d=c.exportSave();same(await storage.load(slot),d,slot+': committed record equals controller');
  state.expected[slot]={...(await summary(d)),page_id:pageID};return state.expected[slot];
}
function acquisitionPlan(c){
  const p=currentPlan(c),h=home(c);
  const modified=h.acquisition.find(x=>x.id==='choice-1'),basic=h.acquisition.find(x=>x.id==='basic:PS01');
  assert(modified?.blueprint.kind==='passive'&&basic,'fixed D03R acquisition rows');
  p.acquire=[modified.id,basic.id];p.composition.equipment=[modified.pending_selection_id,basic.pending_selection_id];return p;
}
function compareMigration(old,next){
  assert(next.schema==='CW-M1-save-2'&&next.revision===old.revision+1,'one migration revision');
  for(const field of ['casebook','public_history'])same(next[field],old[field],field+' preserved');
  for(const field of ['receipts','action_history','active'])same(next.session[field],old.session[field],field+' preserved');
  same(next.session.economy.profile,old.session.economy.profile,'balance/paid/knowledge preserved');
  for(const [id,row]of Object.entries(old.session.economy.inventory))same(next.session.economy.inventory[id],row,'old individual '+id);
  for(const [id,row]of Object.entries(old.request_log))same(next.request_log[id],row,'old request '+id);
  same(next.acquisition_migration.legacy_draft,old.draft,'old draft archive');
  if(old.engine_version==='CW-M1-engine-0.6'){
    same(next.session.economy.at,old.session.economy.at,'offers/purchases preserved');
    same(next.session.economy.sales,old.session.economy.sales,'conversion history preserved');
  }
}
// Artificial failure only: native IDB put + transaction.abort, then the adapter
// returns storage_write_failed. This does not exercise the production commit's
// own abort-handler mapping, disk exhaustion, power loss or browser process kill.
class AbortOnceStore extends IndexedDBStore {
  failNext=false;
  async commit(slot,expected,document){
    if(!this.failNext)return super.commit(slot,expected,document);
    this.failNext=false;const db=await this.db();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('slots','readwrite'),s=tx.objectStore('slots'),r=s.get(slot);let injected=false;
      r.onsuccess=()=>{
        if((r.result?.revision??null)!==expected){tx.abort();return;}
        s.put(document,slot);injected=true;tx.abort();
      };
      tx.onerror=()=>{};
      tx.onabort=()=>reject(Object.assign(Error(injected?'storage_write_failed':'injection_revision_mismatch'),{code:injected?'storage_write_failed':'injection_revision_mismatch'}));
      tx.oncomplete=()=>reject(Error('expected artificial abort did not occur'));
    });
  }
}
export async function verifyInputs(bundle){
  for(const row of bundle.manifest.inputs){if(row.name in bundle.inputs)same(await digest(bundle.inputs[row.name]),row.document_sha256,'input '+row.name);}
  for(const [p,h]of Object.entries(bundle.manifest.runtime_sha256)){
    const r=await fetch(new URL('../../'+p,import.meta.url),{cache:'no-store'});assert(r.ok,'source fetch '+p);
    const bytes=await r.arrayBuffer(),actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');same(actual,h,'runtime SHA '+p);
  }
}
export function newRun(manifest,operatorEnvironment){
  assert(operatorEnvironment.trim(),'OS and browser full version must be entered');
  const run=crypto.randomUUID();
  return {schema:'CW-M1-D04A-browser-1',run,database:storeFor(run).database,origin:location.origin,started_at:now(),first_page_id:pageID,
    runtime_commit:manifest.runtime_commit,versions,input_manifest:manifest,operator_environment:operatorEnvironment,user_agent:navigator.userAgent,
    status:'in_progress',checks:[],expected:{},limits:['Developer harness only; no UI acceptance or human playthrough','Artificial abort is explicitly injected; not disk/power failure','Two-tab sequence checks stale revisions and replay; not simultaneous commit timing']};
}
export async function prepareSingle(state,inputs){
  const storage=storeFor(state.run),api=createCampaign({storage});
  await record(state,'new-create',async()=>{
    const c=await api.create({slot_id:'initial',request_id:'d04a-create',...versions});
    assert(home(c).owned.length===20&&home(c).economy.unspent_units===0,'initial fixed state');
    return {after:await checkpoint(state,storage,'initial',c)};
  });
  await record(state,'preview-cancel-atomic-acquisition',async()=>{
    const c=await api.importSave({slot_id:'acquire',document:inputs.natural,request_id:'d04a-import-acquire'}),before=c.exportSave(),p=acquisitionPlan(c);
    const preview=c.previewPreparation({view_token:c.inspect().meta.view_token,plan:p});
    assert(preview.display_data.preparation_comparison?.ok,'preview accepted');
    const cancelled=c.previewPreparation({view_token:c.inspect().meta.view_token,plan:currentPlan(c)});
    assert(cancelled.display_data.preparation_comparison.payment.cost_units===0,'cancel cost zero');
    same(c.exportSave(),before,'preview/cancel controller unchanged');same(await storage.load('acquire'),before,'preview/cancel IDB unchanged');
    const request=command(c,'commit_preparation',{plan:p}),response=await c.execute(request);
    assert(response.display_data.operation?.status==='committed','atomic commit accepted');
    assert(home(c).owned.length===22&&home(c).economy.unspent_units===300&&home(c).offers.status==='purchased','inventory/balance/candidate all committed');
    assert(home(c).equipment.entries.length===2&&c.exportSave().revision===before.revision+1,'composition and one revision');
    return {before:await summary(before),request,response:response.display_data.operation,preview:preview.display_data.preparation_comparison.payment,after:await checkpoint(state,storage,'acquire',c)};
  });
  for(const name of ['departed','returned'])await record(state,name+'-import',async()=>{
    const c=await api.importSave({slot_id:name,document:inputs[name],request_id:'d04a-import-'+name});
    assert(c.inspect().display_data.phase===(name==='departed'?'exploring':'return'),'source phase');
    same(c.exportSave().session.receipts,inputs[name].session.receipts,'receipts unchanged');
    if(name==='departed')same(c.exportSave().session,inputs[name].session,'save2 entire expedition unchanged');
    return {source:await summary(inputs[name]),after:await checkpoint(state,storage,name,c)};
  });
  for(const name of ['oldest','purchased','dirty'])await record(state,name+'-migration-open',async()=>{
    const old=copy(inputs[name]);await storage.commit(name,null,old);same(await storage.load(name),old,'raw legacy seed');
    const c=await api.open({slot_id:name});compareMigration(old,c.exportSave());
    if(name==='dirty')assert(c.inspect().display_data.migration_notice.review_required&&c.inspect().display_data.draft.dirty,'dirty draft requires review');
    return {before:await summary(old),after:await checkpoint(state,storage,name,c)};
  });
  await record(state,'invalid-migration-preserves-source',async()=>{
    const bad=copy(inputs.natural);bad.schema='CW-M1-save-invalid-D04A';await storage.commit('invalid',null,bad);
    let error=null;try{await api.open({slot_id:'invalid'});}catch(e){error=e.code||e.message;}
    assert(error,'invalid input must reject');same(await storage.load('invalid'),bad,'invalid record untouched');
    state.expected.invalid={...(await summary(bad)),expected_error:error,page_id:pageID};
    return {error,after:state.expected.invalid};
  });
  const faulty=new AbortOnceStore({database:storage.database}),faultAPI=createCampaign({storage:faulty});
  await record(state,'injected-native-abort-acquisition-retry',async()=>{
    const c=await faultAPI.importSave({slot_id:'abort-acquire',document:inputs.natural,request_id:'d04a-import-abort'}),before=c.exportSave();
    const request=command(c,'commit_preparation',{plan:acquisitionPlan(c)});faulty.failNext=true;
    const rejected=await c.execute(request);assert(rejected.display_data.error?.code==='storage_write_failed','abort reported');
    same(c.exportSave(),before,'failed controller untouched');same(await storage.load('abort-acquire'),before,'native tx rolled back');
    const retry=await c.execute(request);assert(retry.display_data.operation?.status==='committed','same request retry');
    assert(home(c).economy.unspent_units===300&&c.exportSave().revision===before.revision+1,'charged once after abort');
    return {injected:true,before:await summary(before),request,error:rejected.display_data.error,after:await checkpoint(state,storage,'abort-acquire',c)};
  });
  await record(state,'injected-native-abort-migration-retry',async()=>{
    await storage.commit('abort-migration',null,inputs.dirty);faulty.failNext=true;
    let error=null;try{await faultAPI.open({slot_id:'abort-migration'});}catch(e){error=e.code||e.message;}
    assert(error==='storage_write_failed','migration abort');same(await storage.load('abort-migration'),inputs.dirty,'legacy preserved after abort');
    const c=await faultAPI.open({slot_id:'abort-migration'});compareMigration(inputs.dirty,c.exportSave());
    return {injected:true,error,before:await summary(inputs.dirty),after:await checkpoint(state,storage,'abort-migration',c)};
  });
  state.status='awaiting_actual_page_reload';
}
export async function verifyReload(state){
  assert(pageID!==state.first_page_id,'reload requires a new document, not two controllers');
  assert(pageID!==state.last_reload_page_id,'reload once more before verifying again');
  const storage=storeFor(state.run),api=createCampaign({storage});
  for(const [slot,expected]of Object.entries(state.expected))await record(state,'reload-'+slot,async()=>{
    assert(pageID!==expected.page_id,'this checkpoint still belongs to the current document');
    const raw=await storage.load(slot);same(await digest(raw),expected.sha256,'IDB record survived page reload');
    if(expected.expected_error){let error=null;try{await api.open({slot_id:slot});}catch(e){error=e.code||e.message;}same(error,expected.expected_error,'invalid remains rejected');}
    else {const c=await api.open({slot_id:slot});same(await digest(c.exportSave()),expected.sha256,'fresh controller unchanged: no repeated migration/settlement');}
    same(await digest(await storage.load(slot)),expected.sha256,'open did not write again');
    return {previous_page_id:expected.page_id,navigation_type:performance.getEntriesByType('navigation')[0]?.type??null,after:await summary(raw)};
  });
  state.reload_verified=true;state.last_reload_page_id=pageID;
  state.status=state.two_tabs_verified?'passed_limited_browser_checks':'awaiting_second_tab';
}
export function peerChannel(run){
  storeFor(run);const channel=new BroadcastChannel('crossweave-CW-M1-D04A-'+run);const pending=new Map();
  channel.onmessage=event=>{const m=event.data;if(m.kind==='response'&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  return {channel,rpc(action,args={}){return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(Error('peer_timeout: open a second actual tab on the displayed URL'));},15000);
    pending.set(id,m=>{clearTimeout(timer);m.error?reject(Error(m.error)):resolve(m);});channel.postMessage({kind:'request',id,action,args,from:pageID});
  });}};
}
export function startPeer(run,show){
  const storage=storeFor(run),api=createCampaign({storage}),channel=new BroadcastChannel('crossweave-CW-M1-D04A-'+run);let c=null;
  channel.onmessage=async event=>{
    const m=event.data;if(m.kind!=='request'||m.from===pageID)return;
    const response={kind:'response',id:m.id,page_id:pageID,origin:location.origin};
    try{
      if(m.action==='open'){c=await api.open({slot_id:m.args.slot});response.document=await summary(c.exportSave());response.meta=c.inspect().meta;}
      else if(m.action==='execute'){assert(c,'peer controller is not open');const before=await summary(c.exportSave()),view=await c.execute(m.args.request);response.before=before;response.operation=view.display_data.operation??null;response.command_error=view.display_data.error??null;response.document=await summary(c.exportSave());}
      else if(m.action!=='ping')throw Error('unknown peer action');
    }catch(e){response.error=e.code||e.message;}
    show(response);channel.postMessage(response);
  };
  show({status:'peer_ready',run,page_id:pageID,origin:location.origin});return channel;
}
export async function runTwoTabs(state,inputs,peer){
  assert(state.reload_verified,'complete the page reload first');
  const ping=await peer.rpc('ping');assert(ping.page_id!==pageID&&ping.origin===location.origin,'independent same-origin page required');
  const storage=storeFor(state.run),api=createCampaign({storage});
  await record(state,'two-real-tabs-stale-replay-reopen',async()=>{
    const c=await api.importSave({slot_id:'two-tabs',document:inputs.natural,request_id:'d04a-import-two-tabs'}),before=c.exportSave();
    const opened=await peer.rpc('open',{slot:'two-tabs'});same(opened.document.sha256,await digest(before),'both pages opened same revision');
    const request=command(c,'commit_preparation',{plan:acquisitionPlan(c)});
    const response=await c.execute(request);assert(response.display_data.operation?.status==='committed','first page committed');
    const saved=c.exportSave(),staleRequest={...copy(request),request_id:request.request_id+'-other-tab'};
    const stale=await peer.rpc('execute',{request:staleRequest});assert(stale.command_error?.code==='stale_revision','old revision from real second page refused');
    same(stale.document.sha256,opened.document.sha256,'rejected peer controller unchanged');same(await storage.load('two-tabs'),saved,'stale command did not persist');
    const replay=await peer.rpc('execute',{request});assert(replay.operation?.status==='replayed','same request replayed in second page');
    same(replay.document.sha256,await digest(saved),'peer recovers latest state');same(await storage.load('two-tabs'),saved,'no second payment');
    const reopened=await peer.rpc('open',{slot:'two-tabs'});same(reopened.document.sha256,await digest(saved),'peer fresh open');
    assert(home(c).economy.unspent_units===300&&saved.revision===before.revision+1,'exactly one charge and revision');
    return {main_page_id:pageID,peer_page_id:ping.page_id,sequencing:'both open -> main commit -> peer stale request -> peer same-request replay -> peer reopen',request,stale_request_id:staleRequest.request_id,before:await summary(before),peer_open:opened,peer_stale:stale,peer_replay:replay,peer_reopen:reopened,after:await checkpoint(state,storage,'two-tabs',c)};
  });
  state.two_tabs_verified=true;state.status='awaiting_final_reload';
}
