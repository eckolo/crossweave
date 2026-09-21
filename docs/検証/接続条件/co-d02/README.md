# CO-D02 継続本体・途中到達A

**最新：[D58・全員付与への場補正と内容0.2](appendix-d58/README.md)。** J02を承認・実装済み、判断待ち0件。rules/engine0.5・公開0.4、版付き試行札を通常探索へ登録し、旧探索・領収・目録を保全。39項目・8探索を確認。UIの新札表示・目録識別・防御予測と実機は後続。以下の「J02判断待ち」は過去の状態。

**最新の設計試行：[防御付与札の循環比較](defense-cycle/README.md)。** 本編と同じ演算で224条件の第一環境進行を比較。本編配置前のJ02（全員付与への場補正）を推奨案付きで判断待ち。runtime・本編入力・D54〜D57の採用状態は不変。

**最新追補：[D57・受け手側の終了条件](appendix-d57/README.md)。** 付与元退場後の維持を承認済み、受け手退場時の全解除・旧保存互換をrules/engine0.4へ接続。公開契約0.3、今回の判断待ちは解消。以下の版・試行条件・結果は各提出時点の記録。

**前回の防御処理（2026-09-19）：[D56・張り直し方式と効果別管理](appendix-d56/README.md)。** rules/engine/public契約0.3、旧保存互換・43項目の限定確認。以下の過去の版・結果は固定履歴として読む。

**2026-09-18追補：[CO-D02R — UI受領・公開API追加](appendix-d02r/README.md)。** UI 0.11.1の通常入口と9場面入口を設計枝へ選択受領。全能力の一手後予測、履歴札名、本人山札、過去本文、調査キーを追加した。保存schemaと現行演算を維持。結果は[追補報告](appendix-d02r/report.md)、身構統一の未採用部分は[判断資料](appendix-d02r/stance-decision.md)。下のUI未受領・ZIP待ちはD02提出当時の記録で、現行の停止理由ではない。

2026-09-15 JST／成果提出0.2（先行受渡しは68da4ff0）。Work `20260909-design-assembly`、作業・統合先 `dev_design_tmp_assembly`。基本設計0.53/D53は変更しない。容量8・12枚・同基礎2・習得200units等は入力0.1の試行値。

## 公開入口と起動

実モジュールは `src/runtime/campaign.mjs`。exportは `Campaign`、`createCampaign({storage})`、`versions`。ビルドなしのES Modulesで、ブラウザーとNodeが同じ演算を使う。既定CampaignはIndexedDB。Node確認時だけ同じload/commitインターフェースの検査用保存アダプターを注入する。実行核から旧試験・Python・Node fs/cryptoは呼ばない。乱数初期化のSHA-512は標準Web Cryptoを使用する。

リポジトリのルートで次を起動する。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

同一オリジンの開発確認入口：`http://127.0.0.1:8000/docs/検証/接続条件/co-d02/harness.html`。公開module URLは `http://127.0.0.1:8000/src/runtime/campaign.mjs`。fileスキームや一時iframeは保存の確認先にしない。harnessは本体の接続・保存確認用で、UI担当の画面を置き換える成果ではない。

```js
import {Campaign, versions} from '/src/runtime/campaign.mjs';
const controller = await Campaign.create({
  slot_id: 'm1-local', rule_set_id: versions.rule_set_id,
  content_set_id: versions.content_set_id, request_id: crypto.randomUUID()
});
// 既存保存の再開は別操作。失敗時にcreateへ切り替えない。
// const controller = await Campaign.open({slot_id:'m1-local'});
let view = await controller.inspect();
view = await controller.execute({
  request_id: crypto.randomUUID(), expected_revision: view.meta.revision,
  view_token: view.meta.view_token, type: 'depart', payload: {case_id:'SCN-001'}
});
```

create/open/importSaveは成功時controllerを返し、失敗時は`code/field/details`の付いたErrorでrejectする。既存slotへのcreate/importは拒否。`controller.exportSave()`は完全保存オブジェクトを返す。`Campaign.importSave({slot_id,document,request_id})`はオブジェクトまたはJSON文字列を検証し空slotへ保存する。輸入はcampaign/run/本文/探索/領収を保持し、revisionを1増やしてimport要求を記録する。

## UIに渡す契約

inspect、previewPreparation、quoteConversion、previewAction、executeの戻り値は`{schema:'CW-M1-view-1',meta:{revision,view_token},display_data}`。描画へ渡すのはdisplay_dataだけ。元save・request_log・RNG・未公開catalogue・出典は含めない。読みと比較は同期でもawaitでき、保存操作は必ずawaitする。通常の操作失敗は`display_data.error={code,field,details}`、成功は`operation={status:'committed'|'replayed',committed_revision}`で返す。

| 呼出し | 引数・結果 |
|---|---|
| inspect() | 実状態のphase/capabilities/home/details/draft/case/scene/exploration/receipt。純粋読取り |
| previewPreparation({view_token,plan}) | D01/BDの明示plan。コピー上の取消・既払・返還・支出・構成差。保存しない |
| previewAction({view_token,choice}) | 現在合法な本人の一手のみ。設置・一致効果と現在予約、未使用手札の期限。後続NPC選択や本人次手番到達を保証しない |
| quoteConversion({view_token,item_ids}) | Aではfeature_not_connected |
| execute(command) | 下記操作をコピーで計算し、保存側revisionを再照合して一括保存。成功後だけメモリーへ反映 |

planは`{retain_learning,cancel_learning,candidate:null,purchase_timing:'before_preparation'|'after_preparation',next_preparation:{learn,equipment,deck}}`。learnは新しく習得する基礎IDだけ、equipment/deckは選ぶ全体。無料札と基礎装備は`base:f`、`base:PS01`等。初期planは`inspect().display_data.draft.plan`。下書き保存後は枚数不足等も保持するが、確定・出発は合法性を要求する。

| type | payload／実装範囲 |
|---|---|
| save_draft / commit_preparation | `{plan}`。homeだけ。返還は本人が列挙したcancelだけ、取消で装備解除、失敗は元状態・保存下書きとも不変 |
| discard_draft | `{}`。確定構成から下書きを作り直す |
| depart | `{case_id:'SCN-001'}`。成功時だけattempts/nextRun増。mode等の上書き入力は拒否 |
| continue_scene | `{scene_id,advance?,displayed_text_ids?}`。既定trueは停止解除。falseは現在の適格本文の表示記録だけ。任意詳細を自動既読にしない |
| play | `{choice:{card_id,target}}`。現在のlegal_actionsをそのまま指定 |
| withdraw | `{}`。探索中の明示撤退。港の停止中も可 |
| ack_return | `{}`。return確認後homeへ。確定構成から新draft。任意planの移送なし |
| purchase / convert_items / set_item_lock | Aはfeature_not_connected。実候補・個体・購入・変換を捏造しない |

同request_idはtype/payloadの署名を先に照合する。同内容なら元の確定revisionと最新viewを返し、同IDで異なる操作ならrequest_conflict。新要求はexpected_revisionとtokenの両方を確認する。別タブ更新時はstale_revisionで操作を拒否し、openで再読込みする。既払額を現在使える資金へ合算しない。

## 接続済みと未了

初回・未解決再挑戦・解決後再訪、入口／港／水門／終了の停止、踏破／撤退／緊急脱出、帰還の一回精算・確認、同保存の次出発を実装。知識は観測と初攻略catalogueを区別し、全帰還で保持。港の本文遷移でHP・札・時刻を変えない。任意DETAIL06は実表示記録までCL05を付けない。nt_flow/pressure/stopは共通札登録・署名・初期配分・場・借用・復元へ接続。

先行確認 `code-01` / `smoke-01.json`：seed 0、初期資金0から39本人行動で踏破し300units。帰還後PS01習得・装備、回復札1枚を防御へ変更し100unitsを残して同保存からrevisitへ出発。再訪は34本人行動で緊急脱出。これは公開情報だけの固定機械方策による接続確認で、構成の優劣・面白さ・人の理解を証明しない。

最終確認は `verification.json` と `report.md`。code-06で保存／公開／進行の21項目、基礎心得／容量の5項目が合格。最終code-07は、UI最新記録を踏まえた保持済み解放札の公開詳細を追加し、5固定保存で未知札の非公開・無料／所持／選択条件の維持を確認した。MTはCPythonと80系列一致。自然進行の5保存例を最終本体で復元・JSON輸入確認した。実ブラウザーは確認入口がERR_BLOCKED_BY_CLIENTで開けず、IndexedDB実行0・DOM確認0・人評価0。先行Node確認を実ブラウザー合格に読み替えない。UI59c96caの停止記録で先行本体68da4ffの同期報告を確認した。新UIコードは先方の保存制限によりブランチ未反映で、設計側のUI実装取込み・実接続・人評価は今回完了していない。`test/runtime/browser-smoke.mjs`をharnessの「IndexedDBの接続確認」から実行できる。旧PT-NT原本・HTML・キーは読み書きしない。

## 出典とA→B

内容入力はCO-01Aの`m1-input.v0.1.json`（blob `8487b2288b4e701953887be90949242f4d951a71`）からbuild時に静的抽出。`src/content/m1.mjs`にsource SHA-256、`scripts/generate-m1-content.py`に選択項目を保存する。初期化と検証の原本は固定基点aa301ef内の資料を参照。

| 本体 | 抽出・照合元 |
|---|---|
| core.mjs / random.mjs | AM `posture_am/engine.js`のMT・札循環・体勢・一致・手番。初期化はAH `choice_inputs.py`のCPython文字列seed条件。旧機械choose・比較読込み・160手cutoffを実行核へ移していない |
| game.mjs | AH `expedition_choices.js`の基礎効果・A経路、AI借用観測、AQ装備した基礎のみ有効、M1対象別profile/version・NT配分 |
| information.mjs / knowledge.mjs | AC情報署名・公開投影、AD観測／初攻略・全帰還保持 |
| preparation.mjs | BD表示境界と順序、AH実払返還、AQ容量、AU無料初期集合・基礎合算上限 |
| settlement/story/validate/campaign/storage/view | D01接続条件0.2、CO-01A入力0.1、CO-01実装基準0.3に基づく今回実装 |

保存schemaはCW-M1-save-1、実装IDはCW-M1-engine-0.1。D03でA保存を継承するため、解放集合・各runの獲得と保持／喪失・領収・未使用資源・既払習得・構成・知識・案件を保持する。適格帰還は`economy.at.pending_contexts`へrun/seed/index/tier/保持source keys/その時点の解放後card_basesを一回記録する。Aでは候補生成を実施せず、current:null・batches:{}・inventory:{}を保つ。

Bはこれらの元条件を使い、一回の明示互換移行で適格帰還contextを消費してAT台帳へ接続する必要がある。閲覧のたびに再抽選しない。古い適格contextをどう有効化し最新候補へ対応するかはD03が記録し、過去の点・報酬を再加算しない。現AはBの新engine版や非空個体保存を拒否する。後方互換を崩す場合は新しい版と明示変換が必要で、自動初期化は行わない。

本体・条件・固定確認記録・保存例を成果提出してCO-D02を終了する。CO-D03/D04/D05へ自動続行しない。


## 保存例と再現

`saves/`に自然進行から採取したentry（入口停止）、port（港停止）、return（初回踏破帰還）、home（PS01習得・構成変更後）、second-return（再訪緊急脱出帰還）の完全保存JSONをgzipで収録。圧縮は運搬用で保存schemaの変更ではない。`saves/manifest.json`は展開前後のSHA-256を持つ。境界用にHPを作った再訪踏破状態はこの自然保存例へ混ぜていない。

```sh
python - <<'PYTHON'
from pathlib import Path
import gzip
out = Path('/tmp/crossweave-m1-a-001')
out.mkdir(exist_ok=True)
for p in Path('docs/検証/接続条件/co-d02/saves').glob('*.gz'):
    (out / p.name.removesuffix('.gz')).write_bytes(gzip.decompress(p.read_bytes()))
PYTHON
```

例のJSONを開発入口の「保存JSON」へ入れ、未使用の保存枠名を指定して「空枠へ読み込む」。同じoriginで読込／再読込し、phase・停止・本文・資源・案件が保たれることを確認する。IndexedDB実機確認は未了なので、担当がこの結果とブラウザー版を記録する。

必要な場合だけ次の固定確認を再現できる。既存結果を再生成する開始条件にはしない。出力先は毎回新しいフォルダを指定する。

```sh
python test/runtime/check-random.py
node test/runtime/run-boundaries.mjs /tmp/crossweave-m1-a-001 /tmp/crossweave-m1-check-new
```

自然進行を新しい診断として再現する場合のみ `node test/runtime/run-node.mjs /tmp/crossweave-m1-natural-new`。表示の正しさ・人の選択理由はこの方策の結果では評価しない。

保持済みの解放札は、探索／帰還／拠点の `details["base:" + base_id]` から名前と性能を読める。detailsの存在は無料選択権や所持を表さず、札組の選択可能集合はhome.free_card_optionsと将来のownedから読む。
