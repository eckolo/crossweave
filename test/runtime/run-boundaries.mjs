import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {boundaries} from './boundaries.mjs';
import {passiveChecks} from './passives.mjs';
const [source,destination]=process.argv.slice(2);if(!source||!destination)throw Error('Provide fixed source and NEW output folders');
await mkdir(destination,{recursive:true});const saved={};
for(const name of ['entry','port','return','home','second-return'])saved[name]=JSON.parse(await readFile(`${source}/${name}.save.json`));
try {const {revisitEntry,...result}=await boundaries(saved);await writeFile(`${destination}/boundaries.json`,JSON.stringify(result,null,2)+'\n');
  await writeFile(`${destination}/revisit-entry.save.json`,JSON.stringify(revisitEntry,null,2)+'\n');const passives=passiveChecks(saved);await writeFile(`${destination}/passives.json`,JSON.stringify(passives,null,2)+'\n');console.log(JSON.stringify({boundaries:result,passives},null,2));}
catch(error){const result={ok:false,error:error.code||error.message,stack:error.stack};await writeFile(`${destination}/failure.json`,JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exitCode=1;}
