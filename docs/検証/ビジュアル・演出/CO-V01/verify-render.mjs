// Render only frozen DOM, with inline artwork. No URL navigation or game script.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CW_PLAYWRIGHT||'playwright');
const renderer=process.env.CW_CHROMIUM_MODULE?await import(process.env.CW_CHROMIUM_MODULE):null;
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../../..');
const dir=path.join(here,'確認用'),frames=JSON.parse(fs.readFileSync(path.join(dir,'frames.json')));
let css=fs.readFileSync(path.join(dir,'ui-style.css'),'utf8');
for(const name of ['antique-shop-background.png','night-tide-background.png']){
 const bytes=fs.readFileSync(path.join(repo,'docs/仕様案/ビジュアル・演出/素材/CO-V01',name));
 css=css.replaceAll('../../../../仕様案/ビジュアル・演出/素材/CO-V01/'+name,'data:image/png;base64,'+bytes.toString('base64'));
}
const browser=await chromium.launch({executablePath:process.env.CW_CHROMIUM,args:renderer?.default.args||[],headless:true,env:{...process.env,FONTCONFIG_FILE:'/etc/fonts/fonts.conf',FONTCONFIG_PATH:'/etc/fonts'}});
const results=[],screenshots=[];
const captures=new Set(['hub-1024-light','deck-1024-light','entry-1024-dark','explore-1024-dark','hub-320-light','entry-320-dark','hub-1024-dark','entry-1024-light']);
const page=await browser.newPage({deviceScaleFactor:1});
const network=[];await page.route('**/*',route=>{network.push(route.request().url());return route.abort();});
for(const theme of ['light','dark'])for(const f of frames){
 await page.setViewportSize({width:f.width+32,height:Math.ceil(f.width*9/16)+90});await page.emulateMedia({colorScheme:theme});network.length=0;
 await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><style>html,body{margin:0;padding:0;color-scheme:'+theme+'}body{padding:16px;background:'+(theme==='dark'?'#151e1b':'#ecebe4')+';color:'+(theme==='dark'?'#eef0e8':'#25382e')+';font:13px/1.5 system-ui,sans-serif}.qa-caption{height:54px;box-sizing:border-box}.qa-caption strong{display:block;font-size:15px}'+css+'</style><div class="qa-caption"><strong>'+f.label+' — 実装候補</strong><span>UI0.11.1 静止DOMの合成／'+f.width+' CSS px／'+(theme==='dark'?'暗配色':'明配色')+'</span></div>'+f.html+'</html>',{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 const metrics=await page.evaluate(()=>{
  const root=document.querySelector('#crossweave-journey'),shell=root.querySelector('.cj-shell');
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const bg=root.querySelector('.cj-backdrop,.vd-prep-backdrop,#cw-scene-base');
  const reading=root.querySelector('.cj-reading-scroll');
  return {frame:rect(shell),background:rect(bg),main:rect(root.querySelector('[data-main]')),reading:rect(reading),readingScrollHeight:reading?.scrollHeight??null,window:rect(root.querySelector('[data-inspector]:not([hidden])')),backgroundPosition:bg?getComputedStyle(bg).backgroundPosition:null,backgroundHasImage:bg?getComputedStyle(bg).backgroundImage.startsWith('url("data:image/png;base64,'):false,rootOverflow:root.scrollWidth>root.clientWidth+1,font:reading?getComputedStyle(reading).fontFamily:getComputedStyle(root).fontFamily};
 });
 const id=f.id+'-'+f.width+'-'+theme;
 results.push({id,source_snapshot_sha256:f.sha256,metrics,no_network_requests:network.length===0,frame_matches:Math.abs(metrics.frame.width-f.width)<1&&Math.abs(metrics.frame.height-f.width*9/16)<1});
 if(captures.has(id)){const name=id+'.png';await page.screenshot({path:path.join(dir,name)});screenshots.push(name);}
}
const report={renderer:'Chromium '+await browser.version(),kind:'in-memory static DOM rendering, not a live game/browser functional or persistence test',ui_commit:'ac610be8e07ee026c8330b72ec7e9e8ee8780346',font_environment:'Noto Sans JP installed as system Japanese fallback',viewports:[1024,736,600,320],themes:['light','dark'],source_frames:frames.length,rendered_cases:results.length,screenshots,results};
fs.writeFileSync(path.join(here,'render-checks.json'),JSON.stringify(report,null,2)+'\n');
await browser.close();
console.log(JSON.stringify({renderer:report.renderer,cases:results.length,framesMatch:results.filter(x=>x.frame_matches).length,backgroundImages:results.filter(x=>x.metrics.backgroundHasImage).length,noNetwork:results.every(x=>x.no_network_requests),screenshots:screenshots.length}));
