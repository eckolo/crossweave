// D03R connected entry; unchanged representative saves and current distribution bundle.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {bundle,buildStyle}=require('../journey/build.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function build({testing=false}={}){
 const runtime=bundle(),source=path.resolve(__dirname,'../../../../接続条件/co-d03r');
 const saves={},manifest=JSON.parse(fs.readFileSync(path.join(source,'save-manifest.json'),'utf8'));
 const used=manifest.filter(x=>x.name!=='departed');
 for(const record of used){
  const encoded=fs.readFileSync(path.join(source,record.path));
  if(hash(encoded)!==record.encoded_sha256)throw Error('representative encoded hash mismatch');
  const raw=zlib.brotliDecompressSync(Buffer.from(encoded.toString().trim(),'base64'));
  if(hash(raw)!==record.raw_sha256)throw Error('representative raw hash mismatch');
  saves[record.name]=zlib.gzipSync(raw).toString('base64');
 }
 const existing=JSON.parse(read('fixtures/manifest.json')).records.find(x=>x.id==='offers-home');
 const compressed=fs.readFileSync(path.join(__dirname,'fixtures',existing.path));
 if(hash(compressed)!==existing.gzip_sha256||hash(zlib.gunzipSync(compressed))!==existing.raw_sha256)throw Error('existing save hash mismatch');
 saves['offers-home']=compressed.toString('base64');
 const script=[runtime.code,read('../dist/crossweave-ui.js'),'(()=>{const host=document.getElementById("cw-exploration-fhd");',read('display-controls.js'),'const connectedSaves='+JSON.stringify(saves)+';',read('connected-entry.js'),testing?'host.__test={entry:connectedEntry,runtime:CWJourneyRuntime};':'','})();'].join('\n');
 new Function(script);
 const encoded=zlib.gzipSync(Buffer.from(script)).toString('base64');
 const delivered=`(async()=>{const host=document.getElementById('cw-exploration-fhd');try{const compressed=Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0));const source=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();const script=document.createElement('script');script.textContent=source;host.append(script);script.remove();}catch(error){host.querySelector('#crossweave-journey').textContent='画面を開けませんでした（'+error.message+'）';}})();`;
 const html=read('unified-navigation.fragment.html').replace(/  <p class="review-note"[^\n]+\n/,'').replace('__STYLE__',()=>buildStyle()).replace('__SCRIPT__',()=>delivered.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1000000||/<(?:html|head|body)\b|<!doctype/i.test(html)||/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html))throw Error('invalid inline contract '+Buffer.byteLength(html));
 const files=['../dist/crossweave-ui.js','../dist/crossweave-ui.css','../session.js','../entry.mjs','../journey/launcher.js','../journey/view.js','../journey/panels.js','../journey/destinations.js','../journey/build.cjs','../acquisition-preview/app.js','../acquisition-preview/runtime.js','../acquisition-preview/layout.js','../acquisition-preview/gestures.js','../acquisition-preview/structure.css','../acquisition-preview/build.cjs','build-connected-inline.cjs','connected-entry.js','display-controls.js','unified-navigation.fragment.html'];
 return {html,runtime_sources:runtime.sources,ui_sources:files.map(path=>({path,sha256:hash(read(path))})),fixtures:[...used,existing],decoded_script_sha256:hash(script)};
}
if(require.main===module){const output=process.argv[2]||'/workspace/crossweave-connected-acquisition.html',result=build();fs.writeFileSync(output,result.html);const {html,...record}=result;const manifest={version:'0.16.0',path:output,bytes:Buffer.byteLength(html),sha256:hash(html),design_commit:'9d5dd304dee942965b9f1dd62368bee9f3c9e670',storage:'MemoryStore; production entry uses Campaign IndexedDB',...record};fs.writeFileSync(path.join(__dirname,'connected-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({path:output,bytes:manifest.bytes,sha256:manifest.sha256}));}
module.exports={build};
