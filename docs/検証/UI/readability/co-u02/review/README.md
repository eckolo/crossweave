# 探索FHDの確認入口（UI 0.14.0／2026-09-25）

[探索FHDの成果](../journey/full-hd.md)を同じ配布ソースから提示する。会話内では「全体／原寸」と倍率を表示。次の4場面へ直接入れるので通しプレイは不要。以下のURLは既存の正規HTTP入口を使う。

| 場面 | 場面入口のquery | 固定入力・準備 |
|---|---|---|
| 探索 | `index.html?case=explore-d03` | D03 `purchased-exploring` 原本 |
| 出発時の本文 | `index.html?case=entry-d03` | D03 `offers-home` 原本から公開 `depart` |
| 帰還 | `index.html?case=carried` | 同原本から公開 `depart` → `withdraw` |
| 出発前 | `index.html?case=hub-d03` | D03 `offers-home` 原本 |

実Campaign＋設計所有MemoryStore。入力原本・共通runtimeは変更していない。[提示物・入力・ソース照合](exploration-fhd-manifest.json)、[変更26項目](exploration-fhd-checks.json)、[実機手順](../u02b/browser-review.md)を保存。矩形・文字幅・可視通知等を注入したJSDOM確認であり、実描画・実ポインター・タッチ・IndexedDBは未確認。

この入口から本編の旧取得画面にも進めるが、了承済みの[二段階取得5.1](../acquisition-preview/README.md)はまだ本編に接続していない。FHDの共通外枠への追従と、新しい管理・保存の採用を分けて扱う。

生成：`node docs/検証/UI/readability/co-u02/review/build-inline.cjs /workspace/crossweave-exploration-full-hd.html fhd`。旧0.13用manifestと本文提示物は上書きしない。既存の場面は保持し、今回 `entry-d03`／`hub-d03` を追加した。

---

以下は旧提出時点の記録。現行版の検査済み範囲は上記を参照。

# 追加指摘への修正版（0.13.0）

初期提示は [心得・習得と装備](index.html?case=skills-current)。2種習得・1種装備を公開APIで作った実データの確認状態。覚えるだけ／覚えて装備、現在の習得・装備の絞り込み、同寸法の窓、固定の操作部を確認できる。購入・所持・探索へは場面選択から直接移動でき、通しプレイは不要。

[共通UIの考え方・変更・検査・境界](../consistency/README.md)。今回の対象検査67件＋会話内実行10件。会話内は実API＋設計MemoryStoreの一時保存で、ブラウザー終了後の保持は保証しない。過去の検査は過去の保存コミットの記録であり、下記0.12.0の57＋8件を今回の結果へ加算しない。

---

# 今回の変更をまとめて確認する入口（UI 0.12.0）

2026-09-20、[CO-U02-B](../u02b/README.md)。既存9場面に以下の6場面を追加した。選択欄はゲーム枠の外にあり、同じUI・実Campaignを起動する。

| 入口 | 確認する流れ |
|---|---|
| [購入候補・編成](index.html?case=offers) | 自然保存の着想9から、候補・修飾・購入、購入前後の比較、札組／心得、確定、出発 |
| [所持・ロック・変換](index.html?case=owned) | 購入済み個体、使用可否、ロック、見積り、最後の個体の変換 |
| [変換後](index.html?case=converted) | 所持なしと購入済みの区別、着想5.5、次の編成 |
| [撤退・持越し](index.html?case=carried) | 原本から公開depart→withdrawで作る撤退リザルト、拠点→候補持越し |
| [帰還・不足](index.html?case=return-d03) | 移行した帰還原本、帰還確認前の書込み禁止、着想3での不足 |
| [D58の探索](index.html?case=explore-d03) | 新内容の自然保存、本人を含む予測、山札・本文・調査記録 |

会話内の提示は上記から「帰還・不足」を除く5場面。実Campaign＋設計所有MemoryStoreであり、模擬応答ではない。場面切替で確認中の操作を破棄する。実セーブに保存したい場合は通常入口を用いる。

原本と検査：[符号化目録](fixtures/manifest.json)、[接続57項目](u02b-checks.json)、[会話内8項目](inline-checks.json)、[実機で残る手順](../u02b/browser-review.md)。D03原本5件はBrotli/base64からgzipへ符号化のみ変更し、展開バイト列を固定した。旧D02原本5件も維持する。準備処理のscene進行は本文未表示なので`displayed_text_ids:[]`。

再現は`prepare-d03.cjs`→親の`build.cjs`→`build-inline.cjs`。確認は`CW_JSDOM_PATH=/path/to/node_modules/jsdom node review/verify-u02b.mjs`と`review/verify-inline.cjs`。Node24.19.0／JSDOM26.1.0。実描画・物理タッチ・実IndexedDBは未確認。

## 既存9場面と運用の履歴（0.11.1）

# 変更をまとめて確認する入口

2026-09-17の「細かい変更ごとの通し確認を減らし、ある程度まとめて実装する」方針を受領。関連する実装をまとめ、内部では変更箇所とその前後の接続を検査する。ユーザーへは確認対象の場面へ直接入れる状態と、今回変わった点だけを提示する。仕様判断が実装を分ける場合だけ、その判断を先に依頼する。

提示済み0.11.1の大まかな動きは了承済み。同じ仮素材を今すぐ再評価してもらうための追加画面ではない。見た目・操作感の細部は演出・正式画像の導入後にまとめる。通し確認は保存方式・主要な画面遷移の変更や正式素材導入など、複数場面をまたぐ影響がある区切りで行う。

## 場面を直接開く

リポジトリの既存HTTP入口から [確認ページ](index.html?case=deck) を開く。`case`で開始状態を指定でき、選択欄でも移動できる。通常ゲームの入口は親フォルダの`index.html`のまま。確認操作をゲーム内のメニューへ追加していない。

| 入口 | 開く状態 | この状態から確かめられること |
|---|---|---|
| [出発前](index.html?case=hub) | 確定済み編成の拠点 | 編成の参照、場所の詳細、出発 |
| [札組](index.html?case=deck) | 札組の編集 | 変更案、心得との行き来、比較・確定 |
| [心得](index.html?case=skills) | 心得の選択 | 発動条件・効果、装備、札組との行き来 |
| [探索中](index.html?case=explore) | 実際に一手を選べる探索 | 選択・予測・出札、長押し、探索中断 |
| [出発直後の本文](index.html?case=entry) | 一時停止中の本文 | 文章の表示、詳細、探索へ進む |
| [探索途中の本文](index.html?case=port) | 途中地点の本文 | 文章・任意詳細の表示、探索へ戻る |
| [踏破後](index.html?case=clear) | 踏破のリザルト | 獲得記録、拠点へ進む |
| [撤退後](index.html?case=withdrawal) | 撤退のリザルト | 撤退時の表示、拠点・次の探索 |
| [緊急脱出後](index.html?case=defeat) | 敗北のリザルト | 緊急脱出時の表示、拠点へ進む |

実Campaignと設計所有MemoryStoreを使う**確認専用の一時保存**。模擬応答ではないが、実IndexedDBへは接続しない。場面の切替・「この場面を最初から」・ページ終了で、その確認中の変更は引き継がない。通常のセーブを読み書きしない。

元データは設計所有の[自然保存5件](../../../../接続条件/co-d02/saves/manifest.json)。読み込むたびにgzipと展開後JSONのSHA-256・長さを目録と照合し、原本をそのまま`Campaign.importSave`へ渡す。UI用に保存内容・phase・所持・経済・非公開辞書を組み替えない。

探索中だけはentry原本から公開`continue_scene`を実行して用意する。準備処理では本文を表示していないため、`advance:true, displayed_text_ids:[]`を明示する。省略すると本体が本文全体を表示済みとして扱うため、省略しない。撤退後はentry原本から公開`withdraw`で用意する。確認画面を開いた後の表示記録は従来どおり、実際の可視通知に応じた`advance:false`だけで送る。

## まとめる単位

| 変更の種類 | 内部の検査 | ユーザーへまとめて提示する入口 |
|---|---|---|
| 編成・心得・比較 | plan、金額・装備の差分、確定と失敗時の保持 | 札組／心得。必要な変更だけ説明 |
| 探索表示・入力・予測 | 公開値との一致、合法手、pending、取消と遅延応答 | 探索中。途中まで遊び直す必要なし |
| 本文・詳細・調査記録 | 表示された段落だけの記録、親子窓、遷移後の解除 | 該当する本文／踏破後 |
| 帰還後の導線 | 踏破・撤退・緊急脱出から拠点まで | 影響したリザルトだけ |
| 実保存・輸出入 | 実IndexedDBと再読込み・実ファイル | [保存検査](../browser-check.html)と通常ゲーム。上の一時保存で合格としない |

すべての入口を毎回確認する運用にはしない。変更後の短い関連検査を行い、重大な壊れ方を残したまま次の実装へ積み上げない。ユーザー確認はまとまった単位の区切りとし、既存の3点（収まりと操作、導線、現在／案／確定後の区別）のうち変更に関係するものだけを尋ねる。

## 今回の検査と境界

`verify.mjs`は追加入口の[33項目](checks.json)。実Campaign・元MemoryStore・生成済み0.11.1をJSDOMで操作。全9開始状態、原本5件の照合、比較・確定、一手実行、三帰還から拠点、読込み失敗時の元画面と案の保持、二重要求、終了後の遅い応答、表示段落の限定を確認した。旧49／20／24項目やバランス探索は再実行していない。

```sh
CW_JSDOM_PATH=/path/to/node_modules/jsdom node docs/検証/UI/readability/co-u02/review/verify.mjs /tmp/crossweave-review-checks.json
```

Node24.19.0／JSDOM26.1.0。実描画・物理タッチ・実IndexedDB永続保存・新入口のユーザー操作は未確認。正規Browser入口の既存拒否を別の経路で迂回していない。通常UI0.11.1・dist・共通runtime・固定原本・設計の自然保存は無変更。

全主体の解決後予測、身構と軽減の統一、公開情報の追加、D03、設計の受領・統合は[既存残件](../remaining-work.md)のまま。今回の入口整備をCO-U02全体の完了や未提供機能の実装と扱わない。
