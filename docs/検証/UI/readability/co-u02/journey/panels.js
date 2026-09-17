/* Presentation helpers injected into mountJourney. No private catalogue or price calculation. */
function paragraph(id){const t=d().texts?.[id];return t?'<p data-j-text="'+esc(id)+'">'+esc(t.short_text||t.detail_text||'')+'</p>':'';}
// These public details are short paragraphs. Render them in reading order;
// visibility observation, never DOM insertion, decides the read receipt.
function sceneCopy(){const s=d().scene;if(!s)return '';return '<div class="cj-story">'+[...new Set([...(s.text_ids||[]),...(s.optional_text_ids||[])])].map(paragraph).join('')+'</div>';}
function wallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;
 return '<div class="cj-wallet"><span>'+icon('lightbulb')+'着想</span><strong>'+pt(now)+'</strong>'+(dirty()?'<span class="cj-arrow">→</span><strong class="cj-changed">'+pt(after)+'</strong><small>変更案</small>':committedFlash?'<small>確定済み</small>':'')+'</div>';}
function outcome(){return ({clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'})[d().return_receipt?.outcome]||'探索終了';}
function landscape(){return '<div class="cj-landscape cj-backdrop" aria-hidden="true"><div></div><div></div><div></div></div>';}
function readWindow(){return d().scene?'<section class="cj-reading-window" aria-label="場面の本文"><div class="cj-reading-scroll" data-reading="'+esc(d().scene.id)+'">'+sceneCopy()+'</div></section>':'';}
function returnView(){const r=d().return_receipt;if(!r)return '<p>帰還結果を読み込めませんでした</p>';
 const materials=(r.kept_items||[]).filter(x=>x.kind!=='points'),unlocks=r.new_unlocks||[],lost=r.lost_items||[];
 const materialLabel=materials.length===1?'素材 '+esc(materials[0].type||'')+' +'+esc(materials[0].amount||1):'素材 '+materials.length+'種';
 return '<section class="cj-fixed-result">'+landscape()+'<section class="cj-result-summary" aria-label="帰還の結果"><div class="cj-result-values">'+
 '<div class="cj-result-money">'+icon('lightbulb')+'<span>着想</span><strong>+'+pt(r.gained_units)+'</strong><small>計 '+pt(r.unspent_after_units)+'</small></div><div>余力 '+esc(r.expedition_end_hp)+' → '+esc(r.home_hp)+'</div>'+
 '<div class="cj-result-items"><span>'+materialLabel+'</span><span>記録 +'+unlocks.length+(lost.length?'　喪失 '+lost.length:'')+'</span></div></div>'+button('詳細','receipt','aria-label="帰還結果の詳細"')+'</section>'+readWindow()+'</section>';
}
function receiptDetails(){const r=d().return_receipt;if(!r)return '';
 return '<div class="cj-change"><span>着想</span><strong>+'+pt(r.gained_units)+'（合計 '+pt(r.unspent_after_units)+'）</strong></div><div class="cj-change"><span>余力</span><strong>'+esc(r.expedition_end_hp)+' → '+esc(r.home_hp)+'</strong></div><h3>獲得品</h3>'+((r.kept_items||[]).filter(x=>x.kind!=='points').map(x=>'<p>素材 '+esc(x.type||'')+' +'+esc(x.amount||1)+'</p>').join('')||'<p>なし</p>')+'<h3>記録に追加</h3>'+(r.new_unlocks||[]).map(id=>detailsButton('base:'+id)).join('')+((r.lost_items||[]).length?'<h3>喪失</h3>'+r.lost_items.map(x=>'<p>'+esc(x.kind==='points'?'着想':x.type||x.kind)+' '+esc(x.kind==='points'?pt(x.amount_units):x.amount??'')+'</p>').join(''):'');
}
function hubView(){const objective=d().texts?.[d().case.objective_text_id];return '<section class="cj-fixed-hub">'+landscape()+'<section class="cj-destination-summary"><small>'+(d().case.status==='resolved'?'踏破済み':'探索先')+'</small><div class="cj-destination-heading"><h2>'+esc(title)+'</h2>'+button('詳細','destination','aria-label="'+esc(title)+'の詳細"')+'</div><p class="cj-prose">'+esc(objective?.short_text||'')+'</p></section></section>';}
function compactWallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?state.comparison.stages.prepared.unspent_units:null;return '<span class="cj-compact-wallet" aria-label="着想 現在 '+pt(now)+(dirty()?'、変更案 '+pt(after):committedFlash?'、確定済み':'')+'">'+icon('lightbulb')+'<span>'+pt(now)+(dirty()?'<span class="cj-changed">→'+pt(after)+'</span>':'')+'</span></span>';}
function catalogueItems(){const skills=tab==='skills';return [...(skills?h().learning_options.map(x=>'base:'+x.base):h().free_card_options),...h().owned.filter(x=>x.selection_kind===(skills?'equipment':'deck')).map(x=>x.id)];}
function composeCount(){const c=state.comparison;return tab==='skills'?(c?.ok?c.prepared.equipment.used:dirty()?'—':h().equipment.used)+'/'+h().equipment.capacity:p().next_preparation.deck.length+'/'+h().deck.required_size;}
function pageButtons(){const layout=api.journeyLayout(frameWidth,catalogueItems().length,pageAnchors[tab]);return layout.pages>1?'<div class="cj-pager" aria-label="一覧のページ">'+button(icon('chevron-left'),'page','data-step="-1" aria-label="前の一覧" '+(!layout.page?'disabled':''))+'<span aria-live="polite">'+(layout.page+1)+'/'+layout.pages+'</span>'+button(icon('chevron-right'),'page','data-step="1" aria-label="次の一覧" '+(layout.page+1===layout.pages?'disabled':''))+'</div>':'';}
function headerView(screen){const edit=['deck','skills'].includes(screen),labels={return:outcome(),hub:'探索先',scene:title,start:'crossweave'};
 const lead=edit?'<nav class="cj-edit-tabs" aria-label="編成の切替">'+['deck','skills'].map(t=>button('<span>'+(t==='deck'?'札組':'心得')+'</span>'+(tab===t?'<small aria-label="'+(t==='deck'?'枚数':'使用枠')+'">'+composeCount()+'</small>':''),t,'aria-pressed="'+(tab===t)+'"')).join('')+'</nav>':'<h1 class="cj-screen-title">'+esc(labels[screen]||'crossweave')+'</h1>';
 return lead+(edit?pageButtons():'')+(h()?compactWallet():'')+'<nav class="cj-common-nav" aria-label="共通">'+(!edit?button(icon('book-open')+'<span>調査記録</span>','records','aria-label="調査記録"','cj-quiet'):'')+button(icon('menu'),'menu','aria-label="メニュー"','cj-quiet')+'</nav>';
}
function composeActions(){const c=state.comparison;return button('<span>'+(dirty()?'比較':'構成を見る')+'</span>','review','aria-label="'+(dirty()?'現在と変更案を比較':'現在の札組・心得・着想を確認')+'"','cj-review-button')+(dirty()?button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':'')):'')+button(dirty()?'確定して出発':'出発','depart','data-j-mutation '+(dirty()&&!c?.ok?'disabled':''),'cj-primary');}
function footerView(screen){let content='';
 if(['deck','skills'].includes(screen))content=button(icon('arrow-left')+'戻る','hub','aria-label="編成を閉じて拠点に戻る"')+'<div class="cj-fixed-actions">'+composeActions()+'</div>';
 else if(screen==='return')content='<span></span>'+button('拠点へ','hub','data-j-mutation','cj-primary');
 else if(screen==='hub')content='<div class="cj-fixed-actions">'+button('札組','deck')+button('心得','skills')+'</div><div class="cj-fixed-actions">'+composeActions()+'</div>';
 else if(screen==='scene')content='<span></span>'+button(d().scene?.paused?'進む':'探索に戻る',d().scene?.paused?'continue':'scene-back','data-j-mutation','cj-primary');
 else if(screen==='start')content='<small>'+(storageMode==='ephemeral'?'この試作を開いている間だけ保持':'探索を中断中')+'</small>'+button('続きから','resume','data-j-mutation','cj-primary');
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
function miniList(ids){return ids.length?'<ul class="cj-build-list">'+group(ids).map(x=>'<li><span>'+esc(name(x.id))+'</span><b>×'+x.count+'</b></li>').join('')+'</ul>':'<span class="cj-muted">なし</span>';}
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
function cardFacts(item,snapshot=false){
 const p=snapshot?item:item.primary,field=snapshot?{power:item.field_power,hit:item.field_hit}:item.field;
 const row=(term,value,shape)=>value==null?'':'<div><dt>'+(shape?icon(shape):'')+term+'</dt><dd>'+esc(value)+'</dd></div>';
 let primary='';
 if(p){primary+=row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power,p.kind==='guard'?'shield':p.kind==='heal'?'heart-plus':'arrow-up-right');
  if(p.kind!=='heal')primary+=row(p.kind==='guard'?'攪乱':'探査',p.kind==='guard'?p.evasion:p.hit,p.kind==='guard'?'wind':'scan-search');primary+=row('機転',p.crit_gain,'zap');}
 const properties=api.cardProperties(item);
 return '<dl class="cj-record-stats">'+(snapshot?row('属性',item.attr):'')+primary+row('手札期限',item.life)+'</dl>'+
  (field&&(field.power!=null||field.hit!=null)?'<h3>場に置くと</h3><dl class="cj-record-stats">'+row('突破／身構',field.power,'arrow-up-right')+row('探査／攪乱',field.hit,'scan-search')+'</dl>':'')+
  '<h3>次の行動まで</h3><dl class="cj-record-stats">'+row('置く',snapshot?item.place_cost:item.action_intervals?.place)+row('一致',snapshot?item.match_cost:item.action_intervals?.match)+'</dl>'+
  (properties.length?'<section class="cw-properties"><h3>性質</h3><ul>'+properties.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></section>':'');
}
function detailView(id,{back=false,w=windows.find(x=>x.id===id)}={}){const item=info(id),base=item.base_id,passive=item.kind==='passive',known=learned(base),cancelled=p()?.cancel_learning.includes(base);
 const pinLabel=w?.pinned?'固定を外す':'固定する';
 const head='<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+esc(name(id))+'</h2>'+button(icon('pin'),'pin','data-id="'+esc(id)+'" aria-label="'+pinLabel+'" data-tooltip="'+pinLabel+'" aria-pressed="'+!!w?.pinned+'"','cj-icon-button')+button(icon('x'),'close-item','data-id="'+esc(id)+'" aria-label="詳細を閉じる"','cj-icon-button')+'</div>';
 let body='',actions='';
 if(passive)body+='<div class="cj-detail-cost"><span>枠消費</span><strong>'+item.equipment_cost+'</strong></div>'+skillStructure(item);
 else body+=cardFacts(item);
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
function renderPanel(){const box=$('[data-inspector]'),hasChild=panel==='records'&&!!(recordTarget||recordDetail);box.hidden=!panel;box.parentElement.classList.toggle('cj-has-inspector',!!panel);if(!panel){box.replaceChildren();panelTrail=[];recordParentRect=null;return;}
 const level=panelTrail.length,parent=panelTrail.at(-1),withLevel=(markup,n)=>markup.replaceAll('data-inspect-key=', 'data-level="'+n+'" data-inspect-key=');
 let current=panel==='details'?windows.slice(-2).map(w=>detailView(w.id,{w,back:!!parent||windows.length>2})).join(''):panel==='records'?recordsPanelView():panelView(panel,!!parent);
 if(parent&&!hasChild&&windows.length<2)current=withLevel(parent.panel==='details'?parent.windows.slice(-1).map(w=>detailView(w.id,{w,back:level>1})).join(''):panelView(parent.panel,level>1),level-1)+withLevel(current,level);
 else current=withLevel(current,level);
 box.innerHTML=current;box.dataset.count=box.children.length;box.dataset.layout=box.children.length>1?'linked':'windows';
}
function panelView(panel,back=false){
 const titles={review:dirty()?'現在と変更案':committedFlash?'確定後の編成':'現在の編成',records:'調査記録',menu:'メニュー',help:'遊び方',settings:'表示',data:'保存データ',receipt:'帰還の内訳',destination:title,unavailable:'購入・変換',notice:'操作の確認'};
 let body='',actions='';
 if(panel==='review'){body=wallet()+(dirty()?changeRows()+'<p class="cj-muted">所持品の増減なし</p>':'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');actions=dirty()?button('確定','commit','data-j-mutation '+(!state.comparison?.ok?'disabled':''),'cj-primary')+button('確定して出発','depart','data-j-mutation '+(!state.comparison?.ok?'disabled':'')):'';}
 if(panel==='receipt')body=receiptDetails();
 if(panel==='destination')body='<p>'+esc(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発後の本文で確認できます')+'</p><h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>';
 if(panel==='unavailable')body='<p>購入・修飾・変換は本体の対応待ちです。</p>';
 if(panel==='notice'){body='<p>'+esc(reason(state.error))+'</p>';actions=(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'');}
 if(panel==='records')body=recordsView();
 if(panel==='menu')body='<div class="cj-menu-list">'+button('調査記録','records')+button('表示','settings')+button('遊び方','help')+button('保存データ','data')+button('購入・変換','unavailable')+(canSuspend()?button('探索を中断','suspend','data-j-mutation'):'')+(dirty()?button('変更案を戻す','discard','data-j-mutation'):'')+'</div>';
 if(panel==='settings')body='<label class="cj-setting"><input type="checkbox" data-motion '+(root.dataset.motion==='reduced'?'checked':'')+'> 動きを抑える</label>';
 if(panel==='help')body='<h3>編成</h3><p>札の＋／−で枚数を変える。心得は「覚えて装備」でまとめて選ぶ。名前を押すと発動条件と効果を確認できる。</p><p>着想と構成の差分を見て確定すると、自動保存される。札組と心得の切替では、編集中の内容はそのまま残る。</p><h3>探索</h3><p>「探索を中断」で進行を止め、「続きから」で同じ探索に戻る。中断では撤退・帰還しない。</p><p>札を選び、相手をタップして対象を指定する。相手を押し続けると詳細。情報ボタンからも選択中の相手を確認できる。</p><p>予測はもう一度押すと閉じる。札を押し続けて場へ運ぶ操作も使える。低い画面では、同じ札をもう一度押すと札の詳細。</p><h3>予測</h3><p>選んだ札の直後の変化を表示する。隠蔽は攻撃による減少後・再設定前の値。機転の加算は、一閃による消費前の値。続く相手の行動や、未対応の変化は含まない。</p><h3>身構と軽減</h3><p>身構は防御札の一致で得る一時的な防御。軽減は、硬さなどの特性による継続的な効果で、別に働く。</p><h3>詳細窓</h3><p>ピンで固定し、もう一度押すと固定を外す。矢印で元の窓に戻る。</p><div class="cj-help-symbols">'+[['arrow-up-right','突破'],['scan-search','探査'],['venetian-mask','隠蔽'],['zap','機転'],['shield','身構'],['wind','攪乱'],['shield-minus','軽減']].map(([symbol,label])=>'<span>'+icon(symbol)+label+'</span>').join('')+'</div>';
 if(panel==='data'){body='<p>'+(storageMode==='ephemeral'?'この試作は、閉じると保存が失われます。':'確定した操作は自動保存されます。')+'</p>'+(d().phase==='home'?'<p>編成は「確定」で保存します。編集中の内容は、確定するまで保存済みの編成を変えません。</p>':'')+'<p>書き出しは保存済みの内容です。</p>';actions=button('書き出す','export','data-j-mutation')+(canSuspend()?button('探索を中断','suspend','data-j-mutation'):'');}
 return '<section class="cj-inspect-item" data-inspect-key="'+panel+'"><div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+titles[panel]+'</h2>'+button(icon('x'),'close','aria-label="窓を閉じる"','cj-icon-button')+'</div><div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}
