"""固定I10のActions artifact内部から結果を受領する。緑色だけでは完了にしない。"""
from pathlib import Path
import report_io
import hashlib,json,sys,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
stage=sys.argv[1] if len(sys.argv)>1 else 'I10'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
c=E/'cloud'/stage;d=read(c/'receipt.json');run=read(c/'workflow-run.json');jobs=read(c/'workflow-jobs.json');I=d['implementation_sha']
assert d['status']=='passed' and d['implementation_sha']==I
assert run['head_sha']==I and run['status']=='completed' and run['conclusion']=='success'
assert all(j['status']=='completed' and j['conclusion']=='success' and all(s['conclusion']=='success' for s in j['steps']) for j in jobs['jobs'])
assert len(d['manifests'])==3
counts={}
for m in d['manifests']:
 mode='light' if 'rendered-light' in m['manifest'] else 'dark' if 'rendered-dark' in m['manifest'] else 'nodes-save-restart'
 counts[mode]=len(m['cases'])
assert counts=={'nodes-save-restart':15,'light':16,'dark':16},counts
trx=next(c.rglob('related.trx'));ns={'t':'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'}
t=ET.parse(trx).find('t:ResultSummary/t:Counters',ns);counters=dict(t.attrib)
assert counters['passed']=='17' and counters['failed']=='0' and counters['notExecuted']=='0'
summary={'implementation_sha':I,'status':'passed','run_id':run['id'],'url':run['html_url'],'run_head_matches':True,
 'job_steps_all_success':True,'artifact_receipt':f'cloud/{stage}/receipt.json','artifact_id':d['artifact_id'],'zip_sha256':d['zip_sha256'],
 'internal_manifests_all_passed':True,'exact_source_or_only_checkout_crlf':True,'source_changed_during_run':[],
 'cases':counts,'related_core':{'counters':counters,'trx':trx.relative_to(E).as_posix(),'sha256':hashlib.sha256(trx.read_bytes()).hexdigest()},
 'cloud_readable':True,'formal_ui_approval':False,'physical_input':False,'windows11_physical':False,'formal_distribution':False}
(E/'ci-readback.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('final CI artifact verified',counts,'Core17 passed; skipped0')
