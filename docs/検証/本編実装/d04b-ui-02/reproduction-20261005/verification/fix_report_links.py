"""GitHub読戻しで見つかった比較索引のlink名の誤記だけ直す。"""
from pathlib import Path
import report_io
R=Path(__file__).resolve().parents[3]
E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
D=R/'apps/crossweave-godot/.tools'
paths=[D/'latest_documents.py',D/'publication_tools.py',E/'README.md',E/'確認入口.md',E/'とりまとめ引継ぎ.md',R/'docs/作業資料/Work/20260927-game-application.md']
count=0
for p in paths:
    text=p.read_text(encoding='utf-8-sig')
    fixed=text.replace('record-fix-comparisons.json','record-fix-comparison.json')
    if text!=fixed:
        p.write_text(fixed,encoding='utf-8');count+=1
print('comparison index link fixed',count,'files')
