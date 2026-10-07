"""手動引継ぎ資料の構文・参照・固定入力を静的に検算する。

Python標準の読取り検査であり、Godot/C#/.NETの実行やCloud接続は行わない。
資料内Pythonはastで解析するだけ。Bashの構成を確認しても実行成功とは判定しない。
入力byte/hash→コード候補→本文の固定範囲→結果票の順に読む。不一致は停止する。
"""
from pathlib import Path
import ast
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
data=json.loads((OUT/'input-binding.json').read_text(encoding='utf-8'))
fixture=(ROOT/data['fixture']['path']).read_bytes()
assert len(fixture)==data['fixture']['bytes']
assert hashlib.sha256(fixture).hexdigest()==data['fixture']['sha256']
assert hashlib.sha1(b'blob '+str(len(fixture)).encode()+b'\0'+fixture).hexdigest()==data['fixture']['blob']
candidate=json.loads((ROOT/'docs/検証/本編実装/d04b-ui-02/dark-return-20261007/code-candidate.json').read_text(encoding='utf-8'))
for row in candidate['files']:
    raw=(ROOT/row['path']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==row['sha256'],row['path']
    assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['blob'],row['path']
python_blocks=[]
for path in OUT.glob('*.md'):
    python_blocks.extend(re.findall(r'```python\r?\n(.*?)```',path.read_text(encoding='utf-8'),re.S))
text=(OUT/'検査引継ぎプロンプト.md').read_text(encoding='utf-8')
shell_blocks=re.findall(r'```bash\r?\n(.*?)```',text,re.S)
assert len(shell_blocks)==1,'設定と検査を別shellへ分けない'
shell=shell_blocks[0]
here=re.search(r"<<'PY'.*?\n(.*?)\nPY",shell,re.S)
assert here
python_blocks.append(here.group(1))
assert len(python_blocks)==3
for block in python_blocks:ast.parse(block)
assert 'set -euo pipefail' in shell
assert 'NUGET_PACKAGES="$cw_cloud_repo/apps/crossweave-godot/.tools/cloud-prepared/nuget"' in shell
assert not re.search(r'^\s*(?:export\s+)?(?:HOME|CODEX_HOME)\s*=',shell,re.M)
assert '--modes repro-normal-dark-home' in shell and '--theme' not in shell
assert '--rendered --full-hd' in shell
for path in ['apps/crossweave-godot/UiProbe/runtime.py','apps/crossweave-godot/UiProbe/verify.py',
             'apps/crossweave-godot/Godot/Assets/NotoSansJP.ttf',
             'apps/crossweave-godot/Godot/Application/UiAutomation.FixedRecheck.cs']:
    assert (ROOT/path).is_file(),path
result={'status':'static-check-passed','python_examples_parsed':3,
    'single_shell_environment':True,'fixture_blob':data['fixture']['blob'],
    'code_candidate_paths_matched':len(candidate['files']),
    'cloud_started':False,'cloud_execution_tested':False,
    'bash_execution_tested':False,'gpu_or_rendering_tested':False,
    'scope':'資料内構文・固定入力・参照と構成のみ。Cloudでの成功ではない。'}
(OUT/'static-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(result,ensure_ascii=False))
