/* UI-R-002 v0.15 layout/gestures, projected exclusively from CW-M1-view-1.
 * No game object, card registry, economy, saved document, or speculative actor AI.
 */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=x=>Array.isArray(x)?x:Object.values(x||{});
 const glyph=kind=>({attack:'↗',guard:'◇',heal:'✚',self:'●',passage:'≈',terminal:'▥',optional_enemy:'◈'})[kind]||'◇';
 const icon=kind=>`<span aria-hidden="true">${glyph(kind)}</span>`;
 const retirement={shared_recovery:'共有回収へ',consumed_on_recovery:'回収時に消耗',destroyed_on_recovery_retired_origin:'元の主体が離脱したため回収時に消滅',destroyed_on_recovery_filler:'回収時に消滅'};
 api.mountExploration=function(root,{session,display_data,onScene,onWithdraw}){
  let data=display_data,state=session.state(),selected=null,target=null,windowState=null,previewChoice=null;
  let previousToken=null,reservationToken=null,dead=false,drag=null,suppressUntil=0,hoverTimer=null,leaveTimer=null;
  const settings={diagram:true,details:true,quick:true,drag:true,hold:220};
  const events=new AbortController(),timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(!dead)fn();},ms);timers.add(t);return t;};
  root.classList.add('cw-explore');root.setAttribute('aria-label','crossweave 探索');
  root.innerHTML=`<div id="cw-scene" aria-hidden="true"><div id="cw-scene-base"></div></div>
   <section class="cw-region cw-world" aria-label="相手と環境"><div class="cw-heading"><div class="cw-order-strip"><ol id="cw-turn-order" aria-label="現在の行動予約"></ol></div></div><div class="cw-scroll" id="cw-actors"></div><div class="cw-scroll-help" data-track="cw-actors"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-board" id="cw-drop-zone" aria-label="札を出す場"><div class="cw-heading"><span id="cw-match-label"></span></div><div class="cw-scroll" id="cw-field"></div><div class="cw-scroll-help" data-track="cw-field"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-hand-region" aria-label="手札"><div class="cw-heading"><span id="cw-notice" role="status"></span></div><div class="cw-scroll" id="cw-hand"></div><div class="cw-scroll-help" data-track="cw-hand"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div><div id="cw-action-track"><div class="cw-actions" id="cw-action-anchor" hidden><button type="button" data-x="preview">予測</button><button type="button" id="cw-use" data-x="use" class="cw-primary">場に出す</button></div></div></section>
   <footer class="cw-bottom"><div class="cw-footer-state"><div class="cw-self" id="cw-self"></div><span id="cw-hand-count"></span></div><nav class="cw-menu" aria-label="探索メニュー"><button type="button" data-x="objective">目的</button><button type="button" data-x="status">状況</button><button type="button" data-x="deck">山札</button><button type="button" data-x="history">履歴</button><button type="button" data-x="settings">設定</button><button type="button" data-x="scene">本文</button></nav><button type="button" data-x="withdraw">撤退</button></footer>
   <svg id="cw-relations" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden></svg><div id="cw-drag-ghost" aria-hidden="true" hidden></div>
   <section class="cw-drawer" id="cw-drawer" role="dialog" aria-label="詳細" hidden><header><strong id="cw-drawer-title"></strong><button type="button" data-x="pin" aria-label="ピン留め" id="cw-window-state">◆</button><button type="button" data-x="close" aria-label="詳細を閉じる">×</button></header><div class="cw-drawer-body"></div></section>`;
  const $=s=>root.querySelector(s),x=()=>data.exploration,details=id=>data.details?.[id];
  const hand=()=>list(x()?.hand),field=()=>list(x()?.field),actors=()=>list(x()?.actors).filter(a=>a.active);
  const card=()=>hand().find(c=>c.id===selected),actor=id=>x()?.actors?.[id]||list(x()?.actors).find(a=>a.id===id);
  const names=id=>details(id)?.name||actor(id)?.name||'札';
  const label=(key,fallback)=>data.stat_labels?.[key]||fallback;
  const busy=()=>!!state.pending||state.canRetry||state.stale;
  const choices=()=>list(x()?.legal_actions).map(a=>a.choice??a).filter(a=>a.card_id===selected);
  const choice=()=>choices().find(a=>a.target===target)||choices().find(a=>a.target===null)||null;
  const art=(kind,k)=>`<span class="cw-illustration" data-art-kind="${kind}" aria-hidden="true">${icon(k)}</span>`;
  const attribute=c=>`<span class="cw-attr">${esc(c.attr)}</span>`;
  const main=c=>{const d=details(c.id);return d?.primary?`${d.primary.kind==='heal'?'回復':label(d.primary.kind==='guard'?'guard':'power',d.primary.kind==='guard'?'身構':'突破')} ${d.primary.power} · ${label('hit','探査')} ${d.primary.hit}`:'詳細未提供';};
  function cardDetails(id){const d=details(id);if(!d)return '<p>この詳細はまだ公開されていません</p>';
   const p=d.primary,f=d.field,rows=[];const add=(k,v)=>{if(v!=null)rows.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);};
   if(p){add(p.kind==='guard'?label('guard','身構'):p.kind==='heal'?'回復':label('power','突破'),p.power);add(label('hit','探査'),p.hit);add(label('evasion','攪乱'),p.evasion);add(label('crit_gain','機転'),p.crit_gain);}
   if(f){add('場の突破／身構',f.power);add('場の探査／攪乱',f.hit);}add('期限',d.life);add('設置間隔',d.action_intervals?.place);add('一致間隔',d.action_intervals?.match);
   return `<dl class="cw-ledger">${rows.join('')}</dl>${d.effect_text?`<p>${esc(d.effect_text)}</p>`:''}${d.trigger_text?`<p>${esc(d.trigger_text)}</p>`:''}<p>${esc(retirement[d.recovery_rule]||'')}</p>`;
  }
  function prediction(){const p=state.actionPreview;if(!p||!previewChoice||JSON.stringify(previewChoice)!==JSON.stringify(choice()))return '<p>予測を確認中…</p>';
   if(!p.supported)return '<p>この行動は予測に未対応です</p>';
   const rows=[['行動間隔',p.action_cost]];
   if(p.mode==='attack'){rows.push(['対象の減少量',p.actual_hp_loss],[label('hit','探査')+'の進展',p.hit_gain]);}
   if(p.mode==='heal')rows.push(['回復',p.hp_restored]);
   if(p.mode==='guard')rows.push([label('guard','身構'),p.guard?.value],[label('evasion','攪乱'),p.guard?.evasion]);
   if(p.mode==='place')rows.push(['主効果','発動なし']);
   const expiry=(p.unused_hand_expiry||[]).filter(a=>a.expires);
   return `<dl class="cw-ledger">${rows.filter(([,v])=>v!=null).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${expiry.length?`<p class="cw-loss">期限切れ：${expiry.map(a=>`${esc(names(a.id))}（${a.destination==='destroyed'?'消滅':'共有回収'}）`).join('、')}</p>`:''}<p>現在の一手の予測です。続く相手の行動で変わります。</p>`;
  }
  function history(){return list(x()?.public_history).slice().reverse().map(r=>{
   const action=r.mode==='attack'?`${names(r.target)} ${actor(r.target)?.remaining_label||'残量'} −${r.actual_hp_loss}`:r.mode==='guard'?label('guard','身構'):r.mode==='heal'?`回復 +${r.hp_restored}`:'設置';
   return `<li class="cw-log"><time>${esc(r.time)}</time> ${r.type==='action'?`${esc(names(r.actor))} · ${esc(action)}`:'場面が変化'}</li>`;
  }).join('')||'<li>まだ履歴がありません</li>';}
  function windowContent(){const w=windowState;if(!w)return;
   let title='',body='';
   if(['card','field','preview'].includes(w.type)){title=names(w.id);body=w.type==='preview'?prediction():cardDetails(w.id);}
   if(w.type==='actor'){const a=actor(w.id);title=a?.name||'相手';body=a?`<p>${esc(a.remaining_label)} ${a.hp}/${a.max_hp}</p><p>${label('hit','探査')} ${a.hit} · ${label('crit','一閃')} ${a.crit}</p><p>${label('evasion','攪乱')} ${a.evasion} · 軽減 ${a.reduction}</p>`:'<p>この対象は離脱しました</p>';}
   if(w.type==='order'){title='行動予約';const rows=state.reservations,base=rows?.find(r=>r.actor===w.id);body=rows?`<p>${esc(names(w.id))} を基準</p><table class="cw-order-table"><thead><tr><th>順</th><th>主体</th><th>時差</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(names(r.actor))}</td><td>${r.at-(base?.at??x().now)}</td></tr>`).join('')}</tbody></table><p>現在の予約です。行動後に変わります。</p>`:'<p>予約の公開応答を確認中…</p>';}
   if(w.type==='objective'){title='目的';const t=list(data.texts).find(t=>t.id===data.case?.objective_text_id);body=`<p>${esc(t?.short_text||'目的の本文はまだ公開されていません')}</p>`;}
   if(w.type==='status'){title='状況';body=`<p>時刻 ${x().now} · 本人の行動 ${x().self.actions}回</p>`+actors().map(a=>`<p>${esc(a.name)}：${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · ${label('crit','一閃')} ${a.crit}</p>`).join('');}
   if(w.type==='deck'){title='山札';body=`<p>山札 ${x().self.deck_count}枚 · 手札 ${hand().length}枚 · 共有回収 ${x().recovery_count}枚</p><p>山札の種類別残数は、この接続版では未対応です。</p>`;}
   if(w.type==='history'){title='履歴';body=`<ol>${history()}</ol>`;}
   if(w.type==='settings'){title='操作';body=`<p>タップで選択・詳細。短く押し続けて場へ運ぶと出札できます。押してすぐ横へ動かすと手札を送ります。</p>${[['diagram','関係線を表示'],['details','選択時に詳細を開く'],['quick','通常の設置をすぐ実行'],['drag','ドラッグを使う']].map(([k,l])=>`<label><input type="checkbox" data-x-setting="${k}" ${settings[k]?'checked':''}> ${l}</label>`).join('')}<label>つかむまで <select data-x-hold><option value="150">0.15秒</option><option value="220">0.22秒</option><option value="320">0.32秒</option></select></label>`;}
   $('#cw-drawer-title').textContent=title;$('.cw-drawer-body').innerHTML=body;
   const popup=$('#cw-drawer');popup.hidden=false;popup.dataset.window=w.type;popup.setAttribute('aria-label',title);
   $('#cw-window-state').textContent=w.pinned?'◆':'◇';$('#cw-window-state').setAttribute('aria-pressed',String(w.pinned));
   if(w.type==='settings')$('[data-x-hold]').value=String(settings.hold);
  }
  function close(){windowState=null;$('#cw-drawer').hidden=true;layout();}
  function open(type,id=null,pinned=true){
   if(windowState?.pinned&&!pinned)return;
   if(pinned&&windowState?.type===type&&windowState.id===id){if(windowState.pinned){close();return;}windowState.pinned=true;}
   else windowState={type,id,pinned};
   windowContent();layout();
  }
  function redraw(){if(dead||!x())return;const c=card();
   const scrolls=['cw-actors','cw-field','cw-hand','cw-turn-order'].map(id=>[id,$('#'+id).scrollLeft]);
   root.dataset.cardDrag=String(settings.drag);root.setAttribute('aria-busy',String(!!state.pending));
   $('#cw-actors').innerHTML=actors().filter(a=>a.id!==x().self.id).map(a=>`<button type="button" class="cw-actor" data-x-actor="${esc(a.id)}" aria-pressed="${target===a.id}">${art('actors',a.purpose)}<span class="cw-face-caption"><strong>${esc(a.name)}</strong><span>${esc(a.remaining_label)} ${a.hp}/${a.max_hp}</span><progress value="${a.hp}" max="${a.max_hp}" aria-label="${esc(a.remaining_label)}"></progress></span></button>`).join('');
   const attrs=[...new Set([...field().map(c=>c.attr),...hand().map(c=>c.attr)])];
   $('#cw-field').innerHTML=attrs.map(attr=>{const f=field().find(f=>f.attr===attr),tag=f?'button':'div';return `<${tag} ${f?`type="button" data-x-field="${esc(f.id)}"`:''} class="cw-slot" data-x-attr="${esc(attr)}" data-linked="${c?.attr===attr}">${f?art('cards',f.kind):''}<span class="cw-face-caption"><strong>${esc(attr)} ${f?esc(names(f.id)):''}</strong>${f?`<span>場 ${c?.kind==='guard'&&c.attr===attr?'身構／攪乱':'突破／探査'} ${f.field_power} / ${f.field_hit}</span>`:''}</span></${tag}>`;}).join('');
   $('#cw-hand').innerHTML=hand().map(h=>`<article class="cw-hand-card" data-selected="${h.id===selected}"><button type="button" class="cw-select" data-x-card="${esc(h.id)}" aria-pressed="${h.id===selected}">${art('cards',h.kind)}<span class="cw-face-caption"><strong>${attribute(h)}${esc(names(h.id))}</strong><span>${esc(main(h))}</span><span class="${h.remaining===1?'cw-loss':''}">${h.remaining===1?'今回まで':'あと'+h.remaining+'行動'}</span></span></button></article>`).join('');
   $('#cw-turn-order').innerHTML=state.reservations?state.reservations.map(r=>`<li><button type="button" data-x-order="${esc(r.actor)}" aria-label="${esc(names(r.actor))}、次回 ${r.at}"><span class="cw-turn-face">${icon(actor(r.actor)?.purpose)}</span><span>+${r.at-x().now}</span></button></li>`).join(''):'<li>行動予約を確認中…</li>';
   $('#cw-self').textContent=`${label('hp','余力')} ${x().self.hp}/${x().self.max_hp}`;$('#cw-hand-count').textContent=`手札 ${hand().length}枚`;
   const match=c&&field().some(f=>f.attr===c.attr);$('#cw-match-label').textContent=c?c.attr+' · '+(match?'一致':'設置'):'';
   $('#cw-notice').textContent=state.pending?'処理中…':state.error?'操作結果を確認してください':c&&choices().length&&!choice()?'対象を選択':'';
   const q=choice();$('#cw-use').textContent=q?q.target?`${names(q.target)}を${actor(q.target)?.action_label||'進める'}`:match?(c.kind==='guard'?label('guard','身構'):c.kind==='heal'?'回復':'一致して使う'):'場に出す':'対象を選択';
   $('#cw-use').disabled=busy()||!q||!session.can('play');$('[data-x="preview"]').disabled=busy()||!q;
   $('[data-x="withdraw"]').disabled=busy()||!session.can('withdraw');
   if(windowState)windowContent();scrolls.forEach(([id,v])=>$('#'+id).scrollLeft=v);queueMicrotask(layout);
  }
  function layout(){if(dead)return;const rr=root.getBoundingClientRect();if(!rr.width||!rr.height)return;
   const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
   root.style.setProperty('--cw-footer-height',(rr.width<=600?(coarse?96:76):(coarse?48:32))+'px');
   const node=[...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===selected),cr=node?.getBoundingClientRect(),track=$('#cw-action-track'),tr=track.getBoundingClientRect(),dock=$('#cw-action-anchor');
   dock.hidden=!node;if(node){const width=dock.getBoundingClientRect().width||164;dock.style.left=Math.max(0,Math.min(tr.width-width,(cr.left+cr.right)/2-tr.left-width/2))+'px';}
   for(const el of root.querySelectorAll('[data-track]')){const row=$('#'+el.dataset.track),overflow=row.scrollWidth>row.clientWidth+2;el.dataset.hidden=String(!overflow);el.querySelector('span').textContent=row.children.length+'件';el.querySelector('button:first-child').disabled=row.scrollLeft<=2;el.querySelector('button:last-child').disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-2;}
   if(windowState){const popup=$('#cw-drawer'),type=windowState.type,margin=10;
    const width=Math.min(type==='preview'?420:560,rr.width-2*margin);popup.style.width=width+'px';popup.style.height='auto';
    const hr=$('#cw-hand').getBoundingClientRect(),fr=$('#cw-field').getBoundingClientRect();let top=margin,max=rr.height-2*margin;
    if(type==='card'||type==='preview'){max=Math.max(100,hr.top-rr.top-2*margin);}
    else if(type==='field'){top=fr.bottom-rr.top+margin;max=Math.max(100,rr.height-top-margin);}
    else if(type==='actor'||type==='order'){top=$('#cw-actors').getBoundingClientRect().bottom-rr.top+margin;max=Math.max(100,rr.height-top-margin);}
    popup.style.maxHeight=Math.min(max,rr.height-2*margin)+'px';popup.style.top=Math.max(margin,Math.min(top,rr.height-popup.getBoundingClientRect().height-margin))+'px';
    const center=cr?(cr.left+cr.right)/2-rr.left:rr.width/2;popup.style.left=Math.max(margin,Math.min(rr.width-width-margin,center-width/2))+'px';
   }
   drawRelations(rr);
  }
  function drawRelations(rr){const svg=$('#cw-relations'),c=card(),q=choice();svg.replaceChildren();svg.hidden=!settings.diagram||!c;svg.toggleAttribute('hidden',!settings.diagram||!c);if(!settings.diagram||!c)return;
   svg.setAttribute('viewBox',`0 0 ${rr.width} ${rr.height}`);
   const point=(node,track,edge)=>{if(!node)return null;const b=node.getBoundingClientRect(),r=track.getBoundingClientRect();const l=Math.max(b.left,r.left,rr.left),right=Math.min(b.right,r.right,rr.right);if(right-l<4)return null;return {x:(l+right)/2-rr.left,y:(edge==='top'?b.top:b.bottom)-rr.top};};
   const h=point([...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===c.id),$('#cw-hand'),'top');
   const fNode=[...root.querySelectorAll('[data-x-attr]')].find(e=>e.dataset.xAttr===c.attr),fBottom=point(fNode,$('#cw-field'),'bottom'),fTop=point(fNode,$('#cw-field'),'top');
   const dst=q?.target?[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===q.target):null;
   const end=dst?point(dst,$('#cw-actors'),'bottom'):null;
   const ns='http://www.w3.org/2000/svg';
   for(const [a,b] of [[h,fBottom],[fTop,end]])if(a&&b){const p=document.createElementNS(ns,'path'),mid=(a.y+b.y)/2;p.setAttribute('d',`M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2');svg.append(p);}
  }
  async function select(id){if(busy())return;const previous=selected;selected=id;const legal=choices();if(!legal.some(q=>q.target===target))target=legal.length===1?legal[0].target:target;previewChoice=null;redraw();if(settings.details)open('card',id,true);else if(previous===id)open('card',id,true);}
  async function preview(pinned=true){const q=choice();if(!q||busy())return;previewChoice=JSON.parse(JSON.stringify(q));windowState={type:'preview',id:selected,pinned};await session.previewAction(q);if(!dead){windowContent();layout();}}
  async function perform(){const q=choice();if(!q||busy())return;close();const r=await session.play(q);if(r.ok){selected=null;target=null;previewChoice=null;}if(!dead)redraw();}
  root.addEventListener('click',async e=>{
   if(Date.now()<suppressUntil){e.preventDefault();e.stopPropagation();return;}
   const c=e.target.closest('[data-x-card]');if(c){await select(c.dataset.xCard);return;}
   const a=e.target.closest('[data-x-actor]');if(a){target=a.dataset.xActor;previewChoice=null;redraw();open('actor',target);return;}
   const f=e.target.closest('[data-x-field]');if(f){open('field',f.dataset.xField);return;}
   const o=e.target.closest('[data-x-order]');if(o){open('order',o.dataset.xOrder);return;}
   const scroll=e.target.closest('[data-x-scroll]');if(scroll){const row=$('#'+scroll.closest('[data-track]').dataset.track);row.scrollLeft+=Number(scroll.dataset.xScroll)*row.clientWidth*.8;layout();return;}
   const b=e.target.closest('[data-x]');if(!b){if(windowState&&!e.target.closest('#cw-drawer'))close();return;}if(b.disabled)return;
   const k=b.dataset.x;if(k==='close'){close();return;}if(k==='pin'){windowState.pinned=!windowState.pinned;windowContent();return;}
   if(k==='preview'){await preview();return;}if(k==='use'){await perform();return;}if(k==='scene'){onScene?.();return;}if(k==='withdraw'){onWithdraw?.();return;}open(k);
  },{signal:events.signal});
  root.addEventListener('change',e=>{const k=e.target.dataset.xSetting;if(k)settings[k]=e.target.checked;if(e.target.hasAttribute('data-x-hold'))settings.hold=Number(e.target.value);root.dataset.cardDrag=String(settings.drag);layout();},{signal:events.signal});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelDrag();close();}},{signal:events.signal});
  root.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;clearTimeout(leaveTimer);const b=e.target.closest('.cw-menu [data-x],#cw-use');if(!b||b.contains(e.relatedTarget)||(windowState?.pinned&&b.id!=='cw-use'))return;clearTimeout(hoverTimer);hoverTimer=later(()=>{if(b.id==='cw-use')preview(false);else if(!['scene'].includes(b.dataset.x))open(b.dataset.x,null,false);},180);},{signal:events.signal});
  root.addEventListener('pointerout',e=>{if(e.target.contains(e.relatedTarget))return;clearTimeout(hoverTimer);if(!e.relatedTarget?.closest?.('#cw-drawer'))leaveTimer=later(()=>{if(windowState&&!windowState.pinned)close();},160);},{signal:events.signal});
  function cancelDrag(){if(!drag)return;clearTimeout(drag.timer);if(root.hasPointerCapture?.(drag.pointer))root.releasePointerCapture(drag.pointer);drag=null;$('#cw-drag-ghost').hidden=true;$('#cw-drop-zone').dataset.drag='false';}
  root.addEventListener('pointerdown',e=>{const c=e.target.closest('[data-x-card]');if(!c||!settings.drag||busy()||e.button!==0)return;
   drag={id:c.dataset.xCard,pointer:e.pointerId,x:e.clientX,y:e.clientY,initialScroll:$('#cw-hand').scrollLeft,scroll:false,held:false,token:state.view.meta.view_token};
   const current=drag;current.timer=later(()=>{if(drag!==current||drag.scroll)return;drag.held=true;selected=drag.id;const qs=choices();if(qs.length===1)target=qs[0].target;close();const ghost=$('#cw-drag-ghost');ghost.textContent=names(drag.id);ghost.hidden=false;$('#cw-drop-zone').dataset.drag='true';root.setPointerCapture?.(e.pointerId);},settings.hold);
  },{signal:events.signal});
  root.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.held&&(drag.scroll||Math.hypot(dx,dy)>8)){clearTimeout(drag.timer);drag.scroll=true;$('#cw-hand').scrollLeft=drag.initialScroll-dx;e.preventDefault();layout();return;}
   if(drag.held){e.preventDefault();const r=root.getBoundingClientRect(),g=$('#cw-drag-ghost');g.style.left=Math.max(0,Math.min(r.width-180,e.clientX-r.left-90))+'px';g.style.top=Math.max(0,e.clientY-r.top-70)+'px';}
  },{signal:events.signal,passive:false});
  root.addEventListener('pointerup',async e=>{const d=drag;if(!d)return;const hit=document.elementFromPoint?.(e.clientX,e.clientY);cancelDrag();if(!d.held&&!d.scroll)return;suppressUntil=Date.now()+500;if(!d.held||d.token!==state.view.meta.view_token)return;redraw();
   if(!hit?.closest?.('#cw-drop-zone'))return;
   const q=choice();if(!q)return;
   const r=await session.previewAction(q);previewChoice=JSON.parse(JSON.stringify(q));if(!r.ok)return;
   const p=session.state().actionPreview,loses=(p?.unused_hand_expiry||[]).some(a=>a.expires&&a.destination==='destroyed');
   if(settings.quick&&p?.mode==='place'&&!loses)await perform();else{windowState={type:'preview',id:selected,pinned:true};windowContent();layout();}
  },{signal:events.signal});
  root.addEventListener('pointercancel',cancelDrag,{signal:events.signal});
  root.addEventListener('scroll',layout,{capture:true,signal:events.signal});
  const observer=new ResizeObserver(layout);observer.observe(root);
  function update(d,s=session.state()){data=d;state=s;if(!x())return;
   const token=s.view.meta.view_token;if(previousToken&&token!==previousToken){cancelDrag();selected=null;target=null;previewChoice=null;close();}previousToken=token;
   if(selected&&!hand().some(c=>c.id===selected)){selected=null;close();}redraw();
   if(!state.reservations&&!state.pending&&!state.error&&reservationToken!==token&&session.can('previewAction')){reservationToken=token;queueMicrotask(()=>{if(!dead)session.reservations();});}
  }
  update(data,state);
  return {update,dispose(){dead=true;cancelDrag();observer.disconnect();events.abort();for(const t of timers)clearTimeout(t);root.replaceChildren();root.classList.remove('cw-explore');}};
 };
})(globalThis.CrossweaveUI);
