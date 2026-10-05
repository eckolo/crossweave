// 追加の限定探索。登録値を編集せず、公開編成commandと再挑戦で実際のseedを進める。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createCampaign} from './ui-original/src/runtime/campaign.mjs';
import {MemoryStore} from './ui-original/test/runtime/support.mjs';
const repo=path.resolve(import.meta.dirname,'../../..');
const edition=path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out=path.join(edition,'legal-boundaries');fs.mkdirSync(out,{recursive:true});
const first=JSON.parse(fs.readFileSync(path.join(edition,'legal-common/repro-home.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest={source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',
  initial:'legal-common/repro-home.json',initial_sha256:hash(JSON.stringify(first.original_document)),
  method:'公開commit_preparation/depart/continue_scene/play/withdraw/ack_returnのみ。合法保存の分岐復元。登録値・保存値の直接編集なし。',
  exhaustive:false,trials:[],found:[],commands:[]};
const decks=[null,['g','r','salve','j','read','f'],['g','r','salve','read','fast','j'],['g','r','salve','read','f','l']];
for(let branch=0;branch<decks.length;branch++){
  const storage=new MemoryStore();storage.records.set('legal-boundary',structuredClone(first.original_document));
  const Campaign=createCampaign({storage}),controller=await Campaign.open({slot_id:'legal-boundary'});
  const commands=[];
  async function send(type,payload={}){
    const v=controller.inspect(),command={request_id:'boundary-'+branch+'-'+commands.length,expected_revision:v.meta.revision,view_token:v.meta.view_token,type,payload};
    const result=await controller.execute(command);if(result.display_data.error)throw Error(JSON.stringify({command,error:result.display_data.error}));commands.push(command);
  }
  if(decks[branch]){
    const d=controller.inspect().display_data,plan=structuredClone(d.draft.plan);
    plan.composition.deck=decks[branch].flatMap(base=>d.home.owned.filter(i=>i.blueprint.base===base).map(i=>i.id));
    if(plan.composition.deck.length!==12)throw Error('Not a twelve-card public plan');
    await send('commit_preparation',{plan});
  }
  for(let run=0;run<6;run++){
    await send('depart',{case_id:'SCN-001'});
    const trial={branch,run,turns:0,filler_public_seen:0,unlimited_public_seen:0,ended:null};manifest.trials.push(trial);
    for(let turn=0;turn<90;turn++){
      const v=controller.inspect(),d=v.display_data;
      if(d.phase==='return'){trial.ended=d.return_receipt.outcome;break;}
      if(d.scene?.paused){await send('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[]});continue;}
      const hands=d.exploration.hand;
      const filler=hands.filter(c=>d.details[c.id]?.recovery_rule==='destroyed_on_recovery_filler');
      const unlimited=hands.filter(c=>{const p=d.details[c.id]?.primary??d.details[c.id];return p?.kind==='guard'&&Object.hasOwn(p,'defense_uses')&&p.defense_uses===null;});
      trial.filler_public_seen+=filler.length;trial.unlimited_public_seen+=unlimited.length;
      const choices=d.exploration.legal_actions.map(choice=>({choice,p:controller.previewAction({view_token:v.meta.view_token,choice}).display_data.action_preview}));
      const selectedFiller=choices.find(x=>x.p.mode==='place'&&(x.p.unused_hand_expiry||[]).some(e=>e.expires&&e.destination==='destroyed'&&filler.some(c=>c.id===e.id)));
      for(const [name,selected] of [['review-safety-filler',selectedFiller],['review-details-unlimited',unlimited.length?choices[0]:null]]){
        if(!selected||manifest.found.includes(name))continue;
        const original=controller.exportSave(),adapted=structuredClone(original);adapted.schema='CW-CSharp-application-1';adapted.engine_version='CW-CSharp-core-1';
        fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({source:manifest.source,method:manifest.method,initial_source:manifest.initial,source_record:'boundary-'+branch,source_step:commands.length,original_document:original,commands:structuredClone(commands),dto:{FormatVersion:1,RuleSetId:adapted.rule_set_id,ContentSetId:adapted.content_set_id,State:adapted},choice:selected.choice,public_view:v},null,2));
        manifest.found.push(name);
      }
      if(manifest.found.length===2)break;
      const heal=choices.filter(x=>x.p.mode==='heal'&&x.p.hp_restored>0).sort((a,b)=>b.p.hp_restored-a.p.hp_restored);
      const guards=choices.filter(x=>x.p.mode==='guard');
      const places=choices.filter(x=>x.p.mode==='place');
      const attacks=choices.filter(x=>x.p.mode==='attack').sort((a,b)=>a.p.actual_hp_loss-b.p.actual_hp_loss);
      const preferred=d.exploration.self.hp<36&&heal.length?heal:!d.exploration.self.guard&&guards.length?guards:places.length?places:guards.length?guards:attacks.length?attacks:choices;
      await send('play',{choice:preferred[(turn+run+branch)%preferred.length].choice});trial.turns++;
    }
    console.log(JSON.stringify(trial));
    if(controller.inspect().display_data.phase==='exploring')await send('withdraw');
    while(controller.inspect().display_data.phase==='return'){
      const d=controller.inspect().display_data;if(d.scene?.paused)await send('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[]});else{await send('ack_return');break;}
    }
    if(manifest.found.length===2)break;
  }
  manifest.commands.push({branch,commands,final_document_sha256:hash(JSON.stringify(controller.exportSave()))});
  fs.writeFileSync(path.join(out,'search.json'),JSON.stringify(manifest,null,2));
}
console.log(JSON.stringify({found:manifest.found,trials:manifest.trials.length,exhaustive:manifest.exhaustive}));
