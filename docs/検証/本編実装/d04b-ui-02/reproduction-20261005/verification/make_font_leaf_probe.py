from pathlib import Path

p = Path(__file__).with_name('reference_remaining.cjs')
s = p.read_text(encoding='utf-8').replace("'same-state-reference-remaining-fourth'", "'source-font-leaves'")
s = s.replace("'repro-return-clear','repro-return-withdrawal','repro-return-defeat','startup'", "'repro-return-clear','startup'")
s = s.replace("if(name==='entry'||name==='prediction'||name==='settings'||name==='card')", "if(true)")
a = s.index('for(const selector of [')
b = s.index(' {', a)
selectors = ['#crossweave-journey h1', '#crossweave-journey h2', '#crossweave-journey button',
    '#crossweave-journey strong', '#crossweave-journey .cj-story .cw-prose-line',
    '#crossweave-journey .cj-prose .cw-prose-line', '#crossweave-journey .cw-drawer-body .cw-prose-line',
    '#crossweave-journey .cw-illustration>span', '#crossweave-journey .cw-face-caption>strong']
s = s[:a] + 'for(const selector of ' + repr(selectors) + ')' + s[b:]
a = s.index("        if(fixture.startsWith('repro-return-'))")
b = s.index('        caseRow.after=', a)
s = s[:a] + "        if(fixture==='repro-explore') await openCommon('explore-settings','operation');\n" + s[b:]
p.with_name('font_leaves.cjs').write_text(s, encoding='utf-8')
