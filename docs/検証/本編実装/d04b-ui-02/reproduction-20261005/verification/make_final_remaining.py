from pathlib import Path
p=Path(__file__).parent
s=(p/'reference_remaining.cjs').read_text(encoding='utf-8-sig')
s=s.replace('same-state-reference-remaining-fourth','source-remaining-final').replace('headless:true',"headless:true,ignoreDefaultArgs:['--hide-scrollbars']")
(p/'final_remaining.cjs').write_text(s,encoding='utf-8')
