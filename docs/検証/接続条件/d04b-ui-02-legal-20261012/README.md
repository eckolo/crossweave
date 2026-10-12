# D04B-UI-02 合法入力と既存契約の先行回答

版1／2026-10-12。WorkID 20260909-design-assembly／dev_design_tmp_assembly。固定指示91fe0ac1ff1555d0d87dca0bec49ced4a45a8460・改訂0.5を受領。**3項目の根拠付き回答と未解決の必要入力を作成済み。GitHub保存・読戻し・自Work引継ぎの完了はpublication.jsonおよび自Workの最終記録で確定する。合法実入力／UI適合／D04／M1の完了ではない。**

| 項目 | 回答 | 残る実入力・確認 |
|---|---|---|
| R01-filler | [条件・処理・公開値・全入口・操作レシピ](R01-filler.md) | filler-before-actionの合法DTO/hash・seed・完全列・同id。対象外にしない |
| R04-unlimited | [明示null／欠落default2／有限／mixedと全入口](R04-unlimited.md) | 正規由来nullカード／保存。C# effect欠落検査差を本編へ返す。全入口禁止にしない |
| U-V01／ST-P08 | [登録名・通常候補制約・取得／lock／変換／draftレシピ](U-V01-ST-P08.md) | 3修飾正規既存保存・preset対応・各状態実証。現通常tierI最大1修飾 |

[evidence.json](evidence.json)は計画以外の86原本の40桁commit/path/blob/SHA256と取得記録。[inputs.json](inputs.json)は既存生成済み4入力の元byte/hashと静的snapshot。既存hashを未実行レシピの生成物hashへ流用しない。[answers.json](answers.json)は不足・次担当・再開条件。

必須計画配下87ファイルを元同pathへ実同期し全path/blobを[自Work同期JSON](../../../作業資料/計画同期/20260909-design-assembly.json)に記録。確認時の設計同scope treeはbfa08ad8f3193d27645d58ff2673bee8d0494581で既に元と同一、追加コピー差分なし。GitHubプラグインから取得した全本文のblob hashも照合。

設計開始HEAD5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4、JS engine0.7/public0.6/preparation2/save2。C#は固定7211a605a04de36f9465fbae31979c4d6b0acf8fのApplicationDto1/CW-CSharp-core-1。public schemaと移行入口を区別。m1/economyデータは原本読取り比較で等しいが実行結果一致を確認したものではない。

最新UI ab1b6fa067877a140ac9e9c9c006c70da76e40b4のdark-recheck返却と本編7211 dark-return返却を使用。旧recheck判定で置換しない。本編候補a01c5c2762de1cfce602f4547818b29dc3d13e10の9コード保存、記録上build成功、機能検査0・描画未実施・保全台帳1本文未取得を区別して維持。

今回game command0・機械的探索0・新fixture生成0・C# build/test0・描画／入力実検査0・通常save変更0。本編C#・UI原本・Cloud環境・AGENTS・共通設定／他Work記録編集0。通常保存はGitHubプラグインのtree/commit/非force ref更新。不要な直接clone試行の403失敗を自Workに保存し原則手順へ戻した。拒否迂回／環境設定変更なし。

CO-D04Aの実IndexedDB・実再読込・実2タブは外部条件待ち（ERR_BLOCKED_BY_CLIENT）を保持、今回再開0。UI採用H11〜H13、本編source／通信unknown等の従来停止は保持。3回答を理由に検査停止や未確認を解消しない。

[自Work引継ぎ・具体報告プロンプト](../../../作業資料/Work/20260909-design-assembly.md)がとりまとめへの入口。保存と受領は別。外部送信・別Work起動は行わない。
