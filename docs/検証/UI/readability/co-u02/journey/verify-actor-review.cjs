'use strict';
// Focused v0.7 checks: public forecasts, target lifetime and revised controls.
// JSDOM does not paint. Geometry and visibility inputs below are explicit.
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
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await pause();await until(()=>!session.state().pending);await pause();};
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const click=async s=>{const b=typeof s==='string'?el(s):s;assert(!b.disabled,'disabled '+s);b.click();await idle();};
 const rect=(w,h)=>({left:0,top:0,width:w,height:h,right:w,bottom:h});root.getBoundingClientRect=()=>rect(width,width*9/16);
 async function resize(w){width=w;el('.cj-shell').getBoundingClientRect=()=>rect(width,width*9/16);const game=root.querySelector('.cw-explore');if(game)game.getBoundingClientRect=()=>rect(width,width*9/16);for(const o of sizes)for(const t of o.targets)if(t===root||t===game)o.fn([{target:t,contentRect:{width,height:width*9/16}}]);await idle();}
 async function show(ids){for(const o of visibility){const entries=o.targets.filter(t=>ids.includes(t.dataset.jText)).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(entries.length)o.fn(entries);}await idle();}
 await idle();await resize(1024);
 check('result metrics are static and share exactly one explicit detail button',el('.cj-result-summary').querySelectorAll('button').length===1&&el('.cj-result-summary button').dataset.j==='receipt'&&!el('.cj-result-values').querySelector('button,a'));
 check('the result lightbulb accompanies the written term',el('.cj-result-money').textContent.includes('着想')&&!!el('.cj-result-money [data-lucide="lightbulb"]'));
 await click('[data-j="receipt"]');check('result details open as a separate bounded window',!!el('[data-inspect-key="receipt"]'));
 await click('[data-j="close"]');const readIds=d().scene.text_ids;await show(readIds);
 check('prose presentation still records only observed eligible text',app.state().seen.length===readIds.length);
 await click('[data-bottom] [data-j="hub"]');
 check('destination title and objective are static, with an explicit detail button',!el('.cj-destination-summary h2').closest('button')&&el('.cj-destination-summary').querySelectorAll('button').length===1);
 await click('[data-j="destination"]');check('destination detail remains connected',!el('[data-inspector]').hidden);await click('[data-j="close"]');
 check('the build overview names its inspection purpose',el('[data-bottom] [data-j="review"]').textContent==='構成を見る'&&el('[data-bottom] [data-j="review"]').getAttribute('aria-label').includes('札組・心得'));
 await click('[data-bottom] [data-j="skills"]');const skill=d().home.learning_options[0].base;await click('[data-j="equip"][data-id="base:'+skill+'"]');
 const draft=JSON.stringify(session.state().draft);
 for(const w of [1024,736,600,320]){
  await resize(w);let paging=true;const next=root.querySelector('[data-header] [data-j="page"][data-step="1"]');if(next&&!next.disabled){const before=el('.cj-pager>span').textContent;await click(next);paging=el('.cj-pager>span').textContent!==before;}
  check('lower-left return and header paging preserve draft at '+w,paging&&el('[data-bottom] [data-j="hub"]').textContent.includes('戻る')&&!root.querySelector('[data-header] [data-j="hub"]')&&JSON.stringify(session.state().draft)===draft&&el('.cj-shell').style.height===w*9/16+'px');
 }
 await click('[data-bottom] [data-j="hub"]');check('returning to hub does not discard the shared draft',JSON.stringify(session.state().draft)===draft);
 app.dispose();
 const Campaign=root.__test.Campaign,document=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/entry.save.json.gz'))));
 const controller=await Campaign.importSave({slot_id:'actor-review-entry',document,request_id:'actor-review-entry-import'});
 app=dom.window.CrossweaveUI.mountJourney(root,{controller,Campaign,slot_id:'actor-review-entry',title:'夜潮の排水路'});session=app.session;await idle();
 for(let i=0;i<5&&d().scene?.paused;i++){await show(d().scene.text_ids);await click('[data-j="continue"]');}await resize(320);
 const targetId=()=>root.querySelector('[data-x-actor][aria-pressed="true"]')?.dataset.xActor;
 check('an active target is visible before selecting a card',!!targetId()&&!!el('[data-x-actor][aria-pressed="true"] .cw-target-mark'));
 function exactVitals(){return Object.values(d().exploration.actors).filter(a=>a.active).every(a=>{const node=a.id===d().exploration.self.id?el('#cw-self'):el('[data-x-actor="'+a.id+'"]');return node.querySelector('[data-stat="posture"] b').textContent===a.posture_remaining+'/'+a.max_posture&&node.querySelector('progress[aria-label="隠蔽"]').value===a.posture_remaining&&node.querySelectorAll('progress').length===2&&!node.querySelector('[data-stat="hit"]');});}
 check('each actor shows exact concealment remaining and two bars, with no accumulated-hit label',exactVitals());
 check('compact actor stats put reduction before disruption and call accumulated crit 機転',Array.from(el('#cw-self .cw-actor-stats').children).map(e=>e.dataset.stat).join()==='guard,crit,reduction,evasion'&&el('#cw-self [data-stat="crit"]').getAttribute('aria-label').startsWith('機転'));
 check('the footer has two menu entries and no 本文 entry',el('.cw-menu').children.length===2&&!root.querySelector('[data-x="scene"]'));
 await click('[data-x="more"]');await click('[data-x="order"]');
 check('reservation list has only subject names and signed offsets',!!el('.cw-reservations')&&!root.querySelector('.cw-order-table')&&!el('.cw-drawer-body').textContent.includes('現在の予約'));
 await click('[data-x="close"]');
 const legal=()=>d().exploration.legal_actions.map(a=>a.choice??a),attack=legal().find(q=>q.target!==null);assert(attack,'entry must contain a matched attack');
 let calls=0;const originalPreview=controller.previewAction.bind(controller);controller.previewAction=async args=>{calls++;return originalPreview(args);};
 const revision=session.state().view.meta.revision;
 await click('[data-x-card="'+attack.card_id+'"]');await click('[data-x-actor="'+attack.target+'"]');
 const activeChoice=legal().find(q=>q.card_id===attack.card_id&&q.target===targetId()),expected=(await originalPreview({view_token:session.state().view.meta.view_token,choice:activeChoice})).display_data.action_preview;
 check('selection automatically requests a real forecast without opening its window',calls>0&&el('#cw-drawer').hidden&&!!root.querySelector('.cw-delta')&&session.state().view.meta.revision===revision);
 check('inline HP and concealment deltas match the public preview response',el('[data-x-actor="'+activeChoice.target+'"] [data-stat="hp"] .cw-delta').dataset.delta===String(-expected.actual_hp_loss)&&el('[data-x-actor="'+activeChoice.target+'"] [data-stat="posture"] .cw-delta').dataset.delta===String(expected.posture_after-expected.posture_before));
 check('unprovided actor forecasts are left absent',!root.querySelector('[data-stat="crit"] .cw-delta,[data-stat="reduction"] .cw-delta,[data-stat="evasion"] .cw-delta'));
 const beforeManual=calls;await click('[data-x="preview"]');await click('[data-x="preview"]');
 check('prediction details toggle twice without a duplicate request or hiding inline values',el('#cw-drawer').hidden&&calls===beforeManual&&!!root.querySelector('.cw-delta'));
 await click('[data-x-card="'+attack.card_id+'"]');
 check('card detail pairs icons with terms and keeps actual field contribution',!!el('.cw-card-primary dt [data-lucide]')&&!!root.querySelector('[data-field-contribution]')&&el('.cw-drawer-body').textContent.includes('次の行動まで')&&!el('.cw-drawer-body').textContent.includes('設置間隔'));
 await click('[data-x="close"]');
 const place=legal().find(q=>q.target===null&&!Object.values(d().exploration.field).some(f=>f.attr===Object.values(d().exploration.hand).find(h=>h.id===q.card_id)?.attr));assert(place,'entry must contain an unmatched card');
 await click('[data-x-card="'+place.card_id+'"]');
 const handCard=Object.values(d().exploration.hand).find(h=>h.id===place.card_id),detail=d().details[place.card_id],ghost=el('[data-forecast="place"]');
 check('placing a card previews its actual public field values without changing the field',ghost.textContent.includes(detail.name)&&ghost.querySelector('[data-stat="power"] b, [data-stat="guard"] b').textContent===String(detail.field.power)&&!Object.values(d().exploration.field).some(f=>f.attr===handCard.attr)&&session.state().view.meta.revision===revision);
 await click('[data-x-card="'+place.card_id+'"]');check('an unmatched hand card has no fabricated field correction',!root.querySelector('[data-field-contribution]'));await click('[data-x="close"]');
 const guard=Object.values(d().exploration.hand).find(h=>h.kind==='guard');assert(guard);
 await click('[data-x-card="'+guard.id+'"]');await click('[data-x-card="'+guard.id+'"]');
 check('guard primary detail switches both paired terms',el('.cw-card-primary').textContent.includes('身構')&&el('.cw-card-primary').textContent.includes('攪乱')&&!el('.cw-card-primary').textContent.includes('探査')&&!el('.cw-card-primary').textContent.includes('突破'));
 await click('[data-x="close"]');
 const releases=[];controller.previewAction=async args=>{const result=await originalPreview(args);await new Promise(resolve=>releases.push({resolve,args,result}));return result;};
 el('[data-x-card="'+attack.card_id+'"]').click();await until(()=>releases.length===1);
 const other=legal().find(q=>q.card_id===attack.card_id&&q.target&&q.target!==targetId());assert(other);
 el('[data-x-actor="'+other.target+'"]').click();await until(()=>releases.length===2);
 check('target changes during a pending read and immediately clears old deltas',targetId()===other.target&&!root.querySelector('.cw-delta'));
 el('[data-x="preview"]').click();el('[data-x="preview"]').click();
 releases[1].resolve();await idle();const newDelta=el('[data-x-actor="'+other.target+'"] [data-stat="posture"] .cw-delta').dataset.delta;releases[0].resolve();await idle();
 check('a late old-target response cannot overwrite the selected forecast or reopen its closed window',el('#cw-drawer').hidden&&targetId()===other.target&&el('[data-x-actor="'+other.target+'"] [data-stat="posture"] .cw-delta').dataset.delta===newDelta&&!el('[data-x-actor="'+activeChoice.target+'"] [data-stat="hp"]').querySelector('.cw-delta'));
 controller.previewAction=originalPreview;
 for(const w of [1024,736,600,320]){await resize(w);check('actor state, target and forecast remain available through resize '+w,exactVitals()&&targetId()===other.target&&!!root.querySelector('.cw-delta')&&el('.cj-shell').style.height===w*9/16+'px');}
 await click('[data-x="use"]');check('real play refreshes actor state and removes the previous forecast',!session.state().error&&session.state().view.meta.revision>revision&&!root.querySelector('.cw-delta')&&exactVitals()&&!!targetId());
 // A retired-target view fixture isolates selection lifetime without modifying
 // Campaign internals or inventing a combat transition in the runtime.
 const publicState=structuredClone(session.state()),retired=targetId();
 const remaining=Object.values(publicState.view.display_data.exploration.actors).find(a=>a.active&&a.id!==retired&&a.id!==publicState.view.display_data.exploration.self.id);assert(remaining);
 app.dispose();const displayRoot=dom.window.document.createElement('section');root.append(displayRoot);
 let displayState=publicState;const displaySession={state:()=>displayState,can:()=>false};
 const child=dom.window.CrossweaveUI.mountExploration(displayRoot,{session:displaySession,display_data:displayState.view.display_data});
 displayRoot.querySelector('[data-x-actor="'+retired+'"]').click();displayState=structuredClone(publicState);displayState.view.meta.view_token+='-retired-fixture';displayState.view.display_data.exploration.actors[retired].active=false;
 child.update(displayState.view.display_data,displayState);
 check('retiring the selected target chooses another active subject instead of leaving none',displayRoot.querySelector('[data-x-actor][aria-pressed="true"]')?.dataset.xActor===remaining.id);child.dispose();
 const projection=dom.window.CrossweaveUI.projectActionForecast,publicData=publicState.view.display_data,cardId=Object.values(publicData.exploration.hand)[0].id,self=publicData.exploration.self;
 check('heal and guard projection use only their public preview values',projection(publicData,{card_id:cardId,target:null},{supported:true,mode:'heal',hp_restored:2}).actors[self.id].hp.delta===2&&projection(publicData,{card_id:cardId,target:null},{supported:true,mode:'guard',guard:{value:17}}).actors[self.id].guard.after===17);
 check('unsupported forecasts produce no guessed projection',projection(publicData,{card_id:cardId},{supported:false})===null);
 const css=fs.readFileSync(path.join(__dirname,'actor-review.css'),'utf8'),exploreCSS=fs.readFileSync(path.join(__dirname,'../exploration.css'),'utf8');
 check('prose contract uses natural wrapping, a shared measure and narrow-width stacking',css.includes('line-break:strict')&&css.includes('word-break:normal')&&css.includes('text-wrap:pretty')&&css.includes('--cj-prose-measure')&&css.includes('grid-template-rows:auto minmax(0,1fr)'));
 check('action buttons use content width and the compact footer has a bounded row',exploreCSS.includes('#cw-action-anchor{width:max-content')&&exploreCSS.includes('grid-template-rows:64px minmax(0,1fr) 44px'));
 check('no script errors',errors.length===0);dom.window.close();
 const report={id:'CW-M1-UI-001',group:'actor-review-v0.7',result:'pass',count:checks.length,checks,errors,node:process.version,conditions:['Real Campaign + original MemoryStore; natural return and entry saves.','Real previewAction responses, including reversed completion order for two target requests.','Controlled IntersectionObserver and 1024/736/600/320px rectangles; JSDOM, no paint.','One public-view-only retired-target fixture; heal/guard projection fixtures do not simulate runtime execution.'],limits:['No physical clipping, Japanese line layout, touch or host-render verification.','Complete post-action crit/reduction/evasion prediction is not provided by the current API.','IndexedDB, formal v0.15 full migration and user acceptance remain unverified.','Historical groups were not rerun or recounted.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
