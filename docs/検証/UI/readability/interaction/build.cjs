const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=__dirname,fixed=path.resolve(root,'../../../試遊/terrain-build-z/fixed');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const expected={
  'engine.js':'63615a41c1b57e8be3caa5a52809671cb3b81c06367a036bc265f967d9ec0f8b',
  'feedback.js':'de8e2e5883d3db8249aa27dab0c09ad74b8f7bc0a11bdbdc15d292b7c87a1072',
  'ecology.js':'8e2a905182f43003ba1b1176de722d3f7612ae15738e7f1915f6d869fd7cf825',
  'terrain.js':'2169144909551407b9115040882dd78c9a4f20fd9bf1c9ea8be1c58c7fd116fc',
  'input.json':'b8373c7c19c3b1a50fd9cdfd28fb0a5dfe4d368dbe1c9afb0a25b07bf2561981'
};
function readFixed(name){const s=fs.readFileSync(path.join(fixed,name),'utf8');assert.equal(sha(s),expected[name],`固定版が異なる: ${name}`);return s;}
function build(replay={build:'guard5',choices:[]}){
  let view=fs.readFileSync(path.join(root,'support.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'view.js'),'utf8');
  view=view.replace('__CW_DATA__',()=>JSON.stringify(JSON.parse(readFixed('input.json'))).replace(/</g,'\\u003c'));
  view=view.replace('__CW_REPLAY__',()=>JSON.stringify(replay).replace(/</g,'\\u003c'));
  let fragment=fs.readFileSync(path.join(root,'play.fragment.html'),'utf8');
  const replacements={__CW_ENGINE__:readFixed('engine.js'),__CW_FEEDBACK__:readFixed('feedback.js'),__CW_ECOLOGY__:readFixed('ecology.js'),__CW_TERRAIN__:readFixed('terrain.js'),__CW_VIEW__:view};
  for(const [token,value]of Object.entries(replacements)){assert.equal(fragment.split(token).length,2,token);fragment=fragment.replace(token,()=>value);}
  assert(!/__CW_[A-Z]+__/.test(fragment));assert(!/<html|<!doctype/i.test(fragment));assert(Buffer.byteLength(fragment)<1000000);
  return fragment;
}
if(require.main===module){
  const args=process.argv.slice(2),standalone=args.includes('--standalone'),pos=args.filter(x=>x!=='--standalone');
  const out=pos[0]||'/workspace/crossweave-placement.html';
  const fixture=pos[1],replay=fixture?JSON.parse(fs.readFileSync(path.join(root,'../fixtures.json'),'utf8')).cases[fixture]:undefined;
  if(fixture)assert(replay,`不明な局面: ${fixture}`);
  let s=build(replay);
  if(standalone)s='<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>crossweave · UI-R-002</title><style>:root{color-scheme:light dark}body{margin:0 auto;padding:16px;max-width:1056px;font-family:system-ui,sans-serif}</style></head><body>\n'+s+'\n</body></html>\n';
  fs.writeFileSync(out,s);console.log(JSON.stringify({test_id:'UI-R-002',path:out,case:fixture||'start',standalone,bytes:Buffer.byteLength(s),sha256:sha(s)}));
}
module.exports={build,expected,sha};
