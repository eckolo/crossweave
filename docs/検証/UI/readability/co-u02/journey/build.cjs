'use strict';
// Inline review only: unchanged Campaign + the design-owned test MemoryStore.
// No persistent-save fallback, UI economy, network import, or private-data projection.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../../../..'),read=p=>fs.readFileSync(path.resolve(__dirname,p),'utf8');
function bundle(){
 const modules=[],ids=new Map(),sources=[];
 function visit(file){
  file=path.resolve(file);if(ids.has(file))return ids.get(file);
  const id=modules.length;ids.set(file,id);modules.push(null);
  let src=fs.readFileSync(file,'utf8');sources.push({path:path.relative(root,file),sha256:crypto.createHash('sha256').update(src).digest('hex')});
  // This closed source set uses only static imports and immutable runtime exports.
  // The test-support module is used only for MemoryStore, not mutable test serials.
  const names=[];
  src=src.replace(/^import\s+(.+?)\s+from\s+['"](.+?)['"];\s*$/gm,(_,binding,relative)=>{
   if(!relative.startsWith('.'))throw Error('external import: '+relative);
   const dep=visit(path.resolve(path.dirname(file),relative));
   if(binding.startsWith('{'))return 'const '+binding.replace(/\bas\b/g,':')+'=get('+dep+');';
   if(binding.startsWith('* as '))return 'const '+binding.slice(5)+'=get('+dep+');';
   return 'const '+binding+'=get('+dep+').default;';
  });
  src=src.replace(/^export\s+default\s+(.+);\s*$/gm,(_,expr)=>'const __default__='+expr+';');
  if(src.includes('const __default__='))names.push(['default','__default__']);
  src=src.replace(/^export\s+((?:async\s+)?function|class|const|let)\s+(\w+)/gm,(_,kind,name)=>{names.push([name,name]);return kind+' '+name;});
  src=src.replace(/^export\s*\{([^}]+)\};\s*$/gm,(_,list)=>{for(const item of list.split(',')){const [from,to]=item.trim().split(/\s+as\s+/);names.push([to||from,from]);}return '';});
  if(/^\s*(?:import|export)\s/m.test(src))throw Error('unsupported module syntax: '+file);
  modules[id]='function(get){\n'+src+'\nreturn {'+names.map(([a,b])=>JSON.stringify(a)+':'+b).join(',')+'};\n}';return id;
 }
 const campaign=visit(path.join(root,'src/runtime/campaign.mjs')),support=visit(path.join(root,'test/runtime/support.mjs'));
 const code='const CWJourneyRuntime=(()=>{const factories=['+modules.join(',\n')+'],cache=[],loading=new Set();function get(id){if(cache[id])return cache[id];if(loading.has(id))throw Error("cyclic inline module");loading.add(id);const value=factories[id](get);loading.delete(id);return cache[id]=value;}return {createCampaign:get('+campaign+').createCampaign,MemoryStore:get('+support+').MemoryStore};})();';
 new Function(code);return {code,sources};
}
function build({testing=false,fixture='return'}={}){
 if(!['return','entry'].includes(fixture))throw Error('unsupported preview fixture');
 const runtime=bundle();
 const save=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../../../接続条件/co-d02/saves/'+fixture+'.save.json.gz'))));
 const quest=JSON.parse(read('../../flow/fixtures.json')).quest;
 const panels=read('panels.js').replace('__JOURNEY_RECORDS__',()=>read('records.js'));
 const view=read('view.js').replace('__JOURNEY_PANELS__',()=>panels);
 const script=[runtime.code,read('../session.js'),read('../window-placement.js'),read('../prose-layout.js'),read('../card-properties.js'),read('../action-forecast.js'),read('../exploration.js'),read('layout.js'),view,
  '(async()=>{const root=document.getElementById("crossweave-journey");try{',
  'const storage=new CWJourneyRuntime.MemoryStore(),Campaign=CWJourneyRuntime.createCampaign({storage});',
  'const controller=await Campaign.importSave({slot_id:"journey-preview",document:'+JSON.stringify(save).replace(/</g,'\\u003c')+',request_id:"journey-preview-import"});',
  'const app=CrossweaveUI.mountJourney(root,{controller,Campaign,slot_id:"journey-preview",title:'+JSON.stringify(quest.title)+'});',
  testing?'root.__test={app,storage,Campaign,controller};':'',
  '}catch(error){root.textContent="操作試作を開始できませんでした（"+(error.code||error.message)+"）";root.setAttribute("role","alert");}})();'
 ].join('\n');
 new Function(script);
 const style=read('../../interaction/table.css').replaceAll('#cw-playtable','#crossweave-journey .cw-explore')+'\n'+read('../exploration.css').replaceAll('.cw-explore','#crossweave-journey .cw-explore')+'\n'+read('screen.css')+'\n'+read('viewport.css')+'\n'+read('interaction-review.css')+'\n'+read('fixed-screen.css')+'\n'+read('backdrop.css')+'\n'+read('flow-review.css')+'\n'+read('actor-review.css')+'\n'+read('fit-review.css')+'\n'+read('../exploration-layout.css').replaceAll('.cw-explore','#crossweave-journey .cw-explore');
 const html=read('preview.fragment.html').replace('__JOURNEY_STYLE__',()=>style).replace('__JOURNEY_SCRIPT__',()=>script.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1000000||/<(?:html|head|body)\b|<!doctype/i.test(html)||/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html))throw Error('invalid inline contract');
 return {html,sources:runtime.sources};
}
if(require.main===module){const output=process.argv[2]||'/workspace/crossweave-exploration-restored.html',fixture=process.argv[3]||'return';const {html}=build({fixture});fs.writeFileSync(output,html);console.log(JSON.stringify({path:output,fixture,bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')}));}
module.exports={build,bundle};
