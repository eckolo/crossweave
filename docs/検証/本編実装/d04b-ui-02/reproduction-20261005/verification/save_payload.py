"""既存枝と今回の明示pathだけを確認して通常commitする。"""
from pathlib import Path
import subprocess,sys
R=Path(__file__).resolve().parents[3];D=R/'apps/crossweave-godot/.tools'
def git(*a):return subprocess.check_output(['git',*a],cwd=R)
assert git('branch','--show-current').decode().strip()=='impl/m1-godot-application-20260927'
paths=[p.decode('utf-8') for p in git('diff','--cached','--name-only','-z').split(b'\0') if p]
allowed={'docs/作業資料/Work/20260927-game-application.md','docs/作業資料/計画同期/20260927-game-application.json'}
assert paths and all(p.startswith('docs/検証/本編実装/d04b-ui-02/') or p in allowed for p in paths)
label=sys.argv[1];assert label in ['legacy','current','receipt','metadata']
with (D/('commit-'+label+'.log')).open('wb') as log:
 # 大量の原寸証拠を保存する間、同じ全履歴の自動再packを毎回反復しない。
 # 通常のcommitであり、履歴・枝・remote・global設定は変更しない。
 subprocess.check_call(['git','-c','gc.auto=0','commit','-m','D04B-UI-02: preserve '+label+' reproduction evidence and explicit remaining decisions'],cwd=R,stdout=log,stderr=subprocess.STDOUT)
print('saved',label,len(paths),'paths',git('rev-parse','HEAD').decode().strip())
