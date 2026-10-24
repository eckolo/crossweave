const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.CW_UI_JSDOM||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build.cjs'),{nameMetrics}=require('./name-metrics.cjs');
const checks=[],runtimeErrors=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,fn)=>{fn();checks.push({name,passed:true});};
const close=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
async function start(initialWidth=1024){
 let hostWidth=initialWidth;
 const {html}=await build({testing:true}),vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')runtimeErrors.push(String(e));});
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
async function fillCapacityFixture(t){
 const repo=path.resolve(__dirname,'../../../../../..'),C=(await import(path.join(repo,'src/content/m1.mjs'))).default;
 const {variants,compileCard}=await import(path.join(repo,'src/runtime/affixes.mjs')),{cardDetail}=await import(path.join(repo,'src/runtime/item-details.mjs'));
 const f=t.root.__test.fixture,extra=[];
 outer:for(const [id,v] of Object.entries(C.cards))if(v.affix_allowlist)for(const b of variants('card',id)){
  if(f.catalogue[b.key])continue;const c=compileCard(b);f.catalogue[b.key]={key:b.key,...cardDetail(c),attribute:c.attr};
  f.initial.units.push({uid:'capacity-'+extra.length,key:b.key});extra.push(b.key);if(extra.length===13)break outer;
 }
 assert.equal(extra.length,13);f.offers.push(...extra.slice(0,2).map((key,i)=>({id:'capacity-offer-'+i,key,price:4})));t.click('reset');
}
(async()=>{
 const t=await start(),initial=t.snap().current,d=t.root.__test.layout(),metrics=await nameMetrics();
 check('1920×1080の固定盤面で候補・手元・編成を横並びにする',()=>{assert.equal(d.width,1920);assert.equal(d.height,1080);assert.equal(t.q('[data-board-scroll]').dataset.orientation,'columns');assert.deepEqual([...t.q('[data-board-scroll]').children].map(x=>x.dataset.zone),['offer','reserve','build']);assert.deepEqual(['offer','reserve','build'].map(z=>t.grid(z).style.getPropertyValue('--cp-columns')),['1','2','2']);});
 check('最長25文字へ26全角文字分を確保し、352×80の共通枠へ操作を併置する（寸法計算）',()=>{const x=metrics.tile;assert.equal(metrics.max_length,25);assert.equal(metrics.full_width_character_budget,26);assert.equal(x.width,2*x.border+x.name_width+16+x.action_width);assert.equal(x.height,2*x.border+x.name_height+x.metadata_height+x.body_vertical_padding);assert.equal(x.action_width,72);assert.equal(x.action_height,76);});
 check('1024pxの会話幅では盤面を組み替えず53%の縮小率を示す',()=>{close(t.root.__test.preview().scale,1024/1920);assert.match(t.q('[data-preview-scale]').textContent,/53%.*縮小/);close(parseFloat(t.q('[data-preview-space]').style.width),1024);close(parseFloat(t.q('[data-preview-window]').style.height),576);});
 await t.drag({id:'offer-tide'},'build',({x,y,s,ghost})=>check('縮小中のドラッグ像がポインターとの掴み位置を維持する（注入矩形）',()=>{const r=ghost.getBoundingClientRect();close(r.left+24*s,x);close(r.top+24*s,y);}));
 check('縮小中も横方向のドラッグで取得と編成を未払いで行える',()=>{assert(t.snap().draft.deck.includes('pending-offer-tide'));assert.equal(t.snap().current.wallet,6);assert.equal(t.q('[data-unit="pending-offer-tide"]').dataset.zoneItem,'build');});
 const pending=t.snap();t.mode('actual');
 check('原寸へ切り替えても下書きと編成を保持し、1設計pxを1CSSpxで表示する',()=>{assert.equal(t.root.__test.preview().scale,1);assert.match(t.q('[data-preview-scale]').textContent,/100%.*1:1/);assert.equal(t.q('[data-preview-space]').style.width,'1920px');assert.deepEqual(t.snap(),pending);});
 await t.drag({uid:'pending-offer-tide'},'reserve');await t.drag({uid:'pending-offer-tide'},'offer');
 check('原寸でも横ドラッグの取り外しと取得取消が同じ個体へ作用する',()=>{assert.deepEqual(t.snap().current,initial);assert.deepEqual(t.snap().draft.deck,initial.deck);assert.deepEqual(t.snap().draft.offers,[]);});
 t.click('tab',{id:'passive'});t.click('detail',{id:'offer-long'});const opened=t.snap();t.mode('fit');
 check('詳細を開いたまま表示倍率を変更でき、最長名称を保持する',()=>{assert.deepEqual(t.snap(),opened);assert.equal(t.q('#cp-dialog-title').textContent,metrics.longest[0].name);assert.equal(t.q('.cp-reviewbar').inert,undefined);});
 t.click('stage',{},t.q('[data-overlay]'));t.click('add',{},t.q('[data-overlay]'));t.click('close',{},t.q('[data-overlay]'));t.click('review');t.click('commit',{},t.q('[data-overlay]'));
 check('取得・編成・確認・確定をボタンでも完結でき、支払いは確定時だけ',()=>{assert.equal(t.snap().current.wallet,2);assert(t.snap().current.equipment.includes('acquired-offer-long'));assert.equal(t.q('[data-unit="acquired-offer-long"]').dataset.pending,'false');});
 t.click('reset');await fillCapacityFixture(t);const heights={};
 check('候補4件・手元20種類・編成12枚を間引かず横並びへ表示する',()=>{for(const [z,n] of Object.entries({offer:4,reserve:20,build:12}))assert.equal(t.zone(z).querySelectorAll('article').length,n);assert.equal(t.q('[data-action="next"]'),null);});
 check('4＋20＋12が各領域と1920×1080内に収まる（寸法計算）',()=>{for(const [z,n] of Object.entries({offer:4,reserve:20,build:12})){const cols=d.columnsByZone[z],rows=Math.ceil(n/cols),h=rows*d.tileHeight+(rows-1)*d.gap+4,w=cols*d.tileWidth+(cols-1)*d.gap+4+16;assert(h<=d.gridHeights[z],z+' height');assert(w<=d.laneWidths[z],z+' width');heights[z]={count:n,needed_height:h,allocated_height:d.gridHeights[z]};}assert.equal(Object.values(d.laneWidths).reduce((a,b)=>a+b,0)+40+32+2,1920);assert.equal(878+32+8+32+128+2,1080);});
 t.click('stage',{id:'offer-tide'});
 check('容量超過した21種類目も保持し、移動した項目を一覧内で見せる',()=>{assert.equal(t.zone('reserve').querySelectorAll('article').length,21);assert(t.grid('reserve').scrollTop>0);assert.equal(t.grid('reserve').scrollLeft,0);assert.equal(t.snap().current.wallet,6);});
 const grid=t.grid('reserve');grid.scrollTop=0;const gr=grid.getBoundingClientRect(),s=t.root.__test.preview().scale;
 t.pointer('pointerdown',grid,gr.left+8,gr.top+60);t.pointer('pointermove',t.root,gr.left+8,gr.top+60-16);t.pointer('pointerup',t.root,gr.left+8,gr.top+60-16);
 check('余白パンのスクロール量も縮尺を補正する',()=>close(grid.scrollTop,16/s));
 const key=t.find('detail',{},t.zone('reserve'));key.dispatchEvent(new t.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 check('上下キーは新しい枠高と間隔に合わせて送る',()=>close(grid.scrollTop,16/s+88));
 const remembered=grid.scrollTop,beforeResize=t.snap();t.resize(736);
 check('会話幅の変化ではゲーム配置・下書き・スクロール位置を変えない',()=>{close(t.root.__test.preview().scale,736/1920);assert.deepEqual(t.snap(),beforeResize);assert.equal(t.grid('reserve').scrollTop,remembered);assert.equal(t.root.__test.layout().width,1920);});
 t.click('tab',{id:'passive'});t.click('tab',{id:'card'});
 check('分類を戻すと一覧スクロール位置を保持する',()=>assert.equal(t.grid('reserve').scrollTop,remembered));
 for(const width of [320,1280,1920]){t.resize(width);check(width+'pxの提示幅でも全体／原寸を切り替え、全項目を保持する',()=>{close(t.root.__test.preview().scale,Math.min(1,width/1920));t.mode('actual');assert.equal(t.root.__test.preview().scale,1);assert.equal(t.zone('reserve').querySelectorAll('article').length,21);t.mode('fit');});}
 check('今回の配置・縮尺・操作経路でDOM実行例外なし',()=>assert.deepEqual(runtimeErrors,[]));
 t.dom.window.close();
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'inline-manifest.json'),'utf8'));
 fs.writeFileSync(path.join(__dirname,'fhd-checks.json'),JSON.stringify({checked_at_utc:new Date().toISOString(),version:manifest.version,environment:{node:process.version,dom:'JSDOM 26.1.0'},scope:'1920×1080の横並び配置、表示倍率、縮尺付きドラッグと主要操作。矩形・hit test・captureは注入。実ブラウザー描画ではない。',inline_sha256:manifest.sha256,passed:checks.length,checks,capacity_fixture:{offers:4,reserve_kinds:20,deck:12,heights,source:'追加した所持品・候補は検査内だけ。共通データの有効な修飾札。本番初期配布の変更ではない。'},old_suites_rerun:false,unverified:['実ブラウザー描画・フォント実測','実ポインター・タッチ','IndexedDB','本編保存','ユーザー受入']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,runtimeErrors,heights}));
})().catch(e=>{console.error(e);process.exit(1);});
