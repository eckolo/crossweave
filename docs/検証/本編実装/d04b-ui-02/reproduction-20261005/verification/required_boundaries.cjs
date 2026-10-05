// 固定原本72d0eb58の公開APIと実UI bundleによる残りの使用先。
// 保存の値を作り替えない。source UIの自動読了が起きた場合もその差を隠さない。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/eckol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const repo = path.resolve(__dirname, '../../..');
const original = path.join(__dirname, 'ui-original');
const ui = path.join(original, 'docs/検証/UI/readability/co-u02');
const edition = path.join(repo, 'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out = path.join(edition, 'source-required-boundaries-complete');
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
    for(const theme of ['light','dark'])for(const fixture of ['repro-preparation-boundaries','repro-hover']) {
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
          await page.evaluate(()=>{window.__hoverRows=[];window.__hoverPhase='enter';window.__hoverStart=performance.now();window.__hoverRecording=true;function sample(){if(!window.__hoverRecording)return;window.__hoverRows.push({phase:window.__hoverPhase,at_ms:performance.now(),elapsed_ms:performance.now()-window.__hoverStart,detail_open:!!document.querySelector('[data-x="pin"]')?.getClientRects().length});requestAnimationFrame(sample);}requestAnimationFrame(sample);});
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
