from pathlib import Path
import json,hashlib,shutil
ed=Path(__file__).resolve().parents[3]/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
p=ed/'fixtures/receipt.json';d=json.loads(p.read_text(encoding='utf-8-sig'))
rows=[]
for src in sorted((ed/'legal-acquisition-extra').glob('repro-*.json')):
 dst=ed/'fixtures'/src.name;shutil.copy2(src,dst)
 rows.append({'source':src.relative_to(ed).as_posix(),'target':dst.relative_to(ed).as_posix(),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'no_value_edits':True})
src=ed/'fixtures/repro-explore.json';dst=ed/'fixtures/repro-component-extra.json';shutil.copy2(src,dst)
rows.append({'source':src.relative_to(ed).as_posix(),'target':dst.relative_to(ed).as_posix(),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'alias_same_bytes':True})
d=[r for r in d if r.get('target') not in {x['target'] for x in rows}]+rows
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(rows,ensure_ascii=False))
