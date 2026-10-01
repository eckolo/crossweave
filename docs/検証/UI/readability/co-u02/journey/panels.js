/* Presentation helpers injected into mountJourney. No private catalogue or price calculation. */
function paragraph(id){const t=d().texts?.[id];return t?'<p data-j-text="'+esc(id)+'">'+esc(t.short_text||t.detail_text||'')+'</p>':'';}
// These public details are short paragraphs. Render them in reading order;
// visibility observation, never DOM insertion, decides the read receipt.
function sceneCopy(){const s=d().scene;if(!s)return '';return '<div class="cj-story">'+[...new Set([...(s.text_ids||[]),...(s.optional_text_ids||[])])].map(paragraph).join('')+'</div>';}
function wallet(){const now=h()?.economy.unspent_units,after=state.comparison?.ok?(state.comparison.payment?.unspent_after_units??state.comparison.stages?.prepared.unspent_units):null;
 return '<div class="cj-wallet"><span>'+icon('lightbulb')+'着想</span><strong>'+pt(now)+'</strong>'+(dirty()?'<span class="cj-arrow">→</span><strong class="cj-changed">'+pt(after)+'</strong><small>変更案</small>':committedFlash?'<small>確定済み</small>':'')+'</div>';}
function outcome(){return ({clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'})[d().return_receipt?.outcome]||'探索終了';}
function landscape(){const a=api.sceneArtwork?.(d());return '<div class="cj-landscape cj-backdrop" aria-hidden="true"'+(a?' data-artwork="'+a.id+'" style="background-image:url('+a.src+');background-position:'+a.position+'"':'')+'><div></div><div></div><div></div></div>';}
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
function hubView(){if(destinationOptions.length)return destinationBoard();const objective=d().texts?.[d().case.objective_text_id];return '<section class="cj-fixed-hub">'+landscape()+'<section class="cj-destination-summary"><small>'+(d().case.status==='resolved'?'踏破済み':'探索先')+'</small><div class="cj-destination-heading"><h2>'+esc(title)+'</h2>'+button('詳細','destination','aria-label="'+esc(title)+'の詳細"')+'</div><p class="cj-prose">'+esc(objective?.short_text||'')+'</p></section></section>';}
function compactWallet(){if(acquisitionPreview&&collectionState)return '<span class="cj-compact-wallet" aria-label="着想">'+icon('lightbulb')+'<span>'+esc(collectionState.wallet)+(collectionState.pending?' → '+esc(collectionState.wallet-collectionState.pending):'')+'</span></span>';const now=h()?.economy.unspent_units,after=state.comparison?.ok?(state.comparison.payment?.unspent_after_units??state.comparison.stages?.prepared.unspent_units):null;return '<span class="cj-compact-wallet" aria-label="着想 現在 '+pt(now)+(dirty()?'、変更案 '+pt(after):committedFlash?'、確定済み':'')+'">'+icon('lightbulb')+'<span>'+pt(now)+(dirty()?'<span class="cj-changed">→'+pt(after)+'</span>':'')+'</span></span>';}
function catalogueItems(){if(tab==='offers')return h().offers.status==='purchased'?[]:h().candidates.map(x=>x.id);if(tab==='owned')return h().owned.map(x=>x.id);const skills=tab==='skills';const items=[...(skills?h().learning_options.map(x=>'base:'+x.base):h().free_card_options),...h().owned.filter(x=>x.selection_kind===(skills?'equipment':'deck')).map(x=>x.id),...(p()?.candidate&&p().purchase_timing==='before_preparation'&&info(p().candidate).kind===(skills?'passive':'card')?['$purchase']:[])];
 return !skills||skillFilter==='all'?items:items.filter(id=>skillFilter==='learned'?currentlyLearned(info(id).base_id):currentlyEquipped(id));
}
function currentlyLearned(base){return h()?.economy.learned?.some(x=>x.base===base);}
function currentlyEquipped(id){return h()?.equipment.entries.some(x=>x.id===id);}
function skillState(id){const item=info(id),wasKnown=currentlyLearned(item.base_id),wasOn=currentlyEquipped(id),known=learned(item.base_id),on=equipped(id);
 const now=wasKnown?'習得済み'+(wasOn?'・装備中':''):'未習得';
 const changes=[];if(wasKnown!==!!known)changes.push(known?'覚える':'忘れる');if(wasOn!==!!on)changes.push(on?'装備':'外す');
 return now+(changes.length?' → '+changes.join('・')+'予定':'');
}
function itemFace(id,metadata,selected=false){return button('<span class="cj-item-icon" aria-hidden="true">'+icon(itemIcon(id))+'</span><strong>'+esc(name(id))+'</strong><small>'+metadata+'</small>','detail','data-id="'+esc(id)+'" data-focus="detail-'+esc(id)+'" data-tooltip="'+esc(name(id))+'" aria-label="'+esc(name(id))+'の詳細" aria-pressed="'+selected+'"','cj-item-face');}
function skillActions(id){const item=info(id),known=learned(item.base_id),on=equipped(id),cancelled=p().cancel_learning.includes(item.base_id),planned=p().next_preparation.learn.includes(item.base_id);
 const extra='data-id="'+esc(id)+'" data-j-mutation';
 if(cancelled)return button('忘れる案を戻す','restore-skill',extra);
 if(!known)return button('覚える','learn',extra+' data-focus="learn-'+esc(id)+'"')+button('覚えて装備','equip',extra+' data-focus="equip-'+esc(id)+'"','cj-primary');
 return button(planned?'習得案を戻す':'忘れる','forget',extra)+button(on?'外す':'装備','equip',extra+' data-focus="equip-'+esc(id)+'"',on?'':'cj-primary');
}
function composeCount(){if(tab==='offers')return h().offers.status==='purchased'?'購入済':h().offers.carried_from_previous_return?'持越し':h().candidates.length+'点';if(tab==='owned')return h().owned.length+'点';const c=state.comparison;return tab==='skills'?(c?.ok?c.prepared.equipment.used:dirty()?'—':h().equipment.used)+'/'+h().equipment.capacity:p().next_preparation.deck.length+'/'+h().deck.required_size;}
function pageButtons(){const layout=api.journeyLayout(frameWidth,catalogueItems().length,pageAnchors[tab],0);return layout.pages>1?'<div class="cj-pager" aria-label="一覧のページ">'+button(icon('chevron-left'),'page','data-step="-1" aria-label="前の一覧" '+(!layout.page?'disabled':''))+'<span aria-live="polite">'+(layout.page+1)+'/'+layout.pages+'</span>'+button(icon('chevron-right'),'page','data-step="1" aria-label="次の一覧" '+(layout.page+1===layout.pages?'disabled':''))+'</div>':'';}
function headerView(screen){const edit=['deck','skills','offers','owned'].includes(screen),labels={return:outcome(),hub:'探索先',scene:title,start:'crossweave'},tabs={deck:'札組',skills:'心得',offers:'購入',owned:'所持'};
 const lead=edit?'<nav class="cj-edit-tabs" aria-label="編成と購入の切替">'+Object.entries(tabs).map(([t,label])=>button('<span>'+label+'</span>'+(tab===t?'<small>'+composeCount()+'</small>':''),t,'aria-pressed="'+(tab===t)+'"')).join('')+'</nav>':'<h1 class="cj-screen-title">'+esc(labels[screen]||'crossweave')+'</h1>';
 const selection=tab==='skills'?'skills:'+skillFilter:tab;
 const mobile=[['deck','札組'],['skills:all','心得・すべて'],['skills:learned','心得・習得済み'],['skills:equipped','心得・装備中'],['offers','購入'],['owned','所持']];
 const filter=tab==='skills'?'<select data-skill-filter class="cj-skill-filter" aria-label="現在の心得を絞り込む">'+[['all','すべて'],['learned','習得済み'],['equipped','装備中']].map(([v,l])=>'<option value="'+v+'" '+(skillFilter===v?'selected':'')+'>'+l+'</option>').join('')+'</select>':'';
 const shortcut=unifiedAcquisition()&&screen==='hub'?button('編成','collection','aria-label="札と心得を取得・編成する"','cj-back'):screen==='scene'&&!d().scene?.paused?button(icon('arrow-left')+'戻る','scene-back','aria-label="探索に戻る"','cj-back'):'';
 return shortcut+lead+(edit?'<select data-compose-tab class="cj-compose-select" aria-label="編成と購入の切替">'+mobile.map(([v,l])=>'<option value="'+v+'" '+(selection===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'+filter+pageButtons():'')+(h()?compactWallet():'')+api.commonNavigationHTML();
}
function composeActions(){const c=state.comparison;return button('<span>'+(dirty()?'比較':'構成を見る')+'</span>','review','aria-label="'+(dirty()?'現在と変更案を比較':'現在の札組・心得・着想を確認')+'"','cj-review-button')+(dirty()?button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':'')):'')+button(dirty()?'確定して出発':'出発','depart','data-j-mutation '+(dirty()&&!c?.ok||!destinationCanDepart()?'disabled':''),'cj-primary');}
function footerView(screen){let content='';
 if(['deck','skills','offers','owned'].includes(screen))content=button(icon('arrow-left')+'戻る','hub','aria-label="編成を閉じて拠点に戻る"')+'<div class="cj-fixed-actions">'+(screen==='owned'&&conversionIds.size?button('着想に変える '+conversionIds.size+'点','convert-preview','data-j-mutation','cj-primary'):composeActions())+'</div>';
 else if(screen==='return')content='<span></span>'+button(unifiedAcquisition()?'進む':'拠点へ','hub','data-j-mutation','cj-primary');
 else if(screen==='hub'&&unifiedAcquisition())content='<span></span><div class="cj-fixed-actions"><span class="cj-selected-label">'+esc(destinationHeading())+'</span>'+button('出発','depart','data-j-mutation '+(!destinationCanDepart()?'disabled':''),'cj-primary')+'</div>';
 else if(screen==='hub')content='<div class="cj-fixed-actions">'+button('札組','deck')+button('心得','skills')+button('購入','offers')+'</div><div class="cj-fixed-actions">'+(destinationOptions.length?'<span class="cj-selected-label">'+esc(destinationHeading())+'</span>':'')+composeActions()+'</div>';
 else if(screen==='scene'&&d().scene?.paused)content='<span></span>'+button('進む','continue','data-j-mutation','cj-primary');
 else if(screen==='start')content='<small>'+(storageMode==='ephemeral'?'この試作を開いている間だけ保持':'探索を中断中')+'</small>'+button('続きから','resume','data-j-mutation','cj-primary');
 return content?'<div class="cj-fixed-footer">'+content+'</div>':'';
}
function cardTile(id){const item=info(id),n=count(id),current=count(id,api.currentPlan(state.view).next_preparation.deck),kind=item.primary?.kind;
 const baseCount=p().next_preparation.deck.filter(x=>info(x).base_id===item.base_id).length;
 const effect=item.primary?(kind==='defense_support'?'身構付与 '+item.primary.defense_grant.guard:({attack:'突破',guard:'身構',heal:'回復'})[kind]+' '+item.primary.power):'';
 return '<article class="cj-cardpiece cj-item '+(n?'cj-included':'')+'" data-piece="'+esc(id)+'">'+itemFace(id,esc([effect,possessionLabel(id)].filter(Boolean).join(' · ')),selected.deck===id)+
 '<div class="cj-counter cj-item-actions">'+button('−','remove','data-id="'+esc(id)+'" data-focus="remove-'+esc(id)+'" data-j-mutation aria-label="'+esc(name(id))+'を1枚外す" '+(!n?'disabled':''))+'<span aria-label="現在 '+current+'枚、変更案 '+n+'枚">'+(n!==current?'<small>'+current+' →</small> ':'')+'<strong>'+n+'</strong></span>'+button('+','add','data-id="'+esc(id)+'" data-focus="add-'+esc(id)+'" data-j-mutation aria-label="'+esc(name(id))+'を1枚加える" '+(baseCount>=h().deck.per_base_cap||(!id.startsWith('base:')&&n)?'disabled':''))+'</div></article>';
}
function skillStructure(item){return api.effectHTML(item);}
function skillTile(id){const item=info(id),on=equipped(id);
 const metadata=skillState(id)+' · 枠消費 '+item.equipment_cost+(!learned(item.base_id)?' · 習得 −'+pt(item.learning_cost_units):'');
 return '<article class="cj-skillpiece cj-cardpiece cj-item '+(on?'cj-included':'')+'" data-piece="'+esc(id)+'">'+itemFace(id,esc(metadata),selected.skills===id)+'<div class="cj-item-actions">'+skillActions(id)+'</div></article>';
}
function composeView(){const items=catalogueItems(),economy=['offers','owned'].includes(tab),layout=api.journeyLayout(frameWidth,items.length,pageAnchors[tab]);
 const empty=tab==='skills'?(skillFilter==='equipped'?'今は装備している心得がありません':skillFilter==='learned'?'今は覚えている心得がありません':'心得なし'):tab==='offers'?offerStatus():'所持品なし';
 return '<section class="cj-page-catalogue" data-catalogue aria-label="'+({skills:'心得一覧',deck:'札一覧',offers:'購入候補',owned:'所持品'})[tab]+'" style="padding:'+layout.padding+'px">'+(items.length?'<div class="cj-page-grid" data-capacity="'+layout.capacity+'" style="grid-template-columns:repeat('+layout.columns+',minmax(0,1fr));grid-template-rows:repeat('+layout.rows+','+layout.rowHeight+'px);gap:'+layout.gap+'px">'+items.slice(layout.start,layout.end).map(economy?economyTile:tab==='skills'?skillTile:cardTile).join('')+'</div>':'<div class="cj-empty"><p>'+esc(empty)+'</p>'+(tab==='offers'&&h().offers.status==='purchased'?button('所持を見る','owned'):'')+'</div>')+'</section>';
}
function miniList(ids){return ids.length?'<ul class="cj-build-list">'+group(ids).map(x=>'<li><span>'+esc(name(x.id))+'</span><b>×'+x.count+'</b></li>').join('')+'</ul>':'<span class="cj-muted">なし</span>';}
function changeRows(){const c=state.comparison;if(!c)return '<p class="cj-muted">'+(state.pending?'確認中…':'変更の確認待ち')+'</p>';if(!c.ok)return '<p class="cj-warning" role="alert">'+esc(reason(c.refusal))+'</p>';
 const rows=[];const row=(object,change)=>rows.push('<div class="cj-change"><span>'+esc(object)+'</span><strong>'+change+'</strong></div>');
 if(c.cancellation.bases.length)row(c.cancellation.bases.map(id=>name('base:'+id)).join('・')+'を忘れる','着想 +'+pt(c.cancellation.actual_refund_units));
 if(c.purchase?.performed_on_copy)row(name(p().candidate)+'を所持に追加','着想 −'+pt(c.purchase.cost_units));
 if(p().next_preparation.learn.length)row(p().next_preparation.learn.map(id=>name('base:'+id)).join('・')+'を覚える','着想 −'+pt(c.learning.payment_units));
 for(const [key,verb]of [['removed','外す'],['added','装備']])for(const x of c.differences.equipment[key])row(name(x.id),verb);
 const initial=api.currentPlan(state.view).next_preparation.deck;
 for(const id of new Set([...c.differences.deck.added,...c.differences.deck.removed].map(x=>x.id)))row(name(id),count(id,initial)+' → '+count(id)+'枚');
 return '<div class="cj-changes">'+rows.join('')+'</div><div class="cj-change"><span>所持</span><strong>'+h().owned.length+' → '+c.prepared.owned.length+'</strong></div>'+ (c.purchase?.performed_on_copy?'<dl class="cj-record-stats"><div><dt>取消後</dt><dd>'+pt(c.stages.after_cancellation.unspent_units)+'</dd></div><div><dt>購入前 → 後</dt><dd>'+pt(c.stages.before_purchase.unspent_units)+' → '+pt(c.stages.after_purchase.unspent_units)+'</dd></div><div><dt>確定後</dt><dd>'+pt(c.stages.prepared.unspent_units)+'</dd></div></dl>':'');
}
function summaryContents(){const c=state.comparison;
 return '<div class="cj-setup-line"><span>心得</span><div>'+miniList(p().next_preparation.equipment)+'</div></div><div class="cj-setup-line"><span>札組</span><strong>'+p().next_preparation.deck.length+'枚</strong></div>'+
 (dirty()?'<div class="cj-summary-diff">'+changeRows()+'</div>':'')+
 '<div class="cj-summary-actions">'+button(dirty()?'確定して出発':'出発 '+icon('arrow-right'),'depart','data-j-mutation '+(dirty()&&!c?.ok||!destinationCanDepart()?'disabled':''),'cj-primary')+
 (dirty()?'<div>'+button('確定','commit','data-j-mutation '+(!c?.ok?'disabled':''))+button('比較','review')+'</div>':'')+'</div>';
}
function sceneView(){return '<section class="cj-fixed-scene">'+landscape()+readWindow()+'</section>';}
function startView(){return '<section class="cj-fixed-start"><h2>'+esc(title)+'</h2><span>crossweave</span></section>';}
function cardFacts(item,snapshot=false){
 if(item.kind==='passive')return skillStructure(item)+affixView(item);
 const p=snapshot?item:item.primary,field=snapshot?{power:item.field_power,hit:item.field_hit}:item.field;
 const row=(term,value,shape)=>value==null?'':'<div><dt>'+(shape?icon(shape):'')+term+'</dt><dd>'+esc(value)+'</dd></div>';
 let primary='';
 if(p?.kind==='defense_support'){primary+=row('全員へ身構',p.defense_grant?.guard,'shield')+row('全員へ攪乱',p.defense_grant?.evasion,'wind');}else if(p){primary+=row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power,p.kind==='guard'?'shield':p.kind==='heal'?'heart-plus':'arrow-up-right');
  if(p.kind!=='heal')primary+=row(p.kind==='guard'?'攪乱':'探査',p.kind==='guard'?p.evasion:p.hit,p.kind==='guard'?'wind':'scan-search');primary+=row('機転',p.crit_gain,'zap');}
 const properties=api.effectHTML(item);
 return '<dl class="cj-record-stats">'+(snapshot?row('属性',item.attr):'')+primary+row('手札期限',item.life)+'</dl>'+
  (field&&(field.power!=null||field.hit!=null)?'<h3>場に置くと</h3><dl class="cj-record-stats">'+row('突破／身構',field.power,'arrow-up-right')+row('探査／攪乱',field.hit,'scan-search')+'</dl>':'')+
  '<h3>次の行動まで</h3><dl class="cj-record-stats">'+row('置く',snapshot?item.place_cost:item.action_intervals?.place)+row('一致',snapshot?item.match_cost:item.action_intervals?.match)+'</dl>'+
  properties;
}
function detailView(id,{back=false,w=windows.find(x=>x.id===id)}={}){const item=info(id),base=item.base_id,passive=item.kind==='passive',known=learned(base),cancelled=p()?.cancel_learning?.includes(base);
 const pinLabel=w?.pinned?'固定を外す':'固定する';
 const head='<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2 data-tooltip="'+esc(name(id))+'">'+esc(name(id))+'</h2>'+button(icon('pin'),'pin','data-id="'+esc(id)+'" aria-label="'+pinLabel+'" data-tooltip="'+pinLabel+'" aria-pressed="'+!!w?.pinned+'"','cj-icon-button')+(!back?button(icon('x'),'close-item','data-id="'+esc(id)+'" aria-label="詳細を閉じる"','cj-icon-button'):'')+'</div>';
 let body='',actions='';
 if(passive)body+='<div class="cj-detail-cost"><span>枠消費</span><strong>'+item.equipment_cost+'</strong></div>'+skillStructure(item);
 else body+=cardFacts(item);
 body+=affixView(item);
 if(h()?.owned.some(x=>x.id===id)){const row=h().owned.find(x=>x.id===id);body+='<p>'+esc((row.references||[]).map(x=>usageLabels[x]||'使用中').join('・')||(row.eligibility_reason==='owned_but_base_not_learned'?'基礎の心得は未習得':'所持'))+'</p>';}
 if(!connectedAcquisition()&&d().phase==='home'&&passive&&(id.startsWith('base:')||h().owned.some(x=>x.id===id)||id==='$purchase')){actions=skillActions(id);
  body='<p class="cj-skill-state">'+esc(skillState(id))+'</p>'+body+(!known?'<p>覚える費用：着想 −'+pt(item.learning_cost_units)+'</p>':'');
 }else if(!connectedAcquisition()&&d().phase==='home'&&(h().free_card_options.includes(id)||h().owned.some(x=>x.id===id)||id==='$purchase'))actions=button('−1枚','remove','data-id="'+esc(id)+'" data-j-mutation '+(!count(id)?'disabled':''))+ '<strong>'+count(id)+'枚</strong>'+button('+1枚','add','data-id="'+esc(id)+'" data-j-mutation '+(p().next_preparation.deck.filter(x=>info(x).base_id===base).length>=h().deck.per_base_cap||(!id.startsWith('base:')&&count(id))?'disabled':''));
 else if(!h()?.owned.some(x=>x.id===id)&&!(h()?.free_card_options||[]).includes(id)&&item.kind==='card')body+='<p class="cj-muted">未所持。解放された札と、所持している札は別です。</p>';
 return '<section class="cj-inspect-item" data-inspect-key="'+esc(id)+'">'+head+'<div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}
__JOURNEY_ECONOMY__
__JOURNEY_RECORDS__
function renderPanel(){const box=$('[data-inspector]'),hasChild=panel==='records'&&!!(recordTarget||recordDetail);box.hidden=!panel;box.parentElement.classList.toggle('cj-has-inspector',!!panel);if(!panel){box.replaceChildren();panelTrail=[];recordParentRect=null;return;}
 const level=panelTrail.length,parent=panelTrail.at(-1),withLevel=(markup,n)=>markup.replaceAll('data-inspect-key=', 'data-level="'+n+'" data-inspect-key=');
 let current=panel==='details'?windows.slice(-2).map(w=>detailView(w.id,{w,back:!!parent||windows.length>2})).join(''):panel==='records'?recordsPanelView():panelView(panel,!!parent);
 if(parent&&!hasChild&&windows.length<2)current=withLevel(parent.panel==='details'?parent.windows.slice(-1).map(w=>detailView(w.id,{w,back:level>1})).join(''):panelView(parent.panel,level>1),level-1)+withLevel(current,level);
 else current=withLevel(current,level);
 box.innerHTML=current;box.dataset.count=box.children.length;box.dataset.layout=box.children.length>1?'linked':'windows';
}
function panelView(panel,back=false){
 const titles={review:dirty()?'現在と変更案':committedFlash?'確定後の編成':'現在の編成',records:'調査記録',menu:'メニュー',help:'遊び方',settings:'表示',data:'保存データ',receipt:'帰還の内訳',destination:destinationHeading(),unavailable:'購入・所持',notice:'操作の確認',purchase:'購入の確認',conversion:'着想に変える',texts:'文章の記録'};
 let body='',actions='';
 if(panel==='review'){body=wallet()+(dirty()?changeRows()+purchasePlanControls():'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');actions=dirty()?button('確定','commit','data-j-mutation '+(!state.comparison?.ok?'disabled':''),'cj-primary')+button('確定して出発','depart','data-j-mutation '+(!state.comparison?.ok||!destinationCanDepart()?'disabled':'')):'';}
 if(panel==='receipt')body=receiptDetails();
 if(panel==='destination')body=destinationDescription()+(unifiedAcquisition()?'':'<h3>札組</h3><div>'+miniList(p().next_preparation.deck)+'</div><h3>心得</h3><div>'+miniList(p().next_preparation.equipment)+'</div>');
 if(panel==='purchase')({body,actions}=purchasePanel());
 if(panel==='conversion')({body,actions}=conversionPanel());
 if(panel==='texts')body=textHistoryView();
 if(panel==='notice'){body='<p>'+esc(reason(state.error))+'</p>';actions=(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'');}
 if(panel==='records')body=recordsView();
 if(panel==='menu'){
  const items=[['調査記録','records'],['表示','settings'],['遊び方','help'],['保存データ','data'],['文章の記録','texts'],...(!unifiedAcquisition()&&h()?[['購入','offers'],['所持','owned']]:[]),...(currentScreen()==='explore'?[['目的','explore-objective'],['状況','explore-status'],['行動順','explore-order'],['山札','explore-deck'],['履歴','explore-history'],['操作','explore-settings']]:[]),...(canSuspend()?[['中断','suspend']]:[]),...(!unifiedAcquisition()&&dirty()?[['変更案を戻す','discard']]:[])];
  const width=Math.min(520,panelTrail.length?(frameWidth-48)/2:frameWidth-32),height=Math.min(480,frameWidth*9/16-32),cols=width>=280?2:1,rows=Math.max(1,Math.floor((height-144)/56)),capacity=rows*cols,pages=Math.ceil(items.length/capacity);
  menuPage=Math.min(menuPage,pages-1);body='<nav class="cj-menu-grid" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+items.slice(menuPage*capacity,(menuPage+1)*capacity).map(([label,action])=>button(label,action)).join('')+'</nav>';
  actions=pages>1?button(icon('chevron-left'),'menu-page','data-step="-1" aria-label="前のメニュー" '+(!menuPage?'disabled':''))+'<span>'+(menuPage+1)+'/'+pages+'</span>'+button(icon('chevron-right'),'menu-page','data-step="1" aria-label="次のメニュー" '+(menuPage+1===pages?'disabled':'')):'';
 }
 if(panel==='settings')body='<label class="cj-setting"><input type="checkbox" data-motion '+(root.dataset.motion==='reduced'?'checked':'')+'> 動きを抑える</label>';
 if(panel==='help'&&!unifiedAcquisition())body='<h3>編成</h3><p>札の＋／−で枚数を変える。心得は「覚える」と「覚えて装備」を選べる。「習得済み」「装備中」で現在の状態を確認する。名前を押すと発動条件と効果を確認できる。</p><p>着想と構成の差分を見て確定すると、自動保存される。札組と心得の切替では、編集中の内容はそのまま残る。</p><h3>探索</h3><p>「探索を中断」で進行を止め、「続きから」で同じ探索に戻る。中断では撤退・帰還しない。</p><p>札を選び、相手をタップして対象を指定する。相手の選択と同時に詳細を表示する。相手のホールドは使わない。</p><p>予測はもう一度押すと閉じる。札を押し続けて場へ運ぶ操作も使える。低い画面では、同じ札をもう一度押すと札の詳細。</p><h3>予測</h3><p>選んだ札の直後の変化を表示する。隠蔽は攻撃による減少後・再設定前の値。機転などは消費も含む一手解決後の差分。続く相手の行動は含まない。行動予約の「次」は、選んだ行動の後の本人の予約。同時刻の相手は一組で示す。途中の行動で順序や到達可否は変わる。</p><h3>身構と攪乱</h3><p>複数の発生源から受けた防御を合計して表示する。回数が異なる組は「混在」。詳細で内訳を確認できる。</p><h3>購入と所持</h3><p>候補から購入すると所持に加わる。「編成と比較」では購入と札組・心得の変更を一緒に確定できる。心得を買っても、まだ覚えていなければ別に習得が必要。所持品を「保護」すると、着想への変換を防ぐ。「着想に変える」とその個体は失われる。</p><h3>詳細窓</h3><p>ピンで固定し、もう一度押すと固定を外す。矢印で元の窓に戻る。</p><div class="cj-help-symbols">'+[['arrow-up-right','突破'],['scan-search','探査'],['venetian-mask','隠蔽'],['zap','機転'],['shield','身構'],['wind','攪乱']].map(([symbol,label])=>'<span>'+icon(symbol)+label+'</span>').join('')+'</div>';
 if(panel==='help'&&unifiedAcquisition())body='<h3>編成</h3><p>探索先画面の「編成」から札・心得を切り替える。取得可能・所持・編成の間を、ボタンまたはホールド後のドラッグで移せる。取得は支払前に編成へ試せる。「確認する」で差分を見て確定する。「戻す」は未確定の変更をまとめて取り消す。</p><h3>探索</h3><p>札と相手はクリックで選択と詳細を表示する。選んだ札のボタン、またはホールド後のドラッグで行動する。予測の場札も詳細を開ける。</p><h3>共通操作</h3><p>調査記録とメニューは右上。前の画面へ戻る操作は左上、窓を閉じる操作はその窓の右上にある。帰還結果は「進む」で送り、その後の探索先画面から編成できる。</p>' ;
 if(panel==='data'){body='<p>'+(storageMode==='ephemeral'?'この試作は、閉じると保存が失われます。':'確定した操作は自動保存されます。')+'</p>'+(d().phase==='home'?'<p>編成は「確定」で保存します。編集中の内容は、確定するまで保存済みの編成を変えません。</p>':'')+'<p>書き出しは保存済みの内容です。</p>';actions=button('書き出す','export','data-j-mutation')+(canSuspend()?button('探索を中断','suspend','data-j-mutation'):'');}
 return '<section class="cj-inspect-item" data-inspect-key="'+panel+'"><div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+titles[panel]+'</h2>'+button(icon('x'),'close','aria-label="窓を閉じる"','cj-icon-button')+'</div><div class="cj-inspect-scroll">'+body+'</div><div class="cj-detail-actions">'+actions+'</div></section>';
}
