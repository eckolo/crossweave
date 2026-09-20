import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createCampaign} from '../../src/runtime/campaign.mjs';
import {MemoryStore,assert,command,currentPlan} from './support.mjs';
const folder='docs/検証/接続条件/co-d02/saves/';
const api=createCampaign({storage:new MemoryStore()}),rows=[];
for(const name of ['entry','port','return','home','second-return']) {
  const doc=JSON.parse(gunzipSync(await readFile(folder+name+'.save.json.gz'))),c=await api.importSave({slot_id:name,document:doc,request_id:'detail-import'}),v=c.inspect().display_data;
  for(const base of v.case.unlocked_card_ids)assert(v.details['base:'+base]?.name,'missing kept unlock name '+base);
  for(const base of ['nt_flow','nt_pressure','nt_stop'])assert(!!v.details['base:'+base]===v.case.unlocked_card_ids.includes(base),'unknown unlock disclosed '+base);
  if(v.home){assert(v.home.free_card_options.length===10&&!v.home.free_card_options.includes('base:nt_flow'),'unlock became free');assert(v.home.owned.length===0,'unlock became owned');}
  if(name==='home'){const p=currentPlan(c);p.next_preparation.deck[0]='base:nt_flow';assert((await c.execute(command(c,'commit_preparation',{plan:p}))).display_data.error?.code==='unknown_selection_handle','unlock became selectable');}
  rows.push({name,kept_unlock_details:true,no_unknown_base_details:true,free_and_owned_distinct:true});
}
console.log(JSON.stringify({schema:'CW-M1-A-001-public-details-1',ok:true,source:'natural code-03 save examples',code:'code-07.json',rows},null,2));
