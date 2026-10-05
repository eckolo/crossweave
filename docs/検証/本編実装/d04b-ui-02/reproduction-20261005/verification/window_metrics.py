from pathlib import Path
import json,collections
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
for folder in ['source-remaining-final','source-shared-final','source-required-states-neutral','source-representative-final','common-cut-light']:
 rows=[]
 for p in sorted((E/folder).glob('*.nodes.json')):
  if not any(t in p.name for t in ['records-targets','reduced-motion-selected','help.nodes','settings.nodes','receipt.nodes','menu-settings','home-detail']):continue
  d=json.loads(p.read_text(encoding='utf-8-sig'));nodes=d['nodes']
  panes=[{'class':n.get('classes'),'ids':n.get('ids'),'attributes':n.get('attributes'),'rect':n['rect']} for n in nodes if n.get('classes')=='cj-inspect-item' or any(k in n.get('ids',[]) for k in ['menu-parent','dialog-panel','knowledge-child'])]
  rows.append({'file':p.name,'panes':panes})
 print(folder,json.dumps(rows,ensure_ascii=False))
