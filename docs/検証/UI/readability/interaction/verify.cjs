// DOM input routing and fixed-state equivalence. This is not browser geometry QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build,sha}=require('./build.cjs'),old=require('../build.cjs'),fixtures=require('../fixtures.json');
const errors=[];let actions=0;const checks=[];
function open(html,modern=false){
  const hook='window.__inspect=()=>JSON.parse(JSON.stringify({s:game.s,memory:game.memory,rng:Object.fromEntries(Object.entries(game.rng).map(([k,v])=>[k,v.state()]))}));';
  html=html.replace('  function render(){','  function render(){'+hook+(modern?'window.__ui=()=>({version,selected,target});window.__request=requestCard;':''));
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  return new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.scrollBy=function({left}){this.scrollLeft+=left;};w.matchMedia=()=>({matches:true});}});
}
const state=d=>JSON.stringify(d.window.__inspect());
const eq=(a,b)=>assert.equal(state(a),state(b),'state / RNG / memory differ');
const query=(d,s)=>d.window.document.querySelector(s);
function choose(d,choice){if(choice.target)query(d,`[data-target="${choice.target}"]`).click();query(d,`[data-card="${choice.card_id}"]`).click();}
function pointer(d,node,type,props={}){const e=new d.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:100,clientY:300,...props});node.dispatchEvent(e);}
function drag(d,id,finish='inside',pointerType='touch'){
  const root=query(d,'#cw-playtable'),handle=query(d,`[data-card="${id}"]`);
  d.window.document.elementFromPoint=()=>finish==='inside'?query(d,'#cw-drop-zone'):root;
  pointer(d,handle,'pointerdown',{pointerType});pointer(d,root,'pointermove',{clientX:120,clientY:100,pointerType});
  if(finish==='cancel')pointer(d,root,'pointercancel');
  else if(finish==='escape')root.dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  else pointer(d,root,'pointerup',{clientX:120,clientY:100});
}
for(const run of fixtures.runs){
  const a=open(old.build()),b=open(build(),true);
  for(const d of [a,b]){query(d,'#cw-build').value=run.build;query(d,'#cw-restart').click();}
  eq(a,b);
  for(const choice of run.choices){const before=state(b);choose(a,choice);choose(b,choice);assert.equal(state(b),before,'selection mutated game');assert(!query(b,'#cw-use').disabled,'legal action disabled');query(a,'#cw-use').click();query(b,'#cw-use').click();eq(a,b);assert.equal(b.window.__ui().selected,null,'new hand auto-selected');assert(query(b,'#cw-use').disabled,'execution remains armed');actions++;}
  for(const d of [a,b])query(d,'#cw-withdraw').click();eq(a,b);
  a.window.close();b.window.close();
}
checks.push('recorded choices: identical states / RNG / memory; no automatic next-card selection');
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
  if(pointerType!=='touch')assert.equal(hand.scrollLeft,140,'horizontal drag did not scroll');
  else assert.equal(hand.scrollLeft,100,'native touch scroll manually duplicated');
  pointer(b,root,'pointermove',{pointerType,clientX:60,clientY:100});
  pointer(b,root,'pointerup',{pointerType,clientX:60,clientY:100});
  query(b,`[data-card="${first.card_id}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(state(b),before);assert.equal(b.window.__ui().selected,null,'scroll produced selection');
  // A fresh physical tap clears click suppression, selects, and never executes.
  pointer(b,query(b,`[data-card="${first.card_id}"]`),'pointerdown',{pointerType});
  pointer(b,root,'pointerup',{pointerType,clientX:102,clientY:299});
  assert.equal(b.window.__ui().selected,first.card_id);assert.equal(state(b),before);
  checks.push(pointerType+': horizontal lock survives upward turn; no ghost click; next tap selects');b.window.close();
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
  pointer(b,root,'pointerup',{clientX:kind==='small-move'?104:125,clientY:kind==='small-move'?296:100});
  query(b,`[data-card="${first.card_id}"]`).dispatchEvent(new b.window.MouseEvent('click',{bubbles:true,detail:1}));
  assert.equal(state(b),before);assert.equal(b.window.__ui().selected,kind==='small-move'?first.card_id:null);
  checks.push(kind+': no execution');b.window.close();
}
for(const [name,replay]of Object.entries(fixtures.cases)){
  const a=open(old.build(replay)),b=open(build(replay),true);eq(a,b);
  const s=b.window.__inspect().s,cards=s.actors.P.hand.map(id=>s.cards[id]),match=cards.find(c=>s.field[c.attr]);
  if(match){const before=state(b);drag(b,match.id);assert.equal(state(b),before,'match executed without confirmation');if(match.kind==='attack'){assert(query(b,'#cw-use').disabled,'attack did not require explicit target');}checks.push(name+': match stages only');}
  query(b,'[data-open="reference"]').click();const before=state(b);query(b,'#cw-close').click();assert.equal(state(b),before);
  if(name==='guard_end'){assert(query(b,'#cw-brief').textContent.includes('防御終了')||query(b,'#cw-use').disabled);}
  a.window.close();b.window.close();
}
assert.deepEqual(errors,[]);
const result={test_id:'UI-R-002',ui_version:'0.2',verification:'DOM routing only; no browser rendering or real pointer/touch measurement',engine_input_commit:fixtures.code_input_commit,actions,checks,errors,fragment_sha256:sha(build()),unverified:['browser geometry and pointer capture','native touch-action angle classification, scrolling and zoom','human effort, errors and repetition time']};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
