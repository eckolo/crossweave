const root=document.getElementById('cw-acquisition-review');
const screen=root.querySelector('[data-screen]'),overlay=root.querySelector('[data-overlay]'),live=root.querySelector('[data-live]');
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const item=key=>fixture.catalogue[key],offer=id=>fixture.offers.find(x=>x.id===id);
let current=clone(fixture.initial),draft=freshDraft(),view={tab:'offers',page:0,dialog:null,key:null,offer:null},lastFocus=null;
function freshDraft(){return {offers:[],deck:[...current.deck],equipment:[...current.equipment]};}
function projected(){return [...current.units,...draft.offers.map(id=>({uid:'pending-'+id,key:offer(id).key}))];}
function spending(){return draft.offers.reduce((sum,id)=>sum+offer(id).price,0);}
function selected(key,which=draft){const units=projected();return [...which.deck,...which.equipment].filter(uid=>units.find(x=>x.uid===uid)?.key===key).length;}
function owned(key){return current.units.filter(x=>x.key===key).length;}
function available(key){return projected().filter(x=>x.key===key).length;}
function pending(key){return draft.offers.find(id=>offer(id).key===key);}
function load(equipment=draft.equipment){return equipment.reduce((sum,uid)=>sum+(item(projected().find(x=>x.uid===uid)?.key)?.equipment_cost||0),0);}
function dirty(){return draft.offers.length>0||JSON.stringify(draft.deck)!==JSON.stringify(current.deck)||JSON.stringify(draft.equipment)!==JSON.stringify(current.equipment);}
function errors(){
 const result=[],units=projected(),byUid=new Map(units.map(x=>[x.uid,x]));
 if(spending()>current.wallet)result.push('着想が'+(spending()-current.wallet)+'不足しています。');
 if(draft.offers.length+current.purchased.length>fixture.rules.offerLimit)result.push('今回の取得は'+fixture.rules.offerLimit+'点までです。');
 if(draft.deck.length!==fixture.rules.deckSize)result.push('札組を'+fixture.rules.deckSize+'枚にしてください（現在'+draft.deck.length+'枚）。');
 const counts={};for(const uid of draft.deck){const it=item(byUid.get(uid)?.key);if(!it){result.push('編成に含まれる札を確認してください。');continue;}counts[it.base_id]=(counts[it.base_id]||0)+1;}
 for(const [id,n] of Object.entries(counts))if(n>fixture.rules.perKindCap)result.push(item(units.find(x=>item(x.key).base_id===id).key).base_name+'は'+fixture.rules.perKindCap+'枚までです。');
 if(load()>fixture.rules.equipmentLimit)result.push('心得の枠が'+(load()-fixture.rules.equipmentLimit)+'超過しています。');
 for(const key of ['deck','equipment'])if(new Set(draft[key]).size!==draft[key].length||draft[key].some(uid=>!byUid.has(uid)))result.push('編成に使う所持品を確認してください。');
 return result;
}
function notify(text){live.textContent=text;}
function button(text,action,{key='',id='',disabled=false,primary=false,extra='',label=''}={}){
 return '<button type="button" class="cp-button cursor-interaction'+(primary?' cp-primary':'')+'" data-action="'+action+'"'+(key?' data-key="'+esc(key)+'"':'')+(id?' data-id="'+esc(id)+'"':'')+' data-focus="'+esc(action+'|'+(key||id))+'"'+(disabled?' disabled':'')+(label?' aria-label="'+esc(label)+'"':'')+' '+extra+'>'+text+'</button>';
}
function stateText(key){return (owned(key)?'所持 '+owned(key):'未所持')+(pending(key)?' → '+available(key):'')+' · 編成 '+selected(key);}
function planButton(o){
 const taken=current.purchased.includes(o.id),id=o.id;
 if(taken)return '<span class="cp-taken">取得済み</span>';
 if(draft.offers.includes(id))return button('取得をやめる','unstage',{id});
 return button('取得予定に加える','stage',{id,disabled:current.purchased.length+draft.offers.length>=fixture.rules.offerLimit,primary:true});
}
function composeButtons(key,compact=false){
 const n=selected(key),kind=item(key).kind;
 if(compact)return button(n?'外す':'編成に入れる',n?'remove':'add',{key,primary:!n,disabled:!n&&!available(key)});
 return button('−','remove',{key,disabled:n===0,label:item(key).name+'を編成から1'+(kind==='card'?'枚':'個')+'外す'})+'<span class="cp-counter">'+n+'</span>'+button('＋','add',{key,disabled:n>=available(key),label:item(key).name+'を編成に1'+(kind==='card'?'枚':'個')+'入れる'});
}
function catalogue(){
 if(view.tab==='offers')return fixture.offers.map(o=>({key:o.key,offer:o}));
 const kind=view.tab==='deck'?'card':'passive';
 return [...new Set(projected().filter(x=>item(x.key).kind===kind).map(x=>x.key))].map(key=>({key}));
}
function tile(row){
 const it=item(row.key),p=pending(row.key),isOffer=!!row.offer;
 let meta=isOffer?(it.kind==='card'?'札':'心得')+' · 着想 '+row.offer.price:stateText(row.key);
 if(it.kind==='passive')meta+=' · 枠消費 '+it.equipment_cost;
 else meta+=' · '+it.primary.kind.replace('attack','突破').replace('guard','身構').replace('heal','回復')+' '+it.primary.power;
 const status=p?'取得予定':isOffer&&current.purchased.includes(row.offer.id)?'取得済み':!isOffer&&selected(row.key)?'編成中':'';
 const attrs={'key':row.key,id:row.offer?.id||'',extra:'aria-label="'+esc(it.name)+'の詳細"'};
 let actions=isOffer?planButton(row.offer):composeButtons(row.key);
 if(isOffer&&p)actions+=composeButtons(row.key,true);
 return '<article class="cp-piece'+(p?' cp-pending':'')+'">'+button('<span class="cp-item-heading"><i data-lucide="'+(it.kind==='card'?'layers':'scroll-text')+'" aria-hidden="true"></i><strong>'+esc(it.name)+'</strong></span><span class="cp-item-meta">'+esc(meta)+'</span>'+(status?'<span class="cp-badge">'+status+'</span>':''),'detail',attrs)+'<div class="cp-item-actions">'+actions+'</div></article>';
}
function size(){const w=root.getBoundingClientRect().width||1024;const side=w>=820?292:0;const content=w-side-20;const cols=w<440?1:Math.max(1,Math.min(3,Math.floor(content/210)));const tileH=w<440?48:108;const rows=Math.max(1,Math.floor((w*9/16-144)/tileH));return {w,cols,rows,count:cols*rows};}
function sidebar(){
 const after=current.wallet-spending(),changes=errors();
 return '<aside class="cp-summary"><h2>確定後の見通し</h2><dl class="cp-money"><div><dt>現在の着想</dt><dd>'+current.wallet+'</dd></div><div><dt>支払予定</dt><dd>'+spending()+'</dd></div><div><dt>確定後</dt><dd class="'+(after<0?'cp-warning':'')+'">'+after+'</dd></div></dl><div class="cp-capacity"><span>札組</span><strong>'+draft.deck.length+' / '+fixture.rules.deckSize+'枚</strong><span>心得の枠消費</span><strong>'+load()+' / '+fixture.rules.equipmentLimit+'</strong></div><h3>心得</h3><div class="cp-equipped">'+[...new Set(draft.equipment.map(uid=>projected().find(x=>x.uid===uid)?.key))].map(key=>button(esc(item(key).name)+(selected(key)>1?' ×'+selected(key):'')+(pending(key)?' <small>取得予定</small>':''),'detail',{key})).join('')+'</div>'+(changes.length?'<p class="cp-warning">'+esc(changes[0])+'</p>':'<p class="cp-valid">'+(dirty()?'この内容で確定できます。':'編成は確定済みです。')+'</p>')+'</aside>';
}
function render(){
 const focus=document.activeElement?.dataset.focus,hadFocus=root.contains(document.activeElement),scroll=overlay.querySelector('.cp-dialog-scroll')?.scrollTop||0;
 const dims=size(),all=catalogue(),pages=Math.max(1,Math.ceil(all.length/dims.count));
 view.page=Math.min(Math.max(0,view.page),pages-1);
 const title=view.tab==='offers'?'取得候補 · 今回は'+fixture.rules.offerLimit+'点まで':view.tab==='deck'?'札組 '+draft.deck.length+' / '+fixture.rules.deckSize+'枚':'心得 · 枠消費 '+load()+' / '+fixture.rules.equipmentLimit;
 const after=current.wallet-spending();
 screen.innerHTML='<header class="cp-header"><span class="cp-brand">crossweave</span><nav aria-label="準備の画面">'+[['offers','取得'],['deck','札組'],['skills','心得']].map(([id,label])=>button(label,'tab',{id,extra:'aria-pressed="'+(view.tab===id)+'"'})).join('')+'</nav><div class="cp-wallet" aria-label="着想 現在'+current.wallet+'、支払予定'+spending()+'、確定後'+after+'"><span>着想</span><strong>'+current.wallet+'</strong>'+(dirty()?'<span>→</span><strong class="'+(after<0?'cp-warning':'')+'">'+after+'</strong>':'')+'</div></header><main class="cp-main"><section class="cp-catalogue"><div class="cp-toolbar"><h2>'+esc(title)+'</h2><div class="cp-pager">'+button('‹','prev',{disabled:view.page===0,label:'前の一覧'})+'<span>'+ (view.page+1)+' / '+pages+'</span>'+button('›','next',{disabled:view.page===pages-1,label:'次の一覧'})+'</div></div><div class="cp-grid" style="--cp-columns:'+dims.cols+';--cp-rows:'+dims.rows+'">'+all.slice(view.page*dims.count,(view.page+1)*dims.count).map(tile).join('')+'</div></section>'+sidebar()+'</main><footer class="cp-footer"><span class="cp-stage">'+(dirty()?'未確定':'確定済み')+'</span>'+button('変更をすべて取消','discard',{disabled:!dirty()})+button('比較・確定','review',{primary:true,disabled:!dirty()})+'</footer>';
 renderDialog();
 const target=[...root.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===focus&&!x.disabled&&(view.dialog?overlay.contains(x):screen.contains(x)));
 if(target)target.focus({preventScroll:true});
 else if(view.dialog)overlay.querySelector('[data-action="close"]')?.focus({preventScroll:true});
 else if(hadFocus)screen.querySelector('[data-action="tab"][aria-pressed="true"]')?.focus({preventScroll:true});
 if(overlay.querySelector('.cp-dialog-scroll'))overlay.querySelector('.cp-dialog-scroll').scrollTop=scroll;
 if(globalThis.lucide)globalThis.lucide.createIcons({attrs:{width:16,height:16}});
}
function facts(it){
 const row=(label,value)=>'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
 if(it.kind==='passive')return '<dl class="cp-facts">'+row('枠消費',it.equipment_cost)+row('発動条件',it.trigger_text.replaceAll('／','。'))+row('効果',it.effect_text.replaceAll('／','。'))+'</dl>';
 const p=it.primary;
 return '<dl class="cp-facts">'+row('属性',fixture.catalogue[it.key]?.base_id?fixtureCardAttr(it):'')+row(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power)+(p.kind==='guard'?row('攪乱',p.evasion):p.kind==='attack'?row('探査',p.hit):'')+row('手札期限',it.life)+row('行動間隔','置く '+it.action_intervals.place+' / 一致 '+it.action_intervals.match)+row('場の効果','突破／身構 '+it.field.power+'、探査／攪乱 '+it.field.hit)+(it.recovery_rule==='consumed_on_recovery'?row('性質','この探索では回収時に消滅。所持品は残る。'):'')+'</dl>';
}
function fixtureCardAttr(it){return it.attribute||'—';}
function detailBody(key){const it=item(key),p=pending(key);return '<div class="cp-detail-state">'+(p?'<strong>取得予定 · 未払い</strong>':owned(key)?'<strong>所持</strong>':'<strong>取得候補 · 未所持</strong>')+'<span>'+esc(stateText(key))+'</span></div>'+facts(it)+(it.affixes.length?'<h3>修飾</h3>'+it.affixes.map(x=>'<p>'+esc(x.label)+'：'+esc(x.description.replaceAll('／','。'))+'</p>').join(''):'')+(p?'<p class="cp-muted">編成から外しても、取得予定は残ります。</p>':'');}
function changesFor(field){
 const keys=[...new Set([...current[field],...draft[field]].map(uid=>projected().find(x=>x.uid===uid)?.key))];
 return keys.map(key=>({key,before:current[field].filter(uid=>current.units.find(x=>x.uid===uid)?.key===key).length,after:draft[field].filter(uid=>projected().find(x=>x.uid===uid)?.key===key).length})).filter(x=>x.before!==x.after);
}
function reviewBody(){
 const issues=errors(),changed=[...changesFor('deck'),...changesFor('equipment')];
 const costs='<dl class="cp-money"><div><dt>現在の着想</dt><dd>'+current.wallet+'</dd></div><div><dt>支払い</dt><dd>'+spending()+'</dd></div><div><dt>確定後の着想</dt><dd>'+ (current.wallet-spending())+'</dd></div></dl>';
 const purchases=draft.offers.map(id=>{const o=offer(id),on=draft.deck.includes('pending-'+id)||draft.equipment.includes('pending-'+id);return '<div class="cp-change"><span>'+esc(item(o.key).name)+'<small>'+ (on?'取得して編成に入れる':'取得して所持する · 編成には入れない')+'</small></span><strong>着想 '+o.price+'</strong></div>';}).join('')||'<p class="cp-muted">新しい取得はありません。</p>';
 const diffs=changed.map(x=>'<div class="cp-change"><span>'+esc(item(x.key).name)+'</span><strong>'+x.before+' → '+x.after+'</strong></div>').join('')||'<p class="cp-muted">編成の変更はありません。</p>';
 const effects=changesFor('equipment').map(x=>'<section class="cp-effect-change"><h3>'+esc(item(x.key).name)+' · '+x.before+' → '+x.after+'個</h3>'+facts(item(x.key))+'</section>').join('');
 return (issues.length?'<div role="alert" class="cp-problems">'+issues.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'')+costs+'<h3>正式に取得するもの</h3>'+purchases+'<h3>編成の変更</h3>'+diffs+'<div class="cp-capacity"><span>札組</span><strong>'+draft.deck.length+' / '+fixture.rules.deckSize+'枚</strong><span>心得の枠消費</span><strong>'+load()+' / '+fixture.rules.equipmentLimit+'</strong></div>'+effects;
}
function renderDialog(){
 overlay.hidden=!view.dialog;screen.inert=!!view.dialog;root.querySelector('.cp-reviewbar').inert=!!view.dialog;
 if(!view.dialog){overlay.replaceChildren();return;}
 let title,body,actions;
 if(view.dialog==='detail'){
  const key=view.key,it=item(key),o=view.offer?offer(view.offer):pending(key)?offer(pending(key)):null;
  title=it.name;body=detailBody(key);
  if(o&&!draft.offers.includes(o.id)&&!current.purchased.includes(o.id))body+='<p>取得費用：着想 '+o.price+'</p>'+(current.purchased.length?'この候補からは取得済みです。':draft.offers.length?'今回の取得予定は1点までです。現在の予定を取り消すと、選び直せます。':'');
  actions=(o&&!current.purchased.includes(o.id)?planButton(o):'')+(available(key)?composeButtons(key):'');
 }else{
  title='確定前の確認';body=reviewBody();actions=button('戻る','close')+button(spending()?'着想'+spending()+'を使って確定':'編成を確定','commit',{primary:true,disabled:errors().length>0||!dirty()});
 }
 overlay.innerHTML='<section class="cp-dialog" role="dialog" aria-modal="true" aria-labelledby="cp-dialog-title"><header class="cp-dialog-head"><h2 id="cp-dialog-title">'+esc(title)+'</h2>'+button('×','close',{label:'閉じる'})+'</header><div class="cp-dialog-scroll">'+body+'</div><footer class="cp-dialog-actions">'+actions+'</footer></section>';
}
function openDialog(type,key,id){lastFocus=document.activeElement?.dataset.focus;view.dialog=type;view.key=key;view.offer=id||null;render();overlay.querySelector('[data-action="close"]').focus({preventScroll:true});}
function closeDialog(){view.dialog=null;render();[...screen.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===lastFocus&&!x.disabled)?.focus({preventScroll:true});}
function mutate(action,key,id){
 if(action==='stage'){
  if(!offer(id)||draft.offers.includes(id)||current.purchased.includes(id))return;
  if(draft.offers.length+current.purchased.length>=fixture.rules.offerLimit){notify('今回の取得予定は1点までです。');return;}
  draft.offers.push(id);notify(item(offer(id).key).name+'を取得予定に追加しました。着想はまだ支払っていません。');
 }else if(action==='unstage'){
  if(!draft.offers.includes(id))return;
  draft.offers=draft.offers.filter(x=>x!==id);for(const type of ['deck','equipment'])draft[type]=draft[type].filter(uid=>uid!=='pending-'+id);
  if(view.dialog==='detail'&&!owned(view.key)&&!pending(view.key)){view.dialog=null;view.tab='offers';view.page=0;}
  notify('取得予定を取り消しました。その予定分の編成も外しました。着想は変わりません。');
 }else if(action==='add'||action==='remove'){
  if(!item(key))return;const field=item(key).kind==='card'?'deck':'equipment';
  if(action==='add'){const unit=projected().find(x=>x.key===key&&!draft[field].includes(x.uid));if(!unit)return;draft[field].push(unit.uid);}
  else{const uid=draft[field].findLast(uid=>projected().find(x=>x.uid===uid)?.key===key);if(!uid)return;draft[field]=draft[field].filter(x=>x!==uid);}
  notify(item(key).name+'を編成'+(action==='add'?'に入れました。':'から外しました。')+(pending(key)?'取得予定と支払予定額は変わりません。':'所持品はそのままです。'));
 }else if(action==='discard'){draft=freshDraft();view.dialog=null;notify('取得予定と編成の変更をすべて取り消しました。最後に確定した状態です。');}
 else if(action==='commit'){
  const issues=errors();if(issues.length||!dirty()){notify(issues[0]||'変更はありません。');return;}
  const cost=spending(),mapping=Object.fromEntries(draft.offers.map(id=>['pending-'+id,'acquired-'+id]));
  const next={wallet:current.wallet-cost,units:[...clone(current.units),...draft.offers.map(id=>({uid:mapping['pending-'+id],key:offer(id).key}))],purchased:[...current.purchased,...draft.offers],deck:draft.deck.map(uid=>mapping[uid]||uid),equipment:draft.equipment.map(uid=>mapping[uid]||uid)};
  current=next;draft=freshDraft();view.dialog=null;notify((cost?'着想'+cost+'を支払い、正式に取得しました。':'')+'編成を確定しました。現在の着想は'+current.wallet+'です。');
 }
 render();
}
root.addEventListener('click',event=>{
 const b=event.target.closest('button[data-action]');if(!b||!root.contains(b)||b.disabled)return;
 const {action,key,id}=b.dataset;
 if(action==='tab'){view.tab=id;view.page=0;render();}
 else if(action==='next'||action==='prev'){view.page+=action==='next'?1:-1;render();}
 else if(action==='detail')openDialog('detail',key,id);
 else if(action==='review')openDialog('review');
 else if(action==='close')closeDialog();
 else if(action==='reset'){current=clone(fixture.initial);draft=freshDraft();view={tab:'offers',page:0,dialog:null,key:null,offer:null};render();notify('操作案を最初の状態に戻しました。');}
 else mutate(action,key,id);
});
overlay.addEventListener('click',event=>{if(event.target===overlay)closeDialog();});
root.addEventListener('keydown',event=>{
 if(!view.dialog)return;
 if(event.key==='Escape'){event.preventDefault();closeDialog();}
 if(event.key==='Tab'){
  const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
let previousWidth=0;
if(globalThis.ResizeObserver)new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(w!==previousWidth){previousWidth=w;render();}}).observe(root);
render();
