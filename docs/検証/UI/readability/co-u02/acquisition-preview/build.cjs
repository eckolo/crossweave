const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function makeFixture(){
 const base=path.resolve(__dirname,'../../../../../..');
 const C=(await import(path.join(base,'src/content/m1.mjs'))).default;
 const {blueprint,compileCard}=await import(path.join(base,'src/runtime/affixes.mjs'));
 const {cardDetail,passiveDetail}=await import(path.join(base,'src/runtime/item-details.mjs'));
 const catalogue={};
 function item(kind,id,affixes=[]){
  const b=blueprint(kind,id,affixes),key=b.key;
  if(!catalogue[key]){
   const detail=kind==='card'?cardDetail(compileCard(b)):passiveDetail(b);
   // Presentation fixture only: never expose the old separate learning payment.
   const {learning_cost_units,...publicDetail}=detail;
   catalogue[key]={key,...publicDetail,...(kind==='card'?{attribute:compileCard(b).attr}:{})};
  }
  return key;
 }
 const units=[],deck=[],equipment=[];
 for(const id of C.initial.free_card_bases){
  const key=item('card',id);
  for(let i=0;i<2;i++){const uid='owned-'+id+'-'+i;units.push({uid,key});if(i<(C.initial.deck_counts[id]||0))deck.push(uid);}
 }
 for(const id of ['PS01','PS03','PS04']){const uid='owned-'+id;units.push({uid,key:item('passive',id)});equipment.push(uid);}
 const offers=[
  {id:'offer-link',key:item('passive','PS02'),price:4},
  {id:'offer-guard',key:item('passive','PS03',['swift']),price:4},
  {id:'offer-tide',key:item('card','nt_stop',['light']),price:4},
  {id:'offer-force',key:item('card','f',['heavy']),price:8}
 ];
 return {version:'two-stage-ui-2',source_design:'7565afca98684186705a4e865d4fdf0e0ae489c1',
  notes:'UI操作確認専用。開始残高6・候補価格4/8・所持の数量は固定入力。新しい経済・初期配布の採用値ではない。',
  rules:{deckSize:C.rules.deck.size,perKindCap:C.rules.deck.per_base_cap,equipmentLimit:C.rules.equipment.cost_limit,offerLimit:1},
  initial:{wallet:6,units,deck,equipment,purchased:[]},catalogue,offers};
}
async function build({write=false,testing=false,output='/workspace/crossweave-two-stage-layout.html'}={}){
 const fixture=await makeFixture();
 const app=read('app.js').replace('__LAYOUT__',()=>read('layout.js'))+(testing?'\nroot.__test={snapshot:()=>clone({current,draft,view}),fixture};':'');
 new Function('fixture',app);
 const html=read('preview.fragment.html').replace('__STYLE__',()=>read('structure.css')).replace('__FIXTURE__',()=>JSON.stringify(fixture).replace(/</g,'\\u003c')).replace('__APP__',()=>app.replace(/<\/script/gi,'<\\/script'));
 if(Buffer.byteLength(html)>=1000000||/<(?:html|head|body)\b|<!doctype/i.test(html)||/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html))throw Error('Invalid conversation fragment');
 if(write){
  fs.writeFileSync(output,html);
  fs.writeFileSync(path.join(__dirname,'fixture.json'),JSON.stringify(fixture,null,2)+'\n');
  fs.writeFileSync(path.join(__dirname,'inline-manifest.json'),JSON.stringify({version:fixture.version,path:output,bytes:Buffer.byteLength(html),sha256:hash(html),source_design:fixture.source_design,scope:'UI操作確認用。共通Campaign・本編保存・戦闘試用は未接続。',sources:['app.js','layout.js','structure.css','preview.fragment.html','build.cjs'].map(p=>({path:p,sha256:hash(read(p))}))},null,2)+'\n');
 }
 return {html,fixture};
}
if(require.main===module)build({write:true,output:process.argv[2]||'/workspace/crossweave-two-stage-layout.html'}).then(({html})=>console.log(JSON.stringify({bytes:Buffer.byteLength(html),sha256:hash(html)}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build};
