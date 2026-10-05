from pathlib import Path
p=Path(__file__).parent
s=(p/'reference_remaining.cjs').read_text(encoding='utf-8-sig')
s=s.replace('same-state-reference-remaining-fourth','source-extra-states')
s=s.replace("['repro-home','repro-explore',\n      'repro-return-clear','repro-return-withdrawal','repro-return-defeat','startup']", "['repro-home','repro-story','repro-explore','repro-acquisition-affix','repro-acquisition-funded','repro-acquisition-complete','repro-revisit-home']")
s=s.replace("fixture.startsWith('repro-return-')?'legal-return':'legal-common'", "fixture.startsWith('repro-acquisition-')||fixture==='repro-revisit-home'?'legal-acquisition-extra':'legal-common'")
start=s.index("        if(fixture.startsWith('repro-return-')) {")
end=s.index('        caseRow.after=',start)
s=s[:start]+'''        if(fixture==='repro-home'||fixture==='repro-revisit-home') {
          await page.locator('[data-j="destination"]').click();await shot('home-detail');await closeAll();
          await page.locator('[data-j="collection"]').click();await shot('card');
          await page.locator('[data-action="tab"][data-id="passive"]').click();await shot('passive');
        } else if(fixture==='repro-story') {
          const sc=page.locator('[data-reading]');if(await sc.count()){await sc.evaluate(n=>n.scrollTop=n.scrollHeight);await shot('prose-end');}
          // この原本はoptional_text_idsを同じ本文の中に展開する。独立した任意本文窓は無い。
          caseRow.limitations.push('任意本文の独立窓なし。optional_text_idsは実本文へ展開。Godot前版の読了操作の配置はUI判断。');
        } else if(fixture==='repro-explore') {
          await openCommon('explore-settings','operation');
          const select=page.locator('select[data-x-hold]');await select.focus();await page.keyboard.press('Alt+ArrowDown');await shot('hold-select-open');
          await page.keyboard.press('Escape');await select.selectOption('320');await shot('hold-select-320');
          await select.selectOption('220');await shot('hold-select-restored');await closeAll();
          await page.locator('button[data-j="records"]:visible').first().click();
          for(const tab of ['targets','cards']){
            const button=page.locator('[data-j="record-tab"][data-tab="'+tab+'"]');await button.hover();await shot('records-tab-'+tab+'-hover');
            await page.keyboard.press('Tab');await button.focus();await shot('records-tab-'+tab+'-focus');
          }await closeAll();
        } else {
          await page.locator('[data-j="collection"]').click();await shot('card');
          await page.locator('[data-action="tab"][data-id="passive"]').click();await shot('passive');
          if(fixture==='repro-acquisition-affix'){
            const id=controller.inspect().display_data.home.acquisition.find(x=>x.blueprint.affixes.length)?.id;
            if(!id)throw Error('No legal public affix offer');
            await page.locator('[data-action="detail"][data-id="'+id+'"]').click();await shot('affix-closed');
            await page.locator('.cp-dialog details>summary').click();await shot('affix-expanded');
          } else if(fixture==='repro-acquisition-funded') {
            const ids=controller.inspect().display_data.home.acquisition;const selected=[...ids.filter(x=>x.id.startsWith('basic:')),ids.find(x=>!x.id.startsWith('basic:'))].filter(Boolean);
            for(const row of selected){await page.locator('[data-action="tab"][data-id="'+(row.blueprint.kind==='passive'?'passive':'card')+'"]').click();await page.locator('[data-action="stage"][data-id="'+row.id+'"]').click();}
            await shot('all-groups-pending');await page.locator('[data-action="review"]').click();await shot('all-groups-confirmation');
            await page.locator('[data-action="commit"]').click();await page.waitForTimeout(700);await shot('all-groups-committed');
          } else if(fixture==='repro-acquisition-complete') {
            if(controller.inspect().display_data.home.acquisition.length!==0)throw Error('Not an all-group-acquired public state');
            await shot('all-groups-empty');
          }
        }
''' +s[end:]
(p/'extra_reference.cjs').write_text(s,encoding='utf-8')
