# CO-M1R — C#対応と独自UIの制御範囲

版0.3／2026-09-26（日本時間）。担当：実行基盤・配布設計 `20260926-runtime-delivery`。

**推奨言語をC#へ変更し、Godot .NET＋C#を第一候補、MonoGame＋C#を主要対抗候補とする。** ユーザーはC#が好きで経験もあるため優先したいと表明し、画面UIは大幅に独自実装する可能性と、最終演出までフレームワークに制約される懸念を追加した。方式の正式採用、エンジン導入、実装着手は未決。既存コード再利用を優先しない条件、性能・起動体験・配布目標は0.2から維持する。

## 1. .NET／C#の対応範囲

言語構文の版、使える標準API、実行ランタイム、開発SDKを分ける。SDKを新しくすることだけで、ゲーム側のTargetFrameworkやエンジン内のランタイムまで新しくなるとは扱わない。以下は公式資料で確認した版の仕様で、crossweaveのビルド結果ではない。

| 候補・確認した資料の版 | .NET／API・SDK | C#機能の目安 | 本件での読み方 |
|---|---|---|---|
| Godot 4.6 .NET版 | 公式機能表は.NET 8以上をサポート。ゲーム制作には別途.NET SDK、エディター／export templatesは.NET対応版が必要 | 公式にC# 12構文・機能の完全対応を明記。これは12を上限とする記載ではない | .NET 10／C# 14を採用候補にできるが、この組合せのエディター実行・Release export・必要拡張は未確認。まず固定版で確認してから利用基準を確定する [C1–C2] |
| MonoGame 3.8.4.1 | Windowsの公式導入手順は.NET SDK 9以上、.NET 10も対応と明記 | ターゲットをnet9.0とする通常の既定はC# 13、net10.0ならC# 14 | 現代の.NETを利用するC#フレームワークとして有力。SDKを10にしただけで既存net8/9プロジェクトも自動的にC#14になるという意味ではない [C3・C6] |
| Unity 6.3（6000.3）／6.5（6000.5）の公式文書 | API互換レベルは.NET Standard 2.1、または.NET Framework 4.8＋追加API。通常の.NET 8/9/10アプリと同じ前提にはできない | C# 9。一部機能に制限。init／recordに注意があり、Unityのシリアライズはrecord非対応 | C#という名称は共通だが、最新のC#構文や.NET API・NuGet資産の利用を重視するならGodot／MonoGameより制約が大きい [C4–C5] |

.NET 8→C#12、9→13、10→14はMicrosoftの既定対応。LangVersionだけを引き上げても、ランタイム機能や標準APIが足りない場合は使えない。サポート対象外のコンパイラー差替えをUnityの通常対応として数えない。[C6]

Godotに関して、古い.NET10 RCとGodot4.5の不具合報告、4.6での利用報告も確認したが、これを現行全構成の保証や未対応の断定には使わない。Godot公式の「.NET8以上」と明示されたC#12基準、今回の未検証範囲を区別する。[C1・C8]

2026-09-26時点で.NET8/9のサポート終了は2026-11-10、.NET10 LTSは2028-11-14。新規本番向けの長期固定先を.NET8にする案は避け、Godotでも.NET10の適合確認を優先する。確認できなければエンジン／依存の組合せやMonoGameを再評価する。今回はSDK導入・コンパイル・配布確認を行わない。[C7]

### GodotでC#を使うときの境界

- ゲームルール・状態・保存用データは通常のC#クラスとして書ける。List／Dictionary／record等の言語・標準ライブラリー利用と、GodotのInspectorへ公開する型の制約は別。
- `[Export]`、signal、Variantを通る境界では対応型に制約がある。任意の.NET型がそのままエディターに表示・保存されるとはしない。ゲームモデルをすべてNode／Resourceにしない設計を推す。[C9]
- Godot API呼出しには.NETとネイティブ側の橋渡しがある。細かい毎フレーム呼出し・大量の一時割当・GCを実測対象にする。C#選択だけで500MB／60fpsを達成済みにはしない。[C2]
- Godot4.6のC#版はデスクトップ出力に対応し、Web出力は公式資料上未対応。Windows／Steam主経路には適合するが、将来のブラウザー版を無償で追加できるとは扱わない。ランタイム同梱と配布量も後続で測る。[C2]
- GodotSteam等については.NETエディター／export templates／C#からの呼出経路を含めて組合せを確認する。0.2時点の保守元移転先・対応版未確認は残る。

## 2. Godotの「UI部品と2D演出」の範囲

標準の見た目やゲーム進行・演出順を受け入れる必要があるという意味ではない。Godotは文字・画像・配置・入力・補間・描画等の機能を提供し、どれを使うかを選べる。一方でSceneTree、CanvasItem、入力伝播、描画順・座標などエンジンのモデルは理解して扱う必要があり、完全に介入がないとも言わない。

| 層 | 提供されるもの | 独自実装できる範囲・注意 |
|---|---|---|
| 文字・一般UI | Label／RichTextLabel、ボタン、スクロール、フォーカス、Theme／StyleBox等 | 見た目を独自にし、必要な部品だけ使える。日本語フォント・折返し・禁則・合意済み改行規則は本作の実データで確認 |
| 配置 | アンカー、Container、自作Container | 手札の扇形・重なり・傾き・場の独自配置を自作可能。自動Containerに管理させた子の位置は上書きされるため、独自配置の領域には使わない／自作にする |
| 描画 | Sprite2D、Polygon2D、Control／Node2Dの`_Draw()` | カード枠・予測矢印・動的な形状をC#の描画命令で作れる。見た目だけの変更と当たり判定は別に扱う |
| 入力 | `_GuiInput()`、mouse filter、フォーカス、`_HasPoint()`等 | 短ホールド→ドラッグ、横移動、詳細窓、変形した札の選択を独自状態機械で制御できる。透過表示やshader変形がクリック領域へ自動反映されるとはしない |
| 動き | Tween、AnimationPlayer、毎フレームのC#処理 | Tweenは任意プロパティの補間、AnimationPlayerは自分で定義する時間軸。軌跡・曲線・速度・中断・順番を作者が決める。両者を使わずコードで制御もできる |
| 視覚効果 | CanvasItem shader、粒子、マスク・合成等 | 輝き、歪み、消失、残像等を独自に作るための機能。完成済み効果の強制ではない。shader部分はC#とは別のGodotシェーダー言語を使う |

標準UIを全部使わないこととGodotを使わないことは同じではない。文字と入力などの基礎だけを利用し、カードの見た目・配置・演出を自作する中間的な構成が可能。[U1–U6]

## 3. 本作での組立案と衝突の回避

提案する分担は、(1)ゲームルール・状態は純粋なC#、(2)選択・ドラッグ・詳細窓・予測の状態管理もC#、(3)Godotが表示ノード・入力の入口・文字・描画・音を担当、(4)演出のタイミングと中断規則は本作のC#が所有、という構成。これは設計案であって実装済みではない。

- カード一覧の並び順・目標位置は本作のC#で算出。設定画面等の定型領域にはContainerを使えるが、手札／演出中の札を自動配置の直下に置かない。配置用の外側と動き用の内側を分ける方法もある。
- 札が拡大・浮上・移動するとき、描画順とクリック対象を同時に管理する。shaderで見た目を変えただけで選択判定も変わると期待しない。
- 同じ位置・透明度等をTween、AnimationPlayer、自作コードが同時に書かない。ドラッグ開始時に既存の補間を止める等、所有者と中断を明示する。[U5]
- 見た目のアニメーション完了をゲームの確定・保存成立の唯一の条件にしない。状態を確定してから表示を追従させ、スキップ・中断・終了でも二重決済を起こさない。
- Pure C#部分を分離しても、後にMonoGameへ変えれば描画・入力接続の再実装は必要。エンジン変更が無作業になるとは約束しない。

## 4. 推奨と後続確認の更新

**Godot .NET＋C#を第一候補に維持し、MonoGame＋C#をDefoldより上の主要対抗候補へ上げる。** Godotの利点は既製UIをそのまま使えることに限らず、独自UIに必要な文字・入力・描画・素材・音等の基礎を残せること。C#の習熟がある以上、GDScriptを初期言語に優先する理由は弱くなった。

ただし、自作の範囲がシーン構造・描画順・入力振分けまで全面的に及び、Godotの基礎機能も大部分使わない場合はMonoGameの優先度がさらに上がる。現時点の「独自UIが多い」だけでは、その段階まで必要とは判断していない。UnityはC#候補だが、現代.NET機能の利用面では上記の制約を比較に残す。Defoldは性能重視時の候補として維持するが、C#優先では第一対抗から下げる。

後続RD-ENV-02ではGodot .NET、.NET SDK、対象TFM、C#言語版、export templates、Steam接続候補を明記して固定する。`.NET10／C#14`のWindows Release出力を優先確認する案。未検証で「全機能利用可」としない。

RD-PROOF-02は単なる標準ボタンの見本では足りない。既存素材を使った独自カード配置→ホバー拡大→短ホールドドラッグ→詳細窓重なり→予測矢印→演出途中の再入力／取消・終了、を代表場面として確認する。文字／当たり判定／自動配置との衝突、.NETの実行・保存終了再開・配布・メモリーを同時に見る。見た目の最終完成や新素材制作は求めず、選定上の制約が出るかを確認する。今回は作成・実行せず計画だけ更新する。

## 一次資料（2026-09-26確認）

- C1 [Godot4.6機能表](https://docs.godotengine.org/en/4.6/about/list_of_features.html)：.NET8以上、C#12の明示対応。
- C2 [Godot C# basics](https://docs.godotengine.org/en/4.6/tutorials/scripting/c_sharp/c_sharp_basics.html)：開発SDKと.NET版、配布ランタイム、Web制約、interop、NuGet。
- C3 [MonoGame Windows setup](https://docs.monogame.net/articles/getting_started/1_setting_up_your_os_for_development_windows.html)：3.8.4.1の.NET9／10対応。ページ中に古い.NET8導入注記も残るため、主記述を基準にし実行時に版を固定する。
- C4 [Unity6.3 compiler](https://docs.unity3d.com/6000.3/Documentation/Manual/csharp-compiler.html)・[6.5 compiler](https://docs.unity3d.com/6000.5/Documentation/Manual/csharp-compiler.html)：C#9と制約。文書の版を示しており6.5の安定版採用を宣言するものではない。
- C5 [Unity6.3 API](https://docs.unity3d.com/6000.3/Documentation/Manual/dotnet-profile-support.html)・[6.5 API](https://docs.unity3d.com/6000.5/Documentation/Manual/dotnet-profile-support.html)：Standard2.1／Framework4.8互換。
- C6 [Microsoft C#版とTFM](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/feature-version-errors)：既定言語版とランタイム依存の区別。
- C7 [Microsoft .NET support](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)：8／9／10のサポート期間。
- C8 [Godot .NET10 discussion](https://github.com/godotengine/godot-proposals/discussions/13076)・[旧RC issue](https://github.com/godotengine/godot/issues/111246)：歴史的な報告。現在の保証範囲を決める根拠には使わない。
- C9 [Godot C# exported properties](https://docs.godotengine.org/en/4.6/tutorials/scripting/c_sharp/c_sharp_exports.html)：Variant／Inspector境界。
- U1 [Godot UI](https://docs.godotengine.org/en/stable/tutorials/ui/index.html)：文字・部品・テーマ。
- U2 [Custom drawing](https://docs.godotengine.org/en/4.6/tutorials/2d/custom_drawing_in_2d.html)：Control／Node2Dの自作描画、C#例。
- U3 [Containers](https://docs.godotengine.org/en/4.6/tutorials/ui/gui_containers.html)：子の位置制御。
- U4 [Control](https://docs.godotengine.org/en/4.6/classes/class_control.html)：入力伝播・mouse filter・独自当たり判定。
- U5 [Tween](https://docs.godotengine.org/en/4.6/classes/class_tween.html)・[AnimationPlayer](https://docs.godotengine.org/en/4.6/tutorials/animation/introduction.html)：任意の動きと同一プロパティへの競合。
- U6 [CanvasItem shader](https://docs.godotengine.org/en/4.6/tutorials/shaders/shader_reference/canvas_item_shader.html)：2D／GUIの独自描画効果。
