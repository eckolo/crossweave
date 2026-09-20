// Changed-runtime integration, using the received UI untouched. DOM is not real rendering/IDB.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createCampaign,versions} from '../../src/runtime/campaign.mjs';
import {MemoryStore} from './support.mjs';
import {createCheckpoint} from '../../docs/検証/UI/readability/co-u02/review/checkpoints.mjs';
import {loadDocument} from '../../docs/検証/UI/readability/co-u02/review/source.mjs';
import {mountReview} from '../../docs/検証/UI/readability/co-u02/review/picker.mjs';
const require=createRequire(import.meta.url),{JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),ui=path.join(root,'docs/検証/UI/readability/co-u02');
const out=path.resolve(process.argv[2]);await fs.mkdir(out,{recursive:true});
const checks=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
const check=(name,value)=>{assert(value,name);checks.push({name,pass:true});};
const sources=new Map();
const source=async name=>{if(!sources.has(name))sources.set(name,await loadDocument(name,async url=>new Response(await fs.readFile(url))));return structuredClone(sources.get(name));};
const dom=new JSDOM(await fs.readFile(path.join(ui,'review/index.html'),'utf8'),{runScripts:'outside-only',pretendToBeVisual:true,url:'https://test.invalid/review/?case=explore',virtualConsole:vc});
const w=dom.window;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};w.matchMedia=()=>({matches:false});
w.eval(await fs.readFile(path.join(ui,'dist/crossweave-ui.js'),'utf8'));
const host=w.document.querySelector('[data-review]'),main=host.querySelector('#crossweave-journey');
main.getBoundingClientRect=()=>({width:1024,height:576,left:0,top:0,right:1024,bottom:576});
const pause=()=>new Promise(resolve=>setTimeout(resolve,5));
async function until(fn){for(let i=0;i<300;i++){if(fn())return;await pause();}throw Error('DOM wait timeout');}
const originalIDB=globalThis.indexedDB;let idbCalls=0;
globalThis.indexedDB={open(){idbCalls++;throw Error('test must not touch real IndexedDB');}};
let review,app;
try{
  const normalHTML=await fs.readFile(path.join(ui,'index.html'),'utf8'),entry=await fs.readFile(path.join(ui,'entry.mjs'),'utf8');
  check('通常入口は保存済みdistと公開Campaignのmoduleへ接続',normalHTML.includes('dist/crossweave-ui.js')&&entry.includes("import('../../../../../src/runtime/campaign.mjs')")&&entry.includes('mountJourneyApplication'));
  const store=new MemoryStore();store.records.set('ui-check',await source('home'));
  app=w.CrossweaveUI.mountJourneyApplication(main,{Campaign:createCampaign({storage:store}),config:{slot_id:'ui-check',rule_set_id:versions.rule_set_id,content_set_id:versions.content_set_id},storageMode:'ephemeral'});
  check('通常と同じlauncherは開始画面を生成',main.dataset.screen==='start');
  main.querySelector('[data-launch="open"]').click();await until(()=>app.journey?.session.state().view?.display_data.phase==='home');await app.journey.ready;
  check('公開APIの追加後も通常launcherから既存保存を開く',main.dataset.screen==='hub'&&app.session.state().view.display_data.public_contract===versions.public_contract);
  app.dispose();app=null;
  review=mountReview(host,{ui:w.CrossweaveUI,prepare:id=>createCheckpoint(id,source)});assert(await review.ready);
  check('確認専用の探索場面が新runtimeで起動',main.dataset.screen==='explore');
  const session=review.app.session,view=session.state().view,choice=view.display_data.exploration.legal_actions[0];
  main.querySelector('[data-x-card="'+choice.card_id+'"]').click();
  await until(()=>session.state().actionPreview?.supported||session.state().actionPreview?.display_data||main.querySelector('[data-x="use"]')&&!session.state().pending);
  // Check the public controller result independently of UI's still-old forecast adapter.
  const preview=await session.previewAction(choice);
  check('sessionがactor_changes付き予測応答を受け取る',preview.ok&&session.state().actionPreview.actor_changes.P.values.crit.status==='known');
  check('描画側の全能力差分接続は受領原本のまま未了',w.CrossweaveUI.projectActionForecast(view.display_data,choice,session.state().actionPreview).unavailable.includes('機転の解決後残量'));
  const before=session.state().view.meta.revision;
  main.querySelector('[data-x="use"]').click();await until(()=>session.state().view.meta.revision>before&&!session.state().pending);
  check('一手確定後の新しい公開履歴へ遷移する',session.state().view.display_data.action_history.some(r=>r.card_name_status==='recorded_at_resolution'));
  assert(await review.show('port'));
  const data=review.app.session.state().view.display_data;
  check('本文場面は公開済み過去本文追加後も起動する',main.dataset.screen==='scene'&&data.text_history.length>0);
  check('場面の起動だけで任意詳細を既読にしない',!data.text_history.some(t=>t.id==='SCN-001-DETAIL06'));
  assert(await review.show('clear'));
  check('帰還場面は旧自然保存の欠損札名を不明のまま受け取る',main.dataset.screen==='return'&&review.app.session.state().view.display_data.action_history.filter(r=>r.type==='action').every(r=>r.card_name===null));
  check('一時検査はIndexedDBを呼ばない',idbCalls===0);check('DOM実行エラーなし',errors.length===0);
}catch(error){await fs.writeFile(path.join(out,'ui-failure.json'),JSON.stringify({checks,error:String(error),stack:error.stack,errors},null,2)+'\n',{flag:'wx'});throw error;}
finally{review?.dispose();app?.dispose();dom.window.close();globalThis.indexedDB=originalIDB;}
await fs.writeFile(path.join(out,'ui-verification.json'),JSON.stringify({id:'CW-M1-A-002-UI',checks,node:process.version,jsdom:require(path.join(process.env.CW_JSDOM_PATH||'jsdom','package.json')).version,
  inputs:'received 0.11.1 dist and review entry; fixed home/entry/port/return; real Campaign + original MemoryStore',
  scope:'DOM + explicit fixed geometry only; no real layout, physical input, IndexedDB or human acceptance',old_ui_suites_rerun:0,errors},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({pass:true,checks:checks.length,out}));
