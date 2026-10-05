"""同状態比較の初期documentを、双方の採取manifestにまで照合する。"""
from pathlib import Path
import report_io
import hashlib,json
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b):return hashlib.sha256(b).hexdigest()
def initial_hash(d):return sha(json.dumps(d['original_document'],ensure_ascii=False,separators=(',',':')).encode('utf-8'))
comparisons=read(E/'comparisons.json');manifests={};rows=[];mismatches=[]
for pair in comparisons['pairs']:
    if pair['id'].startswith('startup-entry-'):
        rows.append({'pair':pair['id'],'status':'新規入口・保存なし','fixture_not_applicable':'元sessionを持たない両実起動の比較'});continue
    value=pair['initial_fixture'];f=E/value if '/' in value else E/'fixtures'/(value+'.json')
    if not f.exists():
        mismatches.append({'pair':pair['id'],'reason':'Godot側の元fixture未特定','path':str(f.relative_to(E))});continue
    expected=initial_hash(read(f));ref=Path(pair['reference']['path']);mp=E/ref.parts[0]/'manifest.json'
    if mp not in manifests:manifests[mp]=read(mp)
    cases=manifests[mp]['cases'];cases=list(cases.values()) if isinstance(cases,dict) else cases
    match=sorted([c for c in cases if c.get('theme')==pair['theme'] and ref.name.startswith(pair['theme']+'-'+c.get('fixture','')+'-')],key=lambda c:len(c.get('fixture','')),reverse=True)
    original=match[0] if match else None
    actual=original.get('before') if original else None
    row={'pair':pair['id'],'fixture':f.relative_to(E).as_posix(),'original_document_sha256':expected,'reference_manifest':mp.relative_to(E).as_posix(),'reference_before_sha256':actual,'same_initial_document':expected==actual,'reference_capture_present':(E/pair['reference']['path']).exists(),'godot_capture_present':(E/pair['godot']['path']).exists(),'missing_shot_is_not_passed':True}
    if expected!=actual:mismatches.append(row)
    rows.append(row)
observed=[]
for c in read(E/'source-record-contexts/manifest.json')['cases']:
    mode={'repro-home':'repro-shared-preparation','repro-story':'repro-shared-story','repro-return-withdrawal':'repro-shared-return-withdrawal'}[c['fixture']]
    f=E/'fixtures-record-contexts'/(c['fixture']+'.json');g=E/'fixtures-record-contexts'/(mode+'.json')
    m=read(E/('records-use-final-'+c['theme'])/'manifest.json')
    eq=sha(f.read_bytes())==sha(g.read_bytes())==c['fixture_sha256']==m['fixture_sha256'][mode]
    observed.append({'fixture':c['fixture'],'godot_mode':mode,'theme':c['theme'],'fixture_sha256':sha(f.read_bytes()),'both_captured_same_fixture_bytes':eq});assert eq
receipt={'implementation_sha':comparisons['implementation_sha'],'status':'passed' if not mismatches else 'failed','pairs':rows,'observed_source_and_godot_manifest_binding':observed,'mismatches':mismatches,'wrong_reference_trial':'source-record-contexts-fixture-mismatch/fixture-mismatch.json','missing_shots_not_passed':True}
(E/'same-fixture-audit.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('same fixture audit',len(rows),'pairs','mismatches',len(mismatches))
print(json.dumps(mismatches[:8],ensure_ascii=False))
assert not mismatches
