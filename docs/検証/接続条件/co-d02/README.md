# CO-D02 継続本体・途中到達A

2026-09-15 JST／先行受渡し0.1。Work `20260909-design-assembly`、作業・統合先 `dev_design_tmp_assembly`。基本設計0.53/D53は変更しない。容量8・12枚・同基礎2・習得200units等は入力0.1の試行値。

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

IndexedDB実ブラウザー、MT初期化のCPython照合、全失敗境界・保存例は後続確認中。先行Node確認を実ブラウザー合格に読み替えない。UI担当による受領・接続・人評価は未了。`test/runtime/browser-smoke.mjs`をharnessの「IndexedDBの接続確認」から実行できる。旧PT-NT原本・HTML・キーは読み書きしない。

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

今回の完了時に固定確認記録・保存例・最終コードを追記してCO-D02を終了する。CO-D03/D04/D05へ自動続行しない。
