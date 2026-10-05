from pathlib import Path
import report_io
D=Path(__file__).parent;OLD='572bb9a59b914345830df5c18f910a1deb6af2bc';I='072de5e5c8eee9536b361503b2d847b21f181cd0'
for name in ['latest_documents.py','decision_receipt.py','preservation_receipt.py','build_boundary_receipt.py','finish_report_fields.py']:
 p=D/name;s=p.read_text(encoding='utf-8-sig').replace(OLD,I);p.write_text(s,encoding='utf-8')
p=D/'build_reproduction_report.py';s=p.read_text(encoding='utf-8-sig')
s=s.replace("'common-'+theme+'-followup']","'common-'+theme+'-followup','common-'+theme+'-submitted']")
s=s.replace("'common-light-followup','related-common-final'","'common-light-followup','common-light-submitted','common-dark-submitted','records-use-light','records-use-dark','related-common-final'")
s=s.replace("['common-light-followup','common-light-complete','related-common-final'","['common-light-submitted','records-use-light','common-light-followup','common-light-complete','related-common-final'")
s=s.replace("'functional_evidence':['common-light-complete/manifest.json','common-dark-complete/manifest.json','common-light-followup/manifest.json'","'functional_evidence':['common-light-submitted/manifest.json','common-dark-submitted/manifest.json','records-use-light/manifest.json','records-use-dark/manifest.json','common-light-followup/manifest.json'")
s=s.replace("'evidence':['common-light-complete/manifest.json','common-dark-complete/manifest.json'","'evidence':['common-light-submitted/manifest.json','common-dark-submitted/manifest.json'")
s=s.replace("'common-light-complete/repro-checkbox-states.json','common-dark-complete/repro-checkbox-states.json'","'common-light-submitted/repro-checkbox-states.json','common-dark-submitted/repro-checkbox-states.json'")
s=s.replace("'generic closeは原本×文字。機能の180/160ms・pinを維持。'","'cj close/backは既存18px SVG、cw closeは原本×文字。機能の180/160ms・pinを維持。'")
s=s.replace('generic closeは原本×文字。','cj close/backは既存18px SVG、cw closeは原本×文字。')
s=s.replace('I8の記録表・共通palette・親menu・現在予約は共通16mode明暗と取得共通5modeの追補へ結ぶ。','I8の記録表・共通palette・親menu・現在予約を確認し、最終I10の共通18px SVG・header実幅はsubmittedの16mode明暗へ結ぶ。観測済みの取得／本文／撤退はrecords-useの3mode明暗へ。')
# 追加の合法状態を同じ状態対として記す。初期空記録の欠けたshotを別状態で埋めない。
anchor='    # 元fixtureの数値保全。二つのタグ以外に値差があれば同状態の根拠にしない。'
insert='''    for source,target in [('repro-home','repro-shared-preparation'),('repro-story','repro-shared-story'),('repro-return-withdrawal','repro-shared-return-withdrawal')]:
        for shot in ['records-targets','records-observations','records-card-child','records-cards','known-card-child']:
            for theme in ['light','dark']:
                f=theme+'-'+source+'-'+shot+'.png';g=target+'-'+shot+'.png'
                examples.append({'id':'observed-'+target+'-'+shot+'-'+theme,'theme':theme,'initial_fixture':'fixtures-record-contexts/'+target+'.json','viewport':[1920,1080],'dpr':1,'zoom':1,'reference':frame('source-record-contexts',f),'godot':frame('records-use-'+theme,g),'reference_nodes':frame('source-record-contexts',f.replace('.png','.nodes.json')),'godot_nodes':frame('records-use-'+theme,g.replace('.png','.nodes.json')),'comparison_status':'原寸対を提出・UI再判定待ち' if (ED/'source-record-contexts'/f).exists() and (ED/('records-use-'+theme)/g).exists() else '片側未取得・依頼内未完了','claim':'同じ合法踏破後のcommandで観測済みの使用先を得た別の比較状態。初期空記録の未取得shotへ読み替えない。'})
'''
if "'observed-'+target" not in s:s=s.replace(anchor,insert+anchor)
s=s.replace("for p in sorted((ED/'fixtures').glob('*.json')):","for p in [*sorted((ED/'fixtures').glob('*.json')),*sorted((ED/'fixtures-record-contexts').glob('*.json'))]:")
p.write_text(s,encoding='utf-8')
p=D/'stage_evidence.py';s=p.read_text(encoding='utf-8-sig')
s=s.replace("'source-required-states-neutral','legal-common'","'source-required-states-neutral','source-record-contexts','legal-record-contexts','fixtures-record-contexts','legal-common'")
s=s.replace("'memory-light-final','memory-dark-final','common-light-complete','common-dark-complete','common-light-followup','related-common-final'","'common-light-submitted','common-dark-submitted','records-use-light','records-use-dark','related-common-final'")
s=s.replace("'report_io.py'])","'report_io.py','fix_submission_refs.py','prepare_record_contexts.mjs','make_record_context_reference.py','record_context_reference.cjs'])")
p.write_text(s,encoding='utf-8')
p=D/'latest_documents.py';s=p.read_text(encoding='utf-8-sig').replace('common-light-complete','common-light-submitted').replace('common-dark-complete','common-dark-submitted')
s=s.replace('共通16mode明暗・影響8mode明色・関連入力／保存の限定追補','最終共通16mode明暗・観測済み3mode明暗・影響8mode明色・関連入力／保存の限定追補')
p.write_text(s,encoding='utf-8')
p=D/'preservation_receipt.py';s=p.read_text(encoding='utf-8-sig').replace("'common-light-followup','related-common-final'","'common-light-followup','common-light-submitted','common-dark-submitted','records-use-light','records-use-dark','related-common-final'");p.write_text(s,encoding='utf-8')
print('submission refs',I)
