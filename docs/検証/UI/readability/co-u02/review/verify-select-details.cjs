// Focused actor selection/detail checks using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,selection:true}),errors=[],checks=[],observers=[],intersections=[];
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
 const data=review.app.session.state().view.display_data,revision=()=>review.app.session.state().view.meta.revision,before=revision();
 const initialTarget=targetId(),enemy='E1';assert.notEqual(initialTarget,enemy);
 pressClick(actorButton(enemy));
 check('敵のクリック直後に対象と詳細を同時に切り替える',()=>{assert.equal(targetId(),enemy);assert(!q('#cw-drawer').hidden);assert.equal(q('#cw-drawer').dataset.window,'actor');assert.equal(q('#cw-drawer-title').textContent,data.exploration.actors[enemy].name);assert.equal(revision(),before);});
 pressClick(actorButton(initialTarget));
 check('地形も同じ一回の操作で選択し同じ窓の内容を更新する',()=>{assert.equal(targetId(),initialTarget);assert.equal(q('#cw-drawer-title').textContent,data.exploration.actors[initialTarget].name);assert(q('#cw-parent-drawer').hidden);assert(!q('[data-x="target-info"]'));});
 const placements=[];
 for(const id of [enemy,initialTarget]){pressClick(actorButton(id));await settled();const popup=q('#cw-drawer'),r=popup.getBoundingClientRect(),source=actorButton(id).getBoundingClientRect();placements.push({target:id,rect:styleRect(popup)});
  assert.equal(styleRect(popup).width,416);assert.equal(styleRect(popup).height,384);near(styleRect(popup).width/styleRect(popup).height,520/480);near(intersect(r,source),0);
  for(const el of root.querySelectorAll('#cw-actors>* ,#cw-field>*,#cw-hand>*,#cw-turn-order [data-x-order]'))assert(intersect(r,el.getBoundingClientRect())<.01,'window covers '+el.className+' '+JSON.stringify({popup:styleRect(popup),piece:logical(el),field:q("#cw-field").children.length,hand:q("#cw-hand").children.length}));
 }
 check('注入したFHD配置では詳細が相手・場・手札・行動順を覆わず共通比率を保つ',()=>assert.equal(placements.length,2));
 pressClick(actorButton(initialTarget));assert(q('#cw-drawer').hidden);assert.equal(targetId(),initialTarget);pressClick(actorButton(initialTarget));
 check('同じ対象の再クリックは詳細を開閉し、対象指定を解除しない',()=>{assert(!q('#cw-drawer').hidden);assert.equal(targetId(),initialTarget);});
 click('[data-x="close"]');let button=actorButton(enemy),p=pos(button);pointer('pointerdown',button,p.x,p.y);await wait(400);
 check('敵を長く押しても進行円・詳細・対象切替は発生しない',()=>{assert(q('.cw-hold-cue').hidden);assert(q('#cw-drawer').hidden);assert.equal(targetId(),initialTarget);assert.equal(revision(),before);});
 pointer('pointerup',button,p.x,p.y);liveClick(button);
 check('長く押してから離しても通常のクリック一回として選択する',()=>{assert.equal(targetId(),enemy);assert(!q('#cw-drawer').hidden);});
 const keep=targetId();click('[data-x="close"]');
 for(const [reason,cancel] of [
  ['移動',(b,p)=>pointer('pointermove',b,p.x+25,p.y)],
  ['pointercancel',(b,p)=>pointer('pointercancel',b,p.x,p.y)],
  ['スクロール',()=>q('#cw-actors').dispatchEvent(new w.Event('scroll'))],
  ['非primary',(b,p)=>pointer('pointerdown',b,p.x,p.y,false)],
  ['画面離脱',()=>w.dispatchEvent(new w.Event('blur'))]
 ]){button=actorButton(initialTarget);p=pos(button);pointer('pointerdown',button,p.x,p.y);cancel(button,p);pointer('pointerup',button,p.x,p.y);liveClick(button);assert.equal(targetId(),keep,reason);assert(q('#cw-drawer').hidden,reason);assert(q('.cw-hold-cue').hidden,reason);}
 check('移動・取消・スクロール・別ポインター・画面離脱後に対象を誤変更しない',()=>assert.equal(revision(),before));
 actorButton(initialTarget).click();
 check('キーボード由来のボタン起動も同じ選択・詳細経路を使う',()=>{assert.equal(targetId(),initialTarget);assert(!q('#cw-drawer').hidden);});
 // Find an existing real action with both enemy and terrain legal targets.
 const actions=Object.values(data.exploration.legal_actions).map(a=>a.choice??a),attack=data.exploration.hand.find(c=>[enemy,initialTarget].every(id=>actions.some(a=>a.card_id===c.id&&a.target===id)));
 assert(attack,'fixture must support target switching with one selected card');
 q('[data-x-card="'+attack.id+'"]').click();await settled();const cardBefore=q('[data-x-card][aria-pressed="true"]').dataset.xCard;
 pressClick(actorButton(enemy));await settled();const enemyPaths=relationPaths(),enemyPreview=JSON.stringify(review.app.session.state().actionPreview);
 check('札を保ったまま敵へ切り替え、予測・操作名を更新する',()=>{assert.equal(targetId(),enemy);assert.equal(q('[data-x-card][aria-pressed="true"]').dataset.xCard,cardBefore);assert.equal(q('#cw-use').textContent,data.exploration.actors[enemy].action_label);assert.equal(q('#cw-drawer').dataset.window,'actor');assert.equal(revision(),before);});
 pressClick(actorButton(initialTarget));await settled();
 check('地形へ切り替えると関係線・予測・操作名も追従する',()=>{assert.equal(targetId(),initialTarget);assert.equal(q('#cw-use').textContent,data.exploration.actors[initialTarget].action_label);assert.notEqual(JSON.stringify(relationPaths()),JSON.stringify(enemyPaths));assert.notEqual(JSON.stringify(review.app.session.state().actionPreview),enemyPreview);assert.equal(q('[data-x-card][aria-pressed="true"]').dataset.xCard,cardBefore);});
 mode('actual');await settled();mode('fit');await settled();
 check('全体／原寸切替でも選択と相手詳細を保持する',()=>{assert.equal(targetId(),initialTarget);assert.equal(q('#cw-drawer').dataset.window,'actor');assert.equal(q('#cw-drawer-title').textContent,data.exploration.actors[initialTarget].name);});
 const useRect=q('#cw-action-anchor').getBoundingClientRect(),windowRect=q('#cw-drawer').getBoundingClientRect();near(intersect(useRect,windowRect),0);
 pressClick(actorButton(enemy));await settled();click('#cw-use');await settled();
 check('詳細窓を手で閉じず選択中の敵へ実APIで行動できる',()=>{assert(revision()>before);const history=review.app.session.state().view.display_data.exploration.public_history;assert(history.some(r=>r.type==='action'&&r.target===enemy&&r.card_id===attack.id)||history.some(r=>r.type==='action'&&r.target===enemy));});
 // Start a fresh copy only for the independent card gesture regression.
 assert(await review.show('explore-d03'));await settled();const frameBefore=revision();button=q('[data-x-card]');p=pos(button);pointer('pointerdown',button,p.x,p.y);await wait(70);assert(q('.cw-hold-cue').hidden);await wait(85);assert(!q('.cw-hold-cue').hidden);await wait(90);
 check('札の120ms表示待ち・220msのドラッグ成立を維持する',()=>{assert(q('.cw-hold-cue').hidden);assert(!q('#cw-drag-ghost').hidden);});
 w.document.elementFromPoint=()=>root;pointer('pointerup',q('.cw-explore'),p.x,p.y);await settled();
 check('札を領域外で離した場合は出札せず取消す',()=>{assert(q('#cw-drag-ghost').hidden);assert.equal(revision(),frameBefore);});
 check('現行説明に敵ホールド・独立詳細ボタンの案内を残さない',()=>{assert(!q('[data-x="target-info"]'));for(const el of root.querySelectorAll('[data-x-actor]')){assert.match(el.getAttribute('aria-label'),/クリックで選択・詳細/);assert(!/長押し|ホールド/.test(el.getAttribute('aria-label')));}assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'select-details-manifest.json')));assert.equal(crypto.createHash('sha256').update(build({selection:true}).html).digest('hex'),manifest.sha256);
 fs.writeFileSync(path.join(__dirname,'select-details-checks.json'),JSON.stringify({version:'0.14.4',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,placements,injected:['矩形・client寸法・capture・hit test','ResizeObserver・可視通知','MouseEventによるクリック・ポインター通知'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント・実際の窓の重なり','実マウス・物理タッチ・実キーボード','IndexedDB・複数タブ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,placements,errors}));
}finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
