// Fixed UI DOM/CSS + candidate bitmaps. No edits to the UI branch or game sources.
// UI_REPO must be a checkout of ac610be8e07ee026c8330b72ec7e9e8ee8780346.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../../');
const ui=process.env.UI_REPO;if(!ui)throw Error('UI_REPO required');
const source=p=>path.join(ui,p),read=p=>fs.readFileSync(source(p),'utf8');
const journey='docs/検証/UI/readability/co-u02/journey/';
const {buildStyle}=require(source(journey+'build.cjs'));
const {createCheckpoint}=await import(pathToFileURL(source('docs/検証/UI/readability/co-u02/review/checkpoints.mjs')));
const {loadDocument}=await import(pathToFileURL(source('docs/検証/UI/readability/co-u02/review/source.mjs')));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fetchFile=async url=>new Response(fs.readFileSync(url));
const pause=()=>new Promise(r=>setTimeout(r,5));
async function until(f){for(let i=0;i<500;i++){if(f())return;await pause();}throw Error('snapshot timeout');}
const frames=[],sourceRecords=[],errors=[];
const scenarios=[['hub','shop','先代の古道具屋／拠点'],['deck','shop','先代の古道具屋／準備と詳細窓'],['entry','water','夜潮の排水路／本文'],['explore','water','夜潮の排水路／探索']];
for(const width of [1024,736,600,320])for(const [caseId,asset,label]of scenarios){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM('<div id="crossweave-journey" lang="ja"></div>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://snapshot.invalid/',virtualConsole:vc});
 const w=dom.window;w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
 w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};w.matchMedia=()=>({matches:false});
 w.eval(read('docs/検証/UI/readability/co-u02/dist/crossweave-ui.js'));
 const root=w.document.getElementById('crossweave-journey');
 root.getBoundingClientRect=()=>({left:0,top:0,width,height:width*9/16,right:width,bottom:width*9/16});
 const ctx=await createCheckpoint(caseId,name=>loadDocument(name,fetchFile));
 const app=w.CrossweaveUI.mountJourney(root,{controller:ctx.controller,Campaign:ctx.Campaign,slot_id:ctx.slot_id,title:'夜潮の排水路'});
 await app.ready;
 const idle=async()=>{await until(()=>app.session.state().view&&!app.session.state().pending);await pause();};await idle();
 if(caseId==='deck'){
  root.querySelector('[data-j="deck"]').click();await idle();
  root.querySelector('[data-catalogue] [data-j="detail"]').click();await idle();
 }
 // Only artwork attachment. Geometry, text, number values, and window markup stay as rendered by the fixed UI.
 root.dataset.vdAsset=asset;
 if(caseId==='deck'){
  const bg=w.document.createElement('div');bg.className='vd-prep-backdrop';bg.setAttribute('aria-hidden','true');root.querySelector('.cj-layout').prepend(bg);
 }
 if(caseId==='explore')root.querySelector('#cw-scene-base')?.setAttribute('data-illustrated','true');
 // Freeze this illustration check; no runtime/session/commands are shipped in the HTML.
 const html=root.outerHTML;const display=app.session.state().view.display_data;
 frames.push({id:caseId,width,asset,label,html,phase:display.phase,screen:root.dataset.screen,publicTexts:[...root.querySelectorAll('[data-j-text]')].map(e=>({id:e.dataset.jText,text:e.textContent})),hasWindow:!!root.querySelector('[data-inspector]:not([hidden])'),numbersText:root.querySelector('[data-header]')?.textContent??'',sha256:sha(html)});
 app.dispose();dom.window.close();
}
if(errors.length)throw Error(errors.join('\n'));
const attach=`
#crossweave-journey{width:100%}
#crossweave-journey[data-vd-asset="shop"] .cj-backdrop,#crossweave-journey .vd-prep-backdrop{background-image:url("../../../../仕様案/ビジュアル・演出/素材/CO-V01/antique-shop-background.png");background-size:cover;background-position:50% 50%}
#crossweave-journey[data-vd-asset="water"] .cj-backdrop,#crossweave-journey[data-vd-asset="water"] #cw-scene-base{background-image:url("../../../../仕様案/ビジュアル・演出/素材/CO-V01/night-tide-background.png");background-size:cover;background-position:50% 40%}
#crossweave-journey .cj-backdrop>div{display:none}
#crossweave-journey .vd-prep-backdrop{position:absolute;inset:44px 0;z-index:-1;pointer-events:none}
`;
const css=buildStyle()+'\n'+attach;
const out=path.join(here,'確認用');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'frames.json'),JSON.stringify(frames,null,2)+'\n');
fs.writeFileSync(path.join(out,'ui-style.css'),css);
for(const p of [journey+'build.cjs',journey+'view.js',journey+'panels.js',journey+'layout.js',journey+'fixed-screen.css',journey+'backdrop.css',journey+'actor-review.css',journey+'fit-review.css','docs/検証/UI/readability/co-u02/dist/crossweave-ui.js','docs/検証/UI/readability/co-u02/review/checkpoints.mjs','docs/検証/UI/readability/co-u02/review/source.mjs','docs/検証/接続条件/co-d02/saves/manifest.json'])sourceRecords.push({path:p,sha256:sha(fs.readFileSync(source(p)))});
fs.writeFileSync(path.join(here,'ui-source.json'),JSON.stringify({ui_commit:'ac610be8e07ee026c8330b72ec7e9e8ee8780346',version:'journey0.11.1',sourceRecords,frameCount:frames.length,kind:'static DOM snapshots; no game operation or persistent storage in delivered preview',style_sha256:sha(css)},null,2)+'\n');
const data=JSON.stringify(frames).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><title>CO-V01 背景と現行UIの確認用合成</title><style>body{margin:24px;background:#e8e7df;color:#27392f;font:15px/1.6 system-ui,sans-serif}h1{font-size:22px}label{display:inline-block;margin:0 20px 12px 0}select{font:inherit}iframe{display:block;border:0;background:white;max-width:none}main{overflow:auto}p{max-width:850px}small{display:block}</style><h1>CO-V01 背景と現行UIの確認用合成</h1><p>実装候補。UI0.11.1の表示コードから作った静止状態に画像を接続しています。画面内のボタンは操作用ではありません。ゲーム本体への導入・実操作・保存検証とは別です。</p><label>場面 <select id="scene"><option value="hub">先代の古道具屋／拠点</option><option value="deck">先代の古道具屋／準備と詳細窓</option><option value="entry">夜潮の排水路／本文</option><option value="explore">夜潮の排水路／探索</option></select></label><label>幅 <select id="width"><option>1024</option><option>736</option><option>600</option><option>320</option></select> CSS px</label><label>配色 <select id="theme"><option value="light">明</option><option value="dark">暗</option></select></label><small id="caption"></small><main><iframe id="frame" title="日本語名付き背景確認"></iframe></main><script>const frames=${data},css=${JSON.stringify(css).replace(/</g,'\\u003c')};function show(){const width=Number(document.getElementById('width').value),theme=document.getElementById('theme').value,f=frames.find(x=>x.id===document.getElementById('scene').value&&x.width===width),el=document.getElementById('frame');el.width=width;el.height=width*9/16;document.getElementById('caption').textContent=f.label+' — 実装候補／'+width+'×'+(width*9/16);el.srcdoc='<meta charset="utf-8"><style>html,body{margin:0;padding:0;color-scheme:'+theme+'}'+css+'</style>'+f.html;}document.querySelectorAll('select').forEach(x=>x.onchange=show);show();</script></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
console.log(JSON.stringify({frames:frames.length,output:out,sourceErrors:errors.length}));
