"""同じ作業枝へ保存する診断資料のUTF-8本文とGit blobを用意する。

Python標準のファイル処理で、Godot/C#/.NETの本編を実行しない。
今回資料と既存Work・理由追補だけを列挙し、byte列からblob/SHA256を計算する。
通信・Git ref更新は行わず、既存成果を削除しない。自己参照の票は.toolsへ置く。
読取りやUTF-8復号が失敗すれば止まり、別データに置き換えない。
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'.tools/desktop-inherit-publication.json'

if len(sys.argv)>1 and sys.argv[1]=='read':
    row=json.loads(MANIFEST.read_text(encoding='utf-8'))['files'][int(sys.argv[2])]
    content=(ROOT/row['path']).read_bytes().decode('utf-8')
    start=int(sys.argv[3]) if len(sys.argv)>3 else 0
    count=int(sys.argv[4]) if len(sys.argv)>4 else len(content)
    print(json.dumps({'path':row['path'],'blob':row['blob'],'total_chars':len(content),
        'offset':start,'content':content[start:start+count]},ensure_ascii=False))
else:
    paths={p.relative_to(ROOT).as_posix() for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
    paths.update({'docs/作業資料/Work/20260927-game-application.md',
        'docs/検証/本編実装/d04b-ui-02/dark-return-20261007/サンドボックス内の描画停止理由.md'})
    rows=[]
    for path in sorted(paths):
        raw=(ROOT/path).read_bytes()
        text=raw.decode('utf-8')
        sha=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        rows.append({'path':path,'blob':sha,'sha256':hashlib.sha256(raw).hexdigest(),
            'bytes':len(raw),'chars':len(text)})
    MANIFEST.write_text(json.dumps({'files':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'files':len(rows),'bytes':sum(x['bytes'] for x in rows)},ensure_ascii=False))
