// Entry-only controls. The game uses the same launcher, session and acquisition component.
const cases=[
 ['start','本編：はじめから／続きから'],
 ['natural_first_home','確認用：帰還後（自然初回）'],
 ['initial','確認用：初期所持'],
 ['offers-home','確認用：取得前（既存保存）'],
 ['acquired','確認用：取得済み'],
 ['migrated_review','確認用：旧案の再確認']
];
const select=host.querySelector('[data-review-case]'),openButton=host.querySelector('[data-review-open]'),status=host.querySelector('[data-review-status]'),gameRoot=host.querySelector('#crossweave-journey');
for(const [id,label] of cases){const o=document.createElement('option');o.value=id;o.textContent=label;select.append(o);}
const naturalStore=new CWJourneyRuntime.MemoryStore();
let application=null,activeStore=null,activeCampaign=null,activeController=null,currentCase=null,opening=false;
async function openConnected(id){
 if(opening||!cases.some(x=>x[0]===id))return false;
 opening=true;select.disabled=openButton.disabled=true;status.textContent='読み込み中…';
 try{
  const storage=id==='start'?naturalStore:new CWJourneyRuntime.MemoryStore();
  const Campaign=CWJourneyRuntime.createCampaign({storage}),slot_id='ui-connected-'+id;
  let controller=null;
  if(id!=='start'){
   const raw=await new Response(new Blob([Uint8Array.from(atob(connectedSaves[id]),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
   controller=await Campaign.importSave({slot_id,document:JSON.parse(raw),request_id:crypto.randomUUID()});
  }
  application?.dispose();
  application=controller?CrossweaveUI.mountJourney(gameRoot,{controller,Campaign,slot_id,storageMode:'ephemeral',title:'夜潮の排水路'}):CrossweaveUI.mountJourneyApplication(gameRoot,{Campaign,config:{slot_id,...CWJourneyRuntime.versions},storageMode:'ephemeral',title:'夜潮の排水路'});
  if(controller){await application.ready;if(gameRoot.dataset.screen==='hub')gameRoot.querySelector('[data-j="collection"]')?.click();}
  activeStore=storage;activeCampaign=Campaign;activeController=controller;currentCase=id;select.value=id;
  status.textContent=cases.find(x=>x[0]===id)[1];return true;
 }catch(e){status.textContent='開始できませんでした（'+(e.code||e.message)+'）。';return false;}
 finally{opening=false;select.disabled=openButton.disabled=false;}
}
select.addEventListener('change',()=>openConnected(select.value));openButton.addEventListener('click',()=>openConnected(select.value));
const connectedEntry={open:openConnected,get app(){return application?.journey||application;},get launcher(){return application;},get storage(){return activeStore;},get Campaign(){return activeCampaign;},get controller(){return activeController;},state:()=>({currentCase,opening}),ready:openConnected('start')};
