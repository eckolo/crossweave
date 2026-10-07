// Focused stable actor detail placement checks using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,placement:true}),errors=[],checks=[],observers=[],intersections=[];
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
 const api=w.CrossweaveUI,base={width:1918,height:1078},actors=[{x:627,y:96,w:320,h:248},{x:971,y:96,w:320,h:248}],overlap=(p,b)=>intersect(box(p.left,p.top,p.width,p.height),box(b.x,b.y,b.w,b.h));
 const place=(anchor,list=actors)=>api.placeActorWindow({...base,anchor,actors:list});
 check('左半分は右脇・右半分は左脇へ16px空けて出す',()=>{const left=place(actors[0],[actors[0]]),right=place(actors[1],[actors[1]]);near(left.left,actors[0].x+actors[0].w+16);near(right.left+right.width+16,actors[1].x);for(const p of [left,right]){assert.equal(p.top,16);assert.equal(p.width,416);assert.equal(p.height,384);}});
 check('相手の高さや縦位置が違っても窓の縦位置・寸法を変えない',()=>{for(const anchor of [actors[0],actors[1]])for(const y of [60,96,132])for(const h of [200,248,280]){const p=place({...anchor,y,h});assert.equal(p.top,16);assert.equal(p.width,416);assert.equal(p.height,384);}});
 check('隣の相手を避けても指定した左右と共通の高さを保つ',()=>{const row=[{x:455,y:96,w:320,h:248},{x:799,y:96,w:320,h:248},{x:1143,y:96,w:320,h:248}];for(const anchor of row){const p=place(anchor,row);assert.equal(p.top,16);assert(p.left>=16&&p.left+p.width<=1902);if(anchor.x+anchor.w/2<base.width/2)assert(p.left>=anchor.x+anchor.w+16);else assert(p.left+p.width<=anchor.x-16);for(const b of row)near(overlap(p,b),0);same(p,place(anchor,[...row].reverse()));}});
 check('左右の画面端でも窓と選択対象を保ち、縦へ逃がさない',()=>{for(const x of [24,1574]){const anchor={x,y:96,w:320,h:248},p=place(anchor,[anchor]);assert.equal(p.top,16);assert(p.left>=16&&p.left+p.width<=1902);near(overlap(p,anchor),0);}});
 check('相手が過密でも選択元を隠さず同じ高さへ収める',()=>{const row=[283,627,971,1315].map(x=>({x,y:96,w:320,h:248}));for(const a of row){const p=place(a,row);assert.equal(p.top,16);near(overlap(p,a),0);assert(p.left>=16&&p.left+p.width<=1902);}});
 const revision=()=>review.app.session.state().view.meta.revision,before=revision(),data=review.app.session.state().view.display_data,enemy='E1',terrain=Object.values(data.exploration.actors).find(a=>a.active&&a.purpose==='passage').id;
 const openActor=async id=>{if(!q('#cw-drawer').hidden)click('[data-x="close"]');pressClick(actorButton(id));await settled();return styleRect(q('#cw-drawer'));};
 const placements=[];
 for(const id of [terrain,enemy,terrain,enemy]){
  const r=await openActor(id);placements.push({target:id,rect:r});assert.equal(r.top,16);assert.equal(targetId(),id);assert.equal(q('#cw-drawer-title').textContent,data.exploration.actors[id].name);
  const popup=q('#cw-drawer').getBoundingClientRect();for(const el of root.querySelectorAll('#cw-actors>*,#cw-field>*,#cw-hand>*,#cw-turn-order [data-x-order]'))near(intersect(popup,el.getBoundingClientRect()),0);
 }
 check('実UIの敵・地形を往復しても同じ対象は同じ位置へ開く',()=>{same(placements[0].rect,placements[2].rect);same(placements[1].rect,placements[3].rect);assert.equal(placements[0].rect.top,placements[1].rect.top);assert.equal(revision(),before);});
 const expected=styleRect(q('#cw-drawer'));mode('actual');await settled();same(styleRect(q('#cw-drawer')),expected);mode('fit');await settled();resize(736);await settled();same(styleRect(q('#cw-drawer')),expected);resize(1024);await settled();
 check('全体／原寸・表示幅の変更で論理座標が飛ばない',()=>same(styleRect(q('#cw-drawer')),expected));
 const attack=data.exploration.hand.find(c=>[enemy,terrain].every(id=>Object.values(data.exploration.legal_actions).some(a=>(a.choice??a).card_id===c.id&&(a.choice??a).target===id)));assert(attack);
 q('[data-x-card="'+attack.id+'"]').click();await settled();const actorRect=await openActor(enemy);
 const pending=review.app.session.reservations();await pending;await settled();
 check('予測・予約の応答後にも相手詳細の縦横位置を変えない',()=>{same(styleRect(q('#cw-drawer')),actorRect);assert.equal(q('[data-x-card][aria-pressed="true"]').dataset.xCard,attack.id);assert.equal(q('#cw-use').textContent,data.exploration.actors[enemy].action_label);assert.equal(revision(),before);});
 const terrainRect=await openActor(terrain);const paths=relationPaths();const nextEnemyRect=await openActor(enemy);
 check('対象切替は詳細・予測へ反映し、窓の移動を横方向だけにする',()=>{assert.equal(terrainRect.top,nextEnemyRect.top);assert.notEqual(terrainRect.left,nextEnemyRect.left);assert.equal(targetId(),enemy);assert.notEqual(JSON.stringify(paths),JSON.stringify(relationPaths()));});
 const useRect=q('#cw-action-anchor').getBoundingClientRect();near(intersect(useRect,q('#cw-drawer').getBoundingClientRect()),0);click('#cw-use');await settled();
 check('同じ位置の詳細から窓を閉じず選択対象へ実行できる',()=>{assert(revision()>before);assert(review.app.session.state().view.display_data.exploration.public_history.some(r=>r.type==='action'&&r.target===enemy));});
 check('変更経路に外部通信・実行例外がない',()=>{assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'steady-details-manifest.json')));assert.equal(crypto.createHash('sha256').update(build({placement:true}).html).digest('hex'),manifest.sha256);
 fs.writeFileSync(path.join(__dirname,'steady-details-checks.json'),JSON.stringify({version:'0.14.5',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,placements,rule:{top:16,width:416,height:384,gap:16,side:'left-half target opens right; right-half target opens left; horizontal neighbor/edge correction only'},injected:['矩形・client寸法・capture・hit test','ResizeObserver・可視通知','MouseEventによるクリック・ポインター通知'],crowded_case:'選択対象と画面内への収まりを確認。左右空間が無い場合の他の相手との非重複は保証しない',old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント・実際の窓の重なり','実マウス・物理タッチ・実キーボード','IndexedDB・複数タブ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,placements,errors}));
}finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
