"""再開時の実ファイルを保全し、前回の完全台帳に差分を結ぶ。

Python標準処理であり、Godot・C#/.NETの本編処理ではない。
Git HEAD／差分→既存未追跡全ファイルのSHA256→計画／本編候補を順に読む。
全ファイルを再計算し、変化がないものは前回台帳を参照する。削除・復元・
Gitメタデータ変更は行わない。読取り失敗は中止し、不在を推定で補わない。
"""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
OLD=ROOT/'docs/検証/本編実装/d04b-ui-02/dark-return-20261007'

def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        while chunk:=f.read(1024*1024):h.update(chunk)
    return h.hexdigest()
def blob(p):
    b=p.read_bytes()
    return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))

assert not (OUT/'retained-state.json').exists(),'既存の保全票を上書きしない'
assert git('branch','--show-current').decode().strip()=='impl/m1-godot-application-20260927'
(OUT/'retained-index.patch').write_bytes(git('diff','--cached','--binary','HEAD'))
(OUT/'retained-worktree.patch').write_bytes(git('diff','--binary'))
old=read(OLD/'start-state.json')['untracked_files']
paths=[x.decode('utf-8') for x in git('ls-files','-z','--others','--exclude-standard').split(b'\0') if x]
paths=[x for x in paths if not (ROOT/x).resolve().is_relative_to(OUT)]
current={};delta={};same=0
for index,path in enumerate(paths):
    p=ROOT/path;record={'bytes':p.stat().st_size,'sha256':sha(p)}
    current[path]=record
    if old.get(path)==record:same+=1
    else:delta[path]=record
    if index%3000==0:print(f'保全hash {index+1}/{len(paths)}',flush=True)
candidate=read(OLD/'code-candidate.json')['files']
code_checks=[{'path':x['path'],'actual_blob':blob(ROOT/x['path']),'expected_blob':x['blob']} for x in candidate]
plan=read(ROOT/'docs/作業資料/計画同期/20260927-game-application.json')['files']
plan_checks=[{'path':path,'actual_blob':blob(ROOT/path),'expected_blob':expected} for path,expected in plan.items()]
records={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'work_id':'20260927-game-application','branch':'impl/m1-godot-application-20260927',
    'local_head':git('rev-parse','HEAD').decode().strip(),
    'github_refs':read(OUT/'source-refs.json'),
    'previous_full_manifest':{'path':(OLD/'start-state.json').relative_to(ROOT).as_posix(),'sha256':sha(OLD/'start-state.json')},
    'untracked_count':len(current),'untracked_bytes':sum(x['bytes'] for x in current.values()),
    'previous_unchanged_count':same,'delta':delta,'missing_since_previous':sorted(set(old)-set(current)),
    'complete_current_manifest_sha256':hashlib.sha256(json.dumps(current,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'code_candidate_checks':code_checks,'plan_checks':plan_checks,
    'editor_buffers':'別窓口の未保存バッファ不存在は推定しない。','destructive_actions':False}
(OUT/'retained-state.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
assert all(x['actual_blob']==x['expected_blob'] for x in code_checks+plan_checks)
print(json.dumps({'untracked':len(current),'previous_unchanged':same,'delta':len(delta),
    'missing':len(records['missing_since_previous']),'code_matches':len(code_checks),'plan_matches':len(plan_checks)},ensure_ascii=False))
