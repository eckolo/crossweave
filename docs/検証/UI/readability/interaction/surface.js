  // Presentation only. Artwork slots accept embedded assets; no game inputs are changed.
  const artwork={actors:{},cards:{},terrain:{initial:null,followup:null},environment:{O:null,V0:null,V1:null}};
  let openName=null,feedTimer=null,feedExpiry=null,feedSequence=0,feedSkipped=0;
  const feedQueue=[];
  function artMarkup(kind,key,label){
    const asset=artwork[kind]?.[key];
    return `<span class="cw-illustration" data-art-kind="${kind}" data-art-key="${esc(key)}" aria-hidden="true">${asset?`<img src="${esc(asset)}" alt="">`:`<span class="cw-art-placeholder">${label}</span>`}</span>`;
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
    get('cw-gesture-hint').hidden=!!card;
    const center=cr?(cr.left+cr.right)/2:tr.left+tr.width/2;
    const width=dock.getBoundingClientRect().width||Math.min(248,tr.width);
    const left=Math.max(0,Math.min(tr.width-width,center-tr.left-width/2));
    dock.style.left=left+'px';
    dock.style.setProperty('--cw-card-tip',Math.max(8,Math.min(width-8,center-tr.left-left))+'px');
    const side=cr&&cr.right<=hr.left?'左':cr&&cr.left>=hr.right?'右':null;
    get('cw-anchor-state').textContent=side?`${cardName(currentCard())}は${side}の画面外`:'';
    if(openName==='card'){
      const rr=root.getBoundingClientRect(),popup=get('cw-drawer');
      const pw=popup.getBoundingClientRect().width||Math.min(380,rr.width-32);
      const ph=popup.getBoundingClientRect().height||232;
      popup.style.left=Math.max(16,Math.min(rr.width-pw-16,center-rr.left-pw/2))+'px';
      popup.style.top=Math.max(16,hr.top-rr.top-ph-8)+'px';
    }
  }
  function showWindow(name,from,focus=true){
    cancelDrag();opener=from||null;openName=name;
    const popup=get('cw-drawer');popup.hidden=false;popup.dataset.window=name;
    popup.style.left='';popup.style.top='';
    popup.setAttribute('aria-modal',String(name!=='card'));
    get('cw-backdrop').hidden=name==='card';
    root.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);
    get('cw-drawer-title').textContent={reference:'山札・探索の詳細情報',settings:'操作設定',card:'札・予測の詳細',result:'履歴'}[name];
    if(name==='result'){feedSkipped=0;get('cw-feed-more').textContent='';get('cw-feed-more').removeAttribute('aria-label');renderHistory();}
    if(name==='card')get('cw-drawer').querySelector('.cw-drawer-body').scrollTop=0;
    placeNearCard();
    if(focus)get('cw-close').focus({preventScroll:true});
  }
  function hideWindow(restore=true){
    get('cw-drawer').hidden=true;get('cw-backdrop').hidden=true;openName=null;
    if(restore){const candidate=opener?.isConnected?opener:selected?root.querySelector(`[data-card="${selected}"]`):null;candidate?.focus({preventScroll:true});}
  }
  function inspectCard(id,focus=false){
    selectCard(id,focus);
    if(selected===id&&get('cw-peek-setting').checked)showWindow('card',root.querySelector(`[data-card="${id}"]`),false);
  }
  function dismissOutside(event){
    if(!openName||get('cw-drawer').contains(event.target))return;
    // The action dock belongs to the card inspector. Other card/target taps switch context.
    if(openName==='card'){
      if(get('cw-action-anchor').contains(event.target)||get('cw-cancel').contains(event.target))return;
      if(root.contains(event.target)&&event.target.closest('[data-card],[data-target]')){hideWindow(false);return;}
    }
    hideWindow();cancelDrag();suppressClickUntil=Date.now()+700;
    event.preventDefault();event.stopImmediatePropagation();
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
    document.addEventListener('pointerdown',dismissOutside,true);
    document.addEventListener('click',event=>{
      if(event.detail>0&&Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
      dismissOutside(event);
    },true);
    root.addEventListener('keydown',event=>{
      if(event.key!=='Tab'||!openName||openName==='card')return;
      const nodes=[...get('cw-drawer').querySelectorAll('button,input,select,summary')].filter(n=>!n.disabled&&!n.closest('[hidden]'));
      const index=nodes.indexOf(document.activeElement),first=nodes[0],last=nodes.at(-1);
      if(event.shiftKey&&(index<=0)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(index===nodes.length-1||index<0)){event.preventDefault();first?.focus();}
    });
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(placeNearCard).observe(root);
    get('cw-hand').addEventListener('scroll',placeNearCard,{passive:true});
  }
