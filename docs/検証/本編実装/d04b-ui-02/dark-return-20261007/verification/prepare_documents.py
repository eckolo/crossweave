"""承認済みGitHub保存へ、本編と同じ枝の資料・同期コピーを渡す。

GitHub上に既に存在する原本blobは内容検算の上で参照し直す。新しい資料は
UTF-8本文で保存する。巨大保全台帳も省略せず、読取りchunkは本文の運搬だけ。
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
TARGET=ROOT/'.tools/dark-return-document-manifest.json'
def git(*a):return subprocess.check_output(['git',*a],cwd=ROOT)
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
if len(sys.argv)>1 and sys.argv[1]=='read':
    row=json.loads(TARGET.read_text(encoding='utf-8'))['files'][int(sys.argv[2])]
    s=(ROOT/row['path']).read_bytes().decode('utf-8')
    start=int(sys.argv[3]) if len(sys.argv)>3 else 0
    count=int(sys.argv[4]) if len(sys.argv)>4 else len(s)
    print(json.dumps({'path':row['path'],'blob':row['blob'],'offset':start,'total_chars':len(s),'content':s[start:start+count]},ensure_ascii=False))
else:
    paths=set(git('-c','core.quotepath=false','diff','--name-only','HEAD').decode().splitlines())
    paths.update(p.relative_to(ROOT).as_posix() for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    paths.update(git('-c','core.quotepath=false','ls-files','--others','--exclude-standard','--','docs/作業資料/とりまとめ').decode().splitlines())
    paths={p for p in paths if not p.startswith('apps/crossweave-godot/Godot/Application/')}
    plan=json.loads((ROOT/'docs/作業資料/計画同期/20260927-game-application.json').read_text(encoding='utf-8'))['files']
    fixed=json.loads((OUT/'fixed-input-receipt.json').read_text(encoding='utf-8'))['files']
    existing={**plan,**{(OUT/x['copy_path']).relative_to(ROOT).as_posix():x['blob'] for x in fixed}}
    records=[]
    for path in sorted(paths):
        b=(ROOT/path).read_bytes();sha=blob(b)
        if path in existing:assert sha==existing[path]
        records.append({'path':path,'blob':sha,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),
            'chars':len(b.decode('utf-8')),'existing_remote_blob':path in existing})
    TARGET.write_text(json.dumps({'files':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'files':len(records),'new_text_blobs':sum(not r['existing_remote_blob'] for r in records),
        'total_bytes':sum(r['bytes'] for r in records),'largest':sorted(records,key=lambda r:r['bytes'],reverse=True)[:5]},ensure_ascii=False))
