const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build-inline.cjs');
const {html}=build({testing:true}),errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
for(const key of ['structuredClone','TextEncoder','TextDecoder','Blob','Response','DecompressionStream'])w[key]=globalThis[key];
Object.defineProperty(w,'crypto',{value:crypto.webcrypto});w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};w.matchMedia=()=>({matches:false});
const root=w.document.getElementById('crossweave-journey');root.getBoundingClientRect=()=>({width:1024,height:576,left:0,top:0,right:1024,bottom:576});
let apiCalls=0;w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{apiCalls++;throw Error('network forbidden');};w.indexedDB={open(){throw Error('persistent save forbidden');}};
const checks=[],check=(name,yes)=>{assert(yes,name);checks.push({name,pass:true});};
const pause=()=>new Promise(r=>setTimeout(r,5));async function until(fn){for(let i=0;i<600;i++){if(fn())return;await pause();}throw Error('timeout');}
(async()=>{let review;try{
 w.eval(w.document.querySelector('script').textContent);review=w.document.getElementById('cw-consistency-review').__test.review;
 check('配布用と同じ実runtimeの断片が起動する',await review.ready&&root.dataset.screen==='skills');
 const learningBefore=review.app.session.state().view.display_data.home.economy.learned.length;root.querySelector('[data-j="learn"]').click();await until(()=>!!review.app.session.state().comparison&&!review.app.session.state().pending);root.querySelector('[data-j="commit"]').click();await until(()=>review.app.session.state().view.display_data.home.economy.learned.length>learningBefore);await pause();
 check('断片内で覚えるだけを確定し、装備は1種のまま',review.app.session.state().view.display_data.home.equipment.entries.length===1);
 check('購入候補へ直接切り替えられる',await review.show('offers'));await pause();
 root.querySelector('[data-j="buy-preview"]').click();await pause();root.querySelector('[data-j="buy-confirm"]').click();await until(()=>review.app.session.state().view.display_data.home?.owned.length===1);await pause();
 check('断片内の主要操作が実purchaseで画面と所持を更新する',root.dataset.screen==='owned'&&review.app.session.state().view.display_data.home.owned.length===1);
 for(const id of ['carried','owned','converted','explore-d03']){check(id+'へ断片内の選択で移動する',await review.show(id));await until(()=>!review.app.session.state().pending);}
 const before=review.app.session.state().view.meta.revision;root.querySelector('[data-x-card]').click();await until(()=>!!review.app.session.state().actionPreview);root.querySelector('[data-x="use"]').click();await until(()=>review.app.session.state().view.meta.revision>before);
 check('断片内の探索で実際の一手を実行する',review.app.session.state().view.meta.revision>before);
 check('外部通信と実行時エラーなし',!apiCalls&&!errors.length);
 const production=fs.readFileSync('/workspace/crossweave-ui-consistency.html');
 const result={id:'CW-M1-UI-CONSISTENCY-INLINE-001',node:process.version,jsdom:require(process.env.CW_JSDOM_PATH+'/package.json').version,checks,passed:checks.length,production_sha256:crypto.createHash('sha256').update(production).digest('hex'),production_bytes:production.length,limitation:'JSDOM execution only; no real rendering, touch or IndexedDB'};
 fs.writeFileSync(path.join(__dirname,'../consistency/inline-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors}));
 }finally{review?.dispose();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
