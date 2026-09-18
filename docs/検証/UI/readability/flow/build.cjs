'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function build({testing=false,standalone=false}={}) {
  const data=JSON.stringify(JSON.parse(read('fixtures.json'))).replace(/</g,'\\u003c');
  const view=read('view.js').replace('__FLOW_TEST__',testing?'root.__flow={model,render,get departureRequest(){return departureRequest}};':'');
  const script=`(()=>{\n${read('model.cjs')}\nconst DATA=${data};\n${view}\n})();`;
  new Function(script);
  const html=read('screen.fragment.html').replace('__FLOW_STYLE__',()=>read('screen.css')).replace('__FLOW_SCRIPT__',()=>script.replace(/<\/script/gi,'<\\/script'));
  assert(!/__FLOW_[A-Z_]+__/.test(html));assert(Buffer.byteLength(html)<1e6);
  if(!standalone)return html;
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave — 拠点・準備・帰還</title><style>body{margin:0;padding:16px;max-width:1440px;margin-inline:auto;background:light-dark(#f6f6f0,#171f1b);color-scheme:light dark;font-family:system-ui,sans-serif}</style></head><body>'+html+'</body></html>';
}
if(require.main===module){
  const args=process.argv.slice(2),out=args.find(a=>!a.startsWith('--'))||path.join(__dirname,'preview.html');
  const html=build({standalone:args.includes('--standalone'),testing:args.includes('--test')});fs.writeFileSync(out,html);console.log(JSON.stringify({path:out,bytes:Buffer.byteLength(html),sha256:sha(html)}));
}
module.exports={build,sha};
