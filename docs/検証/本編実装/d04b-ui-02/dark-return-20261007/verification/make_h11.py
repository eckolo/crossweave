"""取得済みの同状態PNGとnodeを用途別比較欄へ結ぶ。新描画・採用は行わない。

H11の旧資料の誤引用を補正するため、同名iconだけでなく所在・状態を選ぶ。
候補は同定義・同size/stroke/alphaの既存画素だけを実描画欄へ再利用する。
異なるMountainや20→24の比較を拡大して実画素に見せることはしない。
"""
from pathlib import Path
import hashlib
import html
import json
import math
import os

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
HUMAN=OUT/'human'
OLD=ROOT/'docs/検証/本編実装/d04b-ui-02/recheck-fix-20261006'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
audit={r['pair']:r for r in read(HUMAN/'source-use-audit.json')['pairs']}
definitions=read(OLD/'human/candidate-icons.json')
specs=definitions['rows']

# 原本と前回本編は同じ固定状態対。最新コードへ読み替えない。
# 05と13を含め、複数使用先は独立した小比較として残す。
locations={
 'H11-01':[('心得メタ・取得', 'repro-acquisition-affix-passive-dark',lambda x,y:x<400 and 120<y<1000)],
 'H11-02':[('編成済みメタ', 'repro-acquisition-affix-card-dark',lambda x,y:x>1160 and 120<y<1000)],
 'H11-03':[('心得枠消費・所持', 'repro-acquisition-complete-passive-dark',lambda x,y:400<x<1160 and 120<y<1000)],
 'H11-04':[('札面の未払い（walletを除く）','repro-home-pending-dark',lambda x,y:600<x<800 and 120<y<220)],
 'H11-05':[('wallet','repro-home-pending-dark',lambda x,y:y<64),('取得footer','repro-home-pending-dark',lambda x,y:y>1000)],
 'H11-06':[('詳細のpending token内（背景札を除く）','repro-home-pending-detail-dark',lambda x,y:1300<x<1420 and 200<y<280)],
 'H11-07':[('編成空枠','repro-home-empty-composition-dark',lambda x,y:x>1160 and 120<y<1000)],
 'H11-08':[('取得候補なし','repro-home-card-dark',lambda x,y:x<400 and 120<y<1000)],
 'H11-09':[('取得完了の欄','repro-acquisition-complete-card-dark',lambda x,y:x<400 and 120<y<1000),('取得完了footer','repro-acquisition-complete-card-dark',lambda x,y:y>1000)],
 'H11-10':[('戻すfooter','repro-home-pending-dark',lambda x,y:y>1000)],
 'H11-11':[('取得可能の見出し（footerを除く）','repro-acquisition-funded-all-groups-pending-dark',lambda x,y:x<400 and 64<y<115),('取得確認の見出し','repro-acquisition-funded-all-groups-confirmation-dark',lambda x,y:490<x<540 and 280<y<335)],
 'H11-12':[('取得の所在','repro-acquisition-affix-affix-closed-dark',lambda x,y:490<x<550 and 210<y<290)],
 'H11-13':[('編成の見出し','repro-acquisition-funded-all-groups-pending-dark',lambda x,y:x>1160 and 64<y<115),('編成変更確認の見出し','repro-acquisition-funded-all-groups-confirmation-dark',lambda x,y:490<x<540 and 580<y<930)],
 'H11-14':[('編成の所在','repro-acquisition-affix-affix-closed-dark',lambda x,y:690<x<760 and 210<y<290)],
 'H11-15':[('主体・Triangle SVG64','repro-explore-entry-dark',lambda x,y:y>80 and y<210)],
 'H11-16':[('行動順・Text△12／22box','repro-explore-entry-dark',lambda x,y:y<80)]
}

def evidence(file,node,source_role):
    return {'png':file,'node':node,'actual_box':node.get('box',node.get('rect')),
            'size':node.get('box',node.get('rect'))[2:],
            'alpha':node.get('opacity',1),'stroke':None if source_role=='original' or node.get('text')=='△' else 1.5 if node.get('icon')=='Triangle' else 2,
            'shape':node.get('rendered_shape') if source_role=='original' else 'Text△' if node.get('text')=='△' else node.get('icon'),
            'source_role':source_role}

rows=[]
for spec in specs:
    sid=spec['id'];uses=[]
    lookup={'Clock3':'clock-3','Grid2X2':'grid-2x2','CircleCheck':'circle-check','LayoutGrid':'layout-grid','ScrollText':'scroll-text','Undo2':'undo-2'}.get(spec['name'],spec['name'].lower())
    for use,pair_id,inside in locations[sid]:
        pair=audit.get(pair_id)
        if pair is None:
            uses.append({'use':use,'pair':pair_id,'status':'固定同状態対が未取得。別状態へ置換しない。'});continue
        current_name='Triangle' if sid=='H11-15' else spec['name']
        currents=[n for n in pair['previous_current_uses'] if (n.get('text')=='△' if sid=='H11-16' else n.get('icon')==current_name) and inside(*n['rect'][:2])]
        originals=[n for n in pair['original_uses'] if n['name']==lookup and inside(*n['box'][:2])]
        # 比較開始の不足を誤ったfooterや背景の同名記号で埋めない。
        original=originals[0] if originals else None
        if sid=='H11-04' and original is None:
            # 固定原本には未登録Clockのleaf自体がない。この同じpending札の
            # ARTICLEを原本nodeとして残し、右下の同用途比較領域の実画素を結ぶ。
            # 原本に18px SVG nodeが存在した、とは記録しない。
            node_file=ROOT/pair['reference_nodes']['path']
            document=read(node_file);document=document if isinstance(document,list) else document['nodes']
            parent=next((n for n in document if 'cp-pending' in n.get('classes','') and n.get('tag')=='ARTICLE' and inside(n['rect'][0]+251,n['rect'][1]+55)),None)
            if parent:
                b=parent['rect'];original={'name':'clock-3','box':[b[0]+251,b[1]+55,18,18],
                    'opacity':1,'rendered_shape':'未登録Clockの原本実画素（同pending札の右下領域）。原本SVG leafなし。',
                    'source_parent_node':parent,'box_basis':'取得済みARTICLEの実box＋同用途相対位置251/55。比較ROIで、原本SVGのsizeではない。'}
        if original and currents:
            center=lambda b:(b[0]+b[2]/2,b[1]+b[3]/2)
            ox,oy=center(original['box'])
            current=min(currents,key=lambda n:math.dist(center(n['rect']),(ox,oy)))
        else:current=currents[0] if currents else None
        ref=evidence(pair['reference'],original,'original') if original else None
        now=evidence(pair['previous_current'],current,'previous-current') if current else None
        if now and spec['name']!='Mountain' and now['actual_box'][2:]==[spec['size'],spec['size']]:
            candidate={**now,'source_role':'candidate-same-definition-pixels','adopted':False,
                'basis':'既存描画器の同定義・同size/stroke/alphaの実画素。独立renderer比較ではない。'}
        else:candidate=None
        uses.append({'use':use,'pair':pair_id,'fixture':pair['fixture'],'original':ref,'previous_current':now,
            'candidate':candidate,'candidate_spec':{'name':spec['name'],'size':spec['size'],'stroke':spec['stroke'],'definition':spec['candidate']},
            'reference_nodes':pair['reference_nodes'],'current_nodes':pair['previous_current_nodes'],
            'status':'固定旧版の原本／現在の欄を訂正。最新本編・候補の必要描画は未確認。',
            'missing':([] if ref else ['原本同用途node未取得'])+([] if now else ['旧本編に該当用途の可視記号がない'])+([] if candidate else ['同用途・背景・sizeの候補実描画未取得']),
            'latest_code_pixels':None})
    rows.append({'id':sid,'name':spec['name'],'use':spec['use'],'adopted':False,'human_answer':'未着',
        'uses':uses,'comparison_correction':'04/06/11の所在条件と05/13の複数使用先を独立指定。',
        'source_current_commit':'aabfefab076252f050824640fba6d8a8dd13e8e0',
        'ready_for_human':'UIの開始成立確認待ち。最新の必要描画はrender-stop.jsonの環境条件待ち。'})

payload={'purpose':'H11の実画素列・用途nodeの訂正。未採用。',
 'original_commit':'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2','fixed_before_code':'aabfefab076252f050824640fba6d8a8dd13e8e0',
 'latest_code_rendered':False,'adopted_count':0,'independent_start_ready_count':0,
 'candidate_definition_file':{'path':'docs/検証/本編実装/d04b-ui-02/recheck-fix-20261006/human/candidate-icons.json','blob':'3ac2c42434c47564d1e7cc18edcb93a26484a8c3'},
 'candidate_native_auxiliary':'../recheck-fix-20261006/human-native-corrected/のMountain図は別背景の補助。実使用先の候補欄に代用しない。',
 'rows':rows}
(HUMAN/'H11用途別比較.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
esc=html.escape
def picture(item):
    if not item:return '<p class="pending">この欄の同用途実描画は未成立</p>'
    p=ROOT/item['png']['path'];b=item['actual_box'];x,y=math.floor(b[0]),math.floor(b[1]);w=math.ceil(b[0]+b[2])-x;h=math.ceil(b[1]+b[3])-y
    rel=os.path.relpath(p,HUMAN).replace('\\','/')
    info='box '+str(b)+'／stroke '+str(item['stroke'])+'／alpha '+str(item['alpha'])
    return '<div class="pixel" style="width:'+str(w)+'px;height:'+str(h)+'px;background-image:url(&quot;'+esc(rel,quote=True)+'&quot;);background-position:-'+str(x)+'px -'+str(y)+'px"></div><p>'+esc(info)+'</p><p>'+esc(str(item['shape']))+'</p><details><summary>原寸・path/blob</summary><a href="'+esc(rel,quote=True)+'">原寸PNG</a><p>'+esc(item['png']['path'])+'</p><p>blob '+esc(item['png']['blob'])+'</p><p>SHA256 '+esc(item['png']['sha256'])+'</p></details>'
body=[]
for row in rows:
    body.append('<section><h2>'+esc(row['id']+' '+row['name']+'／'+row['use'])+'</h2>')
    for use in row['uses']:
        body.append('<h3>'+esc(use['use'])+'</h3><p>'+esc(use.get('pair',''))+'</p><div class="columns"><article><h4>固定原本の実画素</h4>'+picture(use.get('original'))+'</article><article><h4>固定旧本編 aabfefab の実画素</h4>'+picture(use.get('previous_current'))+'</article><article><h4>未採用候補・同定義画素</h4>'+picture(use.get('candidate'))+'</article></div><p class="pending">'+esc('／'.join(use.get('missing',[])))+'</p>')
    body.append('<p>最新本編の実描画：未確認。用途別採用：未回答。UIの開始成立：未受領。</p></section>')
page='<!doctype html><html lang="ja"><meta charset="utf-8"><title>H11 用途別実画素の訂正</title><style>body{margin:24px;font:16px/1.6 system-ui;background:#1d2b27;color:#e6ece3}h1{font-size:26px}h2{font-size:22px}h3{font-size:18px}.columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}article,section{border:1px solid #52685b;padding:16px;margin:16px 0}.pixel{background-repeat:no-repeat;image-rendering:pixelated;margin:16px}.pending{color:#dbbd78}a{color:#c6d9ba}p{overflow-wrap:anywhere}details{font-size:13px}</style><h1>H11：原本／固定旧本編／未採用候補の用途対応訂正</h1><p>全16用途の採用0、UIによる開始成立0。既に取得済みの原寸PNGを実際の用途boxへ結び、04/06/11の誤引用と05/13の使用先不足を訂正します。原本が未登録の空欄でも、その実画素を表示します。SVGを生成して原本へ描き足していません。</p><p>現在欄は保存済みaabfefabの固定旧本編です。今回修正コードの実描画は隔離desktopの環境前提が成立せず未確認。候補Mountainと別sizeの候補も、補助図や拡大で代用しません。</p>'+''.join(body)+'</html>'
(HUMAN/'H11用途別比較.html').write_text(page,encoding='utf-8',newline='\n')
print('H11比較欄訂正:',len(rows),'用途／',sum(len(r['uses']) for r in rows),'使用先。新描画・採用なし。')
