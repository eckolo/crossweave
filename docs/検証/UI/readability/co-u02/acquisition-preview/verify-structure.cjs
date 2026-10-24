const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.CW_UI_JSDOM||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build.cjs');
const checks=[],runtimeErrors=[];const check=(name,fn)=>{fn();checks.push({name,passed:true});};
async function start(width=1024){
 const {html}=await build({testing:true}),vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')runtimeErrors.push(String(e));});
 const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.getBoundingClientRect=()=>({width,height:width*9/16,x:0,y:0,top:0,left:0,right:width,bottom:width*9/16});}});
 const root=dom.window.document.getElementById('cw-acquisition-review');assert(root.__test,'UI did not start');
 const q=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],snap=()=>JSON.parse(JSON.stringify(root.__test.snapshot()));
 const find=(action,match={},scope=root)=>[...scope.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===action&&Object.entries(match).every(([k,v])=>b.dataset[k]===v));
 const click=(action,match={},scope=root)=>{const b=find(action,match,scope);assert(b,'Missing '+action+JSON.stringify(match));assert(!b.disabled,'Disabled '+action);b.click();return b;};
 const zone=z=>q('section[data-zone="'+z+'"]');
 const clickInZone=(action,match,z)=>{while(find('prev',{zone:z},zone(z))&&!find('prev',{zone:z},zone(z)).disabled)click('prev',{zone:z},zone(z));while(!find(action,match,zone(z))&&find('next',{zone:z},zone(z))&&!find('next',{zone:z},zone(z)).disabled)click('next',{zone:z},zone(z));return click(action,match,zone(z));};
 const close=()=>{while(snap().view.dialog)click('close',{},q('[data-overlay]'));};
 return {dom,root,q,all,snap,find,click,clickInZone,zone,close};
}
(async()=>{
 const t=await start(),initial=t.snap().current;
 check('主分類は札・心得の2つ。操作の取得タブはない',()=>{assert.deepEqual(t.all('nav [data-action="tab"]').map(b=>b.textContent),['札','心得']);});
 check('候補・手元・編成の3領域を同時に出し、別の容器を割り当てる',()=>{for(const z of ['offer','reserve','build'])assert(t.zone(z).classList.contains('cp-lane-'+z));assert(t.zone('offer').querySelector('[data-zone-item="offer"]'));assert(t.zone('reserve').querySelector('[data-zone-item="reserve"]'));assert.equal(t.zone('build').querySelectorAll('[data-zone-item="build"]').length,12);});
 check('手元の数量は未編成分だけ。編成中の同じ個体を重複表示しない',()=>{const stock=[...t.zone('reserve').querySelectorAll('[data-unit]')].map(x=>x.dataset.unit);const equipped=[...t.zone('build').querySelectorAll('[data-unit]')].map(x=>x.dataset.unit);assert(stock.every(x=>!equipped.includes(x)));assert(!stock.includes('owned-f-0'));});
 const face=()=>t.q('article[data-unit="pending-offer-tide"]');
 t.click('stage',{id:'offer-tide'},t.zone('offer'));
 check('選ぶと候補が棚から消え、点線・時計付きで手元へ移る。未払い',()=>{assert(t.zone('offer').querySelector('.cp-offer-empty'));assert.equal(face().dataset.zoneItem,'reserve');assert.equal(face().dataset.pending,'true');assert(face().querySelector('[data-lucide="clock-3"]'));assert.deepEqual(t.snap().current,initial);assert.match(t.q('.cp-wallet').getAttribute('aria-label'),/支払予定4、確定後2/);});
 t.click('add',{uid:'pending-offer-tide'},t.zone('reserve'));
 check('入れると同じ個体が編成枠へ移り、手元には残らない',()=>{assert.equal(face().dataset.zoneItem,'build');assert(!t.zone('reserve').querySelector('[data-unit="pending-offer-tide"]'));assert.equal(t.snap().draft.deck.length,13);});
 t.click('review');
 check('13枚のままでは確定できず、支払いも発生しない',()=>{assert(t.find('commit').disabled);assert.equal(t.snap().current.wallet,6);});
 t.close();t.click('remove',{uid:'pending-offer-tide'},t.zone('build'));
 check('外すと手元へ戻り、未払いの選択と支払見積りは残る',()=>{assert.equal(face().dataset.zoneItem,'reserve');assert.deepEqual(t.snap().draft.offers,['offer-tide']);assert.equal(t.snap().current.wallet,6);});
 t.click('unstage',{id:'offer-tide'},t.zone('reserve'));
 check('やめると候補へ戻り、手元・編成・見積りから予定分だけ消える',()=>{assert.equal(face(),null);assert(t.find('stage',{id:'offer-tide'},t.zone('offer')));assert.equal(t.snap().draft.offers.length,0);assert.deepEqual(t.snap().draft.deck,initial.deck);});
 t.click('stage',{id:'offer-tide'},t.zone('offer'));t.click('add',{uid:'pending-offer-tide'},t.zone('reserve'));t.clickInZone('remove',{uid:'owned-f-0'},'build');
 check('個別の外す操作は押した個体を動かす。同じ札の別個体は残る',()=>{assert(!t.snap().draft.deck.includes('owned-f-0'));assert(t.snap().draft.deck.includes('owned-f-1'));assert(t.zone('reserve').querySelector('[data-unit="owned-f-0"]'));});
 t.click('review');
 check('対象・費用をボタン外へ置き、最後の操作を確定するにする',()=>{assert.equal(t.find('commit').textContent,'確定する');assert.equal(t.q('.cp-payment strong').textContent,'4');assert(!t.find('commit').contains(t.q('.cp-payment')));assert(!t.q('.cp-dialog-scroll').contains(t.find('commit')));});
 t.click('commit');
 check('確定で時計と仮の輪郭を外し、支払後の残高と正式所持へ変わる',()=>{const row=t.q('article[data-unit="acquired-offer-tide"]');assert(row);assert.equal(row.dataset.pending,'false');assert(!row.querySelector('.cp-clock'));assert.equal(t.snap().current.wallet,2);assert(t.snap().current.deck.includes('acquired-offer-tide'));assert.match(t.q('.cp-purchase-track').getAttribute('aria-label'),/選択済み1点/);});
 t.click('reset');t.click('tab',{id:'passive'});t.click('stage',{id:'offer-guard'},t.zone('offer'));t.click('add',{uid:'pending-offer-guard'},t.zone('reserve'));
 check('心得にも同じ3領域と同じ移動操作を使う',()=>{assert.equal(t.q('article[data-unit="pending-offer-guard"]').dataset.zoneItem,'build');assert(t.snap().draft.equipment.includes('owned-PS03'));assert.equal(t.snap().current.wallet,6);});
 t.click('unstage',{id:'offer-guard'},t.zone('build'));
 check('修飾付き心得をやめても同種の既存所持・編成を残す',()=>{assert.deepEqual(t.snap().draft.equipment,initial.equipment);assert.deepEqual(t.snap().current,initial);});
 t.click('stage',{id:'offer-link'},t.zone('offer'));t.click('tab',{id:'card'});t.click('tab',{id:'passive'});
 check('2分類の切替後も位置・仮の印・未払い状態を保持する',()=>{assert(t.zone('reserve').querySelector('[data-unit="pending-offer-link"]'));assert.equal(t.snap().current.wallet,6);});
 t.click('discard');
 check('画面全体の戻すで、取得と編成を最後の確定状態へ戻す',()=>{assert.deepEqual(t.snap().draft,{offers:[],deck:initial.deck,equipment:initial.equipment});});
 check('通常の操作ボタンは短い述語で、状態の説明文をカードに置かない',()=>{const labels=t.all('button[data-action]').filter(x=>!['tab','detail','lane','prev','next'].includes(x.dataset.action)).map(x=>x.textContent.trim());assert(labels.every(x=>['やり直す','選ぶ','入れる','外す','やめる','戻す','確認する'].includes(x)));assert.doesNotMatch(t.q('[data-screen]').textContent,/取得予定に加える|取得をやめる|取得予定|未確定|確定済み|編成中/);});
 t.dom.window.close();
 for(const width of [320,440,736,1024]){
  const u=await start(width);for(const z of ['offer','reserve','build'])assert(u.zone(z));
  if(width<640){u.click('lane',{zone:'offer'});const scope=u.q('[data-overlay]');u.click('detail',{id:'offer-tide'},scope);u.click('stage',{id:'offer-tide'},scope);u.click('add',{uid:'pending-offer-tide'},scope);u.close();}
  else{u.click('stage',{id:'offer-tide'},u.zone('offer'));u.click('detail',{uid:'pending-offer-tide'},u.zone('reserve'));u.click('add',{uid:'pending-offer-tide'},u.q('[data-overlay]'));u.close();}
  check(width+'px入力で3領域を維持し、一覧→詳細→入れるへ到達できる（DOM）',()=>{assert(u.snap().draft.deck.includes('pending-offer-tide'));assert.equal(u.snap().current.wallet,6);});u.dom.window.close();
 }
 check('対象のDOM実行例外なし',()=>assert.deepEqual(runtimeErrors,[]));
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'inline-manifest.json'),'utf8'));
 const result={checked_at_utc:new Date().toISOString(),version:'two-stage-ui-2',environment:{node:process.version,dom:'JSDOM 26.1.0'},scope:'表示構造の変更と個体移動の確認。矩形入力によるDOM操作であり、実描画・視認性の評価ではない。',inline_sha256:manifest.sha256,passed:checks.length,checks,old_suites_rerun:false,retained_result:'checks.json: two-stage-ui-1, 24 checks',unverified:['実ブラウザー描画','タッチ','IndexedDB','本編保存','戦闘試用','視覚構造のユーザー受入']};
 fs.writeFileSync(path.join(__dirname,'structure-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,runtimeErrors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
