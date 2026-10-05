from pathlib import Path
p=Path(__file__).parent
s=(p/'reference_remaining.cjs').read_text(encoding='utf-8-sig').replace('same-state-reference-remaining-fourth','source-edge-states')
s=s.replace('headless:true',"headless:true,ignoreDefaultArgs:['--hide-scrollbars']")
s=s.replace("['repro-home','repro-explore',\n      'repro-return-clear','repro-return-withdrawal','repro-return-defeat','startup']", "['repro-edges-prep','repro-edges-hand','repro-edges-field']")
s=s.replace("const fp=fixture==='startup'?null:path.join(edition,fixture.startsWith('repro-return-')?'legal-return':'legal-common',fixture+'.json');", "const fp=path.join(edition,'fixtures',fixture+'.json');")
start=s.index("        if(fixture.startsWith('repro-return-')) {");end=s.index('        caseRow.after=',start)
s=s[:start]+r'''
        const vertical=fixture==='repro-edges-prep';
        let origin;
        if(vertical){await page.locator('[data-j="collection"]').click();await page.locator('[data-action="tab"][data-id="passive"]').click();await page.locator('[data-action="stage"][data-id="basic:PS01"]').click();await page.waitForTimeout(250);origin=page.locator('[data-zone-item="reserve"][data-unit="pending:basic:PS01"]');}
        else{origin=page.locator('[data-x-card]').first();await origin.click();await closeAll();origin=page.locator('[data-x-card]').first();}
        const b=await origin.boundingBox();await page.mouse.move(b.x+100,b.y+40);await page.mouse.down();await page.waitForTimeout(260);
        const selector=vertical?'.cp-lane-grid[data-scroll-zone="offer"][data-kind="passive"]':fixture==='repro-edges-hand'?'#cw-hand':'#cw-field';
        const list=page.locator(selector);await list.evaluate((n,v)=>{n.style[v?'height':'width']=v?'220px':'400px';n.style[v?'alignSelf':'justifySelf']='start';if(v)n.scrollTop=0;else n.scrollLeft=0;},vertical);await page.waitForTimeout(40);
        const r=await list.boundingBox();const threshold=vertical?22:64;
        const inside=vertical?{x:r.x+150,y:r.y+r.height-threshold-1}:{x:r.x+r.width-threshold-1,y:r.y+80};
        await page.mouse.move(inside.x,inside.y);await page.waitForTimeout(160);await shot('threshold-before');
        caseRow.threshold_before=await list.evaluate(n=>[n.scrollLeft,n.scrollTop]);
        const active=vertical?{x:inside.x,y:inside.y+2}:{x:inside.x+2,y:inside.y};
        await page.evaluate(selector=>{window.edgeTrace=[];window.edgeTraceActive=true;let last=performance.now();function frame(at){if(!window.edgeTraceActive)return;const n=document.querySelector(selector);window.edgeTrace.push({at_ms:at,delta_ms:at-last,scroll:[n.scrollLeft,n.scrollTop],client:[n.clientWidth,n.clientHeight],content:[n.scrollWidth,n.scrollHeight]});last=at;requestAnimationFrame(frame);}requestAnimationFrame(frame);},selector);
        const began=await page.evaluate(()=>performance.now());await page.mouse.move(active.x,active.y);await page.waitForTimeout(1000);const ended=await page.evaluate(()=>performance.now());await page.evaluate(()=>window.edgeTraceActive=false);await shot('edge-one-second');
        caseRow.edge={threshold,step_per_frame:vertical?7:16,logical_seconds:1,actual_elapsed_ms:ended-began,point:active,trace:await page.evaluate(()=>window.edgeTrace)};
        const at=await list.evaluate(n=>[n.scrollLeft,n.scrollTop]);await page.mouse.move(r.x+r.width+1,r.y+r.height+1);await page.waitForTimeout(160);await shot('outside-stops');caseRow.outside=await list.evaluate(n=>[n.scrollLeft,n.scrollTop]);caseRow.outside_unchanged=JSON.stringify(at)===JSON.stringify(caseRow.outside);
        await page.keyboard.press('Escape');await page.mouse.up();await shot('canceled');
        if(vertical)await page.locator('[data-action="discard"]').click();
        fs.writeFileSync(path.join(out,prefix+'-edge.json'),JSON.stringify(caseRow.edge,null,2));
''' +s[end:]
(p/'edge_reference.cjs').write_text(s,encoding='utf-8')
