# UI0.16.0 とGodot本編の対応

固定UI入力：`ui/readability-20260910`、`72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`。以下はリポジトリルート相対パス。UI原本のパスはこの固定commitで参照し、アプリ枝へUI原本を一括コピーしていない。

## 入力資料

- `docs/検証/UI/readability/co-u02/README.md`
- `docs/検証/UI/readability/co-u02/review/README.md`
- `docs/検証/UI/readability/co-u02/acquisition-preview/runtime-connection.md`
- `docs/検証/UI/readability/co-u02/acquisition-preview/layout.js`
- `docs/検証/UI/readability/co-u02/journey/full-hd.md`
- `docs/検証/UI/readability/co-u02/journey/card-frames.md`
- `docs/検証/UI/readability/co-u02/journey/edge-details.md`
- `docs/検証/UI/readability/co-u02/journey/field-forecast-details.md`
- `docs/検証/UI/readability/co-u02/journey/result-review.md`
- `docs/検証/UI/readability/co-u02/journey/destination-selection.md`

## 対応と変換点

| 了承UIの意図 | Godotの接続・場所 | 変換に伴う差 |
|---|---|---|
| FHD16:9、全体縦スクロールなし | `apps/crossweave-godot/Godot/project.godot`。基準1920×1080、canvas_items＋keep | Godot Controlの座標系とContainerへ変換。小ウィンドウは等比縮小 |
| 取得可能／所持／編成 | `apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs`。列幅376／735／735、所持・編成2列、352×80の共通単位 | Godot Buttonを右端に置く。カード情報部分272×80＋操作ボタンを合わせて共通352×80。内部スクロールの幅を確保 |
| 同性能の所持をまとめる | 公開blueprint.keyで所持を集約し×枚数、操作は一個体 | 未払い・ロック・変換可否が異なる場合は別行にして隠さない。編成は個体ごとに表示 |
| 取得予定・取消・編成・一括確認 | Planのlocal編集→PreviewPreparation→commit_preparation | DOMや旧runtimeを移植せず、同じ公開契約をC#へ接続 |
| 価格・枠・効果 | Coreのcomparison／details／quoteを表示 | 心得の合成済み日本語説明をCore公開詳細へ追加。効果のUI再演算なし |
| 主体／場／手札／行動順 | `apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs`。主体320×224、間隔24。手札・場248×208、間隔16 | 表示ノードはButton／Control。背景は既存画像、未制作主体は既存の仮表示のまま |
| 詳細・予測は反対側の端 | 札・予測520×480、主体416×384。画面端16 | 詳細は独立Controlで、余分な全画面スクロールを作らない |
| 選択・短ホールド・スワイプ | 共通PointerGestureの220ms保持／12px閾値。120msから保持表示。ドラッグ像と関係線を_Drawで描画 | 対象が複数で未選択のdropは予測と明示ボタンへ進める。無根拠に対象を確定しない |
| 場の予測札と詳細 | PreviewAction.field_afterの新札を＋予測として場に表示。予測札の選択で本来の手札選択を消さない | 既存場の差と主体変化・行動順は予測窓で公開before／afterを表示。補間演出の品質は実機評価へ残す |
| 本文・任意詳細 | 段落をScrollContainerで表示、表示した本文IDだけをcontinue_sceneへ送る | 目的は本文の許可IDに含まれないため送らない。表示だけで即時Executeしない |
| 踏破／未解決帰還 | `apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs`。成果・喪失、拠点、再訪／再挑戦 | 再挑戦・再訪はack_returnとdepartの二つの既存確定境界を順番に使う。途中で終了しても拠点の確定保存から再開可能 |
| ファイル保存の異常 | 通常入口・失敗・成否不明・読直し・復旧窓 | IndexedDBや旧MemoryStoreを使わず、FileGameSessionの現在契約を優先 |

`apps/crossweave-godot/Godot/Assets/Application/source.json` に仮画像3点の元パス・固定commit・git blobを記録。antique-shop、night-tide、diver-placeholderの内容は同じで、新規制作・正式採用をしていない。

UI原本の全DOM構造や全アニメーションを同一実装にすることは今回の目的ではない。公開情報・情報配置・操作意図・確定条件を上記の通り接続した。実物の日本語描画・はみ出し・物理入力・DPI・性能は `docs/検証/本編実装/d04b-ui-save-01/確認結果.md` の実測と未確認を区別する。

## 実描画からの修正

初回コード1ae0d563のWindows CI画像で、縮小画像での文字の細い見え方と元可変フォント既定wght=100と、潜水服TextureRectが元画像の最小サイズへ拡大されていた点を検出。dad99fbcで、同じフォントのFontVariationをwght=400にし、TextureRectのExpandModeをSizeより前に設定した。画像とフォントの元バイト・版は変更していない。主体画像が親の幅・高さを越えない実ノード検査も追加した。
