'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build,sha}=require('./build.cjs'),{createFlowModel}=require('./model.cjs'),data=require('./fixtures.json');
const checks=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(build({testing:true}),{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollBy=function(o){this.scrollTop+=(o.top||0)};
  let clock=0,serial=0;const timers=new Map();
  w.setTimeout=(f,ms)=>{const id=++serial;timers.set(id,{f,at:clock+ms});return id};w.clearTimeout=id=>timers.delete(id);
  w.__tick=ms=>{clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.f()}};
}});
const root=dom.window.document.getElementById('crossweave-flow-001'),q=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],ui=root.__flow;
const state=()=>ui.model.inspect(),click=s=>{const e=q(s);assert(e,s);e.click()},example=k=>{q('#cf-example').value=k;q('#cf-example').dispatchEvent(new dom.window.Event('change',{bubbles:true}))};
const visible=s=>!q(s).hidden,esc=()=>root.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
function check(name,fn){fn();checks.push(name)}
check('初回は拠点。依頼窓の再クリックと外クリックで閉じ、未来の調査記録を出さない',()=>{
  assert(visible('#cf-hub'));click('[data-open=quest]');assert.equal(state().dialog,'quest');
  click('[data-open=quest]');assert.equal(state().dialog,null);
  click('[data-open=records]');assert(q('#cf-windows').textContent.includes('まだ調べた記録はない'));assert(!q('#cf-windows').textContent.includes('奥の水門'));
  click('.cf-top');assert.equal(state().dialog,null);
});
check('依頼から準備へ。初期の12枚・全10種を絵の一覧にまとめる',()=>{
  click('[data-open=quest]');click('.cf-window [data-nav=preparation]');assert.equal(state().page,'preparation');assert.equal(state().total,12);assert.equal(all('#cf-card-grid [data-card]').length,10);
});
check('未完成の編成は出発不可。窓・拠点への往復で下書きを失わない',()=>{
  click('#cf-card-grid [data-card=f]');click('#cf-minus');assert.equal(state().total,11);assert(q('#cf-main-action').disabled);
  click('.cf-top');click('[data-nav=hub]');click('#cf-main-action');assert.equal(state().counts.f,1);assert.equal(state().total,11);
  click('#cf-card-grid [data-card=j]');click('#cf-plus');assert.equal(state().total,12);assert(!q('#cf-main-action').disabled);esc();
});
check('詳細窓を閉じる外クリックでは出発しない',()=>{
  click('#cf-card-grid [data-card=l]');click('#cf-main-action');assert.equal(state().dialog,null);assert.equal(state().page,'preparation');
});
check('出発の接続情報は編成の複製。出発クリックだけでは精算・解放しない',()=>{
  const before=state();click('#cf-main-action');assert.equal(state().page,'departure');assert.equal(ui.departureRequest.counts.f,1);assert.equal(ui.departureRequest.counts.j,1);assert.equal(state().points,before.points);assert.equal(state().receipt,null);
  ui.departureRequest.counts.f=99;assert.equal(state().counts.f,1);click('#cf-main-action');
});
check('踏破例は既存記録の着想3・汐留めの解放。拠点へ戻っても解決状態を保持',()=>{
  example('clear');assert(visible('#cf-return'));assert.equal(state().points,3);assert.deepEqual(Array.from(state().receipt.settlement.kept),['A/V0','A/V1']);
  click('#cf-return [data-card=nt_stop]');assert(!q('#cf-plus'));esc();click('[data-nav=hub]');assert(state().resolved);assert.equal(state().points,3);
  click('[data-open=quest]');assert(q('#cf-windows').textContent.includes('浸水は解決済み'));assert(!q('#cf-windows').textContent.includes('未解決'));esc();
});
check('帰還から準備へ進むと解放札が選択元へ加わり、同種上限と合計枚数を別に扱う',()=>{
  click('#cf-main-action');assert(q('#cf-card-grid [data-card=nt_stop]'));assert.equal(state().total,12);
  click('#cf-card-grid [data-card=nt_stop]');click('#cf-plus');assert.equal(state().total,13);assert(q('#cf-main-action').disabled);esc();
  click('#cf-card-grid [data-card=f]');click('#cf-minus');esc();assert.equal(state().total,12);
  click('#cf-card-grid [data-card=nt_stop]');click('#cf-plus');assert(q('#cf-plus').disabled);click('#cf-minus');esc();
});
check('帰還例の切替で成果を重ねず、別の例の未解放札を持ち込ませない',()=>{
  example('withdrawal');assert.equal(state().points,1);assert(!state().available.includes('nt_stop'));assert.equal(state().counts.nt_stop,undefined);assert.equal(state().total,12);
  example('clear');assert.equal(state().points,3);assert.equal(state().counts.nt_stop,1);assert.equal(state().counts.f,1);
  example('clear');assert.equal(state().points,3);
});
check('保護後の緊急脱出例は今回の成果を失うが港の知識を残す。未観測の水門の詳細は出さない',()=>{
  example('defeat');assert.equal(state().points,0);assert.equal(state().receipt.settlement.kept.length,0);assert.equal(state().receipt.settlement.lost[0],'A/V0');assert(q('#cf-return').textContent.includes('今回はなし'));
  click('[data-open=records]');const text=q('#cf-windows').textContent;assert(text.includes('頭上の海'));assert(!text.includes('奥の水門'));esc();
});
check('初回へ戻しても、その表示例で編集した下書きを保持',()=>{
  example('initial');click('#cf-main-action');assert.equal(state().counts.f,1);assert.equal(state().counts.j,1);assert.equal(state().total,12);
});
function pointer(el,type,relatedTarget=null){const e=new dom.window.Event(type,{bubbles:true});Object.assign(e,{pointerType:'mouse',relatedTarget});el.dispatchEvent(e)}
check('マウスの一時表示→クリックでピン留め→同じ札で閉じる。ホバーでは編成を変えない',()=>{
  const card=q('#cf-card-grid [data-card=read]'),before=JSON.stringify(state().counts);pointer(card,'pointerover');dom.window.__tick(180);
  assert.equal(state().windowMode,'peek');assert(!q('#cf-plus'));assert.equal(q('#cf-card-grid [data-card=read]'),card,'hover replaced the source node');
  card.click();assert.equal(state().windowMode,'pinned');assert(q('#cf-plus'));pointer(card,'pointerout');dom.window.__tick(180);assert.equal(state().dialog,'card');
  card.click();assert.equal(state().dialog,null);assert.equal(JSON.stringify(state().counts),before);
});
check('ピン留めした依頼窓を背景の札ホバーで置換しない。Escで元の操作へ戻れる',()=>{
  click('[data-open=quest]');pointer(q('#cf-card-grid [data-card=read]'),'pointerover');dom.window.__tick(180);assert.equal(state().dialog,'quest');esc();assert.equal(state().dialog,null);
});
check('入力境界と外部の状態参照から下書きを破壊できない',()=>{
  const m=createFlowModel(data);m.navigate('preparation');assert(!m.adjust('nt_stop',1));assert(!m.adjust('f',1));assert(!m.adjust('f',-3));
  const snap=m.inspect();snap.counts.f=999;assert.equal(m.inspect().counts.f,2);assert.throws(()=>m.example('unknown'));
});
check('生成物は外部通信なし、未解決トークンなし、1MB未満。全操作ボタンに名前がある',()=>{
  const fragment=build();assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|<iframe/.test(fragment));assert(!/__FLOW_[A-Z_]+__/.test(fragment));assert(Buffer.byteLength(fragment)<1e6);
  for(const b of all('button'))assert(b.textContent.trim()||b.getAttribute('aria-label'));
  assert.equal(root.querySelectorAll('main').length,1);assert(!root.querySelector('[tabindex]'));
});
assert.deepEqual(errors,[]);
const report={trial:data.id,version:data.version,checks,passed:checks.length,rendering:'DOM・仮時計。実ブラウザー描画・実端末入力・CSS配置の実測は未確認',engine:'既存の踏破記録とPORT入力を画面例に使用。ゲームの機械比較は実施していない',fragment_sha256:sha(build()),standalone_sha256:sha(build({standalone:true}))};
fs.mkdirSync(path.join(__dirname,'verification'),{recursive:true});fs.writeFileSync(path.join(__dirname,'verification/checks.json'),JSON.stringify(report,null,2)+'\n');dom.window.close();console.log(JSON.stringify({passed:checks.length,errors,fragment_sha256:report.fragment_sha256}));
