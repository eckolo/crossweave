from pathlib import Path
import json
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
p=E/'source-required-states-final/light-repro-record-memory-parent-scrolled.nodes.json';d=json.loads(p.read_text());nodes=d['nodes']
for n in nodes:
 if str(n['classes']) in ['cj-inspect-item','cj-inspect-top','cj-inspect-scroll','cj-record-tabs','cj-button cursor-interaction cj-record-link'] or n['text'] in ['相手・環境','札','獲得記録','現在の手札・次に出す札は未公開。','1習得点、素材 M 1、札解放:返し潮'] or n['tag'] in ['TH','TD','UL','LI']:
  print({k:n[k] for k in ['tag','classes','text','rect','font','fontFamily','fontWeight','color','background','border','lineHeight','scroll']})
