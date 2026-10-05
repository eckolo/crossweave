"""今回版だけを指定して段階保存する。既存配布物や他Workを取り込まない。"""
from pathlib import Path
import json,subprocess,hashlib,argparse,os,time,uuid
import report_io
R=Path(__file__).resolve().parents[3];A=R/'apps/crossweave-godot';E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
p=argparse.ArgumentParser();p.add_argument('kind',choices=['source','runtime','receipt']);p.add_argument('--dry-run',action='store_true');p.add_argument('--subset',choices=['all','legacy','current'],default='all');a=p.parse_args()
source=['source-representative-final','source-components-final','source-shared-final','source-extra-final','source-remaining-final','source-boundary-states-final','source-edge-states','source-font-leaves','source-required-boundaries-complete','source-required-states-neutral','source-record-contexts','legal-record-contexts','fixtures-record-contexts','legal-common','legal-common-fixed','legal-boundaries','legal-return','legal-acquisition-extra','fixed-input','environment','verification']
runtime=['fixed-light-final','fixed-dark-final','preparation-light-final','preparation-dark-final','settled-light','settled-dark','startup-dark-final','related-final','core-final','id-comparisons','cloud','boundary-light','boundary-dark','hover-use-light','hover-use-dark','common-light-submitted','common-dark-background-final','records-use-light','records-use-dark','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark','related-common-final']
files=[]
if a.kind=='source':
 helper=E/'verification';helper.mkdir(exist_ok=True)
 names=['prepare_original_legal.mjs','prepare_original_return.mjs','search_legal_boundaries.mjs','prepare_acquisition_extra.mjs','attach_extra_fixtures.py','reference_reproduction.cjs','reference_remaining.cjs','shared_reference.cjs','component_reference.cjs','extra_reference.cjs','make_shared_reference.py','make_component_reference.py','make_extra_reference.py','font_leaves.cjs','font_environment.cjs','font_faces.py','font_probe.gd','make_font_leaf_probe.py','measure_prose.py','build_reproduction_report.py','build_boundary_receipt.py','make_boundary_reference.py','boundary_reference.cjs','final_source.py','final-reference_reproduction.cjs','final-shared_reference.cjs','final-component_reference.cjs','final-extra_reference.cjs','make_final_remaining.py','final_remaining.cjs','make_edge_reference.py','edge_reference.cjs','id_crops.py','coverage_receipt.py','cloud_receipt.py','stage_evidence.py','preservation_receipt.py','make_required_boundaries.py','required_boundaries.cjs','prepare_boundary_aliases.py','registered_labels.mjs','decision_receipt.py','png_readback.py','final_documents.py']
 names.extend(['make_required_state_reference.py','required_states.cjs','extend_state_workflow.py','window_metrics.py','record_metrics.py','final_audit.py','latest_documents.py','finish_report_fields.py','report_io.py','fix_submission_refs.py','prepare_record_contexts.mjs','make_record_context_reference.py','record_context_reference.cjs','publication_tools.py','background_desktop.py','background_report_update.py','ci_summary.py','save_payload.py','finish_submission_reports.py','fix_record_context_reference.py','same_fixture_audit.py','record_fix_receipt.py','final_record_refs.py'])
 names.extend(['fix_report_links.py','audit_public_links.py'])
 for name in names:
  src=A/'.tools'/name
  if src.exists():
   # 同期中のDropboxで既存fileがmapされても、補助コードを部分上書きしない。
   dest=helper/name;temp=dest.with_name(dest.name+'.'+uuid.uuid4().hex+'.tmp')
   body=src.read_bytes();temp.write_bytes(body)
   for attempt in range(12):
    try:os.replace(temp,dest);break
    except OSError:
     if attempt==11:raise
     time.sleep(.2)
 for folder in source:
  files += [f for f in (E/folder).rglob('*') if f.is_file() and not f.name.endswith('.zip')]
elif a.kind=='runtime':
 for folder in runtime:files += [f for f in (E/folder).rglob('*') if f.is_file()]
 # 途中試行はmanifest/実check/logだけ通常保存。大量の途中PNGはローカルを
 # 保全し、inventoryに全hashを残す。最終採取の原寸PNGはすべて通常Gitへ。
 for directory in E.iterdir():
  if not directory.is_dir() or directory.name in source+runtime+['fixtures']:continue
  files += [f for f in directory.rglob('*') if f.is_file() and (f.name=='manifest.json' or f.suffix in ['.log','.trx'] or (f.suffix=='.json' and not f.name.endswith('.nodes.json')))]
elif a.kind=='receipt':
 files += [f for f in E.iterdir() if f.is_file()]
 files += list((E/'fixtures').glob('*.json'))
 files += list((E/'verification').glob('*'))
 for n in ['README.md','UI対応表.md','確認結果.md','確認入口.md','とりまとめ引継ぎ.md','コード解説.md']:
  f=E.parent/n
  if f.exists():files.append(f)
 files.append(R/'docs/作業資料/Work/20260927-game-application.md')
 files.append(R/'docs/作業資料/計画同期/20260927-game-application.json')
files=sorted(set(files))
if a.kind=='runtime' and a.subset!='all':
 legacy={'fixed-light-final','fixed-dark-final','preparation-light-final','preparation-dark-final','settled-light','settled-dark','startup-dark-final','related-final','core-final','boundary-light','boundary-dark','hover-use-light','hover-use-dark'}
 files=[f for f in files if (f.relative_to(E).parts[0] in legacy)==(a.subset=='legacy')]
paths=[f.relative_to(R).as_posix() for f in files]
assert all(f.is_relative_to(E) for f in files) if a.kind!='receipt' else True
oversize=[str(f.relative_to(R)) for f in files if f.stat().st_size>=95_000_000];assert not oversize,oversize
pathspec=A/'.tools'/('publish-'+a.kind+'.paths');pathspec.write_bytes(b'\0'.join(p.encode('utf-8') for p in paths)+b'\0')
if not a.dry_run:subprocess.check_call(['git','add','--pathspec-from-file='+str(pathspec),'--pathspec-file-nul'],cwd=R)
print(json.dumps({'kind':a.kind,'files':len(files),'bytes':sum(f.stat().st_size for f in files)},ensure_ascii=False))
