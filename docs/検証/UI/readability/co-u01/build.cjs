'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
function build({testing=false,standalone=false}={}){
 const data=JSON.stringify(JSON.parse(read('fixtures.json'))).replace(/</g,'\\u003c');
 const view=read('view.js').replace('__GROWTH_TEST__',testing?'root.__test={get controller(){return controller},get view(){return view},get plan(){return plan},get comparison(){return comparison},get win(){return win},get failed(){return failed},initialize,render,compare,execute,edit};':'');
 const script=`(()=>{\n${read('mock-controller.cjs')}\nconst DATA=${data};\n${view}\n})();`;
 new Function(script);
 const html=read('screen.fragment.html').replace('__GROWTH_STYLE__',()=>read('screen.css')).replace('__GROWTH_SCRIPT__',()=>script.replace(/<\/script/gi,'<\\/script'));
 assert(!/__GROWTH_[A-Z_]+__/.test(html));assert(Buffer.byteLength(html)<1e6);
 return standalone?'<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave — 準備と成長</title><style>body{box-sizing:border-box;margin:0;padding:12px;width:100%;max-width:min(1440px,calc((100dvh - 96px)*16/9 + 24px));margin-inline:auto;font-family:system-ui,sans-serif;color-scheme:light dark}@media(max-width:624px),(max-height:480px){body{max-width:1440px}}</style></head><body>'+html+'</body></html>':html;
}
if(require.main===module){const args=process.argv.slice(2),out=args.find(a=>!a.startsWith('--'))||path.join(__dirname,'preview.html');const html=build({standalone:args.includes('--standalone')});fs.writeFileSync(out,html);console.log(JSON.stringify({path:out,bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')}));}
module.exports={build};
