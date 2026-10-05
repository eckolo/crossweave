// 固定原本72d0eb58の公開APIと実UI bundleによる残りの使用先。
// 保存の値を作り替えない。source UIの自動読了が起きた場合もその差を隠さない。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/eckol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const repo = path.resolve(__dirname, '../../..');
const original = path.join(__dirname, 'ui-original');
const ui = path.join(original, 'docs/検証/UI/readability/co-u02');
const edition = path.join(repo, 'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out = path.join(edition, 'source-boundary-states-final');
fs.mkdirSync(out, {recursive:true});
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  const {createCampaign} = await import(pathToFileURL(path.join(original, 'src/runtime/campaign.mjs')));
  const {MemoryStore} = await import(pathToFileURL(path.join(original, 'test/runtime/support.mjs')));
  const storage = new MemoryStore(), Campaign = createCampaign({storage});
  let controller, prefix, caseRow;
  const browser = await chromium.launch({channel:'msedge', headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
  const page = await browser.newPage({viewport:{width:1920,height:1080}, deviceScaleFactor:1});
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  page.setDefaultTimeout(5000);
  const manifest = {source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2', viewport:[1920,1080],
    dpr:1,zoom:1,browser:await browser.version(),platform:process.platform,physical_input:false,
    method:'同じ固定原本のCampaign・UI。合法保存／隔離MemoryStore／公開APIのみ。localhost無し。',
    cases:[],errors:[],sources:{},font_samples:{},sequences:[]};
  const css = fs.readFileSync(path.join(ui,'dist/crossweave-ui.css'),'utf8');
  const js = fs.readFileSync(path.join(ui,'dist/crossweave-ui.js'),'utf8');
  for(const f of ['dist/crossweave-ui.css','dist/crossweave-ui.js'])manifest.sources[f] = hash(fs.readFileSync(path.join(ui,f)));
  page.on('pageerror', e => manifest.errors.push({case:prefix,error:e.message}));
  await page.exposeFunction('__referenceCommand', async (method,args) => {
    if(method==='reopen') {controller=await Campaign.open({slot_id:'ui-same-state'});return true;}
    if(!['inspect','previewPreparation','previewAction','quoteConversion','execute','exportSave'].includes(method))throw Error('Unexpected API');
    return await controller[method](...args);
  });
  await page.exposeFunction('__referenceCampaign', async (method,args) => {
    if(!['create','open','importSave'].includes(method))throw Error('Unexpected Campaign API');
    return await Campaign[method](...args);
  });
  async function shot(name,settle=true) {
    if(settle)await page.waitForTimeout(300);
    const capturedAt=await page.evaluate(()=>performance.now());
    const filename=prefix+'-'+name+'.png';
    await page.locator('#crossweave-journey').screenshot({path:path.join(out,filename)});
    const nodes=await page.evaluate(()=>[...document.querySelectorAll('#crossweave-journey *')]
      .filter(n=>n.getBoundingClientRect().width>0).map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {
        tag:n.tagName,classes:n.className?.baseVal??n.className,text:n.children.length?null:n.textContent,
        attributes:[...n.attributes].filter(a=>a.name.startsWith('data-')||a.name.startsWith('aria-')).map(a=>[a.name,a.value]),
        rect:[r.x,r.y,r.width,r.height],font:s.font,fontFamily:s.fontFamily,fontWeight:s.fontWeight,fontSize:s.fontSize,
        color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,border:s.border,
        borderRadius:s.borderRadius,lineHeight:s.lineHeight,opacity:s.opacity,boxShadow:s.boxShadow,
        scroll:[n.scrollLeft,n.scrollTop,n.scrollWidth,n.scrollHeight,n.clientWidth,n.clientHeight]};}));
    fs.writeFileSync(path.join(out,prefix+'-'+name+'.nodes.json'),JSON.stringify({at_ms:capturedAt,nodes},null,2));
    caseRow.captures.push(filename);
    if(name==='entry'||name==='prediction'||name==='settings'||name==='card') {
      const {root}=await cdp.send('DOM.getDocument'); const fonts=[];
      for(const selector of ['#crossweave-journey h2','#crossweave-journey strong','#crossweave-journey dt',
        '#crossweave-journey dd','#crossweave-journey button','#crossweave-journey .cj-setting',
        '#crossweave-journey .cw-face-caption>strong']) {
        const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
        if(nodeId)fonts.push({selector,...await cdp.send('CSS.getPlatformFontsForNode',{nodeId})});
      }
      manifest.font_samples[prefix+'-'+name]=fonts;
    }
    return capturedAt;
  }
  async function closeAll() {
    for(let n=0;n<5;n++) {
      const close=page.locator('button[data-x="close"]:visible,button[data-j="close"]:visible');
      if(!await close.count())break;
      await close.last().click();await page.waitForTimeout(30);
    }
  }
  async function openCommon(action,name) {
    await closeAll();await page.locator('button[data-j="menu"]:visible').first().click();
    const button=page.locator('[data-j="'+action+'"]');
    if(!await button.count())throw Error('Missing original common input: '+action);
    await button.first().click();await shot(name);
  }
  try {
    for(const theme of ['light','dark'])for(const fixture of ['repro-bars-prep','repro-bars-hand','repro-bars-field','repro-motion-home','repro-motion-explore']) {
      prefix=theme+'-'+fixture;
      caseRow={fixture,theme,captures:[],limitations:[]};manifest.cases.push(caseRow);
      try {
        const fp=path.join(edition,'fixtures',fixture+'.json');
        const rec=fp?JSON.parse(fs.readFileSync(fp)):null;
        if(rec) {
          const document=structuredClone(rec.original_document??rec.dto.State);
          if(!rec.original_document){document.schema='CW-M1-save-2';document.engine_version='CW-M1-engine-0.7';
            caseRow.adapter='既存oracleの通常command保存。接続schema/engine_versionの2tagのみ原本へ戻す。値・規則・乱数は変更しない。';}
          caseRow.fixture_sha256=hash(fs.readFileSync(fp));caseRow.before=hash(JSON.stringify(document));
          storage.records.set('ui-same-state',document);controller=await Campaign.open({slot_id:'ui-same-state'});
          if(hash(JSON.stringify(controller.exportSave()))!==caseRow.before)throw Error('Original changed document on open');
        }
        await page.emulateMedia({colorScheme:theme});
        await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>body{margin:0}'+css+'</style></head><body><div id="crossweave-journey"></div></body></html>');
        await page.addScriptTag({content:js});
        if(fixture==='startup') {
          await page.evaluate(()=>{const Campaign={};for(const m of ['create','open','importSave'])Campaign[m]=(...args)=>window.__referenceCampaign(m,args);
            window.application=CrossweaveUI.mountJourneyApplication(document.querySelector('#crossweave-journey'),{Campaign,config:{slot_id:'unused-startup'},title:'夜潮の排水路',storageMode:'persistent'});});
          await shot('entry');continue;
        }
        await page.evaluate(async()=>{
          const controller={};for(const m of ['inspect','previewPreparation','previewAction','quoteConversion','execute','exportSave'])controller[m]=(...args)=>window.__referenceCommand(m,args);
          const Campaign={open:async()=>{await window.__referenceCommand('reopen',[]);return controller;}};
          window.session=CrossweaveUI.makeSession(controller,{reopen:()=>Campaign.open(),idFactory:(()=>{let i=0;return()=>'same-state-ref-'+(++i)})()});
          await session.refresh({preserveLocal:false});window.application=CrossweaveUI.mountJourney(document.querySelector('#crossweave-journey'),
            {controller,Campaign,slot_id:'ui-same-state',title:'夜潮の排水路',session,storageMode:'persistent'});
          const ready=await application.ready;if(!ready.ok)throw Error('Not ready');
        });
        await shot('entry');

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
        caseRow.after=hash(JSON.stringify(controller.exportSave()));caseRow.state_unchanged=caseRow.before===caseRow.after;
        fs.writeFileSync(path.join(out,prefix+'-public.json'),JSON.stringify(controller.inspect(),null,2));
        fs.writeFileSync(path.join(out,prefix+'-document-after.json'),JSON.stringify(controller.exportSave(),null,2));
      } catch(e) {caseRow.limitations.push(String(e));console.log(prefix+': '+String(e).slice(0,200));}
    }
  } finally {
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));await page.close();await browser.close();
  }
  console.log(JSON.stringify({cases:manifest.cases.length,partial:manifest.cases.filter(c=>c.limitations.length).length,errors:manifest.errors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
