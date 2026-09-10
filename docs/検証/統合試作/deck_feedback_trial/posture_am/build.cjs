'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const {config}=require('./load.cjs'),selection=require('./selection.json');
const base=path.dirname(__dirname),read=n=>fs.readFileSync(path.join(base,n),'utf8');
function build(){
  for(const [name,expected] of Object.entries(require('./provenance.json').sources))assert.equal(crypto.createHash('sha256').update(read(name)).digest('hex'),expected,'AM source changed: '+name);
  const seeds=JSON.parse(cp.execFileSync('python3',[path.join(base,'reward_build_inputs.py')],{maxBuffer:32e6})).slice(0,8);
  const modules=['engine.js','feedback.js','ecology.js','terrain.js','information.js','knowledge.js','expedition_loop.js','expedition_choices.js','reward_preparation.js','posture_am/session.js'];
  const factories=modules.map(n=>JSON.stringify(n)+':function(module,exports,require){\n'+read(n==='engine.js'?'posture_am/engine.js':n)+'\n}');
  const jsons=['input.json','loop_inputs.json','reward_build_inputs.json','posture_am/selection.json'];
  for(const n of jsons)factories.push(JSON.stringify(n)+':function(module){module.exports='+JSON.stringify(JSON.parse(read(n)))+';}');
  factories.push('"choice_inputs.json":function(module){module.exports='+JSON.stringify(config(selection.variant))+';}');
  factories.push('"posture_am/seeds.json":function(module){module.exports='+JSON.stringify(seeds)+';}');
  const loader=`const CWRequire=(()=>{const factories={${factories.join(',\n')}},cache={};function resolve(parent,child){const parts=(child.startsWith('.')?parent.split('/').slice(0,-1).join('/')+'/'+child:child).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');}function req(id){if(cache[id])return cache[id].exports;if(!factories[id])throw Error('Missing module '+id);const m={exports:{}};cache[id]=m;factories[id](m,m.exports,name=>req(resolve(id,name)));return m.exports;}return req;})();\n`;
  const script=(loader+['support.js','journey.js','view.js'].map(n=>read('posture_am/'+n)).join('\n')).replace(/<\/script/gi,'<\\/script');
  const html=read('posture_am/shell.html').replace('__AJ_BOARD__',()=>read('posture_am/play.fragment.html')).replace('__AJ_SCRIPT__',()=>script);
  assert(!/__AJ_[A-Z]+__|__CW_[A-Z]+__/.test(html));return html;
}
if(require.main===module){const html=build();fs.writeFileSync(path.join(__dirname,'crossweave-posture.html'),html);console.log(JSON.stringify({trial:'AM1',bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')}));}
module.exports={build};
