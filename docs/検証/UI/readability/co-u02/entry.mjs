// CO-D02 public entry, checked against 7a0ce6fad3ce873638ad0e8d923c7559b420a6ed.
const root = document.querySelector('#crossweave-app');
try {
  const {Campaign, versions} = await import('../../../../../src/runtime/campaign.mjs');
  globalThis.crossweaveApplication = globalThis.CrossweaveUI.mountApplication(root, {
    Campaign,
    config: {slot_id: 'm1-local', rule_set_id: versions.rule_set_id, content_set_id: versions.content_set_id}
  });
} catch {
  root.textContent = '本体APIを読み込めません。リポジトリのルートからHTTPで開いてください。保存の新規作成や初期化は行っていません。';
}
