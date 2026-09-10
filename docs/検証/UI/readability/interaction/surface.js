  // Presentation only. Artwork slots accept embedded assets; no game inputs are changed.
  const artwork={actors:{},cards:{},terrain:{initial:null,followup:null},environment:{O:null,V0:null,V1:null}};
  let openName=null,windowMode=null,hoverTimer=null,hoverCloseTimer=null,hoverFrom=null,feedTimer=null,feedExpiry=null,feedSequence=0,feedSkipped=0;
  const feedQueue=[];
  function artMarkup(kind,key,label){
    const asset=artwork[kind]?.[key];
    return `<span class="cw-illustration" data-art-kind="${kind}" data-art-key="${esc(key)}" aria-hidden="true">${asset?`<img src="${esc(asset)}" alt="">`:''}</span>`;
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
      return `<li><button type="button" data-open="order" data-turn-actor="${id}" data-current="${id==='P'&&wait===0}" aria-label="${esc(label)}"><span class="cw-turn-face" aria-hidden="true">${asset?`<img src="${esc(asset)}" alt="">`:({P:'自',V:'環',E:'敵'})[a.role]||'・'}</span><span aria-hidden="true">+${wait}</span></button></li>`;
    }).join('');
    strip.scrollLeft=offset;
    get('cw-queue').innerHTML=s.outcome?'<p>探索終了</p>':`<p>現在時刻 ${s.now}</p>`+order.map((id,i)=>`<div class="cw-log">${i+1}. ${esc(names[id]||id)}　時刻 ${s.actors[id].next_at}（+${s.actors[id].next_at-s.now}）</div>`).join('');
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
    return `<p>${ids.length>1?'いずれかの':'対象の'}HPを0にする</p>`+ids.map(id=>`<div class="cw-log">${esc(names[id])}　HP ${s.actors[id].hp}/${s.actors[id].max_hp}</div>`).join('')+(s.current_event==='followup'&&s.actors.E1?.active?'<p>敵の撃破は突破の必須条件ではありません。</p>':'');
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
    if(openName==='card'){
      const rr=root.getBoundingClientRect(),popup=get('cw-drawer');
      // Use the space above the hand, including the opponent row. Targets remain in the window.
      popup.style.height=Math.max(200,hr.top-rr.top-24)+'px';
      const pw=popup.getBoundingClientRect().width||Math.min(840,rr.width-32);
      popup.style.left=Math.max(16,Math.min(rr.width-pw-16,center-rr.left-pw/2))+'px';
      popup.style.top='16px';
    }
  }
  function cancelHover(){clearTimeout(hoverTimer);clearTimeout(hoverCloseTimer);hoverTimer=hoverCloseTimer=null;}
  function syncWindowState(){
    const popup=get('cw-drawer'),pinned=windowMode==='pinned';
    popup.dataset.mode=windowMode||'';
    popup.setAttribute('aria-modal',String(pinned&&openName!=='card'));
    get('cw-backdrop').hidden=!pinned||openName==='card';
    get('cw-window-state').textContent=windowMode==='peek'?'一時表示':openName&&openName!=='card'?'固定中':'';
    root.querySelectorAll('[data-open]').forEach(el=>{el.setAttribute('aria-expanded',String(el.dataset.open===openName));el.setAttribute('aria-pressed',String(pinned&&el.dataset.open===openName));});
  }
  function showWindow(name,from,focus=true,mode='pinned'){
    cancelHover();cancelDrag();opener=from||null;openName=name;windowMode=mode;
    const popup=get('cw-drawer');popup.hidden=false;popup.dataset.window=name;
    popup.style.left='';popup.style.top='';popup.style.height='';
    root.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);
    get('cw-drawer-title').textContent={reference:'山札・探索の詳細情報',settings:'操作説明・設定',card:'札・予測の詳細',result:'履歴',objective:'突破条件',order:'行動順予測'}[name];
    if(name==='result'&&mode==='pinned'){feedSkipped=0;get('cw-feed-more').textContent='';get('cw-feed-more').removeAttribute('aria-label');renderHistory();}
    get('cw-drawer').querySelector('.cw-drawer-body').scrollTop=0;
    syncWindowState();placeNearCard();
    if(focus)get('cw-close').focus({preventScroll:true});
  }
  function pinWindow(from){
    cancelHover();windowMode='pinned';if(from)opener=from;syncWindowState();
    if(openName==='result'){feedSkipped=0;get('cw-feed-more').textContent='';get('cw-feed-more').removeAttribute('aria-label');}
  }
  function toggleWindow(name,from){
    if(openName===name){if(windowMode==='peek')pinWindow(from);else hideWindow();}
    else showWindow(name,from);
  }
  function hideWindow(restore=true){
    cancelHover();get('cw-drawer').hidden=true;openName=null;windowMode=null;hoverFrom=null;syncWindowState();
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
    if(get('cw-drawer').contains(event.target)){if(windowMode==='peek')pinWindow();return;}
    // Openers handle their own toggle, including switching from one window to another.
    if(root.contains(event.target)&&event.target.closest('[data-open]'))return;
    if(openName==='card'){
      if(get('cw-action-anchor').contains(event.target))return;
      if(root.contains(event.target)&&event.target.closest('[data-card],[data-target]'))return;
    }
    if(windowMode==='peek'){hideWindow(false);return;}
    hideWindow();cancelDrag();suppressClickUntil=Date.now()+700;
    event.preventDefault();event.stopImmediatePropagation();
  }
  function setupHover(){
    const popup=get('cw-drawer');
    const trigger=node=>node?.closest?.('.cw-menu [data-open],[data-turn-actor]');
    const mouse=event=>event.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const leave=()=>{clearTimeout(hoverTimer);clearTimeout(hoverCloseTimer);hoverCloseTimer=setTimeout(()=>{if(windowMode==='peek')hideWindow(false);},160);};
    root.addEventListener('pointerover',event=>{
      if(!mouse(event))return;
      if(popup.contains(event.target)){cancelHover();return;}
      const from=trigger(event.target);if(!from||from.contains(event.relatedTarget)||drag||busy||windowMode==='pinned')return;
      cancelHover();hoverFrom=from;
      hoverTimer=setTimeout(()=>{if(!from.isConnected||drag||busy||windowMode==='pinned')return;showWindow(from.dataset.open,from,false,'peek');hoverFrom=from;},180);
    });
    root.addEventListener('pointerout',event=>{
      if(!mouse(event))return;
      const from=trigger(event.target);
      if(from){if(from.contains(event.relatedTarget)||popup.contains(event.relatedTarget))return;leave();}
      else if(popup.contains(event.target)&&!popup.contains(event.relatedTarget)&&!hoverFrom?.contains(event.relatedTarget))leave();
    });
    window.addEventListener('blur',()=>{cancelHover();if(windowMode==='peek')hideWindow(false);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHover();if(windowMode==='peek')hideWindow(false);}});
  }
  function resetEvents(){
    clearTimeout(feedTimer);clearTimeout(feedExpiry);feedTimer=null;feedQueue.length=0;feedSkipped=0;
    get('cw-event-feed').replaceChildren();get('cw-feed-more').textContent='';get('cw-feed-more').removeAttribute('aria-label');
  }
  function enqueueEvents(rows){
    if(!rows.length)return;
    clearTimeout(feedExpiry);feedQueue.push(...rows);
    if(feedQueue.length>8){feedSkipped+=feedQueue.length-8;feedQueue.splice(0,feedQueue.length-8);}
    get('cw-feed-more').textContent=feedSkipped?` +${feedSkipped}`:'';
    get('cw-feed-more').setAttribute('aria-label',feedSkipped?`画面で省略した${feedSkipped}件を含む全文`:'' );
    if(feedTimer===null)pumpEvent();
  }
  function pumpEvent(){
    feedTimer=null;const text=feedQueue.shift();if(!text)return;
    const item=document.createElement('div');item.className='cw-live-event';item.dataset.eventId=String(++feedSequence);item.textContent=text;
    get('cw-event-feed').append(item);
    while(get('cw-event-feed').children.length>2)get('cw-event-feed').firstElementChild.remove();
    if(feedQueue.length)feedTimer=setTimeout(pumpEvent,850);
    else feedExpiry=setTimeout(()=>{get('cw-event-feed').replaceChildren();},8000);
  }
  function setupSurface(){
    setupHover();
    document.addEventListener('pointerdown',dismissOutside,true);
    document.addEventListener('click',event=>{
      if(event.detail>0&&Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
      dismissOutside(event);
    },true);
    root.addEventListener('keydown',event=>{
      if(event.key!=='Tab'||!openName||openName==='card'||windowMode==='peek')return;
      const nodes=[...get('cw-drawer').querySelectorAll('button,input,select,summary')].filter(n=>!n.disabled&&!n.closest('[hidden]'));
      const index=nodes.indexOf(document.activeElement),first=nodes[0],last=nodes.at(-1);
      if(event.shiftKey&&(index<=0)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(index===nodes.length-1||index<0)){event.preventDefault();first?.focus();}
    });
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(placeNearCard).observe(root);
    get('cw-hand').addEventListener('scroll',placeNearCard,{passive:true});
  }
