/* Presentation helpers injected into mountJourney. No private catalogue or price calculation. */
function paragraph(id){const t=d().texts?.[id];return t?'<p data-j-text="'+esc(id)+'">'+esc(t.short_text||t.detail_text||'')+'</p>':'';}
function sceneCopy(){const s=d().scene;if(!s)return '';return '<div class="cj-story">'+(s.text_ids||[]).map(paragraph).join('')+
 ((s.optional_text_ids||[]).length?'<div class="cj-optionals">'+s.optional_text_ids.map((id,index)=>button('詳しく '+(index+1),'optional','data-id="'+esc(id)+'" aria-expanded="'+expanded.has(id)+'"','cj-quiet')+(expanded.has(id)?paragraph(id):'')).join('')+'</div>':'')+'</div>';}
function wallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;
 return '<div class="cj-wallet"><span>着想</span><strong>'+pt(now)+'</strong>'+(dirty()?'<span class="cj-arrow">→</span><strong class="cj-changed">'+pt(after)+'</strong><small>変更案</small>':committedFlash?'<small>確定済み</small>':'')+'</div>';}
function outcome(){return ({clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'})[d().return_receipt?.outcome]||'探索終了';}
function landscape(){return '<div class="cj-landscape cj-backdrop" aria-hidden="true"><div></div><div></div><div></div></div>';}
function readWindow(){return d().scene?'<section class="cj-reading-window" aria-label="場面の本文"><div class="cj-reading-scroll" data-reading="'+esc(d().scene.id)+'">'+sceneCopy()+'</div></section>':'';}
function returnView(){const r=d().return_receipt;if(!r)return '<p>帰還結果を読み込めませんでした</p>';
 const materials=(r.kept_items||[]).filter(x=>x.kind!=='points'),unlocks=r.new_unlocks||[],lost=r.lost_items||[];
 const materialLabel=materials.length===1?'素材 '+esc(materials[0].type||'')+' +'+esc(materials[0].amount||1):'素材 '+materials.length+'種';
 return '<section class="cj-fixed-result">'+landscape()+'<div class="cj-result-values">'+
 button('<span class="cj-result-money">着想 <strong>+'+pt(r.gained_units)+'</strong><small>計 '+pt(r.unspent_after_units)+'</small></span><span>余力 '+esc(r.expedition_end_hp)+' → '+esc(r.home_hp)+icon('chevron-right')+'</span>','receipt','aria-label="帰還の金額と回復の内訳"','cj-result-number')+
 button('<span>'+icon('package')+materialLabel+'</span><span>'+icon('book-plus')+'記録 +'+unlocks.length+(lost.length?'　喪失 '+lost.length:'')+icon('chevron-right')+'</span>','receipt','aria-label="獲得品・新しい記録・喪失の内訳"','cj-result-number')+'</div>'+readWindow()+'</section>';
}
function receiptDetails(){const r=d().return_receipt;if(!r)return '';
 return '<div class="cj-change"><span>着想</span><strong>+'+pt(r.gained_units)+'（合計 '+pt(r.unspent_after_units)+'）</strong></div><div class="cj-change"><span>余力</span><strong>'+esc(r.expedition_end_hp)+' → '+esc(r.home_hp)+'</strong></div><h3>獲得品</h3>'+((r.kept_items||[]).filter(x=>x.kind!=='points').map(x=>'<p>素材 '+esc(x.type||'')+' +'+esc(x.amount||1)+'</p>').join('')||'<p>なし</p>')+'<h3>記録に追加</h3>'+(r.new_unlocks||[]).map(id=>detailsButton('base:'+id)).join('')+((r.lost_items||[]).length?'<h3>喪失</h3>'+r.lost_items.map(x=>'<p>'+esc(x.kind==='points'?'着想':x.type||x.kind)+' '+esc(x.kind==='points'?pt(x.amount_units):x.amount??'')+'</p>').join(''):'');
}
function hubView(){const objective=d().texts?.[d().case.objective_text_id];return '<section class="cj-fixed-hub">'+landscape()+button('<span>'+(d().case.status==='resolved'?'踏破済み':'探索先')+'</span><strong>'+esc(title)+'</strong><span class="cj-objective">'+esc(objective?.short_text||'目的を確認')+'</span>'+icon('chevron-right'),'destination','aria-label="'+esc(title)+'の目的と編成"','cj-destination-button')+'</section>';}
function compactWallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;return '<span class="cj-compact-wallet" aria-label="着想 現在 '+pt(now)+(dirty()?'、変更案 '+pt(after):committedFlash?'、確定済み':'')+'">'+icon('lightbulb')+'<span>'+pt(now)+(dirty()?'<span class="cj-changed">→'+pt(after)+'</span>':'')+'</span></span>';}
function catalogueItems(){const skills=tab==='skills';return [...(skills?h().learning_options.map(x=>'base:'+x.base):h().free_card_options),...h().owned.filter(x=>x.selection_kind===(skills?'equipment':'deck')).map(x=>x.id)];}
function composeCount(){const c=state.comparison;return tab==='skills'?(c?.ok?c.prepared.equipment.used:dirty()?'—':h().equipment.used)+'/'+h().equipment.capacity:p().next_preparation.deck.length+'/'+h().deck.required_size;}
function headerView(screen){const edit=['deck','skills'].includes(screen),labels={return:outcome(),hub:'探索先',scene:title,start:'crossweave'};
 const lead=edit?'<nav class="cj-edit-tabs" aria-label="編成の切替">'+['deck','skills'].map(t=>button('<span>'+(t==='deck'?'札組':'心得')+'</span>'+(tab===t?'<small aria-label="'+(t==='deck'?'枚数':'使用枠')+'">'+composeCount()+'</small>':''),t,'aria-pressed="'+(tab===t)+'"')).join('')+'</nav>':'<h1 class="cj-screen-title">'+esc(labels[screen]||'crossweave')+'</h1>';
 return lead+(h()?compactWallet():'')+'<nav class="cj-common-nav" aria-label="共通">'+(d().phase==='home'&&screen!=='hub'&&!suspended?button(icon('map-pin'),'hub','aria-label="探索先"','cj-quiet'):'')+button(icon('book-open')+'<span>調査記録</span>','records','aria-label="調査記録"','cj-quiet')+button(icon('menu'),'menu','aria-label="メニュー"','cj-quiet')+'</nav>';
}
function composeActions(){const c=state.comparison;return button(icon('columns-2')+'<span class="cj-action-label">'+(dirty()?'比較':'編成')+'</span>','review','aria-label="'+(dirty()?'現在と変更案を比較':'現在の編成を確認')+'"')+(dirty()?button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':'')):'')+button(dirty()?'確定して出発':'出発','depart','data-j-mutation '+(dirty()&&!c?.ok?'disabled':''),'cj-primary');}
function footerView(screen){let content='';
 if(['deck','skills'].includes(screen)){const layout=api.journeyLayout(frameWidth,catalogueItems().length,pageAnchors[tab]);content='<div class="cj-pager" aria-label="一覧のページ">'+(layout.pages>1?button(icon('chevron-left'),'page','data-step="-1" aria-label="前の一覧" '+(!layout.page?'disabled':''))+'<span aria-live="polite">'+(layout.page+1)+'/'+layout.pages+'</span>'+button(icon('chevron-right'),'page','data-step="1" aria-label="次の一覧" '+(layout.page+1===layout.pages?'disabled':'')):'')+'</div><div class="cj-fixed-actions">'+composeActions()+'</div>';}
 else if(screen==='return'){const retry=d().case?.status!=='resolved'&&d().return_receipt?.outcome!=='clear';content='<div class="cj-fixed-actions">'+button('札組','deck','data-j-mutation')+button('心得','skills','data-j-mutation')+button(retry?'拠点へ':'再訪',retry?'hub':'depart','data-j-mutation','cj-quiet')+'</div>'+button(retry?'再挑戦':'拠点へ',retry?'depart':'hub','data-j-mutation','cj-primary');}
 else if(screen==='hub')content='<div class="cj-fixed-actions">'+button('札組','deck')+button('心得','skills')+'</div><div class="cj-fixed-actions">'+composeActions()+'</div>';
 else if(screen==='scene')content='<span></span>'+button(d().scene?.paused?'進む':'探索に戻る',d().scene?.paused?'continue':'scene-back','data-j-mutation','cj-primary');
 else if(screen==='start')content='<small>この試作を開いている間だけ保持</small>'+button('続きから','resume','data-j-mutation','cj-primary');
 return content?'<div class="cj-fixed-footer">'+content+'</div>':'';
}
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
function composeView(){const items=catalogueItems(),layout=api.journeyLayout(frameWidth,items.length,pageAnchors[tab]);
 return '<section class="cj-page-catalogue" data-catalogue aria-label="'+(tab==='skills'?'心得一覧':'札一覧')+'" style="padding:'+layout.padding+'px"><div class="cj-page-grid" data-capacity="'+layout.capacity+'" style="grid-template-columns:repeat('+layout.columns+',minmax(0,1fr));grid-template-rows:repeat('+layout.rows+','+layout.rowHeight+'px);gap:'+layout.gap+'px">'+items.slice(layout.start,layout.end).map(tab==='skills'?skillTile:cardTile).join('')+'</div></section>';
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
function sceneView(){return '<section class="cj-fixed-scene">'+landscape()+readWindow()+'</section>';}
function startView(){return '<section class="cj-fixed-start"><h2>'+esc(title)+'</h2><span>crossweave</span></section>';}
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
 const titles={review:dirty()?'現在と変更案':committedFlash?'確定後の編成':'現在の編成',records:'調査記録',menu:'メニュー',help:'遊び方',settings:'表示',data:'保存データ',receipt:'帰還の内訳',destination:title,unavailable:'購入・変換',notice:'操作の確認'};
 let body='',actions='';
 if(panel==='review'){body=wallet()+(dirty()?changeRows()+'<p class="cj-muted">所持品の増減なし</p>':'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');actions=dirty()?button('確定','commit','data-j-mutation '+(!state.comparison?.ok?'disabled':''),'cj-primary')+button('確定して出発','depart','data-j-mutation '+(!state.comparison?.ok?'disabled':'')):'';}
 if(panel==='receipt')body=receiptDetails();
 if(panel==='destination')body='<p>'+esc(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発後の本文で確認できます')+'</p><h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>';
 if(panel==='unavailable')body='<p>購入・修飾・変換は本体の対応待ちです。</p>';
 if(panel==='notice'){body='<p>'+esc(reason(state.error))+'</p>';actions=(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'');}
 if(panel==='records')body=recordsView();
 if(panel==='menu')body='<div class="cj-menu-list">'+button('表示','settings')+button('遊び方','help')+button('保存データ','data')+button('購入・変換','unavailable')+button('中断','suspend','data-j-mutation')+(dirty()?button('変更案を戻す','discard','data-j-mutation'):'')+'</div>';
 if(panel==='settings')body='<label class="cj-setting"><input type="checkbox" data-motion '+(root.dataset.motion==='reduced'?'checked':'')+'> 動きを抑える</label>';
 if(panel==='help')body='<h3>編成</h3><p>札の＋／−で枚数を変える。心得は「覚えて装備」でまとめて選ぶ。名前を押すと発動条件と効果を確認できる。</p><p>着想と構成の差分を見て確定。札組と心得の切替では、変更案はそのまま残る。</p><h3>探索</h3><p>札を選び、相手を指定して場に出す。相手の詳細は横の情報ボタンから開く。札を押し続けて場へ運ぶ操作も使える。</p><p>画面が低い場合、札の詳細は同じ札をもう一度押して開く。</p><div class="cj-help-symbols">'+[['arrow-up-right','突破'],['scan-search','探査'],['shield','身構'],['wind','攪乱']].map(([symbol,label])=>'<span>'+icon(symbol)+label+'</span>').join('')+'</div>';
 if(panel==='data')body='<p>この試作は一時メモリーを使用します。</p>'+button('書き出す','export')+'<textarea data-export hidden readonly aria-label="書き出した保存データ" rows="8"></textarea><p class="cj-muted">読み込み・新規開始は既存の実セーブ接続画面で扱います。</p>';
 box.innerHTML='<section class="cj-inspect-item" data-inspect-key="'+panel+'"><div class="cj-inspect-top"><h2>'+titles[panel]+(panel==='records'&&recordDetail?'<span class="cj-record-context">'+esc(recordDetail.name)+'</span>':'')+'</h2>'+button(icon('x'),'close','aria-label="窓を閉じる"','cj-icon-button')+'</div><div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>'+(panel==='records'&&recordDetail?recordDetailView():'');
}
