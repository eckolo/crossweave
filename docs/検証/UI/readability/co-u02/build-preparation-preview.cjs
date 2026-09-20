'use strict';
// Conversation-only mock. This builder is never part of the real Campaign entry.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const B=require('./build.cjs'),read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
function build({testing=false}={}){
 const data=JSON.stringify(JSON.parse(read('../co-u01/fixtures.json'))).replace(/</g,'\\u003c');
 const setup=[
  '(function(){',
  read('../co-u01/mock-controller.cjs'),
  'const DATA='+data+';',
  'const mock=createMockController(DATA,"return");',
  'const adapt=v=>{for(const type of ["ack_return","discard_draft","set_item_lock"])v.display_data.capabilities[type]={available:true,reasons:[]};return v;};',
  'const controller={inspect:async()=>adapt(mock.inspect()),previewPreparation:async a=>adapt(mock.previewPreparation(a)),quoteConversion:async a=>adapt(mock.quoteConversion(a)),execute:async a=>adapt(mock.execute(a))};',
  'let serial=0;',
  'const session=CrossweaveUI.makeSession(controller,{idFactory:()=>"ui-preview-"+(++serial)});',
  'const root=document.getElementById("crossweave-preparation-clear");',
  'const mounted=CrossweaveUI.mountPreparation(root,session);',
  testing?'root.__test={mock,session,mounted};':'',
  'session.refresh({preserveLocal:false});',
  '})();'
 ].join('\n');
 const script=read('session.js')+'\n'+B.buildPreparation()+'\n'+setup;
 new Function(script);
 const html=read('preparation-preview.fragment.html')
  .replace('__PREPARATION_STYLE__',()=>B.buildPreparationStyle())
  .replace('__PREPARATION_SCRIPT__',()=>script.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1e6||/<(?:html|body|head)\b|<!doctype/i.test(html))throw Error('invalid conversation fragment');
 return html;
}
if(require.main===module){
 const out=process.argv[2]||'/workspace/crossweave-preparation-clear.html',html=build();
 fs.writeFileSync(out,html);
 console.log(JSON.stringify({path:out,bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')}));
}
module.exports={build};
