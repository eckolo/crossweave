'use strict';
// Focused v0.8 checks: prose boundaries, linked windows, pin controls and pre-reset forecasts.
// JSDOM does not paint. Geometry and visibility inputs below are explicit.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom'),{build}=require('./build.cjs');
const checks=[],errors=[],check=(name,ok)=>{assert(ok,name);checks.push({name,pass:true});};
const pause=(ms=5)=>new Promise(r=>setTimeout(r,ms));
async function until(fn){const end=Date.now()+8000;while(!fn()){if(Date.now()>end)throw Error('timeout');await pause();}}
(async()=>{
 const sizes=[],visibility=[],vc=new VirtualConsole();let width=1024;
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(build({testing:true}).html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-check.invalid/',virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
  w.ResizeObserver=class{constructor(fn){this.fn=fn;this.targets=[];sizes.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.targets=[];visibility.push(this);}observe(t){this.targets.push(t);}disconnect(){this.targets=[];}};
  w.matchMedia=()=>({matches:true});
 }});
 const originalRect=dom.window.HTMLElement.prototype.getBoundingClientRect;
 dom.window.HTMLElement.prototype.getBoundingClientRect=function(){const left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0,width=parseFloat(this.style.width)||0,height=parseFloat(this.style.height)||0;return {left,top,width,height,right:left+width,bottom:top+height};};
 const root=dom.window.document.getElementById('crossweave-journey');await until(()=>root.__test);
 let app=root.__test.app,session=app.session;const d=()=>session.state().view.display_data;
 const idle=async()=>{await until(()=>session.state().view&&!session.state().pending);await pause();await until(()=>!session.state().pending);await pause();};
 const el=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 const click=async s=>{const b=typeof s==='string'?el(s):s;assert(!b.disabled,'disabled '+s);b.click();await idle();};
 const rect=(w,h)=>({left:0,top:0,width:w,height:h,right:w,bottom:h});root.getBoundingClientRect=()=>rect(width,width*9/16);
 async function resize(w){width=w;el('.cj-shell').getBoundingClientRect=()=>rect(width,width*9/16);const game=root.querySelector('.cw-explore');if(game)game.getBoundingClientRect=()=>rect(width,width*9/16);for(const o of sizes)for(const t of o.targets)if(t===root||t===game)o.fn([{target:t,contentRect:{width,height:width*9/16}}]);await idle();}
 async function show(ids){for(const o of visibility){const entries=o.targets.filter(t=>ids.includes(t.dataset.jText)).map(target=>({target,isIntersecting:true,intersectionRatio:1}));if(entries.length)o.fn(entries);}await idle();}
 await idle();await resize(1024);
 const api=dom.window.CrossweaveUI,lines=(s,n)=>Array.from(api.proseLines(s,t=>[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(t)].length<=n));
 check('text that fits does not break at every punctuation mark',lines('短文。続き、末尾。',30).length===1);
 check('a sentence stop wins over a later comma within the fitting prefix',JSON.stringify(lines('aaa。bb、cccddd',9))===JSON.stringify(['aaa。','bb、cccddd']));
 check('without a sentence stop the last fitting comma is used',JSON.stringify(lines('aaa、bbbbbbbb',6))===JSON.stringify(['aaa、','bbbbbb','bb']));
 check('long unpunctuated text remains complete and fits by ordinary wrapping',JSON.stringify(lines('abcdefgh',3))===JSON.stringify(['abc','def','gh']));
 check('closing quotes stay with their sentence ending',lines('「abc。」次の長い文章です',6)[0]==='「abc。」');
 check('fallback does not split a combined emoji',lines('👨‍👩‍👧‍👦あいう',2)[0]==='👨‍👩‍👧‍👦あ');
 const paragraph=dom.window.document.createElement('p'),holder=dom.window.document.createElement('div');holder.className='cj-story';holder.append(paragraph);root.append(holder);
 paragraph.textContent='aaa。bb、cccddd';paragraph.dataset.jText='measurement-only';let proseWidth=91;Object.defineProperty(paragraph,'clientWidth',{get:()=>proseWidth});
 const measuredRect=dom.window.HTMLElement.prototype.getBoundingClientRect;
 dom.window.HTMLElement.prototype.getBoundingClientRect=function(){if(this.classList.contains('cw-prose-measure'))return {width:Array.from(this.textContent).length*10};return measuredRect.call(this);};
 api.layoutProse(holder);check('measured layout preserves the paragraph identity and source text',paragraph.dataset.jText==='measurement-only'&&paragraph.textContent==='aaa。bb、cccddd'&&paragraph.children[0].textContent==='aaa。');
 proseWidth=200;api.layoutProse(holder);check('widening recomputes from the original prose rather than previous line breaks',paragraph.children.length===1&&paragraph.textContent==='aaa。bb、cccddd');holder.remove();dom.window.HTMLElement.prototype.getBoundingClientRect=measuredRect;
 const inBounds=q=>q.left>=0&&q.top>=0&&q.left+q.width<=width+.1&&q.top+q.height<=width*9/16+.1;
 const intersects=(a,b)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
 const geometryOK=selector=>{const panes=[...root.querySelectorAll(selector)].filter(p=>!p.hidden).map(p=>p.getBoundingClientRect());return panes.length===2&&panes.every(inBounds)&&intersects(...panes)===0;};
 await click('[data-j="receipt"]');el('[data-inspect-key="receipt"] .cj-inspect-scroll').scrollTop=140;
 const resultDetail=el('[data-inspect-key="receipt"] [data-j="detail"]'),detailId=resultDetail.dataset.id;await click(resultDetail);
 check('result card detail keeps its source window and source scroll',!!el('[data-inspect-key="receipt"]')&&el('[data-inspect-key="receipt"] .cj-inspect-scroll').scrollTop===140&&app.state().panelTrail.length===1);
 for(const w of [1024,736,600,320]){await resize(w);check('linked result panes are disjoint and bounded at '+w,geometryOK('[data-inspector]>.cj-inspect-item')&&el('.cj-shell').style.height===w*9/16+'px'&&!!el('[data-inspect-key="'+detailId+'"]'));}
 const back=el('[data-j="window-back"]');check('nested back is an arrow only with a descriptive accessible name',back.textContent===''&&!!back.querySelector('[data-lucide="arrow-left"]')&&back.getAttribute('aria-label').includes('戻る'));
 await click('[data-j="window-back"]');check('one back returns to the retained result details',app.state().panel==='receipt'&&app.state().panelTrail.length===0&&el('[data-inspect-key="receipt"] .cj-inspect-scroll').scrollTop===140);await click('[data-j="close"]');
 check('opening and laying out optional windows does not bulk-record text',app.state().seen.length===0);
 await show(d().scene.text_ids);await click('[data-bottom] [data-j="hub"]');
 check('destination details belong to the title group',el('[data-j="destination"]').parentElement===el('.cj-destination-heading')&&!!el('.cj-destination-heading h2'));
 await click('[data-j="menu"]');await click('[data-inspect-key="menu"] [data-j="help"]');check('help is adjacent to its originating menu',geometryOK('[data-inspector]>.cj-inspect-item')&&el('[data-inspect-key="help"]').textContent.includes('再設定前')&&!!el('[data-inspect-key="menu"]'));await click('[data-inspect-key="help"] [data-j="window-back"]');await click('[data-j="close"]');
 await click('[data-j="records"]');await click('[data-j="record-target"]');
 const cardReference=root.querySelector('[data-inspect-key^="target:"] [data-j="record-detail"]');assert(cardReference,'natural return must provide a recorded card');const targetKey=el('[data-inspect-key^="target:"]').dataset.inspectKey;el('[data-inspect-key^="target:"] .cj-inspect-scroll').scrollTop=160;await click(cardReference);
 check('a third-level record shows its immediate originating target beside the card',!!el('[data-inspect-key="'+targetKey+'"]')&&!!el('[data-inspect-key^="record:"]')&&!root.querySelector('[data-inspect-key^="records:"]')&&geometryOK('[data-inspector]>.cj-inspect-item'));
 await click('[data-inspect-key^="record:"] [data-j="record-back"]');check('record back restores the target list and its scroll',!!el('[data-inspect-key^="records:"]')&&el('[data-inspect-key="'+targetKey+'"] .cj-inspect-scroll').scrollTop===160);await click('[data-j="close"]');
 await click('[data-bottom] [data-j="skills"]');const skill=d().home.learning_options[0].base;await click('[data-j="equip"][data-id="base:'+skill+'"]');await click('[data-j="detail"][data-id="base:'+skill+'"]');
 await click('[data-j="pin"]');check('preparation pin uses the shared mark and matching pressed label',!!el('[data-j="pin"] [data-lucide="pin"]')&&el('[data-j="pin"]').getAttribute('aria-label')==='固定を外す'&&el('[data-j="pin"]').getAttribute('aria-pressed')==='true');
 const draft=JSON.stringify(session.state().draft);for(const w of [1024,736,600,320]){await resize(w);check('resize retains the pinned window and draft at '+w,app.state().windows[0].pinned&&JSON.stringify(session.state().draft)===draft&&!!el('[data-j="pin"]'));}
 await click('[data-j="close-item"]');await click('[data-j="review"]');await click('[data-inspect-key="review"] [data-j="commit"]');check('comparison still commits through the real Campaign',!session.state().error&&session.state().draft.next_preparation.equipment.includes('base:'+skill));
 app.dispose();
 const Campaign=root.__test.Campaign,document=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/entry.save.json.gz'))));
 const controller=await Campaign.importSave({slot_id:'fit-review-entry',document,request_id:'fit-review-entry-import'});
 app=api.mountJourney(root,{controller,Campaign,slot_id:'fit-review-entry',title:'夜潮の排水路'});session=app.session;await idle();
 for(let i=0;i<5&&d().scene?.paused;i++){await show(d().scene.text_ids);await click('[data-j="continue"]');}await resize(320);
 await click('[data-x="more"]');await click('#cw-drawer [data-x="order"]');
 check('exploration menu stays beside the window opened from it',geometryOK('.cw-drawer')&&!el('#cw-parent-drawer').hidden&&!el('[data-x="window-back"]').hidden);
 await click('[data-x="pin"]');check('exploration pin uses the same icon and off-state label',!!el('[data-x="pin"] [data-lucide="pin"]')&&el('[data-x="pin"]').getAttribute('aria-label')==='固定する'&&el('[data-x="pin"]').getAttribute('aria-pressed')==='false');
 await click('[data-x="pin"]');check('pin toggles back to the labeled pressed state',el('[data-x="pin"]').getAttribute('aria-label')==='固定を外す'&&el('[data-x="pin"]').getAttribute('aria-pressed')==='true');
 await click('[data-x="window-back"]');check('exploration back restores the source menu',el('#cw-parent-drawer').hidden&&el('#cw-drawer').dataset.window==='more');await click('[data-x="close"]');
 const legal=()=>d().exploration.legal_actions.map(a=>a.choice??a),attack=legal().find(q=>q.target!==null);assert(attack);
 await click('[data-x-card="'+attack.card_id+'"]');await click('[data-x-actor="'+attack.target+'"]');
 const expected=(await controller.previewAction({view_token:session.state().view.meta.view_token,choice:attack})).display_data.action_preview;
 check('concealment delta uses the real already-resolved hit gain before reset',el('[data-x-actor="'+attack.target+'"] [data-stat="posture"] .cw-delta').dataset.delta===String(-expected.hit_gain));
 await click('[data-x="preview"]');check('forecast detail displays pre-reset remaining and omits the tutorial footer',el('#cw-drawer .cw-drawer-body').textContent.includes(expected.posture_before+' → '+(expected.posture_before-expected.hit_gain))&&!el('#cw-drawer .cw-drawer-body').textContent.includes('続く相手'));
 const projection=api.projectActionForecast(d(),attack,{supported:true,mode:'attack',posture_before:7,posture_after:100,hit_gain:20,actual_hp_loss:2});
 check('the reset boundary remains negative instead of jumping to 100',projection.actors[attack.target].posture.after===-13&&projection.actors[attack.target].posture.delta===-20);
 await click('[data-x="close"]');
 for(const w of [1024,736,600,320]){await resize(w);const game=el('.cw-explore');check('all current actor values and forecasts survive resize '+w,game.dataset.compact===String(w*9/16<480)&&Object.values(d().exploration.actors).filter(a=>a.active).every(a=>{const node=a.id===d().exploration.self.id?el('#cw-self'):el('[data-x-actor="'+a.id+'"]');return node.querySelector('[data-stat="posture"] b').textContent===String(a.posture_remaining)&&node.querySelector('[data-stat="hp"] b').textContent===String(a.hp)&&node.querySelector('[data-stat="posture"]').getAttribute('aria-label').endsWith('/ '+a.max_posture)&&node.querySelectorAll('progress').length===2;})&&!!root.querySelector('.cw-delta'));}
 check('concealment uses a hiding symbol rather than a crossed-out scan',!!el('[data-stat="posture"] [data-lucide="venetian-mask"]')&&!root.querySelector('[data-lucide="eye-off"]'));
 check('ordinary recovery adds no special property',api.cardProperties({recovery_rule:'shared_recovery'}).length===0);
 check('a consumed card says that it disappears on recovery',api.cardProperties({recovery_rule:'consumed_on_recovery'})[0]==='回収時に消滅');
 check('specific public effects and destruction share the property section',JSON.stringify(Array.from(api.cardProperties({effect_text:'自身以外の全体に影響がある',recovery_rule:'destroyed_on_recovery_filler'})))===JSON.stringify(['自身以外の全体に影響がある','回収時に消滅']));
 await click('[data-x-card="'+attack.card_id+'"]');check('hand detail omits normal recovery instructions',!el('#cw-drawer .cw-drawer-body').textContent.includes('共有回収へ'));
 const source=JSON.stringify(session.state().draft);await click('[data-x="withdraw"]');check('a real phase transition resets both exploration windows',d().phase==='return'&&!root.querySelector('#cw-drawer')&&app.state().panel===null);
 check('no script errors',errors.length===0);app.dispose();dom.window.close();
 const report={id:'CW-M1-UI-001',group:'fit-review-v0.8',result:'pass',count:checks.length,checks,errors,node:process.version,conditions:['Real Campaign + original MemoryStore; natural return and entry saves.','Real previewAction and commit_preparation/withdraw; pre-reset negative-boundary fixture.','Controlled visibility and 1024/736/600/320px DOM rectangles. Window arithmetic, state and navigation, no paint.','Synthetic glyph widths for prose measurement; public-card property fixtures.'],limits:['Physical overflow, actual Japanese font wrapping, touch and host rendering are unverified.','IndexedDB, formal v0.15 full migration and user acceptance remain unverified.','Unprovided post-action crit/reduction/evasion values are not invented.','Historical groups were not rerun or recounted.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,count:checks.length}));
})().catch(e=>{console.error(e);console.error(errors);process.exitCode=1;});
