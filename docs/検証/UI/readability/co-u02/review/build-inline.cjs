// Reproducible conversation preview: same UI and actual Campaign. No network API.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {bundle,buildStyle}=require('../journey/build.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function build({testing=false}={}){
 const runtime=bundle(),manifest=JSON.parse(read('fixtures/manifest.json'));
 const selected=manifest.records.filter(r=>r.id!=='migrated-return');
 const packed=Object.fromEntries(selected.map(r=>[r.id,{...r,data:fs.readFileSync(path.join(__dirname,'fixtures',r.path)).toString('base64')}]));
 const setup=read('checkpoints.mjs').replace(/^import .+;\n/gm,'').replace(/^export /gm,'');
 const picker=read('picker.mjs').replace(/^import .+;\n/gm,'').replace(/^export /gm,'');
 const script=[runtime.code,read('../dist/crossweave-ui.js'),'(()=>{',
 'const {createCampaign,MemoryStore}=CWJourneyRuntime;',setup,picker,
 'const packed='+JSON.stringify(packed)+';',
 `const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
 async function loadDocument(id){const p=packed[id];if(!p)throw Error('unknown_fixture');const compressed=Uint8Array.from(atob(p.data),c=>c.charCodeAt(0));if(hex(await crypto.subtle.digest('SHA-256',compressed))!==p.gzip_sha256)throw Error('fixture_hash_mismatch');const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();if(raw.byteLength!==p.raw_bytes||hex(await crypto.subtle.digest('SHA-256',raw))!==p.raw_sha256)throw Error('fixture_hash_mismatch');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}
 const host=document.getElementById('cw-consistency-review');
 const review=mountReview(host,{ui:CrossweaveUI,cases:checkpoints.filter(c=>Object.hasOwn(packed,c.fixture)),initial:'skills-current',updateURL:false,prepare:id=>createCheckpoint(id,loadDocument)});`,
 testing?'host.__test={review};':'','})();'].join('\n');
 new Function(script);
 const html=read('preview.fragment.html').replace('__STYLE__',()=>buildStyle()).replace('__SCRIPT__',()=>script.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1000000||/<(?:html|head|body)\b|<!doctype/i.test(html)||/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html))throw Error('invalid inline contract '+Buffer.byteLength(html));
 return {html,sources:runtime.sources,fixtures:selected.map(({id,source,source_sha256,raw_sha256})=>({id,source,source_sha256,raw_sha256}))};
}
if(require.main===module){const result=build(),output=process.argv[2]||'/workspace/crossweave-ui-consistency.html';fs.writeFileSync(output,result.html);fs.writeFileSync(path.join(__dirname,'inline-manifest.json'),JSON.stringify({version:'0.13.0',path:output,bytes:Buffer.byteLength(result.html),sha256:sha(result.html),runtime_sources:result.sources,fixtures:result.fixtures},null,2)+'\n');console.log(JSON.stringify({path:output,bytes:Buffer.byteLength(result.html),sha256:sha(result.html)}));}
module.exports={build};
