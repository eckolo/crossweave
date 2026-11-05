# 最終統合版の実描画・一巡・保存再開

同じ統合済み実行物をdotの既存デスクトップ端末からX11で起動し、自然初回の探索・踏破帰還・取得編成・再出発と、その後の別プロセス再開を確認した。natural、package-checkpoint、package-resumeは全て成功・exit0で、元のheadless timeoutとは別の検査結果として保存する。

- 固定source/runtimeの参照：`../integrated-target/before-hashes.json`。54ファイルを再照合して差異0。実行中のsource変更・再buildなし。
- Godot 4.7.2 C#、.NET 10.0.12、通常Main.tscn。既存runtimeのみ、インストール・通信設定変更なし。
- natural：327チェック、79命令、PID41、revision83。
- checkpoint：2チェック、PID149、revision83。resume：11チェック、2命令、PID239、revision85。全DTO・Core/実ファイル/View・次乱数結果まで一致。
- `resume-expected-before-restart.json`は再開前の完全snapshot。`resume-expected.json`はresume内部の次操作前snapshotであり、同一ファイルとみなさない。
- 独立HOME/XDG、slot integrated-gui-natural-20261105。通常セーブや元Windows環境は変更しない。
- PNGはGodotがViewportから生成した実描画で、画像の再構成・補間はしていない。CUAで実行中のゲーム画面も観察した。操作自体は実Controlへ与えた合成InputEventであり、人のOSマウス試遊ではない。
- logical viewport 1920×1080、actual window 1180×812。Windows 11・FHD物理画面の受入には代用しない。今回の制限・間欠終了異常は`../統合確認.md`を参照。
