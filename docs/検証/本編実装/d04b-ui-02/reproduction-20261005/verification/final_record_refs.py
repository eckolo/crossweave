"""最後の記録継承修正へ参照を限定差替え。旧I10/I11の採取は保全する。"""
from pathlib import Path
import report_io
import json
R=Path(__file__).resolve().parents[3];D=R/'apps/crossweave-godot/.tools';E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
old='072de5e5c8eee9536b361503b2d847b21f181cd0';new='c761cbf4950a750b5b337e1bc9926528b87be54a'
for name in ['latest_documents.py','publication_tools.py','decision_receipt.py','build_boundary_receipt.py','preservation_receipt.py','finish_submission_reports.py']:
 p=D/name;t=p.read_text(encoding='utf-8-sig').replace(old,new)
 if name=='publication_tools.py':t=t.replace("'records-use-light','records-use-dark'", "'records-use-light','records-use-dark','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark'")
 if name=='decision_receipt.py':t=t.replace('common-light-submitted/repro-record-memory.json','common-light-records-final/repro-record-memory.json').replace('common-dark-background-final/repro-record-memory.json','common-dark-records-final/repro-record-memory.json')
 if name=='preservation_receipt.py':t=t.replace("'related-common-final']", "'related-common-final','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark']")
 if name=='finish_submission_reports.py':
  t=t.replace("'related-common-final':7}","'related-common-final':7,'common-light-records-final':7,'common-dark-records-final':7,'common-light-empty-final':1,'records-use-final-light':3,'records-use-final-dark':3}")
 p.write_text(t,encoding='utf-8')
p=D/'build_reproduction_report.py';t=p.read_text(encoding='utf-8-sig')
t=t.replace("('common-light-submitted' if theme=='light' else 'common-dark-background-final')]", "('common-light-submitted' if theme=='light' else 'common-dark-background-final'),'common-'+theme+'-records-final','common-'+theme+'-empty-final']")
t=t.replace("frame('records-use-'+theme,g)","frame('records-use-final-'+theme,g)").replace("frame('records-use-'+theme,g.replace", "frame('records-use-final-'+theme,g.replace").replace("ED/('records-use-'+theme)/g", "ED/('records-use-final-'+theme)/g")
t=t.replace("'records-use-light','records-use-dark','related-common-final'", "'records-use-light','records-use-dark','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark','related-common-final'")
t=t.replace("'records-use-light/manifest.json','records-use-dark/manifest.json'", "'records-use-final-light/manifest.json','records-use-final-dark/manifest.json','common-light-records-final/manifest.json','common-dark-records-final/manifest.json','common-light-empty-final/manifest.json'")
t=t.replace('最終I10の共通18px SVG・header実幅はsubmittedの16mode明暗へ結ぶ。','I10の共通18px SVG・header実幅はsubmittedの16mode明暗へ結ぶ。I11の記録孫窓・cj値列はrecords-finalの7mode明暗、I12の空対象一覧は明色empty-final/暗色records-finalへ差替える。')
t=t.replace('records-useの3mode明暗へ。','records-use-finalの3mode明暗へ。')
t=t.replace("'最終I10のCI内部証拠読戻し済み'","'最終実装のCI内部証拠読戻し済み'").replace('固定I10のCore17件','固定最終実装のCore17件').replace("'cloud/I10/receipt.json'","'cloud/I12/receipt.json'")
t=t.replace("'functional_evidence':['common-light-submitted/manifest.json'", "'functional_evidence':['common-light-records-final/manifest.json','common-dark-records-final/manifest.json','common-light-empty-final/manifest.json','common-light-submitted/manifest.json'")
t=t.replace('対象構成を左、札詳細を右へ同時表示。sourceWindowと記憶したscroll・選択を戻る操作で保持。','対象構成を札詳細の直前の親として配置し、一覧の原位置は戻るまで維持する。553/1089の孫窓と戻りを実入力で確認。cjの値列は右端・18px/1.6・行間9へ分離し、空一覧へ追加文言を作らない。親scrollの基準／原本差は具体残件へ。')
p.write_text(t,encoding='utf-8')
p=D/'stage_evidence.py';t=p.read_text(encoding='utf-8-sig').replace("'records-use-light','records-use-dark'", "'records-use-light','records-use-dark','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark'")
t=t.replace("'same_fixture_audit.py'])", "'same_fixture_audit.py','final_record_refs.py'])");p.write_text(t,encoding='utf-8')
p=D/'same_fixture_audit.py';t=p.read_text(encoding='utf-8-sig').replace("'records-use-'+c['theme']", "'records-use-final-'+c['theme']");p.write_text(t,encoding='utf-8')
ci=E/'ci-readback.json'
if ci.exists():
 d=json.loads(ci.read_text(encoding='utf-8-sig'))
 if d['implementation_sha']==old:
  (E/'cloud/I10/summary.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  ci.write_text(json.dumps({'implementation_sha':new,'status':'最終I12のCI内部証拠待ち','prior_success':'cloud/I10/summary.json','not_read_forward':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=E/'コード解説.md';t=p.read_text(encoding='utf-8-sig')
if '## 記録の孫窓と値列' not in t:
 t+='\n## 記録の孫窓と値列\n\n一覧→対象→札では、札の直前にある対象窓が新しい親になる。FHDの編成では17/553の一覧／対象pairから553/1089の対象／札pairへ進み、戻ると17/553を復元する。親の原位置をsourceWindowへ残し、孫窓のRenderで上書きしない。探索時は同じWindowPairの端clampを使う。\n\ncj-record-statsは18px/1.6・行間9px・記号16pxで、値を行の右端へ置く。cwのmax-contentラベル列・二記号・場の加算列とは表示契約が異なる。共有Ledgerの入口でcjだけを分岐し、公開数値を再計算しない。付与札のcj二行は「全員へ」を付け、cwの公開機転は維持する。空の対象一覧は原本の目的行と空一覧のままで追加案内文を作らない。\n\n追加原本採取の補助が旧初期保存を参照した誤りはsource-record-contexts-fixture-mismatchへ保全した。固定fixture directoryを明示して取り直し、same-fixture-audit.jsonで比較474組の初期documentと追加6採取の両manifestを照合する。原本側だけ画像を取り直し、本編の合法保存は変更していない。\n'
p.write_text(t,encoding='utf-8')
print('final references selected',new)
