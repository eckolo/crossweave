"""ユーザー指定の前面割込み停止を採取台帳に反映する。旧途中証拠も保存。"""
from pathlib import Path
import report_io
import json
R=Path(__file__).resolve().parents[3];D=R/'apps/crossweave-godot/.tools';E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
for name in ['build_reproduction_report.py','latest_documents.py','publication_tools.py','stage_evidence.py','preservation_receipt.py','decision_receipt.py']:
 p=D/name;t=p.read_text(encoding='utf-8-sig').replace('common-dark-submitted','common-dark-background-final')
 if name=='build_reproduction_report.py':
  t=t.replace("'common-'+theme+'-submitted'", "('common-light-submitted' if theme=='light' else 'common-dark-background-final')")
  t=t.replace("'core-final/related.trx']),\n      'U-V04'", "'core-final/related.trx']),\n      'U-V04'")
  t=t.replace("['source-shared-final/manifest.json',LIGHT+'/manifest.json','core-final/related.trx']", "['source-shared-final/manifest.json','source-record-contexts/manifest.json','records-use-light/manifest.json','records-use-dark/manifest.json','common-light-submitted/manifest.json','common-dark-background-final/manifest.json','core-final/related.trx']")
  t=t.replace('原本autoReadとC#readonlyを区別。','原本autoReadとC#readonlyを区別。初期記録なしの未取得8対は残し、通常commandで踏破記録を得た編成・本文・撤退の別保存3状態を原本とGodot明暗の30対で補完。')
 if name=='decision_receipt.py':
  t=t.replace('common-light-followup/repro-record-memory.json','common-light-submitted/repro-record-memory.json').replace('common-dark-complete/repro-record-memory.json','common-dark-background-final/repro-record-memory.json')
 if name=='latest_documents.py':
  t=t.replace('明色の最後の字体・予約間隔差は`common-light-followup`の8modeを優先する。','明色は`common-light-submitted`、暗色は`common-dark-background-final`を最終とする。`common-light-followup`8modeは途中の影響確認として保全する。')
 if name=='stage_evidence.py':
  t=t.replace("'record_context_reference.cjs'])", "'record_context_reference.cjs','publication_tools.py','background_desktop.py','background_report_update.py'])")
 p.write_text(t,encoding='utf-8')
old=E/'common-dark-submitted/manifest.json'
if old.exists():
 d=json.loads(old.read_text(encoding='utf-8-sig'))
 receipt={'status':'interrupted','reason':'ユーザーが前面ウィンドウによる作業割込みを停止するよう指定。Ctrl+Cで採取を中断。','recorded_cases':list(d.get('cases',{})),'expected_cases':16,'raw_manifest_status':d.get('status'),'raw_manifest_is_not_a_complete_pass':True,'original_files_preserved':True,'replacement':'common-dark-background-final/manifest.json'}
 (E/'common-dark-submitted/interruption.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=E/'確認入口.md';t=p.read_text(encoding='utf-8-sig')
t=t.replace('common-dark-submitted','common-dark-background-final').replace('572bb9a59b914345830df5c18f910a1deb6af2bc','072de5e5c8eee9536b361503b2d847b21f181cd0')
t=t.replace('明色の最後の字体・予約間隔差は`common-light-followup`の8modeを優先する。','明色は`common-light-submitted`、暗色は`common-dark-background-final`を最終とする。`common-light-followup`8modeは途中の影響確認として保全する。')
if '## 前面に割り込まない採取' not in t:
 t+='\n## 前面に割り込まない採取\n\n利用者の作業を妨げたため通常desktopの検査起動を停止した。後続の実描画は`verification/background_desktop.py`で切り替えないWindows desktopへ子PythonとGodotを隔離する。通常画面へフォールバックせず、実GPU・実Viewport PNG・実ノード・viewport-local InputEventを維持する。`background-desktop.json`に入力desktopが変わらなかったことと終了結果を記録する。headless合格や物理操作合格へ読み替えない。\n'
p.write_text(t,encoding='utf-8')
p=E/'コード解説.md';t=p.read_text(encoding='utf-8-sig')
if 'cj headerの後続修正' not in t:
 t+='\n共通cj headerの後続修正では、原本DOMのclose/backに使う既存X／ArrowLeft SVGを18pxで配置した。戻るButtonは左9px・上4.5px、titleは戻りなし9px／戻りあり65pxへ置き、右65pxを除いた446px／390pxを本文幅とする。cwの×文字は元系統を保つ。\n'
p.write_text(t,encoding='utf-8')
print('foreground interruption preserved; background receipts selected')
