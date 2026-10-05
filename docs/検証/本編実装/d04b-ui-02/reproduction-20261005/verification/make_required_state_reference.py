from pathlib import Path
p=Path(__file__).resolve().parent
text=(p/'required_boundaries.cjs').read_text(encoding='utf-8')
text=text.replace("'source-required-boundaries-complete'","'source-required-states-neutral'").replace("['repro-preparation-boundaries','repro-hover']","['repro-record-memory','repro-checkbox-states']")
start=text.index("        if(fixture==='repro-preparation-boundaries') {")
end=text.index('        caseRow.after=',start)
text=text[:start]+'''        caseRow.read_baseline=hash(JSON.stringify(controller.exportSave()));
        if(fixture==='repro-record-memory') {
          await page.locator('[data-j="records"]:visible').first().click();
          await page.locator('[data-j="record-target"]').first().click();
          const targetPane=()=>page.locator('.cj-inspect-item[data-inspect-key^="target:"] .cj-inspect-scroll');
          await targetPane().evaluate(n=>n.scrollTop=n.scrollHeight);
          const card=targetPane().locator('[data-j="record-detail"]').last();await card.scrollIntoViewIfNeeded();
          const before=await targetPane().evaluate(n=>({top:n.scrollTop,height:n.scrollHeight,page:n.clientHeight}));
          if(before.top<=0||before.height<=before.page)throw Error('No natural public record overflow');
          await page.mouse.move(950,600);await shot('parent-scrolled');await card.click();await page.mouse.move(950,600);await shot('child-beside-scrolled-parent');
          const beside=await targetPane().evaluate(n=>n.scrollTop);
          await page.locator('[data-j="record-back"]').last().click();await page.mouse.move(950,600);await shot('parent-restored');
          const returned=await targetPane().evaluate(n=>n.scrollTop);
          caseRow.scroll={before,beside,returned,natural_overflow:true};
          if(beside!==before.top||returned!==before.top)caseRow.limitations.push('現固定原本は自然overflowの親scrollを597から0へ戻す。scroll保持基準とGodotの保持挙動との原本判断が必要。数値はcaseRow.scrollの実測。');
        } else {
          await openCommon('settings','settings');
          const checkbox=page.locator('input[data-motion]');const point=await checkbox.boundingBox();
          await page.mouse.move(950,500);await shot('reduced-motion-normal');
          await checkbox.hover();await shot('reduced-motion-hover');
          await page.keyboard.press('Tab');await checkbox.focus();await shot('reduced-motion-focus');
          await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await shot('reduced-motion-pressed');
          await page.mouse.move(950,500);await page.mouse.up();
          // browser checkboxはoutside releaseでもtoggleする。現checkedから
          // 元のfalseへ通常clickで戻してから、selected=trueを実入力で採る。
          if(await checkbox.isChecked())await checkbox.click();
          await checkbox.click();caseRow.selected=await checkbox.isChecked();await shot('reduced-motion-selected');
          if(!caseRow.selected)throw Error('Original checkbox not selected');await checkbox.click();
        }
        caseRow.readonly_after=hash(JSON.stringify(controller.exportSave()));
        caseRow.readonly_state_unchanged=caseRow.read_baseline===caseRow.readonly_after;
        if(!caseRow.readonly_state_unchanged)throw Error('Display interaction changed original document');
''' + text[end:]
(p/'required_states.cjs').write_text(text,encoding='utf-8')
