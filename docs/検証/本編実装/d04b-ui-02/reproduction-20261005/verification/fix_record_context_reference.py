"""追加の原本採取が初回用保存を参照した誤りを保全し、同じ保存へ結ぶ。"""
from pathlib import Path
import report_io
import json,shutil
R=Path(__file__).resolve().parents[3];D=R/'apps/crossweave-godot/.tools';E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
source=E/'source-record-contexts';saved=E/'source-record-contexts-fixture-mismatch'
assert source.resolve().is_relative_to(E.resolve()) and saved.resolve().is_relative_to(E.resolve())
if source.exists() and not saved.exists():source.rename(saved)
if not (E/'verification/record_context_reference-wrong-fixture.cjs').exists():shutil.copy2(D/'record_context_reference.cjs',E/'verification/record_context_reference-wrong-fixture.cjs')
receipt={'status':'failed-fixture-binding','reason':'追加原本採取の生成補助が固定保存directoryを置換せずlegal-common/legal-returnへ戻った。原画像とmanifestを保存し、観測済みの同状態比較へ使用しない。','correct_fixture_directory':'fixtures-record-contexts','replacement':'source-record-contexts','product_code_changed':False,'raw_old_manifest_does_not_prove_same_state':True}
(saved/'fixture-mismatch.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=D/'record_context_reference.cjs';t=p.read_text(encoding='utf-8-sig')
old="const fp=fixture==='startup'?null:path.join(edition,fixture.startsWith('repro-return-')?'legal-return':'legal-common',fixture+'.json');"
assert t.count(old)==1;t=t.replace(old,"const fp=path.join(edition,'fixtures-record-contexts',fixture+'.json');")
p.write_text(t,encoding='utf-8')
print('wrong initial reference preserved; fixed exact fixture path')
