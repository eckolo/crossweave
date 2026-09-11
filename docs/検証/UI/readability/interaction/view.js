  let drag=null,opener=null,suppressClickUntil=0,usePreview=false;
  const settings=()=>({quick:get('cw-quick-setting').checked,drag:get('cw-drag-setting').checked,hold:Number(get('cw-hold-setting').value)});
  const holdSlop=8;
  const currentCard=()=>game.public().actors.P.hand.find(c=>c.id===selected);
  const lossOnPlacement=c=>game.public().actors.P.hand.filter(x=>x.id!==c.id&&x.remaining===1&&(x.consume_on_recover||x.doomed||x.birth==='filler'));
  let changedAttrs=new Set();
  function render(){
    clearUsePreview();
    const s=game.public(),p=s.actors.P,active=Object.keys(s.actors).filter(w=>w!=='P'&&s.actors[w].active);
    if(!active.includes(target))target=active[0]||null;
    if(!p.hand.some(c=>c.id===selected))selected=null;
    const c=p.hand.find(x=>x.id===selected),mid=c?s.field[c.attr]:null;
    const offsets=Object.fromEntries(['cw-actors','cw-field','cw-hand'].map(id=>[id,get(id).scrollLeft]));
    get('cw-phase').textContent=phases[s.current_event];
    get('cw-self').innerHTML=`<span>あなた　HP ${p.hp}/${p.max_hp}</span><span>命中蓄積 ${p.hit} · 会心 ${p.crit}</span><span>${p.guard?esc(guardText(p)):'防御なし'}</span>`;
    get('cw-actors').innerHTML=active.map(w=>{const a=s.actors[w];return `<button type="button" class="cw-actor" data-inspect-actor="${w}" data-target="${w}" aria-pressed="${target===w}">${artMarkup('actors',w,w==='E1'?'敵の絵':'環境の絵')}<span class="cw-face-caption"><span class="cw-actor-head"><strong>${names[w]}</strong><span>HP ${a.hp}/${a.max_hp}</span></span><progress value="${a.hp}" max="${a.max_hp}" aria-label="${names[w]}のHP"></progress><span>命中蓄積 ${a.hit} · 会心 ${a.crit}${a.guard?' · 防御中':''}</span></span></button>`;}).join('');
    renderActionOrder(s);
    get('cw-objective').innerHTML=objectiveMarkup(s);
    get('cw-actor-details').innerHTML=['P',...active].map(w=>{const a=s.actors[w];return `<div class="cw-log">${names[w]}：HP ${a.hp}/${a.max_hp}、命中蓄積 ${a.hit}、会心 ${a.crit}、${esc(guardText(a))}、回避合計 ${signed(a.evasion)}、軽減 ${a.reduction||0}${a.acts?'、次回 '+a.next_at:''}</div>`;}).join('');
    get('cw-match-label').textContent=c?`${c.attr} · ${mid?'一致':'設置'}`:'';
    get('cw-field-context').hidden=!c;
    get('cw-field').innerHTML=CWFeedback.attributes(game,knownAttrs).map(attr=>{const f=s.field[attr],tag=f?'button':'div';return `<${tag} ${f?`type="button" data-field-card="${f.id}" aria-label="${esc(cardName(f))}の詳細"`:''} class="cw-slot" data-attr="${esc(attr)}" data-linked="${c?.attr===attr}" data-changed="${changedAttrs.has(attr)}">${f?artMarkup('cards',f.type,''):''}<span class="cw-face-caption"><span>${attrBadge(attr)}${changedAttrs.has(attr)?' · 変化':''}</span>${f?`<strong>${esc(cardName(f))}</strong><span>${fieldText(f).replace('<br>',' · ')}</span>${f.consume_on_recover||f.doomed?'<span class="cw-loss">回収で消滅</span>':''}`:''}</span></${tag}>`;}).join('');
    get('cw-hand-count').textContent=p.hand.length+'枚';
    const expiring=p.hand.filter(x=>x.remaining===1);get('cw-expiry-summary').textContent=expiring.length?'今回まで '+expiring.length+'枚':'';
    const config=settings();
    root.dataset.cardDrag=String(config.drag);
    get('cw-hand').innerHTML=p.hand.map(x=>{const match=!!s.field[x.attr];return `<article class="cw-hand-card" data-hand-id="${x.id}" data-selected="${selected===x.id}" data-dragging="${drag?.started&&drag.id===x.id}"><button type="button" class="cw-select" data-card="${x.id}" aria-pressed="${selected===x.id}" aria-describedby="cw-gesture-hint" ${s.outcome?'disabled':''}>${artMarkup('cards',x.type,'手札の絵')}<span class="cw-face-caption"><strong>${attrBadge(x.attr)}${esc(cardName(x))}</strong><span>${mainText(x)}</span><span class="${x.remaining===1?'cw-loss':''}">${x.remaining===1?'今回まで':'あと'+x.remaining+'行動'} · ${match?'一致':'設置'} ${game.cost(x.type,match)}</span>${x.consume_on_recover||x.doomed?'<span class="cw-loss">回収で消滅</span>':''}</span></button></article>`;}).join('');
    const tapHint=get('cw-peek-setting').checked?'タップで詳細':'タップで選択 · 同じ札をもう一度押すと詳細';
    get('cw-gesture-hint').textContent=config.drag?'スワイプで見る · 少し押してつかむ · '+tapHint:'左右で手札を見る · '+tapHint;
    get('cw-selected-line').textContent=c?`${c.attr} · ${cardName(c)}${mid?' ＋ '+cardName(mid):' → 空いている場へ'}`:'札をタップすると、予測を確認できます';
    get('cw-card-info').innerHTML=c?`<strong>${esc(cardName(c))} / ${esc(c.attr)}</strong>`+fullCard(c):'札を選んでください。';
    const needsTarget=c&&mid&&c.kind==='attack'&&!target;
    get('cw-card-targets').innerHTML=c&&mid&&c.kind==='attack'?`<span>対象</span>`+active.map(id=>`<button type="button" data-target="${id}" aria-pressed="${target===id}">${esc(names[id])}</button>`).join(''):'';
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
    }else{get('cw-brief').textContent=s.outcome?'探索終了':needsTarget?'上の相手・環境から攻撃対象を選んでください。':config.drag?'少し押して札が浮いたら、場へ運べます。選択して札の近くのボタンでも実行できます。':'札を選択し、札の近くのボタンで実行できます。';get('cw-prediction').textContent=get('cw-brief').textContent;get('cw-prediction-detail').textContent='';}
    get('cw-use').textContent=c?(mid?(c.kind==='attack'?(target?names[target]+'へ攻撃':'対象を選ぶ'):'一致して使う'):'場に出す'):'札を選ぶ';
    get('cw-use').disabled=!!s.outcome||!c||!!needsTarget||busy;
    const flags=[];
    if(c){const exp=p.hand.filter(x=>x.id!==c.id&&x.remaining===1);if(exp.length)flags.push('期限切れ '+exp.length+'枚');if(lossOnPlacement(c).length||(mid&&(c.consume_on_recover||c.doomed||c.birth==='filler'||mid.consume_on_recover||mid.doomed||mid.birth==='filler')))flags.push('消滅あり');if(mid&&p.guard)flags.push('防御終了');}
    get('cw-notice').textContent=[...flags,needsTarget?'攻撃対象を選択':notice].filter(Boolean).join(' · ');
    get('cw-result-summary').textContent=changes.length?changes[0]+(changes.length>1?`／ほか${changes.length-1}件`:''):'まだ行動していません';
    get('cw-changes').innerHTML=changes.length?changes.map(x=>`<div class="cw-log">${esc(x)}</div>`).join(''):'まだ行動していません';
    get('cw-change-time').textContent=beforeTime===null?'':`時刻 ${beforeTime} → ${s.now}`;
    get('cw-last').innerHTML=last.map(x=>'<div class="cw-log">'+esc(x)+'</div>').join('');
    get('cw-turn').textContent=`自分の行動 ${p.actions+(!s.outcome?1:0)}回目 · 時刻 ${s.now}`;
    get('cw-progress').textContent=`山札 ${p.deck_count}枚 · ${p.rebuilds+1}巡目 · 共通回収山 ${s.pool_count}枚`;
    get('cw-start-state').textContent=game.s.actors.O.active?'大岩以外の回避 +20':'大岩の遮蔽：終了';
    get('cw-withdraw').disabled=false;get('cw-withdraw').textContent=s.outcome?'帰還':'撤退';get('cw-withdraw').classList.toggle('cw-withdraw',!s.outcome);
    get('cw-outcome').textContent=s.outcome?({clear:'探索を突破しました',defeat:'HPが尽きました',withdrawal:'撤退しました',cutoff:'探索終了'}[s.outcome]):'';
    const settlement=game.s.settlement;
    get('cw-loot').innerHTML=settlement?[...settlement.kept.map(k=>`<div>${esc(rewardNames[k])}</div>`),...settlement.lost.map(k=>`<div class="cw-loss">${esc(rewardNames[k])} · 失った</div>`)].join('')||'なし':'';
    get('cw-reenter').disabled=!s.outcome;
    const catalogue=CWFeedback.catalogue(game),kinds={attack:0,guard:0,heal:0,none:0},attrs={};
    for(const row of catalogue){kinds[row.card.kind]+=row.remaining;attrs[row.card.attr]=(attrs[row.card.attr]||0)+row.remaining;}
    get('cw-deck-count').textContent=`未ドロー ${p.deck_count}枚 · 手札 ${p.hand.length}枚`;
    get('cw-deck-summary').innerHTML=Object.entries({attack:'Sword',guard:'Shield',heal:'Sprout',none:'Wind'}).filter(([kind])=>kinds[kind]).map(([kind,symbol])=>`<span aria-label="${({attack:'攻撃',guard:'防御',heal:'回復',none:'主効果なし'})[kind]} ${kinds[kind]}枚">${icon(symbol)} ${kinds[kind]}</span>`).join('');
    get('cw-deck').innerHTML=catalogue.map((row,i)=>`<button type="button" class="cw-deck-card" data-catalogue="${i}" data-empty="${!row.remaining}" aria-label="${esc(cardName(row.card))}、${esc(row.card.attr)}、山札 ${row.remaining}枚。詳細を開く" aria-controls="cw-catalogue-peek" aria-expanded="false">${artMarkup('cards',row.card.type,'')}<span class="cw-deck-number">${row.remaining}</span><span class="cw-face-caption"><strong>${esc(cardName(row.card))}</strong>${attrBadge(row.card.attr)}</span></button>`).join('');
    renderHistory();renderReferencePanels(s,active);renderObjectInfo(s);
    for(const [id,left]of Object.entries(offsets))get(id).scrollLeft=left;
    paintScene(s);syncWindowState();placeNearCard();requestAnimationFrame(()=>{updateScrollHints();placeNearCard();});
  }
  function reveal(container,element){if(!element)return;const a=container.getBoundingClientRect(),b=element.getBoundingClientRect();if(b.left<a.left)container.scrollLeft-=a.left-b.left;else if(b.right>a.right)container.scrollLeft+=b.right-a.right;}
  function selectCard(id,focus=false){if(!game.s.actors.P.hand.includes(id)||game.s.outcome)return;selected=id;notice='';render();reveal(get('cw-field'),root.querySelector(`[data-attr="${game.s.cards[id].attr}"]`));if(focus)root.querySelector(`[data-card="${id}"]`)?.focus({preventScroll:true});}
  function perform(id,expectedVersion){
    if(busy||expectedVersion!==version||game.s.outcome||!game.s.actors.P.hand.includes(id)){notice='状態が変わったため、札を選び直してください。';render();return false;}
    if(drag)clearDrag();
    const c=game.s.cards[id],mid=game.s.field[c.attr];
    if(mid&&c.kind==='attack'&&(!target||!game.s.actors[target]?.active)){selected=id;notice='攻撃対象を選んでください。';render();return false;}
    hideWindow(false);const before=game.public();busy=true;
    try{game.step({card_id:id,target:c.kind==='attack'&&mid?target:null});game.advance();version++;recordChanges(before);changedAttrs=new Set(Object.keys(game.public().field).filter(attr=>before.field[attr]?.id!==game.public().field[attr]?.id));absorb();selected=null;notice='';busy=false;render();if(game.s.outcome)showWindow('return',get('cw-withdraw'));return true;}
    catch(error){notice='処理を中断しました：'+error.message;render();return false;}
  }
  function requestCard(id,expectedVersion){
    if(expectedVersion!==version||!game.s.actors.P.hand.includes(id)||game.s.outcome){notice='状態が変わったため、札を選び直してください。';render();return;}
    selectCard(id);const c=currentCard(),match=!!game.s.field[c.attr],losses=lossOnPlacement(c);
    if(settings().quick&&!match&&!losses.length){perform(id,expectedVersion);return;}
    notice=match?'一致 · 予測を確認':losses.length?'消滅あり · 予測を確認':'予測を確認';render();
    showWindow('card',root.querySelector(`[data-card="${id}"]`),false);
  }
  function updateScrollHints(){
    updateOrderHints();placeNearCard();
    for(const id of ['cw-actors','cw-field','cw-hand']){const el=get(id),help=el.nextElementSibling;if(!el.clientWidth){help.dataset.hidden='true';continue;}const overflow=el.scrollWidth>el.clientWidth+2;help.dataset.hidden=String(!overflow);help.querySelector('button:first-child').disabled=el.scrollLeft<=2;help.querySelector('button:last-child').disabled=el.scrollLeft>=el.scrollWidth-el.clientWidth-2;const bounds=el.getBoundingClientRect(),visible=[...el.children].map((n,i)=>({i,r:n.getBoundingClientRect()})).filter(x=>x.r.right>bounds.left+2&&x.r.left<bounds.right-2);help.querySelector('span').textContent=visible.length?`${visible[0].i+1}–${visible.at(-1).i+1}/${el.children.length}`:'';}
  }
  function openPanel(name,from){showWindow(name,from);}
  function closePanel(){hideWindow();}
  function releaseCapture(d){if(root.hasPointerCapture?.(d.pointerId))root.releasePointerCapture(d.pointerId);}
  function clearDrag(){const d=drag;drag=null;get('cw-drag-ghost').hidden=true;get('cw-drop-zone').dataset.drag='false';get('cw-drop-zone').dataset.over='false';root.querySelectorAll('[data-dragging="true"]').forEach(n=>n.dataset.dragging='false');if(d){clearTimeout(d.timer);suppressClickUntil=Date.now()+700;releaseCapture(d);}return d;}
  function cancelDrag(){if(!drag)return;const d=clearDrag();if(d.started&&d.version===version){notice='ドラッグを取り消しました。';render();}}
  function heldPosition(event){
    const rect=root.getBoundingClientRect(),ghost=get('cw-drag-ghost'),gr=ghost.getBoundingClientRect();
    const width=gr.width||180,height=gr.height||76,x=event.clientX-rect.left,y=event.clientY-rect.top;
    // Keep the pointer touching the lower part of the held card; measure actual ghost size.
    ghost.style.left=Math.max(0,Math.min(rect.width-width,x-width/2))+'px';
    ghost.style.top=Math.max(0,Math.min(rect.height-height,y-height+6))+'px';
  }
  function dragPosition(event){
    heldPosition(event);
    const hit=document.elementFromPoint(event.clientX,event.clientY);drag.over=!!hit&&get('cw-drop-zone').contains(hit);get('cw-drop-zone').dataset.over=String(drag.over);
  }
  function showHeldCard(c){
    const ghost=get('cw-drag-ghost');
    ghost.innerHTML=`<strong>${attrBadge(c.attr)}${esc(cardName(c))}</strong><span>${mainText(c)}</span>`;ghost.hidden=false;
    get('cw-drop-zone').dataset.drag='true';
    root.querySelector(`[data-hand-id="${c.id}"]`)?.setAttribute('data-dragging','true');
  }
  function clearUsePreview(){
    if(!usePreview)return;usePreview=false;
    if(!drag?.started){get('cw-drag-ghost').hidden=true;get('cw-drop-zone').dataset.drag='false';get('cw-drop-zone').dataset.over='false';root.querySelectorAll('[data-dragging="true"]').forEach(n=>n.dataset.dragging='false');}
  }
  function previewUse(event){
    if(event.pointerType!=='mouse'||!window.matchMedia('(hover: hover) and (pointer: fine)').matches||drag||get('cw-use').disabled||!selected||openName&&openName!=='card')return;
    usePreview=true;showHeldCard(currentCard());heldPosition(event);
  }
  function beginHold(d){
    if(drag!==d||d.mode!=='pending'||d.distance>=holdSlop)return;
    if(!settings().drag||d.version!==version||game.s.outcome||!game.s.actors.P.hand.includes(d.id)||!get('cw-drawer').hidden){cancelDrag();return;}
    d.mode='drag';d.started=true;selectCard(d.id);
    const c=currentCard();showHeldCard(c);
    notice='つかみました · '+(game.s.field[c.attr]?'場で離すと一致の予測へ':settings().quick&&!lossOnPlacement(c).length?'場で離すと設置':'場で離すと設置の予測へ');
    get('cw-notice').textContent=notice;get('cw-hand-context').hidden=false;dragPosition({clientX:d.lastX,clientY:d.lastY});
  }
  root.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false){cancelDrag();return;}
    if(drag||(event.button!==undefined&&event.button!==0))return;
    suppressClickUntil=0;clearUsePreview();
    if(!get('cw-drawer').hidden||game.s.outcome)return;
    const body=event.target.closest('[data-card]');if(!body)return;
    const id=body.dataset.card;if(!game.s.actors.P.hand.includes(id))return;
    const config=settings();
    drag={id,pointerId:event.pointerId,pointerType:event.pointerType,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,scrollLeft:get('cw-hand').scrollLeft,manualScroll:config.drag||event.pointerType!=='touch',version,mode:'pending',distance:0,started:false,over:false};root.setPointerCapture?.(event.pointerId);
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
    else if(d.started){notice='';render();}
    else if(d.mode==='pending'&&d.distance<holdSlop&&Math.hypot(event.clientX-d.x,event.clientY-d.y)<holdSlop)inspectCard(d.id,true);
  });
  root.addEventListener('pointercancel',event=>{if(drag&&event.pointerId===drag.pointerId)cancelDrag();});root.addEventListener('lostpointercapture',event=>{if(drag&&event.pointerId===drag.pointerId)cancelDrag();});
  window.addEventListener('blur',()=>{cancelDrag();clearUsePreview();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelDrag();clearUsePreview();}});
  root.addEventListener('contextmenu',event=>{if(drag){event.preventDefault();}});
  get('cw-hand').addEventListener('wheel',cancelDrag,{passive:true});
  get('cw-hand').addEventListener('scroll',()=>{if(drag?.mode==='pending'&&Math.abs(get('cw-hand').scrollLeft-drag.scrollLeft)>1)cancelDrag();},{passive:true});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!get('cw-catalogue-peek').hidden){hideCatalogue(true);return;}clearUsePreview();if(drag)cancelDrag();else if(!get('cw-drawer').hidden)closePanel();}});
  root.addEventListener('click',event=>{if(event.detail>0&&Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.open){toggleWindow(button.dataset.open,button);return;}
    if(button.dataset.scroll){const [id,direction]=button.dataset.scroll.split(':');const el=get(id);el.scrollBy({left:Number(direction)*Math.max(100,el.clientWidth*.75),behavior:'auto'});return;}
    if(button.dataset.fieldCard){inspectField(button.dataset.fieldCard);return;}
    if(button.dataset.inspectActor){inspectActor(button.dataset.inspectActor);return;}
    if(button.dataset.target){target=button.dataset.target;render();root.querySelector(`[data-target="${target}"]`)?.focus({preventScroll:true});return;}
    if(button.dataset.card){inspectCard(button.dataset.card,true);return;}
  });
  get('cw-use').addEventListener('pointerenter',previewUse);
  get('cw-use').addEventListener('pointermove',previewUse);
  get('cw-use').addEventListener('pointerleave',clearUsePreview);
  get('cw-use').addEventListener('blur',clearUsePreview);
  get('cw-use').addEventListener('click',event=>{if(event.detail<=1&&selected)perform(selected,version);});
  get('cw-close').addEventListener('click',closePanel);
  for(const id of ['cw-quick-setting','cw-drag-setting','cw-hold-setting','cw-peek-setting','cw-diagram-setting'])get(id).addEventListener('change',()=>{cancelDrag();render();});
  get('cw-withdraw').addEventListener('click',()=>{if(game.s.outcome){toggleWindow('return',get('cw-withdraw'));return;}cancelDrag();hideWindow(false);const before=game.public();game.settle('withdrawal');version++;recordChanges(before);absorb();selected=null;render();showWindow('return',get('cw-withdraw'));});
  get('cw-reenter').addEventListener('click',()=>{if(game.s.outcome)start(bundle.terrain_build);});
  get('cw-history-order').addEventListener('change',renderHistory);
  get('cw-turn-order').addEventListener('scroll',updateOrderHints,{passive:true});
  for(const id of ['cw-actors','cw-field','cw-hand']){get(id).addEventListener('scroll',updateScrollHints,{passive:true});if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateScrollHints).observe(get(id));}
  setupSurface();start();
  for(const choice of initialReplay.choices){const before=game.public();game.step(choice);game.advance();recordChanges(before);absorb();version++;}
  if(initialReplay.choices.length){selected=null;resetEvents();enqueueEvents(last);render();}
})();
