// UI-ACQ-INT-01: changed UI paths against the actual D03R Campaign.
// Synthetic DOM/pointers + MemoryStore. Not physical input, layout or IndexedDB proof.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {mount,until,wait,instances,errors,check,checks}=require('./connected-test-harness.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
(async()=>{try{
 const m=await mount(),{review,q,root,click,settled,displayTexts,w}=m;
 const app=()=>review.app,s=()=>app().session.state(),d=()=>s().view.display_data,h=()=>d().home;
 const cp=(action,extra='')=>click('#cw-acquisition-review [data-action="'+action+'"]'+extra);
 const tab=kind=>cp('tab','[data-id="'+kind+'"]');
 const stage=id=>cp('stage','[data-id="'+id+'"]');
 const add=id=>cp('add','[data-uid="'+id+'"]');
 const remove=id=>cp('remove','[data-uid="'+id+'"]');
 const saved=()=>app().session.exportSave();
 const pending=id=>h().acquisition.find(x=>x.id===id).pending_selection_id;
 async function open(id){assert(await review.open(id));await settled();}
 async function confirm(){await cp('review');await cp('commit');}
 async function cancel(id){const uid=pending(id);await cp('detail','[data-uid="'+uid+'"]');await cp('unstage','[data-id="'+id+'"]');await cp('close');}
 async function discard(){await cp('discard');}
 async function publicWrite(c,type,payload){const v=c.inspect();return c.execute({type,payload,request_id:w.crypto.randomUUID(),expected_revision:v.meta.revision,view_token:v.meta.view_token});}
 const saveResult=()=>fs.writeFileSync(path.join(__dirname,'connected-results.json'),JSON.stringify({task:'UI-ACQ-INT-01',ui:'0.16.0',runtime:'CW-M1-engine-0.7',environment:'Node '+process.version+'; actual Campaign; MemoryStore; JSDOM synthetic geometry/input',not_verified:['real browser rendering','physical touch','IndexedDB','real multiple tabs','human acceptance'],passed:checks.length,checks,errors},null,2)+'\n');

 check('自然入口は通常配布物と同じ開始・再開・読み込み画面',()=>{assert.equal(root.dataset.screen,'start');assert(q('[data-launch="create"]'));assert(q('[data-launch="open"]'));});
 await click('[data-launch="create"]');await cpEntry();
 async function cpEntry(){await click('[data-j="collection"]');}
 const emptyBefore=copy(await saved());
 check('新規開始は元の初期残高と全初期個体を公開所持から表示',()=>{assert.equal(h().economy.unspent_units,0);assert.equal(h().owned.length,20);assert.equal(root.querySelectorAll('[data-zone-item="build"]').length,12);assert.equal(q('[data-offer-state]').dataset.offerState,'empty');});
 await tab('passive');await stage('basic:PS01');await cp('review');
 check('残高不足は公開拒否理由を表示し、一括確定しない',()=>{assert.equal(s().comparison.refusal.code,'insufficient_unspent_funds');assert(q('[data-action="commit"]').disabled);assert.match(q('.cp-problems').textContent,/着想が足りません/);});
 await cp('close');await discard();assert.deepEqual(copy(await saved()),emptyBefore);
 check('取消で初期所持・残高・保存を変更しない',()=>assert.equal(app().collection.modified(),false));

 await open('offers-home');await tab('passive');const unpaidBefore=copy(await saved());
 async function drag(pieceSelector,toZone){
  const piece=q(pieceSelector),target=q('[data-zone="'+toZone+'"]'),from=piece.getBoundingClientRect(),to=target.getBoundingClientRect();
  function pointer(type,node,x,y){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'},isPrimary:{value:true}});node.dispatchEvent(e);}
  pointer('pointerdown',piece,from.left+20,from.top+20);await wait(245);assert(q('.cp-drag-ghost'));pointer('pointermove',q('#cw-acquisition-review'),to.left+60,to.top+60);pointer('pointerup',q('#cw-acquisition-review'),to.left+60,to.top+60);await settled();
 }
 await drag('[data-zone-item="offer"][data-offer="choice-1"] [data-action="detail"]','build');
 check('同じドラッグ処理が公開pending_selection_idで取得・編成へ接続',()=>{assert.deepEqual(copy(s().draft.composition.equipment),[pending('choice-1')]);assert.equal(s().comparison.payment.cost_units,400);});
 await drag('[data-unit="'+pending('choice-1')+'"] [data-action="detail"]','offer');
 check('未払い個体のドラッグ取消は取得可能へ戻り保存しない',()=>{assert.equal(s().draft.acquire.length,0);assert.equal(s().draft.composition.equipment.length,0);});
 await stage('choice-1');await add(pending('choice-1'));
 check('修飾心得も追加習得なしで未払い編成し、公開効果を表示',()=>{assert(s().comparison.ok);assert(s().comparison.prepared.owned.some(x=>x.pending&&x.selected&&x.blueprint.affixes.length));assert(q('[data-pending="true"][data-zone-item="build"]'));assert(q('[data-action="stage"][data-id="choice-2"]').disabled);assert(!q('[data-action="stage"][data-id="basic:PS01"]').disabled);});
 await remove(pending('choice-1'));
 check('外す操作は取得予定を維持し、所持へ戻す',()=>{assert.deepEqual(copy(s().draft.acquire),['choice-1']);assert.equal(s().draft.composition.equipment.length,0);assert(q('[data-pending="true"][data-zone-item="reserve"]'));});
 await cancel('choice-1');await stage('choice-3');await cancel('choice-3');
 assert.deepEqual(copy(await saved()),unpaidBefore);
 check('取得前取消・別候補への再選択で支払・候補消費・保存なし',()=>{assert.equal(s().draft.acquire.length,0);assert.equal(h().offers.status,'available');});

 await stage('choice-1');await add(pending('choice-1'));await stage('basic:PS01');await add(pending('basic:PS01'));await cp('review');
 check('異なる群の複数取得と編成を一つの公開比較にまとめる',()=>{assert.equal(s().comparison.payment.cost_units,600);assert.equal(s().comparison.payment.unspent_after_units,300);assert.equal(s().comparison.prepared.equipment.entries.length,2);assert.equal(q('.cp-review-wallet').textContent,'93−6');});
 const ctrl=review.controller,execute=ctrl.execute.bind(ctrl),sent=[];ctrl.execute=command=>{sent.push(copy(command));return execute(command);};
 let release;review.storage.beforeCommit=()=>new Promise(r=>release=r);review.storage.failNext=true;
 q('[data-action="commit"]').click();await until(()=>release);
 q('[data-action="commit"]').click();
 check('保存待機中は確定前の現在値を維持し、二重確定を抑止',()=>{assert.equal(sent.length,1);assert.equal(h().economy.unspent_units,900);assert.equal(h().owned.length,20);assert(q('[data-action="commit"]').disabled);});
 release();await settled();assert.deepEqual(copy(ctrl.exportSave()),unpaidBefore);
 check('保存失敗時は下書きを保持し、窓内に再試行を出す',()=>{assert.equal(s().error.code,'storage_write_failed');assert(s().canRetry);assert.equal(s().draft.acquire.length,2);assert(q('.cp-dialog-actions [data-action="retry"]'));assert.equal(app().collection.snapshot().current.wallet,9);});
 await click('.cp-dialog-actions [data-action="retry"]');
 check('失敗後は同じrequest_idで再送し、成功後だけ全体を更新',()=>{assert.equal(sent.length,2);assert.deepEqual(sent[0],sent[1]);assert.equal(h().economy.unspent_units,300);assert.equal(h().owned.length,22);assert.equal(h().equipment.entries.length,2);assert(!s().canRetry);assert(!app().collection.modified());assert(!q('[data-pending="true"]'));});
 check('帰還群取得済みと残る取得可能を分ける',()=>{assert.equal(h().offers.status,'purchased');assert.equal(h().candidates.length,0);assert.equal(root.querySelectorAll('[data-zone-item="offer"]').length,3);assert.match(q('.cp-purchase-track').textContent,/帰還分 取得済み/);});
 await tab('card');check('取得済み群の札欄は空で取得完了を表示',()=>assert.equal(q('[data-offer-state]').dataset.offerState,'complete'));
 await tab('passive');
 const stored=copy(await saved()),slot='ui-connected-offers-home',reopened=await review.Campaign.open({slot_id:slot});
 assert.deepEqual(copy(reopened.exportSave()),stored);
 check('確定済みの所持・残高・編成を共通openで読み戻す',()=>assert.equal(reopened.inspect().display_data.home.equipment.entries.length,2));
 await cp('back');assert(!q('[data-j="depart"]').disabled);await click('[data-j="depart"]');
 const equippedSave=copy(await saved());
 check('保存した修飾心得と通常心得をそのまま探索に装備',()=>{assert.equal(d().phase,'exploring');assert.equal(s().error,null);assert.equal(equippedSave.session.game.state.ah.equipment_entries.length,2);assert.deepEqual(equippedSave.session.game.state.ah.learned,[]);});
 await displayTexts();await click('[data-j="continue"]');
 check('出発本文の先で了承済み探索画面を操作可能',()=>{assert.equal(root.dataset.screen,'explore');assert(d().exploration.legal_actions.length);});

 await open('offers-home');const cardOffer=h().acquisition.find(x=>x.blueprint.kind==='card'),matching=h().owned.find(x=>x.selected&&x.blueprint.base===cardOffer.blueprint.base);
 await stage(cardOffer.id);await remove(matching.id);
 check('編成不足は自動補充せず、公開拒否で確定を止める',()=>assert.equal(s().comparison.refusal.code,'invalid_deck_size'));
 await add(pending(cardOffer.id));await confirm();const cardConfirmed=copy(await saved());
 await cp('back');await click('[data-j="depart"]');const cardDeparted=copy(await saved());
 check('修飾札を初期札と同じ操作で差し替え、同一12個体で実出発',()=>{const cards=Object.values(cardDeparted.session.game.state.cards).filter(x=>x.origin==='P'&&x.birth==='initial');assert.equal(cards.length,12);assert.deepEqual(cards.map(x=>x.selection_id).sort(),[...cardConfirmed.session.au.deck].sort());assert(cards.some(x=>x.type===cardOffer.blueprint.key));});

 await open('offers-home');await tab('passive');await stage('basic:PS01');await cp('review');
 const lost=review.controller,lostExecute=lost.execute.bind(lost),lostSent=[];let drop=true;
 lost.execute=async command=>{lostSent.push(copy(command));const r=await lostExecute(command);if(drop&&command.type==='commit_preparation'){drop=false;throw {code:'connection_failed'};}return r;};
 await cp('commit');check('保存成功後の応答喪失でも表示だけを確定しない',()=>{assert(s().canRetry);assert.equal(h().economy.unspent_units,900);assert.equal(app().collection.snapshot().current.wallet,9);});
 await click('.cp-dialog-actions [data-action="retry"]');
 check('応答喪失の同一再送はreplayedとなり二重取得・二重支払なし',()=>{assert.deepEqual(lostSent[0],lostSent[1]);assert.equal(d().operation.status,'replayed');assert.equal(h().economy.unspent_units,700);assert.equal(h().owned.length,21);});

 await open('offers-home');await tab('passive');await stage('basic:PS01');await cp('review');const oldDraft=copy(s().draft);
 const other=await review.Campaign.open({slot_id:slot}),otherItem=other.inspect().display_data.home.owned.find(x=>!x.selected);
 await publicWrite(other,'set_item_lock',{item_id:otherItem.id,locked:true});await cp('commit');
 check('競合失効は案を保って停止し、新tokenへの付け替えや自動決済なし',()=>{assert(s().stale);assert.deepEqual(copy(s().draft),oldDraft);assert.equal(h().economy.unspent_units,900);assert(q('.cp-dialog-actions [data-action="reload"]'));});
 await click('.cp-dialog-actions [data-action="reload"]');
 check('明示的な読み直しで新しい公開状態に戻り、再選択・再確認を要求',()=>{assert(!s().stale);assert.equal(s().draft.acquire.length,0);assert.equal(h().economy.unspent_units,900);assert.equal(q('[data-action="review"]').disabled,true);});
 await stage('basic:PS03');await confirm();assert.equal(h().economy.unspent_units,700);

 await open('offers-home');await tab('passive');const slow=review.controller,preview=slow.previewPreparation.bind(slow);let resolvePreview;
 slow.previewPreparation=args=>new Promise(resolve=>{const response=preview(args);resolvePreview=()=>resolve(response);});
 q('[data-action="stage"][data-id="basic:PS01"]').click();await until(()=>resolvePreview);await discard();resolvePreview();await settled();
 check('取消後に届く遅い予測は古い取得予定を復活させない',()=>{assert.equal(s().draft.acquire.length,0);assert.equal(s().comparison,null);assert(!app().collection.modified());assert.equal(h().economy.unspent_units,900);});

 await open('migrated_review');const migrationBefore=copy(await saved());
 check('移行した旧案を要再確認として表示し、自動取得しない',()=>{assert(s().draft.migration_review);assert(q('.cp-runtime-notice [data-action="rebuild"]'));assert(q('[data-action="stage"]').disabled);assert.equal(h().economy.refundable_units,0);});
 await cp('rebuild');assert.deepEqual(copy(await saved()),migrationBefore);await confirm();
 check('組み直す操作は未保存案で、確認・確定後に移行確認を保存',()=>{assert.equal(d().migration_notice.review_required,false);assert.equal(h().economy.unspent_units,700);assert(!app().collection.modified());});
 await open('migrated_review');await cp('discard');
 check('移行旧案の戻す操作は確定編成と残高を保つ',()=>{assert.equal(s().draft.migration_review,null);assert.equal(h().economy.unspent_units,700);assert.equal(h().economy.historical_learning_units,200);});

 await open('natural_first_home');const carriedIds=h().acquisition.map(x=>x.id);await cp('back');await click('[data-j="depart"]');await displayTexts();await click('[data-j="continue"]');
 await app().session.execute('withdraw');await settled();await displayTexts();await click('[data-j="hub"]');await click('[data-j="collection"]');
 check('成果なし帰還でも持ち越した未取得群を空欄にしない',()=>{assert.equal(h().offers.carried_from_previous_return,true);assert.deepEqual(copy(h().acquisition.map(x=>x.id)),copy(carriedIds));});

 await open('acquired');await tab('passive');const normal=h().owned.find(x=>x.blueprint.kind==='passive'&&!x.blueprint.affixes.length);
 await remove(normal.id);await confirm();const compositionOnly=copy(await saved());
 check('編成だけの一括確定は費用0・所持数量維持',()=>{assert.equal(h().economy.unspent_units,300);assert.equal(h().owned.length,22);assert.equal(h().equipment.entries.length,1);});
 await cp('back');await cpEntry();assert.deepEqual(copy(await saved()),compositionOnly);
 check('画面往復で確定済みの変更を仮編成と誤認して出発を遮断しない',()=>assert(!app().collection.modified()));
 await cp('detail','[data-uid="'+normal.id+'"]');await cp('close');
 await click('[data-j="menu"]');await click('[data-j="help"]');check('同じ編成入口・共通メニューと操作説明を使う',()=>{const text=q('[data-inspect-key="help"] .cj-inspect-scroll').textContent;assert(!text.includes('別に習得'));assert.match(text,/取得可能・所持・編成/);});
 check('ネットワーク・実IndexedDBへ接続せず、実行時エラーなし',()=>{assert.equal(m.requests(),0);assert.deepEqual(errors,[]);});
 saveResult();console.log(JSON.stringify({passed:checks.length,errors}));
 }catch(e){console.error(e);console.error('runtime errors',errors);process.exitCode=1;}finally{instances.forEach(x=>x.window.close());}
})();
