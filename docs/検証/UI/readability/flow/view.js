const root = document.getElementById('crossweave-flow-001');
const get = id => root.querySelector('#' + id);
const model = createFlowModel(DATA);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fallbackIcons={'music-2':'♪',hammer:'⚒',footprints:'👞','move-up-right':'↗','lock-keyhole':'🔒',hand:'✋',needle:'🪡',lamp:'🏮',wind:'彡',leaf:'🍃',anchor:'⚓'};
const icon = (name, fallback = '◇') => `<i data-lucide="${name}" data-fallback="${fallbackIcons[name]||fallback}" aria-hidden="true"></i>`;
const cardFor = type => DATA.cards.find(c => c.type === type);
let hoverTimer = null, closeTimer = null, lastTrigger = null, departureRequest = null;
function icons() { if (typeof lucide !== 'undefined') lucide.createIcons({attrs:{width:18,height:18}}); }
function art(card) { return `<span class="cf-art">${icon(card.icon)}</span>`; }
function cardButton(type, count, unlocked = false) {
  const c = cardFor(type), s = model.inspect();
  return `<button type="button" class="cf-card ${count === 0 ? 'zero' : ''}" data-card="${c.type}" aria-label="${esc(c.name)}${count === null ? 'の詳細' : `、持込${count}枚`}、属性${c.attr}" aria-expanded="${s.dialog === 'card' && s.card === type}">${art(c)}<span class="cf-attr">${c.attr}</span>${count === null ? '' : `<span class="cf-count">${count ? '×' + count : '—'}</span>`}<span class="cf-card-name">${esc(c.name)}</span>${unlocked ? '<span class="cf-new">解放</span>' : ''}</button>`;
}
function balance(s) {
  const totals = {attack:0,guard:0,heal:0};
  for (const [type,count] of Object.entries(s.counts)) totals[cardFor(type).kind] += count;
  return `突破 ${totals.attack} · 身構 ${totals.guard} · 回復 ${totals.heal}`;
}
function facts(s) {
  if (!s.receipt) return [];
  const seen = DATA.returns[s.example].seen;
  const rows = [{name:'逆流の跡',text:'下り坂に逆らう流れ。壁の白い筋は、奥へ続いていた。'}];
  if (seen.includes('port')) rows.push({name:'頭上の海',text:'地下水路を抜けた先に港がある。壁には同じ高さの水位線。'});
  if (seen.includes('gate')) rows.push({name:'奥の水門',text:'鎖の噛み込みと、擦れた正常位置を確認した。'});
  if (seen.includes('clear')) rows.push({name:'戻った流れ',text:'水門が戻り、日常側への流入が止まった。'});
  return rows;
}
function returnMarkup(s) {
  const labels = {clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'};
  const r = s.receipt, known = facts(s), unlocked = r.unlocked;
  return `<div class="cf-result-head"><h2 id="cf-return-heading">帰還</h2><span class="cf-result-mark">${labels[s.example]}</span></div><p class="cf-result-story">${esc(DATA.returns[s.example].story)}</p><div class="cf-result-grid"><div><h3>持ち帰り</h3><div class="cf-result-items">${r.points ? `<div class="cf-point-tile">${icon('sparkles','✦')}<span>着想</span><strong>+${r.points}</strong></div>` : '<p class="cf-empty">今回はなし</p>'}${unlocked.map(t=>`<div class="cf-unlock">${cardButton(t,null,true)}</div>`).join('')}</div>${r.settlement.lost.length ? `<div class="cf-loss">${icon('package-x','×')} 失ったもの<span>地下水路の成果</span></div>` : ''}</div><div><h3>調査記録</h3><button type="button" class="cf-record-link" data-open="records"><span>${s.resolved ? '水門と正常な流れ' : '港へ続く道'}</span><span aria-hidden="true">↗</span></button><p class="cf-small">${known.length}件を確認</p></div></div>`;
}
function heading(title, size = 'large') {
  const pinned = model.inspect().windowMode === 'pinned';
  return `<section class="cf-window" data-size="${size}" role="dialog" aria-modal="false" aria-labelledby="cf-window-heading"><div class="cf-window-top"><h3 id="cf-window-heading">${esc(title)}</h3><div class="cf-window-tools"><span aria-label="${pinned?'ピン留め':'一時表示'}">${icon(pinned?'pin':'pin-off',pinned?'◆':'◇')}</span><button type="button" class="cf-close" data-close="true" aria-label="窓を閉じる">×</button></div></div>`;
}
function questMarkup(s) {
  const goal = s.resolved ? '管理用の道筋を確かめる' : DATA.quest.goal;
  return `${heading('依頼')}<div class="cf-quest-content"><article class="cf-quest-cover"><div><span class="cf-small" style="color:inherit">${s.resolved?'再訪':'商店街の地下'}</span><h3>${DATA.quest.title}</h3></div></article><div class="cf-quest-copy"><span class="cf-small">${s.resolved?'浸水は解決済み':'未解決'}</span><h3>${goal}</h3><p>${esc(s.resolved?'港で見つけた古い案内。使われなくなった道の先を辿る。':DATA.quest.symptom)}</p><span class="cf-small">${DATA.quest.tendency}</span><details><summary>${s.resolved?'前回の記録':'相談'}</summary><p>${esc(s.resolved?'水門が正常位置へ戻り、地下への流入が止まった。':DATA.quest.request)}</p></details><button type="button" class="cf-primary" data-nav="preparation">準備へ <span aria-hidden="true">→</span></button></div></div></section>`;
}
function recordsMarkup(s) {
  const rows = facts(s);
  return `${heading('調査記録')}<h3>夜潮の排水路</h3>${rows.length ? `<ul class="cf-record-list">${rows.map(r=>`<li>${esc(r.name)}<p>${esc(r.text)}</p></li>`).join('')}</ul>` : '<p class="cf-empty">まだ調べた記録はない。</p>'}</section>`;
}
function detailMarkup(s) {
  const c = cardFor(s.card), guard = c.kind === 'guard', heal = c.kind === 'heal';
  const powerLabel = guard ? '身構' : heal ? '回復' : '突破';
  const primary = `${powerLabel} ${c.power}${guard ? ` · 攪乱 ${c.evasion}` : heal ? '' : ` · 探査 ${c.hit}`}`;
  const signed = n => n > 0 ? '+' + n : String(n);
  const field = `${guard?'身構':'突破'} ${signed(c.field_power)} · ${guard?'攪乱':'探査'} ${signed(c.field_hit)}`;
  const editable = s.page === 'preparation' && s.available.includes(c.type) && s.windowMode === 'pinned';
  return `${heading(c.name,'small')}<div class="cf-detail-art">${art(c)}</div><div class="cf-detail-attr">属性 ${c.attr}</div><p>${primary}</p><dl class="cf-data"><dt>場の補正</dt><dd>${field}</dd><dt>期限</dt><dd>${c.life}行動</dd><dt>設置／一致</dt><dd>${c.place_cost}／${c.match_cost}</dd>${c.consume_on_recover?'<dt>消費</dt><dd>捨てると消滅</dd>':''}</dl>${editable ? `<div class="cf-stepper"><span>持っていく</span><div><button type="button" class="cf-quiet" id="cf-minus" data-delta="-1" aria-label="${esc(c.name)}を1枚減らす" ${!s.counts[c.type]?'disabled':''}>−</button><output aria-live="polite">${s.counts[c.type]||0}</output><button type="button" class="cf-quiet" id="cf-plus" data-delta="1" aria-label="${esc(c.name)}を1枚増やす" ${(s.counts[c.type]||0)>=DATA.limits.perType?'disabled':''}>＋</button></div></div>` : ''}</section>`;
}
function positionSmall() {
  const s = model.inspect(), win = get('cf-windows').querySelector('[data-size=small]');
  if (!win || s.dialog !== 'card') return;
  const stage = root.querySelector('.cf-stage').getBoundingClientRect();
  const anchor = [...root.querySelectorAll(`[data-card="${s.card}"]`)].find(e=>!e.closest('section[hidden]'));
  const fallback = {left:stage.left+stage.width/2,right:stage.left+stage.width/2,top:stage.top+stage.height/2,bottom:stage.top+stage.height/2};
  const a = anchor?.getBoundingClientRect() || fallback;
  const width = Math.min(340,Math.max(0,stage.width-16));
  win.style.width = width + 'px';
  const height = Math.min(win.getBoundingClientRect().height,Math.max(0,stage.height-16));
  let left = a.right-stage.left+10;
  if (left+width > stage.width-8) left = a.left-stage.left-width-10;
  if (left < 8) left = (stage.width-width)/2;
  const top = Math.min(stage.height-height-8,Math.max(8,a.top-stage.top));
  win.style.left = Math.max(8,left)+'px';win.style.top = Math.max(8,top)+'px';
}
function windowRender() {
  const s = model.inspect(), layer = get('cf-windows');
  layer.hidden = !s.dialog;
  if (!s.dialog) { layer.replaceChildren(); return; }
  layer.innerHTML = s.dialog === 'quest' ? questMarkup(s) : s.dialog === 'records' ? recordsMarkup(s) : s.dialog === 'card' ? detailMarkup(s) : `${heading('心得','small')}<p class="cf-empty">装備している心得はない。</p><p class="cf-small">習得済み 0 · 所持 0</p></section>`;
  if (s.dialog === 'passives') {
    const win=layer.firstElementChild;win.style.right='8px';win.style.top='8px';
  }
  icons(); positionSmall();
}
function cue() {
  const grid = get('cf-card-grid');
  get('cf-more').hidden = model.inspect().page !== 'preparation' || grid.scrollHeight-grid.clientHeight-grid.scrollTop < 12;
}
function render() {
  const s = model.inspect(), scroll = get('cf-card-grid').scrollTop;
  for (const page of ['hub','preparation','return','departure']) get('cf-'+page).hidden = s.page !== page;
  get('cf-example').value = s.example;
  get('cf-location').textContent = s.page === 'departure' ? DATA.quest.title : '古道具屋';
  get('cf-context').textContent = s.page === 'return' ? DATA.quest.title : s.resolved ? '浸水は解決済み' : '';
  get('cf-hub-symptom').textContent = s.resolved ? '港の先に残る道筋' : '地下へ入り込む海水';
  get('cf-hub-message').textContent = s.example === 'initial' ? '' : s.resolved ? '相談のあった地下に、棚が戻り始めている。' : '調べたことを手掛かりに、次の準備へ。';
  get('cf-total').textContent = `${s.total} / ${DATA.limits.total}`;
  get('cf-balance').textContent = balance(s);
  get('cf-deck-error').textContent = s.valid ? '' : s.total < DATA.limits.total ? `あと${DATA.limits.total-s.total}枚` : `${s.total-DATA.limits.total}枚減らす`;
  get('cf-prep-quest').textContent = DATA.quest.title+(s.resolved?' · 再訪':'')+' ↗';
  get('cf-card-grid').innerHTML = s.available.map(t=>cardButton(t,s.counts[t]||0,s.receipt?.unlocked.includes(t))).join('');
  get('cf-card-grid').scrollTop = scroll;
  if (s.receipt) get('cf-return').innerHTML = returnMarkup(s);
  get('cf-points').textContent = `着想 ${s.points}`;
  get('cf-vigor').textContent = s.page === 'return' ? '余力 40 · 全回復' : '余力 40';
  get('cf-home-button').setAttribute('aria-current',s.page==='hub'?'page':'false');
  const main = get('cf-main-action');
  delete main.dataset.action;delete main.dataset.nav;
  if (s.page === 'preparation') {main.dataset.action='depart';main.innerHTML='出発 <span aria-hidden="true">→</span>';main.disabled=!s.valid;}
  else {main.dataset.nav='preparation';main.innerHTML=(s.page==='return'?'次の準備へ':'準備へ')+' <span aria-hidden="true">→</span>';main.disabled=false;}
  get('cf-boundary-note').textContent = s.page==='departure'?'探索は省略。帰還は上の表示例から確認。':'探索の演算は未接続';
  root.querySelectorAll('[data-open]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.open===s.dialog)));
  windowRender();icons();cue();
}
function clearTimers() {clearTimeout(hoverTimer);clearTimeout(closeTimer);}
function markers() {
  const s=model.inspect();
  root.querySelectorAll('[data-card]').forEach(el=>el.setAttribute('aria-expanded',String(s.dialog==='card'&&el.dataset.card===s.card)));
  root.querySelectorAll('[data-open]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.open===s.dialog)));
}
function open(name,card=null,mode='pinned',trigger=null) {
  const s=model.inspect();
  if(mode==='peek'&&s.dialog&&s.windowMode==='pinned')return;
  clearTimers();lastTrigger = trigger || lastTrigger; model.open(name,card,mode);markers();windowRender();
}
function close(restore=false) {
  clearTimers(); const s=model.inspect(); model.close();markers();windowRender();
  if (restore) {
    const trigger=s.card?[...root.querySelectorAll(`[data-card="${s.card}"]`)].find(e=>!e.closest('section[hidden]')):lastTrigger;
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
  }
}
root.addEventListener('click', e => {
  const button=e.target.closest('button');
  const state=model.inspect();
  if(state.dialog&&!e.target.closest('.cf-window')&&!button?.matches('[data-card],[data-open]')) {
    close();return;
  }
  if(!button||button.disabled)return;
  if(button.dataset.close) {close(true);return;}
  if(button.dataset.open) {open(button.dataset.open,null,'pinned',button);return;}
  if(button.dataset.card) {open('card',button.dataset.card,'pinned',button);return;}
  if(button.dataset.delta) {
    const delta=Number(button.dataset.delta),id=button.id;
    model.adjust(state.card,delta);render();
    const next=get(id);if(next&&!next.disabled)next.focus({preventScroll:true});else get(delta===1?'cf-minus':'cf-plus')?.focus({preventScroll:true});return;
  }
  if(button.dataset.nav) {clearTimers();model.navigate(button.dataset.nav);render();return;}
  if(button.dataset.action==='depart') {
    departureRequest=model.depart();render();
    if(departureRequest)root.dispatchEvent(new CustomEvent('crossweave:departure-preview',{detail:departureRequest,bubbles:true}));return;
  }
  if(button.id==='cf-more') {
    get('cf-card-grid').scrollBy({top:Math.max(120,get('cf-card-grid').clientHeight*.7),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
});
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&model.inspect().dialog){e.preventDefault();close(true);}});
get('cf-example').addEventListener('change',e=>{clearTimers();model.example(e.target.value);departureRequest=null;render();});
get('cf-card-grid').addEventListener('scroll',()=>{if(model.inspect().windowMode==='peek'&&model.inspect().dialog)close();else positionSmall();cue();},{passive:true});
root.addEventListener('pointerover',e=>{
  if(e.pointerType!=='mouse'||!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)return;
  if(e.target.closest('.cf-window')){clearTimeout(closeTimer);return;}
  const card=e.target.closest('[data-card]');if(!card||card.contains(e.relatedTarget))return;
  clearTimers();hoverTimer=setTimeout(()=>open('card',card.dataset.card,'peek',card),180);
});
root.addEventListener('pointerout',e=>{
  if(e.pointerType!=='mouse')return;
  const card=e.target.closest('[data-card]'),win=e.target.closest('.cf-window');
  if(!card&&!win)return;
  if(card?.contains(e.relatedTarget)||win?.contains(e.relatedTarget)||e.relatedTarget?.closest?.('.cf-window'))return;
  clearTimers();closeTimer=setTimeout(()=>{if(model.inspect().windowMode==='peek')close();},180);
});
window.addEventListener('blur',()=>{clearTimers();if(model.inspect().windowMode==='peek')close();});
if(typeof ResizeObserver!=='undefined') new ResizeObserver(()=>{positionSmall();cue();}).observe(root);
render();
__FLOW_TEST__
