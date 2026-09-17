/* New choice-flow checks only. JSDOM is not browser/layout evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{webcrypto}=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const preview=require('./build-preparation-preview.cjs'),B=require('./build.cjs');
const checks=[],errors=[],check=(name,condition)=>{assert(condition,name);checks.push({name,pass:true});};
const until=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('DOM timeout');await new Promise(r=>setTimeout(r,5));}};
function environment(html){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 return new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://ui-test.invalid/',virtualConsole:vc,beforeParse(w){w.ResizeObserver=class{observe(){}disconnect(){}};}});
}
function ui(root,session){
 const find=s=>{const e=root.querySelector(s);assert(e,'missing '+s);return e;};
 return {find,click:s=>find(s).click(),idle:async()=>{await until(()=>session.state().view&&!session.state().pending);await new Promise(r=>setTimeout(r,0));}};
}
(async()=>{
 const dom=environment(preview.build({testing:true})),w=dom.window,root=w.document.getElementById('crossweave-preparation-clear');
 const {session,mock}=root.__test,{find,click,idle}=ui(root,session);await idle();
 const initial=session.state(),initialDraft=JSON.stringify(initial.draft),revision=initial.view.meta.revision;
 check('return button names the actual deck destination',find('[data-action="ack"]').textContent==='札を組む');
 click('[data-action="return-pick"]');
 check('opening a respec selection does not cancel all learned skills',JSON.stringify(session.state().draft)===initialDraft&&session.state().view.meta.revision===revision);
 click('[data-detail="base:PS02"]');
 check('forget detail names the equipment loss and preserved possessions',find('.cw-popup').textContent.includes('装備できなくなり')&&find('.cw-popup').textContent.includes('持ち物は残ります'));
 click('[data-action="learning"]');await idle();
 check('forget selection is individual and preview only',JSON.stringify(session.state().draft.cancel_learning)==='["PS02"]'&&session.state().view.display_data.home.economy.unspent_units===300&&session.state().view.meta.revision===revision);
 click('[data-action="review"]');await idle();
 check('refund comparison shows the actual skill and numeric before/after',find('.cw-popup').textContent.includes('属性連携')&&find('.cw-money-pair').textContent.includes('現在3')&&find('.cw-money-pair').textContent.includes('変更後5'));
 check('payment order is absent when there is no purchase plus learning',!root.querySelector('[data-timing]'));
 const draftBeforeClose=JSON.stringify(session.state().draft);click('.cw-popup [data-action="close"]');
 check('close only dismisses the window and preserves the draft',!root.querySelector('.cw-popup')&&JSON.stringify(session.state().draft)===draftBeforeClose&&session.state().view.meta.revision===revision);
 click('[data-action="ack"]');await idle();
 check('deck destination reprojects cancellation without applying it',session.state().view.display_data.phase==='home'&&session.state().draft.cancel_learning.includes('PS02')&&session.state().view.display_data.home.economy.learned.some(x=>x.base==='PS02')&&root.querySelector('.cw-main[aria-label="札組"]'));
 click('[data-action="nav-offers"]');
 const offer=session.state().view.display_data.home.candidates.find(c=>session.state().view.display_data.details[c.id].name==='軽い踏ん張り');
 assert(offer);click('[data-detail="'+offer.id+'"]');
 check('purchase detail gives a named item, price and unit',find('.cw-popup').textContent.includes('軽い踏ん張り')&&find('.cw-price').textContent.includes('着想41枚'));
 click('[data-action="candidate"]');await idle();
 check('choosing a purchase does not yet spend or add inventory',session.state().view.display_data.home.owned.length===5&&session.state().view.display_data.home.economy.unspent_units===300&&session.state().draft.candidate===offer.id);
 click('[data-action="nav-skills"]');click('[data-detail="base:PS01"]');click('[data-action="learning"]');await idle();
 click('[data-action="review"]');await idle();
 check('only a combined purchase and learning exposes a collapsed payment-order control',!!root.querySelector('details.cw-payment-order:not([open])')&&find('[data-timing]').options.length===2);
 check('payment-order choices use the actual two targets',find('[data-timing]').textContent.includes('軽い踏ん張り')&&find('[data-timing]').textContent.includes(session.state().view.display_data.details['base:PS01'].name)&&!find('[data-timing]').textContent.includes('→'));
 find('[data-timing]').value='after_preparation';find('[data-timing]').dispatchEvent(new w.Event('change',{bubbles:true}));await idle();
 check('named payment choice preserves the same selected objects',session.state().draft.purchase_timing==='after_preparation'&&session.state().draft.candidate===offer.id&&session.state().draft.next_preparation.learn.includes('PS01'));
 click('.cw-popup [data-action="close"]');click('[data-detail="base:PS01"]');click('[data-action="learning"]');await idle();
 click('[data-action="nav-deck"]');
 const remove=session.state().view.display_data.home.deck.composition.find(x=>x.id.startsWith('base:')&&x.count>1).id;
 click('[data-detail="'+remove+'"]');click('[data-action="deck-remove"]');await idle();
 check('an incomplete deck cannot be confirmed',session.state().comparison.ok===false&&session.state().draft.next_preparation.deck.length===11);
 click('[data-detail="$purchase"]');click('[data-action="deck-add"]');await idle();
 click('[data-action="review"]');await idle();
 check('review names the gained card and the actual removed equipment',find('.cw-popup').textContent.includes('1枚増える')&&find('.cw-popup').textContent.includes('軽い踏ん張り')&&find('.cw-popup').textContent.includes('装備から外れる')&&find('.cw-popup').textContent.includes('属性連携'));
 check('generic acquisition-learning arrows and edit button are absent',!/(?:習得\s*→\s*取得|取得\s*→\s*習得|修正する|次の準備へ|取消後の順序)/.test(root.textContent));
 const beforeCommit=session.state().view.meta.revision;mock.testing.failNext();click('[data-action="commit"]');await idle();
 check('failed commit keeps current money and exposes exact retry',session.state().canRetry&&session.state().view.meta.revision===beforeCommit&&session.state().view.display_data.home.economy.unspent_units===300&&root.querySelector('[data-action="retry"]'));
 click('[data-action="retry"]');await idle();
 check('successful commit applies the displayed money, inventory, deck and equipment',session.state().view.display_data.home.economy.unspent_units===100&&session.state().view.display_data.home.owned.length===6&&session.state().view.display_data.home.deck.size===12&&session.state().view.display_data.home.equipment.used===0);
 check('saved state drops the provisional purchase handle',session.state().draft.candidate===null&&!session.state().draft.next_preparation.deck.includes('$purchase'));
 dom.window.close();
 // Exercise the same new renderer with the actual design-owned Campaign and MemoryStore.
 const {createCampaign,versions}=await import(pathToFileURL(path.resolve(__dirname,'../../../../../src/runtime/campaign.mjs')));
 const {MemoryStore}=await import(pathToFileURL(path.resolve(__dirname,'../../../../../test/runtime/support.mjs')));
 const storage=new MemoryStore(),Campaign=createCampaign({storage});
 const document=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../接続条件/co-d02/saves/home.save.json.gz'))));
 const controller=await Campaign.importSave({slot_id:'ui-choice-actual',document,request_id:webcrypto.randomUUID()});
 const realDom=environment('<div id="actual"></div>');realDom.window.eval(fs.readFileSync(path.join(__dirname,'session.js'),'utf8')+'\n'+B.buildPreparation());
 const actualRoot=realDom.window.document.getElementById('actual');
 let seq=0;const actual=realDom.window.CrossweaveUI.makeSession(controller,{idFactory:()=>'ui-choice-'+(++seq)});
 realDom.window.CrossweaveUI.mountPreparation(actualRoot,actual);await actual.refresh({preserveLocal:false});
 const a=ui(actualRoot,actual);await a.idle();
 a.click('[data-action="nav-offers"]');
 check('real D03 waiting is distinguished from empty inventory and insufficient funds',actualRoot.textContent.includes('接続待ち')&&!actualRoot.textContent.includes('今は品物がありません')&&!actualRoot.textContent.includes('着想が足りません'));
 a.click('[data-action="nav-skills"]');a.click('[data-detail="base:PS01"]');a.click('[data-action="learning"]');await a.idle();
 const oldMoney=actual.state().view.display_data.home.economy.unspent_units,target=actual.state().comparison.stages.prepared.unspent_units;
 check('actual comparison returns the named cancellation and the design refund',actual.state().draft.cancel_learning.includes('PS01')&&target===300&&oldMoney!==target);
 a.click('[data-action="review"]');await a.idle();storage.failNext=true;a.click('[data-action="commit"]');await a.idle();
 check('actual save failure leaves current state and selection intact',actual.state().canRetry&&actual.state().view.display_data.home.economy.unspent_units===oldMoney&&actual.state().draft.cancel_learning.includes('PS01'));
 a.click('[data-action="retry"]');await a.idle();
 check('actual retry commits the exact displayed cancellation',actual.state().view.display_data.home.economy.unspent_units===target&&actual.state().view.display_data.home.economy.learned.length===0);
 check('no DOM runtime exceptions',errors.length===0);realDom.window.close();
 const report={trial_id:'CW-M1-UI-001',group:'preparation-choice-ui-v0.2',node:process.version,jsdom:'26.1.0',versions,result:'pass',count:checks.length,checks,errors,
  conditions:['Published CO-U01 BC mock through the current asynchronous session and renderer.','Actual Campaign with unchanged design-owned MemoryStore and the published natural home save.'],
  limits:['JSDOM has no rendering; no new 1024/736/600/320px or resize/layout acceptance claim.','Actual IndexedDB and physical browser input remain unverified.','Previous 28/29/25/13 and 46/28 results are historical, not rerun here.']};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({group:report.group,count:checks.length,result:'pass'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
