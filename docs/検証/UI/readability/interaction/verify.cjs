// DOM input routing and fixed-state equivalence. This is not browser geometry QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build,sha}=require('./build.cjs'),old=require('../build.cjs'),fixtures=require('../fixtures.json');
const errors=[];let actions=0;const checks=[];
function open(html,modern=false){
  const hook='window.__inspect=()=>JSON.parse(JSON.stringify({s:game.s,memory:game.memory,rng:Object.fromEntries(Object.entries(game.rng).map(([k,v])=>[k,v.state()]))}));';
  html=html.replace('  function render(){','  function render(){'+hook+(modern?'window.__ui=()=>({version,selected,target});window.__start=start;window.__catalogue=()=>CWFeedback.catalogue(game);window.__request=requestCard;window.__layout=placeNearCard;window.__order=actionOrder;window.__window=()=>({openName,windowMode});window.__relationPlan=relationPlan;window.__drawRelations=drawRelations;window.__events=()=>JSON.parse(JSON.stringify(history));window.__enqueueEvents=enqueueEvents;window.__resetEvents=resetEvents;window.__stepEvents=stepEvents;':''));
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  return new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.HTMLElement.prototype.scrollBy=function({left}){this.scrollLeft+=left;};w.matchMedia=()=>({matches:true});
    let clock=0,serial=0;const timers=new Map();
    w.setTimeout=(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:clock+Number(ms||0)});return id;};
    w.clearTimeout=id=>timers.delete(id);
    w.__tick=ms=>{const until=clock+ms;for(;;){const next=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=until;};
  }});
}
const state=d=>JSON.stringify(d.window.__inspect());
const eq=(a,b)=>assert.equal(state(a),state(b),'state / RNG / memory differ');
const query=(d,s)=>d.window.document.querySelector(s);
function choose(d,choice){if(choice.target)query(d,`[data-target="${choice.target}"]`).click();query(d,`[data-card="${choice.card_id}"]`).click();}
function pointer(d,node,type,props={}){const e=new d.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:100,clientY:300,...props});node.dispatchEvent(e);}
function drag(d,id,finish='inside',pointerType='touch'){
  const root=query(d,'#cw-playtable'),handle=query(d,`[data-card="${id}"]`);
  d.window.document.elementFromPoint=()=>finish==='inside'?query(d,'#cw-drop-zone'):root;
  pointer(d,handle,'pointerdown',{pointerType});d.window.__tick(220);pointer(d,root,'pointermove',{clientX:120,clientY:100,pointerType});
  if(finish==='cancel')pointer(d,root,'pointercancel');
  else if(finish==='escape')root.dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  else pointer(d,root,'pointerup',{clientX:120,clientY:100});
}
for(const run of fixtures.runs){
  const a=open(old.build()),b=open(build(),true);
  query(a,'#cw-build').value=run.build;query(a,'#cw-restart').click();b.window.__start(run.build);
  eq(a,b);
  for(const choice of run.choices){const before=state(b);choose(a,choice);choose(b,choice);assert.equal(state(b),before,'selection mutated game');assert(!query(b,'#cw-use').disabled,'legal action disabled');query(a,'#cw-use').click();query(b,'#cw-use').click();eq(a,b);const scheduled=b.window.__inspect().s;if(!scheduled.outcome)assert(scheduled.actors[b.window.__ui().target]?.active,'retirement left target unselected');assert.deepEqual([...b.window.document.querySelectorAll('[data-turn-actor]')].map(n=>n.dataset.turnActor).sort(),scheduled.outcome?[]:Object.keys(scheduled.actors).filter(id=>scheduled.actors[id].active&&scheduled.actors[id].acts).sort(),'scheduled participants did not follow state');assert.equal(b.window.__ui().selected,null,'new hand auto-selected');assert(query(b,'#cw-use').disabled,'execution remains armed');actions++;}
  for(const d of [a,b])query(d,'#cw-withdraw').click();eq(a,b);
  a.window.close();b.window.close();
}
checks.push('recorded choices: identical states / RNG / memory; target retained/reassigned; no automatic next-card selection');
{
  const b=open(build(),true),before=state(b),s=b.window.__inspect().s;
  const displayed=()=>[...b.window.document.querySelectorAll('[data-turn-actor]')].map(n=>n.dataset.turnActor);
  assert.deepEqual(displayed(),['P','V0'],'initial order must include self and only active acting participants');
  assert(!query(b,'[data-turn-actor="O"]'),'actionless rock received a scheduled turn');
  query(b,'[data-open="order"]').click();
  assert(query(b,'#cw-queue').textContent.includes('あなた'));
  assert(!query(b,'#cw-queue').textContent.includes('後続'));
  query(b,'#cw-close').click();query(b,'[data-open="objective"]').click();
  const objective=query(b,'#cw-objective').textContent;
  assert(objective.includes('大岩')&&objective.includes('最初の環境')&&!objective.includes('後続'));
  query(b,'#cw-close').click();query(b,'[data-open="settings"]').click();
  assert(!query(b,'#cw-gesture-hint').closest('[hidden]'),'instructions became unreachable');
  query(b,'#cw-close').click();assert(query(b,'#cw-gesture-hint').closest('[hidden]'));
  assert(query(b,'#cw-hand-count').closest('.cw-bottom'));
  assert(query(b,'#cw-hand-context').hidden&&query(b,'#cw-field-context').hidden);
  assert.equal(state(b),before,'information windows changed game state');
  // Public scheduler tie rule: environment, player, enemy, then ID. No future action costs assumed.
  const ties={now:4,actors:{E2:{active:true,acts:true,role:'E',next_at:4},P:{active:true,acts:true,role:'P',next_at:4},V0:{active:true,acts:true,role:'V',next_at:4},E1:{active:true,acts:true,role:'E',next_at:4},O:{active:true,acts:false,role:'O',next_at:0},V1:{active:false,acts:true,role:'V',next_at:0}}};
  assert.deepEqual(Array.from(b.window.__order(ties)),['V0','P','E1','E2']);
  ties.outcome='clear';assert.equal(b.window.__order(ties).length,0);
  checks.push('essential information: own turn included; no inactive/actionless schedule; exact tie order; current breakthrough and help accessible without mutating game');
  b.window.close();
}
const first=fixtures.runs[0].choices[0];
for(const method of ['touch','mouse','pen','confirm']){
  const a=open(old.build()),b=open(build(),true);choose(a,first);query(a,'#cw-use').click();
  if(method!=='confirm'){drag(b,first.card_id,'inside',method);pointer(b,query(b,'#cw-playtable'),'pointerup');}
  if(method==='confirm'){query(b,'#cw-quick-setting').checked=false;const before=state(b);drag(b,first.card_id);assert.equal(state(b),before);query(b,'#cw-use').click();}
  eq(a,b);checks.push(method+': same placement and NPC response');a.window.close();b.window.close();
}
for(const finish of ['outside','cancel','escape']){const b=open(build(),true),before=state(b);drag(b,first.card_id,finish);assert.equal(state(b),before);assert.equal(b.window.__ui().selected,first.card_id);checks.push('drag '+finish+': no action, held card remains selected');b.window.close();}
{
  const b=open(build(),true),before=state(b);
  query(b,'#cw-drag-setting').checked=false;drag(b,first.card_id);assert.equal(state(b),before,'disabled drag acted');
  assert.equal(b.window.document.querySelectorAll('[data-quick],[data-handle],.cw-card-controls').length,0);
  assert([...b.window.document.querySelectorAll('.cw-hand-card')].every(n=>n.querySelectorAll('button').length===1));choose(b,first);query(b,'#cw-use').click();
  const after=state(b),version=b.window.__ui().version,next=b.window.__inspect().s.actors.P.hand[0];b.window.__request(next,version-1);assert.equal(state(b),after,'stale request acted');
  query(b,`[data-card="${next}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:2}));assert.equal(state(b),after,'double-click acted');
  checks.push('disabled drag / no card auxiliary controls / stale request / double-click');b.window.close();
}
for(const pointerType of ['touch','mouse','pen']){
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b),hand=query(b,'#cw-hand');
  hand.scrollLeft=100;b.window.document.elementFromPoint=()=>query(b,'#cw-drop-zone');
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown',{pointerType});
  pointer(b,root,'pointermove',{pointerType,clientX:60,clientY:298});
  assert.equal(hand.scrollLeft,140,'horizontal movement did not scroll');
  b.window.__tick(1000);assert(query(b,'#cw-drag-ghost').hidden,'scroll pause started a hold');
  pointer(b,root,'pointermove',{pointerType,clientX:60,clientY:100});
  pointer(b,root,'pointerup',{pointerType,clientX:60,clientY:100});
  query(b,`[data-card="${first.card_id}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(state(b),before);assert.equal(b.window.__ui().selected,null,'scroll produced selection');
  // A fresh physical tap clears click suppression, selects, and never executes.
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown',{pointerType});
  pointer(b,root,'pointerup',{pointerType,clientX:102,clientY:299});
  assert.equal(b.window.__ui().selected,first.card_id);assert.equal(state(b),before);
  checks.push(pointerType+': early movement locks browsing through pause and turn; no ghost click; next tap selects');b.window.close();
}
for(const kind of ['diagonal','native-cancel','downward','multitouch','small-move']){
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  b.window.document.elementFromPoint=()=>query(b,'#cw-drop-zone');
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');
  if(kind==='diagonal'){pointer(b,root,'pointermove',{clientX:125,clientY:275});pointer(b,root,'pointermove',{clientX:125,clientY:100});}
  if(kind==='native-cancel')pointer(b,root,'pointercancel');
  if(kind==='multitouch')pointer(b,root,'pointerdown',{pointerId:2,isPrimary:false});
  if(kind==='downward'){pointer(b,root,'pointermove',{clientY:322});pointer(b,root,'pointermove',{clientY:100});}
  if(kind==='small-move')pointer(b,root,'pointermove',{clientX:104,clientY:296});
  if(kind!=='small-move')b.window.__tick(1000);
  pointer(b,root,'pointerup',{clientX:kind==='small-move'?104:125,clientY:kind==='small-move'?296:100});
  query(b,`[data-card="${first.card_id}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(state(b),before);assert.equal(b.window.__ui().selected,kind==='small-move'?first.card_id:null);
  checks.push(kind+': no execution');b.window.close();
}
for(const holdMs of [150,220,320]){
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  query(b,'#cw-hold-setting').value=String(holdMs);
  b.window.document.elementFromPoint=()=>root;
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');
  pointer(b,root,'pointermove',{clientX:104,clientY:296}); // tremor within tolerance
  b.window.__tick(holdMs-1);assert(query(b,'#cw-drag-ghost').hidden,'hold began early');
  assert.equal(b.window.__ui().selected,null);
  b.window.__tick(1);assert(!query(b,'#cw-drag-ghost').hidden,'hold did not begin at deadline');
  assert.equal(state(b),before,'holding changed game');
  // A diagonal path after holding is a drag, irrespective of the initial angle.
  pointer(b,root,'pointermove',{clientX:130,clientY:270});
  assert(!query(b,'#cw-drag-ghost').hidden);
  b.window.document.elementFromPoint=()=>query(b,'#cw-drop-zone');
  pointer(b,root,'pointerup',{clientX:130,clientY:100});
  const a=open(old.build());choose(a,first);query(a,'#cw-use').click();eq(a,b);
  checks.push(holdMs+'ms: boundary, tremor tolerance and diagonal drag');a.window.close();b.window.close();
}
for(const finish of ['release','wheel','scroll','blur','visibility','settings','restart','stale']){
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  b.window.document.elementFromPoint=()=>root;
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');b.window.__tick(100);
  if(finish==='release')pointer(b,root,'pointerup');
  if(finish==='wheel')query(b,'#cw-hand').dispatchEvent(new b.window.Event('wheel'));
  if(finish==='scroll'){query(b,'#cw-hand').scrollLeft=20;query(b,'#cw-hand').dispatchEvent(new b.window.Event('scroll'));}
  if(finish==='blur')b.window.dispatchEvent(new b.window.Event('blur'));
  if(finish==='visibility'){Object.defineProperty(b.window.document,'hidden',{value:true,configurable:true});b.window.document.dispatchEvent(new b.window.Event('visibilitychange'));}
  if(finish==='settings')query(b,'#cw-hold-setting').dispatchEvent(new b.window.Event('change'));
  if(finish==='restart')b.window.__start();
  if(finish==='stale'){choose(b,first);query(b,'#cw-use').click();}
  const after=state(b);b.window.__tick(1000);assert(query(b,'#cw-drag-ghost').hidden,'late hold after '+finish);
  assert.equal(state(b),after);if(finish!=='stale')assert.equal(state(b),before);
  checks.push('pending hold '+finish+': timer cancelled, no delayed play');b.window.close();
}
{
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  b.window.document.elementFromPoint=()=>root;pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');b.window.__tick(220);
  pointer(b,root,'pointerup');b.window.__tick(1000);assert.equal(state(b),before);assert.equal(b.window.__ui().selected,first.card_id);
  checks.push('hold then release in hand: no execution, held card remains selected');b.window.close();
}
for(const [name,replay]of Object.entries(fixtures.cases)){
  const a=open(old.build(replay)),b=open(build(replay),true);eq(a,b);
  const s=b.window.__inspect().s,cards=s.actors.P.hand.map(id=>s.cards[id]),match=cards.find(c=>s.field[c.attr]);
  if(match){const before=state(b);drag(b,match.id);assert.equal(state(b),before,'match executed without confirmation');if(match.kind==='attack'){assert(!query(b,'#cw-use').disabled,'retained legal target was lost');assert(query(b,'#cw-card-targets [aria-pressed="true"]'));}checks.push(name+': match stages only');}
  query(b,'[data-open="reference"]').click();const before=state(b);query(b,'#cw-close').click();assert.equal(state(b),before);
  if(name==='guard_end'){assert(/防御終了|防御を更新/.test(query(b,'#cw-prediction').textContent)||query(b,'#cw-use').disabled);}
  a.window.close();b.window.close();
}
{
  const b=open(build(),true),before=state(b),root=query(b,'#cw-playtable');
  query(b,`[data-card="${first.card_id}"]`).click();
  assert(!query(b,'#cw-drawer').hidden);assert.equal(query(b,'#cw-drawer').dataset.window,'card');
  assert(query(b,'#cw-card-info').textContent.includes('主効果'));assert.equal(state(b),before);
  const next=b.window.__inspect().s.actors.P.hand.find(id=>id!==first.card_id);
  query(b,`[data-card="${next}"]`).click();assert.equal(b.window.__ui().selected,next);assert(!query(b,'#cw-drawer').hidden);
  root.click();assert(query(b,'#cw-drawer').hidden);assert.equal(b.window.__ui().selected,next);
  query(b,'#cw-peek-setting').checked=false;query(b,`[data-card="${first.card_id}"]`).click();assert(query(b,'#cw-drawer').hidden);
  query(b,`[data-card="${first.card_id}"]`).click();assert(!query(b,'#cw-drawer').hidden);
  root.dispatchEvent(new b.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(query(b,'#cw-drawer').hidden);
  query(b,'#cw-peek-setting').checked=true;
  b.window.document.elementFromPoint=()=>root;
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');b.window.__tick(220);
  assert(query(b,'#cw-drawer').hidden,'hold opened inspection window');pointer(b,root,'pointercancel');assert.equal(state(b),before);
  checks.push('one tap opens full card/prediction; another card switches; outside/Esc close; hold stays drag-only; optional manual detail');b.window.close();
}
for(const name of ['reference','status','settings','result','objective','order']){
  const b=open(build(),true),before=state(b);choose(b,first);query(b,'#cw-close').click();
  query(b,`[data-open="${name}"]`).click();assert(!query(b,'#cw-drawer').hidden);
  query(b,'#cw-use').click();assert(query(b,'#cw-drawer').hidden);assert.equal(state(b),before,'outside click executed underlying action');
  query(b,`[data-open="${name}"]`).click();
  pointer(b,query(b,'#cw-playtable'),'pointerdown');b.window.__tick(1000);
  assert(query(b,'#cw-drawer').hidden);assert(query(b,'#cw-drag-ghost').hidden);assert.equal(state(b),before);
  checks.push(name+': outside closes without click-through or delayed hold');b.window.close();
}
{
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  const tap=id=>{const el=query(b,`[data-card="${id}"]`);pointer(b,el,'pointerdown');pointer(b,root,'pointerup');query(b,`[data-card="${id}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:1}));};
  tap(first.card_id);assert(!query(b,'#cw-drawer').hidden);
  tap(first.card_id);assert(query(b,'#cw-drawer').hidden,'same-card physical click did not close');
  assert.equal(b.window.__ui().selected,first.card_id,'closing cleared selection');
  tap(first.card_id);assert(!query(b,'#cw-drawer').hidden,'same-card click did not reopen');
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');pointer(b,root,'pointerup');query(b,`[data-card="${first.card_id}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:2}));assert(query(b,'#cw-drawer').hidden,'rapid second click failed to toggle');query(b,`[data-card="${first.card_id}"]`).click();
  assert.equal(query(b,'#cw-use').textContent,'場に出す');
  assert(!query(b,'#cw-show-card')&&!query(b,'#cw-cancel'));
  root.dispatchEvent(new b.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  root.dispatchEvent(new b.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(b.window.__ui().selected,first.card_id);
  assert.equal(state(b),before);checks.push('physical same-card clicks toggle detail and retain selection; no redundant detail or deselect controls');b.window.close();
}
for(const name of ['reference','status','result','objective','settings','order']){
  const b=open(build(),true),before=state(b),button=query(b,`[data-open="${name}"]`),popup=query(b,'#cw-drawer'),root=query(b,'#cw-playtable');
  const over=(node,relatedTarget=null,pointerType='mouse')=>pointer(b,node,'pointerover',{pointerType,relatedTarget});
  const out=(node,relatedTarget=null)=>pointer(b,node,'pointerout',{pointerType:'mouse',relatedTarget});
  over(button,null,'touch');b.window.__tick(500);assert(popup.hidden,'touch opened hover preview');
  const focused=b.window.document.activeElement;
  over(button);b.window.__tick(179);assert(popup.hidden);b.window.__tick(1);assert(!popup.hidden);assert.equal(b.window.__window().windowMode,'peek');assert.equal(b.window.document.activeElement,focused,'hover stole focus');assert(query(b,'#cw-backdrop').hidden);
  out(button,popup);over(popup,button);b.window.__tick(1000);assert(!popup.hidden,'preview closed while moving into it');
  out(popup,root);b.window.__tick(160);assert(popup.hidden,'peek failed to close on leaving');
  over(button);b.window.__tick(180);pointer(b,button,'pointerdown',{pointerType:'mouse'});button.click();assert.equal(b.window.__window().windowMode,'pinned');
  out(button,root);b.window.__tick(500);assert(!popup.hidden,'pinned window closed on leave');
  pointer(b,button,'pointerdown',{pointerType:'mouse'});button.click();assert(popup.hidden,'same opener did not close pinned window');
  button.click();assert(!popup.hidden,'click without hover failed');
  const other=query(b,`[data-open="${name==='result'?'objective':'result'}"]`);over(other);b.window.__tick(500);assert.equal(b.window.__window().openName,name,'hover replaced pinned content');other.click();assert.equal(b.window.__window().openName,other.dataset.open,'click failed to switch windows');
  root.dispatchEvent(new b.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  over(button);out(button,root);b.window.__tick(1000);assert(popup.hidden,'cancelled hover timer opened a window');
  assert.equal(state(b),before);checks.push(name+': mouse preview / gap transfer / leave dismissal / pin / retoggle / direct switch; no touch hover or game mutation');b.window.close();
}
{
  const b=open(build(),true),before=state(b);assert.equal(b.window.__ui().target,'V0','baseline default target not restored');
  choose(b,first);b.window.__drawRelations();assert(!query(b,'#cw-relations').hasAttribute('hidden'));
  query(b,'#cw-diagram-setting').checked=false;query(b,'#cw-diagram-setting').dispatchEvent(new b.window.Event('change'));assert(query(b,'#cw-relations').hasAttribute('hidden'));assert(!query(b,'.cw-number-flow,.cw-card-flow'));assert(query(b,'#cw-prediction').textContent.includes('場に出す'));
  assert.equal(state(b),before);checks.push('baseline initial target and optional board connections; full text remains reachable');b.window.close();
}
{
  const b=open(build(),true),before=state(b);choose(b,first);query(b,'#cw-use').click();
  const after=state(b);assert.notEqual(after,before);
  assert(query(b,'#cw-history').textContent.includes('あなた：'));
  b.window.__tick(850);assert(query(b,'#cw-event-feed').children.length>0);
  assert(query(b,'#cw-event-feed').children.length<=6);
  const saved=query(b,'#cw-history').textContent;
  b.window.__tick(30000);assert.equal(query(b,'#cw-event-feed').children.length,0);
  assert.equal(query(b,'#cw-history').textContent,saved);assert.equal(state(b),after,'feed advanced game');
  query(b,'[data-open="result"]').click();assert.equal(query(b,'#cw-drawer-title').textContent,'履歴');
  assert(!query(b,'#cw-history').closest('[hidden]'));
  checks.push('transient chronological feed is bounded; full history retained after expiry; opening history changes no game state');b.window.close();
}
{
  const b=open(build(),true),ids=b.window.__inspect().s.actors.P.hand;
  let viewport=800,offset=0;
  const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top});
  b.window.HTMLElement.prototype.getBoundingClientRect=function(){
    if(this.id==='cw-playtable')return rect(0,0,viewport,648);
    if(this.classList.contains('cw-world'))return rect(11,11,viewport-22,184);
    if(this.id==='cw-action-track')return rect(20,527,viewport-40,40);
    if(this.id==='cw-action-anchor')return rect(0,0,Math.min(164,viewport-40),40);
    if(this.id==='cw-hand')return rect(20,387,viewport-40,136);
    if(this.id==='cw-drawer')return rect(0,0,Math.min(840,viewport-32),Number.parseFloat(this.style.height)||360);
    if(this.dataset.card)return rect(40+ids.indexOf(this.dataset.card)*250-offset,389,184,129);
    return rect(0,0,0,0);
  };
  query(b,`[data-card="${ids[0]}"]`).click();const left=Number.parseFloat(query(b,'#cw-action-anchor').style.left);
  query(b,`[data-card="${ids[2]}"]`).click();const right=Number.parseFloat(query(b,'#cw-action-anchor').style.left);
  assert(right>left);assert(right+164<=viewport-40,'action dock escaped right edge');
  const popup=query(b,'#cw-drawer');assert.equal(Number.parseFloat(popup.style.top)+Number.parseFloat(popup.style.height),379,'popup must stop above hand');
  assert.equal(Number.parseFloat(popup.style.top),16,'large card window must use the upper area');assert(Number.parseFloat(popup.style.height)>300);
  offset=1100;b.window.__layout();assert(query(b,'#cw-anchor-state').textContent.includes('左の画面外'));
  viewport=320;offset=0;b.window.__layout();const narrowLeft=Number.parseFloat(query(b,'#cw-action-anchor').style.left);assert(narrowLeft>=0&&narrowLeft+164<=280);
  const popupLeft=Number.parseFloat(query(b,'#cw-drawer').style.left);assert(popupLeft>=0&&popupLeft+288<=320);
  checks.push('supplied geometry: compact dock follows cards directly below hand, clamps edges, labels offscreen card, fits 320px; popup stays above hand');b.window.close();
}
{
  const b=open(build(),true);
  assert(!query(b,'.cw-decision'),'permanent decision panel must be removed');
  assert(query(b,'#cw-action-anchor').hidden);
  assert(query(b,'#cw-action-track').closest('.cw-hand-region'));
  assert(query(b,'#cw-self').closest('.cw-bottom'));
  for(const name of ['reference','result','settings'])assert(query(b,`[data-open="${name}"]`).closest('.cw-bottom'));
  assert.equal(query(b,'#cw-event-feed').closest('.cw-event-region').parentElement.id,'cw-playtable');
  assert(!query(b,'.cw-bottom #cw-event-feed'));
  choose(b,first);assert(!query(b,'#cw-action-anchor').hidden);assert(query(b,'#cw-gesture-hint').closest('[hidden]'));
  assert(!query(b,'#cw-prediction').closest('[hidden]'),'moved prediction summary must remain reachable');
  query(b,'#cw-use').click();assert(query(b,'#cw-action-anchor').hidden);
  checks.push('compact layout: menus and player status in slim bottom strip; transient feed overlays screen center; contextual hand controls and complete prediction retained');
  query(b,'[data-open="reference"]').click();assert.equal(query(b,'#cw-drawer').style.height,'','card window height leaked into full information window');b.window.close();
}
for(const [name,replay]of Object.entries(fixtures.cases)){
  const b=open(build(replay),true),s=b.window.__inspect().s;
  assert(query(b,'#cw-scene-base'));assert(query(b,'#cw-scene-environment'));
  const present=[...b.window.document.querySelectorAll('[data-environment]')].map(n=>n.dataset.environment);
  assert.deepEqual(present,['O','V0','V1'].filter(id=>s.actors[id]?.active));
  assert.equal(b.window.document.querySelectorAll('[data-art-kind="actors"]').length,Object.keys(s.actors).filter(id=>id!=='P'&&s.actors[id].active).length);
  assert([...b.window.document.querySelectorAll('[data-card]')].every(n=>n.querySelector('[data-art-kind="cards"]')));
  b.window.close();
}
checks.push('art slots beneath actor/card captions; terrain base plus active environment layers only');
{
  const b=open(build(fixtures.cases.guard_end),true),before=state(b),s=b.window.__inspect().s;
  const hand=s.actors.P.hand,card=s.cards[hand.find(id=>s.cards[id].kind==='attack'&&s.field[s.cards[id].attr])];
  const fields=[...b.window.document.querySelectorAll('[data-field-card]')].map(n=>n.dataset.fieldCard);
  choose(b,{card_id:card.id});
  const clickField=id=>{const node=query(b,`[data-field-card="${id}"]`);pointer(b,node,'pointerdown',{pointerType:'mouse'});node.click();};
  clickField(fields[0]);assert.equal(b.window.__window().openName,'field');
  assert.equal(b.window.__ui().selected,card.id);assert.equal(query(b,`[data-field-card="${fields[0]}"]`).getAttribute('aria-expanded'),'true');
  assert(query(b,'#cw-field-info').textContent.includes(s.cards[fields[0]].name));
  assert(query(b,'#cw-field-info').textContent.includes('主効果'));assert(query(b,'[data-panel="settings"]').textContent.includes('場札の期限は減りません'));
  clickField(fields[0]);assert(query(b,'#cw-drawer').hidden);
  clickField(fields[0]);clickField(fields[1]);assert(query(b,'#cw-field-info').textContent.includes(s.cards[fields[1]].name));
  const actorIds=[...b.window.document.querySelectorAll('[data-inspect-actor]')].map(n=>n.dataset.inspectActor);
  const clickActor=id=>{const node=query(b,`[data-inspect-actor="${id}"]`);pointer(b,node,'pointerdown',{pointerType:'mouse'});node.click();};
  clickActor('V0');assert.equal(b.window.__window().openName,'actor');assert.equal(b.window.__ui().target,'V0');
  const text=query(b,'#cw-actor-info').textContent;assert(text.includes('あなたを攻撃')&&text.includes('確認済み'));
  assert(!text.includes('後続'));assert(text.includes(`HP ${s.actors.V0.hp}/${s.actors.V0.max_hp}`));
  clickActor('V0');assert(query(b,'#cw-drawer').hidden);assert.equal(b.window.__ui().target,'V0');
  clickActor('V0');clickActor(actorIds[0]);assert.equal(b.window.__ui().target,actorIds[0]);
  query(b,`[data-card="${card.id}"]`).click();query(b,'#cw-card-targets [data-target="V0"]').click();
  assert.equal(b.window.__window().openName,'card','window target control opened actor detail');
  clickField(fields[0]);query(b,'#cw-use').click();assert(query(b,'#cw-drawer').hidden,'field outside click did not close');
  assert.equal(b.window.__ui().selected,card.id);assert.equal(state(b),before,'object inspection changed game/RNG/knowledge');
  checks.push('field and actor physical clicks open/switch/retoggle; field full effects; only current public actor info; hand selection retained; actor selects target; internal target stays in card detail; no outside execution');
  b.window.close();
}
for(const scenario of ['place','attack','guard']){
  const b=open(build(scenario==='place'?undefined:fixtures.cases.guard_end),true),before=state(b),s=b.window.__inspect().s;
  const ids=s.actors.P.hand,c=s.cards[ids.find(id=>scenario==='place'?!s.field[s.cards[id].attr]:s.cards[id].kind===scenario&&s.field[s.cards[id].attr])];
  let handOffset=0,fieldOffset=0,actorOffset=0,viewport=900;
  const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top});
  b.window.HTMLElement.prototype.getBoundingClientRect=function(){
    if(this.id==='cw-playtable')return rect(0,0,viewport,648);
    if(this.id==='cw-actors')return rect(20,60,viewport-40,120);
    if(this.id==='cw-field')return rect(20,230,viewport-40,140);
    if(this.id==='cw-hand')return rect(20,395,viewport-40,140);
    if(this.id==='cw-action-track')return rect(20,537,viewport-40,40);
    if(this.classList.contains('cw-footer-state'))return rect(20,610,600,32);
    if(this.id==='cw-self')return rect(20,610,280,32);
    if(this.dataset.card)return rect(40+ids.indexOf(this.dataset.card)*220-handOffset,395,184,140);
    if(this.dataset.attr)return rect(40+[...this.parentElement.children].indexOf(this)*210-fieldOffset,230,184,140);
    if(this.dataset.inspectActor)return rect(80+[...this.parentElement.children].indexOf(this)*210-actorOffset,60,184,120);
    return rect(0,0,0,0);
  };
  b.window.SVGElement.prototype.getBoundingClientRect=function(){return rect(0,0,viewport,648);};
  query(b,`[data-card="${c.id}"]`).click();b.window.__drawRelations();
  const svg=query(b,'#cw-relations'),links=()=>[...svg.querySelectorAll('[data-link]')],path=()=>svg.querySelector('[data-link="hand-field"]').getAttribute('d');
  assert.equal(links().length,scenario==='place'?1:2);assert.equal(svg.querySelectorAll('[data-node]').length,scenario==='place'?2:3);
  assert.equal(svg.dataset.mode,scenario);assert.equal(svg.dataset.target,scenario==='place'?'':scenario==='guard'?'P':'V0');
  assert(!query(b,'#cw-drawer #cw-relations'),'connectors rendered inside detail window');
  const previous=path();query(b,`[data-card="${c.id}"]`).click();assert(query(b,'#cw-drawer').hidden);assert.equal(path(),previous,'closing detail lost route');
  handOffset=15;query(b,'#cw-hand').dispatchEvent(new b.window.Event('scroll'));assert.notEqual(path(),previous,'hand movement not tracked');
  const afterHand=path();fieldOffset=10;query(b,'#cw-field').dispatchEvent(new b.window.Event('scroll'));assert.notEqual(path(),afterHand,'field movement not tracked');
  if(scenario==='attack'){
    const oldTarget=svg.querySelector('[data-link="field-target"]').getAttribute('d');
    actorOffset=12;query(b,'#cw-actors').dispatchEvent(new b.window.Event('scroll'));assert.notEqual(svg.querySelector('[data-link="field-target"]').getAttribute('d'),oldTarget,'actor movement not tracked');
    query(b,'[data-inspect-actor="O"]').click();assert.equal(svg.dataset.target,'O');
    const targetRect=query(b,'[data-inspect-actor="O"]').getBoundingClientRect();
    assert(svg.querySelector('[data-link="field-target"]').getAttribute('d').endsWith(`${targetRect.left+targetRect.width/2} ${targetRect.bottom-3}`),'target endpoint not on actual actor');
  }
  handOffset=2000;query(b,'#cw-hand').dispatchEvent(new b.window.Event('scroll'));assert(!svg.querySelector('[data-link="hand-field"]'),'offscreen card falsely attached to another card');
  handOffset=0;viewport=640;b.window.__layout();assert.equal(svg.getAttribute('viewBox'),'0 0 640 648','resize did not update coordinates');
  query(b,'#cw-diagram-setting').checked=false;query(b,'#cw-diagram-setting').dispatchEvent(new b.window.Event('change'));assert(svg.hasAttribute('hidden'));assert.equal(links().length,0);
  assert.equal(state(b),before,'drawing/inspection changed game');
  query(b,'#cw-diagram-setting').checked=true;b.window.__start();assert(svg.hasAttribute('hidden'),'restart retained stale route');
  checks.push(scenario+': actual-object connectors with supplied rectangles; close retains route, scroll/resize follow, offscreen endpoints omitted, setting/restart clear; game unchanged');
  b.window.close();
}
for(const finish of ['release','escape','pointercancel','lostpointercapture','blur','early-scroll']){
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b),ids=b.window.__inspect().s.actors.P.hand;
  query(b,`[data-card="${ids[0]}"]`).click();query(b,`[data-card="${ids[0]}"]`).click();
  b.window.document.elementFromPoint=()=>root;
  pointer(b,query(b,`[data-card="${ids[1]}"]`),'pointerdown');
  if(finish==='early-scroll'){pointer(b,root,'pointermove',{clientX:60});b.window.__tick(500);pointer(b,root,'pointerup',{clientX:60});}
  else{
    b.window.__tick(220);assert.equal(b.window.__ui().selected,ids[1]);
    if(finish==='release')pointer(b,root,'pointerup');
    else if(finish==='escape')root.dispatchEvent(new b.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    else if(finish==='blur')b.window.dispatchEvent(new b.window.Event('blur'));
    else pointer(b,root,finish);
  }
  assert.equal(b.window.__ui().selected,ids[finish==='early-scroll'?0:1],'release/cancel unexpectedly restored old selection');
  assert(query(b,'#cw-drag-ghost').hidden);assert(query(b,'#cw-drawer').hidden);assert.equal(state(b),before);
  checks.push(finish+': previous selection changes only when hold starts; no restoration after hold and no game action');b.window.close();
}
for(const ghostHeight of [76,116]){
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
  b.window.HTMLElement.prototype.getBoundingClientRect=function(){
    if(this.id==='cw-playtable')return rect(0,0,1024,576);
    if(this.id==='cw-drag-ghost')return rect(parseFloat(this.style.left)||0,parseFloat(this.style.top)||0,180,ghostHeight);
    return rect(0,0,0,0);
  };
  b.window.document.elementFromPoint=()=>root;
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown',{pointerType:'mouse',clientX:400,clientY:400});b.window.__tick(220);
  const ghost=query(b,'#cw-drag-ghost');assert.equal(ghost.getBoundingClientRect().bottom,406,'pointer must touch ghost at hold origin');
  for(const [x,y]of [[250,210],[1,1],[1023,575]]){
    pointer(b,root,'pointermove',{pointerType:'mouse',clientX:x,clientY:y});const r=ghost.getBoundingClientRect();
    assert(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom,'pointer detached from held card');
    assert(r.left>=0&&r.top>=0&&r.right<=1024&&r.bottom<=576,'held card escaped frame');
  }
  pointer(b,root,'pointercancel');assert.equal(state(b),before);
  checks.push('held height '+ghostHeight+': pointer touches measured card at hold origin, follows movement and stays connected at edges');b.window.close();
}
for(const [width,height,worldBottom,boardTop,boardBottom,handTop,footerTop]of [[1024,576,194,200,338,344,533],[900,506.25,151,157,267,273,463],[320,512,151,157,267,273,461]]){
  const b=open(build(fixtures.cases.guard_end),true),root=query(b,'#cw-playtable'),before=state(b),popup=query(b,'#cw-drawer');
  let naturalHeight=160,fieldOffset=0;
  const rect=(left,top,w,h)=>({left,top,width:w,height:h,right:left+w,bottom:top+h});
  b.window.HTMLElement.prototype.getBoundingClientRect=function(){
    if(this.id==='cw-playtable')return rect(0,0,width,height);
    if(this.classList.contains('cw-world'))return rect(11,11,width-22,worldBottom-11);
    if(this.classList.contains('cw-board'))return rect(11,boardTop,width-22,boardBottom-boardTop);
    if(this.classList.contains('cw-bottom'))return rect(11,footerTop,width-22,32);
    if(this.classList.contains('cw-order-strip'))return rect(16,16,160,32);
    if(this.id==='cw-hand')return rect(16,handTop,width-32,110);
    if(this.id==='cw-field')return rect(16,boardTop+16,width-32,boardBottom-boardTop-22);
    if(this.id==='cw-drawer')return rect(parseFloat(this.style.left)||0,parseFloat(this.style.top)||0,parseFloat(this.style.width)||420,parseFloat(this.style.height)||Math.min(naturalHeight,parseFloat(this.style.maxHeight)||height));
    if(this.dataset.fieldCard)return rect(80-fieldOffset,boardTop+20,172,80);
    if(this.dataset.inspectActor)return rect(80,50,208,100);
    if(this.dataset.open)return rect(width-150,footerTop,120,32);
    return rect(0,0,0,0);
  };
  const noOverlap=()=>{const r=popup.getBoundingClientRect();assert(r.bottom<=boardTop||r.top>=boardBottom,'field inspector covers field row');assert(r.left>=0&&r.right<=width&&r.top>=0&&r.bottom<=height);return r;};
  query(b,'[data-field-card]').click();assert.equal(popup.style.height,'','short field window received forced height');let r=noOverlap();assert.equal(r.height,160);
  naturalHeight=230;b.window.__layout();r=noOverlap();assert(r.height<=230);
  naturalHeight=700;b.window.__layout();r=noOverlap();assert(r.height<700,'long field content did not cap outside source row');
  fieldOffset=40;query(b,'#cw-field').dispatchEvent(new b.window.Event('scroll'));noOverlap();
  naturalHeight=160;query(b,'[data-inspect-actor="V0"]').click();r=popup.getBoundingClientRect();assert(r.top>=worldBottom,'actor inspector covers actor row');assert.equal(r.height,160);
  query(b,'[data-open="objective"]').click();r=popup.getBoundingClientRect();assert.equal(r.height,160,'short objective received maximum height');assert(r.bottom<footerTop);
  naturalHeight=700;query(b,'[data-open="result"]').click();r=popup.getBoundingClientRect();assert(r.bottom<footerTop&&r.top>=12,'history escaped available area');
  assert.equal(state(b),before);checks.push(width+'px supplied layout: natural short windows, field/actor row avoidance, long-content cap and source scroll following; no game mutation');b.window.close();
}
{
  const b=open(build(),true),before=state(b),root=query(b,'#cw-playtable');
  assert(!query(b,'#cw-restart')&&!query(b,'#cw-build')&&!query(b,'#cw-resources'));
  assert(query(b,'#cw-withdraw').closest('.cw-bottom'));
  assert(query(b,'#cw-withdraw').classList.contains('cw-withdraw'));
  assert(!root.textContent.includes('現在の手札・山札の内容を示すものではありません'));
  assert(!/持ち込み|補給/.test(query(b,'#cw-history').textContent));
  const conditions=[...b.window.document.querySelectorAll('[data-objective]')];
  assert.equal(conditions.length,2);assert(conditions[0].textContent.includes('大岩のHPを0にする')&&conditions[0].textContent.includes('未保護'));
  assert(conditions[1].textContent.includes('最初の環境のHPを0にする')&&conditions[1].textContent.includes('ここまでの獲得物を保護'));
  assert(!query(b,'#cw-objective').textContent.includes('後続'));
  for(const actor of b.window.document.querySelectorAll('[data-inspect-actor]'))assert(actor.querySelector('.cw-illustration svg[data-icon]'));
  query(b,'[data-open="reference"]').click();
  assert.equal(query(b,'#cw-drawer-title').textContent,'山札');assert.equal(query(b,'#cw-deck-title').textContent,'山札一覧');
  const catalogue=b.window.__catalogue(),cards=[...b.window.document.querySelectorAll('[data-catalogue]')];
  assert.equal(cards.length,catalogue.length);
  cards.forEach((n,i)=>{assert(n.querySelector('.cw-illustration svg'));assert.equal(n.querySelector('.cw-deck-number').textContent,String(catalogue[i].remaining));assert(!n.textContent.includes('主効果：'));});
  assert.equal(state(b),before);checks.push('public gallery: same catalogue counts and shared art, no prose per tile; bring/supply moved to history; distinct current objectives; direct cautionary withdrawal; obsolete restart/resource sections absent');b.window.close();
}
{
  const b=open(build(),true),before=state(b),firstCard=query(b,'[data-catalogue]');
  const over=(n,relatedTarget=null)=>pointer(b,n,'pointerover',{pointerType:'mouse',relatedTarget});
  const out=(n,relatedTarget=null)=>pointer(b,n,'pointerout',{pointerType:'mouse',relatedTarget});
  const menu=query(b,'[data-open="reference"]'),popup=query(b,'#cw-catalogue-peek');
  over(menu);b.window.__tick(180);assert(query(b,'#cw-window-state [data-icon="PinOff"]'));
  over(firstCard);b.window.__tick(180);assert(!popup.hidden);assert(query(b,'#cw-catalogue-state [data-icon="PinOff"]'));
  assert(query(b,'#cw-catalogue-info').textContent.includes('主効果'));
  out(firstCard,popup);over(popup,firstCard);b.window.__tick(500);assert(!popup.hidden&&!query(b,'#cw-drawer').hidden);
  firstCard.click();assert(query(b,'#cw-catalogue-state [data-icon="Pin"]'));assert(query(b,'#cw-window-state [data-icon="Pin"]'));
  assert.equal(query(b,'#cw-window-state').textContent,'');assert.equal(query(b,'#cw-window-state').getAttribute('role'),'img');
  out(popup);b.window.__tick(500);assert(!popup.hidden);
  firstCard.click();assert(popup.hidden);firstCard.click();assert(!popup.hidden);
  query(b,'#cw-playtable').dispatchEvent(new b.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(popup.hidden);assert(!query(b,'#cw-drawer').hidden);
  firstCard.click();query(b,'#cw-drawer-title').click();assert(popup.hidden&&!query(b,'#cw-drawer').hidden);
  firstCard.click();query(b,'#cw-playtable').click();assert(popup.hidden&&query(b,'#cw-drawer').hidden);
  assert.equal(state(b),before);assert.equal(b.window.__ui().selected,null);
  checks.push('gallery hover / leave grace / click pin / repeated click toggle / Escape / outside dismissal; pin glyphs without status prose; no game or hand-selection changes');b.window.close();
}
{
  const a=open(old.build()),b=open(build(),true),before=state(b),root=query(b,'#cw-playtable');
  query(b,`[data-card="${first.card_id}"]`).click();const use=query(b,'#cw-use');assert.equal(use.textContent,'場に出す');
  pointer(b,use,'pointerenter',{pointerType:'touch'});assert(query(b,'#cw-drag-ghost').hidden);
  pointer(b,use,'pointerenter',{pointerType:'mouse'});
  assert(!query(b,'#cw-drag-ghost').hidden);assert.equal(query(b,'#cw-drop-zone').dataset.drag,'true');assert.equal(query(b,`[data-hand-id="${first.card_id}"]`).dataset.dragging,'true');
  const visual=query(b,'#cw-drag-ghost').innerHTML;assert.equal(state(b),before);
  pointer(b,use,'pointerleave',{pointerType:'mouse'});assert(query(b,'#cw-drag-ghost').hidden);assert.equal(query(b,'#cw-drop-zone').dataset.drag,'false');
  query(b,'#cw-close').click();b.window.document.elementFromPoint=()=>root;pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');b.window.__tick(220);assert.equal(query(b,'#cw-drag-ghost').innerHTML,visual);pointer(b,root,'pointercancel');
  pointer(b,use,'pointerenter',{pointerType:'mouse'});assert(!query(b,'#cw-drag-ghost').hidden);use.click();choose(a,first);query(a,'#cw-use').click();eq(a,b);assert(query(b,'#cw-drag-ghost').hidden);
  checks.push('execution hover mirrors hold ghost and field/hand emphasis; touch requires no hover; leave clears; hover does not execute; click executes exactly once');a.window.close();b.window.close();
}
{
  const a=open(old.build()),b=open(build(),true),initial=state(b);
  query(b,'[data-open="settings"]').click();query(a,'#cw-withdraw').click();query(b,'#cw-withdraw').click();eq(a,b);
  assert.equal(b.window.__window().openName,'return');assert(!query(b,'#cw-reenter').disabled);assert(query(b,'#cw-outcome').textContent.includes('撤退'));assert.equal(query(b,'#cw-loot').textContent,'なし');
  query(b,'#cw-reenter').click();assert.equal(state(b),initial);assert(query(b,'#cw-drawer').hidden);assert.equal(query(b,'#cw-withdraw').textContent,'撤退');
  checks.push('withdrawal works directly from pinned menu; exact fixed settlement; re-entry starts the same build/seed; no hidden carryover or in-play restart');a.window.close();b.window.close();
}
for(const entry of Object.values(fixtures.cases)){
  const b=open(build(entry),true),s=b.window.__inspect().s;
  if(!s.outcome)query(b,'#cw-withdraw').click();
  const settlement=b.window.__inspect().s.settlement;
  if(settlement){const loot=query(b,'#cw-loot');assert.equal(loot.children.length,settlement.kept.length+settlement.lost.length);assert.equal(loot.querySelectorAll('.cw-loss').length,settlement.lost.length);}
  b.window.close();
}
checks.push('return panel lists only actual kept/lost fixed-engine rewards across recorded fixtures');
{
  const css=fs.readFileSync(path.join(__dirname,'table.css'),'utf8'),rootRule=css.slice(0,css.indexOf('}'));
  assert(rootRule.includes('width:100%;max-width:100%;min-width:0;margin-inline:auto'));
  assert(rootRule.includes('aspect-ratio:16/9'));
  assert(css.includes('.cw-actor .cw-illustration{position:absolute;inset:0;min-height:0;width:100%;height:100%'));
  assert(css.includes('.cw-actor .cw-face-caption{flex-shrink:0'));
  checks.push('source constraints: explicit bounded centered frame; 16:9 baseline retained; actor art fills the opponent region behind caption (not a browser rendering assertion)');
}

{
  const b=open(build(),true),before=state(b),root=query(b,'#cw-playtable'),ghost=query(b,'#cw-drag-ghost');
  const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});let offset=0;
  b.window.HTMLElement.prototype.getBoundingClientRect=function(){if(this.id==='cw-playtable')return rect(70,20,1024,576);if(this.id==='cw-use')return rect(480+offset,500,164,40);if(this.id==='cw-drag-ghost')return rect(0,0,180,76);return rect(0,0,0,0);};
  choose(b,first);const selection=b.window.__ui().selected,target=b.window.__ui().target,use=query(b,'#cw-use');assert(!query(b,'#cw-drawer').hidden);
  pointer(b,use,'pointerenter',{pointerType:'mouse',clientX:490,clientY:510});assert(query(b,'#cw-drawer').hidden,'execution hover must close hand inspector');
  assert.equal(ghost.style.left,'402px');assert.equal(ghost.style.top,'398px');
  pointer(b,use,'pointermove',{pointerType:'mouse',clientX:620,clientY:537});assert.equal(ghost.style.left,'402px');assert.equal(ghost.style.top,'398px','hover ghost followed mouse instead of button');
  offset=90;b.window.__layout();assert.equal(ghost.style.left,'492px');assert.equal(ghost.style.top,'398px','resizing moved preview away from button');
  pointer(b,use,'pointerleave',{pointerType:'mouse'});assert(ghost.hidden&&query(b,'#cw-drawer').hidden,'leave reopened inspector');assert.equal(b.window.__ui().selected,selection);assert.equal(b.window.__ui().target,target);assert.equal(state(b),before);
  query(b,`[data-card="${selection}"]`).click();assert(!query(b,'#cw-drawer').hidden,'same card no longer reopens inspector');
  checks.push('hover closes inspector without clearing selection/target; ghost stays 6px above button despite cursor movement, follows layout, and leave does not reopen');b.window.close();
}
{
  const b=open(build(),true),before=state(b);choose(b,first);
  const panel=query(b,'[data-panel="card"]'),text=panel.textContent;
  assert.equal((text.match(/攻撃／防御/g)||[]).length,1);assert.equal((text.match(/命中／回避/g)||[]).length,1);
  assert(!query(b,'#cw-brief'));assert(query(b,'#cw-calculation').hidden);assert.equal(query(b,'#cw-prediction-detail').textContent,'');
  assert(!query(b,'#cw-prediction').textContent.includes('攻撃／防御'));
  assert(!query(b,'#cw-card-info').textContent.includes('自分が1回行動'));
  query(b,'[data-open="settings"]').click();assert(query(b,'[data-panel="settings"]').textContent.includes('場札の期限は減りません'));
  query(b,'[data-open="status"]').click();assert.equal(query(b,'#cw-drawer-title').textContent,'状況');assert(!query(b,'#cw-actor-details').closest('[hidden]'));
  query(b,'[data-open="reference"]').click();assert(query(b,'#cw-actor-details').closest('[hidden]'));assert(!query(b,'[data-panel="reference"]').textContent.includes('状況'));
  assert.equal(state(b),before);checks.push('placement detail states own field modifiers once; no duplicate prose summary or empty calculation section; shared rules remain in settings; status has independent menu and panel');b.window.close();
}
{
  const b=open(build(),true),root=query(b,'#cw-playtable');b.window.document.elementFromPoint=()=>root;
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');b.window.__tick(220);
  assert.equal(query(b,'#cw-notice').textContent,'場で離すと設置');pointer(b,root,'pointercancel');
  checks.push('hold instruction omits redundant grabbed announcement and retains the actual drop outcome');b.window.close();
}

for(const scenario of ['place','match']){
  const b=open(build(scenario==='match'?fixtures.cases.guard_end:undefined),true),before=state(b),s=b.window.__inspect().s;
  const c=s.actors.P.hand.map(id=>s.cards[id]).find(c=>Boolean(s.field[c.attr])===(scenario==='match'));
  assert(c,'missing '+scenario+' fixture');query(b,`[data-card="${c.id}"]`).click();
  const use=query(b,'#cw-use'),ghost=query(b,'#cw-drag-ghost');
  pointer(b,use,'pointerenter',{pointerType:'mouse'});assert.equal(ghost.dataset.mode,scenario);assert(query(b,'#cw-drawer').hidden);
  if(scenario==='place'){
    assert(ghost.textContent.includes('一致補正'));
    assert(ghost.textContent.includes('攻撃／防御 '+(c.field_power>0?'+':'')+c.field_power));
    assert(ghost.textContent.includes('命中／回避 '+(c.field_hit>0?'+':'')+c.field_hit));
  }else assert(!ghost.textContent.includes('一致補正'));
  const contents=ghost.innerHTML;pointer(b,use,'pointerleave',{pointerType:'mouse'});
  b.window.document.elementFromPoint=()=>query(b,'#cw-playtable');pointer(b,query(b,`[data-card="${c.id}"]`),'pointerdown');b.window.__tick(220);
  assert.equal(ghost.innerHTML,contents);assert.equal(ghost.dataset.mode,scenario);assert.equal(state(b),before);
  pointer(b,query(b,'#cw-playtable'),'pointercancel');checks.push(scenario+': hold and execution hover share field contribution for placement / primary effect for matching; no game change');b.window.close();
}
{
  const b=open(build(),true),before=state(b);query(b,'[data-open="order"]').click();
  assert.equal(query(b,'[data-panel="order"]').querySelectorAll('p').length,0);
  assert.deepEqual([...query(b,'#cw-queue').querySelectorAll('thead th')].map(n=>n.textContent),['次回','待ち時間','時刻']);
  assert.equal(query(b,'.cw-order-tie').textContent,'同時：環境 → あなた → 敵');assert.equal(state(b),before);
  checks.push('action order uses short column labels and tie notation; no explanatory paragraphs');b.window.close();
}
{
  const b=open(build(),true),before=state(b),feed=query(b,'#cw-event-feed'),saved=query(b,'#cw-history').innerHTML;
  b.window.__resetEvents();const rows=Array.from({length:10},(_,i)=>({id:1000+i,time:i,text:'出来事 '+i}));
  b.window.__enqueueEvents(rows);const oldest=feed.lastElementChild;assert.equal(oldest.dataset.eventId,'1000');assert.equal(oldest.style.bottom,'0px');
  b.window.__tick(260);assert.equal(feed.firstElementChild.dataset.eventId,'1001');assert.equal(oldest.style.bottom,'0px');
  const second=feed.firstElementChild;assert.equal(second.style.bottom,'26px');
  b.window.__tick(1040);assert.equal(feed.children.length,6);assert.equal(oldest.dataset.fading,'true');assert(oldest.isConnected);
  const seen=new Set([...feed.children].map(n=>n.dataset.eventId));
  b.window.__tick(1499);assert(oldest.isConnected);assert.equal(second.style.bottom,'26px');
  b.window.__tick(1);assert(!oldest.isConnected);assert.equal(second.style.bottom,'0px');assert.equal(feed.lastElementChild,second);assert.equal(feed.firstElementChild.dataset.eventId,'1006');
  for(let i=0;i<70;i++){for(const node of feed.children)seen.add(node.dataset.eventId);b.window.__tick(260);assert(feed.children.length<=6);}
  assert.equal(seen.size,10,'burst lost pending events');assert.equal(feed.children.length,0);assert.equal(query(b,'#cw-history').innerHTML,saved);assert.equal(state(b),before);
  checks.push('10-event burst: newest above oldest fixed bottom; individual fade then one-row downward shift; six visible, all pending events delivered, no state mutation');b.window.close();
}
{
  const b=open(build(),true),feed=query(b,'#cw-event-feed');b.window.__resetEvents();
  b.window.__enqueueEvents([{id:900,time:0,text:'旧い出来事'}]);b.window.__tick(1200);
  b.window.__enqueueEvents([{id:901,time:1,text:'新しい出来事'}]);b.window.__tick(100);
  assert.equal(feed.lastElementChild.dataset.fading,'true','new action reset old lifetime');assert(!feed.firstElementChild.dataset.fading);
  b.window.__start();const after=state(b),initialHistory=query(b,'#cw-history').innerHTML;b.window.__tick(30000);assert.equal(feed.children.length,0);assert.equal(query(b,'#cw-history').innerHTML,initialHistory);assert(!query(b,'#cw-history').textContent.includes('出来事'));assert.equal(state(b),after);
  checks.push('later batches do not prolong oldest line; reentry cancels all pending/fade/removal timers without stale history');b.window.close();
}
{
  const b=open(build(fixtures.runs[0]),true),events=b.window.__events(),rows=[...query(b,'#cw-history').children];
  assert(events.length>fixtures.runs[0].choices.length);
  assert(events.every((r,i)=>i===0||r.time>=events[i-1].time),'public consequences logged at wrong step/time');
  assert.equal(new Set(events.map(r=>r.id)).size,events.length);
  assert.deepEqual(rows.map(n=>Number(n.dataset.eventId)),Array.from(events,r=>r.id).reverse());
  assert(rows.every(n=>n.tagName==='LI'&&n.querySelectorAll('time').length===1&&n.querySelectorAll('span').length===1));
  assert(!query(b,'#cw-history-order')&&!query(b,'#cw-last')&&!query(b,'#cw-result-summary'));
  assert(!/持ち込み|補給|結果 ·|変化なし/.test(query(b,'#cw-history').textContent));
  const loss=events.findIndex(r=>r.text.includes('大岩の遮蔽：終了'));
  if(loss>=0)assert(events.slice(0,loss).some(r=>r.time===events[loss].time&&/ → (大岩|最初の環境) · HP −/.test(r.text)),'consequence before its action');
  checks.push('full fixed replay history: newest-first single rows, unique IDs, monotonic actual times, action precedes boundary consequences, no bring/supply or repeated summaries');b.window.close();
}
{
  const b=open(build(),true),before=state(b),s=b.window.__inspect().s;
  // Private retirement card IDs and NPC expiry are not public history. A played card becomes public.
  const publicState=JSON.parse(JSON.stringify(s));publicState.actors.P.hand=s.actors.P.hand.map(id=>s.cards[id]);publicState.field=Object.fromEntries(Object.entries(s.field).map(([a,id])=>[a,s.cards[id]]));
  const hidden=s.actors.V0.deck[0],visible=s.actors.P.hand[0];assert(hidden&&visible);
  const trace=[{type:'destroy',time:s.now,card_id:hidden},{type:'destroy',time:s.now,card_id:visible}];
  let rows=b.window.__stepEvents(publicState,publicState,trace);assert.equal(rows.length,1);assert.equal(rows[0].text,'消滅：'+s.cards[visible].name);
  trace.push({type:'action',time:s.now,actor:'V0',card_id:hidden,matched_id:null,mode:'place',expired:[]});
  rows=b.window.__stepEvents(publicState,publicState,trace);assert.equal(rows.length,3);assert.equal(state(b),before);
  checks.push('public-scope filter: private opponent retirement cards hidden; own visible and actually played cards report losses');b.window.close();
}

assert.deepEqual(errors,[]);
const result={test_id:'UI-R-002',ui_version:'0.14',verification:'DOM routing, controlled timer and supplied geometry only; no browser rendering or real pointer/touch measurement',engine_input_commit:fixtures.code_input_commit,actions,checks,errors,fragment_sha256:sha(build()),unverified:['real browser right edge, centered layout, art visibility and translucent-window readability','physical gallery hover paths and held-card pointer contact','human effort, errors and central queue readability / fade duration / backlog']};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
