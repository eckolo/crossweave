// Focused artwork/hold checks using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,cards:true}),errors=[],checks=[],observers=[],intersections=[];
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

let review;
(async()=>{try{
 const script=w.document.createElement('script');script.textContent=bootstrap;w.document.body.append(script);
 await until(()=>host.__test);review=host.__test.review;assert(await review.ready);await until(()=>!review.app.session.state().pending);
 const api=w.CrossweaveUI,data=review.app.session.state().view.display_data,revision=()=>review.app.session.state().view.meta.revision;
 const terrain=Object.values(data.exploration.actors).filter(a=>a.active&&a.purpose==='passage');assert(terrain.length);
 check('地形の対象枠・行動順から背景サムネイルを外し地形印にする',()=>{for(const a of terrain){const face=q('[data-x-actor="'+a.id+'"]');assert(face);assert(!face.querySelector('img'));assert(face.querySelector('[data-lucide="mountain"],.lucide-mountain'));assert.equal(api.actorArtwork(data,a),null);const order=q('[data-x-order="'+a.id+'"]');if(order){assert(!order.querySelector('img'));assert(order.querySelector('[data-lucide="mountain"],.lucide-mountain'));}}});
 check('全面背景と潜水服の既存画像は維持する',()=>{assert.equal(q('#cw-scene-base').dataset.artwork,'water');assert(q('[data-x-actor="E1"] img'));assert.match(q('[data-x-actor="E1"] img').src,/data:image\/webp;base64,/);});
 const idSelector=id=>'[data-x-card="'+id+'"]';
 async function selectCard(id){q(idSelector(id)).click();await wait(10);await until(()=>review.app.session.state().actionPreview&&!review.app.session.state().pending);}
 const signature=face=>[...face.querySelector(':scope>.cw-face-caption').children].map(n=>n.tagName+':'+n.className);
 const captions=[];let placeId,verbs=[];
 for(const h of data.exploration.hand){await selectCard(h.id);verbs.push({id:h.id,verb:q('#cw-use').textContent});if(q('.cw-field-forecast'))placeId=h.id;}
 assert(placeId);await selectCard(placeId);
 check('手札・場の札・予測札に同じ名称／効果／属性の内部構造を使う',()=>{for(const face of root.querySelectorAll('#cw-hand .cw-card-face,#cw-field .cw-card-face')){same(signature(face),['STRONG:','SPAN:cw-stat-line','SPAN:cw-hand-meta']);assert(face.querySelector(':scope>.cw-illustration'));const caption=face.querySelector('.cw-face-caption');assert(caption.querySelector('.cw-hand-meta>.cw-attr'));captions.push(caption);}assert(q('.cw-field-forecast'));assert(q('[data-x-field]'));});
 check('共通の本文区画120px・名称48px／効果24px／属性28pxを指定する',()=>{for(const caption of captions){const cs=w.getComputedStyle(caption);assert.equal(cs.display,'grid');assert.equal(cs.height,'120px');assert.equal(cs.gridTemplateRows,'48px 24px 28px');assert.equal(cs.gap,'4px');}});
 check('残り行動は手札に保持し予測印は本文区画を動かさない',()=>{assert(q('#cw-hand .cw-life'));assert(!q('#cw-field .cw-life'));assert(q('.cw-field-forecast>.cw-field-change'));assert(!q('.cw-field-forecast .cw-face-caption .cw-field-change'));});
 const before=revision(),surface=q('.cw-explore'),cue=()=>q('.cw-hold-cue');
 assert(verbs.some(v=>v.verb==='場に置く'));assert(verbs.some(v=>v.verb!=='場に置く'));
 for(const {id,verb} of verbs){await selectCard(id);const el=q(idSelector(id)),p=pos(el);pointer('pointerdown',el,p.x,p.y);await wait(40);assert(!cue().hidden);assert.equal(cue().querySelector('.cw-hold-label').textContent,verb);pointer('pointerup',surface,p.x,p.y);assert(cue().hidden);}
 check('各手札のホールド名は場に置く／一致時の手札下ボタン名と一致する',()=>assert.equal(revision(),before));
 const other=verbs.find(v=>v.verb!=='場に置く');await selectCard(other.id);const el=q(idSelector(placeId)),p=pos(el);
 pointer('pointerdown',el,p.x,p.y);await wait(50);
 check('別の札をホールドしても以前の選択札の操作名を流用しない',()=>{assert.equal(cue().querySelector('.cw-hold-label').textContent,'場に置く');assert.equal(q('#cw-use').textContent,other.verb);assert.equal(revision(),before);});
 await wait(190);
 check('成立後のドラッグ札も共通の内部構造を保つ',()=>{const ghost=q('#cw-drag-ghost');assert(!ghost.hidden);assert(ghost.classList.contains('cw-card-face'));same(signature(ghost),signature(q(idSelector(placeId))));assert.equal(w.getComputedStyle(ghost.querySelector('.cw-face-caption')).height,'120px');assert(cue().hidden);});
 w.document.elementFromPoint=()=>root;pointer('pointerup',surface,p.x,p.y);await until(()=>!review.app.session.state().pending);
 check('領域外で離した場合は出札せずホールド表示を残さない',()=>{assert.equal(revision(),before);assert(cue().hidden);assert(q('#cw-drag-ghost').hidden);});
 await selectCard(placeId);const beforeQ=JSON.stringify(review.app.session.state().actionPreview);mode('actual');mode('fit');
 check('全体／原寸の切替で札の区画と選択の予測を保持する',()=>{assert.equal(w.getComputedStyle(q(idSelector(placeId)).querySelector('.cw-face-caption')).height,'120px');assert.equal(JSON.stringify(review.app.session.state().actionPreview),beforeQ);});
 check('長い操作名も画面端で必要な余白を取る',()=>{const s=scale(),holder=w.CrossweaveHoldCue.mount(root,{scale:()=>s});holder.start({clientX:9999,clientY:9999},220,'drag','場に置く');const n=root.lastElementChild;near(parseFloat(n.style.left),root.clientWidth-32/s);near(parseFloat(n.style.top),root.clientHeight-42/s);holder.dispose();});
 const placedAttr=data.exploration.hand.find(h=>h.id===placeId).attr;click('#cw-use');await wait(10);await until(()=>!review.app.session.state().pending);
 check('共通化後も実APIで札を場へ置き同じ区画に場の数値を表示する',()=>{assert(revision()>before);const field=q('[data-x-field][data-x-attr="'+placedAttr+'"]');assert(field);assert(field.classList.contains('cw-card-face'));same(signature(field),['STRONG:','SPAN:cw-stat-line','SPAN:cw-hand-meta']);assert(!field.querySelector('.cw-life'));});
 check('変更経路に外部通信・実行例外がない',()=>{assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'card-frames-manifest.json')));
 assert.equal(crypto.createHash('sha256').update(build({cards:true}).html).digest('hex'),manifest.sha256);
 fs.writeFileSync(path.join(__dirname,'card-frames-checks.json'),JSON.stringify({version:'0.14.2',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,action_names:verbs,injected:['矩形・client寸法・capture・hit test','ResizeObserver・可視通知'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント','実マウス・物理タッチ','IndexedDB・複数タブ','提案中のクリック／ホールド統一の使いやすさ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
