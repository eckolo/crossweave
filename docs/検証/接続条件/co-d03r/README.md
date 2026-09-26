# CO-D03R 統一取得・編成と保存移行

2026-09-26／Work `20260909-design-assembly`／作業・統合先 `dev_design_tmp_assembly`。

完成済みD03を継承し、取得予定と編成を支払前に確認して一括保存する共通本体を提供する。初期札・取得札・心得を実個体の同じ公開一覧へ統一し、取得した心得への追加種類習得を除去した。旧保存は残高・履歴・探索状態を保持して移行する。

**R1〜R5の依頼全体は完了**。本体 [`442af718`](https://github.com/eckolo/crossweave/commit/442af718d30b30284cf5ac976eb7421992d94dfd) を公開・読戻しし、[専用CI](https://github.com/eckolo/crossweave/actions/runs/36223942471)も成功。現在の提出状態・成果コミット・読戻しは [publication.json](publication.json)、依頼全体の完了判定は [自Workのとりまとめ引継ぎ](../../../作業資料/Work/20260909-design-assembly.md#とりまとめへの引継ぎco-d03r)を参照。UI受領・接続の完了を代行した記録ではない。

| 依頼 | 成果 |
|---|---|
| R1 | [新旧対応・了承済み／試行／未採用の区分](mapping-and-migration.md)。既存価格・選択権を根拠とし、UIモック値を採用しない |
| R2 | `src/runtime/` の統一取得・個体一覧・非破壊予測・一括確定。既存の保存CAS／冪等要求／変換／ロック／出発を継承。[公開契約](ui-handoff.md) |
| R3 | save1→save2。旧案の退避と要再確認、二重移行防止、失敗時の元保存保持。[移行10資料](migration-examples.json) |
| R4 | [限定検査結果](results.json)／[実行ログ](node-test.tap)／[条件と出典hash](conditions.json)。公開応答・移行・原子性・出発の変更経路だけを確認 |
| R5 | [コード差分](integration-files.txt)・[公開応答例](public-examples.json)・[代表保存](save-manifest.json)・[UI再開手順](ui-handoff.md)、GitHub保存読戻し・自Work引継ぎ |

## 再現

```sh
node --test --test-reporter=tap test/runtime/d03r.test.mjs
# 記録を再生成する場合は別出力先を指定し、この固定記録を上書きしない。
D03R_OUTPUT=/tmp/crossweave-d03r-check node --test --test-reporter=tap test/runtime/d03r.test.mjs
```

Node v24.19.0・MemoryStore。D03R専用37項目。旧D03 50件・D58・旧UI全検査は再実行していない。CIも今回の専用ファイルだけを実行する。

10資料はD03の自然3帰還後／取得済み／変換済み／探索中／帰還後と、D02からの旧5保存。追加の境界fixtureは既存の正当な900unitsを使い、旧習得や旧案を旧計算から構成している。今回の自然初回例は新規残高0から公開操作だけで探索・帰還し、実報酬と候補を得たもの。価格を見せるための資金追加はない。UUID・view_token・テストrequest_idは毎回新規で、固定セーブ／実応答には実行時の値を保存した。

[代表保存](save-manifest.json)はBrotli→base64形式。読み出したJSONは `Campaign.importSave` へ渡す。出力manifestのraw/encoded SHA-256で照合できる。`migrated_review` は旧案の再確認場面、`acquired` は修飾心得＋基礎心得の一括確定、`departed` は修飾札を編成して実出発した場面。新viewはimport先controllerから取得し、保存済み応答の古いtokenは再利用しない。

今回未確認：実IndexedDBでの永続保存、実ブラウザー描画・物理入力、実複数タブ、UI本編接続、人の評価。後続の具体手順はUI受渡し末尾。D04・M1全体の受入・製品値決定を今回の成功に含めない。
