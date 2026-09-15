'use strict';
// Rendering diagnostic only. No Campaign or persistence is claimed by this entry.
const fs=require('node:fs'),path=require('node:path');
const old=path.join(__dirname,'../co-u01'),read=n=>fs.readFileSync(path.join(old,n),'utf8');
function build({testing=false,standalone=true,patch=true}={}) {
 const data=fs.readFileSync(path.join(__dirname,'verification/layout-input.json'),'utf8');
 let view=read('view.js').replace('__GROWTH_TEST__',testing?'root.__test={get view(){return view},get plan(){return plan},get win(){return win},get controller(){return controller},initialize,render,compare};':'');
 let css=read('screen.css');
 const patchPath=path.join(__dirname,'layout-fit.css');if(patch&&fs.existsSync(patchPath))css+='\n'+fs.readFileSync(patchPath,'utf8');
 let html=read('screen.fragment.html').replace(/<option value="purchased">.*?<\/option>/,'').replace(/<option value="nt">.*?<\/option>/,'').replace('操作試作 · 模擬応答','表示修正確認 · 模擬応答（保存なし）');
 const js=`(()=>{${read('mock-controller.cjs')}\nconst DATA=${JSON.stringify(JSON.parse(data)).replace(/</g,'\\u003c')};\n${view}})();`;
 new Function(js);
 html=html.replace('__GROWTH_STYLE__',()=>css).replace('__GROWTH_SCRIPT__',()=>js.replace(/<\/script/gi,'<\\/script'));
 if(!standalone)return html;
 return '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave — 表示修正確認</title><style>body{box-sizing:border-box;margin:0;padding:12px;width:100%;max-width:min(1440px,calc((100dvh - 96px)*16/9 + 24px));margin-inline:auto;font-family:system-ui,sans-serif;color-scheme:light dark}@media(max-width:624px),(max-height:480px){body{max-width:1440px}}</style><body>'+html+'</body></html>';
}
if(require.main===module)fs.writeFileSync(process.argv[2]||path.join(__dirname,'layout-preview.html'),build());
module.exports={build};
