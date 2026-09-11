  // Presentation only. Artwork slots accept embedded assets; no game inputs are changed.
  const artwork={actors:{},cards:{},terrain:{initial:null,followup:null},environment:{O:null,V0:null,V1:null}};
  let openName=null,windowMode=null,hoverTimer=null,hoverCloseTimer=null,hoverFrom=null;
  const feedQueue=[],feedVisible=[];
  let feedTimer=null;
  const feedTiming={interval:260,hold:1300,fade:1500,row:26,visible:6};
  let inspectedField=null,inspectedActor=null;
  const objectWindow=name=>['card','field','actor'].includes(name);
  function renderObjectInfo(s){
    const card=Object.values(s.field).find(c=>c?.id===inspectedField);
    get('cw-field-info').innerHTML=card?`<strong>${esc(cardName(card))} / ${esc(card.attr)}</strong>${fullCard(card)}`:'';
    const actor=s.actors[inspectedActor];
    get('cw-actor-info').innerHTML=actor?.active?`<strong>${esc(names[inspectedActor]||inspectedActor)}</strong><div class="cw-impact"><span>HP ${actor.hp}/${actor.max_hp}</span><span>命中蓄積 ${actor.hit}</span><span>会心 ${actor.crit}</span></div><p>${esc(guardText(actor))}<br>回避合計 ${signed(actor.evasion)} · 軽減 ${actor.reduction||0}</p><p>${actor.acts?'次回 時刻 '+actor.next_at:'行動なし'}</p>${knownActorInfo(inspectedActor)}`:'';
    if(openName==='field'&&!card||openName==='actor'&&!actor?.active)hideWindow(false);
  }
  function inspectField(id){
    if(!Object.values(game.public().field).some(c=>c?.id===id))return;
    const same=openName==='field'&&inspectedField===id;
    inspectedField=id;render();
    if(same)hideWindow(false);
    else showWindow('field',root.querySelector(`[data-field-card="${id}"]`),false);
    root.querySelector(`[data-field-card="${id}"]`)?.focus({preventScroll:true});
  }
  function inspectActor(id){
    if(id==='P'||!game.public().actors[id]?.active)return;
    const same=openName==='actor'&&inspectedActor===id;
    target=id;inspectedActor=id;render();
    if(same)hideWindow(false);
    else showWindow('actor',get('cw-actors').querySelector(`[data-target="${id}"]`),false);
    get('cw-actors').querySelector(`[data-target="${id}"]`)?.focus({preventScroll:true});
  }
  function artMarkup(kind,key,label){
    const asset=artwork[kind]?.[key],card=kind==='cards'?Object.values(game.s.cards).find(c=>c.type===key):null;
    const symbol=kind==='actors'?({O:'Mountain',V0:'Trees',V1:'Trees',E1:'Bug',P:'Footprints'})[key]:({attack:'Sword',guard:'Shield',heal:'Sprout',none:'Wind'})[card?.kind];
    return `<span class="cw-illustration" data-art-kind="${kind}" data-art-key="${esc(key)}" aria-hidden="true">${asset?`<img src="${esc(asset)}" alt="">`:icon(symbol||'Wind')}</span>`;
  }
  function actionOrder(s){
    if(s.outcome)return [];
    const priority={V:0,P:1,E:2};
    return Object.keys(s.actors).filter(id=>s.actors[id].active&&s.actors[id].acts)
      .sort((a,b)=>s.actors[a].next_at-s.actors[b].next_at
        ||priority[s.actors[a].role]-priority[s.actors[b].role]||a.localeCompare(b));
  }
  function renderActionOrder(s){
    const order=actionOrder(s),strip=get('cw-turn-order'),offset=strip.scrollLeft;
    strip.innerHTML=order.map((id,i)=>{
      const a=s.actors[id],asset=artwork.actors[id],wait=a.next_at-s.now;
      const label=`${i+1}番 ${names[id]||id}。${wait===0?'現在':`あと${wait}`}、予定時刻 ${a.next_at}。行動順の詳細を開く`;
      return `<li><button type="button" data-open="order" data-turn-actor="${id}" data-current="${id==='P'&&wait===0}" aria-label="${esc(label)}"><span class="cw-turn-face" aria-hidden="true">${asset?`<img src="${esc(asset)}" alt="">`:icon(({P:'Footprints',V:'Trees',E:'Bug'})[a.role]||'Mountain')}</span><span aria-hidden="true">+${wait}</span></button></li>`;
    }).join('');
    strip.scrollLeft=offset;
    get('cw-queue').innerHTML=s.outcome?'<span>探索終了</span>':`<div class="cw-order-now">現在 ${s.now}</div><table class="cw-order-table"><thead><tr><th>次回</th><th>待ち時間</th><th>時刻</th></tr></thead><tbody>${order.map(id=>`<tr><th scope="row">${esc(names[id]||id)}</th><td>+${s.actors[id].next_at-s.now}</td><td>${s.actors[id].next_at}</td></tr>`).join('')}</tbody></table><div class="cw-order-tie">同時：環境 → あなた → 敵</div>`;
  }
  function updateOrderHints(){
    const strip=get('cw-turn-order'),prev=strip.previousElementSibling,next=strip.nextElementSibling;
    const overflow=strip.clientWidth>0&&strip.scrollWidth>strip.clientWidth+2;
    prev.hidden=next.hidden=!overflow;
    prev.disabled=strip.scrollLeft<=2;next.disabled=strip.scrollLeft>=strip.scrollWidth-strip.clientWidth-2;
  }
  function objectiveMarkup(s){
    if(s.outcome)return `<p>${({clear:'この探索を突破しました。',defeat:'HPが尽き、探索は終了しました。',withdrawal:'撤退しました。',cutoff:'試行上限で終了しました。'})[s.outcome]||'探索は終了しました。'}</p>`;
    // Fixed PT-Z-001 rules. List current participants only, without future encounter data.
    const ids=(s.current_event==='rock'?['O','V0']:s.current_event==='open_rock'?['V0']:s.current_event==='followup'?['V1']:[]).filter(id=>s.actors[id]?.active);
    if(!ids.length)return '<p>この場面の突破条件を確認できません。</p>';
    const results={O:'獲得物を得て先へ進む（未保護）',V0:'獲得物を得て先へ進む。ここまでの獲得物を保護',V1:'探索を突破し、獲得物をすべて持ち帰る'};
    return ids.map(id=>`<div class="cw-log" data-objective="${id}"><strong>${esc(names[id])}のHPを0にする</strong><div>HP ${s.actors[id].hp}/${s.actors[id].max_hp}</div><p>${results[id]}</p></div>`).join('')+(s.current_event==='followup'&&s.actors.E1?.active?'<p>敵の撃破で獲得物を入手（任意）</p>':'');
  }
  function paintScene(s){
    const terrain=['followup','finished'].includes(s.current_event)?'followup':'initial';
    const scene=get('cw-scene');scene.dataset.terrain=terrain;
    const base=artwork.terrain[terrain];
    get('cw-scene-base').dataset.illustrated=String(!!base);
    get('cw-scene-base').innerHTML=base?`<img src="${esc(base)}" alt="">`:'';
    get('cw-scene-environment').innerHTML=['O','V0','V1'].filter(id=>s.actors[id]?.active).map(id=>`<div class="cw-environment-layer" data-environment="${id}">${artwork.environment[id]?`<img src="${esc(artwork.environment[id])}" alt="">`:''}</div>`).join('');
  }
  function placeNearCard(){
    const track=get('cw-action-track'),dock=get('cw-action-anchor'),hand=get('cw-hand');
    const tr=track.getBoundingClientRect(),hr=hand.getBoundingClientRect();
    const card=selected?root.querySelector(`[data-card="${selected}"]`):null,cr=card?.getBoundingClientRect();
    dock.hidden=!card;
    const center=cr?(cr.left+cr.right)/2:tr.left+tr.width/2;
    const width=dock.getBoundingClientRect().width||Math.min(164,tr.width);
    const left=Math.max(0,Math.min(tr.width-width,center-tr.left-width/2));
    dock.style.left=left+'px';
    dock.style.setProperty('--cw-card-tip',Math.max(8,Math.min(width-8,center-tr.left-left))+'px');
    const side=cr&&cr.right<=hr.left?'左':cr&&cr.left>=hr.right?'右':null;
    get('cw-anchor-state').textContent=side?`${cardName(currentCard())}は${side}の画面外`:'';
    get('cw-hand-context').hidden=!get('cw-notice').textContent&&!get('cw-anchor-state').textContent;
    placeWindow(center,hr);
    drawRelations();placeCatalogue();placeUsePreview();
  }
  function placeWindow(handCenter,handRect){
    if(!openName)return;
    const rr=root.getBoundingClientRect(),popup=get('cw-drawer'),margin=12,gap=10;
    if(!rr.width||!rr.height)return;
    popup.style.maxHeight=Math.max(0,rr.height-margin*2)+'px';
    if(openName==='card'){
      // Use the space above the hand, including the opponent row. Targets remain in the window.
      popup.style.width=Math.min(840,rr.width-32)+'px';
      popup.style.height=Math.max(160,handRect.top-rr.top-24)+'px';
      const pw=Math.min(840,rr.width-32);
      popup.style.left=Math.max(16,Math.min(rr.width-pw-16,handCenter-rr.left-pw/2))+'px';
      popup.style.top='16px';
      return;
    }
    popup.style.height='';
    const width=Math.min(['field','actor','objective','order'].includes(openName)?420:560,rr.width-margin*2);
    popup.style.width=width+'px';
    let height=popup.getBoundingClientRect().height,top,center=rr.right-margin-width/2;
    if(openName==='field'||openName==='actor'){
      // Keep the entire inspected row accessible, even when another object is inspected.
      const region=root.querySelector(openName==='field'?'.cw-board':'.cw-world').getBoundingClientRect();
      const anchor=openName==='field'?root.querySelector(`[data-field-card="${inspectedField}"]`):get('cw-actors').querySelector(`[data-target="${inspectedActor}"]`);
      const ar=anchor?.getBoundingClientRect();if(ar)center=(ar.left+ar.right)/2;
      const aboveEnd=region.top-rr.top-gap,belowStart=region.bottom-rr.top+gap;
      const above=Math.max(0,aboveEnd-margin),below=Math.max(0,rr.height-margin-belowStart);
      const useAbove=openName==='field'?(height<=above||height>below&&above>below):(height>below&&above>below);
      const space=useAbove?above:below;
      popup.style.maxHeight=space+'px';height=Math.min(height,space);
      top=useAbove?aboveEnd-height:belowStart;
    }else{
      const isOrder=openName==='order';
      const anchor=isOrder?root.querySelector('.cw-order-strip'):root.querySelector('.cw-bottom');
      const ar=anchor.getBoundingClientRect();
      const from=opener?.isConnected?opener:root.querySelector(`[data-open="${openName}"]`),fr=from?.getBoundingClientRect();
      if(fr)center=(fr.left+fr.right)/2;
      const boundary=isOrder?ar.bottom-rr.top+gap:ar.top-rr.top-gap;
      const space=Math.max(0,isOrder?rr.height-margin-boundary:boundary-margin);
      popup.style.maxHeight=space+'px';height=Math.min(height,space);
      top=isOrder?boundary:boundary-height;
    }
    popup.style.left=Math.max(margin,Math.min(rr.width-width-margin,center-rr.left-width/2))+'px';
    popup.style.top=Math.max(margin,top)+'px';
  }
  function cancelHover(){clearTimeout(hoverTimer);clearTimeout(hoverCloseTimer);hoverTimer=hoverCloseTimer=null;}
  function syncWindowState(){
    const popup=get('cw-drawer'),pinned=windowMode==='pinned';
    popup.dataset.mode=windowMode||'';
    popup.setAttribute('aria-modal',String(pinned&&!objectWindow(openName)&&get('cw-catalogue-peek').hidden));
    get('cw-backdrop').hidden=!pinned||objectWindow(openName);
    pinMark(get('cw-window-state'),pinned);
    root.querySelectorAll('[data-open]').forEach(el=>{el.setAttribute('aria-expanded',String(el.dataset.open===openName));el.setAttribute('aria-pressed',String(pinned&&el.dataset.open===openName));});
    root.querySelectorAll('[data-card],[data-field-card],[data-inspect-actor]').forEach(el=>{
      const expanded=el.dataset.card?openName==='card'&&el.dataset.card===selected:el.dataset.fieldCard?openName==='field'&&el.dataset.fieldCard===inspectedField:openName==='actor'&&el.dataset.inspectActor===inspectedActor;
      el.setAttribute('aria-expanded',String(expanded));el.setAttribute('aria-controls','cw-drawer');
    });
  }
  function showWindow(name,from,focus=true,mode='pinned'){
    cancelHover();cancelDrag();clearUsePreview();hideCatalogue();opener=from||null;openName=name;windowMode=mode;
    const popup=get('cw-drawer');popup.hidden=false;popup.dataset.window=name;
    popup.style.left='';popup.style.top='';popup.style.height='';popup.style.width='';popup.style.maxHeight='';
    root.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);
    get('cw-drawer-title').textContent={reference:'山札',status:'状況',settings:'設定',card:'予測',field:'場札',actor:'相手',result:'履歴',objective:'突破条件',order:'行動順',return:'帰還'}[name];
    if(name==='result')renderHistory();
    get('cw-drawer').querySelector('.cw-drawer-body').scrollTop=0;
    syncWindowState();placeNearCard();
    if(focus)get('cw-close').focus({preventScroll:true});
  }
  function pinWindow(from){
    cancelHover();windowMode='pinned';if(from)opener=from;syncWindowState();
  }
  function toggleWindow(name,from){
    if(openName===name){if(windowMode==='peek')pinWindow(from);else hideWindow();}
    else showWindow(name,from);
  }
  function hideWindow(restore=true){
    cancelHover();clearUsePreview();hideCatalogue();get('cw-drawer').hidden=true;openName=null;windowMode=null;hoverFrom=null;syncWindowState();
    if(restore){const candidate=opener?.isConnected?opener:selected?root.querySelector(`[data-card="${selected}"]`):null;candidate?.focus({preventScroll:true});}
  }
  function inspectCard(id,focus=false){
    const same=selected===id,wasOpen=same&&openName==='card';
    selectCard(id,focus);
    if(wasOpen){hideWindow(false);return;}
    if(selected===id&&(same||get('cw-peek-setting').checked))showWindow('card',root.querySelector(`[data-card="${id}"]`),false);
    else if(openName)hideWindow(false);
  }
  function dismissOutside(event){
    if(!openName)return;
    if(get('cw-catalogue-peek').contains(event.target))return;
    if(!event.target.closest?.('[data-catalogue]'))hideCatalogue();
    if(event.target.closest?.('#cw-withdraw'))return;
    if(get('cw-drawer').contains(event.target)){if(windowMode==='peek')pinWindow();return;}
    // Openers handle their own toggle, including switching from one window to another.
    if(root.contains(event.target)&&event.target.closest('[data-open]'))return;
    if(objectWindow(openName)){
      if(openName==='card'&&get('cw-action-anchor').contains(event.target))return;
      if(root.contains(event.target)&&event.target.closest('[data-card],[data-target],[data-field-card]'))return;
    }
    if(windowMode==='peek'){hideWindow(false);return;}
    hideWindow();cancelDrag();suppressClickUntil=Date.now()+700;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function setupHover(){
    const popup=get('cw-drawer'),inside=node=>node&&(popup.contains(node)||get('cw-catalogue-peek').contains(node));
    const trigger=node=>node?.closest?.('.cw-menu [data-open],[data-turn-actor]');
    const mouse=event=>event.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const leave=()=>{clearTimeout(hoverTimer);clearTimeout(hoverCloseTimer);hoverCloseTimer=setTimeout(()=>{if(windowMode==='peek')hideWindow(false);},160);};
    root.addEventListener('pointerover',event=>{
      if(!mouse(event))return;
      if(inside(event.target)){cancelHover();return;}
      const from=trigger(event.target);if(!from||from.contains(event.relatedTarget)||drag||busy||windowMode==='pinned')return;
      cancelHover();hoverFrom=from;
      hoverTimer=setTimeout(()=>{if(!from.isConnected||drag||busy||windowMode==='pinned')return;showWindow(from.dataset.open,from,false,'peek');hoverFrom=from;},180);
    });
    root.addEventListener('pointerout',event=>{
      if(!mouse(event))return;
      const from=trigger(event.target);
      if(from){if(from.contains(event.relatedTarget)||inside(event.relatedTarget))return;leave();}
      else if(inside(event.target)&&!inside(event.relatedTarget)&&!hoverFrom?.contains(event.relatedTarget))leave();
    });
    window.addEventListener('blur',()=>{cancelHover();if(windowMode==='peek')hideWindow(false);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHover();if(windowMode==='peek')hideWindow(false);}});
  }
  function resetEvents(){
    clearTimeout(feedTimer);feedTimer=null;feedQueue.length=0;
    for(const entry of feedVisible){clearTimeout(entry.fadeTimer);clearTimeout(entry.removeTimer);}
    feedVisible.length=0;get('cw-event-feed').replaceChildren();
  }
  function enqueueEvents(rows){
    feedQueue.push(...rows);
    if(feedTimer===null)pumpEvent();
  }
  function positionEvents(){
    // Oldest survives at bottom=0. New entries grow upward; removing the bottom row lowers the rest.
    feedVisible.forEach((entry,index)=>entry.node.style.bottom=index*feedTiming.row+'px');
  }
  function pumpEvent(){
    feedTimer=null;
    if(!feedQueue.length||feedVisible.length>=feedTiming.visible)return;
    const row=feedQueue.shift(),node=document.createElement('li');
    node.className='cw-live-event';node.dataset.eventId=String(row.id);node.innerHTML=eventMarkup(row);
    const entry={node};feedVisible.push(entry);get('cw-event-feed').prepend(node);positionEvents();
    entry.fadeTimer=setTimeout(()=>{node.dataset.fading='true';},feedTiming.hold);
    entry.removeTimer=setTimeout(()=>{
      const index=feedVisible.indexOf(entry);if(index<0)return;
      feedVisible.splice(index,1);node.remove();positionEvents();
      if(feedTimer===null&&feedQueue.length)pumpEvent();
    },feedTiming.hold+feedTiming.fade);
    // Do not reset this interval when a second action batch arrives.
    feedTimer=setTimeout(pumpEvent,feedTiming.interval);
  }
  function setupSurface(){
    setupHover();setupCatalogue();
    document.addEventListener('pointerdown',dismissOutside,true);
    document.addEventListener('click',event=>{
      if(event.detail>0&&Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
      dismissOutside(event);
    },true);
    root.addEventListener('keydown',event=>{
      if(event.key!=='Tab'||!get('cw-catalogue-peek').hidden||!openName||objectWindow(openName)||windowMode==='peek')return;
      const nodes=[...get('cw-drawer').querySelectorAll('button,input,select,summary')].filter(n=>!n.disabled&&!n.closest('[hidden]'));
      const index=nodes.indexOf(document.activeElement),first=nodes[0],last=nodes.at(-1);
      if(event.shiftKey&&(index<=0)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(index===nodes.length-1||index<0)){event.preventDefault();first?.focus();}
    });
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(placeNearCard).observe(root);
    get('cw-hand').addEventListener('scroll',placeNearCard,{passive:true});
    root.querySelector('.cw-footer-state').addEventListener('scroll',placeNearCard,{passive:true});
    root.querySelector('.cw-menu').addEventListener('scroll',placeNearCard,{passive:true});
    get('cw-drawer').addEventListener('toggle',placeNearCard,true);
  }
