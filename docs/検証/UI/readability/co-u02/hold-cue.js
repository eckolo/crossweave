/* Shared feedback only. The caller owns the hold timer and the action. */
(function(global){'use strict';
 global.CrossweaveHoldCue={mount(host,{scale=()=>1}={}){
  const doc=host.ownerDocument,win=doc.defaultView,node=doc.createElement('div');
  node.className='cw-hold-cue';node.hidden=true;node.setAttribute('aria-hidden','true');
  node.innerHTML='<span class="cw-hold-ring"></span><span class="cw-hold-label"></span>';host.append(node);
  let frame=null,active=null,disposed=false;
  function position(){if(!active)return;const s=scale()||1,r=host.getBoundingClientRect(),pad=Math.max(25,(active.label.length*12+8)/2+4)/s;
   const width=host.clientWidth||r.width/s,height=host.clientHeight||r.height/s;
   const x=(active.x-r.left)/s-(host.clientLeft||0),y=(active.y-r.top)/s-(host.clientTop||0);
   node.style.left=Math.max(pad,Math.min(width-pad,x+20/s))+'px';
   node.style.top=Math.max(pad,Math.min(height-42/s,y-20/s))+'px';
   node.style.transform='translate(-50%,-50%) scale('+(1/s)+')';
  }
  function tick(now){frame=null;if(!active||disposed)return;
   const progress=Math.max(0,Math.min(1,(now-active.started)/active.duration));
   node.style.setProperty('--cw-hold-progress',String(progress));position();
   if(progress<1)frame=win.requestAnimationFrame(tick);
  }
  function cancel(){if(frame!==null)win.cancelAnimationFrame(frame);frame=null;active=null;node.hidden=true;node.removeAttribute('data-hold-action');}
  return {start(event,duration,action,label=action==='detail'?'詳細':'移動'){cancel();if(disposed||duration<=0)return;
    active={x:event.clientX,y:event.clientY,started:win.performance.now(),duration,label};
    node.dataset.holdAction=action;node.querySelector('.cw-hold-label').textContent=label;
    node.style.setProperty('--cw-hold-progress','0');position();node.hidden=false;frame=win.requestAnimationFrame(tick);
   },move(event){if(active){active.x=event.clientX;active.y=event.clientY;position();}},cancel,
   dispose(){cancel();disposed=true;node.remove();}};
 }};
})(globalThis);
