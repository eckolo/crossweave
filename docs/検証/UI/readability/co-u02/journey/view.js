/* UI-PLAN-001 journey prototype. All game state and prices come from CW-M1-view-1. */
(function(api){'use strict';
api.mountJourney=function(root,{controller,Campaign,slot_id,title,session:providedSession=null,storageMode='ephemeral',destinationPreview=null,acquisitionPreview=null}){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=x=>x==null?x:JSON.parse(JSON.stringify(x)),pt=n=>Number.isInteger(n)?String(n/100):'—';
 const session=providedSession||api.makeSession(controller,{reopen:()=>Campaign.open({slot_id})});
 const $=s=>root.querySelector(s),list=x=>Array.isArray(x)?x:Object.values(x||{});
 const icon=n=>'<i data-lucide="'+n+'" aria-hidden="true"></i>';
 const button=(label,action,extra='',kind='')=>'<button type="button" data-j="'+action+'" '+extra+' class="cj-button cursor-interaction '+kind+'">'+label+'</button>';
 let state=session.state(),tab='deck',place=state.view?.display_data.draft?.dirty?'compose':'hub',panel=null,windows=[],child=null,lastScreen=null;
 let message='',continuation=null,running=false,suspended=false,disposed=false,sceneRequested=false;
 let observer=null,recording=false,sceneKey='',seen=new Set(),visible=new Set(),committedFlash=false;
 let recordTab='targets',recordTarget=null,detailFromRecords=false,recordDetail=null,windowAnchor=null,panelTrail=[],recordParentRect=null;
 const recordEntries=new Map(),scrollMemory=new Map();
 let lastContext=null,lastPhase=null;
 let collection=null,collectionNode=null,collectionState=null;
 let skillFilter='all',menuPage=0;
 let purchaseChoice=null,conversionIds=new Set(),viewToken=null;
 const selected={deck:null,skills:null},pageAnchors={deck:0,skills:0,offers:0,owned:0},events=new AbortController();
 const displayFrame=api.mountDisplayFrame(root);
 const frameWidth=api.displaySize.width;
 root.dataset.storageMode=storageMode;
 root.innerHTML='<div class="cj-shell"><header class="cj-header" data-header></header><div class="cj-status" data-status role="status" aria-live="polite"></div><div class="cj-layout"><main data-main></main><aside data-inspector hidden></aside></div><div data-bottom></div></div>';
 // Game coordinates remain fixed; the outer display owns fitting and scrolling.
 $('.cj-shell').style.height=api.displaySize.height+'px';
 const frameObserver=new ResizeObserver(()=>queueMicrotask(layoutWindows));
 frameObserver.observe(root);
 root.addEventListener('cw-display-change',()=>queueMicrotask(layoutWindows),{signal:events.signal});
 const d=()=>state.view?.display_data,h=()=>d()?.home,p=()=>state.draft,info=id=>d()?.details?.[id]||state.draftDetails?.[id]||(id==='$purchase'?d()?.details?.[p()?.candidate]:null)||{};
 const name=id=>info(id).name||'詳細未提供';
 const composition=plan=>{if(!plan)return null;const value=clone(plan);value.next_preparation.deck.sort();return value;};
 const dirty=()=>p()&&JSON.stringify(composition(p()))!==JSON.stringify(composition(api.currentPlan(state.view)));
 const busy=()=>running||!!state.pending||state.canRetry||state.stale;
 const canSuspend=()=>!suspended&&d()?.phase==='exploring';
 const learned=base=>p()?.retain_learning.includes(base)||p()?.next_preparation.learn.includes(base);
 const equipped=id=>p()?.next_preparation.equipment.includes(id);
 const count=(id,deck=p()?.next_preparation.deck||[])=>deck.filter(x=>x===id).length;
 const group=ids=>[...new Set(ids)].map(id=>({id,count:count(id,ids)}));
 const itemIcon=id=>info(id).kind==='passive'?'sparkles':({attack:'swords',guard:'shield',heal:'heart-pulse'})[info(id).primary?.kind]||'layers';
 function reason(e){const specific=economyFailure(e);if(specific)return specific;return api.saveFailureText?.(e)||({download_unavailable:'この表示環境ではファイルを書き出せません。保存内容は保持しています',deck_size:'札を12枚にしてください',invalid_deck_size:'札を12枚にしてください',deck_base_cap_exceeded:'同じ札は2枚までです',equipment_capacity_exceeded:'心得の装備枠が足りません',insufficient_learning_funds:'着想が足りません',storage_write_failed:'確定できませんでした。変更案は残っています',stale_revision:'別の操作で変わりました。最新の内容を読み直してください',feature_not_connected:'この機能は未対応です',comparison_required:'変更の確認が必要です',connection_failed:'応答を確認できませんでした'})[e?.code]||'操作を完了できませんでした';}
 function currentScreen(){const v=d();if(suspended)return 'start';if(v.phase==='return')return 'return';if(v.scene?.paused||sceneRequested)return 'scene';if(v.phase==='exploring')return 'explore';return acquisitionPreview&&place==='collection'?'collection':place==='hub'?'hub':tab;}
 function mountCollection(){
  if(!collectionNode){
   collectionNode=document.createElement('div');collectionNode.id='cw-acquisition-review';collectionNode.dataset.embedded='true';
   collectionNode.innerHTML='<section class="cp-shell" aria-label="札と心得の編成"><div data-screen class="cp-screen"></div><div data-overlay class="cp-overlay" hidden></div></section><p class="cp-live" role="status" aria-live="polite" data-live></p>';
   $('[data-main]').append(collectionNode);
   const fixture=clone(acquisitionPreview);if(Number.isInteger(h()?.economy.unspent_units))fixture.initial.wallet=h().economy.unspent_units/100;
   collection=api.mountAcquisitionReview(collectionNode,fixture,{onBack(){collection.suspend();place='hub';resetWindows();render();},onChange(value){collectionState=value;root.dispatchEvent(new CustomEvent('cw-acquisition-state',{bubbles:true,detail:value}));}});
  }else if(!collectionNode.isConnected)$('[data-main]').append(collectionNode);
 }
 function mark(id){return '<span class="cj-mark" aria-hidden="true">'+icon(itemIcon(id))+'</span>';}
 function detailsButton(id,extra=''){return button(mark(id)+'<span>'+esc(name(id))+'</span>','detail','data-id="'+esc(id)+'" '+extra,'cj-object');}
 __JOURNEY_DESTINATIONS__
 __JOURNEY_PANELS__
 function resetWindows(){panel=null;windows=[];panelTrail=[];recordParentRect=null;recordTarget=null;recordDetail=null;detailFromRecords=false;windowAnchor=null;scrollMemory.clear();}
 function paneRect(b){const r=api.uiRect(b.closest('[data-inspect-key]'),$('.cj-shell'));return r?{left:r.x,top:r.y,width:r.w,height:r.h}:null;}
 function enterPanel(b,next){
  const pane=b.closest('[data-inspect-key]'),level=Number(pane?.dataset.level);
  if(!pane){panelTrail=[];recordParentRect=null;return;}
  if(Number.isInteger(level)&&level<panelTrail.length){const parent=panelTrail[level];panel=parent.panel;windows=clone(parent.windows);panelTrail=panelTrail.slice(0,level);}
  if(panel!==next)panelTrail.push({panel,windows:clone(windows),rect:paneRect(b)});
 }
 function windowBack(){if(panel==='details'&&!panelTrail.length&&windows.length>2){windows.pop();render();return;}const previous=panelTrail.pop();if(previous){panel=previous.panel;windows=previous.windows;}else{panel=null;windows=[];}recordDetail=null;recordTarget=null;recordParentRect=null;render();}
 function focusRecord(){queueMicrotask(()=>{if(!disposed)$('[data-j="record-back"]')?.focus({preventScroll:true});});}
 function rememberAnchor(button){windowAnchor={action:button.dataset.j,id:button.dataset.id,rect:api.uiRect(button,$('.cj-shell'))};}
 function layoutWindows(){
  if(disposed)return;const box=$('[data-inspector]');if(!box||box.hidden){api.layoutProse(root);return;}
  const r=api.uiSpace($('.cj-shell'));if(!r.width||!r.height)return;
  const source=[...root.querySelectorAll('[data-j]')].find(el=>el.dataset.j===windowAnchor?.action&&el.dataset.id===windowAnchor?.id&&!el.closest('[data-inspector]'));
  const anchor=source?api.uiRect(source,$('.cj-shell')):windowAnchor?.rect;
  const many=box.children.length>1;
  const rect=api.placeWindow({width:r.width,height:r.height,anchor,avoid:[{x:0,y:0,w:r.width,h:64},{x:0,y:r.height-64,w:r.width,h:64}],preferredWidth:520,preferredHeight:480,margin:16});
  const styles=q=>({left:q.left+'px',top:q.top+'px',width:q.width+'px',height:q.height+'px',right:'auto',bottom:'auto',maxHeight:'none'});
  if(many){
   Object.assign(box.style,styles({left:0,top:0,width:r.width,height:r.height}));
   const parent=recordParentRect||panelTrail.at(-1)?.rect||rect;
   const pair=api.placeWindowPair({width:r.width,height:r.height,parent,preferredWidth:520,preferredHeight:480,margin:16,gap:16});
   [...box.children].forEach((pane,i)=>Object.assign(pane.style,styles(pair[i])));
  }else Object.assign(box.style,styles(rect));
  api.layoutProse(root);
 }
 function render(){
  if(disposed||!d())return;
  const context=[d().phase,d().case?.attempts,d().scene?.paused?d().scene.id:'active',suspended,sceneRequested].join('|');
  const changed=lastContext!==null&&lastContext!==context;
  if(changed){resetWindows();if(d().phase==='home'&&lastPhase!=='home')place='hub';}
  lastContext=context;lastPhase=d().phase;
  if(viewToken&&viewToken!==state.view.meta.view_token){purchaseChoice=null;conversionIds.clear();selected.deck=selected.skills=null;windows=windows.filter(w=>w.id.startsWith('base:'));panelTrail=[];if(['purchase','conversion'].includes(panel)||panel==='details'&&!windows.length)panel=null;}
  viewToken=state.view.meta.view_token;
  const screen=currentScreen(),beforeFocus=root.contains(document.activeElement)?document.activeElement?.dataset.focus:null;
  const scrollKey=el=>el.matches('[data-reading]')?'story-'+el.dataset.reading:'window-'+el.closest('[data-inspect-key]')?.dataset.inspectKey;
  const scrollNodes='[data-reading],.cj-inspect-scroll';
  if(!changed)for(const el of root.querySelectorAll(scrollNodes))scrollMemory.set(scrollKey(el),el.scrollTop);
  $('[data-header]').innerHTML=headerView(screen);
  $('[data-header]').hidden=['explore','collection'].includes(screen);
  if(screen!==lastScreen){child?.dispose();child=null;collection?.suspend();$('[data-main]').replaceChildren();if(screen==='explore')child=api.mountExploration($('[data-main]'),{session,display_data:d(),onScene:()=>{sceneRequested=true;render();},onWithdraw:()=>perform('withdraw'),onCommon:(kind,source,key)=>{rememberAnchor(source);panelTrail=[];panel=key?kind:panel===kind?null:kind;recordTab='targets';recordTarget=key||null;recordDetail=null;render();}});lastScreen=screen;}
  if(screen==='explore')child?.update(d(),state);
  else if(screen==='collection')mountCollection();
  else $('[data-main]').innerHTML=screen==='return'?returnView():screen==='hub'?hubView():screen==='scene'?sceneView():screen==='start'?startView():composeView();
  root.dataset.screen=screen;
  $('[data-bottom]').innerHTML=footerView(screen);
  const status=state.error?reason(state.error):state.pending?.kind==='write'?'反映中…':state.pending&&screen!=='explore'?'確認中…':message;
  $('[data-status]').innerHTML=(status?'<span>'+esc(status)+'</span>':'')+(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'')+(status&&!state.pending?button(icon('x'),'dismiss-status','aria-label="通知を閉じる"'):'');
  $('[data-status]').hidden=!status;
  renderPanel();
  for(const el of root.querySelectorAll(scrollNodes)){const y=scrollMemory.get(scrollKey(el));if(y!=null)el.scrollTop=y;}
  if(beforeFocus){const target=[...root.querySelectorAll('[data-focus]')].find(x=>x.dataset.focus===beforeFocus);target?.focus({preventScroll:true});}
  root.setAttribute('aria-busy',String(!!state.pending||running));
  for(const b of root.querySelectorAll('[data-j-mutation]'))b.disabled=b.disabled||busy();
  if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:18,height:18}});
  queueMicrotask(layoutWindows);
  observeTexts();
 }
 function observeTexts(){
  observer?.disconnect();observer=null;
  const key=d().scene?.id+'|'+d().case?.attempts;
  if(key!==sceneKey){sceneKey=key;seen=new Set();visible=new Set();}
  if(typeof IntersectionObserver==='undefined')return;
  observer=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting&&en.intersectionRatio>0&&!document.hidden)visible.add(en.target.dataset.jText);flushTexts();},{threshold:0.01});
  root.querySelectorAll('[data-j-text]').forEach(el=>observer.observe(el));
 }
 async function flushTexts(){
  if(recording||state.pending||state.canRetry||state.stale||running||disposed)return;
  const ids=[...visible].filter(id=>!seen.has(id));if(!ids.length||!session.can('record_displayed_text'))return;
  const key=sceneKey;recording=true;const result=await session.recordDisplayed(d().scene.id,ids);recording=false;
  if(result.ok&&key===sceneKey){ids.forEach(id=>seen.add(id));render();}
 }
 async function finishScene(){
  if(!d().scene?.paused)return true;
  const ids=[...visible];
  if(!ids.length){message='本文が表示されてから進めます';return false;}
  const recorded=await session.recordDisplayed(d().scene.id,ids);if(!recorded.ok)return false;
  const result=await session.execute('continue_scene',{scene_id:d().scene.id,advance:true,displayed_text_ids:[]});return result.ok;
 }
 async function toHome(){if(d().phase!=='return')return true;if(!await finishScene())return false;return (await session.ackReturn()).ok;}
 async function sequence(fn){if(busy())return;running=true;message='';render();try{await fn();}catch(e){message=reason(e);}finally{running=false;render();flushTexts();}}
 async function compareRestoredDraft(){if(!disposed&&d()?.phase==='home'&&dirty()&&!state.comparison&&!state.canRetry&&!state.stale)await session.compare();}
 async function exportData(){await sequence(async()=>{
  const document=await session.exportSave();api.downloadSave(document);message='保存を書き出しました';
 });}
 async function suspend(){if(!canSuspend())return;await sequence(async()=>{
  suspended=true;resetWindows();message='';
 });}
 async function navigate(destination){await sequence(async()=>{if(!await toHome())return;if(d().phase!=='home')return;if(destination==='hub')place='hub';else{place='compose';tab=destination;}panel=null;windows=[];message='';});}
 async function edit(fn){if(busy())return;const next=clone(p());fn(next);message='';committedFlash=false;if(session.setDraft(next))await session.compare();}
 async function perform(type,payload={}){await sequence(async()=>{const result=await session.execute(type,payload);if(result.ok){panel=null;windows=[];sceneRequested=false;}});}
 async function depart(){if(!destinationCanDepart())return;await sequence(async()=>{if(!await toHome())return;
   if(dirty()){const comparison=await session.compare();if(!comparison.ok){place='compose';return;}const result=await session.execute('commit_preparation',{plan:p()});if(!result.ok){continuation='depart';return;}message='編成を確定しました';}
   const result=await session.execute('depart',{case_id:d().case.id});if(result.ok){panel=null;windows=[];continuation=null;sceneRequested=false;}else continuation='depart';
  });}
 async function commit(){await sequence(async()=>{const result=await session.compare();if(!result.ok)return;const saved=await session.execute('commit_preparation',{plan:p()});if(saved.ok){panel=null;windows=[];committedFlash=true;message='編成を確定';}});}
 root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-j]');if(!b){if(panel&&!event.target.closest('[data-inspector]')){panel=null;windows=[];render();}return;}if(!root.contains(b)||b.disabled)return;
  const action=b.dataset.j,id=b.dataset.id,base=info(id).base_id;
  if(acquisitionPreview&&['collection','deck','skills','offers','owned','review'].includes(action)){
   if(d().phase==='return')await navigate('hub');if(d().phase!=='home')return;
   place='collection';resetWindows();render();if(action==='skills')collection.setTab('passive');return;
  }
  if(action.startsWith('explore-')){const kind=action.slice(8);resetWindows();render();child?.openPanel(kind);return;}
  if(action==='select-destination'){if(busy()||d().phase!=='home'||!destinationOptions.some(x=>x.id===id))return;selectedDestinationId=id;resetWindows();message='';render();return;}
  if(['detail','menu','records','help','review','data','settings','receipt','destination','unavailable','notice','texts'].includes(action)&&!b.closest('[data-inspector]'))rememberAnchor(b);
  if(action==='menu-page'){menuPage=Math.max(0,menuPage+Number(b.dataset.step));render();return;}
  if(action==='page'){const items=catalogueItems(),layout=api.journeyLayout(frameWidth,items.length,pageAnchors[tab],0);pageAnchors[tab]=Math.max(0,Math.min(layout.pages-1,layout.page+Number(b.dataset.step)))*layout.capacity;panel=null;windows=windows.filter(w=>w.pinned);if(windows.length)panel='details';render();return;}
  if(action==='dismiss-status'){message='';if(state.error||state.canRetry||state.stale){panel='notice';renderPanel();layoutWindows();}$('[data-status]').hidden=true;return;}
  if(['deck','skills','offers','owned','hub'].includes(action)){if(d().phase==='return')await navigate(action);else if(d().phase==='home'){place=action==='hub'?'hub':'compose';if(action!=='hub')tab=action;panel=null;windows=windows.filter(w=>w.pinned);render();}return;}
  if(action==='detail'){enterPanel(b,'details');detailFromRecords=false;selected[info(id).kind==='passive'?'skills':'deck']=id;const same=windows.find(w=>w.id===id);if(same&&!same.pinned)windows=windows.filter(w=>w!==same);else if(!same){windows=windows.filter(w=>w.pinned);windows.push({id,pinned:false});}panel=windows.length?'details':null;render();return;}
  if(action==='window-back'){const level=Number(b.closest('[data-level]')?.dataset.level);if(Number.isInteger(level)&&level<panelTrail.length)panelTrail=panelTrail.slice(0,level);windowBack();return;}
  if(action==='close'){const level=Number(b.closest('[data-level]')?.dataset.level);if(Number.isInteger(level)&&level<panelTrail.length)panelTrail=panelTrail.slice(0,level);windowBack();return;}
  if(action==='pin'){const w=windows.find(w=>w.id===id);if(w)w.pinned=!w.pinned;render();return;}
  if(action==='close-item'){windows=windows.filter(w=>w.id!==id);if(!windows.length){windowBack();return;}render();return;}
  if(['menu','records','help','review','data','settings','receipt','destination','unavailable','notice','texts'].includes(action)){enterPanel(b,action);panel=panel===action?null:action;windows=[];recordDetail=null;recordTarget=null;render();return;}
  if(action==='record-tab'){recordTab=b.dataset.tab;recordTarget=null;recordDetail=null;render();return;}
  if(action==='record-target'){recordParentRect=paneRect(b);recordTarget=recordTarget===id?null:id;recordDetail=null;scrollMemory.delete('window-target:'+id);render();focusRecord();return;}
  if(action==='record-detail'){const entry=recordEntries.get(id);if(entry){recordParentRect=paneRect(b);recordDetail=recordDetail?.key===id?null:{...entry,key:id};scrollMemory.delete('window-record:'+id);render();focusRecord();}return;}
  if(action==='record-back'){const key=recordDetail?.key,targetId=recordTarget;if(b.closest('[data-inspect-key]')?.dataset.inspectKey.startsWith('target:')){recordDetail=null;recordTarget=null;}else if(recordDetail)recordDetail=null;else recordTarget=null;render();queueMicrotask(()=>{const action=recordTarget?'record-detail':recordTab==='cards'?'record-detail':'record-target';[...root.querySelectorAll('[data-j="'+action+'"]')].find(el=>el.dataset.id===(action==='record-target'?targetId:key))?.focus({preventScroll:true});});return;}
  if(action==='records-back'){panel='records';windows=[];render();return;}
  if(await economyAction(action,id,b))return;
    if(action==='add'||action==='remove'){await edit(next=>{const a=next.next_preparation.deck;if(action==='add')a.push(id);else{const at=a.indexOf(id);if(at>=0)a.splice(at,1);}});return;}
  if(action==='equip'||action==='learn'){await edit(next=>{if(!learned(base)){next.next_preparation.learn.push(base);}if(action==='equip'){const a=next.next_preparation.equipment;next.next_preparation.equipment=a.includes(id)?a.filter(x=>x!==id):[...a,id];}});return;}
  if(action==='forget'){await edit(next=>{if(next.next_preparation.learn.includes(base))next.next_preparation.learn=next.next_preparation.learn.filter(x=>x!==base);else{next.retain_learning=next.retain_learning.filter(x=>x!==base);next.cancel_learning.push(base);}next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>info(x).base_id!==base);});return;}
  if(action==='restore-skill'){await edit(next=>{next.cancel_learning=next.cancel_learning.filter(x=>x!==base);next.retain_learning.push(base);});return;}
  if(action==='commit'){await commit();return;}if(action==='depart'){await depart();return;}
  if(action==='continue'){await sequence(async()=>{if(await finishScene()){sceneRequested=false;panel=null;windows=[];}});return;}
  if(action==='scene-back'){sceneRequested=false;render();return;}
  if(action==='retry'){if(state.pending)return;running=true;render();const result=await session.retry();running=false;const next=continuation;if(result.ok)continuation=null;if(result.ok&&next==='depart')await depart();else render();return;}
  if(action==='refresh'){windows=[];panel=null;purchaseChoice=null;conversionIds.clear();const fresh=await session.refresh({preserveLocal:false});if(fresh.ok)message='最新の状態を読み込みました。対象を選び直してください';render();return;}
  if(action==='discard'){await perform('discard_draft');return;}
  if(action==='suspend'){await suspend();return;}
  if(action==='resume'){if(!suspended||d()?.phase!=='exploring')return;await sequence(async()=>{const result=await session.refresh({preserveLocal:false});if(result.ok){suspended=false;panel=null;}});return;}
  if(action==='export'){await exportData();return;}
 },{signal:events.signal});
 root.addEventListener('change',event=>{if(event.target.matches('[data-compose-tab]')){const [dest,filter]=event.target.value.split(':');if(dest==='skills'){skillFilter=filter||'all';pageAnchors.skills=0;}root.querySelector('[data-j="'+dest+'"]')?.click();return;}if(event.target.matches('[data-skill-filter]')){skillFilter=event.target.value;pageAnchors.skills=0;render();return;}if(event.target.matches('[data-motion]'))root.dataset.motion=event.target.checked?'reduced':'normal';},{signal:events.signal});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel){panel=null;windows=[];render();}},{signal:events.signal});
 const off=session.subscribe(s=>{state=s;if(state.view)render();});
 document.fonts?.ready.then(()=>{if(!disposed)layoutWindows();});
 const ready=(state.view?Promise.resolve({ok:true}):session.refresh({preserveLocal:false})).then(async result=>{if(result.ok)await compareRestoredDraft();return result;});
 return {session,ready,get collection(){return collection;},state:()=>({tab,skillFilter,place,panel,panelTrail:clone(panelTrail),pageAnchors:clone(pageAnchors),recordTab,recordTarget,recordDetail:clone(recordDetail),windows:clone(windows),screen:currentScreen(),seen:[...seen],visible:[...visible]}),dispose(){disposed=true;observer?.disconnect();frameObserver.disconnect();off();events.abort();child?.dispose();collection?.dispose();session.dispose();displayFrame.dispose();}};
};
})(globalThis.CrossweaveUI);
