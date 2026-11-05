# 統合ソースでの対象保持回帰

2026-11-04 16:13–16:15 UTC、攻撃押下修正と対象保持修正を併合した凍結済みソースの既存DLLで実行した。コード変更・再ビルドはしていない。Godot 4.7.2 C# / .NET SDK 10.0.401 を使用し、専用HOME・XDG・slotへ隔離した。

- 設置: 33件成功（Control合成入力・状態不変31、公開view投影2）。
- 身構: 29件成功（Control合成入力・状態不変27、公開view投影2）。
- 回復: 25件成功（Control合成入力・状態不変23、公開view投影2）。
- 合計87件成功。開始前後で54ファイル（C#ソース、実行DLL、検査スクリプト、元fixture）のSHA-256不変を確認した。

入力は実際のGodot Controlへの合成InputEventで、既存Clickヘルパーの同一フレームdown/upを用いた。物理マウス・Windows実機の操作確認や、押下時間を分離する攻撃回帰とは区別する。主体離脱・候補ゼロ6件は公開view投影の境界確認で、実戦で敵を倒した試験ではない。通常のセーブ・元実行画面には触れていない。行動をcommitする検査ではなく、選択切替・予測・詳細操作の前後でDTOと隔離セーブ内容の不変を確認した。

入力は正規元のgenerate-target-fixtures.mjsから再生成した、固定application-oracle.json.brのnatural step 1/2/11である。規則・数値を調整していない。個々の操作とchoiceは各ケースのtarget-selection-steps.json、判定はtarget-retention.json、結果集計はsummary.jsonを参照する。開始時のファイル別hashはbefore-hashes.jsonへ記録し、終了時に全件再照合した。

この結果は今回の対象保持修正の統合回帰であり、ゲーム全体の完了や受入完了を表さない。
