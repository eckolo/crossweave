  let drag=null,opener=null,suppressClickUntil=0;
  const settings=()=>({quick:get('cw-quick-setting').checked,drag:get('cw-drag-setting').checked,hold:Number(get('cw-hold-setting').value)});
  const holdSlop=8;
  const currentCard=()=>game.public().actors.P.hand.find(c=>c.id===selected);
  const lossOnPlacement=c=>game.public().actors.P.hand.filter(x=>x.id!==c.id&&x.remaining===1&&(x.consume_on_recover||x.doomed||x.birth==='filler'));
  let changedAttrs=new Set();
  function render(){
    const s=game.public(),p=s.actors.P,active=Object.keys(s.actors).filter(w=>w!=='P'&&s.actors[w].active);
    if(!active.includes(target))target=null;
    if(!p.hand.some(c=>c.id===selected))selected=null;
    const c=p.hand.find(x=>x.id===selected),mid=c?s.field[c.attr]:null;
    const offsets=Object.fromEntries(['cw-actors','cw-field','cw-hand'].map(id=>[id,get(id).scrollLeft]));
    get('cw-phase').textContent=phases[s.current_event];
    get('cw-self').innerHTML=`<span>あなた　HP ${p.hp}/${p.max_hp}</span><span>命中蓄積 ${p.hit} · 会心 ${p.crit}</span><span>${p.guard?esc(guardText(p)):'防御なし'}</span>`;
    get('cw-actors').innerHTML=active.map(w=>{const a=s.actors[w];return `<button type="button" class="cw-actor" data-target="${w}" aria-pressed="${target===w}"><span class="cw-actor-head"><strong>${names[w]}</strong><span>HP ${a.hp}/${a.max_hp}</span></span><progress value="${a.hp}" max="${a.max_hp}" aria-label="${names[w]}のHP"></progress><span>命中蓄積 ${a.hit} · 会心 ${a.crit}${a.guard?' · 防御中':''}</span></button>`;}).join('');
    const queue=active.filter(w=>s.actors[w].acts).sort((a,b)=>s.actors[a].next_at-s.actors[b].next_at);
    get('cw-queue').textContent=s.outcome?'探索終了':queue.length?`次：${names[queue[0]]} ${s.actors[queue[0]].next_at}`:'今：あなた';
    get('cw-actor-details').innerHTML=['P',...active].map(w=>{const a=s.actors[w];return `<div class="cw-log">${names[w]}：HP ${a.hp}/${a.max_hp}、命中蓄積 ${a.hit}、会心 ${a.crit}、${esc(guardText(a))}、回避合計 ${signed(a.evasion)}、軽減 ${a.reduction||0}${a.acts?'、次回 '+a.next_at:''}</div>`;}).join('');
    get('cw-match-label').textContent=c?`${c.attr}属性へ${mid?' · 一致':' · 設置'}`:'札をここへドラッグ';
    get('cw-field').innerHTML=CWFeedback.attributes(game,knownAttrs).map(attr=>{const f=s.field[attr];return `<div class="cw-slot" data-attr="${esc(attr)}" data-linked="${c?.attr===attr}" data-changed="${changedAttrs.has(attr)}"><div>${attrBadge(attr)}${f?'場札':'空き'}${changedAttrs.has(attr)?' · 変化':''}</div>${f?`<strong>${esc(cardName(f))}</strong><span>${fieldText(f).replace('<br>',' · ')}</span>${f.consume_on_recover||f.doomed?'<span class="cw-loss">回収で消滅</span>':''}`:'<span>同属性の札を設置</span>'}</div>`;}).join('');
    get('cw-hand-count').textContent=p.hand.length+'枚';
    const expiring=p.hand.filter(x=>x.remaining===1);get('cw-expiry-summary').textContent=expiring.length?'この手まで '+expiring.length+'枚':'';
    const config=settings();
    root.dataset.cardDrag=String(config.drag);
    get('cw-hand').innerHTML=p.hand.map(x=>{const match=!!s.field[x.attr];return `<article class="cw-hand-card" data-hand-id="${x.id}" data-selected="${selected===x.id}" data-dragging="${drag?.started&&drag.id===x.id}"><button type="button" class="cw-select" data-card="${x.id}" aria-pressed="${selected===x.id}" aria-describedby="cw-gesture-hint" ${s.outcome?'disabled':''}><strong>${attrBadge(x.attr)}${esc(cardName(x))}</strong><span>${mainText(x)}</span><span class="${x.remaining===1?'cw-loss':''}">${x.remaining===1?'この手まで':'残り'+x.remaining+'手'} · ${match?'一致':'設置'} ${game.cost(x.type,match)}</span>${x.consume_on_recover||x.doomed?'<span class="cw-loss">回収で消滅</span>':''}</button></article>`;}).join('');
    get('cw-gesture-hint').textContent=config.drag?'スワイプで手札を見る · 少し押してつかむ · タップで選択':'左右で手札を見る · タップで選択';
    get('cw-selected-line').textContent=c?`${c.attr} · ${cardName(c)}${mid?' ＋ '+cardName(mid):' → 空いている場へ'}`:'札をタップすると、予測を確認できます';
    get('cw-card-info').innerHTML=c?`<strong>${esc(cardName(c))} / ${esc(c.attr)}</strong>`+fullCard(c):'札を選んでください。';
    const needsTarget=c&&mid&&c.kind==='attack'&&!target;
    if(c&&!s.outcome&&!needsTarget){
      const pred=game.predict({card_id:c.id,target:c.kind==='attack'&&mid?target:null});
      get('cw-prediction').innerHTML=prediction(c,pred);get('cw-prediction-detail').innerHTML=previewText(c,pred);
      let brief=pred.mode==='place'?`場への補正：攻撃／防御 ${signed(c.field_power)}、命中／回避 ${signed(c.field_hit)}。コスト ${game.cost(c.type,false)}`:pred.mode==='attack'?`${names[target]}：${pred.hit_connected?'命中':'未命中'}、HP ${s.actors[target].hp} → ${s.actors[target].hp-pred.actual_hp_loss}`:pred.mode==='guard'?`防御 ${pred.guard.value}、回避 ${signed(pred.guard.evasion)}、命中する攻撃2回まで`:pred.mode==='heal'?`HP ${p.hp} → ${p.hp+pred.hp_restored}`:'一致 · 会心増加';
      const expires=p.hand.filter(x=>x.id!==c.id&&x.remaining===1),vanishes=expires.filter(x=>x.consume_on_recover||x.doomed||x.birth==='filler');
      if(mid)brief+=` · コスト ${game.cost(c.type,true)} · 会心 +${pred.crit_added}`;
      if(expires.length)brief+=`。期限切れ ${expires.length}枚${vanishes.length?'（うち消滅 '+vanishes.length+'枚）':''}`;
      if(mid&&(c.consume_on_recover||c.doomed||c.birth==='filler'||mid.consume_on_recover||mid.doomed||mid.birth==='filler'))brief+='。一致で札が消滅';
      if(mid&&p.guard)brief+='。現在の防御終了';
      get('cw-brief').textContent=brief;
    }else{get('cw-brief').textContent=s.outcome?'探索終了。参照から成果を確認できます。':needsTarget?'上の相手・環境から攻撃対象を選んでください。':config.drag?'少し押して札が浮いたら、場へ運べます。選択して下のボタンでも実行できます。':'札を選択し、下のボタンで実行できます。';get('cw-prediction').textContent=get('cw-brief').textContent;get('cw-prediction-detail').textContent='';}
    get('cw-use').textContent=c?(mid?(c.kind==='attack'?(target?names[target]+'へ攻撃':'対象を選ぶ'):'一致して使う'):c.attr+'の場へ置く'):'札を選ぶ';
    get('cw-use').disabled=!!s.outcome||!c||!!needsTarget||busy;get('cw-cancel').disabled=!c;get('cw-show-card').disabled=!c;
    const flags=[];
    if(c){const exp=p.hand.filter(x=>x.id!==c.id&&x.remaining===1);if(exp.length)flags.push('期限切れ '+exp.length+'枚');if(lossOnPlacement(c).length||(mid&&(c.consume_on_recover||c.doomed||c.birth==='filler'||mid.consume_on_recover||mid.doomed||mid.birth==='filler')))flags.push('消滅あり');if(mid&&p.guard)flags.push('防御終了');}
    get('cw-notice').textContent=[...flags,notice].filter(Boolean).join(' · ');
    get('cw-result-summary').textContent=changes.length?changes[0]+(changes.length>1?`／ほか${changes.length-1}件`:''):'まだ行動していません';
    get('cw-changes').innerHTML=changes.length?changes.map(x=>`<div class="cw-log">${esc(x)}</div>`).join(''):'まだ行動していません';
    get('cw-change-time').textContent=beforeTime===null?'':`時刻 ${beforeTime} → ${s.now}`;
    get('cw-last').innerHTML=last.map(x=>'<div class="cw-log">'+esc(x)+'</div>').join('');
    get('cw-turn').textContent=`${p.actions+(!s.outcome?1:0)}手目 · 時刻 ${s.now}`;
    get('cw-progress').textContent=`山札 ${p.deck_count}枚 · ${p.rebuilds+1}巡目 · 共通回収山 ${s.pool_count}枚`;
    const rewards=Object.values(s.rewards);get('cw-reward-summary').textContent=`成果：保護 ${rewards.filter(r=>r.protected).length}／未保護 ${rewards.filter(r=>!r.protected).length}`;
    get('cw-start-state').textContent=game.s.actors.O.active?'大岩以外の回避 +20':'大岩の遮蔽：終了';
    get('cw-build-active').textContent='今回の持込：'+CWTerrain.builds[bundle.terrain_build].label;
    get('cw-withdraw').disabled=!!s.outcome;
    get('cw-outcome').textContent=s.outcome?({clear:'探索クリア。今回の獲得成果を全て持ち帰ります。',defeat:'死亡。今回の獲得成果は全て失います。',withdrawal:'撤退。保護済みの成果を持ち帰ります。',cutoff:'試行上限の160手に到達。報酬は未精算です。'}[s.outcome]):'';
    const catalogue=CWFeedback.catalogue(game),kinds={attack:0,guard:0,heal:0,none:0},attrs={};
    for(const row of catalogue){kinds[row.card.kind]+=row.remaining;attrs[row.card.attr]=(attrs[row.card.attr]||0)+row.remaining;}
    get('cw-deck-count').textContent=`未ドロー ${p.deck_count}枚 · 手札 ${p.hand.length}枚`;
    get('cw-deck-summary').textContent=`攻撃 ${kinds.attack}／防御 ${kinds.guard}／回復 ${kinds.heal}／主効果なし ${kinds.none}。属性 `+Object.entries(attrs).map(([a,n])=>a+' '+n).join(' · ');
    get('cw-deck-title').textContent=`全${catalogue.length}種類の残数・属性・効果`;
    get('cw-deck').innerHTML='<div>残数＝未ドロー分。手札・初期持込は別集計。札順は表示しません。</div>'+catalogue.map(row=>`<article class="cw-deck-row"><strong>${attrBadge(row.card.attr)}${esc(cardName(row.card))}</strong><div>残${row.remaining} · 手札${row.hand} · 持込${row.initial}</div>${row.doomed_remaining?'<div class="cw-loss">退場由来の消滅予定 '+row.doomed_remaining+'枚</div>':''}${fullCard(row.card)}</article>`).join('');
    renderHistory();renderReferencePanels(s,active);
    for(const [id,left]of Object.entries(offsets))get(id).scrollLeft=left;
    requestAnimationFrame(updateScrollHints);
  }
  function reveal(container,element){if(!element)return;const a=container.getBoundingClientRect(),b=element.getBoundingClientRect();if(b.left<a.left)container.scrollLeft-=a.left-b.left;else if(b.right>a.right)container.scrollLeft+=b.right-a.right;}
  function selectCard(id,focus=false){if(!game.s.actors.P.hand.includes(id)||game.s.outcome)return;selected=id;notice='';render();reveal(get('cw-field'),root.querySelector(`[data-attr="${game.s.cards[id].attr}"]`));if(focus)root.querySelector(`[data-card="${id}"]`)?.focus({preventScroll:true});}
  function perform(id,expectedVersion){
    if(busy||expectedVersion!==version||game.s.outcome||!game.s.actors.P.hand.includes(id)){notice='状態が変わったため、札を選び直してください。';render();return false;}
    if(drag)clearDrag();
    const c=game.s.cards[id],mid=game.s.field[c.attr];
    if(mid&&c.kind==='attack'&&(!target||!game.s.actors[target]?.active)){selected=id;notice='攻撃対象を選んでください。';render();return false;}
    const before=game.public();busy=true;
    try{game.step({card_id:id,target:c.kind==='attack'&&mid?target:null});game.advance();version++;recordChanges(before);changedAttrs=new Set(Object.keys(game.public().field).filter(attr=>before.field[attr]?.id!==game.public().field[attr]?.id));absorb();selected=null;notice='';busy=false;render();return true;}
    catch(error){notice='処理を中断しました：'+error.message;render();return false;}
  }
  function requestCard(id,expectedVersion){
    if(expectedVersion!==version||!game.s.actors.P.hand.includes(id)||game.s.outcome){notice='状態が変わったため、札を選び直してください。';render();return;}
    selectCard(id);const c=currentCard(),match=!!game.s.field[c.attr],losses=lossOnPlacement(c);
    if(settings().quick&&!match&&!losses.length){perform(id,expectedVersion);return;}
    notice=match?'一致します。予測を確認して下のボタンで実行。':losses.length?'他の手札が消滅します。予測を確認して実行。':'予測を確認して下のボタンで実行。';render();
  }
  function updateScrollHints(){
    for(const id of ['cw-actors','cw-field','cw-hand']){const el=get(id),help=el.nextElementSibling;if(!el.clientWidth){help.dataset.hidden='true';continue;}const overflow=el.scrollWidth>el.clientWidth+2;help.dataset.hidden=String(!overflow);help.querySelector('button:first-child').disabled=el.scrollLeft<=2;help.querySelector('button:last-child').disabled=el.scrollLeft>=el.scrollWidth-el.clientWidth-2;const bounds=el.getBoundingClientRect(),visible=[...el.children].map((n,i)=>({i,r:n.getBoundingClientRect()})).filter(x=>x.r.right>bounds.left+2&&x.r.left<bounds.right-2);help.querySelector('span').textContent=visible.length?`${visible[0].i+1}–${visible.at(-1).i+1}/${el.children.length}`:'';}
  }
  function openPanel(name,from){cancelDrag();opener=from||null;get('cw-drawer').hidden=false;root.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);get('cw-drawer-title').textContent={reference:'参照・探索の操作',settings:'操作設定',card:'札と予測',result:'行動後の変化'}[name];get('cw-close').focus();}
  function closePanel(){get('cw-drawer').hidden=true;opener?.focus({preventScroll:true});}
  function releaseCapture(d){if(root.hasPointerCapture?.(d.pointerId))root.releasePointerCapture(d.pointerId);}
  function clearDrag(){const d=drag;drag=null;get('cw-drag-ghost').hidden=true;get('cw-drop-zone').dataset.drag='false';get('cw-drop-zone').dataset.over='false';root.querySelectorAll('[data-dragging="true"]').forEach(n=>n.dataset.dragging='false');if(d){clearTimeout(d.timer);suppressClickUntil=Date.now()+700;releaseCapture(d);}return d;}
  function cancelDrag(){if(!drag)return;const d=clearDrag();if(d.started&&d.version===version){selected=d.previous;notice='ドラッグを取り消しました。';render();}}
  function dragPosition(event){const rect=root.getBoundingClientRect(),ghost=get('cw-drag-ghost');ghost.style.left=Math.max(4,Math.min(rect.width-184,event.clientX-rect.left-80))+'px';ghost.style.top=Math.max(4,Math.min(rect.height-124,event.clientY-rect.top-100))+'px';const hit=document.elementFromPoint(event.clientX,event.clientY);drag.over=!!hit&&get('cw-drop-zone').contains(hit);get('cw-drop-zone').dataset.over=String(drag.over);}
  function beginHold(d){
    if(drag!==d||d.mode!=='pending'||d.distance>=holdSlop)return;
    if(!settings().drag||d.version!==version||game.s.outcome||!game.s.actors.P.hand.includes(d.id)||!get('cw-drawer').hidden){cancelDrag();return;}
    d.mode='drag';d.started=true;selectCard(d.id);
    const c=currentCard(),ghost=get('cw-drag-ghost');
    ghost.innerHTML=`<strong>${attrBadge(c.attr)}${esc(cardName(c))}</strong><span>${mainText(c)}</span>`;ghost.hidden=false;
    get('cw-drop-zone').dataset.drag='true';
    notice='つかみました · '+(game.s.field[c.attr]?'場で離すと一致の予測へ':settings().quick&&!lossOnPlacement(c).length?'場で離すと設置':'場で離すと設置の予測へ');
    get('cw-notice').textContent=notice;dragPosition({clientX:d.lastX,clientY:d.lastY});
  }
  root.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false){cancelDrag();return;}
    if(drag||(event.button!==undefined&&event.button!==0))return;
    suppressClickUntil=0;
    if(!get('cw-drawer').hidden||game.s.outcome)return;
    const body=event.target.closest('[data-card]');if(!body)return;
    const id=body.dataset.card;if(!game.s.actors.P.hand.includes(id))return;
    const config=settings();
    drag={id,pointerId:event.pointerId,pointerType:event.pointerType,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,scrollLeft:get('cw-hand').scrollLeft,manualScroll:config.drag||event.pointerType!=='touch',version,previous:selected,mode:'pending',distance:0,started:false,over:false};root.setPointerCapture?.(event.pointerId);
    const d=drag;if(config.drag)d.timer=setTimeout(()=>beginHold(d),config.hold);
  });
  root.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(drag.version!==version||!game.s.actors.P.hand.includes(drag.id)){clearDrag();notice='状態が変わったためドラッグを取り消しました。';render();return;}
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    drag.lastX=event.clientX;drag.lastY=event.clientY;
    drag.distance=Math.max(drag.distance,Math.hypot(dx,dy));
    if(drag.mode==='pending'){
      if(drag.distance<holdSlop)return;
      clearTimeout(drag.timer);drag.mode='scroll';
    }
    // Moving before the hold deadline permanently chooses browsing, regardless of angle.
    if(drag.mode==='scroll'){if(drag.manualScroll){get('cw-hand').scrollLeft=drag.scrollLeft-dx;updateScrollHints();event.preventDefault();}return;}
    if(drag.mode!=='drag')return;
    dragPosition(event);event.preventDefault();
  });
  root.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(drag.started)dragPosition(event);const d=clearDrag();
    if(d.started&&d.over&&Math.hypot(event.clientX-d.x,event.clientY-d.y)>=holdSlop){requestCard(d.id,d.version);event.preventDefault();}
    else if(d.started){if(d.version===version)selected=d.previous;notice='場の外で離したため取り消しました。';render();}
    else if(d.mode==='pending'&&d.distance<holdSlop&&Math.hypot(event.clientX-d.x,event.clientY-d.y)<holdSlop)selectCard(d.id,true);
  });
  root.addEventListener('pointercancel',event=>{if(drag&&event.pointerId===drag.pointerId)cancelDrag();});root.addEventListener('lostpointercapture',event=>{if(drag&&event.pointerId===drag.pointerId)cancelDrag();});
  window.addEventListener('blur',cancelDrag);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag();});
  root.addEventListener('contextmenu',event=>{if(drag){event.preventDefault();}});
  get('cw-hand').addEventListener('wheel',cancelDrag,{passive:true});
  get('cw-hand').addEventListener('scroll',()=>{if(drag?.mode==='pending'&&Math.abs(get('cw-hand').scrollLeft-drag.scrollLeft)>1)cancelDrag();},{passive:true});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){if(drag)cancelDrag();else if(!get('cw-drawer').hidden)closePanel();else{selected=null;notice='';render();}}});
  root.addEventListener('click',event=>{if(event.detail>0&&Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  root.addEventListener('click',event=>{
    if(event.detail>1)return;
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.open){openPanel(button.dataset.open,button);return;}
    if(button.dataset.scroll){const [id,direction]=button.dataset.scroll.split(':');const el=get(id);el.scrollBy({left:Number(direction)*Math.max(100,el.clientWidth*.75),behavior:'auto'});return;}
    if(button.dataset.target){target=button.dataset.target;render();root.querySelector(`[data-target="${target}"]`)?.focus({preventScroll:true});return;}
    if(button.dataset.card){selectCard(button.dataset.card,true);return;}
  });
  get('cw-use').addEventListener('click',event=>{if(event.detail<=1&&selected)perform(selected,version);});
  get('cw-cancel').addEventListener('click',()=>{cancelDrag();selected=null;notice='';render();});
  get('cw-close').addEventListener('click',closePanel);
  for(const id of ['cw-quick-setting','cw-drag-setting','cw-hold-setting'])get(id).addEventListener('change',()=>{cancelDrag();render();});
  get('cw-withdraw').addEventListener('click',()=>{cancelDrag();const before=game.public();game.settle('withdrawal');version++;recordChanges(before);absorb();selected=null;render();});
  get('cw-restart').addEventListener('click',()=>{cancelDrag();changedAttrs=new Set();busy=false;start();closePanel();});
  get('cw-history-order').addEventListener('change',renderHistory);
  for(const id of ['cw-actors','cw-field','cw-hand']){get(id).addEventListener('scroll',updateScrollHints,{passive:true});if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateScrollHints).observe(get(id));}
  get('cw-build').value=initialReplay.build;start();
  for(const choice of initialReplay.choices){const before=game.public();game.step(choice);game.advance();recordChanges(before);absorb();version++;}
  if(initialReplay.choices.length){selected=null;render();}
})();
