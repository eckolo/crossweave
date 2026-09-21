// D56: declared counterfactual states; never overwrite the frozen saves or old results.
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
import {abilityValues} from '../../src/runtime/action-public.mjs';
import I from '../../src/runtime/information.mjs';
import {MemoryStore,execute,command} from './support.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'docs/検証/接続条件/co-d02/appendix-d56'));
const input=JSON.parse(await fs.readFile(path.join(root,'test/runtime/d56-trial-input.json')));
const saves=path.join(root,'docs/検証/接続条件/co-d02/saves');
const digest=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const records=[],inputs=[],fixtures=[],examples=[];
const passed=(name,detail={})=>records.push({name,pass:true,...detail});
const effect=(source,guard,evasion,uses,kind='ward')=>({source_actor_id:source,effect_kind:kind,guard,evasion,uses});
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
function prepare(g,type,actor='P',matched=true,fieldType=null,cardID=null){
  const a=g.s.actors[actor];
  for(const id of [...a.hand]){take(g,id);a.deck.push(id);}
  for(const id of Object.values(g.s.field)){take(g,id);g.recover(id,'d56_fixture_clear_field');}
  const c=cardID?g.s.cards[cardID]:Object.values(g.s.cards).find(c=>!c.destroyed&&c.type===type);assert(c,type);
  take(g,c.id);a.hand.push(c.id);c.remaining=c.life;
  if(matched){
    const m=Object.values(g.s.cards).find(x=>!x.destroyed&&x.id!==c.id&&x.attr===c.attr&&(!fieldType||x.type===fieldType));assert(m,'material');
    take(g,m.id);g.s.field[c.attr]=m.id;
  }
  g.s.ready=true;g.assert();return {card_id:c.id,target:matched&&c.kind==='attack'?'E1':null};
}
function arrange(source,{type,matched=true,actor='P',target='E1',fieldType=null,changes={}}){
  const d=copy(source),g=restoreGame(d.session),choice=prepare(g,type,actor,matched,fieldType);
  if(choice.target)choice.target=target;
  for(const [id,change] of Object.entries(changes))Object.assign(g.s.actors[id],copy(change));
  g.assert();d.session.game=g.save();d.session.scene.pause=false;validateDocument(d);
  return {document:d,actor,choice};
}
function compare(g,choice,actor,name,expected={}){
  const before=digest(state(g)),preview=g.predict(choice,actor);
  const actual=new g.constructor(copy(g.bundle),{state:copy(g.s),next_card_number:g.number,memory:copy(g.memory),
    rng:Object.fromEntries(Object.entries(g.rng).map(([k,r])=>[k,r.state()]))});actual.play(actor,choice);
  assert.equal(digest(state(g)),before,'preview changed source/RNG');
  const row=actual.trace.findLast(r=>r.type==='action'&&r.actor===actor);
  for(const [key,value] of Object.entries(expected.action||{})){
    assert.equal(row[key],value,`${name}: action ${key}`);assert.equal(preview[key],value,`${name}: preview ${key}`);
  }
  for(const [id,expect] of Object.entries(expected.actors||{})){
    const values=abilityValues(actual,id);
    for(const [key,value] of Object.entries(expect))assert.equal(values[key],value,`${name}: ${id}.${key}`);
  }
  for(const [id,change] of Object.entries(preview.actor_changes)){
    if(change.status!=='known')continue;
    assert.deepEqual(change.defense.after,actual.defense(id));assert.deepEqual(change.stance.after,actual.guard(id));
    for(const [key,v] of Object.entries(change.values))if(v.status==='known')assert.equal(v.after,abilityValues(actual,id)[key]);
  }
  fixtures.push({name,input_sha256:before,actor,choice,expected,after_defense:Object.fromEntries(Object.keys(actual.s.actors).map(id=>[id,actual.defense(id)]))});
  passed(name);return {actual,preview};
}
// Fixture adds a single authored card for the common resolver. Production registry/validation stay fixed.
class TrialGame extends Game {
  cost(type,match){return type===input.support_card.type?(match?input.support_card.match_cost:input.support_card.place_cost):super.cost(type,match);}
  stats(c){if(c.type===input.support_card.type)Object.assign(c,copy(input.support_card));else super.stats(c);}
}
await fs.mkdir(output,{recursive:true});
try {
  assert.equal(versions.rule_set_id,'CW-M1-rules-0.3');assert.equal(versions.engine_version,'CW-M1-engine-0.3');
  assert.equal(versions.public_contract,'CW-M1-public-0.3');assert.equal(versions.schema,'CW-M1-save-1');
  const manifest=JSON.parse(await fs.readFile(path.join(saves,'manifest.json'))),docs={};
  for(const name of ['entry','port','return','home','second-return']){
    const filename=name+'.save.json.gz',bytes=await fs.readFile(path.join(saves,filename)),raw=zlib.gunzipSync(bytes);
    const record=manifest.records.find(r=>r.path.endsWith('/'+filename));
    assert.equal(digest(bytes),record.gzip_sha256);assert.equal(digest(raw),record.raw_sha256);
    const original=JSON.parse(raw),hash=digest(original);docs[name]=original;
    for(const v of ['0.1','0.2']){
      const old={...copy(original),rule_set_id:'CW-M1-rules-'+v,engine_version:'CW-M1-engine-'+v},current=validateDocument(old),restored=copy(current);
      if(restored.session.game){
        delete restored.session.game.state.defense_rule;
        for(const [id,a] of Object.entries(restored.session.game.state.actors)){
          const g=old.session.game.state.actors[id].guard;
          assert.deepEqual(a.defense_effects,g?[effect(id,g.value,g.evasion,g.uses,'self_guard')]:[]);
          delete a.defense_effects;a.guard=copy(g);
        }
      }
      restored.rule_set_id=old.rule_set_id;restored.engine_version=old.engine_version;assert.deepEqual(restored,old);
      const {storage,api,controller}=await open(old),stored=digest(await storage.load('check'));
      controller.inspect();assert.deepEqual(controller.exportSave(),current);assert.equal(digest(await storage.load('check')),stored);
      const imported=await api.importSave({slot_id:'import',document:old,request_id:'d56-import-'+name+v});
      assert.deepEqual(imported.exportSave().session,current.session);assert.equal(imported.exportSave().revision,old.revision+1);
    }
    assert.equal(digest(original),hash);inputs.push({name,gzip_sha256:digest(bytes),raw_sha256:digest(raw)});
    passed('旧保存 '+name+'：0.1/0.2を効果配列へ変換、数値・過去履歴・乱数等を維持、読取り無書込み・輸入');
  }
  const {controller:start}=await open(docs.entry);
  await execute(start,'continue_scene',{scene_id:start.inspect().display_data.scene.id,advance:true,displayed_text_ids:[]});
  const ready=start.exportSave(),mixed=[effect('E1',4,0,null,'self_guard'),effect('P',2,10,2),effect('V0',0,15,1)];
  const cases=[
    ['削り0でも各有限効果を消費、無制限の構えと機転は保持',
      {type:'h',fieldType:'h',changes:{E1:{hit:0,crit:125,defense_effects:mixed}}},
      {action:{hit_gain:0,hit_connected:false,actual_hp_loss:0},actors:{E1:{guard:6,guard_evasion:10,guard_uses:null,crit:125,hit:0}}}],
    ['最後の外部付与を適用後に終了、構えは有限回数を借用しない',
      {type:'h',fieldType:'h',changes:{E1:{hit:0,defense_effects:[mixed[0],effect('P',2,10,1)]}}},
      {action:{hit_gain:0},actors:{E1:{guard:4,guard_evasion:0,guard_uses:null}}}],
    ['合算身構に受け手の一閃を一度適用、0ダメージでも各回数を消費',
      {type:'f',fieldType:'f',changes:{P:{crit:80},E1:{hit:99,crit:125,defense_effects:[effect('E1',1,0,2,'self_guard'),effect('V0',2,0,1)]},V0:{crit:900}}},
      {action:{hit_connected:true,actual_hp_loss:0},actors:{P:{crit:0},E1:{guard:1,guard_uses:1,crit:0,hit:0}}}],
    ['追加身構だけでも受け手の倍率を使い、付与元の機転を消費しない',
      {type:'f',fieldType:'f',changes:{P:{crit:80},E1:{hit:99,crit:125,defense_effects:[effect('V0',2,0,1)]},V0:{crit:900}}},
      {action:{actual_hp_loss:2},actors:{E1:{guard:0,guard_uses:0,crit:0},V0:{crit:900}}}],
    ['本人の攻撃一致で外部分も共通解除、即時再生しない',
      {type:'h',fieldType:'h',changes:{P:{defense_effects:[effect('P',4,0,null,'self_guard'),effect('V0',2,10,2)]}}},
      {actors:{P:{guard:0,guard_evasion:0,guard_uses:0}}}],
    ['本人の回復一致でも旧防御全体を解除',
      {type:'salve',changes:{P:{hp:30,defense_effects:[effect('P',4,0,null,'self_guard'),effect('V0',2,10,2)]}}},
      {action:{hp_restored:10},actors:{P:{guard:0,guard_uses:0}}}],
    ['本人の防御一致は外部分を含む旧効果を消して新しい防御へ',
      {type:'g',fieldType:'g',changes:{P:{defense_effects:[effect('P',4,0,null,'self_guard'),effect('V0',2,10,2)]}}},
      {actors:{P:{guard:0,guard_uses:2,guard_evasion:0}}}],
    ['不一致の設置では本人と外部の効果を保持',
      {type:'salve',matched:false,changes:{P:{defense_effects:[effect('P',4,0,null,'self_guard'),effect('V0',2,10,2)]}}},
      {action:{mode:'place'},actors:{P:{guard:6,guard_uses:null,guard_evasion:10}}}],
    ['他者への一致攻撃は対象外の防御回数を消費しない',
      {type:'h',fieldType:'h',target:'V0',changes:{E1:{defense_effects:[effect('E1',3,20,2,'self_guard')]}}},
      {actors:{E1:{guard:3,guard_uses:2,guard_evasion:20}}}],
    ['NPCから本人への攻撃も複数の有限効果を同時消費',
      {type:'f',fieldType:'f',actor:'E1',target:'P',changes:{P:{hit:0,crit:125,defense_effects:[effect('P',3,20,1,'self_guard'),effect('V0',2,10,2)]}}},
      {action:{hit_gain:70,hit_connected:false},actors:{P:{guard:2,guard_uses:1,guard_evasion:10,crit:125}}}]
  ];
  for(const [name,options,expected] of cases){const f=arrange(ready,options),g=restoreGame(f.document.session);const r=compare(g,f.choice,f.actor,name,expected);if(examples.length<3)examples.push({name,preview:r.preview});}

  const g=restoreGame(ready.session);g.s.actors.P.defense_effects=[];
  g.grantDefense('P',effect('P',4,0,null,'self_guard'));g.grantDefense('P',effect('V0',7,20,3));
  g.grantDefense('P',effect('E1',2,10,2));g.grantDefense('P',effect('V0',1,5,1));
  assert.equal(g.defense('P').effects.length,3);assert.equal(g.guard('P').value,7);assert.equal(g.guard('P').evasion,15);
  assert.deepEqual(g.defense('P').effects.find(e=>e.source_actor_id==='V0'),effect('V0',1,5,1));
  const saved=g.save(),again=new Game(copy(g.bundle),saved);assert.deepEqual(again.defense('P'),g.defense('P'));
  passed('弱い同種の再付与は三値を丸ごと置換し、本人と別発生源の効果・保存を維持');
  g.grantDefense('P',effect('V0',3,0,null,'another_kind'));
  assert.equal(g.defense('P').effects.length,4);passed('同じ発生源でも異なる効果種は別枠');
  const duration=g.defense('P').duration;
  assert.deepEqual(duration.all,{effect_count:4,finite_min:1,finite_max:2,unlimited:true,status:'mixed',uniform_uses:null});
  assert.equal(duration.evasion.unlimited,false);assert.equal(duration.evasion.finite_min,1);
  assert.equal(g.guard('P').uses,null);assert.equal(abilityValues(g,'P').guard_uses,null);
  passed('混在回数は最大回数へ偽装せず、能力別の幅・無制限を公開');

  const base=restoreGame(ready.session),trial=new TrialGame(copy(base.bundle),base.save());
  const card1=trial.newCard('P','trial',null,input.support_card);trial.s.pool.push(card1);
  const card2=trial.newCard('P','trial',null,input.support_card);trial.s.pool.push(card2);trial.save();
  let choice=prepare(trial,input.support_card.type,'V0',true,'f',card1);trial.save();
  trial.grantDefense('V0',effect('E1',9,30,null));
  trial.grantDefense('P',effect('P',4,0,null,'self_guard'));
  let r=compare(trial,choice,'V0','借用した手札の支援一致：使用者以外の全活動主体へ、使用者を発生源として付与');
  assert.equal(r.actual.defense('V0').effects.length,0);
  assert.deepEqual(r.actual.defense('P').effects.find(e=>e.effect_kind==='ward'),effect('V0',2,10,2));
  assert.deepEqual(r.actual.defense('E1').effects,[effect('V0',2,10,2)]);
  assert.deepEqual(I.card(trial.s.cards[card1]).defense_grant,input.support_card.defense_grant);
  examples.push({name:'全員付与の明示試行札（製品配置なし）',preview:r.preview});
  const next=r.actual;choice=prepare(next,input.support_card.type,'V0',true,'f',card2);next.save();
  r=compare(next,choice,'V0','同種の別札個体で再付与しても同じ発生源の枠は増えない');
  assert.deepEqual(r.actual.defense('P').effects, next.defense('P').effects);
  const departed=r.actual;
  departed.dispatch('V0','P');
  assert.deepEqual(departed.defense('V1').effects,[]);
  const inactiveBefore=copy(departed.s.actors.E1.defense_effects);
  const laterID=departed.newCard('P','trial',null,input.support_card);departed.s.pool.push(laterID);
  choice=prepare(departed,input.support_card.type,'P',true,null,laterID);departed.save();
  r=compare(departed,choice,'P','後から登場した主体へ遡及付与せず、次の付与は退場済み主体を除外');
  assert.deepEqual(r.actual.s.actors.E1.defense_effects,inactiveBefore);
  assert.deepEqual(r.actual.defense('V1').effects,[effect('P',2,10,2)]);
  const placed=new TrialGame(copy(base.bundle),base.save());
  const placeID=placed.newCard('P','trial',null,input.support_card);placed.s.pool.push(placeID);
  choice=prepare(placed,input.support_card.type,'P',false,null,placeID);placed.save();
  r=compare(placed,choice,'P','付与札の不一致は設置のみで全員付与しない');
  assert.equal(r.actual.defense('E1').effects.length,0);
  const material=r.actual;choice=prepare(material,'f','P',false);material.s.field.A=placeID;
  // Put the previously placed support back in the field without duplicating its location.
  take(material,placeID);material.s.field.A=placeID;choice.target='E1';material.save();
  r=compare(material,choice,'P','付与札を場の一致材料にしても主効果を発動しない');
  assert.equal(r.actual.defense('E1').effects.length,0);

  for(const uses of input.stance_uses){
    const stance=new TrialGame(copy(base.bundle),base.save()),choice=prepare(stance,'g','P',true,'g');
    stance.s.cards[choice.card_id].defense_uses=uses;stance.save();
    const r=compare(stance,choice,'P','明示試行防御札の回数 '+String(uses)+' を本人一致で付与');
    assert.deepEqual(r.actual.defense('P').effects,[effect('P',0,0,uses,'self_guard')]);
    assert.equal(I.card(stance.s.cards[choice.card_id]).defense_uses,uses);
  }

  // Departure retention is a declared trial assumption, not an adopted card rule.
  const departure=restoreGame(ready.session);departure.grantDefense('P',effect('V0',2,10,2));departure.retire('V0');
  assert.deepEqual(departure.defense('P').effects,[effect('V0',2,10,2)]);
  passed('仮条件：付与元退場後の残存を確認（採否待ち、SCN-001へ配置なし）');

  const valid=copy(ready);valid.session.game=g.save();validateDocument(valid);
  const malformed=[
    ['現在版の効果配列欠落',d=>{delete d.session.game.state.actors.P.defense_effects;}],
    ['同じ発生源・同種の重複',d=>{d.session.game.state.actors.P.defense_effects.push(copy(d.session.game.state.actors.P.defense_effects[0]));}],
    ['回数0',d=>{d.session.game.state.actors.P.defense_effects[0].uses=0;}],
    ['負の回数',d=>{d.session.game.state.actors.P.defense_effects[0].uses=-1;}],
    ['小数の回数',d=>{d.session.game.state.actors.P.defense_effects[0].uses=1.5;}],
    ['回数欠落',d=>{delete d.session.game.state.actors.P.defense_effects[0].uses;}],
    ['Infinityを無制限へ変換しない',d=>{d.session.game.state.actors.P.defense_effects[0].uses=Infinity;}],
    ['NaNを無制限へ変換しない',d=>{d.session.game.state.actors.P.defense_effects[0].uses=NaN;}],
    ['未知の発生源',d=>{d.session.game.state.actors.P.defense_effects[0].source_actor_id='unknown';}],
    ['旧guardと新配列の二重保存',d=>{d.session.game.state.actors.P.guard=null;}],
    ['未対応版',d=>{d.engine_version='future';}],
    ['版の混在',d=>{d.engine_version='CW-M1-engine-0.2';}],
  ];
  for(const [name,mutate] of malformed){const d=copy(valid);mutate(d);assert.throws(()=>validateDocument(d));passed(name+'を拒否');}
  const corruptOld=copy(docs.entry);corruptOld.session.game.state.actors.P.guard={value:3,evasion:0,uses:0};
  assert.throws(()=>validateDocument(corruptOld));passed('壊れた旧防御回数を移行で修復しない');
  const injected=copy(docs.entry);injected.session.game.state.actors.P.defense_effects=[];
  assert.throws(()=>validateDocument(injected));passed('旧版を装った新効果の注入を拒否');

  const f=arrange(ready,cases[0][1]),{storage,api,controller}=await open(f.document);
  const storedBefore=digest(await storage.load('check')),exportBefore=digest(controller.exportSave()),view=controller.inspect();
  assert.deepEqual(view.display_data.exploration.actors.E1.defense,restoreGame(f.document.session).defense('E1'));
  const preview=controller.previewAction({view_token:view.meta.view_token,choice:f.choice});
  assert.equal(preview.display_data.action_preview.actor_changes.E1.values.guard_uses.status,'unsupported');
  assert.equal(preview.display_data.action_preview.actor_changes.E1.defense.after.duration.all.finite_min,1);
  assert.equal(digest(await storage.load('check')),storedBefore);assert.equal(digest(controller.exportSave()),exportBefore);
  passed('公開現在値と一手予測：混在回数と内訳を公開、保存・revision・乱数を変更しない');
  const illegal=await controller.execute(command(controller,'play',{choice:{...f.choice,target:'missing'}}));
  assert.equal(illegal.display_data.error.code,'illegal_choice');assert.equal(digest(await storage.load('check')),storedBefore);
  const cmd=command(controller,'play',{choice:f.choice});storage.failNext=true;
  const failure=await controller.execute(cmd);assert.equal(failure.display_data.error.code,'storage_write_failed');
  assert.equal(digest(await storage.load('check')),storedBefore);assert.equal(digest(controller.exportSave()),exportBefore);
  const success=await controller.execute(cmd);assert.equal(success.display_data.error,null);
  const committed=await storage.load('check');assert.equal(committed.revision,f.document.revision+1);
  const hash=digest(committed),replay=await controller.execute(cmd);assert.equal(replay.display_data.operation.status,'replayed');
  assert.equal(digest(await storage.load('check')),hash);
  const reopened=await api.open({slot_id:'check'});assert.deepEqual(reopened.exportSave(),committed);
  passed('不正操作・保存失敗は無変更、再送は二重消費なし、効果配列の再開一致');
  const fresh=await api.create({slot_id:'fresh',rule_set_id:versions.rule_set_id,content_set_id:versions.content_set_id,request_id:'d56-create'});
  assert.equal(fresh.exportSave().rule_set_id,versions.rule_set_id);passed('新規Campaignも新規則・engineで開始');
  for(const i of inputs)assert.equal(digest(await fs.readFile(path.join(saves,i.name+'.save.json.gz'))),i.gzip_sha256);
  const codePaths=['src/runtime/defense.mjs','src/runtime/core.mjs','src/runtime/game.mjs','src/runtime/validate.mjs','src/runtime/action-public.mjs','src/runtime/view.mjs','src/runtime/information.mjs','src/runtime/campaign.mjs','src/content/m1.mjs','scripts/generate-m1-content.py','test/runtime/d56.mjs','test/runtime/d56-trial-input.json'];
  const code=Object.fromEntries(await Promise.all(codePaths.map(async p=>[p,digest(await fs.readFile(path.join(root,p)))])));
  const report={test_id:'CW-M1-D56-001',date_jst:'2026-09-19',node:process.version,storage:'MemoryStore',versions,inputs,trial_input:input,code,
    scope:'D56 effect layers, replacement, common clear, D54/D55, migration, public forecast; trial support card not in production registry',
    checks:records,check_count:records.length,one_step_fixtures:fixtures.length,passed:true,
    unverified:['real browser/IndexedDB/input','UI layout/readability','balance/natural route under new cards','source departure rule adoption','SCN-001 support card placement/supply']};
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(output,'examples.json'),JSON.stringify({test_id:report.test_id,fixtures,examples},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks:records.length,one_step_fixtures:fixtures.length,legacy_saves:inputs.length,output}));
} catch(error) {
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({passed:false,completed:records,error:String(error.stack||error)},null,2)+'\n');throw error;
}
