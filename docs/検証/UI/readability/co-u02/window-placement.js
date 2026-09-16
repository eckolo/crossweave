/* Presentation geometry only. Input rectangles must come from visible UI objects. */
(function(api){'use strict';
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
   if(r.w<Math.min(minWidth,bounds.w)||r.h<Math.min(minHeight,bounds.h))continue;
   const w=Math.min(preferredWidth,r.w),h=Math.min(preferredHeight,r.h);
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
})(globalThis.CrossweaveUI);
