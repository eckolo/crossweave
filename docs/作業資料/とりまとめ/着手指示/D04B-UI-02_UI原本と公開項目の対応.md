# D04B-UI-02-UI-CONTRACT-01 — UI原本と公開項目の対応

版：1.0／2026-10-12（日本時間）。発行：とりまとめ20260913-project-coordination。

目的：H14既存契約回答後に残った原本と公開fieldの対応を文書で具体化する。新固定版の全面再判定・描画・ゲーム検査に依存しない先行回答で、了承済み暗色基準・19部品／37状態・57ID／17群は保全する。

## 開始設定

| 項目 | 指定 |
|---|---|
| Work・作業枝 | UI改善20260910-ui-readability／ui/readability-20260910を継続 |
| 必須同期 | ①計画枝のとりまとめ配下全体の実同期・元SHAと全path/blob記録→②設計集約の既定技術同期→計画再照合 |
| 保存・成果集約 | 自枝へ通常・非force更新。原本回答・自Work記録・同期JSON。とりまとめが提出を別途読戻し受領、本編への逆統合なし |
| 直接更新・担当 | 自Work／同期記録とdocs/検証/UI/readability/godot-ui-review-01/ui-contract-20261012/の回答資料。UI原本・計画コピーは独立改変しない。規則／本編／基盤／共通運用／計画の担当を維持 |
| 参照固定 | UI ab1b6fa067877a140ac9e9c9c006c70da76e40b4 dark-recheck、本編7211a605a04de36f9465fbae31979c4d6b0acf8f dark-return、H14 e178b4a13fc35fc49bac3870ebcceb0881f46779／後続ee6a62af128f4aff4233f1c9e057103299cc9bf9 |

## 必須成果・終了条件

原本commit/path/blob・節・既存意図、public fieldと表示先、Core側の条件・未解決・必要入力・次担当を対応表にする。named preset／saved draft／確定編成、raw効果／カード詳細／集計を混ぜない。正規保存が取得できれば元byte/hash/来歴を保存し、検索や取得不能を保存・API不存在の断定へ広げない。

原本不明なら、調べた固定版・path・取得結果、対応が不足する理由、必要な原本と担当を返す。既に版付きで了承された仕様を再採用判断へ戻さず、named preset実装やcontent/tier変更が必要なら具体的不足・選択肢・影響を回答票へ分ける。実採用は今回しない。

必要成果を自枝へ保存・本文/blobと親/tree/HEADを読戻し、自Work引継ぎに報告プロンプトを保存して最終応答へ全文提示する。原本対応の回答依頼として完了できても、合法実入力・表示の機能／描画・全必要群・UI適合・M1は未了を維持する。

## 貼付用依頼全文

以下の本文と併せ、とりまとめが保存後の固定40桁SHAを示す。

```text
Chat「UI改善」の既存Workを継続してください。
repo：eckolo/crossweave
WorkID：20260910-ui-readability
作業枝：ui/readability-20260910
対象：D04B-UI-02-UI-CONTRACT-01 改訂1.0。新Work・新枝は不要です。
指示書：docs/作業資料/とりまとめ/着手指示/D04B-UI-02_UI原本と公開項目の対応.md

①最新とりまとめ配下全体を実同期し全path/blobを自Work同期JSONへ→②dev_design_tmp_assemblyの既定技術同期→計画再照合を行ってください。最新UI ab1b6fa067877a140ac9e9c9c006c70da76e40b4 dark-recheckと本編7211a605a04de36f9465fbae31979c4d6b0acf8f dark-returnを継承します。
H14固定回答e178b4a13fc35fc49bac3870ebcceb0881f46779／後続ee6a62af128f4aff4233f1c9e057103299cc9bf9はとりまとめ受領済みです。入口はdocs/検証/接続条件/d04b-ui-02-legal-20261012/README.mdです。

今回は原本対応の回答に限定します。
1. 「保存preset」の原本commit/path/blob・節・意図を特定し、named preset／saved draft／確定編成のどれを指すかを対応表へ。Coreの参照解除条件とST-P08のlock／使用中の表示を結び、対応不明は根拠と必要回答を返してください。
2. R04の表示をカードdefense_uses、raw effects[].uses、集計guard.uses、効果なしguard:nullへ分け、明示null／欠落／有限／有限mixedの各原本・公開field・表示先を対応付けてください。
3. 正規既存3修飾保存が既にあれば未改変byte・来歴・hashを示してください。なければ調べた範囲と必要入力を返し、保存注入やfixture生成で補いません。

終了条件は、自Workと専用回答資料へ原本対応表・具体未解決・本編の必要入力を保存し、自枝の通常日本語コミット・非force更新と本文/blob・親/tree/HEAD読戻し、具体値入りの「とりまとめへの報告プロンプト」全文提示までです。
新仕様・named preset API・content/tier・通常save・本編コードは変更しません。描画・ゲーム検査・57ID／17群の全再判定は開始せず、今回回答をUI適合やM1完了へ読み替えません。
```
