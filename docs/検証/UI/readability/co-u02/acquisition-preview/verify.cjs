const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.CW_UI_JSDOM||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build.cjs');
const checks=[],runtimeErrors=[],calls={network:0,indexedDB:0};
function check(name,fn){fn();checks.push({name,passed:true});}
async function start(width=1024){
 const {html}=await build({testing:true}),vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')runtimeErrors.push(String(e));});
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://ui-review.invalid',virtualConsole:vc,beforeParse(w){
  w.HTMLElement.prototype.getBoundingClientRect=function(){return {width,height:width*9/16,x:0,y:0,top:0,left:0,right:width,bottom:width*9/16};};
  w.fetch=()=>{calls.network++;throw Error('Unexpected network call');};
  Object.defineProperty(w,'indexedDB',{get(){calls.indexedDB++;throw Error('Unexpected IndexedDB call');}});
 }});
 const root=dom.window.document.getElementById('cw-acquisition-review');
 assert(root.__test,'UI did not start');
 const q=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],snap=()=>JSON.parse(JSON.stringify(root.__test.snapshot()));
 const find=(action,match={})=>all('button[data-action]').find(b=>b.dataset.action===action&&Object.entries(match).every(([k,v])=>b.dataset[k]===v));
 const click=(action,match={})=>{const b=find(action,match);assert(b,'Missing '+action+' '+JSON.stringify(match));assert(!b.disabled,'Disabled '+action);b.click();return b;};
 const close=()=>{if(snap().view.dialog)click('close');};
 const tab=id=>{close();click('tab',{id});};
 const detail=(key,id)=>{close();if(id)tab('offers');const b=find('detail',id?{key,id}:{key});assert(b,'Missing detail '+key);b.click();};
 return {dom,root,q,all,snap,find,click,close,tab,detail};
}
(async()=>{
 const t=await start(),initial=t.snap().current,key=id=>t.root.__test.fixture.offers.find(x=>x.id===id).key;
 check('開始時：着想6、取得予定なし、札12枚、心得枠6',()=>{assert.equal(initial.wallet,6);assert.equal(t.snap().draft.offers.length,0);assert.equal(initial.deck.length,12);assert.equal(initial.equipment.length,3);});
 t.click('stage',{id:'offer-link'});
 check('取得予定への追加は実残高・所持・確定編成を変えない',()=>{assert.deepEqual(t.snap().current,initial);assert.match(t.q('.cp-wallet').getAttribute('aria-label'),/現在6、支払予定4、確定後2/);});
 t.detail(key('offer-link'),'offer-link');t.click('add',{key:key('offer-link')});t.close();t.click('review');
 check('心得枠9/8の未確定編成を表示し、確定を拒否する',()=>{assert.match(t.q('.cp-problems').textContent,/枠が1超過/);assert(t.find('commit').disabled);assert.equal(t.snap().current.wallet,6);});
 t.tab('skills');t.detail('AO1:passive:PS03');t.click('remove',{key:'AO1:passive:PS03'});t.close();t.click('review');
 check('既存心得との入替後に、条件・効果と支払いを確認できる',()=>{assert(!t.find('commit').disabled);assert.match(t.q('.cp-dialog-scroll').textContent,/直前の本人の一致と異なる属性/);assert.match(t.q('.cp-dialog-scroll').textContent,/探査を20加算/);});
 const firstPay=t.find('commit');t.click('commit');firstPay.click();
 check('確定で1回だけ支払って取得・編成を同時反映する',()=>{const s=t.snap();assert.equal(s.current.wallet,2);assert.equal(s.current.units.length,initial.units.length+1);assert(s.current.equipment.includes('acquired-offer-link'));assert(!JSON.stringify(s.current).includes('pending-'));assert.equal(s.draft.offers.length,0);assert(t.find('review').disabled);});
 t.detail(key('offer-link'));t.click('remove',{key:key('offer-link')});t.close();t.click('review');t.click('commit');
 check('正式取得後は無料で外せる。所持は残り、全額返還や再習得は発生しない',()=>{assert.equal(t.snap().current.wallet,2);assert(t.snap().current.units.some(x=>x.uid==='acquired-offer-link'));assert(!t.snap().current.equipment.includes('acquired-offer-link'));});
 t.click('reset');t.click('stage',{id:'offer-guard'});t.detail(key('offer-guard'),'offer-guard');t.click('add',{key:key('offer-guard')});
 check('修飾付き心得も別の習得なしに編成でき、確定前は未払い',()=>{assert.equal(t.snap().draft.equipment.length,4);assert.equal(t.snap().current.wallet,6);});
 t.click('unstage',{id:'offer-guard'});
 check('取得取消は予定分だけを除き、同じ種類の所持心得・装備を残す',()=>{assert.deepEqual(t.snap().draft.equipment,initial.equipment);assert.deepEqual(t.snap().current,initial);assert.equal(t.snap().draft.offers.length,0);});
 t.click('stage',{id:'offer-tide'});t.detail(key('offer-tide'),'offer-tide');t.click('add',{key:key('offer-tide')});t.close();t.click('review');
 check('取得予定の札を加えた13枚編成は確定できない',()=>{assert.match(t.q('.cp-problems').textContent,/現在13枚/);assert(t.find('commit').disabled);});
 t.tab('deck');t.detail('AO1:card:f');t.click('remove',{key:'AO1:card:f'});t.close();t.tab('skills');t.tab('offers');
 check('札組・心得・取得の画面移動後も同じ未確定内容を保持する',()=>{const s=t.snap();assert.equal(s.draft.deck.length,12);assert(s.draft.deck.includes('pending-offer-tide'));assert.equal(s.current.wallet,6);});
 t.detail(key('offer-tide'),'offer-tide');t.click('remove',{key:key('offer-tide')});
 check('編成から外すだけなら取得予定と支払予定4が残る',()=>{assert.deepEqual(t.snap().draft.offers,['offer-tide']);assert.match(t.q('.cp-wallet').getAttribute('aria-label'),/支払予定4/);assert(!t.snap().draft.deck.includes('pending-offer-tide'));});
 t.click('unstage',{id:'offer-tide'});
 check('取得をやめると支払予定0になり、他の編成編集は勝手に戻らない',()=>{assert.equal(t.snap().draft.offers.length,0);assert.equal(t.snap().draft.deck.length,11);assert.equal(t.snap().current.wallet,6);});
 t.click('discard');
 check('全取消は取得予定・札組・心得を最後の確定状態へ戻す',()=>{assert.deepEqual(t.snap().draft,{offers:[],deck:initial.deck,equipment:initial.equipment});});
 t.click('stage',{id:'offer-tide'});t.detail(key('offer-tide'),'offer-tide');t.click('add',{key:key('offer-tide')});t.tab('deck');t.detail('AO1:card:f');t.click('remove',{key:'AO1:card:f'});t.close();t.click('review');t.click('commit');
 check('札も確定時だけ支払い、取得した1枚をそのまま札組へ反映する',()=>{const s=t.snap();assert.equal(s.current.wallet,2);assert.equal(s.current.deck.length,12);assert(s.current.deck.includes('acquired-offer-tide'));assert(s.current.units.some(x=>x.uid==='acquired-offer-tide'));});
 t.click('reset');t.click('stage',{id:'offer-force'});t.detail(key('offer-force'),'offer-force');t.click('add',{key:key('offer-force')});t.close();t.click('review');
 check('着想不足と同種札上限を示し、部分的な支払い・取得をしない',()=>{assert.match(t.q('.cp-problems').textContent,/着想が2不足/);assert.match(t.q('.cp-problems').textContent,/牽制は2枚まで/);assert(t.find('commit').disabled);assert.deepEqual(t.snap().current,initial);});
 t.close();t.click('discard');t.click('stage',{id:'offer-link'});t.click('review');
 check('編成に入れず取得する場合も、確認画面で支払対象と分かる',()=>{assert.match(t.q('.cp-dialog-scroll').textContent,/編成には入れない/);assert(!t.find('commit').disabled);});
 check('詳細・確定の主要操作はスクロール本文の外にある',()=>{assert(!t.q('.cp-dialog-scroll').contains(t.find('commit')));assert(t.q('.cp-dialog-actions').contains(t.find('commit')));});
 t.root.dispatchEvent(new t.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 check('Escapeで窓だけを閉じ、未確定内容は保持する',()=>{assert.equal(t.snap().view.dialog,null);assert.deepEqual(t.snap().draft.offers,['offer-link']);});
 check('曖昧な旧操作と基本型の特別扱いを画面に出さない',()=>{assert.doesNotMatch(t.root.textContent,/忘れる|覚えるだけ|基本型|習得案|忘れる案/);});
 t.dom.window.close();
 for(const width of [320,440,736,1024]){
  const u=await start(width);let visited=new Set(),guard=0;
  while(true){u.all('.cp-grid [data-action="detail"]').forEach(x=>visited.add(x.dataset.id));if(u.find('next').disabled)break;u.click('next');assert(++guard<10);}
  check(width+'pxの入力幅で全候補へページ移動し、窓の操作へ到達できる（DOM確認）',()=>{assert.equal(visited.size,4);const d=u.all('.cp-grid [data-action="detail"]')[0];d.click();assert(u.q('.cp-dialog-actions button'));assert(!u.q('.cp-dialog-scroll').contains(u.q('.cp-dialog-actions')));});
  u.dom.window.close();
 }
 check('実行例外・外部通信・IndexedDB呼出しなし',()=>{assert.deepEqual(runtimeErrors,[]);assert.equal(calls.network,0);assert.equal(calls.indexedDB,0);});
 const result={checked_at_utc:new Date().toISOString(),version:'two-stage-ui-1',environment:{node:process.version,dom:'JSDOM 26.1.0'},scope:'新規の二段階取得UI案だけ。矩形の入力値を与えたDOM操作。描画検査ではない。',checks,passed:checks.length,calls,unverified:['実ブラウザー描画','タッチ','IndexedDB','本編セーブ接続','戦闘での試用','ユーザー受入'],old_suites_rerun:false};
 fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,calls}));
})().catch(e=>{console.error(e);process.exitCode=1;});
