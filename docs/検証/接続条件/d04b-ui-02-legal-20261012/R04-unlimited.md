# R04-unlimited：null・欠落・有限値と入口

版1／2026-10-12／指示0.5。**原本・コードの意味は回答。通常生成由来の明示nullカード／合法保存の実入力は未取得。全入口null禁止とは結論しない。** 仕様・content・DTO・C#の変更なし。

## 別々に扱う値

| 対象 | 明示null | 項目欠落 | 有限値 |
|---|---|---|---|
| 防御札defense_uses | 一致防御がuses=nullのself_guardを付与。その札の正規由来が別途必要 | 一致防御時default2。ContainsKey／Object.hasOwnで判定 | 指定回数を付与 |
| defense_effects[].uses | 無制限。合法一致攻撃では減らさず、受領主体自身の一致／退出では解除 | JS exact5key検査で拒否。C# Validateはkey有無を調べずnull相当として扱う静的差 | 正整数。一致攻撃毎に1減り0なら効果除去 |
| public guard自体 | guard=nullは効果なし | 領域ごとのschemaで判断 | {value,evasion,uses}は集計 |
| public guard.uses | 1つ以上無制限、または複数有限回数が不一致でもnull | raw効果の欠落と同一視しない | 全効果が同一有限回数ならその数 |

**集計guard.uses=nullだけで「制限なし」と表示できる契約ではない。** self_guard2とdefense_support1など、全leafが有限でも集計usesはnull。JSはdefense.effectsとduration.all（unlimited/finite_min/finite_max/status）を公開。C#はdefense.effectsと合計guard/evasionを公開するが同じduration shapeではない。カードdefense_uses:nullと集計mixedを分ける。

## 生成・compileから公開までの全対象入口

| 入口 | 確認した既存扱い・合法入力の限界 |
|---|---|
| content | 現guard g/r/brace/read/nt_stopはdefense_uses keyなし。nt_wardはdefense_supportのdefense_grant.uses1。weak/fillerはguardでない。全baseと生成関数から、現新規contentは明示null防御札を生まない |
| 修飾blueprint／compile | baseコピーへ既登録deltaのpower/hit/life/field/cost/evasion等を加える。回数keyを補うdeltaなし。baseがnullなら保持、欠落なら欠落。現base×affixで欠落→明示nullを作らない |
| Create／depart／Draw／play | 初期経済→選択variant compile→札。NewCard/Drawは回数を変更せず、playのhas-own-key分岐で欠落2／null保持。seed抽選やpayloadで任意nullを指定するcommandなし |
| JS現save import/open | 登録cardSpec整合性とeffect exactkeys等を検査。effects[].uses:nullを形として認める。受理可能なeffectsと通常command由来は別。登録外null札を注入して合法としない |
| JS旧版移行 | engine0.1/0.2 legacy guardのusesは1/2。legacy guard=nullは効果なし。D56のengine0.3以降active effects nullは保持、D57でinactive受領主体は除去。D03Rは経済・選択ID等を移行しactive回数を新設しない |
| C# DTO Restore | 形式1・rules/content一致→document/Expedition Validate。effect nullは許す。Expedition.ValidateはcardとContent.Cardの全面照合をしていない。任意DTO受理を正規command到達の証明にしない |
| C# file open/reload/backup | version1 decode→同Restore、既存値復元。JS save1/2の暗黙変換なし。復旧はnull新規生成ではない |
| JS hand/field/detail/knowledge | I.card optional fieldsはhasOwnならdefense_usesを出す。欠落は省略、null保持。集計は上表 |
| C# hand/field/own_deck、home owned/acquisition details | Guard札でkey欠落の説明コピーのみ2補完。ContainsKey trueのnullは保持。保存card値は変えない |
| C# PublicCard→knowledge | WithOptionalはkeyがある時だけコピー。欠落省略、null保持。全C#領域に必ず2が出る回答ではない。既存観測／公開evidenceが必要 |

## 操作条件と期待結果（未実行）

有限対照には既存review-prediction-guard.jsonを未改変で使える。seed0／natural step5、choice={card_id:"P_initial_0010",target:null}、保存preview.guard={value:1,evasion:30,uses:2}。元blobとSHA256はinputs.json。Restore後にfresh Inspectしchoice合法性・revision/view_tokenを使う。旧JS public_viewを新C#公開payloadとして扱わない。

正規明示null札が供給された場合の手順案：未改変DTO→Inspect→同属性の場へ一致する合法guard choice→PreviewAction→Execute(play)→相手の合法一致攻撃が複数回解決したview/DTO。defense_effectsの同source_actor_id/effect_kindのuses:nullは攻撃で減らない。ただし本人の一致、同source/kindの再付与、退出が入れば解除／置換。有限2→1→除去、support1→除去。防御札の設置だけでは一致効果を付与しない。previewの保存/RNG非破壊は本編未実検査。

このnull手順の合法DTO・seed・完全列・public idは**未取得**。seedはrun index、保存RNG、content/affix来歴も必要。現contentにnull生成元がなく、seed全探索でカードnullの入口を新設することはできない。

test/runtime/d56-trial-input.jsonのstance_uses=[null,5]等はResolver専用仮条件でSCN／正式deckではない。d56.mjsのcounterfactual／TrialGameは境界の旧検査資料。通常campaign fixtureへ置換しない。今回実行0。

## 不足・次担当・未採用の選択肢

- 必要入力：正規生成／過去保存由来のdefense_uses key:nullカードまたは無制限leafの未改変DTO。commit/path/blob/SHA256・元版・seed/index・全command prefix、hand/field/knowledge payloadを同idで結ぶ。effect nullだけではカード詳細nullのUI要求を満たさない。
- 次担当：本編20260927-game-applicationが既存source／通信／準備の停止条件解消後にfixture・before/preview/after・保存非破壊を作成。UI20260910-ui-readabilityが対象field／表示を判定。とりまとめが必要入力と適用範囲を受領して割当。
- JSとC#の「effect key欠落」検査差を本編へ返す。C#現Validateは明示nullと欠落を区別しない。保存互換への影響を確認して必要検査・修正を判断する静的事項で、今回不具合確定／C#修正はしない。
- 未採用選択肢：既存の正規無制限保存を取得／通常default2対照と無制限Resolver境界を分けて不足維持／通常新規にnull札が必要なら別のcontent・版・影響の採用判断。最後は候補生成・戦闘・表示・保存・受入へ影響する。このWorkで札・回数は追加しない。

全入口null禁止の証明は成立せずR04を対象外／UI完了にしない。原本回答依頼の完了と無制限カードの実入力・描画を分ける。

## 根拠対応

| 根拠 | commit | path | blob | 該当節・API |
|---|---|---|---|---|
| E006 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `docs/確定仕様/カード探索ゲーム_基本設計.md` | `34adda7df72ce11896dbb12c0e60d8f04ebe7670` | §4.6／D56-D57 |
| E010 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/content/m1.mjs` | `1a4dee6465ca2391d0173329db3c90b100333e5f` | guard全base／nt_ward／legacy |
| E012 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/affixes.mjs` | `2cf70ec2e7a8b5f51384469d4c6e8cdffb1c5968` | blueprint/compileCard |
| E016 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/core.mjs` | `99d4c27ed6c52a497384cfa59e7108cb64036f74` | guard付与／attack／match解除 |
| E017 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/defense.mjs` | `4cb9c5fd368eb72c5b0b10c48b97183fa2286639` | validateEffect/spendDefense/guardView/legacy |
| E020 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/information.mjs` | `5f7b910ed9e16cf48850bdb2c84f93cdcabfff96` | card optional fields |
| E021 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/item-details.mjs` | `3fe875134b7f0eea8c9a189ce2ad0ca0b598f0e9` | cardDetail |
| E024 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/migration-acquisition.mjs` | `683612c087a1fa4764440184c143160be3f28126` | migrateAcquisition |
| E035 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/validate.mjs` | `a506204bc77dc111ff50590aaa015ffd41ba3177` | validate/migrate各旧engine |
| E041 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `test/runtime/d56-trial-input.json` | `de0daf9120c2fc0269954bb83a818f3446563773` | Resolver専用trial scope |
| E042 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `test/runtime/d56.mjs` | `86368f2a0bc0937888f79b3a6e659c48f800031a` | counterfactual/TrialGame（今回は未実行） |
| E049 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Expedition.cs` | `d630a642801340d39688bf80317780960c449d43` | Play/Guard/CardView/PublicCard/Validate |
| E050 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/GameApplication.cs` | `5ce5cd165851e3d5c8cbcf96a969e36ba49d7848` | Create/Restore/PreviewAction/Execute |
| E051 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Json.cs` | `3b05bd0d5c2f924c862aeac1cf43a4fb355eeea4` | Content.Card/Compile |
| E053 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Preparation.cs` | `2218254bb49ceb7aa4fc70225361c2e606131c47` | Viewの欠落2説明コピー |
| E058 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/FileGameSession.cs` | `49b2e3f32c64d05fc7a91ec8a56e1b466b7ad03a` | Open/Reload/RecoverBackup |
| E060 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/SaveFileCodec.cs` | `7e882a42be3c9bad48fc2a03ed00f2fc63c3ec41` | DTO1／JS暗黙移行なし |
