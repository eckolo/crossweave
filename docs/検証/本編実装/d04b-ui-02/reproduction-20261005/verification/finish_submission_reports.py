"""採取済みの実結果から今回版の固定索引を順に更新する。"""
from pathlib import Path
import report_io
import json,subprocess,sys
R=Path(__file__).resolve().parents[3];D=R/'apps/crossweave-godot/.tools';E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';I='c761cbf4950a750b5b337e1bc9926528b87be54a'
required={'common-light-submitted':16,'common-dark-background-final':16,'records-use-light':3,'records-use-dark':3,'related-common-final':7,'common-light-records-final':7,'common-dark-records-final':7,'common-light-empty-final':1,'records-use-final-light':3,'records-use-final-dark':3}
for folder,count in required.items():
 m=json.loads((E/folder/'manifest.json').read_text(encoding='utf-8-sig'))
 assert m['status']=='passed' and len(m['cases'])==count and not m['source_changed_during_run'],(folder,m.get('error'))
 print(folder,'passed',count,flush=True)
for name,extra in [('decision_receipt.py',[]),('build_reproduction_report.py',['--implementation',I]),('coverage_receipt.py',[]),('id_crops.py',[]),('build_boundary_receipt.py',[]),('preservation_receipt.py',[]),('publication_tools.py',['handoff']),('latest_documents.py',[])]:
 subprocess.check_call([sys.executable,'-X','utf8',str(D/name),*extra],cwd=R)
print('current reports fixed',I)
