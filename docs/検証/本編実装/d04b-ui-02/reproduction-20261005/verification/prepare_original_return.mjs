import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {createCampaign} from './ui-original/src/runtime/campaign.mjs';import {MemoryStore} from './ui-original/test/runtime/support.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005/legal-return');fs.mkdirSync(out,{recursive:true});
const start=JSON.parse(fs.readFileSync(path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005/legal-common/repro-home.json')));
const trials=[];const found=new Set();
for(let trial=0;trial<24&&found.size<3;trial++){
 const storage=new MemoryStore();storage.records.set('same-return',structuredClone(start.original_document));const Campaign=createCampaign({storage});const controller=await Campaign.open({slot_id:'same-return'});const commands=[];
 async function send(type,payload={}){const v=controller.inspect(),command={request_id:'return-'+trial+'-'+commands.length,expected_revision:v.meta.revision,view_token:v.meta.view_token,type,payload},r=await controller.execute(command);if(r.display_data.error)throw Error(JSON.stringify(r.display_data.error));commands.push(command);}
 await send('depart',{case_id:'SCN-001'});
 for(let turn=0;turn<70;turn++){
  const v=controller.inspect(),d=v.display_data;
  if(d.phase==='return'){
   const outcome=d.return_receipt.outcome;if(!found.has(outcome)){found.add(outcome);const original=controller.exportSave(),adapted=structuredClone(original);adapted.schema='CW-CSharp-application-1';adapted.engine_version='CW-CSharp-core-1';fs.writeFileSync(path.join(out,'repro-return-'+outcome+'.json'),JSON.stringify({source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',method:'元の合法保存からdepart/continue_scene/play/withdrawのみ。登録値・保存内容の直接改変なし。',initial_source:'legal-common/repro-home.json',source_record:'return-'+trial,source_step:commands.length,original_sha256:crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'),original_document:original,commands,dto:{FormatVersion:1,RuleSetId:adapted.rule_set_id,ContentSetId:adapted.content_set_id,State:adapted},public_view:v},null,2));}trials.push({trial,turns:turn,outcome});break;
  }
  if(trial===0){await send('withdraw');continue;}
  if(d.scene?.paused){await send('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[]});continue;}
  const choices=d.exploration.legal_actions.map(c=>({c,p:controller.previewAction({view_token:v.meta.view_token,choice:c}).display_data.action_preview}));
  let selected;
  if(trial===1)selected=choices.find(x=>x.p.mode==='place')??choices[0];
  else selected=choices.filter(x=>x.p.mode==='attack').sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss)[0]??choices.find(x=>x.p.mode==='guard')??choices[trial%choices.length];
  await send('play',{choice:selected.c});
 }
}
fs.writeFileSync(path.join(out,'generation.json'),JSON.stringify({trials,found:[...found],value_edits:false,source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2'},null,2));console.log(JSON.stringify({found:[...found],trials}));
