// Reproducible conversation preview: same UI and actual Campaign. No network API.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {bundle,buildStyle}=require('../journey/build.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function build({testing=false,fhd=false}={}){
 const runtime=bundle(),manifest=JSON.parse(read('fixtures/manifest.json'));
 const selected=manifest.records.filter(r=>fhd?['purchased-exploring','offers-home'].includes(r.id):r.id!=='migrated-return');
 const packed=Object.fromEntries(selected.map(r=>[r.id,{...r,data:fs.readFileSync(path.join(__dirname,'fixtures',r.path)).toString('base64')}]));
 const setup=read('checkpoints.mjs').replace(/^import .+;\n/gm,'').replace(/^export /gm,'');
 const picker=read('picker.mjs').replace(/^import .+;\n/gm,'').replace(/^export /gm,'');
 const hostId=fhd?'cw-exploration-fhd':'cw-consistency-review';
 const script=[runtime.code,read('../dist/crossweave-ui.js'),'(()=>{',
 'const {createCampaign,MemoryStore}=CWJourneyRuntime;',setup,picker,
 'const packed='+JSON.stringify(packed)+';',
 `const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
 async function loadDocument(id){const p=packed[id];if(!p)throw Error('unknown_fixture');const compressed=Uint8Array.from(atob(p.data),c=>c.charCodeAt(0));if(hex(await crypto.subtle.digest('SHA-256',compressed))!==p.gzip_sha256)throw Error('fixture_hash_mismatch');const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();if(raw.byteLength!==p.raw_bytes||hex(await crypto.subtle.digest('SHA-256',raw))!==p.raw_sha256)throw Error('fixture_hash_mismatch');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}
 const host=document.getElementById('${hostId}');`,
 fhd?read('display-controls.js'):'',
 fhd?`const sceneLabels={'explore-d03':'探索','entry-d03':'出発時の本文',carried:'帰還','hub-d03':'出発前'};const cases=checkpoints.filter(c=>sceneLabels[c.id]).map(c=>({...c,label:sceneLabels[c.id]}));`:`const cases=checkpoints.filter(c=>Object.hasOwn(packed,c.fixture));`,
 `const review=mountReview(host,{ui:CrossweaveUI,cases,initial:'${fhd?'explore-d03':'skills-current'}',updateURL:false,prepare:id=>createCheckpoint(id,loadDocument)});`,
 testing?'host.__test={review,runtime:CWJourneyRuntime};':'','})();'].join('\n');
 new Function(script);
 const html=read(fhd?'exploration-fhd.fragment.html':'preview.fragment.html').replace('__STYLE__',()=>buildStyle()).replace('__SCRIPT__',()=>script.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1000000||/<(?:html|head|body)\b|<!doctype/i.test(html)||/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html))throw Error('invalid inline contract '+Buffer.byteLength(html));
 return {html,sources:runtime.sources,fixtures:selected.map(({id,source,source_sha256,raw_sha256})=>({id,source,source_sha256,raw_sha256}))};
}
if(require.main===module){
 const fhd=process.argv[3]==='fhd',result=build({fhd}),output=process.argv[2]||(fhd?'/workspace/crossweave-exploration-full-hd.html':'/workspace/crossweave-ui-consistency.html');
 fs.writeFileSync(output,result.html);
 const files=['../dist/crossweave-ui.js','../dist/crossweave-ui.css','../display-frame.js','../window-placement.js','../prose-layout.js','../exploration.js','../journey/view.js','../journey/panels.js','../journey/layout.js','../journey/launcher.js','../journey/full-hd.css','../journey/build.cjs','build-inline.cjs','picker.mjs','checkpoints.mjs',fhd?'exploration-fhd.fragment.html':'preview.fragment.html',...(fhd?['display-controls.js']:[])];
 fs.writeFileSync(path.join(__dirname,fhd?'exploration-fhd-manifest.json':'inline-manifest.json'),JSON.stringify({version:fhd?'0.14.0':'0.13.0',path:output,bytes:Buffer.byteLength(result.html),sha256:sha(result.html),runtime_sources:result.sources,fixtures:result.fixtures,ui_sources:files.map(p=>({path:p,sha256:sha(read(p))}))},null,2)+'\n');
 console.log(JSON.stringify({path:output,bytes:Buffer.byteLength(result.html),sha256:sha(result.html)}));
}
module.exports={build};
