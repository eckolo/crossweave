'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
function buildPreparation(){
 const src=read('../co-u01/view.js');
 const digest=crypto.createHash('sha256').update(src).digest('hex');
 if(digest!=='86fb738499ab8de7735a1ea4b462d4abed82e5ecda4f72cb0c27debc47aa9020')throw Error('UI-G-001 v0.1.1 renderer source drift');
 const span=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw Error('missing rendering boundary');return src.slice(i,j);};
 let helpers=span('function tile(','function returnPage(');
 helpers=helpers.replace('used=p.equipment.reduce((s,id)=>s+(detail(id).equipment_cost||0),0)','used=comparison?.ok?comparison.prepared.equipment.used:dirty()?null:home().equipment.used')
  .replace('${used} /','${used??\'—\'} /').replace('h.offers.status','h.offers?.status').replaceAll('h.offers.status','h.offers?.status').replaceAll('h.offers.carried_from_previous_return','h.offers?.carried_from_previous_return')
  .replace('dd().capabilities.purchase.available','dd().capabilities?.purchase?.available');
 // Distinguish not connected from empty inventory, without changing game data.
 helpers=helpers.replace("if(section==='owned'){heading='所持';", "if(section==='owned'&&!dd().capabilities?.purchase?.available&&!dd().capabilities?.convert_items?.available)return '<main class=\"cw-main\"><h2>所持</h2><p>個体の所持・変換は接続待ち</p></main>'+draftPane();if(section==='owned'){heading='所持';");
 let windows=span('function popupHeader(',"root.addEventListener('click'");
 windows=windows.replace('${pt(Math.max(0,candidate.price_units-h.economy.unspent_units))}','${candidate.affordable_now===false?\'比較で確認\':\'—\'}')
  .replace("if(candidate){body+=", "body+=publicFields(d);if(candidate){body+=")
  .replace('else body+=ledger(c);',"else body+=c?ledger(c):'<p>比較中…</p>';");
 // Never present an old local handle as a new current item after a refresh.
 helpers=helpers.replace('function mini(id,count=1){return',"function mini(id,count=1){if(stale)return `<span class=\"cw-mini\" title=\"前の下書き\">${esc(oldDetails[id==='$purchase'?plan?.candidate:id]?.name||'前の選択')} ×${count}</span>`;return");
 let result=read('preparation.template.js').replace('__NOTICE_HELPER__',()=>span('function noticeFor(','function traceCommand('))
  .replace('__RENDER_HELPERS__',()=>helpers).replace('__WINDOW_HELPERS__',()=>windows)
  .replace('__LAYOUT_HELPERS__',()=>span('function updateScrollCue(',"if(typeof ResizeObserver"));
 if(/__(?:NOTICE|RENDER|WINDOW|LAYOUT)_HELPER|createMockController|controller\.testing|\bDATA\b|command-preview/.test(result))throw Error('unexpected test/runtime boundary');
 new Function(result);return result;
}
function buildLibrary(){return read('session.js')+'\n'+buildPreparation()+'\n'+read('exploration.js')+'\n'+read('application.js');}
function buildStyle(){return read('../co-u01/screen.css').replaceAll('#crossweave-growth-001','.cw-m1')+'\n'+read('application.css')+'\n'+read('../interaction/table.css').replaceAll('#cw-playtable','.cw-explore')+'\n'+read('exploration.css');}
if(require.main===module){const dest=path.join(__dirname,'dist');fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'crossweave-ui.js'),buildLibrary());fs.writeFileSync(path.join(dest,'crossweave-ui.css'),buildStyle());console.log('Generated dist/crossweave-ui.js and .css; inject a design-owned Campaign provider.');}
module.exports={buildPreparation,buildLibrary,buildStyle};
