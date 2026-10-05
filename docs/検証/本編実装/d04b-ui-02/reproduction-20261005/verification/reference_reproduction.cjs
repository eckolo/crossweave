// 固定原本のUI bundleとCampaignの公開APIを接続する。localhostも代用画面も作らない。
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/eckol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const repo=path.resolve(__dirname,'../../..'),original=path.join(__dirname,'ui-original'),ui=path.join(original,'docs/検証/UI/readability/co-u02');
const edition=path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'),out=path.join(edition,'same-state-reference-final');
fs.mkdirSync(out,{recursive:true});const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const {createCampaign}=await import(pathToFileURL(path.join(original,'src/runtime/campaign.mjs')));
 const {MemoryStore}=await import(pathToFileURL(path.join(original,'test/runtime/support.mjs')));
 const storage=new MemoryStore(),Campaign=createCampaign({storage});let controller;
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,colorScheme:'light'});
 const manifest={source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',browser:await browser.version(),platform:process.platform,dpr:1,zoom:1,viewport:[1920,1080],physical_input:false,method:'原本Campaign・原本UI bundle。隔離MemoryStoreの公開API代理。localhost無し。',cases:[],errors:[],sources:{}};
 const css=fs.readFileSync(path.join(ui,'dist/crossweave-ui.css'),'utf8'),js=fs.readFileSync(path.join(ui,'dist/crossweave-ui.js'),'utf8');
 for(const f of ['dist/crossweave-ui.css','dist/crossweave-ui.js'])manifest.sources[f]=hash(fs.readFileSync(path.join(ui,f)));
 page.on('pageerror',e=>manifest.errors.push(e.message));page.setDefaultTimeout(4500);
 await page.exposeFunction('__referenceCommand',async(method,args)=>{
  if(method==='reopen'){controller=await Campaign.open({slot_id:'ui-same-state'});return true;}
  if(!['inspect','previewPreparation','previewAction','quoteConversion','execute','exportSave'].includes(method))throw Error('Unexpected API');return await controller[method](...args);
 });
 let prefix='';
 async function shot(name){await page.waitForTimeout(350);await page.locator('#crossweave-journey').screenshot({path:path.join(out,prefix+'-'+name+'.png')});
  const nodes=await page.evaluate(()=>[...document.querySelectorAll('#crossweave-journey *')].filter(n=>n.getBoundingClientRect().width>0).map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {tag:n.tagName,classes:n.className?.baseVal??n.className,text:n.children.length?null:n.textContent,attributes:[...n.attributes].filter(a=>a.name.startsWith('data-')||a.name.startsWith('aria-')).map(a=>[a.name,a.value]),rect:[r.x,r.y,r.width,r.height],font:s.font,color:s.color,background:s.backgroundColor,border:s.border,borderRadius:s.borderRadius,lineHeight:s.lineHeight,opacity:s.opacity,scroll:[n.scrollLeft,n.scrollTop,n.scrollWidth,n.scrollHeight,n.clientWidth,n.clientHeight]};}));fs.writeFileSync(path.join(out,prefix+'-'+name+'.nodes.json'),JSON.stringify(nodes,null,2));}
 async function closeX(){const b=page.locator('[data-x="close"]').first();if(await b.count())await b.click();}
 try{
 for(const theme of ['light','dark'])for(const fixture of ['repro-home','repro-story','repro-explore','repro-prediction','review-preparation']){
  prefix=theme+'-'+fixture;const fp=fixture.startsWith('repro')?path.join(edition,'legal-common',fixture+'.json'):path.join(repo,'docs/検証/本編実装/d04b-ui-02/review-20261002/fixtures-fixed/fixtures',fixture+'.json');
  const rec=JSON.parse(fs.readFileSync(fp)),document=structuredClone(rec.original_document??rec.dto.State);document.schema='CW-M1-save-2';document.engine_version='CW-M1-engine-0.7';
  const row={fixture,theme,fixture_sha256:hash(fs.readFileSync(fp)),before:hash(JSON.stringify(document)),captures:[],limitations:[]};manifest.cases.push(row);
  try{
   storage.records.set('ui-same-state',document);controller=await Campaign.open({slot_id:'ui-same-state'});
   if(hash(JSON.stringify(controller.exportSave()))!==row.before)throw Error('Original changed document on open');
   await page.emulateMedia({colorScheme:theme});await page.setContent('<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui,sans-serif}'+css+'</style></head><body><div id="crossweave-journey"></div></body></html>');await page.addScriptTag({content:js});
   await page.evaluate(async()=>{const controller={};for(const method of ['inspect','previewPreparation','previewAction','quoteConversion','execute','exportSave'])controller[method]=(...args)=>window.__referenceCommand(method,args);const Campaign={open:async()=>{await window.__referenceCommand('reopen',[]);return controller;}};window.session=CrossweaveUI.makeSession(controller,{reopen:()=>Campaign.open(),idFactory:(()=>{let i=0;return()=>'same-state-ref-'+(++i)})()});await session.refresh({preserveLocal:false});window.application=CrossweaveUI.mountJourney(document.querySelector('#crossweave-journey'),{controller,Campaign,slot_id:'ui-same-state',title:'夜潮の排水路',session,storageMode:'ephemeral'});const ready=await application.ready;if(!ready.ok)throw Error('Not ready');});
   await shot('entry');
   if(fixture==='repro-home'||fixture==='review-preparation'){
    await page.locator('[data-j="collection"]').click();await shot('card');
    const owned=page.locator('[data-action="detail"][data-zone="build"]').first();if(await owned.count()){await owned.click();await shot('owned-detail');await page.locator('[data-action="close"]').click();}
    await page.locator('[data-action="tab"][data-id="passive"]').click();await shot('passive');
    const p=page.locator('[data-action="detail"][data-id="basic:PS01"]').first();if(await p.count()){await p.click();await shot('passive-detail');await page.locator('[data-action="close"]').click();}
    await page.locator('[data-action="stage"][data-id="basic:PS01"]').click();await shot('pending');
    const pending=page.locator('[data-action="detail"][data-uid="pending:basic:PS01"]').first();await pending.click();await shot('pending-detail');await page.locator('[data-action="close"]').click();
    await page.locator('[data-action="review"]').click();await shot('confirmation');
   }else if(fixture==='repro-story'){const d=page.locator('[data-j="detail"]');if(await d.count()){await d.click();await shot('optional-prose');}}
   else{
    const v=controller.inspect(),choice=rec.choice??v.display_data.exploration.legal_actions[0];
    await page.locator('[data-x-card="'+choice.card_id+'"]').click();await shot('hand-detail');await closeX();
    if(choice.target){await page.locator('[data-x-actor="'+choice.target+'"]').click();await shot('actor-detail');await closeX();}
    await shot('selected');await page.locator('[data-x="preview"]').click();await shot('prediction');
   }
   row.after=hash(JSON.stringify(controller.exportSave()));row.state_unchanged=row.before===row.after;fs.writeFileSync(path.join(out,prefix+'-public.json'),JSON.stringify(controller.inspect(),null,2));
  }catch(e){row.limitations.push(String(e));console.log(prefix+': '+String(e).slice(0,190));}
 }
 }finally{fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));await browser.close();}
 console.log(JSON.stringify({cases:manifest.cases.length,partial:manifest.cases.filter(c=>c.limitations.length).length,errors:manifest.errors}));
})().catch(e=>{console.error(e);process.exitCode=1});
