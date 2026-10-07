"""手動Cloud引継ぎ資料を同じ作業枝へ保存するため本文とblobを列挙する。

Python標準の読取り・JSON出力で、Cloud起動やGodot/.NETの実行はしない。
今回資料と自Workだけを対象とし、元byte列のGit blobとSHA256を結ぶ。
通信・Git ref更新・削除はしない。UTF-8復号や読取りが失敗したら停止する。
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'.tools/cloud-handoff-publication.json'
if len(sys.argv)>1 and sys.argv[1]=='read':
    row=json.loads(MANIFEST.read_text(encoding='utf-8'))['files'][int(sys.argv[2])]
    content=(ROOT/row['path']).read_bytes().decode('utf-8')
    print(json.dumps({'path':row['path'],'blob':row['blob'],'content':content},ensure_ascii=False))
else:
    paths={p.relative_to(ROOT).as_posix() for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    paths.add('docs/作業資料/Work/20260927-game-application.md')
    files=[]
    for path in sorted(paths):
        raw=(ROOT/path).read_bytes()
        files.append({'path':path,'blob':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(),
            'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'chars':len(raw.decode('utf-8'))})
    MANIFEST.write_text(json.dumps({'files':files},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'files':len(files),'bytes':sum(x['bytes'] for x in files)},ensure_ascii=False))
