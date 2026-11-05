# 統合後の通常一巡・保存再開検査

通常の準備・探索・帰還・取得編成・再出発を、統合後の実Godot Control合成入力で検査した。初回帰還と取得編成確定、再出発の記録までは得られたが、既存natural oracleの再探索中に240秒上限で終了したため、検査全体の合格とは扱わない。別プロセス再開はまだ実施していない。

- 正式Work: 20260927-game-application、枝 impl/m1-godot-application-20260927。GitHub書込みなし。
- 固定本編元: 027a7b4b87a0018f46130fb2d3200bcb6ef5fc6a。正規隔離作業元の統合後source/DLLを使用し、変更・再buildなし。
- 計画: 48c43dc0c745bc066e1196fa532e48fd94466f6b、108ファイルのGit blob照合一致。
- 固定SDK10.0.401／Godot4.7.2、既存 --headless --ui-check=natural 入口。新規導入・通信なし。
- natural.log: 141〜153行に帰還ack、取得basic:PS01、編成、review/commit、再depart。保存はrevision60、nextRun2、revisit、踏破済みcase。
- 240秒は既存UiProbe/verify.pyと同じ上限。明示Godot例外を観測しておらず、上限到達とゲーム機能失敗は区別する。natural.jsonは未生成。
- manifest.json: 実コマンド、隔離HOME/XDG/slot、source・oracle・実行DLL hash。検査中source/DLL変更なし。timeout-state-summary.json: 終了後の読取り専用保存要約。
- 通常セーブ・元runtime・旧証拠・稼働画面は変更しない。新規描画経路や環境変更なし。
- Linux headlessの実Control・viewport-local合成入力・実ファイル結果。描画、Windows物理入力、可読性、DPI、音、人の面白さ評価、正式UI受入、M1完成は未検証。

今回検査は未完了・上限到達後の次操作判断待ち。再実行で上限を延ばす場合も、既存証拠・slotを上書きせず新しい実行へ分離する。

## 別プロセス再開の既存入口と前提（読取り調査のみ）

1. 一巡プロセスが終了し、同じ最終source/DLL・固定runtime・同じ隔離HOME/XDG/slotを使う。先に対象slotのm1.jsonが存在することを確認する。既存Runはopenが無効ならnewを選ぶため、slotやHOMEの誤指定を先に除外する必要がある。
2. `--ui-check=package-checkpoint` は通常Main.tscnのopenで既存slotを開き、全DTOを指定outputのresume-expected.jsonへ書き、SaveFileCodecの内容と一致を検査する。ゲーム状態を書換える命令はない。終了まで待って、レポート成功・process_id・保存hashを記録する。
3. 別のGodotプロセスで `--ui-check=package-resume` を、同じslot・HOME/XDG・同じoutputへ実行する。最初に全DTO（nonce含む）一致を検査する。その後に必要なら本文読了を最大8回行い、新しいcheckpointを作成し、合法手を実Controlドラッグ/確認で一回確定する。Core再実行・保存ファイルとの同値、次の乱数結果を検査する。
4. package-resumeは読取り専用ではなく、その隔離saveに進行を書き込む。また途中のPackageCheckpointでresume-expected.jsonを更新する。最初のcheckpoint成果と終了前saveのhashを先に証拠として保全し、通常saveに指定しない。レポート2件のprocess_id相違は外側で照合する（UiProbe/verify.pyはこのpackage対のPID比較を自動化していない）。
5. 現slotはrevision60の探索中・物語pause=falseで、既存package-resumeの想定に合うが、実際の再開成功は未確認。自然一巡全体合格の代用にはしない。通常終了後の再開と、240秒timeoutで終了した保存の再開も区別する。

親の指示により追加実行なし。現slot/log/hashを保全して本検査作業を終了する。描画付きnaturalは別担当の別証拠であり、このheadless未完了記録を上書きしない。
