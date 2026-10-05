// 固定原本72d0eb58の公開APIと実UI bundleによる残りの使用先。
// 保存の値を作り替えない。source UIの自動読了が起きた場合もその差を隠さない。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/eckol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const repo = path.resolve(__dirname, '../../..');
const original = path.join(__dirname, 'ui-original');
const ui = path.join(original, 'docs/検証/UI/readability/co-u02');
const edition = path.join(repo, 'docs/検証/本編実装/d04b-ui-02/reproduction-20261005');
const out = path.join(edition, 'source-component-states-submission');
fs.mkdirSync(out, {recursive:true});
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  const {createCampaign} = await import(pathToFileURL(path.join(original, 'src/runtime/campaign.mjs')));
  const {MemoryStore} = await import(pathToFileURL(path.join(original, 'test/runtime/support.mjs')));
  const storage = new MemoryStore(), Campaign = createCampaign({storage});
  let controller, prefix, caseRow;
  const browser = await chromium.launch({channel:'msedge', headless:true});
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
        borderRadius:s.borderRadius,lineHeight:s.lineHeight,opacity:s.opacity,boxShadow:s.boxShadow,outline:s.outline,outlineOffset:s.outlineOffset,focused:n===document.activeElement,focusVisible:n.matches(':focus-visible'),
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
    for(const theme of ['light','dark'])for(const fixture of ['repro-home','repro-explore']) {
      prefix=theme+'-'+fixture;
      caseRow={fixture,theme,captures:[],limitations:[]};manifest.cases.push(caseRow);
      try {
        const fp=fixture==='startup'?null:path.join(edition,fixture.startsWith('repro-return-')?'legal-return':'legal-common',fixture+'.json');
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
        async function states(selector,name) {
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
