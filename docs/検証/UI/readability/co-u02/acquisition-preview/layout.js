const zones=['offer','reserve','build'];
const zoneNames={offer:'取得可能',reserve:'所持',build:'編成'};
const zoneIcons={offer:'store',reserve:'layers',build:'layout-grid'};
function emptyView(){return {tab:'card',scroll:{},boardLeft:0,reveal:null,dialog:null,key:null,offer:null,uid:null,zone:null};}
function icon(name){return '<i data-lucide="'+name+'" aria-hidden="true"></i>';}
function unitPending(uid){return runtime?fixture.offers.some(x=>x.pending_uid===uid):String(uid||'').startsWith('pending-');}
function composed(uid){return draft.deck.includes(uid)||draft.equipment.includes(uid);}
function offerPhase(){if(runtime)return fixture.offers.some(o=>item(o.key).kind===view.tab)?'open':fixture.groups.some(g=>g.status==='acquired')?'complete':'empty';return current.purchased.length>0&&current.purchased.length>=fixture.rules.offerLimit?'complete':fixture.offers.length?'open':'empty';}
function motionId(row){return row.offer?'offer-'+row.offer.id:unitPending(row.uid)?'offer-'+pendingOffer(row.uid):row.uid?.startsWith('acquired-')?'offer-'+row.uid.slice(9):row.uid;}
function rowsFor(zone){
 if(zone==='offer')return offerPhase()==='complete'?[]:fixture.offers.filter(o=>item(o.key).kind===view.tab&&!current.purchased.includes(o.id)).map(o=>({key:o.key,offer:o,placeholder:draft.offers.includes(o.id)}));
 const units=projected().filter(x=>item(x.key).kind===view.tab);
 if(zone==='build')return (view.tab==='card'?draft.deck:draft.equipment).map(uid=>({...units.find(x=>x.uid===uid),count:1}));
 const groups=new Map();for(const unit of units.filter(x=>!composed(x.uid))){const id=unit.key+'|'+unitPending(unit.uid);if(!groups.has(id))groups.set(id,{...unit,count:0});groups.get(id).count++;}return [...groups.values()];
}
function dimensions(){
 const columnsByZone={offer:1,reserve:2,build:2},laneWidths={offer:376,reserve:735,build:735};
 return {width:1920,height:1080,tileWidth:352,tileHeight:80,gap:8,orientation:'columns',columnsByZone,laneWidths,
  gridHeights:{offer:878,reserve:878,build:878},capacity:{offer:10,reserve:20,build:20},
  boardStyle:'grid-template-columns:'+zones.map(z=>laneWidths[z]+'px').join(' ')};
}
function revealUnit(zone,uid,key,id){view.reveal={zone,uid,key,id};}
function saveScroll(){
 for(const el of screen.querySelectorAll('[data-scroll-zone]'))view.scroll[el.dataset.kind+':'+el.dataset.scrollZone]={left:el.scrollLeft,top:el.scrollTop};
 const board=screen.querySelector('[data-board-scroll]');if(board)view.boardLeft=board.scrollLeft;
}
function restoreScroll(){
 const d=dimensions(),board=screen.querySelector('[data-board-scroll]');if(board)board.scrollLeft=view.boardLeft;
 for(const el of screen.querySelectorAll('[data-scroll-zone]')){const saved=view.scroll[view.tab+':'+el.dataset.scrollZone];if(saved){el.scrollLeft=saved.left;el.scrollTop=saved.top;}}
 if(!view.reveal)return;
 const {zone,uid,key,id}=view.reveal,rows=rowsFor(zone),index=rows.findIndex(row=>zone==='offer'?row.offer.id===id:row.uid===uid||(zone==='reserve'&&row.key===key&&unitPending(row.uid)===unitPending(uid)));
 view.reveal=null;if(index<0)return;
 const columns=d.columnsByZone[zone],el=screen.querySelector('[data-scroll-zone="'+zone+'"]'),left=2+(index%columns)*(d.tileWidth+d.gap),top=2+Math.floor(index/columns)*(d.tileHeight+d.gap),w=el.clientWidth||d.laneWidths[zone]-16,h=el.clientHeight||d.gridHeights[zone];
 if(left<el.scrollLeft)el.scrollLeft=left-2;else if(left+d.tileWidth>el.scrollLeft+w)el.scrollLeft=left+d.tileWidth-w+2;
 if(top<el.scrollTop)el.scrollTop=top-2;else if(top+d.tileHeight>el.scrollTop+h)el.scrollTop=top+d.tileHeight-h+2;
 const lane=el.closest('[data-zone]'),lr=lane.getBoundingClientRect(),br=board.getBoundingClientRect();
 if(lr.left<br.left)board.scrollLeft-=(br.left-lr.left)/previewScale();else if(lr.right>br.right)board.scrollLeft+=(lr.right-br.right)/previewScale();
 saveScroll();
}
function localAction(row,zone,{compact=false}={}){
 const key=row.key,uid=row.uid;
 if(zone==='offer')return button('取得','stage',{id:row.offer.id,primary:true,disabled:!canStage(row.offer.id),label:item(key).name+'を未払いで取得する'});
 const put=zone==='reserve';
 return button(put?'編成':'外す',put?'add':'remove',{key,uid,primary:put,label:item(key).name+'を編成'+(put?'に入れる':'から外す')})+(unitPending(uid)&&!compact?button('取消','unstage',{id:pendingOffer(uid),label:item(key).name+'の取得をやめる'}):'');
}
function card(row,zone){
 if(row.placeholder)return '<div class="cp-offer-empty" aria-label="'+esc(item(row.key).name)+'は取得予定へ移動済み">'+icon('arrow-right')+'</div>';
 const it=item(row.key),p=unitPending(row.uid),o=row.offer,price=o?.price??(p?offer(pendingOffer(row.uid)).price:null);
 const state=zone==='offer'?'取得可能':(p?'取得予定、未払い':'所持')+(zone==='build'?'、編成中':'、未編成');
 return '<article class="cp-piece cp-'+zone+(p?' cp-pending':'')+'" data-zone-item="'+zone+'" data-unit="'+esc(row.uid||'')+'" data-key="'+esc(row.key)+'" data-offer="'+esc(o?.id||'')+'" data-motion="'+esc(motionId(row))+'" data-pending="'+p+'" aria-label="'+esc(it.name+'、'+state)+'">'+
  button('<strong>'+esc(it.name)+'</strong><span class="cp-card-meta"><span class="cp-card-mark">'+icon(zone==='build'?'check':it.kind==='card'?'layers':'scroll-text')+'</span>'+(price!==null?icon('lightbulb')+'<span>'+price+'</span>':it.kind==='passive'?icon('grid-2x2')+'<span>'+it.equipment_cost+'</span>':'<span>'+esc(it.attribute||'')+'</span>')+(row.count>1?'<span class="cp-quantity">×'+row.count+'</span>':'')+'</span>'+(p?'<span class="cp-clock" data-tooltip="支払前">'+icon('clock-3')+'</span>':''),'detail',{key:row.key,id:o?.id,uid:row.uid,zone,label:it.name+'の詳細、'+state,extra:'data-tooltip="'+esc(it.name)+'"'})+
  '<div class="cp-item-actions">'+localAction(row,zone,{compact:true})+'</div></article>';
}
function lane(zone){
 const all=rowsFor(zone),d=dimensions();
 const count=zone==='build'?(view.tab==='card'?draft.deck.length+' / '+fixture.rules.deckSize:load()+' / '+fixture.rules.equipmentLimit):zone==='reserve'?all.reduce((n,x)=>n+x.count,0):all.filter(x=>!x.placeholder).length;
 const capacityBad=zone==='build'&&(view.tab==='card'?draft.deck.length!==fixture.rules.deckSize:load()>fixture.rules.equipmentLimit);
 const title=icon(zoneIcons[zone])+'<span>'+zoneNames[zone]+'</span><strong class="'+(capacityBad?'cp-warning':'')+'">'+count+'</strong>';
 let cells=all.map(row=>card(row,zone)).join('');
 if(zone==='build'&&view.tab==='card'&&all.length<fixture.rules.deckSize)cells+=Array.from({length:fixture.rules.deckSize-all.length},()=>'<div class="cp-empty cp-slot" aria-label="空き枠">'+icon('plus')+'</div>').join('');
 if(!cells)cells=zone==='offer'?'<p class="cp-offer-message" data-offer-state="'+offerPhase()+'" role="status">'+icon(offerPhase()==='complete'?'circle-check':'inbox')+'<span>'+(offerPhase()==='complete'?'今回の取得は完了':'取得できる'+(view.tab==='card'?'札':'心得')+'はありません')+'</span></p>':'<div class="cp-empty" aria-label="'+zoneNames[zone]+'は空です">'+icon(zone==='build'?'square-dashed':zoneIcons[zone])+'</div>';
 return '<section class="cp-lane cp-lane-'+zone+'" data-zone="'+zone+'" aria-label="'+zoneNames[zone]+'"><header class="cp-lane-head"><div class="cp-lane-title">'+title+'</div><span class="cp-drop-label" aria-hidden="true"></span></header><div class="cp-lane-grid" data-scroll-zone="'+zone+'" data-kind="'+view.tab+'" style="--cp-columns:'+d.columnsByZone[zone]+'">'+cells+'</div></section>';
}
function wallet(){if(runtime){const after=runtimeState.comparison?.payment?.unspent_after_units;return '<div class="cp-wallet" aria-label="着想">'+icon('lightbulb')+'<span>着想</span><strong>'+current.wallet+'</strong>'+(dirty()?icon('arrow-right')+'<span class="cp-wallet-next">'+icon('clock-3')+'<strong>'+(after==null?'—':after/100)+'</strong></span>':'')+'</div>';}return '<div class="cp-wallet" aria-label="着想 現在'+current.wallet+'、支払予定'+spending()+'、確定後'+(current.wallet-spending())+'">'+icon('lightbulb')+'<span>着想</span><strong>'+current.wallet+'</strong>'+(dirty()?icon('arrow-right')+'<span class="cp-wallet-next '+(spending()>current.wallet?'cp-warning':'')+'" data-tooltip="支払後">'+icon('clock-3')+'<strong>'+(current.wallet-spending())+'</strong></span>':'')+'</div>';}
function purchaseTrack(){
 if(runtime)return runtimeTrack();
 const phase=offerPhase();
 if(phase==='complete')return '<div class="cp-purchase-track">'+icon('circle-check')+'<span>取得済み '+current.purchased.length+' / '+fixture.rules.offerLimit+'</span></div>';
 if(phase==='empty')return '<div class="cp-purchase-track">'+icon('inbox')+'<span>取得候補なし</span></div>';
 return '<div class="cp-purchase-track" aria-label="今回の取得、選択済み'+(draft.offers.length+current.purchased.length)+'点、上限'+fixture.rules.offerLimit+'点">'+icon('store')+'<span>'+(draft.offers.length+current.purchased.length)+' / '+fixture.rules.offerLimit+'</span>'+(draft.offers.length?icon('arrow-right')+draft.offers.map(id=>'<span class="cp-pending-token" data-tooltip="'+esc(item(offer(id).key).name)+'">'+icon(item(offer(id).key).kind==='card'?'layers':'scroll-text')+icon('clock-3')+'</span>').join(''):'')+'</div>';
}
function render(preserveScroll=true){
 cancelGesture();if(preserveScroll)saveScroll();
 const focus=document.activeElement?.dataset.focus,hadFocus=root.contains(document.activeElement),scroll=overlay.querySelector('.cp-dialog-scroll')?.scrollTop||0;
 const oldPositions=new Map([...screen.querySelectorAll('[data-motion]')].map(x=>[x.dataset.motion,x.getBoundingClientRect()]));
 screen.innerHTML='<header class="cp-header"><span class="cp-brand">crossweave</span><nav aria-label="管理するもの">'+[['card','札'],['passive','心得']].map(([id,label])=>button(label,'tab',{id,extra:'aria-pressed="'+(view.tab===id)+'"'})).join('')+'</nav>'+wallet()+'</header><main class="cp-main" data-board-scroll data-orientation="'+dimensions().orientation+'" style="'+dimensions().boardStyle+'">'+zones.map(lane).join('')+'</main><footer class="cp-footer">'+purchaseTrack()+button(icon('undo-2')+'戻す','discard',{disabled:!dirty(),label:'取得予定と編成の変更をすべて戻す'})+button('確認する','review',{primary:true,disabled:!dirty()})+'</footer>';
 if(options.embedded){
  const header=screen.querySelector('.cp-header');
  header.querySelector('.cp-brand').outerHTML=button(icon('arrow-left')+'戻る','back',{label:'探索先に戻る'});
  header.insertAdjacentHTML('beforeend',globalThis.CrossweaveUI.commonNavigationHTML());
 }
 screen.insertAdjacentHTML('afterbegin',runtimeNotice());
 restoreScroll();renderDialog();
 if(runtime){for(const b of root.querySelectorAll('button[data-action]')){const a=b.dataset.action;if(runtimeLocked()&&!['tab','detail','close','back','retry','reload'].includes(a)||migrationPending()&&!['tab','detail','close','back','discard','rebuild'].includes(a)||runtimeState.pending&&['commit','review','retry','reload'].includes(a))b.disabled=true;}}
 const target=[...root.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===focus&&!x.disabled&&(view.dialog?overlay.contains(x):screen.contains(x)));
 if(target)target.focus({preventScroll:true});else if(view.dialog)overlay.querySelector('[data-action="close"]')?.focus({preventScroll:true});else if(hadFocus)screen.querySelector('[data-action="tab"][aria-pressed="true"]')?.focus({preventScroll:true});
 if(overlay.querySelector('.cp-dialog-scroll'))overlay.querySelector('.cp-dialog-scroll').scrollTop=scroll;
 if(globalThis.lucide)globalThis.lucide.createIcons({attrs:{width:16,height:16}});
 if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)for(const el of screen.querySelectorAll('[data-motion]')){const before=oldPositions.get(el.dataset.motion);if(!before||!el.animate)continue;const after=el.getBoundingClientRect();const dx=(before.x-after.x)/previewScale(),dy=(before.y-after.y)/previewScale();if(dx||dy)el.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:200,easing:'ease-out'});}
 options.onChange?.({modified:dirty()||(!runtime&&JSON.stringify(current)!==JSON.stringify(fixture.initial)),wallet:current.wallet,pending:spending()});
}
function facts(it){
 const row=(label,value)=>'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
 if(it.kind==='passive')return '<dl class="cp-facts">'+row('枠消費',it.equipment_cost)+row('発動条件',it.trigger_text.replaceAll('／','。'))+row('効果',it.effect_text.replaceAll('／','。'))+'</dl>';
 const p=it.primary;if(p?.kind==='defense_support')return '<dl class="cp-facts">'+row('全員へ身構',p.defense_grant.guard)+row('全員へ攪乱',p.defense_grant.evasion)+row('手札期限',it.life)+'</dl>';return '<dl class="cp-facts">'+(it.attribute?row('属性',it.attribute):'')+row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power)+(p.kind==='guard'?row('攪乱',p.evasion):p.kind==='attack'?row('探査',p.hit):'')+row('手札期限',it.life)+row('行動間隔','置く '+it.action_intervals.place+' / 一致 '+it.action_intervals.match)+row('場の効果','突破／身構 '+it.field.power+'、探査／攪乱 '+it.field.hit)+(it.recovery_rule==='consumed_on_recovery'?row('性質','この探索では回収時に消滅。所持品は残る。'):'')+'</dl>';
}
function changesFor(field){const keys=[...new Set([...current[field],...draft[field]].map(uid=>projected().find(x=>x.uid===uid)?.key))];return keys.map(key=>({key,before:current[field].filter(uid=>current.units.find(x=>x.uid===uid)?.key===key).length,after:draft[field].filter(uid=>projected().find(x=>x.uid===uid)?.key===key).length})).filter(x=>x.before!==x.after);}
function reviewBody(){
 if(runtime)return runtimeReviewBody();
 const issues=errors(),changed=[...changesFor('deck'),...changesFor('equipment')];
 const balance='<div class="cp-review-wallet">'+icon('lightbulb')+'<strong>'+current.wallet+'</strong>'+icon('arrow-right')+'<strong>'+(current.wallet-spending())+'</strong><small>−'+spending()+'</small></div>';
 const purchases=draft.offers.map(id=>{const o=offer(id),zone=composed(pendingUid(id))?'build':'reserve';return '<div class="cp-change cp-review-purchase" aria-label="'+esc(item(o.key).name)+'を取得し、'+(zone==='build'?'編成する':'編成せず所持する')+'"><span class="cp-pending-token">'+icon('clock-3')+'</span><strong>'+esc(item(o.key).name)+'</strong>'+icon('arrow-right')+icon(zoneIcons[zone])+'<span>'+icon('lightbulb')+o.price+'</span></div>';}).join('');
 const diffs=changed.map(x=>'<div class="cp-change"><span>'+esc(item(x.key).name)+'</span><strong>'+x.before+' '+icon('arrow-right')+' '+x.after+'</strong></div>').join('');
 const effects=changesFor('equipment').map(x=>'<details><summary>'+esc(item(x.key).name)+'</summary>'+facts(item(x.key))+'</details>').join('');
 return (issues.length?'<div role="alert" class="cp-problems">'+issues.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'')+balance+(purchases?'<section class="cp-review-group"><h3>'+icon('store')+'取得</h3>'+purchases+'</section>':'')+(diffs?'<section class="cp-review-group"><h3>'+icon('layout-grid')+'編成</h3>'+diffs+'</section>':'')+'<div class="cp-capacity"><span>'+icon('layers')+'札</span><strong>'+draft.deck.length+' / '+fixture.rules.deckSize+'</strong><span>'+icon('grid-2x2')+'心得</span><strong>'+load()+' / '+fixture.rules.equipmentLimit+'</strong></div>'+effects;
}
function renderDialog(){
 overlay.hidden=!view.dialog;screen.inert=!!view.dialog;const reset=root.querySelector('[data-action="reset"]');if(reset)reset.disabled=!!view.dialog;if(!view.dialog){overlay.replaceChildren();return;}
 let title,body,actions;
 if(view.dialog==='detail'){
  const key=view.key,it=item(key);let unit=projected().find(x=>x.uid===view.uid);
  if(!unit&&pending(key))unit=projected().find(x=>x.uid===pendingUid(pending(key)));
  if(!unit&&owned(key)&&!view.offer)unit=projected().find(x=>x.key===key);
  const o=view.offer?offer(view.offer):pending(key)?offer(pending(key)):null,zone=unit?(composed(unit.uid)?'build':'reserve'):'offer';
  const p=unit&&unitPending(unit.uid),path=zones.map(z=>'<span class="'+(z===zone?'is-active':'')+'" aria-label="'+zoneNames[z]+'">'+icon(zoneIcons[z])+'</span>').join(icon('chevron-right'));
  title=it.name;body='<div class="cp-location">'+path+(p?'<span class="cp-pending-token" aria-label="未払い">'+icon('clock-3')+'</span>':'')+'</div>'+facts(it)+(it.affixes.length?'<details><summary>修飾</summary>'+it.affixes.map(x=>'<p>'+esc(x.label)+'：'+esc(x.description.replaceAll('／','。'))+'</p>').join('')+'</details>':'');
  if(o&&(zone==='offer'||p))body+='<div class="cp-price">'+icon('lightbulb')+'<strong>'+o.price+'</strong></div>';
  actions=unit?localAction({...unit,count:1},zone):o?localAction({key,offer:o},'offer'):'';
 }else{title='変更内容';body=reviewBody();actions='<span class="cp-payment">'+icon('lightbulb')+'<strong>'+spending()+'</strong></span>'+button('確定する','commit',{primary:true,disabled:errors().length>0||!dirty(),label:'表示中の取得と編成を確定する'});}
 if(runtime&&view.dialog==='review'&&(runtimeState.canRetry||runtimeState.stale))actions=(runtimeState.canRetry?button('再試行','retry',{primary:true}):'')+(runtimeState.stale?button('読み直す','reload',{primary:true,label:'変更案を戻して最新の状態を読み直す'}):'');
 overlay.innerHTML='<section class="cp-dialog" role="dialog" aria-modal="true" aria-labelledby="cp-dialog-title"><header class="cp-dialog-head"><h2 id="cp-dialog-title">'+esc(title)+'</h2>'+button(icon('x'),'close',{label:'閉じる'})+'</header><div class="cp-dialog-scroll">'+body+'</div><footer class="cp-dialog-actions">'+actions+'</footer></section>';
}
function openDialog(type,key,id,uid,zone){lastFocus=document.activeElement?.dataset.focus;view.dialog=type;view.key=key;view.offer=id||null;view.uid=uid||null;view.zone=zone||null;render();overlay.querySelector('[data-action="close"]').focus({preventScroll:true});}
function closeDialog(){view.dialog=null;render();if(!view.dialog)[...screen.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===lastFocus&&!x.disabled)?.focus({preventScroll:true});}
