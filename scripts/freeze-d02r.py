"""Freeze this supplement before a new, separately recorded check attempt."""
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(__file__).resolve().parents[1]
out=root/'docs/検証/接続条件/co-d02/appendix-d02r'/f'code-{int(sys.argv[1]):02d}.json'
paths=sorted([*root.glob('src/**/*.mjs'),*root.glob('test/runtime/d02r*.mjs'),root/'test/runtime/support.mjs',Path(__file__).resolve()])
paths += [root/'docs/検証/接続条件/co-d02/appendix-d02r/conditions.json',root/'docs/検証/接続条件/co-d02/appendix-d02r/ui-receipt.json']
record={'id':'CW-M1-A-002','attempt':int(sys.argv[1]),'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),
        'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}
with out.open('x') as f:json.dump(record,f,ensure_ascii=False,indent=2);f.write('\n')
print(out)
