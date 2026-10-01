// Public D03R adapter for the accepted acquisition component. No save/price owner.
const runtime=options.session||null;
let runtimeState=runtime?.state(),runtimeOff=null,runtimeToken=null;
function publicFixture(s){
 const h=s.view.display_data.home,details={...s.view.display_data.details,...s.draftDetails},catalogue={};
 for(const row of [...h.owned,...h.acquisition]){
  const detail=details[row.id];
  if(!detail)throw Error('acquisition_detail_missing');
  catalogue[row.blueprint.key]={key:row.blueprint.key,...clone(detail)};
 }
 return {rules:{deckSize:h.deck.required_size,perKindCap:h.deck.per_base_cap,equipmentLimit:h.equipment.capacity},
  initial:{wallet:h.economy.unspent_units/100,units:h.owned.map(x=>({uid:x.id,key:x.blueprint.key})),deck:h.deck.composition.flatMap(x=>Array(x.count).fill(x.id)),equipment:h.equipment.entries.map(x=>x.id),purchased:[]},
  catalogue,offers:h.acquisition.filter(x=>x.available&&x.available_quantity>0).map(x=>({id:x.id,key:x.blueprint.key,price:x.price_units/100,pending_uid:x.pending_selection_id,group:x.group_id,limit:x.group_limit})),groups:clone(h.acquisition_groups)};
}
if(runtime){fixture=publicFixture(runtimeState);runtimeToken=runtimeState.view.meta.view_token;}
function pendingUid(id){return runtime?offer(id)?.pending_uid:'pending-'+id;}
function pendingOffer(uid){return runtime?fixture.offers.find(x=>x.pending_uid===uid)?.id:String(uid).slice(8);}
function canStage(id){
 const o=offer(id);if(!o||draft.offers.includes(id)||current.purchased.includes(id))return false;
 return runtime?draft.offers.filter(x=>offer(x)?.group===o.group).length<o.limit:draft.offers.length+current.purchased.length<fixture.rules.offerLimit;
}
function runtimeLocked(){return !!runtime&&(runtimeState.view.display_data.phase!=='home'||runtimeState.stale||runtimeState.canRetry||['write','inspect'].includes(runtimeState.pending?.kind));}
function migrationPending(){return !!runtimeState?.draft?.migration_review;}
function runtimeReason(e){return globalThis.CrossweaveUI.saveFailureText?.(e)||({
 insufficient_unspent_funds:'着想が足りません。取得予定を見直してください。',
 invalid_deck_size:'札組を'+fixture.rules.deckSize+'枚にしてください。',deck_size:'札組を'+fixture.rules.deckSize+'枚にしてください。',
 deck_base_cap_exceeded:'同じ札の上限を超えています。',equipment_capacity_exceeded:'心得の枠が足りません。',
 duplicate_equipment_base:'同じ種類の心得は一つまで編成できます。',duplicate_equipment:'同じ心得を重ねて編成できません。',
 acquisition_group_limit:'同じ候補群の取得上限を超えています。',migration_review_required:'旧保存の変更案を確認してください。',
 stale_view:'状態が変わりました。読み直して選び直してください。',stale_revision:'状態が変わりました。読み直して選び直してください。',
 unknown_selection_handle:'選択が古くなりました。読み直して選び直してください。',preparation_contract_changed:'変更案の形式が変わりました。組み直してください。'
 })[e?.code]||'変更を確定できませんでした（'+(e?.code||'確認待ち')+'）。案は残っています。';}
function runtimeErrors(){
 if(runtimeState.pending)return ['確認中です。'];
 if(migrationPending())return ['旧保存の変更案は再確認が必要です。'];
 if(runtimeState.error)return [runtimeReason(runtimeState.error)];
 if(runtimeState.comparison?.refusal)return [runtimeReason(runtimeState.comparison.refusal)];
 return runtimeState.comparison?.ok?[]:dirty()?['変更内容を確認してください。']:[];
}
function runtimePlan(){return {schema:'CW-M1-preparation-2',acquire:[...draft.offers],composition:{deck:[...draft.deck],equipment:[...draft.equipment]},migration_review:runtimeState.draft.migration_review};}
function runtimeEdit(){if(runtime.setDraft(runtimePlan()))void runtime.compare();}
function runtimeReceive(s){
 runtimeState=s;
 // Home information is intentionally absent during exploration. The component is detached then.
 if(!s.view?.display_data.home){view.dialog=null;return;}
 // Never attach a new token to stale selection handles. Keep the visible draft until explicit reload.
 if(!s.stale&&s.view?.display_data.home){
  const changed=runtimeToken!==s.view.meta.view_token;
  fixture=publicFixture(s);current=clone(fixture.initial);
  if(s.draft?.schema==='CW-M1-preparation-2')draft={offers:[...s.draft.acquire],deck:[...s.draft.composition.deck],equipment:[...s.draft.composition.equipment]};
  if(changed){view.dialog=null;view.key=view.offer=view.uid=null;}
  runtimeToken=s.view.meta.view_token;
 }
 render();
}
async function runtimeAction(action){
 if(action==='retry'){if(!runtimeState.pending)await runtime.retry();return;}
 if(action==='reload'){if(!runtimeState.pending)await runtime.refresh({preserveLocal:false});return;}
 if(runtimeLocked())return;
 if(action==='rebuild'){
  const plan=globalThis.CrossweaveUI.currentPlan(runtimeState.view);
  if(runtime.setDraft(plan)){view.dialog=null;await runtime.compare();}return;
 }
 if(action==='discard'){
  if(runtimeState.view.display_data.draft.dirty||migrationPending())await runtime.execute('discard_draft');
  else {runtime.setDraft(globalThis.CrossweaveUI.currentPlan(runtimeState.view));view.dialog=null;render();}
  return;
 }
 if(action==='review'){
  view.dialog='review';render();await runtime.compare();return;
 }
 if(action==='commit'){
  if(runtimeErrors().length||!dirty())return;
  const result=await runtime.execute('commit_preparation',{plan:clone(runtimeState.draft)});
  if(result.ok)notify('取得と編成を保存しました。着想は'+current.wallet+'です。');
 }
}
function runtimeNotice(){
 if(!runtime)return '';
 if(migrationPending())return '<div class="cp-runtime-notice" role="status"><span>旧保存の変更案は再確認が必要です。確定済みの所持・編成は保持しています。</span>'+button('組み直す','rebuild')+button('戻す','discard')+'</div>';
 if(runtimeState.error||runtimeState.stale||runtimeState.canRetry)return '<div class="cp-runtime-notice" role="alert"><span>'+esc(runtimeReason(runtimeState.error))+'</span>'+(runtimeState.canRetry?button('再試行','retry'):'')+(runtimeState.stale?button('読み直す','reload',{label:'変更案を戻して最新の状態を読み直す'}):'')+'</div>';
 return '';
}
function runtimeTrack(){
 const group=fixture.groups.find(x=>x.id==='return-offer'),chosen=draft.offers.filter(id=>offer(id)?.group===group?.id).length;
 return '<div class="cp-purchase-track">'+icon(group?.status==='acquired'?'circle-check':'store')+'<span>'+(group?.status==='acquired'?'帰還分 取得済み':group?.status==='available'?'帰還分 '+chosen+' / '+group.limit:'帰還分 候補なし')+'</span>'+(draft.offers.length?'<span class="cp-pending-token">'+icon('clock-3')+draft.offers.length+'</span>':'')+'</div>';
}
function runtimeReviewBody(){
 const c=runtimeState.comparison,issues=runtimeErrors(),payment=c?.payment;
 const problems=issues.length?'<div role="alert" class="cp-problems">'+issues.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'';
 if(!c?.ok)return problems;
 const balance='<div class="cp-review-wallet">'+icon('lightbulb')+'<strong>'+payment.unspent_before_units/100+'</strong>'+icon('arrow-right')+'<strong>'+payment.unspent_after_units/100+'</strong><small>−'+payment.cost_units/100+'</small></div>';
 const purchases=draft.offers.map(id=>{const o=offer(id),zone=composed(pendingUid(id))?'build':'reserve';return '<div class="cp-change cp-review-purchase"><span class="cp-pending-token">'+icon('clock-3')+'</span><strong>'+esc(item(o.key).name)+'</strong>'+icon('arrow-right')+icon(zoneIcons[zone])+'<span>'+icon('lightbulb')+o.price+'</span></div>';}).join('');
 const changes=[...changesFor('deck'),...changesFor('equipment')];
 const diffs=changes.map(x=>'<div class="cp-change"><span>'+esc(item(x.key).name)+'</span><strong>'+x.before+' '+icon('arrow-right')+' '+x.after+'</strong></div>').join('');
 return problems+balance+(purchases?'<section class="cp-review-group"><h3>'+icon('store')+'取得</h3>'+purchases+'</section>':'')+(diffs?'<section class="cp-review-group"><h3>'+icon('layout-grid')+'編成</h3>'+diffs+'</section>':'')+'<div class="cp-capacity"><span>札</span><strong>'+c.prepared.deck.size+' / '+c.prepared.deck.required_size+'</strong><span>心得</span><strong>'+c.prepared.equipment.used+' / '+c.prepared.equipment.capacity+'</strong></div>'+changesFor('equipment').map(x=>'<details><summary>'+esc(item(x.key).name)+'</summary>'+facts(item(x.key))+'</details>').join('');
}
