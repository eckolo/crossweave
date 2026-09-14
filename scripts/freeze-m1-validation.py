"""Freeze code BEFORE each bounded validation attempt; never overwrite a manifest."""
from pathlib import Path
import hashlib,json,sys,subprocess
root=Path(__file__).resolve().parents[1]
target=root/'docs/検証/接続条件/co-d02'/('code-'+sys.argv[1]+'.json')
if target.exists():raise SystemExit('Manifest already exists; use a new attempt ID')
files=sorted(p for folder in ['src','test/runtime'] for p in (root/folder).rglob('*') if p.is_file())
files += [root/'docs/検証/接続条件/co-d02/harness.html', root/'scripts/generate-m1-content.py', root/'scripts/freeze-m1-validation.py']
data={'schema':'CW-M1-A-001-code-1','attempt':sys.argv[1], 'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),
      'conditions_sha256':hashlib.sha256((target.parent/'conditions.json').read_bytes()).hexdigest(),
      'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(str(target.relative_to(root)))
