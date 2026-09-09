// UI-L-001 is a layout comparison, not a playable replacement for UI-R-001.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const args=process.argv.slice(2),standalone=args.includes('--standalone');
const output=args.find(x=>x!=='--standalone')||'/workspace/crossweave-layout-options.html';
let html=fs.readFileSync(path.join(__dirname,'layout.fragment.html'),'utf8');
if(standalone)html='<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave · UI-L-001 配置比較</title><style>:root{color-scheme:light dark}body{margin:0 auto;padding:16px;max-width:1200px;font:14px/1.5 system-ui,sans-serif}</style></head><body>\n'+html+'\n</body></html>\n';
fs.writeFileSync(output,html);
console.log(JSON.stringify({test_id:'UI-L-001',version:'0.1',output,standalone,sha256:crypto.createHash('sha256').update(html).digest('hex')}));
