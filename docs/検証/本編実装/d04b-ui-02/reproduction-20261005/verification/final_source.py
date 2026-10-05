"""隠す既定引数を外した固定原本の原寸採取。各初期documentを維持する。"""
from pathlib import Path
import subprocess,json,hashlib,datetime
p=Path(__file__).parent
node=Path('C:/Users/eckol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
edition=p.parents[2]/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
jobs=[('reference_reproduction.cjs','same-state-reference-final','source-representative-final'),
      ('shared_reference.cjs','source-shared-navigation','source-shared-final'),
      ('component_reference.cjs','source-component-states-submission','source-components-final'),
      ('extra_reference.cjs','source-extra-states','source-extra-final')]
rows=[]
for file,old,new in jobs:
    source=(p/file).read_text(encoding='utf-8-sig').replace(old,new).replace('headless:true',"headless:true,ignoreDefaultArgs:['--hide-scrollbars']")
    target=p/('final-'+file);target.write_text(source,encoding='utf-8')
    (edition/new).mkdir(exist_ok=True)
    with (edition/new/'capture.log').open('w',encoding='utf-8')as log:
        r=subprocess.run([node,target],stdout=log,stderr=subprocess.STDOUT)
    rows.append({'helper':target.name,'directory':new,'exit':r.returncode,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
    print(new+': '+str(r.returncode),flush=True)
(edition/'source-capture-final.json').write_text(json.dumps({'headless':True,'ignore_default_args':['--hide-scrollbars'],'reason':'元の実scrollbar表示を撮る。原本CSSと値は変更しない。','jobs':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
raise SystemExit(1 if any(r['exit'] for r in rows) else 0)
