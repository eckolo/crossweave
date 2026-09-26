// Focused empty-offer presentation checks; reuse the established inline test harness.
// Injected geometry and synthetic input are not real rendering or device tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const checks=[],errors=[],instances=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(5);}throw Error('timeout');}
function check(name,fn){fn();checks.push({name,passed:true});}
async function mount(){
 const {html}=build({testing:true,acquisitionStates:true});
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
(async()=>{let sample;try{
 sample=await mount();
 const {review,q,root,host,settled,click,displayTexts}=sample;
 const snap=()=>review.app.collection.snapshot();
 const cpClick=async(action,extra='')=>click('#cw-acquisition-review [data-action="'+action+'"]'+extra);
 const json=x=>JSON.parse(JSON.stringify(x));
 const offers=()=>root.querySelectorAll('[data-zone="offer"] [data-zone-item="offer"]');
 const message=()=>q('[data-zone="offer"] [data-offer-state]');
 function completed(){
  assert.equal(offers().length,0);assert(!q('[data-zone="offer"] button'));
  assert.equal(q('[data-zone="offer"] .cp-lane-title span').textContent,'取得可能');
  assert.equal(q('[data-zone="offer"] .cp-lane-title strong').textContent,'0');
  assert.equal(message().dataset.offerState,'complete');assert.equal(message().textContent,'今回の取得は完了');
  assert.match(q('.cp-purchase-track').textContent,/取得済み 1 \/ 1/);
 }
 check('初期表示は実際の取得・確認・確定操作を通した取得後で、左欄を空にする',()=>{
  assert.equal(review.state().current,'acquisition-complete');assert.equal(root.dataset.screen,'collection');completed();
  assert.deepEqual(json(snap().current.purchased),['offer-tide']);assert.equal(snap().draft.offers.length,0);
 });
 const uid='acquired-offer-tide',wallet=snap().current.wallet;
 check('取得した札は所持へ一度だけ表示し、取得可能には取得済みの枠や無効ボタンを残さない',()=>{
  const card=q('[data-zone-item="reserve"][data-unit="'+uid+'"]');assert(card);assert.equal(card.dataset.pending,'false');
  assert.equal(root.querySelectorAll('[data-unit="'+uid+'"]').length,1);assert(!q('[data-zone="offer"] .cp-offer-empty'));
  assert(!q('.cp-clock'));assert(!q('[data-pending="true"]'));
 });
 await cpClick('tab','[data-id="passive"]');completed();await cpClick('tab','[data-id="card"]');
 check('1群1点の確定後は札・心得の両方で候補が終了する',completed);
 const first=q('[data-zone-item="build"]'),old=first.dataset.unit;
 await cpClick('remove','[data-uid="'+old+'"]');await cpClick('add','[data-uid="'+uid+'"]');
 await cpClick('review');await cpClick('commit');
 check('取得後も編成・取り外しを確定でき、再取得・追加課金・候補の復活は起こらない',()=>{
  assert(snap().current.deck.includes(uid));assert.equal(snap().current.wallet,wallet);assert.equal(snap().current.purchased.length,1);
  assert(q('[data-zone-item="build"][data-unit="'+uid+'"]'));completed();
 });
 const instance=review.app.collection;await cpClick('back');assert(q('[data-j="depart"]').disabled);await click('[data-j="collection"]');
 check('画面往復で取得後表示と編成を保持し、本編への未反映を隠さない',()=>{assert.equal(review.app.collection,instance);completed();assert.match(host.querySelector('[data-review-note]').textContent,/出発は停止/);});
 // Use the visible review picker, not only its test handle, to switch states.
 const picker=host.querySelector('[data-review-case]');picker.value='acquisition-empty';picker.dispatchEvent(new sample.w.Event('change'));
 await until(()=>review.state().current==='acquisition-empty'&&!review.state().pending);await settled();
 const emptyCurrent=json(snap().current),campaignBefore=JSON.stringify(review.app.session.state().view);
 check('候補なしを場面選択から開き、空の札欄と取得候補なしを表示する',()=>{
  assert.equal(offers().length,0);assert.equal(message().dataset.offerState,'empty');assert.equal(message().textContent,'取得できる札はありません');
  assert.equal(q('.cp-purchase-track').textContent,'取得候補なし');assert.equal(snap().current.purchased.length,0);
 });
 await cpClick('tab','[data-id="passive"]');
 check('候補なしの心得も同じ空状態で、取得完了とは区別する',()=>{assert.equal(message().textContent,'取得できる心得はありません');assert.equal(message().dataset.offerState,'empty');assert(!q('[data-action="stage"]'));});
 const equipped=q('[data-zone-item="build"]'),equippedUid=equipped.dataset.unit;
 await cpClick('remove','[data-uid="'+equippedUid+'"]');await cpClick('review');await cpClick('commit');
 await cpClick('add','[data-uid="'+equippedUid+'"]');await cpClick('review');await cpClick('commit');
 check('候補がなくても所持・編成・取り外し・確定が使え、着想と所持数は変わらない',()=>{
  const restored=json(snap().current);restored.equipment.sort();
  assert.deepEqual(restored,{...emptyCurrent,equipment:[...emptyCurrent.equipment].sort()});assert.equal(offers().length,0);
  assert.equal(JSON.stringify(review.app.session.state().view),campaignBefore);
 });
 assert(await review.show('acquisition-open'));await settled();
 const before=json(snap().current);
 check('取得前は従来の候補・費用・取得操作を同じ場所へ表示する',()=>{assert.equal(offers().length,2);assert(!message());assert(q('[data-action="stage"][data-id="offer-tide"]'));});
 await cpClick('stage','[data-id="offer-tide"]');
 check('支払前は移動元を残し、取得完了の空欄へ早まって切り替えない',()=>{assert.equal(snap().draft.offers.length,1);assert.deepEqual(json(snap().current),before);assert(q('.cp-offer-empty'));assert(!message());});
 await cpClick('detail','[data-uid="pending-offer-tide"]');await cpClick('unstage','[data-id="offer-tide"]');await cpClick('close');
 check('支払前の取消で元の候補と取得操作が戻る',()=>{assert.equal(offers().length,2);assert.equal(snap().draft.offers.length,0);assert.deepEqual(json(snap().current),before);});
 await cpClick('stage','[data-id="offer-tide"]');await cpClick('add','[data-uid="pending-offer-tide"]');await cpClick('review');
 check('編成超過で確定できない場合は候補を終了させない',()=>{assert(q('[data-action="commit"]').disabled);assert(!message());assert.deepEqual(json(snap().current),before);});
 await cpClick('close');await cpClick('discard');await cpClick('tab','[data-id="passive"]');
 const former=q('[data-zone-item="build"]'),formerUid=former.dataset.unit;
 await cpClick('remove','[data-uid="'+formerUid+'"]');await cpClick('review');await cpClick('commit');
 check('取得を含まない編成だけの確定では、取得可能な候補を消さない',()=>{assert.equal(offers().length,2);assert(!message());assert.equal(snap().current.purchased.length,0);assert.equal(snap().current.wallet,before.wallet);});
 await cpClick('stage','[data-id="offer-link"]');await cpClick('review');await cpClick('commit');
 check('操作で心得を取得した場合も同じ完了表示になり、取得した心得は所持へ残る',()=>{completed();assert(q('[data-unit="acquired-offer-link"]'));assert.equal(snap().current.wallet,before.wallet-4);});
 await cpClick('tab','[data-id="card"]');completed();
 assert(await review.show('carried'));await settled();await displayTexts();await click('[data-j="hub"]');await click('[data-j="collection"]');
 check('従来の帰還→編成導線を保ち、候補持越しの場面を成果なしだけで空にしない',()=>{assert.equal(offers().length,2);assert(!message());assert.equal(root.dataset.screen,'collection');});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'acquisition-empty-manifest.json'),'utf8'));
 const artifact=fs.readFileSync(manifest.path);
 check('提示物と生成記録が一致し、通信・永続保存・実行エラーを生じない',()=>{
  assert.equal(artifact.length,manifest.bytes);assert.equal(crypto.createHash('sha256').update(artifact).digest('hex'),manifest.sha256);
  assert.equal(sample.requests(),0);assert.deepEqual(errors,[]);
 });
 const report={version:'0.15.1',environment:'Node '+process.version+' / JSDOM; injected geometry and notifications; synthetic button/change input',passed:checks.length,failed:0,checks,artifact_sha256:manifest.sha256,
  not_verified:['実ブラウザー描画・フォント・重なり','実マウス・タッチ・キーボード','IndexedDB・複数タブ','本編の統一取得・経済・保存接続']};
 fs.writeFileSync(path.join(__dirname,'acquisition-empty-checks.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,failed:0,artifact_sha256:manifest.sha256}));
}finally{sample?.review.dispose();for(const instance of instances)instance.window.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
