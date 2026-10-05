"""今回版の読む順にあるMarkdownの実ファイル参照を照合する。"""
from pathlib import Path
import json,re,subprocess,sys
from urllib.parse import unquote
import report_io
R=Path(__file__).resolve().parents[3]
E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
commit_ref=sys.argv[1] if len(sys.argv)>1 else None
published=None
if commit_ref:
    raw=subprocess.check_output(['git','ls-tree','-rz',commit_ref],cwd=R)
    published={r.split(b'\t',1)[1].decode('utf-8') for r in raw.split(b'\0') if r and r.split(b'\t',1)[0].split()[1]==b'blob'}
files=list(E.glob('*.md'))
files += [E.parent/n for n in ['README.md','UI対応表.md','確認結果.md','確認入口.md','とりまとめ引継ぎ.md','コード解説.md']]
files += [R/'docs/作業資料/Work/20260927-game-application.md']
rows=[]
for p in files:
    text=subprocess.check_output(['git','show',commit_ref+':'+p.relative_to(R).as_posix()],cwd=R).decode('utf-8-sig') if commit_ref else p.read_text(encoding='utf-8-sig')
    for label,target in re.findall(r'\[([^\]\n]+)\]\(([^)\n]+)\)',text):
        target=target.strip('<>').split('#',1)[0]
        if not target or re.match(r'^\w+://',target):continue
        path=(p.parent/unquote(target)).resolve()
        row={'document':p.relative_to(R).as_posix(),'label':label,'target':target,'exists':path.is_file()}
        if published is not None:row['in_fixed_payload']=path.is_relative_to(R) and path.relative_to(R).as_posix() in published
        rows.append(row)
missing=[r for r in rows if not r['exists'] or r.get('in_fixed_payload') is False]
receipt={'status':'passed' if not missing else 'failed','payload_sha':sys.argv[1] if len(sys.argv)>1 else None,'documents':len(files),'links':rows,'missing':missing,'scope':'今回版のMarkdownと既存入口・自Work。JSONの未取得shotは別台帳に保全し成功にしない。'}
(E/'public-links-audit.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('entry links',len(rows),'missing',len(missing))
for r in missing:print(r['document'],r['target'])
assert not missing
