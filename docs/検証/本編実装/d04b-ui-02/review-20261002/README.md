# D04B-UI-02 UIレビュー追補（2026-10-02）

WorkID `20260927-game-application`、枝 `impl/m1-godot-application-20260927`。初回提出 `2102aca1144ce6dfcdf393528cf66b3bea5133e1` の同じ本編を継承した。**R01〜R07とU01を実装し、関連確認を完了。公開保存・読戻しはpublication.jsonへ記録する。UI適合再判定は別工程として待つ。**

原本：[適合確認](received/適合確認.md)、[review.json](received/review.json)、[レビュー引継ぎ](received/とりまとめ引継ぎ.md)。固定UIレビュー `4b8dae9bff7bf0293ced6996b93e85d9f21139df`、指示書0.3。UI枝全体はマージせず、初回実装と配布3ファイル受領を再実施していない。

## 受領・同期・保全

最新計画 `fcbdff3622aebc8045b1bb529e424d429422c88f` のとりまとめ全59path/blobを実同期した。その後、技術 `21ddd349b6bec69ecac6d9db288c537553dab860` の既定同期を確認し、追加差分なしと記録して計画全体を再照合した。[sources.json](sources.json)、[最終照合](final-source-audit.json)、[計画同期JSON](../../../../作業資料/計画同期/20260927-game-application.json)。再fetchでも両元commitと自枝の初回HEADに変更なし。

開始時の追跡差分なし。旧「ゲーム本編実装」はidleを確認し、別Work・枝・並列エージェント・他Workへの送信を行っていない。到達できない旧窓口の未保存差分がないと推定はしていない。既存配布ZIP・展開物は未追跡のまま保全。旧証拠、Content、src、Infrastructure、保存fixture、素材、Proof、固定ツール、入口等の保全440pathのblobは初回提出と一致した。通常セーブの削除・初期化・読み書き、配布生成、素材制作はない。

## 指摘への対応

[UI対応表](UI対応表.md)に7指摘とU01の実装・指摘別結果・残件を集約した。初回のR1〜R6と番号を混同しない。R01・R03を先に実装し、取得・詳細・予測・行動順・送り操作を同じGameScreenで修正した。

## 確認結果

- 関連.NET回帰：15件合格、失敗0、skip0。[限定filter・source hash](selected-regression/manifest.json)、[TRX](selected-regression/selected.trx)。全旧73件は繰り返していない。
- 関連Godot確認：20モード、472確認、Coreと実保存へ照合した86操作。[集約結果](results.json)。初回の15モードを一律に再実行していない。
- 自然一巡：[natural](targeted-third/natural.json) の79操作・327確認。本文、探索、帰還、取得編成、再出発・再訪と二重精算防止を確認。
- 別プロセス：[quick設置](targeted-first/review-safety-quick.json) → [再開](targeted-first/review-resume.json)。プロセスID別、全DTO一致、次の一手の乱数を含む結果と実保存一致。
- U01：実ノードの自然寸法を撮影してから、同じnodeだけ限定寸法にした。自然FHDはoverflow=0。余白入力で取得140、手札180、場180へ送り、DTO・Plan不変。[修正前](before-U01-corrected/manifest.json)では同じ3入口が0のまま。
- R06：所持の移動先99、元列0。場も移動先だけ送られ、領域外・取消で進行しない。移動可否文字の重なりは画像確認後に背景だけ調整し、関係3モードを[final-caption](final-caption/manifest.json)で再確認した。

環境はWindows11 build26200、固定SDK10.0.401／Godot4.7.2 mono、Main.tscn、論理・実窓1920×1080。実Godotノードへviewport-local合成InputEventを送り、隔離slotのFileGameSessionを使った。画像は実viewportのレンダーで、画像加工やmockではない。ビルドは警告0・エラー0。物理入力の受入を意味しない。

## 修正前後の実描画

| 対象 | 初回2102acaの描画 | 追補後の描画 |
|---|---|---|
| R01 元主体離脱による消滅ドロップ | [即実行](before-doomed/review-before-consume-R01-before-after-drop.png)・[revision0→1](before-doomed/review-before-consume.json) | [予測で待つ](final-details/review-safety-doomed-R01-after-drop.png)・[消滅と予約](final-details/review-safety-doomed-R01-expiry-and-order.png) |
| R01 consume消滅 | [前](before-review/review-before-consume-R01-before-after-drop.png) | [予測](final-details/review-safety-consume-R01-after-drop.png)・[消滅](final-details/review-safety-consume-R01-expiry-and-order.png) |
| R02 混合取得確認 | [前](before-review/review-before-preparation-R02-before-review-top.png) | [後](final-caption/review-preparation-R02-mixed-top.png)・[下部](final-caption/review-preparation-R02-mixed-bottom.png) |
| R02 編成だけ／心得だけ | 初回の総数・支払中心 | [編成だけ](final-caption/review-preparation-R02-composition-only.png)・[心得だけ](final-caption/review-preparation-R02-passive-only-bottom.png) |
| R03 予測・主体・本人 | [guard予測](before-review/review-before-guard-R03-before-prediction-top.png)・[攻撃の主体](before-review/review-before-attack-R03-before-actors.png) | [guard予測](final-records/review-prediction-guard-R03-prediction-top.png)・[攻撃の本人／主体](targeted-first/review-prediction-attack-R03-self-and-actors.png) |
| R04 札詳細 | [前](before-review/review-before-guard-R04-before-detail-bottom.png) | [防御・場加算](final-records/review-prediction-guard-R04-hand-detail-bottom.png)・[付与](final-records/review-prediction-defense_support-R04-hand-detail-bottom.png)・[記録](final-records/review-prediction-guard-R04-record-bottom.png) |
| R05 同時刻・本人位置 | [前](before-review/review-before-tie-R03-before-actors.png) | [後](targeted-second/review-order-tie-R05-order-strip.png)・[予約](targeted-second/review-order-tie-R05-reservations.png) |
| R06 可否表示・端送り | [初回の別場面](../final-presentation/inheritance-preparation-drag.png) | [未払い取消可](final-caption/review-destination-R06-pending-cancel-allowed.png)・[正式所持取消不可](final-caption/review-destination-R06-owned-cancel-denied.png)・[場の端](final-caption/review-destination-field-R06-field-edge-scroll.png) |
| R07 上限の詳細入口 | [取得が有効のまま](before-review/review-before-preparation-R07-before-detail-stage.png) | [無効](final-caption/review-preparation-R07-detail-disabled.png)・[ドロップ拒否](final-caption/review-preparation-R07-drag-denied.png) |
| U01 取得列 | [前](before-U01-corrected/review-scroll-prep-U01-after.png) | [後](targeted-third/review-scroll-prep-U01-after.png) |
| U01 手札 | [前](before-U01-corrected/review-scroll-hand-U01-after.png) | [後](targeted-third/review-scroll-hand-U01-after.png) |
| U01 場 | [前](before-U01-corrected/review-scroll-field-U01-after.png) | [後](targeted-third/review-scroll-field-U01-after.png) |

before-review／before-doomedは初回commitの製品コードを隔離コピーし、検査クラスだけ加えた。新WorkやGit枝ではない。製品path/blobと検査overlay hashは各manifestへ記録。比較のR01〜R05・R07とU01は同じ固定状態／操作。R06の初回画像は別場面であることを表で区別した。原本UIレビューの画像や判定を今回の成功へ転記していない。

## 残件と再開条件

R01の補充由来札の消滅と、R04の明示nullによる無制限guard札は**実描画未確認**。固定oracleと32分岐889合法commandから該当状態を得られなかった。数値や札を改変して再現したことにはしていない。消滅先による共通判定、null→制限なし／欠落→未公開の実装は済んでいる。規則を変えずに合法な公開状態が得られたら、同じ隔離入口 `review-safety-filler`／`review-details-unlimited` で再開する。[機械記録](results.json)に理由・再開条件を固定。

後続の同じUI改善Workによる関係箇所再確認、修正版配布、Windows11実機受入は未完了。物理マウス・タッチ、DPI、複数画面、音・GPU性能、利用者の試遊は別工程。自己判断でUI適合や配布完了にせず、他Workは起動・送信しない。とりまとめ側の追補受領も未確認。後続は固定実装／証拠SHAを対象に再確認を開始する。

## 教材・確認入口・公開保存

[コード解説と読む順](../コード解説.md) → [確認入口](../確認入口.md) → [対応表](UI対応表.md) → [結果JSON](results.json)。公開済みの実装／証拠SHA・全変更path/blob・GitHub tree照合は[publication.json](publication.json)、とりまとめ向け要約は[引継ぎ](../とりまとめ引継ぎ.md)。クラウドではこの文書と画像をGitHubから読み、SDK等を導入せず確認できる。開発用依存の準備は担当側で行う。

## 停止・訂正した試行の保全

baseline-fixturesはsandboxでNuGet設定を読めず停止、baseline-fixtures-2は検査型宣言のビルド修正前。初期のfield送り座標はスクロールバーに重なり、証拠に採用せずbefore-U01-correctedで余白座標へ訂正した。初期prepは札tabで行が不足していたため、心得の実列で再現し直した。

fixture-finalは生成indexのalias集計漏れで停止し、fixtures-fixedで修正。targeted-firstはdefense_supportのunderscoreが保存slot契約に合わず停止し、slot名だけhyphenへ写して続行。targeted-secondの混合取得は成功後、公開handleを確定後に取り直す検査手順へ訂正。final-detailsの記録札は汎用dialog-bodyではなくknowledge-detailを読む必要があり、final-recordsで訂正した。失敗結果は削除・成功へ書換していない。

採用した各成功caseの入力ソースhashと、その後の変更範囲をresults.jsonへ記録した。targeted-first／second全体は途中停止であり、成功caseだけを版と合わせて採用する。製品の最終差分は可否文字の背景のみで、関係入口を再確認済み。検査側の座標・ID・ノード指定変更を製品の修正と混同しない。
