// Same gesture split as exploration: short hold moves a piece; immediate swipe pans.
let gesture=null,suppressUntil=0;
const holdMs=220,moveThreshold=8;
const holdCue=globalThis.CrossweaveHoldCue.mount(root.querySelector('.cp-shell'),{scale:previewScale});
function dropPlan(data,to){
 if(!to||to===data.from||runtimeLocked()||migrationPending())return null;
 if(data.from==='offer'){
  if(!canStage(data.id)||runtimeLocked()||migrationPending())return null;
  return ['reserve','build'].includes(to)?{action:'stage',label:to==='build'?'取得・編成':'取得',destination:to}:null;
 }
 const unit=projected().find(x=>x.uid===data.uid);
 if(!unit||unit.key!==data.key||(composed(data.uid)?'build':'reserve')!==data.from)return null;
 if(to==='offer')return unitPending(data.uid)?{action:'unstage',label:'取消',id:pendingOffer(data.uid)}:null;
 if(to==='build'&&data.from==='reserve')return {action:'add',label:'編成'};
 if(to==='reserve'&&data.from==='build')return {action:'remove',label:'外す'};
 return null;
}
function hitLane(x,y){const el=document.elementFromPoint?.(x,y),lane=el?.closest?.('section[data-zone]');return lane&&screen.contains(lane)?lane:null;}
function clearDropMarks(){for(const lane of screen.querySelectorAll('section[data-zone]')){delete lane.dataset.drop;lane.querySelector('.cp-drop-label').textContent='';}}
function paintDrop(d){
 clearDropMarks();const lane=hitLane(d.lastX,d.lastY);if(!lane)return;
 const plan=dropPlan(d,lane.dataset.zone);lane.dataset.drop=plan?'allowed':'blocked';
 lane.querySelector('.cp-drop-label').textContent=plan?.label||'';
 d.ghost?.classList.toggle('cp-no-drop',!plan);
}
function positionGhost(d){
 const shell=root.querySelector('.cp-shell'),r=shell.getBoundingClientRect();
 d.ghost.style.left=((d.lastX-r.left-d.offsetX)/previewScale()-shell.clientLeft)+'px';d.ghost.style.top=((d.lastY-r.top-d.offsetY)/previewScale()-shell.clientTop)+'px';
}
function scrollAtEdge(el,x,y,horizontal=true,vertical=true){
 if(!el)return;const r=el.getBoundingClientRect(),edge=22;
 if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;
 if(horizontal&&el.scrollWidth>el.clientWidth){if(x<r.left+edge)el.scrollLeft-=7;else if(x>r.right-edge)el.scrollLeft+=7;}
 if(vertical&&el.scrollHeight>el.clientHeight){if(y<r.top+edge)el.scrollTop-=7;else if(y>r.bottom-edge)el.scrollTop+=7;}
}
function dragFrame(){
 const d=gesture;if(!d?.held)return;
 const lane=hitLane(d.lastX,d.lastY);scrollAtEdge(lane?.querySelector('[data-scroll-zone]'),d.lastX,d.lastY);
 scrollAtEdge(screen.querySelector('[data-board-scroll]'),d.lastX,d.lastY,true,false);
 paintDrop(d);d.frame=requestAnimationFrame(dragFrame);
}
function capturePointer(d){try{root.setPointerCapture?.(d.pointer);}catch{}}
function startHeld(d){
 if(gesture!==d||d.panning||view.dialog||!d.piece.isConnected)return;
 holdCue.cancel();d.held=true;capturePointer(d);d.piece.classList.add('cp-lifted');
 const ghost=d.piece.cloneNode(true);ghost.classList.remove('cp-lifted');ghost.classList.add('cp-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
 for(const el of [ghost,...ghost.querySelectorAll('*')])for(const key of Object.keys(el.dataset))delete el.dataset[key];
 root.querySelector('.cp-shell').append(ghost);d.ghost=ghost;
 root.dataset.dragging='true';positionGhost(d);paintDrop(d);d.frame=requestAnimationFrame(dragFrame);
 notify(item(d.key).name+'を移動中です。');
}
function cancelGesture(suppress=true){
 holdCue.cancel();const d=gesture;if(!d)return;gesture=null;clearTimeout(d.timer);if(d.frame)cancelAnimationFrame(d.frame);
 d.ghost?.remove();d.piece?.classList.remove('cp-lifted');delete root.dataset.dragging;delete root.dataset.panning;clearDropMarks();
 if(root.hasPointerCapture?.(d.pointer))root.releasePointerCapture(d.pointer);
 if(suppress)suppressUntil=Date.now()+400;saveScroll();
}
listen(root,'pointerdown',e=>{
 if(e.isPrimary===false){cancelGesture();return;}
 if(e.button!==0||gesture||view.dialog||runtimeLocked()||migrationPending())return;
 const piece=e.target.closest('.cp-piece'),buttonTarget=e.target.closest('button');
 if(buttonTarget&&buttonTarget.dataset.action!=='detail')return;
 const pan=piece?.closest('[data-scroll-zone]')||e.target.closest('[data-scroll-zone]')||e.target.closest('[data-board-scroll]');if(!pan)return;
 suppressUntil=0;
 const r=piece?.getBoundingClientRect(),d=gesture={pointer:e.pointerId,piece,pan,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,scrollX:pan.scrollLeft,scrollY:pan.scrollTop,held:false,panning:false,from:piece?.dataset.zoneItem,key:piece?.dataset.key,uid:piece?.dataset.unit,id:piece?.dataset.offer,offsetX:r?e.clientX-r.left:0,offsetY:r?e.clientY-r.top:0};
 if(piece){d.timer=setTimeout(()=>startHeld(d),holdMs);holdCue.start(e,holdMs,'drag');}
});
listen(root,'pointermove',e=>{
 const d=gesture;if(!d||d.pointer!==e.pointerId)return;holdCue.move(e);d.lastX=e.clientX;d.lastY=e.clientY;
 const dx=e.clientX-d.x,dy=e.clientY-d.y;
 if(d.held){e.preventDefault();positionGhost(d);paintDrop(d);return;}
 if(d.panning||Math.hypot(dx,dy)>moveThreshold){
  clearTimeout(d.timer);holdCue.cancel();d.panning=true;root.dataset.panning='true';capturePointer(d);
  d.pan.scrollLeft=d.scrollX-dx/previewScale();d.pan.scrollTop=d.scrollY-dy/previewScale();e.preventDefault();
 }
},{passive:false});
listen(root,'pointerup',e=>{
 const d=gesture;if(!d||d.pointer!==e.pointerId)return;
 const lane=hitLane(e.clientX,e.clientY),plan=d.held?dropPlan(d,lane?.dataset.zone):null,active=d.held||d.panning;
 cancelGesture(active);
 if(plan)mutate(plan.action,d.key,plan.id||d.id,d.uid,plan.destination);
 else if(d.held)notify('移動を取り消しました。');
});
for(const type of ['pointercancel','lostpointercapture'])listen(root,type,e=>{if(gesture?.pointer===e.pointerId)cancelGesture();});
listen(root,'pointerleave',()=>{if(gesture&&!gesture.held&&!gesture.panning)cancelGesture();});
listen(root,'contextmenu',e=>{if(gesture)e.preventDefault();});
listen(root,'wheel',e=>{
 cancelGesture();const grid=e.target.closest('[data-scroll-zone]')||e.target.closest('[data-board-scroll]');if(!grid||e.ctrlKey)return;
 if(grid.scrollWidth>grid.clientWidth&&grid.scrollHeight<=grid.clientHeight+1&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){
  e.preventDefault();grid.scrollLeft+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?grid.clientWidth:1);saveScroll();
 }
},{passive:false});
listen(root,'scroll',e=>{if(e.target.matches?.('[data-scroll-zone],[data-board-scroll]'))saveScroll();},{capture:true});
listen(window,'blur',()=>cancelGesture());
listen(document,'visibilitychange',()=>{if(document.hidden)cancelGesture();});
listen(document,'pointerdown',e=>{if(e.isPrimary===false)cancelGesture();},{capture:true});
listen(document,'pointerup',e=>{if(gesture?.pointer===e.pointerId&&!root.contains(e.target))cancelGesture();});
