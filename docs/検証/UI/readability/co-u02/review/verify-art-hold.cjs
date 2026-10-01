// Focused artwork/hold checks using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,art:true}),errors=[],checks=[],observers=[],intersections=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
for(const key of ['structuredClone','TextEncoder','TextDecoder','Blob','Response','DecompressionStream'])w[key]=globalThis[key];
Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
w.ResizeObserver=class{constructor(fn){this.fn=fn;this.nodes=[];observers.push(this);}observe(el){this.nodes.push(el);}disconnect(){this.nodes=[];}};
w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.nodes=[];intersections.push(this);}observe(n){this.nodes.push(n);}disconnect(){this.nodes=[];}};w.matchMedia=()=>({matches:false});
let hostWidth=1024,requests=0;
w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{requests++;throw Error('network forbidden');};
w.indexedDB={open(){throw Error('persistent save forbidden');}};
const root=w.document.getElementById('crossweave-journey'),host=w.document.getElementById('cw-exploration-fhd');
const scale=()=>Number(root.dataset.displayScale)||1;
const box=(x,y,width,height)=>({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height});
const tracks={'cw-actors':[25,89,1870,236],'cw-field':[25,381,1870,216],'cw-hand':[25,657,1870,238],'cw-turn-order':[25,25,900,56]};
function logical(el){
 if(el.id==='crossweave-journey'||el.classList.contains('cj-shell'))return [0,0,1920,1080];
 if(el.hasAttribute('data-main'))return root.dataset.screen==='explore'?[1,1,1918,1078]:[1,65,1918,950];
 if(tracks[el.id])return tracks[el.id];
 if(el.classList.contains('cw-world'))return [25,25,1870,300];
 if(el.classList.contains('cw-board'))return [25,349,1870,248];
 if(el.classList.contains('cw-hand-region'))return [25,621,1870,338];
 if(el.classList.contains('cw-bottom'))return [25,983,1870,72];
 if(el.id==='cw-action-track')return [25,903,1870,56];
 if(el.id==='cw-action-anchor')return [25+(parseFloat(el.style.left)||0),903,240,56];
 if(el.id==='cw-drag-ghost')return [1+(parseFloat(el.style.left)||0),1+(parseFloat(el.style.top)||0),parseFloat(el.style.width)||248,parseFloat(el.style.height)||208];
 if(el.classList.contains('cw-drawer'))return [1+(parseFloat(el.style.left)||0),1+(parseFloat(el.style.top)||0),parseFloat(el.style.width)||520,parseFloat(el.style.height)||480];
 if(el.hasAttribute('data-inspector')||el.hasAttribute('data-inspect-key')){
  const owner=el.hasAttribute('data-inspector')?[1,1]:logical(el.parentElement);
  return [owner[0]+(parseFloat(el.style.left)||0),owner[1]+(parseFloat(el.style.top)||0),parseFloat(el.style.width)||520,parseFloat(el.style.height)||480];
 }
 const piece=el.closest('.cw-hand-card,.cw-slot,.cw-actor-item');
 if(piece){const row=piece.parentElement,[x,y,width,height]=tracks[row.id],actor=row.id==='cw-actors',pw=actor?320:248,ph=actor?224:208,gap=actor?24:16,index=[...row.children].indexOf(piece),total=row.children.length*pw+(row.children.length-1)*gap;
  return [x+Math.max(2,(width-total)/2)+index*(pw+gap)-row.scrollLeft,y+(row.id==='cw-field'?0:(height-ph)/2),pw,ph];}
 if(el.classList.contains('cw-prose-measure'))return [50,100,el.textContent.length*20,30];
 return [50,100,200,56];
}
w.HTMLElement.prototype.getBoundingClientRect=function(){
 if(this.classList.contains('cw-display-viewport'))return box(48,80,hostWidth,Math.min(1080,hostWidth*9/16));
 const viewport=root.closest('.cw-display-viewport'),s=scale(),r=logical(this);
 return box(48-(viewport?.scrollLeft||0)+r[0]*s,80-(viewport?.scrollTop||0)+r[1]*s,r[2]*s,r[3]*s);
};
for(const [property,index] of [['clientWidth',2],['clientHeight',3]])Object.defineProperty(w.HTMLElement.prototype,property,{configurable:true,get(){
 if(this.classList.contains('cw-display-viewport'))return index===2?hostWidth:Math.min(1080,hostWidth*9/16);
 if(this.classList.contains('prose-fixture'))return index===2?300:100;
 const r=logical(this);return r[index]-(this.classList.contains('cj-shell')?2:0);
}});
for(const property of ['clientLeft','clientTop'])Object.defineProperty(w.HTMLElement.prototype,property,{configurable:true,get(){return this.classList.contains('cj-shell')?1:0;}});
Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){return this.__overflow||this.clientWidth;}});
w.HTMLElement.prototype.setPointerCapture=function(id){this.__capture=id;};
w.HTMLElement.prototype.hasPointerCapture=function(id){return this.__capture===id;};
w.HTMLElement.prototype.releasePointerCapture=function(){delete this.__capture;};
const q=s=>root.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms)),same=(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(5);}throw Error('timeout');}
async function displayTexts(){for(const o of intersections.slice()){const nodes=o.nodes.filter(n=>n.isConnected&&n.closest('[data-main]'));if(nodes.length)o.fn(nodes.map(target=>({target,isIntersecting:true,intersectionRatio:1})));}await until(()=>!review.app.session.state().pending);await wait(5);}
const check=(name,fn)=>{fn();checks.push({name,passed:true});};
const near=(a,b)=>assert(Math.abs(a-b)<.01,`${a} != ${b}`);
const mode=m=>host.querySelector('[data-display-mode="'+m+'"]').click();
function click(selector){const el=q(selector);assert(el,selector);assert(!el.disabled,selector+' disabled');el.click();}
function pointer(type,target,x,y,primary=true){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'},isPrimary:{value:primary}});target.dispatchEvent(e);}
function resize(width){hostWidth=width;for(const o of observers)if(o.nodes.some(n=>n.classList.contains('cw-display-viewport')))o.fn();}
const pos=el=>{const r=el.getBoundingClientRect();return {x:r.left+60*scale(),y:r.top+48*scale()};};
const relationPaths=()=>[...q('#cw-relations').children].map(e=>e.getAttribute('d').replace(/-?\d+(?:\.\d+)?/g,n=>String(Math.round(Number(n)*1e6)/1e6)));
const styleRect=el=>Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(el.style[k])]));
async function startAcquisition(initialWidth=1024){
 let hostWidth=initialWidth;
 const {html}=await require('../acquisition-preview/build.cjs').build({testing:true}),vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  const rect=(x,y,width,height)=>({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height});
  const scale=()=>Number(w.document.getElementById('cw-acquisition-review')?.style.getPropertyValue('--cp-preview-scale')||1);
  const zoneX={offer:17,reserve:413,build:1168},zoneW={offer:376,reserve:735,build:735};
  w.HTMLElement.prototype.getBoundingClientRect=function(){
   const s=scale(),viewport=w.document.querySelector('[data-preview-window]');
   const x=32-(viewport?.scrollLeft||0),y=80-(viewport?.scrollTop||0),z=this.closest('section[data-zone]')?.dataset.zone;
   if(this.id==='cw-acquisition-review'||this.hasAttribute('data-preview-window'))return rect(32,80,hostWidth,1080*s);
   if(this.classList.contains('cp-shell'))return rect(x,y,1920*s,1080*s);
   if(this.classList.contains('cp-drag-ghost'))return rect(x+(1+parseFloat(this.style.left))*s,y+(1+parseFloat(this.style.top))*s,352*s,80*s);
   if(this.matches('[data-board-scroll]'))return rect(x+17*s,y+81*s,1846*s,918*s);
   if(this.matches('section[data-zone]'))return rect(x+zoneX[z]*s,y+81*s,zoneW[z]*s,918*s);
   if(this.matches('[data-scroll-zone]'))return rect(x+zoneX[z]*s,y+121*s,zoneW[z]*s,878*s);
   const piece=this.closest('.cp-piece');
   if(piece){const grid=piece.parentElement,idx=[...grid.children].indexOf(piece),cols=z==='offer'?1:2;return rect(x+(zoneX[z]+2+(idx%cols)*360-grid.scrollLeft)*s,y+(123+Math.floor(idx/cols)*88-grid.scrollTop)*s,352*s,80*s);}
   return rect(x,y,1920*s,1080*s);
  };
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){if(this.hasAttribute('data-preview-window'))return hostWidth;if(this.hasAttribute('data-scroll-zone'))return zoneW[this.dataset.scrollZone]-16;return this.classList.contains('cp-shell')?1920:0;},configurable:true});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.hasAttribute('data-scroll-zone')?878:0;},configurable:true});
  for(const prop of ['clientLeft','clientTop'])Object.defineProperty(w.HTMLElement.prototype,prop,{get(){return this.classList.contains('cp-shell')?1:0;},configurable:true});
  w.HTMLElement.prototype.setPointerCapture=function(id){this.__capture=id;};
  w.HTMLElement.prototype.hasPointerCapture=function(id){return this.__capture===id;};
  w.HTMLElement.prototype.releasePointerCapture=function(){delete this.__capture;};
 }});
 const root=dom.window.document.getElementById('cw-acquisition-review');assert(root.__test,'UI did not start');
 const q=s=>root.querySelector(s),snap=()=>JSON.parse(JSON.stringify(root.__test.snapshot())),zone=z=>q('section[data-zone="'+z+'"]'),grid=z=>q('[data-scroll-zone="'+z+'"]');
 const find=(action,match={},scope=root)=>[...scope.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===action&&Object.entries(match).every(([k,v])=>b.dataset[k]===v));
 const click=(action,match={},scope=root)=>{const b=find(action,match,scope);assert(b,'Missing '+action);assert(!b.disabled,'Disabled '+action);b.click();};
 dom.window.document.elementFromPoint=(x,y)=>[...root.querySelectorAll('section[data-zone]')].find(el=>{const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})||root;
 const pointer=(type,target,x,y)=>{const e=new dom.window.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true},pointerType:{value:'mouse'}});target.dispatchEvent(e);};
 const drag=async(match,to,inspect)=>{
  const from=find('detail',match),r=from.getBoundingClientRect(),s=root.__test.preview().scale;
  const startX=r.left+24*s,startY=r.top+24*s;pointer('pointerdown',from,startX,startY);await wait(240);
  assert(q('.cp-drag-ghost'));const dest=grid(to).getBoundingClientRect(),x=dest.left+100*s,y=dest.top+100*s;
  pointer('pointermove',root,x,y);if(inspect)inspect({x,y,s,ghost:q('.cp-drag-ghost')});pointer('pointerup',root,x,y);
 };
 return {dom,root,q,snap,zone,grid,find,click,pointer,drag,resize(width){hostWidth=width;root.__test.resizePreview();},mode(mode){q('[data-preview="'+mode+'"]').click();}};
}
let review,acquisition;
(async()=>{try{
 const script=w.document.createElement('script');script.textContent=bootstrap;w.document.body.append(script);
 await until(()=>host.__test);review=host.__test.review;assert(await review.ready);await until(()=>!review.app.session.state().pending);
 const api=w.CrossweaveUI,revision=()=>review.app.session.state().view.meta.revision,cue=()=>q('.cw-hold-cue');
 const release=pointer.bind(null,'pointerup'),closeWindow=()=>{if(!q('#cw-drawer').hidden)click('[data-x="close"]');};
 check('圧縮された同じUIが通信なしで探索を起動する',()=>{assert.equal(root.dataset.screen,'explore');assert(q('[data-x-card]'));assert.equal(requests,0);assert.equal(root.style.width,'1920px');});
 check('公開caseと調査記録の対象IDへ背景と潜水服を接続する',()=>{
  assert.equal(q('#cw-scene-base').dataset.artwork,'water');assert.match(q('#cw-scene-base').style.backgroundImage,/data:image\/webp;base64,/);
  assert.equal(q('[data-x-actor="E1"] [data-artwork]').dataset.artwork,'diver');const img=q('[data-x-actor="E1"] img');assert.equal(img.width,640);assert.equal(img.height,400);assert.equal(img.alt,'');
  assert.match(q('[data-x-order="E1"] img').src,/data:image\/webp;base64,/);
 });
 check('別のcase・未知対象・後続環境へ水路や潜水服を流用しない',()=>{assert.equal(api.sceneArtwork({case:{id:'other'},phase:'home'}),null);assert.equal(api.actorArtwork({case:{id:'SCN-001'},knowledge_views:[]},{purpose:'optional_enemy'}),null);assert.equal(api.sceneArtwork({case:{id:'SCN-001'},phase:'exploring',knowledge_views:[],exploration:{actors:[]}}),null);});
 check('画面下端でも進行円と操作名の余白を縮尺に合わせて確保する',()=>{
  for(const s of [1,1024/1920]){const holder=w.CrossweaveHoldCue.mount(root,{scale:()=>s});holder.start({clientX:9999,clientY:9999},220,'drag');const node=root.lastElementChild;near(parseFloat(node.style.top),root.clientHeight-42/s);assert.match(node.style.transform,/scale\(/);holder.dispose();}
 });
 // Select a genuinely legal place action from the public view.
 const data=review.app.session.state().view.display_data;
 let placed=false;
 for(const el of [...root.querySelectorAll('[data-x-card]')]){el.click();await until(()=>review.app.session.state().actionPreview&&!review.app.session.state().pending);if(q('.cw-field-forecast')){placed=true;break;}}
 assert(placed,'fixture must contain a place prediction');
 check('予測札と配置済み札の絵・本文の構造を揃え、予測印を本文外へ置く',()=>{
  const predicted=q('.cw-field-forecast'),normal=q('[data-x-field]');assert(normal);
  for(const el of [predicted,normal]){assert(el.querySelector(':scope>.cw-illustration'));const caption=el.querySelector(':scope>.cw-face-caption');same([...caption.children].map(n=>n.tagName+':'+n.className),['STRONG:','SPAN:cw-attr','SPAN:cw-stat-line']);assert.equal(caption.querySelector('.cw-field-change'),null);}
  assert(predicted.querySelector(':scope>.cw-field-change'));
 });
 closeWindow();await until(()=>!review.app.session.state().pending);
 const surface=q('.cw-explore');
 const before=revision(),actor=q('[data-x-actor="E1"]'),p=pos(actor);
 pointer('pointerdown',actor,p.x,p.y);await wait(80);
 check('相手のホールド有効中だけ進行円と「詳細」を表示する',()=>{assert(!cue().hidden);assert.equal(cue().dataset.holdAction,'detail');assert.equal(cue().querySelector('.cw-hold-label').textContent,'詳細');const n=Number(cue().style.getPropertyValue('--cw-hold-progress'));assert(n>0&&n<1);assert.match(cue().style.transform,/scale\(1\.875\)/);assert(q('#cw-drawer').hidden);});
 await wait(310);
 check('既存350msの到達で円を消し、相手の詳細を開く',()=>{assert(cue().hidden);assert.equal(q('#cw-drawer-title').textContent,'漂着した潜水服');assert(!q('#cw-drawer').hidden);assert.equal(revision(),before);});
 release(surface,p.x,p.y);closeWindow();
 pointer('pointerdown',actor,p.x,p.y);await wait(45);release(surface,p.x,p.y);await wait(370);
 check('早いリリースで円を消し、遅れて窓を開かない',()=>{assert(cue().hidden);assert(q('#cw-drawer').hidden);});
 for(const [reason,cancel] of [
  ['移動',()=>pointer('pointermove',surface,p.x+30,p.y)],
  ['pointercancel',()=>pointer('pointercancel',surface,p.x,p.y)],
  ['capture喪失',()=>pointer('lostpointercapture',surface,p.x,p.y)],
  ['非アクティブ化',()=>w.dispatchEvent(new w.Event('blur'))],
  ['複数ポインター',()=>pointer('pointerdown',surface,p.x,p.y,false)],
  ['一覧スクロール',()=>q('#cw-actors').dispatchEvent(new w.Event('scroll'))],
  ['Esc',()=>surface.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}))],
  ['倍率変更',()=>{mode('actual');mode('fit');}]
 ]){
  const el=q('[data-x-actor="E1"]');pointer('pointerdown',el,p.x,p.y);assert(!cue().hidden);cancel();assert(cue().hidden,reason);release(surface,p.x,p.y);await wait(370);
  check(reason+'で相手のホールドと円を取り消す',()=>{assert(cue().hidden);assert(q('#cw-drawer').hidden);});
 }
 const hand=q('[data-x-card]'),hp=pos(hand);pointer('pointerdown',hand,hp.x,hp.y);await wait(70);
 check('手札の待機中は同じ進行円で「移動」を示す',()=>{assert(!cue().hidden);assert.equal(cue().dataset.holdAction,'drag');assert.equal(cue().querySelector('.cw-hold-label').textContent,'移動');assert(q('#cw-drag-ghost').hidden);});
 await wait(190);
 check('既存220msでドラッグへ移り、円を残さない',()=>{assert(cue().hidden);assert(!q('#cw-drag-ghost').hidden);});
 w.document.elementFromPoint=()=>root;release(surface,hp.x,hp.y);await until(()=>!review.app.session.state().pending);
 check('場外で離しても出札・着想の支払いは発生しない',()=>assert.equal(revision(),before));
 const h2=q('[data-x-card]');pointer('pointerdown',h2,hp.x,hp.y);pointer('pointermove',surface,hp.x-30,hp.y);await wait(240);
 check('保持前の横送りは円を消し、ドラッグへ昇格しない',()=>{assert(cue().hidden);assert(q('#cw-drag-ghost').hidden);});release(surface,hp.x-30,hp.y);
 const e2=q('[data-x-actor="E1"]');pointer('pointerdown',e2,p.x,p.y);assert(!cue().hidden);assert(await review.show('hub-d03'));
 check('場面変更で旧ホールド表示を破棄し、拠点背景を表示する',()=>{assert.equal(root.querySelectorAll('.cw-hold-cue').length,0);assert.equal(q('.cj-backdrop').dataset.artwork,'shop');});
 assert(await review.show('entry-d03'));check('出発本文の背景も縦横比を保つ水路へ接続する',()=>assert.equal(q('.cj-backdrop').dataset.artwork,'water'));
 acquisition=await startAcquisition();
 for(const tab of ['card','passive']){
  acquisition.click('tab',{id:tab});const piece=acquisition.find('detail',{},acquisition.zone('offer')),r=piece.getBoundingClientRect(),x=r.left+20,y=r.top+20,snapshot=acquisition.snap();
  acquisition.pointer('pointerdown',piece,x,y);await wait(70);const c=acquisition.q('.cw-hold-cue');
  check((tab==='card'?'札':'心得')+'の取得編成にも同じホールド表示を適用する',()=>{assert(!c.hidden);assert.equal(c.dataset.holdAction,'drag');assert(Number(c.style.getPropertyValue('--cw-hold-progress'))>0);});
  await wait(180);assert(acquisition.q('.cp-drag-ghost'));assert(c.hidden);
  acquisition.pointer('pointerup',acquisition.root,-50,-50);
  check((tab==='card'?'札':'心得')+'の待機表示追加で取得・編成状態を変えない',()=>{same(acquisition.snap().current,snapshot.current);same(acquisition.snap().draft,snapshot.draft);});
 }
 const piece=acquisition.find('detail',{},acquisition.zone('offer')),ap=piece.getBoundingClientRect();acquisition.pointer('pointerdown',piece,ap.left+20,ap.top+20);acquisition.mode('actual');await wait(240);
 check('取得編成の倍率変更でも円と未成立ドラッグを取り消す',()=>{assert(acquisition.q('.cw-hold-cue').hidden);assert.equal(acquisition.q('.cp-drag-ghost'),null);});
 check('今回経路の外部通信・永続保存への代替接続・実行例外なし',()=>{assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'art-hold-manifest.json'),'utf8'));
 assert.equal(crypto.createHash('sha256').update(build({art:true}).html).digest('hex'),manifest.sha256);
 const report={version:'0.14.1',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,injected:['矩形・client寸法・hit test・pointer capture','ResizeObserver・可視通知'],old_suites_rerun:false,unverified:['実ブラウザー描画・画像合成・実フォント','実マウス・物理タッチ','IndexedDB・複数タブ','ユーザーの画面評価']};
 fs.writeFileSync(path.join(__dirname,'art-hold-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors}));
 }finally{review?.dispose();acquisition?.dom.window.close();dom.window.close();}})().catch(error=>{console.error(error);console.error(errors);process.exitCode=1;});
