// Generate comparison evidence from the pinned, unmodified JS implementation.
// Not needed at runtime or for ordinary dotnet tests. Natural games use only public commands.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {canonical} from '../../../src/runtime/common.mjs';
import zlib from 'node:zlib';
import {createCampaign,versions} from '../../../src/runtime/campaign.mjs';
import {MemoryStore,choose} from '../../../test/runtime/support.mjs';
import {validateDocument} from '../../../src/runtime/validate.mjs';
import {restoreGame} from '../../../src/runtime/game.mjs';
import {seedState,MT} from '../../../src/runtime/random.mjs';
const records=[];let unprotectedCheckpoint=null;
async function fresh(name,source=null){
 const storage=new MemoryStore(),api=createCampaign({storage});
 let c;if(source){storage.records.set(name,source);c=await api.open({slot_id:name});}
 else {c=await api.create({slot_id:name,request_id:'create',...versions});const d=c.exportSave();d.session.campaign_id='D04B-'+name;storage.records.set(name,d);c=await api.open({slot_id:name});}
 const row={name,initial:c.exportSave(),steps:[]};records.push(row);
 async function step(type,payload={}){const v=c.inspect();const request={request_id:name+'-'+row.steps.length,expected_revision:v.meta.revision,view_token:v.meta.view_token,type,payload};const r=await c.execute(request);if(r.display_data.error)throw Error(JSON.stringify(r.display_data.error));const d=c.exportSave();if(name==='defeat'&&!unprotectedCheckpoint&&d.session.phase==='exploring'&&d.session.game.state.rewards['SCN-001-RW02'])unprotectedCheckpoint=structuredClone(d);row.steps.push({request:{id:request.request_id,type,payload},expected:{session:d.session,casebook:d.casebook}});return r;}
 return {c,row,step};
}
async function finish(x,policy=choose,stop=null){for(let i=0;i<500;i++){const d=x.c.exportSave(),v=x.c.inspect();if(d.session.phase==='return')return;if(stop?.(d)){await x.step('withdraw');return;}if(v.display_data.scene?.paused)await x.step('continue_scene',{scene_id:v.display_data.scene.id});else await x.step('play',{choice:policy(x.c)});}throw Error('oracle budget');}
async function ack(x){while(x.c.inspect().display_data.scene?.paused)await x.step('continue_scene',{scene_id:x.c.inspect().display_data.scene.id});await x.step('ack_return');}
const first=await fresh('natural');await first.step('depart',{case_id:'SCN-001'});await finish(first);await ack(first);
// Free composition change followed by a second run. No credit injection.
let v=first.c.inspect(),plan=structuredClone(v.display_data.draft.plan);const spare=v.display_data.home.owned.find(x=>!x.selected&&x.blueprint.base==='j');plan.composition.deck[0]=spare.id;plan.acquire=['basic:PS01'];plan.composition.equipment=['pending:basic:PS01'];await first.step('commit_preparation',{plan});await first.step('depart',{case_id:'SCN-001'});await finish(first);await ack(first);
const early=await fresh('withdraw-before');await early.step('depart',{case_id:'SCN-001'});await early.step('continue_scene',{scene_id:'SCN-001-S02'});await early.step('withdraw');await ack(early);await early.step('depart',{case_id:'SCN-001'});
const protectedRun=await fresh('withdraw-protected');await protectedRun.step('depart',{case_id:'SCN-001'});await finish(protectedRun,choose,d=>Object.values(d.session.game.state.rewards).some(r=>r.protected));await ack(protectedRun);
const defeat=await fresh('defeat');await defeat.step('depart',{case_id:'SCN-001'});await finish(defeat,c=>{const v=c.inspect();return v.display_data.exploration.legal_actions.find(x=>x.target==='E1')||v.display_data.exploration.legal_actions[0];});
// Resume the naturally reached unprotected enemy reward checkpoint; do not inject rewards.
const enemyStep=defeat.row.steps.find(x=>x.expected.session.phase==='exploring'&&x.expected.session.game.state.rewards['SCN-001-RW02']);
if(!enemyStep)throw Error('missing natural unprotected checkpoint');
const unprotectedDocument=unprotectedCheckpoint;
const unprotected=await fresh('withdraw-unprotected',validateDocument(unprotectedDocument));await unprotected.step('withdraw');await ack(unprotected);
// Legal D03R fixture, migrated by the existing JS validator. Keep distinct from natural input.
const base=JSON.parse(zlib.brotliDecompressSync(Buffer.from(fs.readFileSync(new URL('../../../test/runtime/d03-natural-home.json.br.b64',import.meta.url),'utf8').trim(),'base64')));
const fixture=validateDocument(base);const rich=await fresh('legal-acquisition',fixture);v=rich.c.inspect();plan=structuredClone(v.display_data.draft.plan);plan.acquire=['choice-1','basic:PS01'];plan.composition.equipment=['pending:choice-1','pending:basic:PS01'];await rich.step('commit_preparation',{plan});await rich.step('depart',{case_id:'SCN-001'});await rich.step('continue_scene',{scene_id:rich.c.inspect().display_data.scene.id});await rich.step('play',{choice:choose(rich.c)});
const random=[];for(const text of ['crossweave:AH1:0:P|initial','crossweave:AH1:1:V0|allocation','日本語の種']){const state=await seedState(text);const mt=new MT(state);random.push({text,state,words:Array.from({length:16},()=>mt.uint())});}
// D58's authored hand/field fixture construction, scoped to six representative operations.
const ready=early.row.steps[1].expected.session;
function prepare(g,type,actor,material,target=null){
 function take(id){for(const a of Object.values(g.s.actors)){a.hand=a.hand.filter(x=>x!==id);a.deck=a.deck.filter(x=>x!==id);}g.s.pool=g.s.pool.filter(x=>x!==id);for(const [attr,x]of Object.entries(g.s.field))if(x===id)delete g.s.field[attr];g.s.cards[id].remaining=null;}
 const a=g.s.actors[actor];for(const id of [...a.hand]){take(id);a.deck.push(id);}for(const id of Object.values(g.s.field)){take(id);g.recover(id,'d58_fixture_clear_field');}
 const c=Object.values(g.s.cards).find(c=>!c.destroyed&&c.type===type);take(c.id);a.hand.push(c.id);c.remaining=c.life;
 if(material){const m=Object.values(g.s.cards).find(x=>!x.destroyed&&x.id!==c.id&&x.type===material);if(c.attr!==m.attr)throw Error('fixture attributes');take(m.id);g.s.field[c.attr]=m.id;}
 g.s.ready=true;g.assert();return {card_id:c.id,target};
}
const combat_cases=[];
for(const [actor,material]of [['V0','weak_B'],['V0','l'],['V0','h'],['P','l']]){
 const g=restoreGame(ready);const choice=prepare(g,'nt_ward',actor,material);
 for(const [id,a]of Object.entries(g.s.actors)){a.crit=id===actor?900:125;a.defense_effects=[{source_actor_id:id,effect_kind:'self_guard',guard:3,evasion:0,uses:null}];if(id!==actor)a.defense_effects.push({source_actor_id:actor,effect_kind:'ward',guard:20,evasion:30,uses:4});}
 const initial=g.save();g.trace=[];g.play(actor,choice);combat_cases.push({name:`D58-${actor}-${material}`,actor,choice,initial,expected:g.save(),trace:g.trace,target_set_id:ready.active.target_set_id});
}
for(const gain of [0,99]){const g=restoreGame(ready);const choice=prepare(g,'h','E1','l','P');g.s.actors.P.hit=gain;g.s.actors.P.crit=125;g.s.actors.P.defense_effects=[{source_actor_id:'V0',effect_kind:'ward',guard:2,evasion:gain===0?999:-10,uses:1}];const initial=g.save();g.trace=[];g.play('E1',choice);combat_cases.push({name:`D55-D58-hit-${gain}`,actor:'E1',choice,initial,expected:g.save(),trace:g.trace,target_set_id:ready.active.target_set_id});}
console.log(JSON.stringify(records.map(r=>({name:r.name,steps:r.steps.length,returns:Object.values(r.steps.at(-1).expected.session.receipts).map(x=>({outcome:x.outcome,gained:x.gained_units}))})),null,2));
// Lossless deltas avoid storing unchanged 20 MT states at every operation.
function delta(a,b,path=[]){
 if(canonical(a)===canonical(b))return [];
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
  if(Array.isArray(a)&&a.length!==b.length)return [{path,value:b}];
  const changes=[];for(const k of Object.keys(a))if(!Object.hasOwn(b,k))changes.push({path:[...path,k],remove:true});
  for(const k of Object.keys(b))changes.push(...(Object.hasOwn(a,k)?delta(a[k],b[k],[...path,k]):[{path:[...path,k],value:b[k]}]));return changes;
 }return [{path,value:b}];
}
for(const r of records){let previous={session:r.initial.session,casebook:r.initial.casebook};for(const step of r.steps){const next=step.expected;step.expected_delta=delta(previous,next);delete step.expected;previous=next;}}
const path=new URL('./Fixtures/application-oracle.json.br',import.meta.url);fs.mkdirSync(new URL('./Fixtures/',import.meta.url),{recursive:true});fs.writeFileSync(path,zlib.brotliCompressSync(JSON.stringify({technical_sha:'9f46e0e63593d6aa396ec0f159bdf4923eb4e108',random,records,combat_cases,legal_fixture:fixture}),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:9}}));
