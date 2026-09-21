'use strict';
// Actual public Campaign data and UI events. Geometry inputs are synthetic, never paint evidence.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const pause=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('timeout');await pause();}}
(async()=>{
 const observers=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(build({testing:true}).html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-check.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];observers.push(this);}observe(target){this.targets.push(target);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.active=true;}observe(target){queueMicrotask(()=>{if(this.active)this.fn([{target,isIntersecting:true,intersectionRatio:1}]);});}disconnect(){this.active=false;}};
  w.matchMedia=()=>({matches:true});
 }});
 const root=dom.window.document.getElementById('crossweave-journey');await until(()=>root.__test);let app=root.__test.app,session=app.session;
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await pause();await until(()=>!session.state().pending);};
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const click=async s=>{const b=typeof s==='string'?el(s):s;assert(!b.disabled,'disabled '+s);b.click();await idle();};
 await idle();await click('[data-j="records"]');
 const knowledge=session.state().view.display_data.knowledge_views,revision=session.state().view.meta.revision;
 let examined=0;
 for(const target of knowledge){
  await click('[data-j="record-target"][data-id="'+target.target_id+'"]');
  const keys=Array.from(root.querySelectorAll('[data-j="record-detail"]')).map(e=>e.dataset.id);
  for(const key of keys){
   const title=el('[data-j="record-detail"][data-id="'+key+'"]').textContent;
   await click('[data-j="record-detail"][data-id="'+key+'"]');
   assert(app.state().recordDetail&&el('[data-inspector]').children.length===2);
   assert(el('[data-inspector]').lastElementChild.querySelector('h2').textContent===title);
   assert(el('[data-inspector]').lastElementChild.querySelector('dd'));
   await click('[data-j="close-record-detail"]');assert(app.state().recordTarget===target.target_id);examined++;
  }
 }
 check('every listed initial/observed card opens a named public detail ('+examined+' entries)',examined>0);
 check('reading knowledge does not alter the campaign revision',session.state().view.meta.revision===revision);
 await click('[data-j="record-tab"][data-tab="cards"]');
 const firstKey=el('[data-j="record-detail"]').dataset.id;
 el('[data-inspect-key="records"] .cj-inspect-scroll').scrollTop=90;
 await click('[data-j="record-detail"]');
 check('card record keeps its parent list and opens a separate child',app.state().panel==='records'&&app.state().recordTab==='cards'&&el('[data-inspector]').dataset.layout==='records-child'&&el('[data-inspector]').children.length===2);
 check('parent record scroll and selection survive opening/closing a child',el('[data-inspect-key="records"] .cj-inspect-scroll').scrollTop===90&&app.state().recordDetail.key===firstKey);
 const before=JSON.stringify(session.state().draft);
 check('knowledge details do not expose preparation mutations',!el('[data-inspector]').querySelector('[data-j-mutation]'));
 await click('[data-j="close-record-detail"]');
 check('closing child returns to the same records category',app.state().recordDetail===null&&app.state().recordTab==='cards'&&el('[data-inspect-key="records"] .cj-inspect-scroll').scrollTop===90);
 await click('[data-j="record-detail"]');await click('[data-j="record-detail"]');
 check('repeated record selection toggles its detail',app.state().recordDetail===null);
 await click('[data-j="close"]');await click('[data-j="skills"]');
 check('skills use the card-face structure and keep conditions in details',el('.cj-skillpiece .cj-card-face')&&!el('.cj-skillpiece').querySelector('.cj-skill-structure'));
 await click('[data-j="detail"][data-id="base:PS01"]');
 check('compact skill still opens separate trigger/effect fields',Array.from(el('[data-inspector]').querySelectorAll('.cj-skill-structure dt')).map(n=>n.textContent).join('|')==='発動条件|効果');
 await click('[data-inspector] [data-j="equip"]');
 const draft=JSON.stringify(session.state().draft);await click('[data-j="deck"]');await click('[data-j="skills"]');
 check('compact skill action and deck switch preserve the shared draft',JSON.stringify(session.state().draft)===draft&&draft!==before);
 await click('[data-j="menu"]');await click('[data-j="help"]');
 check('help explains target selection separately from details and maps all four symbols',el('[data-inspector]').textContent.includes('情報ボタン')&&el('.cj-help-symbols').children.length===4);
 const place=dom.window.CrossweaveUI.placeWindow;
 for(const width of [1024,736,600,320]){
  const height=width*9/16,anchor={x:10,y:height-60,w:110,h:48};
  const rect=place({width,height,anchor,preferredWidth:320,preferredHeight:240,minWidth:144,minHeight:64});
  check('window geometry stays within '+width+' and avoids the source when space exists',rect.left>=0&&rect.top>=0&&rect.left+rect.width<=width&&rect.top+rect.height<=height&&rect.source_overlap===0);
  for(const o of observers)if(o.targets.includes(root))o.fn([{target:root,contentRect:{width}}]);
  check('resize retains the 16:9 request and draft at '+width,el('.cj-shell').style.height===height+'px'&&JSON.stringify(session.state().draft)===draft);
 }
 const p=place({width:600,height:337,anchor:{x:-400,y:800,w:60,h:40},avoid:[{x:580,y:0,w:1000,h:44}]});
 check('stale/offscreen source rectangles cannot place a window out of frame',p.left>=0&&p.top>=0&&p.left+p.width<=600&&p.top+p.height<=337);
 app.dispose();
 const C=root.__test.Campaign,document=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/entry.save.json.gz'))));
 const controller=await C.importSave({slot_id:'interaction-entry',document,request_id:'interaction-entry-import'});
 app=dom.window.CrossweaveUI.mountJourney(root,{controller,Campaign:C,slot_id:'interaction-entry',title:'夜潮の排水路'});session=app.session;await idle();
 for(let i=0;i<4&&session.state().view.display_data.scene?.paused;i++)await click('[data-j="continue"]');
 assert.equal(root.dataset.screen,'explore');await idle();
 check('exploration has one menu band, with common records/menu still reachable',el('[data-header]').hidden&&el('[data-x="records"]')&&el('[data-x="menu"]'));
 const data=session.state().view.display_data,choices=data.exploration.legal_actions.map(x=>x.choice??x);
 const legal=choices.find(x=>x.target!==null);assert(legal,'expected public target choice');
 const selectionRevision=session.state().view.meta.revision;
 await click('[data-x-card="'+legal.card_id+'"]');
 await click('[data-x-actor="'+legal.target+'"]');
 check('target selection does not open a detail or consume an action',el('#cw-drawer').hidden&&el('[data-x-actor="'+legal.target+'"]').getAttribute('aria-pressed')==='true'&&session.state().view.meta.revision===selectionRevision);
 const targetBefore=el('[data-x-actor][aria-pressed="true"]').dataset.xActor;
 const info=Array.from(root.querySelectorAll('[data-x-actor-detail]')).find(e=>e.dataset.xActorDetail!==targetBefore)||el('[data-x-actor-detail]');
 await click(info);
 check('actor details are explicit and do not retarget the action',!el('#cw-drawer').hidden&&el('[data-x-actor][aria-pressed="true"]').dataset.xActor===targetBefore);
 await click('[data-x="close"]');
 const publicHand=Array.isArray(data.exploration.hand)?data.exploration.hand:Object.values(data.exploration.hand);
 const guard=publicHand.find(x=>data.details[x.id]?.primary?.kind==='guard');assert(guard);
 const guardNode=el('[data-x-card="'+guard.id+'"]'),guardInfo=data.details[guard.id].primary;
 check('guard card uses guard/evasion symbols and exact public values',guardNode.querySelector('[data-stat="guard"] b').textContent===String(guardInfo.power)&&guardNode.querySelector('[data-stat="evasion"] b').textContent===String(guardInfo.evasion)&&!guardNode.querySelector('[data-stat="hit"]'));
 check('attack/field stats have icon names and accessible meaning',el('#cw-hand [data-stat="power"]').getAttribute('aria-label').includes('突破')&&el('#cw-field [data-stat="hit"]').querySelector('[data-lucide="scan-search"]'));
 await click('[data-x="records"]');
 check('records opened from the exploration footer remain open after event bubbling',app.state().panel==='records'&&!el('[data-inspector]').hidden);
 await click('[data-j="close"]');await click('[data-x="menu"]');
 check('common menu remains reachable in exploration',app.state().panel==='menu');await click('[data-j="close"]');
 const game=el('[data-main]'),rectangle=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
 for(const width of [1024,736,600,320]){
  const height=width*9/16;
  game.getBoundingClientRect=()=>rectangle(0,0,width,height);
  el('#cw-hand').getBoundingClientRect=()=>rectangle(4,height-110,width-8,60);
  el('#cw-actors').getBoundingClientRect=()=>rectangle(4,4,width/2-8,60);
  el('.cw-bottom').getBoundingClientRect=()=>rectangle(4,height-44,width-8,40);
  for(const o of observers)if(o.targets.includes(game))o.fn([{target:game,contentRect:{width,height}}]);
  check('available game height selects compact layout at '+width,game.dataset.compact===String(height<360)&&game.dataset.dense===String(height<240));
 }
 await click('[data-x-card="'+guard.id+'"]');
 check('first selection in a very low frame leaves the play controls uncovered',el('#cw-drawer').hidden);
 await click('[data-x-card="'+guard.id+'"]');
 check('repeated card selection still opens details in the compact layout',!el('#cw-drawer').hidden);
 await click('[data-x-card="'+legal.card_id+'"]');await click('[data-x-actor="'+legal.target+'"]');const playRevision=session.state().view.meta.revision;await click('[data-x="use"]');
 check('target selection and icon display still execute the actual legal action',!session.state().error&&session.state().view.meta.revision>playRevision&&session.state().view.display_data.exploration.self.actions>data.exploration.self.actions);
 check('no script errors',errors.length===0);app.dispose();dom.window.close();
 const report={id:'CW-M1-UI-001',group:'interaction-review-v0.3',result:'pass',count:checks.length,checks,errors,node:process.version,conditions:['Real Campaign and original MemoryStore, natural return and entry saves.','JSDOM with explicit visibility/resize callbacks and synthetic rectangles; no painting.'],limits:['No actual browser layout, touch, physical scrolling, IndexedDB or user acceptance verification.','Prior test groups remain historical; this run targets the reported regressions.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length,record_entries:examined}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
