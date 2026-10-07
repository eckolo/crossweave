# CO-U02 取得・編成の本編接続（UI0.16.0）

2026-09-26。UI-ACQ-INT-01。[接続仕様・通常入口・確認範囲](acquisition-preview/runtime-connection.md)。了承済み三領域をD03Rの公開所持・予測・一括確定・保存・実出発へ接続した。変更33項目を実Campaign＋MemoryStore＋JSDOMで確認。通常入口は[index.html](index.html)、本文内入口は[生成記録](review/connected-manifest.json)。実描画・物理入力・実IndexedDB／実複数タブは未確認。保存読戻しと最終状態は[自Work](../../../../作業資料/Work/20260910-ui-readability.md)へ。

---

以下は過去の記録。現在の入口・接続状態は冒頭を参照。

# CO-U02 予測の場札から詳細を開く（UI0.14.8）

2026-09-26。[予測札の詳細接続](journey/field-forecast-details.md)。場の「＋ 予測」の札もクリックで詳細を開き、手札と予測を維持する。クリックでは出札しない。[生成照合](review/field-forecast-details-manifest.json)・[限定9項目](review/field-forecast-details-checks.json)。位置は概ね了承、縦位置の微調整は今回見送り。実描画・実入力・IndexedDBは未確認。

---

以下は過去の記録。現在の状態は冒頭を参照。

# CO-U02 隣の札を選べる端配置（UI0.14.7）

2026-09-26。[現在の規則](journey/edge-details.md)。詳細・予測を選択元と反対側の画面端へ揃え、隣の札を続けて確認できるようにした。[生成照合](review/edge-details-manifest.json)・[限定8項目](review/edge-details-checks.json)。実描画・実入力・IndexedDBは未確認。

---

以下は過去の記録。現在の状態は冒頭を参照。

# CO-U02 手札・場の詳細も中央側へ開く（UI0.14.6）

2026-09-26。[左右規則の適用漏れ修正](journey/inward-details.md)。手札・場・予測・相手・行動順を「左半分から右、右半分から左」に統一。窓寸法を維持し、詳細と予測を同じ位置に揃える。[生成照合](review/inward-details-manifest.json)・[限定10項目](review/inward-details-checks.json)。実描画・実入力・IndexedDBは未確認。

---

以下は過去の記録。現在の状態は冒頭を参照。

# CO-U02 相手の詳細窓の位置を揃える（UI0.14.5）

2026-09-26。[現在の配置規則](journey/steady-details.md)。敵・地形の詳細は共通の縦位置に揃え、対象が左半分なら右脇、右半分なら左脇の画面中央側へ出す。画面端・隣の相手の回避も横方向だけに限定。予測や札の変化によって上下へ移動させない。

[差分11項目](review/steady-details-checks.json)、[本文内入口](review/README.md)、[自Workの引継ぎ](../../../../作業資料/Work/20260910-ui-readability.md)。実描画・物理入力・IndexedDBは未確認。0.14.4のクリックによる選択＋詳細を継承する。

---

以下は過去の記録。現在の状態は冒頭を参照。

# CO-U02 相手の選択と詳細をクリックへ統合（UI0.14.4）

2026-09-26。[最新サンプル](journey/select-details.md)では敵・地形をクリックすると対象指定と詳細を同時に更新し、敵のホールドと独立した詳細ボタンを除去した。札の選択を保って予測・操作名・関係線を切り替える。相手の詳細は比率を保った固定416×384pxで空き位置へ置く。

[差分15項目](review/select-details-checks.json)、[本文内入口](review/README.md)、[自Workの引継ぎ](../../../../作業資料/Work/20260910-ui-readability.md)。実描画・物理入力・IndexedDBは未確認。旧「敵ホールドで対象指定」案は今回の方針で置き換え、旧案の採用待ちを残件にしない。

---

以下は過去の記録。現在の状態は冒頭を参照。

# CO-U02 敵画像の拡大・ホールド表示遅延（UI0.14.3）

2026-09-25。[敵画像とホールド表示の修正](journey/art-overlap.md)を反映。潜水服は絵の高さを約1.63倍にし、上端を枠から8px出して下側をステータス欄へ重ねる。札の実画像も同じ描画方針とする条件を保存。画像の再生成はしていない。

ホールド表示は120ms後から出す。操作の成立は札・取得編成220ms、相手350msのまま。取得側も5.3へ更新。[差分17項目](review/art-overlap-checks.json)が通過。[本文内入口](review/README.md)、[自Workの引継ぎ](../../../../作業資料/Work/20260910-ui-readability.md)。実描画・物理入力・IndexedDBは未確認。[操作統一案](journey/interaction-proposal.md)の採用や実装は今回行っていない。

---

以下は過去の記録。現在の状態は冒頭を参照。

# CO-U02 地形・共通札枠・操作名（UI0.14.2／2026-09-25）

最新は[地形表示・共通札枠・操作名](journey/card-frames.md)。地形の縮小背景を記号へ替え、手札・場・予測・ドラッグの札面区画を統一し、ホールド名を操作ボタンへ整合した。潜水服の姿勢の了承と画風の不一致を受領し、今後の制作はビジュアル正式手順1.0と作例に従う。画像の再生成はしていない。

[クリック／ホールドの統一案](journey/interaction-proposal.md)は提案段階。本版の入力割当は従来通り。[今回の限定検査](review/card-frames-checks.json)、[本文内操作入口](review/README.md)、[最新の引継ぎ](../../../../作業資料/Work/20260910-ui-readability.md)。実描画・タッチ・IndexedDBは未確認。

---

# CO-U02 仮画像・予測枠・ホールド表示（UI 0.14.1／2026-09-25）

最新は[仮画像・場の予測枠・ホールド表示](journey/art-hold.md)。1920×1080を維持して水路・拠点背景と潜水服の仮画像を接続し、予測札の内側の線を実札と揃え、有効なホールド中の進行リングを探索・取得編成へ共通導入した。[今回28項目](review/art-hold-checks.json)が通過。本文内で探索0.14.1と取得編成5.2を操作できる。

背景は1536×1024原本を拡大した仮素材。[出典と解像度の条件](art-assets/README.md)を保存した。実ブラウザー描画・画像合成・実マウス／タッチ・IndexedDBは未確認。本編の統一取得接続は[現在の残件](remaining-work.md)へ保持。[自Workの引継ぎ](../../../../作業資料/Work/20260910-ui-readability.md)が現在の報告。

以下は旧版の記録。

---

# CO-U02 探索FHD対応（UI 0.14.0／2026-09-25）

最新は[探索・共通外枠の1920×1080対応](journey/full-hd.md)。既存の実Campaign接続を継承し、探索の札・人物・予測・詳細窓・倍率とドラッグ座標、前後遷移を調整。変更に絞った[26項目](review/exploration-fhd-checks.json)を確認した。会話本文から探索・出発本文・帰還・出発前を直接操作できる。[通常入口](index.html)と[場面入口](review/README.md)も同じ生成UIを使う。

[二段階取得5.1](acquisition-preview/README.md)の画面はユーザー了承済み。新方式の本編接続は[管理・経済・保存移行の契約差分](acquisition-preview/integration-handoff.md)が残り、今回の探索成果とは区別する。実ブラウザー描画・実マウス／タッチ・IndexedDBは未確認。[現在の残件](remaining-work.md)と[自Workの引継ぎ](../../../../作業資料/Work/20260910-ui-readability.md)が最新状態。

以下は旧提出時点の履歴。0.13は[統一・操作表示](consistency/README.md)に保存され、旧成果・検査記録・提示物を保持している。

---

# CO-U02 実データ接続（UI 0.12.0／2026-09-20）

最新は [CO-U02-B：公開情報・取得経済](u02b/README.md)。D02R・D58・公開済みD03を接続し、購入／編成／変換と探索を一単位で更新。接続57項目＋会話内画面8項目を確認。今回の公開状態と、とりまとめへの引継ぎは自Work設定を参照。

[確認入口](review/README.md)は既存9＋今回6場面。会話内は実API・一時MemoryStoreの5場面。実IndexedDB・実描画・人の受入は未確認で、[後続手順](u02b/browser-review.md)へ分離。以下は0.11.1以前の履歴で、D03・能力予測の未提供待ちは解消した。

## 0.11.1時点の記録

確認方法の追加：[変更をまとめて確認する入口](review/README.md)。札組・心得・探索中・各帰還結果など9場面へ直接入れる。実Campaign＋一時保存で、通常UI0.11.1と永続セーブは変更していない。追加33項目を確認。今すぐの再評価依頼ではなく、以降の変更確認で通しプレイを減らすための入口。

0.11.1：[長押しの取消と札の位置を正式版へ整合](journey/exploration-save.md#gesture-lifecycle-fix)。非アクティブ化・複数指・入力捕捉喪失などで保留操作を取り消し、取消後の遅い予測応答による出札を防止。変更24項目を確認。

0.11：[探索だけの中断・編成の確定時保存・公開表示](journey/exploration-save.md)。探索以外の中断と書出し時の案保存を外し、公開済み札名を履歴に追加。変更20項目を確認。全能力の行動後予測・過去札名の永続公開・常時分を身構へ統一する案は設計側対応待ち。

0.10.1：[再開後に残る成功通知を削除](journey/save-flow.md#resume-notice-fix)。今回の対象操作7項目を確認し、元の場面へ直接戻る。再開・未確定の編成・永続保存の区別も同節に記載。

基盤0.10の保存コード：[5f977874](https://github.com/eckolo/crossweave/commit/5f97787482435b1217c8612cc51610ae96276af5)（変更30本文・blob読戻し済み）。

0.10での変更：[新UIと開始・保存・再開の統合](journey/save-flow.md)。方向性了承後、実Campaignのcreate/open/importSave/exportSaveを同じ新UIへ接続した。変更検査49件は実Campaign＋MemoryStore＋JSDOM。実IndexedDBと実描画は[確認手順](journey/browser-review.md)・[保存検査ページ](browser-check.html)での確認待ち。残件は[こちら](remaining-work.md)。

会話内操作試作：[一巡UI 0.11.1](journey/README.md)。ユーザー了承の16:9を維持し、主画面のスクロール廃止を維持し、文字の囲いを減らして背景へ重ねる配置に更新。これは実Campaign＋一時メモリーの試作で、実IndexedDB確認・正式探索UI完全移植・条件を指定した全操作確認は未了。以下の0.3以前の検査条件は当時の記録であり、ページ全体のスクロール許容を現行要件として再採用しない。


0.3以前の準備描画（履歴）：[d74d80930bbd8ee09593d9be3d0251cca36c520f](https://github.com/eckolo/crossweave/commit/d74d80930bbd8ee09593d9be3d0251cca36c520f)。変更16ファイルの本文と全体treeをGitHubから読戻して一致を確認。

UI-G-001 v0.2の検討版を追加。用語の列を対象名と増減へ置き換え、帰還の一括取消を個別選択へ変更した。今回の操作版・24項目の検査・残件は[操作と言葉の見直し](操作と言葉の見直し.md)と`verification/choice-ui/`。正式採用・ユーザー受入は未了。

今回の検査入口は`verify-preparation-choice.cjs`。以下の33c7ac6の検査記録は、その時点のソースを対象とする履歴。

前回の保存コード：[33c7ac6747452bafd6b35e0f85933c5903bd4fa4](https://github.com/eckolo/crossweave/commit/33c7ac6747452bafd6b35e0f85933c5903bd4fa4)。ブランチref・全637treeエントリー・主要本文の読戻し済み。

**提供済みD02への接続を提出。CO-U02全体・正式探索UIの完全移植・実ブラウザー保存・ユーザー受入は未了。** 現在の結果は [実接続結果](実接続結果.md)。以下の「前回Chatの記録」以降は更新前の履歴である。

WorkID `20260910-ui-readability`、作業先 `ui/readability-20260910`、統合先・担当 `dev_design_tmp_assembly`／設計集約Work `20260909-design-assembly`。今回の設計同期版は **7a0ce6fad3ce873638ad0e8d923c7559b420a6ed**（D02提出版）。実入口は `src/runtime/campaign.mjs` の Campaign／createCampaign／versions。

## 現行の起動と呼出し

リポジトリルートで以下を実行し、同一オリジンの `/docs/検証/UI/readability/co-u02/index.html` を開く。

```sh
node docs/検証/UI/readability/co-u02/build.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

entry.mjsはmountJourneyApplicationから実Campaignと保存枠m1-localを使う。「続きから」「はじめから」「空の保存先へ読み込む」は独立操作。既存保存の上書き・削除・自動新規作成・mockフォールバックはない。保存装置は設計側のIndexedDBStoreであり、UIは独自保存装置を実装しない。

| 部品・操作 | 実接続した範囲 | 確認・残件 |
|---|---|---|
| session.js | inspect／previewPreparation／previewAction／execute、pending、二重入力抑止、同request_id再試行、古い応答排除 | 実Campaign＋設計MemoryStoreで確認 |
| 起動・再開・輸出入 | Campaign.create/open/importSave、controller.exportSave | 失敗時に元保存と入力を保持。open失敗をcreateへ切り替えない |
| 準備・心得・札組 | 一巡UI 0.11の公開view描画、16:9、明示plan、比較、確定時自動保存 | 取消・再習得・装備、保存失敗後の再試行を実データで確認 |
| 本文・任意詳細 | 実phase／scene、text_ids＋optional_text_ids、continue_scene | 見出しではなく本文段落の可視通知でadvance:false。実DETAIL06→CL05、未表示本文の未記録を確認 |
| 出発・探索・撤退・帰還 | depart／play／withdraw／continue_scene／ack_return | 実初回出発→一手→撤退→帰還→次準備をDOM操作で確認 |
| exploration.js | 正式UI-R v0.15の配置CSS、相手・場・手札、詳細・予測、行動予約、履歴 | 公開viewのみ。窓・ドラッグ・関係線の実描画と視覚一致は未確認 |
| 行動予約 | previewActionのcurrent_reservations | 同時刻の優先順をUIで推測しない。選択札の予測とは分離し、未来の順序を保証しない |
| 購入・修飾・変換・個体 | capabilitiesに従い未対応理由を表示 | D03待ち。空所持・資金不足に置換しない |

帰還後へ引き継ぐのは取消対象の基礎IDの意図だけ。新viewで再検証・再比較し、実取消は未確定のまま残す。個体・購入入り任意planや古いhandleを帰還から運ばない。

## 33c7ac6時点の検証と操作画面（履歴）

- 会話内の先行提示は **UI-G-001 v0.1.1の模擬応答版・実保存なし**。元co-u01/build.cjsと全fixturesから生成し、120316 bytes／SHA-256 caa5dc8e2703764ff9362840e00f237422660186f6a8c7d8dad0c99d1c6adeabが一致する。新実接続版とは区別する。
- CW-M1-UI-001：実Campaign＋設計MemoryStore **46件**、実Campaign＋JSDOM 26.1.0 **28件**合格。Node v24.19.0。条件・全項目・ソースSHAは verification/work-mode/。
- JSDOMの可視通知は明示したテスト入力であり実表示の証拠ではない。現BrowserのローカルURLはERR_BLOCKED_BY_CLIENT。別経路で回避せず、今回の実描画0／IndexedDB実行0／物理端末0／ユーザー受入0と記録。
- ZIPの37対象と旧code-freezeは全SHA-256一致。旧表示29／非同期25／部品13は当時の対象コードの結果で、今回版の合格に数えない。今回のDOM28件は、再実行していない旧28件とは別試験。旧戦闘・固定試遊も再実行しない。

必要時の再現：

```sh
node docs/検証/UI/readability/co-u02/verify-campaign.mjs /tmp/crossweave-ui-campaign-new.json
CW_JSDOM_PATH=/path/to/node_modules/jsdom node docs/検証/UI/readability/co-u02/verify-dom-campaign.cjs /tmp/crossweave-ui-dom-new.json
```

jsdomは26.1.0を検査環境に用意する。固定入力はD02の自然保存port/home/second-return（接続条件/co-d02/saves/manifest.json）と実createの初期状態。MemoryStoreは設計所有test/runtime/support.mjsをそのまま使用する。実UIの起動時へ試験機能を混ぜない。

## 次の受渡し

1. 実接続画面の1024／736／600／320px、末尾・確定到達、resize時の窓・下書き保持、実ホールド／横送り／ドラッグを確認する。会話内模擬版のユーザー確認は別途必要。
2. 安定した同一オリジンでIndexedDBの保存・終了後再開・輸出入・三帰還を確認する。MemoryStore／DOM合格は代用にしない。
3. 正式探索UIの完全移植を残す。山札の種類別残数・参照一覧は現公開viewに存在せず、私的saveから補完しない。履歴の一時表示、全予測関係表示、窓・ジェスチャーの視覚一致も未了。原本v0.15を置き換えない。
4. D03の購入・修飾・変換・個体を受けて必要な接続を行う。今回から自動続行しない。

設計への統合依頼と保存コミットは実接続結果・自Work設定へ追記する。受領・統合・ユーザー受入を先取りしない。今回の単位でUIの稼働枠を解放する。

---

## 前回Chatの記録（保全ZIP内の旧到達点）

WorkID: 20260910-ui-readability / 作業枝: ui/readability-20260910。
**本単位はここで区切る。CO-U02全割当の完了・ユーザー確認済み・実永続保存の合格を意味しない。**

## 成果と保存境界

計画0.6（ops b25e7abe）、実装基準0.3、接続条件0.2。開始UI 3db9163のUI-G-001 v0.1.1を維持し、原描画5ファイルをGit blob照合した。旧作業フォルダはこの環境にない。旧ローカルと公開版が同tree・未保存0だった点は前回照合記録として受領したもので、今回再検査したとは扱わない。

同期コミット192fbc9で計画12ファイルと設計eb28efbを保存。最終公開記録・本体同期は59c96ca347c52654bda5cf41ae89aa119003799a（UI枝、forceなし）。作業中にD02先行実装68da4ffを受領し、公開README・view・preparationの実コードを照合した。record_displayed_text能力、actors/fieldの辞書、remaining、Campaign.openでの再読込み、初期planのpurchase_timingへ追従した。

新コードのGitHub保存要求のうちapplication.jsの書込みがOpenAIによってブロックされた。理由の詳細は不明。同じコードを別経路・別形式にして再送していない。中間tree dded318 / 3214e09には一部コードobjectがあるが、成果コードとして枝へ公開したとは扱わない。最終的なGitHub保存は既存UI保全、設計本体の同期、照合・停止記録を対象とし、**新UIコードはこのZIP内が保全先**。適用前にリポジトリの最新状態と差分を再確認する。

## 操作入口

`crossweave-ui-check.html` はv0.1.1の描画・操作を確認する独立HTML。BC/空状態の明示した入力投影と模擬応答を使用し、実セーブへ接続しない。ブラウザーから開いて準備・帰還を操作できる。

新実API入口は `docs/検証/UI/readability/co-u02/index.html`。設計68da4ff以降の全リポジトリへ本成果を置き、ルートで以下を実行する。

```
node docs/検証/UI/readability/co-u02/build.cjs
python -m http.server 8000 --bind 127.0.0.1
```

同じHTTPオリジンの `/docs/検証/UI/readability/co-u02/index.html` を開く。entry.mjsは公開済み `src/runtime/campaign.mjs` のCampaign/versionsを使用し、slotはD02と同じ `m1-local`。create/open/import/exportは別操作で、自動新規作成・上書き・初期化は行わない。本ZIPは全リポジトリの代替ではなく、runtime/contentを含めない。

この環境では実CampaignとIndexedDBを組み合わせた操作は未実施。実APIへの結合コードの作成と、実モジュールを動かした結合検証は別である。file URLのナビゲーションは管理制限で拒否されたため再試行せず、画面部品はメモリー内に直接与えたDOMで検証した。実保存確認の根拠にはしない。

## 実装済みの範囲

- Session境界：await、保存成功時のみ現在値更新、重複送信抑止、同一要求での再試行、古い応答の排除、stale時の下書き保全と明示的再選択、基礎IDのみの帰還取消意図引継ぎ。
- 準備・帰還：v0.1.1の描画部分をSHA-256で固定し抽出。現在／案／確定の資金・装備・札組を分離。保存失敗時には比較窓を閉じ、保持した下書きから再試行できる。UIで経済・個体・保存本体を再実装しない。
- 起動・輸出入：Campaignの公開口を注入。空保存・形式不一致・保存失敗を区別し、入力を保持。保存本文を公開viewへ混入しない。
- 本文：現在scene.text_idsと公開textsだけを使い、本文を開き実際にviewportに表示された後にadvance:falseで記録。任意本文の見出しだけで既読にしない。継続は表示記録成功後。
- 探索：公開actors/field/hand、合法choice、previewAction/executeへ接続する最小描画とrenderer注入口。**正式UI-R-002 v0.15の完全移植ではない**。正式な行動順アイコン、関係線・予測、詳細なhover/drag連携の接続は残る。原本を置換しない。
- 購入・変換・個体はD02 Aで未接続。模擬応答で補完しない。

## 検証

新試験ID CW-M1-UI-001。25件のNode非同期境界検査、29件のv0.1.1実描画検査、13件の新部品のChromium操作検査。旧28件を再実行・再カウントしない。

親幅1024/736/600/320pxで枠内、最後の札、比較確定、詳細末尾、resize時の窓と下書き保持を検査。高さが短いhostではページ全体の縦スクロールを許容し、切り捨てで収めない。物理端末・タッチ操作・ユーザー受入は未検証。

```
node docs/検証/UI/readability/co-u02/verify.cjs
python docs/検証/UI/readability/co-u02/verification/check-layout.py
python docs/検証/UI/readability/co-u02/verification/check-browser.py
```

Python側はPlaywrightとChromiumが必要。新コードの実行にPython/Nodeの試験機能を混入しない。layout-input.jsonは旧BC/empty入力とラベルの投影であり、元fixtures.json全体のbyteコピーではない。出典・固定hashは各使用記録を参照。

## 未了と次の受渡し

CO-U02全割当は未完了。新コードのリポジトリ反映、実API＋同一オリジン保存／再開／3帰還の実操作、探索UI正式版の完全な公開view移植、公開された解放名などの詳細表示、全S03〜S18の統合、ユーザー確認が残る。実API自体は68da4ffで届いているので「API未提供」を待ち理由にしない。

設計Work20260909-design-assemblyへ：同期対象は68da4ff。成果は添付ZIPとSHA-256目録を照合して受領し、受領済み／統合済みを自動記録しない。次のUI Workは同じWorkIDの継続とし、本記録・公開計画・最新D02を再照合して未反映分の保存状態から始める。今回の2Work枠はこの報告でUI側の作業単位を終了する。D03や他画面へ自動続行しない。

ユーザー確認は3点：表示が収まり末尾を操作できるか、準備→比較→確定と帰還→次の準備が分かるか、現在値と変更案・確定後が区別できるか。まだ確認済みにしない。
