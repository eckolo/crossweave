from pathlib import Path
import json
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
c=read(E/'comparisons.json');missing=[]
for p in c['pairs']:
 for role in ['reference','godot','reference_nodes','godot_nodes']:
  if not (E/p[role]['path']).exists():missing.append([p['id'],role,p[role]['path']])
print('pairs',len(c['pairs']),'missing',len(missing));print(json.dumps(missing,ensure_ascii=False))
for f,field in [('必要証拠と残件.json','evidence'),('screen-states.json','reports')]:
 absent=[]
 for r in read(E/f)['items']:
  for p in r[field]:
   path=p['path'] if isinstance(p,dict) else p
   if not (E/path).exists() and not (R/path).exists():absent.append([r['id'],path])
 print(f,'absent',absent)
for folder in ['source-required-boundaries-complete','source-shared-final','source-remaining-final']:
 d=read(E/folder/'manifest.json');print(folder,'keys',list(d),'status',d.get('status'),'cases',list(d.get('cases',{})) if isinstance(d.get('cases'),dict) else len(d.get('cases',[])))
print('coverage empty',[(r['role'],r['control']) for r in read(E/'interaction-state-coverage.json')['roles'] if not r['states']])
for p in ['source-remaining-final/light-repro-explore-records-current.nodes.json','source-remaining-final/light-repro-explore-records-card-child.nodes.json','source-shared-final/light-repro-return-clear-records-observations.nodes.json','fixed-light-final/repro-explore-records-current.nodes.json','fixed-light-final/repro-explore-records-card-child.nodes.json']:
 if not (E/p).exists():continue
 d=read(E/p);nodes=d.get('nodes',[]) if isinstance(d,dict) else d
 print(p,[(n.get('classes',n.get('id')),n.get('scroll',n.get('vertical'))) for n in nodes if 'inspect-scroll' in str(n.get('classes','')) or n.get('vertical')])
for id in ['ST-P08','ST-C01']:
 print(id,next(r['states'] for r in read(R/'apps/crossweave-godot/.tools/fixed-ui-review/screen-states.json')['items'] if r['id']==id))
if (E/'source-required-states/manifest.json').exists():
 print('required-state-cases',[(c['fixture'],c['theme'],c.get('scroll'),c['limitations'],c.get('readonly_state_unchanged')) for c in read(E/'source-required-states/manifest.json')['cases']])
