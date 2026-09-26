// Review controls stay outside the game and never mutate Campaign state.
host.addEventListener('cw-display-state',event=>{
 const {mode,scale}=event.detail;
 host.querySelector('[data-display-readout]').textContent=Math.round(scale*100)+'% '+(mode==='actual'?'1:1':'縮小');
 for(const button of host.querySelectorAll('[data-display-mode]'))button.setAttribute('aria-pressed',String(button.dataset.displayMode===mode));
});
host.addEventListener('click',event=>{
 const button=event.target.closest('[data-display-mode]');
 if(button)CrossweaveUI.setDisplayMode(host.querySelector('#crossweave-journey'),button.dataset.displayMode);
});
