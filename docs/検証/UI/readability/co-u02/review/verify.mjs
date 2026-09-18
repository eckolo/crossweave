// Focused review-entry checks. No historical suite or balance run is invoked.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {checkpoints, createCheckpoint} from './checkpoints.mjs';
import {loadDocument} from './source.mjs';
import {mountReview} from './picker.mjs';
const require = createRequire(import.meta.url);
const {JSDOM, VirtualConsole} = require(process.env.CW_JSDOM_PATH || 'jsdom');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const checks = [], errors = [], check = (name, value) => {assert(value, name); checks.push({name, pass:true});};
const fetchFile = async url => new Response(await fs.readFile(url));
const documents = new Map();
const source = async name => {
  if (!documents.has(name)) documents.set(name, await loadDocument(name, fetchFile));
  return structuredClone(documents.get(name));
};
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(fn) {for (let n=0;n<400;n++) {if (fn()) return; await pause();} throw Error('timeout');}
const visibility = [], vc = new VirtualConsole();
vc.on('jsdomError', e => {if (e.type !== 'css parsing') errors.push(String(e));});
const dom = new JSDOM(await fs.readFile(path.join(here, 'index.html'), 'utf8'), {
  runScripts:'outside-only', pretendToBeVisual:true,
  url:'https://ui-check.invalid/review/index.html?case=skills', virtualConsole:vc
});
const w = dom.window;
w.structuredClone = structuredClone;
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
Object.defineProperty(w, 'crypto', {value:crypto.webcrypto});
w.ResizeObserver = class {observe(){} disconnect(){}};
w.IntersectionObserver = class {
  constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}
  observe(t){this.targets.push(t);} disconnect(){this.targets=[];}
};
w.matchMedia = () => ({matches:false});
let indexedDBCalls = 0;
const forbiddenIDB = {open(){indexedDBCalls++;throw Error('review must not touch IndexedDB');}};
const originalIDB = globalThis.indexedDB; globalThis.indexedDB = forbiddenIDB; w.indexedDB = forbiddenIDB;
w.eval(await fs.readFile(path.join(here, '../dist/crossweave-ui.js'), 'utf8'));
const host = w.document.querySelector('[data-review]'), root = host.querySelector('#crossweave-journey');
root.getBoundingClientRect = () => ({width:1024, height:576, left:0, top:0, right:1024, bottom:576});
let lastPrepared, prepareCalls = 0, delay = null, fail = false;
const prepare = async id => {
  prepareCalls++;
  if (delay) await delay;
  if (fail) throw Error('fixture_unavailable');
  lastPrepared = await createCheckpoint(id, source); return lastPrepared;
};
const review = mountReview(host, {ui:w.CrossweaveUI, prepare});
const idle = async () => {await pause();await until(() => !review.state().pending && root.getAttribute('aria-busy') !== 'true' && !review.app?.session.state().pending);};
const el = selector => {const item = root.querySelector(selector);assert(item, 'missing ' + selector);return item;};
const click = async selector => {const item = typeof selector === 'string' ? el(selector) : selector;assert(!item.disabled);item.click();await idle();};
const readMounted = async () => {
  for (const observer of visibility) {
    const entries = observer.targets.filter(t => root.contains(t)).map(target => ({target, isIntersecting:true, intersectionRatio:1}));
    if (entries.length) observer.fn(entries);
  }
  await idle();
};
try {
  check('URLで指定した心得画面へ直接入れる', await review.ready && root.dataset.screen === 'skills');
  for (const item of checkpoints) {
    assert(await review.show(item.id)); await idle();
    check(item.label + 'は実phaseから指定画面を開く', root.dataset.screen === item.screen);
    if (item.id === 'explore' || item.id === 'withdrawal') {
      const before = (await source('entry')).session.active.read_text_ids;
      const after = lastPrepared.controller.exportSave().session.active.read_text_ids;
      check(item.label + 'への準備操作で未表示本文を既読にしない', JSON.stringify(before) === JSON.stringify(after));
    }
  }
  check('全5原本のgzip・展開後SHA-256を現行目録と照合', documents.size === 5);
  await review.show('deck'); await idle();
  const savedDeck = JSON.stringify(review.app.session.state().view.display_data.home.deck);
  const removed = el('[data-j="remove"]:not(:disabled)').dataset.id;
  await click('[data-j="remove"][data-id="' + removed + '"]');
  const draft = structuredClone(review.app.session.state().draft);
  const replacement = review.app.session.state().view.display_data.home.free_card_options.find(id => !draft.next_preparation.deck.includes(id));
  assert(replacement); await click('[data-j="add"][data-id="' + replacement + '"]');
  await click('[data-j="review"]');
  check('直接開いた札組から変更案を比較できる', review.app.state().panel === 'review' && review.app.session.state().comparison.ok);
  await click('[data-j="commit"]');
  check('比較後の確定は実Campaignへ反映する', !review.app.session.state().localDirty && JSON.stringify(review.app.session.state().view.display_data.home.deck) !== savedDeck);
  await review.show('deck'); await idle();
  check('同じ場面を開き直すと独立した原本から始まる', JSON.stringify(review.app.session.state().view.display_data.home.deck) === savedDeck);
  await click('[data-j="remove"]:not(:disabled)');
  const oldApp = review.app, oldDraft = JSON.stringify(oldApp.session.state().draft);
  let release; delay = new Promise(resolve => {release = resolve;}); fail = true;
  const callsBefore = prepareCalls, loading = review.show('clear');
  check('読込み中は切替入力と旧画面の操作を止める', host.querySelector('[data-review-case]').disabled && host.querySelector('[data-review-open]').disabled && root.inert);
  assert.equal(await review.show('defeat'), false);
  check('読込み中の二重要求を開始しない', prepareCalls === callsBefore + 1);
  release(); assert.equal(await loading, false); delay = null; fail = false;
  check('原本の読込み失敗後も現在の画面と変更案が残る', review.app === oldApp && JSON.stringify(oldApp.session.state().draft) === oldDraft && !root.inert);
  assert(await review.show('explore')); await idle();
  const beforeRevision = review.app.session.state().view.meta.revision;
  const action = review.app.session.state().view.display_data.exploration.legal_actions.find(item => item.target === null);
  assert(action); await click('[data-x-card="' + action.card_id + '"]'); await click('[data-x="use"]');
  check('直接開いた探索から実際の合法手を一手実行できる', review.app.session.state().view.meta.revision > beforeRevision && review.app.session.state().view.display_data.exploration.public_history.length > 0);
  for (const id of ['clear', 'withdrawal', 'defeat']) {
    await review.show(id); await idle(); await readMounted();
    await click('[data-j="hub"]');
    check(id + 'から通常の操作で拠点へ進める', review.app.session.state().view.display_data.phase === 'home' && root.dataset.screen === 'hub');
  }
  await review.show('entry'); await idle();
  check('本文の確認入口は表示通知前に既読を送らない', review.app.state().seen.length === 0);
  const paragraph = el('[data-j-text]');
  for (const observer of visibility) if (observer.targets.includes(paragraph)) observer.fn([{target:paragraph, isIntersecting:true, intersectionRatio:1}]);
  await idle();
  check('実際に通知した1段落だけ通常の表示記録へ送る', JSON.stringify(review.app.state().seen) === JSON.stringify([paragraph.dataset.jText]));
  const selector = host.querySelector('[data-review-case]'); selector.value = 'skills'; selector.dispatchEvent(new w.Event('change'));
  await idle();
  check('場面選択で画面と共有できるURLが同時に変わる', root.dataset.screen === 'skills' && new URL(w.location.href).searchParams.get('case') === 'skills');
  const firstSlot = lastPrepared.slot_id; host.querySelector('[data-review-open]').click(); await idle();
  check('最初からボタンは同じ場面を新しい一時保存へ開く', lastPrepared.slot_id !== firstSlot && root.dataset.screen === 'skills');
  const calls = prepareCalls; assert.equal(await review.show('../index.html'), false);
  check('未知の場面は読込みを起こさず現在のUIを維持する', prepareCalls === calls && root.dataset.screen === 'skills');
  await assert.rejects(loadDocument('../entry', fetchFile), /unknown_fixture/);
  await assert.rejects(loadDocument('entry', async url => {
    const bytes = await fs.readFile(url); if (String(url).endsWith('.gz')) bytes[0] ^= 1;
    return new Response(bytes);
  }), /fixture_hash_mismatch/);
  check('対象外の原本名と破損gzipをCampaignへ渡さない', true);
  await assert.rejects(loadDocument('home', async url => {
    if (String(url).endsWith('manifest.json')) {
      const manifest = JSON.parse(await fs.readFile(url, 'utf8'));
      manifest.records.find(item => item.path.endsWith('/home.save.json.gz')).raw_sha256 = '0'.repeat(64);
      return Response.json(manifest);
    }
    return fetchFile(url);
  }), /fixture_hash_mismatch/);
  check('展開後の内容不一致も読込みを拒否する', true);
  delay = new Promise(resolve => {release = resolve;});
  const previous = review.app, disposedLoad = review.show('clear'); review.dispose(); release();
  assert.equal(await disposedLoad, false); delay = null;
  check('画面終了後に遅れた読込みが別のUIを開かない', review.app === previous);
  check('全場面と操作でIndexedDBへのアクセスなし', indexedDBCalls === 0);
  check('DOM実行エラーなし', errors.length === 0);
} finally {review.dispose();w.close();globalThis.indexedDB = originalIDB;}
const files = ['checkpoints.mjs', 'source.mjs', 'picker.mjs', 'entry.mjs', 'index.html', 'verify.mjs', '../dist/crossweave-ui.js', '../dist/crossweave-ui.css'];
const sha256 = {};
for (const name of files) {
  const full = path.resolve(here, name); sha256[path.relative(repo, full)] = crypto.createHash('sha256').update(await fs.readFile(full)).digest('hex');
}
const report = {work_id:'20260910-ui-readability', group:'batch-review-entry-1',
  base_commit:'f7ea299f0f0350162c5826b7620b164730a7b032', technical_commit:'7a0ce6fad3ce873638ad0e8d923c7559b420a6ed',
  checked_at_utc:new Date().toISOString(), result:'pass', count:checks.length, checks, sha256,
  runtime:{node:process.version, jsdom:require(path.join(process.env.CW_JSDOM_PATH || 'jsdom', 'package.json')).version},
  conditions:['実Campaign＋設計所有MemoryStore＋未変更の配布版0.11.1をJSDOMで操作。', '設計の自然保存5件のgzip/rawハッシュを照合。派生状態は公開コマンドだけで用意。', '固定した矩形と可視通知は検査入力であり実描画の計測ではない。旧49・20・24項目やバランス探索は再実行しない。'],
  limits:['実描画、物理タッチ、実IndexedDB永続保存、ユーザーによる新入口の操作は未確認。', '通常ゲーム入口・公開APIの不足・固定UI原本を変更していない。']};
await fs.writeFile(process.argv[2] || path.join(here, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({result:report.result, count:checks.length, errors}, null, 2));
