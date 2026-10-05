"""自Workの提出台帳。検査結果を読み、未取得を成功に変えず、IのtreeにIDを結ぶ。"""
from pathlib import Path
import report_io
import argparse, hashlib, json, subprocess, shutil, xml.etree.ElementTree as ET
from functools import lru_cache
REPO=Path(__file__).resolve().parents[3]
APP=REPO/'apps/crossweave-godot'
ED=REPO/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
UI=APP/'.tools/fixed-ui-review'
LIGHT='fixed-light-final'
DARK='fixed-dark-final'
RELATED='related-final'
PREFIX='apps/crossweave-godot/Godot/Application/'
STYLE=PREFIX+'GameScreen.AcceptedStyle.cs'
WIN=PREFIX+'GameScreen.AcceptedWindows.cs'
FLOW=PREFIX+'GameScreen.AcceptedFlow.cs'
LAYOUT=PREFIX+'GameScreen.Layout.cs'
PREP=PREFIX+'GameScreen.Preparation.cs'
EX=PREFIX+'GameScreen.Exploration.cs'
COMP=PREFIX+'GameScreen.Components.cs'
FONT=PREFIX+'AcceptedSystemFont.cs'
RULE='apps/crossweave-godot/Core/Application/'

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,value):
    (ED/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO).decode('utf-8').strip()
@lru_cache(None)
def source_hash(commit,path):return hashlib.sha256(subprocess.check_output(['git','show',commit+':'+path],cwd=REPO)).hexdigest()

@lru_cache(None)
def blob(path,commit):
    return git('rev-parse',commit+':'+path) if commit else git('hash-object','--path='+path,path)

# 原本の期待値は固定入力をそのまま残す。actualは今回の変更・採取を指し、適合判定ではない。
CHANGES={
'V-C01':([STYLE,FONT,WIN,FLOW,EX],'用途別size/line-height、実Yu Gothic UI 400/600、Georgia＋Yu Minchoを採取して選択。末行にもline boxを確保。現在の実font名・term幅は各report、過去OS/AAはU-C01へ残す。'),
'V-C02':([STYLE,COMP],'取得cp／探索cw／共通navのlight-dark tokenを分ける。shaderのTexture二重乗算を除き、paletteとalphaを実ノードへ記録。'),
'V-C03':([COMP,STYLE],'既存BookOpen/Menu SVG、20px記号・18px文字・f2f5e9/a8b9a5/角5へ。右上実rectはrecords1679,5,152,56、menu1839,5,56,56。'),
'V-C04':([STYLE,LAYOUT,WIN],'通常・hover・押下・keyboard focus-visible・selected・disabledを役割別themeへ。押下中もhover色を保持し、keyboard輪郭は別面。部品状態の実画像を結ぶ。'),
'V-C05':([LAYOUT,STYLE],'外側1920×1080、1px枠、内側origin1,1と1918×1078を一つの座標系へ。'),
'V-C06':([LAYOUT,EX,PREP],'原本実測の縦横10px／thumb直交余白2／角3／標準UI三角。縦track fcfcfc/2c2c2c、thumb 8b8b8b/9f9f9f、hover 636363/d1d1d1、横は探索line/透明track。CSS height6よりthinの実寸が優先。'),
'V-P01':([PREP],'見出し32＋gap8＋grid開始、padding16／gap20／grid2へ。先頭tile実rectをPNGとnodesへ固定。'),
'V-P02':([PREP,STYLE],'取得底2、所持の左右1／底4、編成inset1の面をgridから描く。見出しを囲いの外へ。'),
'V-P03':([PREP],'64px連続帯、角0、active315849/on-activefffef5の札・心得タブ。'),
'V-P04':([PREP,EX,STYLE],'2px枠内を含む352×80、角5、内側76を札・心得・移動像で共用。'),
'V-P05':([PREP],'操作領域278,2,72,76、枠内区切りと右側角を共通面へ。'),
'V-P06':([PREP,STYLE],'編成済みの枠58754a、外すはf5f7eeのsecondary。取得／編成と別の色。'),
'V-P07':([EX,PREP,STYLE],'既存Layers/ScrollText/Check/Lightbulb/Grid2X2、18px、gap6、数量右寄せ。公開数量とロックは維持。'),
'V-P08':([STYLE,EX],'未払い専用の金茶破線と135deg斜線、独立した右下Clock3。価格の上に時計を重ねない。'),
'V-P09':([PREP,STYLE],'同寸法placeholder、中央ArrowRight、底3px。正式取得・群の消去条件を既存公開応答に従う。'),
'V-P10':([PREP,STYLE],'352×80の空枠・候補なし・取得完了部品と20/28の文言。合法な空編成取消に加え、通常探索で資金を得て全5群を取得した空状態を同じ原本とGodotで採取。'),
'V-P11':([PREP,STYLE],'現在財布Lightbulbと24px値、変更後をClock3・点線tokenへ。無効案は—を保つ。'),
'V-P12':([PREP],'64px e9eee0帯／上線、Undo2、角0、戻す／確認する22px。上限・容量は見出し／確認表へ。'),
'V-P13':([WIN,LAYOUT,STYLE],'取得詳細・確認・変換を960×820の共用frame、header64/body24/footer72、境界・影・暗幕へ。'),
'V-P14':([WIN],'中央財布36px、取得価格・移動先、数量差分、容量の二列、変更心得のfoldへ。R02の公開値と原子確定を保持。'),
'V-P15':([WIN,RULE+'GameApplication.cs',RULE+'UiPublicProjection.cs'],'取得所在の三領域とClock3、実公開price_units、112pxラベル列、公開修飾fold。深いコピーの前に説明を付ける。'),
'V-E01':([EX,LAYOUT],'field上413／hand上688／本人帯983。内側の行とgap20から一つの座標系で配置。'),
'V-E02':([LAYOUT,STYLE],'既存night-tideのcoverと下方e8edd933 wash。画像そのものは変更しない。'),
'V-E03':([EX,STYLE],'場帯border0、e9eed81a、radius8。受入可否枠は別描画層。'),
'V-E04':([EX,STYLE],'1px線、角6/7、150deg多stop gradientを札の共用面へ。shaderは既存textureのalphaだけをmask。'),
'V-E05':([EX,STYLE,PREFIX+'AcceptedIcons.json'],'能力・対象・操作の既存Lucide SVGを再利用。札絵の64px glyphは原本art(cards)の既存字形。地形は原本bundleのMountain未登録／小さいfallbackと基準のSVG指示が食い違うためUI判断を残す。'),
'V-E06':([EX],'属性badge16/24、1px線、角4、左右4pxの元面を再現。'),
'V-E07':([EX],'空の場は下端の短いstrong caption。通常札名48pxの空白を増やさない。'),
'V-E08':([EX],'予測／消費は右上4px・paper・padding6・角3のbadge。下段48/24/28のcaptionは保持。'),
'V-E09':([EX],'離れる場札はdanger943c25、予測とlinkedの重ね順を保持。消滅先は公開応答だけから読む。'),
'V-E10':([EX],'余力／隠蔽は上下4＋2＋4px、後者alpha.6、18px能力行。本人・相手の公開差分を残す。'),
'V-E11':([EX,STYLE],'通常枠transparent／選択は内側2px・target SVGとsoftcaption。潜水服282×176／上8を保全。'),
'V-E12':([EX],'本人400px、手札18px、公開山札・状況は既存入口へ。帯を未承認幅へ拡張しない。'),
'V-E13':([EX,COMP],'操作56px／18px／左右16／内容幅／gap8、選択札中心から追従して画面端へclamp。'),
'V-E14':([EX],'可視範囲へclipした縦端点をcubicBezier2px／alpha.5で結ぶ。新しい矢印を付けない。'),
'V-E15':([EX],'40px顔22px／群間16px・群内2px、先行›と現在／次のsoftlabel、底2px。R05の公開群と本人位置を保持。'),
'V-W01':([WIN],'header64/body16/見出し20/本文18×1.6、max-content ledger列と別段落。R03/R04の公開値を残す。'),
'V-W02':([WIN,COMP],'56×56のPin SVG・active背景、generic closeは原本×文字。機能の180/160ms・pinを維持。'),
'V-W03':([WIN,STYLE],'paper、1px線、角8、header境界、detailの14px影。本文へ白い別面を足さない。'),
'V-W04':([STYLE,WIN],'原本placeEdgeWindowのanchor.y、内側寸法、本人帯上端、左右反対端・clampを共用。'),
'V-W05':([STYLE,WIN,COMP],'trigger/avoid/placeWindowを共用し、親を維持したpair520×480／gap16。探索utilityは原本のhidden anchorと避ける帯に従う。'),
'V-W06':([WIN,RULE+'UiPublicProjection.cs',RULE+'GameApplication.cs'],'相手・環境／札の二タブ、初期構成の表、観測区分・獲得記録。最小公開投影で分類し、私有構成を推定しない。'),
'V-W07':([WIN,COMP],'対象構成を左、札詳細を右へ同時表示。sourceWindowと記憶したscroll・選択を戻る操作で保持。'),
'V-W08':([WIN],'2列×56pxのmenu、既存追加操作がある場合だけ12件pager。中断・再訪など前版の機能を保持。'),
'V-W09':([WIN,STYLE],'表示の実CheckBoxと減動、探索の既存操作項目・20px checkbox・90×38選択部品。DTOへ設定を足さない。'),
'V-W10':([WIN],'山札表・親子詳細、履歴の実行別行、案内の見出し・18×1.6段落、本文履歴。元データを単一の長いLabelへ平坦化しない。'),
'V-H01':([FLOW],'探索先32px見出しの実幅の直後に詳細、left40/bottom36/width840の本文とgap12。'),
'V-H02':([COMP,FLOW,STYLE],'既存背景とflowの縦・横多stop gradientを一度だけ適用。本文窓内面も別stop。'),
'V-H03':([FLOW],'returnViewのbaseline整列、着想20／数値Georgia32／計12、余力20と素材18、見出し24。三帰還を合法状態で撮影。'),
'V-H04':([FLOW,EX,STYLE,LAYOUT],'本文20/34と末行line box、句点・禁則、原本文字・読了IDを維持。既存読了操作と本文領域の重なりを避ける。'),
'V-H05':([FLOW],'plain paper、中央crossweave28serif／tracking2、header24、下端中央の既存新規・再開・診断・復旧群。'),
'V-S01':([LAYOUT,STYLE],'通常notice中央top72と取得runtime notice左右24/top76、公開保存状態。成功・拒否・不明とworker待機を保全。'),
'V-D01':([STYLE,EX],'受入先の内側破線・可否ラベルと短い述語。R06/R07の共有条件、領域外停止。'),
'V-D02':([STYLE,COMP],'取得元alpha.3／探索手札.6、不可像.75、同じ札面とshadow、掴み点を維持。'),
'V-D03':([STYLE],'32px ring、pointer＋20,−20の吹出し、既存移動label12/18、実120ms cue。短クリックの連続原画像を追加。'),
'V-D04':([EX,PREFIX+'GameScreen.ReviewFixes.cs'],'原本と同じ取得22px/7px、探索64px/16pxのframe送り。pointer内の実手札／場だけを送り、領域外は停止。dropの受入条件は別判定として維持。1論理秒の実時刻・frame数・端の上限を採取。'),
'V-D05':([STYLE,COMP],'200ms CSS ease-out、event260ms送り／1300ms維持／2800ms終了、通常・減動を連続FramePostDrawで採取。'),
}

def artifacts(folder):
    return {p.relative_to(ED).as_posix():{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted((ED/folder).rglob('*')) if p.is_file()}
def frame(folder,file):
    # 最終の取得表示と採取時刻だけを差分再確認した。無関係な旧suiteを
    # 全反復せず、実在する後続画像へ個々の参照を結ぶ。
    if folder in [LIGHT,DARK]:
        theme='light' if folder==LIGHT else 'dark'
        for special in ['boundary-'+theme,'hover-use-'+theme,'memory-'+theme+'-final','common-'+theme+'-complete','common-'+theme+'-followup']:
            if (ED/special/file).exists():folder=special
        if file.startswith('interaction-') and (ED/(RELATED if theme=='light' else 'startup-dark-final')/file).exists():folder=RELATED if theme=='light' else 'startup-dark-final'
        for later in ['preparation-'+theme+'-final','settled-'+theme]:
            if (ED/later/file).exists():folder=later;break
        for later in ['common-'+theme+'-complete','common-'+theme+'-followup']:
            if (ED/later/file).exists():folder=later
    p=ED/folder/file
    if not p.exists():return {'path':p.relative_to(ED).as_posix(),'status':'未取得'}
    value={'path':p.relative_to(ED).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
    if file.endswith('.png'):
        from PIL import Image
        with Image.open(p) as im:value['size']=list(im.size)
    return value
def nodefile(folder,file):
    p=ED/folder/file
    if not p.exists():return None
    d=read(p);return d['nodes'] if isinstance(d,dict) else d

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--implementation');a=parser.parse_args()
    implementation=a.implementation
    fixed=read(UI/'visual-diff.json')['items'];assert len(fixed)==57 and set(CHANGES)=={i['id'] for i in fixed}
    catalog=ED/'fixed-input';catalog.mkdir(exist_ok=True)
    for name in ['visual-baseline.json','visual-diff.json','unknowns.json','screen-states.json','style-source.json','comparison-evidence.json','本編向け修正条件.md','必要未確認.md','原本対応.md']:
        shutil.copy2(UI/name,catalog/name)
    examples=[]
    def pair(key,srcfolder,srcmode,dstmode,shot,targetshot=None):
        for theme,folder in [('light',LIGHT),('dark',DARK)]:
            sourcefile=theme+'-'+srcmode+'-'+shot+'.png';targetfile=dstmode+'-'+(targetshot or shot)+'.png'
            examples.append({'id':key+'-'+theme,'theme':theme,'initial_fixture':dstmode,'viewport':[1920,1080],'dpr':1,'zoom':1,
                'reference':frame(srcfolder,sourcefile),'godot':frame(folder,targetfile),
                'reference_nodes':frame(srcfolder,sourcefile.replace('.png','.nodes.json')),'godot_nodes':frame(folder,targetfile.replace('.png','.nodes.json')),
                'comparison_status':'原寸対を提出・UI再判定待ち' if (ED/srcfolder/sourcefile).exists() and (ED/folder/targetfile).exists() else '片側未取得・依頼内未完了','claim':'原本初期documentを共有する。JS表示側のautoReadによる後続revision・read flag差は元manifestを参照。完全pixel一致や未承認差異0を自己宣言しない。'})
    for mode,shots in {'repro-home':['card','owned-detail','passive','passive-detail','pending','pending-detail','confirmation'],'repro-story':['entry','optional-prose'],'repro-prediction':['entry','hand-detail','actor-detail','selected','prediction']}.items():
        for shot in shots:pair(mode+'-'+shot,'source-representative-final',mode,mode,shot)
    for mode,shots in {'repro-home':['entry','home-detail'],'repro-explore':['entry','settings','reduced-motion','help','save-data','history','objective','status','order','deck','deck-child','action-history','operation','records-targets','records-current','records-card-child','records-cards','known-card-child','drag-field']}.items():
        for shot in shots:pair(mode+'-'+shot,'source-remaining-final',mode,mode,shot)
    pair('startup-entry','source-remaining-final','startup','interaction','entry','start')
    for p in examples:
        if p['id'].startswith('startup-entry-'):p['claim']='保存を持たない新規の入口を同じFHD/テーマで比較。初期sessionがないため共有DTOの同一性は主張しない。診断/復旧の追加操作の原本対応は未承認として残す。'
    # 追加採取は同じ初期documentを使う。元の不足を別fixtureへ読み替えない。
    examples=[p for p in examples if not p['id'].startswith('repro-home-home-detail-')]
    for mode,shots in {'repro-home':['home-detail'],'repro-story':['prose-end'],'repro-acquisition-affix':['entry','card','passive','affix-closed','affix-expanded'],'repro-acquisition-funded':['entry','card','passive','all-groups-pending','all-groups-confirmation','all-groups-committed'],'repro-acquisition-complete':['entry','card','passive','all-groups-empty'],'repro-revisit-home':['entry','home-detail','card','passive']}.items():
        for shot in shots:pair(mode+'-'+shot,'source-extra-final',mode,mode,shot)
    pair('repro-component-extra-hold-select-open','source-extra-final','repro-explore','repro-component-extra','hold-select-open')
    for outcome in ['clear','withdrawal','defeat']:
        mode='repro-return-'+outcome
        for shot in ['entry','receipt']:pair(mode+'-'+shot,'source-remaining-final',mode,mode,shot)
    for source,target in [('repro-home','repro-shared-preparation'),('repro-story','repro-shared-story'),*[(f'repro-return-{x}',f'repro-shared-return-{x}') for x in ['clear','withdrawal','defeat']]]:
        for shot in ['settings','help','history','save-data','reduced-motion','records-targets','records-observations','records-card-child','records-cards','known-card-child']:
            source_name='records-observations' if shot=='records-observations' else shot
            pair(target+'-'+shot,'source-shared-final',source,target,source_name)
    for mode,ids in [('repro-home',['prepare','depart','menu','knowledge','tab-card','review','discard','detail-close','empty-composition']),('repro-explore',['menu','knowledge','window-pin','detail-close','preview','play','reduced-motion'])]:
        for name in ids:
            if name=='empty-composition':pair(mode+'-'+name,'source-components-final',mode,mode,name);continue
            for state in ['normal','hover','focus','pressed','disabled']:
                if name in ['review','discard'] and state=='normal':continue # 同じ初期案のdisabledを専用対で示す。
                p=ED/'source-components-final'/('light-'+mode+'-'+name+'-'+state+'.png')
                if p.exists():pair(mode+'-'+name+'-'+state,'source-components-final',mode,'repro-component-extra' if mode=='repro-explore' and name=='knowledge' else mode,name+'-'+state)
    for tab in ['targets','cards']:
        for state in ['normal','hover','focus','pressed']:
            pair('repro-component-extra-records-tab-'+tab+'-'+state,'source-components-final','repro-explore','repro-component-extra','records-tab-'+tab+'-'+state,'knowledge-tab-'+tab+'-'+state)
    for mode in ['repro-bars-prep','repro-bars-hand','repro-bars-field']:
        for shot in ['natural','bar-start','bar-hover','bar-pressed','bar-drag','bar-released','bar-end','bar-restored']:
            pair(mode+'-'+shot,'source-boundary-states-final',mode,mode,shot)
    for mode in ['repro-edges-prep','repro-edges-hand','repro-edges-field']:
        for shot in ['threshold-before','edge-one-second','outside-stops','canceled']:
            pair(mode+'-'+shot,'source-edge-states',mode,mode,shot)
    for shot in ['capacity-invalid','capacity-confirmation']:
        pair('repro-preparation-boundaries-'+shot,'source-required-boundaries-complete','repro-preparation-boundaries','repro-preparation-boundaries',shot)
    for shot in ['parent-scrolled','child-beside-scrolled-parent','parent-restored']:
        pair('repro-record-memory-'+shot,'source-required-states-neutral','repro-record-memory','repro-record-memory',shot)
    for shot in ['normal','hover','focus','pressed','selected']:
        pair('repro-checkbox-states-reduced-motion-'+shot,'source-required-states-neutral','repro-checkbox-states','repro-checkbox-states','reduced-motion-'+shot)
    # 元fixtureの数値保全。二つのタグ以外に値差があれば同状態の根拠にしない。
    fixture_audit=[]
    for p in sorted((ED/'fixtures').glob('*.json')):
        if p.name=='receipt.json':continue
        d=read(p)
        if 'original_document' in d:
            src=d['original_document'];adapted=d['dto']['State'];expected=json.loads(json.dumps(src));expected['schema']='CW-CSharp-application-1';expected['engine_version']='CW-CSharp-core-1'
            fixture_audit.append({'path':p.relative_to(ED).as_posix(),'sha256':sha(p),'format_version':d['dto'].get('FormatVersion'),'original_body_preserved_except_two_tags':expected==adapted,'original_document_sha256':hashlib.sha256(json.dumps(src,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest(),'commands':len(d.get('commands',[]))})
            assert expected==adapted
    write('comparisons.json',{'baseline':'2026-10-04.1','ui_source':'8b535c2f17d3bd6f83030e98527cf97ab281e557','original':'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2','implementation_sha':implementation,'not_used':['破損CP02'],'fixture_audit':fixture_audit,'pairs':examples,'limits':['未取得shotを成功としない。','現在のfont環境を過去撮影の環境へ読み替えない。','合成InputEventと物理入力を区別する。']})
    idpairs={}
    for i in fixed:
        scope=i['id'][2]
        if scope=='P':keys=['repro-home-'+s for s in ['card','passive','pending','owned-detail','passive-detail','pending-detail','confirmation','empty-composition']]
        elif scope=='E':keys=['repro-explore-entry','repro-prediction-hand-detail','repro-prediction-actor-detail','repro-prediction-selected','repro-prediction-prediction']
        elif scope=='W':keys=['repro-explore-'+s for s in ['settings','operation','deck','deck-child','records-targets','records-current','records-card-child','records-cards','known-card-child','history','help']]
        elif scope=='H':keys=['repro-home-entry','repro-story-entry','repro-story-optional-prose',*['repro-return-'+o+'-entry' for o in ['clear','withdrawal','defeat']]]
        elif scope=='D':keys=['repro-explore-drag-field','repro-bars-prep-bar-drag','repro-edges-prep-edge-one-second','repro-edges-hand-edge-one-second','repro-home-pending']
        elif scope=='S':keys=['repro-home-pending','repro-home-confirmation','repro-acquisition-funded-all-groups-committed']
        else:keys=['repro-home-card','repro-explore-entry','repro-return-clear-entry','repro-home-prepare-focus','repro-explore-window-pin-pressed']
        idpairs[i['id']]=[p['id'] for p in examples if any(p['id'].startswith(k+'-') for k in keys)]
        if i['id']=='V-H05':idpairs[i['id']]=['startup-entry-light','startup-entry-dark']
    rows=[]
    decisions=read(ED/'原本判断への返却.json')['items']
    for i in fixed:
        paths,actual=CHANGES[i['id']]
        remaining=[]
        if i['id']=='V-E05':remaining.append('地形Mountainの原本bundle未登録と基準SVG指示の原本判断。担当UI改善。')
        if i['id'] in ['V-W01','V-W10','V-H04']:remaining.append('前版の任意本文読了操作・本文の詳細入口、予測の追加公開補足等の置き場所は原本に対応がないためUI改善へ具体判断を返す。既確認機能を削除しない。')
        if i['id']=='V-C01':remaining.append('現在のAA・fractional metricsの実画像差を未承認のまま許容しない。旧OS/解決font不足はU-C01。')
        remaining=[d['id']+'：'+d['reason']+' 担当 '+d['owner']+'。再開 '+d['resumption'] for d in decisions if i['id'] in d['difference_ids']]
        row={'id':i['id'],'title':i['title'],'baseline_id':i['baseline_id'],'baseline_version':'2026-10-04.1','original':i['original'],'expected':i['expected'],'before':i['actual'],'actual_change':actual,
            'implementation_sha':implementation,'code':[{'path':p,'blob':blob(p,implementation)} for p in paths],'same_state_pairs':idpairs[i['id']],
            'status':'修正提出・独立適合未判定' if not remaining else '修正提出・依頼内未解消あり','remaining':remaining,
            'functional_evidence':['common-light-complete/manifest.json','common-dark-complete/manifest.json','common-light-followup/manifest.json','related-common-final/manifest.json',RELATED+'/manifest.json','preparation-light-final/manifest.json','preparation-dark-final/manifest.json','core-final/related.trx'],'visual_approval':False,'owner':'20260927-game-application','recheck_owner':'UI改善 / UI-GODOT-REVIEW-01'}
        rows.append(row)
    supplement=[]
    for id,title,v in [('N01','取得詳細の所在・価格・修飾','V-P15'),('N02','調査記録の分類・親子・公開区分','V-W06'),('N03','減動設定','V-W09')]:
        base=next(r for r in rows if r['id']==v)
        supplement.append({'id':id,'title':title,'difference_ids':[v],'implementation_sha':implementation,'code':base['code'],'same_state_pairs':base['same_state_pairs'],'status':base['status'],'remaining':base['remaining'],'evidence':['common-light-complete/manifest.json','common-dark-complete/manifest.json','core-final/related.trx']})
    preservation=[]
    for id,title in [('R01','消滅前の実行待機'),('R02','変更差分と取得先'),('R03','探索予測と本人状態'),('R04','場加算・防御・消滅条件'),('R05','同時刻と本人位置'),('R06','端送り・受入可否'),('R07','全入口取得群上限'),('U01','余白起点の同じ実ノード送り')]:
        paths=[EX,WIN] if id in ['R01','R03','R04','R05'] else [PREP,WIN] if id in ['R02','R07'] else [EX,PREFIX+'GameScreen.ReviewFixes.cs']
        preservation.append({'id':id,'title':title,'implementation_sha':implementation,'code':[{'path':p,'blob':blob(p,implementation)} for p in paths],'evidence':[RELATED+'/manifest.json','preparation-light-final/manifest.json','fixed-light-second/manifest.json','core-final/related.trx'],'status':'既確認範囲の変更影響を限定確認。filler/nullの実画面は別未確認。'})
    write('UI対応表.json',{'work_id':'20260927-game-application','task':'D04B-UI-02','status':'依頼全体未完了','implementation_sha':implementation,'items':rows,'supplement':supplement,'functional_preservation':preservation,'required_groups_file':'必要証拠と残件.json','state_inventory':'screen-states.json'})
    md=['# 57差異・N・R対応表','',f'基準2026-10-04.1／UI8b535c2f／原本72d0eb58。修正SHA `{implementation or "固定前"}`。**修正提出は独立UI適合を意味しない。**','',
        '全path/blob・原本locator・同状態対・期待／実績は[JSON](UI対応表.json)へ。RとNは57差異に重なるため、件数へ単純加算しない。','', '| ID | 今回の変更・実績 | 残件 |','|---|---|---|']
    for r in rows:md.append('| '+r['id']+' '+r['title']+' | '+r['actual_change'].replace('|','／')+' | '+('／'.join(r['remaining']) or '独立適合未判定')+' |')
    (ED/'UI対応表.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
    comparison_md=['# 同状態の原寸比較','', '元document、command列、二つのタグだけの接続差、公開fixture hashは[比較索引](comparisons.json)へ。両画像は1920×1080、再縮小・再制作なし。nodesには実rect/font/color/scrollがある。','', '同じfixtureでもJS原本のautoReadは保存revision/read flagを進める場合がある。元manifestにbefore/afterを残し、Godotの全DTO／実ファイル不変検査と混同しない。原寸画面の比較を行い、pixel一致や未承認差異0は自己判定しない。','', '| 対・テーマ | 原本 | 今回Godot |','|---|---|---|']
    for p in examples:
        if p['reference'].get('status') or p['godot'].get('status'):continue
        comparison_md.append(f"| {p['id']} | [PNG]({p['reference']['path']}) | [PNG]({p['godot']['path']}) |")
    (ED/'比較証拠.md').write_text('\n'.join(comparison_md)+'\n',encoding='utf-8')
    # 現検査の成功だけを集計する。過去に失敗したmanifestも別の試行として残す。
    suites=[]
    for name in [LIGHT,DARK,'settled-light','settled-dark','preparation-light-final','preparation-dark-final',RELATED,'startup-dark-final','boundary-light','boundary-dark','hover-use-light','hover-use-dark','memory-light-final','memory-dark-final','common-light-complete','common-dark-complete','common-light-followup','related-common-final','fixed-light-second']:
        path=ED/name/'manifest.json'
        if not path.exists():suites.append({'directory':name,'status':'実行中または未取得'});continue
        m=read(path);binding={p:{'actual':h,'implementation':source_hash(implementation,p),'equal':h==source_hash(implementation,p)} for p,h in m['source_sha256'].items()} if implementation else {}
        suites.append({'directory':name,'status':m['status'],'manifest':name+'/manifest.json','sha256':sha(path),'cases':m.get('cases',{}),'source_sha256':m['source_sha256'],'implementation_binding':binding,'source_changed_during_run':m.get('source_changed_during_run',[]),'error':m.get('error'),'reuse_scope':'固定source hashで照合。I2の25mode明暗後、採取側のみI3・取得の見出し/帰還文言のみI4で追補。各path/hash差を保持し、取得は9mode明暗、動きはsettled系列へ差替え。I8の記録表・共通palette・親menu・現在予約は共通16mode明暗と取得共通5modeの追補へ結ぶ。全suiteを最終source一致と見なさず、旧suiteの画像は変更外の部品・既確認Core/保存に限定して参照する。途中48modeは不変Core/保存の範囲だけ再利用。'})
    namespace={'t':'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'}
    trx=ED/'core-final/related.trx';tree=ET.parse(trx);counter=tree.find('t:ResultSummary/t:Counters',namespace)
    core={'result':'passed' if counter.get('failed')=='0' and counter.get('passed')=='17' else 'failed','counters':dict(counter.attrib),'trx':'core-final/related.trx','sha256':sha(trx),
        'scope':'既存oracle結果、予測期限・ラベル、finite/null/missingの境界と追加公開投影の17件。全旧73件の一律反復なし。',
        'stdout':'実行時のコンソール出力はtoolで受領。TRXだけをファイル保存したため、後からstdoutを捏造しない。',
        'source_binding':'Coreはこの実行後に変更していない。Godot描画・検査側のみの追補。共通manifestのCore hashと固定Iのblobを照合。',
        'code':[{'path':p.relative_to(REPO).as_posix(),'blob':blob(p.relative_to(REPO).as_posix(),implementation),'sha256':sha(p)} for p in sorted((APP/'Core/Application').glob('*.cs'))]}
    prior=[]
    for p in sorted(ED.glob('*/manifest.json')):
        if p.parent.name in [LIGHT,DARK]:continue
        d=read(p)
        if d.get('task')=='D04B-UI-02':prior.append({'manifest':p.relative_to(ED).as_posix(),'status':d.get('status'),'error':d.get('error'),'source_changed':d.get('source_changed_during_run',[]),'successful_modes':list(d.get('cases',{})),'use':'途中試行・失敗記録。最終版成功へ読み替えない。'})
    ci=read(ED/'ci-readback.json') if (ED/'ci-readback.json').exists() else {'status':'未取得・固定IのPush後に実step/artifactを確認する'}
    result={'work_id':'20260927-game-application','task':'D04B-UI-02','instruction':'0.5','status':'依頼全体未完了','implementation_sha':implementation,'base_sha':'0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6','verification':suites,'related_core':core,'ci':ci,'intermediate_trials':prior,
        'formal_ui_approval':False,'formal_distribution':False,'windows11_physical':False,'physical_input':False,'other_work_started':False,'player_sdk_required':False,
        'required_groups':'必要証拠と残件.json','state_coverage':'screen-states.json','source_receipt':'sources.json','comparisons':'comparisons.json'}
    write('results.json',result)
    group_details={
      'R01-filler':('未取得・依頼内未完了','consume/doomed/通常回収の実入力は限定確認。192分岐に加え、公開編成4種類・実run0〜5の24探索も未取得。Rebuildはpool不足とLive32閾値からfillerを生成し、Recoverはfillerを消滅へ送る。探索で見つからないことは到達不能証明ではない。','ゲームバランス検討（合法入口／契約）、本Work（実描画／入力）','既存登録値の合法command列・seed・旧保存、または生成／移行／公開の全入口を禁止する既存不変条件。受領後review-safety-fillerへ同じMain/隔離slotで供給する。',['legal-common/search.json','legal-boundaries/search.json',RELATED+'/review-safety-consume.json',RELATED+'/review-safety-doomed.json']),
      'R04-unlimited':('未取得・依頼内未完了','有限・欠落・明示nullの単体境界は合格。公開WithOptionalはnullを維持し、既定はキー欠落だけに適用。M1の合法null札／旧保存は未取得。値を2からnullへ変えた状態を合法描画とはしない。','ゲームバランス検討（全入口）、本Work（実描画）','現content／移行／保存公開の合法null供給入口、または全入口の除外根拠を固定しUIが再判定。入口を受領後review-details-unlimitedを実行。',['core-final/related.trx','legal-boundaries/search.json','contract-boundaries.json']),
      'U-B01':('元PNG提供済み・UI受領未確認','homeのPNGを元blob8dd3e54395fc9fbd42b6f447495114573c1a843dのまま提供。再制作なし。','UI改善','通常GitHubの固定成果からPNG実体を受領し比較できた記録を返す。',['environment/home.png']),
      'U-B02':('元PNG提供済み・UI受領未確認','storyのPNGを元blobd4a5e3cb290326afa0ac930c4b9a260d54afbf8cのまま提供。','UI改善','固定成果から元PNGを受領し比較できたことを記録。',['environment/story.png']),
      'U-B03':('元PNG提供済み・UI受領未確認','returnのPNGを元blobfb4a02002c830c813ca6bd70e440772fa684657dのまま提供。','UI改善','固定成果から元PNGを受領し比較できたことを記録。',['environment/return.png']),
      'U-C01':('現環境採取済み・過去環境／実画像差未解消','現OS/Edge/DPR/zoomと文字別CDP font、Godot実RID・OS font hashを採取。Yu Gothic Mediumへの誤解決を直した。旧撮影のOS/AAが不明であり推定しない。現在の丸め・AAの実差も自動許容しない。','UI改善、必要な再現修正は本Work','旧環境の原本情報、または現固定原本の基準採否と具体的に差の残る文字領域の判定。承認前にV-C01一致とはしない。',['source-font-leaves/manifest.json','environment/os-collection-faces.json',LIGHT+'/repro-explore.json','source-components-final/manifest.json']),
      'U-C02':('明暗の証拠提出・採否再判定待ち','原本CSSのlight-darkをnamespace単位で移植し、同じ合法状態・使用先をlight/darkで採取。旧明色だけからdark無効としない。','UI改善','固定Iの両テーマの実画像・値を受領し、light/darkの採否と差異を独立判定。',[LIGHT+'/manifest.json',DARK+'/manifest.json','environment/css-dark-pairs.json']),
      'U-V01':('証拠部分取得・依頼内未完了','札／心得、価格・所在、未払い、空編成取消、混合確認、上限全入口、ロック・変換を実入力。全群取得完了、長い名称・修飾展開等は37状態表で未取得範囲を残す。','本Work、合法公開入口の不足はゲームバランス検討','ST-P01〜09の不足状態を同じ合法公開fixtureで原本とGodotへ供給して比較。別状態を全群完了へ読み替えない。',[LIGHT+'/repro-home.json',LIGHT+'/review-preparation.json',LIGHT+'/interaction.json',LIGHT+'/legal-acquisition.json']),
      'U-V02':('既確認範囲の証拠提出・二境界未取得','探索・本人・5予測・場加算・guard付与・同時刻を実ノードで確認。filler/nullの不足は残す。','本Work、ゲームバランス検討、UI改善','R01-filler／R04-unlimitedの合法入口を受領し同状態対と一回確定・保存を確認。',[LIGHT+'/manifest.json','core-final/related.trx']),
      'U-V03':('共通使用先・記録の証拠提出','探索先／編成／本文／探索／三帰還の共通窓、二タブ・親子・公開観測区分と戻る。原本autoReadとC#readonlyを区別。','UI改善、境界不足の具体判断はゲームバランス検討','固定payloadと全使用先の画像を独立判定。原本に対応のないWindows保存案内・追加導線の置き場所を確定。',['source-shared-final/manifest.json',LIGHT+'/manifest.json','core-final/related.trx']),
      'U-V04':('隔離故障・保存再開の証拠提出','新規／再開／破損／将来版／他所有／拒否／不明／worker待機／復旧を同じ本編の実ファイルで確認。通常セーブには触れない。','UI改善（表示再判定）、本Work（追加影響時）','固定Iの保存通知と入力入口を再判定。実機DPI等は後続H02/H03で確認。',[RELATED+'/failure.json',RELATED+'/unknown.json',RELATED+'/corrupt.json',RELATED+'/future.json',RELATED+'/in-use.json',RELATED+'/busy-close-read.json']),
      'U-V05':('本文・三帰還・再開の証拠提出','合法command列でclear/withdrawal/defeatを得て、本文末尾、精算、原寸集計、次の編成入口、一巡を確認。前版の任意本文操作は保全し、配置判断を残す。','UI改善（原本対応）、本Work（再現）','本文の詳細・読了して閉じるの原本対応と、予測の追加公開補足の配置を実画像で判断する。',['legal-return/generation.json',LIGHT+'/manifest.json','source-remaining-final/manifest.json']),
      'U-V06':('部品状態の証拠部分取得・依頼内未完了','原本実DOMと実Godotで通常・hover・押下・keyboard focus・selected・disabledを採取。全ての部品／無効入口の状態をこれだけで合格とはしない。select展開等の残りは状態表へ明記。','本Work（追加採取）、原本状態の曖昧さはUI改善','ST-C01/W03の未採取部品を合法入口で確認し、原本のnative select popup等の描画基準を固定する。',['source-components-final/manifest.json',LIGHT+'/manifest.json']),
      'U-V07':('同実ノード限定送りの証拠提出・自然境界に制限あり','取得列／手札／場の余白送り、移動先端送りと外停止。自然FHDはoverflow0、限定幅は実ノードの境界検査。物理入力合格としない。','本Work（合法自然overflow取得）、UI改善','合法な自然FHD overflow状態を受領して同状態のbar・thumb・端・hoverを比較。限定ノード証拠を自然overflowへ置き換えない。',[LIGHT+'/review-scroll-prep.json',LIGHT+'/review-scroll-hand.json',LIGHT+'/review-scroll-field.json',LIGHT+'/review-destination-field.json']),
      'U-V08':('連続実画像の証拠提出','短クリック、実FramePostDrawの120ms cue／220ms成立、取消、200ms取得移動、通常・減動と新規確定event。壁時計とPNG圧縮の時点を区別。','UI改善','固定Iのsequence JSONと各原画像を読み、原本と表示タイミングを独立判定。物理入力・フレーム性能は後続。',[LIGHT+'/repro-motion-home.json',LIGHT+'/repro-motion-explore.json',DARK+'/repro-motion-explore.json']),
      'U-RC04':('最小公開投影・非破壊証拠提出','旧記録のprofile/run/actorに基づく現在／同探索別主体／過去、grant・観測・獲得・公開修飾。Inspect反復と旧oracle復元でDTO/乱数/保存への追加なし。私有山札の推定なし。','UI改善、共通契約変更が必要ならゲームバランス検討','payloadと原本records.jsの分類を照合し、必要な共通契約不足だけ具体判断。既存投影で得た項目をUIで再分類しない。',['core-final/related.trx',LIGHT+'/manifest.json','contract-boundaries.json']),
      'UI-CI01':('固定IのCI読戻し待ち' if ci.get('status') not in ['passed','completed-success'] else '固定I・step/artifact読戻し済み','既存固定toolchainを維持し、同hashの既存Notoを追跡して再取得停止を避ける。描画stepはcontinue-on-errorなのでjobの緑色だけでは合格にしない。','本Work、CI基盤問題が残れば実行基盤・配布','固定Iの依存準備・実ノード／再開・明暗描画それぞれのstepとartifact内容／hashを確認。失敗なら同原因を記録し同経路を修復。',['ci-readback.json','.github/workflows/d04b-ui-save-01.yml'])
    }
    # 古い未取得記述を、今回実採取した証拠で更新する。独立適合は別判定。
    group_details['U-V01']=('同状態取得・確認の証拠提出','元の合法command保存を共有し、札/心得・空編成・候補なし・全5群一括取得・全群完了・公開修飾fold・N01所在と価格を実描画/入力。同じ元保存のbodyを2tag以外変更しない。','UI改善、本Work（差異の再修正）','原寸対とID別拡大対を独立判定。未承認差異を具体IDへ返却。',['source-representative-final/manifest.json','source-extra-final/manifest.json',LIGHT+'/manifest.json',DARK+'/manifest.json'])
    group_details['U-V06']=('各実画面の部品状態・popupの証拠提出','ナビ・取得tab・操作側・close/pin・確認・空slot・記録tab・checkbox・実OptionButtonの通常/hover/pressed/focus/selected/disabledを役割別に採取。checkboxの五状態も追加採取。到達条件は元CSS/DOM/実Controlで区別。未採取を対象外へ変えない。','UI改善、本Work（追加差異）','原寸部品対とinteraction-state-coverage.jsonの到達条件を照合。独立適合を本Workで宣言しない。',['source-components-final/manifest.json','source-extra-final/manifest.json','source-required-states-neutral/manifest.json','common-light-complete/repro-checkbox-states.json','common-dark-complete/repro-checkbox-states.json',LIGHT+'/repro-component-extra.json','interaction-state-coverage.json'])
    group_details['U-V07']=('自然非overflow・限定overflowと実thumb入力の証拠提出','同じ実一覧を取得220px/手札540px/場400pxへ制限。縦横10px・track/通常/hover/押下/drag・両端・復帰を原本とGodotで採取。headlessのhide-scrollbarsを解除した原本実測に合わせ、取得gutterと横paddingも修正。通常DTO/ファイル/Plan不変。','UI改善、本Work（判定で差異が残れば修正）','自然FHD overflow0と限定実ノードoverflow>0の二系列を独立照合。自然overflowの合法fixtureを必須条件へ付加しない。',['source-boundary-states-final/manifest.json',LIGHT+'/repro-bars-prep.json',LIGHT+'/repro-bars-hand.json',LIGHT+'/repro-bars-field.json',DARK+'/manifest.json'])
    group_details['U-V08']=('連続実描画・端閾値・1論理秒の証拠提出','原本CDP screencastとGodot FramePostDrawの無補間PNG/時刻。短クリック、120ms前後、220ms成立、移動、可否領域、取消、200ms移動、減動と新規event。端22/64pxと1論理秒のframe traceを同じ合法状態で記録。最初の8枚は着地前までだったため採取を500ms/着地後まで延長し、入力時計とTween開始時計も分けた。追加の180/160ms原本ではroot内空白の離脱は保持、root外で閉鎖する。基準との解釈差を未解消として返す。','UI改善、本Work（差異の再修正）','sequence/epoch/壁時計とPNG保存時間を分けて照合。ST-E09の基準か現行原本挙動かを固定して同じWorkで再現する。物理入力・性能・実機は後続。',['source-boundary-states-final/manifest.json','source-edge-states/manifest.json','source-required-boundaries-complete/manifest.json','hover-use-light/repro-hover-sequence.json','hover-use-dark/repro-hover-sequence.json','preparation-light-final/repro-motion-home-sequence.json','settled-light/repro-motion-explore-sequence.json','settled-dark/repro-motion-explore-sequence.json',LIGHT+'/repro-edges-hand.json',LIGHT+'/repro-edges-field.json'])
    group_details['UI-CI01']=('固定IのCI/内部manifest確認済み' if ci.get('status')=='passed' and ci.get('implementation_sha')==implementation else '修復版IのCI/内部manifest読戻し待ち','初期I1では音声端点なしのWASAPI ERRORで描画caseを失敗扱い。実画像/入力は出ていた。検査だけaudio-driver Dummyを明示し、continue-on-errorを除去した。project/audioや素材は変更しない。jobだけで成功にせずZIP digestと3manifestを照合。','本Work、環境問題が残れば実行基盤・配布','最終Iの保存/再開15mode・明暗16mode/各source hash・Core17件とartifactを読戻す。',['ci-readback.json','.github/workflows/d04b-ui-save-01.yml'])
    required=[]
    for original in read(UI/'unknowns.json')['items']:
        id=original['id'];status,actual,owner,resume,evidence=group_details[id]
        required.append({'id':id,'title':original['title'],'required_for_distribution':True,'original_requirements':original['required_evidence'],'status':status,'actual':actual,'implementation_sha':implementation,'code':[{'path':p,'blob':blob(p,implementation)} for p in [EX,WIN,STYLE,RULE+'UiPublicProjection.cs']],'evidence':evidence,'owner':owner,'resumption_conditions':resume,'independently_accepted':False,'not_an_exception':True})
    assert len(required)==17
    write('必要証拠と残件.json',{'task':'D04B-UI-02','status':'依頼全体未完了','implementation_sha':implementation,'items':required,'independent_gate':'未承認差異0・必要未確認0のUI独立判定を、とりまとめが受領するまで配布しない。'})
    md=['# 必要証拠17群と残件','', '**依頼全体は未完了。** 合格／対象外への自動変更はない。原本や契約の具体判断が必要な箇所は以下へ固定し、独立して可能な修正・描画・保存回帰・提出は実施した。','', '| ID | 現在の証拠・制限 | 担当と再開条件 |','|---|---|---|']
    for r in required:md.append('| '+r['id']+'：'+r['status']+' | '+r['actual']+' | '+r['owner']+'。'+r['resumption_conditions']+' |')
    md+=['','## 原本判断へ返す具体箇所','','- **V-E05の地形**：原本exploration.jsはMountain SVGを要求するが、固定bundleのアイコン登録に無く、現原本では小さいfallback△になる。基準のSVG指示と実原本の両方を保存し、既存Triangle64を勝手に承認済みへしない。能力・操作のSVGや札glyphの修正は継続・実施。',
        '- **前版の追加導線**：returnの「本文の詳細」、任意本文の「読了して閉じる」、予測の未公開倍率／予約補足、Windows保存・診断・復旧の案内は、既確認機能として保全した。原本に一対一の窓・footerが無い。対応画像と影響を渡し、UI原本側の配置判断を求める。機能・規則の意味を変える場合だけ既存ゲームバランス担当へ返す。',
        '- **字体／AA**：実faceの誤解決と行高・位置は修正した。現在の原寸対に残るfont丸め・AAと、古い撮影環境の不足は別。Godot標準・試作・仕上げを理由に免除しない。具体領域と現font/RID/hashを渡す。',
        '- **状態の追加取得**：合法な全群完了・公開修飾fold・native select・両端バー・端1秒の追加採取を行った。長い名称の合法表示入口とfiller/nullの未取得、親scroll保持基準と現原本の食い違いは37状態表へ残す。別状態成功で埋めない。','','通常セーブ・登録値を変更したfixtureは採用しない。他Workを自動起動・送信しない。UI受領や共通契約判断の返却後、この同じWork・枝で必要箇所だけ再開する。']
    (ED/'必要証拠と残件.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
    state_modes={
      'ST-P01':['repro-home','review-preparation'],'ST-P02':['repro-home','review-preparation'],'ST-P03':['repro-home','review-destination'],'ST-P04':['review-preparation','repro-home','repro-preparation-boundaries'],'ST-P05':['repro-acquisition-funded','repro-acquisition-complete'],'ST-P06':['repro-home','repro-acquisition-affix','review-preparation'],'ST-P07':['review-preparation'],'ST-P08':['interaction','legal-acquisition'],'ST-P09':['inheritance','natural'],
      'ST-E01':['repro-explore'],'ST-E02':['repro-prediction','inheritance'],'ST-E03':['repro-explore','repro-prediction'],'ST-E04':['review-prediction-place','review-safety-matched'],'ST-E05':['review-prediction-place','review-prediction-attack','review-prediction-guard','review-prediction-heal','review-prediction-defense_support'],'ST-E06':['review-safety-consume','review-safety-doomed','review-safety-quick'],'ST-E07':['review-prediction-guard','review-prediction-defense_support'],'ST-E08':['review-order-tie','review-order-different'],'ST-E09':['inheritance','repro-prediction','repro-hover'],
      'ST-I01':['review-destination','review-preparation','inheritance'],'ST-I02':['interaction','inheritance','repro-motion-explore'],'ST-I03':['review-destination','review-destination-field','repro-edges-prep','repro-edges-hand','repro-edges-field'],'ST-I04':['repro-bars-prep','repro-bars-hand','repro-bars-field','review-scroll-prep','review-scroll-hand','review-scroll-field'],'ST-I05':['repro-motion-explore'],'ST-I06':['repro-motion-home','repro-motion-explore'],
      'ST-W01':['repro-home','repro-explore','repro-shared-preparation','repro-shared-story','repro-shared-return-clear','repro-shared-return-withdrawal','repro-shared-return-defeat'],'ST-W02':['repro-explore','repro-shared-preparation'],'ST-W03':['repro-explore','repro-component-extra','repro-shared-preparation'],'ST-W04':['repro-explore','repro-shared-return-clear'],'ST-W05':['natural','repro-explore','repro-shared-return-clear'],'ST-W06':['inheritance','repro-explore'],'ST-W07':['repro-explore','repro-shared-story'],
      'ST-T01':['repro-home','repro-revisit-home'],'ST-T02':['repro-story','inheritance'],'ST-T03':['repro-return-clear','repro-return-withdrawal','repro-return-defeat','natural'],'ST-S01':['interaction','resume','corrupt','future','in-use'],'ST-S02':['failure','unknown','busy-close','interaction','resume'],'ST-C01':['repro-home','repro-explore','repro-shared-preparation','review-preparation']}
    missing={'ST-P01':'原本の長い名称全範囲の同状態拡大対は未取得。','ST-P04':'全ての残高・容量・群の無効部品状態対を一括合格にしない。','ST-P05':'全群取得完了の原本/Godot同状態対は未取得。候補なし・空編成取消は別に採取。','ST-P06':'全修飾foldの展開状態対は未取得。公開説明payloadは17件で確認。','ST-P08':'変換失敗の全表示条件の原本同状態対は未取得。機能回帰の失敗は隔離確認。','ST-E03':'全ての左右端・長い二行titleの同状態対は未取得。','ST-E06':'R01-filler未取得。','ST-E07':'R04-unlimited未取得。','ST-E09':'hover180/160の全時点連続原本対は未取得。既存限定機能は確認。','ST-I04':'自然FHD overflow0。限定実ノードの送りを自然overflowとしない。','ST-W03':'全選択部品のpopup展開／無効の原本対は未取得。','ST-W05':'すべての親scroll量・選択の同状態原本対は未取得。','ST-T01':'再訪の構成詳細の全原本対は未取得。既存一巡入力は確認。','ST-C01':'各部品の全状態を一括合格にしない。採取した役割と未採取のpopup等を分ける。'}
    state_modes['ST-W05'].append('repro-record-memory')
    state_modes['ST-C01'].extend(['repro-checkbox-states','repro-component-extra'])
    for resolved in ['ST-P04','ST-P05','ST-P06','ST-W03','ST-T01','ST-I04','ST-C01']:missing.pop(resolved,None)
    missing['ST-P08']='固定原本のCW-M1-public-0.6ではowned入口をcollectionへ送るが、A06部品のlocalAction/renderDialogにロック・解除・変換見積の入口がない。本編の既確認ロック/見積/変換と失敗時の保存保全は維持。原本対応の窓・入口をDEC-UI-05としてUIへ具体化して返し、ST-P08の同状態原本対は未取得のまま残す。'
    missing['ST-W05']='合法な踏破済み保存の自然overflowで、Godotは親送り位置を保持。原本は597pxから子詳細/戻るで0pxへ戻る実挙動。全scroll量の未取得という追加条件を作らず、保持基準/現原本のどちらを正とするかDEC-UI-06のUI判断へ固定。'
    missing['ST-E09']='原本の場に出すhoverは180msで開き、root外で160ms閉じる。一方root内の空白移動ではpointeroverがleaveTimerを取消し、閉じない実挙動。Godotの空白離脱160msと、160ms基準／現行原本のどちらへ合わせるかUI判断待ち。予測hoverの既存追加入口も別記。'
    missing['ST-P01']='登録可能な長い札名は最大17字まで322variantを記録したが、その長名をM1合法command・取得済み／旧保存で表示する入口は未取得。登録だけのcompile結果を合法描画fixtureにしない。ゲームバランス検討の入口受領後、本Workで取得／探索の同状態対を追加。'
    missing['ST-E03']='左右端と中央の実操作は確認。2行に折り返す長名の合法表示入口は未取得。registered-label-boundary.jsonの17字variant等を実保存として任意生成せず、既存担当の合法入口を受領して再採取。'
    states=[]
    for r in read(UI/'screen-states.json')['items']:
        id=r['id'];modes=state_modes[id];reports=[]
        for mode in modes:
            p=ED/(LIGHT if (ED/LIGHT/(mode+'.json')).exists() else RELATED)/(mode+'.json')
            for later in ['common-light-followup','common-light-complete','related-common-final','hover-use-light','memory-light-final','boundary-light','preparation-light-final','settled-light',RELATED,'fixed-light-second']:
                if (ED/later/(mode+'.json')).exists():p=ED/later/(mode+'.json');break
            reports.append({'path':p.relative_to(ED).as_posix(),'status':read(p).get('status') if p.exists() else '未取得','sha256':sha(p) if p.exists() else None})
        states.append({'id':id,'screen':r['screen'],'required_states':r['states'],'difference_ids':r['difference_ids'],'unknown_ids':r['unknown_ids'],'implementation_sha':implementation,'modes':modes,'reports':reports,'coverage':'部分取得／原本判断待ち・依頼内未完了' if id in missing else '関連実入力と画像を提出・独立UI適合未判定','remaining':missing.get(id,'独立UI適合・物理入力・実機受入は別判定。'),'physical_input':False,'not_an_exception':True})
    assert len(states)==37;write('screen-states.json',{'baseline':'2026-10-04.1','implementation_sha':implementation,'items':states})
    md=['# 今回版の関連検証結果','', '**依頼全体未完了。** 実装／検査成功とUI独立適合、配布、実機受入は別判定。','', '| 固定検査 | 結果 | 内容 |','|---|---|---|']
    for r in suites:md.append('| '+r['directory']+' | '+r['status']+' | '+str(len(r.get('cases',{})))+' mode。実Main／実Control・合成InputEvent／実保存。source変更検出 '+str(r.get('source_changed_during_run',[]))+' |')
    md.append('| Core関連 | '+core['result']+' | 17件、Skip0。旧JS oracle結果・予測期限・表示境界と追加公開投影。 |')
    md+=['','[各modeのcheck数・command数・process ID・source hash](results.json)。`interaction/resume`と`review-safety-quick/review-resume`は別プロセスを確認し、busy-closeは別.NETプロセスでrevision1とlock解放を読戻す。','', '成功ケースはcommand数・DTO・保存ファイルの証拠を伴う。閲覧は全DTOと実ファイルbyte不変、取得取消は未払いPlanだけ、確定は既存Coreの一回処理、再送はreplayedを確認する。通常セーブは検査対象へ入れない。','', '失敗試行も同じ版に保全した。追加mode登録漏れ、描画更新後の旧Button参照、原本採取のoutside-closeによる窓消失、初期fixture識別子の誤り等を最終成功へ読み替えない。検査側の誤りを直して再採取し、原本や規則の数値は変更しない。','', 'CIは[読戻し](ci-readback.json)へ固定I・step・artifactを記録する。初期I1はcontinue-on-error付きでjob successでも描画manifest failedだった。修復I2はそれを除去し、3manifest/source hash/ZIP digestを照合する。','', '[17群の残件](必要証拠と残件.md)、[37状態](screen-states.json)、[同状態比較](比較証拠.md)。']
    (ED/'確認結果.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
    print(json.dumps({'visual_ids':len(rows),'pairs':len(examples),'fixtures':len(fixture_audit),'implementation':implementation},ensure_ascii=False))
if __name__=='__main__':main()
