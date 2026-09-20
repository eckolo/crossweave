/* Public-view routing and Campaign lifecycle. No import of a guessed runtime path. */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const texts=d=>Array.isArray(d.texts)?d.texts:Object.values(d.texts||{});
 const reason=e=>({save_not_found:'保存がありません。新しく始める場合は「はじめから」を選んでください',save_already_exists:'保存があります。「続きから」を選んでください',slot_not_empty:'保存があります。上書きはしません',unsupported_save_schema:'対応していない保存形式です。元ファイルは変更していません',invalid_save_json:'保存JSONを読めません。入力は保持しています',storage_write_failed:'保存できませんでした。元の状態と入力を保持しています',storage_unavailable:'保存先を利用できません',indexeddb_unavailable:'この表示環境では永続保存を利用できません',storage_open_failed:'保存先を開けませんでした',storage_open_blocked:'保存先が別の画面で使用されています',storage_read_failed:'保存内容を読み出せませんでした',feature_not_connected:'この操作は現在の接続版では未対応です',controller_result_not_connected:'本体の戻り値との接続が必要です',connection_failed:'応答を確認できませんでした',unsaved_draft:'先に下書きを保存してください',busy:'処理が終わるまでお待ちください'})[e?.code]||'保存内容を確認できません。元のデータは変更していません';
 const makeId=x=>typeof x==='string'?x:x?.id;
 api.mountApplication=function(root,{Campaign=null,config=null,controller=null,explorationRenderer=null}={}){
  let session=null,child=null,unsubscribe=null,kind=null,dead=false,changing=false,menu=false,sceneRequested=false;
  let sceneKey=null,openText=null,seen=new Set(),toRecord=new Set(),recording=false,observer=null,selected=null;
  let rawImport='',startupError='',lastSceneToken=null;
  const events=new AbortController(),launcher=Campaign&&config?api.makeLauncher(Campaign,config):null;
  root.classList.add('cw-app');root.innerHTML='<div class="cw-appbar"><span>crossweave</span><div><button type="button" data-global="scene">本文</button><button type="button" data-global="menu">保存</button></div></div><div class="cw-app-message" role="status" aria-live="polite" data-message></div><section data-start></section><section data-save hidden></section><div data-stage></div>';
  const $=s=>root.querySelector(s),message=s=>{$('[data-message]').textContent=s;};
  function start(){
   $('[data-start]').hidden=!!session;
   $('[data-start]').innerHTML=`<div class="cw-start"><h1>crossweave</h1><p>${launcher?'継続データ':'本体APIの接続待ち'}</p><div class="cw-actions"><button type="button" data-global="open" ${!launcher?'disabled':''}>続きから</button><button type="button" data-global="create" ${!launcher?'disabled':''}>はじめから</button><button type="button" data-global="menu">保存を読み込む</button></div></div>`;
   saveMenu();
  }
  function saveMenu(){const box=$('[data-save]');box.hidden=!menu;if(!menu)return;
   if(!box.firstChild)box.innerHTML='<div class="cw-save"><h2>保存データ</h2><div class="cw-actions"><button type="button" data-global="export">書き出す</button><button type="button" data-global="menu">閉じる</button></div><label>読み込むJSONファイル<input type="file" accept=".json,application/json" data-import-file></label><label>保存JSON<textarea data-import-document rows="5" spellcheck="false"></textarea></label><button type="button" data-global="import">空の保存先へ読み込む</button><p data-import-error role="alert"></p></div>';
   $('[data-import-document]').value=rawImport;
   const importing=!!launcher?.state().pending||!!launcher?.state().canRetry||!!session;
   $('[data-import-document]').disabled=importing; $('[data-import-file]').disabled=importing;
   $('[data-global="export"]').disabled=!session||!!session.state().pending||session.state().canRetry;
   $('[data-global="import"]').disabled=!launcher||!!session||!!launcher?.state().pending;
  }
  function controls(s){
   const busy=changing||!!s?.pending;
   $('[data-global="scene"]').disabled=busy||!s?.view?.display_data?.scene;
   root.querySelectorAll('[data-scene-action],[data-play],[data-preview]').forEach(b=>{b.disabled=busy||s?.canRetry||s?.stale;});
   const d=s?.view?.display_data;
   if(d)root.querySelectorAll('[data-scene-action="continue"]').forEach(b=>b.disabled=b.disabled||!d.scene?.can_continue||!session.can('continue_scene')||!seen.size);
   if(d)root.querySelectorAll('[data-scene-action="withdraw"]').forEach(b=>b.disabled=b.disabled||!d.scene?.can_withdraw||!session.can('withdraw'));
   if(d)root.querySelectorAll('[data-play]').forEach(b=>b.disabled=b.disabled||!session.can('play'));
   if(menu)saveMenu();
  }
  async function connect(c){
   if(changing||dead)return;changing=true;message('読み込み中…');
   const next=api.makeSession(c,{reopen:Campaign&&config?()=>Campaign.open({slot_id:config.slot_id}):null}),r=await next.refresh({preserveLocal:false});
   changing=false;if(dead){next.dispose();return;}
   if(!r.ok){next.dispose();startupError=reason(r.error);message(startupError);return;}
   child?.dispose();child=null;unsubscribe?.();session?.dispose();session=next;kind=null;sceneRequested=false;
   $('[data-start]').hidden=true;message('');unsubscribe=session.subscribe(render);menu=false;saveMenu();
  }
  function stopChild(){child?.dispose();child=null;observer?.disconnect();observer=null;lastSceneToken=null;}
  function render(s){if(dead||!s.view)return;const d=s.view.display_data;
   const next=d.scene&&(d.scene.paused||sceneRequested)?'scene':d.phase==='exploring'?'exploration':'preparation';
   if(next!==kind){stopChild();kind=next;selected=null;$('[data-stage]').replaceChildren();
    if(next==='preparation')child=api.mountPreparation($('[data-stage]'),session);
    if(next==='exploration'&&(explorationRenderer||api.mountExploration))child=(explorationRenderer||api.mountExploration)($('[data-stage]'),{session,display_data:d,onScene:()=>{sceneRequested=true;render(session.state());},onWithdraw:async()=>{if(scopeConfirm())await session.execute('withdraw');}});
   }
   if(next==='scene')renderScene(s);
   if(next==='exploration'){if(child?.update)child.update(d,s);else if(!child)$('[data-stage]').textContent='探索画面の接続部品を読み込めませんでした';}
   controls(s);
   if(next!=='preparation'){
    message(s.error?reason(s.error):s.pending?.kind==='write'?'保存中…':s.pending?'読み込み中…':'');
    const errorBox=root.querySelector('[data-recovery]');errorBox?.remove();
    if(s.error){const node=document.createElement('div');node.dataset.recovery='';node.innerHTML=`${s.canRetry?'<button type="button" data-global="retry">再試行</button>':''}<button type="button" data-global="refresh">最新を読む</button>`;$('[data-message]').append(node);}
   }
   if(next==='scene'&&!s.pending&&!s.error)queueMicrotask(flushDisplayed);
  }
  function renderScene(s){const d=s.view.display_data,key=d.phase+'|'+d.scene.id+'|'+(d.case?.attempts??'');
   if(key!==sceneKey){sceneKey=key;openText=null;seen=new Set();toRecord=new Set();lastSceneToken=null;}
   if(lastSceneToken===s.view.meta.view_token&&$('[data-stage]').firstChild)return;
   lastSceneToken=s.view.meta.view_token;observer?.disconnect();
   const available=texts(d),ids=new Set([...(d.scene.text_ids||[]),...(d.scene.optional_text_ids||[])]),current=available.filter(t=>ids.has(t.id));
   const text=current.find(t=>t.id===openText);
   const labels=new Map();let mainNumber=0,detailNumber=0;
   for(const t of current)labels.set(t.id,t.title||(t.kind==='detail'?'詳しく '+(++detailNumber):'本文 '+(++mainNumber)));
   const body=text?[...new Set([text.short_text,text.detail_text].filter(Boolean))]:[];
   $('[data-stage]').innerHTML=`<div class="cw-scene"><h2>本文</h2><nav>${current.map(t=>`<button type="button" data-text-id="${esc(t.id)}" aria-pressed="${t.id===openText}">${esc(labels.get(t.id))}</button>`).join('')}</nav><div class="cw-scene-body">${text?`<article><h3>${esc(labels.get(text.id))}</h3>${body.map(p=>`<p data-displayed-text="${esc(text.id)}">${esc(p)}</p>`).join('')}</article>`:'<p>読む本文を選んでください</p>'}</div><div class="cw-actions"><button type="button" data-scene-action="back" ${d.scene.paused?'hidden':''}>戻る</button><button type="button" data-scene-action="continue" ${!d.scene.paused?'hidden':''}>進む</button><button type="button" data-scene-action="withdraw" ${!d.scene.can_withdraw?'hidden':''}>撤退</button></div></div>`;
   const article=root.querySelector('[data-displayed-text]');
   if(article&&(text.short_text||text.detail_text)){
    observer=new IntersectionObserver(entries=>{for(const en of entries){if(!document.hidden&&en.isIntersecting&&en.intersectionRatio>0){toRecord.add(en.target.dataset.displayedText);flushDisplayed();}}},{root:null,threshold:0.01});observer.observe(article);
   }
  }
  async function flushDisplayed(){
   if(recording||!session||kind!=='scene'||dead)return;const s=session.state(),d=s.view?.display_data;
   if(s.pending||s.error||s.localDirty||!(session.can('record_displayed_text')||session.can('continue_scene')))return;
   const ids=[...toRecord].filter(id=>!seen.has(id));if(!ids.length)return;
   const key=sceneKey,scene_id=d.scene.id;recording=true;
   const r=await session.recordDisplayed(scene_id,ids);recording=false;
   if(dead||key!==sceneKey)return;
   if(r.ok){ids.forEach(id=>{seen.add(id);toRecord.delete(id);});controls(session.state());queueMicrotask(flushDisplayed);}
  }
  root.addEventListener('click',async e=>{
   const text=e.target.closest('[data-text-id]');if(text){openText=text.dataset.textId;lastSceneToken=null;render(session.state());return;}
   const scene=e.target.closest('[data-scene-action]');if(scene&&!scene.disabled){const s=session.state(),d=s.view.display_data;
    if(scene.dataset.sceneAction==='back'){sceneRequested=false;if(!d.scene.paused){kind=null;render(s);}return;}
    if(scene.dataset.sceneAction==='continue'){sceneRequested=false;await session.execute('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[...seen]});}
    if(scene.dataset.sceneAction==='withdraw'&&scopeConfirm())await session.execute('withdraw');return;
   }
   const b=e.target.closest('[data-global]');if(!b||b.disabled)return;const a=b.dataset.global;
   try{
    if(a==='menu'){menu=!menu;saveMenu();return;}
    if(a==='scene'){if(!session?.state().view.display_data.scene)return;if(session.state().localDirty){message(reason({code:'unsaved_draft'}));return;}sceneRequested=true;render(session.state());return;}
    if(a==='retry'){await session?.retry();return;}if(a==='refresh'){await session?.refresh();return;}
    if(a==='close-detail'){selected=null;render(session.state());return;}
    if(a==='withdraw'){if(session.can('withdraw')&&scopeConfirm())await session.execute('withdraw');return;}
    if(a==='export'){const raw=await session.exportSave(),data=typeof raw==='string'?raw:JSON.stringify(raw,null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='crossweave-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('書き出しデータを作成しました');return;}
    if(!launcher)return;
    let r;if(a==='retry-start')r=await launcher.retry();if(a==='open')r=await launcher.open();if(a==='create')r=await launcher.create();if(a==='import'){rawImport=$('[data-import-document]').value;r=await launcher.importSave(rawImport);}
    if(r?.ok)await connect(r.controller);else if(r){message(reason(r.error));if(menu)$('[data-import-error]').textContent=reason(r.error);if(launcher.state().canRetry){const retry=document.createElement('button');retry.type='button';retry.dataset.global='retry-start';retry.textContent='同じ要求を再試行';$('[data-message]').append(retry);}}
   }catch(err){message(reason(err));}
  },{signal:events.signal});
  function scopeConfirm(){return globalThis.confirm('今回の探索から撤退しますか？');}
  root.addEventListener('input',e=>{if(e.target.matches('[data-import-document]'))rawImport=e.target.value;},{signal:events.signal});
  root.addEventListener('change',async e=>{if(e.target.matches('[data-import-file]')){const f=e.target.files?.[0];if(!f)return;try{rawImport=await f.text();if(!dead)saveMenu();}catch{message('ファイルを読めません。元ファイルは変更していません');}}},{signal:events.signal});
  const offLauncher=launcher?.subscribe(s=>{root.querySelectorAll('[data-global="open"],[data-global="create"],[data-global="import"]').forEach(b=>b.disabled=s.pending||s.canRetry||!!session||(s.active&&b.dataset.global!=='open'));});
  start();if(controller)connect(controller);
  return {get session(){return session;},dispose(){dead=true;stopChild();unsubscribe?.();session?.dispose();launcher?.dispose();offLauncher?.();events.abort();root.replaceChildren();}};
 };})(globalThis.CrossweaveUI);
