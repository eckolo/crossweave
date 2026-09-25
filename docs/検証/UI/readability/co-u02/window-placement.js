/* Presentation geometry only. Input rectangles must come from visible UI objects. */
(function(api){'use strict';
 api.displayScale=element=>Number(element.closest('[data-display-scale]')?.dataset.displayScale)||1;
 api.uiSpace=function(element){
  const r=element.getBoundingClientRect(),scale=api.displayScale(element),left=element.clientLeft||0,top=element.clientTop||0;
  return {left:r.left+left*scale,top:r.top+top*scale,width:element.clientWidth||r.width/scale-2*left,height:element.clientHeight||r.height/scale-2*top,scale};
 };
 api.uiRect=function(element,container){const s=api.uiSpace(container),r=element?.getBoundingClientRect();return r&&r.width&&r.height?{x:(r.left-s.left)/s.scale,y:(r.top-s.top)/s.scale,w:r.width/s.scale,h:r.height/s.scale}:null;};
 api.placeWindow=function({width,height,anchor,avoid=[],preferredWidth=340,preferredHeight=280,margin=8,minWidth=172,minHeight=76}){
  const bounds={x:margin,y:margin,w:Math.max(1,width-2*margin),h:Math.max(1,height-2*margin)};
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  const regions=[bounds];
  for(const b of [anchor,...avoid].filter(Boolean)){
   regions.push({x:bounds.x,y:bounds.y,w:b.x-margin-bounds.x,h:bounds.h},
    {x:b.x+b.w+margin,y:bounds.y,w:width-margin-(b.x+b.w+margin),h:bounds.h},
    {x:bounds.x,y:bounds.y,w:bounds.w,h:b.y-margin-bounds.y},
    {x:bounds.x,y:b.y+b.h+margin,w:bounds.w,h:height-margin-(b.y+b.h+margin)});
  }
  const candidates=[];
  for(const source of regions){
   const x=Math.max(bounds.x,source.x),y=Math.max(bounds.y,source.y);
   const r={x,y,w:Math.min(bounds.x+bounds.w,source.x+source.w)-x,h:Math.min(bounds.y+bounds.h,source.y+source.h)-y};
   // The trigger determines position, never the dimensions of a detail window.
   const w=Math.min(preferredWidth,bounds.w),h=Math.min(preferredHeight,bounds.h);
   if(r.w<w||r.h<h)continue;
   for(const x of [r.x,r.x+(r.w-w)/2,r.x+r.w-w])for(const y of [r.y,r.y+(r.h-h)/2,r.y+r.h-h]){
    const p={x,y,w,h};
    const conflict=(anchor?overlap(p,anchor)*1000:0)+avoid.reduce((sum,b)=>sum+overlap(p,b)*10,0);
    const sizeLoss=preferredWidth*preferredHeight-w*h;
    const distance=anchor?Math.abs(x+w/2-anchor.x-anchor.w/2)+Math.abs(y+h/2-anchor.y-anchor.h/2):0;
    candidates.push({...p,score:conflict+sizeLoss*.05+distance*.01});
   }
  }
  const best=candidates.sort((a,b)=>a.score-b.score)[0]||bounds;
  return {left:Math.max(margin,best.x),top:Math.max(margin,best.y),width:best.w,height:best.h,source_overlap:anchor?overlap(best,anchor):0};
 };
 // Object details use the opposite screen edge so adjacent objects stay selectable.
 // Vertical clamping keeps lower-row details above the persistent footer.
 api.placeEdgeWindow=function({width,height,anchor,preferredWidth=520,preferredHeight=480,margin=16,preferredTop=anchor?.y??margin,bottom=height}){
  const w=Math.min(preferredWidth,Math.max(1,width-2*margin)),h=Math.min(preferredHeight,Math.max(1,height-2*margin));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  // Centered sources belong to the right half, including subpixel scaling noise.
  const right=!anchor||anchor.x+anchor.w/2<width/2-.01;
  return {left:right?Math.max(margin,width-margin-w):margin,top:clamp(preferredTop,margin,bottom-margin-h),width:w,height:h};
 };
 api.placeActorWindow=function({width,height,anchor,preferredWidth=416,preferredHeight=384,margin=16}){
  return api.placeEdgeWindow({width,height,anchor,preferredWidth,preferredHeight,margin,preferredTop:margin});
 };
 // A linked pair keeps the parent where possible. At narrow widths both panes
 // reflow side by side; neither pane covers or silently replaces its parent.
 api.placeWindowPair=function({width,height,parent,preferredWidth=340,preferredHeight=350,margin=8,gap=8,minWidth=144}){
  const usable=Math.max(1,width-2*margin),h=Math.max(1,Math.min(preferredHeight,height-2*margin));
  const w=Math.min(preferredWidth,(usable-gap)/2),top=Math.max(margin,Math.min(parent?.top??margin,height-margin-h));
  const groupWidth=2*w+gap,left=Math.max(margin,Math.min(parent?.left??margin,width-margin-groupWidth));
  return [{left,top,width:w,height:h},{left:left+w+gap,top,width:w,height:h}];
 };
})(globalThis.CrossweaveUI);
