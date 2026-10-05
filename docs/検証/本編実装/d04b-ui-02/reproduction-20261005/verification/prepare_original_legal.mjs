import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createCampaign} from './ui-original/src/runtime/campaign.mjs';
import {MemoryStore} from './ui-original/test/runtime/support.mjs';
import C from './ui-original/src/content/m1.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../..');
const out=path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005/legal-common');fs.mkdirSync(out,{recursive:true});
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const storage=new MemoryStore(),Campaign=createCampaign({storage});let controller=await Campaign.create({slot_id:'common-source',request_id:'common-create',rule_set_id:C.rule_set_id,content_set_id:C.content_set_id});
const commands=[];
async function send(type,payload){const v=controller.inspect();const command={type,payload,request_id:'common-'+commands.length,expected_revision:v.meta.revision,view_token:v.meta.view_token};const result=await controller.execute(command);if(result.display_data.error)throw Error(JSON.stringify(result.display_data.error));commands.push(command);return result;}
function save(name,choice=null){const original=controller.exportSave(),adapted=structuredClone(original);adapted.schema='CW-CSharp-application-1';adapted.engine_version='CW-CSharp-core-1';const v=controller.inspect();fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({source:'原本72d0eb58のCampaign.createと合法commandのみ',source_record:'original-common',source_step:commands.length,original_sha256:hash(original),original_document:original,commands:structuredClone(commands),dto:{SchemaVersion:1,RuleSetId:adapted.rule_set_id,ContentSetId:adapted.content_set_id,State:adapted},choice,public_view:v,preview:choice?controller.previewAction({view_token:v.meta.view_token,choice}):null},null,2));}
save('repro-home');await send('depart',{case_id:'SCN-001'});save('repro-story');
while(controller.inspect().display_data.scene?.paused){const s=controller.inspect().display_data.scene;await send('continue_scene',{scene_id:s.id,advance:true,displayed_text_ids:[]});}
save('repro-explore');const seed=controller.exportSave();
let predictionSaved=false;
for(let i=0;i<15&&!predictionSaved;i++){
 const d=controller.inspect().display_data;if(d.phase!=='exploring')break;
 if(d.scene?.paused){await send('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[]});continue;}
 const choices=d.exploration.legal_actions.map(c=>({c,p:controller.previewAction({view_token:controller.inspect().meta.view_token,choice:c}).display_data.action_preview}));
 const match=choices.find(x=>x.p.mode==='attack');if(match){save('repro-prediction',match.c);predictionSaved=true;break;}
 await send('play',{choice:choices.find(x=>x.p.mode==='place')?.c??choices[0].c});
}
// 固定原本の登録値を変えず、回収・再編・配札へ通常commandを通して補充の期限切れを探す。
const trials=[];let found=false;
for(let trial=0;trial<192&&!found;trial++){
 storage.records.set('common-source',structuredClone(seed));controller=await Campaign.open({slot_id:'common-source'});commands.splice(2);let random=trial+1,turns=0,fillerSeen=0;
 function draw(n){random=(Math.imul(random,1664525)+1013904223)>>>0;return random%n;}
 for(let turn=0;turn<75;turn++){
  const v=controller.inspect(),d=v.display_data;if(d.phase!=='exploring')break;
  if(d.scene?.paused){await send('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[]});continue;}
  const choices=d.exploration.legal_actions.map(c=>({c,p:controller.previewAction({view_token:v.meta.view_token,choice:c}).display_data.action_preview}));
  fillerSeen+=d.exploration.hand.filter(c=>d.details[c.id]?.recovery_rule==='destroyed_on_recovery_filler').length;
  for(const x of choices)if(x.p.mode==='place'&&(x.p.unused_hand_expiry||[]).some(e=>e.expires&&e.destination==='destroyed'&&d.details[e.id]?.recovery_rule==='destroyed_on_recovery_filler')){save('review-safety-filler',x.c);found=true;break;}
  if(found)break;
  let preferred=choices.filter(x=>['guard','place'].includes(x.p.mode));
  const heals=choices.filter(x=>x.p.mode==='heal'&&x.p.hp_restored>0);
  if(d.exploration.self.hp<30&&heals.length)preferred=heals;
  if(!preferred.length)preferred=choices.filter(x=>x.p.mode==='attack').sort((a,b)=>a.p.actual_hp_loss-b.p.actual_hp_loss).slice(0,Math.max(1,trial%4));
  if(trial%4===3)preferred=choices;
  if(!preferred.length)break;await send('play',{choice:preferred[draw(preferred.length)].c});turns++;
 }
 trials.push({trial,turns,fillerSeen});if(trial%24===0)console.log(JSON.stringify({trial,turns,fillerSeen,found}));
}
fs.writeFileSync(path.join(out,'search.json'),JSON.stringify({source:'72d0eb58',found,trials,seed_sha256:hash(seed),fixed_content:C.content_set_id,no_value_edits:true,source:'Campaign.create / depart / continue_scene / playのみ。保存・ルールの値改変なし。'},null,2));
console.log(JSON.stringify({fixtures:fs.readdirSync(out),filler_found:found}));
