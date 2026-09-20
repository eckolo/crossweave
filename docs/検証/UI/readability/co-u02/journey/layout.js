/* UI geometry only. The header/footer each reserve a 44px action row. */
(function(api){'use strict';
api.journeyLayout=function(width,total,anchor=0,reserved=0){
 const compact=width<=400,padding=compact?0:8,gap=compact?4:8;
 const height=width*9/16,availableHeight=height-90-padding*2-reserved,availableWidth=width-2-padding*2;
 const columns=Math.max(1,Math.min(4,Math.floor((availableWidth+gap)/(224+gap))));
 const tileHeight=104;
 const maxRows=Math.max(1,Math.floor((availableHeight+gap)/(tileHeight+gap)));
 const capacity=columns*maxRows,pages=Math.max(1,Math.ceil(total/capacity));
 const page=Math.min(pages-1,Math.floor(Math.max(0,anchor)/capacity)),start=page*capacity,end=Math.min(total,start+capacity);
 const rows=Math.max(1,Math.ceil((end-start)/columns));
 const rowHeight=Math.min(tileHeight,(availableHeight-gap*(rows-1))/rows);
 return {width,height,padding,gap,columns,rows,capacity,pages,page,start,end,rowHeight,availableHeight,availableWidth};
};
})(globalThis.CrossweaveUI);
