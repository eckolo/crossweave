const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.CW_UI_JSDOM||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build.cjs'),{nameMetrics}=require('./name-metrics.cjs');
const checks=[],runtimeErrors=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,fn)=>{fn();checks.push({name,passed:true});};
async function start(width=1024){
 const {html}=await build({testing:true}),vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')runtimeErrors.push(String(e));});
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.getBoundingClientRect=function(){const widthHere=this.classList.contains('cp-piece')?212:width,height=this.classList.contains('cp-piece')?48:width*9/16;return {x:0,y:0,left:0,top:0,right:widthHere,bottom:height,width:widthHere,height};};w.HTMLElement.prototype.setPointerCapture=function(id){this.__capture=id;};w.HTMLElement.prototype.hasPointerCapture=function(id){return this.__capture===id;};w.HTMLElement.prototype.releasePointerCapture=function(){delete this.__capture;};}});
 const root=dom.window.document.getElementById('cw-acquisition-review');assert(root.__test,'UI did not start');
 const q=s=>root.querySelector(s),snap=()=>JSON.parse(JSON.stringify(root.__test.snapshot())),zone=z=>q('section[data-zone="'+z+'"]'),grid=z=>zone(z).querySelector('[data-scroll-zone]');
 const find=(action,match={},scope=root)=>[...scope.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===action&&Object.entries(match).every(([k,v])=>b.dataset[k]===v));
 const click=(action,match={},scope=root)=>{const b=find(action,match,scope);assert(b,'Missing '+action+JSON.stringify(match));assert(!b.disabled,'Disabled '+action);b.click();};
 let hit=null;dom.window.document.elementFromPoint=()=>hit;
 const pointer=(type,target,x=30,y=25)=>{const e=new dom.window.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true},pointerType:{value:'mouse'}});target.dispatchEvent(e);};
 const drag=async(match,to)=>{pointer('pointerdown',find('detail',match));await wait(240);assert(q('.cp-drag-ghost'));hit=zone(to);pointer('pointermove',root,300,150);pointer('pointerup',root,300,150);};
 return {dom,root,q,snap,zone,grid,find,click,pointer,drag};
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
 const metrics=await nameMetrics();
 check('最長25文字を縮字せず2行へ置き、44pxの操作を横へ並べて212×48pxに収める',()=>{const d=metrics.tile;assert.equal(metrics.max_length,25);assert.equal(metrics.full_width_character_budget,26);assert.equal(d.name_font,12);assert.equal(d.width,2*d.border+d.name_width+8+d.action_width);assert.equal(d.height,2*d.border+Math.max(d.name_height+d.metadata_height+d.body_vertical_padding,d.action_height));assert.equal(d.action_height,44);});
 const t=await start(),initial=t.snap().current;
 check('3領域を画面幅を使う横長の段として配置する',()=>{assert.equal(t.q('[data-board-scroll]').dataset.orientation,'rows');assert.deepEqual([...t.q('[data-board-scroll]').children].map(e=>e.dataset.zone),['offer','reserve','build']);for(const z of ['offer','reserve','build'])assert.equal(t.grid(z).style.getPropertyValue('--cp-columns'),'4');});
 check('初期の候補・手元7種類・編成12枚が一度に入る設計容量を持つ',()=>{const d=t.root.__test.layout();assert(d.capacity.offer>=2);assert(d.capacity.reserve>=7);assert(d.capacity.build>=12);assert.equal(t.zone('build').querySelectorAll('article').length,12);});
 t.click('stage',{id:'offer-tide'});
 check('一覧は右端の主要操作1つにし、取消は詳細から引き続き使える',()=>{const row=t.q('article[data-unit="pending-offer-tide"]');assert.deepEqual([...row.querySelectorAll('.cp-item-actions button')].map(x=>x.textContent),['編成']);t.click('detail',{uid:'pending-offer-tide'});assert(t.find('unstage',{},t.q('[data-overlay]')));t.click('unstage',{},t.q('[data-overlay]'));assert.deepEqual(t.snap().draft.offers,[]);t.click('close',{},t.q('[data-overlay]'));});
 await t.drag({id:'offer-tide'},'build');
 check('段をまたぐドラッグでも取得と編成を未払いで反映する',()=>{assert(t.snap().draft.deck.includes('pending-offer-tide'));assert.equal(t.snap().current.wallet,6);assert.equal(t.q('article[data-unit="pending-offer-tide"]').dataset.zoneItem,'build');});
 await t.drag({uid:'pending-offer-tide'},'reserve');await t.drag({uid:'pending-offer-tide'},'offer');
 check('段の変更後も外す・棚へ戻して取消が同じ個体へ作用する',()=>{assert.deepEqual(t.snap().draft.offers,[]);assert.deepEqual(t.snap().draft.deck,initial.deck);assert.deepEqual(t.snap().current,initial);});
 t.click('tab',{id:'passive'});
 check('最長名称の心得を全文保持し、同じ横長枠を使う',()=>{assert.equal(t.find('detail',{id:'offer-long'}).querySelector('strong').textContent,metrics.longest[0].name);const d=t.root.__test.layout();assert.equal(d.tileWidth,212);assert.equal(d.tileHeight,48);assert.equal(d.orientation,'rows');});
 t.click('reset');await fillCapacityFixture(t);
 check('候補4件・手元20種類・編成12枚の実DOMを間引かず表示する',()=>{assert.equal(t.zone('offer').querySelectorAll('article').length,4);assert.equal(t.zone('reserve').querySelectorAll('article').length,20);assert.equal(t.zone('build').querySelectorAll('article').length,12);assert.equal(t.root.querySelectorAll('[data-action="next"],[data-action="prev"]').length,0);});
 const d=t.root.__test.layout(),heights={};
 check('標準1024pxで4＋20＋12を領域内に収め、16:9の高さも越えない（寸法計算）',()=>{for(const [z,count] of Object.entries({offer:4,reserve:20,build:12})){const rows=Math.ceil(count/d.columns),height=rows*48+(rows-1)*2+4;assert(height<=d.gridHeights[z],z);assert(count<=d.capacity[z]);heights[z]={count,needed_height:height,allocated_height:d.gridHeights[z]};}assert(Object.values(d.laneHeights).reduce((a,b)=>a+b,0)+106<=1024*9/16+.01);assert(4*212+3*2+4+20+52+10<=1024);});
 // One new offscreen kind: the move must reveal the actual new row in a row-major grid.
 const f=t.root.__test.fixture,newKey=f.offers.find(x=>x.id==='offer-tide').key;
 // Pending and owned are separate display groups, so this creates row 6 without hiding any item.
 for(const [k,v] of Object.entries({clientWidth:962,clientHeight:d.gridHeights.reserve}))Object.defineProperty(t.grid('reserve'),k,{value:v,configurable:true});
 t.click('stage',{id:'offer-tide'});
 check('容量を越える取得は切り捨てず、増えた行まで縦方向に移動する',()=>{assert.equal(t.zone('reserve').querySelectorAll('article').length,21);assert(t.grid('reserve').scrollTop>0);assert.equal(t.grid('reserve').scrollLeft,0);assert(t.snap().draft.offers.includes('offer-tide'));assert.equal(t.snap().current.wallet,6);});
 let grid=t.grid('reserve'),before=grid.scrollTop;t.pointer('pointerdown',grid,100,150);t.pointer('pointermove',t.root,100,120);t.pointer('pointerup',t.root,100,120);
 check('余白ドラッグで行の続きへ連続スクロールできる',()=>assert.equal(grid.scrollTop,before+30));
 const keyTarget=t.find('detail',{},t.zone('reserve'));before=grid.scrollTop;keyTarget.dispatchEvent(new t.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 check('上下キーも新しい行間に合わせて一覧を送る',()=>assert.equal(grid.scrollTop,before+50));
 const remembered=grid.scrollTop;t.click('tab',{id:'passive'});t.click('tab',{id:'card'});
 check('分類切替でも縦スクロール位置を保持する',()=>assert.equal(t.grid('reserve').scrollTop,remembered));
 const capacities=[736,880,1024,1280].map(width=>{const g=t.root.__test.layout(width,{offer:4,reserve:20,build:12});return {width,columns:g.columns,visible:g.capacity,orientation:g.orientation};});
 t.dom.window.close();
 for(const width of [320,736]){
  const u=await start(width);u.click('detail',{id:'offer-tide'});u.click('stage',{},u.q('[data-overlay]'));u.click('add',{},u.q('[data-overlay]'));u.click('close',{},u.q('[data-overlay]'));
  check(width+'pxの狭幅でも札寸法を変えず、全項目と操作経路を保持する（DOM）',()=>{assert(u.snap().draft.deck.includes('pending-offer-tide'));assert.equal(u.zone('build').querySelectorAll('article').length,13);assert.equal(u.root.__test.layout().tileWidth,212);assert.equal(u.root.__test.layout().tileHeight,48);});u.dom.window.close();
 }
 check('今回の配置・操作経路のDOM実行例外なし',()=>assert.deepEqual(runtimeErrors,[]));
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'inline-manifest.json'),'utf8'));
 fs.writeFileSync(path.join(__dirname,'wide-checks.json'),JSON.stringify({checked_at_utc:new Date().toISOString(),version:'two-stage-ui-4',environment:{node:process.version,dom:'JSDOM 26.1.0'},scope:'横長の共通枠、一覧容量、配置変更後の主要操作。矩形・hit test・captureを注入したDOM検査と寸法計算。',inline_sha256:manifest.sha256,passed:checks.length,checks,capacity_fixture:{offers:4,reserve_kinds:20,deck:12,source:'共通データの有効な修飾札から確認用の所持品を追加。経済・本番初期所持の変更ではない。',heights},capacities,old_suites_rerun:false,retained_results:['checks.json: v1, 24','structure-checks.json: v2, 21','drag-checks.json: v3, 36'],unverified:['実ブラウザー描画・文字の収まり','実ポインター・タッチ','IndexedDB','本編保存','長期プレイ時の所持数分布','ユーザー受入']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,runtimeErrors,capacities}));
})().catch(e=>{console.error(e);process.exitCode=1;});
