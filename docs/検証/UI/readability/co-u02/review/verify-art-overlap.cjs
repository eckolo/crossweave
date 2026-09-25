// Focused artwork/hold checks using the established FHD injected geometry.
// This does not assert real browser drawing, pointer hardware or IndexedDB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,overlap:true}),errors=[],checks=[],observers=[],intersections=[];
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

// Drive only the feedback clock: no timing added to game actions.
function checkCueClock(){
 const clockDom=new JSDOM('<div id="host"></div>',{runScripts:'dangerously'}),cw=clockDom.window;
 let now=0,next=0;const frames=new Map();
 Object.defineProperty(cw.performance,'now',{value:()=>now});
 cw.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};cw.cancelAnimationFrame=id=>frames.delete(id);
 const advance=ms=>{now+=ms;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(now);};
 cw.eval(fs.readFileSync(path.join(__dirname,'../hold-cue.js'),'utf8'));
 const host=cw.document.getElementById('host'),holder=cw.CrossweaveHoldCue.mount(host),n=host.lastElementChild,start=duration=>holder.start({clientX:100,clientY:100},duration,'drag','場に置く');
 try{
  start(220);assert(n.hidden);advance(80);assert(n.hidden);holder.cancel();advance(500);
  check('120ms未満で離すと表示せず、遅れたフレームも残らない',()=>{assert(n.hidden);assert.equal(frames.size,0);});
  start(220);advance(119);assert(n.hidden);advance(1);
  check('120msから表示し、進行率は最初に押した時刻から算出する',()=>{assert(!n.hidden);near(Number(n.style.getPropertyValue('--cw-hold-progress')),120/220);});
  start(350);assert(n.hidden);advance(119);assert(n.hidden);advance(1);assert(!n.hidden);holder.cancel();advance(500);
  check('押し直しで待ち時間をリセットし、表示後の取消も残像を残さない',()=>{assert(n.hidden);assert.equal(frames.size,0);});
  start(150);advance(120);assert(!n.hidden);advance(30);
  check('短い150ms設定でも進行率を引き延ばさない',()=>near(Number(n.style.getPropertyValue('--cw-hold-progress')),1));
  holder.cancel();start(220);holder.dispose();advance(500);start(220);
  check('破棄後は遅れて表示せず再開もしない',()=>{assert(!host.children.length);assert.equal(frames.size,0);});
 }finally{clockDom.window.close();}
}
let review,acquisition;
(async()=>{try{
 checkCueClock();
 const script=w.document.createElement('script');script.textContent=bootstrap;w.document.body.append(script);
 await until(()=>host.__test);review=host.__test.review;assert(await review.ready);await until(()=>!review.app.session.state().pending);
 const surface=q('.cw-explore'),actor=q('[data-x-actor="E1"]'),paint=actor.querySelector('[data-artwork]'),cue=()=>q('.cw-hold-cue'),revision=()=>review.app.session.state().view.meta.revision;
 const css=el=>w.getComputedStyle(el),px=(el,k)=>parseFloat(css(el)[k]);
 check('敵の絵を176pxへ拡大し枠の上へ8px出す指定を持つ',()=>{assert.equal(px(paint,'height'),176);assert.equal(css(paint).inset,'-8px 0 auto');assert.equal(css(actor).overflow,'visible');assert.equal(css(paint.querySelector('img')).objectFit,'contain');assert.equal(css(paint).pointerEvents,'none');});
 check('スクロール行に上のはみ出し分を確保し、本文を絵より手前に置く',()=>{assert.equal(px(q('#cw-actors'),'paddingTop'),8);assert.equal(css(actor.parentElement).alignSelf,'start');assert.equal(px(actor.parentElement,'height'),248);assert.equal(css(actor.querySelector('.cw-face-caption')).zIndex,'1');});
 check('FHD全体の収まりと札の寸法を維持し、絵の下側を本文に重ねる',()=>{
  const rows=css(surface).gridTemplateRows.split(' ').map(Number.parseFloat),gap=px(surface,'gap'),padding=px(surface,'padding');
  same(rows,[336,248,314,72]);assert.equal(rows.reduce((a,b)=>a+b,0)+gap*3+padding*2,1078);
  const actorHeight=px(actor.parentElement,'height'),captionHeight=px(actor.querySelector('.cw-face-caption'),'minHeight'),inset=-8;
  const overlap=inset+px(paint,'height')-(actorHeight-2-captionHeight);assert(overlap>=30&&overlap<=42);
  const trackHeight=rows[0]-56-8;assert(trackHeight>=8+actorHeight+8); // top paint space + frame + thin scrollbar allowance
  assert.equal(px(q('.cw-hand-card'),'height'),208);assert.equal(px(q('.cw-hand-card'),'width'),248);
 });
 const oldArt=JSON.parse(fs.readFileSync(path.join(__dirname,'../art-assets/manifest.json')));
 check('画像の原本・配布画素を変更していない',()=>{for(const a of oldArt.assets){const bytes=fs.readFileSync(path.join(__dirname,'..',a.derivative.path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.derivative.sha256);}});
 const before=revision();let p=pos(actor);
 pointer('pointerdown',actor,p.x,p.y);await wait(70);assert(cue().hidden);pointer('pointerup',surface,p.x,p.y);await wait(370);
 check('探索の短い押下後にホールド表示や敵詳細が遅れて出ない',()=>{assert(cue().hidden);assert(q('#cw-drawer').hidden);assert.equal(revision(),before);});
 pointer('pointerdown',actor,p.x,p.y);await wait(150);assert(!cue().hidden);assert(q('#cw-drawer').hidden);await wait(220);
 check('敵は表示を遅らせても既存350msの保持で詳細を開く',()=>{assert(cue().hidden);assert(!q('#cw-drawer').hidden);assert.equal(q('#cw-drawer-title').textContent,'漂着した潜水服');});
 pointer('pointerup',surface,p.x,p.y);click('[data-x="close"]');
 let placeId;
 for(const el of [...root.querySelectorAll('[data-x-card]')]){el.click();await until(()=>review.app.session.state().actionPreview&&!review.app.session.state().pending);if(q('.cw-field-forecast')){placeId=el.dataset.xCard;break;}}
 assert(placeId);click('[data-x="close"]');const card=()=>q('[data-x-card="'+placeId+'"]');p=pos(card());
 pointer('pointerdown',card(),p.x,p.y);await wait(70);assert(cue().hidden);pointer('pointerup',surface,p.x,p.y);await wait(240);
 check('手札の短い押下をドラッグへ変えず表示も残さない',()=>{assert(cue().hidden);assert(q('#cw-drag-ghost').hidden);assert.equal(revision(),before);});
 pointer('pointerdown',card(),p.x,p.y);await wait(150);assert(!cue().hidden);assert.equal(cue().querySelector('.cw-hold-label').textContent,'場に置く');await wait(85);
 check('手札は既存220msでつかみ、成立時に進行表示を消す',()=>{assert(cue().hidden);assert(!q('#cw-drag-ghost').hidden);});
 const dest=q('#cw-drop-zone').getBoundingClientRect(),dx=dest.left+100*scale(),dy=dest.top+60*scale();w.document.elementFromPoint=()=>q('#cw-drop-zone');
 pointer('pointermove',surface,dx,dy);pointer('pointerup',surface,dx,dy);await wait(20);await until(()=>!review.app.session.state().pending);
 check('調整後の場へ出札でき、予測と実札の共通区画を保つ',()=>{assert(revision()>before);assert(q('#cw-drag-ghost').hidden);assert.equal(css(q('[data-x-field] .cw-face-caption')).height,'120px');});
 acquisition=await startAcquisition();const acq=acquisition,abefore=acq.snap(),piece=acq.q('.cp-piece button[data-action="detail"]'),r=piece.getBoundingClientRect(),ax=r.left+15,ay=r.top+15;
 acq.pointer('pointerdown',piece,ax,ay);await wait(70);assert(acq.q('.cw-hold-cue').hidden);acq.pointer('pointerup',acq.root,ax,ay);await wait(230);
 check('取得編成にも同じ遅延を適用し短い押下で状態を変えない',()=>{assert(acq.q('.cw-hold-cue').hidden);assert(!acq.q('.cp-drag-ghost'));same(acq.snap().current,abefore.current);same(acq.snap().draft,abefore.draft);});
 acq.pointer('pointerdown',piece,ax,ay);await wait(150);assert(!acq.q('.cw-hold-cue').hidden);await wait(85);assert(acq.q('.cp-drag-ghost'));assert(acq.q('.cw-hold-cue').hidden);acq.pointer('pointercancel',acq.root,ax,ay);
 check('取得編成も220msでドラッグへ移り、取消で支払い・編成を変えない',()=>{assert(!acq.q('.cp-drag-ghost'));same(acq.snap().current,abefore.current);same(acq.snap().draft,abefore.draft);});
 check('変更経路に外部通信・実行例外がない',()=>{assert.equal(requests,0);same(errors,[]);});
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'art-overlap-manifest.json'))),am=JSON.parse(fs.readFileSync(path.join(__dirname,'../acquisition-preview/inline-manifest.json')));
 assert.equal(crypto.createHash('sha256').update(build({overlap:true}).html).digest('hex'),manifest.sha256);
 const ah=(await require('../acquisition-preview/build.cjs').build()).html;assert.equal(crypto.createHash('sha256').update(ah).digest('hex'),am.sha256);
 fs.writeFileSync(path.join(__dirname,'art-overlap-checks.json'),JSON.stringify({version:'0.14.3',acquisition_version:'two-stage-ui-5.3',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,acquisition_inline_sha256:am.sha256,feedback_reveal_ms:120,existing_action_ms:{card:220,actor:350,acquisition:220},injected:['矩形・client寸法・capture・hit test','ResizeObserver・可視通知','表示単体のperformance.nowとrequestAnimationFrame'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント・画像の実重なり','実マウス・物理タッチ','IndexedDB・複数タブ','札の実画像（現在は未導入）']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{review?.dispose();acquisition?.dom.window.close();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
