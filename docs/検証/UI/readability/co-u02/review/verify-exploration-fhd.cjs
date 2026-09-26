// Actual Campaign + actual generated UI. Geometry/pointer facilities are injected,
// so this checks scale conversion and integration, not browser layout or touch.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const {html}=build({testing:true,fhd:true}),errors=[],checks=[],observers=[],intersections=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
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
function pointer(type,target,x,y){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'},isPrimary:{value:true}});target.dispatchEvent(e);}
function resize(width){hostWidth=width;for(const o of observers)if(o.nodes.some(n=>n.classList.contains('cw-display-viewport')))o.fn();}
const pos=el=>{const r=el.getBoundingClientRect();return {x:r.left+60*scale(),y:r.top+48*scale()};};
const relationPaths=()=>[...q('#cw-relations').children].map(e=>e.getAttribute('d').replace(/-?\d+(?:\.\d+)?/g,n=>String(Math.round(Number(n)*1e6)/1e6)));
const styleRect=el=>Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(el.style[k])]));
let review;
(async()=>{try{
 w.eval(w.document.querySelector('script').textContent);review=host.__test.review;
 assert(await review.ready);await until(()=>!review.app.session.state().pending);await wait(10);
 const api=w.CrossweaveUI,snapshot=()=>JSON.parse(JSON.stringify(review.app.session.state().view));
 check('固定された実Campaignの探索へ直接入る',()=>{assert.equal(root.dataset.screen,'explore');assert(q('[data-x-card]'));assert.equal(root.style.width,'1920px');assert.equal(q('.cj-shell').style.height,'1080px');});
 check('縮小表示でも1920×1080の座標と密度を維持する',()=>{near(api.displayState(root).scale,1024/1920);assert.equal(q('.cw-explore').dataset.compact,'false');assert.equal(q('.cw-explore').dataset.dense,'false');assert.match(host.querySelector('output').textContent,/53%/);});
 click('[data-x-card]');await until(()=>review.app.session.state().actionPreview&&!review.app.session.state().pending);await wait(5);
 const before=snapshot(),selected=q('[data-x-card][aria-pressed="true"]').dataset.xCard,windowBefore=styleRect(q('#cw-drawer')),lines=relationPaths();
 check('予測は公開APIから受け、520×480の窓と操作位置を設計座標で置く',()=>{assert(review.app.session.state().actionPreview);assert.equal(windowBefore.width,520);assert.equal(windowBefore.height,480);const x=parseFloat(q('#cw-action-anchor').style.left);assert(x>=0&&x<=1630);assert.equal(q('#cw-relations').getAttribute('viewBox'),'0 0 1918 1078');assert(lines.length>0&&lines.every(x=>!x.includes('NaN')));});
 mode('actual');await wait(5);
 check('原寸への変更で探索・選択・窓・予測線を失わない',()=>{same(snapshot(),before);assert(q('[data-x-card="'+selected+'"][aria-pressed="true"]'));same(styleRect(q('#cw-drawer')),windowBefore);same(relationPaths(),lines);assert.equal(api.displayState(root).scale,1);});
 mode('fit');await wait(5);
 check('縮小へ戻しても同じ窓位置・探索状態を保つ',()=>{same(snapshot(),before);same(styleRect(q('#cw-drawer')),windowBefore);});
 // Font metrics are injected. The assertion isolates physical/logical unit conversion.
 function prose(){const p=w.document.createElement('p');p.className='cj-prose prose-fixture';p.style.padding='0px';p.textContent='長い文章を表示する。縮小しても改行位置は変わらず、元の文章を保つ。';root.append(p);api.layoutProse(root);const lines=[...p.children].map(x=>x.textContent);p.remove();return lines;}
 const fitLines=prose();mode('actual');const actualLines=prose();mode('fit');
 check('文章の計測を縮尺で補正し原寸と同じ改行になる（注入文字幅）',()=>{same(fitLines,actualLines);assert(fitLines.length>=3);});
 click('[data-x="close"]');await wait(5);
 const hand=q('#cw-hand');hand.__overflow=2370;hand.scrollLeft=200;let p=pos(q('[data-x-card]'));
 pointer('pointerdown',q('[data-x-card]'),p.x,p.y);pointer('pointermove',q('.cw-explore'),p.x-80*scale(),p.y);pointer('pointerup',q('.cw-explore'),p.x-80*scale(),p.y);
 check('保持前のスワイプが縮小率によらず80設計pxを送る',()=>{near(hand.scrollLeft,280);same(snapshot(),before);assert(q('#cw-drag-ghost').hidden);});
 const field=q('#cw-field');field.__overflow=2370;field.scrollLeft=100;let r=field.getBoundingClientRect();
 pointer('pointerdown',field,r.left+20,r.top+20);pointer('pointermove',q('.cw-explore'),r.left+20-40*scale(),r.top+20);pointer('pointerup',q('.cw-explore'),r.left+20-40*scale(),r.top+20);
 check('余白ドラッグも40設計pxを送り、ゲーム状態を変えない',()=>{near(field.scrollLeft,140);same(snapshot(),before);});
 hand.scrollLeft=0;p=pos(q('[data-x-card]'));pointer('pointerdown',q('[data-x-card]'),p.x,p.y);await wait(240);
 check('保持ドラッグで札寸法と掴み位置を維持する',()=>{const g=q('#cw-drag-ghost'),r=g.getBoundingClientRect();assert(!g.hidden);near(parseFloat(g.style.width),248);near(parseFloat(g.style.height),208);near(r.left+60*scale(),p.x);near(r.top+48*scale(),p.y);});
 r=field.getBoundingClientRect();pointer('pointermove',q('.cw-explore'),r.right-2,r.top+40);await wait(55);
 check('保持中は端へ寄せた場の一覧だけを自動スクロールする',()=>{assert(field.scrollLeft>140);assert.equal(hand.scrollLeft,0);});
 w.document.elementFromPoint=()=>root;pointer('pointerup',q('.cw-explore'),48,80);
 check('場の外へのドロップでは一手も支払いも発生しない',()=>{same(snapshot(),before);assert(q('#cw-drag-ghost').hidden);});
 await until(()=>!review.app.session.state().pending);p=pos(q('[data-x-card]'));pointer('pointerdown',q('[data-x-card]'),p.x,p.y);await wait(240);resize(736);await wait(5);
 check('表示幅変更で移動を中断し、遅い応答による出札を防ぐ',()=>{assert(q('#cw-drag-ghost').hidden);same(snapshot(),before);near(api.displayState(root).scale,736/1920);});
 await until(()=>!review.app.session.state().pending);p=pos(q('[data-x-card]'));const dragRevision=snapshot().meta.revision;
 pointer('pointerdown',q('[data-x-card]'),p.x,p.y);await wait(240);r=q('#cw-field').getBoundingClientRect();w.document.elementFromPoint=()=>q('#cw-field');pointer('pointermove',q('.cw-explore'),r.left+200*scale(),r.top+80*scale());pointer('pointerup',q('.cw-explore'),r.left+200*scale(),r.top+80*scale());
 await until(()=>!review.app.session.state().pending&&(snapshot().meta.revision>dragRevision||q('#cw-drawer').dataset.window==='preview'));
 check('縮小中の場へのドロップが既存の予測／出札処理へ届く',()=>{assert(q('#cw-drag-ghost').hidden);assert(snapshot().meta.revision>dragRevision||q('#cw-drawer').dataset.window==='preview');});
 assert(await review.show('explore-d03'));await until(()=>!review.app.session.state().pending);
 click('[data-x-card]');await until(()=>review.app.session.state().actionPreview&&!review.app.session.state().pending);const revision=snapshot().meta.revision;click('[data-x="use"]');await until(()=>snapshot().meta.revision>revision&&!review.app.session.state().pending);
 check('主要ボタンは実Campaignの一手を実行して画面を更新する',()=>assert(snapshot().meta.revision>revision));
 assert(await review.show('explore-d03'));await until(()=>!review.app.session.state().pending);click('[data-x="more"]');click('[data-x="deck"]');await wait(5);
 check('探索メニューと子窓を同寸法で重ねず並べる',()=>{const a=styleRect(q('#cw-parent-drawer')),b=styleRect(q('#cw-drawer'));assert.equal(a.width,520);assert.equal(b.width,520);assert(a.left+a.width<=b.left);assert(b.left+b.width<=1918);});
 click('[data-x="parent-close"]');click('[data-x="more"]');click('[data-x="records"]');await wait(5);
 const target=q('[data-j="record-target"]');assert(target);target.click();await wait(5);
 check('探索から共通の調査記録へ渡し、親子窓を画面内で分離する',()=>{const panes=[...root.querySelectorAll('[data-inspector]>[data-inspect-key]')];assert.equal(panes.length,2);const [a,b]=panes.map(styleRect);assert.equal(a.width,520);assert.equal(a.height,480);assert(a.left+a.width<=b.left);assert(b.left+b.width<=1918);});
 assert(await review.show('entry-d03'));await until(()=>!review.app.session.state().pending);await displayTexts();click('[data-j="continue"]');await until(()=>root.dataset.screen==='explore'&&!review.app.session.state().pending);
 check('出発本文から探索へ進んでも1920×1080の同じ外枠を使う',()=>{assert.equal(q('.cj-shell').style.height,'1080px');assert.equal(host.querySelectorAll('.cw-display-viewport').length,1);});
 click('[data-x="withdraw"]');await until(()=>root.dataset.screen==='return'&&!review.app.session.state().pending);await displayTexts();click('[data-j="hub"]');await until(()=>root.dataset.screen==='hub'&&!review.app.session.state().pending);
 check('撤退→帰還→拠点の実遷移でも外枠と保存状態を維持する',()=>{assert.equal(q('.cj-shell').style.height,'1080px');assert.equal(snapshot().display_data.phase,'home');});
 for(const width of [320,1024,1280,1920]){resize(width);check(width+'pxの提示幅で全体／原寸を切替可能',()=>{near(api.displayState(root).scale,Math.min(1,width/1920));mode('actual');assert.equal(api.displayState(root).scale,1);mode('fit');});}
 review.dispose();review=null;
 check('場面終了で表示枠と監視を解放する',()=>{assert.equal(host.querySelectorAll('.cw-display-viewport').length,0);assert.equal(api.displayState(root),null);});
 const runtime=host.__test.runtime,Campaign=runtime.createCampaign({storage:new runtime.MemoryStore()}),app=api.mountJourneyApplication(root,{Campaign,config:{slot_id:'fhd-launch-check',...runtime.versions},storageMode:'ephemeral'});
 click('[data-launch="create"]');await until(()=>app.journey&&!app.session.state().pending);assert(await app.journey.ready);
 check('通常入口の開始→本編でも表示枠を二重に作らない',()=>{assert.equal(host.querySelectorAll('.cw-display-viewport').length,1);assert.equal(q('.cj-shell').style.height,'1080px');});
 app.dispose();check('通常入口の終了も表示枠を解放する',()=>assert.equal(host.querySelectorAll('.cw-display-viewport').length,0));
 check('外部通信・永続保存への代替接続・実行例外なし',()=>{assert.equal(requests,0);same(errors,[]);});
 const m=JSON.parse(fs.readFileSync(path.join(__dirname,'exploration-fhd-manifest.json'),'utf8'));
 const report={id:'UI-FHD-EXP-01',version:'0.14.0',checked_at_utc:new Date().toISOString(),environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:m.sha256,passed:checks.length,checks,injected:['要素矩形・client寸法・スクロール幅','Pointer capture・hit test','文章の文字幅・ResizeObserver通知・本文の表示通知'],old_suites_rerun:false,unverified:['実ブラウザー描画・フォント実測','実マウス・タッチ','IndexedDB・複数タブ','ユーザーの探索画面評価']};
 fs.writeFileSync(path.join(__dirname,'exploration-fhd-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors}));
 }finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
