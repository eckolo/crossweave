'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build}=require('./build.cjs'),{load}=require('./load.cjs'),selection=require('./selection.json');
const runtime=load(selection.variant),{AH,AI}=runtime,copy=AH.copy;
const html=build(),errors=[],checks=[],runs=[];let actions=0,restores=0;
const q=(d,s)=>d.window.document.querySelector(s),click=(d,s)=>{assert(q(d,s),s);assert(!q(d,s).disabled,s);q(d,s).click();};
function open(saved=null){
  const hook='window.__AMtest={get session(){return session},get selected(){return selected},get drag(){return drag},get version(){return version},snapshot,requestCard};';
  const instrumented=html.replace('  renderJourney();\n})();',hook+'\n  renderJourney();\n})();');assert.notEqual(html,instrumented);
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const d=new JSDOM(instrumented,{url:'https://crossweave.test',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
    w.requestAnimationFrame=()=>0;w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.HTMLElement.prototype.scrollBy=function({left}){this.scrollLeft+=left;};
    if(saved)w.localStorage.setItem('crossweave-AM1',JSON.stringify(saved));
  }});assert.deepEqual(errors,[]);return d;
}
const api=d=>d.window.__AMtest,state=d=>copy(api(d).session.game.save()),snap=d=>copy(api(d).snapshot());
function act(d,ch){
  const before=state(d),g=new AI.Game(copy(api(d).session.bundle),before),pred=g.predict(ch);
  click(d,`[data-card="${ch.card_id}"]`);if(ch.target)click(d,`[data-target="${ch.target}"]`);
  assert.deepEqual(state(d),before);assert(!q(d,'#cw-hand [data-quick]'));assert(!q(d,'#cw-hand [data-handle]'));
  if(pred.mode==='attack'){
    const text=q(d,'#cw-prediction').textContent;assert(text.includes('体勢 '+pred.posture_before));
    if(pred.hit_connected)assert(q(d,'#cw-prediction-detail').textContent.includes('体勢倍率 '+pred.posture_multiplier+'倍'));
  }
  g.step(ch);g.advance();click(d,'#cw-use');assert.deepEqual(state(d),g.save());
  assert(q(d,'#cw-self').textContent.includes('体勢 '));assert(!q(d,'main').textContent.includes('undefined'));assert(!q(d,'main').textContent.includes('NaN'));
  actions++;
  if(actions%23===0){const resumed=open(snap(d));assert.deepEqual(state(resumed),state(d));restores++;resumed.window.close();}
}
function finish(d){while(!api(d).session.game.s.outcome)act(d,AH.choose(api(d).session.game,'progress_first'));runs.push(copy(api(d).session.data.receipt));}
function pointer(d,node,type,props={}){const e=new d.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:100,clientY:300,...props});node.dispatchEvent(e);}
async function main(){
  const d=open();assert(q(d,'[data-route="C"]').disabled);click(d,'#aj-depart');
  const initial=snap(d);finish(d);assert.equal(api(d).session.data.receipt.outcome,'clear');
  click(d,'#aj-go-home');click(d,'[data-count="h"][data-delta="-1"]');click(d,'[data-count="brace"][data-delta="1"]');click(d,'[data-skill="PS02"]');click(d,'[data-route="C"]');click(d,'#aj-depart');finish(d);
  const settled=snap(d);const reload=open(settled);assert.deepEqual(copy(api(reload).session.data.profile),settled.session.profile);reload.window.close();
  click(d,'#aj-go-home');const points=api(d).session.data.profile.points;click(d,'[data-skill="PS02"]');click(d,'[data-skill="PS04"]');click(d,'#aj-depart');assert.equal(api(d).session.data.profile.points,points);act(d,AH.choose(api(d).session.game,'progress_first'));d.window.close();
  const b=open();click(b,'[data-route="B"]');click(b,'#aj-depart');finish(b);b.window.close();
  checks.push('自然A→報酬1枚とPS02でC→無料PS04取り直し、B、体勢・倍率予測と実行・自動保存');
  // Compare hold-to-drag and selection/button against the same normal placement.
  const placement=initial.session.game.state.actors.P.hand.map(id=>initial.session.game.state.cards[id]).find(c=>!initial.session.game.state.field[c.attr]&&!initial.session.game.state.actors.P.hand.some(id=>id!==c.id&&initial.session.game.state.cards[id].remaining===1&&initial.session.game.state.cards[id].consume_on_recover));assert(placement);
  for(const method of ['hold','scroll','cancel','outside']){
    const x=open(initial),root=q(x,'#cw-playtable'),before=state(x),id=placement.id;
    x.window.document.elementFromPoint=()=>method==='outside'?root:q(x,'#cw-drop-zone');
    pointer(x,q(x,`[data-card="${id}"]`),'pointerdown');
    if(method==='scroll')pointer(x,root,'pointermove',{clientX:140,clientY:100});
    await new Promise(resolve=>setTimeout(resolve,250));
    if(method==='scroll')assert.equal(api(x).drag.mode,'scroll');else assert.equal(api(x).drag.mode,'drag');
    if(method==='cancel')pointer(x,root,'pointercancel');else{
      pointer(x,root,'pointermove',{clientX:120,clientY:100});pointer(x,root,'pointerup',{clientX:120,clientY:100});
    }
    if(method==='hold'){const g=new AI.Game(copy(api(x).session.bundle),before);g.step({card_id:id,target:null});g.advance();assert.deepEqual(state(x),g.save());}
    else assert.deepEqual(state(x),before);
    x.window.close();
  }
  checks.push('短いホールドでドラッグ、先に動かすとスクロールを維持、取消・場外は時間/RNG不変、札上の追加ボタンなし');
  const bad=open({...initial,session:{...initial.session,schema:'AJ1'}});assert(!q(bad,'#aj-recovery').hidden);assert(q(bad,'#aj-depart').disabled);bad.window.close();
  checks.push('旧AJ保存を読み替えず復元エラーとして保持');assert.deepEqual(errors,[]);
  const result={trial:'AM1',actions,restores,runs,checks,errors,html_sha256:crypto.createHash('sha256').update(html).digest('hex'),scope:'jsdom DOM and actual AM engine; real rendering/touch and human enjoyment unverified'};
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({actions,restores,checks,runs,errors}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
