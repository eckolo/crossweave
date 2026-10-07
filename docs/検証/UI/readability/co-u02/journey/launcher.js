/* One Campaign lifecycle for the accepted UI. Storage is owned by the injected provider. */
(function(api){'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 api.saveFailureText=e=>({save_not_found:'保存がありません。「はじめから」で開始できます。',save_already_exists:'保存があります。「続きから」を選んでください。',slot_not_empty:'保存があります。既存の保存は変更していません。「続きから」を選んでください。',invalid_save_json:'保存ファイルを読めません。選んだファイルは保持しています。',unsupported_save_schema:'対応していない保存形式です。元のファイルは変更していません。',storage_write_failed:'保存できませんでした。変更案を残しています。',storage_unavailable:'保存先を利用できません。',indexeddb_unavailable:'この表示環境では保存先を利用できません。',storage_open_failed:'保存先を開けませんでした。',storage_open_blocked:'別の画面が保存先を使用しています。',storage_read_failed:'保存内容を読み出せませんでした。',connection_failed:'応答を確認できませんでした。',secure_request_id_unavailable:'この表示環境では開始できません。',invalid_response:'本体の応答を確認できませんでした。'})[e?.code]||null;
 api.downloadSave=function(document){
  if(typeof URL.createObjectURL!=='function')throw {code:'download_unavailable'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(document,null,2)],{type:'application/json'})),link=globalThis.document.createElement('a');
  link.href=url;link.download='crossweave-save.json';link.hidden=true;globalThis.document.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 };
 api.mountJourneyApplication=function(root,{Campaign,config,title='夜潮の排水路',storageMode='persistent'}={}){
  const launcher=api.makeLauncher(Campaign,config),events=new AbortController(),displayFrame=api.mountDisplayFrame(root);
  let child=null,connecting=false,reading=false,dead=false,importing=false,raw='',filename='',error='',message='';
  const busy=()=>connecting||reading||launcher.state().pending;
  const explain=e=>api.saveFailureText(e)||'開始できませんでした。保存と入力は保持しています。';
  const button=(label,action,disabled=false)=>'<button type="button" data-launch="'+action+'" class="cj-button cursor-interaction" '+(disabled?'disabled':'')+'>'+label+'</button>';
  const resize=()=>{if(child||dead)return;const shell=root.querySelector('.cj-shell');if(shell)shell.style.height=api.displaySize.height+'px';};
  const observer=new ResizeObserver(resize);observer.observe(root);
  function render(){if(dead||child)return;const s=launcher.state(),locked=busy()||s.canRetry;
   root.dataset.screen='start';root.dataset.storageMode=storageMode;
   const content=importing?'<label class="cj-import-file">保存ファイル<input type="file" accept=".json,application/json" data-launch-file '+(locked?'disabled':'')+'></label><p class="cj-import-name">'+escape(filename)+'</p>':'<h2>crossweave</h2>';
   const actions=importing?button('読み込む','import',locked||s.active||!raw):button('続きから','open',locked)+button('はじめから','create',locked||s.active)+button('読み込む','import-menu',locked||s.active);
   root.innerHTML='<div class="cj-shell cj-launch-shell"><header class="cj-header">'+(importing?button('戻る','back',locked):'')+'<span class="cj-screen-title">'+(importing?'保存を読み込む':'crossweave')+'</span></header><main class="cj-layout cj-launch-main">'+content+'<div class="cj-launch-notice" role="'+(error?'alert':'status')+'">'+escape(error||(busy()?'読み込み中…':message))+'</div></main><footer class="cj-fixed-footer">'+(s.canRetry?button('もう一度','retry',busy()):actions)+'</footer></div>';
   root.setAttribute('aria-busy',String(busy()));resize();
   root.querySelector('[data-launch="back"]')?.setAttribute('aria-label','開始画面に戻る');
  }
  async function connect(controller){
   if(dead||connecting)return;connecting=true;error='';render();
   const session=api.makeSession(controller,{reopen:()=>Campaign.open({slot_id:config.slot_id})});
   const result=await session.refresh({preserveLocal:false});connecting=false;
   if(dead){session.dispose();return;}
   if(!result.ok){session.dispose();error=explain(result.error);render();return;}
   observer.disconnect();root.replaceChildren();
   child=api.mountJourney(root,{controller,Campaign,slot_id:config.slot_id,title,session,storageMode});
  }
  root.addEventListener('click',async event=>{
   const b=event.target.closest('[data-launch]');if(!b||b.disabled||busy()||child)return;
   const action=b.dataset.launch;
   if(action==='import-menu'||action==='back'){importing=action==='import-menu';error='';render();return;}
   error='';message='';
   try{let result;
    if(action==='open')result=await launcher.open();
    if(action==='create')result=await launcher.create();
    if(action==='import')result=await launcher.importSave(raw);
    if(action==='retry')result=await launcher.retry();
    if(dead)return;if(result?.ok)await connect(result.controller);else if(result){error=explain(result.error);render();}
   }catch(e){if(!dead){error=explain(e);render();}}
  },{signal:events.signal});
  root.addEventListener('change',async event=>{
   if(!event.target.matches('[data-launch-file]')||busy()||child)return;
   const file=event.target.files?.[0];if(!file)return;reading=true;error='';render();
   try{const text=await file.text();if(!dead){raw=text;filename=file.name;}}
   catch{if(!dead)error='ファイルを読めませんでした。前の入力を保持しています。';}
   finally{reading=false;render();}
  },{signal:events.signal});
  const off=launcher.subscribe(render);render();
  return {get journey(){return child;},get session(){return child?.session||null;},state:()=>({launcher:launcher.state(),connecting,reading,filename,importing,storageMode}),dispose(){dead=true;off();observer.disconnect();events.abort();launcher.dispose();child?.dispose();root.replaceChildren();displayFrame.dispose();}};
 };
})(globalThis.CrossweaveUI);
