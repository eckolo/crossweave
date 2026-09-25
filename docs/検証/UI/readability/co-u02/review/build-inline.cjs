// Reproducible conversation preview: same UI and actual Campaign. No network API.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {bundle,buildStyle}=require('../journey/build.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function build({testing=false,fhd=false,art=false,cards=false,overlap=false,selection=false,placement=false,inward=false,edge=false}={}){
 art=art||cards||overlap||selection||placement||inward||edge;
 fhd=fhd||art;
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
 // Compress the unchanged executable source to leave room for embedded artwork.
 // This is local decoding, using the same gzip support as the pinned save inputs.
 const encoded=art?zlib.gzipSync(Buffer.from(script)).toString('base64'):null;
 const delivered=art?`(async()=>{const host=document.getElementById('${hostId}');try{const packed=Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0));const source=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();const script=document.createElement('script');script.textContent=source;host.append(script);script.remove();}catch(error){host.querySelector('#crossweave-journey').textContent='画面を開けませんでした（'+error.message+'）';}})();`:script;
 const html=read(fhd?'exploration-fhd.fragment.html':'preview.fragment.html').replace('__STYLE__',()=>buildStyle()).replace('__SCRIPT__',()=>delivered.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1000000||/<(?:html|head|body)\b|<!doctype/i.test(html)||/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html))throw Error('invalid inline contract '+Buffer.byteLength(html));
 return {html,script_sha256:sha(script),sources:runtime.sources,fixtures:selected.map(({id,source,source_sha256,raw_sha256})=>({id,source,source_sha256,raw_sha256}))};
}
if(require.main===module){
 const edge=process.argv[3]==='edge',inward=process.argv[3]==='inward',placement=process.argv[3]==='placement',selection=process.argv[3]==='selection',overlap=process.argv[3]==='overlap',cards=process.argv[3]==='cards',art=edge||inward||placement||selection||overlap||cards||process.argv[3]==='art',fhd=art||process.argv[3]==='fhd',result=build({fhd,art,cards,overlap,selection,placement,inward,edge}),output=process.argv[2]||(edge?'/workspace/crossweave-edge-details.html':inward?'/workspace/crossweave-inward-details.html':placement?'/workspace/crossweave-steady-details.html':selection?'/workspace/crossweave-select-details.html':overlap?'/workspace/crossweave-art-overlap.html':cards?'/workspace/crossweave-card-frames.html':art?'/workspace/crossweave-art-hold.html':fhd?'/workspace/crossweave-exploration-full-hd.html':'/workspace/crossweave-ui-consistency.html');
 fs.writeFileSync(output,result.html);
 const files=['../dist/crossweave-ui.js','../dist/crossweave-ui.css','../display-frame.js','../window-placement.js','../prose-layout.js','../exploration.js','../journey/view.js','../journey/panels.js','../journey/layout.js','../journey/launcher.js','../journey/full-hd.css','../journey/build.cjs','../build.cjs','build-inline.cjs','picker.mjs','checkpoints.mjs',fhd?'exploration-fhd.fragment.html':'preview.fragment.html',...(fhd?['display-controls.js']:[]),...(art?['../hold-cue.js','../hold-cue.css','../art-assets/build.cjs','../art-assets/presentation.js','../art-assets/presentation.css']:[])];
 fs.writeFileSync(path.join(__dirname,edge?'edge-details-manifest.json':inward?'inward-details-manifest.json':placement?'steady-details-manifest.json':selection?'select-details-manifest.json':overlap?'art-overlap-manifest.json':cards?'card-frames-manifest.json':art?'art-hold-manifest.json':fhd?'exploration-fhd-manifest.json':'inline-manifest.json'),JSON.stringify({version:edge?'0.14.7':inward?'0.14.6':placement?'0.14.5':selection?'0.14.4':overlap?'0.14.3':cards?'0.14.2':art?'0.14.1':fhd?'0.14.0':'0.13.0',path:output,bytes:Buffer.byteLength(result.html),sha256:sha(result.html),...(art?{script_encoding:'gzip-base64',decoded_script_sha256:result.script_sha256}:{}),runtime_sources:result.sources,fixtures:result.fixtures,ui_sources:files.map(p=>({path:p,sha256:sha(read(p))}))},null,2)+'\n');
 console.log(JSON.stringify({path:output,bytes:Buffer.byteLength(result.html),sha256:sha(result.html)}));
}
module.exports={build};
