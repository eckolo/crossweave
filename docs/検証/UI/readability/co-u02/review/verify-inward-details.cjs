// Focused inward placement checks across hand, field, forecast and actor using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,inward:true}),errors=[],checks=[],observers=[],intersections=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
for(const key of ['structuredClone','TextEncoder','TextDecoder','Blob','Response','DecompressionStream'])w[key]=globalThis[key];
Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
w.ResizeObserver=class{constructor(fn){this.fn=fn;this.nodes=[];observers.push(this);}observe(el){this.nodes.push(el);}disconnect(){this.nodes=[];}};
w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.nodes=[];intersections.push(this);}observe(n){this.nodes.push(n);}disconnect(){this.nodes=[];}};w.matchMedia=()=>({matches:false});
let hostWidth=1024,requests=0;const sourcePositions=new Map();
w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{requests++;throw Error('network forbidden');};
w.indexedDB={open(){throw Error('persistent save forbidden');}};
const root=w.document.getElementById('crossweave-journey'),host=w.document.getElementById('cw-exploration-fhd');
const scale=()=>Number(root.dataset.displayScale)||1;
const box=(x,y,width,height)=>({x,y,left:x,top:y,right:x+width,bottom:y+height,width,height});
const tracks={'cw-actors':[25,89,1870,272],'cw-field':[25,413,1870,216],'cw-hand':[25,685,1870,214],'cw-turn-order':[25,25,900,56]};
function logical(el){
 if(el.id==='crossweave-journey'||el.classList.contains('cj-shell'))return [0,0,1920,1080];
 if(el.hasAttribute('data-main'))return root.dataset.screen==='explore'?[1,1,1918,1078]:[1,65,1918,950];
 if(tracks[el.id])return tracks[el.id];
 if(el.classList.contains('cw-world'))return [25,25,1870,336];
 if(el.classList.contains('cw-board'))return [25,381,1870,248];
 if(el.classList.contains('cw-hand-region'))return [25,649,1870,314];
 if(el.classList.contains('cw-bottom'))return [25,983,1870,72];
 if(el.id==='cw-action-track')return [25,903,1870,56];
 if(el.id==='cw-action-anchor')return [25+(parseFloat(el.style.left)||0),903,240,56];
 if(el.id==='cw-drag-ghost')return [1+(parseFloat(el.style.left)||0),1+(parseFloat(el.style.top)||0),parseFloat(el.style.width)||248,parseFloat(el.style.height)||208];
 if(el.classList.contains('cw-drawer'))return [1+(parseFloat(el.style.left)||0),1+(parseFloat(el.style.top)||0),parseFloat(el.style.width)||520,parseFloat(el.style.height)||480];
 if(el.hasAttribute('data-inspector')||el.hasAttribute('data-inspect-key')){
  const owner=el.hasAttribute('data-inspector')?[1,1]:logical(el.parentElement);
  return [owner[0]+(parseFloat(el.style.left)||0),owner[1]+(parseFloat(el.style.top)||0),parseFloat(el.style.width)||520,parseFloat(el.style.height)||480];
 }
 const override=sourcePositions.get(el.dataset.xCard||el.dataset.xField);if(override)return override;
 const piece=el.closest('.cw-hand-card,.cw-slot,.cw-actor-item');
 if(piece){const row=piece.parentElement,[x,y,width,height]=tracks[row.id],actor=row.id==='cw-actors',pw=actor?320:248,ph=actor?248:208,gap=actor?24:16,index=[...row.children].indexOf(piece),total=row.children.length*pw+(row.children.length-1)*gap;
  return [x+Math.max(2,(width-total)/2)+index*(pw+gap)-row.scrollLeft,y+(actor?8:row.id==='cw-field'?0:(height-ph)/2),pw,ph];}
 if(el.hasAttribute('data-x-order')){const buttons=[...root.querySelectorAll('[data-x-order]')],i=buttons.indexOf(el);return [960-buttons.length*36+i*72,33,40,40];}
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
const sameRect=(a,b)=>{for(const k of ['left','top','width','height'])near(a[k],b[k]);};
const mode=m=>host.querySelector('[data-display-mode="'+m+'"]').click();
function click(selector){const el=q(selector);assert(el,selector);assert(!el.disabled,selector+' disabled');el.click();}
function pointer(type,target,x,y,primary=true){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'},isPrimary:{value:primary}});target.dispatchEvent(e);}
function resize(width){hostWidth=width;for(const o of observers)if(o.nodes.some(n=>n.classList.contains('cw-display-viewport')))o.fn();}
const pos=el=>{const r=el.getBoundingClientRect();return {x:r.left+60*scale(),y:r.top+48*scale()};};
const relationPaths=()=>[...q('#cw-relations').children].map(e=>e.getAttribute('d').replace(/-?\d+(?:\.\d+)?/g,n=>String(Math.round(Number(n)*1e6)/1e6)));
const styleRect=el=>Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(el.style[k])]));


let review;
const actorButton=id=>q('[data-x-actor="'+id+'"]'),targetId=()=>q('[data-x-actor][aria-pressed="true"]')?.dataset.xActor;
const liveClick=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail:1}));
function pressClick(el){const p=pos(el);pointer('pointerdown',el,p.x,p.y);pointer('pointerup',el,p.x,p.y);liveClick(el);}
const intersect=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
async function settled(){await wait(5);await until(()=>!review.app.session.state().pending);await wait(5);}

(async()=>{try{
 const script=w.document.createElement('script');script.textContent=bootstrap;w.document.body.append(script);
 await until(()=>host.__test);review=host.__test.review;assert(await review.ready);await settled();
 const api=w.CrossweaveUI,explore=q('[data-main]'),data=review.app.session.state().view.display_data,revision=()=>review.app.session.state().view.meta.revision,before=revision(),placements=[];
 const close=()=>{if(!q('#cw-drawer').hidden)click('[data-x="close"]');};
 const verify=(el,type)=>{
  assert(!q('#cw-drawer').hidden);assert.equal(q('#cw-drawer').dataset.window,type);
  const a=api.uiRect(el,explore),r=styleRect(q('#cw-drawer')),leftHalf=a.x+a.w/2<api.uiSpace(explore).width/2;
  if(leftHalf)assert(r.left>=a.x+a.w+16-.01,'left-half source must open right');
  else assert(r.left+r.width<=a.x-16+.01,'right-half source must open left');
  assert.equal(r.width,type==='actor'?416:520);assert.equal(r.height,type==='actor'?384:480);
  assert(r.left>=16&&r.left+r.width<=1902);assert(r.top>=16&&r.top+r.height<=1062);
  near(intersect(q('#cw-drawer').getBoundingClientRect(),el.getBoundingClientRect()),0);
  if(type!=='actor')near(intersect(q('#cw-drawer').getBoundingClientRect(),q('.cw-bottom').getBoundingClientRect()),0);
  return {type,id:el.dataset.xCard||el.dataset.xField||el.dataset.xActor||el.dataset.xOrder,side:leftHalf?'right':'left',rect:r};
 };
 const open=async(selector,type)=>{close();click(selector);await settled();const v=verify(q(selector),type);placements.push(v);return v.rect;};
 const handIds=[...root.querySelectorAll('[data-x-card]')].map(e=>e.dataset.xCard),fieldIds=[...root.querySelectorAll('[data-x-field]')].map(e=>e.dataset.xField);assert(handIds.length&&fieldIds.length);
 for(const id of handIds)await open('[data-x-card="'+id+'"]','card');
 check('実UIの全手札が選択元の内側へ詳細を開く',()=>{const rows=placements.filter(p=>p.type==='card');assert(rows.some(p=>p.side==='left'));assert(rows.some(p=>p.side==='right'));assert.equal(revision(),before);});
 for(const id of fieldIds)await open('[data-x-field="'+id+'"]','field');
 check('実UIの場札が選択元の内側へ詳細を開く',()=>assert.equal(placements.filter(p=>p.type==='field').length,fieldIds.length));
 // Force both halves for the same actual field object to catch dispatch-path omissions.
 const fieldId=fieldIds[0];for(const x of [560,1160]){sourcePositions.set(fieldId,[x,413,248,208]);await open('[data-x-field="'+fieldId+'"]','field');}sourcePositions.clear();
 check('同じ場札を左右へ動かしても規則が切り替わる',()=>same(placements.slice(-2).map(p=>p.side),['right','left']));
 const attack=data.exploration.hand.find(c=>Object.values(data.exploration.legal_actions).some(a=>(a.choice??a).card_id===c.id&&(a.choice??a).target==='E1'));assert(attack);
 const previewPositions=[];
 for(const x of [560,1160]){
  sourcePositions.set(attack.id,[x,688,248,208]);close();click('[data-x-actor="E1"]');await settled();
  const cardRect=await open('[data-x-card="'+attack.id+'"]','card');click('[data-x="preview"]');await settled();
  const r=verify(q('[data-x-card="'+attack.id+'"]'),'preview');sameRect(r.rect,cardRect);previewPositions.push(r);
  await review.app.session.reservations();await settled();sameRect(styleRect(q('#cw-drawer')),cardRect);
 }
 check('左右どちらの札でも詳細と予測が同じ位置で開き、応答後も変わらない',()=>same(previewPositions.map(p=>p.side),['right','left']));
 const expected=styleRect(q('#cw-drawer'));mode('actual');await settled();sameRect(styleRect(q('#cw-drawer')),expected);mode('fit');await settled();resize(736);await settled();sameRect(styleRect(q('#cw-drawer')),expected);resize(1024);await settled();
 check('全体・原寸・表示幅736pxで左右と論理座標を保持する',()=>sameRect(styleRect(q('#cw-drawer')),expected));
 sourcePositions.clear();
 const orderIds=[...root.querySelectorAll('[data-x-order]')].map(e=>e.dataset.xOrder);for(const id of [...new Set(orderIds)])await open('[data-x-order="'+id+'"]','order');
 check('行動順から開く対象窓も同じ左右判定を使う',()=>assert(placements.some(p=>p.type==='order')));
 const actorIds=[...root.querySelectorAll('[data-x-actor]')].map(e=>e.dataset.xActor),actorRects=[];
 for(const id of [...actorIds,...actorIds])actorRects.push(await open('[data-x-actor="'+id+'"]','actor'));
 check('相手の固定上端・寸法・選択往復を保つ',()=>{for(const r of actorRects)assert.equal(r.top,16);same(actorRects.slice(0,actorIds.length),actorRects.slice(actorIds.length));});
 check('隣の相手を避けられなくても左右規則を反転しない',()=>{
  const rows=[[{x:450,y:96,w:320,h:248},{x:790,y:96,w:900,h:248}],[{x:1148,y:96,w:320,h:248},{x:228,y:96,w:900,h:248}]];
  for(const actors of rows){const a=actors[0],r=api.placeActorWindow({width:1918,height:1078,anchor:a,actors});assert.equal(r.top,16);if(a.x<959)assert(r.left>=a.x+a.w+16);else assert(r.left+r.width<=a.x-16);}
 });
 close();click('[data-x-actor="E1"]');await settled();await open('[data-x-card="'+attack.id+'"]','card');
 near(intersect(q('#cw-drawer').getBoundingClientRect(),q('#cw-action-anchor').getBoundingClientRect()),0);click('#cw-use');await settled();
 check('詳細を開いたまま選択札を操作ボタンで使用できる',()=>{assert(revision()>before);assert(review.app.session.state().view.display_data.exploration.public_history.some(r=>r.type==='action'&&r.target==='E1'));});
 check('変更経路に外部通信・実行例外がない',()=>{assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'inward-details-manifest.json')));assert.equal(crypto.createHash('sha256').update(build({inward:true}).html).digest('hex'),manifest.sha256);
 fs.writeFileSync(path.join(__dirname,'inward-details-checks.json'),JSON.stringify({version:'0.14.6',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,placements,preview_positions:previewPositions,rule:'手札・場・予測・相手・行動順は左半分から右、右半分から左',injected:['矩形・client寸法・capture・hit test','ResizeObserver・可視通知','合成クリック','同一の場札・手札の左右位置'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント・実際の窓の重なり','実マウス・物理タッチ・実キーボード','IndexedDB・複数タブ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,placements,previewPositions,errors}));
}finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
