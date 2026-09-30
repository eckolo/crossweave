"""開発者向けの通常起動。検査用保存先もfixtureも渡さず、本編Main.tscnを起動する。"""
from pathlib import Path
import argparse, subprocess
from runtime import prepare, ROOT

def main():
    parser=argparse.ArgumentParser(description='固定SDKとGodotでcrossweave本編を開く（正式配布用ではありません）')
    parser.add_argument('--editor',action='store_true',help='本編の代わりにGodotエディターを開く')
    parser.add_argument('--proof',action='store_true',help='別モデル・別保存先の旧代表試作を開く')
    parser.add_argument('--no-acquire',action='store_true',help='取得済みの固定ツールだけを使う')
    parser.add_argument('--prepare-only',action='store_true',help='依存取得・ビルド・importまでで終了する')
    args=parser.parse_args()
    dotnet,godot,env,_=prepare(not args.no_acquire)
    for command in [[dotnet,'restore','Godot/Crossweave.Proof.csproj','--locked-mode','--disable-parallel','-m:1'],
                    [dotnet,'build','Godot/Crossweave.Proof.csproj','--no-restore','-m:1'],
                    [godot,'--headless','--path','Godot','--editor','--import','--quit']]:
        subprocess.run([str(x) for x in command],cwd=ROOT,env=env,check=True)
    if not args.prepare_only:
        command=[godot,'--path','Godot']+(['--editor'] if args.editor else [])+(['--','--proof'] if args.proof else [])
        return subprocess.call([str(x) for x in command],cwd=ROOT,env=env)
    return 0
if __name__=='__main__':raise SystemExit(main())
