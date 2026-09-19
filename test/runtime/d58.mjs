// D58 and the first versioned environment-defense content. Historical fixtures stay frozen.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import C from '../../src/content/m1.mjs';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {restoreGame} from '../../src/runtime/game.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {contentFor} from '../../src/runtime/content.mjs';
import {copy,canonical} from '../../src/runtime/common.mjs';
import {MemoryStore,execute,command,choose} from './support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'docs/検証/接続条件/co-d02/appendix-d58'));
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const checks=[],examples=[],journeys=[],inputs=[];
const pass=(name,detail={})=>checks.push({name,pass:true,...detail});
const effect=(source,guard,evasion,uses,kind='ward')=>({source_actor_id:source,effect_kind:kind,guard,evasion,uses});
async function open(document,slot='check'){
  const storage=new MemoryStore();storage.records.set(slot,copy(document));
  const api=createCampaign({storage}),controller=await api.open({slot_id:slot});return {storage,api,controller};
}
function take(g,id){
  for(const a of Object.values(g.s.actors)){a.hand=a.hand.filter(x=>x!==id);a.deck=a.deck.filter(x=>x!==id);}
  g.s.pool=g.s.pool.filter(x=>x!==id);
  for(const [attr,x] of Object.entries(g.s.field))if(x===id)delete g.s.field[attr];
  g.s.cards[id].remaining=null;
}
function prepare(g,type,actor='P',material='l',target=null){
  const a=g.s.actors[actor];
  for(const id of [...a.hand]){take(g,id);a.deck.push(id);}
  for(const id of Object.values(g.s.field)){take(g,id);g.recover(id,'d58_fixture_clear_field');}
  const c=Object.values(g.s.cards).find(c=>!c.destroyed&&c.type===type);assert(c,type);
  take(g,c.id);a.hand.push(c.id);c.remaining=c.life;
  if(material){const m=Object.values(g.s.cards).find(x=>!x.destroyed&&x.id!==c.id&&x.type===material);assert(m,material);assert.equal(c.attr,m.attr);
    take(g,m.id);g.s.field[c.attr]=m.id;}
  g.s.ready=true;g.assert();return {card_id:c.id,target};
}
function compare(g,choice,actor,name){
  const before=hash(g.save()),preview=g.predict(choice,actor);assert.equal(hash(g.save()),before,'preview mutation');
  g.play(actor,choice);
  for(const [id,c] of Object.entries(preview.actor_changes))if(c.status==='known'){
    assert.deepEqual(c.defense.after,g.defense(id));assert.deepEqual(c.stance.after,g.guard(id));
  }
  examples.push({name,input_sha256:before,actor,choice,preview});pass(name);return preview;
}
function fixtureDoc(ready,g){const d=copy(ready);d.session.game=g.save();d.session.scene.pause=false;validateDocument(d);return d;}
async function acknowledge(c){
  while(c.inspect().display_data.scene?.paused)await execute(c,'continue_scene',{scene_id:c.inspect().display_data.scene.id});
  await execute(c,'ack_return',{});
}

await fs.mkdir(output,{recursive:true});
try{
  assert.equal(versions.rule_set_id,'CW-M1-rules-0.5');assert.equal(versions.content_set_id,'CW-M1-SCN001-0.2');
  assert.equal(versions.public_contract,'CW-M1-public-0.4');assert.equal(versions.schema,'CW-M1-save-1');
  const storage=new MemoryStore(),api=createCampaign({storage});
  const c=await api.create({slot_id:'new',...versions,request_id:'create-d58'});
  assert(!c.inspect().display_data.home.free_card_options.includes('base:nt_ward'));
  await execute(c,'depart',{case_id:'SCN-001'});
  const entry=c.exportSave();
  assert.equal(Object.values(entry.session.game.state.cards).filter(x=>x.origin==='V0'&&x.type==='nt_ward').length,4);
  assert.equal(entry.session.active.content_set_id,versions.content_set_id);
  await execute(c,'continue_scene',{scene_id:c.inspect().display_data.scene.id});const ready=c.exportSave();
  pass('新規出発は内容0.2の付与札4枚、無料構築・解放・個体機能は追加しない');

  for(const [material,guard,evasion] of [['weak_B',2,10],['l',8,10],['h',2,-10]])for(const actor of ['V0','P']){
    const g=restoreGame(ready.session),choice=prepare(g,'nt_ward',actor,material);
    for(const [id,a] of Object.entries(g.s.actors)){
      a.crit=id===actor?900:125;
      a.defense_effects=[effect(id,3,0,null,'self_guard')];
      if(id!==actor)a.defense_effects.push(effect(actor,20,30,4));
    }
    const valuesBefore=copy(C.cards.nt_ward.card.defense_grant);
    compare(g,choice,actor,actor+'の付与＋'+material+'：全受け手の量・弱い張り直し・予測');
    assert.deepEqual(g.s.actors[actor].defense_effects,[]);
    for(const [id,a] of Object.entries(g.s.actors))if(id!==actor){
      assert.deepEqual(a.defense_effects.find(e=>e.source_actor_id===actor),effect(actor,guard,evasion,1));
      assert.deepEqual(a.defense_effects.find(e=>e.effect_kind==='self_guard'),effect(id,3,0,null,'self_guard'));
      assert.equal(a.crit,125);
    }
    assert.deepEqual(C.cards.nt_ward.card.defense_grant,valuesBefore);
    // Each recipient owns its own copy. One consumption must not mutate another recipient.
    const receivers=Object.keys(g.s.actors).filter(id=>id!==actor);
    g.s.actors[receivers[0]].defense_effects.find(e=>e.source_actor_id===actor).guard++;
    assert.equal(g.s.actors[receivers[1]].defense_effects.find(e=>e.source_actor_id===actor).guard,guard);
  }
  const clamp=restoreGame(ready.session),clampChoice=prepare(clamp,'nt_ward','V0','l');
  clamp.s.cards[clamp.s.field.B].field_power=-9; // Declared boundary fixture, not a registered card value.
  compare(clamp,clampChoice,'V0','明示境界：付与身構の負値を0へ、攪乱と回数は維持');
  assert.deepEqual(clamp.s.actors.P.defense_effects,[effect('V0',0,10,1)]);

  const negative=restoreGame(ready.session);compare(negative,prepare(negative,'nt_ward','V0','h'),'V0','負の攪乱を付与');
  negative.s.actors.P.hit=0;negative.s.actors.P.crit=125;
  const attack=prepare(negative,'h','E1','l','P'),p=compare(negative,attack,'E1','負の攪乱は体勢削りを増加、合法被攻撃後に有限効果終了');
  assert.equal(p.hit_gain,40);assert.equal(p.hit_connected,false);assert.equal(negative.s.actors.P.crit,125);
  assert.deepEqual(negative.s.actors.P.defense_effects,[]);

  const positive=restoreGame(ready.session);compare(positive,prepare(positive,'nt_ward','V0','l'),'V0','身構8を付与');
  positive.s.actors.P.hit=99;positive.s.actors.P.crit=125;positive.s.actors.E1.crit=80;
  const pp=compare(positive,prepare(positive,'f','E1','f','P'),'E1','場補正済み身構に受け手の一閃を適用、付与元倍率は使わない');
  assert.equal(pp.hit_connected,true);assert.equal(pp.actual_hp_loss,0);assert.equal(positive.s.actors.P.crit,0);

  const placed=restoreGame(ready.session);placed.s.actors.P.defense_effects=[effect('V0',2,10,1)];
  compare(placed,prepare(placed,'nt_ward','P',null),'P','不一致の付与札は設置のみ、旧防御を維持');
  assert.deepEqual(placed.s.actors.P.defense_effects,[effect('V0',2,10,1)]);assert.deepEqual(placed.s.actors.E1.defense_effects,[]);
  const material=restoreGame(ready.session);
  compare(material,prepare(material,'h','P','nt_ward','E1'),'P','付与札を場材料に使っても全員付与は発動しない');
  assert(Object.values(material.s.actors).every(a=>a.defense_effects.length===0));

  const savedGrant=restoreGame(ready.session),choice=prepare(savedGrant,'nt_ward','P','h');
  const prepared=fixtureDoc(ready,savedGrant),opened=await open(prepared),view=opened.controller.inspect();
  assert.deepEqual(view.display_data.details[choice.card_id].primary.defense_grant,C.cards.nt_ward.card.defense_grant);
  const beforeStorage=hash(await opened.storage.load('check')),beforeExport=hash(opened.controller.exportSave());
  const preview=opened.controller.previewAction({view_token:view.meta.view_token,choice});assert.equal(preview.display_data.error,null);
  assert.equal(preview.display_data.action_preview.actor_changes.E1.defense.after.evasion,-10);
  assert.equal(hash(await opened.storage.load('check')),beforeStorage);assert.equal(hash(opened.controller.exportSave()),beforeExport);
  const cmd=command(opened.controller,'play',{choice});opened.storage.failNext=true;
  assert.equal((await opened.controller.execute(cmd)).display_data.error.code,'storage_write_failed');
  assert.equal(hash(await opened.storage.load('check')),beforeStorage);assert.equal(hash(opened.controller.exportSave()),beforeExport);
  assert.equal((await opened.controller.execute(cmd)).display_data.error,null);
  const committed=opened.controller.exportSave();assert.equal(committed.revision,prepared.revision+1);
  assert.equal((await opened.controller.execute(cmd)).display_data.operation.status,'replayed');
  assert.deepEqual((await opened.api.open({slot_id:'check'})).exportSave(),committed);
  assert.deepEqual((await opened.api.importSave({slot_id:'import',request_id:'d58-import',document:committed})).exportSave().session,committed.session);
  examples.push({name:'新札の公開詳細・一手予測',detail:view.display_data.details[choice.card_id],action_preview:preview.display_data.action_preview});
  pass('新札の公開詳細・負値予測、予測/書込み失敗の非破壊、再送・再開・import');

  const legacy={};
  const manifest=JSON.parse(await fs.readFile(path.join(root,'docs/検証/接続条件/co-d02/saves/manifest.json')));
  for(const name of ['entry','port','return','home','second-return']){
    const file='docs/検証/接続条件/co-d02/saves/'+name+'.save.json.gz',bytes=await fs.readFile(path.join(root,file)),raw=zlib.gunzipSync(bytes);
    const pin=manifest.records.find(r=>r.path.endsWith('/'+name+'.save.json.gz'));
    assert.equal(hash(bytes),pin.gzip_sha256);assert.equal(hash(raw),pin.raw_sha256);inputs.push({path:file,gzip_sha256:hash(bytes),raw_sha256:hash(raw)});
    const original=JSON.parse(raw);legacy[name]=original;
    for(const version of ['0.1','0.2','0.3','0.4']){
      const old=version==='0.1'||version==='0.2'?copy(original):validateDocument(original);
      old.rule_set_id='CW-M1-rules-'+version;old.engine_version='CW-M1-engine-'+version;old.content_set_id='CW-M1-SCN001-0.1';
      const before=hash(old),migrated=validateDocument(old);
      assert.equal(hash(old),before);assert.equal(migrated.content_set_id,C.content_set_id);
      assert.deepEqual(migrated.session.receipts,old.session.receipts);
      assert.deepEqual(migrated.session.action_history,old.session.action_history);
      assert.deepEqual(migrated.session.economy,old.session.economy);
      assert.deepEqual(migrated.session.active,old.session.active);
      if(old.session.game){
        assert.deepEqual(migrated.session.game.rng,old.session.game.rng);
        assert.deepEqual(migrated.session.game.state.cards,old.session.game.state.cards);
        assert.deepEqual(migrated.session.game.state.ah,old.session.game.state.ah);
      }
      const {storage,controller}=await open(old);const stored=hash(await storage.load('check'));
      controller.inspect();assert.equal(hash(await storage.load('check')),stored);
      assert.deepEqual(controller.exportSave(),migrated);
    }
    pass('旧'+name+'：既知4版を移行、進行中内容/領収/知識/乱数/札を保全、読取り無書込み');
  }
  const old04=validateDocument(legacy.entry);old04.rule_set_id='CW-M1-rules-0.4';old04.engine_version='CW-M1-engine-0.4';old04.content_set_id='CW-M1-SCN001-0.1';
  const oldEffects=[effect('V0',2,10,2),effect('E1',7,-15,null),effect('P',3,0,1,'self_guard')];
  old04.session.game.state.actors.P.defense_effects=copy(oldEffects);
  const up=validateDocument(old04);assert.deepEqual(up.session.game.state.actors.P.defense_effects,oldEffects);
  assert.equal(up.session.game.state.actors.P.defense_effects[0].guard,2);
  pass('0.4の付与済み組を場札から再計算しない：有限/無制限・負攪乱をそのまま保持');

  const bad=[
    ['未知の内容版',d=>{d.content_set_id='unknown';},'unsupported_content_set'],
    ['旧engineと新内容の混在',d=>{d.content_set_id=C.content_set_id;},'unsupported_content_set'],
    ['旧engineの新内容探索',d=>{d.session.active.content_set_id=C.content_set_id;},'invalid_active_content_version'],
    ['規則とengineの混在',d=>{d.engine_version=C.engine_version;},'unsupported_rule_set'],
    ['回数Infinity',d=>{d.session.game.state.actors.P.defense_effects[0].uses=Infinity;},'invalid_defense_effect'],
    ['回数欠落',d=>{delete d.session.game.state.actors.P.defense_effects[0].uses;},'invalid_defense_effect'],
    ['量NaN',d=>{d.session.game.state.actors.P.defense_effects[0].guard=NaN;},'invalid_defense_effect'],
    ['0.4の退場受け手に効果',d=>{const a=d.session.game.state.actors.E1;a.active=false;a.defense_effects=[effect('V0',2,10,1)];},'retired_defense_effect']
  ];
  for(const [name,mutate,code] of bad){const d=copy(old04);mutate(d);assert.throws(()=>validateDocument(d),error=>error.code===code);pass(name+'を拒否',{code});}
  const forged=copy(up);forged.session.active.content_set_id=C.content_set_id;
  assert.throws(()=>validateDocument(forged),error=>error.code==='invalid_authored_catalogue');pass('旧探索の内容IDだけを新しくして目録を混在させた保存を拒否');

  // End an old partially traversed run, retain its receipt/catalogue, then retry with new content.
  const older=await open(legacy.port);await execute(older.controller,'withdraw',{});
  const oldReceipt=copy(Object.values(older.controller.exportSave().session.receipts)[0]);
  assert.equal(oldReceipt.content_set_id,'CW-M1-SCN001-0.1');
  await acknowledge(older.controller);await execute(older.controller,'depart',{case_id:'SCN-001'});
  const retry=older.controller.exportSave(),kv=older.controller.inspect().display_data.knowledge_views;
  assert.equal(retry.session.active.mode,'retry');assert.equal(retry.session.active.content_set_id,C.content_set_id);
  assert.deepEqual(retry.session.receipts[oldReceipt.run],oldReceipt);
  const oldTarget=contentFor('CW-M1-SCN001-0.1').targets['SCN-001-ACT01'],newTarget=C.targets['SCN-001-ACT01'];
  const oldK=kv.find(x=>x.catalogue_version===oldTarget.catalogue_version),newK=kv.find(x=>x.catalogue_version===newTarget.catalogue_version);
  assert(oldK.initial_catalogue);assert.equal(newK.initial_catalogue,null);assert.notEqual(oldK.key,newK.key);
  assert(!oldK.initial_catalogue.cards.some(x=>x.card.type==='nt_ward'));
  examples.push({name:'旧目録を保持し、新しい初期構成の全開示へ流用しない',knowledge_views:[oldK,newK]});
  pass('旧内容で撤退・精算→再出発は新内容、旧領収不変、同一対象の旧/新目録を区分');

  // Actual Campaign lifecycle with unchanged initial player preparation, public-only policy,
  // sequential seeds, no forced cards. This is a content connection probe, not human balance.
  const journeyStore=new MemoryStore(),journeyAPI=createCampaign({storage:journeyStore});
  let run=await journeyAPI.create({slot_id:'journeys',...versions,request_id:'d58-journey-create'});
  for(let index=0;index<8;index++){
    await execute(run,'depart',{case_id:'SCN-001'});
    const start=run.exportSave(),mode=start.session.active.mode;assert.equal(start.session.active.seed,index);
    assert.equal(Object.values(start.session.game.state.cards).filter(x=>x.type==='nt_ward').length,4);
    let actions=0,reopened=false,cutoff=false;
    while(run.inspect().display_data.phase==='exploring'&&actions<160){
      const v=run.inspect().display_data;
      if(v.scene?.paused)await execute(run,'continue_scene',{scene_id:v.scene.id});
      else {await execute(run,'play',{choice:choose(run)});actions++;}
      if(!reopened&&actions>=3){const saved=run.exportSave();run=await journeyAPI.open({slot_id:'journeys'});assert.deepEqual(run.exportSave(),saved);reopened=true;}
    }
    if(run.inspect().display_data.phase==='exploring'){cutoff=true;await execute(run,'withdraw',{});}
    const d=run.exportSave(),receipt=d.session.receipts[d.session.active.run],grants=d.session.action_history.filter(x=>x.type==='action'&&x.mode==='defense_support');
    assert.equal(receipt.content_set_id,C.content_set_id);assert.equal(run.inspect().display_data.capabilities.purchase.available,false);
    const summary={index,seed:index,mode,outcome:receipt.outcome,actions,hp:receipt.expedition_end_hp,gained_units:receipt.gained_units,
      grants:grants.length,grant_users:[...new Set(grants.map(x=>x.actor))],reopened,cutoff,receipt_sha256:hash(receipt)};
    journeys.push(summary);
    if(!examples.some(x=>x.name==='新内容の自然進行の帰還'))examples.push({name:'新内容の自然進行の帰還',summary,return_receipt:run.inspect().display_data.return_receipt});
    await acknowledge(run);assert.equal(Object.keys(run.exportSave().session.receipts).length,index+1);
    pass('内容0.2の通常探索・帰還・次出発 seed '+index,summary);
    process.stdout.write(JSON.stringify(summary)+'\n');
  }
  for(const item of inputs)assert.equal(hash(await fs.readFile(path.join(root,item.path))),item.gzip_sha256);
  const codePaths=['src/runtime/core.mjs','src/runtime/game.mjs','src/runtime/defense.mjs','src/runtime/content.mjs','src/runtime/validate.mjs',
    'src/runtime/view.mjs','src/runtime/settlement.mjs','src/runtime/action-public.mjs','src/runtime/campaign.mjs','src/content/m1.mjs',
    'scripts/generate-m1-content.py','docs/仕様案/接続データ/co-01a/defense-content.v0.2.json','test/runtime/d58.mjs'];
  const code=Object.fromEntries(await Promise.all(codePaths.map(async p=>[p,hash(await fs.readFile(path.join(root,p)))])));
  const report={test_id:'CW-M1-D58-001',date_jst:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date()),node:process.version,storage:'MemoryStore',versions,
    base_commit:'e76f9fe0ee43746fbbc7b1ca56e00f646aecfb6a',inputs,code,check_count:checks.length,checks,journeys,passed:true,
    scope:'D58 field mapping; signed grants and refresh; content 0.2 registration; old-content run/receipt/catalogue retention; actual Campaign lifecycle',
    trial_values:{card:'nt_ward',guard:2,evasion:10,uses:1,copies_per_source:4,targets:['SCN-001-ACT01','SCN-001-ACT04']},
    old_results:'D02/D55/D56/D57 and defense-cycle 001 frozen; no old test rerun with new semantics',
    unverified:['UI drawing/layout and new card-kind presentation','real browser/IndexedDB/physical input','human balance/readability','final product card values and concrete sustained-guard/dodge lineup']};
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(output,'examples.json'),JSON.stringify({test_id:report.test_id,examples},null,2)+'\n');
  process.stdout.write(JSON.stringify({passed:true,checks:checks.length,examples:examples.length,journeys:journeys.length})+'\n');
}catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({passed:false,checks,error:String(error.stack||error)},null,2)+'\n');throw error;}
