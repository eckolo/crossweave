import {newRun,verifyInputs,prepareSingle,verifyReload,peerChannel,startPeer,runTwoTabs,pageID} from '../../../../test/runtime/d04a-browser.mjs';
const $=id=>document.getElementById(id),key='crossweave-CW-M1-D04A-harness';
let state=null,bundle=null,peer=null,busy=false;
const display=x=>{$('result').textContent=JSON.stringify(x,null,2);};
function paint(){
  $('status').textContent=state?.status||'実行準備完了（未実施）';
  $('start').disabled=busy||!!state||!bundle;
  $('reload').disabled=busy||!state||state.status==='failed';
  $('verify').disabled=busy||!state||state.first_page_id===pageID||state.last_reload_page_id===pageID||state.status==='failed';
  $('two').disabled=busy||!state?.reload_verified||state.two_tabs_verified||state.status==='failed';
  $('download').disabled=!state;
  if(state){
    const url=new URL(location.href);url.searchParams.set('peer',state.run);
    $('peer').href=url.href;$('peer').hidden=!state.reload_verified;display(state);
  }
}
async function act(fn){
  busy=true;paint();
  try{await fn();}catch(e){
    if(state){state.status='failed';state.failure={code:e.code||e.message,page_id:pageID,at:new Date().toISOString()};}
    else {$('status').textContent='開始できません';display({error:e.code||e.message});}
  }finally{busy=false;if(state)sessionStorage.setItem(key,JSON.stringify(state));paint();}
}
try{
  const response=await fetch('./generated/inputs.json',{cache:'no-store'});
  if(!response.ok)throw Error('先に node test/runtime/d04a-prepare.mjs を実行してください');
  bundle=await response.json();await verifyInputs(bundle);
  const run=new URL(location.href).searchParams.get('peer');
  if(run){
    $('controls').hidden=true;$('environment').disabled=true;
    $('status').textContent='独立した2ページ目：主タブからの確認を待機';
    peer=startPeer(run,display);
  }else{
    state=JSON.parse(sessionStorage.getItem(key)||'null');
    if(state&&state.origin!==location.origin)throw Error('origin changed; do not reuse this result');
    if(state)peer=peerChannel(state.run);
    paint();
    $('start').onclick=()=>act(async()=>{state=newRun(bundle.manifest,$('environment').value);peer=peerChannel(state.run);await prepareSingle(state,bundle.inputs);});
    $('reload').onclick=()=>location.reload();
    $('verify').onclick=()=>act(()=>verifyReload(state));
    $('two').onclick=()=>act(()=>runTwoTabs(state,bundle.inputs,peer));
    $('download').onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)+'\n'],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='co-d04a-'+state.run+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
}catch(e){$('status').textContent='入力または実行条件の確認で停止';display({error:e.code||e.message,actual_indexeddb_checks:0});}
