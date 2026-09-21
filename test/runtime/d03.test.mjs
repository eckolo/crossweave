// CW-M1-D03-001: targeted tests, never runs the historical D02/D58 suites.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import C from '../../src/content/m1.mjs';
import E from '../../src/content/economy.mjs';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {MemoryStore,command,execute,currentPlan,choose} from './support.mjs';
import {copy,canonical} from '../../src/runtime/common.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {restoreGame,departGame,Game,bundleFor} from '../../src/runtime/game.mjs';
import {sha256} from '../../src/runtime/hash.mjs';
import {blueprint,compileCard,variants,adjustedEffect,equipmentCost,passiveSpec} from '../../src/runtime/affixes.mjs';
import {generate,drawCandidates,candidateRef,contextFor} from '../../src/runtime/offers.mjs';
import {validateDeck,validateEquipment,draftFor,planFor} from '../../src/runtime/preparation.mjs';
import {syncReferences,conversionUnits} from '../../src/runtime/items.mjs';
import {handles} from '../../src/runtime/selection-public.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p));
const sourceBytes=zlib.brotliDecompressSync(Buffer.from(read('test/runtime/d03-natural-home.json.br.b64').toString().trim(),'base64'));
const base=JSON.parse(sourceBytes),records=[],examples=[],snapshots={},output=process.env.D03_OUTPUT;
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
function check(name,fn){test(name,async()=>{try{await fn();records.push({name,pass:true});}catch(error){records.push({name,pass:false,error:String(error.message)});throw error;}});}
async function open(document=base,slot='check'){
  const storage=new MemoryStore();storage.records.set(slot,copy(document));const api=createCampaign({storage}),c=await api.open({slot_id:slot});return {storage,api,c,slot};
}
async function ack(c){while(c.inspect().display_data.scene?.paused)await execute(c,'continue_scene',{scene_id:c.inspect().display_data.scene.id});await execute(c,'ack_return',{});}
function quote(c,ids){return c.quoteConversion({view_token:c.inspect().meta.view_token,item_ids:ids});}
async function rejected(c,storage,slot,request,code){
  const before=c.exportSave(),stored=await storage.load(slot),result=await c.execute(request);
  assert.equal(result.display_data.error?.code,code,JSON.stringify(result.display_data.error));
  assert.deepEqual(c.exportSave(),before);assert.deepEqual(await storage.load(slot),stored);return result;
}
async function buy(c,id='choice-0'){return execute(c,'purchase',{candidate:id});}
function planPurchase(c,id='choice-0',{select=false,timing='before_preparation'}={}){
  const p=currentPlan(c),row=c.inspect().display_data.home.candidates.find(x=>x.id===id);p.candidate=id;p.purchase_timing=timing;
  if(select){if(row.blueprint.kind==='card'){
    const i=p.next_preparation.deck.indexOf('base:'+row.blueprint.base);p.next_preparation.deck[i<0?0:i]='$purchase';
  }else{p.next_preparation.learn=[row.blueprint.base];p.next_preparation.equipment=['$purchase'];}}
  return p;
}
function comparison(c,p){return c.previewPreparation({view_token:c.inspect().meta.view_token,plan:p});}
function publicOnly(value){
  const text=JSON.stringify(value);for(const forbidden of [base.session.campaign_id,'CW-M1-run-1','CW-M1-offer-1','CW-M1-candidate-1','owned:[','"request_log"','"future_rng"','"pending_contexts"','"batch_context"'])assert(!text.includes(forbidden),forbidden);
}
function oldSave(name){return JSON.parse(zlib.gunzipSync(read(`docs/検証/接続条件/co-d02/saves/${name}.save.json.gz`)));}

check('input: unchanged source extraction, D58 rules/content and D03 engine/public versions',()=>{
  const raw=JSON.parse(read(E.source.path));assert.deepEqual(E.affixes,raw.affixes);assert.deepEqual(E.offers,raw.offers);assert.equal(hash(read(E.source.path)),E.source.sha256);
  assert.equal(versions.engine_version,'CW-M1-engine-0.6');assert.equal(versions.rule_set_id,'CW-M1-rules-0.5');assert.equal(versions.content_set_id,'CW-M1-SCN001-0.2');assert.equal(versions.public_contract,'CW-M1-public-0.5');
});
check('hash: SHA-256 matches Node for empty, UTF-8, padding and multi-block inputs',()=>{
  for(const text of ['', 'abc','夜潮🌊'.repeat(30),...Array.from({length:140},(_,i)=>'a'.repeat(i)), 'x'.repeat(10000)])assert.equal(sha256(text),hash(text));
});
check('affixes: every permitted composition matches independent numeric and interval accumulation',()=>{
  let n=0;
  for(const base of Object.keys(C.cards).filter(x=>C.cards[x].affix_allowlist))for(const b of variants('card',base)){
    const expected=copy(C.cards[base].card);let delta=0;
    for(const id of b.affixes)for(const [key,value]of Object.entries(E.affixes.card[id].delta))if(key==='cost')delta+=value;else expected[key]=(expected[key]||0)+value;
    expected.place_cost+=delta;expected.match_cost+=delta;
    const actual=compileCard(b);for(const key of ['power','hit','evasion','field_power','field_hit','life','place_cost','match_cost'])assert.equal(actual[key],expected[key]);n++;
  }
  assert(n>100);snapshots.composition_count=n;
});
check('affixes: incompatible family, short life, excluded trigger and duplicate affixes reject',()=>{
  for(const [kind,base,aff]of [['card','f',['heavy','light']],['card','j',['frail']],['passive','PS04',['focused_B']],['card','f',['heavy','heavy']]])assert.throws(()=>blueprint(kind,base,aff));
});
check('passives: modifiers compose strength, timing, gates and equipment cost independently',()=>{
  const b=blueprint('passive','PS02',['forceful']);assert.equal(equipmentCost(b),4);assert.deepEqual(passiveSpec(b),{field:'hit',value:30,extra_discount:-1,gates:[],equipment_cost:4});
  const baseEffect={ids:['PS04'],hit:0,power:4,discount:0},borrowed=blueprint('passive','PS04',['borrowed']);
  assert.deepEqual(adjustedEffect(baseEffect,borrowed,{origin:'P'},'P'),{ids:[],hit:0,power:0,discount:0});
  assert.equal(adjustedEffect(baseEffect,borrowed,{origin:'E1'},'P').power,6);
});
check('offers: fixed source fixture and all contexts regenerate exactly without state mutation',()=>{
  const before=hash(base);for(const batch of Object.values(base.session.economy.at.batches))assert.deepEqual(generate(batch.context),batch.candidates);assert.equal(hash(base),before);
  assert.equal(Object.values(base.session.receipts).reduce((n,r)=>n+r.gained_units,0),900);assert.deepEqual(Object.values(base.session.receipts).map(x=>x.outcome),['clear','clear','clear']);
});
check('offers: empty and short eligible pools do not fabricate or duplicate candidates',()=>{
  const ctx=Object.values(base.session.economy.at.batches)[0].context,b=blueprint('card','f');
  assert.deepEqual(drawCandidates(ctx,[]),[]);assert.equal(drawCandidates(ctx,[b]).length,1);
});
check('new campaign: zero funds/possessions/offers; unlock is not free selection or a saleable item',async()=>{
  const storage=new MemoryStore(),c=await createCampaign({storage}).create({slot_id:'initial',...versions,request_id:'initial'}),d=c.inspect().display_data;
  assert.equal(d.home.economy.unspent_units,0);assert.equal(d.home.owned.length,0);assert.equal(d.home.candidates.length,0);assert.equal(d.home.free_card_options.length,10);
  const p=currentPlan(c);p.next_preparation.deck[0]='base:nt_flow';assert.equal(comparison(c,p).display_data.preparation_comparison.refusal.code,'unknown_selection_handle');
  assert.equal(quote(c,['base:f']).display_data.error.code,'not_saleable_possession');
});
check('purchase: direct purchase commits once; replay and reopening cannot mint another UID',async()=>{
  const {c,storage,api,slot}=await open(),request=command(c,'purchase',{candidate:'choice-0'}),result=await c.execute(request);
  assert.equal(result.display_data.operation.status,'committed');assert.equal(c.inspect().display_data.home.economy.unspent_units,500);assert.equal(c.inspect().display_data.home.owned.length,1);
  const saved=c.exportSave();assert.equal((await c.execute(request)).display_data.operation.status,'replayed');assert.deepEqual(c.exportSave(),saved);assert.deepEqual((await api.open({slot_id:slot})).exportSave(),saved);
  await rejected(c,storage,slot,command(c,'purchase',{candidate:'choice-1'}),'offer_already_purchased');
  examples.push({name:'purchase-success',request,response:result.display_data});snapshots.purchased_home=copy(saved);
});
check('purchase: same request ID with different payload rejects without mutation',async()=>{
  const x=await open(),r=command(x.c,'purchase',{candidate:'choice-0'});await x.c.execute(r);
  await rejected(x.c,x.storage,x.slot,{...r,payload:{candidate:'choice-1'}},'request_conflict');
});
check('purchase: insufficient unspent funds never cancels learning implicitly',async()=>{
  const x=await open(),p=currentPlan(x.c);p.next_preparation.learn=['PS01','PS02','PS03'];await execute(x.c,'commit_preparation',{plan:p});
  assert.equal(x.c.inspect().display_data.home.economy.unspent_units,300);
  const result=await rejected(x.c,x.storage,x.slot,command(x.c,'purchase',{candidate:'choice-0'}),'insufficient_unspent_funds');examples.push({name:'insufficient-funds',response:result.display_data});
});
check('purchase: save failure and retry have no partial spend, possession or candidate consumption',async()=>{
  const x=await open(),r=command(x.c,'purchase',{candidate:'choice-0'});x.storage.failNext=true;
  await rejected(x.c,x.storage,x.slot,r,'storage_write_failed');await execute(x.c,r.type,r.payload);
  assert.equal(x.c.inspect().display_data.home.owned.length,1);assert.equal(x.c.inspect().display_data.home.economy.unspent_units,500);
});
check('transaction: old revision and mismatched view token reject before handle resolution',async()=>{
  const x=await open(),old=command(x.c,'purchase',{candidate:'choice-0'});await execute(x.c,'discard_draft',{});
  await rejected(x.c,x.storage,x.slot,old,'stale_revision');
  await rejected(x.c,x.storage,x.slot,{...command(x.c,'purchase',{candidate:'choice-0'}),view_token:old.view_token},'stale_view');
});
check('transaction: racing same purchase request is one commit plus one replay',async()=>{
  const x=await open(),other=await x.api.open({slot_id:x.slot}),r=command(x.c,'purchase',{candidate:'choice-0'});
  x.storage.beforeCommit=async()=>{const result=await other.execute(r);assert.equal(result.display_data.operation.status,'committed');};
  const result=await x.c.execute(r);assert.equal(result.display_data.operation.status,'replayed');assert.equal(x.c.inspect().display_data.home.owned.length,1);
});
check('transaction: competing different purchases lose CAS without partial local mutation',async()=>{
  const x=await open(),other=await x.api.open({slot_id:x.slot}),before=x.c.exportSave(),r=command(x.c,'purchase',{candidate:'choice-0'});
  x.storage.beforeCommit=async()=>execute(other,'purchase',{candidate:'choice-1'});
  const result=await x.c.execute(r);assert.equal(result.display_data.error.code,'stale_revision');assert.deepEqual(x.c.exportSave(),before);
  const saved=await x.storage.load(x.slot);assert.equal(Object.keys(saved.session.economy.inventory).length,1);assert.equal(Object.values(saved.session.economy.inventory)[0].blueprint.kind,'passive');
});
check('preview: purchase-before-preparation supports $purchase and matches committed preparation',async()=>{
  const x=await open(),p=planPurchase(x.c,'choice-0',{select:true}),before=x.c.exportSave(),shown=comparison(x.c,p);
  assert.equal(shown.display_data.preparation_comparison.ok,true);assert.deepEqual(x.c.exportSave(),before);
  assert(shown.display_data.details.$purchase);assert.equal(shown.display_data.preparation_comparison.purchase.selected_in_preparation,true);publicOnly(shown.display_data);
  await execute(x.c,'commit_preparation',{plan:p});const after=x.c.inspect().display_data;
  assert.equal(after.home.economy.unspent_units,shown.display_data.preparation_comparison.prepared.economy.unspent_units);
  assert.equal(after.home.owned[0].selected,true);assert.equal(after.details['owned-1'].primary.power,5);
  examples.push({name:'purchase-preparation-preview',plan:p,response:shown.display_data});
});
check('preview: purchase-after-preparation cannot use the not-yet-purchased item',async()=>{
  const x=await open(),p=planPurchase(x.c,'choice-0',{select:true,timing:'after_preparation'});
  assert.equal(comparison(x.c,p).display_data.preparation_comparison.refusal.code,'purchase_not_yet_available');
  await rejected(x.c,x.storage,x.slot,command(x.c,'commit_preparation',{plan:p}),'purchase_not_yet_available');
});
check('preview: a late invalid deck rolls back cancellation, learning and purchase together',async()=>{
  const x=await open(),p=planPurchase(x.c);p.next_preparation.learn=['PS01'];p.next_preparation.deck.pop();
  await rejected(x.c,x.storage,x.slot,command(x.c,'commit_preparation',{plan:p}),'invalid_deck_size');
});
check('preparation: historical learning refund is exact and separate from owned-item conversion',async()=>{
  const x=await open(),p=planPurchase(x.c,'choice-1',{select:true});await execute(x.c,'commit_preparation',{plan:p});
  assert.equal(x.c.inspect().display_data.home.economy.unspent_units,300);assert.equal(x.c.inspect().display_data.home.equipment.used,4);
  const q=currentPlan(x.c);q.retain_learning=[];q.cancel_learning=['PS02'];q.next_preparation.equipment=[];
  const shown=comparison(x.c,q).display_data.preparation_comparison;assert.equal(shown.cancellation.actual_refund_units,200);
  await execute(x.c,'commit_preparation',{plan:q});const d=x.c.inspect().display_data;
  assert.equal(d.home.economy.unspent_units,500);assert.equal(d.home.owned.length,1);assert.equal(d.home.owned[0].eligible,false);
  assert.equal(quote(x.c,['owned-1']).display_data.conversion_quote.total_units,50);
});
check('preparation: buying an unlearned passive is allowed; equipping it is not',async()=>{
  const x=await open();await buy(x.c,'choice-1');assert.equal(x.c.inspect().display_data.home.owned[0].eligible,false);
  const p=currentPlan(x.c);p.next_preparation.equipment=['owned-1'];
  await rejected(x.c,x.storage,x.slot,command(x.c,'commit_preparation',{plan:p}),'unlearned_equipment_base');
});
check('preparation: a physical copy is used once, same-base variants share the card cap',async()=>{
  const x=await open();await buy(x.c);let p=currentPlan(x.c);p.next_preparation.deck[0]='owned-1';p.next_preparation.deck[1]='owned-1';
  await rejected(x.c,x.storage,x.slot,command(x.c,'commit_preparation',{plan:p}),'duplicate_owned_card');
  p=currentPlan(x.c);p.next_preparation.deck[0]='owned-1';p.next_preparation.deck[1]='base:g';
  await rejected(x.c,x.storage,x.slot,command(x.c,'commit_preparation',{plan:p}),'deck_base_cap_exceeded');
});
check('unit equipment: same-base copies can stack within cost 8 but one UID cannot repeat',()=>{
  const b=blueprint('passive','PS02',['forceful']),e={profile:{learned:{PS02:2}},inventory:{a:{blueprint:b},b:{blueprint:b}}};
  assert.equal(validateEquipment(e,['owned:a','owned:b']),8);
  assert.throws(()=>validateEquipment(e,['owned:a','owned:a']),{code:'duplicate_equipment'});
  assert.throws(()=>validateEquipment(e,['owned:a','owned:b','base:PS02']),{code:'equipment_capacity_exceeded'});
});
check('draft: saved UID references protect items from conversion without modifying confirmed deck',async()=>{
  const x=await open();await buy(x.c);const p=currentPlan(x.c);p.next_preparation.deck[p.next_preparation.deck.indexOf('base:g')]='owned-1';
  await execute(x.c,'save_draft',{plan:p});assert.equal(x.c.inspect().display_data.draft.dirty,true);
  assert.equal(quote(x.c,['owned-1']).display_data.error.code,'item_in_use');
  await rejected(x.c,x.storage,x.slot,command(x.c,'convert_items',{item_ids:['owned-1']}),'item_in_use');
  await execute(x.c,'discard_draft',{});assert.equal(quote(x.c,['owned-1']).display_data.conversion_quote.total_units,50);
});
check('draft: partial legal-shaped deck remains saved as invalid, not silently discarded',async()=>{
  const x=await open(),p=currentPlan(x.c);p.next_preparation.deck.pop();await execute(x.c,'save_draft',{plan:p});
  const v=x.c.inspect().display_data;assert.equal(v.draft.valid,false);assert.equal(v.draft.plan.next_preparation.deck.length,11);assert.equal(v.draft.errors[0].code,'invalid_deck_size');
  await rejected(x.c,x.storage,x.slot,command(x.c,'depart',{case_id:'SCN-001'}),'dirty_draft');
});
check('draft: bound candidate becomes explicitly invalid after separate purchase, never another candidate',async()=>{
  const x=await open(),p=planPurchase(x.c);await execute(x.c,'save_draft',{plan:p});await buy(x.c,'choice-1');
  const d=x.c.inspect().display_data.draft;assert.equal(d.valid,false);assert.equal(d.errors[0].code,'offer_already_purchased');assert.equal(d.plan.candidate,'choice-0');
});
check('draft: missing UID and expired batch project to non-reassigning public error handles',async()=>{
  const doc=copy(base),p=planFor(doc.session);p.next_preparation.deck[0]='owned:missing-physical-copy';
  p.candidate=candidateRef(Object.keys(doc.session.economy.at.batches)[0],'choice-0');
  doc.draft=draftFor(doc.session,p,doc.revision);syncReferences(doc);const {c}=await open(doc),v=c.inspect().display_data;
  assert.equal(v.draft.valid,false);assert(v.draft.plan.candidate.startsWith('expired-candidate-'));assert(v.draft.plan.next_preparation.deck[0].startsWith('missing-owned-'));publicOnly(v);
});
check('conversion: quote is pure, conversion gives 50 units once and retains knowledge/unlocks',async()=>{
  const x=await open();await buy(x.c);const before=x.c.exportSave(),q=quote(x.c,['owned-1']);assert.equal(q.display_data.conversion_quote.total_units,50);assert.equal(q.display_data.conversion_quote.items[0].loses_variant_access,true);
  assert.deepEqual(x.c.exportSave(),before);assert.deepEqual(await x.storage.load(x.slot),before);publicOnly(q.display_data);
  const r=command(x.c,'convert_items',{item_ids:['owned-1']});await x.c.execute(r);const saved=x.c.exportSave();
  assert.equal(x.c.inspect().display_data.home.economy.unspent_units,550);assert.equal(x.c.inspect().display_data.home.owned.length,0);
  assert.deepEqual(saved.session.economy.profile.knowledge,before.session.economy.profile.knowledge);assert.deepEqual(saved.session.economy.profile.unlocked,before.session.economy.profile.unlocked);
  assert.equal((await x.c.execute(r)).display_data.operation.status,'replayed');assert.deepEqual(x.c.exportSave(),saved);
  examples.push({name:'conversion-quote',response:q.display_data});snapshots.converted_home=saved;
});
check('conversion: deleting the last plain passive copy does not delete its learned base option',async()=>{
  const x=await open();await buy(x.c,'choice-2');const p=currentPlan(x.c);p.next_preparation.learn=['PS01'];await execute(x.c,'commit_preparation',{plan:p});
  const q=quote(x.c,['owned-1']).display_data.conversion_quote;assert.equal(q.items[0].free_option_retained,true);assert.equal(q.items[0].loses_variant_access,false);
  await execute(x.c,'convert_items',{item_ids:['owned-1']});assert.deepEqual(x.c.inspect().display_data.home.economy.learned,[{base:'PS01',paid_units:200}]);
});
check('conversion: locked items reject; unlocking does not unequip or change funds',async()=>{
  const x=await open();await buy(x.c);await execute(x.c,'set_item_lock',{item_id:'owned-1',locked:true});
  assert.equal(quote(x.c,['owned-1']).display_data.error.code,'item_locked');
  await rejected(x.c,x.storage,x.slot,command(x.c,'convert_items',{item_ids:['owned-1']}),'item_locked');
  await execute(x.c,'set_item_lock',{item_id:'owned-1',locked:false});assert.equal(x.c.inspect().display_data.home.economy.unspent_units,500);
});
check('conversion: confirmed deck references block conversion even with no saved draft',async()=>{
  const x=await open();await execute(x.c,'commit_preparation',{plan:planPurchase(x.c,'choice-0',{select:true})});
  const doc=x.c.exportSave();doc.draft=null;syncReferences(doc);const y=await open(doc);
  assert.equal(quote(y.c,['owned-1']).display_data.error.code,'item_in_use');
});
check('conversion: duplicate, empty, missing, material and reserved identities cannot be sold',async()=>{
  const x=await open();await buy(x.c);
  for(const [ids,code]of [[[],'duplicate_or_empty_conversion'],[['owned-1','owned-1'],'duplicate_or_empty_conversion'],[['owned-99'],'unknown_selection_handle'],[['material:M'],'unknown_selection_handle'],[['$purchase'],'unknown_selection_handle']]){
    await rejected(x.c,x.storage,x.slot,command(x.c,'convert_items',{item_ids:ids}),code);
  }
});
check('conversion: write failure leaves original item and funds intact, retry converts once',async()=>{
  const x=await open();await buy(x.c);const r=command(x.c,'convert_items',{item_ids:['owned-1']});x.storage.failNext=true;
  await rejected(x.c,x.storage,x.slot,r,'storage_write_failed');assert.equal((await x.c.execute(r)).display_data.operation.status,'committed');assert.equal(x.c.inspect().display_data.home.economy.unspent_units,550);
});
check('conversion: sold purchase replay never recreates the item; value bands keep fractional points',async()=>{
  const x=await open(),r=command(x.c,'purchase',{candidate:'choice-0'});await x.c.execute(r);await execute(x.c,'convert_items',{item_ids:['owned-1']});
  const before=x.c.exportSave();assert.equal((await x.c.execute(r)).display_data.operation.status,'replayed');assert.deepEqual(x.c.exportSave(),before);assert.equal(before.session.economy.remainder,50);
  assert.equal(conversionUnits('ordinary'),50);assert.equal(conversionUnits('special'),100);
});
check('save validation: altered candidates, prices, inventory, economy and sale ledgers reject',async()=>{
  const x=await open();await buy(x.c);const owned=x.c.exportSave();
  const variants=[d=>{d.session.economy.profile.points++;},d=>{Object.values(d.session.economy.inventory)[0].blueprint.affixes=[];},d=>{Object.values(d.session.economy.at.batches)[0].candidates[0].price_units=0;},d=>{d.session.economy.at.current=Object.keys(d.session.economy.at.batches)[0];},d=>{delete d.session.economy.inventory[Object.keys(d.session.economy.inventory)[0]];}];
  for(const mutate of variants){const d=copy(owned);mutate(d);assert.throws(()=>validateDocument(d));}
  await execute(x.c,'convert_items',{item_ids:['owned-1']});const sold=x.c.exportSave();Object.values(sold.session.economy.sales)[0].units=100;assert.throws(()=>validateDocument(sold));
});
check('read purity: inspect/preview/quote/reopen do not change state, RNG, nonce or revision',async()=>{
  const x=await open();await buy(x.c);const before=x.c.exportSave(),disk=await x.storage.load(x.slot);
  for(let i=0;i<4;i++){x.c.inspect();comparison(x.c,currentPlan(x.c));quote(x.c,['owned-1']);await x.api.open({slot_id:x.slot});}
  assert.deepEqual(x.c.exportSave(),before);assert.deepEqual(await x.storage.load(x.slot),disk);
});
check('migration: old return migrates once atomically, preserving receipts/rewards/knowledge/content',async()=>{
  const old=oldSave('return'),original=copy(old),{c,storage,api,slot}=await open(old),d=c.exportSave();
  assert.equal(d.revision,old.revision+1);assert.deepEqual(old,original);assert.deepEqual(d.session.receipts,old.session.receipts);
  assert.deepEqual(d.session.economy.profile,old.session.economy.profile);assert.equal(d.session.active.content_set_id,old.session.active.content_set_id);
  assert.equal(d.session.economy.at.pending_contexts.length,0);assert.equal(Object.keys(d.session.economy.at.batches).length,1);
  assert.deepEqual((await api.open({slot_id:slot})).exportSave(),d);assert.deepEqual(await storage.load(slot),d);snapshots.migrated_return=d;
});
check('migration: failed upgrade keeps old slot intact; concurrent upgrade is not repeated',async()=>{
  const old=oldSave('return'),storage=new MemoryStore();storage.records.set('old',copy(old));const api=createCampaign({storage});storage.failNext=true;
  await assert.rejects(()=>api.open({slot_id:'old'}),{code:'storage_write_failed'});assert.deepEqual(await storage.load('old'),old);
  storage.beforeCommit=async()=>{await api.open({slot_id:'old'});};const c=await api.open({slot_id:'old'});assert.equal(c.exportSave().revision,old.revision+1);
});
check('migration: latest qualifying return wins; ineligible return preserves that batch',async()=>{
  const d=oldSave('second-return'),{c}=await open(d),s=c.exportSave().session;
  assert.equal(Object.keys(s.economy.at.returns).length,Object.keys(s.receipts).length);assert.equal(c.inspect().display_data.home.offers.carried_from_previous_return,true);
});
check('migration: current D58 active state/effect tuples are untouched; old active content stays pinned',async()=>{
  // Create a D58-shaped A save from a genuine new entry: strip only additive D03 preparation metadata.
  const storage=new MemoryStore(),c=await createCampaign({storage}).create({slot_id:'active',...versions,request_id:'active'});await execute(c,'depart',{case_id:'SCN-001'});
  const d=c.exportSave();d.engine_version='CW-M1-engine-0.5';delete d.session.economy.runtime_version;delete d.session.economy.at.version;
  delete d.session.game.state.economy_version;delete d.session.game.state.ah.equipment_entries;
  for(const card of Object.values(d.session.game.state.cards))delete card.selection_id;
  const state=copy(d.session.game);const migrated=validateDocument(d);assert.deepEqual(migrated.session.game,state);
  const legacy=oldSave('entry'),restored=validateDocument(legacy);assert.equal(restored.session.active.content_set_id,'CW-M1-SCN001-0.1');
});
check('migration: tampered pending context, missing context and unknown version reject, never initialize',async()=>{
  for(const mutate of [d=>{d.session.economy.at.pending_contexts[0].card_bases=[];},d=>{d.session.economy.at.pending_contexts=[];},d=>{d.engine_version='CW-M1-engine-9';}]){
    const old=oldSave('return');mutate(old);const storage=new MemoryStore();storage.records.set('bad',copy(old));
    await assert.rejects(()=>createCampaign({storage}).open({slot_id:'bad'}));assert.deepEqual(await storage.load('bad'),old);
  }
});
check('migration: explicit import upgrades without overwriting the source or existing destination',async()=>{
  const old=oldSave('home'),before=copy(old),storage=new MemoryStore(),api=createCampaign({storage});
  const c=await api.importSave({slot_id:'import',document:old,request_id:'import-d03'});assert.deepEqual(old,before);assert.equal(c.exportSave().engine_version,versions.engine_version);
  await assert.rejects(()=>api.importSave({slot_id:'import',document:old,request_id:'different'}),{code:'slot_not_empty'});
});
check('return: read-only comparison is allowed but purchase/convert/lock remain blocked before acknowledgment',async()=>{
  const x=await open(oldSave('return'));assert.equal(comparison(x.c,currentPlan(x.c)).display_data.preparation_comparison.ok,true);
  for(const [type,payload]of [['purchase',{candidate:'choice-0'}],['convert_items',{item_ids:[]}],['set_item_lock',{item_id:'owned-1',locked:false}]])await rejected(x.c,x.storage,x.slot,command(x.c,type,payload),'return_not_acknowledged');
});
check('journey: acquired modified card reaches next run, one-step preview equals execution, resume is exact',async()=>{
  const x=await open();await execute(x.c,'commit_preparation',{plan:planPurchase(x.c,'choice-0',{select:true})});await execute(x.c,'depart',{case_id:'SCN-001'});
  const d=x.c.exportSave(),initial=Object.values(d.session.game.state.cards).find(c=>c.type==='AO1:card:g:sturdy');assert(initial);assert.equal(initial.power,5);assert.equal(initial.evasion,-10);
  assert.equal(d.session.economy.inventory[initial.selection_id.slice(6)].blueprint.key,initial.type);
  await execute(x.c,'continue_scene',{scene_id:x.c.inspect().display_data.scene.id});
  const view=x.c.inspect(),choice=choose(x.c),p=x.c.previewAction({view_token:view.meta.view_token,choice}).display_data.action_preview;
  const g=restoreGame(x.c.exportSave().session);g.play('P',choice);const row=g.trace.findLast(x=>x.type==='action'&&x.actor==='P');assert.equal(row.action_cost,p.action_cost);assert.equal(row.actual_hp_loss,p.actual_hp_loss);
  await execute(x.c,'play',{choice});const saved=x.c.exportSave();assert.deepEqual((await x.api.open({slot_id:x.slot})).exportSave(),saved);publicOnly(x.c.inspect().display_data);snapshots.purchased_exploring=saved;
});
check('journey: purchased passive details, capacity and launched equipment use one compiled specification',async()=>{
  const x=await open();await execute(x.c,'commit_preparation',{plan:planPurchase(x.c,'choice-1',{select:true})});
  const v=x.c.inspect().display_data;assert.equal(v.details['owned-1'].effect.value,30);assert.equal(v.details['owned-1'].equipment_cost,4);assert.equal(v.home.equipment.used,4);
  await execute(x.c,'depart',{case_id:'SCN-001'});const g=restoreGame(x.c.exportSave().session);g.s.ah.pending.last_match_attr='D';
  const card=Object.values(g.s.cards).find(c=>c.origin==='P'&&c.kind==='attack'&&c.attr!=='D');g.s.field[card.attr]='fixture';
  const effect=g.effect('P',card);assert.equal(effect.hit,30);assert.equal(effect.discount,-1);
});
check('journey: departure and empty withdrawal keep the purchased batch, inventory and no extra points',async()=>{
  const x=await open();await buy(x.c);const before=x.c.exportSave().session.economy;
  await execute(x.c,'depart',{case_id:'SCN-001'});await execute(x.c,'withdraw',{});
  assert.equal(x.c.inspect().display_data.home.offers.status,'purchased');assert.equal(x.c.inspect().display_data.home.offers.carried_from_previous_return,true);
  assert.deepEqual(x.c.exportSave().session.economy.inventory,before.inventory);assert.equal(x.c.inspect().display_data.home.economy.unspent_units,500);
  await ack(x.c);assert.equal(x.c.inspect().display_data.home.candidates.every(x=>!x.available),true);
});
check('public: bases, candidates, owned details, draft errors and quotes contain no private identifiers',async()=>{
  const x=await open();publicOnly(x.c.inspect().display_data);await buy(x.c);publicOnly(x.c.inspect().display_data);publicOnly(quote(x.c,['owned-1']).display_data);
  const p=currentPlan(x.c);p.next_preparation.deck[0]='owned-1';await execute(x.c,'save_draft',{plan:p});publicOnly(x.c.inspect().display_data);
});

check('offers: unchanged AT draw algorithm matches 64 contexts with the M1 namespace and pool',()=>{
  const text=read('docs/検証/資源用途/at/offers.cjs').toString();
  const generateSource=text.slice(text.indexOf('function generate(context)'),text.indexOf('\nfunction validate(state)'));
  const pool=context=>[...context.card_bases.map(b=>['card',b]),...E.offers.passive_pool.map(b=>['passive',b])]
    .flatMap(([kind,b])=>variants(kind,b,context.content_set_id)).filter(b=>!b.affixes.length||b.affixes.some(id=>E.affixes[b.kind][id].benefit));
  // Execute only the previously reviewed pure AT generator, not the historical session/suite.
  const reference=new Function('crypto','cfg','pool','copy','check',generateSource+';return generate;')(crypto,E.offers,pool,copy,(x,m)=>assert(x,m));
  const original=Object.values(base.session.economy.at.batches)[0].context;
  for(let i=0;i<64;i++){const context={...original,seed:i,index:i};assert.deepEqual(generate(context),reference(context));}
});
check('resolver: card tempo delta is applied once before passive discount, preview and execution agree',async()=>{
  const b=blueprint('card','f',['light']),inventory={fixture:{uid:'fixture',blueprint:b,band:'ordinary',locked:false}};
  const deck=copy(base.session.au.deck);deck[deck.indexOf('base:f')]='owned:fixture';
  const saved=await departGame({target_set_id:'SCN-001-SET-UNRESOLVED',run:'D03-unit-cost',seed:0,deck,equipped:['base:PS01'],learned:['PS01'],knowledge:{schema:'AD1',events:[],encounters:[]},inventory});
  const session={active:{target_set_id:'SCN-001-SET-UNRESOLVED',content_set_id:C.content_set_id},game:saved},g=restoreGame(session),p=g.s.actors.P;
  const id=p.deck.find(id=>g.s.cards[id].type===b.key);p.deck.splice(p.deck.indexOf(id),1);p.hand.push(id);g.s.cards[id].remaining=g.s.cards[id].life;
  g.s.ah.pending.after_guard=true;const choice={card_id:id,target:null},prediction=g.predict(choice);
  assert.equal(prediction.action_cost,7);g.play('P',choice);assert.equal(p.next_at-g.s.now,7);assert.equal(g.s.cards[id].place_cost,9);
});
check('resolver: distinct same-base passive copies add their effects rather than deduplicating',async()=>{
  const x=await open();await execute(x.c,'commit_preparation',{plan:planPurchase(x.c,'choice-1',{select:true})});
  const p=currentPlan(x.c);p.next_preparation.equipment.push('base:PS02');await execute(x.c,'commit_preparation',{plan:p});
  assert.equal(x.c.inspect().display_data.home.equipment.used,7);await execute(x.c,'depart',{case_id:'SCN-001'});
  const g=restoreGame(x.c.exportSave().session);g.s.ah.pending.last_match_attr='D';
  const card=Object.values(g.s.cards).find(c=>c.origin==='P'&&c.kind==='attack'&&c.attr!=='D');g.s.field[card.attr]='unit-trigger';
  const effect=g.effect('P',card);assert.equal(effect.hit,50);assert.equal(effect.discount,-1);assert.deepEqual(effect.ids,['PS02','PS02']);
});
check('save validation: changing compiled owned-card stats or launched equipment metadata is rejected',async()=>{
  const x=await open();await execute(x.c,'commit_preparation',{plan:planPurchase(x.c,'choice-0',{select:true})});await execute(x.c,'depart',{case_id:'SCN-001'});
  const d=x.c.exportSave(),card=Object.values(d.session.game.state.cards).find(c=>c.type==='AO1:card:g:sturdy');card.power++;
  assert.throws(()=>validateDocument(d));const y=await open();await execute(y.c,'commit_preparation',{plan:planPurchase(y.c,'choice-1',{select:true})});await execute(y.c,'depart',{case_id:'SCN-001'});
  const v=y.c.exportSave();v.session.game.state.ah.equipment_entries[0].cost=0;assert.throws(()=>validateDocument(v));
});

after(()=>{
  if(!output)return;fs.mkdirSync(output,{recursive:true});
  const summary={check_id:'CW-M1-D03-001',environment:{node:process.version,storage:'MemoryStore',real_indexeddb:false,browser_rendering:false,human_evaluation:false},
    fixture:{path:'test/runtime/d03-natural-home.json.br.b64',decoded_sha256:hash(sourceBytes),provenance:'Three public-controller clear journeys, no reward/funds injection; actions 43,32,64; fresh default preparation.'},
    checks:records,passed:records.filter(x=>x.pass).length,failed:records.filter(x=>!x.pass).length,card_compositions:snapshots.composition_count};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(summary,null,2)+'\n');
  const fields=['public_contract','phase','capabilities','home','details','draft','preparation_comparison','conversion_quote','operation','error'];
  const compact=examples.map(({name,request,response})=>({name,projection:'D03-related display_data fields; unrelated text/knowledge histories omitted',...(request?{request}:{}),
    response:Object.fromEntries(fields.filter(k=>response[k]!==null&&response[k]!==undefined).map(k=>[k,k==='details'?Object.fromEntries(Object.entries(response.details).filter(([id])=>!id.startsWith('base:'))):response[k]]))}));
  fs.writeFileSync(path.join(output,'public-examples.json'),JSON.stringify(compact,null,2)+'\n');
  for(const [name,document]of Object.entries(snapshots))if(typeof document==='object')fs.writeFileSync(path.join(output,name+'.save.json.br.b64'),zlib.brotliCompressSync(Buffer.from(JSON.stringify(document))).toString('base64')+'\n');
});
