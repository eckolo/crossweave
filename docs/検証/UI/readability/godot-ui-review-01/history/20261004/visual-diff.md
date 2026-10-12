# 全対象の差異台帳

版：2026-10-04.1／2026-10-04（UTC）。原本 `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`、本編実装・証拠 `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531`、提出 `0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6`。

確認済みの不一致 57件。全件未承認・未解消。要修正は同じD04B-UI-02へ返し、修正後の固定SHAをUIが再判定する。差をGodot標準・試作・文字AA・実装都合で許容しない。実画像が不足する状態は別のUに残す。

| ID | 差異 | 基準 | 状態 |
|---|---|---|---|
| V-C01 | 文字のfont・weight・行組 | B02 | 不一致・修正必要 |
| V-C02 | 配色の名前空間を一本化 | B03 | 不一致・修正必要 |
| V-C03 | 共通ナビの図記号・色・字寸法 | B04 | 不一致・修正必要 |
| V-C04 | ボタンのhover・pressed・focus・disabled | B19 | 不一致・修正必要 |
| V-C05 | 外枠と1px内側座標 | B01 | 不一致・修正必要 |
| V-C06 | 標準スクロールバーの残存 | B19 | 不一致・修正必要 |
| V-P01 | 三領域の開始位置と行高 | B05 | 不一致・修正必要 |
| V-P02 | 取得欄・所持欄の囲い範囲 | B05 | 不一致・修正必要 |
| V-P03 | タブの選択表現 | B08 | 不一致・修正必要 |
| V-P04 | 共通取得札の枠・角 | B06 | 不一致・修正必要 |
| V-P05 | 札の操作側が外枠に食い込む | B06 | 不一致・修正必要 |
| V-P06 | 編成済みの外すまで主操作色 | B06 | 不一致・修正必要 |
| V-P07 | メタ行の記号・文字・数量 | B06 | 不一致・修正必要 |
| V-P08 | 未払いの斜線・色・時計 | B07 | 不一致・修正必要 |
| V-P09 | 取得元の跡を文章化 | B07 | 不一致・修正必要 |
| V-P10 | 空き枠・候補なしの形 | B07 | 不一致・修正必要 |
| V-P11 | 財布の現在・未払い予測 | B08 | 不一致・修正必要 |
| V-P12 | 取得フッターと固定操作 | B08 | 不一致・修正必要 |
| V-P13 | 取得窓の面・余白・境界 | B09 | 不一致・修正必要 |
| V-P14 | 一括確認が改行Labelへ平坦化 | B09 | 不一致・修正必要 |
| V-P15 | 取得詳細の位置・価格・修飾構造不足 | B09 | 不一致・修正必要 |
| V-E01 | 探索の手札・場・本人帯の縦位置 | B01 | 不一致・修正必要 |
| V-E02 | 探索背景の前景色かぶせ | B12 | 不一致・修正必要 |
| V-E03 | 場の帯の線・透明度 | B12 | 不一致・修正必要 |
| V-E04 | 札面の角・線と絵面gradient | B10 | 不一致・修正必要 |
| V-E05 | 札・主体の図記号をUnicode置換 | B10 | 不一致・修正必要 |
| V-E06 | 属性badgeの枠を欠く | B10 | 不一致・修正必要 |
| V-E07 | 空の場札のcaption高さ | B10 | 不一致・修正必要 |
| V-E08 | 予測／消費ラベルの位置と背景 | B13 | 不一致・修正必要 |
| V-E09 | 離れる場札の警告色 | B13 | 不一致・修正必要 |
| V-E10 | 主体と本人のバーを横2本へ変更 | B11 | 不一致・修正必要 |
| V-E11 | 主体の通常枠・選択枠・hover | B11 | 不一致・修正必要 |
| V-E12 | 本人帯の幅・内容密度 | B11 | 不一致・修正必要 |
| V-E13 | 札の下の操作枠を固定拡張 | B13 | 不一致・修正必要 |
| V-E14 | 関係線が直線矢印へ変わる | B13 | 不一致・修正必要 |
| V-E15 | 行動順の顔・余白・次のbadge | B14 | 不一致・修正必要 |
| V-W01 | 探索詳細の文字・表組・余白 | B15 | 不一致・修正必要 |
| V-W02 | pinと閉じるの形 | B15 | 不一致・修正必要 |
| V-W03 | 窓の面と影・区切り | B15 | 不一致・修正必要 |
| V-W04 | 反対端窓の座標系・縦基準 | B15 | 不一致・修正必要 |
| V-W05 | 共通窓・親子窓が固定座標 | B16 | 不一致・修正必要 |
| V-W06 | 記録タブ・列・区分を省略 | B16 | 不一致・修正必要 |
| V-W07 | 記録札詳細で直前の親が消える | B16 | 不一致・修正必要 |
| V-W08 | メニューが2列から縦1列へ | B16 | 不一致・修正必要 |
| V-W09 | 表示・操作設定の元UIを省略 | B18 | 不一致・修正必要 |
| V-W10 | 山札・履歴・案内を単一本文へ | B16 | 不一致・修正必要 |
| V-H01 | 探索先の詳細が題名から離れる | B17 | 不一致・修正必要 |
| V-H02 | 本文・帰還背景のgradientを近似 | B17 | 不一致・修正必要 |
| V-H03 | 帰還要約の文字階層 | B17 | 不一致・修正必要 |
| V-H04 | 本文窓の内面・余白・行間 | B17 | 不一致・修正必要 |
| V-H05 | 開始画面の配置と書体 | B17 | 不一致・修正必要 |
| V-S01 | 通知・保存中表示の位置 | B19 | 不一致・修正必要 |
| V-D01 | 受入先枠・ラベルを全列へ広げる | B18 | 不一致・修正必要 |
| V-D02 | ドラッグ元と像の透明度・影 | B18 | 不一致・修正必要 |
| V-D03 | ホールドcueの形と位置 | B18 | 不一致・修正必要 |
| V-D04 | 端送り速度と閾値 | B18 | 不一致・修正必要 |
| V-D05 | 移動・イベントの表示タイミング | B18 | 不一致・修正必要 |

## V-C01 文字のfont・weight・行組

対象：全画面。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| B02の用途別font/size/line-height、strong500。実解決fontは別採取 | NotoSansJP wght400を全域に使用。共通ボタン20、詳細本文22、札titleも400。原本と字形・太さ・折返しが異なる |

影響：読める量と余白、文字の強弱が変わる。

修正・解消条件：

1. Noto固定を暗黙の代替承認にせず、原本の実解決fontと用途別weight/line-heightを採取・再現する。各文字役割を別themeに定義。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / font / strong / cp-piece
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / font-size / line-height
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-money
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / .cw-common-nav

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `618b061eaa88c5778906b716c9b149659f0a029a` / _Ready / font

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R02-mixed-committed.png](evidence/implementation/final-caption/review-preparation-R02-mixed-committed.png)、[review-prediction-defense_support-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-defense_support-R04-hand-detail.png)、[review-prediction-guard-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-guard-R04-hand-detail.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-C02 配色の名前空間を一本化

対象：全画面。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 取得・探索・共通ナビの別tokenを保持 | Ink243d35/Paperfcfcf5/Gold315849を探索にも使用。探索原本263c32/f7f8f4/345747とは異なる |

影響：全面に細かな色差が拡がる。

修正・解消条件：

1. B03のnamespace単位で色を適用。RGB差1も未承認のまま自動許容しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / #cw-acquisition-review
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / #cw-playtable → .cw-explore
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / .cw-common-nav>button

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Ink / PaperColor / Box

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-C03 共通ナビの図記号・色・字寸法

対象：全ゲーム画面。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| book-open20＋調査記録18、背景f2f5e9・線a8b9a5・角5 | book-openを省略し「調査記録」の文字だけ。標準Button20・背景fcfcf5・線bac9ba・角6 |

影響：同じ機能の目印と見た目が変わる。

修正・解消条件：

1. 位置152×56/56×56は維持し、原本SVGとB04の色・font・角へ一致させる。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / .cw-common-nav / embedded .cp-header
- [docs/検証/UI/readability/co-u02/common-navigation.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `af0835bc652851bca5507415b61a3ace8e3eac16` / commonNavigationHTML
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer>header / .cj-inspect-top

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / CommonNavigation

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R02-mixed-committed.png](evidence/implementation/final-caption/review-preparation-R02-mixed-committed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-C04 ボタンのhover・pressed・focus・disabled

対象：全共通ボタン。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 元部品のhover色、取得disabled opacity.42／探索.5、focus原本の見え方 | BuildThemeは通常/hover/pressed/focusを独自Boxで置換。disabledは不透明e5e9de＋89988bで、元のprimary背景を含む透過とは異なる |

影響：無効・選択・フォーカスの視覚上の区別が変わる。

修正・解消条件：

1. 通常・hover・押下・focus・disabledを各部品で採取して一致。Godotデフォルト状態を残さない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-scroll/.cj-status
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-runtime-notice/.cp-button:disabled
- [docs/検証/UI/readability/co-u02/journey/fixed-screen.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/fixed-screen.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `d780db5987f64a052616f4d6226c62911e96fd89` / .cj-status
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-scroll/button:disabled

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / BuildTheme / Button

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R07-detail-disabled.png](evidence/implementation/final-caption/review-preparation-R07-detail-disabled.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-C05 外枠と1px内側座標

対象：全画面。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本shellの1px枠と内側1918×1078、用途別角丸 | Godot画面全1920×1080へ直置き。準備Panelの角6と背景線、探索は共通外枠なし。原本の内側座標に対し1px単位の差が残る |

影響：端・基準線・詳細の半画面判定の位置が微妙にずれる。

修正・解消条件：

1. B01の外枠と内側originを共通化し、全固定位置を同じ座標系へ変換する。単に各所へ±1補正を散布しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-shell / .cw-explore
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / embedded .cp-shell
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / uiSpace/uiRect

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Render / Panel

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-C06 標準スクロールバーの残存

対象：取得列・手札・場・長文・詳細。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| thin、探索横6px、原本thumb/track色とgutter | ScrollContainerのバーthemeを指定していない。U01画像・詳細下端に太い灰色のGodotバーが出る |

影響：同じ一覧でも余白・見える幅・視線誘導が変わる。

修正・解消条件：

1. 元の実バー寸法とthumb/track/hoverを採取しthemeを明示。原本6px指定の横バーは6pxへ。標準部品差として免除しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-scroll/.cj-status
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-runtime-notice/.cp-button:disabled
- [docs/検証/UI/readability/co-u02/journey/fixed-screen.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/fixed-screen.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `d780db5987f64a052616f4d6226c62911e96fd89` / .cj-status
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-scroll/button:disabled

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Scroll

比較画像：[review-prediction-defense_support-R04-hand-detail-bottom.png](evidence/implementation/final-records/review-prediction-defense_support-R04-hand-detail-bottom.png)、[review-prediction-guard-R04-hand-detail-bottom.png](evidence/implementation/final-records/review-prediction-guard-R04-hand-detail-bottom.png)、[review-scroll-hand-U01-after.png](evidence/implementation/targeted-third/review-scroll-hand-U01-after.png)、[review-scroll-prep-U01-after.png](evidence/implementation/targeted-third/review-scroll-prep-U01-after.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P01 三領域の開始位置と行高

対象：取得札・心得全状態。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本main padding16、lane gap20、grid padding2。原画先頭tile x19/415/1170,y123 | Godotpanel x25/413/1160,y76、tile x27/415/1162,y124。見出しを含むpanel高922、grid872 |

影響：移動先の整列・外側余白が一致しない。

修正・解消条件：

1. lane全体ではなく見出し32＋gap8＋gridの分離でB05を再現。352×80と8px gapは維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / dimensions/lane
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-main/.cp-lane/.cp-lane-grid

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / PreparationScreen xs/widths/scroll

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-destination-R06-owned-cancel-denied.png](evidence/implementation/final-caption/review-destination-R06-owned-cancel-denied.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P02 取得欄・所持欄の囲い範囲

対象：取得三領域。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 取得可能は底線だけ、所持・編成の地色はgridから下 | Godotは見出しを含めた全3列を角丸panelで囲み、原本にない取得欄の側線・上線を表示 |

影響：領域の意味を示す構造が別物になる。

修正・解消条件：

1. 見出しを地色の外へ出す。取得底2px、所持左右1/底4px、編成inset1pxをB05どおりにする。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / dimensions/lane
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-main/.cp-lane/.cp-lane-grid

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / PreparationScreen Panel

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R02-mixed-committed.png](evidence/implementation/final-caption/review-preparation-R02-mixed-committed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P03 タブの選択表現

対象：札／心得切替。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 64高の連続した角なし帯、active315849＋on-activefffef5 | 独立した角6枠付きbutton。選択はcfdec8背景と2px枠、文字inkのまま |

影響：選択中の分類の強さと一体感が変わる。

修正・解消条件：

1. 選択/非選択のtabをB08の元部品で再現。位置・64px高を維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-header/.cp-footer/.cp-wallet/.cp-purchase-track
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / wallet/purchaseTrack/render
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeTrack

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / tab-card/tab-passive

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R02-mixed-committed.png](evidence/implementation/final-caption/review-preparation-R02-mixed-committed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P04 共通取得札の枠・角

対象：取得可能／所持／編成／ドラッグ。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 2px枠を含む352×80、角5、内側76 | CardTile.DrawRectは角なし、strokeを中心に描画。右buttonだけ角6が付く |

影響：枠線の内外位置と右端の接続が合意案からずれる。

修正・解消条件：

1. 枠内描画とclipをB06へ揃え、移動しても同じ部品・外形のままにする。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-piece/.cp-build/.cp-item-actions
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/localAction

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / CardTile._Draw / MakeTile compact

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-destination-R06-owned-cancel-denied.png](evidence/implementation/final-caption/review-destination-R06-owned-cancel-denied.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P05 札の操作側が外枠に食い込む

対象：取得・編成・外す。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 右72×76、外枠の内側2px、区切りinset1px | x278,y0,w74,h80のButtonで外枠を覆う。丸い左角も付く |

影響：内側線と外側枠の位置が揃わない。

修正・解消条件：

1. 右操作領域をx278,y2,w72,h76相当の枠内へ置き、原本の区切りと右角だけを再現する。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-piece/.cp-build/.cp-item-actions
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/localAction

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / Button(tile,verb...)

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-destination-R06-pending-cancel-allowed.png](evidence/implementation/final-caption/review-destination-R06-pending-cancel-allowed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P06 編成済みの外すまで主操作色

対象：編成欄。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| build外枠58754a、「外す」はf5f7eeとink | build札は通常bac9ba枠。「外す」も取得と同じ315849主操作色 |

影響：取得／編成済みの視覚差が失われる。

修正・解消条件：

1. 外すをsecondaryへ、編成済み枠をbuild色へ。取得・編成のprimaryと分ける。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-piece/.cp-build/.cp-item-actions
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/localAction

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Button prefix 外す-

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-destination-R06-owned-cancel-denied.png](evidence/implementation/final-caption/review-destination-R06-owned-cancel-denied.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P07 メタ行の記号・文字・数量

対象：札／心得所持・取得。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| layers/scroll-text/check、lightbulb、grid-2x2、18px。数量は右端 | 16pxの属性／「着想」「枠消費」「ロック」文章中心。数量を途中へ連結 |

影響：取得済み・編成中・種類を文字なしで識別しにくい。

修正・解消条件：

1. 元18px記号・gap6・右寄せquantityを再現。公開数量・ロック意味は保ちながら配置を戻す。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-piece/.cp-build/.cp-item-actions
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/localAction

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / MakeTile compact info

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R02-mixed-committed.png](evidence/implementation/final-caption/review-preparation-R02-mixed-committed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P08 未払いの斜線・色・時計

対象：未払い所持／未払い編成。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 金茶破線、135deg斜線、右下独立clock | 緑破線・通常白背景・「◷ 未払い」の文字連結 |

影響：未払いが正式所持と似た見た目になる。

修正・解消条件：

1. B07のpending専用色・斜線・clockを実装し、価格などをclockへ重ねない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-pending/.cp-clock/.cp-empty/.cp-offer-message/.cp-button
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/lane/offerPhase

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / CardTile._Draw / MakeTile compact

比較画像：[review-destination-R06-pending-cancel-allowed.png](evidence/implementation/final-caption/review-destination-R06-pending-cancel-allowed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P09 取得元の跡を文章化

対象：未払い取得後の左欄。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 同寸法placeholder、中央arrow-rightと底線 | 「→ 取得予定」を左寄せLabelで表示 |

影響：元の空間的手掛かりが説明文へ戻る。

修正・解消条件：

1. cp-offer-emptyの中央SVGと底3pxをそのまま再現。候補件数・正式取得後の消去規則は維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-pending/.cp-clock/.cp-empty/.cp-offer-message/.cp-button
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/lane/offerPhase

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / pending offer placeholder

比較画像：[review-destination-R06-pending-cancel-allowed.png](evidence/implementation/final-caption/review-destination-R06-pending-cancel-allowed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P10 空き枠・候補なしの形

対象：空所持／空編成／取得完了／候補なし。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 共通352×80の破線枠・状態icon・20/28の文言 | 空編成は枠なし＋だけ、空所持は「ここにはありません」。空候補は汎用Label300×100 |

影響：空状態でも置き場と操作単位が維持されない。

修正・解消条件：

1. B07の空部品を両分類に共用。公開群が残るケースを完了と誤表示しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-pending/.cp-clock/.cp-empty/.cp-offer-message/.cp-button
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/lane/offerPhase

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / rowCount==0 / empty slots

比較画像：[review-preparation-R07-drag-denied.png](evidence/implementation/final-caption/review-preparation-R07-drag-denied.png)、[review-scroll-prep-U01-before.png](evidence/implementation/targeted-third/review-scroll-prep-U01-before.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P11 財布の現在・未払い予測

対象：取得未払い／不足／確定後。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| lightbulb、現在値、変更後clock点線token | 「着想 現在 → 後」を一つのLabelに連結 |

影響：確定前後の区別が文字依存になる。

修正・解消条件：

1. cp-wallet/cp-wallet-nextの記号と点線枠を再現。未公開の残高は—を維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-header/.cp-footer/.cp-wallet/.cp-purchase-track
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / wallet/purchaseTrack/render
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeTrack

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / money Text

比較画像：[review-destination-R06-pending-cancel-allowed.png](evidence/implementation/final-caption/review-destination-R06-pending-cancel-allowed.png)、[review-preparation-R07-drag-denied.png](evidence/implementation/final-caption/review-preparation-R07-drag-denied.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P12 取得フッターと固定操作

対象：取得全状態。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 64高の帯e9eee0、上線、undo-2、角なし戻す／確認する、22px | 背景はmainと同じ。丸い独立buttonと20pxの長い容量文。undo記号なし |

影響：確定前の操作帯と作業面の分離が弱まる。

修正・解消条件：

1. B08の帯・枠・font・iconへ戻し、公開群上限と容量の追加情報は既存表示構造に収める。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-header/.cp-footer/.cp-wallet/.cp-purchase-track
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / wallet/purchaseTrack/render
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeTrack

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / PurchaseTrack/capacity/discard/review

比較画像：[preparation.png](evidence/reference/preparation.png)、[review-preparation-R02-mixed-committed.png](evidence/implementation/final-caption/review-preparation-R02-mixed-committed.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P13 取得窓の面・余白・境界

対象：取得詳細／確認。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 960×820、角8、paperf4f6ec、header64/body padding24/footer72、区切り線とshadow | 外形960×820は同じ。角6・fcfcf5fa、shadow/区切りなし、body x20,y76。確認overlay黒.6と詳細黒.3が不統一 |

影響：同じ窓でも見た目と密度が違う。

修正・解消条件：

1. B09の一つのframeへ詳細・確認・変換を揃える。暗幕も283d3555へ。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-overlay/.cp-dialog/.cp-facts/.cp-review-wallet/.cp-change
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / reviewBody/renderDialog
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeReviewBody/runtimeItemFacts

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / RenderModal review / DetailWindow

比較画像：[review-preparation-R02-mixed-top.png](evidence/implementation/final-caption/review-preparation-R02-mixed-top.png)、[review-preparation-R07-detail-disabled.png](evidence/implementation/final-caption/review-preparation-R07-detail-disabled.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P14 一括確認が改行Labelへ平坦化

対象：混合／編成のみ／心得のみ確認。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 中央36px残高、取得行の価格・移動先、数量差分の右列、容量2列、変更心得の折畳み | 情報はR02で追加済みだが全て20pxの連続文章。残高が小さく左端、区切り・整列・折畳みがない |

影響：支払いと変更を視覚的に走査できない。

修正・解消条件：

1. R02の公開値を保ちcp-review-wallet/cp-change/cp-capacity/details構造を再現。データを削らず原本の行と列へ投影する。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-overlay/.cp-dialog/.cp-facts/.cp-review-wallet/.cp-change
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / reviewBody/renderDialog
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeReviewBody/runtimeItemFacts

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.ReviewFixes.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.ReviewFixes.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `5a4eb0f97423929d8b90f17d90b3cd78534e8d0e` / PreparationSummary

比較画像：[review-preparation-R02-mixed-bottom.png](evidence/implementation/final-caption/review-preparation-R02-mixed-bottom.png)、[review-preparation-R02-mixed-top.png](evidence/implementation/final-caption/review-preparation-R02-mixed-top.png)、[review-preparation-R02-passive-only-top.png](evidence/implementation/final-caption/review-preparation-R02-passive-only-top.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-P15 取得詳細の位置・価格・修飾構造不足

対象：取得可能／所持／編成の札・心得詳細。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 三領域location、pendingclock、取得価格、112px label/value、修飾summary | DetailWindowはItemTextだけ。offerの価格・現在の置き場が本文にない。修飾別説明の折畳みもない |

影響：詳細を見て取得費と所在を判断できない。

修正・解消条件：

1. 公開offer.price_units等を元の価格行へ、所在を既存locationへ。修飾の公開説明を元のsummaryへ。必要情報がpublic viewに無ければ境界不足を具体化し、私的DTOから補完しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-overlay/.cp-dialog/.cp-facts/.cp-review-wallet/.cp-change
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / reviewBody/renderDialog
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeReviewBody/runtimeItemFacts

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / DetailWindow / ItemText

比較画像：[review-preparation-R07-detail-disabled.png](evidence/implementation/final-caption/review-preparation-R07-detail-disabled.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：要修正（追加N01：元詳細の判断材料の欠落）。解消証拠：未提出。

## V-E01 探索の手札・場・本人帯の縦位置

対象：探索全状態。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原画field上413、hand上688、本人帯983。内側の336/248/314/72＋gap20 | field上412、hand上676、本人帯984。手札だけ12px上。原本の行内alignを固定座標で置換 |

影響：縦の間隔と札の下の操作位置が不揃いになる。

修正・解消条件：

1. B01の行＋B10のalignを再現。コードコメントの行寸法だけで一致にしない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-shell / .cw-explore
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / embedded .cp-shell
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / uiSpace/uiRect

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / ExplorationScreen CardStrip/footer

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E02 探索背景の前景色かぶせ

対象：探索全状態。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| night-tide cover＋下方e8edd933 wash | TextureRectのみ。原本の45%以降の前景washがない |

影響：同じ素材でも明るさ・背景と札の馴染みが変わる。

修正・解消条件：

1. 元asset/positionを維持し、B12の既存overlayを再現。新しい画像加工・新素材に置換しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / #cw-scene-base::after
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-board
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / #cw-scene

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Render background

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E03 場の帯の線・透明度

対象：場通常／予測／ドラッグ。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| border0、e9eed81a、radius8 | Panelで1px線、e9eed833、radius6 |

影響：場を示す面が濃く、囲いが増える。

修正・解消条件：

1. 元の0px線・alpha1a・角8に一致させる。ドラッグ可否枠とは別層。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / #cw-scene-base::after
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-board
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / #cw-scene

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / Panel(24,380,1872,248)

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E04 札面の角・線と絵面gradient

対象：手札／場／ドラッグ。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 1px線と角6/7、150deg gradient | 角なし2px線＋c9d8c5単色。下captionPanelだけ角6 |

影響：札の内側線・上下の結合・面が異なる。

修正・解消条件：

1. B10の同じ描画部品で上下をclipし、外形・gradient・線を復元。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-hand-card/.cw-slot/.cw-illustration/.cw-attr
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-card-face/.cw-face-caption

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / MakeTile / CardTile._Draw

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E05 札・主体の図記号をUnicode置換

対象：札効果／地形／能力／予約。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本Lucide/既存svg。strokeと各20px等を固定 | ↗、◇、⌖、♡、◒、ϟ、≋、△をfont文字として描く |

影響：記号の形・太さ・baseline・欠字時の意味が変わる。

修正・解消条件：

1. 新規iconを制作せず既存SVGを資源として再利用し、B10/B11の寸法へ。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-hand-card/.cw-slot/.cw-illustration/.cw-attr
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-card-face/.cw-face-caption

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / ActorSymbol/CardSymbol/EffectLine

比較画像：[exploration.png](evidence/reference/exploration.png)、[review-prediction-defense_support-R03-self-and-actors.png](evidence/implementation/final-records/review-prediction-defense_support-R03-self-and-actors.png)、[review-prediction-guard-R03-self-and-actors.png](evidence/implementation/final-records/review-prediction-guard-R03-self-and-actors.png)、[review-prediction-attack-R03-self-and-actors.png](evidence/implementation/targeted-first/review-prediction-attack-R03-self-and-actors.png)、[review-prediction-heal-R03-self-and-actors.png](evidence/implementation/targeted-first/review-prediction-heal-R03-self-and-actors.png)、[review-prediction-place-R03-self-and-actors.png](evidence/implementation/targeted-first/review-prediction-place-R03-self-and-actors.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E06 属性badgeの枠を欠く

対象：手札／場／予測。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 16/24、1px枠、角4、左右4px | 属性英字だけのLabel |

影響：属性と数値や本文の区切りが薄れる。

修正・解消条件：

1. B10のbadgeを共用し、札の下段の行高を保つ。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-hand-card/.cw-slot/.cw-illustration/.cw-attr
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-card-face/.cw-face-caption

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / MakeTile attr

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E07 空の場札のcaption高さ

対象：場の未配置属性。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本empty cw-slotは下端に属性の短いcaption、通常札のtitle空白を作らない | emptyでも88pxから120pxの白Panelを作る |

影響：空の場所に札本文の白い余白が大きく現れる。

修正・解消条件：

1. 空slotを元のempty構造へ。実札の共通面は変更しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-hand-card/.cw-slot/.cw-illustration/.cw-attr
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-card-face/.cw-face-caption

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / MakeTile empty

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E08 予測／消費ラベルの位置と背景

対象：予測札／使用後に場から離れる札。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 右上4px、paper背景、padding6、radius3 | 左上4px、背景なしのLabel240×24 |

影響：絵の記号と状態文が重なりやすい。

修正・解消条件：

1. B13の右上badgeへ移す。captionの48/24/28行を動かさない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-field-change
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/layout/render
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / #cw-relations
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-action-anchor

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / MakeTile forecast/consumed

比較画像：[review-safety-consume-R01-after-drop.png](evidence/implementation/final-details/review-safety-consume-R01-after-drop.png)、[review-prediction-place-R03-self-and-actors.png](evidence/implementation/targeted-first/review-prediction-place-R03-self-and-actors.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E09 離れる場札の警告色

対象：消費・回収される場札。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| data-changedはdanger943c25枠、予測と区別 | consumedをCardTile._Drawが見ない。linked315849緑枠だけになる |

影響：残る札と離れる札の視覚差が弱い。

修正・解消条件：

1. 元data-changedとlinkedの重なり順を再現し、消滅/共通回収の意味はR03の公開値で保持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-field-change
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/layout/render
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / #cw-relations
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-action-anchor

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / CardTile._Draw / consumed

比較画像：[review-prediction-guard-R03-self-and-actors.png](evidence/implementation/final-records/review-prediction-guard-R03-self-and-actors.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E10 主体と本人のバーを横2本へ変更

対象：敵／地形／本人／予測差分。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 余力・隠蔽の全幅バーを上下4px＋2pxgap＋4px、後者.6 | 左右半幅に各4pxバーを1段で配置。後者のopacityなし |

影響：能力表示の行構造そのものが違う。

修正・解消条件：

1. R03で追加した差分値を保ち、B11の上下バーと18px能力行へ戻す。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-actor/.cw-illustration
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-actor/.cw-vital-bars/.cw-self
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / .cw-actor[aria-pressed]/.cw-vital-bars

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.ReviewFixes.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.ReviewFixes.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `5a4eb0f97423929d8b90f17d90b3cd78534e8d0e` / ActorVitals

比較画像：[exploration.png](evidence/reference/exploration.png)、[review-prediction-guard-R03-self-and-actors.png](evidence/implementation/final-records/review-prediction-guard-R03-self-and-actors.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E11 主体の通常枠・選択枠・hover

対象：未選択／選択／hover主体。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 通常枠transparent、選択2px内側＋target記号＋softcaption | 通常bac9ba1px枠、選択3px、targetmarkなし。hoverはButton共通の紙面色 |

影響：選択対象と絵の抜けが原本と違う。

修正・解消条件：

1. 主体固有の通常/hover/selected themeを作りB11へ。既存diverの282×176/上8は維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-actor/.cw-illustration
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-actor/.cw-vital-bars/.cw-self
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / .cw-actor[aria-pressed]/.cw-vital-bars

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / ExplorationScreen actor Button

比較画像：[exploration.png](evidence/reference/exploration.png)、[review-prediction-guard-R03-self-and-actors.png](evidence/implementation/final-records/review-prediction-guard-R03-self-and-actors.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E12 本人帯の幅・内容密度

対象：探索本人帯。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| self400px、手札18px、既存の公開補助情報の位置 | self410px、手札20pxに山札枚数と共通回収枚数を連結。右撤退も固定110 |

影響：最下帯の余白と情報階層が変わる。

修正・解消条件：

1. B11のself400と原本footer-state構造を再現。追加公開情報は原本の山札／状況入口で扱い、未承認の帯拡張を残さない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-actor/.cw-illustration
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-actor/.cw-vital-bars/.cw-self
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / .cw-actor[aria-pressed]/.cw-vital-bars

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / footer / ActorVitals

比較画像：[exploration.png](evidence/reference/exploration.png)、[natural-exploration.png](evidence/implementation/targeted-third/natural-exploration.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E13 札の下の操作枠を固定拡張

対象：手札選択。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 56高、18px、padding16、内容幅、gap8、選択札に追従するtrack | 予測132px/16pxと実行250px/20px、y920固定 |

影響：短い述語にも過大な枠が付き、元札の真下との対応が変わる。

修正・解消条件：

1. 原本layoutのanchor/trackを再現し、表示文言ごとの実幅を算出。最右札でも画面内に収める。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-field-change
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/layout/render
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / #cw-relations
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-action-anchor

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / preview/play / UpdateDragGhost

比較画像：[review-order-tie-R05-order-strip.png](evidence/implementation/targeted-second/review-order-tie-R05-order-strip.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E14 関係線が直線矢印へ変わる

対象：選択／一致／設置予測。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 縦端点同士をcubicBezier、stroke2、opacity.5、原本は線のみ | 中心方向の直線と20px矢頭、stroke4、不透明Gold |

影響：線の太さと流れが変わり他の札にかかる。

修正・解消条件：

1. drawRelationsの可視範囲clip・端点・curve・stroke・alphaを共用描画へ移す。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-field-change
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/layout/render
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / #cw-relations
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-action-anchor

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / PaintInteraction Arrow

比較画像：[review-prediction-guard-R03-self-and-actors.png](evidence/implementation/final-records/review-prediction-guard-R03-self-and-actors.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-E15 行動順の顔・余白・次のbadge

対象：通常／同時刻／本人次回。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 40pxボタン、16gap、同群2gap、次はsoft背景と底2px | 44pxボタン、群ごとcount×54+110、gap12、次は14px白文字のみ。diverは36px contain |

影響：同時刻や本人次回の空間的なまとまりが異なる。

修正・解消条件：

1. R05のgroup/順位計算は維持しB14の原本部品へ表示。白地に白い次ラベルを残さない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-turn-order
- [docs/検証/UI/readability/co-u02/journey/consistency.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/consistency.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `263e8808358db4abd57999f8351a738a734ba388` / .cw-turn-group/[data-self-next]
- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-turn-face
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / turnFace/render

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / OrderStrip

比較画像：[exploration.png](evidence/reference/exploration.png)、[review-order-different-R05-order-strip.png](evidence/implementation/targeted-second/review-order-different-R05-order-strip.png)、[review-order-tie-R05-order-strip.png](evidence/implementation/targeted-second/review-order-tie-R05-order-strip.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W01 探索詳細の文字・表組・余白

対象：札／主体／予測／予約詳細。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 64header、16padding、20見出し、18/1.6本文、ledgerでラベル値整列 | headerの見出し22/27、本文22、x20/y82、内容をLongTextに連結 |

影響：同じ情報でも一画面に入る量と探しやすさが違う。

修正・解消条件：

1. ItemText/PredictionSummaryは公開値の供給に留め、原本ledger/見出し/別段落を実部品で再現する。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeEdgeWindow/placeActorWindow
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / layout/renderDrawer
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-drawer

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / DetailWindow / ItemText

比較画像：[review-prediction-defense_support-R03-prediction-top.png](evidence/implementation/final-records/review-prediction-defense_support-R03-prediction-top.png)、[review-prediction-defense_support-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-defense_support-R04-hand-detail.png)、[review-prediction-guard-R03-prediction-top.png](evidence/implementation/final-records/review-prediction-guard-R03-prediction-top.png)、[review-prediction-guard-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-guard-R04-hand-detail.png)、[review-prediction-attack-R03-prediction-top.png](evidence/implementation/targeted-first/review-prediction-attack-R03-prediction-top.png)、[review-prediction-heal-R03-prediction-top.png](evidence/implementation/targeted-first/review-prediction-heal-R03-prediction-top.png)、[review-prediction-place-R03-prediction-top.png](evidence/implementation/targeted-first/review-prediction-place-R03-prediction-top.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W02 pinと閉じるの形

対象：一時／固定詳細。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| pin SVG、56×56、固定はactive背景。close56×56 | 60×48の「固定／一時」文字ボタンと48×48の× |

影響：固定状態と閉じるの共通操作部品が変わる。

修正・解消条件：

1. B15のicon状態表現と同じ高さへ。機能のtoggle・180/160msは維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeEdgeWindow/placeActorWindow
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / layout/renderDrawer
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-drawer

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / PinButton

比較画像：[review-prediction-defense_support-R03-prediction-top.png](evidence/implementation/final-records/review-prediction-defense_support-R03-prediction-top.png)、[review-prediction-defense_support-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-defense_support-R04-hand-detail.png)、[review-prediction-guard-R03-prediction-top.png](evidence/implementation/final-records/review-prediction-guard-R03-prediction-top.png)、[review-prediction-guard-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-guard-R04-hand-detail.png)、[review-prediction-attack-R03-prediction-top.png](evidence/implementation/targeted-first/review-prediction-attack-R03-prediction-top.png)、[review-prediction-heal-R03-prediction-top.png](evidence/implementation/targeted-first/review-prediction-heal-R03-prediction-top.png)、[review-prediction-place-R03-prediction-top.png](evidence/implementation/targeted-first/review-prediction-place-R03-prediction-top.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W03 窓の面と影・区切り

対象：探索詳細／予測。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| cw-paper、元の1px線、角8、shadow、header境界 | fcfcf5faのPanel、角6、shadowとheader境界なし |

影響：背景への抜け・窓の輪郭が一致しない。

修正・解消条件：

1. B15とstyle-sourceの最終drawer指定をテーマで再現。本文だけ別白面を重ねない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeEdgeWindow/placeActorWindow
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / layout/renderDrawer
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-drawer

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Panel/Box / RenderModal prediction

比較画像：[review-prediction-defense_support-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-defense_support-R04-hand-detail.png)、[review-prediction-guard-R04-hand-detail.png](evidence/implementation/final-records/review-prediction-guard-R04-hand-detail.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W04 反対端窓の座標系・縦基準

対象：左／右／中央の札・主体・予測。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本uiSpaceの内側寸法とanchor.y、bottom本人帯上端を用いたplaceEdgeWindow | root1920へ直置きし中心Y−104、bottom984固定。主体はroot座標16 |

影響：方角は継承しても1pxの端や行位置がずれる。

修正・解消条件：

1. アルゴリズムをB15そのまま移植し、手札/場/主体の左右・中央・端clampを同じ座標表で確認。新しい縦配置案は作らない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeEdgeWindow/placeActorWindow
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / layout/renderDrawer
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-drawer

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Preparation.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `856d0e7f6f50419515849c604a115afe350b52ef` / DetailWindow x/y

比較画像：[review-safety-consume-R01-after-drop.png](evidence/implementation/final-details/review-safety-consume-R01-after-drop.png)、[review-safety-doomed-R01-after-drop.png](evidence/implementation/final-details/review-safety-doomed-R01-after-drop.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W05 共通窓・親子窓が固定座標

対象：メニュー／記録／設定／本文履歴。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| triggerと上下帯からplaceWindow、親位置を保ったpair520×480/gap16 | menu1384,80、settings700,300、knowledge424,300と960,300等を固定 |

影響：開く元による一貫した配置規則を失う。

修正・解消条件：

1. B16の元anchor/avoid/parent計算を共用化。各窓別の思いつき座標にしない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/view.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/view.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `545ef955a851397c0c1e91b4be23bee0bae50c3b` / layoutPanels
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeWindow/placeWindowPair
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / panelView
- [docs/検証/UI/readability/co-u02/journey/records.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/records.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `ea11b45e9ed543ba282fc2a26bcc52e0b48c1e94` / recordsPanelView/recordedCards
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-inspect-*

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / MenuWindow/SettingsWindow/KnowledgeWindow

比較画像：[natural-known-catalogue.png](evidence/implementation/targeted-third/natural-known-catalogue.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W06 記録タブ・列・区分を省略

対象：調査記録一覧／判明／未判明。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 相手・環境／札タブ、対象の判明状態、札/属性/初期枚数table、観測区分・獲得記録 | タブなし。対象ボタン一覧→札名×枚数のボタン列。公開reward_key/labelも描画しない |

影響：判明済みの札や記録の分類を辿る構造が後退。

修正・解消条件：

1. 元records.jsの構造を復元。public viewにあるencounters/evidence/profileを使う。run/actor別区分が不足する場合は必要な公開項目と旧契約を特定して同D04Bで処置し、推定分類を作らない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/view.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/view.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `545ef955a851397c0c1e91b4be23bee0bae50c3b` / layoutPanels
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeWindow/placeWindowPair
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / panelView
- [docs/検証/UI/readability/co-u02/journey/records.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/records.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `ea11b45e9ed543ba282fc2a26bcc52e0b48c1e94` / recordsPanelView/recordedCards
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-inspect-*

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / KnowledgeWindow

比較画像：[natural-known-catalogue.png](evidence/implementation/targeted-third/natural-known-catalogue.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：要修正＋公開境界の区分根拠はU-RC04（追加N02）。解消証拠：未提出。

## V-W07 記録札詳細で直前の親が消える

対象：基本構成→札詳細。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 直前の対象構成を左、札詳細を右。元の選択・scroll保持 | Modal=knowledge-cardで中央520×480の一窓のみ描き、構成paneを消す |

影響：元の札の並びと詳細を見比べられない。

修正・解消条件：

1. 元recordsPanelViewのsource＋childを同時表示。戻るで元のscroll・選択を保ち、親を覆わない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/view.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/view.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `545ef955a851397c0c1e91b4be23bee0bae50c3b` / layoutPanels
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeWindow/placeWindowPair
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / panelView
- [docs/検証/UI/readability/co-u02/journey/records.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/records.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `ea11b45e9ed543ba282fc2a26bcc52e0b48c1e94` / recordsPanelView/recordedCards
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-inspect-*

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / RenderModal knowledge-card

比較画像：[review-prediction-defense_support-R04-record-top.png](evidence/implementation/final-records/review-prediction-defense_support-R04-record-top.png)、[review-prediction-guard-R04-record-top.png](evidence/implementation/final-records/review-prediction-guard-R04-record-top.png)、[natural-known-card.png](evidence/implementation/targeted-third/natural-known-card.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：要修正（追加N02の親子表示）。解消証拠：未提出。

## V-W08 メニューが2列から縦1列へ

対象：各画面メニュー。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 2列×56px、必要時だけ既存pager | 全幅456×54の縦列＋内部scroll＋下の終了。探索メニューは長くスクロールする |

影響：同じ項目でも到達操作と密度が変わる。

修正・解消条件：

1. B16の2列と共通操作位置を復元。Windowsの終了は同じ共通部品へ割当し、既存項目を重複させない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/view.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/view.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `545ef955a851397c0c1e91b4be23bee0bae50c3b` / layoutPanels
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeWindow/placeWindowPair
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / panelView
- [docs/検証/UI/readability/co-u02/journey/records.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/records.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `ea11b45e9ed543ba282fc2a26bcc52e0b48c1e94` / recordsPanelView/recordedCards
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-inspect-*

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / MenuWindow

比較画像：固定追補に該当画面なし。ソースで差を確定し、状態一覧のUで実描画を要求。

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-W09 表示・操作設定の元UIを省略

対象：表示設定／探索操作設定。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 表示は「動きを抑える」checkbox、探索設定は元操作項目と選択部品 | 同じSettingsWindowに長文トグルButton5個。動きを抑えるがない |

影響：機能の入口が重複し、元の設定が辿れない。

修正・解消条件：

1. 共通表示と探索操作の元項目・部品を対応づけて復元。既存Godot操作設定は必要性と元の対応を明記する。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / SettingsWindow

比較画像：固定追補に該当画面なし。ソースで差を確定し、状態一覧のUで実描画を要求。

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：要修正（追加N03：動きを抑えるの欠落）。解消証拠：未提出。

## V-W10 山札・履歴・案内を単一本文へ

対象：山札／履歴／目的／状況／遊び方。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本の表・記号・見出し、18/1.6と親子導線 | DeckWindow以外はLongText、履歴も改行文。汎用窓に黒.6暗幕、原本非modal窓と異なる |

影響：情報の比較・閲覧中の周辺確認が変わる。

修正・解消条件：

1. 各元panelView/renderDrawerの既存表組と非遮断窓を再現。確認が必要な破壊操作だけ元契約に従う。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/view.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/view.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `545ef955a851397c0c1e91b4be23bee0bae50c3b` / layoutPanels
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeWindow/placeWindowPair
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / panelView
- [docs/検証/UI/readability/co-u02/journey/records.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/records.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `ea11b45e9ed543ba282fc2a26bcc52e0b48c1e94` / recordsPanelView/recordedCards
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-inspect-*

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / RenderModal generic

比較画像：[natural-known-card.png](evidence/implementation/targeted-third/natural-known-card.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-H01 探索先の詳細が題名から離れる

対象：探索先通常／再訪。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 左40幅840のsummary内、h2と詳細がflex隣接gap8 | 題名x40,w760、詳細x824固定。短い題名でも大きく離れる |

影響：ボタンの対象を位置で伝える構造が崩れる。

修正・解消条件：

1. 原本summary/headingの内容幅とgapを再現。全文言違いは比較条件で分離。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/backdrop.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/backdrop.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5b12ccec4b6f9bdd2c47ed604dccdbef2b524f73` / .cj-backdrop::after/.cj-reading-scroll
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-*
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-destination-summary/.cj-reading-*
- [docs/検証/UI/readability/co-u02/journey/save-flow.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/save-flow.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `1cd87ae6b08f7ad4827c9e28392ac118df27f888` / .cj-launch-*
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / hubView/returnView/sceneView

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / HomeScreen

比較画像：[natural-known-catalogue.png](evidence/implementation/targeted-third/natural-known-catalogue.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-H02 本文・帰還背景のgradientを近似

対象：本文／探索先／帰還。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 原本の0deg/90deg多stopと本文自身の90deg gradient | ReadingBackdropの単純2本fadeと固定上下64Panel。SceneReaderでも再度ReadingBackdropを重ねる |

影響：背景の濃さと本文背後の面が場面ごとに変わる。

修正・解消条件：

1. B17のstop/color/適用範囲をそのまま再現。二重適用をなくし、既存画像は変更しない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/backdrop.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/backdrop.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5b12ccec4b6f9bdd2c47ed604dccdbef2b524f73` / .cj-backdrop::after/.cj-reading-scroll
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-*
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-destination-summary/.cj-reading-*
- [docs/検証/UI/readability/co-u02/journey/save-flow.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/save-flow.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `1cd87ae6b08f7ad4827c9e28392ac118df27f888` / .cj-launch-*
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / hubView/returnView/sceneView

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / ReadingBackdrop / SceneReader

比較画像：[natural-return-clear.png](evidence/implementation/targeted-third/natural-return-clear.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-H03 帰還要約の文字階層

対象：踏破／撤退／緊急脱出。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 金額32px Georgia/serif、labelと総額を分離、結果items18px、gap8 | 全要約を24pxの改行Label(x24,y812,w890,h132)へ。記号・金額の強弱がない |

影響：獲得と回復と記録が同じ強さになり要約しにくい。

修正・解消条件：

1. B17のresult-values/money/itemsを部品化。新しい結果情報も元の役割へ対応づける。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/backdrop.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/backdrop.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5b12ccec4b6f9bdd2c47ed604dccdbef2b524f73` / .cj-backdrop::after/.cj-reading-scroll
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-*
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-destination-summary/.cj-reading-*
- [docs/検証/UI/readability/co-u02/journey/save-flow.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/save-flow.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `1cd87ae6b08f7ad4827c9e28392ac118df27f888` / .cj-launch-*
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / hubView/returnView/sceneView

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / ReturnScreen

比較画像：[natural-return-clear.png](evidence/implementation/targeted-third/natural-return-clear.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-H04 本文窓の内面・余白・行間

対象：進行本文／任意本文／帰還本文。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| reading padding24、20px/1.7、原本の最大幅と高さ、境界なしのgradient | Panelの一様alpha紙面、内側x24,y20、幅792高さ320、line_spacing10で代用 |

影響：文字の改行と読み終わり位置が変わる。

修正・解消条件：

1. 原本prose-layoutとCSS最終値を同じ文言で実測し、幅/line-height/段落gapを一致。可視段落記録の境界は壊さない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/backdrop.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/backdrop.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5b12ccec4b6f9bdd2c47ed604dccdbef2b524f73` / .cj-backdrop::after/.cj-reading-scroll
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-*
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-destination-summary/.cj-reading-*
- [docs/検証/UI/readability/co-u02/journey/save-flow.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/save-flow.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `1cd87ae6b08f7ad4827c9e28392ac118df27f888` / .cj-launch-*
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / hubView/returnView/sceneView

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / SceneReader/StoryReader

比較画像：[natural-return-clear.png](evidence/implementation/targeted-third/natural-return-clear.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-H05 開始画面の配置と書体

対象：新規／続き／読込み前。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 中心28px serifのcrossweave、操作は下64px帯 | 左上72pxタイトル、y630/y730へ開始・再開・診断を固定 |

影響：本編だけ別の画面構造になる。

修正・解消条件：

1. 共通shellと元launcherの位置・文字を再現。Windows固有の復旧操作は元共通窓の部品へ割当し、見た目の例外扱いにしない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/backdrop.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/backdrop.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5b12ccec4b6f9bdd2c47ed604dccdbef2b524f73` / .cj-backdrop::after/.cj-reading-scroll
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-*
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-destination-summary/.cj-reading-*
- [docs/検証/UI/readability/co-u02/journey/save-flow.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/save-flow.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `1cd87ae6b08f7ad4827c9e28392ac118df27f888` / .cj-launch-*
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / hubView/returnView/sceneView

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / StartScreen

比較画像：固定追補に該当画面なし。ソースで差を確定し、状態一覧のUで実描画を要求。

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-S01 通知・保存中表示の位置

対象：保存中／失敗／古い応答／再試行。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 共通通知はtop72中央、18px、警告面と影。取得通知top76左右24 | Message x24,y66,w1540,h50 font19、Busyはx1230のヘッダー文字 |

影響：失敗・処理中の案内位置と余白が画面ごとに変わる。

修正・解消条件：

1. B19の通常通知と取得noticeへ統一。保存の成否・retry/reloadの契約は維持し、通常セーブでは試さない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-scroll/.cj-status
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-runtime-notice/.cp-button:disabled
- [docs/検証/UI/readability/co-u02/journey/fixed-screen.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/fixed-screen.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `d780db5987f64a052616f4d6226c62911e96fd89` / .cj-status
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-scroll/button:disabled

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Render Message/Busy

比較画像：固定追補に該当画面なし。ソースで差を確定し、状態一覧のUで実描画を要求。

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-D01 受入先枠・ラベルを全列へ広げる

対象：ドラッグ可／不可。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| pointer下の1列にallowed実線2／blocked破線1、ヘッダー全幅の短い述語 | 全dropZonesを可否色で囲む、hover4/非hover2、不可は赤実線。labelは白い短い箱で見出し左上に重なる |

影響：どの領域が現在の移動先なのかと操作名が原本と異なる。

修正・解消条件：

1. R06の判定共用は保ちB18の見た目に置換。labelを取得／取得・編成／編成／外す／取消へ戻す。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.ReviewFixes.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.ReviewFixes.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `5a4eb0f97423929d8b90f17d90b3cd78534e8d0e` / PaintDropTargets

比較画像：[review-destination-R06-owned-cancel-denied.png](evidence/implementation/final-caption/review-destination-R06-owned-cancel-denied.png)、[review-destination-R06-pending-cancel-allowed.png](evidence/implementation/final-caption/review-destination-R06-pending-cancel-allowed.png)、[review-preparation-R07-drag-denied.png](evidence/implementation/final-caption/review-preparation-R07-drag-denied.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-D02 ドラッグ元と像の透明度・影

対象：取得ドラッグ／探索ドラッグ。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 取得元opacity.3、ghost原寸＋影、不可.75。探索は元部品の指定を保持 | ghostを一律.88、元はfadeせず、影なし。元と像が同じ強さで残る |

影響：掴んだ個体と残る個体の区別が弱くなる。

修正・解消条件：

1. B18の元/ghost/不可を独立した状態として再現。grabOffsetと原寸を維持。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Components.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Components.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `e00e51d508e0ef1d1c86e4a41604bcf73458ae9c` / UpdateDragGhost

比較画像：[review-destination-R06-pending-cancel-allowed.png](evidence/implementation/final-caption/review-destination-R06-pending-cancel-allowed.png)、[review-destination-field-R06-field-edge-scroll.png](evidence/implementation/final-caption/review-destination-field-R06-field-edge-scroll.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-D03 ホールドcueの形と位置

対象：120〜220ms保持中。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| pointer(+20,-20)の32px進捗環、下34pxの12/18ラベル、背景・影・mask | pointer(+36,0)へ半径16の3px線arc、右24pxへ18px文字、ラベル背景なし |

影響：通常クリック後の見え方・指示の位置・読める背景が変わる。

修正・解消条件：

1. delay120/hold220は保ち、元のcue形/位置/labelを再現。短クリック非表示・途中・成立・取消の連続証拠を付ける。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / PaintInteraction hold cue

比較画像：固定追補に該当画面なし。ソースで差を確定し、状態一覧のUで実描画を要求。

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-D04 端送り速度と閾値

対象：保持中の取得列／手札→場。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 取得edge22/step7、探索edge64/step16（原本の論理倍率補正） | 取得24/9、探索50/10で毎frame送り |

影響：同じ入力でも送り開始位置と移動量が変わる。

修正・解消条件：

1. R06の移動先・領域外停止を保ち、原本の閾値/速度単位を移植。frame時間と倍率を記録して限定確認する。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `aed3f9ca40af7ef716fc9b1c083878908456fa79` / AutoScroll

比較画像：[review-destination-R06-destination-scroll.png](evidence/implementation/final-caption/review-destination-R06-destination-scroll.png)、[review-destination-field-R06-field-edge-scroll.png](evidence/implementation/final-caption/review-destination-field-R06-field-edge-scroll.png)

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。

## V-D05 移動・イベントの表示タイミング

対象：取得移動／操作後履歴／動きを抑える。判定：**不一致・修正必要**。個別承認：なし。

| 合意案の期待 | 固定本編の現在 |
|---|---|
| 取得移動200ms ease-out、探索の元live-eventと減衰、抑制設定 | Renderは全childを再生成。取得移動アニメーションと同じlive-event層がない |

影響：同じ状態遷移の追いやすさが変わる。

修正・解消条件：

1. 元の表示タイミングを共通部品へ移植。減動時分岐と通常分岐の短い動画／連続フレームを保存し、実行・保存回数は変えない。
2. 同一公開状態・文言・FHD倍率で原本／修正Godotの全画面と対象部品を再比較し、このIDへ解消証拠を結ぶ。

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

本編：

- [apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs](https://github.com/eckolo/crossweave/blob/6168d2ac7ad66d8e707c51f2f3d7bf14fa123531/apps/crossweave-godot/Godot/Application/GameScreen.Layout.cs) — `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531` / blob `6fdf977b80348c818b44d709b8252f6e0b304345` / Render remove/rebuild

比較画像：固定追補に該当画面なし。ソースで差を確定し、状態一覧のUで実描画を要求。

担当：20260927-game-application / D04B-UI-02。再判定：20260910-ui-readability / UI-GODOT-REVIEW-01。機能との関係：既存機能の適合と別判定。解消証拠：未提出。
