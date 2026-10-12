# 探索・共通外枠の1920×1080対応（UI 0.14.0）

2026-09-25／`UI-FHD-EXP-01`／Work `20260910-ui-readability`。

実装・変更に絞った検査・操作提示を完了。実ブラウザー描画・実入力・実保存は未確認。取得編成画面 `two-stage-ui-5.1` のユーザー了承を受領し、取得の管理契約を待たず進められる探索FHD対応を実施した。旧0.13の実Campaign接続と公開情報を継承し、ゲーム規則・固定セーブ原本を変更していない。

## 配置と寸法

| 対象 | 制作基準での寸法・動作 |
|---|---|
| 共通外枠 | 1920×1080の固定座標。通常入口・出発前・本文・探索・帰還で共有し、提示幅によって情報密度を変えない |
| 外側の確認領域 | 全体表示では利用可能幅へ縮小。原寸では1設計px＝1CSS pxとして外側をスクロール。ゲーム全体の縦スクロールは設けない |
| 探索 | 枠線を除く1918×1078。四辺24、行間24。人物300・場248・手札338・操作帯72の4行。`300+248+338+72+24×3+24×2=1078` |
| 手札・場の札 | 共通248×208。間隔16。幅1870の一覧へ7枚分1836が収まる計算。場の一覧高216には横スクロールバー分8を含める。7枚は表示容量であり、ゲームの枚数上限ではない |
| 名称 | 18px・24px行高・2行。名前を属性から分け、幅234に全角13文字×2行の計算。既存の最長想定25文字を26文字分で受ける。実フォントによる測定は別途 |
| 人物 | 320×224、人物間24。名前20px、公開パラメータ18px |
| 詳細・予測・共通窓 | 同じ520×480。親子の間隔16。ヘッダー64・主要操作56、本文は窓内スクロール。選択元と重なりを考慮する既存配置器を使用 |
| 出発本文・帰還本文 | 読書領域は最大840×360、本文20px。続行・帰還操作を共通の固定操作帯へ残す |

容量はCSSからの計算であり実描画の合格ではない。各札の全公開情報・予測を残し、長い一覧には横送り・余白ドラッグ・保持中の端スクロールを用意した。旧取得画面の配置は共通外枠へ追従させるに留め、了承済み二段階取得の本編接続とは区別する。

## 座標と操作

`display-frame.js` が外枠と倍率を管理し、`window-placement.js` の `displayScale`／`uiSpace`／`uiRect` が画面上の矩形を制作座標へ変換する。窓、関係線、操作ボタンの位置、ドラッグ像、掴み位置、一覧の送り量、本文の文字幅計測に同じ倍率を適用する。全体／原寸の切替で探索状態・選択・窓の内容を保持する。

保持前は従来の横送り、保持後は札と同じ大きさの像を掴んだ位置で移動。場の外へのドロップは出札しない。表示幅変更、capture喪失、非アクティブ化等で入力を中断し、遅い予測応答による出札を防ぐ。倍率変更のための再描画でゲームを作り直さない。

CSSは `journey/build.cjs` の最終段で `full-hd.css` を組み込み、`data-display="fhd"` の制作寸法を一か所で管理する。旧小画面向けCSSは履歴・単独部品向けに保持し、今回の配置を決める層を明確にした。

## 操作確認の入口と記録

- 会話本文：`/workspace/crossweave-exploration-full-hd.html`。探索・出発時の本文・帰還・出発前の4場面へ直接入れる。実Campaign＋設計所有MemoryStoreを使い、通常の永続セーブへは接続しない。
- 原本：D03 `offers-home` と `purchased-exploring`。出発・撤退は既存の公開操作を使う。[提示物・ソース照合](../review/exploration-fhd-manifest.json)に原本・runtime・UIのハッシュを保存。提示物835803 bytes、SHA256 `18e8ea2c679ebdff70bae58e69d600d9f6f1fc544d47ff9f1e8fc5d582e0139a`。
- 通常の場面確認：`review/index.html?case=explore-d03`、`entry-d03`、`carried`、`hub-d03`。通常ゲーム入口は `co-u02/index.html`。入口の旧1280px上限を解除した。
- [変更検査26項目](../review/exploration-fhd-checks.json)：Node24.19.0／JSDOM26.1.0。実APIの予測・一手実行・出発本文→探索・撤退→帰還→拠点、共通窓、倍率切替と入力取消、通常起動の共有外枠と終了を確認。矩形・client寸法・hit test・capture・文字幅・可視通知は注入。
- 再実行していないもの：取得編成5.1、旧0.13、旧経済・進行検査の全スイート。保存済み成果と過去の確認記録を保持する。
- 未確認：実ブラウザー描画・実フォント・実マウス・タッチ・IndexedDB・複数タブ・ユーザーの探索画面評価。[実機手順](../u02b/browser-review.md)へFHD条件を追加。過去の正規入口の拒否を別経路で迂回しない。

必要時だけの再現手順（リポジトリルート）：

```sh
node docs/検証/UI/readability/co-u02/build.cjs
node docs/検証/UI/readability/co-u02/review/build-inline.cjs /workspace/crossweave-exploration-full-hd.html fhd
CW_JSDOM_PATH=/path/to/node_modules/jsdom node docs/検証/UI/readability/co-u02/review/verify-exploration-fhd.cjs
```

## 選択受領への入力

変更基点は公開UI `e7c635fca1bf4a25526c4c8c60c48e7317be66e8`。旧0.13の継承履歴を含む。公開保存コードと読戻し結果は最終応答で示す。とりまとめへの現在の引継ぎは[自Work設定](../../../../../作業資料/Work/20260910-ui-readability.md)冒頭。

| 差分群（co-u02内） | 用途 |
|---|---|
| `display-frame.js`、`window-placement.js`、`prose-layout.js`、`exploration.js` | 共通倍率と探索の座標・入力 |
| `journey/full-hd.css`、`build.cjs`、`view.js`、`launcher.js`、`layout.js`、`panels.js` | 最終スタイル・窓・画面遷移・表示密度。ここでのbuild.cjsはjourney配下 |
| `dist/crossweave-ui.js`、`dist/crossweave-ui.css`、`index.html` | 同じソースからの通常配布と入口 |
| `review/build-inline.cjs`、`checkpoints.mjs`、`picker.mjs`、`index.html`、新FHD fragment／controls／manifest／verify／checks | 4場面の直接入口、本文内操作提示、限定確認。後半の短縮名もreview配下 |
| 本資料、README、残件・解像度基準・実機手順、自Work・同期記録 | 引継ぎと未確認の分離 |

統合先・担当は `dev_design_tmp_assembly`／`20260909-design-assembly`。設計側の選択受領を待ち、UIから逆統合しない。`UI-ACQ-INT-01` の統一取得・保存移行は[接続条件](../acquisition-preview/integration-handoff.md)が未解消で、本差分に含めない。受領・着手・統合は未確認。
