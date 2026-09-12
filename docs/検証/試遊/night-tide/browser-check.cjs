'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright'),{build}=require('./build.cjs');
const executablePath=process.env.CW_BROWSER_PATH;
const fontPath=process.env.CW_QA_FONT;
const out={trial:'PT-NT-001',human_play:false,browser:'',cases:[],errors:[]};
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:light dark}body{margin:0;padding:16px}[hidden]{display:none!important}</style>'+build({testing:true})+'</html>';
fs.writeFileSync('qa.html',html);
(async()=>{
  const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});out.browser=browser.version();
  async function page(width=1024,touch=false,dark=false){
    const p=await browser.newPage({viewport:{width,height:850},hasTouch:touch,isMobile:touch,colorScheme:dark?'dark':'light'});
    p.on('pageerror',e=>out.errors.push(e.message));await p.goto('file://'+path.join(__dirname,'qa.html'));
    if(fontPath){await p.addStyleTag({content:`@font-face{font-family:NTQA;src:url('file://${fontPath}')}*{font-family:NTQA,system-ui!important}`});await p.evaluate(()=>document.fonts.ready);}
    return p;
  }
  let p=await page();await p.locator('#nt-depart').click();assert.equal(await p.evaluate(()=>window.__nt.session.data.pause),'entry');
  const frozen=await p.evaluate(()=>JSON.stringify(window.__nt.session.game.save()));await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>JSON.stringify(window.__nt.session.game.save())),frozen);
  await p.locator('#nt-continue').click();await p.locator('[data-card]').first().click();
  assert.equal(await p.locator('#cw-use').isEnabled(),true);await p.locator('#cw-use').click();
  assert.equal(await p.evaluate(()=>window.__nt.session.game.s.actors.P.actions),1);
  const save=await p.evaluate(()=>JSON.stringify(window.__nt.session.game.save()));await p.reload();assert.equal(await p.evaluate(()=>JSON.stringify(window.__nt.session.game.save())),save);
  let iterations=0,port=false,gate=false;
  while(await p.evaluate(()=>window.__nt.session.data.phase==='exploring')){
    assert(++iterations<170);
    const pause=await p.evaluate(()=>window.__nt.session.data.pause);
    if(pause){if(pause==='port')port=true;if(pause==='gate')gate=true;await p.locator('#nt-continue').click();continue;}
    const ch=await p.evaluate(()=>CWRequire('scenario.js').AH.choose(window.__nt.session.game,'progress_first'));
    // Dispatch ordinary keyboard-equivalent DOM clicks; keep each action on the UI path.
    await p.evaluate(ch=>{document.querySelector(`[data-card="${ch.card_id}"]`).click();if(ch.target)document.querySelector(`#cw-card-targets [data-target="${ch.target}"]`).click();document.getElementById('cw-use').click();},ch);
  }
  assert(port&&gate);assert.equal(await p.evaluate(()=>window.__nt.session.game.s.outcome),'clear');await p.locator('#nt-continue').click();assert(await p.locator('#cw-outcome').isVisible());assert.match(await p.locator('#cw-outcome').innerText(),/流入が止まった/);
  const exported=await p.evaluate(()=>window.__nt.snapshot());const state=JSON.stringify(exported.session.game);
  await p.evaluate(x=>{window.__nt.importRecord(x);window.__nt.renderApp();},exported);assert.equal(await p.evaluate(()=>JSON.stringify(window.__nt.snapshot().session.game)),state);
  out.cases.push('desktop real click, action, browser reload, full UI-route clear, return, exact exported-state import');await p.close();
  for(const [width,touch,dark]of [[1024,false,true],[390,true,false],[320,true,true]]){
    p=await page(width,touch,dark);await p.locator('#nt-depart').click();await p.locator('#nt-continue').click();
    const bounds=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(bounds.scroll<=bounds.width+1,'page horizontal overflow');
    const card=p.locator('[data-card]').first();if(touch)await card.tap();else await card.click();assert(await p.locator('#cw-use').isEnabled());
    const use=p.locator('#cw-use'),r=await use.boundingBox();assert(r&&r.x>=0&&r.x+r.width<=width,'use button clipped');
    await p.screenshot({path:`verification/ui-${width}-${dark?'dark':'light'}.png`,fullPage:true});
    if(touch)await use.tap();else await use.click();assert.equal(await p.evaluate(()=>window.__nt.session.game.s.actors.P.actions),1);
    await p.evaluate(()=>document.getElementById('cw-withdraw').click());assert.equal(await p.evaluate(()=>window.__nt.session.game.s.outcome),'withdrawal');
    out.cases.push(`${width}px ${touch?'touch':'mouse'} ${dark?'dark':'light'}: select, use, withdraw, fit, screenshot`);await p.close();
  }
  p=await page(390,true);await p.locator('summary').filter({hasText:'持ち込む札'}).click();await p.locator('[data-count="f"][data-delta="-1"]').click();assert(await p.locator('#nt-depart').isDisabled());await p.reload();assert(await p.locator('#nt-depart').isDisabled());await p.locator('summary').filter({hasText:'持ち込む札'}).click();await p.locator('[data-count="f"][data-delta="1"]').click();assert(await p.locator('#nt-depart').isEnabled());out.cases.push('incomplete deck draft survives reload and departure stays guarded');await p.close();
  await browser.close();assert.deepEqual(out.errors,[]);fs.writeFileSync('verification/browser.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
})().catch(e=>{console.error(e);process.exit(1)});
