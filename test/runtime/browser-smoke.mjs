import {IndexedDBStore} from '../../src/runtime/storage.mjs';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {assert,equal,execute,command} from './support.mjs';
export async function browserSmoke() {
  const storage=new IndexedDBStore({database:'crossweave-CW-M1-A-001-browser'}),api=createCampaign({storage}),slot='check-'+crypto.randomUUID();
  const c=await api.create({slot_id:slot,...versions,request_id:'create'});
  const home=c.exportSave();equal((await api.open({slot_id:slot})).exportSave(),home,'home IDB reopen');
  const depart=command(c,'depart',{case_id:'SCN-001'});await c.execute(depart);
  assert(c.inspect().display_data.phase==='exploring','actual departure persisted');
  const entry=c.exportSave(),open=await api.open({slot_id:slot});equal(open.exportSave(),entry,'entry IDB reopen');
  const replay=await open.execute(depart);assert(replay.display_data.operation?.status==='replayed','same request replay');equal(open.exportSave(),entry,'replay does not repeat depart');
  const stale=await c.execute(command(c,'withdraw',{}));assert(!stale.display_data.error,'withdraw original current revision');
  const rejected=await open.execute(command(open,'withdraw',{}));assert(rejected.display_data.error?.code==='stale_revision','two controllers revision check');
  const returned=await api.open({slot_id:slot});assert(returned.inspect().display_data.phase==='return','return IDB reopen');
  equal(returned.exportSave(),c.exportSave(),'return fully persistent');
  const imported=await api.importSave({slot_id:slot+'-import',document:JSON.stringify(returned.exportSave()),request_id:'import'});
  equal(imported.exportSave().session,returned.exportSave().session,'JSON import preserves session');
  await execute(imported,'ack_return',{});assert(imported.inspect().display_data.phase==='home','imported return acknowledged');
  return {ok:true,database:storage.database,slot,checks:['create_empty','home_open','departure_open','same_request_replay','two_controller_stale_revision','return_open','json_empty_import','ack_return'],note:'Dedicated disposable test slots; no old PT-NT key is read or written.'};
}
