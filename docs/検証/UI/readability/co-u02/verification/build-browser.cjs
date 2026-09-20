'use strict';
// Separate browser-only doubles. Never included by build.cjs in the application.
const fs=require('node:fs'),path=require('node:path'),B=require('../build.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const helperSource=read('../verify.cjs');
const helpers=helperSource.slice(helperSource.indexOf('const copy='),helperSource.indexOf('let sequence=0;'));
const setup=`let testSequence=0;const originalMakeSession=CrossweaveUI.makeSession,originalMakeLauncher=CrossweaveUI.makeLauncher;CrossweaveUI.makeSession=(c,o={})=>originalMakeSession(c,{...o,idFactory:()=>"browser-test-"+(++testSequence)});CrossweaveUI.makeLauncher=(c,o)=>originalMakeLauncher(c,o,{idFactory:()=>"browser-start-"+(++testSequence)});const currentPlan=CrossweaveUI.currentPlan;const assert={deepEqual:(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('request mismatch')}};${helpers}
${read('../../co-u01/mock-controller.cjs')}
const DATA=${JSON.stringify(JSON.parse(read('layout-input.json'))).replace(/</g,'\\u003c')};
window.calls=[];window.startCalls=[];window.app=null;
window.boot=(mode='prep')=>{
 app?.dispose();document.body.style.marginTop='0';const host=document.querySelector('#host');host.style.width='736px';
 window.calls=[];window.startCalls=[];let revision=1;window.failWrite=false;window.delay=30;
 if(mode==='prep'){
  const m=createMockController(DATA,'bc');m.execute({request_id:'initial-ack',expected_revision:m.inspect().meta.revision,view_token:m.inspect().meta.view_token,type:'ack_return',payload:{}});
  const adapt=v=>{v.display_data.capabilities.save_draft={available:true,reasons:[]};v.display_data.capabilities.discard_draft={available:true,reasons:[]};v.display_data.case={id:'test-case',attempts:1};return v;};
  const c={inspect:async()=>adapt(m.inspect()),previewPreparation:async a=>adapt(m.previewPreparation(a)),quoteConversion:async a=>adapt(m.quoteConversion(a)),execute:async a=>{calls.push(copy(a));await new Promise(r=>setTimeout(r,delay));if(failWrite){failWrite=false;throw {code:'storage_write_failed'};}return adapt(m.execute(a));},exportSave:async()=>({schema:'TEST-ONLY',private_field:'not in view'})};
  app=CrossweaveUI.mountApplication(host,{controller:c});
 }else if(mode==='scene'||mode==='exploration'){
  const v=publicView(1,'exploring');v.display_data.home=null;v.display_data.draft=null;
  v.display_data.scene={id:'scene-one',text_ids:['required','optional'],paused:mode==='scene',can_continue:true,can_withdraw:true};
  v.display_data.texts=[{id:'required',title:'入口の本文',short_text:'実表示試験の本文',detail_text:'本文を表示した場合だけ記録する'},{id:'optional',title:'任意の詳細',detail_text:'まだ開いていない詳細'}];
  v.display_data.exploration={now:0,self:{id:'P',hp:40,max_hp:40},actors:{P:{id:'P',name:'本人'},actor1:{id:'actor1',name:'公開相手'}},hand:[{id:'c1',remaining:2}],field:{A:{id:'field1'}},recovery_count:0,legal_actions:[{card_id:'c1',target:'field1'}]};
  v.display_data.details.c1={name:'公開手札',kind:'card',base_id:'f',life:2};v.display_data.details.field1={name:'公開場札',kind:'card',base_id:'f'};
  const d=double(v),send=d.execute.bind(d);d.execute=async a=>{calls.push(copy(a));await new Promise(r=>setTimeout(r,delay));if(failWrite){failWrite=false;throw {code:'storage_write_failed'};}const r=await send(a);if(a.type==='continue_scene'&&a.payload.advance){r.display_data.scene.paused=false;d.value=r;}return r;};
  app=CrossweaveUI.mountApplication(host,{controller:d});
 }else{
  const Campaign={open:async a=>{startCalls.push({method:'open',args:copy(a)});throw {code:'save_not_found'};},create:async a=>{startCalls.push({method:'create',args:copy(a)});throw {code:'storage_write_failed'};},importSave:async a=>{startCalls.push({method:'import',args:copy(a)});throw {code:'unsupported_save_schema'};}};
  app=CrossweaveUI.mountApplication(host,{Campaign,config:{slot_id:'test',rule_set_id:'test-rules',content_set_id:'test-content'}});
 }
};boot();`;
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{margin:0;background:#222}#host{width:736px;max-width:100%}'+B.buildStyle()+'</style><body><div id="host"></div><script>'+B.buildLibrary().replace(/<\/script/gi,'<\\/script')+'\n'+setup.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
if(require.main===module)fs.writeFileSync(process.argv[2]||path.join(__dirname,'browser-harness.html'),html);
module.exports={html};
