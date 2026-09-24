const zones=['offer','reserve','build'];
const zoneNames={offer:'候補',reserve:'手元',build:'編成'};
const zoneIcons={offer:'store',reserve:'layers',build:'layout-grid'};
function emptyView(){return {tab:'card',pages:{offer:0,reserve:0,build:0},dialog:null,key:null,offer:null,uid:null,zone:null,backLane:null};}
function icon(name){return '<i data-lucide="'+name+'" aria-hidden="true"></i>';}
function unitPending(uid){return String(uid||'').startsWith('pending-');}
function composed(uid){return draft.deck.includes(uid)||draft.equipment.includes(uid);}
function motionId(row){return row.offer?'offer-'+row.offer.id:unitPending(row.uid)?'offer-'+row.uid.slice(8):row.uid?.startsWith('acquired-')?'offer-'+row.uid.slice(9):row.uid;}
function rowsFor(zone){
 if(zone==='offer')return fixture.offers.filter(o=>item(o.key).kind===view.tab).map(o=>({key:o.key,offer:o,placeholder:draft.offers.includes(o.id)||current.purchased.includes(o.id)}));
 const units=projected().filter(x=>item(x.key).kind===view.tab);
 if(zone==='build')return (view.tab==='card'?draft.deck:draft.equipment).map(uid=>({...units.find(x=>x.uid===uid),count:1}));
 const groups=new Map();for(const unit of units.filter(x=>!composed(x.uid))){const id=unit.key+'|'+unitPending(unit.uid);if(!groups.has(id))groups.set(id,{...unit,count:0});groups.get(id).count++;}return [...groups.values()];
}
function dimensions(zone,{dialog=false}={}){
 const width=root.getBoundingClientRect().width||1024,compact=width<640;
 if(dialog)return {width,cols:width<640?1:2,rows:Math.max(1,Math.floor((width*9/16-112)/(width<640?46:112))),compact};
 if(compact)return {width,cols:1,rows:Math.max(1,Math.floor((width*9/16-136)/50)),compact};
 const zoneWidth=(width-36)*({offer:.85,reserve:1.1,build:1.6}[zone]/3.55);
 return {width,cols:zone==='offer'?1:Math.max(1,Math.floor((zoneWidth-8)/(zone==='build'?104:140))),rows:Math.max(1,Math.floor((width*9/16-156)/112)),compact};
}
function revealUnit(zone,uid,key,id){
 const rows=rowsFor(zone),index=rows.findIndex(row=>zone==='offer'?row.offer.id===id:row.uid===uid||(zone==='reserve'&&row.key===key&&unitPending(row.uid)===unitPending(uid)));
 if(index<0)return;const d=dimensions(zone);view.pages[zone]=Math.floor(index/(d.cols*d.rows));
}
function localAction(row,zone){
 const key=row.key,uid=row.uid;
 if(zone==='offer')return button('選ぶ','stage',{id:row.offer.id,primary:true,disabled:current.purchased.length+draft.offers.length>=fixture.rules.offerLimit,label:item(key).name+'を取得予定に選ぶ'});
 const put=zone==='reserve';
 return button(put?'入れる':'外す',put?'add':'remove',{key,uid,primary:put,label:item(key).name+'を編成'+(put?'に入れる':'から外す')})+(unitPending(uid)?button('やめる','unstage',{id:uid.slice(8),label:item(key).name+'の取得をやめる'}):'');
}
function card(row,zone){
 if(row.placeholder)return '<div class="cp-offer-empty" aria-label="'+esc(item(row.key).name)+'は'+(draft.offers.includes(row.offer.id)?'取得予定へ移動済み':'取得済み')+'">'+icon(draft.offers.includes(row.offer.id)?'arrow-right':'check')+'</div>';
 const it=item(row.key),p=unitPending(row.uid),o=row.offer,price=o?.price??(p?offer(row.uid.slice(8)).price:null);
 const state=zone==='offer'?'取得候補':(p?'取得予定、未払い':'所持')+(zone==='build'?'、編成中':'、未編成');
 return '<article class="cp-piece cp-'+zone+(p?' cp-pending':'')+'" data-zone-item="'+zone+'" data-unit="'+esc(row.uid||'')+'" data-key="'+esc(row.key)+'" data-motion="'+esc(motionId(row))+'" data-pending="'+p+'" aria-label="'+esc(it.name+'、'+state)+'">'+
  button('<span class="cp-card-mark">'+icon(zone==='build'?'check':it.kind==='card'?'layers':'scroll-text')+'</span><strong>'+esc(it.name)+'</strong><span class="cp-card-meta">'+(price!==null?icon('lightbulb')+'<span>'+price+'</span>':it.kind==='passive'?icon('grid-2x2')+'<span>'+it.equipment_cost+'</span>':'<span>'+esc(it.attribute)+'</span>')+(row.count>1?'<span class="cp-quantity">×'+row.count+'</span>':'')+'</span>'+(p?'<span class="cp-clock" data-tooltip="支払前">'+icon('clock-3')+'</span>':''),'detail',{key:row.key,id:o?.id,uid:row.uid,zone,label:it.name+'の詳細、'+state,extra:'data-tooltip="'+esc(it.name)+'"'})+
  '<div class="cp-item-actions">'+localAction(row,zone)+'</div></article>';
}
function lane(zone){
 const all=rowsFor(zone),d=dimensions(zone),per=d.cols*d.rows,pages=Math.max(1,Math.ceil(all.length/per));view.pages[zone]=Math.min(view.pages[zone],pages-1);
 const count=zone==='build'?(view.tab==='card'?draft.deck.length+' / '+fixture.rules.deckSize:load()+' / '+fixture.rules.equipmentLimit):zone==='reserve'?all.reduce((n,x)=>n+x.count,0):all.filter(x=>!x.placeholder).length;
 const capacityBad=zone==='build'&&(view.tab==='card'?draft.deck.length!==fixture.rules.deckSize:load()>fixture.rules.equipmentLimit);
 const title=icon(zoneIcons[zone])+'<span>'+zoneNames[zone]+'</span><strong class="'+(capacityBad?'cp-warning':'')+'">'+count+'</strong>';
 const heading=d.compact?button(title+icon('chevron-down'),'lane',{zone,label:zoneNames[zone]+'の一覧を開く'}):'<div class="cp-lane-title">'+title+'</div>'+(pages>1?'<div class="cp-pager">'+button(icon('chevron-left'),'prev',{zone,disabled:view.pages[zone]===0,label:zoneNames[zone]+'の前のページ'})+'<small>'+(view.pages[zone]+1)+'/'+pages+'</small>'+button(icon('chevron-right'),'next',{zone,disabled:view.pages[zone]===pages-1,label:zoneNames[zone]+'の次のページ'})+'</div>':'');
 let cells=all.slice(view.pages[zone]*per,(view.pages[zone]+1)*per).map(row=>card(row,zone)).join('');
 if(!cells)cells='<div class="cp-empty" aria-label="'+zoneNames[zone]+'は空です">'+icon(zone==='build'?'square-dashed':zoneIcons[zone])+'</div>';
 if(zone==='build'&&view.tab==='card'&&all.length<fixture.rules.deckSize){const vacancies=Math.min(per-all.slice(view.pages[zone]*per,(view.pages[zone]+1)*per).length,fixture.rules.deckSize-all.length);if(all.length)cells+=Array.from({length:Math.max(0,vacancies)},()=>'<div class="cp-empty cp-slot" aria-label="空き枠">'+icon('plus')+'</div>').join('');}
 return '<section class="cp-lane cp-lane-'+zone+'" data-zone="'+zone+'" aria-label="'+zoneNames[zone]+'"><header class="cp-lane-head">'+heading+'</header><div class="cp-lane-grid" style="--cp-columns:'+d.cols+'">'+cells+'</div></section>';
}
function wallet(){return '<div class="cp-wallet" aria-label="着想 現在'+current.wallet+'、支払予定'+spending()+'、確定後'+(current.wallet-spending())+'">'+icon('lightbulb')+'<span>着想</span><strong>'+current.wallet+'</strong>'+(dirty()?icon('arrow-right')+'<span class="cp-wallet-next '+(spending()>current.wallet?'cp-warning':'')+'" data-tooltip="支払後">'+icon('clock-3')+'<strong>'+(current.wallet-spending())+'</strong></span>':'')+'</div>';}
function render(){
 const focus=document.activeElement?.dataset.focus,hadFocus=root.contains(document.activeElement),scroll=overlay.querySelector('.cp-dialog-scroll')?.scrollTop||0;
 const oldPositions=new Map([...screen.querySelectorAll('[data-motion]')].map(x=>[x.dataset.motion,x.getBoundingClientRect()]));
 screen.innerHTML='<header class="cp-header"><span class="cp-brand">crossweave</span><nav aria-label="管理するもの">'+[['card','札'],['passive','心得']].map(([id,label])=>button(label,'tab',{id,extra:'aria-pressed="'+(view.tab===id)+'"'})).join('')+'</nav>'+wallet()+'</header><main class="cp-main">'+zones.map(lane).join('')+'</main><footer class="cp-footer"><div class="cp-purchase-track" aria-label="今回の取得、選択済み'+(draft.offers.length+current.purchased.length)+'点、上限'+fixture.rules.offerLimit+'点">'+icon('store')+'<span>'+(draft.offers.length+current.purchased.length)+' / '+fixture.rules.offerLimit+'</span>'+(draft.offers.length?icon('arrow-right')+draft.offers.map(id=>'<span class="cp-pending-token" data-tooltip="'+esc(item(offer(id).key).name)+'">'+icon(item(offer(id).key).kind==='card'?'layers':'scroll-text')+icon('clock-3')+'</span>').join(''):'')+'</div>'+button(icon('undo-2')+'戻す','discard',{disabled:!dirty(),label:'取得予定と編成の変更をすべて戻す'})+button('確認する','review',{primary:true,disabled:!dirty()})+'</footer>';
 renderDialog();
 const target=[...root.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===focus&&!x.disabled&&(view.dialog?overlay.contains(x):screen.contains(x)));
 if(target)target.focus({preventScroll:true});else if(view.dialog)overlay.querySelector('[data-action="close"]')?.focus({preventScroll:true});else if(hadFocus)screen.querySelector('[data-action="tab"][aria-pressed="true"]')?.focus({preventScroll:true});
 if(overlay.querySelector('.cp-dialog-scroll'))overlay.querySelector('.cp-dialog-scroll').scrollTop=scroll;
 if(globalThis.lucide)globalThis.lucide.createIcons({attrs:{width:16,height:16}});
 if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)for(const el of screen.querySelectorAll('[data-motion]')){const before=oldPositions.get(el.dataset.motion);if(!before||!el.animate)continue;const after=el.getBoundingClientRect();const dx=before.x-after.x,dy=before.y-after.y;if(dx||dy)el.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:200,easing:'ease-out'});}
}
function facts(it){
 const row=(label,value)=>'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
 if(it.kind==='passive')return '<dl class="cp-facts">'+row('枠消費',it.equipment_cost)+row('発動条件',it.trigger_text.replaceAll('／','。'))+row('効果',it.effect_text.replaceAll('／','。'))+'</dl>';
 const p=it.primary;return '<dl class="cp-facts">'+row('属性',it.attribute)+row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power)+(p.kind==='guard'?row('攪乱',p.evasion):p.kind==='attack'?row('探査',p.hit):'')+row('手札期限',it.life)+row('行動間隔','置く '+it.action_intervals.place+' / 一致 '+it.action_intervals.match)+row('場の効果','突破／身構 '+it.field.power+'、探査／攪乱 '+it.field.hit)+(it.recovery_rule==='consumed_on_recovery'?row('性質','この探索では回収時に消滅。所持品は残る。'):'')+'</dl>';
}
function changesFor(field){const keys=[...new Set([...current[field],...draft[field]].map(uid=>projected().find(x=>x.uid===uid)?.key))];return keys.map(key=>({key,before:current[field].filter(uid=>current.units.find(x=>x.uid===uid)?.key===key).length,after:draft[field].filter(uid=>projected().find(x=>x.uid===uid)?.key===key).length})).filter(x=>x.before!==x.after);}
function reviewBody(){
 const issues=errors(),changed=[...changesFor('deck'),...changesFor('equipment')];
 const balance='<div class="cp-review-wallet">'+icon('lightbulb')+'<strong>'+current.wallet+'</strong>'+icon('arrow-right')+'<strong>'+(current.wallet-spending())+'</strong><small>−'+spending()+'</small></div>';
 const purchases=draft.offers.map(id=>{const o=offer(id),zone=composed('pending-'+id)?'build':'reserve';return '<div class="cp-change cp-review-purchase" aria-label="'+esc(item(o.key).name)+'を取得し、'+(zone==='build'?'編成する':'編成せず所持する')+'"><span class="cp-pending-token">'+icon('clock-3')+'</span><strong>'+esc(item(o.key).name)+'</strong>'+icon('arrow-right')+icon(zoneIcons[zone])+'<span>'+icon('lightbulb')+o.price+'</span></div>';}).join('');
 const diffs=changed.map(x=>'<div class="cp-change"><span>'+esc(item(x.key).name)+'</span><strong>'+x.before+' '+icon('arrow-right')+' '+x.after+'</strong></div>').join('');
 const effects=changesFor('equipment').map(x=>'<details><summary>'+esc(item(x.key).name)+'</summary>'+facts(item(x.key))+'</details>').join('');
 return (issues.length?'<div role="alert" class="cp-problems">'+issues.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'')+balance+(purchases?'<section class="cp-review-group"><h3>'+icon('store')+'取得</h3>'+purchases+'</section>':'')+(diffs?'<section class="cp-review-group"><h3>'+icon('layout-grid')+'編成</h3>'+diffs+'</section>':'')+'<div class="cp-capacity"><span>'+icon('layers')+'札</span><strong>'+draft.deck.length+' / '+fixture.rules.deckSize+'</strong><span>'+icon('grid-2x2')+'心得</span><strong>'+load()+' / '+fixture.rules.equipmentLimit+'</strong></div>'+effects;
}
function renderDialog(){
 overlay.hidden=!view.dialog;screen.inert=!!view.dialog;root.querySelector('.cp-reviewbar').inert=!!view.dialog;if(!view.dialog){overlay.replaceChildren();return;}
 let title,body,actions;
 if(view.dialog==='detail'){
  const key=view.key,it=item(key);let unit=projected().find(x=>x.uid===view.uid);
  if(!unit&&pending(key))unit=projected().find(x=>x.uid==='pending-'+pending(key));
  if(!unit&&owned(key)&&!view.offer)unit=projected().find(x=>x.key===key);
  const o=view.offer?offer(view.offer):pending(key)?offer(pending(key)):null,zone=unit?(composed(unit.uid)?'build':'reserve'):'offer';
  const p=unit&&unitPending(unit.uid),path=zones.map(z=>'<span class="'+(z===zone?'is-active':'')+'" aria-label="'+zoneNames[z]+'">'+icon(zoneIcons[z])+'</span>').join(icon('chevron-right'));
  title=it.name;body='<div class="cp-location">'+path+(p?'<span class="cp-pending-token" aria-label="未払い">'+icon('clock-3')+'</span>':'')+'</div>'+facts(it)+(it.affixes.length?'<details><summary>修飾</summary>'+it.affixes.map(x=>'<p>'+esc(x.label)+'：'+esc(x.description.replaceAll('／','。'))+'</p>').join('')+'</details>':'');
  if(o&&(zone==='offer'||p))body+='<div class="cp-price">'+icon('lightbulb')+'<strong>'+o.price+'</strong></div>';
  actions=unit?localAction({...unit,count:1},zone):o?localAction({key,offer:o},'offer'):'';
 }else if(view.dialog==='lane'){
  const zone=view.zone,all=rowsFor(zone),d=dimensions(zone,{dialog:true}),per=d.cols*d.rows,pages=Math.max(1,Math.ceil(all.length/per));view.pages[zone]=Math.min(view.pages[zone],pages-1);
  title=zoneNames[zone];body='<div class="cp-dialog-grid cp-lane-'+zone+'" style="--cp-columns:'+d.cols+'">'+all.slice(view.pages[zone]*per,(view.pages[zone]+1)*per).map(row=>card(row,zone)).join('')+'</div>';
  actions=button(icon('chevron-left'),'prev',{zone,disabled:view.pages[zone]===0,label:'前のページ'})+'<span>'+(view.pages[zone]+1)+' / '+pages+'</span>'+button(icon('chevron-right'),'next',{zone,disabled:view.pages[zone]===pages-1,label:'次のページ'});
 }else{title='変更内容';body=reviewBody();actions=button('戻る','close')+'<span class="cp-payment">'+icon('lightbulb')+'<strong>'+spending()+'</strong></span>'+button('確定する','commit',{primary:true,disabled:errors().length>0||!dirty(),label:'表示中の取得と編成を確定する'});}
 overlay.innerHTML='<section class="cp-dialog" role="dialog" aria-modal="true" aria-labelledby="cp-dialog-title"><header class="cp-dialog-head"><h2 id="cp-dialog-title">'+esc(title)+'</h2>'+button(icon(view.backLane?'arrow-left':'x'),'close',{label:view.backLane?'一覧に戻る':'閉じる'})+'</header><div class="cp-dialog-scroll">'+body+'</div><footer class="cp-dialog-actions">'+actions+'</footer></section>';
}
function openDialog(type,key,id,uid,zone){lastFocus=document.activeElement?.dataset.focus;view.backLane=view.dialog==='lane'?view.zone:null;view.dialog=type;view.key=key;view.offer=id||null;view.uid=uid||null;view.zone=zone||null;render();overlay.querySelector('[data-action="close"]').focus({preventScroll:true});}
function closeDialog(){if(view.backLane){view.dialog='lane';view.zone=view.backLane;view.backLane=null;}else view.dialog=null;render();if(!view.dialog)[...screen.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===lastFocus&&!x.disabled)?.focus({preventScroll:true});}
