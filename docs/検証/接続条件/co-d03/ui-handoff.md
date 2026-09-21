# CO-D03：UI向け受渡し

2026-09-20／公開契約 `CW-M1-public-0.5`。本体公開コミット `7671dedf32e725c9ee98e3bd5a829876cbd31746` へ保存・読戻し済み。Node／MemoryStore専用50件と公開本体のD03専用CIが成功。UI担当の受領・反映、実画面・実IndexedDBは未確認。[公開記録](publication.json)。

## 入口・公開境界

入口は `src/runtime/campaign.mjs` の `createCampaign`。UIが読むのは返答の `meta` と `display_data`。`exportSave()` は保存・移行・診断用であり、UI描画のデータ源にしない。

`home.owned` は1行1所持個体、`home.candidates` は現在の購入候補。無料札は `home.free_card_options`、解放は `case.unlocked_card_ids`、基礎習得は `home.economy.learned`。同じ基礎が解放済みでも無料・所持とは限らない。所有者の個体は探索で札が消耗しても所持台帳から自動で失われない。

`details[id]` に修飾後の数値・基礎名・修飾の説明・発動条件・効果・容量・価格とは別の習得費を返す。`home.owned[*]` に使用中・ロック・変換単価・参照・利用可能理由を返す。札名やblueprint keyから性能を逆算しない。心得の効果・修飾・容量、購入価格、変換益をUIで再計算しない。

個体 `owned-N`、候補 `choice-N` は現在のviewに限った操作handle。保存本体はUID・batchの正確な参照を持つが、それらを公開しない。操作成功／再読後は新しいview全体を使う。古いhandleだけを新しいtokenへ付け替えない。期限切れ案には `expired-candidate-N`、消失個体には `missing-owned-N` を返し、同名の別品へ代替しない。

## 共通要求と確定

`execute({request_id,expected_revision,view_token,type,payload})` はawaitする。`expected_revision` と `view_token` は対象を選んだviewの `meta` から渡す。1操作の再送では同じrequest IDと同じtype/payloadを使う。別操作は新しいIDにする。

成功は `display_data.operation.status='committed'`、保存済み再送は `replayed`。拒否は `display_data.error`。保存失敗を成功表示にしない。古い状態の拒否時は `open()` で現slotを再取得してから選び直す。単なる `inspect()` はそのControllerが持つsnapshotの閲覧である。

| type | payload | 意味 |
|---|---|---|
| `purchase` | `{candidate:'choice-0'}` | 現在の未使用資源から直接購入。暗黙の習得取消なし |
| `convert_items` | `{item_ids:['owned-1']}` | 指定した実個体をまとめて変換 |
| `set_item_lock` | `{item_id:'owned-1',locked:true}` | 変換ロック |
| `save_draft` | `{plan}` | 明示案を保存。無効な案も理由と正確な参照を保持 |
| `discard_draft` | `{}` | 確定構成に案を戻す |
| `commit_preparation` | `{plan}` | 取消・購入・習得・装備・札組をまとめて確定 |

返答は現在viewを含む。個別operationの成功だけで表示を局所書換えせず、必要なviewを更新する。

## 候補・帰還

`home.offers.status` は `none`／`available`／`purchased`。`carried_from_previous_return` は非適格帰還で旧候補が残った表示用。候補表示や見送りに再抽選命令はない。保持した適格報酬のある帰還だけが新しいbatchを作る。

購入ボタンは共通 `capabilities.purchase` と候補行の `available`／`affordable_now` を合わせて使う。帰還確認前は候補と準備比較を読めるが、購入・変換・ロック・準備確定は不可。`ack_return` と場面の確認条件を尊重する。`owned_items`／`affixes` は参照機能のcapabilityで、同名のexecute命令ではない。

## 準備比較

`previewPreparation({view_token,plan})` は純粋なコピー比較。planの形は次のとおり。

```json
{
  "retain_learning": ["PS01"],
  "cancel_learning": [],
  "candidate": "choice-0",
  "purchase_timing": "before_preparation",
  "next_preparation": {
    "learn": [],
    "equipment": ["base:PS01"],
    "deck": ["既存の12枚構成から必要な1枚を$purchaseに置換"]
  }
}
```

これは構造の例であり、そのまま使える札組ではない。実データの12枚を使う。retain/cancelで現在習得の全基礎を重複なく分割する。購入しない場合もcandidateを明示的なnullにする。取消は購入／準備より先で、実払費を返す。`before_preparation` では購入後に `$purchase` を札組・装備へ指定できる。`after_preparation` では今回の購入予定品をその準備に使用できない。

`preparation_comparison` の `stages`、`cancellation.actual_refund_units`、`purchase`、`learning`、`prepared`、`differences` を表示する。失敗時は `refusal.stage`／`field`／`code`／`details` を利用する。previewは購入や案保存を行わない。`draft_discarded` は失敗した比較用コピーを捨てた意味で、保存済み案を削除した意味ではない。

## 変換見積り

`quoteConversion({view_token,item_ids:['owned-1']})` は読取り専用。`conversion_quote.items` は個体ごとの単価と `loses_variant_access`／`free_option_retained`、合計は `total_units`、変換後は `unspent_after_units`。最後の利用可能個体を失う場合は、確定前にその警告を表示する。

ロック・装備・確定札組・保存済み案の参照がある個体は拒否。無料選択権・素材・解放そのものは変換対象でない。習得取消の返還をこの見積りへ加算しない。使用中の理由は `references` と構造化された拒否情報を使う。

## 実機で残る確認

実IndexedDBの移行・書込み失敗・再開・複数タブ、操作後のhandle更新、失敗表示、保存済み案の保持、容量／同基礎上限、候補保持表示、所持と無料選択の見分け、最後の変換警告、修飾詳細と実札・予測の表示一致。今回はNode／MemoryStoreのみ確認済みで、これらのUI描画・入力・人評価を合格とは扱わない。
