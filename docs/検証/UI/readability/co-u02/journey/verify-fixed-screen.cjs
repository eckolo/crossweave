'use strict';
// Real Campaign transitions; explicit visibility/resize callbacks, no browser paint.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const pause=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('timeout');await pause();}}
(async()=>{
 const sizes=[],visibility=[],vc=new VirtualConsole();let width=1024;
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const fragment=build({testing:true}).html;
 const dom=new JSDOM(fragment,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-check.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];sizes.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.matchMedia=()=>({matches:true});
 }});
 const root=dom.window.document.getElementById('crossweave-journey');await until(()=>root.__test);
 const app=root.__test.app,session=app.session,d=()=>session.state().view.display_data;
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await pause();await until(()=>!session.state().pending);};
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const click=async s=>{const e=typeof s==='string'?el(s):s;assert(!e.disabled,'disabled '+s);e.click();await idle();};
 root.getBoundingClientRect=()=>({left:0,top:0,width,height:width*9/16,right:width,bottom:width*9/16});
 el('.cj-shell').getBoundingClientRect=root.getBoundingClientRect;
 async function resize(value){width=value;for(const o of sizes)for(const t of o.targets)if(t===root||t.matches('.cw-explore'))o.fn([{target:t,contentRect:{width,height:width*9/16}}]);await idle();}
 async function show(ids){for(const o of visibility){const entries=o.targets.filter(t=>ids.includes(t.dataset.jText)).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(entries.length)o.fn(entries);}await idle();}
 const footerHas=action=>!!root.querySelector('[data-bottom] [data-j="'+action+'"]');
 await idle();
 check('return summary and a separate text-only reading window replace the full result scroller',el('.cj-fixed-result')&&el('[data-reading]')&&!root.querySelector('[data-result-scroll]'));
 await click('[data-bottom] [data-j="hub"]');
 check('an unobserved main text cannot be silently marked or advanced',d().phase==='return'&&app.state().seen.length===0);
 await show(d().scene.text_ids);
 check('only observed main text IDs are recorded; closed optional detail stays unread',app.state().seen.length===d().scene.text_ids.length&&d().scene.optional_text_ids.every(id=>!app.state().seen.includes(id)));
 const optional=d().scene.optional_text_ids[0];await click('[data-j="optional"][data-id="'+optional+'"]');
 check('opening optional text alone does not count as displaying it',!app.state().seen.includes(optional));
 await show([optional]);
 check('visible optional text is recorded through the actual Campaign',app.state().seen.includes(optional));
 el('[data-reading]').scrollTop=47;await resize(320);
 check('resize preserves the reading-window position and open optional text',el('[data-reading]').scrollTop===47&&el('[data-j-text="'+optional+'"]'));
 await click('[data-j="receipt"]');
 check('receipt details keep materials and unlocks accessible without scrolling the main screen',el('[data-inspector]').textContent.includes('素材 '+d().return_receipt.kept_items.find(x=>x.kind==='material').type)&&el('[data-inspector]').querySelectorAll('[data-j="detail"]').length===d().return_receipt.new_unlocks.length&&footerHas('hub'));
 await click('[data-j="close"]');await click('[data-bottom] [data-j="hub"]');
 check('one destination action acknowledges return and reaches the real home phase',d().phase==='home'&&root.dataset.screen==='hub');
 await click('[data-j="destination"]');
 check('destination purpose and equipped contents are accessible in a small window',app.state().panel==='destination'&&footerHas('depart'));
 await click('[data-j="close"]');await click('[data-bottom] [data-j="deck"]');
 const expected=[...d().home.free_card_options,...d().home.owned.filter(x=>x.selection_kind==='deck').map(x=>x.id)],listed=[];
 do{listed.push(...Array.from(root.querySelectorAll('[data-piece]')).map(e=>e.dataset.piece));const next=root.querySelector('[data-j="page"][data-step="1"]');if(!next||next.disabled)break;await click(next);}while(true);
 check('every deck entry including the last is reachable by bounded pages at 320px',JSON.stringify(listed)===JSON.stringify(expected));
 const last=listed.at(-1),anchor=app.state().pageAnchors.deck;
 await click('[data-j="detail"][data-id="'+last+'"]');await click('[data-j="pin"]');
 const pinned=JSON.stringify(app.state().windows);
 for(const w of [1024,736,600,320]){
  await resize(w);
  check('resize '+w+' keeps the requested ratio, logical list position and pinned detail',el('.cj-shell').style.height===w*9/16+'px'&&app.state().pageAnchors.deck===anchor&&JSON.stringify(app.state().windows)===pinned);
  const geometry=dom.window.CrossweaveUI.journeyLayout(w,expected.length,anchor);
  check('page geometry '+w+' reserves two 44px action bands and fits full-sized card controls',geometry.rowHeight>=90&&geometry.rows*geometry.rowHeight+(geometry.rows-1)*geometry.gap<=geometry.availableHeight+.001&&(geometry.availableWidth-(geometry.columns-1)*geometry.gap)/geometry.columns>=144);
 }
 check('expanding then shrinking returns to the same final deck page',el('[data-piece="'+last+'"]'));
 await click('[data-j="close-item"]');
 const before=JSON.stringify(session.state().draft),n=session.state().draft.next_preparation.deck.filter(x=>x===last).length;
 const change=n?'remove':'add',undo=n?'add':'remove';
 await click('[data-catalogue] [data-j="'+change+'"][data-id="'+last+'"]');
 check('editing the last page changes the intended card and invalid size disables confirmation',JSON.stringify(session.state().draft)!==before&&el('[data-bottom] [data-j="commit"]').disabled&&el('[data-bottom] [data-j="depart"]').disabled);
 await click('[data-catalogue] [data-j="'+undo+'"][data-id="'+last+'"]');
 check('undoing the card edit restores the original real draft',JSON.stringify(session.state().draft)===before);
 await click('[data-header] [data-j="skills"]');
 const skillIds=[];do{skillIds.push(...Array.from(root.querySelectorAll('[data-piece]')).map(e=>e.dataset.piece));const next=root.querySelector('[data-j="page"][data-step="1"]');if(!next||next.disabled)break;await click(next);}while(true);
 check('all public skill choices share the same bounded card grid',skillIds.length===d().home.learning_options.length&&new Set(skillIds).size===skillIds.length);
 const skill=skillIds.at(-1);await click('[data-catalogue] [data-j="equip"][data-id="'+skill+'"]');
 const draft=JSON.stringify(session.state().draft),skillAnchor=app.state().pageAnchors.skills;
 await click('[data-header] [data-j="deck"]');
 check('one-step skill/deck switching preserves the draft and final deck page',JSON.stringify(session.state().draft)===draft&&el('[data-piece="'+last+'"]'));
 await click('[data-header] [data-j="skills"]');
 for(const w of [1024,736,600,320])await resize(w);
 check('shared draft and skill page survive both tab switching and resize',JSON.stringify(session.state().draft)===draft&&app.state().pageAnchors.skills===skillAnchor&&el('[data-piece="'+skill+'"]'));
 check('current and proposed money remain labeled in the compact header',el('.cj-compact-wallet').getAttribute('aria-label').includes('現在 3、変更案 1'));
 await click('[data-bottom] [data-j="review"]');
 check('comparison contains the actual skill change while confirm/depart stay outside the scrolling body',el('[data-inspector]').textContent.includes(d().details[skill].name)&&footerHas('commit')&&footerHas('depart')&&!el('.cj-inspect-scroll').querySelector('[data-j="commit"]'));
 await click('[data-bottom] [data-j="commit"]');
 check('confirmation commits the actual skill and money, with no residual draft',d().home.economy.unspent_units===100&&session.state().draft.next_preparation.equipment.includes(skill)&&!footerHas('commit')&&el('.cj-compact-wallet').getAttribute('aria-label').includes('確定済み'));
 await click('[data-header] [data-j="menu"]');await click('[data-j="unavailable"]');
 check('unavailable acquisition explains the D03 dependency instead of an empty inventory or lack of funds',el('.cj-inspect-scroll').textContent.includes('本体の対応待ち'));
 await click('[data-j="close"]');await click('[data-header] [data-j="hub"]');await click('[data-bottom] [data-j="depart"]');
 for(let i=0;i<5&&d().scene?.paused;i++){
  const ids=d().scene.text_ids;await show(ids);
  assert(root.querySelector('[data-reading]'));assert(footerHas('continue'));
  await click('[data-bottom] [data-j="continue"]');
 }
 check('departure and the text-window continue action reach actual exploration',d().phase==='exploring'&&root.dataset.screen==='explore'&&el('[data-header]').hidden);
 await click('[data-x="menu"]');await click('[data-j="suspend"]');
 check('suspend opens a bounded start view with resume in the fixed action band',root.dataset.screen==='start'&&el('.cj-fixed-start')&&footerHas('resume'));
 await click('[data-bottom] [data-j="resume"]');
 check('resume returns to the same actual exploration',root.dataset.screen==='explore'&&d().phase==='exploring');
 check('no script errors',errors.length===0);
 app.dispose();dom.window.close();
 const report={id:'CW-M1-UI-001',group:'fixed-screen-v0.4',result:'pass',count:checks.length,checks,errors,node:process.version,conditions:['Real Campaign + original MemoryStore; original natural return save.','JSDOM; explicit visibility and resize callbacks. Layout function uses 1024/736/600/320px inputs.'],limits:['Geometry and DOM reachability are not browser paint, clipping, physical scroll or touch evidence.','IndexedDB and user acceptance remain unverified. Prior groups were not rerun or counted.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length,deck_entries:listed.length,skill_entries:skillIds.length}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
