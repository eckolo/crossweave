"""ローカルの変更をGitHubプラグインへ渡す台帳を作る。自枝のFF保存専用。

保護された.gitを別実行環境で書き換えない。リモート親・tree・HEADは
プラグインで照合し、本文のGit blobを計算して保存結果と対応させる。
"""
from pathlib import Path
import base64
import hashlib
import json
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
paths=subprocess.check_output(['git','diff','--name-only','HEAD','--','apps/crossweave-godot/Godot/Application'],cwd=ROOT).decode().splitlines()
assert len(paths)==9,paths
payload=[]
for name in paths:
    b=(ROOT/name).read_bytes()
    payload.append({'path':name,'blob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),
        'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'content':base64.b64encode(b).decode(),'encoding':'base64'})
(ROOT/'.tools/dark-return-code-payload.json').write_text(json.dumps(payload,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
(OUT/'code-candidate.json').write_text(json.dumps({'base':'0ec6334254db00ebc7956b4df493f3a34b98845a',
    'files':[{k:v for k,v in x.items() if k not in ['content','encoding']} for x in payload],
    'build':'Godot/.NETの既定build_ui.py通過、警告0／エラー0。',
    'rendered':False,'functional_test_executed':0,'status':'具体独立修正候補。必要な描画／機能確認は未了。'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('コード保存候補:',len(paths),'path／',sum(x['bytes'] for x in payload),'bytes')
