from pathlib import Path
p=Path(__file__).parent/'final-shared_reference.cjs';s=p.read_text(encoding='utf-8-sig')
s=s.replace("'source-shared-final'","'source-record-contexts'")
old="const fp=fixture==='startup'?null:path.join(edition,fixture.startsWith('repro-return-')?'legal-return':'legal-common',fixture+'.json');"
assert s.count(old)==1
s=s.replace(old,"const fp=path.join(edition,'fixtures-record-contexts',fixture+'.json');")
s=s.replace("['repro-home','repro-story',\n      'repro-return-clear','repro-return-withdrawal','repro-return-defeat']","['repro-home','repro-story','repro-return-withdrawal']")
(p.parent/'record_context_reference.cjs').write_text(s,encoding='utf-8')
print('record-context source capture prepared')
