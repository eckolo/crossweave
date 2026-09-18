'use strict';
// Standalone entry only. Inline previews use the conversation's supplied Lucide.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const modules=process.argv[2]||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if(!modules)throw Error('Pass the installed node_modules directory containing lucide.');
const lucide=path.join(modules,'lucide'),version=JSON.parse(fs.readFileSync(path.join(lucide,'package.json'),'utf8')).version;
if(version!=='1.8.0')throw Error('Review an upstream version change before rebuilding.');
const names=['Activity','ArrowLeft','ArrowRight','ArrowUpRight','BookOpen','ChevronLeft','ChevronRight','Crosshair','Flag','Heart','HeartPlus','HeartPulse','History','Info','Layers','Lightbulb','ListOrdered','Menu','Pin','ScanSearch','Settings','Shield','ShieldMinus','SlidersHorizontal','Sparkles','Swords','VenetianMask','Wind','X','Zap'];
const factories=[],ids=new Map(),sources=[];
function visit(file){file=path.resolve(file);if(ids.has(file))return ids.get(file);const id=factories.length;ids.set(file,id);factories.push(null);
 let source=fs.readFileSync(file,'utf8');sources.push({path:path.relative(lucide,file),sha256:crypto.createHash('sha256').update(source).digest('hex')});
 if(file===path.join(lucide,'dist/esm/lucide.js'))source=source.replace(/^import \* as iconsAndAliases.+\n/m,'').replace(/^export .+ from .+;\n/gm,'').replace(/^export \{ iconsAndAliases as icons \};\n/m,'');
 source=source.replace(/^import (.+) from ['"](.+)['"];$/gm,(_,binding,relative)=>{const dependency=visit(path.resolve(path.dirname(file),relative));return 'const '+(binding.startsWith('{')?binding.replace(/\bas\b/g,':')+'=get('+dependency+')':binding+'=get('+dependency+').default')+';';});
 const exports=[];source=source.replace(/^export \{ (.+) \};$/gm,(_,list)=>{for(const part of list.split(',')){const [from,to]=part.trim().split(/\s+as\s+/);exports.push(JSON.stringify(to||from)+':'+from);}return '';}).replace(/^\/\/# sourceMappingURL=.+$/gm,'');
 if(/^\s*(?:import|export) /m.test(source))throw Error('Unsupported Lucide module syntax');factories[id]='function(get){'+source+'\nreturn {'+exports.join(',')+'};}';return id;
}
const main=visit(path.join(lucide,'dist/esm/lucide.js'));
const icons=names.map(name=>{const file=name.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());return JSON.stringify(name)+':get('+visit(path.join(lucide,'dist/esm/icons',file+'.js'))+').default';});
const output='/* Lucide '+version+'; ISC and Feather notices in lucide.LICENSE. Generated subset. */\n(()=>{const factories=['+factories.join(',\n')+'],cache=[];function get(id){return cache[id]||(cache[id]=factories[id](get));}const draw=get('+main+').createIcons,icons={'+icons.join(',')+'};globalThis.lucide??={createIcons(options={}){return draw({...options,icons});}};})();\n';
new Function(output);
fs.writeFileSync(path.join(__dirname,'lucide.js'),output);
fs.copyFileSync(path.join(lucide,'LICENSE'),path.join(__dirname,'lucide.LICENSE'));
fs.writeFileSync(path.join(__dirname,'lucide-source.json'),JSON.stringify({package:'lucide',version,icons:names,source:'Installed Lucide ES module exports; no authored icon paths',sha256:crypto.createHash('sha256').update(output).digest('hex'),modules:sources},null,2)+'\n');
console.log(JSON.stringify({version,icons:names.length,bytes:Buffer.byteLength(output)}));
