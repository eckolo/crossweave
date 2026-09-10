/* Regression of the integrated flow. DOM checks do not measure real rendering. */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build}=require('./build.cjs'),{Session}=require('./session.js');
const AH=require('../expedition_choices.js'),AI=require('../reward_preparation.js'),source=require('../input.json');
const seeds=JSON.parse(cp.execFileSync('python3',[path.join(__dirname,'../reward_build_inputs.py')],{maxBuffer:8e6})).slice(0,8);
const html=build(),copy=AH.copy,hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const checks=[],runs=[],errors=[];let actions=0,predictions=0,restores=0;
const q=(d,s)=>d.window.document.querySelector(s),click=(d,s)=>{const el=q(d,s);assert(el,s);assert(!el.disabled,s+' disabled');el.click();};
function open(saved=null){
  const hook='window.__AJtest={get session(){return session},get selected(){return selected},get version(){return version},get target(){return target},requestCard,snapshot,renderJourney};';
  const instrumented=html.replace('  renderJourney();\n})();',hook+'\n  renderJourney();\n})();');assert.notEqual(instrumented,html);
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  return new JSDOM(instrumented,{runScripts:'dangerously',url:'https://crossweave.test',virtualConsole:vc,beforeParse(w){
    w.requestAnimationFrame=()=>0;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.scrollBy=function({left}){this.scrollLeft+=left;};
    if(saved)w.localStorage.setItem('crossweave-AJ1',typeof saved==='string'?saved:JSON.stringify(saved));
  }});
}
function api(d){return d.window.__AJtest;}
function snapshot(d){return copy(api(d).snapshot());}
function state(d){return copy(api(d).session.game.save());}
function oracle(d){const s=api(d).session;return new AI.Game(copy(s.bundle),state(d));}
function act(d,choice){
  const before=state(d),g=oracle(d),c=g.s.cards[choice.card_id],pred=g.predict(choice);
  click(d,`[data-card="${c.id}"]`);if(choice.target)click(d,`[data-target="${choice.target}"]`);
  assert.deepEqual(state(d),before,'selection must not advance time or RNG');
  if(pred.passives.length)for(const id of pred.passives)assert(q(d,'#cw-brief').textContent.includes(require('./session.js').skillText[id].name));
  if(c.origin!=='P')assert(q(d,`[data-card="${c.id}"]`).textContent.includes('借り札'));
  assert(!q(d,'#cw-prediction').textContent.includes('NaN'));assert(!q(d,'#cw-prediction-detail').textContent.includes('余剰 -'));
  g.step(choice);const row=g.trace.findLast(x=>x.type==='action'&&x.actor==='P');
  for(const key of ['actual_hp_loss','hp_restored','hit_gain','action_cost','mode'])assert.deepEqual(row[key],pred[key]);predictions++;
  g.advance();click(d,'#cw-use');assert.deepEqual(state(d),g.save(),'UI must match AH/AI state and RNG');
  assert.equal(api(d).selected,null,'no automatic next-card selection');
  assert(!q(d,'main').textContent.includes('undefined'));assert(!q(d,'main').textContent.includes('NaN'));actions++;
}
function finish(d,policy='progress_first'){
  while(!api(d).session.game.s.outcome){act(d,AH.choose(api(d).session.game,policy));if(actions%17===0){const saved=snapshot(d),other=open(saved);assert.deepEqual(state(other),state(d));assert.deepEqual(copy(api(other).session.data.profile),copy(api(d).session.data.profile));restores++;other.window.close();}}
  const s=api(d).session;runs.push({route:s.data.route,outcome:s.game.s.outcome,actions:s.game.s.actors.P.actions,learned:Object.keys(s.data.profile.learned),points:s.data.profile.points,unlocked:[...s.data.profile.unlocked]});
}
function pointer(d,node,type,props={}){const e=new d.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:100,clientY:300,...props});node.dispatchEvent(e);}
function drag(d,id,finish='inside',body=false){const root=q(d,'#cw-playtable');d.window.document.elementFromPoint=()=>finish==='inside'?q(d,'#cw-drop-zone'):root;pointer(d,q(d,`[${body?'data-card':'data-handle'}="${id}"]`),'pointerdown');pointer(d,root,'pointermove',{clientX:120,clientY:100});if(finish==='cancel')pointer(d,root,'pointercancel');else if(finish==='escape')root.dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));else pointer(d,root,'pointerup',{clientX:120,clientY:100});}
async function main(){
  // Natural progression: no awarded points, cards or clears at the start.
  const d=open();assert.equal(q(d,'[data-route="C"]').disabled,true);assert(q(d,'#aj-home-summary').textContent.includes('未使用 0pt'));
  const initial=copy(api(d).session.data);click(d,'[data-skill="PS02"]');assert(q(d,'#aj-depart').disabled);assert.deepEqual(copy(api(d).session.data),initial);click(d,'[data-skill="PS02"]');
  click(d,'[data-count="h"][data-delta="-1"]');assert(q(d,'#aj-depart').disabled);click(d,'[data-count="h"][data-delta="1"]');
  q(d,'#aj-intent').value='攻防の配分を確かめる';q(d,'#aj-intent').dispatchEvent(new d.window.Event('input'));click(d,'#aj-depart');finish(d);
  assert.equal(api(d).session.data.receipt.outcome,'clear');assert.deepEqual(copy(api(d).session.data.receipt.opened),['C']);assert.equal(api(d).session.data.profile.points,3);assert(!q(d,'#aj-return').hidden);
  const settled=snapshot(d),again=open(settled);assert.deepEqual(copy(api(again).session.data.profile),settled.session.profile);again.window.close();
  click(d,'#aj-go-home');assert(q(d,'[data-count="brace"]').textContent);assert.equal(q(d,'#aj-intent').value,'攻防の配分を確かめる');
  click(d,'[data-count="h"][data-delta="-1"]');click(d,'[data-count="brace"][data-delta="1"]');click(d,'[data-skill="PS02"]');click(d,'[data-route="C"]');assert(q(d,'#aj-diff').textContent.includes('踏ん張り'));click(d,'#aj-depart');finish(d);
  click(d,'#aj-go-home');const before=copy(api(d).session.data.profile);click(d,'[data-skill="PS02"]');click(d,'[data-skill="PS04"]');assert(q(d,'#aj-plan-points').textContent.includes('返還 2pt'));assert.deepEqual(copy(api(d).session.data.profile),before);click(d,'#aj-depart');assert.equal(api(d).session.data.profile.points,before.points);assert.deepEqual(Object.keys(api(d).session.data.profile.learned),['PS04']);
  const saved=snapshot(d),resumed=open(saved);assert.deepEqual(state(resumed),state(d));const choice=AH.choose(api(d).session.game,'progress_first');act(d,choice);act(resumed,choice);assert.deepEqual(state(resumed),state(d));resumed.window.close();d.window.close();
  checks.push('Natural A reward → unlock C and brace → change deck and learn PS02 → return → free PS04 respec; committed preparation remains unchanged until valid departure');
  // Independent B and defeat checks; C setup is an explicitly controlled fixture.
  const b=open();click(b,'[data-route="B"]');click(b,'#aj-depart');finish(b);assert(api(b).session.data.profile.unlocked.includes('stored'));b.window.close();
  const fixture=new Session(source,seeds);fixture.data.profile.points=2;fixture.data.profile.clears=['A'];
  const c=open({session:fixture.save()});click(c,'[data-route="C"]');click(c,'[data-skill="PS02"]');click(c,'#aj-depart');finish(c);assert.equal(api(c).session.data.receipt.outcome,'defeat');assert.equal(api(c).session.data.receipt.gained_points,0);assert(api(c).session.data.receipt.lost.length>0);assert(api(c).session.data.profile.knowledge.events.length>0);assert.deepEqual(Object.keys(api(c).session.data.profile.learned),['PS02']);c.window.close();
  checks.push('B reward unlock; C death loses protected current loot and retains knowledge / previous learned skills; settled reload does not duplicate rewards');
  // Partial protected withdrawal, retaining actor states across the first boundary.
  const w=open();click(w,'#aj-depart');while(!Object.values(api(w).session.game.s.rewards).some(r=>r.protected))act(w,AH.choose(api(w).session.game,'progress_first'));
  const prior=state(w);assert(api(w).session.game.s.actors.P.actions>0);click(w,'#cw-withdraw');assert.equal(api(w).session.data.profile.points,1);assert.equal(api(w).session.data.receipt.outcome,'withdrawal');assert.equal(api(w).session.game.s.actors.P.hp,prior.state.actors.P.hp);w.window.close();
  checks.push('First-boundary actor state persists; voluntary withdrawal banks only protected loot');
  // All four passive candidates: isolated fixture for prediction, cost and input routing.
  const rich=new Session(source,seeds);rich.data.profile.points=8;rich.data.profile.clears=['A'];rich.depart('B',rich.data.counts,['PS01','PS02','PS03','PS04']);
  const seedSave={session:rich.save()},r=open(seedSave);for(let i=0;i<8&&!api(r).session.game.s.outcome;i++)act(r,AH.choose(api(r).session.game,'side_first'));r.window.close();
  const place=rich.game.public().actors.P.hand.find(c=>!rich.game.s.field[c.attr]&&!rich.game.public().actors.P.hand.some(x=>x.id!==c.id&&x.remaining===1&&(x.consume_on_recover||x.doomed||x.birth==='filler')));assert(place);
  const charged=copy(seedSave);charged.session.game.state.ah.pending.after_guard=true;const discount=open(charged),discountGame=api(discount).session.game,expectedCost=discountGame.cost(place.type,false)-2;click(discount,`[data-card="${place.id}"]`);assert(q(discount,'#cw-brief').textContent.includes('コスト '+expectedCost));assert(q(discount,'#cw-prediction-detail').textContent.includes('時刻 '+(discountGame.s.now+expectedCost)));act(discount,{card_id:place.id,target:null});discount.window.close();
  for(const method of ['quick','drag','confirm']){const x=open(seedSave),ref=oracle(x);ref.step({card_id:place.id,target:null});ref.advance();if(method==='quick')click(x,`[data-quick="${place.id}"]`);if(method==='drag')drag(x,place.id);if(method==='confirm'){q(x,'#cw-quick-setting').checked=false;const before=state(x);click(x,`[data-quick="${place.id}"]`);assert.deepEqual(state(x),before);click(x,'#cw-use');}assert.deepEqual(state(x),ref.save());x.window.close();}
  for(const how of ['outside','cancel','escape','touchbody']){const x=open(seedSave),before=state(x);drag(x,place.id,how==='touchbody'?'inside':how,how==='touchbody');assert.deepEqual(state(x),before);x.window.close();}
  const stale=open(seedSave),beforeStale=state(stale);api(stale).requestCard(place.id,api(stale).version-1);assert.deepEqual(state(stale),beforeStale);stale.window.close();
  const attack=rich.game.public().actors.P.hand.find(c=>c.kind==='attack'&&rich.game.s.field[c.attr]);assert(attack);const x=open(seedSave),beforeMatch=state(x);click(x,`[data-quick="${attack.id}"]`);assert.deepEqual(state(x),beforeMatch);assert(q(x,'#cw-use').disabled);x.window.close();
  checks.push('Passive fixture predictions; quick / drag / confirm have identical effects; off-board / cancel / Esc / touch-body / stale input do not act; matched attacks require explicit target');
  // Invalid preparations and cutoff handling are isolated controller fixtures.
  const s=new Session(source,seeds);const baseline=s.save();assert.throws(()=>s.depart('C',s.data.counts,[]),/locked/);assert.deepEqual(s.save(),baseline);assert.throws(()=>s.depart('A',{...s.data.counts,f:3},[]));assert.deepEqual(s.save(),baseline);
  s.depart('A',s.data.counts,[]);assert.throws(()=>s.plan(s.data.counts,[]));s.game.s.actors.P.actions=160;s.game.s.outcome='cutoff';s.game.s.ready=false;s.withdraw();assert.equal(s.data.receipt.outcome,'withdrawal');
  checks.push('Invalid or locked departure is atomic; no respec during expedition; explicit withdrawal settles a trial cutoff');
  // Save payload, import replacement, corrupt recovery and draft persistence.
  const io=open(settled);const transferred=snapshot(io);Object.defineProperty(q(io,'#aj-import'),'files',{value:[{text:async()=>JSON.stringify(transferred)}],configurable:true});q(io,'#aj-import').dispatchEvent(new io.window.Event('change'));await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(snapshot(io).session,transferred.session);io.window.close();
  const bad=open('{');assert(!q(bad,'#aj-recovery').hidden);assert(q(bad,'#aj-depart').disabled);assert.equal(bad.window.localStorage.getItem('crossweave-AJ1'),'{');bad.window.close();
  const draftDom=open();click(draftDom,'[data-count="h"][data-delta="-1"]');const draftReload=open(snapshot(draftDom));assert(q(draftReload,'#aj-depart').disabled);assert(q(draftReload,'#aj-deck-total').textContent.includes('11/12'));draftReload.window.close();draftDom.window.close();
  checks.push('Save JSON import, invalid draft reload, and corrupt autosave recovery without overwrite');
  assert.deepEqual(errors,[]);
  const result={trial:'AJ1',checks,actions,predictions,restores,runs,dom_errors:errors,html_sha256:hash(html),verification_scope:'Node controller and jsdom DOM; fixtures are automated comparisons, not human play',unverified:['real browser rendering and viewport geometry','real pointer capture and touch scrolling','download / file picker on real devices','human construction intent, effort and retry satisfaction']};
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
