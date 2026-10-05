from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';F=E/'fixtures'
receipt=json.loads((F/'receipt.json').read_text())
for mode,source in [('repro-hover','repro-explore'),('repro-preparation-boundaries','repro-acquisition-funded'),('repro-record-memory','repro-return-clear'),('repro-checkbox-states','repro-explore')]:
 data=(F/(source+'.json')).read_bytes();target=F/(mode+'.json');target.write_bytes(data)
 if not any(r.get('path')=='fixtures/'+target.name for r in receipt):receipt.append({'path':'fixtures/'+target.name,'source_path':'fixtures/'+source+'.json','sha256':hashlib.sha256(data).hexdigest(),'bytes_unchanged':True,'method':'合法原本の同一byteコピー。未確定Planまたはhoverだけの隔離検査。'})
(F/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
