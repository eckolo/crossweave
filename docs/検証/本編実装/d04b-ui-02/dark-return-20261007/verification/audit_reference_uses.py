"""H11の同用途原本と前回本編の実ノードを列挙する。画素を生成しない。

比較欄の入口を誤った同名iconから選ばないため、状態・所在・全使用先を
先に確認する資料。新しい実描画が成立するまでは前回版として明記する。
"""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
OLD=ROOT/'docs/検証/本編実装/d04b-ui-02/recheck-fix-20261006'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def nodes(p):
    d=read(p)
    return d if isinstance(d,list) else d['nodes']
def digest(p):
    b=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),
            'blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),
            'sha256':hashlib.sha256(b).hexdigest()}
names={'scroll-text','check','grid-2x2','clock-3','plus','inbox','circle-check','undo-2','store','layout-grid','mountain'}
pairs=read(OLD/'comparisons.json')['pairs']
selected=[p for p in pairs if any(x in p['id'] for x in ['repro-home-card','repro-home-passive','repro-home-pending','repro-home-empty-composition','repro-acquisition-affix','repro-acquisition-funded','repro-acquisition-complete','repro-explore-entry'])]
records=[]
for pair in selected:
    rp=(OLD/pair['reference']).resolve();cp=(OLD/pair['current']).resolve()
    rn=(OLD/pair['reference_nodes']).resolve();cn=(OLD/pair['current_nodes']).resolve()
    if not all(p.exists() for p in [rp,cp,rn,cn]):continue
    originals=[]
    for index,n in enumerate(nodes(rn)):
        attrs=dict(n.get('attributes',[]));name=attrs.get('data-lucide')
        if name in names:
            originals.append({'index':index,'name':name,'tag':n.get('tag'),
                'classes':n.get('classes'),'box':n.get('rect'),'opacity':n.get('opacity'),
                'font':n.get('font'),'color':n.get('color'),'attributes':attrs,
                'rendered_shape':'未登録Mountainの△fallback実画素。SVG登録ではない。' if name=='mountain' else '未登録iの実画素は空欄。SVGの新採用ではない。'})
    current=[n for n in nodes(cn) if n.get('visible') and (n.get('icon') in ['ScrollText','Check','Grid2X2','Clock3','Plus','Inbox','CircleCheck','Undo2','Store','LayoutGrid','Triangle'] or n.get('text')=='△')]
    records.append({'pair':pair['id'],'fixture':pair['fixture'],'reference':digest(rp),
        'reference_nodes':digest(rn),'original_uses':originals,'previous_current':digest(cp),
        'previous_current_nodes':digest(cn),'previous_current_uses':current})
(OUT/'human').mkdir(exist_ok=True)
(OUT/'human/source-use-audit.json').write_text(json.dumps({
    'original_commit':'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',
    'previous_current_commit':'aabfefab076252f050824640fba6d8a8dd13e8e0',
    'submitted_at':'0ec6334254db00ebc7956b4df493f3a34b98845a',
    'candidate_adopted':0,'new_rendering_verified':False,'pairs':records
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('H11用途監査:',len(records),'状態。原本node',sum(len(x['original_uses']) for x in records))
