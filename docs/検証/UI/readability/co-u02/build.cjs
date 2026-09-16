'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
function buildPreparation(){
 const src=read('../co-u01/view.js');
 const digest=crypto.createHash('sha256').update(src).digest('hex');
 if(digest!=='86fb738499ab8de7735a1ea4b462d4abed82e5ecda4f72cb0c27debc47aa9020')throw Error('UI-G-001 v0.1.1 renderer source drift');
 const start=src.indexOf('function updateScrollCue('),end=src.indexOf('if(typeof ResizeObserver',start);
 if(start<0||end<0)throw Error('missing original layout boundary');
 const result=read('preparation.template.js')
  .replace('__RENDER_HELPERS__',()=>read('preparation-render.js'))
  .replace('__LAYOUT_HELPERS__',()=>src.slice(start,end));
 if(/__(?:NOTICE|RENDER|WINDOW|LAYOUT)_HELPER|createMockController|controller\.testing|\bDATA\b|command-preview/.test(result))throw Error('unexpected test/runtime boundary');
 new Function(result);return result;
}
function buildLibrary(){return read('session.js')+'\n'+read('window-placement.js')+'\n'+buildPreparation()+'\n'+read('exploration.js')+'\n'+read('application.js');}
function buildPreparationStyle(){return read('../co-u01/screen.css').replaceAll('#crossweave-growth-001','.cw-m1')+'\n'+read('preparation.css');}
function buildStyle(){return buildPreparationStyle()+'\n'+read('application.css')+'\n'+read('../interaction/table.css').replaceAll('#cw-playtable','.cw-explore')+'\n'+read('exploration.css');}
if(require.main===module){
 const dest=path.join(__dirname,'dist');fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'crossweave-ui.js'),buildLibrary());fs.writeFileSync(path.join(dest,'crossweave-ui.css'),buildStyle());
 console.log('Generated dist/crossweave-ui.js and .css; inject a design-owned Campaign provider.');
}
module.exports={buildPreparation,buildLibrary,buildPreparationStyle,buildStyle};
