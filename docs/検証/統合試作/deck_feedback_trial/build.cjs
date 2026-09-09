const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const json=name=>JSON.stringify(JSON.parse(read(name))).replace(/</g,'\\u003c');
const recovery=JSON.parse(read('recovery_checkpoint.json'));
// The UI replays the saved public choices from the entrance. No HP injection.
delete recovery.checkpoint;
let fragment=read('play.fragment.html');
for(const [token,value] of Object.entries({__CW_ENGINE__:read('engine.js'),__CW_FEEDBACK__:read('feedback.js'),__CW_DATA__:json('input.json'),__CW_RECOVERY__:JSON.stringify(recovery).replace(/</g,'\\u003c')})){
  assert.equal(fragment.split(token).length,2,token);fragment=fragment.replace(token,()=>value);
}
assert(!/__CW_[A-Z]+__/.test(fragment));assert(!/<html|<!doctype/i.test(fragment));
assert(Buffer.byteLength(fragment)<1000000);
const out=process.argv[2]||'/workspace/crossweave-deck-hunt.html';
fs.writeFileSync(out,fragment);
console.log(JSON.stringify({path:out,bytes:Buffer.byteLength(fragment),sha256:crypto.createHash('sha256').update(fragment).digest('hex')}));
