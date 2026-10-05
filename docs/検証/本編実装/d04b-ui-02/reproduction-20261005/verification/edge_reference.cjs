// 固定原本72d0eb58の公開APIと実UI bundleによる残りの使用先。
// 保存の値を作り替えない。source UIの自動読了が起きた場合もその差を隠さない。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/eckol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const repo = path.resolve(__dirname, '../../..');
const original = path.join(__dirname, 'ui-original');
const ui = path.join(original, 'docs/検証/UI/readability/co-u02');
const edition = path.join(repo, 'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out = path.join(edition, 'source-edge-states');
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
    for(const theme of ['light','dark'])for(const fixture of ['repro-edges-prep','repro-edges-hand','repro-edges-field']) {
      prefix=theme+'-'+fixture;
      caseRow={fixture,theme,captures:[],limitations:[]};manifest.cases.push(caseRow);
      try {
        const fp=path.join(edition,'fixtures',fixture+'.json');
        const rec=fp?JSON.parse(fs.readFileSync(fp)):null;
        if(rec) {
          const document=structuredClone(rec.original_document);
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
