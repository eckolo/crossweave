from pathlib import Path
p=Path(__file__).parent
s=(p/'reference_remaining.cjs').read_text(encoding='utf-8-sig')
s=s.replace("same-state-reference-remaining-fourth", "source-component-states-submission")
s=s.replace("['repro-home','repro-explore',\n      'repro-return-clear','repro-return-withdrawal','repro-return-defeat','startup']", "['repro-home','repro-explore']")
start=s.index("        if(fixture.startsWith('repro-return-')) {")
end=s.index("        caseRow.after=",start)
s=s[:start]+'''        async function states(selector,name) {
          const button=page.locator(selector).filter({visible:true}).first();
          if(!await button.count()){caseRow.limitations.push('未取得部品: '+name+' '+selector);return;}
          await page.mouse.move(960,600);await shot(name+'-normal');
          if(await button.isDisabled()) {await shot(name+'-disabled');return;}
          await button.hover();await shot(name+'-hover');
          // 実DOM focusを採取する。物理keyboard入力の合格とは呼ばない。
          await page.keyboard.press('Tab');await button.focus();await shot(name+'-focus');
          const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
          await page.mouse.down();await shot(name+'-pressed');
          // ボタン外かつ親窓の内側で解放する。画面端ではoutside-closeが
          // 発火し、続く部品の採取と意味の違う操作になるため避ける。
          const cancel=await button.evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement){const r=p.getBoundingClientRect();if(r.width>=480&&r.height>=300&&r.width<1500)return {x:r.left+12,y:r.bottom-12};}return {x:960,y:600};});
          await page.mouse.move(cancel.x,cancel.y);await page.mouse.up();
          if(await button.isVisible())await button.evaluate(b=>b.blur());
        }
        for(const [selector,name] of [['button[data-j="records"]','knowledge'],['button[data-j="menu"]','menu']])await states(selector,name);
        if(fixture==='repro-home') {
          await states('[data-j="collection"]','prepare');await states('[data-j="depart"]','depart');
          await page.locator('[data-j="collection"]').click();
          await states('[data-action="tab"][data-id="card"]','tab-card');
          await states('[data-action="remove"]','remove-build');
          await states('[data-action="review"]','review');await states('[data-action="discard"]','discard');
          const detail=page.locator('[data-action="detail"][data-zone="build"]').first();
          if(await detail.count()){await detail.click();await states('[data-action="close"]','detail-close');await page.locator('[data-action="close"]').click();}
          // 同じ公開未確定案で空編成を作り、正式所持は残す。取消で元へ戻す。
          for(let count=0;count<12;count++){const remove=page.locator('[data-action="remove"]').first();if(!await remove.count())break;await remove.click();}
          await shot('empty-composition');await page.locator('[data-action="discard"]').click();
        }else{
          const choice=rec.choice??controller.inspect().display_data.exploration.legal_actions[0];
          if(choice.target)await states('[data-x-actor="'+choice.target+'"]','actor-target');
          await page.locator('[data-x-card="'+choice.card_id+'"]').click();
          await states('[data-x="pin"]','window-pin');await states('[data-x="close"]','detail-close');await closeAll();
          await states('[data-x="preview"]','preview');await states('[data-x="use"]','play');
        }
        await closeAll();await page.locator('button[data-j="records"]:visible').first().click();
        await states('[data-j="record-tab"][data-tab="targets"]','records-tab-targets');
        await states('[data-j="record-tab"][data-tab="cards"]','records-tab-cards');await closeAll();
        await openCommon('settings','settings');await states('input[data-motion]','reduced-motion');await closeAll();
''' +s[end:]
# raw寸法/影とともに、UAのoutlineとkeyboard focusの有無も固定する。
s=s.replace("boxShadow:s.boxShadow,", "boxShadow:s.boxShadow,outline:s.outline,outlineOffset:s.outlineOffset,focused:n===document.activeElement,focusVisible:n.matches(':focus-visible'),")
(p/'component_reference.cjs').write_text(s,encoding='utf-8')
