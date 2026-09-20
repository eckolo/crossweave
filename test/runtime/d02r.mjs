// CW-M1-A-002: scoped supplement checks; never call the old natural-run suites.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {restoreGame} from '../../src/runtime/game.mjs';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {project} from '../../src/runtime/view.mjs';
import {copy,canonical} from '../../src/runtime/common.mjs';
import I from '../../src/runtime/information.mjs';
import {MemoryStore,execute,command} from './support.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const saveRoot=path.join(root,'docs/検証/接続条件/co-d02/saves');
const out=path.resolve(process.argv[2]);await fs.mkdir(out,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const checks=[],fixtures=[],examples={};
const check=(name,value,detail={})=>{assert(value,name);checks.push({name,pass:true,...detail});};
let choiceCount=0;
const docs={};
const stateOf=g=>({state:g.s,memory:g.memory,number:g.number,rng:Object.fromEntries(Object.entries(g.rng).map(([k,r])=>[k,r.state()])),bundle:g.bundle,trace:g.trace});
function take(g,id){
  for(const a of Object.values(g.s.actors)){a.hand=a.hand.filter(x=>x!==id);a.deck=a.deck.filter(x=>x!==id);}
  g.s.pool=g.s.pool.filter(x=>x!==id);
  for(const [attr,x] of Object.entries(g.s.field))if(x===id)delete g.s.field[attr];
  g.s.cards[id].remaining=null;
}
function arranged(document,type,matched,{target='E1',fieldType=null,changes={}}={}){
  const d=copy(document),g=restoreGame(d.session),p=g.s.actors.P;
  // Explicit counterfactual card locations and stats; no battle history is claimed.
  for(const id of [...p.hand]){take(g,id);p.deck.push(id);}
  for(const id of Object.values(g.s.field)){take(g,id);g.recover(id,'declared_fixture_clear_field');}
  const c=Object.values(g.s.cards).find(c=>!c.destroyed&&c.type===type&&(c.origin==='P'||type.startsWith('nt_')));assert(c,type);
  take(g,c.id);p.hand.push(c.id);c.remaining=c.life;
  if(matched){
    const material=Object.values(g.s.cards).find(x=>!x.destroyed&&x.id!==c.id&&x.attr===c.attr&&(!fieldType||x.type===fieldType));assert(material,'material');
    take(g,material.id);g.s.field[c.attr]=material.id;
  }
  for(const [id,patch] of Object.entries(changes))Object.assign(g.s.actors[id],copy(patch));
  g.s.ready=true;g.assert();d.session.game=g.save();d.session.scene.pause=false;
  validateDocument(d);
  const choice={card_id:c.id,target:matched&&c.kind==='attack'?target:null};
  return {document:d,choice,recipe:{type,matched,target,fieldType,changes,description:'entry public continue; move current cards as arranged(), preserve registry and provenance'}};
}
async function openFixed(document){
  const storage=new MemoryStore();storage.records.set('check',copy(document));
  const Campaign=createCampaign({storage}),controller=await Campaign.open({slot_id:'check'});
  return {storage,Campaign,controller};
}
function checkForecast(g,choice,name){
  const before=hash(stateOf(g)),forecast=g.predict(choice),actual=restoreGame({...docs.entry.session,game:g.save()});
  // restoreGame's target set is entry for these explicitly arranged checks.
  actual.step(choice);choiceCount++;
  assert.equal(hash(stateOf(g)),before,'predict mutates source');
  assert.deepEqual(Object.keys(forecast.actor_changes),Object.keys(g.s.actors),'forecast publishes new actor');
  for(const [id,row] of Object.entries(forecast.actor_changes)){
    assert.equal(row.status,'known');const a=actual.s.actors[id];
    const expected={hp:a.hp,max_hp:a.max_hp,hit:a.hit,posture_remaining:a.max_posture-a.hit,max_posture:a.max_posture,
      crit:a.crit,critical_multiplier:1+Math.floor(a.crit/100),guard:a.guard?.value??0,guard_uses:a.guard?.uses??0,
      guard_evasion:a.guard?.evasion??0,evasion:actual.evasion(id),reduction:actual.passive(id,'damage_reduction')};
    for(const [k,n] of Object.entries(expected)){assert.equal(row.values[k].after,n,`${name} ${id} ${k}`);assert.equal(row.values[k].delta,n-row.values[k].before);}
    assert.deepEqual(row.stance.after,a.guard);assert.equal(row.active.after,a.active);
  }
  check(name,true,{actors:Object.keys(forecast.actor_changes),choice});return {forecast,actual};
}
try {
  const manifest=JSON.parse(await fs.readFile(path.join(saveRoot,'manifest.json')));
  for(const name of ['entry','port','return','home','second-return']){
    const file=name+'.save.json.gz',bytes=await fs.readFile(path.join(saveRoot,file)),raw=zlib.gunzipSync(bytes),record=manifest.records.find(r=>r.path.endsWith('/'+file));
    assert.equal(hash(bytes),record.gzip_sha256);assert.equal(hash(raw),record.raw_sha256);
    const document=JSON.parse(raw);docs[name]=document;
    assert.deepEqual(validateDocument(document),document);
    const {storage,Campaign,controller}=await openFixed(document),before=hash(await storage.load('check'));
    const view=controller.inspect();controller.inspect();
    assert.equal(hash(await storage.load('check')),before);assert.deepEqual(controller.exportSave(),document);
    const imported=await Campaign.importSave({slot_id:'import',document,request_id:'d02r-import'});
    assert.deepEqual(imported.exportSave().session,document.session);assert.deepEqual(imported.exportSave().casebook,document.casebook);
    assert.deepEqual(imported.exportSave().session.economy.at.pending_contexts,document.session.economy.at.pending_contexts);
    check('旧自然保存 '+name+' の無変更open・純粋inspect・輸入互換',true);
    const history=view.display_data.action_history.filter(r=>r.type==='action');
    check('旧履歴 '+name+' の欠損札名を推定しない',history.every(r=>r.card_name===null&&r.card_name_status==='not_recorded'));
  }
  const {controller:start}=await openFixed(docs.entry);
  await execute(start,'continue_scene',{scene_id:start.inspect().display_data.scene.id,advance:true,displayed_text_ids:[]});
  const ready=start.exportSave();
  const cases=[
    ['設置は身構・機転を保持し回復草でも回復しない','salve',false,{changes:{P:{hp:30,crit:125,guard:{value:4,evasion:7,uses:1}}}}],
    ['攻撃一致で本人の身構終了・機転消費・相手の一回防御終了','f',true,{fieldType:'f',changes:{P:{crit:80,guard:{value:4,evasion:7,uses:2}},E1:{hit:99,crit:120,guard:{value:1,evasion:0,uses:1}}}}],
    ['届かない攻撃は機転を保持し防御回数を消費しない','h',true,{fieldType:'h',changes:{P:{crit:80},E1:{hit:0,crit:120,guard:{value:3,evasion:20,uses:2}}}}],
    ['汐留めで身構置換・常時攪乱込みの総量','nt_stop',true,{fieldType:'nt_stop',changes:{P:{guard:{value:9,evasion:30,uses:1}},V1:{passives:[{target:'P',kind:'evasion',value:20},{target:'P',kind:'damage_reduction',value:8}]}}}],
    ['回復一致は上限まで4回復し旧身構が終わる','salve',true,{changes:{P:{hp:36,guard:{value:5,evasion:30,uses:2}}}}],
    ['被攻撃の二回身構は一回残る','f',true,{fieldType:'f',changes:{E1:{hit:99,guard:{value:1,evasion:0,uses:2}}}}],
    ['支援源撃破で本人と別主体の常時作用が消える','f',true,{fieldType:'f',changes:{E1:{hp:1,hit:99,passives:[{target:'P',kind:'evasion',value:20},{target:'V0',kind:'damage_reduction',value:8}]}}}],
    ['環境踏破の退場まで予測し新しい相手を先に公開しない','f',true,{target:'V0',fieldType:'f',changes:{V0:{hp:1,hit:0},E1:{passives:[{target:'P',kind:'evasion',value:20}]}}}]
  ];
  for(const [name,type,matched,options] of cases){
    const f=arranged(type==='nt_stop'?docs.port:ready,type,matched,options),g=restoreGame(f.document.session);
    const {forecast,actual}=checkForecast(g,f.choice,name);
    fixtures.push({name,source:type==='nt_stop'?'port.save.json.gz':'entry.save.json.gz + public continue_scene',...f.recipe,input_sha256:hash(f.document),forecast_sha256:hash(forecast)});
    if(type==='salve'&&!matched){assert.equal(forecast.hp_restored,0);assert.equal(forecast.actor_changes.P.values.guard.delta,0);assert.equal(forecast.actor_changes.P.values.crit.delta,0);}
    if(name.startsWith('攻撃一致')){assert.equal(forecast.crit_added,25);assert.equal(forecast.actor_changes.P.values.crit.after,0);assert.equal(forecast.actor_changes.P.values.crit.delta,-80);assert.equal(forecast.actor_changes.E1.values.guard_uses.after,0);}
    if(type==='nt_stop'){assert.equal(forecast.actor_changes.P.values.guard.after,5);assert.equal(forecast.actor_changes.P.values.evasion.after,60);assert.equal(forecast.actor_changes.P.values.reduction.after,8);examples.ability_preview=forecast;}
    if(name.startsWith('回復一致'))assert.equal(forecast.actor_changes.P.values.hp.delta,4);
    if(name.startsWith('支援源')){assert.equal(forecast.actor_changes.P.values.evasion.delta,-20);assert.equal(forecast.actor_changes.V0.values.reduction.delta,-8);}
    if(name.startsWith('環境踏破')){assert(actual.s.actors.V1);assert(!forecast.actor_changes.V1);assert.equal(forecast.actor_changes.E1.active.after,false);}
    const {storage,controller}=await openFixed(f.document),before=hash(await storage.load('check')),beforeView=controller.inspect();
    const result=controller.previewAction({view_token:beforeView.meta.view_token,choice:f.choice});
    assert(!result.display_data.error);assert.deepEqual(result.display_data.action_preview.actor_changes,forecast.actor_changes);
    assert.equal(hash(await storage.load('check')),before);assert.deepEqual(controller.inspect(),beforeView);
    const stale=controller.previewAction({view_token:'stale',choice:f.choice});
    assert.equal(stale.display_data.action_preview.supported,false);assert.equal(stale.display_data.action_preview.actor_changes,null);
    // Different private permutations/streams must not alter this public one-step forecast.
    const hidden=restoreGame(f.document.session);
    for(const [id,a] of Object.entries(hidden.s.actors))if(id!=='P')a.deck.reverse();
    for(const [key,rng] of Object.entries(hidden.rng))if(!key.startsWith('P|'))rng.uint();
    for(const state of Object.values(hidden.bundle.future_rng))state[0]=(state[0]+1)>>>0;
    assert.deepEqual(hidden.predict(f.choice),forecast);
  }
  check('全8予測の保存・revision・乱数不変、staleはnull、未知札順／乱数に非依存',true);
  const named=arranged(ready,'f',true,{fieldType:'f',changes:{E1:{hit:99}}});
  const {storage,Campaign,controller}=await openFixed(named.document);
  const commandPlay=command(controller,'play',{choice:named.choice});
  const snapshotBefore=controller.exportSave();storage.failNext=true;
  assert.equal((await controller.execute(commandPlay)).display_data.error.code,'storage_write_failed');
  assert.deepEqual(controller.exportSave(),snapshotBefore);assert.deepEqual(await storage.load('check'),snapshotBefore);
  await controller.execute(commandPlay);const saved=controller.exportSave();
  const row=saved.session.action_history.findLast(r=>r.actor==='P');assert.equal(row.card_name,'牽制');
  const reopened=await Campaign.open({slot_id:'check'});
  const history=reopened.inspect().display_data.action_history;
  assert.equal(history.findLast(r=>r.actor==='P').card_name,'牽制');
  assert(history.filter(r=>r.type==='action'&&r.time>=ready.session.game.state.now).some(r=>r.actor!=='P'&&r.card_name));
  await reopened.execute(commandPlay);assert.deepEqual(reopened.exportSave(),saved);
  check('解決時の本人／NPC札名を実保存・再開・同要求再送で維持、保存失敗は不変',true);
  examples.action_history=history;
  const historical=copy(saved);historical.session.action_history.findLast(r=>r.actor==='P').card_name='当時の公開名';
  assert.equal(project(validateDocument(historical)).display_data.action_history.findLast(r=>r.actor==='P').card_name,'当時の公開名');
  delete historical.session.action_history.findLast(r=>r.actor==='P').card_name;
  assert.equal(project(validateDocument(historical)).display_data.action_history.findLast(r=>r.actor==='P').card_name,null);
  historical.session.action_history.findLast(r=>r.actor==='P').card_name={private:'bad'};
  assert.throws(()=>validateDocument(historical),e=>e.code==='invalid_history_card_name');
  check('履歴名は現在の札名で置換せず、旧欠損はnull、破損追加値は拒否',true);
  const borrowed=copy(docs.port),bg=restoreGame(borrowed.session);
  const b=Object.values(bg.s.cards).find(c=>c.type==='nt_stop');take(bg,b.id);bg.s.actors.P.deck.push(b.id);
  bg.s.cards[b.id].doomed=true; // Explicit marker-count boundary, origin still present for this isolated projection.
  borrowed.session.game=bg.save();
  const display=project(borrowed).display_data,cat=display.exploration.deck_catalogue;
  assert.equal(cat.entries.reduce((n,r)=>n+r.deck_count,0),bg.s.actors.P.deck.length);
  assert.equal(cat.entries.reduce((n,r)=>n+r.initial_count,0),12);
  const borrowRow=cat.entries.find(r=>r.card.type==='nt_stop');assert.equal(borrowRow.deck_count,1);assert.equal(borrowRow.initial_count,0);assert.equal(borrowRow.doomed_deck_count,1);
  assert.equal(display.details[borrowRow.detail_id].name,'汐留め');assert.equal(display.details[borrowRow.detail_id].field.hit,20);
  assert(cat.entries.every(r=>!Object.hasOwn(r,'id')&&!Object.hasOwn(r,'card_id')));
  const reversed=copy(borrowed);reversed.session.game.state.actors.P.deck.reverse();
  assert.deepEqual(project(reversed).display_data.exploration.deck_catalogue,cat);
  assert(Object.values(display.exploration.other_decks).every(r=>r.status==='unknown'&&r.entries===null));
  assert.equal(display.exploration.shared_recovery.entries,null);
  check('借入札も本人山札で参照、初期／手札／残数／消滅予定を分離、順と他者内訳は非公開',true);
  examples.deck_catalogue=cat;
  bg.s.cards[b.id].doomed=false;borrowed.session.game=bg.save();
  const retained=await openFixed(borrowed);await execute(retained.controller,'withdraw',{});
  assert(retained.controller.exportSave().session.economy.profile.knowledge.events.some(e=>e.kind==='observed_card'&&e.card.type==='nt_stop'));
  check('本人の公開山札で知った未ドロー札を帰還時も保持する',true);
  for(const [id,a] of Object.entries(display.exploration.actors)){
    if(id==='P')assert.equal(a.knowledge_key,null);
    else assert.equal(display.knowledge_views.find(k=>k.key===a.knowledge_key)?.target_id,borrowed.session.active.targets[id]);
  }
  assert(!project(ready).display_data.knowledge_views.some(v=>v.target_id.endsWith('ACT03')));
  check('公開主体だけを版付き調査キーへ接続、本人はself、未遭遇対象は追加しない',true);
  examples.knowledge_links={actors:Object.fromEntries(Object.entries(display.exploration.actors).map(([id,a])=>[id,{knowledge_key:a.knowledge_key,knowledge_status:a.knowledge_status}])),knowledge_views:display.knowledge_views};
  const port=await openFixed(docs.port),detailID='SCN-001-DETAIL06';
  // The frozen port save is S03. S04 (public transition, no game advance) offers DETAIL06.
  await execute(port.controller,'continue_scene',{scene_id:port.controller.inspect().display_data.scene.id,advance:true,displayed_text_ids:[]});
  const portBefore=port.controller.exportSave();
  const beforeTexts=port.controller.inspect().display_data;
  assert(!beforeTexts.text_history.some(t=>t.id===detailID));
  assert(beforeTexts.scene.optional_text_ids.includes(detailID));
  await execute(port.controller,'continue_scene',{scene_id:beforeTexts.scene.id,advance:false,displayed_text_ids:[detailID]});
  const afterTexts=port.controller.inspect().display_data;
  assert(afterTexts.text_history.some(t=>t.id===detailID&&t.read));
  assert.deepEqual(port.controller.exportSave().session.game,portBefore.session.game);
  assert.equal(afterTexts.case.visible_clue_ids.filter(x=>x==='SCN-001-CL05').length,1);
  await execute(port.controller,'withdraw',{});
  const afterReturn=port.controller.inspect().display_data;
  assert(afterReturn.text_history.some(t=>t.id===detailID&&t.read));
  const p2=await port.Campaign.open({slot_id:'check'});assert.deepEqual(p2.inspect().display_data.text_history,afterReturn.text_history);
  assert(afterReturn.text_history.some(t=>!t.read&&t.published));
  const publishedIDs=new Set(port.controller.exportSave().public_history.flatMap(e=>e.text_ids));
  assert(afterReturn.text_history.every(t=>publishedIDs.has(t.id)));
  check('過去本文の公開／既読を分離、未読任意詳細は出さず、実表示後の本文とCL05を帰還再開でも保持',true);
  examples.text_history=afterReturn.text_history;
  const forbidden=new Set(['rng','future_rng','seed','memory','request_log','catalogues','campaign_id','view_nonce','context','initial_replacements']);
  function scan(x,path=''){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){
    const here=path+'.'+k;
    if(here==='.return_receipt.knowledge_changes.catalogues'){
      assert(Array.isArray(v)&&v.every(row=>Object.keys(row).sort().join(',')==='profile,version'));
    }else assert(!forbidden.has(k),'private key '+here);
    scan(v,here);
  }}
  for(const document of Object.values(docs))scan(project(document).display_data);
  for(const x of Object.values(examples))scan(x);
  check('追加応答に内部乱数・未来定義・request履歴・本文条件を含めない',true);
  await fs.writeFile(path.join(out,'examples.json'),JSON.stringify({id:'CW-M1-A-002',basis:'actual public projections from declared inputs; not player saves',examples},null,2)+'\n',{flag:'wx'});
} catch(error){
  await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({id:'CW-M1-A-002',checks,fixtures,choiceCount,error:String(error),stack:error.stack},null,2)+'\n',{flag:'wx'});throw error;
}
await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({id:'CW-M1-A-002',node:process.version,checks,fixtures,one_step_comparisons:choiceCount,
  protected_old_saves:5,old_natural_run_replays:0,old_comparison_replays:0,actual_browser:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({pass:true,checks:checks.length,one_step_comparisons:choiceCount,out}));
