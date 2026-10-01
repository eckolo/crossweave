// Focused review-entry checks. No historical suite or balance run is invoked.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {checkpoints, createCheckpoint} from './checkpoints.mjs';
import {loadDocument} from './source.mjs';
import {mountReview} from './picker.mjs';
const require = createRequire(import.meta.url);
const {JSDOM, VirtualConsole} = require(process.env.CW_JSDOM_PATH || 'jsdom');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const checks = [], errors = [], check = (name, value) => {assert(value, name); checks.push({name, pass:true});};
const fetchFile = async url => new Response(await fs.readFile(url));
const documents = new Map();
const source = async name => {
  if (!documents.has(name)) documents.set(name, await loadDocument(name, fetchFile));
  return structuredClone(documents.get(name));
};
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(fn) {for (let n=0;n<400;n++) {if (fn()) return; await pause();} throw Error('timeout');}
let frameWidth=1024;
const resize = [], visibility = [], vc = new VirtualConsole();
vc.on('jsdomError', e => {if (e.type !== 'css parsing') errors.push(String(e));});
const dom = new JSDOM(await fs.readFile(path.join(here, 'index.html'), 'utf8'), {
  runScripts:'outside-only', pretendToBeVisual:true,
  url:'https://ui-check.invalid/review/index.html?case=offers', virtualConsole:vc
});
const w = dom.window;
w.structuredClone = structuredClone;
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
Object.defineProperty(w, 'crypto', {value:crypto.webcrypto});
w.ResizeObserver = class {constructor(fn){resize.push(fn);} observe(){} disconnect(){}};
w.IntersectionObserver = class {
  constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}
  observe(t){this.targets.push(t);} disconnect(){this.targets=[];}
};
w.matchMedia = () => ({matches:false});
let indexedDBCalls = 0;
const forbiddenIDB = {open(){indexedDBCalls++;throw Error('review must not touch IndexedDB');}};
const originalIDB = globalThis.indexedDB; globalThis.indexedDB = forbiddenIDB; w.indexedDB = forbiddenIDB;
w.eval(await fs.readFile(path.join(here, '../dist/crossweave-ui.js'), 'utf8'));
const host = w.document.querySelector('[data-review]'), root = host.querySelector('#crossweave-journey');
const rect=()=>({width:frameWidth,height:frameWidth*9/16,left:0,top:0,right:frameWidth,bottom:frameWidth*9/16});
root.getBoundingClientRect=rect;
const oldRect=w.HTMLElement.prototype.getBoundingClientRect;w.HTMLElement.prototype.getBoundingClientRect=function(){return this.classList.contains('cj-shell')||this.classList.contains('cw-explore')?rect():oldRect.call(this);};
let sent=[];
let lastPrepared, prepareCalls = 0, delay = null, fail = false;
const prepare = async id => {
  prepareCalls++;
  if (delay) await delay;
  if (fail) throw Error('fixture_unavailable');
  lastPrepared = await createCheckpoint(id, source);const controller=lastPrepared.controller;lastPrepared.controller=new Proxy(controller,{get(target,key){return key==='execute'?command=>{sent.push(structuredClone(command));return target.execute(command);}:typeof target[key]==='function'?target[key].bind(target):Reflect.get(target,key);}});return lastPrepared;
};
const review = mountReview(host, {ui:w.CrossweaveUI, prepare});
const idle = async () => {await pause();await until(() => !review.state().pending && root.getAttribute('aria-busy') !== 'true' && !review.app?.session.state().pending);};
const el = selector => {const item = root.querySelector(selector);assert(item, 'missing ' + selector);return item;};
const click = async selector => {const item = typeof selector === 'string' ? el(selector) : selector;assert(!item.disabled,'disabled '+item.outerHTML+' state '+JSON.stringify({localDirty:review.app.session.state().localDirty,stale:review.app.session.state().stale,pending:review.app.session.state().pending,draft:review.app.session.state().draft}));item.click();await idle();};
const readMounted = async () => {
  for (const observer of visibility) {
    const entries = observer.targets.filter(t => root.contains(t)).map(target => ({target, isIntersecting:true, intersectionRatio:1}));
    if (entries.length) observer.fn(entries);
  }
  await idle();
};
const s=()=>review.app.session,d=()=>s().state().view.display_data;
const open=async id=>{assert(await review.show(id));await idle();};
const visiblePiece=async id=>{if(root.querySelector('[data-piece="'+id+'"]'))return root.querySelector('[data-piece="'+id+'"]');for(let i=0;i<20;i++){const prev=root.querySelector('[data-j="page"][data-step="-1"]');if(!prev||prev.disabled)break;await click(prev);}for(let i=0;i<20;i++){const b=root.querySelector('[data-piece="'+id+'"]');if(b)return b;const next=root.querySelector('[data-j="page"][data-step="1"]');if(!next||next.disabled)break;await click(next);}throw Error('piece missing '+id);};

const chooseFilter=async value=>{const select=el('[data-skill-filter]');select.value=value;select.dispatchEvent(new w.Event('change',{bubbles:true}));await idle();};
const resizeTo=async width=>{frameWidth=width;for(const fn of resize)fn([{contentRect:{width}}]);await idle();};
try {
 await review.ready;await open('skills-current');
 check('自然保存から公開commitで習得2種・装備1種の確認場面を用意する',d().home.economy.learned.length===2&&d().home.equipment.entries.length===1&&lastPrepared.commands.length===1&&lastPrepared.commands[0].type==='commit_preparation');
 check('札組・心得・購入・所持の名前を共通ナビに出す',Array.from(root.querySelectorAll('.cj-edit-tabs button')).map(x=>x.dataset.j).join(',')==='deck,skills,offers,owned'&&root.querySelector('[data-j="offers"]').textContent==='購入');
 const unknown=d().home.learning_options.find(x=>!d().home.economy.learned.some(k=>k.base===x.base)),unknownId='base:'+unknown.base;
 await visiblePiece(unknownId);
 check('未習得の一覧から覚えるだけ・覚えて装備を直接選べる',el('[data-piece="'+unknownId+'"] [data-j="learn"]').textContent==='覚えるだけ'&&el('[data-piece="'+unknownId+'"] [data-j="equip"]').textContent==='覚えて装備');
 const beforeFunds=d().home.economy.unspent_units,beforeEquipment=JSON.stringify(d().home.equipment);
 await click('[data-piece="'+unknownId+'"] [data-j="learn"]');
 check('覚えるだけは変更案の習得を増やし、装備と確定済み所持金を変えない',s().state().draft.next_preparation.learn.includes(unknown.base)&&JSON.stringify(d().home.equipment)===beforeEquipment&&d().home.economy.unspent_units===beforeFunds&&s().state().draft.next_preparation.equipment.length===1);
 check('一覧に現在の未習得と覚える予定を併記する',el('[data-piece="'+unknownId+'"]').textContent.includes('未習得 → 覚える予定'));
 await chooseFilter('learned');
 check('習得済みフィルタは未確定の習得案を混ぜない',root.querySelectorAll('[data-piece]').length===2&&!root.querySelector('[data-piece="'+unknownId+'"]'));
 await click('[data-j="commit"]');await chooseFilter('learned');
 check('実commit後に習得だけ反映・費用を支払い、装備は1種のまま',d().home.economy.learned.length===3&&d().home.equipment.entries.length===1&&d().home.economy.unspent_units===beforeFunds-unknown.cost_units&&root.querySelectorAll('[data-piece]').length===3);
 await chooseFilter('equipped');
 check('装備中フィルタは現在の装備だけを表示する',root.querySelectorAll('[data-piece]').length===1&&el('[data-piece]').dataset.piece===d().home.equipment.entries[0].id&&el('[data-piece]').textContent.includes('装備中'));
 await chooseFilter('all');
 const last=d().home.learning_options.find(x=>!d().home.economy.learned.some(k=>k.base===x.base)),lastId='base:'+last.base;
 await visiblePiece(lastId);await click('[data-piece="'+lastId+'"] [data-j="equip"]');
 check('覚えて装備は習得と装備の両方を変更案へ入れる',s().state().draft.next_preparation.learn.includes(last.base)&&s().state().draft.next_preparation.equipment.includes(lastId));
 await click('[data-j="detail"][data-id="'+lastId+'"]');
 check('詳細の条件・効果は別項目で、操作部は説明スクロールの外にある',el('.cw-effect-structure dt').textContent==='条件：'&&Array.from(root.querySelectorAll('.cw-effect-structure dt')).some(x=>x.textContent==='効果：')&&el('.cj-detail-actions [data-j="equip"]').parentElement.parentElement.classList.contains('cj-inspect-item')&&!el('.cj-detail-actions [data-j="equip"]').closest('.cj-inspect-scroll'));
 const draftBeforeResize=JSON.stringify(s().state().draft);
 for(const width of [1024,736,600,320]){
  await resizeTo(width);
  const box=el('[data-inspector]'),q={left:parseFloat(box.style.left),top:parseFloat(box.style.top),width:parseFloat(box.style.width),height:parseFloat(box.style.height)};
  check(width+'pxで窓全体と44pxの上端・下端操作領域が枠内に収まる',q.left>=0&&q.top>=0&&q.left+q.width<=width&&q.top+q.height<=width*9/16&&q.height>=88&&el('.cj-detail-actions [data-j="equip"]'));
  check(width+'pxへのresizeで窓と下書きを保持する',review.app.state().windows.some(x=>x.id===lastId)&&JSON.stringify(s().state().draft)===draftBeforeResize);
 }
 await resizeTo(1024);await click('[data-j="close-item"]');await click('[data-j="commit"]');
 check('覚えて装備の実commit後に両方が現在状態となる',d().home.economy.learned.length===4&&d().home.equipment.entries.some(x=>x.id===lastId));
 for(const width of [1024,736,600,320]){
  await resizeTo(width);await open('skills-current');
  const ids=d().home.learning_options.map(x=>'base:'+x.base),sizes=[];
  for(const [index,left] of [[0,8],[1,width/2]]){
   await visiblePiece(ids[index]);const trigger=el('[data-j="detail"][data-id="'+ids[index]+'"]');trigger.getBoundingClientRect=()=>({left,top:48,width:100,height:44,right:left+100,bottom:92});await click(trigger);
   const box=el('[data-inspector]');sizes.push([box.style.width,box.style.height]);await click('[data-j="close-item"]');
  }
  check(width+'pxで端と中央から開く窓の寸法が同じ',JSON.stringify(sizes[0])===JSON.stringify(sizes[1]));
  await visiblePiece(ids[0]);await click('[data-j="detail"][data-id="'+ids[0]+'"]');await click('[data-j="pin"]');await visiblePiece(ids[1]);await click('[data-j="detail"][data-id="'+ids[1]+'"]');
  const panes=[...root.querySelectorAll('[data-inspector]>.cj-inspect-item')],rects=panes.map(x=>({w:parseFloat(x.style.width),h:parseFloat(x.style.height),l:parseFloat(x.style.left),t:parseFloat(x.style.top)}));
  check(width+'pxで固定した親窓と次の窓が同寸法・重なりなし',rects.length===2&&rects[0].w===rects[1].w&&rects[0].h===rects[1].h&&rects[0].l+rects[0].w<=rects[1].l&&rects[1].l+rects[1].w<=width&&rects.every(r=>r.t+r.h<=width*9/16));
  for(const pane of panes)check(width+'pxの二枚窓でも習得・装備操作を別領域に持つ',pane.querySelector('.cj-detail-actions>button')&&!pane.querySelector('.cj-inspect-scroll [data-j="equip"]'));
 }
 // Four catalogue tabs use the same geometry and page contract; no tall icons.
 for(const width of [1024,736,600,320]){
  await resizeTo(width);await open('skills-current');
  for(const tab of ['deck','skills','offers']){
   await click('[data-j="'+tab+'"]');const expected=tab==='deck'?d().home.free_card_options:tab==='skills'?d().home.learning_options.map(x=>'base:'+x.base):d().home.candidates.map(x=>x.id),visited=new Set();
   for(let page=0;page<30;page++){for(const tile of root.querySelectorAll('[data-piece]')){visited.add(tile.dataset.piece);assert(tile.querySelector('.cj-item-face'));assert(tile.querySelector('.cj-item-actions'));assert(!tile.querySelector('.cj-card-art'));}const next=root.querySelector('[data-j="page"][data-step="1"]');if(!next||next.disabled)break;await click(next);}
   check(width+'px '+tab+'の一覧末尾へページ操作だけで到達する',expected.every(id=>visited.has(id)));
  }
  const g=w.CrossweaveUI.journeyLayout(width,1),many=w.CrossweaveUI.journeyLayout(width,50);
  check(width+'pxで件数によってカードの縦面積を増やさない',g.rowHeight===many.rowHeight&&g.rowHeight<=104&&g.rowHeight>=88);
 }
 await resizeTo(320);await open('skills-current');await click('[data-j="menu"]');const menuActions=new Set();
 for(let page=0;page<10;page++){for(const b of root.querySelectorAll('.cj-menu-grid button'))menuActions.add(b.dataset.j);const next=root.querySelector('[data-j="menu-page"][data-step="1"]');if(!next||next.disabled)break;await click(next);}
 check('320pxのメニュー末尾まで固定のページ操作で到達する',menuActions.has('records')&&menuActions.has('texts')&&menuActions.has('owned')&&menuActions.has('data'));
 await resizeTo(1024);await open('offers');
 const modified=d().home.candidates.find(x=>d().details[x.id].effect_text?.includes('／'));
 await click('[data-j="detail"][data-id="'+modified.id+'"]');
 const effects=[...root.querySelectorAll('.cw-effect-structure dd span')].map(x=>x.textContent);
 check('修飾込みの公開効果を短い項目へ分割する',effects.includes('探査 +30')&&effects.includes('行動間隔 +1'));
 await click('[data-j="close-item"]');const offer=d().home.candidates[0];await click('[data-j="buy-preview"][data-id="'+offer.id+'"]');await click('[data-j="buy-confirm"]');
 check('購入で所持個体を得るが心得の習得・装備は増えない',d().home.owned.length===1&&d().home.economy.learned.length===0&&d().home.equipment.entries.length===0);
 let owned=d().home.owned[0].id;await click('[data-j="lock"][data-id="'+owned+'"]');owned=d().home.owned[0].id;
 check('保護は実set_item_lockへ接続し、着想への変換を防ぐ',d().home.owned[0].locked&&el('[data-j="convert-select"]').disabled&&root.textContent.includes('保護を解除')&&!root.textContent.includes('ロック'));
 await click('[data-j="lock"][data-id="'+owned+'"]');owned=d().home.owned[0].id;await click('[data-j="convert-select"][data-id="'+owned+'"]');await click('[data-j="convert-preview"]');
 check('変換前に個体を失うことと公開見積額が分かる',root.textContent.includes('この個体を失い、着想 +')&&root.textContent.includes('最後の1点')&&el('[data-j="convert-confirm"]').textContent==='1点を着想に変える');
 const afterQuote=s().state().quote.unspent_after_units;await click('[data-j="convert-confirm"]');
 check('実convert_itemsで所持を失い、公開見積どおりの着想となる',d().home.owned.length===0&&d().home.economy.unspent_units===afterQuote);
 await click('[data-j="offers"]');
 check('購入済みは自然な探索成果の文言で示し、各候補を全部買ったように見せない',root.textContent.includes('この探索の成果から1点購入済み')&&!root.querySelector('[data-piece]'));
 await open('explore-d03');await click('[data-x-card]');await until(()=>!!root.querySelector('[data-self-next]'));
 const preview=s().state().actionPreview,groups=w.CrossweaveUI.projectReservations(d(),preview),next=groups.find(g=>g.rows.some(r=>r.nextSelf));
 check('札選択時に公開next_self_reservationを行動予約列へ表示する',next.at===preview.next_self_reservation&&el('[data-self-next]').closest('li').dataset.at===String(next.at)&&el('[data-self-next]').textContent.includes('次'));
 for(const width of [600,320]){await resizeTo(width);check(width+'pxでは予測ボタン内に本人の次回位置を示す',el('.cw-explore').dataset.compact==='true'&&el('[data-x="preview"] .cw-next-position').textContent.startsWith('本人→')&&el('[data-x="preview"]').getAttribute('aria-label').includes('番目'));}
 await resizeTo(1024);
 const mock=structuredClone(preview),other=mock.current_reservations.find(r=>r.actor!==d().exploration.self.id);mock.next_self_reservation=other.at;
 const tied=w.CrossweaveUI.projectReservations(d(),mock).find(g=>g.at===other.at);
 check('同時刻は同じ予約グループに入れ、未来の優先順を決めない',tied.rows.some(r=>r.nextSelf)&&tied.rows.some(r=>r.actor===other.actor));
 mock.actor_changes[other.actor].active.after=false;
 check('一手後の退場が公開された相手を次回予約比較から除く',!w.CrossweaveUI.projectReservations(d(),mock).flatMap(g=>g.rows).some(r=>r.actor===other.actor));
 check('未対応・未到着の予測から次回予約を捏造しない',w.CrossweaveUI.projectReservations(d(),null)===null&&w.CrossweaveUI.projectReservations(d(),{supported:false})===null);
 const rev=s().state().view.meta.revision;await click('[data-x="use"]');await until(()=>s().state().view.meta.revision>rev);
 check('実play後に前の手の次回予測を残さない',!root.querySelector('[data-self-next]'));
 check('公開条件の未知の文は勝手に省略・補完しない',w.CrossweaveUI.explanationLines('未定の条件で特別な効果').join('')==='未定の条件で特別な効果');
 check('今回のUI操作で永続保存・外部通信・実行例外なし',indexedDBCalls===0&&errors.length===0);
 const files=['journey/view.js','journey/panels.js','journey/economy.js','journey/consistency.css','journey/layout.js','window-placement.js','card-properties.js','action-forecast.js','exploration.js','review/checkpoints.mjs','dist/crossweave-ui.js','dist/crossweave-ui.css'];
 const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,crypto.createHash('sha256').update(await fs.readFile(path.join(here,'..',file))).digest('hex')])));
 const result={id:'CW-M1-UI-CONSISTENCY-001',version:'0.13.0',node:process.version,jsdom:require(process.env.CW_JSDOM_PATH+'/package.json').version,checks,passed:checks.length,hashes,widths:[1024,736,600,320],environment:'Real Campaign and original MemoryStore; JSDOM DOM/events with synthetic rectangles',limitations:['Actual paint/font wrapping/touch not measured','Real IndexedDB not exercised','Tie/retirement projection checks use public-shaped inputs, not future actor simulation'],errors};
 await fs.writeFile(path.join(here,'../consistency/checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors}));
} finally {review.dispose();dom.window.close();globalThis.indexedDB=originalIDB;}
