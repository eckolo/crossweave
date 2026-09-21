// D57 recipient lifetime. Fixed D02/D56 inputs and results are never overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {Game,restoreGame} from '../../src/runtime/game.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {copy,canonical} from '../../src/runtime/common.mjs';
import {MemoryStore,execute,command} from './support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'docs/検証/接続条件/co-d02/appendix-d57'));
const checks=[],examples=[];
const pass=name=>checks.push({name,pass:true});
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const effect=(source,guard,evasion,uses,kind='ward')=>({source_actor_id:source,effect_kind:kind,guard,evasion,uses});
const snapshot=g=>({state:g.s,memory:g.memory,number:g.number,rng:Object.fromEntries(Object.entries(g.rng).map(([k,v])=>[k,v.state()])),trace:g.trace,bundle:g.bundle});
async function open(document){
  const storage=new MemoryStore();storage.records.set('check',copy(document));
  const api=createCampaign({storage}),controller=await api.open({slot_id:'check'});return {storage,api,controller};
}
function take(g,id){
  for(const a of Object.values(g.s.actors)){a.hand=a.hand.filter(x=>x!==id);a.deck=a.deck.filter(x=>x!==id);}
  g.s.pool=g.s.pool.filter(x=>x!==id);
  for(const [attr,x] of Object.entries(g.s.field))if(x===id)delete g.s.field[attr];
  g.s.cards[id].remaining=null;
}
function prepare(g,type,actor,target,matched=true){
  const a=g.s.actors[actor];
  for(const id of [...a.hand]){take(g,id);a.deck.push(id);}
  for(const id of Object.values(g.s.field)){take(g,id);g.recover(id,'d57_fixture_clear_field');}
  const c=Object.values(g.s.cards).find(c=>!c.destroyed&&c.type===type);assert(c);
  take(g,c.id);a.hand.push(c.id);c.remaining=c.life;
  if(matched){
    const m=Object.values(g.s.cards).find(x=>!x.destroyed&&x.id!==c.id&&x.type===type);assert(m);
    take(g,m.id);g.s.field[c.attr]=m.id;
  }
  g.s.ready=true;g.assert();return {card_id:c.id,target:matched&&c.kind==='attack'?target:null};
}
function compare(g,choice,actor,name){
  const before=hash(snapshot(g)),preview=g.predict(choice,actor);
  assert.equal(hash(snapshot(g)),before,'preview mutation');
  g.play(actor,choice);
  for(const [id,change] of Object.entries(preview.actor_changes))if(change.status==='known'){
    assert.deepEqual(change.defense.after,g.defense(id));assert.equal(change.active.after,g.s.actors[id].active);
    assert.deepEqual(change.stance.after,g.guard(id));
  }
  examples.push({name,input_sha256:before,actor,choice,preview});pass(name);return preview;
}
function documentWith(ready,g){const d=copy(ready);d.session.game=g.save();d.session.scene.pause=false;return d;}

await fs.mkdir(output,{recursive:true});
try {
  assert.equal(versions.rule_set_id,'CW-M1-rules-0.4');assert.equal(versions.engine_version,'CW-M1-engine-0.4');
  assert.equal(versions.public_contract,'CW-M1-public-0.3');assert.equal(versions.schema,'CW-M1-save-1');
  const savePath='docs/検証/接続条件/co-d02/saves/entry.save.json.gz',bytes=await fs.readFile(path.join(root,savePath));
  const raw=zlib.gunzipSync(bytes),original=JSON.parse(raw),manifest=JSON.parse(await fs.readFile(path.join(root,'docs/検証/接続条件/co-d02/saves/manifest.json')));
  const pinned=manifest.records.find(x=>x.path.endsWith('/entry.save.json.gz'));
  assert.equal(hash(bytes),pinned.gzip_sha256);assert.equal(hash(raw),pinned.raw_sha256);
  const {controller:start}=await open(original);
  await execute(start,'continue_scene',{scene_id:start.inspect().display_data.scene.id,advance:true,displayed_text_ids:[]});
  const ready=start.exportSave();assert.equal(ready.engine_version,versions.engine_version);
  pass('旧entry保存の読取り・通常更新で新しい規則/engineへ移行');

  const source=restoreGame(ready.session),pEffects=[effect('P',4,0,null,'self_guard'),effect('E1',2,10,2),effect('E1',1,0,null,'lasting'),effect('V0',1,5,3)];
  source.s.actors.P.defense_effects=copy(pEffects);
  source.s.actors.E1.defense_effects=[effect('E1',3,0,null,'self_guard'),effect('V0',2,10,2)];
  const vBefore=copy(source.s.actors.V0.defense_effects);source.retire('E1');source.assert();
  assert.deepEqual(source.s.actors.P.defense_effects,pEffects);assert.deepEqual(source.s.actors.V0.defense_effects,vBefore);
  assert.deepEqual(source.s.actors.E1.defense_effects,[]);assert.equal(source.guard('E1'),null);
  pass('付与元の退場は他者への付与を維持し、退場した受け手自身の全効果だけを解除');
  const checkpoint=documentWith(ready,source);validateDocument(checkpoint);
  const reopenedGame=restoreGame(checkpoint.session);assert.deepEqual(reopenedGame.s.actors.P.defense_effects,pEffects);
  assert.equal(reopenedGame.defense('P').duration.all.unlimited,true);
  pass('退場済み発生源からの有限/無制限を含む混在状態を保存再開できる');
  const grantBefore=hash(snapshot(source));assert.throws(()=>source.grantDefense('P',effect('E1',99,99,2)));
  assert.throws(()=>source.grantDefense('E1',effect('V0',99,99,2)));assert.equal(hash(snapshot(source)),grantBefore);
  pass('退場済み主体からの新規付与・退場済み受け手への付与は拒否');

  const consume=restoreGame(checkpoint.session);
  for(let n=1;n<=2;n++){
    const choice=prepare(consume,'h','V0','P');
    const preview=compare(consume,choice,'V0','付与元退場後も被攻撃 '+n+' 回目の消費と予測が一致');
    assert.equal(preview.hit_gain,0);
    assert.deepEqual(consume.s.actors.P.defense_effects.filter(e=>e.source_actor_id==='E1'&&e.effect_kind==='ward'),n===1?[effect('E1',2,10,1)]:[]);
    assert.deepEqual(consume.s.actors.P.defense_effects.find(e=>e.effect_kind==='self_guard'),pEffects[0]);
    assert.deepEqual(consume.s.actors.P.defense_effects.find(e=>e.effect_kind==='lasting'),effect('E1',1,0,null,'lasting'));
  }
  const place=restoreGame(checkpoint.session),placeChoice=prepare(place,'h','P',null,false);
  compare(place,placeChoice,'P','付与元退場後の本人不一致は効果を維持');assert.deepEqual(place.s.actors.P.defense_effects,pEffects);
  const match=restoreGame(checkpoint.session),matchChoice=prepare(match,'h','P','V0');
  compare(match,matchChoice,'P','付与元退場後も本人一致で本人分・外部分を共通解除');assert.deepEqual(match.s.actors.P.defense_effects,[]);

  for(const actor of ['P','V0']){
    const g=restoreGame(ready.session),recipient=actor==='P'?'V0':'P';
    g.s.actors[recipient].defense_effects=[effect(recipient,4,0,null,'self_guard'),effect('E1',2,10,3)];
    g.s.actors.E1.defense_effects=[effect('E1',3,0,null,'self_guard'),effect(recipient,2,0,3)];
    g.s.actors.E1.hp=1;g.s.actors.E1.hit=99;g.s.actors.E1.crit=0;g.s.actors[actor].crit=80;
    const before=copy(g.s.actors[recipient].defense_effects),choice=prepare(g,'f',actor,'E1');
    const preview=compare(g,choice,actor,actor+' の攻撃で付与元兼受け手が退場：他者付与維持・本人防御解除');
    assert.equal(preview.actual_hp_loss,1);assert.equal(g.s.actors.E1.active,false);assert.deepEqual(g.defense('E1').effects,[]);
    assert.deepEqual(g.s.actors[recipient].defense_effects,before);
    assert.equal(preview.actor_changes.E1.defense.after.duration.all.status,'empty');
  }
  const cascade=restoreGame(ready.session);cascade.s.actors.V0.hp=1;cascade.s.actors.V0.hit=cascade.s.actors.V0.max_posture-1;
  cascade.s.actors.V0.defense_effects=[effect('E1',0,0,null)];cascade.s.actors.E1.defense_effects=[effect('V0',4,10,null)];
  const cascadeChoice=prepare(cascade,'f','P','V0');compare(cascade,cascadeChoice,'P','環境突破による複数主体の退場でも受け手ごとに解除');
  assert.equal(cascade.s.actors.V0.active,false);assert.equal(cascade.s.actors.E1.active,false);
  assert.deepEqual(cascade.defense('V0').effects,[]);assert.deepEqual(cascade.defense('E1').effects,[]);assert.deepEqual(cascade.defense('V1').effects,[]);

  const old03=copy(checkpoint);old03.rule_set_id='CW-M1-rules-0.3';old03.engine_version='CW-M1-engine-0.3';
  // A declared old-format checkpoint: old retire() left these current effects on the retired recipient.
  old03.session.game.state.actors.E1.defense_effects=[effect('E1',3,0,null,'self_guard'),effect('V0',2,10,2)];
  const oldHash=hash(old03),current=validateDocument(old03),expected=copy(old03);
  expected.rule_set_id=versions.rule_set_id;expected.engine_version=versions.engine_version;expected.session.game.state.actors.E1.defense_effects=[];
  assert.deepEqual(current,expected);assert.equal(hash(old03),oldHash);
  pass('0.3保存は退場した受け手の現在効果だけ除去、他者への付与・過去履歴・乱数等を維持');
  for(const version of ['0.1','0.2']){
    const old=copy(checkpoint);old.rule_set_id='CW-M1-rules-'+version;old.engine_version='CW-M1-engine-'+version;
    delete old.session.game.state.defense_rule;
    for(const [id,a] of Object.entries(old.session.game.state.actors)){
      delete a.defense_effects;a.guard=id==='P'?{value:4,evasion:10,uses:2}:id==='E1'?{value:3,evasion:0,uses:1}:null;
    }
    const hashBefore=hash(old),migrated=validateDocument(old);
    assert.deepEqual(migrated.session.game.state.actors.P.defense_effects,[effect('P',4,10,2,'self_guard')]);
    assert.deepEqual(migrated.session.game.state.actors.E1.defense_effects,[]);assert.equal(hash(old),hashBefore);
    assert.deepEqual(migrated.session.action_history,old.session.action_history);
    pass(version+' からの旧guard変換でも活動中の回数を維持し退場側だけ解除');
  }
  const malformed=[
    ['現在版で退場主体に残る効果',d=>{d.rule_set_id=versions.rule_set_id;d.engine_version=versions.engine_version;}],
    ['0.3の無限数をnullへ変換して受理しない',d=>{d.session.game.state.actors.E1.defense_effects[0].uses=Infinity;}],
    ['0.3のNaNをnullへ変換して受理しない',d=>{d.session.game.state.actors.E1.defense_effects[0].uses=NaN;}],
    ['0.3の回数欠落',d=>{delete d.session.game.state.actors.E1.defense_effects[0].uses;}],
    ['0.3の退場側の重複枠',d=>{d.session.game.state.actors.E1.defense_effects.push(copy(d.session.game.state.actors.E1.defense_effects[0]));}],
    ['規則/engineの混在',d=>{d.engine_version=versions.engine_version;}]
  ];
  for(const [name,mutate] of malformed){const d=copy(old03);mutate(d);assert.throws(()=>validateDocument(d));pass(name+'を拒否');}

  const {storage,api,controller}=await open(old03),stored=hash(await storage.load('check')),exported=hash(controller.exportSave());
  const view=controller.inspect();assert.deepEqual(view.display_data.exploration.actors.E1.defense.effects,[]);
  assert.deepEqual(view.display_data.exploration.self.defense.effects,pEffects);assert.equal(hash(await storage.load('check')),stored);
  const imported=await api.importSave({slot_id:'import',document:old03,request_id:'d57-import'});
  assert.deepEqual(imported.exportSave().session,current.session);assert.equal(imported.exportSave().revision,old03.revision+1);
  pass('旧版open/inspectは無書込み、公開現在値は受け手解除済み、importは正規化した状態を保存');
  const choice=view.display_data.exploration.legal_actions.find(c=>c.target===null)||view.display_data.exploration.legal_actions[0];assert(choice);
  controller.previewAction({view_token:view.meta.view_token,choice});assert.equal(hash(controller.exportSave()),exported);
  assert.equal(hash(await storage.load('check')),stored);
  const cmd=command(controller,'play',{choice});storage.failNext=true;
  assert.equal((await controller.execute(cmd)).display_data.error.code,'storage_write_failed');
  assert.equal(hash(await storage.load('check')),stored);assert.equal(hash(controller.exportSave()),exported);
  assert.equal((await controller.execute(cmd)).display_data.error,null);
  const committed=await storage.load('check');assert.equal(committed.engine_version,versions.engine_version);
  assert.deepEqual(committed.session.game.state.actors.E1.defense_effects,[]);assert.equal(committed.revision,old03.revision+1);
  assert.deepEqual(committed.session.action_history.slice(0,old03.session.action_history.length),old03.session.action_history);
  const committedHash=hash(committed);assert.equal((await controller.execute(cmd)).display_data.operation.status,'replayed');
  assert.equal(hash(await storage.load('check')),committedHash);
  const reopened=await api.open({slot_id:'check'});assert.deepEqual(reopened.exportSave(),committed);
  pass('予測・書込み失敗は無変更、更新成功時に0.4保存、再送・再開一致');
  assert.equal(hash(await fs.readFile(path.join(root,savePath))),hash(bytes));
  const codePaths=['src/runtime/core.mjs','src/runtime/defense.mjs','src/runtime/validate.mjs','src/runtime/game.mjs','src/runtime/action-public.mjs','src/runtime/view.mjs','src/runtime/campaign.mjs','src/content/m1.mjs','scripts/generate-m1-content.py','test/runtime/d57.mjs'];
  const code=Object.fromEntries(await Promise.all(codePaths.map(async p=>[p,hash(await fs.readFile(path.join(root,p)))])));
  const report={test_id:'CW-M1-D57-001',date_jst:'2026-09-19',node:process.version,storage:'MemoryStore',versions,
    input:{path:savePath,gzip_sha256:hash(bytes),raw_sha256:hash(raw)},code,check_count:checks.length,checks,passed:true,
    scope:'Recipient retirement only; source departure retention adopted. Declared actor/card arrangements and 0.3/0.2/0.1 save cases, not a natural route.',
    old_results:'D02/D55/D56 inputs and verification JSON unchanged; no full old test reruns',
    unverified:['SCN-001 support card placement and supply','UI drawing/layout','real browser/IndexedDB/input','player/balance evaluation']};
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(output,'examples.json'),JSON.stringify({test_id:report.test_id,examples},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks:checks.length,one_step_examples:examples.length,output}));
} catch(error){
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({passed:false,checks,error:String(error.stack||error)},null,2)+'\n');throw error;
}
