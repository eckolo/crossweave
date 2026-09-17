'use strict';
// v0.11 changed behavior only. Reuse the old harness, not its 49-case runner.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const suitePath=path.join(__dirname,'verify-save-flow.cjs'),suite=fs.readFileSync(suitePath,'utf8');
const boundary=suite.indexOf('\n(async()=>{');assert(boundary>0);
const support=new Module(suitePath);support.filename=suitePath;support.paths=Module._nodeModulePaths(__dirname);
support._compile(suite.slice(0,boundary)+'\nmodule.exports={harness,errors};\n',suitePath);
const checks=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const saved=h=>JSON.stringify(h.storage.records.get(h.slot));
const noPause=h=>!h.root.querySelector('[data-j="suspend"]');
async function openHistory(h){await h.click('[data-x="more"]');await h.click('[data-x="history"]');return h.el('#cw-drawer .cw-drawer-body').textContent;}
(async()=>{
 const h=await support.exports.harness();
 try{
  h.w.eval(fs.readFileSync(path.join(__dirname,'../dist/crossweave-ui.js'),'utf8'));await h.remount();
  await h.click('[data-launch="create"]');
  await h.click('[data-j="menu"]');check('拠点メニューに探索中断を出さない',noPause(h));
  await h.click('[data-j="data"]');check('拠点の保存データにも中断を出さない',noPause(h));await h.click('[data-j="close"]');
  const committedBefore=saved(h),removed=await h.editOne(),draftBefore=JSON.stringify(h.app.session.state().draft);
  check('未確定の編集だけでは保存済み編成を変更しない',saved(h)===committedBefore&&h.app.session.state().localDirty);
  await h.dataMenu();check('編集中も中断を出さず確定時保存を説明する',noPause(h)&&h.root.textContent.includes('編成は「確定」で保存'));
  await h.click('[data-j="export"]');
  check('書出しは保存済み内容を使い未確定案を勝手に保存しない',h.downloads.length===1&&saved(h)===committedBefore&&JSON.stringify(h.app.session.state().draft)===draftBefore&&h.app.session.state().localDirty);
  await h.remount();await h.click('[data-launch="open"]');
  check('新しいUIから開くと最後に保存した編成で再開する',!h.app.session.state().localDirty&&!h.d().draft.dirty&&saved(h)===committedBefore);
  await h.editOne();
  const replacement=h.d().home.free_card_options.find(id=>!h.app.session.state().draft.next_preparation.deck.includes(id));assert(replacement);
  await h.click('[data-j="add"][data-id="'+replacement+'"]');
  const proposal=JSON.stringify(h.app.session.state().draft.next_preparation.deck);
  h.storage.failNext=true;await h.click('[data-j="commit"]');
  check('確定保存の失敗では編集と元の保存を保持する',h.app.session.state().canRetry&&JSON.stringify(h.app.session.state().draft.next_preparation.deck)===proposal&&saved(h)===committedBefore);
  await h.click('[data-j="retry"]');
  check('保存の再試行で編成を確定し一度だけ自動保存する',!h.app.session.state().canRetry&&h.d().home.deck.composition.some(c=>c.id===replacement&&c.count===1)&&!h.app.session.state().localDirty);
  const afterCommit=saved(h);await h.remount();await h.click('[data-launch="open"]');
  // Campaign restores the committed composition in canonical ID order.
  check('確定後は追加の手動保存なしで同じ札と枚数が新しいUIにも反映する',saved(h)===afterCommit&&JSON.stringify([...h.app.session.state().draft.next_preparation.deck].sort())===JSON.stringify(JSON.parse(proposal).sort()));
  await h.click('[data-j="depart"]');assert.equal(h.root.dataset.screen,'scene');
  await h.dataMenu();check('探索途中の本文画面では探索中断を使える',h.el('[data-j="suspend"]').textContent==='探索を中断');
  const sceneSave=saved(h);await h.click('[data-j="suspend"]');check('探索中断は開始側の中断画面へ戻る',h.root.dataset.screen==='start');
  await h.click('[data-j="resume"]');
  check('本文途中の再開は帰還や進行を起こさない',h.root.dataset.screen==='scene'&&saved(h)===sceneSave&&h.el('[data-status]').hidden);
  await h.readScene();
  const x=h.d().exploration,choice=x.legal_actions.find(q=>{const c=x.hand.find(c=>c.id===q.card_id);return !Object.values(x.field).some(f=>f.attr===c.attr);});assert(choice,'real placement choice');
  const name=h.d().details[choice.card_id].name;
  await h.click('[data-x-card="'+choice.card_id+'"]');await h.click('[data-x="preview"]');
  check('公開された機転加算は消費前の値として区別する',h.el('#cw-drawer .cw-drawer-body').textContent.includes('機転の加算（消費前）'));
  check('未提供の行動後機転を数値差分として捏造しない',!h.root.querySelector('#cw-self [data-stat="crit"] .cw-delta'));
  check('身構と軽減に別々の意味の説明を付ける',h.el('#cw-self [data-stat="guard"]').dataset.tooltip.includes('一時的')&&h.el('#cw-self [data-stat="reduction"]').dataset.tooltip.includes('特性'));
  await h.click('[data-x="use"]');
  check('設置履歴に出した札の公開名を載せる',(await openHistory(h)).includes('「'+name+'」'));
  await h.dataMenu();const exploringSave=saved(h);await h.click('[data-j="suspend"]');await h.click('[data-j="resume"]');
  check('探索再開は同じ保存状態を保持し成功通知を残さない',h.root.dataset.screen==='explore'&&saved(h)===exploringSave&&h.el('[data-status]').hidden);
  check('同一セッションの再開後も公開済みの履歴名を保持する',(await openHistory(h)).includes('「'+name+'」'));
  await h.click('[data-x="withdraw"]');await h.dataMenu();
  check('帰還結果には探索中断を出さない',h.d().phase==='return'&&noPause(h));
  check('スクリプトエラーなし',support.exports.errors.length===0);
 }finally{h.close();}
 const root=path.resolve(__dirname,'../../../../../..');
 const sources=['docs/検証/UI/readability/co-u02/journey/view.js','docs/検証/UI/readability/co-u02/journey/panels.js','docs/検証/UI/readability/co-u02/exploration.js','docs/検証/UI/readability/co-u02/dist/crossweave-ui.js','docs/検証/UI/readability/co-u02/journey/verify-exploration-save.cjs'];
 const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const report={work_id:'20260910-ui-readability',version:'0.11',result:'pass',count:checks.length,checks,checked_at_utc:new Date().toISOString(),base_commit:'1417b62653029769d67a843013596e8b07b94631',plan_commit:'0e53882bbd2a680a8d640f7fe044472f406e265d',technical_commit:'7a0ce6fad3ce873638ad0e8d923c7559b420a6ed',conditions:['実Campaign＋元MemoryStore＋JSDOM。生成済み配布版をUI操作。','新規保存、未確定の編集、書出し、失敗した確定の再試行、新しいUIでの再開、実出発・設置・撤退を対象とする。','旧49件の実行部は再利用せず、harness定義だけを使う。'],limits:['実描画・実タッチ・IndexedDB永続化の確認ではない。','履歴名は公開hand/fieldの同一IDから記憶できた範囲。再読込前の未公開名は本体対応待ち。','身構・機転・攪乱すべての行動後予測値は本体の追加公開待ち。'],runtime:{node:process.version,jsdom:require(path.join(process.env.CW_JSDOM_PATH,'package.json')).version},sha256:Object.fromEntries(sources.map(p=>[p,sha(path.join(root,p))])),inline_fragment:{path:'/workspace/crossweave-exploration-save.html',bytes:fs.statSync('/workspace/crossweave-exploration-save.html').size,sha256:sha('/workspace/crossweave-exploration-save.html'),storage:'original MemoryStore; ephemeral',start:'launcher'}};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,count:checks.length,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
