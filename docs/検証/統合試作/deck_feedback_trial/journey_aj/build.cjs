'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const root=__dirname,base=path.dirname(root),read=name=>fs.readFileSync(path.join(base,name),'utf8');
function build(){
  for(const [name,expected]of Object.entries(require('./provenance.json').engine_sources))assert.equal(crypto.createHash('sha256').update(read(name)).digest('hex'),expected,'Reference input changed: '+name);
  const seeds=JSON.parse(cp.execFileSync('python3',[path.join(base,'reward_build_inputs.py')],{maxBuffer:8e6})).slice(0,8);
  const modules=['engine.js','feedback.js','ecology.js','terrain.js','information.js','knowledge.js','expedition_loop.js','expedition_choices.js','reward_preparation.js','journey_aj/session.js'];
  const jsons=['input.json','loop_inputs.json','choice_inputs.json','reward_build_inputs.json'];
  const factories=modules.map(name=>JSON.stringify(name)+':function(module,exports,require){\n'+read(name)+'\n}');
  for(const name of jsons)factories.push(JSON.stringify(name)+':function(module){module.exports='+JSON.stringify(JSON.parse(read(name)))+';}');
  factories.push('"journey_aj/seeds.json":function(module){module.exports='+JSON.stringify(seeds)+';}');
  const loader=`const CWRequire=(()=>{const factories={${factories.join(',\n')}},cache={};function resolve(parent,child){const parts=(child.startsWith('.')?parent.split('/').slice(0,-1).join('/')+'/'+child:child).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');}function req(id){if(cache[id])return cache[id].exports;if(!factories[id])throw Error('Missing module '+id);const m={exports:{}};cache[id]=m;factories[id](m,m.exports,name=>req(resolve(id,name)));return m.exports;}return req;})();\n`;
  let script=loader+['support.js','journey.js','view.js'].map(n=>read('journey_aj/'+n)).join('\n');
  script=script.replace(/<\/script/gi,'<\\/script');
  const html=read('journey_aj/shell.html').replace('__AJ_BOARD__',()=>read('journey_aj/play.fragment.html')).replace('__AJ_SCRIPT__',()=>script);
  assert(!/__AJ_[A-Z]+__|__CW_[A-Z]+__/.test(html));
  return html;
}
if(require.main===module){const html=build(),out=process.argv[2]||path.join(root,'crossweave-journey.html');fs.writeFileSync(out,html);console.log(JSON.stringify({trial:'AJ1',bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')}));}
module.exports={build};
