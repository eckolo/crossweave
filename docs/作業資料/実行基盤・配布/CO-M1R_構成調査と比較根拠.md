# CO-M1R 構成調査と比較根拠

2026-09-26／実行基盤・配布設計。静的調査の結果であり、新しい実行試験・保存合格の報告ではない。

## 調査版

| 用途 | 固定参照 |
|---|---|
| 最新計画 | `4d635905271576845ce0a8507d4af27a25bc7e9e`／全体計画・Work別実施計画0.17、CO-M1R0.2。全34ファイルを同パスへ実同期しblob照合 |
| 本体・共通仕様 | 開始時`4ad410b3d5406c3bd8e9ef2d1f6c67e72eb3de4a`／基本設計0.59。D03Rコード`442af718d30b30284cf5ac976eb7421992d94dfd`を包含 |
| 登録後の技術HEAD | `9f46e0e63593d6aa396ec0f159bdf4923eb4e108`。自Workの索引1行のみ。本体・仕様の差分0。自枝へ技術同期 |
| UI参考 | `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`／0.16.0。実装`9ca472ea81b17b309ca44781fd8ecfd9281d58f6`。今回UIの受領統合なし |
| シナリオ／ビジュアル | `c7a9a8d45856d504cb3db5c4183cbbb3463e982c`／`25e7ce99bffc551e2370568b74704865c3de13e0`を枝一覧で確認。M1調査は本体へ入っているSCN-001とUI同梱物を使用し、未公開素材の回収・制作を条件にしない |

自Work設定・参照path/blobは[調査版と環境JSON](CO-M1R_調査版と環境.json)。古い資料の「設計集約」は履歴上の呼称として読み、現担当はゲームバランス検討。同担当へ構成説明の追加作業を依頼していない。

## 公開コードで確かめた構造

| 層 | 実在する原本・動作契約 | アプリ化での扱い |
|---|---|---|
| ゲーム演算・状態 | `src/runtime/`27ファイル。`campaign.mjs`のcontrollerがprivate documentを所有。`inspect`・予測は同期的な公開view、`execute`は非同期。`game/core`等はES Modules | 演算と公開契約を再利用。controllerを別プロセスへ丸ごと移して同期APIを非同期へ変える大改修はM1に要らない |
| 内容 | `src/content/`4ファイル、SCN001-0.2・rules0.5。ゲーム演算／内容のimport参照で外部サービスや過去検証フォルダーへの実行依存は今回見つからなかった | 必要な31モジュールの依存閉包をパッケージへ含める。過去の巨大ZIP・全検証履歴は実行依存として配らない |
| 保存注入 | `createCampaign({storage})`、`storage.load(slot)`／`storage.commit(slot,expectedRevision,document)`。現在の既定はIndexedDBStore | アプリ入口でFileStoreのproxyを注入可能。既定のブラウザー用Storeを削除しない。新しいStoreの実装・原子性検査は追加作業 |
| commit境界 | `execute`は保存を読み、要求台帳とrevision/tokenを照合し、コピーへ演算。validate→await commit→private document更新。状態・要求台帳を同じ文書に保存 | 同期inspect/previewは維持し、非同期の保存部分だけmain processへ橋渡しする案。保存成功前のUI反映を禁じる既存契約を継承 |
| 再開・移行 | `open`は保存をvalidateし必要な移行をcommit。`importSave`は空slotのみ。`exportSave`はprivate documentのコピー。save2、engine0.7／public0.6／preparation2／economy2／acquisition1 | 新版を起動しても同じslotを読む。移行例と要求IDの二重処理防止を再利用。移行不要の単なる保存媒体差をゲーム版変更にしない |
| 現UI | UI枝`docs/検証/UI/readability/co-u02/`。`entry.mjs`→Campaign→`mountJourneyApplication`。`session.js`、journey launcher、取得部品へ接続済み | 通常入口の相対import先と配布内pathを合わせる。既存の三領域・表示・操作を継承し、包装用の入口を別途作る |
| UI生成 | `co-u02/build.cjs`が`dist/crossweave-ui.js`／`.css`を生成。関連journey・co-u01・interaction・acquisition-preview・art-assets・同梱Lucideを参照。ルートのpackage.jsonは存在しない | 独立したアプリ用packageとlockを追加する案。UIの既存生成手順を使い、distだけ手編集しない。画像・フォント・ライセンスの依存を最終出力で確認 |
| 保存UI | 続き／はじめから／読込み／書出しが存在。現通常入口はslot`m1-local`＋IndexedDB。会話内入口は明示的MemoryStore | 単一保存枠と手動退避の操作を再利用。終了待ち・破損復旧・アプリ版表示は追加設計。閉じた後の再開を会話内試作で証明しない |

設計4ad410b3とUI72d0eb58の`src/`差分は0。UI専用ディレクトリーには170ファイルの差分がある。これは直近取得接続だけの差分数ではなく、設計枝への未受領分を含む範囲である。したがってD04Bは9ca472eaだけの単純cherry-pickを前提にせず、必要な生成元・関連素材・記録を一覧化して受領する。UI枝にある旧計画や他Work設定の一括取込みは不要。

アプリ構造の提案は、renderer内に既存UI＋Campaign、preloadに限定したStore橋渡し、mainに保存先・書込みキュー・終了／単一起動・配布ホストを置くもの。任意のファイルパスや任意IPCをUIへ公開しない。既存UIの公開view境界を保ち、画面がprivate saveから隠し情報を補う実装は追加しない。

ローカル専用の標準・secureなカスタムprotocolで同梱ES Modulesと素材を解決する案。localhostサーバー起動を利用者へ求めない。`nodeIntegration:false`・context isolation・sandbox、限定IPC／pathを用い、画面と本体を外部URLへ取りに行かない。[S3・S4] これらは追加する包装の実装条件で、今回導入済みではない。

## 確認実績と利用環境の区別

| 区分 | 確認した事実 | そこからは言えないこと |
|---|---|---|
| D03R既存成果 | 公開READMEはNode v24.19.0／MemoryStoreの37項目・専用CI成功を記録 | 実ファイル保存・実IndexedDB・OS終了後の再開の成功 |
| UI既存成果 | 0.16.0の公開報告は実Campaign＋MemoryStore＋JSDOMの33項目を記録 | 実描画・物理マウス／タッチ・実保存・人の受入 |
| D04A既存記録 | `environment.json`はCloud Browserのlocalhost入口でERR_BLOCKED_BY_CLIENT。実IndexedDB／再読込／2タブ0件 | 保存不具合・全PCでの失敗・拒否理由の特定。今回同じアクセスは再試行していない |
| 本Workのローカル | Ubuntu 24.04.3 LTS x86_64、Node24.19.0、Python3.12.14。git読取り・文書作成が可能。PATHにElectron／cargo／Godot／Wine／Chromium／Xvfbなし | システムの全ファイルを探索して不存在と確定したわけではない。Electron実行・Windows ZIPビルド・GUI確認が成功したという意味ではない |
| リポジトリCI | `.github/workflows/co-d03-runtime.yml`はubuntu-latest上のNode検査。今回の索引・資料更新はそのpaths対象外 | Windows runnerの利用・権限・課金条件・Electron GUIの実行成功。今回workflow作成・起動0 |
| 後続Windows候補 | 担当のWindows PC上で固定依存を取得してビルド・起動する手順、またはGitHub-hosted Windows runnerを使う案は技術上成立する[S5・S6] | このWorkでそのPCを操作できること、Windows CIが現在設定済みであること。表示・マウス・DPIの実機確認は別に必要 |

Nodeで保存アダプターの入出力を検査できても、Electron IPC、Windowsファイル置換、アプリ終了、OS倍率の確認を代替しない。実行環境の準備は後続の明示した作業単位に含め、ゲームバランス担当からの回答待ちにしない。

## 比較判断の根拠

- **Electron**：HTML/JSとChromium/Nodeを同梱できる[S1]。既存APIを保存注入境界で保てるというコード調査と合わせ、再利用が大きいと判断した。性能・起動速度・消費電力・ZIP実寸は未測定。
- **Tauri**：既存Webフロントと組み合わせる候補だが、WindowsはWebView2、開発はRustとWindowsビルドツール等を要する[S9]。Windowsへのcross compileには条件・制約がある[S10]。今回の資産・環境では、容量の利点だけでElectronより先に置く根拠は不足。
- **ブラウザー**：既存Storeの差替えを減らせる。保存のorigin・ブラウザープロファイル依存と削除条件[S8]、後のアプリへの受渡しを比較に含めた。永続ストレージ許可を得れば全削除・端末変更にも耐える、とは扱わない。
- **Godot**：標準の主要言語はGDScript/C#等であり[S12]、現在のJSとDOM/CSSをそのまま標準ゲームコード・画面にする経路は今回の構成にはない。データ・素材は移せても、演算・UIは移植または追加のJS組込みが必要と推論した。Windows exportやuser://保存の機能があること[S13・S14]だけで、crossweaveの移植が済むわけではない。

方式選定は絶対的な優劣ではなく、本M1の範囲と既存資産からの推奨。大型3D・コンソール対応・厳しい容量制限などの条件が採用された場合は再評価する。現時点の要件へそれらを追加しない。

## 一次資料

確認日：2026-09-26。以下の技術事実と、本Workによる比較判断・未検証の設計案を区別する。実装時は採用する依存の正確な版をlockし、その版の仕様と照合する。

| ID | 一次資料 | 使用した事実 |
|---|---|---|
| S1 | [Electron Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution) | 実行環境とapp/resourcesをまとめて配布できる。Forge推奨。ソースだけではユーザー用実行物にならない |
| S2 | [Electron app](https://www.electronjs.org/docs/latest/api/app) | userData/appData、専用サブディレクトリー、単一起動lockとライフサイクル |
| S3 | [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) | context isolation、sandbox、IPC制限、カスタムprotocol等の実装条件 |
| S4 | [Electron protocol](https://www.electronjs.org/docs/latest/api/protocol) | 標準・secure scheme、相対資源、protocol handlerの限定 |
| S5 | [Forge build lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle)／[ZIP maker](https://www.electronforge.io/config/makers/zip) | packageとmakeの区別、ZIP作成。ZIP makerが動くことと対象OSの起動確認を分ける |
| S6 | [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) | Windowsを含む実行環境の選択肢。個別リポジトリの利用可否・料金条件は今回未確認 |
| S7 | [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing) | 配布時の署名・OSの信頼／警告。本人向け未署名候補でも起動を保証しない |
| S8 | [MDN Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | originごとの保存、best-effort/persistent、プライベートモード・削除条件 |
| S9 | [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) | Rust・Windowsのビルドツール・WebView2等 |
| S10 | [Tauri Windows Installer](https://v2.tauri.app/distribute/windows-installer/) | MSI/NSIS、WebView2の配布選択、Windows以外からの作成の注意点 |
| S11 | [Node fs](https://nodejs.org/api/fs.html) | 非同期ファイル操作、write・sync・rename等の部品。OS障害に対する本提案の安全性そのものを証明する資料ではない |
| S12 | [Godot scripting languages](https://docs.godotengine.org/en/stable/getting_started/step_by_step/scripting_languages.html) | 主要な標準言語。外部JS統合の実績は今回未検証 |
| S13 | [Godot Windows export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html) | Windows向け実行物・データのexport |
| S14 | [Godot Saving games](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html) | FileAccessとuser://への保存例。現在のセーブ文書との互換は別実装 |

費用はホスティング、ビルド環境、必要時の署名、配布容量・実行基盤保守が差分になる。今回いずれの購入・契約・サービス公開もしていない。未調査の料金を0円や確定額と表示しない。
