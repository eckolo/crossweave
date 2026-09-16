/* UI-PLAN-001 journey prototype. All game state and prices come from CW-M1-view-1. */
(function(api){'use strict';
api.mountJourney=function(root,{controller,Campaign,slot_id,title}){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=x=>x==null?x:JSON.parse(JSON.stringify(x)),pt=n=>Number.isInteger(n)?String(n/100):'—';
 const session=api.makeSession(controller,{reopen:()=>Campaign.open({slot_id})});
 const $=s=>root.querySelector(s),list=x=>Array.isArray(x)?x:Object.values(x||{});
 const icon=n=>'<i data-lucide="'+n+'" aria-hidden="true"></i>';
 const button=(label,action,extra='',kind='')=>'<button type="button" data-j="'+action+'" '+extra+' class="cj-button '+kind+'">'+label+'</button>';
 let state=session.state(),tab='deck',place='compose',panel=null,windows=[],child=null,lastScreen=null;
 let message='',continuation=null,running=false,suspended=false,disposed=false,sceneRequested=false;
 let observer=null,recording=false,sceneKey='',seen=new Set(),visible=new Set(),expanded=new Set(),committedFlash=false;
 let recordTab='targets',recordTarget=null,detailFromRecords=false,recordDetail=null,windowAnchor=null;
 const recordEntries=new Map();
 const selected={deck:null,skills:null},positions={deck:0,skills:0},events=new AbortController();
 root.innerHTML='<div class="cj-shell"><header class="cj-header" data-header></header><div class="cj-status" data-status role="status" aria-live="polite"></div><div class="cj-layout"><main data-main></main><aside data-inspector hidden></aside></div><div data-bottom></div></div>';
 // The frame follows only its parent's width, never the amount of open content.
 const sizeFrame=width=>{if(width>0)$('.cj-shell').style.height=(width*9/16)+'px';queueMicrotask(layoutWindows);};
 const frameObserver=new ResizeObserver(entries=>sizeFrame(entries[0]?.contentRect?.width||root.getBoundingClientRect().width));
 frameObserver.observe(root);sizeFrame(root.getBoundingClientRect().width);
 const d=()=>state.view?.display_data,h=()=>d()?.home,p=()=>state.draft,info=id=>d()?.details?.[id]||{};
 const name=id=>info(id).name||'詳細未提供';
 const dirty=()=>p()&&JSON.stringify(p())!==JSON.stringify(api.currentPlan(state.view));
 const busy=()=>running||!!state.pending||state.canRetry||state.stale;
 const learned=base=>p()?.retain_learning.includes(base)||p()?.next_preparation.learn.includes(base);
 const equipped=id=>p()?.next_preparation.equipment.includes(id);
 const count=(id,deck=p()?.next_preparation.deck||[])=>deck.filter(x=>x===id).length;
 const group=ids=>[...new Set(ids)].map(id=>({id,count:count(id,ids)}));
 const itemIcon=id=>info(id).kind==='passive'?'sparkles':({attack:'swords',guard:'shield',heal:'heart-pulse'})[info(id).primary?.kind]||'layers';
 function reason(e){return ({deck_size:'札を12枚にしてください',invalid_deck_size:'札を12枚にしてください',deck_base_cap_exceeded:'同じ札は2枚までです',equipment_capacity_exceeded:'心得の装備枠が足りません',insufficient_learning_funds:'着想が足りません',storage_write_failed:'確定できませんでした。変更案は残っています',stale_revision:'別の操作で変わりました。最新の内容を読み直してください',feature_not_connected:'この機能は未対応です',comparison_required:'変更の確認が必要です',connection_failed:'応答を確認できませんでした'})[e?.code]||'操作を完了できませんでした';}
 function currentScreen(){const v=d();if(suspended)return 'start';if(v.phase==='return')return 'return';if(v.scene?.paused||sceneRequested)return 'scene';if(v.phase==='exploring')return 'explore';return place==='hub'?'hub':tab;}
 function mark(id){return '<span class="cj-mark" aria-hidden="true">'+icon(itemIcon(id))+'</span>';}
 function detailsButton(id,extra=''){return button(mark(id)+'<span>'+esc(name(id))+'</span>','detail','data-id="'+esc(id)+'" '+extra,'cj-object');}
 __JOURNEY_PANELS__
 function rememberAnchor(button){const r=button.getBoundingClientRect();windowAnchor={action:button.dataset.j,id:button.dataset.id,rect:{left:r.left,top:r.top,width:r.width,height:r.height}};}
 function layoutWindows(){
  if(disposed)return;const box=$('[data-inspector]');if(!box||box.hidden)return;
  const r=$('.cj-shell').getBoundingClientRect();if(!r.width||!r.height)return;
  const source=[...root.querySelectorAll('[data-j]')].find(el=>el.dataset.j===windowAnchor?.action&&el.dataset.id===windowAnchor?.id&&!el.closest('[data-inspector]'));
  const a=source?.getBoundingClientRect()||windowAnchor?.rect,anchor=a?{x:a.left-r.left,y:a.top-r.top,w:a.width,h:a.height}:null;
  const many=Number(box.dataset.count)>1;
  const rect=api.placeWindow({width:r.width,height:r.height,anchor,preferredWidth:many?820:340,preferredHeight:Math.min(many?480:350,r.height-16)});
  Object.assign(box.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',right:'auto',bottom:'auto',maxHeight:'none'});
 }
 function render(){
  if(disposed||!d())return;
  const screen=currentScreen(),isEdit=['deck','skills'].includes(screen),beforeFocus=root.contains(document.activeElement)?document.activeElement?.dataset.focus:null;
  const scrollKey=(el,current)=>el.matches('[data-main]')?'main-'+current:el.matches('[data-result-scroll]')?'result':el.matches('[data-inspector]')?'inspector':'window-'+el.closest('[data-inspect-key]')?.dataset.inspectKey;
  const scrollNodes='[data-main],[data-result-scroll],[data-inspector],.cj-inspect-scroll';
  const scrolls=new Map([...root.querySelectorAll(scrollNodes)].map(el=>[scrollKey(el,lastScreen),el.scrollTop]));
  const priorScroll=$('[data-catalogue]')?.scrollTop;if(priorScroll!=null&&['deck','skills'].includes(lastScreen))positions[lastScreen]=priorScroll;
  $('[data-header]').innerHTML='<div class="cj-brand">crossweave <span>操作試作</span></div><nav aria-label="共通">'+(d().phase==='home'&&!suspended?button('探索先','hub','','cj-quiet'):'')+button(icon('book-open')+'<span>調査記録</span>','records','aria-label="調査記録"','cj-quiet')+button(icon('menu')+'<span>メニュー</span>','menu','aria-label="メニュー"','cj-quiet')+'</nav>';
  $('[data-header]').hidden=screen==='explore';
  if(screen!==lastScreen){child?.dispose();child=null;$('[data-main]').replaceChildren();if(screen==='explore')child=api.mountExploration($('[data-main]'),{session,display_data:d(),onScene:()=>{sceneRequested=true;render();},onWithdraw:()=>perform('withdraw'),onCommon:(kind,source)=>{rememberAnchor(source);panel=panel===kind?null:kind;recordDetail=null;render();}});lastScreen=screen;}
  if(screen==='explore')child?.update(d(),state);
  else $('[data-main]').innerHTML=screen==='return'?returnView():screen==='hub'?hubView():screen==='scene'?sceneView():screen==='start'?startView():composeView();
  root.dataset.screen=screen;
  $('[data-bottom]').innerHTML=isEdit?'<div class="cj-footer"><span>'+esc(title)+'</span>'+button('探索先を変える','hub','','cj-quiet')+'</div>':'';
  const status=state.error?reason(state.error):state.pending?.kind==='write'?'反映中…':state.pending?'確認中…':message;
  $('[data-status]').innerHTML=(status?'<span>'+esc(status)+'</span>':'')+(state.canRetry?button('もう一度','retry'):'')+(state.stale?button('最新を読む','refresh'):'');
  $('[data-status]').hidden=screen==='explore'&&!state.error&&!state.canRetry&&!state.stale;
  renderPanel();
  for(const el of root.querySelectorAll(scrollNodes)){const y=scrolls.get(scrollKey(el,screen));if(y!=null)el.scrollTop=y;}
  if($('[data-catalogue]'))$('[data-catalogue]').scrollTop=positions[tab];
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
  if(key!==sceneKey){sceneKey=key;seen=new Set();visible=new Set();expanded=new Set();}
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
  const result=await session.execute('continue_scene',{scene_id:d().scene.id,advance:true});return result.ok;
 }
 async function toHome(){if(d().phase!=='return')return true;if(!await finishScene())return false;return (await session.ackReturn()).ok;}
 async function sequence(fn){if(busy())return;running=true;message='';render();try{await fn();}finally{running=false;render();flushTexts();}}
 async function navigate(destination){await sequence(async()=>{if(!await toHome())return;if(d().phase!=='home')return;if(destination==='hub')place='hub';else{place='compose';tab=destination;}panel=null;windows=[];message='';});}
 async function edit(fn){if(busy())return;const next=clone(p());fn(next);message='';committedFlash=false;if(session.setDraft(next))await session.compare();}
 async function perform(type,payload={}){await sequence(async()=>{const result=await session.execute(type,payload);if(result.ok){panel=null;windows=[];sceneRequested=false;}});}
 async function depart(){await sequence(async()=>{if(!await toHome())return;
   if(dirty()){const comparison=await session.compare();if(!comparison.ok){place='compose';return;}const result=await session.execute('commit_preparation',{plan:p()});if(!result.ok){continuation='depart';return;}message='編成を確定しました';}
   const result=await session.execute('depart',{case_id:d().case.id});if(result.ok){panel=null;windows=[];continuation=null;sceneRequested=false;}else continuation='depart';
  });}
 async function commit(){await sequence(async()=>{const result=await session.compare();if(!result.ok)return;const saved=await session.execute('commit_preparation',{plan:p()});if(saved.ok){panel=null;windows=[];committedFlash=true;message='編成を確定';}});}
 root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-j]');if(!b){if(panel&&!event.target.closest('[data-inspector]')){panel=null;windows=[];render();}return;}if(!root.contains(b)||b.disabled)return;
  const action=b.dataset.j,id=b.dataset.id,base=info(id).base_id;
  if(['detail','menu','records','help','review','data','settings'].includes(action)&&!b.closest('[data-inspector]'))rememberAnchor(b);
  if(action==='deck'||action==='skills'||action==='hub'){if(d().phase==='return')await navigate(action);else if(d().phase==='home'){place=action==='hub'?'hub':'compose';if(action!=='hub')tab=action;panel=null;windows=windows.filter(w=>w.pinned);render();}return;}
  if(action==='detail'){detailFromRecords=panel==='records'||(panel==='details'&&detailFromRecords);selected[info(id).kind==='passive'?'skills':'deck']=id;const same=windows.find(w=>w.id===id);if(same&&!same.pinned)windows=windows.filter(w=>w!==same);else if(!same){windows=windows.filter(w=>w.pinned);windows.push({id,pinned:false});}panel=windows.length?'details':null;render();return;}
  if(action==='close'){panel=null;windows=[];recordDetail=null;render();return;}
  if(action==='pin'){const w=windows.find(w=>w.id===id);if(w)w.pinned=!w.pinned;render();return;}
  if(action==='close-item'){windows=windows.filter(w=>w.id!==id);if(!windows.length)panel=null;render();return;}
  if(['menu','records','help','review','data','settings'].includes(action)){panel=panel===action?null:action;recordDetail=null;render();return;}
  if(action==='record-tab'){recordTab=b.dataset.tab;recordTarget=null;recordDetail=null;render();return;}
  if(action==='record-target'){recordTarget=recordTarget===id?null:id;recordDetail=null;render();return;}
  if(action==='record-detail'){const entry=recordEntries.get(id);if(entry){recordDetail=recordDetail?.key===id?null:{...entry,key:id};render();}return;}
  if(action==='close-record-detail'){recordDetail=null;render();return;}
  if(action==='records-back'){panel='records';windows=[];render();return;}
  if(action==='add'||action==='remove'){await edit(next=>{const a=next.next_preparation.deck;if(action==='add')a.push(id);else{const at=a.indexOf(id);if(at>=0)a.splice(at,1);}});return;}
  if(action==='equip'||action==='learn'){await edit(next=>{if(!learned(base)){next.next_preparation.learn.push(base);}if(action==='equip'){const a=next.next_preparation.equipment;next.next_preparation.equipment=a.includes(id)?a.filter(x=>x!==id):[...a,id];}});return;}
  if(action==='forget'){await edit(next=>{if(next.next_preparation.learn.includes(base))next.next_preparation.learn=next.next_preparation.learn.filter(x=>x!==base);else{next.retain_learning=next.retain_learning.filter(x=>x!==base);next.cancel_learning.push(base);}next.next_preparation.equipment=next.next_preparation.equipment.filter(x=>info(x).base_id!==base);});return;}
  if(action==='restore-skill'){await edit(next=>{next.cancel_learning=next.cancel_learning.filter(x=>x!==base);next.retain_learning.push(base);});return;}
  if(action==='commit'){await commit();return;}if(action==='depart'){await depart();return;}
  if(action==='continue'){await sequence(async()=>{if(await finishScene()){sceneRequested=false;panel=null;windows=[];}});return;}
  if(action==='scene-back'){sceneRequested=false;render();return;}
  if(action==='optional'){expanded.has(id)?expanded.delete(id):expanded.add(id);render();return;}
  if(action==='retry'){running=true;render();const result=await session.retry();running=false;if(result.ok&&continuation==='depart'){continuation=null;await depart();}else render();return;}
  if(action==='refresh'){windows=[];panel=null;await session.refresh();return;}
  if(action==='discard'){await perform('discard_draft');return;}
  if(action==='suspend'){await sequence(async()=>{if(dirty()){const saved=await session.execute('save_draft',{plan:p()});if(!saved.ok)return;}suspended=true;panel=null;windows=[];message='';});return;}
  if(action==='resume'){await sequence(async()=>{const result=await session.refresh({preserveLocal:false});if(result.ok){suspended=false;panel=null;message='再開';}});return;}
  if(action==='export'){const document=await session.exportSave();const area=$('[data-export]');area.value=JSON.stringify(document,null,2);area.hidden=false;area.select();message='書き出しデータを作成';$('[data-status]').textContent=message;return;}
 },{signal:events.signal});
 root.addEventListener('change',event=>{if(event.target.matches('[data-motion]'))root.dataset.motion=event.target.checked?'reduced':'normal';},{signal:events.signal});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel){panel=null;windows=[];render();}},{signal:events.signal});
 const off=session.subscribe(s=>{state=s;if(state.view)render();});
 session.refresh({preserveLocal:false});
 return {session,state:()=>({tab,place,panel,recordTab,recordTarget,recordDetail:clone(recordDetail),windows:clone(windows),screen:currentScreen(),seen:[...seen],visible:[...visible]}),dispose(){disposed=true;observer?.disconnect();frameObserver.disconnect();off();events.abort();child?.dispose();session.dispose();}};
};
})(globalThis.CrossweaveUI);
