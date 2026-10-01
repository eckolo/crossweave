"""D04B-UI-02の受領原本と現在ファイルを読み取り照合する。同期・Git更新・保存操作は行わない。"""
from pathlib import Path
import argparse, hashlib, json, subprocess

ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT)
def tree(ref,scope):
    result={}
    for entry in git('ls-tree','-rz',ref,'--',scope).split(b'\0'):
        if not entry:continue
        meta,path=entry.split(b'\t',1); mode,kind,blob=meta.decode().split()
        if kind=='blob':result[path.decode('utf-8')]=blob
    return result
def blob(path):
    data=path.read_bytes()
    return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    receipt=json.loads((HERE/'source-readback.json').read_text(encoding='utf-8'))
    expected=receipt['plan']['files'];current=tree('origin/ops/project-coordination-20260913','docs/作業資料/とりまとめ')
    mismatches={p:dict(expected=h,actual=blob(ROOT/p) if (ROOT/p).is_file() else None) for p,h in expected.items() if not (ROOT/p).is_file() or blob(ROOT/p)!=h}
    # 規則・保存形式・固定入力・既存素材・基盤ファイルが今回の修正に混ざっていないことも照合する。
    base=receipt['application_base']
    protected=['src','apps/crossweave-godot/Infrastructure','apps/crossweave-godot/Core/Application/Content','apps/crossweave-godot/packaging','apps/crossweave-godot/Godot/Assets','apps/crossweave-godot/Tests/Fixtures']
    protected_changes=[]
    for scope in protected:
        protected_changes+=git('diff','--name-only',base,'--',scope).decode('utf-8').splitlines()
    for scope in ['apps/crossweave-godot/Godot/project.godot','apps/crossweave-godot/Godot/Proof.tscn','apps/crossweave-godot/Godot/Main.tscn','apps/crossweave-godot/Core/PointerGesture.cs']:
        protected_changes+=git('diff','--name-only',base,'--',scope).decode('utf-8').splitlines()
    refs={name:git('rev-parse','origin/'+name).decode().strip() for name in ['ops/project-coordination-20260913','dev_design_tmp_assembly','ui/readability-20260910','impl/m1-godot-application-20260927']}
    ok=not mismatches and current==expected and not protected_changes
    report=dict(status='passed' if ok else 'failed',latest_refs=refs,plan_file_count=len(expected),plan_source_tree_equal=current==expected,plan_actual_files_equal=not mismatches,mismatches=mismatches,protected_changes=protected_changes,protected_scopes=protected)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(report['status'],len(expected),'plan files;',len(protected_changes),'protected changes')
    return 0 if ok else 1
if __name__=='__main__':raise SystemExit(main())
