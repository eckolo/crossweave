// The game remains 1920x1080. Only this surrounding review viewport scales it.
const previewState={mode:'fit',scale:1};
function previewScale(){return options.embedded?(globalThis.CrossweaveUI.displayScale(root)||1):previewState.scale;}
function syncPreview(){
 cancelGesture();
 if(options.embedded)return;
 const viewport=root.querySelector('[data-preview-window]'),space=root.querySelector('[data-preview-space]');
 const width=viewport.clientWidth||root.getBoundingClientRect().width||1024;
 const scale=previewState.mode==='actual'?1:Math.min(1,width/1920);
 previewState.scale=scale;
 root.style.setProperty('--cp-preview-scale',String(scale));
 space.style.width=(1920*scale)+'px';space.style.height=(1080*scale)+'px';
 viewport.style.height=(previewState.mode==='actual'?Math.min(720,Math.max(440,width*.7)):1080*scale)+'px';
 root.querySelector('[data-preview-scale]').textContent=Math.round(scale*100)+'%'+(scale<1?' · 縮小':' · 1:1');
 for(const b of root.querySelectorAll('[data-preview]'))b.setAttribute('aria-pressed',String(b.dataset.preview===previewState.mode));
 if(previewState.mode==='fit'){viewport.scrollLeft=0;viewport.scrollTop=0;}
}
listen(root.querySelector('.cp-reviewbar'),'click',e=>{
 const b=e.target.closest('button[data-preview]');if(!b)return;
 previewState.mode=b.dataset.preview;syncPreview();
});
