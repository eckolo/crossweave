// UI-L-003: schematic layout only; no game state or engine.
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),standalone=args.includes('--standalone');
const output=args.find(x=>x!=='--standalone')||'/workspace/crossweave-bc1-variable.html';
let html=fs.readFileSync(path.join(__dirname,'layout.fragment.html'),'utf8');
if(standalone)html='<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave · UI-L-003</title><style>:root{color-scheme:light dark}body{margin:0 auto;padding:16px;max-width:1024px;font:14px/1.5 system-ui,sans-serif}</style></head><body>\n'+html+'\n</body></html>\n';
fs.writeFileSync(output,html);
console.log(output);
