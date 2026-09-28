# crossweave Godot基盤・代表試作・本編Core

RD-ENV-02／RD-PROOF-02。CO-M1Rで選んだGodot.NET＋C#の実動用土台。ゲーム本編の完成版ではありません。

D04B-CORE-01では `Core/Application/` に独立した純C#・メモリー本編を追加。`GameApplication.Create()`からSCN-001の準備・探索・3帰還・取得編成・再出発を継続できます。Godot画面は代表試作のままです。[本編検証・CLI入口](../../docs/検証/本編実装/d04b-core-01/README.md)と[画面／DTO契約](../../docs/検証/本編実装/d04b-core-01/画面・保存への受渡し.md)を参照。本編29＋基盤13の検査を同じTestsで実行します。

RD-SAVE-02Aでは `Infrastructure/Application/FileGameSession.cs` に本編の実ファイル保存と再開を追加。絶対OSパスを渡し、所持・編成・探索・乱数・要求履歴をDTOごと確定します。`python SaveProbe/verify.py` が固定SDKで実ファイル・別プロセス・障害30検査と既存42検査を実行します。Godotの通常入口への接続は02Bです。[接続契約](../../docs/検証/本編実装/rd-save-02a/接続契約.md)と[コード解説](../../docs/検証/本編実装/rd-save-02a/コード解説.md)を参照してください。

## 入口

- **IDE：`Crossweave.sln`一つを開く。** Core／Infrastructure／Godot／Testsを同じsolutionで追う。VS Code等でもCLIを共用でき、特定IDEの購入は不要。
- **初回取得：`python packaging/bootstrap.py`**（Python 3.12以上）。固定SDK・Godot・templatesを`.tools/`へ取得しhash照合。SDKのシステム導入はしない。Godot templatesだけはエディター標準のユーザー領域へ登録する。
- **一括確認とWindows Release：`python packaging/verify.py --target windows`**。CLIはsolutionのビルド・xUnit・Godotノード／合成入力・export・専用状態の終了再起動を順に行い、`artifacts/`にログ・manifest・ZIPを出す。
- **Windows利用者：ZIP全展開→`start-proof.cmd`。** 操作と結果返却は同梱[START-HERE](packaging/START-HERE.md)・[Windows確認票](packaging/Windows確認票.md)を使う。

初回取得には通信とSDK／templates用の数GBの空き領域が必要。通常の実行物はオフライン。Godotエディターからは`Godot/project.godot`を開く。CLIで作ったSDKを使う場合は、`artifacts/toolchain-local.json`のdotnet所在をPATHへ、親フォルダーをDOTNET_ROOTへ設定してからエディターを起動する。

## 固定環境

| 項目 | 固定値 |
|---|---|
| Godotエディター／templates | 4.7.2.stable.mono.official.ed1daf0bf／4.7.2.stable.mono |
| .NET SDK | 10.0.401（`global.json`、rollForwardなし） |
| アプリ・Core・TestsのTFM／C# | net10.0／14.0 |
| runtime framework | 10.0.12。出力物のruntimeconfigとmanifestでも確認する |
| renderer | Compatibility / gl_compatibility |
| 純.NET試験 | Microsoft.NET.Test.Sdk 17.14.1、xUnit 2.9.3、VS adapter 3.1.5 |
| Godot試験 | 本試作内の`ProofAutomation.cs`。第三者Godot用adapterは追加しない |
| 日本語 | 固定commitのNoto Sans JPをhash照合して同梱。OFLは同梱。既存フォントの利用で、素材制作はしていない |

[toolchain.lock.json](packaging/toolchain.lock.json)に取得URL・hash、各lockファイルにNuGetの推移依存を記録。通常ビルドとexportでは構成・RID・エディター依存が異なるため、全projectで`packages.<Configuration>.<portableまたはRID>.lock.json`に分けて固定する。Debug／ExportRelease、Windows／Linuxの生成が互いのlockを上書きしない。安定版URLを追うのではなく、この版の同じバイトを使う。

Godotエディターは`dotnet/project/solution_directory=".."`で親の一つのsolutionを探索する。Godot csprojにはTFMを直接書く。Directory.Build.propsだけの指定ではエディターがnet8.0を追加したため修正済み。検証ホストではMSBuildの並列ノード起動が失敗したため、入口は直列ビルドを使う。

## 責務と移植境界

| 領域 | 内容 | 本編への扱い |
|---|---|---|
| Core | エンジン型を参照しない、状態・命令・gesture | Application名前空間がメモリー本編。ProofSessionは3札だけの別の検査モデル |
| Infrastructure | 試作小状態／独立した本編ファイル保存 | 本編はFileGameSessionとApplicationFileStore。ProofStoreとは別のモデル・保存先 |
| Godot | 画面・入力・音・Core接続・専用保存先の解決 | 同一project／描画と状態の境界を利用。試作画面とAutomationは本編時に置換・分離 |
| Tests／SaveProbe | 本編29＋既存基盤13＋本編保存30試験／別プロセス検査CLI | 本編の実DTO・実ファイル・中断・排他・再送を検査。旧JS全試験の移植完了とはしない |
| packaging | 依存取得、生成・検査、manifest、起動／確認票 | 版・入力・出力を追う生成経路として継承。Steam接続は未実装 |

CoreへNode・Resource・Godotパスを持ち込まない。確定状態は代表試作ではProofSession、本編ではGameApplicationが所有し、viewは選択・ドラッグ・表示演出のみを持つ。演出は確定後の見かけのコピーで、UI配置とアニメーションが同じ座標を別々に書かない。重複操作ID、古いrevision、消費済み札をCoreで扱う。

## 実行と試験の区別

- `.NET単体／ファイル連携`：IDE Test Explorer、または`dotnet test Crossweave.sln -m:1`。
- `Godotノード・入力経路`：`godot --headless --path Godot -- --proof-smoke --probe-slot=任意の英数字名`。実ノードへviewport座標の合成イベントを渡す。画面描画・OS入力・DPIの合格ではない。
- `プロセス再起動`：専用スロットに小状態41を書き、プロセスが終了してから別プロセスで読み、内容とプロセス識別子を照合する。一括入口または配布用`verify-restart.cmd`。
- `Windows実画面`：同梱確認票。FHD／OS倍率100・125・150%、文字、マウス、音、演出、性能は人の操作と実機条件を記録する。

Windowsホストでは一括入口がWindows Release自体を起動して疎通を確認する。LinuxホストでWindowsを生成した場合、Windows実行は`not-run`として扱い、LinuxのGodot runtimeでの保存疎通を別記する。基盤専用CIは`.github/workflows/rd-godot-proof.yml`、本編保存専用CIは`.github/workflows/rd-save-02a.yml`。CI成功も実マウス・GPU・DPI合格を意味しない。

## 保存と限界

代表試作の画面は`user://proofs/rd-proof-02/<slot>/probe.json`だけを使う。手動はmanual、CLI／CIは別slot。本編`m1.json`を読まない。カウンター・形式版・日本語文字列だけが保存され、試作盤面は毎起動メモリーで初期化される。

本編保存部02Aは、版付きファイル・バックアップ・明示復旧・単一所有者・成否不明時の操作停止を実装します。Godotの通常保存先への接続、起動／終了／復旧表示は02B、配布物更新の実機受入はD04です。停電・任意改ざん・ネットワーク共有への耐性は検証範囲外です。

目標はFHD60fps・視覚応答100ms・関連メモリー500MB程度。headlessのフレームやイベント処理時間をその合格値にしない。起動の初scene／描画callback／操作準備は別に記録し、表示の実感はWindows確認票で扱う。

基盤の出典と実行結果は[基盤検証記録](../../docs/検証/実行基盤/m1-godot/README.md)。本編実装D04Bは固定提出0ef16895（土台f2eb59bc）から受領。Coreの到達点・成果SHA・残件は[本編引継ぎ](../../docs/検証/本編実装/d04b-core-01/とりまとめ引継ぎ.md)に分けて記録する。
