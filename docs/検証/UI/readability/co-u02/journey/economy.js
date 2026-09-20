// D03 presentation and explicit commands only. Prices, eligibility and quotes
// are supplied by Campaign. No inventory IDs or blueprint parsing here.
const usageLabels={equipment:'装備中',confirmed_deck:'札組で使用中',saved_draft_equipment:'保存した装備案',saved_draft_deck:'保存した札組案'};
function economyFailure(e){
 const labels={stale_or_unknown_candidate:'候補が入れ替わりました。最新を読み、選び直してください',offer_already_purchased:'この候補からは購入済みです',missing_possession:'所持品が変わりました。最新を読み、選び直してください',unknown_selection_handle:'選択が古くなりました。最新を読み、選び直してください',return_not_acknowledged:'帰還結果を確認して拠点へ進んでください',item_locked:'ロック中です',item_in_use:'札組・装備・保存した案で使用中です',purchase_not_yet_available:'購入前の編成には購入予定品を使えません',unlearned_equipment_base:'先に基礎の心得を覚えてください',insufficient_unspent_funds:'着想が足りません',unsaved_draft:'編成案を確定するか、変更案を戻してください',duplicate_owned_card:'同じ所持札は1枚だけ使えます',duplicate_equipment:'同じ個体を重ねて装備できません'};
 const detail=e?.details,amount=e?.purchase_request?.shortage_units;
 return labels[e?.code] ? labels[e.code]+(Number.isFinite(amount)?'（不足 '+pt(amount)+'）':e.code==='insufficient_unspent_funds'&&Number.isFinite(detail?.required_units)?'（必要 '+pt(detail.required_units)+'／現在 '+pt(detail.available_units)+'）':'') : null;
}
function affixView(item){return item?.affixes?.length?'<h3>修飾</h3><dl class="cj-skill-structure">'+item.affixes.map(a=>'<div><dt>'+esc(a.label)+'</dt><dd>'+esc(a.description)+'</dd></div>').join('')+'</dl>':'';}
function possessionLabel(id){return id==='$purchase'?'購入予定':h()?.owned.some(x=>x.id===id)?'所持1':h()?.free_card_options.includes(id)?'無料札':'';}
function offerStatus(){const offers=h().offers;return offers.status==='purchased'?'この帰還の候補は購入済み':offers.status==='none'?(offers.reason==='no_eligible_offer'?'条件に合う購入候補なし':'購入候補なし'):offers.carried_from_previous_return?'前回の候補を持越し':'帰還からの候補';}
function economyTile(id){
 const owned=tab==='owned',row=(owned?h().owned:h().candidates).find(x=>x.id===id),item=info(id);
 if(!row)return '';
 const pendingPurchase=p()?.candidate===id;
 const details=button('<span class="cj-card-art" aria-hidden="true">'+icon(itemIcon(id))+'</span><strong>'+esc(name(id))+'</strong><small>'+esc(owned?(row.references||[]).map(r=>usageLabels[r]||'使用中').join('・')||'所持1':'−'+pt(row.price_units))+'</small>','detail','data-id="'+esc(id)+'" data-tooltip="'+esc(name(id))+'"','cj-card-face');
 let controls='';
 if(owned){
  controls=button(row.locked?'ロック解除':'ロック','lock','data-id="'+esc(id)+'" data-j-mutation '+(dirty()||!session.can('set_item_lock')?'disabled':'')+' aria-pressed="'+row.locked+'"');
  controls+=button(conversionIds.has(id)?'✓ 変換対象':row.conversion_available?'変換':row.locked?'ロック中':'使用中','convert-select','data-id="'+esc(id)+'" '+(!row.conversion_available||dirty()?'disabled':'')+' aria-pressed="'+conversionIds.has(id)+'"');
 }else{
  controls=button(pendingPurchase?'✓ 購入案':'編成と比較','plan-purchase','data-id="'+esc(id)+'" data-j-mutation '+(!row.available||d().phase!=='home'?'disabled':''));
  controls+=button(!row.available?'購入済み':!row.affordable_now?'着想不足':'購入 −'+pt(row.price_units),'buy-preview','data-id="'+esc(id)+'" '+(!row.available||!row.affordable_now||!session.can('purchase')||dirty()?'disabled':''));
 }
 return '<article class="cj-cardpiece cj-economy-piece '+(pendingPurchase||conversionIds.has(id)?'cj-included':'')+'" data-piece="'+esc(id)+'">'+details+'<div class="cj-economy-actions">'+controls+'</div></article>';
}
function purchasePanel(){const row=h()?.candidates.find(x=>x.id===purchaseChoice);if(!row)return {body:'<p>対象を選び直してください</p>',actions:''};
 return {body:'<h3>'+esc(name(row.id))+'</h3><p>所持に1点追加</p><div class="cj-change"><span>購入額</span><strong>−'+pt(row.price_units)+'</strong></div><p>現在の着想 '+pt(h().economy.unspent_units)+'</p>'+affixView(info(row.id)),actions:button('購入する','buy-confirm','data-j-mutation '+(!row.available||!row.affordable_now||!session.can('purchase')||dirty()?'disabled':''),'cj-primary')};
}
function conversionPanel(){const q=state.quote;
 if(!q)return {body:'<p>'+(state.error?esc(reason(state.error)):'変換額を確認中…')+'</p>',actions:''};
 return {body:q.items.map(item=>'<section class="cj-convert-row"><h3>'+esc(name(item.id))+'</h3><span>着想 +'+pt(item.units)+'</span>'+(item.loses_variant_access?'<p class="cj-warning">最後の1点です。変換すると、この種類は使えなくなります。</p>':item.free_option_retained?'<p>無料で選べる基本の札・心得は残ります。</p>':'')+'</section>').join('')+'<div class="cj-change"><span>着想</span><strong>'+pt(q.unspent_before_units)+' → '+pt(q.unspent_after_units)+'</strong></div>',actions:button(q.removed_count+'点を変換する','convert-confirm','data-j-mutation '+(!session.can('convert_items')||dirty()?'disabled':''),'cj-primary')};
}
function purchasePlanControls(){if(!p()?.candidate)return '';
 return '<section class="cj-purchase-plan"><h3>購入案：'+esc(name(p().candidate))+'</h3><div>'+button('購入してから編成','purchase-order','data-order="before_preparation" data-j-mutation aria-pressed="'+(p().purchase_timing==='before_preparation')+'"')+button('編成してから購入','purchase-order','data-order="after_preparation" data-j-mutation aria-pressed="'+(p().purchase_timing==='after_preparation')+'"')+'</div>'+button('購入案を外す','clear-purchase','data-j-mutation')+'</section>';
}
async function economyAction(action,id,b){
 if(action==='plan-purchase'){if(d().phase!=='home'||!h().candidates.find(x=>x.id===id)?.available)return true;
  await edit(next=>{next.next_preparation.deck=next.next_preparation.deck.filter(x=>x!=='$purchase');next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>x!=='$purchase');next.candidate=next.candidate===id?null:id;next.purchase_timing='before_preparation';});
  if(p().candidate){tab=info(id).kind==='passive'?'skills':'deck';place='compose';pageAnchors[tab]=Math.max(0,catalogueItems().length-1);}panel='review';render();return true;
 }
 if(action==='purchase-order'){await edit(next=>next.purchase_timing=b.dataset.order);return true;}
 if(action==='clear-purchase'){await edit(next=>{next.candidate=null;next.next_preparation.deck=next.next_preparation.deck.filter(x=>x!=='$purchase');next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>x!=='$purchase');});return true;}
 if(action==='buy-preview'){if(busy())return true;purchaseChoice=id;rememberAnchor(b);panelTrail=[];panel='purchase';render();return true;}
 if(action==='buy-confirm'){const candidate=purchaseChoice;if(!candidate)return true;await sequence(async()=>{const result=await session.execute('purchase',{candidate});if(result.ok){resetWindows();place='compose';tab='owned';message='所持に追加';}});return true;}
 if(action==='lock'){const row=h()?.owned.find(x=>x.id===id);if(row)await perform('set_item_lock',{item_id:id,locked:!row.locked});return true;}
 if(action==='convert-select'){if(busy()||!h()?.owned.find(x=>x.id===id)?.conversion_available)return true;if(conversionIds.has(id))conversionIds.delete(id);else conversionIds.add(id);render();return true;}
 if(action==='convert-preview'){if(busy()||!conversionIds.size)return true;rememberAnchor(b);panelTrail=[];panel='conversion';await session.quote([...conversionIds].sort());render();return true;}
 if(action==='convert-confirm'){const ids=state.quote?.items.map(x=>x.id);if(!ids)return true;await perform('convert_items',{item_ids:ids});return true;}
 return false;
}
