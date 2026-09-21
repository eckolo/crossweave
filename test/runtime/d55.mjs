// D55-only regression: old snapshots are inputs, never regenerated/overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {restoreGame} from '../../src/runtime/game.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {copy,canonical} from '../../src/runtime/common.mjs';
import {MemoryStore,execute,command} from './support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'docs/検証/接続条件/co-d02/appendix-d55'));
const saves=path.join(root,'docs/検証/接続条件/co-d02/saves');
const digest=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const records=[],inputs=[],fixtures=[];
const passed=(name,detail={})=>records.push({name,pass:true,...detail});
const upgraded=d=>({...copy(d),rule_set_id:versions.rule_set_id,engine_version:versions.engine_version});
const state=g=>({state:g.s,memory:g.memory,number:g.number,rng:Object.fromEntries(Object.entries(g.rng).map(([k,r])=>[k,r.state()])),bundle:g.bundle,trace:g.trace});
async function open(document){
  const storage=new MemoryStore();storage.records.set('check',copy(document));
  const api=createCampaign({storage}),controller=await api.open({slot_id:'check'});
  return {storage,api,controller};
}
function take(g,id){
  for(const a of Object.values(g.s.actors)){a.hand=a.hand.filter(x=>x!==id);a.deck=a.deck.filter(x=>x!==id);}
  g.s.pool=g.s.pool.filter(x=>x!==id);
  for(const [attr,x] of Object.entries(g.s.field))if(x===id)delete g.s.field[attr];
  g.s.cards[id].remaining=null;
}
function arrange(source,{type,matched=true,actor='P',target='E1',fieldType=null,changes={}}){
  const d=copy(source),g=restoreGame(d.session),a=g.s.actors[actor];
  // Counterfactual placement of existing registered cards and explicit actor state.
  // This does not claim a natural playthrough or alter the frozen source.
  for(const id of [...a.hand]){take(g,id);a.deck.push(id);}
  for(const id of Object.values(g.s.field)){take(g,id);g.recover(id,'d55_fixture_clear_field');}
  const c=Object.values(g.s.cards).find(c=>!c.destroyed&&c.type===type);assert(c,type);
  take(g,c.id);a.hand.push(c.id);c.remaining=c.life;
  if(matched){
    const m=Object.values(g.s.cards).find(x=>!x.destroyed&&x.id!==c.id&&x.attr===c.attr&&(!fieldType||x.type===fieldType));assert(m,'material');
    take(g,m.id);g.s.field[c.attr]=m.id;
  }
  for(const [id,change] of Object.entries(changes))Object.assign(g.s.actors[id],copy(change));
  g.s.ready=true;g.assert();d.session.game=g.save();d.session.scene.pause=false;
  validateDocument(d);
  return {document:d,actor,choice:{card_id:c.id,target:matched&&c.kind==='attack'?target:null}};
}
function compareOne(f,name,expected){
  const g=restoreGame(f.document.session),before=digest(state(g));
  const preview=g.predict(f.choice,f.actor),actual=restoreGame(f.document.session);
  actual.play(f.actor,f.choice);
  assert.equal(digest(state(g)),before,'preview changed source/RNG');
  const row=actual.trace.findLast(r=>r.type==='action'&&r.actor===f.actor);
  for(const [key,value] of Object.entries(expected.action||{})){
    assert.equal(row[key],value,`${name}: action ${key}`);
    assert.equal(preview[key],value,`${name}: preview ${key}`);
  }
  for(const [id,expect] of Object.entries(expected.actors||{})){
    const a=actual.s.actors[id],values={guard:a.guard?.value??0,guard_uses:a.guard?.uses??0,guard_evasion:a.guard?.evasion??0,
      evasion:actual.evasion(id),crit:a.crit,hit:a.hit,hp:a.hp};
    for(const [key,value] of Object.entries(expect)){
      assert.equal(values[key],value,`${name}: actor ${id}.${key}`);
      assert.equal(preview.actor_changes[id].values[key].after,value,`${name}: preview ${id}.${key}`);
    }
  }
  const sample={name,actor:f.actor,choice:f.choice,input_sha256:digest(f.document),expected,preview};
  fixtures.push(sample);passed(name,{expected});return sample;
}

await fs.mkdir(output,{recursive:true});
try {
  assert.equal(versions.rule_set_id,'CW-M1-rules-0.2');assert.equal(versions.engine_version,'CW-M1-engine-0.2');
  assert.equal(versions.schema,'CW-M1-save-1');assert.equal(versions.public_contract,'CW-M1-public-0.2');
  const manifest=JSON.parse(await fs.readFile(path.join(saves,'manifest.json'))),docs={};
  for(const name of ['entry','port','return','home','second-return']){
    const filename=name+'.save.json.gz',bytes=await fs.readFile(path.join(saves,filename)),raw=zlib.gunzipSync(bytes);
    const record=manifest.records.find(r=>r.path.endsWith('/'+filename));
    assert.equal(digest(bytes),record.gzip_sha256);assert.equal(digest(raw),record.raw_sha256);
    const original=JSON.parse(raw),before=digest(original),expected=upgraded(original);docs[name]=original;
    assert.deepEqual(validateDocument(original),expected);assert.equal(digest(original),before);
    const {storage,api,controller}=await open(original),stored=digest(await storage.load('check'));
    controller.inspect();controller.inspect();assert.deepEqual(controller.exportSave(),expected);
    assert.equal(digest(await storage.load('check')),stored);
    const imported=await api.importSave({slot_id:'import',document:original,request_id:'d55-import-'+name});
    assert.deepEqual(imported.exportSave().session,original.session);
    assert.deepEqual(imported.exportSave().casebook,original.casebook);
    assert.deepEqual(imported.exportSave().public_history,original.public_history);
    assert.equal(imported.exportSave().engine_version,versions.engine_version);
    assert.equal(imported.exportSave().revision,original.revision+1);
    inputs.push({name,gzip_sha256:digest(bytes),raw_sha256:digest(raw),metadata_only_upgrade:true});
    passed('旧保存 '+name+'：既知版のみ変換、状態・履歴・回数維持、読取り無書込み、空slot輸入');
  }
  for(const [name,patch] of [
    ['新規則と旧engineの混在',{rule_set_id:versions.rule_set_id}],
    ['旧規則と新engineの混在',{engine_version:versions.engine_version}],
    ['未対応版',{engine_version:'future'}],
    ['旧版でも壊れた保存',{session:null}]
  ]){
    const invalid={...copy(docs.entry),...patch};assert.throws(()=>validateDocument(invalid));passed(name+'を拒否');
  }
  const {controller:start}=await open(docs.entry);
  await execute(start,'continue_scene',{scene_id:start.inspect().display_data.scene.id,advance:true,displayed_text_ids:[]});
  const ready=start.exportSave();
  const cases=[
    ['攪乱で削り0でも2回→1回、双方の機転を保持',
      {type:'h',fieldType:'h',changes:{P:{crit:80},E1:{hit:0,crit:125,guard:{value:3,evasion:20,uses:2}}}},
      {action:{hit_gain:0,hit_connected:false,actual_hp_loss:0},actors:{P:{crit:105},E1:{guard:3,guard_uses:1,guard_evasion:20,crit:125,hit:0}}}],
    ['体勢未到達でも最終回を消費',
      {type:'h',fieldType:'h',changes:{P:{crit:0},E1:{hit:0,crit:125,guard:{value:3,evasion:0,uses:1}}}},
      {action:{hit_gain:10,hit_connected:false,actual_hp_loss:0},actors:{E1:{guard:0,guard_uses:0,crit:125,hit:10}}}],
    ['最後の攪乱は今回の攻撃に適用してから終了',
      {type:'h',fieldType:'h',changes:{E1:{hit:0,crit:125,guard:{value:3,evasion:20,uses:1}}}},
      {action:{hit_gain:0,hit_connected:false,actual_hp_loss:0},actors:{E1:{guard:0,guard_uses:0,guard_evasion:0,evasion:0,crit:125,hit:0}}}],
    ['身構で0ダメージでも一回消費、機転はダメージ解決時に消費',
      {type:'f',fieldType:'f',changes:{P:{crit:80},E1:{hit:99,crit:125,guard:{value:9,evasion:0,uses:2}}}},
      {action:{hit_gain:100,hit_connected:true,actual_hp_loss:0},actors:{P:{crit:0},E1:{guard:9,guard_uses:1,crit:0,hit:0}}}],
    ['最後の身構を軽減へ適用後に解除し二重消費しない',
      {type:'f',fieldType:'f',changes:{P:{crit:80},E1:{hit:99,crit:125,guard:{value:2,evasion:0,uses:1}}}},
      {action:{hit_connected:true,actual_hp_loss:2},actors:{E1:{guard:0,guard_uses:0,crit:0,hit:0}}}],
    ['他の主体が攻撃されても回数を消費しない',
      {type:'h',fieldType:'h',target:'V0',changes:{E1:{guard:{value:3,evasion:20,uses:2}}}},
      {actors:{E1:{guard:3,guard_uses:2,guard_evasion:20}}}],
    ['不一致の設置では自分と他者の防御を維持',
      {type:'salve',matched:false,changes:{P:{guard:{value:4,evasion:10,uses:1}},E1:{guard:{value:3,evasion:20,uses:2}}}},
      {action:{mode:'place'},actors:{P:{guard:4,guard_uses:1},E1:{guard:3,guard_uses:2}}}],
    ['回復一致は従来どおり本人の防御解除、他者は消費しない',
      {type:'salve',changes:{P:{hp:30,guard:{value:4,evasion:10,uses:1}},E1:{guard:{value:3,evasion:20,uses:2}}}},
      {action:{mode:'heal',hp_restored:10},actors:{P:{guard:0,guard_uses:0},E1:{guard:3,guard_uses:2}}}],
    ['防御一致は従来の新しい二回防御へ置換',
      {type:'g',fieldType:'g',changes:{P:{guard:{value:9,evasion:20,uses:1}},E1:{guard:{value:3,evasion:20,uses:2}}}},
      {action:{mode:'guard'},actors:{P:{guard:0,guard_uses:2,guard_evasion:0},E1:{guard:3,guard_uses:2}}}],
    ['NPCから本人への攻撃も同じ消費規則',
      {type:'f',fieldType:'f',actor:'E1',target:'P',changes:{P:{hit:0,crit:125,guard:{value:3,evasion:20,uses:1}}}},
      {action:{hit_gain:80,hit_connected:false,actual_hp_loss:0},actors:{P:{guard:0,guard_uses:0,crit:125,hit:80}}}]
  ];
  for(const [name,options,expected] of cases)compareOne(arrange(ready,options),name,expected);

  const f=arrange(ready,cases[0][1]);
  // Exercise the public controller against a legacy version pair in storage.
  f.document.rule_set_id='CW-M1-rules-0.1';f.document.engine_version='CW-M1-engine-0.1';
  const {storage,api,controller}=await open(f.document),storedBefore=digest(await storage.load('check'));
  const view=controller.inspect(),beforeExport=digest(controller.exportSave());
  const preview=controller.previewAction({view_token:view.meta.view_token,choice:f.choice});
  assert.equal(preview.display_data.action_preview.actor_changes.E1.values.guard_uses.after,1);
  assert.equal(preview.display_data.action_preview.actor_changes.E1.values.crit.after,125);
  assert.equal(digest(await storage.load('check')),storedBefore);assert.equal(digest(controller.exportSave()),beforeExport);
  passed('公開予測は新しい回数を返し、保存・revision・乱数・機転を変更しない');
  const illegal=await controller.execute(command(controller,'play',{choice:{...f.choice,target:'missing'}}));
  assert.equal(illegal.display_data.error.code,'illegal_choice');assert.equal(digest(await storage.load('check')),storedBefore);
  passed('不正対象の操作は防御回数を消費せず保存も変えない');
  const cmd=command(controller,'play',{choice:f.choice});storage.failNext=true;
  const failed=await controller.execute(cmd);assert.equal(failed.display_data.error.code,'storage_write_failed');
  assert.equal(digest(await storage.load('check')),storedBefore);assert.equal(digest(controller.exportSave()),beforeExport);
  const success=await controller.execute(cmd);assert.equal(success.display_data.error,null);
  const committed=await storage.load('check');assert.equal(committed.engine_version,versions.engine_version);
  assert.equal(committed.rule_set_id,versions.rule_set_id);assert.equal(committed.revision,f.document.revision+1);
  assert.deepEqual(committed.session.action_history.slice(0,f.document.session.action_history.length),f.document.session.action_history);
  const first=committed.session.action_history[f.document.session.action_history.length];
  assert.equal(first.actor,'P');assert.equal(first.hit_gain,0);assert.equal(first.hit_connected,false);
  const committedHash=digest(committed),replay=await controller.execute(cmd);assert.equal(replay.display_data.operation.status,'replayed');
  assert.equal(digest(await storage.load('check')),committedHash);
  const reopened=await api.open({slot_id:'check'});assert.deepEqual(reopened.exportSave(),committed);
  passed('失敗時は旧保存を維持、成功時に版を保存、過去履歴保持、再送二重消費なし、再開一致');
  const fresh=await api.create({slot_id:'fresh',rule_set_id:versions.rule_set_id,content_set_id:versions.content_set_id,request_id:'d55-create'});
  assert.equal(fresh.exportSave().rule_set_id,versions.rule_set_id);assert.equal(fresh.exportSave().engine_version,versions.engine_version);
  passed('新規CampaignはD55版で作成');
  // Source gzip files must still match their manifest after all writes elsewhere.
  for(const input of inputs)assert.equal(digest(await fs.readFile(path.join(saves,input.name+'.save.json.gz'))),input.gzip_sha256);
  const codePaths=['src/runtime/core.mjs','src/runtime/validate.mjs','src/runtime/game.mjs','src/runtime/campaign.mjs','src/runtime/action-public.mjs','src/content/m1.mjs','scripts/generate-m1-content.py','test/runtime/d55.mjs'];
  const code=Object.fromEntries(await Promise.all(codePaths.map(async p=>[p,digest(await fs.readFile(path.join(root,p)))])));
  const report={test_id:'CW-M1-D55-001',date_jst:'2026-09-19',versions,scope:'D55 finite existing guard only; no independent effect layers, grant cards or UI changes',
    fixtures_description:'Five unchanged D02 saves plus declared counterfactual card locations and actor values; no natural route or balance claim',
    inputs,code,checks:records,check_count:records.length,passed:true,unverified:['real browser/IndexedDB/touch','balance and player evaluation','new effect layers and UI representation']};
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(output,'examples.json'),JSON.stringify({test_id:report.test_id,fixtures},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks:records.length,one_step_fixtures:fixtures.length,legacy_saves:inputs.length,output}));
} catch(error) {
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({passed:false,completed:records,error:String(error.stack||error)},null,2)+'\n');
  throw error;
}
