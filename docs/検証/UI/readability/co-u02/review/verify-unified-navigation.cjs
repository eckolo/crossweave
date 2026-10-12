// Focused shared-navigation and accepted-acquisition integration checks.
// Injected geometry and synthetic input are not real rendering or device tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const checks=[],errors=[],instances=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(5);}throw Error('timeout');}
function check(name,fn){fn();checks.push({name,passed:true});}
async function mount(unified){
 const {html}=build({testing:true,fhd:true,art:true,unified});
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
 instances.push(dom);
 for(const key of ['structuredClone','TextEncoder','TextDecoder','Blob','Response','DecompressionStream'])w[key]=globalThis[key];
 Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
 let requests=0;
 w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{requests++;throw Error('network forbidden');};
 w.indexedDB={open(){throw Error('persistent save forbidden');}};
 w.ResizeObserver=class{observe(){}disconnect(){}};
 const intersections=[];w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.nodes=[];intersections.push(this);}observe(n){this.nodes.push(n);}disconnect(){this.nodes=[];}};
 w.matchMedia=()=>({matches:false});
 const root=w.document.getElementById('crossweave-journey'),host=w.document.getElementById('cw-exploration-fhd');
 function rect(el){
  if(el.classList.contains('cw-display-viewport'))return [0,0,1024,576];
  if(el===root||el.classList.contains('cj-shell')||el.classList.contains('cp-shell'))return [0,0,1920,1080];
  const zx={offer:17,reserve:413,build:1168},zw={offer:376,reserve:735,build:735},zone=el.closest('section[data-zone]')?.dataset.zone;
  if(el.hasAttribute('data-board-scroll'))return [17,81,1846,918];
  if(el.matches('section[data-zone]'))return [zx[zone],81,zw[zone],918];
  if(el.hasAttribute('data-scroll-zone'))return [zx[zone],121,zw[zone],878];
  if(el.classList.contains('cp-drag-ghost'))return [parseFloat(el.style.left)||0,parseFloat(el.style.top)||0,352,80];
  const piece=el.closest('.cp-piece');if(piece){const row=piece.parentElement,idx=[...row.children].indexOf(piece),cols=zone==='offer'?1:2;return [zx[zone]+2+idx%cols*360,123+Math.floor(idx/cols)*88,352,80];}
  if(el.hasAttribute('data-main'))return [1,65,1918,950];
  return [80,120,520,152];
 }
 w.HTMLElement.prototype.getBoundingClientRect=function(){const a=rect(this),s=this.classList.contains('cw-display-viewport')?1:Number(root.dataset.displayScale)||1;const [x,y,width,height]=a.map(v=>v*s);return {x,y,left:x,top:y,right:x+width,bottom:y+height,width,height};};
 for(const [prop,index] of [['clientWidth',2],['clientHeight',3]])Object.defineProperty(w.HTMLElement.prototype,prop,{configurable:true,get(){return rect(this)[index];}});
 Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){return this.clientWidth;}});
 w.HTMLElement.prototype.setPointerCapture=function(id){this.__capture=id;};w.HTMLElement.prototype.hasPointerCapture=function(id){return this.__capture===id;};w.HTMLElement.prototype.releasePointerCapture=function(){delete this.__capture;};
 w.document.elementFromPoint=(x,y)=>[...root.querySelectorAll('section[data-zone]')].find(el=>{const b=el.getBoundingClientRect();return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;})||root;
 const s=w.document.createElement('script');s.textContent=script;w.document.body.append(s);
 await until(()=>host.__test);const review=host.__test.review;assert(await review.ready);
 const q=selector=>root.querySelector(selector);
 async function settled(){await wait(5);await until(()=>!review.app.session.state().pending);await wait(5);}
 async function click(selector){const b=q(selector);assert(b,selector);assert(!b.disabled,selector);b.click();await settled();}
 await settled();
 async function displayTexts(){for(const o of intersections.slice())if(o.nodes.length)o.fn(o.nodes.filter(n=>n.isConnected).map(target=>({target,isIntersecting:true,intersectionRatio:1})));await settled();}
 return {dom,w,root,host,review,q,click,settled,displayTexts,requests:()=>requests};
}
(async()=>{let sample,plain;try{
 sample=await mount(true);
 const {root,review,q,click,settled,displayTexts,w}=sample;
 const visible=el=>!el.closest('[hidden]');
 function common(){const controls=[...root.querySelectorAll('[data-common-control]')].filter(visible);assert.equal(controls.length,2);assert.deepEqual(controls.map(b=>b.dataset.commonControl),['records','menu']);assert(controls.every(b=>b.closest('.cw-common-nav')));assert(!controls.some(b=>b.closest('.cw-bottom,.cj-fixed-footer,.cp-footer')));}
 check('帰還結果は送るだけ、共通の記録・メニューは上部に一組だけ表示する',()=>{assert.equal(root.dataset.screen,'return');common();assert.equal(q('[data-j="hub"]').textContent,'進む');assert(!q('[data-j="collection"]'));});
 await displayTexts();await click('[data-j="hub"]');
 check('帰還結果の直後に探索先から一つの編成入口へ進める',()=>{assert.equal(root.dataset.screen,'hub');assert(q('.cj-header [data-j="collection"]'));for(const a of ['deck','skills','offers','owned','review'])assert(!q('[data-j="'+a+'"]'));common();});
 const session=review.app.session,before=JSON.stringify(session.state().view),commands=[],execute=session.execute.bind(session);session.execute=async(...args)=>{commands.push(args);return execute(...args);};
 await click('[data-j="collection"]');const instance=review.app.collection,cp=()=>q('#cw-acquisition-review');
 const snap=()=>instance.snapshot(),readonly=()=>{assert.equal(JSON.stringify(session.state().view),before);assert.equal(commands.length,0);};
 const cpClick=async(action,extra='')=>{await click('#cw-acquisition-review [data-action="'+action+'"]'+extra);};
 check('了承済みの同じ取得UIを埋込み、札／心得と三つの置き場を使う',()=>{
  assert.equal(root.dataset.screen,'collection');assert.equal(cp().dataset.embedded,'true');assert.deepEqual([...cp().querySelectorAll('[data-action="tab"]')].map(x=>x.textContent),['札','心得']);assert.deepEqual([...cp().querySelectorAll('.cp-lane-title>span')].map(x=>x.textContent),['取得可能','所持','編成']);assert.equal(cp().querySelectorAll('.cp-main').length,1);common();readonly();
 });
 await cpClick('tab','[data-id="passive"]');
 const offer=q('#cw-acquisition-review [data-action="stage"]'),offerId=offer.dataset.id;await cpClick('stage','[data-id="'+offerId+'"]');
 const pending=q('#cw-acquisition-review .cp-reserve[data-pending="true"]');assert(pending);const uid=pending.dataset.unit,key=pending.dataset.key;
 await cpClick('add','[data-uid="'+uid+'"]');await cpClick('remove','[data-uid="'+uid+'"]');
 check('同じ画面内で取得前の編成・取り外しができ、共通Campaignには書き込まない',()=>{assert(snap().draft.offers.includes(offerId));assert(!snap().draft.equipment.includes(uid));readonly();});
 await cpClick('detail','[data-uid="'+uid+'"]');assert(q('.cp-dialog-head [data-action="close"]'));await cpClick('close');
 await cpClick('back');assert.equal(root.dataset.screen,'hub');assert(q('[data-j="depart"]').disabled);
 const disabled=q('[data-j="depart"]');disabled.disabled=false;disabled.click();await settled();readonly();
 await click('[data-j="collection"]');
 check('同じ画面インスタンスで未確定変更・分類を保持し、変更後の誤出発を防ぐ',()=>{assert.equal(review.app.collection,instance);assert.equal(snap().view.tab,'passive');assert(snap().draft.offers.includes(offerId));assert.match(sample.host.querySelector('[data-review-note]').textContent,/出発は停止/);readonly();});
 await click('#cw-acquisition-review [data-common-control="menu"]');
 const menuLabels=[...q('[data-inspector]').querySelectorAll('.cj-menu-grid [data-j]')].map(b=>b.textContent);
 check('編成内の共通メニューから旧購入・所持・構成画面を再露出しない',()=>{assert(!menuLabels.includes('購入'));assert(!menuLabels.includes('所持'));assert(!q('[data-inspector]').textContent.includes('構成を見る'));assert.deepEqual(menuLabels.slice(0,5),['調査記録','表示','遊び方','保存データ','文章の記録']);common();});
 await click('[data-inspector] [data-j="close"]');await cpClick('discard');readonly();
 await cpClick('back');assert(!q('[data-j="depart"]').disabled);await click('[data-j="collection"]');
 check('未確定の変更を戻すと出発制限を解除し、画面を作り直さない',()=>{assert.equal(review.app.collection,instance);assert(!instance.modified());readonly();});
 // A scaled hold/drop still uses the accepted screen's implementation.
 const from=q('#cw-acquisition-review [data-zone-item="offer"] [data-action="detail"]'),r=from.getBoundingClientRect(),to=q('#cw-acquisition-review [data-scroll-zone="reserve"]').getBoundingClientRect();
 function pointer(type,target,x,y){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'},isPrimary:{value:true}});target.dispatchEvent(e);}
 pointer('pointerdown',from,r.left+20,r.top+20);await wait(245);assert(q('.cp-drag-ghost'));pointer('pointermove',cp(),to.left+60,to.top+60);pointer('pointerup',cp(),to.left+60,to.top+60);await settled();
 check('埋込み後も縮小座標のホールド・ドラッグで取得できる',()=>{assert.equal(snap().draft.offers.length,1);assert(!q('.cp-drag-ghost'));readonly();});
 await cpClick('review');assert(!q('.cp-dialog-actions [data-action="close"]'));assert(q('.cp-dialog-head [data-action="close"]'));await cpClick('commit');await cpClick('back');
 check('確認・確定を同じ編成内へ集め、仮確定後も本編に反映したふりをしない',()=>{assert(instance.modified());assert(q('[data-j="depart"]').disabled);readonly();});
 for(const id of ['hub-d03','entry-d03','explore-d03']){
  assert(await review.show(id));await settled();common();
  await click('[data-common-control="menu"]');const labels=[...q('[data-inspector]').querySelectorAll('.cj-menu-grid [data-j]')].map(b=>b.textContent);assert.deepEqual(labels.slice(0,5),menuLabels.slice(0,5));await click('[data-inspector] [data-j="close"]');
 }
 check('探索先・本文・探索で共通ボタンの並びとメニュー内の先頭5機能を揃える',common);
 await click('[data-common-control="menu"]');await click('[data-j="explore-order"]');
 check('探索固有の情報も共通メニューから開け、下部に別メニューを残さない',()=>{assert.equal(q('#cw-drawer-title').textContent,'行動予約');assert(!q('.cw-bottom [data-x="more"]'));assert(!q('.cw-bottom [data-common-control]'));});
 await click('[data-x="close"]');await click('[data-common-control="menu"]');await click('[data-j="suspend"]');
 check('中断画面でも共通位置を保ち、続きからで同じ探索へ戻る',()=>{assert.equal(root.dataset.screen,'start');common();assert(q('[data-j="resume"]'));});
 await click('[data-j="resume"]');assert.equal(root.dataset.screen,'explore');
 // Before any acquisition edits, the existing departure still executes normally.
 assert(await review.show('hub-d03'));await settled();await click('[data-j="collection"]');await cpClick('back');await click('[data-j="depart"]');
 check('変更していなければ既存の出発処理へ進める',()=>{assert.equal(review.app.session.state().view.display_data.phase,'exploring');});
 plain=await mount(false);await plain.settled();assert(await plain.review.show('hub-d03'));await plain.settled();
 check('旧接続検証入口は保持し、仮の取得UIを本編用のデータとして注入しない',()=>{assert(!plain.review.app.collection);assert(plain.q('[data-j="deck"]'));assert(!plain.q('[data-j="collection"]'));});
 const css=fs.readFileSync(path.join(__dirname,'../common-navigation.css'),'utf8');
 check('配置指定は一つの共通CSSに集約され、右24・上4・高さ56を使う',()=>{assert.match(css,/\.cw-common-nav\{position:absolute;right:24px;top:4px;/);assert.match(css,/height:56px/);assert.equal((css.match(/\.cw-common-nav\{position/g)||[]).length,1);});
 const standaloneHTML=(await require('../acquisition-preview/build.cjs').build({testing:true})).html;
 const consoleStandalone=new VirtualConsole();consoleStandalone.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const standalone=new JSDOM(standaloneHTML,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:consoleStandalone});instances.push(standalone);
 const standaloneRoot=standalone.window.document.getElementById('cw-acquisition-review');
 standaloneRoot.querySelector('[data-action="tab"][data-id="passive"]').click();
 check('同じ原本から作る独立した取得画面も引き続き操作できる',()=>{assert(standaloneRoot.__test);assert.equal(standaloneRoot.__test.snapshot().view.tab,'passive');assert.equal(standaloneRoot.querySelectorAll('.cp-lane').length,3);});
 standaloneRoot.__test.handle.dispose();
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'unified-navigation-manifest.json')));
 check('提示物のhash・無通信・実行例外を確認する',()=>{assert.equal(crypto.createHash('sha256').update(build({unified:true}).html).digest('hex'),manifest.sha256);assert.equal(sample.requests()+plain.requests(),0);assert.deepEqual(errors,[]);});
 fs.writeFileSync(path.join(__dirname,'unified-navigation-checks.json'),JSON.stringify({version:'0.15.0',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,reused_acquisition:'two-stage-ui-5.3 same source, mounted component',production_acquisition_connected:false,injected:['client寸法・矩形・hit test・pointer capture','ResizeObserver・IntersectionObserver','button.click()・MouseEventのpointer通知'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント・実際の重なり','実マウス・タッチ・実キーボード','IndexedDB・複数タブ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{sample?.review.dispose();plain?.review.dispose();for(const dom of instances)dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
