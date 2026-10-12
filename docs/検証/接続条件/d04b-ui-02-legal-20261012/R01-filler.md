# R01-filler：既存経路と未取得の実入力

版1／2026-10-12／指示0.5。**処理・条件・公開境界は原本読取りで確認。特定seedと完全command列による到達、実保存、描画は未確認。対象外とはしない。**

## 生成→Draw→未使用期限切れ→Recover

Rebuild・Refill（Draw）・Recoverは内部メソッドで、公開Executeへその名前を送る入口はない。通常depart／play／continue_sceneの進行から呼ばれる。

山札が空の補充時、Rebuildはpoolをshuffleしcapまで取る。T=min(poolの個数,cap)、need=max(0,minimum−T)、N=全主体の非destroyed札総数、basic=min(need,max(0,32−N))、filler_count=need−basic。**need>basicが、このRebuildでfillerを生む条件**。N≥32かつT<minimumは十分条件だが、N<32でも不足が余裕を超えれば生まれる。Nは手札だけでなくdoomed・既存fillerも非destroyedなら含む。N≥32でもpoolが足りれば補充札は生まれない。

M1本人はcap12・minimum/hand_size3。現在のVはminimum1、Eは3。乱数で選ぶ既存filler_A/B/C/Dは「補填専用札」、kind none、power0、life1。NewCardでorigin=生成主体、birth=filler、remaining=null、destroyed=false。Drawがremaining=life=1にする。

本人の別の合法札をplayし、このfillerを使用しなければ、本人行動末にremaining1→0、手札から除去しRecover("expiry")がremaining=null・destroyed=trueとする。birth=fillerはpoolへ戻らない。使用したfillerや場からの回収でも消滅するが、今回の未使用手札の期限切れとは別経路。場へ設置した札を手札期限切れとして扱わない。

## 期待する公開値

| 境界 | 期待値・限界 |
|---|---|
| C# Inspect().exploration.handのbefore | 実id=P_filler_＋全主体共通の生成通番、type=filler_A/B/C/D、name=補填専用札、birth=filler、life1、remaining1、originP、destroyedfalse |
| JS display_data.exploration.hand | id/type/name/life/remaining/origin。正式projectはbirth/destroyedを手札へ出さない。details[id].recovery_rule=destroyed_on_recovery_fillerで結ぶ。CoreGame.publicの内部公開と正式projectを区別 |
| C# PreviewAction | 同idのunused_hand_expiry.expires=true、destination=destroyed、resolution_scope=after_current_action_before_next_actor。chosen idは除外 |
| JS preview_action | 同id、remaining_before1／after0、expirestrue、destinationdestroyed |
| Execute(play)後 | 同idがhandから消える。既存publicには消滅済みregistryの一覧がない。after handにdestroyed:trueの同idが残るとは期待しない。DTOの同card.destroyedtrue／remainingnullは本編の保存確認対象 |
| previewと実結果 | previewはfork。元DTO・revision・RNG・保存hash非変更の実検査は本編に残る。ExecuteはNPC進行／次補充も行い、新fillerが出得る。旧idの消滅をafter手札全体の不変と混同しない |

具体通番は未取得。P_filler_0001等を仮入力として固定していない。

## 合法操作レシピとseed（未実行）

C#公開commandはGameCommand(RequestId,ExpectedRevision,ViewToken,Type,Payload)。成功毎にInspectのrevision/view_tokenを取り直す。別操作は新RequestId、再送は同RequestId/type/payload。

1. 既存repro-home.jsonのApplicationDtoを未改変で受領し、許可された本編fixture入口でRestore。通常保存の書換えではない。
2. homeならdepart {case_id:"SCN-001"}。scene.pauseなら現在のscene_idと実表示対象displayed_text_idsでcontinue_scene（advance:true）。以後、表示されたlegal_actionsのchoiceをplay。
3. 本人手番でfiller型／remaining1と別札の合法choiceがある状態を待つ。Rebuildの上式は保存／traceで裏づけ、状態を注入しない。
4. 別choiceをPreviewAction(revision,view_token,choice)へ渡し、同filler idのdestinationdestroyedを固定。playを一回確定し、同request再送を確認するのは本編担当。
5. 本編がbefore/preview/after・隔離DTO/hash・保存hash/RNG・command件数/revision・同public idを新しい実証資料へ保存。既存の環境停止条件が解消するまで実行しない。

seedはdepartの任意payloadではなくsession.nextRun=index／active.seed=index。streamはcrossweave:AH1:<index>:<actor>|<purpose>。actor=P/V0/E1/V1、purpose=initial/allocation/generation/selection/target。UUIDだけを替えて希望の札を作る入口はない。初期deck/編成・既存RNG・target mode・シーンと全choice列も必要。**上記は条件付き手順案で、到達seed・成功step・完全列は未取得**。

## 全対象入口

| 入口 | 既存根拠と判断 |
|---|---|
| 新規・出発・再構築 | 初期札と補充を区別。Rebuildの上式はfillerを禁止しない（E016/E018/E049/E050） |
| JS import/open | content由来cardSpec・期限・位置・保存整合性を検査しrestore。filler型はruntime supplyに存在（E010/E013/E018/E035） |
| JS旧save移行 | 旧版検査後、D03Rはinitialのselection_id・経済版等を更新。fillerのbirth/type・位置・期限を注入しない（E024/E035） |
| C# DTO Restore | constructor/Expedition Validateで期限・保存整合性・poolからfiller除外を検査。受理可能なDTOと正規command到達を区別（E049/E050） |
| C# file open/reload/backup | 同形式DTO decode→Restore。JS旧saveの暗黙移行なし。復旧は新filler生成ではない（E057/E058/E060） |
| public/preview | C#はhandコピーとforkの回収先。JS正式projectは限定field。公開省略は生成禁止にならない（E037/E049） |

## 既存入力と不足

既存4入力の元commit/path/blob/SHA256は[inputs.json](inputs.json)。repro-homeはseed0出発前の20所持・資金0。guard予測step5は未使用期限切れがshared_recoveryでfillerではない。この4保存とfunded履歴のfiller記録0は限定読取り結果。旧E074の192×75・4編成×seed0..5未取得も全入口の不可能証明ではない。今回探索・fixture生成0件。

未取得は正規Rebuild/Draw後の未使用filler隔離DTO/hash、seed/index、完全command prefix、同public id、別choice。次担当は本編20260927-game-application。既存source／通信／環境停止条件の解消後、上式と公開期待値を使い探索・生成・実検査する。既存合法保存があるなら改変せず出所と履歴を渡す。取りまとめ／UIによる適用外・完了判断は未成立。

## 根拠対応

| 根拠 | commit | path | blob | 該当節・API |
|---|---|---|---|---|
| E006 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `docs/確定仕様/カード探索ゲーム_基本設計.md` | `34adda7df72ce11896dbb12c0e60d8f04ebe7670` | §5.1/5.2・§7・§8.1〜8.3 |
| E010 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/content/m1.mjs` | `1a4dee6465ca2391d0173329db3c90b100333e5f` | runtime_supply_cards／actors |
| E013 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/campaign.mjs` | `e98bd047168e1a175f1c2485885e57e7e31b8b74` | execute/import/open |
| E016 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/core.mjs` | `99d4c27ed6c52a497384cfa59e7108cb64036f74` | newCard/rebuild/refill/recover/play/assert |
| E018 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/game.mjs` | `3e723213a0d91103eca6a434632ef2c2dcf32967` | cardSpec/enter/departGame/restoreGame |
| E024 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/migration-acquisition.mjs` | `683612c087a1fa4764440184c143160be3f28126` | migrateAcquisition |
| E029 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/random.mjs` | `df1bd6cb1c1b93c13ddbafd4906d4aeee4f5d535` | runStreams |
| E035 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/validate.mjs` | `a506204bc77dc111ff50590aaa015ffd41ba3177` | validate/migrate |
| E037 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/view.mjs` | `a499a425bebb4023d60cf01b22f7a03da7e233cf` | project/actionPreview |
| E049 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Expedition.cs` | `d630a642801340d39688bf80317780960c449d43` | NewCard/Rebuild/Refill/Recover/Play/Predict/CardView/Validate |
| E050 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/GameApplication.cs` | `5ce5cd165851e3d5c8cbcf96a969e36ba49d7848` | Create/Restore/Execute/PreviewAction |
| E052 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/MtRandom.cs` | `662ca4feb3bfd5bae77885e84922fd6ddb36602d` | Streams |
| E057 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/ApplicationFileStore.cs` | `983dd5a5d46d2a1f00a75c00cec4285e8a9fc12c` | ApplicationFileStore |
| E058 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/FileGameSession.cs` | `49b2e3f32c64d05fc7a91ec8a56e1b466b7ad03a` | Open/Reload/RecoverBackup |
| E060 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/SaveFileCodec.cs` | `7e882a42be3c9bad48fc2a03ed00f2fc63c3ec41` | Decode/ValidateDto |
| E074 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `docs/検証/本編実装/d04b-ui-02/reproduction-20261005/contract-boundaries.json` | `18f9e37b5434dfae8d2ddc072b7152e3c9cc7bef` | 過去限定探索、非全入口証明 |
