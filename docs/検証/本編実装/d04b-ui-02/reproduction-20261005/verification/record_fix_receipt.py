"""同じ合法保存のI10修正前・最終修正後・固定原本を無加工で結ぶ。"""
from pathlib import Path
import report_io
import hashlib,json
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';I='c761cbf4950a750b5b337e1bc9926528b87be54a'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def frame(p):return {'path':p.relative_to(E).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
rows=[]
for source,mode in [('repro-home','repro-shared-preparation'),('repro-story','repro-shared-story'),('repro-return-withdrawal','repro-shared-return-withdrawal')]:
 for theme in ['light','dark']:
  old=read(E/('records-use-'+theme)/'manifest.json');new=read(E/('records-use-final-'+theme)/'manifest.json')
  assert old['fixture_sha256'][mode]==new['fixture_sha256'][mode]
  for shot in ['records-card-child','known-card-child']:
   rows.append({'id':'V-W07' if shot=='records-card-child' else 'V-W06','mode':mode,'theme':theme,'fixture_sha256':new['fixture_sha256'][mode],
    'before':frame(E/('records-use-'+theme)/(mode+'-'+shot+'.png')),'before_code':'072de5e5c8eee9536b361503b2d847b21f181cd0',
    'after':frame(E/('records-use-final-'+theme)/(mode+'-'+shot+'.png')),'after_code':I,
    'original':frame(E/'source-record-contexts'/(theme+'-'+source+'-'+shot+'.png')),
    'expected':'札の直前の対象窓を親にして同じWindowPairで配置し、戻ると一覧位置を復元する。取得FHDでの親553/子1089の入力checkも参照。cj値は右端・18px/1.6・行間9・記号16。',
    'actual':'record-grandchild-source-panel / record-back-restores-list-originと全DTO・実保存byte不変を、同じMainの実入力と原寸PNGで確認。','visual_approval':False})
receipt={'implementation_sha':I,'items':rows,'same_fixture':'same-fixture-audit.json','incorrect_source_trial_preserved':'source-record-contexts-fixture-mismatch/fixture-mismatch.json','formal_ui_approval':False}
(E/'record-fix-comparison.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('record before/after/original',len(rows))
