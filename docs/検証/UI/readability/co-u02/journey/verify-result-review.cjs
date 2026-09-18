'use strict';
// Scope: fixed-frame sizing requests, result routing, structured skill/knowledge views.
// Resize and visibility callbacks are simulated; this is not rendered-browser evidence.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const wait=()=>new Promise(r=>setTimeout(r,5));
async function until(f){const stop=Date.now()+8000;while(!f()){if(Date.now()>stop)throw Error('timeout');await wait();}}
(async()=>{
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const resizeObservers=[];
 const dom=new JSDOM(build({testing:true}).html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-review.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];resizeObservers.push(this);}observe(el){this.targets.push(el);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.live=true;}observe(target){queueMicrotask(()=>{if(this.live)this.fn([{target,isIntersecting:true,intersectionRatio:1}]);});}disconnect(){this.live=false;}};
 }});
 const root=dom.window.document.getElementById('crossweave-journey');await until(()=>root.__test);
 let app=root.__test.app,session=app.session;const C=root.__test.Campaign;
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await wait();await until(()=>!session.state().pending);};
 const el=selector=>{const e=root.querySelector(selector);assert(e,'missing '+selector);return e;};
 const click=async selector=>{const e=el(selector);assert(!e.disabled,'disabled '+selector);e.click();await idle();};
 const resize=width=>{for(const observer of resizeObservers)if(observer.targets.includes(root))observer.fn([{target:root,contentRect:{width}}]);};
 await idle();
 check('clear result prioritizes home and demotes revisit',el('.cj-result-actions>.cj-primary').dataset.j==='hub'&&el('.cj-result-actions>.cj-primary').textContent.includes('拠点へ')&&!el('.cj-result-actions [data-j="depart"]').classList.contains('cj-primary'));
 check('result actions are outside the scrolling result body',!el('.cj-result-actions').closest('[data-result-scroll]'));
 el('[data-result-scroll]').scrollTop=120;
 await click('[data-j="records"]');
 check('opening a window retains the result scroll position',el('[data-result-scroll]').scrollTop===120);
 check('records explain their role and separate targets from cards',el('[data-inspector]').textContent.includes('探索で判明した構成と札')&&el('[data-j="record-tab"][data-tab="targets"]')&&el('[data-j="record-tab"][data-tab="cards"]'));
 const data=session.state().view.display_data,known=data.knowledge_views.find(x=>x.initial_catalogue),unknown=data.knowledge_views.find(x=>!x.initial_catalogue);
 await click('[data-j="record-target"][data-id="'+known.target_id+'"]');
 check('known target shows actual initial card counts and a separate observation section',el('[data-inspector]').textContent.includes('初期枚数')&&el('[data-inspector]').textContent.includes(known.initial_catalogue.cards[0].card.name)&&el('[data-inspector]').textContent.includes('観測した札'));
 check('private composition, evidence ids and next-card predictions are not exposed',!el('[data-inspector]').textContent.includes(known.initial_catalogue.evidence)&&!el('[data-inspector]').textContent.includes('CW-M1-run')&&el('[data-inspector]').textContent.includes('現在の手札・次に出す札は未公開'));
 await click('[data-j="record-target"][data-id="'+unknown.target_id+'"]');
 check('observations do not fabricate an unknown initial catalogue',el('[data-inspector]').textContent.includes('まだ判明していない')&&!el('[data-inspector]').textContent.includes('初期枚数'));
 await click('[data-j="record-tab"][data-tab="cards"]');
 check('card records are labelled as known performance, not inventory',el('[data-inspector]').textContent.includes('判明した札の性能')&&!el('[data-inspector]').textContent.includes('所持数'));
 await click('[data-inspector] [data-j="detail"]');await click('[data-j="records-back"]');
 check('card detail returns directly to the same records category',app.state().panel==='records'&&app.state().recordTab==='cards');
 await click('[data-j="close"]');await click('[data-j="skills"]');
 check('capacity use and per-skill cost have different labels',root.textContent.includes('使用枠')&&el('.cj-slot-cost').textContent.includes('枠消費'));
 await click('[data-j="detail"][data-id="base:PS01"]');
 check('skill details have separate condition and effect fields',Array.from(el('.cj-inspect-scroll').querySelectorAll('.cj-skill-structure dt')).map(e=>e.textContent).join('|')==='発動条件|効果');
 check('skill details keep the exact public condition/effect, without inferred rules',el('.cj-inspect-scroll').textContent.includes(session.state().view.display_data.details['base:PS01'].trigger_text)&&el('.cj-inspect-scroll').textContent.includes(session.state().view.display_data.details['base:PS01'].effect_text));
 await click('[data-inspector] [data-j="equip"]');
 const draft=JSON.stringify(session.state().draft);
 check('learning and equipment actions remain outside the scrolling detail body',!el('[data-inspector] [data-j="equip"]').closest('.cj-inspect-scroll'));
 for(const width of [1024,736,600,320]){
  resize(width);const expected=String(width*9/16)+'px',before=el('.cj-shell').style.height;
  await click('[data-j="close-item"]');await click('[data-j="detail"][data-id="base:PS01"]');
  check('open/close uses the same16:9 height request at '+width+' (no painting)',before===expected&&el('.cj-shell').style.height===before);
  check('resize preserves the open detail and shared draft at '+width,app.state().windows.some(x=>x.id==='base:PS01')&&JSON.stringify(session.state().draft)===draft);
 }
 const beforePin=el('.cj-shell').style.height;
 await click('[data-j="pin"]');await click('[data-j="detail"][data-id="base:PS02"]');
 check('multiple pinned/detail windows do not increase the frame height request',app.state().windows.length===2&&el('.cj-shell').style.height===beforePin);
 await click('[data-j="review"]');
 check('comparison keeps confirm actions outside the scroll body',!el('[data-inspector] [data-j="commit"]').closest('.cj-inspect-scroll'));
 await click('[data-inspector] [data-j="commit"]');
 check('structured detail changes can still commit through the real API',session.state().view.display_data.home.economy.unspent_units===100&&session.state().view.display_data.home.equipment.entries.length===1);
 app.dispose();
 const document=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/port.save.json.gz'))));
 const controller=await C.importSave({slot_id:'unresolved-result-review',document,request_id:'unresolved-result-review-import'});
 const view=controller.inspect();const returned=await controller.execute({request_id:'unresolved-result-review-withdraw',expected_revision:view.meta.revision,view_token:view.meta.view_token,type:'withdraw',payload:{}});
 assert(!returned.display_data.error,JSON.stringify(returned.display_data.error));
 app=dom.window.CrossweaveUI.mountJourney(root,{controller,Campaign:C,slot_id:'unresolved-result-review',title:'夜潮の排水路'});session=app.session;await idle();
 check('unresolved withdrawal prioritizes retry and keeps home available',session.state().view.display_data.case.status==='unresolved'&&el('.cj-result-actions>.cj-primary').dataset.j==='depart'&&el('.cj-result-actions>.cj-primary').textContent.includes('再挑戦')&&el('.cj-result-actions [data-j="hub"]'));
 await click('.cj-result-actions>.cj-primary');
 check('retry reaches a real new attempt without requiring a hub detour',session.state().view.display_data.phase==='exploring'&&session.state().view.display_data.case.attempts===2);
 const css=fs.readFileSync(path.join(__dirname,'viewport.css'),'utf8');
 check('frame/overlay/scroll layout rules exist without scale transforms',css.includes('aspect-ratio:16/9')&&css.includes('[data-inspector]{position:absolute')&&css.includes('.cj-inspect-scroll{min-height:0;overflow:auto')&&!/transform:\s*scale/.test(css));
 check('no script errors',errors.length===0);app.dispose();dom.window.close();
 const report={id:'CW-M1-UI-001',group:'result-review-v0.2',node:process.version,result:'pass',count:checks.length,checks,errors,conditions:['Real Campaign and original MemoryStore; natural clear-return and port saves.','JSDOM with explicit resize/visibility callbacks; heights are requested CSS pixel values, not painted rectangles.'],limits:['No rendered-browser aspect/overflow or physical scroll/reachability verification.','No IndexedDB, touch or user acceptance.','The prior32 journey checks are historical and were not rerun merely for handoff.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:report.count}));
})().catch(error=>{console.error(error);console.error(errors);process.exitCode=1;});
