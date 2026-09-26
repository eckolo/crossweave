# CO-M1R — Godot／MonoGameの接続構造とテスト管理

版0.6／2026-09-27（日本時間）。実行基盤・配布設計 `20260926-runtime-delivery`。方式検討資料であり、実装・方式採用・テスト実行の記録ではない。

## 1. 追加条件と推奨

ユーザーは、急ぎではなく作業量1.5倍程度なら許容範囲とし、C#とエンジンの接続がもたらす管理負担、特にテストコードとIDEを分けることによる把握の難しさを懸念している。

**現行の推奨をMonoGame＋C#へ変更する。Windows 11 x64、DesktopGL、.NET10／C#14を最初の適合確認候補とする。** Godot .NET＋C#は主要対抗として残す。これは工数・性能の新しい測定結果による順位変更ではなく、追加作業を許容し、コード・テスト・独自UIの制御構造を把握しやすくする重みが上がったことによる設計判断。正式採用は未決。

0.5のGodot=100、MonoGame＋補助120〜150、自作多め140〜190は未実測の計画モデル。1.5倍は保証・上限・完成日の見積りではない。ユーザーの許容を、全面自作しても1.5倍以内という約束へ変えない。AI支援で生成できる量と、人が理解・確認・保守できる量は別に扱う。

## 2. 「外から繋ぐ」の正確な範囲

Godot .NETでは、C++のエンジンが.NETランタイムを同じゲームプロセス内で動かし、C#のクラスがGodotのAPIを介してNode等を扱う。C#が別の外部アプリとして通信する形ではない。通常、この橋の実装を自分で書く必要はなく、既存のC# APIを利用する。[G1、G2]

MonoGameでは、C#のアプリケーションがGame等のフレームワークを使う。Update／Drawなどの枠組みはあり、DesktopGLはウィンドウにSDL、描画にOpenGL、音にOpenAL-Softを使う。C#だけでOS・GPUまで完結する構造ではない。[M1、M2]

| 境界 | Godot .NET＋C# | MonoGame＋C# |
|---|---|---|
| ネイティブとの接続 | C# APIとC++エンジンの接続がある | .NET／MonoGameとOS・描画・音の接続がある |
| ゲーム側の構造 | Node／SceneTree／Resourceの構造・寿命・通知を使う | Gameループを使い、画面やUIの構造はアプリまたは追加ライブラリーで決める |
| 情報の置き場所 | C#に加え、利用するシーン・資源・プロジェクト設定を追う | C#中心にまとめやすいが、Content・shader・設定は残る |
| 連携言語 | C#のみでゲーム側を作れる。GDScript併用は必須でない | C#中心。GPU効果や素材加工までC#一言語とは限らない |

差の中心は接続の有無より、**ゲームの振舞いを説明するために理解する仕組みをどこまでアプリ側で選べるか**。GodotでもコードからNodeを組み立て、シーンファイルの使用を減らすことはできる。ただしエンジンのオブジェクトモデルは残り、エディターによる制作支援を借りる利益も減る。

## 3. 接続がもたらす利益と負担

| 観点 | Godotで得るもの | Godotで注意する点／MonoGame側の対応 |
|---|---|---|
| 基礎機能 | 文字・UI・入力・アニメーション等を共通の仕組みで使える | MonoGameでは必要範囲を自作または補助で接続・検証。日本語、フォーカス、窓重なり等も保守対象 |
| 動作の追跡 | ノードの構造と実行状態を視覚的に調べられる | 値がコード、シーン、資源、レイアウト、アニメーションのどこで決まるかを追う場合がある。MonoGameは配置・入力・演出をC#の呼出関係へ集めやすい |
| 型とデータ | C#の型付きAPI・イベントを使える | NodePath等の参照やVariant対応型にはエンジンの規則がある。通常のCore内ListやDTOまでGodot型にする必要はない [G3、G4] |
| 寿命と通知 | Nodeの入退場等に合わせた管理を使える | .NETの参照があってもGodot側で解放され得る。custom signalや変数を捕捉したlambdaには自動切断の例外がある。MonoGameでもイベント解除・GPU資源Disposeは自分の責務 [G4] |
| 処理負荷 | ネイティブの実装をC#から利用できる | 頻繁なプロパティ参照・配列変換等はinteropの費用を伴う。境界を減らせるが、本作で問題になるか未測定。MonoGameでも描画・割当・通信回数の設計次第 [G1、G3] |
| 版更新 | 多くの機能を一つのエンジンと統合して受け取れる | エンジン、.NET、拡張・test adapterの対応を揃える。MonoGameでもSDK、backend、Content builder、補助の版管理が必要 |
| AI支援 | C#とシーン・設定を与えれば両方を修正対象にできる | コード断片だけでは参照や設定を見落とし得る。MonoGameは入力をコード中心にまとめやすいという予測。ただし大量の自作基礎や補助を増やすと理解・試験負担が戻る |

「Godotはブラックボックスなのでテストできない」「MonoGameなら接続バグがなくなる」とは判断しない。MonoGameを選ぶ利益は、自分で書いたコードなら自動的に簡単という意味でもない。

## 4. テストとIDEはどこまで統一できるか

GodotでもCoreを通常のC#クラスライブラリーにすれば、ルール・状態遷移・保存形式は通常の.NETテストで実行できる。Nodeやシーンを動かす試験はGodotの実行環境を必要とする。実行に必要なものの差と、テストを別リポジトリー・別IDEで管理しなければならないことを混同しない。

Godot向けの外部テスト基盤gdUnit4NetはVSTest／Visual Studio／Riderへの統合とdotnet testを案内し、v5系では通常のテストとRequireGodotRuntimeを指定する試験を区別する。入力やシーンの検査も支援する。Godot本体の内蔵機能ではなく別の依存であり、採用するGodot・.NET・adapterの組合せは後続で固定・確認する。[T1]

RiderはGodotのC# solution、ビルド、実行・ブレークポイント・ステップ実行、シーンの起動、テスト連携を支援し、tscnのノード構造表示も備える。したがって「C#用IDEと別のコード用IDEに必ず分断される」は強すぎる。ただし見た目の調整やGodot側状態の確認にエディターを使うことはあり、全ての情報がC#の呼出関係になるわけではない。GDScript固有のIDE機能をC#でも全て同じと扱わない。[I1]

| 試験 | 共通にできること | 残る環境依存 |
|---|---|---|
| Coreの単体試験 | ルール、支払い、確定／取消、同run再開、演出の状態遷移を純C#で試験 | 乱数・時刻・入力を明示。NodeやGraphicsDeviceを混ぜない設計が前提 |
| ファイル連携試験 | 一時領域で保存・破損・移行・失敗を確認 | OSのファイル動作・ロックは対象OSで追加確認。mockだけで耐障害性の合格にしない |
| UI／ホスト統合試験 | 入力→命令→表示の対応、二重クリック、窓を閉じた後の入力等 | Godotはエンジン／scene runner、MonoGameは実際のゲームhost・graphics環境。UI全体を普通の単体試験だけで済ませない |
| 配布・目視確認 | 同じRelease ZIPで入手→起動→保存終了再開 | 文字の読みやすさ、DPI、GPU、音、実際の操作感は両案とも実機確認 |

例えば「購入確定で二重払いしない」の大部分は、どちらもエンジンを起動せずCoreで試験できる。しかし「閉じた詳細窓の下にクリックが漏れない」は、Godotの入力配送またはMonoGameで自分が選んだ入力配送と実際に接続した確認が必要。MonoGameだけ後者の責務が消えるわけではない。

## 5. MonoGameで提案する管理構成

一つのGitリポジトリー・一つのsolution・普段使うC# IDEを入口とする。最初から汎用UIエンジンを作ることは成果に含めず、本作に必要な操作と描画の範囲を先に決める。

| プロジェクト案 | 所有するもの | 依存境界 |
|---|---|---|
| Crossweave.Core | 採用ルール、状態、命令、画面上の状態・操作判断 | Godot／MonoGameの型を参照しない。純C#の座標やDTO等、必要な最小表現 |
| Crossweave.Infrastructure | ファイル保存・更新・ログ・後日のSteam接続 | Coreを参照。描画には依存しない |
| Crossweave.Desktop | MonoGame起動、入力の収集、描画、音、資源、組立て | Core／Infrastructureへ接続。ゲーム状態の原本をUIに重複保持しない |
| Crossweave.Tests | Core単体とファイル連携の試験 | 通常の.NET試験。速度と必要環境で分類 |
| Crossweave.Desktop.Tests（必要時） | host・入力配送・描画の接続確認 | 実行環境が必要な試験と明記。Core試験から自動でGUIを起動させない |

この個数を固定するための設計ではない。小さい段階では過剰な層を作らず、まずゲーム状態を描画から分ける。保存処理に必要なinterfaceだけ設け、全クラスを抽象化しない。

画面操作→Coreの命令→状態確定／保存→表示用情報→描画という責務を揃える。テスト実行入口と結果の保管先を統一しつつ、Core、OS連携、画面確認の結果を区別する。CI作成は今回は行わない。

文字・UI補助は目的を明示して選び、数・版・ライセンス・C#からの制御・テスト可能性を確認する。Gum等を使う場合にも全機能・専用エディターを自動採用しない。補助の構造に従う範囲が増えれば、避けたかった追跡負担が戻る。完全自作を原則にして日本語処理まで抱えることも避け、代表場面で選ぶ。

## 6. 後続の確認と未確認

方式採用後のRD-ENV-02／RD-PROOF-02へ以下を追加する案。

1. 同じsolutionからCore試験、ファイル試験、アプリ起動・デバッグへ到達できること。手順と必要環境を明記。
2. 購入確定・取消、同じ確定操作の重複、探索の終了再開をGUIなしのモデル試験へ分離できること。
3. 日本語、独自カード配置、窓重なり、ホバー、ドラッグ中断、演出途中の再入力を実hostで確認し、視覚確認を単体試験で代用しないこと。
4. ボタン位置変更、窓追加、演出順変更で編集するファイルと作業時間を記録し、0.5の未検証工数を校正すること。汎用基盤を増やす前に本作への必要性を確認。
5. Release ZIPのランタイム同梱・資源・ネイティブ依存を固定し、SDKなしWindowsで性能、入力、音、保存終了再開、更新保持を確認。[M3]

現在はLinux上の文書調査のみで、dotnet／Godotの導入、サンプル作成、Windows実行、上記試験は行っていない。IDEやtest adapterの実際の操作感、版の組合せ、性能、作業倍率は未確認。追加の情報提供や他Work稼働を資料化の開始条件にしていない。

変更は自Work文書のみ。方式案の提供物はMonoGameのself-contained出力とContent／native依存へ、保存先の取得は通常の.NET OS用APIへ改訂。通常保存の基点案は`%APPDATA%/crossweave/saves/local/m1.json`を維持し、`Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData)`から組み立てる。未作成・取得失敗時を扱い、起動ディレクトリーへの黙示fallbackをしない。[D1] 正式採用・実装・CI・公開へ進まない。横断計画はとりまとめが受領後に反映する。

## 一次資料

2026-09-27 JST確認。技術仕様の根拠であり、管理容易性の順位と工数予測は本Workの設計判断。版未固定のページを採用版の試験済み証拠にしない。

- G1 [Godot 4.6 C# basics](https://docs.godotengine.org/en/4.6/tutorials/scripting/c_sharp/c_sharp_basics.html)：C#プロジェクト、interop、IDE。
- G2 [Godot gd_mono.cpp](https://github.com/godotengine/godot/blob/master/modules/mono/mono_gd/gd_mono.cpp)：.NET hosting。master参照で採用版固定ではない。
- G3 [C# collections](https://docs.godotengine.org/en/4.6/tutorials/scripting/c_sharp/c_sharp_collections.html)：.NET型とGodot型、境界変換。
- G4 [C# signals](https://docs.godotengine.org/en/4.6/tutorials/scripting/c_sharp/c_sharp_signals.html)：型付きイベント、解放と自動切断の例外。
- M1 [MonoGame platforms](https://docs.monogame.net/articles/getting_started/platforms.html)：DesktopGL等のバックエンド。
- M2 [Understanding the code](https://docs.monogame.net/articles/getting_started/3_understanding_the_code.html)：Game／Update／Draw。
- M3 [Packaging games](https://docs.monogame.net/articles/getting_started/packaging_games.html)：self-contained配布、必要依存。
- T1 [gdUnit4Net](https://github.com/godot-gdunit-labs/gdUnit4Net)：保守元の説明、VSTest、RequireGodotRuntime、scene runner。
- I1 [Rider Godot support](https://www.jetbrains.com/help/rider/Godot.html)：C# solution、実行・デバッグ・テスト、シーン構造表示。
- D1 [Environment.GetFolderPath](https://learn.microsoft.com/en-us/dotnet/api/system.environment.getfolderpath?view=net-10.0)、[SpecialFolder](https://learn.microsoft.com/en-us/dotnet/api/system.environment.specialfolder)：保存基点取得用API。

関連：[方式案](../../仕様案/カード探索ゲーム_M1実行基盤と配布案.md)／[後続計画](CO-M1R_後続実施計画.md)／[AI支援時の作業量予測0.5](CO-M1R_AI支援時の作業量予測.md)／[とりまとめ引継ぎ](CO-M1R_とりまとめ引継ぎ.md)。
