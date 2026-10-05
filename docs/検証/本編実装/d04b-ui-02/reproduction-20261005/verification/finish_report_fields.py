from pathlib import Path
import report_io
p=Path(__file__).parent/'build_reproduction_report.py'
s=p.read_text(encoding='utf-8')
s=s.replace("'functional_evidence':[LIGHT+'/manifest.json',DARK+'/manifest.json',RELATED+'/manifest.json','preparation-light-final/manifest.json','preparation-dark-final/manifest.json','core-final/related.trx']", "'functional_evidence':['common-light-complete/manifest.json','common-dark-complete/manifest.json','common-light-followup/manifest.json','related-common-final/manifest.json',RELATED+'/manifest.json','preparation-light-final/manifest.json','preparation-dark-final/manifest.json','core-final/related.trx']")
s=s.replace("'status':'修正提出・適合未判定','evidence':[LIGHT+'/manifest.json','core-final/related.trx']", "'status':base['status'],'remaining':base['remaining'],'evidence':['common-light-complete/manifest.json','common-dark-complete/manifest.json','core-final/related.trx']")
s=s.replace('最終Iの保存/再開15mode・明暗14mode','最終Iの保存/再開15mode・明暗16mode')
s=s.replace("'source-required-states-final/manifest.json','memory-light-final/repro-checkbox-states.json','memory-dark-final/repro-checkbox-states.json'", "'source-required-states-neutral/manifest.json','common-light-complete/repro-checkbox-states.json','common-dark-complete/repro-checkbox-states.json'")
s=s.replace('長い名称全範囲、全親scroll量、filler/nullなど未取得の条件は37状態表へ残す。','長い名称の合法表示入口とfiller/nullの未取得、親scroll保持基準と現原本の食い違いは37状態表へ残す。')
s=s.replace('取得画像は最終9mode明暗、動きはsettled系列へ差替え。途中48modeは不変Core/保存の範囲だけ再利用。','取得は9mode明暗、動きはsettled系列へ差替え。I8の記録表・共通palette・親menu・現在予約は共通16mode明暗と取得共通5modeの追補へ結ぶ。全suiteを最終source一致と見なさず、旧suiteの画像は変更外の部品・既確認Core/保存に限定して参照する。途中48modeは不変Core/保存の範囲だけ再利用。')
p.write_text(s,encoding='utf-8')
for name in ['build_reproduction_report.py','coverage_receipt.py','id_crops.py','preservation_receipt.py','build_boundary_receipt.py','decision_receipt.py','cloud_receipt.py']:
 q=p.parent/name;v=q.read_text(encoding='utf-8')
 if 'import report_io' not in v:v=v.replace('from pathlib import Path','from pathlib import Path\nimport report_io',1)
 if name=='preservation_receipt.py':v=v.replace("'implementation_sha':git('rev-parse','HEAD').decode().strip()","'implementation_sha':'072de5e5c8eee9536b361503b2d847b21f181cd0'")
 if name=='build_boundary_receipt.py':v=v.replace("implementation=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()","implementation='072de5e5c8eee9536b361503b2d847b21f181cd0'")
 q.write_text(v,encoding='utf-8')
print('report fields updated')
