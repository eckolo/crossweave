import {smoke} from './smoke.mjs';
try {const r=await smoke();console.log(JSON.stringify({ok:true,results:r.results},null,2));}
catch(error){console.error(JSON.stringify({ok:false,message:error.message,stack:error.stack}));process.exitCode=1;}
