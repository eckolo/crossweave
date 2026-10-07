"""修正候補・停止地点・依存を同じWorkの提出資料へ対応させる。

描画不能／testhost接続不能／保存キャンセルを成功に変換しない。
元の判定57IDと必要17群を保存し、自分の静的確認でUI合格数を増やさない。
"""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
PFX='apps/crossweave-godot/Godot/Application/'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(name,d):
    (OUT/name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def md(name,s):(OUT/name).write_text(s,encoding='utf-8',newline='\n')
def blob(p):
    b=p.read_bytes();return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
code=read(OUT/'code-candidate.json')
review=read(OUT/'fixed-input/dark-recheck-20261006/判定.json')
plan=read(ROOT/'docs/作業資料/計画同期/20260927-game-application.json')
changes={
 'V-C01':(['AcceptedStyle','Layout','AcceptedWindows','AcceptedFlow','Exploration'],'自然高と役割line boxのleadingを分離。float行送りとmargin collapseを実装。title/meta/heading/body/table/serifへ波及。'),
 'V-C02':(['AcceptedStyle','Layout','Components','AcceptedWindows','Preparation'],'cj-paperとcj-buttonの宣言を区別。通常/hover/selected/disabled、ghostのcw/cp影、最終dark alphaとgradient層順を用途別に対応。'),
 'V-C06':(['Layout'],'同長thumbの内側描画を3px補正。縦横・hover/pressedへ適用しpage/最大値/入力面は保持。実画素は未確認。'),
 'V-P08':(['AcceptedStyle'],'pending/forecastの2px破線を6/4の10px周期へ。左上の丸角端から位相を開始。金茶dbbd78と元斜線は保持。'),
 'V-P12':(['Preparation','AcceptedStyle'],'footer tokenを41px/角4/文字33pxへ。破線にも角を適用しwalletの角5と分離。'),
 'V-P14':(['AcceptedWindows'],'invalidのproblemsを角0にし早期return。未公開0/—walletの追加を除去。funded各行・価格・折畳みは保持。'),
 'V-P15':(['AcceptedWindows','AcceptedStyle'],'cp内容幅910の右端へtokenを戻し破線角6。価格・公開attr・修飾・owned機能意味は保持。'),
 'V-E02':(['Layout','AcceptedStyle'],'dark washの透明端を同じdark RGB/alpha0にし、空場を20282050へ対応。既存cover位置・素材は保持。'),
 'V-E04':(['Exploration','AcceptedStyle'],'illustration全高206pxで150deg投影を計算し、見える87pxへclip。手札/場/forecast/ghostへ共通反映。'),
 'V-E07':(['Exploration','AcceptedStyle'],'空場の独立alphaとcaption下端角。通常札のgradientを空場へ描かない。'),
 'V-E10':(['Exploration','ReviewFixes','AcceptedStyle'],'主体vitals y42、下段+42、数値18/24・delta16/22。既存上下2本のバーとspace-betweenを保持。'),
 'V-E12':(['ReviewFixes','AcceptedStyle'],'本人下段+34で24/10/24を保持。400px本人と最下72px帯は保持。'),
 'V-W01':(['AcceptedWindows','AcceptedStyle'],'overflowをpadding外側へ戻す。cw本文のdl18/18・h3 14/6・行box28.8、wrapを維持。content/scrollは実描画未確認。'),
 'V-W03':(['AcceptedWindows'],'cw角9・影0/4/14/0005を使用。cj/cpの窓へ一律適用しない。実対象はdetail-panel等。blur/画素は未確認。'),
 'V-W06':(['AcceptedWindows','Layout','AcceptedStyle'],'cj-button通常2b3d34、hover3a5043、selected c6d9ba/193224を別に保持。親選択/pane別scroll/clampは元のまま。'),
 'V-W10':(['AcceptedWindows','AcceptedStyle'],'山札summaryと表のmargin/line boxを役割化。登録30定義のhashは不変。Swords/HeartPulse実itemIconの描画は未確認。'),
 'V-H02':(['AcceptedStyle','Components','Layout','AcceptedFlow'],'hub/scene/returnのfooter面を透明化。背景90deg→0degの描画順と本文自身の90degを分離。三帰還/本文/拠点の実画素は未確認。')
}
items=[]
for r in review['items']:
    row={'id':r['id'],'received_status':r['status'],'returned_condition':r.get('expected'),
         'latest_ui_review':'ab1b6fa067877a140ac9e9c9c006c70da76e40b4','self_ui_pass':False}
    if r['id'] in changes:
        names,description=changes[r['id']]
        paths=[PFX+'GameScreen.'+n+'.cs' for n in names]
        row.update({'implementation_candidate':description,'paths':[{'path':p,'blob':blob(ROOT/p)} for p in paths],
            'verification':'静的根拠照合・build通過。今回の固定描画／必要入力は未確認。',
            'remaining':'render-stop.json／機能検査停止。H11/H12/H13/合法入力の依存は別に保持。',
            'next_owner':'本Work（環境条件成立後の同条件検査）→UI改善（独立再判定）'})
    else:row.update({'implementation_candidate':'本件で採否・状態を変更しない。受領した限定解消/依存/未確認を保持。',
        'remaining':r.get('actual'),'next_owner':r.get('owner','UI改善／とりまとめ／本Work')})
    items.append(row)
save('UI対応表.json',{'fixed_input':review['fixed'],'received_summary':review['summary'],'items':items,
    'implemented_candidates':17,'formal_ui_approval':False,'necessary_unknown_zero':False,'unapproved_difference_zero':False})

plan_check=[{'path':p,'source_blob':b,'raw_disk_blob':blob(ROOT/p),'equal':blob(ROOT/p)==b} for p,b in plan['files'].items()]
assert all(x['equal'] for x in plan_check)
changed=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=ROOT).decode().splitlines()
protected_prefixes=('apps/crossweave-godot/Core/','apps/crossweave-godot/Infrastructure/','apps/crossweave-godot/Tests/',
 'apps/crossweave-godot/SaveProbe/','apps/crossweave-godot/Godot/Assets/','apps/crossweave-godot/Godot/Proof','src/','test/')
assert not [p for p in changed if p.startswith(protected_prefixes)]
icons=ROOT/(PFX+'AcceptedIcons.json')
assert blob(icons)=='4f918fa999f1995a81ad497b05761ca60e6279de'
vector=read(OUT/'fixed-input/dark-recheck-20261006/記号ベクトル照合.json')
save('static-preservation.json',{'plan_source':plan['source_commit'],'plan_files':plan_check,'protected_changes':[],
    'registered_definitions':vector,'accepted_icons_blob':blob(icons),
    'normal_save_access':'今回の通常slot読書きなし。事後hashで開始時hash一致を捏造しない。',
    'source_rules_save_schema_assets_unchanged':True,'new_branches':False,'parallel_agents':False,'other_work_operations':False})
contracts=read(OUT/'contracts/manifest.json')
save('results.json',{'task':'D04B-UI-02 0.11','status':'独立修正候補と資料訂正はローカル保存。必要検査／GitHub保存は未了。',
    'code_candidates':code,'build':{'status':'passed','warnings':0,'errors':0,'method':'既定build_ui.py／サンドボックス内／固定SDK・Godot'},
    'contracts':contracts,'functional_tests_executed':0,
    'render':read(OUT/'render-stop.json'),'fixed_reference_texts':27,'plan_blobs':len(plan_check),
    'H11':{'rows':16,'uses':20,'adopted':0,'independent_start_ready':0,'comparison':'human/H11用途別比較.json',
           'current_column':'既取得の固定旧aabfefab。新コードの描画へ読み替えない。'},
    'normal_theme':'緑系暗色／OS非連動をコードで保持。新コードの通常経路描画は未確認。',
    'UI_approval':False,'distribution':False,'physical_input':False,'human_playtest':False,'M1':False})
save('publication.json',{'work_id':'20260927-game-application','branch':'impl/m1-godot-application-20260927',
    'remote_head_after_cancel':'0ec6334254db00ebc7956b4df493f3a34b98845a',
    'status':'未公開・Push未実施。GitHubプラグインcreate_blob 3件はuser cancelled MCP tool callで成功未確認。',
    'commit_created':False,'ref_update_attempted':False,'local_candidate':'code-candidate.json',
    'retry':'保存要求への明示承認を受領してから同じプラグイン／同じ枝／通常FFで再開。別経路へ切り替えない。'})
legal=read(OUT/'fixed-input/dark-recheck-20261006/合法入力返却.json')
legal['sent']=False;legal['delivery']='本Work内への保存返却。外部送信・他Work起動なし。今回実入力は環境前提未成立。'
save('合法入力への返却.json',legal)
owned=read(OUT/'fixed-input/dark-recheck-20261006/owned・追加導線の返却.json')
owned['current_complement']='既取得の初期home・使用中/unlocked/変換不能対を再利用。新状態／候補実入力は未確認。通常保存を加工しない。'
owned['execution_block']='既定隔離desktop未成立。通常Main検査slotはC:/Users/eckol/AppData/Roaming/crossweave/proofs/で、今回の書込み許可範囲外。保存先差替を準備／試行しない。'
save('ownedと候補の未確認.json',owned)
save('必要群と残件.json',{'received_groups':read(OUT/'fixed-input/dark-recheck-20261006/必要群判定.json'),
    'received_counts':'2閉／15継続（限定条件）。新しい閉群なし。',
    'new_blockers':[{'id':'今回固定実描画','reason':'render-stop.json','next_owner':'本Work／実行環境の条件を扱うとりまとめ・実行基盤への案',
        'required':'サンドボックス内で既定の隔離desktop・新slotが成立する条件。別経路は明示承認前に準備しない。'},
        {'id':'必要な機能検査','reason':'testhost接続90秒timeout・0実行。通常Mainの既定slotも書込み許可範囲外。',
         'next_owner':'本Work','required':'同じ許可範囲で既定検査の前提が成立する条件。'},
        {'id':'GitHub通常保存／読戻し','reason':'プラグイン保存要求3件の利用者キャンセル','next_owner':'本Work',
         'required':'同じGitHubプラグインによる同枝FF保存要求への明示承認。'}],
    'human':'H11資料訂正は部分・開始判定待ち。H12の2回答/H13の3route回答は未着。新しい人タスクを無断登録しない。',
    'legal':'R01-filler／R04明示null/欠落default2／登録長名称-ST-P08の既存3項目。合法入力への返却.json。'})

md('確認結果.md','''# 今回の確認結果

今回依頼全体は未完了。具体独立修正候補17ID、H11の16用途・20使用先への対応、必要依存の具体化をローカル保存した。新コードの描画・実入力を合格にはしていない。

計画5c61d64aの77path/blobを実同期→技術21ddd349追加差分なし→計画77件再照合。固定UIab1b6fa0の27本文をGitHubプラグインで受領してblob照合。開始0ec63342・aabfefab・未追跡15,849ファイルを保全。コード9ファイルの既定ビルドは警告0／エラー0。

実描画は既定の隔離desktop作成時にWinError5で停止。サンドボックス外要求は開始前に中断、その後利用者が原則禁止と明示。外部実行・通常desktop代替・別renderer／CIへの移行は行っていない。今回のPNG／nodesは生成されていない。

既存8件の.NET検査はtesthostへ90秒で接続できず中止。実行0、ゲーム検査の失敗判定ではない。タイムアウト延長、別runner、外部実行は試さない。通常Mainの既定隔離slotは書込み許可範囲外のuserディレクトリなので、保存先を変更した機能検査も準備・試行しない。

GitHub保存のcreate_blob 3要求は利用者キャンセルで成功未確認。commit/tree/ref更新は未試行。要求後の自枝HEADは0ec63342のまま。ローカル成果・未保存差分は保持し、別経路や取消要求の再試行は行わない。

旧focus/通知PNG4枚content空、追加ログ1path404、旧PNG3件未取得、CP02破損、CI artifact403、rendered-darkのsource変更/manifest失敗と限定再利用を保持。承認済みGit tree代案は証拠一覧のみ。旧判定・CI緑・原本値の転記を新画面の適合へ代用しない。

[機械結果](results.json)、[未了群](必要群と残件.json)、[描画停止](render-stop.json)、[保存状態](publication.json)を参照。UI適合・配布・実機・人の試遊・M1は別判定で未完了。
''')
md('コード解説.md','''# 暗色UI具体修正候補の読む順と処理の流れ

対象はcode-candidate.jsonの9path/blob。GitHub未保存・実描画／必要機能検査未了の候補である。新しいゲーム規則・保存形式・素材は追加していない。

1. `GameScreen.Layout.cs`のText/Renderから通常Mainの組立を読む。
2. `GameScreen.AcceptedStyle.cs`のPaper/UiColor、LineBoxFont/LineHeight、DashedRectを読む。
3. `GameScreen.AcceptedWindows.cs`のFactsBody/AddFlowBlock、Ledger、PreparationFacts、PreparationDetailFacts、WindowFrameへ進む。
4. `GameScreen.Exploration.cs`のMakeTileと`GameScreen.ReviewFixes.cs`のActorVitalsで手札・場・ghost・本人への波及を追う。
5. `GameScreen.Components.cs`のReadingBackdrop、`AcceptedFlow.cs`の本文・帰還、`Preparation.cs`のwallet/footerを読む。
6. `UiAutomation.Reproduction.cs`のGeometryは宣言line box・実font高・小数行送り・stroke・用途を別々に記録する検査補足で、ゲーム状態の所有者ではない。

Godot標準のControlは外形・入力領域、ScrollContainerは表示範囲・最大値、MarginContainer/VBoxContainerは子の配置を扱う。FontVariationとLabelSettingsはGodotのリソースであり、字形を描き直さず同じfaceの上下leadingと小数行送りを表す。C#のpartialは同じGameScreenクラスのファイル分割、Dictionaryは同じface/size/leadingの再利用、ラムダはsignalへ渡す処理である。CSSのmargin collapse、役割別のline box、cp/cw/cj/navの使い分けは本作が採用した表示adapterの設計で、Godotの必須ルールではない。

詳細を開くとWindowFrameが用途を選び、FactsBodyがpaddingを含む本体をScrollContainerにする。MarginContainerで内側余白を作り、cwだけAddFlowBlockが隣接marginの最大値を余白Controlへ変換する。Ledger/Heading/Paragraphは公開値の文字を読み、役割高をLineHeightへ渡す。LineHeightは同じfontにleadingを配分し、floatのLineSpacingで28.8px等の行送りを保持する。LineBoxFontは指定行boxを超える自然高を避ける。親選択とpane別scrollは元のscrollPositionsへ残し、再配置後の新maxへGodotがclampする。規則・RNG・保存要求は送らない。

配色ではcj-paperの192a22とcj-buttonの2b3d34を区別する。同じ明色hexの一律変換をやめ、呼出し元が最終用途を選ぶ。selectedタブはhoverでも選択面を保持し、cp/cj/cwのdisabled alphaを分ける。ghostの影はcpの0/6/18、cwの0/8/18とdark0008を用途別に対応。本文背景のCSS先頭層が最前面になるよう、Godot子の追加順を反転する。hub/scene/returnのfooterは操作位置を残し背景面だけ透明にする。

札面はCSSのillustration全高206pxで150degの投影を求め、見える87pxをclipする。87pxだけで投影すると色の進み方が変わる。空場は独立の20282050を透過合成し、通常札gradientを描かない。未払いの丸角破線は左上の接線端から周期を開始し、2pxの6/4周期と1px tokenの3/3周期を区別する。

invalid確認は公開Comparisonの失敗文だけを角0の面へ置いてreturnする。公開されないafterを0/—として追加しない。funded確認の価格・容量・折畳み、ownedのlock/convert、DTO/保存契約はそのまま。公開attrは既存表示adapterだけで読む。R01/R04/長名称を保存編集で捏造しない。

実行準備が失敗した場合は検査結果を合格にせず、同じ対象・手段・停止地点と再開条件を残す。今回のfont/合成/scroll修正はビルドと静的照合までで、新画面の実測・AA限定分類・全使用先入力は未確認。新font・全UIエンジン差の免除へ広げない。

API説明は採用Godot4.7.2の同梱GodotSharp.xml（FontVariation.SpacingTop/Bottom、LabelSettings.LineSpacing、Control、ScrollContainer）に照合した。一般のC#/.NETと本作の表示契約を区別して読む。
''')
md('とりまとめ引継ぎ.md','''# とりまとめへの途中引継ぎ

ゲーム本編実装／20260927-game-application／impl/m1-godot-application-20260927。D04B-UI-02改訂0.11。今回依頼全体は未完了、ローカルの具体修正候補・H11部分訂正・教材・未了を保存した段階。GitHub提出も未完了で、受領済みとはしない。

開始HEAD0ec63342、保全コードaabfefab。計画5c61d64a全77blob→技術21ddd349追加なし→77件一致。UIab1b6fa0の57ID＝17要修正／8判断待ち／6未確認／26限定解消、必要群2閉／15継続を継承。通常緑系暗色・OS非連動、既取込配布3ファイルと通常保存接続を保持。新Work・新枝・並列エージェント・他Work操作なし。

コード9pathの具体独立修正候補17IDは[UI対応表](UI対応表.json)、全blobは[候補台帳](code-candidate.json)。ビルドは警告0／エラー0。[コード解説](コード解説.md)が読む入口。H11は[16用途・20使用先](human/H11用途別比較.html)へ原本実画素・旧固定本編・同定義候補を結び、04/06/11の所在と05/13の複数先を訂正。最新本編の画素、確認見出しの未取得、Mountain同用途候補等は不足のまま。開始成立・採用0を保持。

今回の実描画はサンドボックス内の隔離desktop作成でWinError5。外部実行は利用者が原則禁止と指定し、行っていない。.NET既存8件はtesthost接続timeout・0実行。Main検査slotも許可された書込み範囲外で、別保存先・別runner・別場所の準備／試行なし。必要描画・入力・同状態の全使用先証拠は依頼内未了として本Workに残る。

GitHubプラグイン保存要求3件は利用者キャンセル。commit/tree/ref更新は未試行、HEADは0ec63342のまま。ローカル成果の通常FF保存と本文/blob・親/tree/HEAD読戻しは保存要求への明示承認後に同じプラグインで再開する。独立修正提出範囲も完了にはしていない。

UI原本・判定はUI改善、共通契約はゲームバランス、実行環境・配布は実行基盤・配布、横断計画はとりまとめ。担当外は案として返す。H12の2回答/H13の3routeは未着、owned初期home対は限定再利用。全owned/候補実入力は環境・契約条件待ち。R01-filler、R04明示null/欠落default2、登録長名称/ST-P08は[固定3項目の具体入力](合法入力への返却.json)へ返し、通常保存は加工しない。

旧focus/通知4PNG content空、404ログ、旧PNG3未取得、CP02破損、artifact403、rendered-dark source変更/manifest失敗・限定再利用を維持。新手段・経路・資料・入力範囲・終了条件へは明示承認前に移さない。現在必要な環境条件と保存承認は[残件](必要群と残件.json)。UI適合・配布は未承認差異0/必要未確認0/機能・固定SHA・証拠一致が成立してから。実機・人の試遊・M1は別で未完了。
''')
print('57ID／17候補／77計画blobを照合、教材・停止・依存・途中引継ぎを保存')
