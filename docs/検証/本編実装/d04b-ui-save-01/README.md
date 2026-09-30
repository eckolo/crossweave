# D04B-UI-01／RD-SAVE-02B — 本編画面と保存接続

2026-09-30。WorkID `20260927-game-application`、ブランチ `impl/m1-godot-application-20260927`。新規Workは作らず、この1Workだけで実施。コードSHA `dad99fbc820cc4a49164faac3260c0a1d5d95d0b` を通常GitHubプラグインで保存し、同じtreeの読戻しを確認した。

通常の `Main.tscn` が本編になり、FileGameSessionを一つ所有する。準備→SCN-001探索→踏破／撤退／緊急脱出→取得・編成→再出発、終了後の同状態・同乱数続行を接続する。Core・保存02Aの完成を土台にした画面接続であり、正式配布・Windows 11実機受入・M1完成を意味しない。

## 読む入口

表中はリポジトリルート相対パス。

| 用途 | 場所 |
|---|---|
| アプリ全体・学習順の索引 | `apps/crossweave-godot/README.md` |
| 通常起動と操作、実機での確認場面 | `docs/検証/本編実装/d04b-ui-save-01/起動と操作.md` |
| Godot未経験者向けの解説 | `docs/検証/本編実装/d04b-ui-save-01/コード解説.md` |
| 了承UIの対応とGodotでの差 | `docs/検証/本編実装/d04b-ui-save-01/UI対応表.md` |
| 保存・終了・復旧・後続の接続契約 | `docs/検証/本編実装/d04b-ui-save-01/接続契約.md` |
| 入力・期待・実測・未確認 | `docs/検証/本編実装/d04b-ui-save-01/確認結果.md` |
| U1〜U6・依頼全体・成果SHA・残件 | `docs/検証/本編実装/d04b-ui-save-01/とりまとめ引継ぎ.md` |
| 保存読戻し記録 | `docs/検証/本編実装/d04b-ui-save-01/results/publication.json` |

## 受領と編集境界

開始HEAD `ed83d67b89923d3d602d8a160b2b9ef5b6a85d6a`、Coreコード `56caf2053bba02d2fddf4a77785c1a2da45c1302`、保存コード `e6b3b7446626f99131396e10bfbfdbd5990d8694`。

1. `ops/project-coordination-20260913` の `512f045ca7262334688135b257a28ecaf389b75a` から、`docs/作業資料/とりまとめ/` 全41ファイルを同期。
2. その後 `dev_design_tmp_assembly` の `7f6f0fce495c59666c254caba2469da1e1dfc4c3` を取得・確認。技術差分なし。同期した41ファイルを再照合。
3. UI原本 `ui/readability-20260910` の `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`（UI0.16.0）を固定読取参照。一括マージせず、仮画像3点のみ同じblobで利用。

記録は `docs/作業資料/計画同期/20260927-game-application.json` と `docs/作業資料/Work/20260927-game-application.md`。以前の同期票は `docs/検証/本編実装/d04b-ui-save-01/previous-plan-receipt.json` に保全。

固定Godot／SDK／renderer／保存形式、旧src、Proofモデル・Proof保存先・旧検証結果は維持した。Coreの追加は心得の日本語公開説明だけで、価格・ルール・DTO・乱数演算を変更しない。InfrastructureではGodot隔離検査へのinternal可視性のみ追加し、保存アルゴリズムを再実装していない。
