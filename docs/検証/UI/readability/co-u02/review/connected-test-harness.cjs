// Focused empty-offer presentation checks; reuse the established inline test harness.
// Injected geometry and synthetic input are not real rendering or device tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-connected-inline.cjs');
const checks=[],errors=[],instances=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(5);}throw Error('timeout');}
function check(name,fn){fn();checks.push({name,passed:true});}
async function mount(){
 const {html}=build({testing:true});
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
 instances.push(dom);
 for(const key of ['structuredClone','TextEncoder','TextDecoder','Blob','Response','DecompressionStream'])w[key]=globalThis[key];
 Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
 let requests=0;
 w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{requests++;throw Error('network forbidden');};
 w.indexedDB={open(){throw Error('persistent save forbidden');}};
 w.ResizeObserver=class{observe(){}disconnect(){}};
 const intersections=[];w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.nodes=[];intersections.push(this);}observe(n){this.nodes.push(n);}disconnect(){this.nodes=[];}};
 w.matchMedia=()=>({matches:false});
 const root=w.document.getElementById('crossweave-journey'),host=w.document.getElementById('cw-exploration-fhd');
 function rect(el){
  if(el.classList.contains('cw-display-viewport'))return [0,0,1024,576];
  if(el===root||el.classList.contains('cj-shell')||el.classList.contains('cp-shell'))return [0,0,1920,1080];
  const zx={offer:17,reserve:413,build:1168},zw={offer:376,reserve:735,build:735},zone=el.closest('section[data-zone]')?.dataset.zone;
  if(el.hasAttribute('data-board-scroll'))return [17,81,1846,918];
  if(el.matches('section[data-zone]'))return [zx[zone],81,zw[zone],918];
  if(el.hasAttribute('data-scroll-zone'))return [zx[zone],121,zw[zone],878];
  if(el.classList.contains('cp-drag-ghost'))return [parseFloat(el.style.left)||0,parseFloat(el.style.top)||0,352,80];
  const piece=el.closest('.cp-piece');if(piece){const row=piece.parentElement,idx=[...row.children].indexOf(piece),cols=zone==='offer'?1:2;return [zx[zone]+2+idx%cols*360,123+Math.floor(idx/cols)*88,352,80];}
  if(el.hasAttribute('data-main'))return [1,65,1918,950];
  return [80,120,520,152];
 }
 w.HTMLElement.prototype.getBoundingClientRect=function(){const a=rect(this),s=this.classList.contains('cw-display-viewport')?1:Number(root.dataset.displayScale)||1;const [x,y,width,height]=a.map(v=>v*s);return {x,y,left:x,top:y,right:x+width,bottom:y+height,width,height};};
 for(const [prop,index] of [['clientWidth',2],['clientHeight',3]])Object.defineProperty(w.HTMLElement.prototype,prop,{configurable:true,get(){return rect(this)[index];}});
 Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){return this.clientWidth;}});
 w.HTMLElement.prototype.setPointerCapture=function(id){this.__capture=id;};w.HTMLElement.prototype.hasPointerCapture=function(id){return this.__capture===id;};w.HTMLElement.prototype.releasePointerCapture=function(){delete this.__capture;};
 w.document.elementFromPoint=(x,y)=>[...root.querySelectorAll('section[data-zone]')].find(el=>{const b=el.getBoundingClientRect();return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;})||root;
 const s=w.document.createElement('script');s.textContent=script;w.document.body.append(s);
 await until(()=>host.__test);const review=host.__test.entry;assert(await review.ready);
 const q=selector=>root.querySelector(selector);
 async function settled(){await wait(5);await until(()=>!review.app?.session?.state().pending);await wait(5);}
 async function click(selector){const b=q(selector);assert(b,selector);assert(!b.disabled,selector);b.click();await settled();}
 await settled();
 async function displayTexts(){for(const o of intersections.slice())if(o.nodes.length)o.fn(o.nodes.filter(n=>n.isConnected).map(target=>({target,isIntersecting:true,intersectionRatio:1})));await settled();}
 return {dom,w,root,host,review,q,click,settled,displayTexts,requests:()=>requests};
}

module.exports={mount,until,wait,errors,instances,check,checks};
