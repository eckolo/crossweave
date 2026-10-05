"""固定原本の実一覧・実入力・描画フレームを採取。値や規則は追加しない。"""
from pathlib import Path
p=Path(__file__).parent
s=(p/'reference_remaining.cjs').read_text(encoding='utf-8-sig')
s=s.replace('same-state-reference-remaining-fourth','source-boundary-states-final')
s=s.replace("headless:true", "headless:true,ignoreDefaultArgs:['--hide-scrollbars']")
s=s.replace("['repro-home','repro-explore',\n      'repro-return-clear','repro-return-withdrawal','repro-return-defeat','startup']", "['repro-bars-prep','repro-bars-hand','repro-bars-field','repro-motion-home','repro-motion-explore']")
s=s.replace("const fp=fixture==='startup'?null:path.join(edition,fixture.startsWith('repro-return-')?'legal-return':'legal-common',fixture+'.json');", "const fp=path.join(edition,'fixtures',fixture+'.json');")
s=s.replace('const document=structuredClone(rec.original_document);', '''const document=structuredClone(rec.original_document??rec.dto.State);
          if(!rec.original_document){document.schema='CW-M1-save-2';document.engine_version='CW-M1-engine-0.7';
            caseRow.adapter='既存oracleの通常command保存。接続schema/engine_versionの2tagのみ原本へ戻す。値・規則・乱数は変更しない。';}''')
start=s.index("        if(fixture.startsWith('repro-return-')) {")
end=s.index('        caseRow.after=',start)
s=s[:start]+r'''
        if(fixture.startsWith('repro-bars-')){
          const vertical=fixture==='repro-bars-prep';
          if(vertical){await page.locator('[data-j="collection"]').click();await page.locator('[data-action="tab"][data-id="passive"]').click();}
          const selector=vertical?'.cp-lane-grid[data-scroll-zone="offer"][data-kind="passive"]':fixture==='repro-bars-hand'?'#cw-hand':'#cw-field';
          const list=page.locator(selector);await shot('natural');
          async function metrics(){return list.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {rect:[r.x,r.y,r.width,r.height],client:[n.clientWidth,n.clientHeight],content:[n.scrollWidth,n.scrollHeight],scroll:[n.scrollLeft,n.scrollTop],gutter:[n.offsetWidth-n.clientWidth,n.offsetHeight-n.clientHeight],scrollbarWidth:s.scrollbarWidth,scrollbarColor:s.scrollbarColor,border:s.border,padding:s.padding};});}
          caseRow.natural=await metrics();
          // 元の実DOMの外寸だけを制限し、通常非overflowと限定overflowを別撮影する。
          await list.evaluate((n,args)=>{const [v,w]=args;n.style[v?'height':'width']=v?'220px':w+'px';n.style[v?'alignSelf':'justifySelf']='start';},[vertical,fixture==='repro-bars-field'?400:540]);
          await page.waitForTimeout(100);caseRow.probe=await metrics();await shot('bar-start');
          const b=await list.boundingBox();const gx=caseRow.probe.gutter[0],gy=caseRow.probe.gutter[1];
          if(vertical&&gx<1||!vertical&&gy<1)throw Error('No actual visible native scrollbar');
          const thumbLength=(vertical?b.height:b.width)*(vertical?caseRow.probe.client[1]/caseRow.probe.content[1]:caseRow.probe.client[0]/caseRow.probe.content[0]);
          const point=vertical?{x:b.x+b.width-gx/2,y:b.y+thumbLength/2}:{x:b.x+thumbLength/2,y:b.y+b.height-gy/2};
          await page.mouse.move(point.x,point.y);await shot('bar-hover');await page.mouse.down();await shot('bar-pressed');
          await page.mouse.move(point.x+(vertical?0:90),point.y+(vertical?70:0),{steps:10});await shot('bar-drag');await page.mouse.up();await shot('bar-released');
          caseRow.drag=await metrics();
          await list.evaluate((n,v)=>{if(v)n.scrollTop=n.scrollHeight;else n.scrollLeft=n.scrollWidth;},vertical);await shot('bar-end');caseRow.end=await metrics();
          await list.evaluate((n,v)=>{if(v)n.scrollTop=0;else n.scrollLeft=0;},vertical);await shot('bar-restored');
          caseRow.actual_drag_moved=(vertical?caseRow.drag.scroll[1]:caseRow.drag.scroll[0])>0;
          if(!caseRow.actual_drag_moved)throw Error('Actual native thumb did not move');
        } else {
          // Page.screencastFrameはその時点の実描画。補間・複製・予定時刻への読み替えはしない。
          let active=null;let serial=0;const frames=[];let ackErrors=[];
          const onFrame=async e=>{
            try{
              if(active){const file=prefix+'-'+active+'-frame-'+String(++serial).padStart(4,'0')+'.png';
                fs.writeFileSync(path.join(out,file),Buffer.from(e.data,'base64'));
                frames.push({file,sequence:active,epoch_seconds:e.metadata.timestamp,received_epoch_ms:Date.now(),metadata:e.metadata});}
              await cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId});
            }catch(e){ackErrors.push(String(e));}
          };cdp.on('Page.screencastFrame',onFrame);
          await cdp.send('Page.startScreencast',{format:'png',maxWidth:1920,maxHeight:1080,everyNthFrame:1});
          async function begin(name){active=name;caseRow.events??=[];caseRow.events.push({name,epoch_ms:Date.now(),performance_ms:await page.evaluate(()=>performance.now())});}
          async function end(name){await page.waitForTimeout(80);active=null;caseRow.events.push({name:name+'-end',epoch_ms:Date.now(),performance_ms:await page.evaluate(()=>performance.now())});await shot(name+'-end');}
          async function reduced(on){await openCommon('settings','settings');await page.locator('input[data-motion]').setChecked(on);await closeAll();}
          if(fixture==='repro-motion-home'){
            await page.locator('[data-j="collection"]').click();await page.locator('[data-action="tab"][data-id="passive"]').click();
            for(const quiet of [false,true]){
              await reduced(quiet);await begin(quiet?'staging-reduced':'staging-default');
              await page.locator('[data-action="stage"][data-id="basic:PS01"]').click();await page.waitForTimeout(360);await end(quiet?'staging-reduced':'staging-default');
              await page.locator('[data-action="discard"]').click();await page.waitForTimeout(220);
            }
          }else{
            for(const quiet of [false,true]){
              await reduced(quiet);const choice=rec.choice??controller.inspect().display_data.exploration.legal_actions[0];
              const card=page.locator('[data-x-card="'+choice.card_id+'"]');const b=await card.boundingBox();const point={x:b.x+b.width/2,y:b.y+b.height/2};
              await page.mouse.move(point.x,point.y);await begin(quiet?'hold-reduced':'hold-default');await page.mouse.down();
              await page.waitForTimeout(260);await page.mouse.move(960,570,{steps:6});await page.waitForTimeout(100);await page.keyboard.press('Escape');await page.mouse.up();await end(quiet?'hold-reduced':'hold-default');await closeAll();
            }
            await reduced(false);await begin('short-hold-cancel');const b=await page.locator('[data-x-card]').first().boundingBox();await page.mouse.move(b.x+100,b.y+100);await page.mouse.down();await page.waitForTimeout(55);await page.mouse.up();await end('short-hold-cancel');await closeAll();
            // 一巡の公開行動を実ボタンから実行し、260/1300/2800msの予定と実フレームを比較する。
            const choice=rec.choice??controller.inspect().display_data.exploration.legal_actions[0];
            await page.locator('[data-x-card="'+choice.card_id+'"] [data-x="select"]').click().catch(async()=>await page.locator('[data-x-card="'+choice.card_id+'"]').click());await closeAll();
            if(choice.target){const target=page.locator('[data-x-actor="'+choice.target+'"]');if(await target.count())await target.first().click();await closeAll();}
            const play=page.locator('[data-x="use"]:visible');if(!await play.count())throw Error('Original action execution input missing');
            caseRow.action_before=hash(JSON.stringify(controller.exportSave()));await begin('action-events');await play.click();await page.waitForTimeout(3100);await end('action-events');caseRow.action_after=hash(JSON.stringify(controller.exportSave()));
          }
          await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',onFrame);
          caseRow.continuous_frames=frames.length;caseRow.frame_ack_errors=ackErrors;
          fs.writeFileSync(path.join(out,prefix+'-frames.json'),JSON.stringify({frames,events:caseRow.events,method:'CDP real screencast; no interpolation',physical_input:false},null,2));
        }
''' +s[end:]
(p/'boundary_reference.cjs').write_text(s,encoding='utf-8')
