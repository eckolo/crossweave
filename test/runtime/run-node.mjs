import {writeFile,mkdir} from 'node:fs/promises';
import {smoke} from './smoke.mjs';
import {boundaries} from './boundaries.mjs';
const directory=process.argv[2];if(!directory)throw Error('Provide an output folder; existing frozen results must not be overwritten.');
await mkdir(directory,{recursive:true});const saved={};
try {
  const natural=await smoke({onCheckpoint:async(name,doc)=>{saved[name]=doc;await writeFile(`${directory}/${name}.save.json`,JSON.stringify(doc,null,2)+'\n');}});
  await writeFile(`${directory}/natural.json`,JSON.stringify({ok:true,results:natural.results},null,2)+'\n');
  const result=await boundaries(saved);const {revisitEntry,...publicResult}=result;
  await writeFile(`${directory}/boundaries.json`,JSON.stringify(publicResult,null,2)+'\n');
  if(revisitEntry)await writeFile(`${directory}/revisit-entry.save.json`,JSON.stringify(revisitEntry,null,2)+'\n');
  console.log(JSON.stringify({ok:true,natural:natural.results,checks:publicResult.checks},null,2));
}catch(error){const result={ok:false,error:error.code||error.message,stack:error.stack};await writeFile(`${directory}/failure.json`,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exitCode=1;}
