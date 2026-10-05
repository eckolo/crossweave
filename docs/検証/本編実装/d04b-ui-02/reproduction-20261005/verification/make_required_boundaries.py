from pathlib import Path
P=Path(__file__).resolve().parent
s=(P/'final-extra_reference.cjs').read_text(encoding='utf-8')
s=s.replace("'source-extra-final'","'source-required-boundaries-complete'")
s=s.replace("['repro-home','repro-story','repro-explore','repro-acquisition-affix','repro-acquisition-funded','repro-acquisition-complete','repro-revisit-home']","['repro-preparation-boundaries','repro-hover']")
a=s.index("const fp=fixture==='startup'?");b=s.index('\n        const rec=',a)
s=s[:a]+"const fp=path.join(edition,'fixtures',fixture+'.json');"+s[b:]
a=s.index("        await shot('entry');\n        if(fixture===");b=s.index('        caseRow.after=',a)
body=r'''        await shot('entry');
        if(fixture==='repro-preparation-boundaries') {
          await page.locator('[data-j="collection"]').click();
          await page.locator('[data-action="tab"][data-id="passive"]').click();
          while(await page.locator('.cp-lane-build [data-action="remove"]').count())await page.locator('.cp-lane-build [data-action="remove"]').first().click();
          const offers=controller.inspect().display_data.home.acquisition.filter(r=>r.blueprint.kind==='passive'&&r.id.startsWith('basic:'));
          for(const row of offers){await page.locator('[data-action="stage"][data-id="'+row.id+'"]').click();await page.locator('[data-action="add"][data-uid="'+row.pending_selection_id+'"]').click();}
          await shot('capacity-invalid');await page.locator('[data-action="review"]').click();await shot('capacity-confirmation');
          caseRow.commit_disabled=await page.locator('[data-action="commit"]').isDisabled();
          if(!caseRow.commit_disabled)throw Error('Capacity invalid plan enabled commit');
          await page.locator('[data-action="close"]').click();await page.locator('[data-action="discard"]').click();
        } else {
          const choice=controller.inspect().display_data.exploration.legal_actions[0];
          await page.locator('[data-x-card="'+choice.card_id+'"]').click();await closeAll();
          if(choice.target){await page.locator('[data-x-actor="'+choice.target+'"]').click();await closeAll();}
          await page.mouse.move(960,360);caseRow.play_disabled=await page.locator('[data-x="use"]').isDisabled();caseRow.choice=choice;await shot('before-hover');
          const frames=[];
          const listener=async e=>{const filename=prefix+'-frame-'+frames.length+'.png';frames.push({file:filename,epoch_seconds:e.metadata.timestamp,data:e.data});await cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});};
          cdp.on('Page.screencastFrame',listener);await cdp.send('Page.startScreencast',{format:'png',maxWidth:1920,maxHeight:1080,everyNthFrame:1});
          await page.evaluate(()=>{window.__hoverRows=[];window.__hoverPhase='enter';window.__hoverStart=performance.now();window.__hoverRecording=true;function sample(){if(!window.__hoverRecording)return;window.__hoverRows.push({phase:window.__hoverPhase,at_ms:performance.now(),elapsed_ms:performance.now()-window.__hoverStart,detail_open:!!document.querySelector('[data-x="pin"]')});requestAnimationFrame(sample);}requestAnimationFrame(sample);});
          const point=await page.locator('[data-x="use"]').boundingBox();await page.mouse.move(point.x+point.width/2,point.y+point.height/2);
          await page.waitForTimeout(420);caseRow.transient_open=await page.locator('[data-x="pin"]').isVisible();caseRow.drawer_rect=await page.locator('#cw-drawer').boundingBox();
          // 窓の実rectと内側空白・root外の離脱を別々に記録する。
          await page.evaluate(()=>{window.__hoverPhase='leave';window.__hoverStart=performance.now();});await page.mouse.move(1905,1070);await page.waitForTimeout(420);
          caseRow.closed_on_leave=!await page.locator('[data-x="pin"]').isVisible();
          await shot('interior-leave',false);
          await page.evaluate(()=>{window.__hoverPhase='root-leave';window.__hoverStart=performance.now();});await page.mouse.move(-5,-5);await page.waitForTimeout(420);
          caseRow.closed_on_root_leave=!await page.locator('[data-x="pin"]').isVisible();
          if(!caseRow.closed_on_leave)caseRow.limitations.push('原本root内の空白移動では閉じない実挙動。pointeroverでleaveTimerが無条件取消される現行sourceと、160ms離脱基準をUIへ返す。');
          const timeline=await page.evaluate(()=>{window.__hoverRecording=false;return window.__hoverRows;});
          await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',listener);
          for(const f of frames){fs.writeFileSync(path.join(out,f.file),Buffer.from(f.data,'base64'));delete f.data;}
          fs.writeFileSync(path.join(out,prefix+'-sequence.json'),JSON.stringify({actual_frames:true,no_interpolation:true,physical_input:false,frames,timeline},null,2));
          if(!caseRow.transient_open||!caseRow.closed_on_root_leave)caseRow.limitations.push('root外離脱の閉鎖も未観測。実入力列・画像を残し、未取得を合格にしない。');
        }
'''
s=s[:a]+body+s[b:]
s=s.replace('detail_open:!!document.querySelector(\'[data-x="pin"]\')','detail_open:!!document.querySelector(\'[data-x="pin"]\')?.getClientRects().length')
(P/'required_boundaries.cjs').write_text(s,encoding='utf-8')
