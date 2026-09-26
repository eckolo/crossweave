# CO-M1R — GodotとMonoGameの多角比較

**現行方針への案内（2026-09-27）：ユーザーは当面Godotを採用して進めると選択済み。[方式案0.8](../../仕様案/カード探索ゲーム_M1実行基盤と配布案.md)・[とりまとめ回答](CO-M1R_とりまとめ引継ぎ.md)を優先する。本書は比較時点の記録で、当時の推薦順位・未採用状態は履歴として扱う。**

版0.4／2026-09-27（日本時間）。実行基盤・配布設計 `20260926-runtime-delivery`。

比較対象は **Godot .NET＋C#** と **MonoGame＋C#**。GodotのGDScript版との比較ではない。公式資料の機能と、本作への適性に関する設計判断を区別する。以下の「有利」「負担」は本作の条件からの判断であり、実装時間・性能・配布容量を実測した順位ではない。

**現行推奨はGodot .NET＋C#を維持する。ただし、独自の画面構造・入力配送・描画の管理を自分で持つことを重視するなら、MonoGameを第一候補へ変更する合理性がある。** C#の好みは両候補を支持する条件であり、それだけでは両者の優劣を決めない。

## 1. 比較の前提と構成

前提：既存コードの再利用を優先しない。Windows 11 x64、FHD・16:9、マウス主体、将来Steam、C#優先、独自UI・演出、M1から永続化。4コア級／8GB／SSD／内蔵GPU、60fps・視覚応答100ms以内・常用500MB程度は開発目標で、最低動作保証ではない。起動5秒超は起動画面等を含む体験で判断する。原本・試作・仮データ・固定試験は保全する。

| 比較する構成 | 提供機能と本作が持つ部分 |
|---|---|
| Godot .NET＋C# | エディター・シーン・描画・文字・UI基礎・入力・音等を利用。ゲーム状態、独自の札配置・操作・演出順、保存仕様は本作のC#で実装する |
| MonoGame＋必要最小限の補助 | Gameの更新・描画、画像・音・入力・Content Pipelineを利用。画面遷移・UI管理・文字レイアウト・演出制御を自作またはライブラリーで構成する |
| MonoGame＋Gum等のUI補助 | 上記の定型UIを補える。公式チュートリアルにもGumを組み込む経路があり、全UIを自作する必要はない。ただし追加の構造・入力規則・版管理を引き受ける |

Godotを全機能使用、MonoGameを空のウィンドウという条件で比較しない。どちらも最終的に必要な日本語・画面・入力・音・保存を備えた構成で比べる。MonoGameに補助を入れる場合は、その費用・ライセンス・依存・実行負荷を含める。[M1–M2]

## 2. UI・演出・ゲーム表現

| 観点 | Godotの利点と注意 | MonoGameの利点と注意 |
|---|---|---|
| 独自UIの外観 | Controlのテーマ、独自描画、Node2D等で自作可能。既製ボタンの外観を採用する必要はない | SpriteBatchや描画処理から組み立てやすい。既存UIの外観や継承構造に合わせる必要が少ない |
| 独自の構造・描画順 | SceneTree、CanvasItem、座標・入力伝播を理解して使う。自作は可能だがエンジンの規則は残る | オブジェクト構造や描画順を明示的に決めやすい。設計と障害対応も自分の責務になる |
| 手札の配置・ドラッグ | 自動Containerに直下の札の位置を管理させると競合。独自領域は手動配置、または外側配置と内側演出を分ける | 配置と当たり判定を一つの自作モデルで管理しやすい。重なり・入力優先・取消・画面外の処理は必要 |
| 定型UI | スクロール、フォーカス、ボタン、詳細窓の基礎を使える。挙動を本作に合わせる調整は残る | 素のMonoGameには高水準UIがない。自作またはGum等を追加。Gumを使えばそのUI階層・イベント規則も比較対象 |
| 日本語・文章量 | 動的フォント、リッチテキスト、フォールバック、組版・翻訳の仕組みがある。本作の句点優先改行や窓寸法は別に確認 | SpriteFontで日本語表示は可能。収録文字・文字追加・折返し・装飾・拡大時品質を設計。LocalizedFontProcessorで使用文字を抽出でき、必ず全漢字を収録する必要はない |
| 拡大・縮小中の文字 | フォント設定やMSDFを選べる。ただし小さい字の読みやすさや初回字形生成にはトレードオフ | 標準SpriteFontの拡大だけで品質を満たせるか確認。別サイズの字形・動的フォント等の採用は追加の選定になる |
| 演出の時間・中断 | Tween、AnimationPlayer、C#直接制御を選べる。ゲーム固有の演出順は強制されない。同じプロパティを複数が書かない設計が必要 | コード主体の独自タイムライン、状態機械、演出キューを自然に構成できる。補間・停止・スキップ・連続操作の基礎も作るか導入する |
| シェーダー・画面効果 | 2D用shaderや粒子等の基盤がある。Godotシェーダー言語とrendererの機能差を理解する | Effect／HLSL等で自作。描画手順を制御しやすいが、DirectX／OpenGL間の変換・対応機能・Contentビルドにも注意 |
| 音と演出調整 | 音・ノード・アニメーションを視覚的に調整しやすい。見た目の確認をエディターで行える | 基礎の音再生はある。演出や音の調整用画面・デバッグ操作は自作または補助ツール。調整値をデータへ分離する案 |
| 操作機器・アクセシビリティ | ゲームパッド入力やControlのフォーカス、スクリーンリーダー連携の入口がある。独自描画だけにすれば意味付けは自作が必要 | キーボード・マウス・タッチ・パッド入力はある。UIナビゲーションや支援機能の設計は自作／採用UI層に依存 |

根拠：[G1–G7、M1–M5]。本作の「文字が多い」「詳細窓・取得・編成がある」はGodotの基礎機能が残る理由。一方、札の見た目が独自であることだけでMonoGameが必須になるわけではない。

独自性は三段階に分ける。

1. 外観・札の配置・演出の順番を独自にする：両者で可能。Godotの有利さが残る。
2. ドラッグ・重なり・入力優先・演出中断を独自にする：両者で可能。Godotとの境界調整とMonoGameの基礎自作を比較する。
3. シーンの構造・描画のまとめ方・文字配置・入力配送まで独自にする：MonoGameの構造上の利点が大きくなる。ただし本作でそこまで必要かは未確定。

## 3. C#開発・制作工程・テスト

| 観点 | Godotの利点と注意 | MonoGameの利点と注意 |
|---|---|---|
| C#／.NET | 通常のC#・NuGetを使えるが、Node／Variant／signal／Inspectorの境界には型・ライフサイクル制約がある | .NETのプロジェクトを中心に設計しやすい。GPU・音・ウィンドウ等のネイティブ依存は存在し、全て純粋.NETという意味ではない |
| 対応言語版 | 4.6公式文書は.NET8以上、C#12を明示。.NET10／C#14のエディター・Release・拡張の組合せを後続で確認 | 3.8.4.1公式手順は.NET9以上、10対応。net10.0なら通常C#14。TFMとSDKを固定する |
| 学習内容 | シーン、ノード、Resource、Control、入力伝播、exportなど。C#経験だけではエンジンの理解は省けない | C#経験が直接役立つが、ゲームループ・座標・描画状態・入力・資源寿命の理解が必要。C#に慣れているだけで制作量が消えるわけではない |
| IDE・デバッグ | 外部VS／Rider／VS Codeとエディターを併用。Godot内蔵C#編集機能は限定的 | 普段のC# IDE中心で作業しやすい。画面のノードを見渡す統合エディターは標準にない |
| 性能調査 | エンジン側の計測機能はあるが、内蔵ProfilerはC#スクリプト非対応。C#部分は外部.NET計測を使う | .NET側を同じツールで追いやすい。描画/GPU・ネイティブ部分は別の観測が必要 |
| 変更を試す速度 | 配置・アニメーション等を見ながら調整できる。C#変更のビルドが必要で、hot reload時の状態保持にも制限 | コード中心なら編集箇所を追いやすい。データ再読込や調整UIがなければ数値調整のたびに再実行する負担 |
| 素材管理 | インポート設定・シーン・プレビューがまとまる。インポート済み資源や参照規則を理解する必要 | MGCBとContent Pipelineがある。MGCB Editorは素材ビルド用で、ゲーム画面を配置するエディターではない |
| ゲームロジックのテスト | 純粋C#モデルをNodeから分ければ通常の.NETテストが可能。表示・入力の統合にはGodotが必要 | 純粋C#モデルは同様にテスト可能。GraphicsDevice等に密結合すればテストしにくくなる |
| CI・自動ビルド | headless・コマンドラインexportが利用可能。SDK、エンジン、templates、importを固定する | dotnet build／publishとContentビルドが中心。対象backend、ネイティブ依存、shader生成を固定する |
| Git・AIによる編集 | C#とテキストのシーン等は管理・編集可能。参照・UID・シーン競合と実表示の確認が必要 | コード主体に寄せると差分・レビュー・生成が直接的。自作基盤のコード量が増える可能性もある |
| 複数人・役割分担 | 見た目や演出の担当がエディターで調整しやすい。同じシーンへの編集集中は避ける | コードの担当分割をしやすい。非プログラマーの調整参加にはデータ形式・Gum・専用ツール等が必要 |
| 長期保守 | 共通機能の保守をエンジン側へ任せられる。更新時にAPI・scene・拡張の追従が必要 | 自作設計を維持しやすいが、自作UI・補助ライブラリーの保守も引き受ける。薄いframeworkだけで総保守量が小さいとは限らない |

根拠：[G8–G11、M6–M8]。対応版は資料確認の基準であり、将来の実装開始時にも「最新だから」という理由だけで更新しない。固定版の組合せを受入する。C#と.NETの詳細は[0.3追補](CO-M1R_CSharp対応と独自UI.md)。

両案ともゲーム状態・ルール・乱数・確定処理・保存用データを純粋C#側へ分離する案。Godot固有のNodePathやMonoGame固有のTexture2Dをセーブ本体へ入れない。これにより検証と移行の負担を減らせるが、後の基盤変更で表示・入力を作り直す必要は残る。

## 4. 性能・必要スペック・起動

| 観点 | Godotの利点と注意 | MonoGameの利点と注意 |
|---|---|---|
| 基礎負荷・容量 | 汎用エンジン＋.NETを持つ。ブラウザーは同梱しないが、機能が多い分の基礎負荷がある | 必要な機能へ絞りやすく、構造から負荷を管理しやすい。ただし.NET・素材・追加UI・フォントを含めた実物で比較 |
| CPU・GC | C#からGodotオブジェクトへの大量呼出し・文字列変換等にinterop費用。純粋C#内でまとめる設計が有効 | managed部分をまとめやすい。GPU等との境界は残り、GCもなくならない。LINQ・一時割当等の負荷は両者で確認 |
| GPU・低スペック | 2Dの本作ではCompatibilityを初期確認候補にできる。高度な効果やAA等はrenderer別に機能差がある | DesktopGL／WindowsDX等を選ぶ。WindowsDXの方が必ず速い等とはしない。OS・GPU・ドライバーと使う効果の組合せで確認 |
| 高度な描画最適化 | エンジンの仕組みを使いやすい反面、その構造へ合わせる場面がある。低水準APIもあるが習得・保守が増える | 描画のまとめ方・更新頻度・キャッシュを直接管理しやすい。実装の質によってはエンジン標準より遅くなる |
| 起動画面・初回読込み | 起動表示からゲーム準備への流れを作れる。フォント・shader・素材の初回処理は計測する | 小さな初画面を先に描く構成を作れる。同期的に全素材を読み込めば無応答になるため、読込み順を設計する |
| AOT・軽量化 | 既定の.NET出力で目標を測り、必要になった場合だけ追加検討。未確認の最適化を初期計画の前提にしない | DesktopGLではAOT／trimmingの経路がある。WindowsDXは公式配布資料で制限あり。反射・Content読込み・第三者ライブラリー互換を検証してから使う |
| 長時間・電力 | 画面停止時の不要更新、描画頻度、資源解放を設計。エディター込みの計測を配布版の消費量と混同しない | 同様に更新・描画の上限と資源寿命を管理。制御しやすいことと、自動的に省電力なことは別 |

根拠：[G8、G12、M9–M10]。**同じ条件の比較実測は0件。どちらにも最低スペック・容量・秒数の確定値は付けない。** 起動条件の緩和により、数秒の起動差のために長期の制作・保守負担を大きく増やす案は優先しない。

## 5. 配布・保存・Steam・将来展開

| 観点 | Godotの利点と注意 | MonoGameの利点と注意 |
|---|---|---|
| プレイヤーの入手・起動 | 必要なランタイム・データを含むexport成果一式をZIP化。エディターやSDKを要求しない | self-contained publishした成果一式をZIP化でき、SDKを要求しない。プレイヤー手順は同程度にできる |
| 開発側の配布準備 | export presetとtemplatesで手順をまとめやすい。.NET対応版・追加DLL等を含めて確認 | publish＋Content・native依存・対象backendを明示。CLIとの相性はよいが、組合せの選定は多い |
| Windowsの追加依存 | 完成export物を通常権限のクリーンPCで確認。署名や警告、GPU依存が自動でなくなるわけではない | WindowsDXは公式資料上DirectX June 2010 runtimeが音・パッド等に必要。配布容易性重視ならDesktopGLを初期候補にし、WindowsDXを使う場合は前提を配布計画へ含める |
| Steamで販売・配信 | Windowsアプリを配布する経路は成立。Godotだから自動で実績・Cloud・Deck対応になるわけではない | 同様に成立。MonoGameだから特別に不利という根拠はない。ストア配信とSteam API組込みを分ける |
| Steam API・Cloud | 拡張／C#接続を選び、.NETテンプレートと版を確認。接続方式は未確定 | C#ラッパー等の接続を選び、native DLL・対象OS・初期化を確認。具体的組合せは未確定 |
| ファイル保存 | user://でOSに応じた保存場所を扱える。保存形式・確定時点・原子的更新・移行は本作が設計 | System.IO等で保存領域と形式を管理。OSごとの保存先を定義する。セーブの整合性はGodot案と同じ責務 |
| 終了・更新・再開 | 表示ノードの保存だけでは足りない。ゲーム状態、二重処理防止、旧版移行・復旧を作る | 同様。エンジン差より状態モデルと保存設計が重要。インストール先と保存先を分離する |
| Linux／macOS・Deck | デスクトップexportがあるが、対象実機の表示・入力・署名／配布を確認。DeckはWindows対応と別判定 | DesktopGLにデスクトップ共通の経路があるが、同じく対象実機確認が必要。1つのWindows exeで全OS対応という意味ではない |
| ブラウザー | Godot4.6のC#版はWeb export非対応。GDScript版のWeb対応をそのままC#へ適用しない | 公開の標準対応一覧でWebを主経路にできる根拠を確認していない。ブラウザー追加を容易な無料オプションとしない |
| 3D・将来の拡張 | 3D等の機能と制作ツールがある。将来必要なら利点だが、未計画の3D化を主な選定根拠にしない | 3D描画基礎はあるが、高水準な制作環境は別に用意。2Dを作り切る用途にも継続利用可能 |
| ライセンス・運用費 | MIT。エンジン利用に売上連動料はない。組込みライブラリー・素材・拡張等の条件は別 | 主にMs-PL、MIT表記の部分もある。frameworkの売上連動料はない。追加UI・ライブラリー等の条件は別 |

根拠：[G8、G11、G13–G14、M1、M9–M11、S1–S2]。

Steamworks APIのゲーム内組込みは、Steamへの配布それ自体の必須条件ではない。Auto-Cloudは指定ファイルの同期を設定する方式で、両案に使える。保存先、Steam利用者の区分、更新互換、終了前の保存完了、オフライン・競合の検証は必要。この点はどちらかを決定的に有利にしない。[S1–S2]

## 6. crossweaveで選択が分かれる条件

| 重視する条件 | 優先する案 | 理由・引受ける負担 |
|---|---|---|
| 遊べる版と最終アプリを完成させるまでの総作業量 | Godot寄り | 文字・定型UI・素材・音・演出調整の基礎を使う。Godotの概念・境界は学ぶ |
| C#で画面・入力・描画構造も把握し、自分の設計へ統一する | MonoGame寄り | 高水準のエンジン構造に合わせる負担が小さい。自作基盤と補助の保守を持つ |
| 独自の札の外観・配置・アニメーション | 決定差にならない | どちらも可能。Godotでは標準Containerを使わない領域を区切る |
| 日本語の本文・詳細窓・取得・編成・設定など多数のUI | Godot寄り | 既製の見た目を使わなくても文字・UI機能を利用できる。MonoGame＋補助で同等にする費用と比較 |
| 小さい基盤・描画の直接制御・将来の自作ツール資産 | MonoGame寄り | その基盤作り自体に価値がある場合。単に既存コードを捨てられるという条件からは導かない |
| Steam配布・ファイル保存・通常のC#ロジック試験 | おおむね同等 | 両方で成立。Steam接続・配布物とセーブの設計品質に左右される |
| メモリー・FPS・起動の実性能 | 未判定 | 同じ素材・文字・操作・音・保存を揃えたRelease物で測る |

推奨をGodotに残す理由は、本作では独自の札UIと並行して日本語文章、詳細窓、取得・編成・結果などの基礎機能が多いため。標準UIの外観や完成済みの演出を使うという前提ではない。MonoGameは十分有力で、独自実装の所有範囲が第3段階へ及ぶ、Godotとの調整が継続的に負担になる、または小さい基盤を自分で育てたい場合には逆転する。

Godot案はCompatibility rendererを最初の確認候補とし、必要な演出がその範囲に収まるか確かめる。MonoGame案はDesktopGL＋.NET10を配布容易性から最初の確認候補とし、文字・定型UIだけ補助を採用するかを決める。いずれも正式採用ではない。

## 7. 後続で比較を確定するための最小確認

0.3の代表サンプル計画を、次の観測項目で具体化する。今回はサンプルを作成せず、全候補の並列実装も開始しない。

1. 同じ既存素材・日本語本文・文字サイズで、札の独自配置→拡大→短ホールドドラッグ→詳細窓→予測→演出中の取消・再入力を動かす。最初に有力な1案を確認し、明確な問題があれば対抗を調べる。
2. 文章差替え・札追加・窓寸法変更・演出順変更を行うときの編集場所と作業量を記録。単に初回表示ができたかだけでなく、後の調整が容易かを判定する。
3. 句点／読点を優先する改行、長い日本語、未使用漢字の追加、拡大中と小さい字、OS倍率100／125／150%を確認。MonoGameの文字ライブラリーを使う場合は依存の一部として固定。
4. C#の割当・GCとnative／GPUの観測を分ける。Releaseの全関連メモリー、フレーム時間のばらつき、入力応答、初画面／操作可能時刻、初回字形・shader処理、長時間増加を見る。空プロジェクトの容量や平均FPSだけで判定しない。
5. 開発SDKなしのWindowsで、音・入力を含め通常起動→一巡→保存終了→再開→新版へ更新を確認。追加インストールの有無、配布／展開／更新容量、保存互換を記録。
6. Steam接続は別段階で必要機能・C#接続方式を選定し、Steamからの起動・終了・更新・Overlay・Cloud等を実機で確認。M1全体をSteam拡張の導入待ちにしない。

現Workの実行環境はLinux。Godot／.NET SDKの導入・コンパイル・Windows出力・GPU操作確認を今回実施していない。公式にCLI／exportがあることと、このWorkで作成・実動確認できたことは区別する。実装、UI統合、保存検証CI、素材制作、Steam登録・サイト公開へは進まない。

担当は[後続実施計画](CO-M1R_後続実施計画.md)を継承。方式・実装・配布・計測はアプリ／基盤の責務、既存ルール・経済・バランスの疑義だけゲームバランス検討へ渡す。とりまとめへの[引継ぎ](CO-M1R_とりまとめ引継ぎ.md)を自枝へ保存する。

## 一次資料

2026-09-27（日本時間）確認。Godotは4.6の固定版文書、MonoGameは公式導入資料が明示する3.8.4.1を基準にする。更新予定のbackendや未検証のライブラリー組合せを完成済みの利点に数えない。

- G1 [Custom drawing](https://docs.godotengine.org/en/4.6/tutorials/2d/custom_drawing_in_2d.html)
- G2 [Containers](https://docs.godotengine.org/en/4.6/tutorials/ui/gui_containers.html)
- G3 [Control](https://docs.godotengine.org/en/4.6/classes/class_control.html)
- G4 [Using fonts](https://docs.godotengine.org/en/4.6/tutorials/ui/gui_using_fonts.html)・[Internationalization](https://docs.godotengine.org/en/4.6/tutorials/i18n/internationalizing_games.html)
- G5 [Animation](https://docs.godotengine.org/en/4.6/tutorials/animation/introduction.html)
- G6 [Feature list](https://docs.godotengine.org/en/4.6/about/list_of_features.html)
- G7 [Gamepads](https://docs.godotengine.org/en/4.6/tutorials/inputs/controllers_gamepads_joysticks.html)・[DisplayServer accessibility](https://docs.godotengine.org/en/4.6/classes/class_displayserver.html)
- G8 [C# basics](https://docs.godotengine.org/en/4.6/tutorials/scripting/c_sharp/c_sharp_basics.html)
- G9 [Profiler](https://docs.godotengine.org/en/4.6/tutorials/scripting/debug/the_profiler.html)
- G10 [Version control](https://docs.godotengine.org/en/4.6/tutorials/best_practices/version_control_systems.html)
- G11 [Exporting projects](https://docs.godotengine.org/en/4.6/tutorials/export/exporting_projects.html)・[Windows export](https://docs.godotengine.org/en/4.6/tutorials/export/exporting_for_windows.html)
- G12 [Renderers](https://docs.godotengine.org/en/4.6/tutorials/rendering/renderers.html)
- G13 [Data paths](https://docs.godotengine.org/en/4.6/tutorials/io/data_paths.html)・[Saving games](https://docs.godotengine.org/en/4.6/tutorials/io/saving_games.html)
- G14 [Godot license](https://godotengine.org/license/)
- M1 [MonoGame overview](https://docs.monogame.net/articles/)
- M2 [Gum UI integration](https://docs.monogame.net/articles/tutorials/building_2d_games/20_implementing_ui_with_gum/)
- M3 [SpriteFonts](https://docs.monogame.net/articles/tutorials/building_2d_games/16_working_with_spritefonts/index.html)
- M4 [Localization](https://docs.monogame.net/articles/getting_started/content_pipeline/localization.html)
- M5 [Custom effects](https://docs.monogame.net/articles/getting_started/content_pipeline/custom_effects.html)
- M6 [Windows setup／.NET](https://docs.monogame.net/articles/getting_started/1_setting_up_your_os_for_development_windows.html)
- M7 [MGCB Editor](https://docs.monogame.net/articles/getting_started/tools/mgcb_editor.html)
- M8 [Content build automation](https://docs.monogame.net/articles/getting_started/content_pipeline/automating_content_builder.html)
- M9 [Packaging](https://docs.monogame.net/articles/getting_started/packaging_games.html)
- M10 [Platforms](https://docs.monogame.net/articles/getting_started/platforms.html)
- M11 [MonoGame license](https://github.com/MonoGame/MonoGame/blob/develop/LICENSE.txt)
- S1 [Steamworks SDK](https://partner.steamgames.com/doc/sdk)
- S2 [Steam Cloud](https://partner.steamgames.com/doc/features/cloud)
