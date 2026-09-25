# UI0.14.1の仮画像

2026-09-25。1920×1080の配置で雰囲気と可読性を確認するための仮接続。[用途・切り取り・公開キー対応](../journey/art-hold.md)を参照。正式な敵デザインや再訪場面の採用ではない。

| 素材 | 原本 | 今回の配布物 |
|---|---|---|
| 夜の水路 | ビジュアル枝の `素材/CO-V01/night-tide-background.png`、1536×1024 | `night-tide.webp`、1920×1280、cover・50% 40% |
| 骨董店 | 同 `antique-shop-background.png`、1536×1024 | `antique-shop.webp`、1920×1280、cover・50% 50% |
| 漂着した潜水服 | [透過PNG原本](originals/diver-placeholder.png)、1586×992 | `diver-placeholder.webp`、640×400、相手枠の絵の領域へcontain |

背景出典は `design/visual-direction-20260912` のコミット `25e7ce99bffc551e2370568b74704865c3de13e0`。同コミットの `docs/仕様案/ビジュアル・演出/CO-V01_用途条件と初回背景.md`、`UI接続条件.md` と、作業資料の `VD-COV01-BG01.json`／`BG02.json` を読取参照。原本の内容SHA256と公開blobを照合した。原本の複製はUI枝へ追加せず、派生物と出典を保存する。

背景の拡大は元の細部を増やさない。正式な高解像度版の差替と、解決後・再訪の素材区分は後続のビジュアル入力。今回のACT-04への使用はユーザーが許容した仮素材の範囲に限る。

敵画像は built-in `image_gen`、`transparent_background=true` で新規生成。[送信した生成指示全文](diver-prompt.txt)を保存した。生成された画像の人物像・材質・世界設定を仕様へ逆流させない。

派生処理はImageMagickの機械的なリサイズ・WebP圧縮。背景は `convert INPUT -resize 1920x1280 -strip -define webp:method=6 -quality 30 OUTPUT.webp`、敵は `convert INPUT -resize 640x400 -strip -define webp:method=6 -quality 75 OUTPUT.webp`。原本は変更しない。背景の拡大率1.25、敵のalpha保持を確認。[manifest](manifest.json)に実ファイルの寸法・容量・SHA256、公開原本の出典を記録する。

`build.cjs` が `presentation.js` のテンプレートへ派生3点を埋め込む。通常入口と本文内入口は同じデータURLを使い、画像取得の通信を増やさない。実ブラウザー上の画像合成や描画品質は未確認。
