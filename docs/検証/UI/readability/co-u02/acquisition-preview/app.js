const options=typeof acquisitionOptions==='undefined'?{}:acquisitionOptions;
const root=options.root||document.getElementById('cw-acquisition-review');
const eventScope=new AbortController();
const listen=(node,type,fn,extra={})=>node?.addEventListener(type,fn,{...extra,signal:eventScope.signal});
const screen=root.querySelector('[data-screen]'),overlay=root.querySelector('[data-overlay]'),live=root.querySelector('[data-live]');
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
__RUNTIME__
const item=key=>fixture.catalogue[key],offer=id=>fixture.offers.find(x=>x.id===id);
let current=clone(fixture.initial),draft=freshDraft(),view=emptyView(),lastFocus=null;
function freshDraft(){return {offers:[],deck:[...current.deck],equipment:[...current.equipment]};}
function projected(){return [...current.units,...draft.offers.map(id=>({uid:pendingUid(id),key:offer(id).key}))];}
function spending(){if(runtime)return runtimeState.comparison?.payment?.cost_units!=null?runtimeState.comparison.payment.cost_units/100:dirty()?'—':0;return draft.offers.reduce((sum,id)=>sum+offer(id).price,0);}
function selected(key,which=draft){const units=projected();return [...which.deck,...which.equipment].filter(uid=>units.find(x=>x.uid===uid)?.key===key).length;}
function owned(key){return current.units.filter(x=>x.key===key).length;}
function available(key){return projected().filter(x=>x.key===key).length;}
function pending(key){return draft.offers.find(id=>offer(id).key===key);}
function load(equipment=draft.equipment){if(runtime)return runtimeState.comparison?.prepared?.equipment.used??(dirty()?'—':runtimeState.view.display_data.home.equipment.used);return equipment.reduce((sum,uid)=>sum+(item(projected().find(x=>x.uid===uid)?.key)?.equipment_cost||0),0);}
function dirty(){if(runtime)return !!runtimeState.view.display_data.migration_notice?.review_required||!globalThis.CrossweaveUI.samePreparation(runtimeState.draft,globalThis.CrossweaveUI.currentPlan(runtimeState.view));return draft.offers.length>0||JSON.stringify(draft.deck)!==JSON.stringify(current.deck)||JSON.stringify(draft.equipment)!==JSON.stringify(current.equipment);}
function errors(){
 if(runtime)return runtimeErrors();
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
function button(text,action,{key='',id='',uid='',zone='',disabled=false,primary=false,extra='',label=''}={}){
 return '<button type="button" class="cp-button cursor-interaction'+(primary?' cp-primary':'')+'" data-action="'+action+'"'+(key?' data-key="'+esc(key)+'"':'')+(id?' data-id="'+esc(id)+'"':'')+(uid?' data-uid="'+esc(uid)+'"':'')+(zone?' data-zone="'+esc(zone)+'"':'')+' data-focus="'+esc(action+'|'+(uid||key||id||zone))+'"'+(disabled?' disabled':'')+(label?' aria-label="'+esc(label)+'"':'')+' '+extra+'>'+text+'</button>';
}
function stateText(key){return (owned(key)?'所持 '+owned(key):'未所持')+(pending(key)?' → '+available(key):'')+' · 編成 '+selected(key);}
__LAYOUT__
__PREVIEW__
function mutate(action,key,id,uid,destination='reserve'){
 if(runtime&&['commit','discard','rebuild','retry','reload'].includes(action)){void runtimeAction(action);return;}
 if(runtimeLocked()||migrationPending())return;
 if(action==='stage'){
  if(!canStage(id))return;
  draft.offers.push(id);if(destination==='build')draft[item(offer(id).key).kind==='card'?'deck':'equipment'].push(pendingUid(id));revealUnit(destination,pendingUid(id),offer(id).key);notify(item(offer(id).key).name+'を取得予定に追加しました。'+(destination==='build'?'編成しました。':'')+'着想はまだ支払っていません。');
 }else if(action==='unstage'){
  if(!draft.offers.includes(id))return;
  draft.offers=draft.offers.filter(x=>x!==id);for(const type of ['deck','equipment'])draft[type]=draft[type].filter(uid=>uid!==pendingUid(id));
  if(view.dialog==='detail'&&view.key===offer(id).key){view.uid=null;view.offer=id;}
  revealUnit('offer',null,null,id);
  notify('取得予定を取り消しました。その予定分の編成も外しました。着想は変わりません。');
 }else if(action==='add'||action==='remove'){
  if(!item(key))return;const field=item(key).kind==='card'?'deck':'equipment';
  if(action==='add'){const unit=projected().find(x=>x.key===key&&!draft[field].includes(x.uid)&&(!uid||x.uid===uid));if(!unit)return;draft[field].push(unit.uid);revealUnit('build',unit.uid,key);}
  else{const target=uid&&draft[field].includes(uid)?uid:draft[field].findLast(u=>projected().find(x=>x.uid===u)?.key===key);if(!target)return;draft[field]=draft[field].filter(x=>x!==target);revealUnit('reserve',target,key);}
  notify(item(key).name+'を編成'+(action==='add'?'に入れました。':'から外しました。')+(pending(key)?'取得予定と支払予定額は変わりません。':'所持品はそのままです。'));
 }else if(action==='discard'){draft=freshDraft();view.dialog=null;notify('取得予定と編成の変更をすべて取り消しました。最後に確定した状態です。');}
 else if(action==='commit'){
  const issues=errors();if(issues.length||!dirty()){notify(issues[0]||'変更はありません。');return;}
  const cost=spending(),mapping=Object.fromEntries(draft.offers.map(id=>[pendingUid(id),'acquired-'+id]));
  const next={wallet:current.wallet-cost,units:[...clone(current.units),...draft.offers.map(id=>({uid:mapping[pendingUid(id)],key:offer(id).key}))],purchased:[...current.purchased,...draft.offers],deck:draft.deck.map(uid=>mapping[uid]||uid),equipment:draft.equipment.map(uid=>mapping[uid]||uid)};
  current=next;draft=freshDraft();view.dialog=null;notify((cost?'着想'+cost+'を支払い、正式に取得しました。':'')+'編成を確定しました。現在の着想は'+current.wallet+'です。');
 }
 if(runtime)runtimeEdit();else render();
}
__GESTURES__
listen(root,'click',event=>{
 if(event.detail!==0&&Date.now()<suppressUntil){event.preventDefault();return;}
 cancelGesture(false);
 const b=event.target.closest('button[data-action]');if(!b||!root.contains(b)||b.disabled)return;
 const {action,key,id,uid,zone}=b.dataset;
 if(action==='back'){cancelGesture();options.onBack?.();}
 else if(action==='tab'){view.tab=id;render();}
 else if(action==='detail')openDialog('detail',key,id,uid,zone);
 else if(action==='review'){if(runtime)void runtimeAction('review');else openDialog('review');}
 else if(action==='close')closeDialog();
 else if(action==='reset'){current=clone(fixture.initial);draft=freshDraft();view=emptyView();render(false);notify('操作案を最初の状態に戻しました。');}
 else mutate(action,key,id,uid);
});
listen(overlay,'click',event=>{if(event.target===overlay)closeDialog();});
listen(root,'keydown',event=>{
 if(event.key==='Escape'&&gesture){event.preventDefault();cancelGesture();return;}
 if(!view.dialog){const grid=event.target.closest('[data-scroll-zone]');if(grid&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const d=dimensions();if(event.key==='ArrowLeft'||event.key==='ArrowRight')grid.scrollLeft+=(event.key==='ArrowLeft'?-1:1)*(d.tileWidth+d.gap);else grid.scrollTop+=(event.key==='ArrowUp'?-1:1)*(d.tileHeight+d.gap);saveScroll();}return;}
 if(event.key==='Escape'){event.preventDefault();closeDialog();}
 if(event.key==='Tab'){
  const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
let previousWidth=0;
const resizeObserver=globalThis.ResizeObserver?new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(w!==previousWidth){previousWidth=w;syncPreview();}}):null;
resizeObserver?.observe(root);
render();
syncPreview();
const acquisitionHandle={snapshot:()=>clone({current,draft,view}),modified:()=>dirty()||(!runtime&&JSON.stringify(current)!==JSON.stringify(fixture.initial)),
 setTab(tab){if(['card','passive'].includes(tab)){view.tab=tab;render();}},
 suspend(){cancelGesture();if(view.dialog)closeDialog();},
 dispose(){runtimeOff?.();cancelGesture();eventScope.abort();resizeObserver?.disconnect();holdCue.dispose();root.replaceChildren();}};
if(runtime)runtimeOff=runtime.subscribe(runtimeReceive);
options.onReady?.(acquisitionHandle);
