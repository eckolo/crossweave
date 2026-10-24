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
root.getBoundingClientRect = () => ({width:1024, height:576, left:0, top:0, right:1024, bottom:576});
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
const visiblePiece=async id=>{for(let i=0;i<20;i++){const b=root.querySelector('[data-piece="'+id+'"]');if(b)return b;const next=root.querySelector('[data-j="page"][data-step="1"]');if(!next||next.disabled)break;await click(next);}throw Error('piece missing '+id);};
try {
 check('D03自然保存から候補一覧を直接開く',await review.ready&&root.dataset.screen==='offers'&&d().home.economy.unspent_units===900);
 for(const id of ['owned','converted','return-d03','explore-d03']){await open(id);check(id+'は実phaseから指定画面へ入る',root.dataset.screen===lastPrepared.checkpoint.screen);}
 await open('offers');
 const freeBefore=JSON.stringify(d().home.free_card_options),off=d().home.candidates[0],before=d().home.economy.unspent_units;
 await click('[data-j="buy-preview"][data-id="'+off.id+'"]');
 check('購入前に対象・追加1点・公開価格を表示する',root.textContent.includes('所持に1点追加')&&root.textContent.includes(d().details[off.id].name));
 await click('[data-j="buy-confirm"]');
 check('実purchaseで1点追加し購入額だけ減る',d().home.owned.length===1&&d().home.economy.unspent_units===before-off.price_units&&d().home.offers.status==='purchased');
 check('購入は無料札の生成や解放へ混同しない',JSON.stringify(d().home.free_card_options)===freeBefore);
 let owned=d().home.owned[0].id;
 await click('[data-j="detail"][data-id="'+owned+'"]');
 check('所持品詳細に公開された修飾を示す',d().details[owned].affixes.every(a=>root.textContent.includes(a.label)&&root.textContent.includes(a.description)));
 await click('[data-j="close-item"]');await click('[data-j="lock"][data-id="'+owned+'"]');owned=d().home.owned[0].id;
 check('ロック成功後の新viewで変換を抑止',d().home.owned[0].locked&&el('[data-j="convert-select"]').disabled&&root.textContent.includes('ロック中'));
 await click('[data-j="lock"][data-id="'+owned+'"]');owned=d().home.owned[0].id;
 await click('[data-j="convert-select"][data-id="'+owned+'"]');await click('[data-j="convert-preview"]');
 const quote=s().state().quote;check('最後の個体を失うことを見積りで確認できる',quote.items[0].loses_variant_access&&root.textContent.includes('最後の1点'));
 await click('[data-j="convert-confirm"]');
 check('見積りと同じ個体を実convert_itemsへ渡し新viewへ更新',d().home.owned.length===0&&d().home.economy.unspent_units===quote.unspent_after_units);
 await click('[data-j="offers"]');check('変換後も候補の購入済みを区別する',root.textContent.includes('購入済')&&[...root.querySelectorAll('[data-j="buy-preview"]')].every(b=>b.disabled));
 // Comparison, ordered purchase and owned-card assignment use exactly one plan.
 await open('offers');await click('[data-j="plan-purchase"][data-id="choice-0"]');
 check('購入と編成の比較に$purchaseの公開詳細を用いる',s().state().comparison.ok&&s().state().draftDetails.$purchase.name===d().details['choice-0'].name);
 await click('[data-j="close"]');
 const base=d().details['choice-0'].base_id;
 await click('[data-j="deck"]'); // navigate keeps draft
 // Use the session's public edit boundary for selecting an off-page replacement.
 const plan=s().state().draft,at=plan.next_preparation.deck.findIndex(id=>d().details[id].base_id===base);assert(at>=0);plan.next_preparation.deck[at]='$purchase';assert(s().setDraft(plan));assert((await s().compare()).ok);await idle();
 await click('[data-j="review"]');
 check('比較は現在・購入前後・確定後の金額と所持差を表示',root.textContent.includes('購入前 → 後')&&root.textContent.includes('確定後')&&root.textContent.includes('所持'));
 const compared=JSON.stringify(s().state().draft),rev=s().state().view.meta.revision;
 await click('[data-j="commit"]');
 const committed=sent.findLast(c=>c.type==='commit_preparation');
 check('比較と確定は同一plan、確認後にだけ保存済みへ変わる',JSON.stringify(committed.payload.plan)===compared&&s().state().view.meta.revision===rev+1&&!s().state().localDirty);
 check('購入予定札は実所持の1枚として札組へ接続',d().home.owned.length===1&&d().home.owned[0].references.includes('confirmed_deck'));
 await click('[data-j="owned"]');check('使用中はロックと区別して変換を禁止',el('[data-j="convert-select"]').disabled&&root.textContent.includes('使用中'));
 const reopened=await lastPrepared.Campaign.open({slot_id:lastPrepared.slot_id});
 check('編成確定の自動保存はopenで再現する',reopened.inspect().display_data.home.deck.composition.some(x=>x.id.startsWith('owned-')));
 const saved=await s().exportSave();const imported=await lastPrepared.Campaign.importSave({slot_id:'ui-import-'+crypto.randomUUID(),document:saved,request_id:crypto.randomUUID()});
 check('購入・札組をexportSave/importSaveで引き継げる',imported.inspect().display_data.home.owned.length===1&&imported.inspect().display_data.home.owned[0].selected);
 await click('[data-j="depart"]');
 check('編成確定後の出発は実phaseで選択し小窓を解除',d().phase==='exploring'&&root.dataset.screen==='scene'&&!review.app.state().panel&&review.app.state().windows.length===0);
 await readMounted();await click('[data-j="continue"]');
 check('表示通知していない段落を進行時に一括既読にしない',sent.findLast(c=>c.type==='continue_scene'&&c.payload.advance).payload.displayed_text_ids.length===0);
 check('次の探索に購入した札の公開内訳がある',d().exploration.deck_catalogue.entries.some(x=>x.card.name.includes('堅い')));
 // Skill variant acquisition and base learning share the same preparation.
 await open('offers');await click('[data-j="plan-purchase"][data-id="choice-1"]');
 let skillPlan=s().state().draft;skillPlan.next_preparation.learn=[d().details['choice-1'].base_id];skillPlan.next_preparation.equipment=['$purchase'];s().setDraft(skillPlan);assert((await s().compare()).ok);await idle();
 const expected=s().state().comparison;await click('[data-j="commit"]');
 check('修飾心得の購入・基礎習得・装備を同時確定',d().home.economy.unspent_units===expected.prepared.economy.unspent_units&&d().home.equipment.entries.some(x=>x.id.startsWith('owned-')));
 // Actual rollback and repeat identity, not simulated API results.
 await open('offers');await click('[data-j="buy-preview"][data-id="choice-0"]');lastPrepared.storage.failNext=true;
 const beforeFail=s().state().view.meta.revision;await click('[data-j="buy-confirm"]');const failedCommand=structuredClone(sent.at(-1));
 check('保存失敗を成功に見せず元の所持・金額を維持',s().state().canRetry&&s().state().error.code==='storage_write_failed'&&d().home.owned.length===0&&s().state().view.meta.revision===beforeFail);
 await click('[data-j="retry"]');check('再試行はrequest ID・revision・token・payloadを全て維持',JSON.stringify(sent.at(-1))===JSON.stringify(failedCommand)&&d().home.owned.length===1);
 await open('offers');let release;lastPrepared.storage.beforeCommit=()=>new Promise(r=>release=r);
 const write=s().execute('purchase',{candidate:'choice-0'});await until(()=>!!release);
 const second=await s().execute('purchase',{candidate:'choice-0'});check('保存pending中の二重購入を抑止',!second.ok&&second.error.code==='busy');release();assert((await write).ok);await idle();
 // Another controller is used as a second client, without pretending to be a real browser tab.
 await open('offers');const old=s().state().view.meta.view_token,other=await lastPrepared.Campaign.open({slot_id:lastPrepared.slot_id});const ov=other.inspect();
 assert(!(await other.execute({type:'purchase',payload:{candidate:'choice-1'},view_token:ov.meta.view_token,expected_revision:ov.meta.revision,request_id:crypto.randomUUID()})).display_data.error);
 const stale=await s().execute('purchase',{candidate:'choice-0'});await idle();
 check('他クライアント更新を古いhandleへ新tokenを付けて送らない',!stale.ok&&s().state().stale&&s().state().view.meta.view_token===old);
 await click('[data-j="refresh"]');
 check('古い状態はslotをopenし候補を再選択させる',s().state().view.meta.view_token!==old&&!s().state().stale&&d().home.offers.status==='purchased'&&s().state().draft.candidate===null&&review.app.state().windows.length===0);
 // Return acknowledgement and insufficient funds.
 await open('return-d03');check('帰還確認前は購入を書き込めない',!s().can('purchase'));
 await readMounted();await click('[data-j="hub"]');await click('[data-j="offers"]');
 check('帰還から拠点・取得へ進み不足を空候補と区別',d().phase==='home'&&d().home.candidates.length>0&&root.textContent.includes('着想不足'));
 await click('[data-j="plan-purchase"][data-id="choice-0"]');
 check('失敗した比較はローカル案を削除しない',!s().state().comparison.ok&&s().state().draft.candidate==='choice-0');
 await open('carried');await readMounted();await click('[data-j="hub"]');await click('[data-j="offers"]');
 check('実撤退から拠点へ戻り公開の持越し理由を表示',d().home.offers.carried_from_previous_return&&root.textContent.includes('前回の候補を持越し'));
 // Real public action preview, deck catalogue and history.
 await open('explore-d03');const legal=d().exploration.legal_actions[0];await click('[data-x-card="'+legal.card_id+'"]');
 await until(()=>!!s().state().actionPreview);await idle();
 check('本人の予測を詳細窓なしで表示する',!!el('#cw-self').querySelector('.cw-delta'));
 const projected=w.CrossweaveUI.projectActionForecast(d(),legal,s().state().actionPreview);
 check('全公開主体の機転・身構・攪乱をactor_changesから読む',Object.keys(s().state().actionPreview.actor_changes).every(id=>['guard','crit','evasion'].every(k=>projected.actors[id][k].after===s().state().actionPreview.actor_changes[id].values[k].after)));
 await click('[data-x="more"]');await click('[data-x="deck"]');
 check('山札内訳は公開の持込・山札・手札枚数',root.querySelectorAll('.cw-deck-table tbody tr').length===d().exploration.deck_catalogue.entries.length);
 const detail=el('[data-x="deck-detail"]');await click(detail);check('山札詳細を公開detail_idで開き親窓も残す',!el('#cw-parent-drawer').hidden&&!el('#cw-drawer').hidden);
 await click('[data-x="more"]');await click('[data-x="history"]');
 check('公開履歴札名を解決時記録から表示する',d().exploration.public_history.filter(x=>x.type==='action'&&x.card_name_status==='recorded_at_resolution').every(x=>root.textContent.includes(x.card_name)));
 await click('[data-x="more"]');await click('[data-x="texts"]');
 check('既読本文を公開text_historyから参照する',root.querySelectorAll('[data-history-text]').length===d().text_history.filter(x=>x.published&&(x.kind!=='detail'||x.read)).length&&root.querySelectorAll('[data-history-text] [data-j-text]').length===0);
 await click('[data-j="close"]');await click('[data-x="target-info"]');const actorKey=el('[data-x="actor-record"]').dataset.key;await click('[data-x="actor-record"]');
 check('相手詳細から内容版別knowledge keyの記録を開く',review.app.state().recordTarget===actorKey&&d().knowledge_views.some(v=>v.key===actorKey));
 await open('offers');await click('[data-j="plan-purchase"][data-id="choice-0"]');const retained=JSON.stringify(s().state().draft);
 for(const width of [1024,736,600,320]){root.getBoundingClientRect=()=>({width,height:width*9/16,left:0,top:0,right:width,bottom:width*9/16});resize.forEach(fn=>fn([]));await idle();const l=w.CrossweaveUI.journeyLayout(width,30,29,18);check(width+'pxの一覧末尾と固定操作領域の幾何条件',l.end===30&&l.rowHeight>0&&l.rows*l.rowHeight+(l.rows-1)*l.gap<=l.availableHeight+.01&&JSON.stringify(s().state().draft)===retained&&review.app.state().panel==='review');}
  // New asynchronous identity boundaries using actual public responses.
 const prepared=await createCheckpoint('offers',source),controller=prepared.controller;let resolveRead,firstRead=true;
 const delayed={inspect:()=>controller.inspect(),execute:c=>controller.execute(c),previewPreparation:args=>{const response=controller.previewPreparation(args);if(firstRead){firstRead=false;return new Promise(r=>resolveRead=()=>r(response));}return response;}};
 const pendingSession=w.CrossweaveUI.makeSession(delayed);assert((await pendingSession.refresh()).ok);
 let pp=pendingSession.state().draft;pp.candidate='choice-0';pp.purchase_timing='before_preparation';pendingSession.setDraft(pp);const late=pendingSession.compare();await until(()=>!!resolveRead);
 pp=pendingSession.state().draft;pp.candidate='choice-1';pendingSession.setDraft(pp);assert((await pendingSession.compare()).ok);const latest=JSON.stringify(pendingSession.state().comparison);resolveRead();
 check('古い購入案の遅い比較応答は新しい案を上書きしない',(await late).ignored&&JSON.stringify(pendingSession.state().comparison)===latest);pendingSession.dispose();
 let lost=true;const uncertain=w.CrossweaveUI.makeSession({inspect:()=>controller.inspect(),execute:async c=>{const result=await controller.execute(c);if(lost){lost=false;throw Error('response lost');}return result;}});await uncertain.refresh();
 assert(!(await uncertain.execute('purchase',{candidate:'choice-0'})).ok);const replay=await uncertain.retry();
 check('確定後の応答喪失も同requestの再送で購入1点を維持',replay.ok&&replay.operation.status==='replayed'&&uncertain.state().view.display_data.home.owned.length===1);uncertain.dispose();
 const done=await createCheckpoint('offers',source);let releaseDone;done.storage.beforeCommit=()=>new Promise(r=>releaseDone=r);const detached=w.CrossweaveUI.makeSession(done.controller);await detached.refresh();const finish=detached.execute('purchase',{candidate:'choice-0'});await until(()=>!!releaseDone);detached.dispose();releaseDone();
 check('閉じた画面へ遅い書込応答を反映しない',(await finish).ignored);
 await open('offers');await click('[data-j="plan-purchase"][data-id="choice-0"]');await click('[data-j="purchase-order"][data-order="after_preparation"]');
 check('編成後に購入する順序も公開比較で確認',s().state().comparison.ok&&s().state().draft.purchase_timing==='after_preparation');
 let afterPlan=s().state().draft;afterPlan.next_preparation.deck[0]='$purchase';s().setDraft(afterPlan);await s().compare();
 check('購入後順序で購入予定品を先に使えず案は保持',!s().state().comparison.ok&&s().state().draft.next_preparation.deck.includes('$purchase'));
 const {versions}=await import('../../../../../../src/runtime/campaign.mjs');
 const fresh=await prepared.Campaign.create({slot_id:'empty-'+crypto.randomUUID(),request_id:crypto.randomUUID(),...versions});
 const emptyRoot=w.document.createElement('div');root.after(emptyRoot);const emptyApp=w.CrossweaveUI.mountJourney(emptyRoot,{controller:fresh,Campaign:prepared.Campaign,slot_id:'unused',title:'夜潮の排水路'});await emptyApp.ready;emptyRoot.querySelector('[data-j="offers"]').click();
 check('候補なしを購入済み・所持なしと区別',fresh.inspect().display_data.home.offers.status==='none'&&emptyRoot.textContent.includes('購入候補なし'));emptyApp.dispose();emptyRoot.remove();
 // Presentation-only checks consume published D58 examples. They are not natural-play trials.
 const examples=JSON.parse(await fs.readFile(path.join(repo,'docs/検証/接続条件/co-d02/appendix-d58/examples.json'),'utf8')).examples;
 const projectionCase=examples.find(x=>x.actor==='P'&&x.preview.mode==='defense_support'),pv={...projectionCase.preview,supported:true};
 const publicData={exploration:{hand:[{id:projectionCase.choice.card_id}],actors:Object.fromEntries(Object.keys(pv.actor_changes).map(id=>[id,{id}])),self:{id:'P'}}};
 const grant=w.CrossweaveUI.projectActionForecast(publicData,projectionCase.choice,pv);
 check('D58公開付与例の全受け手・弱い張り直しを追加演算せず投影',Object.entries(pv.actor_changes).every(([id,x])=>grant.actors[id].guard.after===x.values.guard.after&&grant.actors[id].evasion.delta===x.values.evasion.delta));
 const unknown=structuredClone(pv);unknown.actor_changes.P={status:'unknown',values:null};
 check('未公開の能力変化を0として表示しない',w.CrossweaveUI.projectActionForecast(publicData,projectionCase.choice,unknown).actors.P.guard.status==='unknown');
 const grantDetail=examples.find(x=>x.detail).detail;
 check('付与札は範囲と防御回数を固有性質へ表示',w.CrossweaveUI.cardProperties(grantDetail).some(t=>t.includes('使用者以外'))&&w.CrossweaveUI.cardProperties(grantDetail).some(t=>t.includes('1回')));
 check('有限・無制限・混在の回数を区別',w.CrossweaveUI.defenseDuration({status:'uniform',uniform_uses:2})==='×2'&&w.CrossweaveUI.defenseDuration({status:'unlimited'})==='∞'&&w.CrossweaveUI.defenseDuration({status:'mixed'})==='混在');
 const views=examples.find(x=>x.knowledge_views).knowledge_views,sameTarget=views.filter(x=>x.target_id==='SCN-001-ACT01');assert(sameTarget.length>1);
 const dataView=structuredClone(s().state().view);dataView.display_data.knowledge_views=views;
 const subRoot=w.document.createElement('div');root.after(subRoot);subRoot.getBoundingClientRect=()=>({width:736,height:414,left:0,top:0,right:736,bottom:414});
 const knowledgeApp=w.CrossweaveUI.mountJourney(subRoot,{controller:{inspect:()=>dataView,execute:()=>{throw Error('read only test');}},Campaign:{},slot_id:'presentation',title:'夜潮の排水路'});await knowledgeApp.ready;
 subRoot.querySelector('[data-j="records"]').click();
 const keys=[...subRoot.querySelectorAll('[data-j="record-target"]')].filter(x=>sameTarget.some(t=>t.key===x.dataset.id));check('同名の旧・新目録は異なる公開keyの選択先を持つ',keys.length===sameTarget.length&&new Set(keys.map(x=>x.dataset.id)).size===sameTarget.length);
 for(const key of keys.map(x=>x.dataset.id)){[...subRoot.querySelectorAll('[data-j="record-target"]')].find(x=>x.dataset.id===key).click();assert.equal(knowledgeApp.state().recordTarget,key);}
 knowledgeApp.dispose();subRoot.remove();

 check('DOM操作中に実行時エラーなし',errors.length===0);check('確認入口は実IndexedDBへ触れない',indexedDBCalls===0);
 const result={id:'CW-M1-UI-U02B-001',environment:{node:process.version,jsdom:require(process.env.CW_JSDOM_PATH+'/package.json').version,storage:'design MemoryStore',rendering:'DOM and geometry contract only; no browser paint/touch/IndexedDB'},checks,passed:checks.length};
 await fs.writeFile(process.argv[2]||path.join(here,'u02b-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors}));
} catch(e){console.error('AT CHECK',checks.length,checks.at(-1));console.error('STATE',JSON.stringify({screen:root.dataset.screen,error:review.app?.session.state().error,comparison:review.app?.session.state().comparison,errors}).slice(0,4000));throw e;}
finally{review.dispose();dom.window.close();globalThis.indexedDB=originalIDB;}
