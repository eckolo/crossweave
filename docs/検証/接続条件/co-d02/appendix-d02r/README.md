# CO-D02R — UI受領と公開情報の追補

2026-09-18 JST／追補0.1。既存Work `20260909-design-assembly`、作業・統合先 `dev_design_tmp_assembly`。CO-D02の同じCampaignとCW-M1-save-1を継承する。基本設計0.53/D53、入力0.1、身構・常時軽減の現行演算と試行値を維持。

## 提出状態（会話引継ぎ後）

成果 `09acd78adac7da285cc43c690dd8ac5006a2ade2` を設計枝へ保存し、GitHub上の親・全tree783項目・主要本文9件を読戻して一致確認した。[保存記録](save-readback.json)。最新計画0.8.1の17件を同期済み。以下の計画0.8／14件は初回受領・固定検査時点の記録として維持する。追加APIのUI描画接続・実機・人評価は未確認、CO-D02R-J01は未採用・採否待ち。今回単位は終了。

## 受領した入口

UI `ac610be8e07ee026c8330b72ec7e9e8ee8780346`、0.11.1の専用232ファイルを原文のまま選択取込みした。[受領目録](ui-receipt.json)に全path/blobを記録。開始・受領commitは `7c2a43dd34ce4c770589d812530545b8fed17881`。UIのWork設定・受領JSONは参照のみ。古い計画コピーを取り込まず、計画0.8の全14ファイルを実同期した。PR #1の内容受領であり、PRのマージ操作・masterへの統合は行っていない。

リポジトリルートで `python -m http.server 8000 --bind 127.0.0.1` を起動する。受領したdistをそのまま使用でき、今回のための再ビルドは不要。

| 入口 | 用途・保存先 |
|---|---|
| [通常ゲーム](../../../UI/readability/co-u02/index.html) | `/docs/検証/UI/readability/co-u02/index.html`。既存CampaignのIndexedDBStore、slot `m1-local` |
| [場面の確認](../../../UI/readability/co-u02/review/index.html?case=explore) | 同`review/index.html`。9場面へ直接入る、場面ごとに独立したMemoryStore。通常保存に触れない |
| [API確認](../harness.html) | 開発用。通常UIとの区別を維持 |

旧co-u01やflow/interactionの固定例を、現行ゲームの入口として案内しない。UI0.11.1の大まかな動きは了承済み。今回ユーザーへ通しプレイや仮素材の再評価を求めない。

## 追加した公開契約

入口は引き続き `src/runtime/campaign.mjs`。全応答のschemaはCW-M1-view-1、保存schemaはCW-M1-save-1、engineはCW-M1-engine-0.1。追加契約を `versions.public_contract` と `display_data.public_contract` の **CW-M1-public-0.2** で識別する。既存操作・引数・view_token・revision・previewの既存項目は維持する。UIの描画入力はdisplay_dataのみ。

| 取得場所 | 追加内容・境界 |
|---|---|
| `previewAction(...).display_data.action_preview.actor_changes[actor_id]` | 本人Pを含む、現在公開されている主体の一手解決後値。`values[key]={status,before,after,delta}`。`active`、`stance`、`persistent_sources`も前後を返す |
| 同`resolution_scope` | `after_current_action_before_next_actor`。同じGame.playをコピー上で一回使い、退場・支援解除まで含める。advance・後続NPC選択・次の本人補充は実行しない |
| `exploration.public_history`／`action_history` | 同一card_idへ解決時の`card_name`と`card_name_status`。後者は帰還画面でも読める同じ探索の履歴。ack_return／新出発でのクリアは従来どおりで、全探索の永久履歴を増設していない |
| `exploration.deck_catalogue` | 本人の札を種類・公開性能ごとに集計。初期持込、現在の未ドロー、現在の手札、消滅予定数を別々に返す。借り札も現在の本人山札に含まれれば参照可能 |
| `details[deck_catalogue.entries[i].detail_id]` | 同じview内の札説明。名前、属性、主／場効果、期限、間隔。`own-card:n`は現在view内の参照であり、保存・次viewへ持ち越す選択IDではない |
| `exploration.other_decks`／`shared_recovery` | 相手の現在内訳は`unknown`、共有回収の内訳は`count_only`。公開枚数だけ。`entries:null`は0枚・種類なしを意味しない |
| `text_history` | 公開した過去本文を本文ID単位で一覧化。`published/read/scene_ids/kind/short_text/detail_text`。未読の主本文と既読を分け、任意詳細は実表示の記録後だけ含む |
| `exploration.actors[id].knowledge_key` | `knowledge_views[].key`への完全一致キー。target_idとcatalogue_versionを含む識別で、表示名・runtimeのV0等から推定しない。本人はnull／knowledge_status:self |
| `exploration.actors[id].persistent_sources` | 現在働く公開済み常時作用の発生源・種類・値。身構統一を採用するまで、reductionと札のguardを合算済みの能力とはしない |

能力のキーは `hp,max_hp,hit,posture_remaining,max_posture,crit,critical_multiplier,guard,guard_uses,guard_evasion,evasion,reduction`。guardは札による現在身構の基礎量、evasionは常時支援込みの攪乱総量、reductionは現行の常時軽減。guardなしは既知の0・uses0として返し、姿勢の実体はstance.after:nullで区別する。critical_multiplierは蓄積から現在使える一閃倍率であり、将来発動の保証ではない。

既知の変化0はstatus:known／delta:0。未知の新規発生源が絡む主体はstatus:unknown／values:null、未対応数値はstatus:unsupported／before,after,delta:null。非合法手・停止中・古いtokenは従来のerrorとsupported:false、actor_changes:nullを返す。UIで不明を0へ置き換えない。

予測は現在公開済みの主体だけを返す。環境踏破で新しい主体が登場する場合も、その未公開の初期構成・次札・内部乱数を予測へ混ぜない。現在予約・次の本人予約時刻と、本人の次手番までの全経過を区別する。実executeはこの一手の後に自動進行するため、応答の最終探索値をそのまま「一手直後」の比較対象にしない。

```js
const view = await controller.inspect();
const preview = await controller.previewAction({view_token:view.meta.view_token, choice});
const change = preview.display_data.action_preview?.actor_changes?.P?.values?.crit;
if (change?.status === 'known') {
  // UIはchange.before / change.after / change.deltaを描画する。
  // crit_addedは加算量のまま。最終差分の代用にしない。
}
const data = view.display_data;
const deckRows = data.exploration?.deck_catalogue.entries.filter(row => row.deck_count > 0);
const actor = data.exploration?.actors.V0;
const record = data.knowledge_views.find(row => row.key === actor?.knowledge_key);
```

[応答例](examples.json)は実コードによる公開投影。能力例は宣言した港のコピー上の汐留め・常時支援条件で、自然な到達例や採用済み性能ではない。外側の照合条件を画面へ流さない。

## 保存互換と公開条件

- 新しいaction行にだけcard_nameを保持する。旧保存の名前欠損は保存上は欠損のまま、公開時はnull／not_recorded。現在の名称、別札の知識、現在の手札・場から過去名を埋めない。名前付き行はrecorded_at_resolution。破損した名前フィールドは拒否する。
- 旧5保存は変換なしでopen可能。inspect／previewで保存、revision、乱数、下書き、領収、pending_contextsを変えない。importは従来どおり空slotへ明示輸入しrevisionだけ更新する。保存形式・保存装置の二重化なし。
- 山札集計は本人の現在の未ドロー分と手札、本人が初期持込した札のみ。相手の現在の私有札から種類別残数を補完しない。初攻略catalogueは初期構成の知識であり、現在内訳ではない。本人の山札も並び・次札を返さない。
- D37の本人山札公開に従い、今後の再構築では本人が受け取った全種類を知識へ記録する。旧保存の本人山札にある未ドロー借り札は参照でき、次のゲーム保存コマンドで公開済みの所持情報を知識へ残す。純粋な閲覧で保存を書き換えず、帰還後にその知識を失わせない。借り札の初使用本文をドロー前に発火させない。
- 過去本文は同じcontent_set版の保存済み公開IDから返す。条件を現在状態で再評価して別の過去本文へ差し替えない。未遭遇の本文・未表示の任意詳細・内部contextを一覧へ加えない。本文を一覧で返すだけでは既読やCL05を追加しない。過去未読本文を改めて既読にする新操作は今回増設せず、現在sceneのrecord_displayed_textを維持する。

## 次のUI単位へ渡す接続

UI原本は今回編集していない。以下はUI担当が次回受領して実装する対象で、通知・受領・画面実装済みとは扱わない。

| UI側ファイル（co-u02配下） | 受け取る値と変更 |
|---|---|
| `action-forecast.js`、`exploration.js` | actor_changesのbefore/after/deltaを本人欄と相手欄へ。身構終了・機転消費・攪乱総量を独自計算しない。選択解除／確定／古い応答で予測を消す既存処理を継承 |
| `exploration.js` | 履歴はrow.card_name_statusとrow.card_nameを優先。未記録を現在名で補完しない。山札窓はdeck_catalogueとdetails、主体詳細はknowledge_keyへ接続 |
| `journey/view.js`と調査・本文の表示部品 | text_historyの公開／既読を分けて過去本文へ。既読の新操作を推測しない |
| `review/`の既存入口 | 探索中、該当本文、帰還の場面から変更をまとめて提示。新しい固定ゲームや9場面の作り直しは不要 |

受領UIは旧予測の描画処理を維持しており、追加値を表示する接続は未了。コピーでの成功・MemoryStore確認を実IndexedDBやユーザー受入の完了にしない。[確認結果](report.md)、[身構統一の判断資料](stance-decision.md)を参照。
