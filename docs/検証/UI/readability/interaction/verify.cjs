// DOM input routing and fixed-state equivalence. This is not browser geometry QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build,sha}=require('./build.cjs'),old=require('../build.cjs'),fixtures=require('../fixtures.json');
const errors=[];let actions=0;const checks=[];
function open(html,modern=false){
  const hook='window.__inspect=()=>JSON.parse(JSON.stringify({s:game.s,memory:game.memory,rng:Object.fromEntries(Object.entries(game.rng).map(([k,v])=>[k,v.state()]))}));';
  html=html.replace('  function render(){','  function render(){'+hook+(modern?'window.__ui=()=>({version,selected,target});window.__request=requestCard;window.__layout=placeNearCard;window.__order=actionOrder;window.__window=()=>({openName,windowMode});window.__resolveOwn=choice=>{const g=new CWTerrain.Game(bundle);g.s=JSON.parse(JSON.stringify(game.s));g.play("P",choice);return JSON.parse(JSON.stringify(g.s));};':''));
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
  for(const d of [a,b]){query(d,'#cw-build').value=run.build;query(d,'#cw-restart').click();}
  eq(a,b);
  for(const choice of run.choices){const before=state(b);choose(a,choice);choose(b,choice);assert.equal(state(b),before,'selection mutated game');assert(!query(b,'#cw-use').disabled,'legal action disabled');const expected=b.window.__resolveOwn(choice),oldState=b.window.__inspect().s;for(const n of b.window.document.querySelectorAll('.cw-number-flow')){const label=n.firstElementChild.textContent,value=n.lastElementChild.textContent;const card=oldState.cards[choice.card_id],matched=oldState.field[card.attr];if(label==='HP')assert.equal(value,String(expected.actors[matched&&card.kind==='attack'?choice.target:'P'].hp),'HP diagram differs from immediate resolution');if(label==='会心')assert.equal(value,String(expected.actors.P.crit),'crit diagram differs from immediate resolution');if(label==='命中蓄積')assert.equal(value,String(expected.actors[choice.target].hit));if(label==='防御')assert.equal(value,String(expected.actors.P.guard.value));if(label==='次の自分')assert.equal(value,String(expected.actors.P.next_at));}assert.equal(state(b),before,'diagram resolution probe mutated live game');query(a,'#cw-use').click();query(b,'#cw-use').click();eq(a,b);const scheduled=b.window.__inspect().s;if(!scheduled.outcome)assert(scheduled.actors[b.window.__ui().target]?.active,'retirement left target unselected');assert.deepEqual([...b.window.document.querySelectorAll('[data-turn-actor]')].map(n=>n.dataset.turnActor).sort(),scheduled.outcome?[]:Object.keys(scheduled.actors).filter(id=>scheduled.actors[id].active&&scheduled.actors[id].acts).sort(),'scheduled participants did not follow state');assert.equal(b.window.__ui().selected,null,'new hand auto-selected');assert(query(b,'#cw-use').disabled,'execution remains armed');actions++;}
  for(const d of [a,b])query(d,'#cw-withdraw').click();eq(a,b);
  a.window.close();b.window.close();
}
checks.push('recorded choices: identical states / RNG / memory; numeric diagram matches immediate fixed-engine resolution; target retained/reassigned; no automatic next-card selection');
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
for(const finish of ['outside','cancel','escape']){const b=open(build(),true),before=state(b);drag(b,first.card_id,finish);assert.equal(state(b),before);assert.equal(b.window.__ui().selected,null);checks.push('drag '+finish+': no action');b.window.close();}
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
  if(finish==='restart')query(b,'#cw-restart').click();
  if(finish==='stale'){choose(b,first);query(b,'#cw-use').click();}
  const after=state(b);b.window.__tick(1000);assert(query(b,'#cw-drag-ghost').hidden,'late hold after '+finish);
  assert.equal(state(b),after);if(finish!=='stale')assert.equal(state(b),before);
  checks.push('pending hold '+finish+': timer cancelled, no delayed play');b.window.close();
}
{
  const b=open(build(),true),root=query(b,'#cw-playtable'),before=state(b);
  b.window.document.elementFromPoint=()=>root;pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown');b.window.__tick(220);
  pointer(b,root,'pointerup');b.window.__tick(1000);assert.equal(state(b),before);assert.equal(b.window.__ui().selected,null);
  checks.push('hold then release in hand: no execution, previous selection restored');b.window.close();
}
for(const [name,replay]of Object.entries(fixtures.cases)){
  const a=open(old.build(replay)),b=open(build(replay),true);eq(a,b);
  const s=b.window.__inspect().s,cards=s.actors.P.hand.map(id=>s.cards[id]),match=cards.find(c=>s.field[c.attr]);
  if(match){const before=state(b);drag(b,match.id);assert.equal(state(b),before,'match executed without confirmation');if(match.kind==='attack'){assert(!query(b,'#cw-use').disabled,'retained legal target was lost');assert(query(b,'#cw-card-targets [aria-pressed="true"]'));}checks.push(name+': match stages only');}
  query(b,'[data-open="reference"]').click();const before=state(b);query(b,'#cw-close').click();assert.equal(state(b),before);
  if(name==='guard_end'){assert(query(b,'#cw-brief').textContent.includes('防御終了')||query(b,'#cw-use').disabled);}
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
for(const name of ['reference','settings','result','objective','order']){
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
for(const name of ['reference','result','objective','settings','order']){
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
  choose(b,first);assert(query(b,'[data-forecast-mode="place"]'));
  query(b,'#cw-diagram-setting').checked=false;query(b,'#cw-diagram-setting').dispatchEvent(new b.window.Event('change'));assert(!query(b,'[data-forecast-mode]'));assert(query(b,'#cw-prediction').textContent.includes('場に出す'));
  assert.equal(state(b),before);checks.push('baseline initial target and optional numeric diagram; full text remains reachable');b.window.close();
}
{
  const b=open(build(),true),before=state(b);choose(b,first);query(b,'#cw-use').click();
  const after=state(b);assert.notEqual(after,before);
  assert(query(b,'#cw-history').textContent.includes('あなた：'));
  b.window.__tick(850);assert(query(b,'#cw-event-feed').children.length>0);
  assert(query(b,'#cw-event-feed').children.length<=2);
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
  assert(query(b,'#cw-event-feed').closest('.cw-board'));
  assert(!query(b,'.cw-bottom #cw-event-feed'));
  choose(b,first);assert(!query(b,'#cw-action-anchor').hidden);assert(query(b,'#cw-gesture-hint').closest('[hidden]'));
  assert(!query(b,'#cw-brief').closest('[hidden]'),'moved prediction summary must remain reachable');
  query(b,'#cw-use').click();assert(query(b,'#cw-action-anchor').hidden);
  checks.push('compact layout: menus and player status in slim bottom strip; transient feed overlays board; contextual hand controls and complete prediction retained');
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
assert.deepEqual(errors,[]);
const result={test_id:'UI-R-002',ui_version:'0.9',verification:'DOM routing, controlled timer and supplied geometry only; no browser rendering or real pointer/touch measurement',engine_input_commit:fixtures.code_input_commit,actions,checks,errors,fragment_sha256:sha(build()),unverified:['real browser large-window layout, hover travel, diagram density and slim strip readability','physical hold timing, manual touch scrolling and pinch zoom','human effort, errors and event-feed readability']};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
