// Focused projected field card detail interaction checks using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,ghost:true}),errors=[],checks=[],observers=[],intersections=[];
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
 const api=w.CrossweaveUI,explore=q('[data-main]'),state=()=>review.app.session.state(),data=()=>state().view.display_data,revision=()=>state().view.meta.revision;
 const initial=data(),fieldBefore=JSON.parse(JSON.stringify(initial.exploration.field)),handBefore=JSON.parse(JSON.stringify(initial.exploration.hand)),before=revision(),targetBefore=targetId();
 const cards=initial.exploration.hand,fields=Object.values(initial.exploration.field),placeCard=cards.find(c=>!fields.some(f=>f.attr===c.attr)&&Object.values(initial.exploration.legal_actions).some(a=>(a.choice??a).card_id===c.id&&(a.choice??a).target===null));assert(placeCard,'placeable fixture card');
 const projectedButton=()=>q('#cw-field [data-forecast="place"]'),selectedId=()=>q('[data-x-card][aria-pressed="true"]')?.dataset.xCard;
 const escape=()=>root.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 const readonly=()=>{assert.equal(revision(),before);same(data().exploration.field,fieldBefore);same(data().exploration.hand,handBefore);assert.equal(selectedId(),placeCard.id);assert(projectedButton());};
 click('[data-x-card="'+placeCard.id+'"]');await settled();await until(projectedButton);const handBody=q('#cw-drawer .cw-drawer-body').textContent;
 check('予測の場札を通常のbuttonと場札詳細の入口として表示する',()=>{
  const g=projectedButton();assert.equal(g.tagName,'BUTTON');assert.equal(g.type,'button');assert.equal(g.dataset.xField,placeCard.id);assert(!g.hasAttribute('data-x-card'));assert.match(g.getAttribute('aria-label'),/予測の場札/);assert.match(g.textContent,/＋ 予測/);assert(g.classList.contains('cw-card-face'));readonly();
 });
 const selectedTarget=targetId();pressClick(projectedButton());await settled();
 const fieldRect=styleRect(q('#cw-drawer')),anchor=api.uiRect(projectedButton(),explore),expected=api.placeEdgeWindow({width:1918,height:1078,anchor,bottom:982});
 check('クリックで元札の詳細を場の位置から開き、手札・対象・予測と未確定状態を保つ',()=>{
  assert.equal(q('#cw-drawer').dataset.window,'field');assert.equal(q('#cw-drawer-title').textContent,'予測 · '+initial.details[placeCard.id].name);assert.equal(q('#cw-drawer').getAttribute('aria-label'),q('#cw-drawer-title').textContent);assert.equal(q('#cw-drawer .cw-drawer-body').textContent,handBody);assert.match(handBody,/場に置くと/);assert.equal(targetId(),selectedTarget);sameRect(fieldRect,expected);near(fieldRect.top,412);readonly();
 });
 projectedButton().click();await settled();assert(q('#cw-drawer').hidden);projectedButton().click();await settled();assert(!q('#cw-drawer').hidden);
 escape();const g=projectedButton(),p=pos(g);pointer('pointerdown',g,p.x,p.y);await wait(260);assert(q('#cw-drag-ghost').hidden);pointer('pointerup',g,p.x,p.y);liveClick(g);await settled();
 check('再クリックの開閉とbutton起動が働き、ホールドしても出札やドラッグを開始しない',()=>{assert(q('#cw-drag-ghost').hidden);readonly();});
 click('[data-x="preview"]');await settled();assert.equal(q('#cw-drawer').dataset.window,'preview');pressClick(projectedButton());await settled();await review.app.session.reservations();await settled();
 check('行動予測と予測札の詳細を往復でき、応答後も札の詳細が保たれる',()=>{assert.equal(q('#cw-drawer').dataset.window,'field');sameRect(styleRect(q('#cw-drawer')),fieldRect);readonly();});
 mode('actual');await settled();sameRect(styleRect(q('#cw-drawer')),fieldRect);mode('fit');await settled();resize(736);await settled();sameRect(styleRect(q('#cw-drawer')),fieldRect);resize(1024);await settled();
 check('予測札の詳細も全体・原寸・736px幅で場を基準に同じ位置へ開く',()=>readonly());
 const actualId=fields[0].id;click('[data-x-field="'+actualId+'"]');await settled();
 check('既存の実場札は従来の詳細を開き、予測として誤表示しない',()=>{assert.equal(q('#cw-drawer-title').textContent,initial.details[actualId].name);assert.equal(q('#cw-drawer').dataset.window,'field');readonly();});
 // Explicit opening still works when automatic detail display is disabled;
 // changing the selected hand card then invalidates the former projected field.
 escape();click('[data-x="more"]');click('[data-x="settings"]');const toggle=q('[data-x-setting="details"]');assert(toggle);toggle.checked=false;toggle.dispatchEvent(new w.Event('change',{bubbles:true}));escape();pressClick(projectedButton());await settled();assert.equal(q('#cw-drawer').dataset.window,'field');
 const other=cards.find(c=>c.id!==placeCard.id&&fields.some(f=>f.attr===c.attr));assert(other);click('[data-x-card="'+other.id+'"]');await settled();
 check('別の手札で予測が消えたら古い詳細を閉じる（自動詳細OFFでも残さない）',()=>{assert(!projectedButton());assert(q('#cw-drawer').hidden);assert.equal(selectedId(),other.id);assert.equal(revision(),before);same(data().exploration.field,fieldBefore);});
 click('[data-x-card="'+placeCard.id+'"]');await settled();await until(projectedButton);pressClick(projectedButton());await settled();assert.equal(q('#cw-use').textContent,'場に置く');readonly();
 click('#cw-use');await settled();
 check('明示した「場に置く」で初めて実行し、予測とその詳細を片付ける',()=>{assert(revision()>before);assert(!projectedButton());assert(q('#cw-drawer').hidden);assert(data().exploration.public_history.some(r=>r.type==='action'&&r.actor==='P'&&r.mode==='place'));});
 check('新しい確認経路に外部通信・実行例外がない',()=>{assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'field-forecast-details-manifest.json')));assert.equal(crypto.createHash('sha256').update(build({ghost:true}).html).digest('hex'),manifest.sha256);
 fs.writeFileSync(path.join(__dirname,'field-forecast-details-checks.json'),JSON.stringify({version:'0.14.8',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,fixture_card:{id:placeCard.id,name:initial.details[placeCard.id].name,attr:placeCard.attr},field_detail_rect:fieldRect,read_only_until_explicit_play:true,injected:['矩形・client寸法・capture・hit test','ResizeObserver・可視通知','MouseEventによるpointerとclick通知','button.click()と設定change通知'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント','実マウス・物理タッチ・実キーボード','IndexedDB・複数タブ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,card:placeCard.id,fieldRect,errors}));
}finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
