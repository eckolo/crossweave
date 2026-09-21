import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {MemoryStore,assert,equal,execute,command,currentPlan,choose} from './support.mjs';
export async function smoke({storage=new MemoryStore(),slot='CW-M1-A-001-smoke',onCheckpoint=()=>{}}={}) {
  const api=createCampaign({storage}),c=await api.create({slot_id:slot,...versions,request_id:'create'}),results=[];
  assert(c.inspect().display_data.home.economy.unspent_units===0,'initial funds must be zero');
  const before=c.exportSave(),p=currentPlan(c);p.next_preparation.learn=['PS01'];p.next_preparation.equipment=['base:PS01'];
  const failed=await c.execute(command(c,'commit_preparation',{plan:p}));assert(failed.display_data.error?.code==='insufficient_unspent_funds','insufficient funds');equal(c.exportSave(),before,'failed command must be unchanged');
  await execute(c,'depart',{case_id:'SCN-001'});equal((await api.open({slot_id:slot})).exportSave(),c.exportSave(),'entry reopen');
  await onCheckpoint('entry',c.exportSave());
  let actions=0;
  while(c.inspect().display_data.phase==='exploring'&&actions<160){const view=c.inspect().display_data;
    if(view.scene?.paused)await execute(c,'continue_scene',{scene_id:view.scene.id});
    else {await execute(c,'play',{choice:choose(c)});actions++;}
    if(c.inspect().display_data.scene?.id==='SCN-001-S03')await onCheckpoint('port',c.exportSave());
  }
  if(c.inspect().display_data.phase==='exploring'){results.push({natural:'cutoff',actions});await execute(c,'withdraw',{});}
  const ret=c.inspect().display_data.return_receipt;results.push({natural:ret.outcome,actions,gained_units:ret.gained_units});
  await onCheckpoint('return',c.exportSave());equal((await api.open({slot_id:slot})).exportSave(),c.exportSave(),'return reopen');
  while(c.inspect().display_data.scene?.paused)await execute(c,'continue_scene',{scene_id:c.inspect().display_data.scene.id});
  await execute(c,'ack_return',{});
  if(c.inspect().display_data.home.economy.unspent_units>=200){const plan=currentPlan(c);plan.next_preparation.learn=['PS01'];plan.next_preparation.equipment=['base:PS01'];
    const i=plan.next_preparation.deck.indexOf('base:salve');plan.next_preparation.deck[i]='base:g';
    const saved=c.exportSave();assert(c.previewPreparation({view_token:c.inspect().meta.view_token,plan}).display_data.preparation_comparison.ok,'preview');equal(c.exportSave(),saved,'preview pure');
    await execute(c,'commit_preparation',{plan});results.push({growth:'PS01 + second guard',unspent:c.inspect().display_data.home.economy.unspent_units});}
  await onCheckpoint('home',c.exportSave());
  await execute(c,'depart',{case_id:'SCN-001'});results.push({second_mode:c.inspect().display_data.case.available_mode});
  let secondActions=0;while(c.inspect().display_data.phase==='exploring'&&secondActions<160){const v=c.inspect().display_data;if(v.scene.paused)await execute(c,'continue_scene',{scene_id:v.scene.id});else{await execute(c,'play',{choice:choose(c)});secondActions++;}}
  if(c.inspect().display_data.phase==='exploring')await execute(c,'withdraw',{});
  results.push({second_outcome:c.inspect().display_data.return_receipt.outcome,actions:secondActions});await onCheckpoint('second-return',c.exportSave());
  return {results,controller:c};
}
