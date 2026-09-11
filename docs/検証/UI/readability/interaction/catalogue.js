  let catalogueIndex=null,catalogueMode=null,catalogueTimer=null,catalogueCloseTimer=null;
  function cancelCatalogueTimers(){clearTimeout(catalogueTimer);clearTimeout(catalogueCloseTimer);}
  function hideCatalogue(restore=false){
    cancelCatalogueTimers();const old=catalogueIndex;catalogueIndex=null;catalogueMode=null;
    get('cw-catalogue-peek').hidden=true;
    root.querySelectorAll('[data-catalogue]').forEach(n=>n.setAttribute('aria-expanded','false'));
    syncWindowState();
    if(restore)root.querySelector(`[data-catalogue="${old}"]`)?.focus({preventScroll:true});
  }
  function showCatalogue(index,mode='peek'){
    const row=CWFeedback.catalogue(game)[index];if(!row||openName!=='reference')return;
    cancelCatalogueTimers();catalogueIndex=index;catalogueMode=mode;
    const popup=get('cw-catalogue-peek');popup.hidden=false;popup.dataset.mode=mode;
    pinMark(get('cw-catalogue-state'),mode==='pinned');
    get('cw-catalogue-name').textContent=cardName(row.card);
    get('cw-catalogue-info').innerHTML=`<div>${attrBadge(row.card.attr)}山札 ${row.remaining}枚 · 手札 ${row.hand}枚</div>${fullCard(row.card)}${row.doomed_remaining?`<p class="cw-loss">回収で消滅 ${row.doomed_remaining}枚</p>`:''}`;
    root.querySelectorAll('[data-catalogue]').forEach(n=>n.setAttribute('aria-expanded',String(Number(n.dataset.catalogue)===index)));
    if(mode==='pinned')pinWindow();else syncWindowState();
    placeCatalogue();
  }
  function placeCatalogue(){
    if(catalogueIndex===null)return;
    const from=root.querySelector(`[data-catalogue="${catalogueIndex}"]`),popup=get('cw-catalogue-peek');
    if(!from?.isConnected){hideCatalogue();return;}
    const rr=root.getBoundingClientRect(),ar=from.getBoundingClientRect();if(!rr.width||!rr.height)return;
    const margin=12,width=Math.min(320,rr.width-margin*2);
    popup.style.width=width+'px';popup.style.maxHeight=(rr.height-margin*2)+'px';
    let h=Math.min(popup.getBoundingClientRect().height,rr.height-margin*2),left,top;
    const right=rr.right-ar.right-10,leftSpace=ar.left-rr.left-10;
    if(right>=width+margin){left=ar.right-rr.left+10;top=ar.top-rr.top;}
    else if(leftSpace>=width+margin){left=ar.left-rr.left-10-width;top=ar.top-rr.top;}
    else{left=(ar.left+ar.right)/2-rr.left-width/2;const above=ar.top-rr.top-margin-8,below=rr.bottom-ar.bottom-margin-8;const upper=above>=h||above>below;h=Math.min(h,Math.max(0,upper?above:below));popup.style.maxHeight=h+'px';top=upper?ar.top-rr.top-8-h:ar.bottom-rr.top+8;}
    popup.style.left=Math.max(margin,Math.min(rr.width-width-margin,left))+'px';
    popup.style.top=Math.max(margin,Math.min(rr.height-h-margin,top))+'px';
  }
  function setupCatalogue(){
    const popup=get('cw-catalogue-peek');
    const mouse=e=>e.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const source=node=>node?.closest?.('[data-catalogue]');
    root.addEventListener('pointerover',event=>{
      if(!mouse(event))return;
      if(popup.contains(event.target)){cancelCatalogueTimers();return;}
      const from=source(event.target);if(!from||from.contains(event.relatedTarget)||catalogueMode==='pinned')return;
      cancelCatalogueTimers();catalogueTimer=setTimeout(()=>{if(from.isConnected)showCatalogue(Number(from.dataset.catalogue));},180);
    });
    root.addEventListener('pointerout',event=>{
      if(!mouse(event))return;
      const from=source(event.target),to=event.relatedTarget;
      if(from&&(from.contains(to)||popup.contains(to))||popup.contains(event.target)&&popup.contains(to))return;
      if(from||popup.contains(event.target)){cancelCatalogueTimers();catalogueCloseTimer=setTimeout(()=>{if(catalogueMode!=='pinned')hideCatalogue();},160);}
    });
    root.addEventListener('click',event=>{
      const from=source(event.target);if(!from)return;
      const index=Number(from.dataset.catalogue);
      if(catalogueIndex===index&&catalogueMode==='pinned')hideCatalogue();else showCatalogue(index,'pinned');
    });
    popup.addEventListener('click',event=>{if(!event.target.closest('#cw-catalogue-close')&&catalogueIndex!==null)showCatalogue(catalogueIndex,'pinned');});
    get('cw-catalogue-close').addEventListener('click',()=>hideCatalogue(true));
    get('cw-drawer').querySelector('.cw-drawer-body').addEventListener('scroll',()=>hideCatalogue(),{passive:true});
    window.addEventListener('blur',()=>{cancelCatalogueTimers();if(catalogueMode==='peek')hideCatalogue();});
  }
