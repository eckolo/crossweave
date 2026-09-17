'use strict';
// Changed scope only: accepted UI -> real Campaign lifecycle. MemoryStore is not IndexedDB.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const pause=()=>new Promise(r=>setTimeout(r,5)),copy=x=>JSON.parse(JSON.stringify(x));
const fixture=name=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/'+name+'.save.json.gz'))));
async function until(fn,label='condition'){const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('timeout: '+label);await pause();}}
async function harness(){
 const sizes=[],visibility=[],downloads=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(build({testing:true,fixture:null,start:'launcher'}).html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-check.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];sizes.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.matchMedia=()=>({matches:false});w.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:ui-check-'+downloads.length;};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){downloads.at(-1).name=this.download;};
 }});
 const w=dom.window,root=w.document.getElementById('crossweave-journey');await until(()=>root.__test);
 const {Campaign,storage}=root.__test;let app=root.__test.app,slot='journey-preview';
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const idle=async()=>{await pause();await until(()=>!app.state().connecting&&!app.state().reading&&!app.state().launcher.pending&&!app.session?.state().pending,'idle');await pause();};
 const click=async s=>{const b=typeof s==='string'?el(s):s;assert(!b.disabled,'disabled '+s);b.click();await idle();};
 const d=()=>app.session?.state().view?.display_data;
 async function readScene(){for(let i=0;i<6&&d()?.scene?.paused;i++){
  for(const o of visibility){const rows=o.targets.filter(t=>root.contains(t)&&t.dataset.jText).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(rows.length)o.fn(rows);}await idle();
  await click('[data-j="continue"]');
 }assert(!d()?.scene?.paused,'scene should continue');}
 async function remount(nextSlot=slot,provider=Campaign,storageMode='ephemeral'){
  app.dispose();slot=nextSlot;const {versions}=await import(path.resolve(__dirname,'../../../../../../src/runtime/campaign.mjs'));
  app=w.CrossweaveUI.mountJourneyApplication(root,{Campaign:provider,config:{slot_id:slot,...versions},storageMode});await idle();
 }
 async function file(text,name='save.json'){
  if(!root.querySelector('[data-launch-file]'))await click('[data-launch="import-menu"]');
  const input=el('[data-launch-file]');Object.defineProperty(input,'files',{value:[{name,text:async()=>text}],configurable:true});input.dispatchEvent(new w.Event('change',{bubbles:true}));await idle();
 }
 async function dataMenu(){if(root.querySelector('.cw-explore')){await click('[data-x="more"]');await click('[data-x="menu"]');}else await click('[data-j="menu"]');await click('[data-j="data"]');}
 async function editOne(){await click('[data-j="deck"]');const b=root.querySelector('[data-j="remove"]:not(:disabled)');assert(b);const id=b.dataset.id;await click(b);return id;}
 return {w,root,storage,Campaign,visibility,sizes,downloads,el,click,idle,d,readScene,remount,file,dataMenu,editOne,get app(){return app;},get slot(){return slot;},close(){app.dispose();w.close();}};
}
(async()=>{
 const h=await harness();
 // Exercise the actual standalone library, including its offline icon subset.
 h.w.eval(require('../build.cjs').buildLibrary());await h.remount();
 await h.click('[data-launch="open"]');check('missing save stays at startup and does not create',h.storage.records.size===0&&!h.app.journey&&h.root.textContent.includes('保存がありません'));
 // Inject latency/failure through the design-owned adapter, leaving Campaign unchanged.
 let release,calls=[];const provider={...h.Campaign,create:async args=>{calls.push(copy(args));return h.Campaign.create(args);}};
 await h.remount('journey-preview',provider);h.storage.beforeCommit=()=>new Promise(r=>release=r);h.storage.failNext=true;
 h.el('[data-launch="create"]').click();await until(()=>release,'create pending');
 const again=h.el('[data-launch="create"]');again.click();
 check('create is pending and duplicate input is disabled',again.disabled&&h.app.state().launcher.pending&&calls.length===1);
 release();await h.idle();check('failed creation is retryable without a made-up save',h.storage.records.size===0&&h.app.state().launcher.canRetry);
 await h.click('[data-launch="retry"]');check('creation retry reuses the complete request',calls.length===2&&JSON.stringify(calls[0])===JSON.stringify(calls[1]));
 check('new campaign follows the real unpaused home phase',h.d().phase==='home'&&!h.d().scene.paused&&h.root.dataset.screen==='hub');
 check('unshown home prose is not marked read at startup',h.app.journey.state().seen.length===0&&!h.root.querySelector('[data-j-text]'));
 check('standalone controls render icons without the conversation host',!!h.root.querySelector('svg[data-lucide="menu"]')&&!!h.root.querySelector('svg[data-lucide="lightbulb"]'));
 const guard=h.d().home.free_card_options.find(id=>h.d().details[id].primary.kind==='guard');assert(guard);
 await h.click('[data-j="deck"]');await h.click('[data-j="detail"][data-id="'+guard+'"]');
 check('preparation card details pair icons with the correct guard terms',h.root.textContent.includes('攪乱')&&!h.root.textContent.includes('設置間隔')&&!!h.root.querySelector('svg[data-lucide="wind"]'));
 await h.click('[data-j="close-item"]');await h.click('[data-j="hub"]');
 const removed=await h.editOne(),draft=copy(h.app.session.state().draft),committed=copy(h.d().home.deck);
 check('incomplete deck stays a local proposal',h.app.session.state().localDirty&&!h.app.session.state().comparison.ok);
 await h.dataMenu();h.storage.failNext=true;await h.click('[data-j="suspend"]');
 check('failed suspend retains the draft and remains in the game',h.app.session.state().canRetry&&h.root.dataset.screen!=='start'&&JSON.stringify(h.app.session.state().draft)===JSON.stringify(draft));
 await h.click('[data-j="retry"]');check('successful retry completes suspension once',h.root.dataset.screen==='start'&&!h.app.session.state().localDirty);
 const stored=copy(h.storage.records.get(h.slot));await h.remount();await h.click('[data-launch="open"]');
 check('fresh UI instance restores incomplete saved draft without committing it',h.root.dataset.screen==='deck'&&JSON.stringify(h.app.session.state().draft)===JSON.stringify(draft)&&JSON.stringify(h.d().home.deck)===JSON.stringify(committed));
 check('open does not mutate a saved campaign',JSON.stringify(h.storage.records.get(h.slot))===JSON.stringify(stored));
 // Reintroduce a local change; export must persist it before asking the browser to download.
 await h.click('[data-j="add"][data-id="'+removed+'"]');await h.dataMenu();h.storage.failNext=true;await h.click('[data-j="export"]');
 check('failed save before export produces no download and retains the proposal',h.downloads.length===0&&h.app.session.state().canRetry&&h.app.session.state().localDirty);
 await h.click('[data-j="retry"]');check('export retry saves then produces one named download',h.downloads.length===1&&h.downloads[0].name==='crossweave-save.json'&&!h.app.session.state().localDirty);
 const exportDocument=await h.app.session.exportSave(),exported=JSON.stringify(exportDocument);
 h.w.URL.createObjectURL=undefined;await h.click('[data-j="export"]');
 check('download-unavailable error leaves the already saved game intact',h.root.textContent.includes('ファイルを書き出せません')&&JSON.stringify(await h.app.session.exportSave())===exported);
 await h.click('[data-j="hub"]');await h.editOne();
 const replacement=h.d().home.free_card_options.find(id=>!h.app.session.state().draft.next_preparation.deck.includes(id));assert(replacement);
 await h.click('[data-j="add"][data-id="'+replacement+'"]');const validDraft=copy(h.app.session.state().draft);
 await h.dataMenu();await h.click('[data-j="suspend"]');await h.remount();await h.click('[data-launch="open"]');
 check('restored valid proposal gets a fresh comparison and can be confirmed without another edit',JSON.stringify(h.app.session.state().draft)===JSON.stringify(validDraft)&&h.app.session.state().comparison?.ok&&!h.el('[data-j="commit"]').disabled);
 await h.click('[data-j="commit"]');check('confirming restored draft applies it through Campaign',h.d().home.deck.composition.some(c=>c.id===replacement&&c.count===1)&&!h.app.session.state().localDirty);
 // An invalid/occupied import must never become a reset or overwrite route.
 await h.remount('import-empty');await h.file('{broken','broken.json');await h.click('[data-launch="import"]');
 check('invalid import keeps the selected input and empty slot',h.app.state().filename==='broken.json'&&h.app.state().launcher.rawImport==='{broken'&&!h.storage.records.has('import-empty'));
 for(const width of [1024,736,600,320]){
  const rect={x:0,y:0,left:0,top:0,right:width,bottom:width*9/16,width,height:width*9/16};h.root.getBoundingClientRect=()=>rect;
  for(const o of h.sizes)if(o.targets.includes(h.root))o.fn([{target:h.root,contentRect:rect}]);await h.idle();
  check('import frame retains input and actions at '+width+'px',h.el('.cj-shell').style.height===width*9/16+'px'&&h.app.state().filename==='broken.json'&&h.app.state().launcher.rawImport==='{broken'&&!h.el('[data-launch="back"]').disabled&&!h.el('[data-launch="import"]').disabled);
 }
 let importArgs=[];const importProvider={...h.Campaign,importSave:async args=>{importArgs.push(copy(args));return h.Campaign.importSave(args);}};
 await h.remount('import-empty',importProvider);await h.file(exported);h.storage.failNext=true;await h.click('[data-launch="import"]');
 await h.click('[data-launch="retry"]');check('import retries the same document and request ID into an empty slot',importArgs.length===2&&JSON.stringify(importArgs[0])===JSON.stringify(importArgs[1])&&!!h.app.journey);
 check('import restores public phase and proposal',h.d().phase==='home'&&JSON.stringify(h.app.session.state().draft)===JSON.stringify(exportDocument.draft.plan));
 const occupied=JSON.stringify(h.storage.records.get('import-empty'));await h.remount('import-empty');await h.file(exported);await h.click('[data-launch="import"]');
 check('occupied import is rejected without destroying either input',!h.app.journey&&h.app.state().filename==='save.json'&&JSON.stringify(h.storage.records.get('import-empty'))===occupied&&h.root.textContent.includes('保存があります'));
 await h.click('[data-launch="back"]');await h.click('[data-launch="open"]');check('occupied import can return to Continue',h.d().phase==='home');
 // A real write may have succeeded before connection setup fails. Never auto-create again.
 let failInspect=true;const connectionProvider={...h.Campaign,create:async args=>{const c=await h.Campaign.create(args);return new Proxy(c,{get(target,key){if(key==='inspect')return ()=>{if(failInspect){failInspect=false;throw {code:'connection_failed'};}return c.inspect();};const value=target[key];return typeof value==='function'?value.bind(target):value;}});}};
 await h.remount('inspect-fail',connectionProvider);await h.click('[data-launch="create"]');
 check('post-create inspect failure offers open and protects existing save',!h.app.journey&&h.el('[data-launch="create"]').disabled&&!h.el('[data-launch="open"]').disabled&&h.storage.records.has('inspect-fail'));
 await h.click('[data-launch="open"]');check('open recovers the created campaign after inspect failure',h.d().phase==='home');
 // Production mounting uses persistent wording while inline mounting explicitly remains ephemeral.
 await h.remount('journey-preview',h.Campaign,'persistent');await h.click('[data-launch="open"]');await h.dataMenu();
 check('persistent entry has save controls without the former legacy-UI detour',h.root.dataset.storageMode==='persistent'&&h.root.textContent.includes('確定した操作は保存')&&!h.root.textContent.includes('既存'));
 await h.click('[data-j="suspend"]');await h.click('[data-j="resume"]');
 check('in-app resume reopens the persisted phase',h.d().phase==='home'&&h.root.dataset.screen!=='start');
 h.close();

 // The hand-off's two natural result fixtures and an actual UI withdrawal cover all outcomes.
 for(const [fixtureName,label]of [['return','踏破'],['second-return','緊急脱出']]){
  const f=await harness();await f.file(JSON.stringify(fixture(fixtureName)));await f.click('[data-launch="import"]');
  const before=await f.app.session.exportSave();check(label+' save selects the result screen from real phase',f.d().phase==='return'&&f.root.dataset.screen==='return'&&f.el('[data-header]').textContent.includes(label));
  if(fixtureName==='return'){
   const target=f.d().knowledge_views.find(t=>t.confirmed_reward_candidates.length);assert(target,'natural clear fixture needs recorded reward');
   await f.click('[data-j="records"]');await f.click('[data-j="record-target"][data-id="'+target.target_id+'"]');
   check('recorded rewards show only the published labels',target.confirmed_reward_candidates.every(r=>f.root.textContent.includes(r.label))&&f.root.textContent.includes('獲得記録'));
   check('records retain the published observation contexts',(!target.observed_by_current_actor.length||f.root.textContent.includes('この相手の札'))&&(!target.observed_earlier.length||f.root.textContent.includes('過去の探索で観測')));
   const card=f.root.querySelector('[data-inspect-key="target:'+target.target_id+'"] [data-j="record-detail"]');assert(card);await f.click(card);
   check('public snapshot card opens beside its source with the shared terms',f.root.querySelector('[data-inspector]').children.length===2&&f.root.textContent.includes('次の行動まで')&&!f.root.textContent.includes('一致間隔'));
   await f.click('[data-j="menu"]'); // closes the record branch, then normal menu path below toggles it
   await f.click('[data-j="menu"]');
  }
  await f.dataMenu();await f.click('[data-j="suspend"]');await f.remount();await f.click('[data-launch="open"]');
  check(label+' reopen does not recredit the result',JSON.stringify(await f.app.session.exportSave())===JSON.stringify(before)&&f.root.dataset.screen==='return');f.close();
 }
 const f=await harness();await f.file(JSON.stringify(fixture('entry')));await f.click('[data-launch="import"]');
 const currentIds=f.d().scene.text_ids,optional=f.d().scene.optional_text_ids||[],first=f.el('[data-j-text="'+currentIds[0]+'"]');
 for(const o of f.visibility)if(o.targets.includes(first))o.fn([{target:first,isIntersecting:true,intersectionRatio:1}]);await f.idle();
 check('read receipt covers only the one paragraph actually signalled visible',JSON.stringify(f.app.journey.state().seen)===JSON.stringify([currentIds[0]])&&optional.every(id=>!f.app.journey.state().seen.includes(id)));
 await f.readScene();
 check('opening active exploration does not replay prior history',f.el('#cw-event-feed').children.length===0);
 const action=f.d().exploration.legal_actions.find(q=>q.target===null);assert(action);
 await f.click('[data-x-card="'+action.card_id+'"]');await f.click('[data-x="use"]');
 check('resolved real actions produce a bounded transient public feed',f.d().exploration.public_history.length>0&&f.el('#cw-event-feed').children.length>0&&f.el('#cw-event-feed').children.length<=2);
 await f.dataMenu();await f.click('[data-j="suspend"]');await f.remount();await f.click('[data-launch="open"]');
 check('reopening retains history without replaying the transient feed',f.d().exploration.public_history.length>0&&f.el('#cw-event-feed').children.length===0);
 await f.click('[data-x="more"]');await f.click('[data-x="history"]');
 check('full public history remains available separately from the transient feed',f.el('#cw-drawer .cw-drawer-body ol').children.length===f.d().exploration.public_history.length);
 await f.click('[data-x="close"]');
 await f.click('[data-x="withdraw"]');check('UI withdrawal selects the actual withdrawal result',f.d().return_receipt.outcome==='withdrawal'&&f.root.dataset.screen==='return');
 for(const o of f.visibility){const rows=o.targets.filter(t=>f.root.contains(t)&&t.dataset.jText).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(rows.length)o.fn(rows);}await f.idle();
 await f.click('[data-j="hub"]');check('acknowledging the result goes to hub and clears open windows',f.d().phase==='home'&&f.root.dataset.screen==='hub'&&f.app.journey.state().panel===null);
 await f.click('[data-j="depart"]');check('redeparture uses the actual phase and scene',f.d().phase==='exploring'&&f.root.dataset.screen==='scene');
 await f.dataMenu();await f.click('[data-j="suspend"]');await f.remount();await f.click('[data-launch="open"]');
 check('open resumes the paused exploration scene',f.d().phase==='exploring'&&f.root.dataset.screen==='scene');await f.readScene();
 await f.dataMenu();await f.click('[data-j="suspend"]');await f.remount();await f.click('[data-launch="open"]');
 check('open resumes active exploration without replaying prose',f.d().phase==='exploring'&&f.root.dataset.screen==='explore');f.close();
 check('no script errors',errors.length===0);
 const report={id:'CW-M1-UI-001',group:'save-flow-v0.10',result:'pass',count:checks.length,checks,errors,node:process.version,conditions:['Real Campaign and unmodified design-owned MemoryStore; JSDOM DOM/event execution.','New UI creates, opens, imports, exports, suspends and resumes. Download is observed at the browser API boundary, not an actual browser file transfer.','Controlled IntersectionObserver signals only mounted scene paragraphs; unseen optional text is not marked read.','Injected adapter failure/latency exercises changed startup/save routes. Natural clear/defeat saves and actual UI withdrawal cover result selection, without rerunning balance exploration.'],limits:['IndexedDB persistence across browser closure, actual downloads/file chooser and rendering are unverified.','No physical overflow/touch verification: canonical local browser entry previously returned ERR_BLOCKED_BY_CLIENT.','Historical test groups were not rerun or recounted; full formal migration and user acceptance remain open.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
