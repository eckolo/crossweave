// CO-D03R only: changed ownership / transaction / migration boundaries.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {migrateLegacyDefense} from '../../src/runtime/defense.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {draftFor as legacyDraft,preview as legacyPreview,planFor as legacyPlan} from '../../src/runtime/preparation-legacy.mjs';
import {syncReferences,resolve} from '../../src/runtime/items.mjs';
import {copy,canonical} from '../../src/runtime/common.mjs';
import {MemoryStore,command,execute,currentPlan,choose} from './support.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p));
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
function load(p){const b=read(p);return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):zlib.brotliDecompressSync(Buffer.from(b.toString().trim(),'base64')));}
const sourcePath='test/runtime/d03-natural-home.json.br.b64',base=load(sourcePath),records=[],examples=[],snapshots={},migration=[];
const output=process.env.D03R_OUTPUT;
function check(name,fn){test(name,async()=>{try{await fn();records.push({name,pass:true});}catch(e){records.push({name,pass:false,error:e.message});throw e;}});}
async function open(document=base){const storage=new MemoryStore(),slot='test';storage.records.set(slot,copy(document));const api=createCampaign({storage}),c=await api.open({slot_id:slot});return {storage,slot,api,c};}
async function start(){const storage=new MemoryStore(),slot='initial',api=createCampaign({storage});const c=await api.create({slot_id:slot,request_id:'initial',...versions});return {storage,slot,api,c};}
const home=c=>c.inspect().display_data.home;
function plan(c,id=null,{equip=true}={}){const p=currentPlan(c);if(!id)return p;const r=home(c).acquisition.find(x=>x.id===id);assert(r,id);p.acquire=[id];if(equip){if(r.blueprint.kind==='passive')p.composition.equipment=[r.pending_selection_id];else{
 const i=home(c).owned.find(x=>x.selected&&x.blueprint.base===r.blueprint.base)?.id;
 p.composition.deck[p.composition.deck.indexOf(i)<0?0:p.composition.deck.indexOf(i)]=r.pending_selection_id;
}}return p;}
function preview(c,p){const v=c.previewPreparation({view_token:c.inspect().meta.view_token,plan:p});assert(!v.display_data.error,JSON.stringify(v.display_data.error));return v.display_data.preparation_comparison;}
async function reject(x,r,code){const a=x.c.exportSave(),b=await x.storage.load(x.slot),v=await x.c.execute(r);assert.equal(v.display_data.error?.code,code,JSON.stringify(v.display_data.error));assert.deepEqual(x.c.exportSave(),a);assert.deepEqual(await x.storage.load(x.slot),b);publicOnly(v);return v;}
async function ack(c){while(c.inspect().display_data.scene?.paused)await execute(c,'continue_scene',{scene_id:c.inspect().display_data.scene.id});await execute(c,'ack_return',{});}
const confirm=(c,p)=>execute(c,'commit_preparation',{plan:p});
function publicOnly(v){const text=JSON.stringify(v);for(const privateText of ['CW-M1-grant-1','CW-M1-basic-1','CW-M1-offer-1','CW-M1-candidate-1','CW-M1-run-1','owned:[','request_log','future_rng',base.session.campaign_id])assert(!text.includes(privateText),privateText);}
function sameCombat(a,b){const normalize=x=>{const n=copy(x);if(!n.state.defense_rule)migrateLegacyDefense(n.state);delete n.state.economy_version;delete n.state.ah.equipment_entries;delete n.state.ah.equipped;for(const c of Object.values(n.state.cards))delete c.selection_id;return n;};assert.deepEqual(normalize(a),normalize(b));}
check('versions: save2 / preparation2 / public0.6; combat and authored content pinned',()=>{
 assert.equal(versions.schema,'CW-M1-save-2');assert.equal(versions.engine_version,'CW-M1-engine-0.7');assert.equal(versions.public_contract,'CW-M1-public-0.6');assert.equal(versions.rule_set_id,'CW-M1-rules-0.5');assert.equal(versions.content_set_id,'CW-M1-SCN001-0.2');
});
check('new start: 20 real initial units, 12 selected, zero funds, no offer group',async()=>{
 const {c}=await start(),h=home(c);assert.equal(h.owned.length,20);assert.equal(new Set(h.owned.map(x=>x.id)).size,20);assert.equal(h.groups.length,10);assert(h.groups.every(g=>g.quantity===2));assert.equal(h.owned.filter(x=>x.selected).length,12);assert.equal(h.economy.unspent_units,0);assert.equal(h.offers.status,'none');assert.equal(h.acquisition_groups.find(g=>g.id==='return-offer').status,'none');assert.equal(h.acquisition.length,4);assert(h.acquisition.every(x=>x.price_units===200));publicOnly(c.inspect());examples.push({name:'new-start',response:c.inspect()});snapshots.initial=c.exportSave();
});
check('preview: initial composition rearrangement is pure and public groups partition all individuals',async()=>{
 const x=await start(),before=x.c.exportSave(),p=plan(x.c),h=home(x.c);const spare=h.owned.find(x=>!x.selected&&x.blueprint.base==='j');p.composition.deck[0]=spare.id;
 const v=preview(x.c,p);assert(v.ok);assert(v.prepared.owned.find(x=>x.id===spare.id).selected);assert.equal(v.payment.cost_units,0);
 for(const g of v.prepared.groups)assert.equal(g.quantity,g.possession_ids.length+g.composition_ids.length);
 assert.deepEqual(x.c.exportSave(),before);assert.deepEqual(await x.storage.load(x.slot),before);await confirm(x.c,p);assert.equal(home(x.c).economy.unspent_units,0);
});
check('preview: acquisition, unequip, cancel and reselection do not save or spend',async()=>{
 const x=await open(),before=x.c.exportSave();const p=plan(x.c,'choice-1');let v=preview(x.c,p);assert(v.ok);assert.equal(v.payment.cost_units,400);assert(v.prepared.owned.some(x=>x.id==='pending:choice-1'&&x.pending&&x.selected));
 p.composition.equipment=[];assert(preview(x.c,p).ok);p.acquire=[];v=preview(x.c,p);assert(v.ok);assert.equal(v.payment.cost_units,0);
 assert(preview(x.c,plan(x.c,'choice-0')).ok);assert.deepEqual(x.c.exportSave(),before);assert.deepEqual(await x.storage.load(x.slot),before);examples.push({name:'cancel-before-payment',response:v});
});
check('atomic: modified passive plus basic passive uses one commit and no extra type learning',async()=>{
 const x=await open(),p=plan(x.c,'choice-1');p.acquire.push('basic:PS01');p.composition.equipment.push('pending:basic:PS01');const n=x.c.inspect().meta.revision;
 const v=preview(x.c,p);assert(v.ok);assert.equal(v.payment.cost_units,600);assert.equal(v.prepared.economy.unspent_units,300);assert.equal(v.prepared.equipment.entries.length,2);publicOnly(v);
 const request=command(x.c,'commit_preparation',{plan:p}),r=await x.c.execute(request);assert(!r.display_data.error,JSON.stringify(r.display_data.error));assert.equal(r.meta.revision,n+1);assert.equal(home(x.c).owned.length,22);assert.equal(home(x.c).economy.unspent_units,300);assert.deepEqual(x.c.exportSave().session.economy.profile.learned,{});
 assert.equal(home(x.c).offers.status,'purchased');assert.equal(home(x.c).candidates.length,0);assert.equal(home(x.c).acquisition_groups.find(g=>g.id==='return-offer').status,'acquired');assert(home(x.c).acquisition.every(x=>!x.id.startsWith('choice-')));
 examples.push({name:'modified-passive-and-basic-atomic',request,preview:v,response:r});snapshots.acquired=x.c.exportSave();
});
check('atomic: modified card replaces initial unit and departure uses its exact variant',async()=>{
 const x=await open(),p=plan(x.c,'choice-0');const v=preview(x.c,p);assert(v.ok);await confirm(x.c,p);const confirmed=x.c.exportSave().session.au.deck;
 await execute(x.c,'depart',{case_id:'SCN-001'});const d=x.c.exportSave();assert.deepEqual(d.session.au.deck,confirmed);
 const cards=Object.values(d.session.game.state.cards).filter(x=>x.origin==='P'&&x.birth==='initial');assert.equal(cards.length,12);assert.deepEqual(cards.map(x=>x.selection_id).sort(),[...confirmed].sort());assert(cards.some(c=>c.type==='AO1:card:g:sturdy'));validateDocument(d);publicOnly(x.c.inspect());snapshots.departed=d;examples.push({name:'modified-card',preview:v});
});
check('departure: acquired unlearned passive entries apply and survive play, return and reload',async()=>{
 const x=await open();await confirm(x.c,plan(x.c,'choice-1'));await execute(x.c,'depart',{case_id:'SCN-001'});
 let d=x.c.exportSave();assert.deepEqual(d.session.game.state.ah.learned,[]);assert.equal(d.session.game.state.ah.equipment_entries[0].blueprint.key,'AO1:passive:PS02:forceful');
 while(x.c.inspect().display_data.scene?.paused)await execute(x.c,'continue_scene',{scene_id:x.c.inspect().display_data.scene.id});
 await execute(x.c,'play',{choice:choose(x.c)});await execute(x.c,'withdraw',{});await ack(x.c);d=x.c.exportSave();assert.deepEqual((await x.api.open({slot_id:x.slot})).exportSave(),d);
});
check('limits: insufficient total funds cannot partially acquire or consume a candidate',async()=>{
 const x=await start(),p=plan(x.c,'basic:PS01');const v=preview(x.c,p);assert.equal(v.refusal.code,'insufficient_unspent_funds');assert.equal(v.refusal.details.required_units,200);
 await reject(x,command(x.c,'commit_preparation',{plan:p}),'insufficient_unspent_funds');examples.push({name:'insufficient-funds',response:v});
});
check('limits: one return-offer per group and one base catalogue stock; pending requires acquisition',async()=>{
 const x=await open(),p=plan(x.c,'choice-1');p.acquire.push('choice-0');assert.equal(preview(x.c,p).refusal.code,'acquisition_group_limit');await reject(x,command(x.c,'commit_preparation',{plan:p}),'acquisition_group_limit');
 const q=plan(x.c);q.composition.equipment=['pending:choice-1'];assert.equal(preview(x.c,q).refusal.code,'unselected_acquisition');
 await confirm(x.c,plan(x.c,'basic:PS01'));assert(!home(x.c).acquisition.some(r=>r.id==='basic:PS01'));const r=plan(x.c);r.acquire=['basic:PS01'];assert.equal(preview(x.c,r).refusal.code,'acquisition_not_available');
});
check('limits: equipment capacity, duplicate individual and deck size/base cap reject atomically',async()=>{
 const x=await open(),a=plan(x.c);a.acquire=['basic:PS01','basic:PS02','basic:PS03','basic:PS04'];a.composition.equipment=a.acquire.map(id=>'pending:'+id);
 assert.equal(preview(x.c,a).refusal.code,'equipment_capacity_exceeded');await reject(x,command(x.c,'commit_preparation',{plan:a}),'equipment_capacity_exceeded');
 a.composition.equipment=a.composition.equipment.slice(0,3);await confirm(x.c,a);
 const b=plan(x.c);b.composition.equipment.push(b.composition.equipment[0]);await reject(x,command(x.c,'commit_preparation',{plan:b}),'invalid_equipment_list');
 const c=plan(x.c);c.composition.deck[1]=c.composition.deck[0];assert.equal(preview(x.c,c).refusal.code,'duplicate_owned_card');
 const e=plan(x.c);e.composition.deck.pop();assert.equal(preview(x.c,e).refusal.code,'invalid_deck_size');
 const y=await open();await confirm(y.c,plan(y.c,'choice-0',{equip:false}));const over=plan(y.c),h=home(y.c),g=h.owned.filter(x=>x.blueprint.base==='g');
 over.composition.deck=over.composition.deck.filter(id=>!g.some(x=>x.id===id));over.composition.deck.splice(0,g.length,...g.map(x=>x.id));while(over.composition.deck.length<12)over.composition.deck.push(h.owned.find(x=>x.blueprint.base==='j').id);
 assert.equal(preview(y.c,over).refusal.code,'deck_base_cap_exceeded');
});
check('save failure: acquired inventory, funds, composition and offer selection all stay unchanged',async()=>{
 const x=await open(),r=command(x.c,'commit_preparation',{plan:plan(x.c,'choice-1')});x.storage.failNext=true;await reject(x,r,'storage_write_failed');const ok=await x.c.execute(r);assert.equal(ok.display_data.operation.status,'committed');assert.equal(home(x.c).economy.unspent_units,500);
});
check('replay: one request commits once; conflict rejects; reopen/import do not migrate again',async()=>{
 const x=await open(),r=command(x.c,'commit_preparation',{plan:plan(x.c,'choice-1')});await x.c.execute(r);const d=x.c.exportSave();assert.equal((await x.c.execute(r)).display_data.operation.status,'replayed');assert.deepEqual(x.c.exportSave(),d);
 await reject(x,{...r,payload:{plan:plan(x.c)}},'request_conflict');assert.deepEqual((await x.api.open({slot_id:x.slot})).exportSave(),d);assert.deepEqual(validateDocument(d),d);
 const imported=await x.api.importSave({slot_id:'copy',document:d,request_id:'import'});assert.deepEqual(imported.exportSave().session,d.session);
});
check('stale revision/token: refreshed handles are never substituted into an old request',async()=>{
 const x=await open(),r=command(x.c,'commit_preparation',{plan:plan(x.c,'choice-0')});await execute(x.c,'discard_draft',{});await reject(x,r,'stale_revision');
 await reject(x,{...r,expected_revision:x.c.inspect().meta.revision},'stale_view');
});
check('CAS: concurrent same request is commit+replay, different request stays uncommitted',async()=>{
 const x=await open(),other=await x.api.open({slot_id:x.slot}),r=command(x.c,'commit_preparation',{plan:plan(x.c,'choice-1')});x.storage.beforeCommit=()=>other.execute(r);
 assert.equal((await x.c.execute(r)).display_data.operation.status,'replayed');assert.equal(home(x.c).owned.length,21);
 const y=await open(),other2=await y.api.open({slot_id:y.slot}),r2=command(y.c,'commit_preparation',{plan:plan(y.c,'choice-1')});const original=y.c.exportSave();y.storage.beforeCommit=()=>execute(other2,'discard_draft',{});
 assert.equal((await y.c.execute(r2)).display_data.error.code,'stale_revision');assert.deepEqual(y.c.exportSave(),original);assert.equal(Object.keys((await y.storage.load(y.slot)).session.economy.inventory).length,20);
});
check('draft: saved pending references protect existing possessions; reload/discard cannot charge',async()=>{
 const x=await open(),p=plan(x.c,'choice-1');await execute(x.c,'save_draft',{plan:p});assert.equal(home(x.c).economy.unspent_units,900);const d=x.c.exportSave();assert(d.draft.dirty);assert.deepEqual((await x.api.open({slot_id:x.slot})).exportSave(),d);await reject(x,command(x.c,'depart',{case_id:'SCN-001'}),'dirty_draft');await execute(x.c,'discard_draft',{});assert.equal(home(x.c).owned.length,20);assert.equal(home(x.c).economy.unspent_units,900);
});
check('conversion/lock: acquired items use existing safeguards; no learning refund; initial rights cannot mint currency',async()=>{
 const x=await open();await confirm(x.c,plan(x.c,'choice-1'));let item=home(x.c).owned.find(r=>r.blueprint.affixes.length);await reject(x,command(x.c,'convert_items',{item_ids:[item.id]}),'item_in_use');
 const p=plan(x.c);p.composition.equipment=[];await confirm(x.c,p);item=home(x.c).owned.find(r=>r.blueprint.affixes.length);await execute(x.c,'set_item_lock',{item_id:item.id,locked:true});await reject(x,command(x.c,'convert_items',{item_ids:[item.id]}),'item_locked');await execute(x.c,'set_item_lock',{item_id:item.id,locked:false});
 const quote=x.c.quoteConversion({view_token:x.c.inspect().meta.view_token,item_ids:[item.id]});assert.equal(quote.display_data.conversion_quote.learning_refund_units,0);assert.equal(quote.display_data.conversion_quote.units,50);await execute(x.c,'convert_items',{item_ids:[item.id]});assert.equal(home(x.c).economy.unspent_units,550);
 const initial=home(x.c).owned.find(r=>!r.selected);assert(!initial.convertible);await reject(x,command(x.c,'convert_items',{item_ids:[initial.id]}),'initial_grant_not_convertible');assert.deepEqual((await x.api.open({slot_id:x.slot})).exportSave(),x.c.exportSave());
});
check('basic conversion: low-efficiency sale restores catalogue stock without refund or duplicated grant',async()=>{
 const x=await open();await confirm(x.c,plan(x.c,'basic:PS01',{equip:false}));const id=home(x.c).owned.find(x=>x.blueprint.kind==='passive').id;await execute(x.c,'convert_items',{item_ids:[id]});assert.equal(home(x.c).economy.unspent_units,750);assert(home(x.c).acquisition.some(x=>x.id==='basic:PS01'));await confirm(x.c,plan(x.c,'basic:PS01'));assert.equal(home(x.c).economy.unspent_units,550);validateDocument(x.c.exportSave());
});
check('public diagnostics: invalid pending card selection stays public in preview, commit and saved draft',async()=>{
 const x=await open(),p=plan(x.c,'choice-0');p.composition.deck[1]='pending:choice-0';
 const v=preview(x.c,p);assert.equal(v.refusal.code,'duplicate_owned_card');publicOnly(v);assert.deepEqual(v.refusal.related_ids,['pending:choice-0']);
 await reject(x,command(x.c,'commit_preparation',{plan:p}),'duplicate_owned_card');await execute(x.c,'save_draft',{plan:p});publicOnly(x.c.inspect());
 assert.deepEqual(x.c.inspect().display_data.draft.errors[0].related_ids,['pending:choice-0']);const reopened=await x.api.open({slot_id:x.slot});publicOnly(reopened.inspect());
});
check('migration replay: request committed on D03 remains replayable without another acquisition',async()=>{
 const old=load('docs/検証/接続条件/co-d03/purchased_home.save.json.br.b64'),x=await open(old);
 const [request_id,row]=Object.entries(old.request_log).find(([,r])=>JSON.parse(r.signature).type==='purchase');const operation=JSON.parse(row.signature),before=x.c.exportSave();
 const response=await x.c.execute({request_id,expected_revision:old.revision,view_token:old.view_nonce,...operation});assert.equal(response.display_data.operation.status,'replayed');assert.deepEqual(x.c.exportSave(),before);
});
check('legacy API: direct purchase and refund-bearing old plan are explicitly refused',async()=>{
 const x=await open();await reject(x,command(x.c,'purchase',{candidate:'choice-0'}),'use_commit_preparation');await reject(x,command(x.c,'commit_preparation',{plan:legacyPlan(base.session)}),'preparation_contract_changed');
});
const fixturePaths=[sourcePath,...fs.readdirSync(path.join(root,'docs/検証/接続条件/co-d03')).filter(x=>x.endsWith('.br.b64')).map(x=>'docs/検証/接続条件/co-d03/'+x),...fs.readdirSync(path.join(root,'docs/検証/接続条件/co-d02/saves')).filter(x=>x.endsWith('.gz')).map(x=>'docs/検証/接続条件/co-d02/saves/'+x)];
for(const f of fixturePaths)check('migration: '+f,async()=>{
 const old=load(f),oldHash=hash(old),x=await open(old),n=x.c.exportSave();assert.equal(hash(old),oldHash);assert.equal(n.revision,old.revision+1);assert.equal(n.schema,'CW-M1-save-2');assert.deepEqual(n.session.economy.profile,old.session.economy.profile);assert.deepEqual(n.casebook,old.casebook);assert.deepEqual(n.session.receipts,old.session.receipts);assert.deepEqual(n.session.active,old.session.active);assert.deepEqual(n.public_history,old.public_history);assert.deepEqual(n.session.action_history,old.session.action_history);
 for(const [uid,row]of Object.entries(old.session.economy.inventory))assert.deepEqual(n.session.economy.inventory[uid],row);
 if(old.engine_version==='CW-M1-engine-0.6'){assert.deepEqual(n.session.economy.at,old.session.economy.at);assert.deepEqual(n.session.economy.sales,old.session.economy.sales);}
 if(old.session.game)sameCombat(old.session.game,n.session.game);
 assert.deepEqual(validateDocument(n),n);assert.deepEqual((await x.api.open({slot_id:x.slot})).exportSave(),n);publicOnly(x.c.inspect());migration.push({source:f,source_sha256:hash(read(f)),source_engine:old.engine_version,phase:old.session.phase,revision_before:old.revision,revision_after:n.revision,owned_before:Object.keys(old.session.economy.inventory).length,owned_after:Object.keys(n.session.economy.inventory).length,balance_unchanged:true,combat_unchanged:true});
});
check('migration failure: write denial, invalid source and unsupported schema leave source intact',async()=>{
 const storage=new MemoryStore();storage.records.set('old',copy(base));storage.failNext=true;const api=createCampaign({storage});await assert.rejects(api.open({slot_id:'old'}),{code:'storage_write_failed'});assert.deepEqual(await storage.load('old'),base);
 for(const mut of [d=>d.schema='unknown',d=>d.engine_version='CW-M1-engine-9',d=>d.session.economy.profile.points++]){
 const d=copy(base);mut(d);storage.records.set('bad',d);await assert.rejects(api.open({slot_id:'bad'}));assert.deepEqual(await storage.load('bad'),d);
 }
 await api.open({slot_id:'old'});assert.equal((await storage.load('old')).revision,base.revision+1);
});
check('migration CAS: two open calls perform a single durable upgrade',async()=>{
 const storage=new MemoryStore();storage.records.set('old',copy(base));const api=createCampaign({storage});storage.beforeCommit=()=>api.open({slot_id:'old'});const c=await api.open({slot_id:'old'});assert.equal(c.exportSave().revision,base.revision+1);assert.equal(Object.keys(c.exportSave().request_log).filter(x=>x.startsWith('migration-CW-M1-D03R')).length,1);
});
function learnedSource(){const d=copy(base),p=legacyPlan(d.session);p.next_preparation.learn=['PS01'];p.next_preparation.equipment=['base:PS01'];const r=legacyPreview(d.session,p);assert(r.ok);d.session=r.next;d.draft=legacyDraft(d.session,legacyPlan(d.session),d.revision);syncReferences(d);return d;}
check('migration: paid learning becomes one equipable individual, historical payment and balance stay exact',async()=>{
 const old=learnedSource(),x=await open(old);assert.equal(home(x.c).economy.unspent_units,700);assert.equal(home(x.c).economy.historical_learning_units,200);assert.equal(home(x.c).owned.filter(x=>x.blueprint.kind==='passive').length,1);assert(home(x.c).equipment.entries[0].id.startsWith('owned-'));const p=plan(x.c);p.composition.equipment=[];const v=preview(x.c,p);assert.equal(v.payment.refund_units,0);assert.equal(v.payment.unspent_after_units,700);await confirm(x.c,p);const id=home(x.c).owned.find(x=>x.blueprint.kind==='passive').id;await execute(x.c,'convert_items',{item_ids:[id]});assert.equal(home(x.c).economy.unspent_units,750);assert.equal(home(x.c).economy.historical_learning_units,200);validateDocument(x.c.exportSave());examples.push({name:'legacy-learning-migration',response:v});
});
check('migration: old dirty refund draft is archived and blocks departure until explicit review/discard',async()=>{
 const old=learnedSource(),p=legacyPlan(old.session);p.retain_learning=[];p.cancel_learning=['PS01'];p.next_preparation.equipment=[];old.draft=legacyDraft(old.session,p,old.revision);syncReferences(old);
 const x=await open(old),v=x.c.inspect();snapshots.migrated_review=x.c.exportSave();assert.deepEqual(x.c.exportSave().acquisition_migration.legacy_draft,old.draft);assert(v.display_data.migration_notice.review_required);assert(v.display_data.draft.dirty);assert(!v.display_data.draft.valid);assert.equal(home(x.c).economy.unspent_units,700);publicOnly(v);
 await reject(x,command(x.c,'commit_preparation',{plan:currentPlan(x.c)}),'migrated_draft_requires_review');await reject(x,command(x.c,'depart',{case_id:'SCN-001'}),'dirty_draft');await execute(x.c,'discard_draft',{});assert(!x.c.inspect().display_data.migration_notice.review_required);assert.equal(home(x.c).economy.unspent_units,700);examples.push({name:'legacy-draft-review',response:v});
});
check('migration: locked purchased item and saved references survive; tampering grants/payment is rejected',async()=>{
 const old=load('docs/検証/接続条件/co-d03/purchased_home.save.json.br.b64');const uid=Object.keys(old.session.economy.inventory)[0];old.session.economy.inventory[uid].locked=true;const x=await open(old);assert(x.c.exportSave().session.economy.inventory[uid].locked);
 for(const mutate of [d=>{delete d.session.economy.inventory[Object.keys(d.session.economy.unified.grants)[0]];},d=>{d.session.economy.unified.legacy_learning.PS01=1;},d=>{delete d.session.economy.unified;}]){const d=x.c.exportSave();mutate(d);assert.throws(()=>validateDocument(d));}
});
check('offers: no-reward return retains unpurchased group and never represents a read failure as empty',async()=>{
 const x=await open(),candidates=copy(home(x.c).candidates);await execute(x.c,'depart',{case_id:'SCN-001'});await execute(x.c,'withdraw',{});await ack(x.c);assert.deepEqual(home(x.c).candidates,candidates);assert.equal(home(x.c).offers.status,'available');assert(home(x.c).offers.carried_from_previous_return);examples.push({name:'retained-unpurchased-group',response:x.c.inspect()});
 const api=createCampaign({storage:{load:async()=>{throw Object.assign(Error('read failed'),{code:'storage_read_failed'});}}});await assert.rejects(api.open({slot_id:'failed'}),{code:'storage_read_failed'});
});
check('natural initial journey: public commands only, no injected cash; eligible return creates actual offers',async()=>{
 const x=await start();await execute(x.c,'depart',{case_id:'SCN-001'});let steps=0;
 while(x.c.inspect().display_data.phase==='exploring'&&steps++<800){const d=x.c.inspect().display_data;if(d.scene?.paused)await execute(x.c,'continue_scene',{scene_id:d.scene.id});else await execute(x.c,'play',{choice:choose(x.c)});}
 assert(steps<800);assert.equal(x.c.inspect().display_data.phase,'return');await ack(x.c);const h=home(x.c),receipt=Object.values(x.c.exportSave().session.receipts)[0];assert.equal(receipt.outcome,'clear');assert.equal(h.economy.unspent_units,receipt.gained_units);assert.equal(h.offers.status,'available');assert(h.candidates.length>0);snapshots.natural_first_home=x.c.exportSave();examples.push({name:'natural-first-home',steps,response:x.c.inspect()});
});
after(()=>{if(!output)return;fs.mkdirSync(output,{recursive:true});const write=(name,data)=>fs.writeFileSync(path.join(output,name),JSON.stringify(data,null,2)+'\n');
 write('results.json',{test_id:'CW-M1-D03R-001',node:process.version,environment:'Node / MemoryStore',versions,checks:records,passed:records.filter(x=>x.pass).length,failed:records.filter(x=>!x.pass).length,unverified:['real IndexedDB','browser rendering/input','physical multi-tab','UI connection','human evaluation']});
 write('public-examples.json',examples);write('migration-examples.json',migration);const manifest=[];
 for(const [name,d]of Object.entries(snapshots)){const raw=Buffer.from(JSON.stringify(d)),filename=name+'.save.json.br.b64';fs.writeFileSync(path.join(output,filename),zlib.brotliCompressSync(raw).toString('base64')+'\n');manifest.push({name,path:filename,raw_sha256:hash(raw),encoded_sha256:hash(fs.readFileSync(path.join(output,filename))),schema:d.schema,engine:d.engine_version,phase:d.session.phase});}write('save-manifest.json',manifest);
});
