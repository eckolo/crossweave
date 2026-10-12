# U-V01登録長名称／ST-P08：既存入口と状態条件

版1／2026-10-12／指示0.5。**登録・生成制約・公開API・状態条件を回答。最大3修飾例の通常campaign到達、named preset、全ST-P08の実入力／描画は未確認。** 最新ab1b dark-recheckと7211 dark-returnの返却を使い、旧recheckの判定で置き換えない。

## 登録と通常生成の関係

原本name-metricsは370組（card322・passive48）、最大25文字。現登録の計測値で、将来一般の正式上限ではない。

| 登録prototype key | 名称全文 | 原本計測長 |
|---|---|---|
| AO1:card:nt_pressure:frail:heavy:precise | 短命な・重い・精密な・潮底の踏み足 | 17 |
| AO1:passive:PS01:borrowed:focused_B:sluggish | 借り技の・B属性に専心する・鈍重な・守りからの設置 | 25 |

blueprintは既登録base、最大3affix、異なるfamily、compile下限等を検査。上の札はfrailでlife2→1を満たし、心得PS01はequipment_cost2。既存labelとbase名を「・」で連結した全文。新名称・base・affix・群は作らない。

offerのtier Iのaffix数0/1/2/3 weightは[6,4,0,0]。現SCN-001のoffer event全5箇所がtier Iで、retained sourcesから最大tierを選んでもI。II=[3,5,2,0]、III=[2,3,4,1]は設定にあるが現SCN eventからそのcontextへ進めない。**現M1の新規進行・通常帰還offerはseedを変えても上の3affix例を候補に出さない。** 登録組合せは全件購入可能な公開一覧ではない。

| 対象入口 | 全対象根拠と適用範囲 |
|---|---|
| 初期grant | 初期deck各baseのplain20枚。3修飾の初期配布なし（E010/E026/E050/E053） |
| 基本取得stock | PS01〜04 plain。任意variant keyを指定して買う入口なし（E026/E053） |
| runtime補充／借り札 | weak/fillerはruntime supplyで取得poolに入らない。観測／借り札のknowledge/unlockとvariant所有取得は別（E010/E018/E025/E049） |
| return offer | eligible pool→tier weights→決定的抽選。SCN contextはIのみ、最大1修飾。II/IIIをcommandで指定しない（E009/E010/E025/E047/E048/E053） |
| 登録／compile | 上の3修飾を表現・compileできる。登録keyを送るだけで所有する公開Executeなし（E012/E051） |
| JS import／旧移行 | validateEconomyがreturn context→candidate再生成・purchase/grant/saleの由来を照合。旧D03も検査後に移行し、D03Rはplain grant・既存UIDを扱う。通常saveへの3修飾注入は合法入口ではない（E024/E025/E026/E035） |
| C# Restore／復旧 | blueprint等検査はあるが、JS候補再生成による全来歴検査と同一でない。3修飾がDTOで表現可能でも通常到達の証明でない。復旧は既存値復元（E050/E051/E053/E058/E060） |
| name-metrics／projection | 登録・計測資料は固定。通常campaignのowned／候補の実入力とは別。details全文公開は所有付与ではない（E021/E055/E075） |

この現新規経路の制約を、全歴史保存・登録利用・readonly原本の禁止へ広げない。正規の既存3修飾保存は未取得。限定seed探索失敗を根拠にしていない。

## 候補→pending→取得→編成→詳細

idはfresh viewのhandlesを採る。prototype keyや保存UIDをowned selection_idに直接送らない。成功毎にrevision/view_tokenを更新し、別操作は新RequestId、同操作再送は同RequestId/type/payload。

| 状態・表示先 | 正規入口／公開値 |
|---|---|
| catalogue／offer | home.acquisitionの現在eligible optionsとdetails.name。370登録全件が購入可能なcatalogueではない |
| pending／build／ghost | PreviewPreparation(current revision/token,plan)。acquireはoption.id、未払い編成はpending:<同option id>。preview ownedはpending:trueの別id、read_only:true、paymentを公開。ghostはこのrowをUI表示するもので独立取得commandなし |
| formal owned | Execute(commit_preparation,{plan})がApplyを一回確定。owned.idはview scope、blueprint.keyで再同定しdetails.name全文を採る |
| 編成 | composition.equipment/deckへownedまたは今回acquireのpendingを入れる。札同base上限2、deck12、equipment容量8。previewと確定compositionを区別 |
| 詳細 | JS display_data.details[id]／C# homeのrow.detailsと既存affix projection。同variant keyの全文を各状態で結ぶ |
| 札の探索／記録 | Departが選択variantをcompileしhand/fieldへ。public card.nameとaction_history.card_name／観測evidenceのversioned snapshotを区別。未観測・過去欠落nameの勝手な補完なし |

## 再利用する既存生成済み保存

固定7211のrecheck-fix-20261006/fixtures/repro-acquisition-funded.json：
blob df4dd24867f35c5f003b7a7e264315d0b86d9671、
SHA256 fb99a7af9e3c5f551175aef56ec0c45a245f3d42e36df2ea251088a334879e28、
2,112,554bytes。祖先legal-return/repro-return-clear.json（SHA256 fc2b6bdd513d6cafe9e8218d97241316b1df2633465e30b13106f9f748436009）からの121commandを収録。新規Createからの完全121手ではない。今回command実行0。

静的読取りでDTO revision169、phasehome、nextRun4、20owned、資金1200、receipt seed0/1/2/3。choice-0はAO1:passive:PS01:borrowed、価格400、「借り技の・守りからの設置」12文字。choice-1 read、choice-2 sweep:echoing、choice-3 read:lightも400。最大3修飾例ではない。offer抽選は既存contextのseed/index/route/tier/sourcesとpurpose/serialに依存する。receiptだけを作為的に編集しない。

repro-acquisition-affixは資金300で候補400を買えない。資金を注入せず既存fundedを使う。repro-home／同byteのrepro-owned-reviewは初期所持・編成使用中・unlocked・変換不能の対照として保持し、全状態成立にしない。全元path/blob/hashは[inputs.json](inputs.json)。保存public snapshotはJS系なので、Restore後のC# Inspectを取得するのは本編の次作業。

## ST-P08合法レシピ（すべて未実行）

未改変funded DTO受領後、v=Inspect、c=v.home.acquisitionでblueprint.key=AO1:passive:PS01:borrowedのrow、plan=v.draft.planの説明用コピー。current c.idを使い、choice-0という旧snapshot値を決め打ちしない。plan.acquire=[c.id]、deckは現在12枚を維持、equipment=[]、migration_review=null。

| 状態 | command／readonly API | 原本から期待する値 |
|---|---|---|
| 未払い | PreviewPreparation(v.revision,v.view_token,plan) | pending:<c.id>、pendingtrue、payment.cost_units400／unspent_before1200／after800。実owned20のまま。pendingをlock/convertする正式owned入口なし |
| 未払い装備予定 | 上記equipment=[pending:<c.id>]でpreview | pending編成entry、equipment used2/capacity8/remaining6。確定前の予定 |
| 正式取得・未使用 | commit_preparation {plan}、equipment=[] | owned21、資金800、当該owned lockedfalse/selectedfalse/references[]/conversion_availabletrue。新個体はkeyで再同定しowned:21等を仮定しない |
| 変換見積 | QuoteConversion(v.revision,v.view_token,[owned.id]) | removed_count1/units50/unspent_before800/after850/learning_refund_units0/knowledge_and_unlocks_preservedtrue。見積はExecuteしない |
| 変換確定 | convert_items {item_ids:[owned.id]} | 個体21→20、資金850、一回確定。候補購入済みは残り元支払400をrefundしない。別の状態分岐なので未改変fundedからの隔離case生成は本編担当 |
| lock/unlock | set_item_lock {item_id:owned.id,locked:true}→同false | trueならitem_locked/conversion_availablefalse、資金・所有数不変。解除後未使用なら見積可 |
| 確定装備で使用 | commit_preparation、acquire[]、equipment=[owned.id]、deck維持 | selectedtrue/location composition、referencesにequipment。保存draftも同編成ならsaved_draft_equipmentもある。item_in_use、Quote拒否。全参照解除が必要 |
| saved draftだけで使用 | 確定equipment[]からsave_draft {plan:当該equipment入り案} | dirtytrue/formal selectedfalse、referencesにsaved_draft_equipment、item_in_use。discard_draftでこの参照を除去 |
| 複合不能理由 | 使用中の当該ownedをlocktrue | conversion_reasonsにitem_lockedとitem_in_use両方。Quote拒否はitem_lockedが先。初期grantではinitial_grant_not_convertibleも先行し得る |
| phase制約 | returnなら合法scene完了→ack_return→homeで確定操作 | return_not_acknowledged／探索中exploring。returnでpreview可と確定可を混同しない |

12文字variantでST-P08の変換可能・lock・複合理由・pendingの契約を確認する入口がある。17/25文字例の同状態実描画証明にはならない。preview／保存非破壊・再送・mouse/focus/disabled／A-B画像は本編／UIの未実検査。

## 保存presetの不足

共有API全Execute switch／Refusal、preparation schema、Usage/referencesにはconfirmed deck/equipmentとsaved_draft_deck/equipmentがある。named preset CRUD/applyやpreset UID参照はこの共有契約にない。確認済みUI取得app/runtime/layout/gestures・preparation-render/template/sessionからも、そのbindingを確定できない。

UI全体の不存在を限定検索で断言しない。**返却の保存presetがsaved draftを指すのか別のUI専用presetか未確定**。前者なら上記既存レシピ。後者ならUI原本commit/path/blob・節・保存先・Core参照解除条件の受領が必要。draftへ無断同義化せず、新APIも作らない。

## 未解決・次担当・判断事項

1. 本編20260927-game-application：既存source／環境停止条件解消後、未改変fundedから各ST-P08の合法列、初期DTO/hash、current handles、before/preview/after・保存非破壊を生成・固定。
2. UI20260910-ui-readability／とりまとめ：保存preset原本とsaved draftの採用済み対応を回答。正規3修飾保存があれば未改変byteと来歴を提供。
3. 3修飾を通常取得で要求するなら、現tier I制約との不足を取りまとめへ返す。未採用選択肢：現通常最大1修飾を確認して3修飾不足は維持／正規既存3修飾保存を受領／通常tier・contentを別の採用判断として変更。readonly登録計測をownedの成功で代用しない。最後は候補確率・戦闘バランス・保存互換・UI／受入へ影響。今回変更なし。
4. 全ST-P08、H11/H12/H13の採用、原寸適合、M1は未完了。初期home対の旧成功や候補a01の保存を必要検査完了にしない。

## 根拠対応

| 根拠 | commit | path | blob | 該当節・API |
|---|---|---|---|---|
| E006 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `docs/確定仕様/カード探索ゲーム_基本設計.md` | `34adda7df72ce11896dbb12c0e60d8f04ebe7670` | §2.24/2.25/2.27/2.28 |
| E009 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/content/economy.mjs` | `605749ad2a6611df100345af67aa5b82de1d42c1` | affixes／tiers |
| E010 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/content/m1.mjs` | `1a4dee6465ca2391d0173329db3c90b100333e5f` | initial grants／offer events5件 |
| E012 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/affixes.mjs` | `2cf70ec2e7a8b5f51384469d4c6e8cdffb1c5968` | blueprint/variants/compileCard |
| E018 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/game.mjs` | `3e723213a0d91103eca6a434632ef2c2dcf32967` | runtime supply |
| E021 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/item-details.mjs` | `3fe875134b7f0eea8c9a189ce2ad0ca0b598f0e9` | passiveDetail/cardDetail |
| E022 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/items.mjs` | `8204d3716685513e109dec03883b38447aecd0e4` | references/quote/setLock/convert |
| E024 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/migration-acquisition.mjs` | `683612c087a1fa4764440184c143160be3f28126` | migrateAcquisition |
| E025 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/offers.mjs` | `39c0621cdc229dacac2b0308cd69ecf161ed4528` | pool/drawCandidates/contextFor/validateEconomy |
| E026 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/possessions.mjs` | `ebdcdecf995f50cad04fd24bd595c42058f6d4e2` | grants/basicOptions/acquireBasic |
| E028 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/preparation.mjs` | `a30d764e6288efcfa6021351a4d8fa5772902845` | planFor/preview/inspectPreparation |
| E031 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/selection-public.mjs` | `400331cbdac9ea06483116fe593c00cd7d97b594` | handles/pending remap |
| E035 | `5737f9ebff48b5e5bde1ed1fb90e59dc0fcbc7d4` | `src/runtime/validate.mjs` | `a506204bc77dc111ff50590aaa015ffd41ba3177` | import/migrate |
| E049 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Expedition.cs` | `d630a642801340d39688bf80317780960c449d43` | Depart/hand/PublicCard/Observe |
| E050 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/GameApplication.cs` | `5ce5cd165851e3d5c8cbcf96a969e36ba49d7848` | PreviewPreparation/QuoteConversion/Execute/Refusal/Restore |
| E051 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Json.cs` | `3b05bd0d5c2f924c862aeac1cf43a4fb355eeea4` | Content.Blueprint/Variants/Compile |
| E053 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/Preparation.cs` | `2218254bb49ceb7aa4fc70225361c2e606131c47` | InitialEconomy/Options/Apply/View/Usage/Quote/Offers |
| E055 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Core/Application/UiPublicProjection.cs` | `24bdf7e83c9ec1a219b05e9f27574d715473d7f0` | AddAffixes |
| E058 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/FileGameSession.cs` | `49b2e3f32c64d05fc7a91ec8a56e1b466b7ad03a` | 同DTO復旧 |
| E060 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `apps/crossweave-godot/Infrastructure/Application/SaveFileCodec.cs` | `7e882a42be3c9bad48fc2a03ed00f2fc63c3ec41` | file format1 |
| E071 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `docs/検証/本編実装/d04b-ui-02/recheck-fix-20261006/fixtures/repro-acquisition-funded.json` | `df4dd24867f35c5f003b7a7e264315d0b86d9671` | 既存funded DTO/履歴 |
| E072 | `7211a605a04de36f9465fbae31979c4d6b0acf8f` | `docs/検証/本編実装/d04b-ui-02/recheck-fix-20261006/fixtures/repro-home.json` | `27e15baafc8f31f25c99ebbe2dd719688b1f049d` | 初期home限定対 |
| E075 | `72d0eb58c7e3d04759f1ab56a939d1dff20a46b2` | `docs/検証/UI/readability/co-u02/acquisition-preview/name-metrics.json` | `b072e70fc6ab9558e03e93b111d0303ecf0d5975` | 登録370組・計測値 |
| E076 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/acquisition-preview/app.js` | `6647011464878cf3a2c75effe52a6f9ec192a62e` | UI取得app |
| E077 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/acquisition-preview/gestures.js` | `8a250082898cd2982e40cb739ca4620c136d6a3f` | UI gestures |
| E078 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/acquisition-preview/layout.js` | `bf0487fa5e456d64a336a6312e8a68af38a8a7fb` | UI layout |
| E080 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/acquisition-preview/runtime.js` | `e5ec3ee26b45f0549919b125d8060069ea47a962` | UI runtime |
| E081 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/preparation-render.js` | `b27933142509d1829043737efb6600e6c8843020` | UI preparation render |
| E082 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/preparation.template.js` | `c9dfc2b391903ea74935dfd6cdac43bd5c58d4cb` | UI template |
| E083 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/co-u02/session.js` | `1355055f2527298dff1eeb0fb4212379cbe94904` | UI session |
| E084 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/godot-ui-review-01/dark-recheck-20261006/owned・追加導線の返却.json` | `431bfdbdfa0eab359019288237d9359a93993886` | 最新owned不足 |
| E085 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/godot-ui-review-01/dark-recheck-20261006/合法入力返却.json` | `d2d0b8192cebb67d1485e78ea2f94d24fbaf16fe` | 最新合法入力3問 |
| E086 | `ab1b6fa067877a140ac9e9c9c006c70da76e40b4` | `docs/検証/UI/readability/godot-ui-review-01/dark-recheck-20261006/必要群判定.json` | `46bd1a3eeb9f49fc6f145f639a8246e992c0044f` | 最新必要群/closed判定 |
