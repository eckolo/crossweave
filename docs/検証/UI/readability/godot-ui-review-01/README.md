# UI-GODOT-REVIEW-01 再確認・合意案の再現基準

版：2026-10-04.1／2026-10-04（UTC）。原本 `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`、本編実装・証拠 `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531`、提出 `0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6`。

**調査・判定を作成。UIは要修正、配布不可。** 通常保存・Push・読戻し実績は[publication.json](publication.json)へ記録する。

- [とりまとめ引継ぎ](とりまとめ引継ぎ.md)：今回の完了範囲・後続・判断事項
- [適合確認](適合確認.md)／[review.json](review.json)：R01〜R07・U01、初回38項目、追加N01〜N03
- [原本対応](原本対応.md)／[外観基準](visual-baseline.md)：了承範囲6件、共通部品19件、固定値とpath/blob
- [画面状態一覧](画面状態一覧.md)：M1の37状態群
- [全差異台帳](visual-diff.md)／[JSON](visual-diff.json)：未承認の不一致57件
- [比較証拠](比較証拠.md)：原寸55PNGと比較図8点、寸法・画素・環境
- [必要未確認](必要未確認.md)／[JSON](unknowns.json)：17群。R01-filler・R04-unlimitedを含む
- [本編向け修正条件](本編向け修正条件.md)：同じD04B-UI-02の修正順と受入条件
- [同期・全62path/blob](sync-20261004.json)／[ソースと証拠監査](source-audit.json)／[初回履歴](history/20261001/README.md)

R02/R03/R05/R06/R07/U01の限定機能は適合。R01/R04は必要未確認を残す。機能の成立だけで合意案の外観適合とはしない。個別承認例外0件。未承認差異と必要未確認が0件になるまで配布可にしない。

本編コード・共通仕様・計画原本の変更、新しいUI・素材制作、配布、他Workの自動起動・送信なし。物理入力・DPI等、HTML IndexedDB、人の試遊は今回実施せず後続。既存証拠を確認し、全旧検査は再実行していない。
