// Deterministic event/clock checks only. This is not a browser or visual test.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const html = fs.readFileSync(path.join(root, 'motion.fragment.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const checks = [];
function element(value = '') {
  return {value, textContent:'', checked:false, style:{}, dataset:{}, events:{}, attrs:{},
    addEventListener(name, handler){this.events[name]=handler;},
    setAttribute(name,value){this.attrs[name]=value;}, remove(){}};
}
const ctx = new Proxy({}, {get(t,k){return t[k] ||= (()=>{});}});
const canvas = Object.assign(element(),{clientWidth:320,getContext(){return ctx;}});
const nodes = {
  '[data-scene]':canvas,'[data-target]':element('road'),
  '[data-effect]':element('progress'),'[data-caption]':element(),
  '[data-clock]':element(),'[data-slow]':element(),'[data-play]':element()
};
const steps = [0,100,330,600].map(v=>Object.assign(element(),{dataset:{step:String(v)}}));
const container = {dataset:{},querySelector:s=>nodes[s],querySelectorAll:()=>steps,appendChild(){}};
const pending = new Map(); let next = 0, reduced = false;
const document = {hidden:false,events:{},getElementById:()=>container,createElement:()=>element(),
  addEventListener(name,handler){this.events[name]=handler;}};
vm.runInNewContext(source,{document,window:{devicePixelRatio:1},performance:{now:()=>0},
  getComputedStyle:()=>({color:'#ccc'}),
  matchMedia:query=>({matches:query.includes('reduced')&&reduced,addEventListener(){}}),
  ResizeObserver:class{constructor(callback){this.callback=callback;}observe(){this.callback();}},
  requestAnimationFrame:callback=>{pending.set(++next,callback);return next;},
  cancelAnimationFrame:id=>pending.delete(id)});
function tick(t){const callbacks=[...pending.values()];pending.clear();for(const callback of callbacks)callback(t);}
const play=()=>nodes['[data-play]'].events.click();
const caption=()=>nodes['[data-caption]'].textContent;
const select=(selector,value)=>{nodes[selector].value=value;nodes[selector].events.change();};
play();tick(100);
assert.match(caption(),/一致する/);checks.push('再生中の一致段階へ説明が追随');
tick(330);assert.match(caption(),/働きかける/);checks.push('再生中の作用段階へ説明が追随');
tick(600);assert.match(caption(),/道のりが減り/);assert.match(caption(),/捨て場へ移る/);
assert.equal(pending.size,0);checks.push('通常の終了と捨て場移動を区別');
select('[data-effect]','survey');assert.match(caption(),/道のりはまだ減らない/);
checks.push('探査のみの結果を進展と呼ばない');
play();tick(100);select('[data-target]','rock');
assert.equal(pending.size,0);assert.match(caption(),/耐久はまだ減らない/);
checks.push('再生途中の対象変更で旧対象の予約フレームを破棄');
select('[data-target]','enemy');select('[data-effect]','flash');
assert.match(caption(),/追撃や気絶を加えない/);checks.push('一閃を追加行動として説明しない');
reduced=true;play();assert.equal(pending.size,0);assert.equal(nodes['[data-clock]'].textContent,'600 ms');
checks.push('動きを減らす設定では結果へ直行');
reduced=false;play();document.hidden=true;document.events.visibilitychange();
assert.equal(pending.size,0);checks.push('非表示で予約フレームを停止');
const report={scope:'DOM/Canvas stubs and deterministic clock; no layout, pixels or browser tested',
  input_sha256:crypto.createHash('sha256').update(html).digest('hex'),checks,passed:checks.length};
fs.writeFileSync(path.join(root,'static-checks.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
