/* UI-G-001 v0.2: show the named objects and the result of each choice.
 * Inserted into mountPreparation's scope. All prices/results come from public view/preview.
 */
function noticeFor(e) {
 const z=e?.details||{};
 const messages={
  insufficient_unspent_funds:'着想が足りません',
  insufficient_learning_funds:'着想が足りません',
  unlearned_equipment_base:'この心得を覚えると装備できます',
  equipment_capacity_exceeded:'装備が入りきりません',
  deck_size:'札を'+(z.required_size||12)+'枚選んでください',
  invalid_deck_size:'札を'+(z.required||12)+'枚選んでください',
  deck_base_cap:'同じ札は'+(z.cap||2)+'枚までです',
  deck_base_cap_exceeded:'同じ札は2枚までです',
  duplicate_owned_card:'同じ1枚を重ねて選ぶことはできません',
  duplicate_equipment:'同じ心得を重ねて装備することはできません',
  item_in_use:'持っていく物から外し、その変更を確定してください',
  item_locked:'保護を外すと手放せます',
  storage_write_failed:'保存できませんでした。選んだ内容は残っています',
  stale_revision:'別の操作で内容が変わりました。最新を確認してください',
  stale_view:'別の操作で内容が変わりました。最新を確認してください',
  stale_candidate:'この品は選べなくなりました',
  unknown_selection_handle:'この選択は古くなりました',
  candidate_unavailable:'今回はすでに買い物を終えています',
  feature_not_connected:'この機能は接続待ちです',
  conversion_value_not_connected:'戻る着想の額は接続待ちです',
  return_not_acknowledged:'「札を組む」から進んでください',
  purchase_not_selected:'買う品を選ぶか、選んだ札から外してください',
  dirty_draft:'選んだ変更を確認してください',
  content_not_ready:'探索への接続待ちです',
  learning_partition:'覚える心得を選び直してください',
  invalid_plan:'選んだ内容を確認できません',
  request_conflict:'再試行する操作が一致しません',
  invalid_request:'この操作を確認できません'
 };
 return messages[e?.code]||'選んだ内容を確認してください';
}
function baseName(base){return name('base:'+base);}
function baseNames(bases){return (bases||[]).map(baseName).join('・');}
function tag(text,cls=''){return '<span class="cw-state '+cls+'">'+esc(text)+'</span>';}
function tile(id,origin,amount){
 const d=detail(id),selected=plan?.next_preparation.deck.includes(id)||plan?.next_preparation.equipment.includes(id);
 const cancelling=origin==='心得'&&plan.cancel_learning.includes(d.base_id);
 const learning=origin==='心得'&&plan.next_preparation.learn.includes(d.base_id);
 const status=cancelling?'忘れる':learning?'覚える':selected?'✓':'';
 return '<button type="button" class="cw-tile '+(origin==='予定'||learning?'cw-planned ':'')+(cancelling?'cw-removing':'')+'" data-detail="'+esc(id)+'" data-origin="'+esc(origin)+'" aria-label="'+esc(d.name+(amount?'・'+amount:'')+(status?'・'+status:''))+'" aria-pressed="'+(win?.id===id&&win?.pinned?'true':'false')+'">'+
  '<span class="cw-art">'+icon(d.icon)+'</span><span class="cw-name">'+esc(d.name)+'</span>'+
  (status?tag(status):'')+(amount?'<span class="cw-count">'+esc(origin==='候補'?amount:'×'+amount)+'</span>':'')+'</button>';
}
function mini(id,count=1){
 if(stale)return '<span class="cw-mini cw-stale">'+esc(oldDetails[id==='$purchase'?plan?.candidate:id]?.name||'前の選択')+(count>1?' ×'+count:'')+'</span>';
 return '<button type="button" class="cw-mini '+(id==='$purchase'?'cw-planned':'')+'" data-detail="'+esc(id)+'" data-origin="予定">'+
  icon(detail(id).icon)+'<span>'+esc(name(id))+'</span>'+(count>1?'<small>×'+count+'</small>':'')+'</button>';
}
function moneyPair(c){
 if(!c?.ok)return '';
 return '<div class="cw-money-pair" aria-label="着想の比較"><div><small>現在</small><strong>'+pt(home().economy.unspent_units)+'</strong></div>'+
  '<span aria-hidden="true">→</span><div><small>変更後</small><strong>'+pt(c.stages.prepared.unspent_units)+'</strong></div></div>';
}
function changeRow(title,ids,amount,kind=''){
 return '<div class="cw-change '+kind+'"><div><small>'+esc(title)+'</small><span>'+esc(ids)+'</span></div>'+
  (amount!==undefined?'<strong>'+esc(amount)+'</strong>':'')+'</div>';
}
function namedChanges(c){
 if(!c?.ok)return c?'<p class="cw-error" role="alert">'+esc(noticeFor(c.refusal))+'</p>':'';
 let html='';
 if(plan.cancel_learning.length)html+=changeRow('忘れる',baseNames(plan.cancel_learning),'+'+pt(c.cancellation.actual_refund_units),'cw-removing');
 if(plan.candidate)html+=changeRow(detail('$purchase').kind==='card'?'1枚増える':'1個増える',name('$purchase'),'−'+pt(c.purchase.cost_units));
 if(plan.next_preparation.learn.length)html+=changeRow('覚える',baseNames(plan.next_preparation.learn),'−'+pt(c.learning.payment_units));
 return html;
}
function ledger(c){
 if(!c?.ok)return namedChanges(c);
 return '<section class="cw-money"><h3>着想</h3>'+moneyPair(c)+namedChanges(c)+'</section>';
}
function draftPane(){
 if(!home())return '';
 const p=plan.next_preparation,c=comparison;
 const used=c?.ok?c.prepared.equipment.used:dirty()?null:home().equipment.used;
 return '<aside class="cw-draft" aria-label="持っていく物"><div class="cw-row"><h3>持っていく物</h3>'+ (dirty()?tag('変更中'):'')+'</div>'+
  '<div class="cw-draft-content"><div class="cw-row"><span>札</span><small>'+p.deck.length+' / '+home().deck.required_size+'</small></div>'+
  '<div class="cw-mini-grid">'+counts(p.deck).map(x=>mini(x.id,x.count)).join('')+'</div>'+
  '<div class="cw-row"><span>装備</span><small>'+(used??'—')+' / '+home().equipment.capacity+'</small></div>'+
  '<div class="cw-mini-grid">'+(p.equipment.length?p.equipment.map(id=>mini(id)).join(''):'<small>なし</small>')+'</div>'+
  (dirty()?ledger(c):'')+'</div><div class="cw-draft-actions">'+
  (dirty()?button('変更を確認','review','','cw-primary')+'<div class="cw-actions">'+button('選択を保存','save-draft',stale?'disabled':'')+button('選択を戻す','discard-confirm')+'</div>':button('探索へ出発','depart','','cw-primary'))+'</div></aside>';
}
function learningGroups(){
 const h=home(),remembered=h.learning_options.filter(o=>h.economy.learned.some(l=>l.base===o.base));
 const other=h.learning_options.filter(o=>!h.economy.learned.some(l=>l.base===o.base));
 let html='';
 if(remembered.length)html+='<span class="cw-section-title">覚えている</span><div class="cw-grid">'+remembered.map(o=>tile('base:'+o.base,'心得')).join('')+'</div>';
 if(other.length&&dd().phase!=='return')html+='<span class="cw-section-title">覚えられる</span><div class="cw-grid">'+other.map(o=>tile('base:'+o.base,'心得')).join('')+'</div>';
 return html||'<p>覚えている心得はありません</p>';
}
function content(){
 const h=home();if(!h)return '<main class="cw-main"><p>表示データの接続待ちです</p></main>';
 let body='',heading='';
 if(section==='deck'){
  heading='札組';
  body='<span class="cw-section-title">いつでも使える</span><div class="cw-grid">'+h.free_card_options.map(id=>tile(id,'初期札',plan.next_preparation.deck.filter(x=>x===id).length)).join('')+'</div>';
  const owned=h.owned.filter(o=>o.selection_kind==='deck');
  if(owned.length)body+='<span class="cw-section-title">持っている</span><div class="cw-grid">'+owned.map(o=>tile(o.id,'所持',plan.next_preparation.deck.includes(o.id)?1:0)).join('')+'</div>';
  if(plan.candidate&&detail('$purchase').kind==='card')body+='<span class="cw-section-title">買う予定</span><div class="cw-grid">'+tile('$purchase','予定',plan.next_preparation.deck.includes('$purchase')?1:0)+'</div>';
 }
 if(section==='skills'){
  heading='心得';body=learningGroups();
  const owned=h.owned.filter(o=>o.selection_kind==='equipment');
  if(owned.length)body+='<span class="cw-section-title">持っている</span><div class="cw-grid">'+owned.map(o=>tile(o.id,'所持')).join('')+'</div>';
  if(plan.candidate&&detail('$purchase').kind==='passive')body+='<span class="cw-section-title">買う予定</span><div class="cw-grid">'+tile('$purchase','予定')+'</div>';
 }
 if(section==='owned'){
  heading='持ち物';
  body=!dd().capabilities?.purchase?.available&&!dd().capabilities?.convert_items?.available?'<div class="cw-empty"><p>持ち物の機能は接続待ちです</p></div>':
   '<div class="cw-grid">'+h.owned.map(o=>tile(o.id,o.locked?'保護中':'所持')).join('')+'</div>'+(!h.owned.length?'<div class="cw-empty"><p>まだ何も持っていません</p></div>':'');
 }
 if(section==='offers'){
  heading='買い物';
  body=!dd().capabilities?.purchase?.available?'<div class="cw-empty"><p>買い物の機能は接続待ちです</p></div>':
   !h.candidates.length?'<div class="cw-empty"><p>今は品物がありません</p></div>':
   '<div class="cw-row"><small>'+(h.offers?.status==='purchased'?'今回は購入済み':'1つ選べます')+'</small></div><div class="cw-grid">'+h.candidates.map(o=>tile(o.id,'候補',pt(o.price_units))).join('')+'</div>';
  if(plan.candidate)body+='<div class="cw-actions">'+button('買う品を選び直す','skip')+'</div>';
 }
 return '<main class="cw-main" aria-label="'+heading+'"><h2 class="cw-sr-only">'+heading+'</h2><div class="cw-scroll" data-scroll>'+body+'</div><small data-scroll-hint hidden>↓</small></main>'+draftPane();
}
function returnPage(){
 const r=dd().return_receipt;if(!r)return '<main class="cw-return"><p>帰還表示の接続待ちです</p></main>';
 const outcome={clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'}[r.outcome]||'帰還';
 const kept=r.kept_count??r.kept_items?.length, lost=r.lost_count??r.lost_items?.length;
 const found=(r.new_unlocks||[]).map(id=>Object.values(dd().details||{}).find(d=>d.base_id===id)?.name).filter(Boolean);
 return '<main class="cw-return"><div class="cw-return-head"><small>'+outcome+'</small><h2>戻ってきた</h2><div>着想 <strong>+'+pt(r.gained_units)+'</strong></div></div>'+
  '<div class="cw-return-list">'+(kept!==undefined?'<div class="cw-row"><span>持ち帰った物</span><span>'+kept+'個</span></div>':'')+
  (lost?'<div class="cw-row"><span>失った物</span><span>'+lost+'個</span></div>':'')+
  (r.new_unlocks?.length?'<details><summary>見つけたもの</summary><p>'+esc(found.join('・')||r.new_unlocks.length+'種類')+'</p></details>':'')+
  (dirty()?ledger(comparison):'')+'</div><div class="cw-return-actions">'+
  (home()?.economy.learned.length?button('心得を選び直す','return-pick'):'')+
  (dirty()?button('変更を確認','review'):'')+button('札を組む','ack','','cw-primary')+'</div></main>';
}
function popupHeader(title,canPin=false){
 return '<div class="cw-row"><h2>'+esc(title)+'</h2>'+
  (canPin?button(icon(win?.pinned?'pin':'pin-off',win?.pinned?'◆':'◇'),'pin','aria-label="'+(win?.pinned?'ピン留めを解除':'ピン留め')+'" aria-pressed="'+!!win?.pinned+'"','cw-pin'):'')+
  button('閉じる','close','','cw-close')+'</div>';
}
function detailBody(id){
 const d=detail(id),h=home(),candidate=h?.candidates.find(c=>c.id===id),owned=h?.owned.find(o=>o.id===id);
 const learned=isLearned(d.base_id),n=plan?.next_preparation.deck.filter(x=>x===id).length||0,returning=dd().phase==='return';
 let body=popupHeader(d.name,true)+'<div class="cw-art">'+icon(d.icon)+'</div>'+
  (d.affixes?.length?d.affixes.map(a=>'<div><small>'+esc(a.label)+'</small><p>'+esc(a.description)+'</p></div>').join(''):'')+
  (d.effect_text?'<p>'+esc(d.effect_text)+'</p>':'')+publicFields(d);
 if(candidate){
  body+='<div class="cw-price"><span>着想</span><strong>'+pt(candidate.price_units)+'</strong><small>1'+(d.kind==='card'?'枚':'個')+'</small></div>'+
   (d.kind==='passive'&&!learned?'<small>この品を使うには「'+esc(baseName(d.base_id))+'」を覚える必要があります</small>':'')+
   '<div class="cw-actions">'+button(plan.candidate===id?'買う予定から外す':'これを買う予定にする','candidate','data-id="'+esc(id)+'" '+(!candidate.available?'disabled':''),'cw-primary')+'</div>';
  return body;
 }
 if(id.startsWith('base:')&&d.kind==='passive'){
  const already=h.economy.learned.some(l=>l.base===d.base_id),cancelled=plan.cancel_learning.includes(d.base_id),newly=plan.next_preparation.learn.includes(d.base_id);
  if(already){
   body+='<section class="cw-choice-block"><div class="cw-row"><span>'+(cancelled?'忘れる予定':'覚えている')+'</span>'+
    button(cancelled?'忘れずに残す':'忘れる','learning','data-base="'+esc(d.base_id)+'"')+'</div>'+
    '<small>装備できなくなり、着想が戻ります。持ち物は残ります。</small></section>';
  }else if(!returning){
   body+='<section class="cw-choice-block"><div class="cw-price"><span>覚える</span><strong>着想 '+pt(d.learning_cost_units)+'</strong></div>'+
    button(newly?'覚える予定を外す':'この心得を覚える','learning','data-base="'+esc(d.base_id)+'"','cw-primary')+'</section>';
  }
 }
 if(!returning){
  if(d.kind==='card')body+='<div class="cw-row"><span>持っていく枚数</span><div class="cw-actions">'+
   button('−','deck-remove','data-id="'+esc(id)+'" aria-label="札組から1枚外す" '+(!n?'disabled':''))+'<strong>'+n+'</strong>'+
   button('＋','deck-add','data-id="'+esc(id)+'" aria-label="札組に1枚加える" '+(!id.startsWith('base:')&&n?'disabled':''),'cw-primary')+'</div></div>';
  else body+='<section class="cw-choice-block"><div class="cw-row"><span>装備 '+d.equipment_cost+'</span>'+
   button(plan.next_preparation.equipment.includes(id)?'装備から外す':'装備する','equip','data-id="'+esc(id)+'" '+(!learned?'disabled':''),'cw-primary')+'</div>'+
   (!learned?'<small>覚えると装備できます</small>':'')+'</section>';
 }
 if(owned&&!returning)body+='<div class="cw-actions">'+button(icon(owned.locked?'lock-keyhole':'lock-open',owned.locked?'◆':'◇'),'lock','data-id="'+esc(id)+'" aria-label="'+(owned.locked?'保護を外す':'保護する')+'"')+
  button('手放す額を見る','quote','data-id="'+esc(id)+'"','cw-danger')+'</div>';
 return body;
}
function equipmentChanges(c){
 let html='';
 for(const [key,label] of [['removed','装備から外れる'],['added','装備する']]){
  if(c.differences.equipment[key].length)html+='<div class="cw-result-group"><small>'+label+'</small><div class="cw-mini-grid">'+c.differences.equipment[key].map(x=>mini(x.id)).join('')+'</div></div>';
 }
 const changed=new Set([...c.differences.deck.removed,...c.differences.deck.added].map(x=>x.id));
 if(changed.size){
  const before=counts(currentPlan().next_preparation.deck),after=counts(plan.next_preparation.deck);
  html+='<div class="cw-result-group"><small>持っていく札</small>';
  for(const id of changed)html+=changeRow('',name(id),(before.find(x=>x.id===id)?.count||0)+' → '+(after.find(x=>x.id===id)?.count||0)+'枚');
  html+='</div>';
 }
 if(c.differences.existing_possessions_preserved&&plan.cancel_learning.length)html+='<small>すでに持っている物は残ります</small>';
 if(plan.candidate)html+='<div class="cw-result-group"><small>増える持ち物</small>'+mini('$purchase')+
  (!c.purchase.selected_in_preparation?'<small>持っていく物には入っていません</small>':'')+'</div>';
 return html;
}
function paymentOrder(){
 if(!plan.candidate||!plan.next_preparation.learn.length)return '';
 const buy=name('$purchase'),learn=baseNames(plan.next_preparation.learn);
 return '<details class="cw-payment-order"><summary>支払いの順番</summary><label><span>先に払う対象</span><select data-timing aria-label="先に払う対象">'+
  '<option value="before_preparation" '+(plan.purchase_timing==='before_preparation'?'selected':'')+'>'+esc(buy)+'（品物）</option>'+
  '<option value="after_preparation" '+(plan.purchase_timing==='after_preparation'?'selected':'')+'>'+esc(learn)+'（覚える）</option></select></label></details>';
}
function renderWindow(){
 const overlay=$('[data-overlay]');if(!win){overlay.innerHTML='';return;}
 let body='',review=false,title='';
 if(win.type==='detail'){title=name(win.id);body=detailBody(win.id);}
 if(win.type==='learning-picker'){
  title='心得を選ぶ';body=popupHeader(title)+learningGroups()+(dirty()?ledger(comparison):'')+
   '<div class="cw-actions">'+(dirty()?button('変更を確認','review'):'')+button('札を組む','ack','','cw-primary')+'</div>';
 }
 if(win.type==='review'){
  review=true;title='選んだ変更';const c=comparison;
  body=popupHeader(title)+(c?.ok?'<div class="cw-review-cols">'+ledger(c)+'<section class="cw-review-list">'+equipmentChanges(c)+'</section></div>':c?namedChanges(c):'<p>確認中…</p>')+
   paymentOrder()+'<div class="cw-actions">'+
   (dd().phase==='return'?button('札を組む','ack','','cw-primary'):button('変更を確定','commit',c?.ok&&!stale?'':'disabled','cw-primary'))+'</div>';
  if(dd().phase==='return')body+='<small>ここではまだ変更しません</small>';
 }
 if(win.type==='conversion'){
  title=name(win.id)+'を手放す';body=popupHeader(title);
  if(quote)body+='<div class="cw-art">'+icon(detail(win.id).icon)+'</div>'+changeRow('なくなる',name(win.id),quote.removed_count+'個')+
   changeRow('戻る','着想','+'+pt(quote.total_units))+changeRow('手放した後','着想',pt(quote.unspent_after_units))+
   '<div class="cw-actions">'+button('手放す','convert','data-id="'+esc(win.id)+'"','cw-danger')+'</div>';
  else body+='<p class="cw-error" role="alert">'+esc(notice||'確認中…')+'</p>';
 }
 if(win.type==='discard'){
  title='選んだ変更を元に戻す';body=popupHeader(title)+'<p>まだ確定していない変更だけを戻します。</p>'+
   '<div class="cw-actions">'+button('選択を戻す','discard','','cw-danger')+'</div>';
 }
 overlay.innerHTML='<div class="'+(win.type==='detail'?'cw-detail-layer':'cw-shade')+'" data-outside><section class="cw-popup '+(review?'cw-review':'')+'" role="dialog" aria-label="'+esc(title)+'">'+body+'</section></div>';
 positionDetail();icons();
}
function openDetail(id,origin,pinned){
 if(win?.type==='detail'&&win.id===id&&pinned){if(win.pinned){win=null;renderWindow();return;}win.pinned=true;renderWindow();return;}
 if(!pinned&&win?.pinned)return;
 win={type:'detail',id,origin,pinned};renderWindow();
}
