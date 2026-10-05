// 原本の合法帰還を受領して、全群・修飾・再訪の追加状態を公開commandで作る。
// 登録値、通常セーブ、ルールを編集しない。全群を買えない場合も理由を記録する。
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {createCampaign} from './ui-original/src/runtime/campaign.mjs';
import {MemoryStore} from './ui-original/test/runtime/support.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),ed=path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out=path.join(ed,'legal-acquisition-extra');fs.mkdirSync(out,{recursive:true});
const first=JSON.parse(fs.readFileSync(path.join(ed,'legal-return/repro-return-clear.json'))),storage=new MemoryStore();
storage.records.set('extra-acquisition',structuredClone(first.original_document));
const Campaign=createCampaign({storage}),controller=await Campaign.open({slot_id:'extra-acquisition'}),commands=[];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest={source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',initial:'legal-return/repro-return-clear.json',initial_file_sha256:hash(fs.readFileSync(path.join(ed,'legal-return/repro-return-clear.json'))),no_value_edits:true,commands,results:[],limits:[]};
async function send(type,payload={}){const v=controller.inspect(),c={type,payload,request_id:'acquisition-extra-'+commands.length,expected_revision:v.meta.revision,view_token:v.meta.view_token};const r=await controller.execute(c);if(r.display_data.error)throw Error(JSON.stringify({command:c,error:r.display_data.error}));commands.push(c);return r;}
function save(name){const original=controller.exportSave(),a=structuredClone(original);a.schema='CW-CSharp-application-1';a.engine_version='CW-CSharp-core-1';const file=name+'.json';fs.writeFileSync(path.join(out,file),JSON.stringify({source:manifest.source,source_record:'original-extra-acquisition',source_step:commands.length,ancestor:manifest.initial,ancestor_sha256:manifest.initial_file_sha256,original_document:original,commands:structuredClone(commands),dto:{FormatVersion:1,RuleSetId:a.rule_set_id,ContentSetId:a.content_set_id,State:a},public_view:controller.inspect()},null,2));manifest.results.push({file,sha256:hash(fs.readFileSync(path.join(out,file)))});}
while(controller.inspect().display_data.scene?.paused){const s=controller.inspect().display_data.scene;await send('continue_scene',{scene_id:s.id,advance:true,displayed_text_ids:[]});}
await send('ack_return');save('repro-acquisition-affix');
let view=controller.inspect();
const convertible=view.display_data.home.owned.filter(i=>!i.selected&&i.conversion_available);
if(convertible.length){const ids=convertible.map(i=>i.id),q=controller.quoteConversion({view_token:view.meta.view_token,item_ids:ids});manifest.quote=q.display_data.conversion_quote;
 if(q.display_data.conversion_quote?.available&&q.display_data.conversion_quote?.amount_units>0)await send('convert_items',{item_ids:ids});}
// 足りない着想は通常探索で得る。固定原本の既存札の能力・HP等を変更しない。
for(let run=0;run<14;run++){
 view=controller.inspect();const options=view.display_data.home.acquisition;
 const selected=[...options.filter(i=>i.id.startsWith('basic:')),options.find(i=>!i.id.startsWith('basic:'))].filter(Boolean);
 const required=selected.reduce((n,i)=>n+i.price_units,0);
 if(view.display_data.home.economy.unspent_units>=required){
  save('repro-acquisition-funded');const plan=structuredClone(view.display_data.draft.plan);plan.acquire=selected.map(i=>i.id);
  const preview=controller.previewPreparation({view_token:view.meta.view_token,plan});
  if(preview.display_data.preparation_comparison?.ok){await send('commit_preparation',{plan});save('repro-acquisition-complete');break;}
  manifest.limits.push({reason:'all-groups-plan-refused',preview:preview.display_data.preparation_comparison});break;
 }
 await send('depart',{case_id:'SCN-001'});
 let turns=0;
 for(;turns<100&&controller.inspect().display_data.phase==='exploring';turns++){
  const v=controller.inspect(),d=v.display_data;if(d.scene?.paused){await send('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[]});continue;}
  const choices=d.exploration.legal_actions.map(choice=>({choice,p:controller.previewAction({view_token:v.meta.view_token,choice}).display_data.action_preview}));
  const heal=choices.filter(x=>x.p.mode==='heal'&&x.p.hp_restored>0).sort((a,b)=>b.p.hp_restored-a.p.hp_restored);
  const guards=choices.filter(x=>x.p.mode==='guard'),attacks=choices.filter(x=>x.p.mode==='attack').sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss);
  const places=choices.filter(x=>x.p.mode==='place');
  const preferred=d.exploration.self.hp<20&&heal.length?heal:!d.exploration.self.guard&&guards.length?guards:attacks.length?attacks:places.length?places:choices;
  await send('play',{choice:preferred[0].choice});
 }
 if(controller.inspect().display_data.phase==='exploring')await send('withdraw');
 while(controller.inspect().display_data.scene?.paused){const s=controller.inspect().display_data.scene;await send('continue_scene',{scene_id:s.id,advance:true,displayed_text_ids:[]});}
 manifest.results.push({run,turns,receipt:controller.inspect().display_data.return_receipt});await send('ack_return');
 console.log(JSON.stringify({run,turns,funds:controller.inspect().display_data.home.economy.unspent_units}));
}
if(!fs.existsSync(path.join(out,'repro-acquisition-complete.json')))manifest.limits.push('14実runで全群の資金入口を取得できなかった。到達不能とはしない。');
save('repro-revisit-home');
fs.writeFileSync(path.join(out,'generation.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({results:manifest.results.map(x=>x.file).filter(Boolean),limits:manifest.limits}));
