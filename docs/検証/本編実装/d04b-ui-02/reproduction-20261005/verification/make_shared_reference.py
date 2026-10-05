from pathlib import Path

p=Path(__file__).with_name('reference_remaining.cjs')
s=p.read_text(encoding='utf-8').replace("'same-state-reference-remaining-fourth'", "'source-shared-navigation'")
s=s.replace("['repro-home','repro-explore',", "['repro-home','repro-story',")
s=s.replace("'repro-return-defeat','startup'", "'repro-return-defeat'")
a=s.index("        if(fixture.startsWith('repro-return-'))")
b=s.index('        caseRow.after=',a)
block='''        if(fixture==='repro-home') {
          await page.locator('[data-j="collection"]').click();await shot('preparation');
        }
        for(const [action,name] of [['settings','settings'],['help','help'],['data','save-data'],['texts','history']]) {
          await openCommon(action,name);
          if(action==='settings') {await page.locator('input[data-motion]').check();await shot('reduced-motion');await page.locator('input[data-motion]').uncheck();}
        }
        await closeAll();await page.locator('button[data-j="records"]:visible').first().click();await shot('records-targets');
        const record=page.locator('[data-j="record-target"]');if(await record.count()) {
          await record.first().click();await shot('records-observations');
          const child=page.locator('[data-j="record-detail"]');if(await child.count()){await child.first().click();await shot('records-card-child');}
        }
        await closeAll();await page.locator('button[data-j="records"]:visible').first().click();
        await page.locator('[data-j="record-tab"][data-tab="cards"]').click();await shot('records-cards');
        const known=page.locator('[data-j="record-detail"]');if(await known.count()){await known.first().click();await shot('known-card-child');}
        await closeAll();
'''
s=s[:a]+block+s[b:]
p.with_name('shared_reference.cjs').write_text(s,encoding='utf-8')
