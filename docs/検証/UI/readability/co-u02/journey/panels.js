/* Presentation helpers injected into mountJourney. No private catalogue or price calculation. */
function paragraph(id){const t=d().texts?.[id];return t?'<p data-j-text="'+esc(id)+'">'+esc(t.short_text||t.detail_text||'')+'</p>':'';}
function sceneCopy(){const s=d().scene;if(!s)return '';return '<div class="cj-story">'+(s.text_ids||[]).map(paragraph).join('')+
 ((s.optional_text_ids||[]).length?'<div class="cj-optionals">'+s.optional_text_ids.map((id,index)=>button('詳しく '+(index+1),'optional','data-id="'+esc(id)+'" aria-expanded="'+expanded.has(id)+'"','cj-quiet')+(expanded.has(id)?paragraph(id):'')).join('')+'</div>':'')+'</div>';}
function wallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;
 return '<div class="cj-wallet"><span>着想</span><strong>'+pt(now)+'</strong>'+(dirty()?'<span class="cj-arrow">→</span><strong class="cj-changed">'+pt(after)+'</strong><small>変更案</small>':committedFlash?'<small>確定済み</small>':'')+'</div>';}
function returnView(){const r=d().return_receipt,labels={clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'};
 if(!r)return '<p>帰還結果を読み込めませんでした</p>';
 const materials=(r.kept_items||[]).filter(x=>x.kind!=='points'),lost=r.lost_items||[];
 const retry=d().case?.status!=='resolved'&&r.outcome!=='clear';
 return '<section class="cj-result"><div class="cj-result-scroll" data-result-scroll><div class="cj-landscape" aria-hidden="true"><div></div><div></div><div></div></div><div class="cj-result-top"><span class="cj-eyebrow">帰還</span><h1>'+esc(labels[r.outcome]||'探索終了')+'</h1><p>'+esc(title)+'</p></div>'+sceneCopy()+
 '<div class="cj-receipt"><div class="cj-gain"><span>着想</span><strong>+'+pt(r.gained_units)+'</strong><small>合計 '+pt(r.unspent_after_units)+'</small></div>'+materials.map(x=>'<div class="cj-return-item">'+icon('package')+'<span>素材 '+esc(x.type||'')+'</span><strong>+'+esc(x.amount||1)+'</strong></div>').join('')+
 (r.home_hp!=null?'<div class="cj-recovery"><span>余力</span><strong>'+r.expedition_end_hp+' <span>→</span> '+r.home_hp+'</strong></div>':'')+'</div>'+
 (lost.length?'<p class="cj-warning">喪失 '+lost.length+'件</p>':'')+
 ((r.new_unlocks||[]).length?'<div class="cj-unlocks"><span>記録に追加</span><div>'+r.new_unlocks.map(id=>detailsButton('base:'+id)).join('')+'</div></div>':'')+
 '</div><div class="cj-result-actions">'+button((retry?'再挑戦':'拠点へ')+' '+icon('arrow-right'),retry?'depart':'hub','data-j-mutation','cj-primary')+'<div>'+button('札組','deck','data-j-mutation')+button('心得','skills','data-j-mutation')+button(retry?'拠点へ':'再訪',retry?'hub':'depart','data-j-mutation','cj-quiet')+'</div></div></section>';
}
function hubView(){const objective=d().texts?.[d().case.objective_text_id];return '<section class="cj-hub"><div class="cj-page-heading"><div><span class="cj-eyebrow">拠点</span><h1>探索先</h1></div>'+wallet()+'</div><div class="cj-destination"><div class="cj-landscape" aria-hidden="true"><div></div><div></div><div></div></div><div class="cj-destination-copy"><span class="cj-eyebrow">'+(d().case.status==='resolved'?'再訪':'探索')+'</span><h2>'+esc(title)+'</h2><p>'+esc(objective?.short_text||'目的は出発後の本文で確認できます')+'</p>'+button('調査記録','records','','cj-quiet')+'</div></div><div class="cj-hub-build"><div><span>札組</span><strong>'+h().deck.size+'枚</strong></div><div><span>心得</span><strong>'+h().equipment.entries.length+'個</strong></div>'+button('札組','deck')+button('心得','skills')+'</div>'+(dirty()?'<div class="cj-hub-draft">'+changeRows()+button('編成に戻る','deck')+'</div>':'')+'<div class="cj-end-actions">'+button(dirty()?'確定して出発':'出発 '+icon('arrow-right'),'depart','data-j-mutation','cj-primary')+'</div></section>';}
function cardTile(id){const item=info(id),n=count(id),current=count(id,api.currentPlan(state.view).next_preparation.deck),kind=item.primary?.kind;
 const baseCount=p().next_preparation.deck.filter(x=>info(x).base_id===item.base_id).length;
 return '<article class="cj-cardpiece '+(n?'cj-included':'')+'" data-piece="'+esc(id)+'">'+
 button('<span class="cj-card-art" data-kind="'+esc(kind||'')+'">'+icon(itemIcon(id))+'</span><strong>'+esc(name(id))+'</strong><small>'+(item.primary?({attack:'突破',guard:'身構',heal:'回復'})[kind]+' '+item.primary.power:'')+'</small>','detail','data-id="'+esc(id)+'" data-focus="detail-'+esc(id)+'" aria-pressed="'+(selected.deck===id)+'" aria-label="'+esc(name(id))+'の詳細"','cj-card-face')+
 '<div class="cj-counter">'+button('−','remove','data-id="'+esc(id)+'" data-focus="remove-'+esc(id)+'" data-j-mutation aria-label="'+esc(name(id))+'を1枚外す" '+(!n?'disabled':''))+'<span aria-label="変更案 '+n+'枚">'+(n!==current?'<small>'+current+' →</small> ':'')+'<strong>'+n+'</strong></span>'+button('+','add','data-id="'+esc(id)+'" data-focus="add-'+esc(id)+'" data-j-mutation aria-label="'+esc(name(id))+'を1枚加える" '+(baseCount>=h().deck.per_base_cap||(!id.startsWith('base:')&&n)?'disabled':''))+'</div></article>';
}
function skillStructure(item){return '<dl class="cj-skill-structure"><div><dt>発動条件</dt><dd>'+esc(item.trigger_text||'未提供')+'</dd></div><div><dt>効果</dt><dd>'+esc(item.effect_text||'未提供')+'</dd></div></dl>';}
function skillTile(id){const item=info(id),on=equipped(id),known=learned(item.base_id),cancelled=p().cancel_learning.includes(item.base_id),newly=p().next_preparation.learn.includes(item.base_id);
 const label=cancelled?'忘れる案':newly?'覚える案':known?'覚えた心得':'';
 return '<article class="cj-skillpiece cj-cardpiece '+(on?'cj-included':'')+'" data-piece="'+esc(id)+'">'+button('<span class="cj-card-art" aria-hidden="true">'+icon('sparkles')+'</span><strong>'+esc(name(id))+'</strong><span class="cj-slot-cost">枠消費 '+item.equipment_cost+'</span><span class="cj-state-label">'+(on?'✓ 装備':label)+'</span>','detail','data-id="'+esc(id)+'" data-focus="detail-'+esc(id)+'" aria-pressed="'+(selected.skills===id)+'"','cj-card-face')+'<div class="cj-skill-action">'+button(on?'外す':known?'装備':cancelled?'覚えた状態に戻す':'覚えて装備 −'+pt(item.learning_cost_units),cancelled?'restore-skill':'equip','data-id="'+esc(id)+'" data-focus="equip-'+esc(id)+'" data-j-mutation',on?'':'cj-primary')+'</div></article>';
}
function composeView(){const skills=tab==='skills',c=state.comparison,used=c?.ok?c.prepared.equipment.used:null;
 const items=skills?h().learning_options.map(x=>'base:'+x.base):h().free_card_options,owned=h().owned.filter(x=>x.selection_kind===(skills?'equipment':'deck'));
 return '<section class="cj-compose"><div class="cj-page-heading"><div><span class="cj-eyebrow">編成</span><div class="cj-tabs" aria-label="編成の切替">'+button('札組','deck','aria-pressed="'+!skills+'"')+button('心得','skills','aria-pressed="'+skills+'"')+'</div></div>'+wallet()+'</div><div class="cj-compose-grid"><section class="cj-catalogue" data-catalogue aria-label="'+(skills?'心得一覧':'札一覧')+'"><div class="cj-catalogue-heading"><span>'+(skills?'使用枠':'札組')+'</span><strong>'+ (skills?(used??(dirty()?'—':h().equipment.used))+' / '+h().equipment.capacity:p().next_preparation.deck.length+' / '+h().deck.required_size)+'</strong>'+(dirty()?'<small>変更案</small>':'')+'</div><div class="'+(skills?'cj-skills':'cj-cards')+'">'+items.map(skills?skillTile:cardTile).join('')+'</div>'+
 (owned.length?'<h3>所持</h3><div class="'+(skills?'cj-skills':'cj-cards')+'">'+owned.map(x=>(skills?skillTile:cardTile)(x.id)).join('')+'</div>':'')+
 '<details class="cj-unavailable"><summary>'+(skills?'別の心得':'別の札')+'</summary><p>購入・変換は本体の対応待ちです。</p></details></section><aside class="cj-summary" aria-label="編成と変更の確認"><h2>'+(dirty()?'変更案':committedFlash?'確定済み':'現在の編成')+'</h2>'+summaryContents()+ '</aside></div></section>';
}
function miniList(ids){return group(ids).map(x=>'<span class="cj-mini">'+esc(name(x.id))+(x.count>1?' ×'+x.count:'')+'</span>').join('')||'<span class="cj-muted">なし</span>';}
function changeRows(){const c=state.comparison;if(!c)return '<p class="cj-muted">'+(state.pending?'確認中…':'変更の確認待ち')+'</p>';if(!c.ok)return '<p class="cj-warning" role="alert">'+esc(reason(c.refusal))+'</p>';
 const rows=[];const row=(object,change)=>rows.push('<div class="cj-change"><span>'+esc(object)+'</span><strong>'+change+'</strong></div>');
 if(c.cancellation.bases.length)row(c.cancellation.bases.map(id=>name('base:'+id)).join('・')+'を忘れる','着想 +'+pt(c.cancellation.actual_refund_units));
 if(p().next_preparation.learn.length)row(p().next_preparation.learn.map(id=>name('base:'+id)).join('・')+'を覚える','着想 −'+pt(c.learning.payment_units));
 for(const [key,verb]of [['removed','外す'],['added','装備']])for(const x of c.differences.equipment[key])row(name(x.id),verb);
 const initial=api.currentPlan(state.view).next_preparation.deck;
 for(const id of new Set([...c.differences.deck.added,...c.differences.deck.removed].map(x=>x.id)))row(name(id),count(id,initial)+' → '+count(id)+'枚');
 return '<div class="cj-changes">'+rows.join('')+'</div>';
}
function summaryContents(){const c=state.comparison;
 return '<div class="cj-setup-line"><span>心得</span><div>'+miniList(p().next_preparation.equipment)+'</div></div><div class="cj-setup-line"><span>札組</span><strong>'+p().next_preparation.deck.length+'枚</strong></div>'+
 (dirty()?'<div class="cj-summary-diff">'+changeRows()+'</div>':'')+
 '<div class="cj-summary-actions">'+button(dirty()?'確定して出発':'出発 '+icon('arrow-right'),'depart','data-j-mutation '+(dirty()&&!c?.ok?'disabled':''),'cj-primary')+
 (dirty()?'<div>'+button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':''))+button('比較','review')+'</div>':'')+'</div>';
}
function sceneView(){return '<section class="cj-scene-copy"><span class="cj-eyebrow">'+esc(title)+'</span>'+sceneCopy()+'<div class="cj-end-actions">'+button(d().scene?.paused?'進む':'探索に戻る',d().scene?.paused?'continue':'scene-back','data-j-mutation','cj-primary')+'</div></section>';}
function startView(){return '<section class="cj-start"><span class="cj-eyebrow">'+esc(title)+'</span><h1>crossweave</h1>'+button('続きから','resume','data-j-mutation','cj-primary')+'<small>この試作を開いている間だけ保持</small></section>';}
function detailView(id){const item=info(id),base=item.base_id,passive=item.kind==='passive',known=learned(base),cancelled=p()?.cancel_learning.includes(base);
 const w=windows.find(x=>x.id===id);
 const head='<div class="cj-inspect-top"><h2>'+esc(name(id))+'</h2>'+button(icon('pin'),'pin','data-id="'+esc(id)+'" aria-label="固定" aria-pressed="'+!!w?.pinned+'"','cj-icon-button')+button(icon('x'),'close-item','data-id="'+esc(id)+'" aria-label="詳細を閉じる"','cj-icon-button')+'</div>';
 let body=detailFromRecords?button('調査記録に戻る','records-back','','cj-quiet'):'',actions='';
 if(passive)body+='<div class="cj-detail-cost"><span>枠消費</span><strong>'+item.equipment_cost+'</strong></div>'+skillStructure(item);
 else{if(item.trigger_text)body+='<p>'+esc(item.trigger_text)+'</p>';if(item.effect_text)body+='<p>'+esc(item.effect_text)+'</p>';}
 if(item.primary)body+='<dl>'+[['主効果',item.primary.power],['探査',item.primary.hit],['手札期限',item.life],['設置間隔',item.action_intervals?.place],['一致間隔',item.action_intervals?.match]].filter(([,v])=>v!=null).map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join('')+'</dl>';
 if(d().phase==='home'&&passive){actions=button(equipped(id)?'装備から外す':known?'装備':'覚えて装備 −'+pt(item.learning_cost_units),'equip','data-id="'+esc(id)+'" data-j-mutation '+(cancelled?'disabled':''),'cj-primary');
  if(known)actions+=button('忘れる','forget','data-id="'+esc(id)+'" data-j-mutation');
  else if(cancelled)actions+=button('覚えた状態に戻す','restore-skill','data-id="'+esc(id)+'" data-j-mutation');
  else actions+=button('覚える −'+pt(item.learning_cost_units),'learn','data-id="'+esc(id)+'" data-j-mutation');
  if(cancelled)body+='<p>この心得の装備が外れる</p>';
 }else if(d().phase==='home'&&h().free_card_options.includes(id))actions=button('−1枚','remove','data-id="'+esc(id)+'" data-j-mutation '+(!count(id)?'disabled':''))+ '<strong>'+count(id)+'枚</strong>'+button('+1枚','add','data-id="'+esc(id)+'" data-j-mutation '+(p().next_preparation.deck.filter(x=>info(x).base_id===base).length>=h().deck.per_base_cap?'disabled':''));
 else if(!(h()?.free_card_options||[]).includes(id)&&item.kind==='card')body+='<p class="cj-muted">記録に追加。札組への追加はまだ未対応。</p>';
 return '<section class="cj-inspect-item" data-inspect-key="'+esc(id)+'">'+head+'<div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}
__JOURNEY_RECORDS__
function renderPanel(){const box=$('[data-inspector]');box.hidden=!panel;box.dataset.count=panel==='details'?windows.length:panel==='records'&&recordDetail?2:1;box.dataset.layout=panel==='records'&&recordDetail?'records-child':'windows';box.parentElement.classList.toggle('cj-has-inspector',!!panel);if(!panel){box.replaceChildren();return;}
 if(panel==='details'){box.innerHTML=windows.map(w=>detailView(w.id)).join('');return;}
 const titles={review:'現在と変更案',records:'調査記録',menu:'メニュー',help:'遊び方',settings:'表示',data:'保存データ'};
 let body='',actions='';
 if(panel==='review'){body=wallet()+changeRows()+'<p class="cj-muted">所持品の増減なし</p>';actions=button('確定','commit','data-j-mutation '+(!state.comparison?.ok?'disabled':''),'cj-primary')+button('確定して出発','depart','data-j-mutation '+(!state.comparison?.ok?'disabled':''));}
 if(panel==='records')body=recordsView();
 if(panel==='menu')body='<div class="cj-menu-list">'+button('表示','settings')+button('遊び方','help')+button('保存データ','data')+button('中断','suspend','data-j-mutation')+(dirty()?button('変更案を戻す','discard','data-j-mutation'):'')+'</div>';
 if(panel==='settings')body='<label class="cj-setting"><input type="checkbox" data-motion '+(root.dataset.motion==='reduced'?'checked':'')+'> 動きを抑える</label>';
 if(panel==='help')body='<h3>編成</h3><p>札の＋／−で枚数を変える。心得は「覚えて装備」でまとめて選ぶ。名前を押すと発動条件と効果を確認できる。</p><p>着想と構成の差分を見て確定。札組と心得の切替では、変更案はそのまま残る。</p><h3>探索</h3><p>札を選び、相手を指定して場に出す。相手の詳細は横の情報ボタンから開く。札を押し続けて場へ運ぶ操作も使える。</p><p>画面が低い場合、札の詳細は同じ札をもう一度押して開く。</p><div class="cj-help-symbols">'+[['arrow-up-right','突破'],['scan-search','探査'],['shield','身構'],['wind','攪乱']].map(([symbol,label])=>'<span>'+icon(symbol)+label+'</span>').join('')+'</div>';
 if(panel==='data')body='<p>この試作は一時メモリーを使用します。</p>'+button('書き出す','export')+'<textarea data-export hidden readonly aria-label="書き出した保存データ" rows="8"></textarea><p class="cj-muted">読み込み・新規開始は既存の実セーブ接続画面で扱います。</p>';
 box.innerHTML='<section class="cj-inspect-item" data-inspect-key="'+panel+'"><div class="cj-inspect-top"><h2>'+titles[panel]+(panel==='records'&&recordDetail?'<span class="cj-record-context">'+esc(recordDetail.name)+'</span>':'')+'</h2>'+button(icon('x'),'close','aria-label="窓を閉じる"','cj-icon-button')+'</div><div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>'+(panel==='records'&&recordDetail?recordDetailView():'');
}
