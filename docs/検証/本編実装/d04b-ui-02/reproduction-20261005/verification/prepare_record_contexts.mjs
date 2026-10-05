// 踏破済みの公開保存から、観測を持った編成／次の本文／撤退を通常commandで得る。
// 空の初期記録の証拠は保全し、非空の使用先を別状態として追加する。
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {createCampaign} from './ui-original/src/runtime/campaign.mjs';
import {MemoryStore} from './ui-original/test/runtime/support.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),ed=path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out=path.join(ed,'legal-record-contexts'),fixtures=path.join(ed,'fixtures-record-contexts');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(fixtures,{recursive:true});
const initial='legal-return/repro-return-clear.json',seed=JSON.parse(fs.readFileSync(path.join(ed,initial))),storage=new MemoryStore();
storage.records.set('record-contexts',structuredClone(seed.original_document));
const controller=await createCampaign({storage}).open({slot_id:'record-contexts'}),commands=[],receipts=[];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function send(type,payload={}){const v=controller.inspect(),c={type,payload,request_id:'record-context-'+commands.length,expected_revision:v.meta.revision,view_token:v.meta.view_token};const r=await controller.execute(c);if(r.display_data.error)throw Error(JSON.stringify(r.display_data.error));commands.push(c);}
function save(source,mode){const original=controller.exportSave(),a=structuredClone(original);a.schema='CW-CSharp-application-1';a.engine_version='CW-CSharp-core-1';const record={source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',source_record:'legal-record-contexts',source_step:commands.length,ancestor:initial,ancestor_sha256:hash(fs.readFileSync(path.join(ed,initial))),original_document:original,commands:structuredClone(commands),dto:{FormatVersion:1,RuleSetId:a.rule_set_id,ContentSetId:a.content_set_id,State:a},public_view:controller.inspect(),no_value_edits:true};const bytes=JSON.stringify(record,null,2);fs.writeFileSync(path.join(out,source+'.json'),bytes);for(const name of [source,mode])fs.writeFileSync(path.join(fixtures,name+'.json'),bytes);receipts.push({source,mode,phase:record.public_view.display_data.phase,sha256:hash(bytes),no_value_edits:true});}
while(controller.inspect().display_data.scene?.paused){const s=controller.inspect().display_data.scene;await send('continue_scene',{scene_id:s.id,advance:true,displayed_text_ids:[]});}
await send('ack_return');save('repro-home','repro-shared-preparation');
await send('depart',{case_id:'SCN-001'});save('repro-story','repro-shared-story');
while(controller.inspect().display_data.scene?.paused){const s=controller.inspect().display_data.scene;await send('continue_scene',{scene_id:s.id,advance:true,displayed_text_ids:[]});}
await send('withdraw');save('repro-return-withdrawal','repro-shared-return-withdrawal');
fs.writeFileSync(path.join(out,'generation.json'),JSON.stringify({initial,initial_sha256:hash(fs.readFileSync(path.join(ed,initial))),commands,receipts,no_value_edits:true},null,2));console.log(JSON.stringify(receipts));
