'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=__dirname,read=n=>fs.readFileSync(path.join(root,n),'utf8');
function build({testing=false}={}){
  const files=fs.readdirSync(path.join(root,'src/vendor')).filter(n=>/\.(js|json)$/.test(n)).map(n=>'vendor/'+n).concat(['scenario.js','seed.json']);
  const factories=files.map(n=>JSON.stringify(n)+':function(module,exports,require){\n'+(n.endsWith('.json')?'module.exports='+JSON.stringify(JSON.parse(read('src/'+n)))+';':read('src/'+n))+'\n}');
  const loader=`const CWRequire=(()=>{const factories={${factories.join(',\n')}},cache={};function resolve(parent,child){const parts=(child.startsWith('.')?parent.split('/').slice(0,-1).join('/')+'/'+child:child).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');}function req(id){if(cache[id])return cache[id].exports;if(!factories[id])throw Error('Missing module '+id);const m={exports:{}};cache[id]=m;factories[id](m,m.exports,name=>req(resolve(id,name)));return m.exports;}return req;})();\nconst CWFeedback=CWRequire('vendor/feedback.js');\n`;
  const dataUrl='data:image/webp;base64,'+fs.readFileSync(path.join(root,'assets/channel.webp')).toString('base64');
  let js=['support.js','terminology.js','icons.js','surface.js','catalogue.js','relations.js','night-tide.js','view.js'].map(n=>read('ui/'+n)).join('\n');
  js=js.replace('__CW_TERMS__',()=>JSON.stringify(JSON.parse(read('ui/terminology.json'))).replace(/</g,'\\u003c'))
    .replace('__NT_BACKGROUND__',()=>JSON.stringify(dataUrl))
    .replace('__NT_TEST_BRIDGE__',testing?'window.__nt={get session(){return session},renderApp,perform,selectCard,importRecord,snapshot,ack:()=>{session.acknowledge(absorb);renderApp()},get target(){return target},set target(v){target=v},get version(){return version}};':'');
  let html=read('ui/preparation.html')+'\n'+read('ui/play.fragment.html');
  for(const [token,value]of Object.entries({__CW_STYLE__:read('ui/table.css')+'\n'+read('ui/night-tide.css'),__CW_ENGINE__:'',__CW_FEEDBACK__:'',__CW_ECOLOGY__:'',__CW_TERRAIN__:'',__CW_VIEW__:loader+js}))html=html.replace(token,()=>value.replace(/<\/script/gi,'<\\/script'));
  assert(!/__CW_[A-Z_]+__|__NT_[A-Z_]+__/.test(html));
  assert(Buffer.byteLength(html)<1e6);new Function(loader+js);
  return html;
}
if(require.main===module){
  const args=process.argv.slice(2),out=args.find(x=>!x.startsWith('--'))||path.join(root,'crossweave-night-tide.html');
  const fragment=build({testing:args.includes('--test')});
  const s=args.includes('--standalone')?'<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave — 夜潮の排水路</title><style>:root{color-scheme:light dark}body{margin:0;padding:16px;max-width:1440px;margin-inline:auto;font-family:system-ui,sans-serif} [hidden]{display:none!important}</style></head><body>'+fragment+'</body></html>':fragment;
  fs.writeFileSync(out,s);console.log(JSON.stringify({path:out,bytes:Buffer.byteLength(s),sha256:crypto.createHash('sha256').update(s).digest('hex')}));
}
module.exports={build};
