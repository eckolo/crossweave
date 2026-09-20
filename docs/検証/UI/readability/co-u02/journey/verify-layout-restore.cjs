'use strict';
// Regression scope: exploration depth order, bounded card geometry, and retained actions.
// JSDOM cannot paint: supplied rectangles and CSS declarations are not rendered bounds.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],sizes=[],visibility=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const pause=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('timeout');await pause();}}
(async()=>{
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(build({testing:true,fixture:'entry'}).html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-check.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];sizes.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.matchMedia=()=>({matches:false});
 }});
 const root=dom.window.document.getElementById('crossweave-journey');await until(()=>root.__test);
 const {app,controller}=root.__test,session=app.session,d=()=>session.state().view.display_data;
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await pause();await until(()=>!session.state().pending);await pause();};
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const click=async s=>{const b=typeof s==='string'?el(s):s;assert(!b.disabled,'disabled '+s);b.click();await idle();};
 const rect=(w,h)=>({x:0,y:0,left:0,top:0,width:w,height:h,right:w,bottom:h});let width=1024;
 root.getBoundingClientRect=()=>rect(width,width*9/16);
 async function resize(w){width=w;el('.cj-shell').getBoundingClientRect=()=>rect(w,w*9/16);const game=el('.cw-explore');game.getBoundingClientRect=()=>rect(w-2,w*9/16-2);for(const o of sizes)for(const t of o.targets)if(t===root||t===game)o.fn([{target:t,contentRect:t.getBoundingClientRect()}]);await idle();}
 await idle();check('the entry fixture opens an unadvanced real scene',d().phase==='exploring'&&d().scene.paused&&app.state().seen.length===0);
 for(let i=0;i<5&&d().scene?.paused;i++){
  for(const o of visibility){const entries=o.targets.filter(t=>root.contains(t)&&t.dataset.jText).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(entries.length)o.fn(entries);}await idle();await click('[data-j="continue"]');
 }
 check('only the visible-scene continuation opens the live exploration',!!root.querySelector('.cw-explore')&&d().exploration.legal_actions.length>0);
 // Parse the reference geometry and new override alone. The full sheet contains
 // @container, which this JSDOM version cannot parse. This is a CSS contract check.
 const style=dom.window.document.createElement('style');style.textContent=fs.readFileSync(path.join(__dirname,'../../interaction/table.css'),'utf8').replaceAll('#cw-playtable','#crossweave-journey .cw-explore')+'\n'+fs.readFileSync(path.join(__dirname,'../exploration-layout.css'),'utf8').replaceAll('.cw-explore','#crossweave-journey .cw-explore');root.append(style);
 const css=s=>dom.window.getComputedStyle(typeof s==='string'?el(s):s);
 const legal=()=>d().exploration.legal_actions.map(a=>a.choice??a),attack=legal().find(q=>q.target!==null);assert(attack,'entry needs a legal target action');
 await click('[data-x-card="'+attack.card_id+'"]');await click('[data-x-actor="'+attack.target+'"]');
 const expected=(await controller.previewAction({view_token:session.state().view.meta.view_token,choice:attack})).display_data.action_preview;
 await until(()=>root.querySelector('[data-x-actor="'+attack.target+'"] .cw-delta'));
 await click('[data-x="preview"]');if(el('[data-x="pin"]').getAttribute('aria-pressed')!=='true')await click('[data-x="pin"]');
 const draft=JSON.stringify(session.state().draft),selection=attack.card_id,target=attack.target;
 for(const w of [1024,736,600,320]){
  await resize(w);const game=el('.cw-explore');
  check('depth order remains subjects / field / hand / footer at '+w,css(game).gridTemplateColumns==='minmax(0,1fr)'&&['.cw-world','.cw-board','.cw-hand-region','.cw-bottom'].every((s,i)=>css(s).gridArea.replaceAll(' ','')===`${i+1}/1`));
  check('resize preserves selection, target, pinned forecast and draft at '+w,el('[data-x-card="'+selection+'"]').getAttribute('aria-pressed')==='true'&&el('[data-x-actor="'+target+'"]').getAttribute('aria-pressed')==='true'&&el('[data-x="pin"]').getAttribute('aria-pressed')==='true'&&el('#cw-drawer').dataset.window==='preview'&&JSON.stringify(session.state().draft)===draft&&el('.cj-shell').style.height===w*9/16+'px');
  check('actor current values and pre-reset forecast remain exposed at '+w,el('[data-x-actor="'+target+'"] [data-stat="posture"] b').textContent===String(d().exploration.actors[target].posture_remaining)&&el('[data-x-actor="'+target+'"] [data-stat="posture"] .cw-delta').dataset.delta===String(-expected.hit_gain)&&el('[data-x-actor="'+target+'"] .cw-actor-stats').children.length===4&&!el('#cw-use').disabled);
  if(w===736)check('ordinary inline width keeps the normal layout and registered card widths',game.dataset.compact==='false'&&css('#cw-hand>.cw-hand-card').flexBasis==='184px'&&css('#cw-field>.cw-slot').flexBasis==='172px');
  const cap=css('#cw-hand>.cw-hand-card').height;
  check('hand and field have bounded heights at '+w,w===320?cap==='44px'&&css('#cw-field>.cw-slot').height==='44px':cap===`min(100%,${w===600?92:132}px)`&&css('#cw-field>.cw-slot').height==='min(100%,92px)');
 }
 const minimums={normal:113+90+140+44+8+12+2,compact:71+66+66+44+8+9+2,dense:46+44+44+44};
 check('track minima fit their entry heights without growing the outer frame',minimums.normal<=410&&minimums.compact<=280&&minimums.dense<=320*9/16-2);
 check('dense captions fit without suppressing current-value rows',3*14+2*2===46&&3*14+2===44&&css('.cw-actor .cw-face-caption').minHeight==='0'&&css('.cw-board').borderTopWidth==='0px');
 await click('[data-x="preview"]');check('a second forecast press closes the same window',el('#cw-drawer').hidden&&el('[data-x="preview"]').getAttribute('aria-expanded')==='false');
 const place=legal().find(q=>q.target===null&&!d().exploration.field[d().exploration.hand.find(c=>c.id===q.card_id).attr]);
 if(!place)throw Error('entry needs a legal placement');
 await click('[data-x-card="'+place.card_id+'"]');await until(()=>root.querySelector('[data-forecast="place"]'));
 check('placement preview remains in the field strip',el('#cw-field [data-forecast="place"]').textContent.includes('予測')&&el('#cw-use').textContent==='場に置く'&&!el('#cw-use').disabled);
 const beforeActions=d().exploration.self.actions,beforeToken=session.state().view.meta.view_token;
 await click('[data-x="use"]');check('placement still executes through the real Campaign',!session.state().error&&d().exploration.self.actions===beforeActions+1&&session.state().view.meta.view_token!==beforeToken);
 await click('[data-x="more"]');await click('#cw-drawer [data-x="order"]');
 check('nested windows retain their parent and common pin control',!el('#cw-parent-drawer').hidden&&!el('[data-x="window-back"]').hidden&&!!el('[data-x="pin"] [data-lucide="pin"]'));
 await click('[data-x="window-back"]');await click('[data-x="close"]');await click('[data-x="withdraw"]');
 check('return resets exploration windows through a real phase transition',d().phase==='return'&&!root.querySelector('#cw-drawer')&&app.state().panel===null);
 check('no script errors',errors.length===0);app.dispose();dom.window.close();
 const report={id:'CW-M1-UI-001',group:'layout-restore-v0.9',result:'pass',count:checks.length,checks,errors,node:process.version,conditions:['Real Campaign + original MemoryStore, natural entry save; actual previewAction/play/withdraw.','Only mounted scene paragraphs receive controlled visibility before continue.','1024/736/600/320px outer rectangles with 2px shell border deducted; selection, target, pinned forecast and draft retention.','Reference CSS and new geometry override parsed in JSDOM; grid order and card caps, not painted dimensions.'],limits:['Browser rejected the canonical local entry with ERR_BLOCKED_BY_CLIENT. Physical overflow, font metrics, touch and conversation-host rendering remain unverified.','Full CSS container/media-query rendering, IndexedDB, complete formal v0.15 migration and user acceptance remain unverified.','Historical test groups were not rerun or recounted.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
