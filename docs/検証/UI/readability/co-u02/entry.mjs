// CO-D03R public entry: engine 0.7 / preparation 2; design 9d5dd304.
const root = document.querySelector('#crossweave-journey');
try {
  const {Campaign, versions} = await import('../../../../../src/runtime/campaign.mjs');
  globalThis.crossweaveApplication = globalThis.CrossweaveUI.mountJourneyApplication(root, {
    Campaign,
    config: {slot_id: 'm1-local', rule_set_id: versions.rule_set_id, content_set_id: versions.content_set_id}
  });
} catch {
  root.textContent = '本体APIを読み込めません。リポジトリのルートからHTTPで開いてください。保存の新規作成や初期化は行っていません。';
}
