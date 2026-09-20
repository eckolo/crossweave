'use strict';
// Focused v0.6 checks. Real Campaign; explicit visibility/rectangles, no paint.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const pause=(ms=5)=>new Promise(r=>setTimeout(r,ms));
async function until(fn){const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('timeout');await pause();}}
(async()=>{
 const sizes=[],visibility=[],vc=new VirtualConsole();let width=1024;
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(build({testing:true}).html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-check.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];sizes.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.matchMedia=()=>({matches:true});
 }});
 const root=dom.window.document.getElementById('crossweave-journey');await until(()=>root.__test);
 let app=root.__test.app,session=app.session;const d=()=>session.state().view.display_data;
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await pause();await until(()=>!session.state().pending);};
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const click=async s=>{const b=typeof s==='string'?el(s):s;assert(!b.disabled,'disabled '+s);b.click();await idle();};
 const rect=(w,h)=>({left:0,top:0,width:w,height:h,right:w,bottom:h});
 root.getBoundingClientRect=()=>rect(width,width*9/16);
 async function resize(w){width=w;el('.cj-shell').getBoundingClientRect=()=>rect(width,width*9/16);const game=root.querySelector('.cw-explore');if(game)game.getBoundingClientRect=()=>rect(width,width*9/16);for(const o of sizes)for(const t of o.targets)if(t===root||t===game)o.fn([{target:t,contentRect:{width,height:width*9/16}}]);await idle();}
 async function show(ids){for(const o of visibility){const entries=o.targets.filter(t=>ids.includes(t.dataset.jText)).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(entries.length)o.fn(entries);}await idle();}
 const commands=[],execute=root.__test.controller.execute.bind(root.__test.controller);root.__test.controller.execute=async command=>{commands.push(structuredClone(command));return execute(command);};
 await idle();await resize(1024);
 const main=d().scene.text_ids,optional=d().scene.optional_text_ids;
 check('result offers only the forward hub action, with no direct compose or depart',Array.from(el('[data-bottom]').querySelectorAll('[data-j]')).map(b=>b.dataset.j).join()==='hub');
 check('short public paragraphs are directly rendered without generic detail links',[...main,...optional].every(id=>root.querySelector('[data-j-text="'+id+'"]'))&&!root.querySelector('[data-j="optional"]'));
 await click('[data-bottom] [data-j="hub"]');
 check('DOM insertion alone cannot acknowledge an unread result',d().phase==='return'&&app.state().seen.length===0);
 await show(main);
 check('showing the main paragraph does not record the available offscreen details',app.state().seen.length===main.length&&optional.every(id=>!app.state().seen.includes(id)));
 await show([optional[0]]);
 check('a detail is recorded only after its visibility callback',app.state().seen.includes(optional[0])&&!app.state().seen.includes(optional[1]));
 check('read records use advance false and exclude unobserved IDs',commands.filter(c=>c.type==='continue_scene').every(c=>c.payload.advance===false&&!c.payload.displayed_text_ids.includes(optional[1])));
 await click('[data-j="records"]');let entries=0;
 for(const target of d().knowledge_views){
  el('[data-inspect-key="records:targets"] .cj-inspect-scroll').scrollTop=180;
  await click('[data-j="record-target"][data-id="'+target.target_id+'"]');
  assert.equal(el('[data-inspector]').children.length,2);
  assert(!el('[data-inspect-key="records:targets"]').querySelector('.cj-record-cards'));
  const pane=el('[data-inspect-key="target:'+target.target_id+'"]');assert.equal(pane.querySelector('.cj-inspect-scroll').scrollTop,0);
  const keys=Array.from(pane.querySelectorAll('[data-j="record-detail"]')).map(b=>b.dataset.id);
  for(const key of keys){
   el('[data-inspect-key="target:'+target.target_id+'"] .cj-inspect-scroll').scrollTop=96;
   await click('[data-j="record-detail"][data-id="'+key+'"]');
   assert.equal(el('[data-inspector]').children.length,2);
   assert.equal(el('[data-inspect-key="record:'+key+'"] .cj-inspect-scroll').scrollTop,0);
   assert(el('.cj-record-stats dd'));await click('[data-j="record-back"]');
   assert.equal(el('[data-inspect-key="target:'+target.target_id+'"] .cj-inspect-scroll').scrollTop,96);entries++;
  }
  await click('[data-j="record-back"]');assert.equal(el('[data-inspect-key="records:targets"] .cj-inspect-scroll').scrollTop,180);
 }
 check('every target opens at the top in one child pane, never beneath the parent list',entries>0);
 check('all '+entries+' snapshot cards replace the child and return to the prior target scroll position',entries>0);
 await click('[data-j="record-tab"][data-tab="cards"]');await click('[data-j="record-detail"]');
 const detailKey=app.state().recordDetail.key;el('[data-inspect-key="record:'+detailKey+'"] .cj-inspect-scroll').scrollTop=26;
 for(const w of [1024,736,600,320]){await resize(w);const box=el('[data-inspector]');check('record selection and contained window geometry survive resize '+w,app.state().recordDetail.key===detailKey&&el('[data-inspect-key="record:'+detailKey+'"] .cj-inspect-scroll').scrollTop===26&&parseFloat(box.style.left)>=0&&parseFloat(box.style.top)>=0&&parseFloat(box.style.left)+parseFloat(box.style.width)<=w+.01&&parseFloat(box.style.top)+parseFloat(box.style.height)<=w*9/16+.01&&el('.cj-shell').style.height===w*9/16+'px');}
 await click('[data-j="record-back"]');
 check('card catalogue child returns to the same category',!app.state().recordDetail&&app.state().recordTab==='cards');
 await click('[data-j="close"]');await click('[data-bottom] [data-j="hub"]');
 check('forward result action reaches the real home phase and hub with empty windows',d().phase==='home'&&root.dataset.screen==='hub'&&!app.state().panel&&!app.state().windows.length);
 await click('[data-bottom] [data-j="review"]');
 const composition=d().home.deck.composition;
 check('current deck lists one name/count row per distinct card',el('.cj-build-list').children.length===composition.length&&Array.from(el('.cj-build-list').children).every(li=>li.tagName==='LI'&&li.querySelector('span')&&li.querySelector('b').textContent.startsWith('×')));
 await click('[data-j="close"]');await click('[data-bottom] [data-j="skills"]');const skill=d().home.learning_options[0].base;
 await click('[data-j="equip"][data-id="base:'+skill+'"]');const draft=JSON.stringify(session.state().draft);
 await click('[data-header] [data-j="deck"]');await click('[data-header] [data-j="skills"]');await resize(1024);
 check('one-step deck/skill switching and resize retain the actual shared draft',JSON.stringify(session.state().draft)===draft);
 await click('[data-j="detail"][data-id="base:'+skill+'"]');await click('[data-j="pin"]');
 await click('[data-bottom] [data-j="depart"]');
 check('successful confirm/depart clears pinned details and record context at the new scene',d().phase==='exploring'&&!app.state().panel&&!app.state().windows.length&&!app.state().recordTarget&&!app.state().recordDetail);
 for(let i=0;i<5&&d().scene?.paused;i++){await show(d().scene.text_ids);await click('[data-j="continue"]');}
 check('real departure still reaches exploration after visible scene text',root.dataset.screen==='explore'&&!session.state().error);
 app.dispose();
 // Natural entry has both an enemy and an environment target.
 const Campaign=root.__test.Campaign,document=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/entry.save.json.gz'))));
 const controller=await Campaign.importSave({slot_id:'flow-entry',document,request_id:'flow-entry-import'});
 app=dom.window.CrossweaveUI.mountJourney(root,{controller,Campaign,slot_id:'flow-entry',title:'夜潮の排水路'});session=app.session;await idle();
 for(let i=0;i<4&&d().scene?.paused;i++){await show(d().scene.text_ids);await click('[data-j="continue"]');}await resize(320);
 const actors=Object.values(d().exploration.actors).filter(a=>a.active),legal=d().exploration.legal_actions.map(a=>a.choice??a).find(a=>a.target!==null);
 assert(legal);const revision=session.state().view.meta.revision;
 const exactStats=()=>actors.every(a=>{const node=a.id===d().exploration.self.id?el('#cw-self'):el('[data-x-actor="'+a.id+'"]');return ['hit','crit','evasion','reduction'].every(k=>node.querySelector('[data-stat="'+k+'"] b')?.textContent===String(a[k]));});
 check('all actors and self expose exact public hit/crit/evasion/reduction including zeros',exactStats());
 check('a single detail control serves any number of actors',root.querySelectorAll('[data-x="target-info"]').length===1&&!root.querySelector('[data-x-actor-detail]'));
 await click('[data-x-card="'+legal.card_id+'"]');await click('[data-x-actor="'+legal.target+'"]');
 check('tap selects a target without opening a drawer or consuming a turn',el('#cw-drawer').hidden&&el('[data-x-actor="'+legal.target+'"]').getAttribute('aria-pressed')==='true'&&session.state().view.meta.revision===revision);
 check('the action verb stands alone and its accessible name identifies the target',el('#cw-use').textContent===d().exploration.actors[legal.target].action_label&&el('#cw-use').getAttribute('aria-label').includes(d().exploration.actors[legal.target].name));
 await click('[data-x="target-info"]');
 check('the common detail button opens the selected actor',el('#cw-drawer-title').textContent===d().exploration.actors[legal.target].name);
 await click('[data-x="close"]');
 const pointer=(type,node,props={})=>{const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{button:0,pointerId:7,pointerType:'touch',clientX:20,clientY:20,...props});node.dispatchEvent(e);};
 const other=actors.find(a=>a.id!==d().exploration.self.id&&a.id!==legal.target);assert(other);
 pointer('pointerdown',el('[data-x-actor="'+other.id+'"]'));await pause(380);pointer('pointerup',el('[data-x-actor="'+other.id+'"]'));el('[data-x-actor="'+other.id+'"]').click();
 check('hold opens a different actor without retargeting, and suppresses the trailing click',el('#cw-drawer-title').textContent===other.name&&el('[data-x-actor="'+legal.target+'"]').getAttribute('aria-pressed')==='true'&&session.state().view.meta.revision===revision);
 await pause(510);await click('[data-x="close"]');
 pointer('pointerdown',el('[data-x-actor="'+other.id+'"]'));pointer('pointermove',el('[data-x-actor="'+other.id+'"]'),{clientX:40});await pause(380);pointer('pointerup',el('[data-x-actor="'+other.id+'"]'));
 check('horizontal movement cancels actor hold',el('#cw-drawer').hidden);await pause(510);
 pointer('pointerdown',el('[data-x-actor="'+other.id+'"]'));pointer('pointercancel',el('[data-x-actor="'+other.id+'"]'));await pause(380);
 check('pointer cancellation cannot open a late detail',el('#cw-drawer').hidden);
 await click('[data-x="preview"]');check('preview opens for the actual legal choice',!el('#cw-drawer').hidden&&el('#cw-drawer').dataset.window==='preview'&&session.state().actionPreview.supported);
 await click('[data-x="preview"]');check('second preview press closes the drawer',el('#cw-drawer').hidden&&el('[data-x="preview"]').getAttribute('aria-expanded')==='false');
 let release,previewCalls=0;const preview=controller.previewAction.bind(controller);
 controller.previewAction=async(...args)=>{previewCalls++;const result=await preview(...args);await new Promise(r=>{release=r;});return result;};
 el('[data-x="preview"]').click();await until(()=>release);const pendingRevision=session.state().view.meta.revision;
 check('pending prediction keeps the close toggle enabled',!el('[data-x="preview"]').disabled&&!!session.state().pending);
 el('[data-x="preview"]').click();release();await idle();
 check('closing a pending prediction prevents its late response reopening and sends no second request',el('#cw-drawer').hidden&&previewCalls===1&&session.state().view.meta.revision===pendingRevision);
 controller.previewAction=preview;
 for(const w of [1024,736,600,320]){await resize(w);check('actor values remain in the main DOM through resize '+w,exactStats()&&el('.cj-shell').style.height===w*9/16+'px');}
 await click('[data-x="use"]');check('the short action button still executes a real legal play',!session.state().error&&session.state().view.meta.revision>revision);
 const current=d().exploration;
 check('displayed actor numbers refresh after a real action',Object.values(current.actors).filter(a=>a.active).every(a=>{const node=a.id===current.self.id?el('#cw-self'):el('[data-x-actor="'+a.id+'"]');return ['hit','crit','evasion','reduction'].every(k=>node.querySelector('[data-stat="'+k+'"] b').textContent===String(a[k]));}));
 await click('[data-x="records"]');await click('[data-j="record-target"]');await session.execute('withdraw');await idle();
 check('real withdrawal clears parent and nested windows on the return screen',d().phase==='return'&&!app.state().panel&&!app.state().recordTarget&&!app.state().recordDetail&&el('[data-inspector]').hidden);
 check('no script errors',errors.length===0);app.dispose();dom.window.close();
 const report={id:'CW-M1-UI-001',group:'flow-review-v0.6',result:'pass',count:checks.length,record_entries:entries,checks,errors,node:process.version,conditions:['Real Campaign + original MemoryStore; natural return and entry saves.','JSDOM with controlled visibility/resize, synthetic pointer events and a delayed real prediction response.','1024/736/600/320px geometry inputs; no browser paint.'],limits:['No physical clipping, touch, focus navigation or host rendering verification.','IndexedDB, formal v0.15 full migration and user acceptance remain unverified.','Historical groups were not rerun or recounted.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length,record_entries:entries}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
