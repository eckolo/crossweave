# RD-ENV-02／RD-PROOF-02 検証・引継ぎ

2026-09-27。実行基盤・配布設計 `20260926-runtime-delivery`。現在は成果保存・Windows実行経路の確認中。依頼全体・ENV・PROOFとも、Windows実機未確認のため未完了。

## 成果と確認の区分

- [単一solutionの入口・復元・生成](../../../../apps/crossweave-godot/README.md)
- [固定toolchain](../../../../apps/crossweave-godot/packaging/toolchain.lock.json)
- [利用者の起動手順](../../../../apps/crossweave-godot/packaging/START-HERE.md)、[Windows確認票](../../../../apps/crossweave-godot/packaging/Windows確認票.md)
- [ENVの最小生成記録](env-minimal.json)。PROOF着手前に最小C#画面の起動・Windows実行一式の生成を確認した。

LinuxホストでCore／ファイル13試験、Godotノード・viewportへの合成入力20項目、専用状態41の書込み→プロセス終了→別プロセスでの一致、実ファイルの書込み失敗表示を確認。Windows Releaseは生成済み。Windowsの実入力・描画・音・GPU・DPI・性能は未確認。専用CIでWindows Releaseのheadless起動・保存疎通を別途実行し、結果を追記する。

ビルド成功・ノード試験・Linux保存疎通・Windows生成・Windows実行・実機操作を相互代用しない。headlessメトリクスはFHD60fps・視覚応答100ms・500MBの合否に使わない。

## 固定入力・出典対応

| サンプルの内容 | 出典・取り込んだ意味 | 限定・未実装 |
|---|---|---|
| 牽制 A／踏み込み B／小突き C、場の受け流し A／重撃 B | 技術原本`9f46e0e63593d6aa396ec0f159bdf4923eb4e108`の`src/content/m1.mjs`にある札名・属性 | 3手札＋2場札という並びはこの疎通専用fixture。既存の仮数値や元fixtureを変更しない |
| 属性一致→使用札と一致札の共通回収、一致なし→設置 | 同SHAの基本設計4.1〜4.3 | 主効果・ダメージ・経済・乱数・期限・ターンは実装しない。一巡やD03Rの移植合格ではない |
| 220ms保持、保持前の横移動、詳細トグル・外クリック、予測 | UI参考`72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`の`docs/検証/UI/readability/正式参照版.md`と`interaction/画面操作・描画方針.md` | 220msは再現値。3枚が収まる小場面の横送り。全一覧・タッチ・大量札の完成ではない |
| FHD16:9、窓を反対側の端へ配置、情報と操作の分離 | 同UI参考の公開資料・追加操作記録、CO-M1R0.8 | 専用画面の位置計算・ノードまで検査。実描画とDPIを合格にしない |
| 重複コマンド／revisionと表示の分離 | D03Rの状態確定・再送の目的を最小の別Coreで検査 | 既存runtime APIや保存契約の互換実装ではない |
| 専用小状態の保存 | 今回着手指示の限定保存 | counter／形式版／日本語noteのみ。本編m1.json、正式移行、全経路、二重起動は後続 |

日本語フォントは既存Noto Sans JPを固定commit・hashで取得し同梱。新規イラスト・音楽等を作成していない。音はコード内の短い検査信号で、再生資源の存在と実際に聞こえることを区別する。

## 本編へ渡す境界

再利用候補：solutionと.NET／Godotの境界、版固定・生成・確認入口、入力所有者の分離、manifestと利用案内。

試作用：ProofSessionの限定札モデル、専用小状態、ProofViewの一場面、ProofAutomation、仮配色、短い検査音。これらを正式ルール・正式保存・完成UIとして採用しない。

本編D04BはCore／Godotのモデルと操作を実装し、基盤担当は保存・起動・exportを扱う。正式保存はRD-SAVE-02。規則や経済の意味を変更する必要が出た具体点だけゲームバランス検討へ渡す。原本・旧試作・仮データ・固定試験は変更していない。

今回の残件：Windows実行経路の結果取得、実機確認、固定ソースSHA付き最終実行物とmanifestの保存・読戻し、引継ぎ確定。未確認を成功に変更しない。
