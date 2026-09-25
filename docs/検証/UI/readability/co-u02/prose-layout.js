/* Layout only. Source paragraphs and their read-receipt IDs are unchanged. */
(function(api){'use strict';
 const closing=/^[、。，．！？!?）」』】〕］｝〉》ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]/;
 const opening=/[（「『【〔［｛〈《]$/;
 const graphemes=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);
 api.proseLines=function(text,fits){
  const chars=graphemes(text),lines=[];let start=0;
  while(start<chars.length){
   let lo=1,hi=chars.length-start,fit=1;
   while(lo<=hi){const n=(lo+hi)>>1;if(fits(chars.slice(start,start+n).join(''))){fit=n;lo=n+1;}else hi=n-1;}
   if(start+fit===chars.length){lines.push(chars.slice(start).join(''));break;}
   let sentence=0,comma=0;
   for(let n=1;n<=fit;n++){
    const ch=chars[start+n-1];if(!/[。！？、，,]/.test(ch))continue;
    let end=n;while(start+end<chars.length&&/[）」』】〕］｝〉》]/.test(chars[start+end]))end++;
    if(end>fit)continue;
    if(/[。！？]/.test(ch))sentence=end;else comma=end;
   }
   let cut=sentence||comma||fit;
   if(!sentence&&!comma){while(cut>1&&(closing.test(chars[start+cut]||'')||opening.test(chars[start+cut-1])))cut--;}
   lines.push(chars.slice(start,start+cut).join(''));start+=cut;
  }return lines;
 };
 const cache=new WeakMap();
 api.layoutProse=function(root){
  for(const node of root.querySelectorAll('.cj-story p,.cj-prose,.cj-inspect-scroll p,.cw-drawer-body p')){
   const width=node.clientWidth;if(!width)continue;
   const style=getComputedStyle(node),available=width-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0);
   const old=cache.get(node),source=old?.source??node.textContent,key=[available,style.font,style.letterSpacing,document.fonts?.status||''].join('|');
   if(old?.key===key||available<1)continue;
   const probe=document.createElement('span');probe.className='cw-prose-measure';probe.setAttribute('aria-hidden','true');
   Object.assign(probe.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre',pointerEvents:'none',width:'max-content',maxWidth:'none',font:'inherit',letterSpacing:'inherit'});node.append(probe);
   const scale=api.displayScale?.(node)||1;
   const lines=api.proseLines(source,text=>{probe.textContent=text;return probe.getBoundingClientRect().width/scale<=available-.5;});
   probe.remove();node.replaceChildren(...lines.map(text=>{const line=document.createElement('span');line.className='cw-prose-line';line.textContent=text;return line;}));
   cache.set(node,{source,key});
  }
 };
})(globalThis.CrossweaveUI);
