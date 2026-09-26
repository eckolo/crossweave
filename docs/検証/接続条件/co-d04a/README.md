# CO-D04A 実保存確認：未完了・外部条件待ち

2026-09-26／Work `20260909-design-assembly`／`dev_design_tmp_assembly`。

**今回の依頼全体（A1〜A4）は未完了。実IndexedDBの実行数は0。** 現在の正規Cloud Browserでも、既存の確認入口が `net::ERR_BLOCKED_BY_CLIENT` で開けなかった。入力照合・再開用入口・手順・阻害記録を保存する。文書・構文確認を実保存の合格とは扱わない。

| 項目 | 状態・根拠 |
|---|---|
| A1 実行条件 | 一部完了。コード・入力・専用DB・起動手順を固定。実ブラウザーの対象originへの到達・OS／完全版番号の取得は未了 |
| A2 実保存 | 未実施。新規／取得／探索／帰還／旧保存移行／実2タブ／失敗保全の実結果はいずれもない |
| A3 必要修正 | 実確認待ち。保存不具合の発見・修正は0件。未確認を「不具合なし」と断定しない。runtime・公開契約・仮データは変更していない |
| A4 保存・引継ぎ | 再開物・阻害・未確認の保存と自Work引継ぎを提出。GitHubの公開・読戻しは [publication.json](publication.json)。実結果の追加保存はA2実施後に残る |

## 固定した基点と入力

- 共通本体：`442af718d30b30284cf5ac976eb7421992d94dfd`、受領基点 `9d5dd304dee942965b9f1dd62368bee9f3c9e670`。
- engine `CW-M1-engine-0.7`、public `CW-M1-public-0.6`、preparation `CW-M1-preparation-2`、save `CW-M1-save-2`。rules0.5・内容0.2を維持。
- 計画：`dd16ba6e72709ed6c291010ab321c4d90b5aeb4e`／全体・Work別0.13、D04A指示0.1。[全31ファイルの同期記録](../../../作業資料/計画同期/20260909-design-assembly.json)。範囲限定同期であり、計画枝全体のマージではない。
- [D03R保存manifest](../co-d03r/save-manifest.json)・[移行例](../co-d03r/migration-examples.json)・[UI契約](../co-d03r/ui-handoff.md)と既存 `storage.mjs`・`campaign.mjs` を継承。旧D03R37件・D0350件・D58は再実行していない。

| 再開用の入力 | 出典・用途 |
|---|---|
| `natural` | `test/runtime/d03-natural-home.json.br.b64`。D03の自然3帰還後・正当な900units。既存候補＋基礎棚の計600units一括確定を確認する |
| `departed` | D03R `departed.save.json.br.b64`。save2・修飾札を持ち込んだ探索中 |
| `returned` | D03 `migrated_return.save.json.br.b64`。save1の帰還・精算済み状態 |
| `purchased` | D03 `purchased_home.save.json.br.b64`。save1・取得個体／候補消費／支払履歴を保持してopen移行 |
| `oldest` | D02 `saves/home.save.json.gz`。engine0.1／save1からのopen移行 |
| `dirty`（派生境界） | 同じnaturalへD03R既存テストの旧習得PS01→旧取消案の構成手順を適用。自然に得た900から既存価格200を支払った700units。新しい報酬・価格・札は作らない |
| 照合専用 `reviewed` | D03R `migrated_review.save.json.br.b64`。上記dirtyの旧draftと、変換後sessionが既存の公開例に一致することを準備時に照合。ブラウザー入力へ重複投入しない |

全出典hash・原形式・revisionと派生手順は [input-manifest.json](input-manifest.json)。[準備記録](readiness.json)はNode上の復号・入力検証・構文・参照先照合であり、保存検査ではない。

## 阻害の事実と権限の扱い

[environment.json](environment.json)に観測・正確なエラーを保存した。

1. 現在の操作面は正規 `cua_repl` のCloud Chrome、既存tab 1。ローカル実行環境のOSはUbuntu 24.04.3、Node v24.19.0。Cloud ChromeのOS・完全版番号は未取得で、ローカルOSを代入しない。
2. 既存READMEの同じ `http://127.0.0.1:8000/docs/検証/接続条件/co-d02/harness.html` を現在環境で一度だけ確認した。ナビゲーションが `Browser Use cannot open ... Browser reported: net::ERR_BLOCKED_BY_CLIENT` で拒否された。ページのコード・IndexedDB操作まで到達していない。
3. これは観測されたクライアント側アクセス拒否であり、背後のポリシー名・詳細設定は不明。IndexedDBの権限不足、ゲーム不具合、GitHubの書込み拒否、サイトのbot判定とは断定しない。
4. 以前のco-d02記録も同じ拒否。今回の一度の確認後は、リロード反復、別ポート・別ホスト・トンネル・file/data URL・別ブラウザー等への迂回を行っていない。利用可能性の読取りで、Playwrightパッケージはあるがその既定ブラウザー実行ファイル3種が存在しないことを確認。代替ブラウザーの導入・実行はしなかった。
5. D03時のGitHub `create_tree` 自動レビュー拒否（「リクエストの安全性を確認できなかったため」）は同経路の後続要求で解消済みの履歴。今回のブラウザー拒否と混同しない。通常のGitHub保存は接続済みコネクタで行い、今回の結果は公開記録へ残す。

再開条件は、**正当な権限でこのリポジトリの確認ページとES Modulesを同一originから開け、実IndexedDB・sessionStorage・BroadcastChannelと独立した2タブを使えるブラウザー環境**。UIの完成・新API・素材・正式バランスの判断は開始条件ではない。このCloud Browserのアクセス制約を迂回する指示ではない。

## 許可された実行環境での再開

リポジトリの成果コミットを取得し、ルートで次を実行する。既存確認入口と同じlocalhost originを使う。ファイルを直接開く方法ではES Modulesと保存originを確認できない。

```sh
node test/runtime/d04a-prepare.mjs
python -m http.server 8000 --bind 127.0.0.1
```

通常ブラウザーで `http://127.0.0.1:8000/docs/検証/接続条件/co-d04a/harness.html` を開く。今回この新入口へのブラウザーナビゲーションは実施していない。元のoriginが拒否されたため、別パスを拒否回避に使っていない。

1. OS・ブラウザーの完全版番号を入力し、「1. 専用枠で保存・移行・失敗保全」を実行。新しい専用DB `crossweave-CW-M1-D04A-<UUID>` と固定の使い捨て枠を使用する。既存通常保存のDB・枠は使わない。
2. 「2. このページを再読込」→「3. 新controllerで再開・照合」。新documentのID・navigation種別・全保存のcanonical SHA-256を記録し、保存そのものと新controllerのexportの一致を確認する。単にcontrollerを2個作る操作では通過しない。
3. 「4. 同じDBを別タブで開く」で、別の実ページが待機表示になったことを確認。主タブへ戻り「5. 実2タブの競合・同要求再送」を実行。2ページが同じrevisionをopenした後、主側確定→他側の古い別要求拒否→同じrequest再送→最新openを照合する。文書ID・revision・request_id・各結果を記録する。
4. 主タブで2→3を再実行し、2タブ操作後の状態も実際のページ再読込で照合する。`passed_limited_browser_checks` になるまでを限定確認の実行範囲とする。単独の成功行や再開準備完了を全体成功としない。
5. 「結果JSONを保存」で実結果を保存し、使用Git SHA・OS／ブラウザー版・異常の有無とともに設計Workへ戻す。設計が実記録を確認し、必要な修正・該当経路の再確認・GitHub保存読戻し・自Work完了記録を行う。

`d04a-prepare.mjs` は元保存を復号して `generated/inputs.json` を再生成する。生成物はGit管理外で原保存は変更しない。元コード33点と入力6点を既存manifestへ照合してから生成し、ページ側でも本体31点と入力のhashを照合する。D03R本体が変更された場合は別条件として出典を更新する必要があり、固定hashを黙って無効化しない。

失敗時は結果JSONと専用DBを保全し、元の通常保存を初期化しない。再試行が必要なら、新しい通常タブへ入口URLを直接入力して別UUIDの確認を始める。検査用DB・記録の削除を再開条件にはしない。検証用sessionStorageは期待hashと進捗だけであり、ゲーム保存の代替ではない。

## 確認方式と適用限界

- 取得は現在viewからplanを作り、`previewPreparation` と `execute(commit_preparation)` を使う。残高・個体・候補消費・編成・request_logを含む全保存を照合する。未確定の比較・取消はIDBの原保存が不変かを確認する。
- save1を専用の空枠へ原形式のままseedし、現行 `Campaign.open` が実際に永続移行する経路を用意した。seedは旧アプリが残したrecordの検査用再現であり、旧アプリの実起動を意味しない。通常の輸入は `importSave` を使う。
- 不正schemaは専用枠へ置き、拒否後もraw recordのhashを保持するかを確認する。人工的な書込み中断は検査アダプターでnative IDB transactionにputして即abortし、`storage_write_failed` を返す。controller・DB・旧保存の不変と、通常 `IndexedDBStore.commit` に戻した同要求再送を確認する。**本番commit自身のabortエラー変換、ディスク枯渇・電源断・プロセス強制終了の証明ではない。**
- 実2タブ検査は先に両方をopenした時間差競合。トランザクション内部の同時CAS競走や長時間の競合耐久を追加で確認した扱いにしない。
- 提出時点で上記の実ブラウザー経路はすべて未実行。コードを用意したこと、既存Node37件、今回の入力検証で、実保存合格を代用しない。
- 本編UI描画・実マウス／タッチ・画面操作全体・人の評価・M1受入は今回範囲外。UI Workの成果取込み・UI接続の重複実装・仮値の調整はしていない。

[UI／D04受渡し](ui-handoff.md)／[自Workのとりまとめへの引継ぎ](../../../作業資料/Work/20260909-design-assembly.md#co-d04a-handoff)から、依頼内残件と再開担当を確認できる。
