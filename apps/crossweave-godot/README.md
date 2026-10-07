# crossweave 本編アプリ・Core・保存・Godot

通常起動は本編の `Main.tscn` です。D04B-CORE-01の純C#本編とRD-SAVE-02Aの実ファイル保存を、D04B-UI-01／RD-SAVE-02BでGodotの画面・入力・終了へ接続しています。準備→夜潮の排水路→3種の帰還→取得・編成→再出発と、終了後の再開が今回の範囲です。正式配布・Windows 11実機受入・人の試遊・M1完成は別判定です。

**現在のUI実装はD04B-UI-02。** [対応表・修正前後の実描画・検証入口](../../docs/検証/本編実装/d04b-ui-02/README.md)と[コード解説・読む順](../../docs/検証/本編実装/d04b-ui-02/コード解説.md)を最初に参照してください。取得編成・探索・詳細予測・共通操作・本文帰還をUI原本72d0eb58の後継説明へ合わせています。旧UI-01の画像を現行画面として扱わないでください。

以下のコード表記はすべて**リポジトリルートからの相対パス**。読み物はこのREADMEへ集約します。

## 開発担当の起動

以下は開発担当向けです。遊ぶ利用者へSDK・Godot・Pythonの導入やソースビルドを求める手順ではありません。利用者の起動入口は配布担当が受け渡す実行物です。D04B-UI-02では修正版配布を作らず、後続RD-PACK-03へ渡します。開発担当はPython 3.12以上で、リポジトリルートから実行します。

```sh
python apps/crossweave-godot/UiProbe/launch.py
```

固定SDK・Godot.NET・日本語フォントを取得し、hash照合→restore→build→import→通常画面を起動します。SDKをシステムへ導入せず、このリポジトリの `.tools` を使います。初回は通信とツール用の空き容量が必要です。正式配布のZIPやexport templatesは作成・取得しません。

- 初回は「新しく始める」、以後は「続きから」。操作ごとに確定保存されます。探索の「中断して終了」は撤退しません。
- 保存先は `user://saves/local/m1.json`。GodotがOSのユーザー領域へ解決します。ソースや実行物のフォルダには置きません。
- Godotエディターを開く：同じコマンドに `--editor`。`apps/crossweave-godot/Godot/project.godot` を開き、F6ではなくF5で通常入口を実行します。
- IDEでは `apps/crossweave-godot/Crossweave.sln` 一つを開きます。Godot／Core／Infrastructure／Testsを同じsolutionで追えます。
- 取得済み環境だけを使う場合は `--no-acquire`、GUIを開かずビルドまでなら `--prepare-only`。
- 過去の代表試作は `--proof`。`Proof.tscn`、ProofSession、ProofStoreは本編と別です。旧配布用の `start-proof.cmd`・確認票を本編配布の案内に読み替えません。

詳しい操作と実機確認の順序：`docs/検証/本編実装/d04b-ui-save-01/起動と操作.md`。

## 読む順序と資料一覧

| 順序 | 読み物（ルート相対パス） | 次に読むコード |
|---|---|---|
| 1 全体・確認範囲 | `docs/検証/本編実装/d04b-ui-save-01/README.md` | `apps/crossweave-godot/Crossweave.sln` |
| 2 純C#本編 | `docs/検証/本編実装/d04b-core-01/本編対応表.md` | `apps/crossweave-godot/Core/Application/GameApplication.cs` |
| 3 操作と公開情報 | `docs/検証/本編実装/d04b-core-01/画面・保存への受渡し.md` | `apps/crossweave-godot/Core/Application/Preparation.cs`、`Expedition.cs`、`Story.cs`（同フォルダ） |
| 4 ファイル保存 | `docs/検証/本編実装/rd-save-02a/コード解説.md`、`docs/検証/本編実装/rd-save-02a/接続契約.md` | `apps/crossweave-godot/Infrastructure/Application/FileGameSession.cs` |
| 5 Godot未経験者向け | `docs/検証/本編実装/d04b-ui-save-01/コード解説.md` | `apps/crossweave-godot/Godot/Main.tscn` → `apps/crossweave-godot/Godot/Application/AppEntry.cs` → `apps/crossweave-godot/Godot/Application/GameScreen.cs` |
| 6 了承UIとの対応 | `docs/検証/本編実装/d04b-ui-save-01/UI対応表.md` | `apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs`、`GameScreen.Exploration.cs`（同フォルダ） |
| 7 保存・寿命の接続 | `docs/検証/本編実装/d04b-ui-save-01/接続契約.md` | `apps/crossweave-godot/Godot/Application/GameScreen.cs` のOpen／Send／ExecuteLast／Reload／Close |
| 8 実ノード検査 | `docs/検証/本編実装/d04b-ui-save-01/確認結果.md` | `apps/crossweave-godot/Godot/Application/UiAutomation.cs`、`apps/crossweave-godot/UiProbe/verify.py` |
| 9 成果・残件 | `docs/検証/本編実装/d04b-ui-save-01/とりまとめ引継ぎ.md` | `docs/作業資料/Work/20260927-game-application.md` |
| 基盤の過去記録 | `docs/検証/実行基盤/m1-godot/README.md` | `apps/crossweave-godot/Godot/ProofView.cs`、`ProofAutomation.cs`（同フォルダ） |

## 自動確認の入口

```sh
# 実Godot描画・合成入力・実ファイル・別プロセス再開＋73件の.NET回帰
python apps/crossweave-godot/UiProbe/verify.py --rendered --full-hd

# 保存部とCoreだけ（画面は起動しない）
python apps/crossweave-godot/SaveProbe/verify.py
```

本編検査は `user://proofs/d04b-ui-save-01/<一意slot>/m1.json` のみ。通常保存とは別です。自然初回と合法fixtureを分け、通常起動へ検査残高を入れません。証拠は `apps/crossweave-godot/artifacts/d04b-ui-save-01-<OS>/`、Windows経路は `.github/workflows/d04b-ui-save-01.yml`。既存72件と公開表示境界の追加1件を使います。`--modes inheritance`で継承操作だけ、`--modes interaction,resume`で別プロセス再開を対で確認できます。結果を別の新規ディレクトリへ保存するには`--evidence <path>`を指定します。

Godotの実ノードと合成入力、実描画、Windows 11実機・物理入力・DPI・GPU性能・人の受入は別です。現行の実測状況はD04B-UI-02の「確認結果」を参照してください。UI適合確認・修正版配布・実機受入は後続の別工程です。

## 固定環境

| 項目 | 固定値 |
|---|---|
| Godotエディター／templates | 4.7.2.stable.mono.official.ed1daf0bf／4.7.2.stable.mono |
| .NET SDK | 10.0.401（`global.json`、rollForwardなし） |
| アプリ・Core・TestsのTFM／C# | net10.0／14.0 |
| runtime framework | 10.0.12。出力物のruntimeconfigとmanifestでも確認する |
| renderer | Compatibility / gl_compatibility |
| 純.NET試験 | Microsoft.NET.Test.Sdk 17.14.1、xUnit 2.9.3、VS adapter 3.1.5 |
| Godot試験 | 本編 `Godot/Application/UiAutomation.cs` と別入口の `ProofAutomation.cs`。第三者adapterは追加しない |
| 日本語 | 固定commitのNoto Sans JPをhash照合して同梱。OFLは同梱。既存フォントの利用で、素材制作はしていない |

[toolchain.lock.json](packaging/toolchain.lock.json)に取得URL・hash、各lockファイルにNuGetの推移依存を記録。通常ビルドとexportでは構成・RID・エディター依存が異なるため、全projectで`packages.<Configuration>.<portableまたはRID>.lock.json`に分けて固定する。Debug／ExportRelease、Windows／Linuxの生成が互いのlockを上書きしない。安定版URLを追うのではなく、この版の同じバイトを使う。

Godotエディターは`dotnet/project/solution_directory=".."`で親の一つのsolutionを探索する。Godot csprojにはTFMを直接書く。Directory.Build.propsだけの指定ではエディターがnet8.0を追加したため修正済み。検証ホストではMSBuildの並列ノード起動が失敗したため、入口は直列ビルドを使う。

## 責務と移植境界

| 領域 | 内容 | 本編への扱い |
|---|---|---|
| Core | エンジン型を参照しない、状態・命令・gesture | Application名前空間がメモリー本編。ProofSessionは3札だけの別の検査モデル |
| Infrastructure | 試作小状態／独立した本編ファイル保存 | 本編はFileGameSessionとApplicationFileStore。ProofStoreとは別のモデル・保存先 |
| Godot | 画面・入力・音・Core接続・専用保存先の解決 | 通常はApplication/GameScreen、代表試作はProof.tscnの別入口 |
| Tests／SaveProbe | 本編29＋既存基盤13＋本編保存30試験／別プロセス検査CLI | 本編の実DTO・実ファイル・中断・排他・再送を検査。旧JS全試験の移植完了とはしない |
| packaging | 依存取得、生成・検査、manifest、起動／確認票 | 版・入力・出力を追う生成経路として継承。Steam接続は未実装 |

CoreへNode・Resource・Godotパスを持ち込まない。確定状態は代表試作ではProofSession、本編ではGameApplicationが所有し、viewは選択・ドラッグ・表示演出のみを持つ。演出は確定後の見かけのコピーで、UI配置とアニメーションが同じ座標を別々に書かない。重複操作ID、古いrevision、消費済み札をCoreで扱う。

## 基盤の旧検査と実機受入の区別

- `.NET単体／ファイル連携`：IDE Test Explorer、または`dotnet test Crossweave.sln -m:1`。
- `Godotノード・入力経路`：`godot --headless --path Godot -- --proof-smoke --probe-slot=任意の英数字名`。実ノードへviewport座標の合成イベントを渡す。画面描画・OS入力・DPIの合格ではない。
- `プロセス再起動`：専用スロットに小状態41を書き、プロセスが終了してから別プロセスで読み、内容とプロセス識別子を照合する。一括入口または配布用`verify-restart.cmd`。
- `Windows実画面`：同梱確認票。FHD／OS倍率100・125・150%、文字、マウス、音、演出、性能は人の操作と実機条件を記録する。

Windowsホストでは一括入口がWindows Release自体を起動して疎通を確認する。LinuxホストでWindowsを生成した場合、Windows実行は`not-run`として扱い、LinuxのGodot runtimeでの保存疎通を別記する。基盤専用CIは`.github/workflows/rd-godot-proof.yml`、保存専用は`.github/workflows/rd-save-02a.yml`、本編画面は`.github/workflows/d04b-ui-save-01.yml`。CI成功も実マウス・GPU・DPI合格を意味しない。

## 保存と限界

代表試作の画面は`user://proofs/rd-proof-02/<slot>/probe.json`だけを使う。手動はmanual、CLI／CIは別slot。本編`m1.json`を読まない。カウンター・形式版・日本語文字列だけが保存され、試作盤面は毎起動メモリーで初期化される。

本編保存部02Aは、版付きファイル・バックアップ・明示復旧・単一所有者・成否不明時の操作停止を実装します。Godotの通常保存先、起動／終了／復旧表示は今回の02Bで接続。配布物更新の実機受入はD04です。停電・任意改ざん・ネットワーク共有への耐性は検証範囲外です。

目標はFHD60fps・視覚応答100ms・関連メモリー500MB程度。headlessのフレームやイベント処理時間をその合格値にしない。起動の初scene／描画callback／操作準備は別に記録し、表示の実感はWindows確認票で扱う。

基盤の出典と実行結果は[基盤検証記録](../../docs/検証/実行基盤/m1-godot/README.md)。本編実装D04Bは固定提出0ef16895（土台f2eb59bc）から受領。Coreの到達点・成果SHA・残件は[本編引継ぎ](../../docs/検証/本編実装/d04b-core-01/とりまとめ引継ぎ.md)に分けて記録する。

## 2026-10-06 固定UI再判定と暗色補足

通常表示は了承済み緑系暗色へ固定し、OSの明暗設定で切り替えない。新しいテーマUI/保存項目は追加しない。今回の修正・暗色原寸・確認・教材・残件は [今回版](../../docs/検証/本編実装/d04b-ui-02/recheck-fix-20261006/README.md)。独立UI適合・新版配布・実機・M1は後続。
# 2026-10-07 D04B-UI-02 改訂0.11の修正候補

固定暗色返却の具体独立修正候補・H11の部分訂正・教材を[今回記録](../../docs/検証/本編実装/d04b-ui-02/dark-return-20261007/README.md)へ保存。読む順は[コード解説](../../docs/検証/本編実装/d04b-ui-02/dark-return-20261007/コード解説.md)。9コードファイルのビルドは通過、必要描画／実入力は環境前提未成立、GitHub保存は要求キャンセルで未了。今回依頼全体・UI適合・配布・実機・人の試遊・M1は未完了。通常緑系暗色・OS非連動・通常保存接続を保持する。
