// 固定UI原本から生成したreview/index.htmlを実ブラウザーで撮る。UIソース・fixtureは編集しない。
// 開発担当向け：Playwrightを解決できるNode環境、Microsoft Edge、読取スナップショットのHTTP配信を使う。
// node capture.cjs <http://127.0.0.1:8765> <新しい出力ディレクトリ>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const out = path.resolve(process.argv[3]); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1250 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const base = process.argv[2] + '/docs/検証/UI/readability/co-u02/review/index.html?case=';
    for (const [id, name] of [['hub-d03', 'home'], ['explore-d03', 'exploration'], ['entry-d03', 'story'], ['carried', 'return']]) {
      await page.goto(base + id); await page.locator('#crossweave-journey .cj-shell').waitFor(); await page.waitForTimeout(800);
      await page.locator('#crossweave-journey').screenshot({ path: path.join(out, name + '.png') });
      if (id === 'hub-d03') {
        await page.locator('#crossweave-journey button').filter({ hasText: /^編成$/ }).click(); await page.waitForTimeout(300);
        await page.locator('#crossweave-journey').screenshot({ path: path.join(out, 'preparation.png') });
      }
    }
    fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify({ source: '72d0eb58c7e3d04759f1ab56a939d1dff20a46b2', engine: await browser.version(), viewport: [1920, 1250], entry: base, storage: 'design-owned MemoryStore; original fixtures unchanged', errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
