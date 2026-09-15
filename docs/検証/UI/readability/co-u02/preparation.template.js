/* UI-G-001 rendering, with the controller supplied by the caller. */
(function(api){'use strict';
api.mountPreparation=function(root,session){
 const $=s=>root.querySelector(s),clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pt=n=>Number.isInteger(n)?String(n/100):'—';
 const icon=(name,fallback='◇')=>`<i aria-hidden="true" data-lucide="${esc(name)}">${fallback}</i>`;
 const button=(text,action,extra='',cls='')=>`<button type="button" data-action="${action}" ${extra} class="${cls}">${text}</button>`;
 let view,plan,section='deck',win=null,comparison=null,quote=null,notice='',stale=false,failed=false;
 let hoverTimer,leaveTimer,disposed=false,snapshot,previousToken=null,oldDetails={};
 const events=new AbortController();
 root.classList.add('cw-m1');
 root.innerHTML='<div class="cw-game"><header class="cw-top" data-top></header><div class="cw-workspace" data-workspace></div><div class="cw-notice" data-notice role="status" aria-live="polite"></div><footer class="cw-footer" data-footer></footer><div data-overlay></div></div>';
 const home=()=>view?.display_data.home,dd=()=>view.display_data;
 const currentPlan=()=>api.currentPlan(view);
 const dirty=()=>!!plan&&JSON.stringify(plan)!==JSON.stringify(currentPlan());
 const unsaved=()=>!!plan&&JSON.stringify(plan)!==JSON.stringify(dd().draft?.plan);
 const blocked=()=>!!snapshot?.pending||snapshot?.canRetry||stale;
 function detail(id){const key=id==='$purchase'?plan?.candidate:id;return dd().details?.[key]||{name:'詳細の接続待ち',icon:'circle-help',kind:'card'};}
 function name(id){return detail(id).name;}
 function counts(ids){const r=new Map();for(const id of ids||[])r.set(id,(r.get(id)||0)+1);return [...r].map(([id,count])=>({id,count}));}
 function isLearned(base){return plan?.retain_learning.includes(base)||plan?.next_preparation.learn.includes(base);}
 __NOTICE_HELPER__
 function errorText(e){return ({connection_failed:'応答を確認できません。下書きを保持しています',invalid_response:'保存結果を確認できません。現在値は変更していません',comparison_required:'もう一度比較してください',busy:'処理中です',stale_response:'古い応答は適用しませんでした',secure_request_id_unavailable:'この環境では要求を安全に識別できません'})[e?.code]||noticeFor(e);}
 function publicFields(d){
  const rows=[];const add=(label,x)=>{if(x!==null&&x!==undefined)rows.push(`<dt>${esc(label)}</dt><dd>${esc(x)}</dd>`);};
  if(d.primary){add('主効果',d.primary.power);add('探査',d.primary.hit);add('攪乱',d.primary.evasion);add('機転',d.primary.crit_gain);}
  if(d.field){add('場の効果',d.field.power);add('場の探査',d.field.hit);}
  add('手札期限',d.life);add('設置間隔',d.action_intervals?.place);add('一致間隔',d.action_intervals?.match);
  const recovery={shared_recovery:'共有回収へ',consumed_on_recovery:'回収時に消耗',destroyed_on_recovery_retired_origin:'元の主体が離脱したため回収時に消滅',destroyed_on_recovery_filler:'回収時に消滅'};
  return (d.trigger_text?`<p>${esc(d.trigger_text)}</p>`:'')+(rows.length?`<dl class="cw-ledger">${rows.join('')}</dl>`:'')+(recovery[d.recovery_rule]?`<small>${recovery[d.recovery_rule]}</small>`:'');
 }
 __RENDER_HELPERS__
 function returnPage(){const r=dd().return_receipt;if(!r)return '<main class="cw-return"><p>帰還表示の接続待ち</p></main>';
  const lookup=id=>Object.values(dd().details||{}).find(d=>d.base_id===id)?.name||'解放された種類';
  const unlocked=(r.new_unlocks||[]).map(id=>esc(lookup(id))).join('・')||'なし';
  const outcome={clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'}[r.outcome]||'帰還';
  return `<main class="cw-return"><div class="cw-return-head"><small>${outcome}</small><h2>帰還</h2><div>着想 <strong>+${pt(r.gained_units)}</strong></div><small>精算済み</small></div><div class="cw-return-list"><div class="cw-row"><span>持ち帰り</span><span>${Array.isArray(r.kept_items)?r.kept_items.length:'—'}個</span></div><div class="cw-row"><span>喪失</span><span>${Array.isArray(r.lost_items)?r.lost_items.length:'—'}個</span></div><div><small>種類解放</small><p>${unlocked}</p></div><dl class="cw-ledger"><dt>未使用</dt><dd>${pt(r.unspent_after_units)}</dd><dt>既払</dt><dd>${pt(r.paid_learning_units)}</dd></dl></div><div class="cw-return-actions">${home()?button('心得の取り直しを比較','return-compare'):''}${button('次の準備へ','ack','','cw-primary')}</div></main>`;
 }
 function icons(){} // Host may replace the fallback glyph through its asset pipeline.
 function controls(){
  const readonly=new Set(['close','pin','review','return-compare','discard-confirm','refresh']);
  const caps={'commit':'commit_preparation','save-draft':'save_draft','discard':'discard_draft','ack':'ack_return','depart':'depart','convert':'convert_items','quote':'convert_items','lock':'set_item_lock','candidate':'purchase'};
  for(const b of root.querySelectorAll('[data-action]')){
   const a=b.dataset.action;if(a.startsWith('nav-')||readonly.has(a))continue;
   if((blocked()&&a!=='retry')||(caps[a]&&!session.can(caps[a])))b.disabled=true;
  }
  if(stale){for(const b of root.querySelectorAll('[data-action="discard"]'))b.disabled=!!snapshot.pending||snapshot.canRetry;}
  root.querySelectorAll('[data-timing]').forEach(e=>e.disabled=blocked());
  root.querySelectorAll('[data-action="depart"]').forEach(b=>{if(!dd().case?.id)b.disabled=true;});
  root.setAttribute('aria-busy',String(!!snapshot?.pending));
 }
 function render(){if(disposed||!view)return;
  const scroll=[...root.querySelectorAll('[data-scroll],.cw-draft-content,.cw-popup')].map(e=>[e.matches('[data-scroll]')?'[data-scroll]':e.classList.contains('cw-popup')?'.cw-popup':'.cw-draft-content',e.scrollTop]);
  const h=home(),returning=dd().phase==='return';
  $('[data-top]').innerHTML=`<div class="cw-top-title"><span>crossweave</span><small>${returning?'帰還':'出発準備'}</small></div><div class="cw-wallet">${h?`<span>着想 <strong>${pt(h.economy.unspent_units)}</strong></span><small>既払 ${pt(h.economy.paid_learning_units)}</small>`:''}</div>`;
  $('[data-workspace]').dataset.screen=returning?'return':section;
  $('[data-workspace]').innerHTML=returning?returnPage():content();
  $('[data-footer]').innerHTML=returning?'<small>帰還結果</small>':[['deck','札組'],['skills','心得'],['owned','所持'],['offers','取得']].map(([s,l])=>button(l,'nav-'+s,`aria-pressed="${section===s}" ${!h?'disabled':''}`)).join('');
  if(stale)notice='前の下書きを保全中。最新を読み、今の準備から選び直してください';
  if(snapshot.pending)notice=snapshot.pending.kind==='write'?'保存中…':snapshot.pending.kind==='inspect'?'読み込み中…':'比較中…';
  $('[data-notice]').innerHTML=notice?`<span>${esc(notice)}</span>${failed?button('再試行','retry')+button('最新を読む','refresh'):''}${stale?button('最新を読む','refresh')+button('今の準備へ戻す','discard-confirm'):''}`:'';
  renderWindow();controls();scroll.forEach(([s,y])=>{const e=$(s);if(e)e.scrollTop=y;});queueMicrotask(updateLayout);
 }
 __WINDOW_HELPERS__
 async function edit(fn){if(blocked())return;const next=clone(plan);fn(next);if(!session.setDraft(next))return;win=null;notice='';render();await session.compare();}
 root.addEventListener('click',async event=>{
  const source=event.target.closest('[data-detail]');
  if(source&&root.contains(source)){clearTimeout(hoverTimer);clearTimeout(leaveTimer);openDetail(source.dataset.detail,source.dataset.origin,true);controls();return;}
  const b=event.target.closest('[data-action]');if(!b){if(event.target.matches('[data-outside]')||(win?.type==='detail'&&event.target.closest('.cw-game')&&!event.target.closest('.cw-popup'))){win=null;renderWindow();}return;}
  if(b.disabled)return;const action=b.dataset.action,id=b.dataset.id,base=b.dataset.base;
  if(action.startsWith('nav-')){section=action.slice(4);win=null;render();return;}
  if(action==='close'){win=null;renderWindow();return;}if(action==='pin'){win.pinned=!win.pinned;renderWindow();controls();return;}
  if(action==='review'||action==='return-compare'){
   if(blocked())return;
   if(action==='return-compare'){const p=currentPlan();p.cancel_learning=[...p.retain_learning];p.retain_learning=[];p.next_preparation.equipment=[];session.setDraft(p);}
   win={type:'review',pinned:true};render();await session.compare();return;
  }
  if(action==='ack'){await session.ackReturn();return;}
  if(action==='candidate'||action==='skip'){await edit(p=>{p.next_preparation.deck=p.next_preparation.deck.filter(x=>x!=='$purchase');p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>x!=='$purchase');p.candidate=action==='skip'||p.candidate===id?null:id;});return;}
  if(action==='learning'){await edit(p=>{const learnt=home().economy.learned.some(x=>x.base===base);if(learnt){if(p.cancel_learning.includes(base)){p.cancel_learning=p.cancel_learning.filter(x=>x!==base);p.retain_learning.push(base);}else{p.retain_learning=p.retain_learning.filter(x=>x!==base);p.cancel_learning.push(base);p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>detail(x).base_id!==base);}}else{const a=p.next_preparation.learn;if(a.includes(base)){p.next_preparation.learn=a.filter(x=>x!==base);p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>detail(x).base_id!==base);}else a.push(base);}});return;}
  if(action==='deck-add'||action==='deck-remove'){await edit(p=>{const a=p.next_preparation.deck;if(action==='deck-add')a.push(id);else{const n=a.indexOf(id);if(n>=0)a.splice(n,1);}});return;}
  if(action==='equip'){await edit(p=>{const a=p.next_preparation.equipment;p.next_preparation.equipment=a.includes(id)?a.filter(x=>x!==id):[...a,id];});return;}
  if(action==='discard-confirm'){win={type:'discard',pinned:true};renderWindow();controls();return;}
  if(action==='retry'){await session.retry();return;}
  if(action==='refresh'){await session.refresh();return;}
  if(action==='quote'){if(unsaved()){notice='先に下書きを保存し、対象を選び直してください';render();return;}win={type:'conversion',id,pinned:true};await session.quote([id]);return;}
  const command={commit:['commit_preparation',{plan}], 'save-draft':['save_draft',{plan}],discard:['discard_draft',{}],convert:['convert_items',{item_ids:[id]}],depart:['depart',{case_id:dd().case?.id}],lock:['set_item_lock',{item_id:id,locked:!home()?.owned.find(o=>o.id===id)?.locked}], 'conversion-recover':['save_draft',{plan}]}[action];
  if(command){if(action==='depart'&&dirty()){notice='変更を比較して確定するか、戻してください';render();return;}await session.execute(...command);}
 },{signal:events.signal});
 root.addEventListener('change',e=>{if(e.target.matches('[data-timing]')&&!blocked()){const p=clone(plan);p.purchase_timing=e.target.value;if(session.setDraft(p))session.compare();}},{signal:events.signal});
 root.addEventListener('mouseover',e=>{if(e.target.closest('.cw-popup')){clearTimeout(leaveTimer);return;}const b=e.target.closest('[data-detail]');if(!b||b.contains(e.relatedTarget)||win?.pinned)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(!disposed){openDetail(b.dataset.detail,b.dataset.origin,false);controls();}},180);},{signal:events.signal});
 root.addEventListener('mouseout',e=>{const b=e.target.closest('[data-detail]');if(b&&!b.contains(e.relatedTarget))clearTimeout(hoverTimer);if((b||e.target.closest('.cw-popup'))&&!e.relatedTarget?.closest?.('.cw-popup'))leaveTimer=setTimeout(()=>{if(!disposed&&win&&!win.pinned){win=null;renderWindow();}},140);},{signal:events.signal});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){win=null;renderWindow();}},{signal:events.signal});
 __LAYOUT_HELPERS__
 const observer=new ResizeObserver(updateLayout);for(const s of ['.cw-game','[data-top]','[data-workspace]','[data-notice]','[data-footer]'])observer.observe($(s));
 root.addEventListener('scroll',updateScrollCue,{capture:true,signal:events.signal});
 const unsubscribe=session.subscribe(s=>{snapshot=s;if(!s.view)return;const next=s.view;
  if(previousToken!==next.meta.view_token&&!s.stale){win=null;section=next.display_data.phase==='return'?'return':section==='return'?'deck':section;}
  if(s.error&&s.canRetry)win=null;
  previousToken=next.meta.view_token;view=next;plan=s.draft;comparison=s.comparison;quote=s.quote;stale=s.stale;failed=s.canRetry;oldDetails=s.draftDetails;notice=s.error?errorText(s.error):'';render();});
 return {dispose(){disposed=true;clearTimeout(hoverTimer);clearTimeout(leaveTimer);events.abort();observer.disconnect();unsubscribe();root.replaceChildren();root.classList.remove('cw-m1');}};
};})(globalThis.CrossweaveUI);
