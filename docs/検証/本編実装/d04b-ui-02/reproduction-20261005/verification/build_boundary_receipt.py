"""未確認を適用外へ変えず、既存境界の実source/blobと合法探索を渡す。"""
from pathlib import Path
import report_io
import hashlib,json,subprocess
repo=Path(__file__).resolve().parents[3];ed=repo/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
implementation='572bb9a59b914345830df5c18f910a1deb6af2bc'
original='72d0eb58c7e3d04759f1ab56a939d1dff20a46b2';base='0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6'
def binding(commit,path,locator,observation):
 b=subprocess.check_output(['git','show',commit+':'+path],cwd=repo)
 return {'commit':commit,'path':path,'blob':subprocess.check_output(['git','rev-parse',commit+':'+path],cwd=repo,text=True).strip(),'sha256':hashlib.sha256(b).hexdigest(),'locator':locator,'observation':observation}
def cs(path,loc,obs):return binding(implementation,'apps/crossweave-godot/Core/Application/'+path,loc,obs)
def js(path,loc,obs):return binding(original,'src/runtime/'+path,loc,obs)
items=[
 cs('Expedition.cs','Live / Rebuild / NewCard / Recover / Draw / PreviewAction','Liveは未消滅札。Pool不足のminimumとLive32境界からfillerが生成され得る。birth=fillerのRecoverはdestroyedへ、未使用期限予測も同じ実処理。生成の存在を実描画済みに読み替えない。'),
 js('game.mjs','Rebuild / Recover / Draw / restoreGame','元のゲーム・再構築・回収。公開playだけの限定探索では未取得。'),
 cs('Expedition.cs','PublicCard.WithOptional / Grant / guard / CompileCard','defense_usesの欠落と存在nullを区別。Grantは欠落時だけ2。nullの効果回数はspendで減らさない。'),
 cs('Preparation.cs','BaseDetails / ValidateEquipment / owned public details','guardの既定2はキー欠落時だけ。明示nullを狭める変更はしていない。'),
 cs('Content/m1.json','cards g/r / rules / target sets','既存M1登録札。明示null guardの登録を確認できないことは、保存・移行を含む全入口の除外証明ではない。内容blobは基点から不変。'),
 js('defense.mjs','validateEffect / validateDefense / spendDefense / duration / migrateLegacyDefense','uses:nullは合法な防御効果の型で、消費されない。旧guard移行は有限1/2から移す。これだけで合法なnull札を新規生成できたとはしない。'),
 js('validate.mjs','validateDocument / validateEconomy / restoreGame / draftFor','保存provenance、旧版移行、ゲームと公開境界を検査する。保存値を任意編集した状態を合法commandの証拠にしない。'),
 js('migration-acquisition.mjs','migrateAcquisition','取得統合の旧保存移行。null公開の全入口除外根拠は未取得。'),
 js('affixes.mjs','variants / compileCard / passiveSpec','修飾compile入口。登録修飾と能力を編集せず、修飾展開は既存return offerで採取。'),
 js('possessions.mjs','initializePossessions / mapLegacySelections / acquireBasic','初期・基礎取得・旧所持移行の入口。購入は公開取得契約を通す。'),
 js('action-public.mjs','publicContract / actionPreview','予測応答と未公開境界。未公開から独自の倍率や他人の私有構成を推計しない。'),
 js('campaign.mjs','Campaign.create / open / importSave / execute / previewAction','合法な新規・再開・旧保存入力と公開command。nullの保存型受入と、null札を得る合法command列は区別する。'),
 cs('UiPublicProjection.cs','KnowledgeCategories / Copy / Grants','旧公開観測記録profile/run/actorとgrantに基づく最小の表示応答。乱数・保存DTO・私有山札を変更しない。'),
 binding(original,'docs/検証/UI/readability/co-u02/journey/records.js','recordsView / recordTargetBody / recordsPanelView','原本の現在／同探索別主体／過去・獲得と二タブ・親子。')]
payload={'task':'D04B-UI-02','implementation_sha':implementation,'status':'R01-filler / R04-unlimited 依頼内未完了','existing_sources':items,
 'searches':[{'file':'legal-common/search.json','scope':'192分岐×75上限。初期fixture生成側のcommand列に記録制限があるため、完全な全入口証明として使わない。','exhaustive':False,'found':False},{'file':'legal-boundaries/search.json','scope':'公開編成4種類×実seed0〜5の24実run。全commandを記録。filler/null公開は0。','exhaustive':False,'found':False}],
 'unit_boundary_evidence':'core-final/related.trx','unit_state_is_not_legal_render_fixture':True,'game_rules_changed':False,
 'return_to_existing_owner':[{'id':'R01-filler','owner':'ゲームバランス検討 → 本Work → UI改善','question':'Rebuild/Drawに到達するM1合法command列・seed・旧保存入口、または全入口を禁止する不変条件を固定する。生成があるため未取得だけで適用外にはできない。','resumption':'受領した同じ公開状態をreview-safety-fillerへ供給してquick ON drop待機・一回確定・再送・保存を採取。'},{'id':'R04-unlimited','owner':'ゲームバランス検討 → 本Work → UI改善','question':'content・修飾compile・新規・旧保存移行・import/restore・projectionのどの合法入口からnull札を供給できるか。validateDefenseがnullを受けるため固定M1contentだけで全入口除外としない。','resumption':'合法入口の札detail/field/knowledge payloadをreview-details-unlimitedへ供給。欠落/有限/明示nullを区別して描画・閲覧非破壊・使用結果を採取。'}],
 'other_work_messages_sent':False,'not_an_exception':True}
(ed/'contract-boundaries.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sources':len(items),'implementation':implementation},ensure_ascii=False))
