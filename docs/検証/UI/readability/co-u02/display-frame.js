/* Display geometry only. One 1920x1080 game coordinate system at every scale. */
(function(api){'use strict';
 const frames=new WeakMap();
 api.displaySize=Object.freeze({width:1920,height:1080});
 api.mountDisplayFrame=function(root){
  let frame=frames.get(root);
  if(!frame){
   const doc=root.ownerDocument,viewport=doc.createElement('div'),space=doc.createElement('div');
   const originalStyle=root.getAttribute('style'),originalDisplay=root.dataset.display;
   viewport.className='cw-display-viewport';viewport.setAttribute('role','region');viewport.setAttribute('aria-label','ゲーム画面');
   space.className='cw-display-space';root.before(viewport);viewport.append(space);space.append(root);
   Object.assign(viewport.style,{width:'100%',minWidth:'0',position:'relative',overflow:'hidden'});
   Object.assign(space.style,{position:'relative',marginInline:'auto'});
   Object.assign(root.style,{width:'1920px',height:'1080px',maxWidth:'none',position:'absolute',left:'0',top:'0',transformOrigin:'0 0'});
   root.dataset.display='fhd';
   frame={count:0,mode:'fit',scale:1,viewport,space};
   frame.sync=function(){
    const width=viewport.clientWidth||viewport.getBoundingClientRect().width||1024;
    const scale=frame.mode==='actual'?1:Math.min(1,width/1920),changed=scale!==frame.scale;
    frame.scale=scale;root.dataset.displayScale=String(scale);
    root.style.transform='scale('+scale+')';
    space.style.width=1920*scale+'px';space.style.height=1080*scale+'px';
    viewport.style.height=Math.min(1080,width*9/16)+'px';viewport.style.overflow=frame.mode==='actual'?'auto':'hidden';
    if(frame.mode==='fit'){viewport.scrollLeft=0;viewport.scrollTop=0;}
    if(changed)root.dispatchEvent(new CustomEvent('cw-display-change',{detail:{mode:frame.mode,scale}}));
    root.dispatchEvent(new CustomEvent('cw-display-state',{bubbles:true,detail:{mode:frame.mode,scale}}));
   };
   frame.observer=new ResizeObserver(frame.sync);frame.observer.observe(viewport);frames.set(root,frame);frame.sync();
   frame.destroy=function(){frame.observer.disconnect();viewport.before(root);viewport.remove();if(originalStyle===null)root.removeAttribute('style');else root.setAttribute('style',originalStyle);if(originalDisplay===undefined)delete root.dataset.display;else root.dataset.display=originalDisplay;delete root.dataset.displayScale;frames.delete(root);};
  }
  frame.count++;let disposed=false;
  return {sync:frame.sync,dispose(){if(disposed)return;disposed=true;if(--frame.count===0)frame.destroy();}};
 };
 api.setDisplayMode=function(root,mode){const frame=frames.get(root);if(!frame||!['fit','actual'].includes(mode))return false;frame.mode=mode;frame.sync();return true;};
 api.displayState=root=>{const f=frames.get(root);return f?{mode:f.mode,scale:f.scale,width:1920,height:1080}:null;};
})(globalThis.CrossweaveUI);
