/* UI-R-002 v0.15 layout/gestures, projected exclusively from CW-M1-view-1.
 * No game object, card registry, economy, saved document, or speculative actor AI.
 */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=x=>Array.isArray(x)?x:Object.values(x||{});
 const glyph=kind=>({attack:'↗',guard:'◇',defense_support:'◇',heal:'✚',self:'●',passage:'≈',terminal:'▥',optional_enemy:'◈'})[kind]||'◇';
 const icon=kind=>`<span aria-hidden="true">${glyph(kind)}</span>`;
 const symbol=(name,fallback='◇')=>`<i data-lucide="${name}" aria-hidden="true">${fallback}</i>`;
 const menuButton=(kind,name,shape)=>`<button type="button" data-x="${kind}" aria-label="${name}" data-tooltip="${name}">${symbol(shape,({info:'i',flag:'⚑',activity:'◎','list-ordered':'≡',layers:'▤',history:'↶','sliders-horizontal':'⚙','message-square':'…','book-open':'▣',menu:'☰'})[shape])}<span>${name}</span></button>`;
 api.mountExploration=function(root,{session,display_data,onScene,onWithdraw,onCommon}){
  let data=display_data,state=session.state(),selected=null,target=null,windowState=null,windowParent=null,parentRect=null,previewChoice=null;
  let previousToken=null,reservationToken=null,dead=false,drag=null,actorPress=null,suppressUntil=0,hoverTimer=null,leaveTimer=null,forecast=null,lastShownTarget=null,lastShownReservation=null,gestureEpoch=0;
  const fhd=!!root.closest('[data-display="fhd"]');
  let pan=null,autoScrollFrame=null;
  const settings={diagram:true,details:true,quick:true,drag:true,hold:220};
  const events=new AbortController(),timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(!dead)fn();},ms);timers.add(t);return t;};
  let historyCursor=list(display_data.exploration?.public_history).length,feedTimer=null;
  const feedQueue=[],feedVisible=[];
  root.classList.add('cw-explore');root.setAttribute('aria-label','crossweave 探索');
  root.innerHTML=`<div id="cw-scene" aria-hidden="true"><div id="cw-scene-base"></div></div>
   <section class="cw-region cw-world" aria-label="相手と環境"><div class="cw-heading"><div class="cw-order-strip"><ol id="cw-turn-order" aria-label="現在の行動予約"></ol></div></div><div class="cw-scroll" id="cw-actors"></div><div class="cw-scroll-help" data-track="cw-actors"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-board" id="cw-drop-zone" aria-label="札を出す場"><div class="cw-heading"><span id="cw-match-label"></span></div><div class="cw-scroll" id="cw-field"></div><div class="cw-scroll-help" data-track="cw-field"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-hand-region" aria-label="手札"><div class="cw-heading"><span id="cw-notice" role="status"></span></div><div class="cw-scroll" id="cw-hand"></div><div class="cw-scroll-help" data-track="cw-hand"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div><div id="cw-action-track"><div class="cw-actions" id="cw-action-anchor" hidden><button type="button" data-x="preview">予測</button><button type="button" id="cw-use" data-x="use" class="cw-primary">場に出す</button></div></div></section>
   <footer class="cw-bottom"><div class="cw-footer-state"><div class="cw-self" id="cw-self" aria-label="本人の状態"></div><span id="cw-hand-count"></span></div><nav class="cw-menu" aria-label="探索メニュー">${menuButton('more','メニュー','menu')}</nav><button type="button" data-x="withdraw">撤退</button></footer>
   <div class="cw-event-region" aria-label="直前の行動"><ol id="cw-event-feed" aria-live="polite" aria-relevant="additions"></ol></div>
   <svg id="cw-relations" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden></svg><div id="cw-drag-ghost" class="cw-card-face" aria-hidden="true" hidden></div>
   <section class="cw-drawer" id="cw-drawer" role="dialog" aria-label="詳細" hidden><header><button type="button" data-x="window-back" aria-label="元の窓に戻る" hidden>${symbol('arrow-left','←')}</button><strong id="cw-drawer-title"></strong><button type="button" data-x="pin" aria-label="固定する" id="cw-window-state">${symbol('pin','📌')}</button><button type="button" data-x="close" aria-label="詳細を閉じる">×</button></header><div class="cw-drawer-body"></div></section>
   <section class="cw-drawer" id="cw-parent-drawer" role="dialog" aria-label="探索メニュー" hidden><header><strong></strong><button type="button" data-x="parent-pin" aria-label="固定する">${symbol('pin','📌')}</button><button type="button" data-x="parent-close" aria-label="窓を閉じる">×</button></header><div class="cw-drawer-body"></div></section>`;
  const $=s=>root.querySelector(s),x=()=>data.exploration,details=id=>data.details?.[id];
  const holdCue=globalThis.CrossweaveHoldCue.mount(root,{scale:()=>api.displayScale(root)});
  const hand=()=>list(x()?.hand),field=()=>list(x()?.field),actors=()=>list(x()?.actors).filter(a=>a.active);
  const card=()=>hand().find(c=>c.id===selected),actor=id=>x()?.actors?.[id]||list(x()?.actors).find(a=>a.id===id);
  const names=id=>details(id)?.name||actor(id)?.name||'札';
  // Presentation terms follow the formal glossary v1.3. Runtime stat_labels
  // still calls accumulated crit an event (一閃); do not repeat that mismatch.
  const label=(key,fallback)=>({crit:'機転',crit_gain:'機転',posture:'隠蔽',reduction:'軽減'})[key]||data.stat_labels?.[key]||fallback;
  const statDefs={power:['arrow-up-right','↗','突破'],hit:['scan-search','⌖','探査'],crit:['zap','ϟ','機転'],critical:['sparkles','✦','一閃'],guard:['shield','◇','身構'],evasion:['wind','≋','攪乱'],reduction:['shield-minus','−','軽減'],heal:['heart-plus','+','回復'],hp:['heart','♡','余力'],posture:['venetian-mask','◒','隠蔽']};
  const statExplanation={guard:'身構の合計。回数と発生源は詳細で確認',critical:'現在の一閃倍率'};
  const term=key=>symbol(statDefs[key][0],statDefs[key][1])+esc(label(key,statDefs[key][2]));
  const signed=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'±0';
  const delta=d=>d&&!Number.isFinite(d.delta)?'<small class="cw-delta" aria-label="予測未公開">?</small>':d?`<small class="cw-delta" data-delta="${d.delta}" aria-label="予測 ${signed(d.delta)}、変更後 ${d.after}">${esc(signed(d.delta))}</small>`:'';
  const stat=(key,value,d=null,maximum=null)=>`<span class="cw-stat" data-stat="${key}" aria-label="${esc(label(key,statDefs[key][2]))} ${esc(value??'—')}${maximum!=null?' / '+esc(maximum):''}" data-tooltip="${esc(statExplanation[key]||label(key,statDefs[key][2]))}${maximum!=null?' '+esc(value)+' / '+esc(maximum):''}">${symbol(statDefs[key][0],statDefs[key][1])}<b>${esc(value??'—')}</b>${delta(d)}</span>`;
  const forecastKey=(q=choice())=>q?JSON.stringify([state.view.meta.view_token,q]):null;
  const projected=()=>forecast?.key===forecastKey()?api.projectActionForecast(data,choice(),forecast.value):null;
  const actorStats=a=>{const p=projected()?.actors[a.id];return '<span class="cw-actor-stats">'+['guard','crit','evasion'].map(k=>stat(k,k==='guard'?a.defense?.guard??a.guard?.value??0:a[k],p?.[k])).join('')+'</span>';};
  const vitals=a=>{const p=projected()?.actors[a.id];return `<span class="cw-vitals">${stat('hp',a.hp,p?.hp,a.max_hp)}${stat('posture',a.posture_remaining,p?.posture,a.max_posture)}</span><span class="cw-vital-bars"><progress value="${a.hp}" max="${a.max_hp}" aria-label="${esc(a.remaining_label||'余力')}"></progress><progress value="${a.posture_remaining}" max="${a.max_posture}" aria-label="隠蔽"></progress></span>`;};
  const busy=()=>['write','inspect'].includes(state.pending?.kind)||state.canRetry||state.stale;
  const choicesFor=id=>list(x()?.legal_actions).map(a=>a.choice??a).filter(a=>a.card_id===id);
  const choices=()=>choicesFor(selected);
  const choice=()=>choices().find(a=>a.target===target)||choices().find(a=>a.target===null)||null;
  // Keep the player's target across turns, as in formal v0.15. Derive a first
  // target only from public legal choices, preferring the passage when present.
  function targetFor(legal){
   const allowed=legal.filter(a=>a.target!==null).map(a=>a.target),candidates=actors().filter(a=>a.id!==x().self.id&&(!allowed.length||allowed.includes(a.id)));
   return candidates.some(a=>a.id===target)?target:candidates.find(a=>a.purpose==='passage')?.id??candidates[0]?.id??null;
  }
  function retainTarget(legal=choices()){target=targetFor(legal);}
  const actionLabel=(c,q)=>q?q.target?(actor(q.target)?.action_label||'攻撃'):field().some(f=>f.attr===c.attr)?(c.kind==='guard'?label('guard','身構'):c.kind==='heal'?'回復':c.kind==='defense_support'?'付与':'一致して使う'):'場に置く':'対象を選択';
  function handActionLabel(id){const c=hand().find(h=>h.id===id),legal=choicesFor(id),t=targetFor(legal);return actionLabel(c,legal.find(a=>a.target===t)||legal.find(a=>a.target===null));}
  function requestForecast(retry=false){
   const q=choice(),key=forecastKey(q);if(!q||busy())return Promise.resolve(null);
   if(forecast?.key===key&&!(retry&&forecast.failed))return forecast.promise;
   // Claim the key before notifying Session. It may synchronously rerender us.
   const job=forecast={key,value:null,promise:null};
   job.promise=Promise.resolve().then(async()=>{
    if(dead||forecast!==job||forecastKey()!==key||busy())return null;
    const r=await session.previewAction(q);
    if(dead||forecast!==job||forecastKey()!==key)return null;
    job.value=r.ok?r.value:null;job.failed=!r.ok;redraw();return job.value;
   });return job.promise;
  }
  const actorIcon=a=>a?.purpose==='passage'?symbol('mountain','△'):icon(a?.purpose);
  const art=(kind,k,entity=null)=>{const a=kind==='actors'?api.actorArtwork?.(data,entity):null;return `<span class="cw-illustration" data-art-kind="${kind}" ${kind==='actors'&&entity?.purpose==='passage'?'data-terrain':''} ${a?`data-artwork="${a.id}"`: ''} aria-hidden="true">${a?`<img src="${a.src}" width="${a.width}" height="${a.height}" alt="" draggable="false">`:kind==='actors'?actorIcon(entity):icon(k)}</span>`;};
  const attribute=c=>`<span class="cw-attr">${esc(c.attr)}</span>`;
  const cardFace=(kind,name,values,attr,meta='')=>art('cards',kind)+`<span class="cw-face-caption"><strong>${esc(name)}</strong><span class="cw-stat-line">${values}</span><span class="cw-hand-meta">${attribute({attr})}${meta}</span></span>`;
  const main=c=>{const p=details(c.id)?.primary;if(!p)return '詳細未提供';if(p.kind==='defense_support')return stat('guard',p.defense_grant?.guard)+stat('evasion',p.defense_grant?.evasion)+'<small>全員付与</small>';return stat(p.kind==='guard'?'guard':p.kind==='heal'?'heal':'power',p.power)+stat(p.kind==='guard'?'evasion':'hit',p.kind==='guard'?p.evasion:p.hit);};
  function cardDetails(id){const d=details(id);if(!d)return '<p>この詳細はまだ公開されていません</p>';
   const p=d.primary,f=d.field,rows=[],h=hand().find(c=>c.id===id),match=h&&field().find(c=>c.attr===h.attr);
   const add=(key,v,extra)=>{if(v!=null)rows.push(`<dt>${term(key)}</dt><dd>${esc(v)}${extra!=null?` <small data-field-contribution>+ ${esc(extra)}（場）</small>`:''}</dd>`);};
   if(p?.kind==='defense_support'){add('guard',p.defense_grant?.guard,match?.field_power);add('evasion',p.defense_grant?.evasion,match?.field_hit);add('crit',p.crit_gain);}else if(p){add(p.kind==='guard'?'guard':p.kind==='heal'?'heal':'power',p.power,p.kind==='heal'?null:match?.field_power);if(p.kind!=='heal')add(p.kind==='guard'?'evasion':'hit',p.kind==='guard'?p.evasion:p.hit,match?.field_hit);add('crit',p.crit_gain);}
   const properties=api.effectHTML(d);
   return `<dl class="cw-ledger cw-card-primary">${rows.join('')}</dl>${f?`<h3>場に置くと</h3><dl class="cw-ledger"><dt>${term('power')}／${term('guard')}</dt><dd>${esc(f.power)}</dd><dt>${term('hit')}／${term('evasion')}</dt><dd>${esc(f.hit)}</dd></dl>`:''}<h3>次の行動まで</h3><dl class="cw-ledger"><dt>置く</dt><dd>${esc(d.action_intervals?.place??'—')}</dd><dt>一致</dt><dd>${esc(d.action_intervals?.match??'—')}</dd></dl>${properties}`;
  }
  function prediction(){const p=forecast?.key===forecastKey()?forecast.value:null;if(!p)return forecast?.failed?'<p>予測を取得できませんでした</p>':'<p>予測を確認中…</p>';
   if(!p.supported)return '<p>この行動は予測に未対応です</p>';
   const rows=[['次の行動まで',p.action_cost]];
   if(p.mode==='attack'){rows.push(['対象の余力',signed(-p.actual_hp_loss)],['隠蔽',p.posture_before+' → '+(p.posture_before-p.hit_gain)]);}
   if(p.mode==='heal')rows.push(['回復',p.hp_restored]);
   if(p.mode==='guard')rows.push([label('guard','身構'),p.guard?.value],[label('evasion','攪乱')+'（この身構）',p.guard?.evasion]);
   if(p.mode==='defense_support')rows.push(['対象','使用者以外の全員']);
   const changes=api.projectActionForecast(data,choice(),p);
   for(const a of actors()){const values=changes?.actors[a.id];if(!values)continue;for(const k of ['guard','crit','critical','evasion']){const v=values[k];if(v?.status!=='known')rows.push([a.name+' '+label(k,statDefs[k][2]),'未公開']);else if(v.delta)rows.push([a.name+' '+label(k,statDefs[k][2]),v.before+' → '+v.after]);}}
   if(p.mode==='place')rows.push(['主効果','発動なし']);
   const expiry=(p.unused_hand_expiry||[]).filter(a=>a.expires);
   return `<dl class="cw-ledger">${rows.filter(([,v])=>v!=null).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${expiry.length?`<p class="cw-loss">期限切れ：${expiry.map(a=>`${esc(names(a.id))}${a.destination==='destroyed'?'（消滅）':''}`).join('、')}</p>`:''}`;
  }
  function eventText(r){
   const action=r.mode==='attack'?`${names(r.target)} ${actor(r.target)?.remaining_label||'残量'} −${r.actual_hp_loss}`:r.mode==='guard'?label('guard','身構'):r.mode==='heal'?`回復 +${r.hp_restored}`:r.mode==='defense_support'?'全員へ防御付与':'設置';
   const name=r.card_name_status==='recorded_at_resolution'?r.card_name:null;
   return r.type==='action'?`${names(r.actor)} · ${name?'「'+name+'」':'札（名称未記録）'} · ${action}`:'場面が変化';
  }
  function history(){return list(x()?.public_history).slice().reverse().map(r=>`<li class="cw-log"><time>${esc(r.time)}</time> ${esc(eventText(r))}</li>`).join('')||'<li>まだ履歴がありません</li>';}
  // Public resolved events only. Opening/resizing the UI never replays old history.
  // Timing follows the formal feed; at most two rows protect the compact layout.
  function pumpEvent(){
   feedTimer=null;if(!feedQueue.length||feedVisible.length>=2)return;
   const row=feedQueue.shift(),node=document.createElement('li');node.className='cw-live-event';node.innerHTML=`<time>${esc(row.time)}</time><span>${esc(row.text)}</span>`;
   feedVisible.push(node);$('#cw-event-feed').prepend(node);feedVisible.forEach((el,i)=>el.style.bottom=i*(fhd?40:26)+'px');
   later(()=>{node.dataset.fading='true';},1300);
   later(()=>{const i=feedVisible.indexOf(node);if(i>=0)feedVisible.splice(i,1);node.remove();feedVisible.forEach((el,j)=>el.style.bottom=j*(fhd?40:26)+'px');if(feedTimer===null)pumpEvent();},2800);
   feedTimer=later(pumpEvent,260);
  }
  function updateEvents(){const rows=list(x()?.public_history);if(rows.length<historyCursor){feedQueue.length=0;feedVisible.splice(0).forEach(el=>el.remove());historyCursor=rows.length;return;}
   feedQueue.push(...rows.slice(historyCursor).map(r=>({time:r.time,text:eventText(r)})));historyCursor=rows.length;if(feedTimer===null)pumpEvent();
  }
  function windowContent(w=windowState,popup=$('#cw-drawer')){if(!w)return;
   let title='',body='';
   if(['card','field','preview'].includes(w.type)){title=names(w.id);body=w.type==='preview'?prediction():cardDetails(w.id);}
   if(w.type==='actor'){const a=actor(w.id);title=a?.name||'相手';body=a?`<p>${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · 隠蔽 ${a.posture_remaining}/${a.max_posture}</p><dl class="cw-ledger">${['guard','crit','evasion'].map(k=>`<dt>${term(k)}</dt><dd>${esc(k==='guard'?a.defense?.guard??a.guard?.value??0:a[k])}</dd>`).join('')}</dl>`+(a.defense?.effects.length?'<h3>防御の内訳</h3><p>身構 '+esc(api.defenseDuration(a.defense.duration.guard))+' · 攪乱 '+esc(api.defenseDuration(a.defense.duration.evasion))+'</p><ul>'+a.defense.effects.map(e=>'<li>'+esc(names(e.source_actor_id))+' · 身構 '+e.guard+' / 攪乱 '+e.evasion+' · '+(e.uses===null?'回数制限なし':e.uses+'回')+'</li>').join('')+'</ul>':'')+(a.knowledge_key&&onCommon?'<button type="button" data-x="actor-record" data-key="'+esc(a.knowledge_key)+'">調査記録</button>':''):'<p>この対象は離脱しました</p>';}
   if(w.type==='order'){const predicted=forecast?.key===forecastKey()?api.projectReservations(data,forecast.value):null,rows=predicted?.flatMap(g=>g.rows)||state.reservations||forecast?.value?.current_reservations;title=predicted?'行動後の予約':'行動予約';body=rows?`<ol class="cw-reservations">${rows.map(r=>`<li ${r.nextSelf?'data-self-next':''}><span>${esc(names(r.actor))}${r.nextSelf?'・次':''}</span><b>${esc(signed(r.at-x().now))}</b></li>`).join('')}</ol>`:'<p>予約の公開応答を確認中…</p>';}
   if(w.type==='more'){title='探索メニュー';body=`<nav class="cw-more">${[['objective','目的','flag'],['status','状況','activity'],['order','行動順','list-ordered'],['deck','山札','layers'],['history','履歴','history'],['texts','文章の記録','book-open'],['records','調査記録','book-open'],['settings','操作','sliders-horizontal'],['menu','設定・保存','settings']].filter(([k])=>onCommon||!['records','menu','texts'].includes(k)).map(args=>menuButton(...args)).join('')}</nav>`;}
   if(w.type==='objective'){title='目的';const t=list(data.texts).find(t=>t.id===data.case?.objective_text_id);body=`<p>${esc(t?.short_text||'目的の本文はまだ公開されていません')}</p>`;}
   if(w.type==='status'){title='状況';body=`<p>時刻 ${x().now} · 本人の行動 ${x().self.actions}回</p>`+actors().map(a=>`<p>${esc(a.name)}：${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · ${label('crit','一閃')} ${a.crit}</p>`).join('');}
   if(w.type==='deck'){title='本人の札';body=`<p>山札 ${x().self.deck_count}枚 · 手札 ${hand().length}枚 · 共有回収 ${x().recovery_count}枚</p><table class="cw-deck-table"><thead><tr><th>札</th><th>持込</th><th>山札</th><th>手札</th></tr></thead><tbody>${(x().deck_catalogue?.entries||[]).map(r=>`<tr><td><button type="button" data-x="deck-detail" data-id="${esc(r.detail_id)}">${esc(details(r.detail_id)?.name||r.card?.name||'札')}</button></td><td>${r.initial_count??'—'}</td><td>${r.deck_count}${r.doomed_deck_count?`<small>（消滅予定${r.doomed_deck_count}）</small>`:''}</td><td>${r.hand_count}${r.doomed_hand_count?`<small>（消滅予定${r.doomed_hand_count}）</small>`:''}</td></tr>`).join('')}</tbody></table><p>相手の現在の内訳・共有回収の内訳は未公開</p>`;}
   if(w.type==='history'){title='履歴';body=`<ol>${history()}</ol>`;}
   if(w.type==='settings'){title='操作';body=`<p>札も相手もクリックで選択・詳細。相手を選ぶと行動の対象も切り替わります。札を短く押し続けて場へ運ぶと出札できます。押してすぐ横へ動かすと手札を送ります。</p>${[['diagram','関係線を表示'],['details','選択時に詳細を開く'],['quick','通常の設置をすぐ実行'],['drag','ドラッグを使う']].map(([k,l])=>`<label><input type="checkbox" data-x-setting="${k}" ${settings[k]?'checked':''}> ${l}</label>`).join('')}<label>つかむまで <select data-x-hold><option value="150">0.15秒</option><option value="220">0.22秒</option><option value="320">0.32秒</option></select></label>`;}
   const bodyNode=popup.querySelector('.cw-drawer-body'),key=w.type+':'+w.id,same=bodyNode.dataset.content===key,scroll=same?bodyNode.scrollTop:0;
   popup.querySelector('header strong').textContent=w.type==='preview'?'予測 · '+title:title;bodyNode.innerHTML=body;bodyNode.dataset.content=key;bodyNode.scrollTop=scroll;
   popup.hidden=false;popup.dataset.window=w.type;popup.setAttribute('aria-label',title);
   const pin=popup.querySelector('[data-x="pin"],[data-x="parent-pin"]');pin.innerHTML=symbol('pin','📌');pin.setAttribute('aria-pressed',String(w.pinned));pin.setAttribute('aria-label',w.pinned?'固定を外す':'固定する');pin.dataset.tooltip=w.pinned?'固定を外す':'固定する';
   if(popup.id==='cw-drawer'){
    $('[data-x="preview"]').setAttribute('aria-expanded',String(w.type==='preview'));
    $('[data-x="window-back"]').hidden=!windowParent;
    $('#cw-parent-drawer').hidden=!windowParent;
    if(windowParent)windowContent(windowParent,$('#cw-parent-drawer'));
   }
   if(w.type==='settings')$('[data-x-hold]').value=String(settings.hold);
   if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:16,height:16}});
  }
  function close(){clearTimeout(hoverTimer);clearTimeout(leaveTimer);windowState=null;windowParent=null;parentRect=null;$('#cw-parent-drawer').hidden=true;$('#cw-drawer').hidden=true;$('[data-x="preview"]').setAttribute('aria-expanded','false');$('.cw-drawer-body').dataset.content='';layout();}
  function backWindow(){if(windowParent){windowState=windowParent;windowParent=null;parentRect=null;windowContent();layout();}else close();}
  function open(type,id=null,pinned=true,source=null){
   if(windowState?.pinned&&!pinned)return;
   gestureEpoch++;clearTimeout(hoverTimer);clearTimeout(leaveTimer);cancelDrag();
   cancelActorPress(true);
   if(source){if(windowState?.type==='more'){windowParent={...windowState};const a=api.uiRect(source,root);parentRect=a?{left:a.x,top:a.y,width:a.w,height:a.h}:null;}}
   else {windowParent=null;parentRect=null;}
   if(pinned&&windowState?.type===type&&windowState.id===id){if(windowState.pinned){close();return;}windowState.pinned=true;}
   else windowState={type,id,pinned};
   windowContent();layout();
  }
  function redraw(){if(dead||!x())return;const c=card();
   const scrolls=['cw-actors','cw-field','cw-hand','cw-turn-order'].map(id=>[id,$('#'+id).scrollLeft]);
   root.dataset.cardDrag=String(settings.drag);root.setAttribute('aria-busy',String(!!state.pending));
   $('#cw-actors').innerHTML=actors().filter(a=>a.id!==x().self.id).map(a=>`<article class="cw-actor-item"><button type="button" class="cw-actor" data-x-actor="${esc(a.id)}" aria-label="${target===a.id?'対象：':''}${esc(a.name)}。クリックで選択・詳細" aria-pressed="${target===a.id}">${art('actors',a.purpose,a)}<span class="cw-face-caption"><strong>${target===a.id?`<span class="cw-target-mark" aria-hidden="true">${symbol('crosshair','⊕')}</span>`:''}${esc(a.name)}</strong>${vitals(a)}${actorStats(a)}</span></button></article>`).join('');
   const attrs=[...new Set([...field().map(c=>c.attr),...hand().map(c=>c.attr)])];
   const fieldPrediction=projected()?.field;
   $('#cw-field').innerHTML=attrs.map(attr=>{const f=field().find(f=>f.attr===attr),ghost=!f&&fieldPrediction?.kind==='place'&&fieldPrediction.attr===attr?fieldPrediction:null,consumes=f&&fieldPrediction?.kind==='consume'&&fieldPrediction.id===f.id,tag=f?'button':'div',guard=['guard','defense_support'].includes(c?.kind)&&c.attr===attr;return `<${tag} ${f?`type="button" data-x-field="${esc(f.id)}"`:''} class="cw-slot${f||ghost?' cw-card-face':''}${ghost?' cw-field-forecast':''}" data-x-attr="${esc(attr)}" data-linked="${c?.attr===attr}" data-forecast="${ghost?'place':consumes?'consume':''}">${f||ghost?cardFace(f?.kind||c?.kind,f?names(f.id):ghost.name,stat(guard?'guard':'power',f?f.field_power:ghost.power)+stat(guard?'evasion':'hit',f?f.field_hit:ghost.hit),attr):`<span class="cw-face-caption"><strong>${esc(attr)}</strong></span>`}${ghost||consumes?`<small class="cw-field-change">${ghost?'＋ 予測':'使用後に場から離れる'}</small>`:''}</${tag}>`;}).join('');
   $('#cw-hand').innerHTML=hand().map(h=>`<article class="cw-hand-card" data-selected="${h.id===selected}"><button type="button" class="cw-select cw-card-face" data-x-card="${esc(h.id)}" aria-pressed="${h.id===selected}" aria-description="ホールドで出札を準備">${cardFace(h.kind,names(h.id),main(h),h.attr,`<span class="cw-life ${h.remaining===1?'cw-loss':''}">${h.remaining===1?'今回まで':'あと'+h.remaining+'行動'}</span>`)}</button></article>`).join('');
   const reservations=state.reservations||forecast?.value?.current_reservations;
   const predicted=forecast?.key===forecastKey()?api.projectReservations(data,forecast.value):null;
   const turnFace=r=>{const a=api.actorArtwork?.(data,actor(r.actor));return `<button type="button" data-x-order="${esc(r.actor)}" ${r.nextSelf?'data-self-next':''} aria-label="${esc(names(r.actor))}、${r.nextSelf?'行動後の次回予約':'予約'} +${r.at-x().now}"><span class="cw-turn-face">${a?`<img src="${a.src}" alt="" draggable="false">`:actorIcon(actor(r.actor))}</span>${r.nextSelf?'<b>次</b>':''}</button>`;};
   $('#cw-turn-order').setAttribute('aria-label',predicted?'行動後の本人と現在の相手の予約':'現在の行動予約');
   $('#cw-turn-order').innerHTML=predicted?'<li class="cw-turn-now">本人・今</li>'+predicted.map(g=>`<li class="cw-turn-group" data-at="${g.at}" ${g.rows.length>1?'aria-label="同時刻の予約"':''}>${g.rows.map(turnFace).join('')}<span>+${g.at-x().now}</span></li>`).join(''):reservations?reservations.map(r=>`<li>${turnFace(r)}<span>+${r.at-x().now}</span></li>`).join(''):'<li>行動予約を確認中…</li>';
   const nextIndex=predicted?.findIndex(g=>g.rows.some(r=>r.nextSelf)),nextGroup=nextIndex>=0?predicted[nextIndex]:null;
   const preceding=nextGroup?predicted.slice(0,nextIndex).reduce((n,g)=>n+g.rows.length,0):0;
   const position=nextGroup?(nextGroup.rows.length>1?(preceding+1)+'〜'+(preceding+nextGroup.rows.length):String(preceding+1)):null;
   const forecastButton=$('[data-x="preview"]');forecastButton.innerHTML='<span>予測</span>'+(position?'<small class="cw-next-position" aria-hidden="true">本人→<b>'+position+'</b></small>':'');
   forecastButton.setAttribute('aria-label',position?'予測。現在の予約では、本人の次は'+position+'番目':'予測');
   $('#cw-self').innerHTML=vitals(x().self)+actorStats(x().self);$('#cw-hand-count').textContent=`手札 ${hand().length}枚`;
   const match=c&&field().some(f=>f.attr===c.attr);$('#cw-match-label').textContent=c?c.attr+' · '+(match?'一致':'設置'):'';
   $('#cw-notice').textContent=busy()?'処理中…':state.error?'操作結果を確認してください':c&&choices().length&&!choice()?'対象を選択':'';
   const q=choice(),verb=actionLabel(c,q);
   $('#cw-use').textContent=verb;$('#cw-use').setAttribute('aria-label',q?.target?names(q.target)+'を対象に'+verb:verb);
   $('#cw-use').disabled=busy()||!q||!session.can('play');$('[data-x="preview"]').disabled=(!q||busy())&&windowState?.type!=='preview';
   $('[data-x="preview"]').setAttribute('aria-expanded',String(windowState?.type==='preview'));
   $('[data-x="withdraw"]').disabled=busy()||!session.can('withdraw');
   root.dataset.selection=String(!!c);
   if(windowState)windowContent();scrolls.forEach(([id,v])=>$('#'+id).scrollLeft=v);
   root.querySelectorAll('button').forEach(b=>b.classList.add('cursor-interaction'));
   if(typeof lucide!=='undefined')lucide.createIcons({attrs:{width:16,height:16}});queueMicrotask(layout);
   if(q&&!busy())requestForecast();
  }
  function layout(){if(dead)return;const rr=api.uiSpace(root);if(!rr.width||!rr.height)return;
   root.dataset.compact=String(rr.height<410);root.dataset.dense=String(rr.height<280);
   root.style.setProperty('--cw-footer-height',fhd?'72px':'44px');
   const nextButton=$('#cw-turn-order [data-self-next]'),nextKey=nextButton?forecast?.key:null;
   if(nextKey!==lastShownReservation){const row=$('#cw-turn-order'),a=nextButton?.getBoundingClientRect(),r=row.getBoundingClientRect();if(a?.width&&r.width){if(a.left<r.left)row.scrollLeft-=(r.left-a.left)/rr.scale;else if(a.right>r.right)row.scrollLeft+=(a.right-r.right)/rr.scale;}lastShownReservation=nextKey;}

   if(lastShownTarget!==target){const selectedActor=[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===target),row=$('#cw-actors'),ar=selectedActor?.getBoundingClientRect(),trackRect=row.getBoundingClientRect();if(ar?.width&&trackRect.width){if(ar.left<trackRect.left)row.scrollLeft-=(trackRect.left-ar.left)/rr.scale;else if(ar.right>trackRect.right)row.scrollLeft+=(ar.right-trackRect.right)/rr.scale;}lastShownTarget=target;}
   const node=[...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===selected),cr=node?.getBoundingClientRect(),track=$('#cw-action-track'),tr=track.getBoundingClientRect(),dock=$('#cw-action-anchor');
   dock.hidden=!node;if(node){const width=dock.getBoundingClientRect().width/rr.scale||240;dock.style.left=Math.max(0,Math.min(tr.width/rr.scale-width,((cr.left+cr.right)/2-tr.left)/rr.scale-width/2))+'px';}
   for(const el of root.querySelectorAll('[data-track]')){const row=$('#'+el.dataset.track),overflow=row.scrollWidth>row.clientWidth+2;el.dataset.hidden=String(!overflow);el.querySelector('span').textContent=row.children.length+'件';el.querySelector('button:first-child').disabled=row.scrollLeft<=2;el.querySelector('button:last-child').disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-2;}
   if(windowState){const popup=$('#cw-drawer'),w=windowState;
    const attr={card:'xCard',preview:'xCard',actor:'xActor',field:'xField',order:'xOrder'}[w.type];
    const source=attr?[...root.querySelectorAll('[data-x-card],[data-x-actor],[data-x-field],[data-x-order]')].find(e=>e.dataset[attr]===w.id):root.querySelector('[data-x="'+w.type+'"]');
    const rect=el=>api.uiRect(el,root);
    const anchor=rect(source);
    const avoid=[rect($('#cw-actors')),!dock.hidden?rect(dock):null,rect($('.cw-bottom'))].filter(Boolean);
    // The shorter actor summary keeps the common 13:12 ratio at a fixed 80%
    // footprint so opening it on every selection leaves the board accessible.
    const actorDetail=fhd&&w.type==='actor';
    const p=actorDetail?api.placeActorWindow({width:rr.width,height:rr.height,anchor,actors:[...root.querySelectorAll('#cw-actors>*')].map(rect)}):api.placeWindow({width:rr.width,height:rr.height,anchor,avoid,preferredWidth:fhd?520:320,preferredHeight:fhd?480:260,margin:fhd?16:6,minWidth:144,minHeight:64});
    const place=(el,q)=>Object.assign(el.style,{width:q.width+'px',height:q.height+'px',maxHeight:q.height+'px',top:q.top+'px',left:q.left+'px'});
    if(windowParent){const pair=api.placeWindowPair({width:rr.width,height:rr.height,parent:parentRect||p,preferredWidth:fhd?520:320,preferredHeight:fhd?480:260,margin:fhd?16:8,gap:fhd?16:8});place($('#cw-parent-drawer'),pair[0]);place(popup,pair[1]);}else place(popup,p);
   }
   api.layoutProse(root);drawRelations(rr);
  }
  function drawRelations(rr){const svg=$('#cw-relations'),c=card(),q=choice();svg.replaceChildren();svg.hidden=!settings.diagram||!c;svg.toggleAttribute('hidden',!settings.diagram||!c);if(!settings.diagram||!c)return;
   svg.setAttribute('viewBox',`0 0 ${rr.width} ${rr.height}`);
   const point=(node,track,edge)=>{if(!node)return null;const b=node.getBoundingClientRect(),r=track.getBoundingClientRect();const l=Math.max(b.left,r.left,rr.left),right=Math.min(b.right,r.right,rr.left+rr.width*rr.scale);if(right-l<4)return null;return {x:((l+right)/2-rr.left)/rr.scale,y:((edge==='top'?b.top:b.bottom)-rr.top)/rr.scale};};
   const h=point([...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===c.id),$('#cw-hand'),'top');
   const fNode=[...root.querySelectorAll('[data-x-attr]')].find(e=>e.dataset.xAttr===c.attr),fBottom=point(fNode,$('#cw-field'),'bottom'),fTop=point(fNode,$('#cw-field'),'top');
   const dst=q?.target?[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===q.target):null;
   const end=dst?point(dst,$('#cw-actors'),'bottom'):null;
   const ns='http://www.w3.org/2000/svg';
   for(const [a,b] of [[h,fBottom],[fTop,end]])if(a&&b){const p=document.createElementNS(ns,'path'),mid=(a.y+b.y)/2;p.setAttribute('d',`M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2');svg.append(p);}
  }
  function showSelection(type,id,previous){if(root.dataset.dense==='true'&&previous!==id)close();redraw();if(settings.details&&root.dataset.dense!=='true'||previous===id)open(type,id,true);}
  async function select(id){if(busy())return;const previous=selected;selected=id;retainTarget();previewChoice=null;showSelection('card',id,previous);}
  function selectActor(id){if(busy())return;const previous=target;target=id;previewChoice=null;showSelection('actor',id,previous);}
  async function preview(pinned=true){
   interruptGestures();
   const q=choice(),same=windowState?.type==='preview'&&windowState.id===selected;
   if(same){if(pinned&&windowState.pinned)close();else if(pinned){windowState.pinned=true;windowContent();}return;}
   if(!q||busy()||(!pinned&&windowState?.pinned))return;
   previewChoice=JSON.parse(JSON.stringify(q));windowState={type:'preview',id:selected,pinned};windowContent();layout();
   await requestForecast(true);
  }
  async function perform(){const q=choice();if(!q||busy())return;close();const r=await session.play(q);if(r.ok){selected=null;previewChoice=null;}if(!dead)redraw();}
  root.addEventListener('click',async e=>{
   if(e.detail>0&&Date.now()<suppressUntil){e.preventDefault();e.stopPropagation();return;}
   interruptGestures();
   const c=e.target.closest('[data-x-card]');if(c){await select(c.dataset.xCard);return;}
   const a=e.target.closest('[data-x-actor]');if(a){selectActor(a.dataset.xActor);return;}
   const f=e.target.closest('[data-x-field]');if(f){open('field',f.dataset.xField);return;}
   const o=e.target.closest('[data-x-order]');if(o){open('order',o.dataset.xOrder);return;}
   const scroll=e.target.closest('[data-x-scroll]');if(scroll){const row=$('#'+scroll.closest('[data-track]').dataset.track);row.scrollLeft+=Number(scroll.dataset.xScroll)*row.clientWidth*.8;layout();return;}
   const b=e.target.closest('[data-x]');if(!b){if(windowState&&!e.target.closest('.cw-drawer'))close();return;}if(b.disabled)return;
   const k=b.dataset.x;if(onCommon&&['records','menu','texts'].includes(k)){e.stopPropagation();close();onCommon(k,b);return;}if(k==='close'||k==='window-back'){backWindow();return;}if(k==='parent-close'){close();return;}if(k==='pin'||k==='parent-pin'){const w=k==='parent-pin'?windowParent:windowState;w.pinned=!w.pinned;windowContent();layout();return;}
   if(k==='actor-record'){e.stopPropagation();const key=b.dataset.key;close();onCommon?.('records',b,key);return;}if(k==='deck-detail'){open('card',b.dataset.id,true,b.closest('.cw-drawer'));return;}
   if(k==='preview'){await preview();return;}if(k==='use'){await perform();return;}if(k==='scene'){onScene?.();return;}if(k==='withdraw'){onWithdraw?.();return;}open(k,null,true,b.closest('.cw-drawer'));
  },{signal:events.signal});
  root.addEventListener('change',e=>{interruptGestures();const k=e.target.dataset.xSetting;if(k)settings[k]=e.target.checked;if(e.target.hasAttribute('data-x-hold'))settings.hold=Number(e.target.value);root.dataset.cardDrag=String(settings.drag);layout();},{signal:events.signal});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){interruptGestures();close();}},{signal:events.signal});
  root.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;clearTimeout(leaveTimer);const b=e.target.closest('.cw-menu [data-x],#cw-use');if(!b||b.disabled||b.contains(e.relatedTarget)||(windowState?.pinned&&b.id!=='cw-use'))return;clearTimeout(hoverTimer);hoverTimer=later(()=>{if(b.id==='cw-use')preview(false);else if(!['scene','records','menu'].includes(b.dataset.x))open(b.dataset.x,null,false);},180);},{signal:events.signal});
  root.addEventListener('pointerout',e=>{if(e.target.contains(e.relatedTarget))return;clearTimeout(hoverTimer);if(!e.relatedTarget?.closest?.('#cw-drawer'))leaveTimer=later(()=>{if(windowState&&!windowState.pinned)close();},160);},{signal:events.signal});
  function cancelDrag(suppress=true,repaint=true){if(drag)holdCue.cancel();if(autoScrollFrame!==null){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=null;}const d=drag;if(!d)return;drag=null;clearTimeout(d.timer);
   // Clear ownership before release, which may synchronously emit lost capture.
   if(root.hasPointerCapture?.(d.pointer))root.releasePointerCapture(d.pointer);
   $('#cw-drag-ghost').hidden=true;$('#cw-drop-zone').dataset.drag='false';if(suppress)suppressUntil=Date.now()+500;
   if(repaint&&d.held&&!dead)redraw();
  }
  // Only distinguish a click from motion/cancellation; actors have no hold timer.
  function cancelActorPress(suppress=false){if(!actorPress)return;actorPress=null;if(suppress)suppressUntil=Date.now()+500;}
  function cancelPan(){const p=pan;pan=null;if(p?.moved){suppressUntil=Date.now()+500;if(root.hasPointerCapture?.(p.pointer))root.releasePointerCapture(p.pointer);}}
  function interruptGestures(){gestureEpoch++;cancelPan();clearTimeout(hoverTimer);clearTimeout(leaveTimer);cancelActorPress(true);cancelDrag();}
  function positionHeldCard(point){
   const r=api.uiSpace(root),g=$('#cw-drag-ghost'),width=drag?.width||248,height=drag?.height||208;
   g.style.left=Math.max(0,Math.min(r.width-width,(point.clientX-r.left)/r.scale-(drag?.offsetX??width/2)))+'px';
   g.style.top=Math.max(0,Math.min(r.height-height,(point.clientY-r.top)/r.scale-(drag?.offsetY??height/2)))+'px';
  }
  function scrollWhileHeld(){
   autoScrollFrame=null;if(!drag?.held||dead)return;
   for(const row of [$('#cw-field'),$('#cw-hand')]){
    const r=row.getBoundingClientRect(),edge=64*api.displayScale(root),x=drag.lastX,y=drag.lastY;
    if(y<r.top||y>r.bottom||x<r.left||x>r.right||row.scrollWidth<=row.clientWidth)continue;
    const step=x<r.left+edge?-16:x>r.right-edge?16:0;
    if(step){row.scrollLeft=Math.max(0,Math.min(row.scrollWidth-row.clientWidth,row.scrollLeft+step));layout();}
   }
   autoScrollFrame=requestAnimationFrame(scrollWhileHeld);
  }
  root.addEventListener('pointerdown',e=>{if(e.isPrimary===false){interruptGestures();return;}if(e.button!==0||busy()||drag||actorPress||pan)return;
   gestureEpoch++;suppressUntil=0;
   const a=e.target.closest('[data-x-actor]');if(a){actorPress={pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};return;}
   const c=e.target.closest('[data-x-card]');
   if(!c){const row=e.target.closest('.cw-scroll');if(row&&!e.target.closest('button'))pan={row,pointer:e.pointerId,x:e.clientX,scroll:row.scrollLeft,moved:false};return;}
   if(!settings.drag)return;
   const rect=(c.closest('.cw-hand-card')||c).getBoundingClientRect(),scale=api.displayScale(root);
   drag={id:c.dataset.xCard,pointer:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,initialScroll:$('#cw-hand').scrollLeft,width:rect.width/scale,height:rect.height/scale,offsetX:(e.clientX-rect.left)/scale,offsetY:(e.clientY-rect.top)/scale,face:c.innerHTML,scroll:false,held:false,token:state.view.meta.view_token};
   const current=drag;current.timer=later(()=>{
    if(drag!==current||drag.scroll||dead||busy()||!settings.drag||current.token!==state.view.meta.view_token)return;
    holdCue.cancel();drag.held=true;selected=drag.id;previewChoice=null;retainTarget();close();redraw();
    const ghost=$('#cw-drag-ghost');ghost.innerHTML=drag.face;Object.assign(ghost.style,{width:drag.width+'px',height:drag.height+'px'});ghost.hidden=false;$('#cw-drop-zone').dataset.drag='true';
    positionHeldCard({clientX:drag.lastX,clientY:drag.lastY});root.setPointerCapture?.(e.pointerId);autoScrollFrame=requestAnimationFrame(scrollWhileHeld);
   },settings.hold);holdCue.start(e,settings.hold,'drag',handActionLabel(current.id));
  },{signal:events.signal});
  root.addEventListener('pointermove',e=>{holdCue.move(e);if(pan?.pointer===e.pointerId){const dx=e.clientX-pan.x;if(pan.moved||Math.abs(dx)>8){if(!pan.moved){pan.moved=true;root.setPointerCapture?.(e.pointerId);}pan.row.scrollLeft=pan.scroll-dx/api.displayScale(root);e.preventDefault();layout();}return;}if(actorPress?.pointer===e.pointerId&&Math.hypot(e.clientX-actorPress.x,e.clientY-actorPress.y)>8)actorPress.moved=true;
   if(!drag||drag.pointer!==e.pointerId)return;drag.lastX=e.clientX;drag.lastY=e.clientY;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.held&&(drag.scroll||Math.hypot(dx,dy)>8)){clearTimeout(drag.timer);holdCue.cancel();drag.scroll=true;$('#cw-hand').scrollLeft=drag.initialScroll-dx/api.displayScale(root);e.preventDefault();layout();return;}
   if(drag.held){e.preventDefault();positionHeldCard(e);}
  },{signal:events.signal,passive:false});
  root.addEventListener('pointerup',async e=>{if(pan?.pointer===e.pointerId){cancelPan();return;}if(actorPress?.pointer===e.pointerId){if(actorPress.moved)suppressUntil=Date.now()+500;cancelActorPress();return;}
   const d=drag;if(!d||d.pointer!==e.pointerId)return;const hit=document.elementFromPoint?.(e.clientX,e.clientY);cancelDrag(false,false);if(!d.held&&!d.scroll)return;suppressUntil=Date.now()+500;if(!d.held||d.token!==state.view.meta.view_token)return;redraw();
   if(!hit||!$('#cw-drop-zone').contains(hit))return;
   const q=choice();if(!q)return;
   const key=forecastKey(),epoch=gestureEpoch,p=await requestForecast();if(!p||dead||forecastKey()!==key||gestureEpoch!==epoch)return;
   previewChoice=JSON.parse(JSON.stringify(q));const loses=(p.unused_hand_expiry||[]).some(a=>a.expires&&a.destination==='destroyed');
   if(settings.quick&&p?.mode==='place'&&!loses)await perform();else{windowState={type:'preview',id:selected,pinned:true};windowContent();layout();}
  },{signal:events.signal});
  for(const type of ['pointercancel','lostpointercapture'])root.addEventListener(type,e=>{if(drag?.pointer===e.pointerId||actorPress?.pointer===e.pointerId||pan?.pointer===e.pointerId)interruptGestures();},{signal:events.signal});
  root.addEventListener('pointerleave',()=>{cancelActorPress(true);if(drag&&!drag.held)interruptGestures();},{signal:events.signal});
  root.addEventListener('contextmenu',e=>{if(drag||actorPress)e.preventDefault();},{signal:events.signal});
  root.addEventListener('scroll',e=>{if(e.target.id==='cw-actors')cancelActorPress(true);if(e.target.id==='cw-hand'&&drag&&!drag.held&&!drag.scroll&&Math.abs(e.target.scrollLeft-drag.initialScroll)>1)interruptGestures();layout();},{capture:true,signal:events.signal});
  $('#cw-hand').addEventListener('wheel',interruptGestures,{passive:true,signal:events.signal});
  window.addEventListener('blur',interruptGestures,{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)interruptGestures();},{signal:events.signal});
  document.addEventListener('pointerdown',e=>{if((drag||actorPress||pan)&&e.isPrimary===false)interruptGestures();},{capture:true,signal:events.signal});
  document.addEventListener('pointerup',e=>{if(!root.contains(e.target)&&(drag?.pointer===e.pointerId||actorPress?.pointer===e.pointerId||pan?.pointer===e.pointerId))interruptGestures();},{signal:events.signal});
  const observer=new ResizeObserver(()=>{interruptGestures();layout();});observer.observe(root);
  (root.closest('[data-display]')||root).addEventListener('cw-display-change',()=>{interruptGestures();layout();},{signal:events.signal});
  function update(d,s=session.state()){data=d;state=s;if(!x())return;api.applySceneArtwork?.($('#cw-scene-base'),data);
   updateEvents();
   const token=s.view.meta.view_token;if(previousToken&&token!==previousToken){gestureEpoch++;cancelDrag(true,false);cancelActorPress(true);selected=null;previewChoice=null;forecast=null;close();}previousToken=token;
   retainTarget();
   if(selected&&!hand().some(c=>c.id===selected)){selected=null;close();}redraw();
   if(!selected&&!state.reservations&&!state.pending&&!state.error&&reservationToken!==token&&session.can('previewAction')){reservationToken=token;queueMicrotask(()=>{if(!dead&&!selected&&!state.pending)session.reservations();});}
  }
  update(data,state);
  document.fonts?.ready.then(()=>{if(!dead)layout();});
  return {update,dispose(){dead=true;holdCue.dispose();cancelPan();cancelDrag();cancelActorPress();observer.disconnect();events.abort();for(const t of timers)clearTimeout(t);root.replaceChildren();root.classList.remove('cw-explore');}};
 };
})(globalThis.CrossweaveUI);
