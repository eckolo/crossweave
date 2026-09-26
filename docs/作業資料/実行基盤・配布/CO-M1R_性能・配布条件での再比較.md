# CO-M1R 性能・配布条件での再比較

版0.2／2026-09-26（日本時間）。担当：実行基盤・配布設計 `20260926-runtime-delivery`。

**現行推奨をGodot 4系＋型付きGDScriptのWindowsネイティブアプリへ変更する。正式採用・性能達成・実装開始は未決。** 0.1のElectron推奨は既存JS／HTML／CSSの再利用性を重視した条件付きの結論だった。ユーザーが試作コードの全面作り直しを許容したため、この条件を除いて再評価した。単なる言語速度の順位ではない。

## 1. 今回のユーザー合意と判断区分

| 条件 | 扱い |
|---|---|
| Steam配布を視野に入れる | 将来の配布先として評価。今回Steamへの登録・アップロード・公開は行わない |
| Windows 11 x64、4コア級CPU、8GB RAM、SSD、内蔵GPU | 同意済みの開発目標。最低動作保証ではない。CPU/GPUの具体モデルとドライバーは後続の測定前に固定する |
| FHD、ドラッグ・演出60fps、入力の視覚応答100ms以内、アプリ常用メモリー500MB程度以内 | 同意済みの目標。ピーク・GPUメモリー・長時間の増加・Steam等との同時実行も別に測る。平均fpsだけで合格にしない |
| 起動5秒以内 | 一律の合否条件から外す。起動画面・処理段階表示等で体験を補えるなら緩和可能。無制限の待機を容認したものではない |
| 配布容易性 | 配布者の生成・更新と、利用者の入手・初回起動・更新・再開を両方評価する |
| 既存コード | 再利用量を選定の加点・足切り条件にしない。必要なら全面新規実装でよい。今回は削除しない |
| 既存仕様・UI合意・仮データ・固定試験 | コード再利用と区別。ゲームの意味・操作意図・比較根拠として保全。試作コードを捨てられることをルール変更や固定結果の改変許可へ広げない |

## 2. 評価方法

優先するのは、①合意した動作目標、②配布・更新・保存の確実さ、③カード・文章・編成・詳細窓・2D演出の実装／保守、④Steamへの継続性、⑤実際の作成・確認経路。実装負担は全候補を新規開発とみなした後の差で比べる。独自UI基盤や橋渡しを新たに保守する負担は残るが、旧コードを書き直す行数は減点しない。

公式機能と構成からの設計評価であり、同条件のベンチマークではない。各エンジンの一般的な動作要件・空プロジェクトの容量をcrossweaveの必要スペックとして転用しない。採用バージョンとSteam接続拡張の組合せは後続で固定する。

## 3. 候補の比較

| 候補・言語 | 動作負荷とUI／演出 | 利用者への配布 | 作る側・Steam・継続性 | 判定 |
|---|---|---|---|---|
| **Godot 4系／型付きGDScript（C#も選択可）** | ブラウザーを同梱しないゲーム基盤。Control／Container／テーマ／文字／入力と2D描画をまとめて扱える。Compatibility描画を最初の候補にする。500MB・60fpsは未実測 | Windows Release出力のexe＋PCK＋必要な拡張DLL等を一つのZIP、将来は同内容をSteamでインストール。プレイヤーにGodotや開発SDKを入れさせない構成 | エディター・export templates・CLIで制作／出力。GodotSteam等の外部接続拡張は導入候補で、保守元・対応版・overlayは確認が必要。M1から最終アプリまで同じ構造を継続可能 | **総合推奨**。UIの多い2Dカードゲームと配布・保守の釣合いを重視 [G1–G7] |
| **Defold／Lua** | C++のエンジンをLuaで制御。軽量性を重視する対抗候補。GUI・文字・描画はあるが、複雑な編成画面や操作部品の組立方針を具体化する必要がある。Godotより軽いという実測はない | Windows用のゲーム一式をbundleして配布。利用者にエディターやLua環境を用意させない構成 | エディター／Bobと、Steam拡張を含むネイティブ拡張のビルド経路・依存取得を固定する。Defold公式にSteam拡張の案内がある | **第2候補**。容量・常用負荷が最優先になり、GUI制作の負担を許容できる場合 [D1–D4] |
| **MonoGame／C#** | 描画・入力等をコードで制御するフレームワーク。必要な仕組みに絞れるが、UI部品・レイアウト・文字・アニメーション等の選定／組立範囲が大きい。小さいことを自動保証しない | self-contained .NET出力をZIP化可能。WindowsDXでは音・ゲームパッドにDirectXの追加依存があるため、DesktopGL等も含めて配布前提を確認する | .NET SDK・コンテンツ処理とUIライブラリー等を管理。Steam接続ライブラリーと画面制作基盤を自分たちで選ぶ | C#中心で細かく制御したい場合。今回の画面数では制作基盤を組む負担がGodotより大きいとの評価 [M1] |
| **Unity／C#** | 2D・UI・演出を備える汎用エンジン。新規開発の候補にはなるが、今回の小規模2DでGodotより動作目標を満たしやすいとする根拠は未取得 | exe・UnityPlayer.dll・Data等の出力一式を配布。ZIP／ストアで扱える | エディターとWindows出力環境、外部Steam連携、採用時の商用利用条件を管理。C#やUnity固有の制作資産・習熟が優先条件なら再評価 | 有効候補だが、現在の要件から第一候補にする決め手はない [U1] |
| **GameMaker／GML** | 2D制作と画面編集が可能。独自カードUIは作る必要がある。今回Godotを上回る性能・制作上の優位は未確認 | Windows向けゲーム出力。Steam向け手順・拡張が案内されている | 専用言語／制作環境・採用時の商用利用条件を含める。HTML5向けJS拡張をWindows本体再利用と混同しない | 2D制作ツールへの適性を重視するなら候補。現条件では保留 [GM1–GM2] |
| **Tauri／Rust＋JS・HTML/CSS** | OS WebViewを使う。ブラウザー実行をなくす方式ではない。インストーラー容量の削減と実行メモリー削減は別に評価 | WindowsではWebView2が前提。未導入時のダウンロード／オフライン導入／固定版同梱を選ぶ。最小配布量と完全同梱の容易さに取引がある | RustとWeb UIを管理。Steam overlay・入力等の接続は別検証。一般アプリ型の画面をWebで作る意思が強い場合に有効 | 今回はWeb資産再利用の加点がなくなるため優先度低下 [T1] |
| **Electron／JS・HTML/CSS** | Chromium＋Nodeの固定負担。既存コード抜きでもWeb UI制作は可能だが、配布容量・メモリー面の弱点は残る | 実行環境同梱の一式をZIP／インストーラー化でき、利用者の環境準備は小さい | Forge等のパッケージ機構とSteam用接続を管理。実行基盤の更新保守が必要 | **0.1の第一推奨から外す**。動作不能と判定したわけではなく、再利用を除いた選定根拠が弱くなったため [E1–E2] |
| NW.js／JS | Chromium＋Nodeの系統で、Electronの固定負担を避ける代替とは位置付けられない | ランタイムを同梱して配布 | Web系を選ぶなら候補になるが、この再比較の主要な懸念を解消する根拠なし | 追加候補として確認し、優先度は低い [N1] |
| URL配信／Web技術 | 初回アクセスは容易だが、ブラウザー・プロファイル・端末状態による差がある | URLで遊べる。オフライン・保存バックアップ・更新を設計する。Steamネイティブアプリ化は別の作業 | 体験版等の経路として残せるが、Steam向けデスクトップ製品の主経路をこれだけで完成とはしない | 本件の主推奨にはしない。ブラウザー／IndexedDBは未採用 |

Godot／Defoldもゲーム処理にはスクリプトを使う。Godotへ変えればGDScriptの演算がJavaScriptより速くなるという主張ではない。主要な利点は、ブラウザー一式を前提とせず、ゲーム用描画とUIを持つ実行基盤を選べること。大量計算が実測で支配的になった時だけ、アルゴリズムやC#／C++等を検討する。[G3・D1]

## 4. 起動体験と配布容易性の具体基準

起動は「プロセス開始→最初の画面」と「操作可能になるまで」を別に測る。小さな起動画面を先に出し、現在の読込み段階・失敗時の案内を表示する。実測可能な進捗がない場合は偽の百分率を出さない。初期画面の描画を止める同期ロードは避け、必要な資源を段階的に読む案とする。Godotにはバックグラウンド読込みと状態取得の機能があるが、エンジン開始前の無表示時間まで隠せるとは扱わない。[G6]

| 配布の観点 | 合格を判断するための確認 |
|---|---|
| プレイヤーの手数 | 限定M1はダウンロード→ZIPを全展開→exe。将来Steamはインストール→プレイ。エディター、SDK、Git、コマンド操作を要求しない |
| 初回・オフライン | 通常ユーザーのクリーンな対象Windowsで不足DLL・フォント・ランタイムを確認。配布後の通常プレイはオフラインで成立。追加インストールがあるなら経路・通信量を明記 |
| 容量 | ダウンロード圧縮量、展開後、更新差分、一時空き領域を別記。エンジン・画像・日本語フォント・音声を分け、空プロジェクトだけで比較しない |
| 配布者の再現性 | engine／export templates／拡張の版、生成手順、Release preset、SHA・内容一覧・ライセンスを固定。毎回の手作業調整に依存させない |
| 更新・再開 | 配布フォルダー外の保存領域を固定。新版へ置換しても続きを読める。更新失敗時に旧保存を壊さない |
| Steam | 配布build・起動設定を用意する。実績等のAPI接続は任意機能として分離。Cloud、overlay、Steam終了判定、オフライン起動を必要機能に応じて確認 |
| 署名・警告 | 実配布物の初回起動で確認。Godot等のエンジン選択だけで警告がなくなるとはしない。最初から警告無効化を利用手順に含めない |

Steam Auto-Cloudは指定ファイルを起動・終了時に同期できる。通常のローカル保存が先に成立する設計にし、Cloudを保存そのものの代用にしない。OSユーザーだけでなくSteamアカウントを切り替えるケース、複数端末の競合、オフライン、非Steam版からの移行を別途扱う。Steam Deck・ゲームパッド対応はWindows向けSteam配布と別で、今回保証しない。[S1–S3]

## 5. 作成・確認可能な環境と残る判断

今回の実行環境はLinux。PATH確認ではGodot／godot4、DefoldのBob、dotnet、Unity、Electron、cargo、Wine、Xvfbは見つからず、Javaは存在する。これは当該実行環境での確認であり、あらゆる導入方法が利用不能という意味ではない。今回エンジンを導入・生成・起動しておらず、候補間の性能試験は0。

後続でGodotの固定版とexport templatesを用意すれば、Linux側の文書・スクリプト整備、headless検査、対象別出力を行う経路が候補になる。実WindowsのGPU・マウス・DPI・Steamとの動作は別の対象環境が必要。CIが通っただけでプレイ確認済みとはしない。Defoldはエディター／Bobと拡張ビルド、MonoGameは.NET SDK、Unityは対応エディター／出力環境等をそれぞれ整える必要があり、現在どれも実行経路を検証していない。

後続の最初の確認は、Godotで代表画面・日本語表示・ドラッグ・起動画面・最低限の保存終了再開を含む小さい縦断サンプルを作り、Release版の性能・配布を測る案。全候補を同時に実装する計画ではない。目標未達なら原因を確認し、固定負担が支配的な場合にDefoldを同条件で比較する。Godot採用判断やこのサンプル作成の着手は、今回の方式検討とは分ける。

## 一次資料（2026-09-26確認）

- G1 [Godot UI](https://docs.godotengine.org/en/stable/tutorials/ui/index.html)：Controlとレイアウト・テーマ・文字・入力。
- G2 [Godot Windows export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html)：exe／PCK出力、署名。配布物の実サイズは未取得。
- G3 [Godot languages](https://docs.godotengine.org/en/stable/getting_started/step_by_step/scripting_languages.html)・[型付きGDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html)：GDScript／C#／C++の役割。
- G4 [Godot requirements](https://docs.godotengine.org/en/stable/about/system_requirements.html)：Compatibility等の一般要件。crossweaveの保証値にはしない。
- G5 [Godot user data](https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html)・[FileAccess](https://docs.godotengine.org/en/stable/classes/class_fileaccess.html)：保存先とファイルAPI。原子性は別設計・検証。
- G6 [Godot background loading](https://docs.godotengine.org/en/stable/tutorials/io/background_loading.html)：読込み要求・進捗・完了取得。取得のタイミングによってはブロックする。
- G7 [GodotSteam保守元の案内](https://github.com/GodotSteam/GodotSteam)：Steam接続のコミュニティプロジェクト。GitHub本文はCodebergへの移転を案内。移転先本文の取得は失敗し、対応する最新バイナリー・API・保守状況は未確認。採用時の確認事項として残す。
- D1 [Defold introduction](https://defold.com/manuals/introduction/)：LuaとC++エンジン、製品の軽量性方針。宣伝上の性能を実測としない。
- D2 [Defold Windows](https://defold.com/manuals/windows/)・D3 [GUI](https://defold.com/manuals/gui/)：対象別bundle・GUI制作。
- D4 [Defold Steam extension](https://defold.com/extension-steam/)：依存・Steam SDK接続・overlayイベントの例。
- M1 [MonoGame distribution](https://docs.monogame.net/articles/getting_started/packaging_games.html)：self-contained配布。WindowsDXの追加依存にも留意。
- U1 [Unity Windows build](https://docs.unity3d.com/6000.0/Documentation/Manual/WindowsStandaloneBinaries.html)：exe・エンジンDLL・Data等。
- GM1 [GameMaker export targets](https://gamemaker.io/en/blog/export-with-gamemaker)・GM2 [extensions](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Extensions.htm)：出力先と拡張。
- T1 [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)：WebView2の導入選択。
- E1 [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)・E2 [packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution)：複数プロセス・ランタイム同梱。
- N1 [NW.js introduction](https://docs.nwjs.io/For%20Users/Getting%20Started/)・[packaging](https://docs.nwjs.io/For%20Users/Package%20and%20Distribute/)：Chromium／Nodeと配布。
- S1 [Steamworks SDK](https://partner.steamgames.com/doc/sdk)・S2 [uploading](https://partner.steamgames.com/doc/sdk/uploading)・S3 [Steam Cloud](https://partner.steamgames.com/doc/features/cloud)：配布と任意機能、ファイル同期・アカウント別配置。
