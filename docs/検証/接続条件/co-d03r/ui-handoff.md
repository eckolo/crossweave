# CO-D03R UI受渡し

2026-09-26／受取先 `20260910-ui-readability`・`UI-ACQ-INT-01`。実装参照UIは `102b243919e1563df66900a6e85887ad1c9e97c6`。公開前に最新 `6c6ac2184d56da9e19966c075c708538c62f5136` の画面・空状態了承を受領し、契約要件に変更なしと照合。提出したコードSHA・対象差分は [publication.json](publication.json)／[変更一覧](integration-files.txt)。本体提供、UI受領、UI接続、D04統合、人の受入は別の状態。

提供コード：[`442af718d30b30284cf5ac976eb7421992d94dfd`](https://github.com/eckolo/crossweave/commit/442af718d30b30284cf5ac976eb7421992d94dfd)。このコードの専用37項目・GitHub全文読戻し・CI成功を確認済み。画面の再承認や旧50件の再実行を受領条件にしない。

## 契約版

| 対象 | 版 |
|---|---|
| `versions.engine_version` | `CW-M1-engine-0.7` |
| `display_data.public_contract` | `CW-M1-public-0.6` |
| `display_data.home.contract` / plan.schema | `CW-M1-preparation-2` |
| save / economy / acquisition | `CW-M1-save-2` / `CW-M1-economy-2` / `CW-M1-acquisition-1` |
| 戦闘 / 内容 / 候補 | rules0.5 / SCN001-0.2 / offers0.1：変更なし |

`createCampaign`・`inspect`・`previewPreparation`・`execute`・`open`・`importSave`・`exportSave`の入口は維持。private saveで不足を埋めない。

## 公開情報

`display_data.home` を現在の確定状態とする。

| フィールド | 用途 |
|---|---|
| `owned[]` | 全実個体。`id` は現在view専用、`quantity:1`。`blueprint.kind` で札／心得。`selected` と `location:possession/composition` で表示先を一意に決める |
| `groups[]` | 同一性能の集約。`group_key`、実数量 `quantity`、`selected_quantity`、`selection_ids`、未編成 `possession_ids`、編成 `composition_ids`。集約キーを選択IDとして送らない |
| `equipment` / `deck` | 確定編成、枠／枚数、同種上限。心得は追加習得なしで全所持個体が `eligible:true` |
| `acquisition[]` | 現在取得可能な基礎棚＋帰還候補の共通一覧。`id`、`pending_selection_id`、`blueprint`、`price_units`、`available_quantity`、`group_id`、`group_limit`、`affordable_now` |
| `acquisition_groups[]` | `available/acquired/none`。帰還群 `return-offer` は1点。基礎棚は各基礎1在庫。群をまたいだ複数取得も一括決済できる |
| `offers` | 従来の帰還群状態 `available/purchased/none` と `carried_from_previous_return`。群が取得済みなら `candidates:[]`。成果なしという帰還理由だけで空欄にしない |
| `economy` | `unspent_units`、`historical_learning_units`、`refundable_units:0`。旧支払額は使える残高へ合算しない |
| `owned[].references` / `locked` / `conversion_available` / `conversion_reasons` | 既存変換・ロック用。入手元の名前から変換可否を推定しない。初期札も通常の個体移動・ロック・編成を使い、変換操作だけ公開理由で制約する |
| `details[id]` | 個体・取得候補・予測中の未払い個体の効果説明。UIで演算や修飾を再計算しない |
| `migration_notice` / `draft` | 旧編集中の案の再確認が必要か、現plan、保存済み案のdirty/valid/errors。原案の内部UIDや会計台帳は公開しない |

帰還候補群が取得済みでも基礎棚に在庫があれば、取得可能全体は空ではない。全取得可能欄は分類で絞った `acquisition[]` を描画し、帰還群の「今回の取得は完了」と全体の0件を区別する。基礎棚は旧習得候補を同じ取得欄へ移した試行実装であり、UIが独自の習得画面を残す必要はない。読み込み中・失敗は `none` に変換しない。

## 確認と一括確定

`display_data.draft.plan` をコピーして編集する。未払い個体は、取得行が公開した `pending_selection_id` をそのまま使う。

```js
const view = controller.inspect();
const plan = structuredClone(view.display_data.draft.plan);
// plan = {schema:'CW-M1-preparation-2', acquire:[],
//   composition:{deck:[...12個体ID], equipment:[]}, migration_review:null}
const option = view.display_data.home.acquisition.find(x => x.id === 'choice-1');
plan.acquire = [option.id];
plan.composition.equipment = [option.pending_selection_id];
const comparison = controller.previewPreparation({view_token:view.meta.view_token, plan});
// comparison.display_data.error は入口／tokenエラー。
// preparation_comparison.ok / refusal は支払・編成の検査結果。
const response = await controller.execute({
  type:'commit_preparation', payload:{plan},
  expected_revision:view.meta.revision, view_token:view.meta.view_token,
  request_id:crypto.randomUUID()
});
```

予測結果は `preparation_comparison.current` と `prepared`、`payment.cost_units/refund_units/unspent_before_units/unspent_after_units`、`acquisitions`、`refusal`。`prepared.owned[].pending` が未払い印。予測はコピーで、controller・保存・残高・候補を変更しない。拒否時は `prepared/payment:null`、`current` と `refusal.code/stage/field/related_ids/details` を返す。UIの編集案は保持する。未完成の札組を自動補充しない。

取得前取消は `acquire` から該当IDと編成中のpending参照を除く。所持／編成の移動だけなら費用0。取り外しは取得予定を残す。札12枚を満たすまで確定不可。正式所持を取得可能へ戻す操作は追加しない。全体の戻すは現在の確定編成へ戻し、保存済みdraftがあるときだけ `discard_draft`。通常の画面内編集に `save_draft` は不要。

確認から確定までは同じplan・revision・tokenを保持する。コマンド成功／replayed時だけ新しいview全体へ更新する。新viewで `pending:` は通常の `owned-N` へ置き換わる。古いhandleへ新tokenを付け替えない。保存失敗では見た目だけ確定せず案を維持。同じ意味の再送には同じrequest_id、変更案には新ID。stale時は再読込みと再確認を行い、自動決済しない。

旧 `retain_learning/cancel_learning/next_preparation.learn/purchase_timing/candidate/$purchase` は新planに持ち込まない。旧planは `preparation_contract_changed`、直接 `purchase` は `use_commit_preparation`。旧requestの再送だけはrequest_log照合で安全にreplayedとなる。

## UIの置換箇所と再開順

1. 同じ `acquisition-preview/app.js` の固定入力／ローカル確定を上記のview・preview・commitへ置換する。`layout.js`・`gestures.js`・`structure.css` の了承済み三領域と寸法を継承する。
2. `journey/unified-navigation.md` の未接続変更による出発遮断を、共通commit成功・最新編成／capabilities確認へ置換する。ローカル仮確定だけで遮断を解除しない。
3. 移行の `migration_review` がある場合は元保存の案が残っていることを示し、確定済みに戻すか、新契約で案を作り直す操作へつなぐ。再確認後のplanは `migration_review:null`。自動的にnullへ書き換えて決済しない。
4. [公開応答例](public-examples.json)と[代表保存](save-manifest.json)で初期／修飾札／修飾心得／持越し／移行要確認を開き、札と心得の両方を確認する。固定場面は自然進行の証明に置き換えない。
5. 保存失敗・stale・再送・実出発時の編成一致を変更経路に限定して確認。通常配布物・会話内入口を同じ実装へ接続し、UI側の参照コードSHAと確認結果を自Workへ保存する。

実IndexedDB・ブラウザー描画／入力・実複数タブは今回未検査。後続の実環境では、同一originの別確認slotで①旧保存openと閉じて再開、②旧案の要確認、③支払前取消と一括保存、④タブ間競合と失敗復帰、⑤確定編成での出発を確認する。既存保存を無言で初期化しない。D04／CO-P02の受入は今回のNode結果とは別記録にする。
