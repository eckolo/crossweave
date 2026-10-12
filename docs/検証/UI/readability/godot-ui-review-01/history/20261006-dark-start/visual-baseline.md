# 外観基準

版：2026-10-04.1／2026-10-04（UTC）。原本 `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2`、本編実装・証拠 `6168d2ac7ad66d8e707c51f2f3d7bf14fa123531`、提出 `0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6`。

位置は論理FHD px。宣言値、画像実測、未確認を分ける。値を本編の都合で丸めない。CSSのcascadeとselectorによる状態差は[style-source.json](style-source.json)が原本。取得の埋込み最終層・data-display=fhdを適用する。

## B01 FHD座標系

適用：全M1画面。了承：A01・A02。

| 属性 | 原本値 |
|---|---|
| logical | [1920, 1080] |
| external_scale | 全体の一様縮小のみ。内部再flow・密度変更なし |
| journey_shell_border | 1px、内側1918×1078 |
| exploration_rows | [336, 248, 314, 72] |
| outer_padding | 24 |
| row_gap | 20 |
| game_page_scroll | false |

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-shell / .cw-explore
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / embedded .cp-shell
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / uiSpace/uiRect

## B02 書体と文字役割

適用：全M1画面・全共通部品。了承：A01・A02・A03。

| 属性 | 原本値 |
|---|---|
| family | system-ui, sans-serif（取得はsystem-ui,-apple-system,"Noto Sans JP",sans-serif） |
| strong_weight | 500 |
| acquisition | {"root": "24px/1.5", "title": "20px/24px,2行", "meta": "18px/20px", "action": "20px", "header": "24px", "footer": "22px"} |
| exploration | {"root": "18px/1.4", "card_title": "18px/24px,2行", "actor_title": "20px/28px", "stats": "18px/24px", "delta": "16px/22px"} |
| detail | {"heading": "20px/28px", "body": "18px/1.6", "minor": "16px"} |
| navigation | 400 18px/24px |
| story | 20px/1.7 |
| return_money | 400 32px/1.2 Georgia,serif |
| resolved_font | 未記録。U-C01で実解決fontとAAを採取する |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / font / strong / cp-piece
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / font-size / line-height
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-money
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / .cw-common-nav

## B03 色の名前空間

適用：全画面・札・窓。了承：A01・A02・A03。

| 属性 | 原本値 |
|---|---|
| acquisition_light | {"ink": "#243d35", "muted": "#586e63", "line": "#bac9ba", "paper": "#fcfcf5", "active": "#315849", "on_active": "#fffef5", "surface": "#f1f1e8", "reserve": "#e8eddf", "build": "#dce6d2"} |
| exploration_light | {"ink": "#263c32", "line": "#acbdad", "paper": "#f7f8f4", "soft": "#e9eee4", "selected": "#345747", "on_selected": "#ffffff", "danger": "#943c25"} |
| common_nav_light | {"paper": "#f2f5e9", "ink": "#294133", "line": "#a8b9a5"} |
| dark | 各light-dark()の第2値をstyle-source.jsonに全保存。M1での採否・描画をU-C02で確認。黙ってlight固定へ変えない |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / #cw-acquisition-review
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / #cw-playtable → .cw-explore
- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / .cw-common-nav>button

## B04 共通ナビ／戻る／閉じる

適用：開始前を除く全画面。了承：A03。

| 属性 | 原本値 |
|---|---|
| records | [1680, 4, 152, 56] |
| menu | [1840, 4, 56, 56] |
| right_margin | 24 |
| gap | 8 |
| icon | [20, 20] |
| radius | 5 |
| border | 1 |
| back | 左上。embedded取得のmin-width96,height56,font18 |
| close | 各窓右上。探索56×56、取得64pxヘッダー内 |
| icons | 既存Lucide book-open/menu/arrow-left/x。Unicodeで代替しない |

原本：

- [docs/検証/UI/readability/co-u02/common-navigation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b372e359a63ad02747d0f41500cbd6d1006b5f6b` / .cw-common-nav / embedded .cp-header
- [docs/検証/UI/readability/co-u02/common-navigation.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/common-navigation.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `af0835bc652851bca5507415b61a3ace8e3eac16` / commonNavigationHTML
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer>header / .cj-inspect-top

## B05 取得三領域

適用：札・心得取得編成。了承：A01・A04。

| 属性 | 原本値 |
|---|---|
| header_height | 64 |
| footer_height | 64 |
| main_padding | 16 |
| lane_widths | [376, 735, 735] |
| lane_gap | 20 |
| columns | [1, 2, 2] |
| heading_height | 32 |
| heading_grid_gap | 8 |
| grid_padding | 2 |
| grid_gap | 8 |
| tile | [352, 80] |
| header_outside_grid | true |
| reserve_grid | #e8eddf、左右1pxと底4pxのinset、底角8 |
| offer_grid | 底2px #bdb69a、全面を箱で囲まない |
| build_grid | #dce6d2、1px inset #b3c4a4、角6 |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / dimensions/lane
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-main/.cp-lane/.cp-lane-grid

## B06 取得札面／操作側

適用：取得可能／所持／編成、両分類、ドラッグ像。了承：A01。

| 属性 | 原本値 |
|---|---|
| outer | [352, 80] |
| border | 2px #bac9ba / build #58754a |
| radius | 5 |
| grid_rows | 76 |
| action_width | 72 |
| action_height | 76 |
| action_inner_offset | 2px枠内 |
| title_padding | [4, 8] |
| title_rows | [48, 20] |
| meta_gap | 6 |
| action_background | 取得・編成 #315849、外す #f5f7ee／文字ink |
| quantity | メタ行右端 |
| symbols | layers/scroll-text/check/lightbulb/grid-2x2等、18px |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-piece/.cp-build/.cp-item-actions
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/localAction

## B07 未払い・空・無効

適用：未払い／取消／不足／取得後／候補なし／空編成。了承：A01・A04・A05。

| 属性 | 原本値 |
|---|---|
| pending_border | 2px dashed #846838 |
| pending_hatch | 135deg #faf8ed 0..8px, #f1ebd7 8..10px |
| pending_clock | 右6px下4px、18px時計、紙色丸背景 |
| moved_offer | 同寸法のarrow-right中心＋底3px #c4c2ac、説明文章を加えない |
| empty_slot | 352×80、1px dashed、#e2e9d8、plus |
| empty_offer | 352×80、padding12、gap12、20px/28px、完了circle-check／候補なしinbox |
| disabled_opacity | 0.42 |
| hover | #e6eddf |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-pending/.cp-clock/.cp-empty/.cp-offer-message/.cp-button
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / card/lane/offerPhase

## B08 取得ヘッダーとフッター

適用：取得編成全状態。了承：A01・A04・A05。

| 属性 | 原本値 |
|---|---|
| tab | 64px高、borderなし、radius0、選択時active/on-active |
| wallet | lightbulb＋着想＋現在、変更後はclockを含む点線枠 |
| footer | 64px #e9eee0、上1px線、左右24px、戻すundo-2と確認する |
| track | 22px、未払いtokenのclock、群上限と取得完了を公開群に従って表示 |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-header/.cp-footer/.cp-wallet/.cp-purchase-track
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / wallet/purchaseTrack/render
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeTrack

## B09 取得詳細／一括確認窓

適用：取得詳細／編成のみ／心得のみ／混合一括確認／取消／エラー。了承：A01・A05。

| 属性 | 原本値 |
|---|---|
| rect | [480, 130, 960, 820] |
| rows | [64, "remaining", 72] |
| radius | 8 |
| border | 1px #bac9ba |
| surface | #f4f6ec |
| shadow | 0 10px 30px #0003 |
| overlay | #283d3555 |
| body | padding24、gap24、22px |
| facts | label112px、gap16、value残り |
| location | 取得可能→所持→編成の記号、active64×48、未払いclock |
| balance | 中央36px、gap14、価格と支払前後 |
| changes | 各行6px上下＋底1px、右に数量／取得先／価格 |
| capacity | 2列、gap12 |
| effects | 心得別summary＋条件・効果、既存の折畳み |
| footer | 支払額を固定表示、確定するmin160、高64、閉じるヘッダー右 |

原本：

- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-overlay/.cp-dialog/.cp-facts/.cp-review-wallet/.cp-change
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / reviewBody/renderDialog
- [docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `e5ec3ee26b45f0549919b125d8060069ea47a962` / runtimeReviewBody/runtimeItemFacts

## B10 探索の共通札面

適用：手札／場／予測／ドラッグ像。了承：A02。

| 属性 | 原本値 |
|---|---|
| tile | [248, 208] |
| gap | 16 |
| image_band | 88 |
| caption | {"height": 120, "padding": 6, "rows": [48, 24, 28], "gap": 4} |
| frame | hand1px,radius7 / 内面radius6。場1px,radius6。選択2px shadow、linked2px inset |
| image_gradient | 150deg #dfe4d3 → #95b2ab |
| paper | #f7f8f4 |
| icon_symbol_size | 64 |
| attr_badge | 1px currentColor、radius4、padding-inline4 |
| empty | 原本の空cw-slot（実カードcaptionとは別の空表示）を維持、札面の架空本文を作らない |

原本：

- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-hand-card/.cw-slot/.cw-illustration/.cw-attr
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-card-face/.cw-face-caption

## B11 主体と本人

適用：敵／地形／本人／選択／予測差分。了承：A02。

| 属性 | 原本値 |
|---|---|
| actor | [320, 248] |
| actor_gap | 24 |
| overscan_top | 8 |
| diver | [282, 176] |
| art_overlap | 絵の下がステータス帯に隠れる。新素材を描かない |
| terrain | triangle記号、64×64 stroke1.5、縮小背景を使わない |
| actor_caption | padding10, min-height116 |
| bars | 全幅4pxを上下2段、gap2、2段目opacity.6 |
| stats | 18px/24px、delta16px/22px |
| selected | 2px内側outline＋対象mark＋soft背景 |
| unselected | 背景・枠transparent |
| self | 400px幅、行24/10/24、最下帯72px内 |

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-actor/.cw-illustration
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-actor/.cw-vital-bars/.cw-self
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / .cw-actor[aria-pressed]/.cw-vital-bars

## B12 探索背景と場

適用：探索通常・予測・窓。了承：A02。

| 属性 | 原本値 |
|---|---|
| background | 既存night-tide素材coverと既存object-position、clip枠radius9 |
| foreground_wash | 上45%透明→下#e8edd933 |
| field_area | 248px高、border0、#e9eed81a、radius8 |
| image_source | 既存仮素材のblob固定。背景画風と潜水服の新規制作判断は今回しない |

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / #cw-scene-base::after
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-board
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / #cw-scene

## B13 場予測／消費／関係線／操作

適用：選択手札／予測の場／一致／消滅警告。了承：A02。

| 属性 | 原本値 |
|---|---|
| forecast | 通常札面と同じ内部、破線と＋予測 |
| state_label | 上4px右4px、paper背景、左右padding6、角3、最大幅calc(100%-8px) |
| consumed | data-changed danger枠、通常札面をずらさない |
| relations | stroke2、opacity.5、縦端点を結ぶcubicBezier、未表示札を突き抜けない |
| action | 札直下、56高、gap8、18px、padding16、内容に応じた幅。本人次回位置は既存表示部品へ |
| hand_life | 16px/24、今回までdanger、右端 |

原本：

- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-field-change
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/layout/render
- [docs/検証/UI/readability/co-u02/exploration.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `519f964cd71e9c9c3f19e77af7e7a6ad62c1123f` / #cw-relations
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-action-anchor

## B14 行動順

適用：通常予約／予測後／同時刻／別時刻／予約詳細。了承：A02。

| 属性 | 原本値 |
|---|---|
| strip_height | 56 |
| button | [40, 40] |
| row_gap | 16 |
| within_same_time_gap | 2 |
| font | 18 |
| now_font | 16 |
| self_next | #dfe8d8背景・底2px currentColor・次のラベル |
| actor_face | diver画像をcover 50% 20%、他は既存SVG |
| group | 公開atごと、同時刻の内部順序を断定しない |

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / #cw-turn-order
- [docs/検証/UI/readability/co-u02/journey/consistency.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/consistency.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `263e8808358db4abd57999f8351a738a734ba388` / .cw-turn-group/[data-self-next]
- [docs/検証/UI/readability/co-u02/art-assets/presentation.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/art-assets/presentation.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bc565104ec104c0283119166a6501c801f3bc5bd` / .cw-turn-face
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / turnFace/render

## B15 詳細／予測窓

適用：主体／手札／場／予測札／一時予測／固定窓。了承：A02。

| 属性 | 原本値 |
|---|---|
| card | [520, 480] |
| actor | [416, 384] |
| margin | 16 |
| horizontal | uiSpace()内幅の左半分→右端、右半分→左端。真中は右半分 |
| actor_top | 16 |
| card_top | anchor.yをbottom(本人帯上端)−margin−heightでclamp。現在の場縦位置は原本を維持 |
| header | 64 |
| body_padding | 16 |
| body_font | 18px/1.6 |
| pin | 56×56 icon、固定時active、解除で一時 |
| paper | #f7f8f4、1px #acbdad、radius8、元のshadow |
| structured_body | ledger / effects / reservations等。単一の改行Labelへ平坦化しない |

原本：

- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeEdgeWindow/placeActorWindow
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-drawer
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / layout/renderDrawer
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-drawer

## B16 共通窓／親子／メニュー

適用：メニュー／記録／本文履歴／遊び方／表示／保存案内／山札／履歴。了承：A02・A03。

| 属性 | 原本値 |
|---|---|
| single | [520, 480] |
| pair | {"each": [520, 480], "gap": 16, "margin": 16, "rule": "placeWindowの元窓を可能な限り維持、子で元を覆わない"} |
| header | 64 |
| body_padding | 16 |
| body_font | 18px/1.6 |
| menu | 2列、56pxボタン、(480−144)/56=6行×2。溢れた時は既存ページ操作 |
| records | 相手・環境／札タブ、対象名・判明状態・版本・今回を分離、3列table（札／属性／初期枚数）、直前の親を隣に残す |
| shared_positions | anchorは実UI要素、上下64帯を避ける。全窓を中央固定に置き換えない |

原本：

- [docs/検証/UI/readability/co-u02/journey/view.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/view.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `545ef955a851397c0c1e91b4be23bee0bae50c3b` / layoutPanels
- [docs/検証/UI/readability/co-u02/window-placement.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/window-placement.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `eb09a8018a078bea3f8139f7b484bc514a10eca7` / placeWindow/placeWindowPair
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / panelView
- [docs/検証/UI/readability/co-u02/journey/records.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/records.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `ea11b45e9ed543ba282fc2a26bcc52e0b48c1e94` / recordsPanelView/recordedCards
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-inspect-*

## B17 本文／探索先／帰還

適用：開始／探索先／本文／帰還／任意本文。了承：A02・A03・A05・A06。

| 属性 | 原本値 |
|---|---|
| header_footer | 64 |
| destination | left40,bottom36,width840,gap12。見出し32pxに詳細を隣接 |
| reading | FHD max840×360、padding24、20px/1.7、本文だけ内部送り |
| read_backdrop | 0deg 紙色→transparent76%、90deg 2%紙色/38%alpha a8/76%透明。本文面の別gradientも維持 |
| return | 左右の結果要約と本文、金額32px serif、結果items18px、余白はflow/actor/full-hd最終層で決定 |
| start | 中心のcrossweave28px serif、開始／再開は下64px帯。Windows独自追加操作は共通部品へ割当後に証拠固定 |

原本：

- [docs/検証/UI/readability/co-u02/journey/backdrop.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/backdrop.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5b12ccec4b6f9bdd2c47ed604dccdbef2b524f73` / .cj-backdrop::after/.cj-reading-scroll
- [docs/検証/UI/readability/co-u02/journey/actor-review.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/actor-review.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `587e437a24f77f4fc59c9064bbf038ec0ea31fbd` / .cj-result-*
- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cj-destination-summary/.cj-reading-*
- [docs/検証/UI/readability/co-u02/journey/save-flow.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/save-flow.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `1cd87ae6b08f7ad4827c9e28392ac118df27f888` / .cj-launch-*
- [docs/検証/UI/readability/co-u02/journey/panels.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/panels.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `b3a57e285d3649548b7037ea3651418ae3e6b977` / hubView/returnView/sceneView

## B18 ドラッグ・ホールド・動き

適用：ホールド待機／ドラッグ可否／余白送り／一時予測／動きを抑える。了承：A01・A02。

| 属性 | 原本値 |
|---|---|
| hold_ms | 220 |
| cue_delay_ms | 120 |
| cue | [32, 32] |
| cue_position | 通常倍率でポインタ(+20,-20)中心、画面端clamp |
| cue_ring | conic-gradient進捗、radialmask51..54%、shadow0 1px 2px #0006 |
| cue_label | 下34px、500 12px/18px、paper背景、radius3 |
| acquisition_lift_opacity | 0.3 |
| acquisition_ghost | 同352×80、shadow0 6px 18px #203a3540、不可opacity.75 |
| drop | 受入先のみ allowed2px実線 / blocked1px破線、ヘッダー全幅の短い述語 |
| verbs | ["取得", "取得・編成", "編成", "外す", "取消"] |
| edge | 取得22px内で7px/frame、探索64px内で16px/frame |
| hover_preview_open_ms | 180 |
| hover_preview_close_ms | 160 |
| movement | 取得の移動200ms ease-out。prefers-reduced-motion時は抑える |

原本：

- [docs/検証/UI/readability/co-u02/hold-cue.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `4f2ff388918168751fa43658caeb904083c51de3` / .cw-hold-*
- [docs/検証/UI/readability/co-u02/hold-cue.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/hold-cue.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `6806b8ec1c5ef18b495ff2dd19b9b862b966c073` / position/tick
- [docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `8a250082898cd2982e40cb739ca4620c136d6a3f` / dropPlan/paintDrop/scrollAtEdge
- [docs/検証/UI/readability/co-u02/acquisition-preview/layout.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/layout.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` / render animations
- [docs/検証/UI/readability/co-u02/exploration.js](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/exploration.js) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `c135e48c82177e59df45976dbe31373b84b7638c` / drawRelations/dragFrame/preview

## B19 スクロール・通知・制限状態

適用：全内部一覧／長文／不足／保存失敗／古い応答／再試行。了承：A01・A02・A05・A06。

| 属性 | 原本値 |
|---|---|
| scroll | thin、探索horizontal WebKit6px、cw-line thumb/transparent track、stable gutterは取得列 |
| notice | 通常通知は中央top72、18px、padding8/16、紙の警告色#f2e6c8とshadow。取得runtime noticeは左右24 top76 padding16 |
| disabled | 取得.42、探索.5、不足は原本warning色と構造 |
| no_whole_screen_scroll | true |
| time_or_save_mutation | 閲覧・hover・取消・未払い操作で確定保存を変更しない |

原本：

- [docs/検証/UI/readability/co-u02/journey/full-hd.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/full-hd.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `526f1d81790c8be582f4c7133c20bd258b9d1478` / .cw-scroll/.cj-status
- [docs/検証/UI/readability/co-u02/acquisition-preview/structure.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/acquisition-preview/structure.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `697a882d79c5f9770f15174e6b35e9e1bc2ea007` / .cp-runtime-notice/.cp-button:disabled
- [docs/検証/UI/readability/co-u02/journey/fixed-screen.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/co-u02/journey/fixed-screen.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `d780db5987f64a052616f4d6226c62911e96fd89` / .cj-status
- [docs/検証/UI/readability/interaction/table.css](https://github.com/eckolo/crossweave/blob/72d0eb58c7e3d04759f1ab56a939d1dff20a46b2/docs/検証/UI/readability/interaction/table.css) — `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` / blob `5747db140fe2ab2681e4f298a4ef296d06fec776` / .cw-scroll/button:disabled

## 確定できない値

fontの実解決・AA・原本OS、各状態のcomputed styleと実測バー幅はU-C01／U-V06・07。取得不能な原画3枚と全状態対照はU-B／U-V。宣言を固定したことと同じ実画像になったことを混同しない。個別承認済み例外は0件。
