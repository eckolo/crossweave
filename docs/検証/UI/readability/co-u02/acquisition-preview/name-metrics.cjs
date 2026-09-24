const fs=require('node:fs'),path=require('node:path');
async function nameMetrics(){
 const base=path.resolve(__dirname,'../../../../../..');
 const C=(await import(path.join(base,'src/content/m1.mjs'))).default;
 const {variants,compileCard}=await import(path.join(base,'src/runtime/affixes.mjs'));
 const {passiveDetail}=await import(path.join(base,'src/runtime/item-details.mjs'));
 const names=[];
 for(const [id,v] of Object.entries(C.cards))if(v.affix_allowlist)for(const b of variants('card',id))names.push({kind:'card',key:b.key,name:compileCard(b).name});
 for(const id of Object.keys(C.rules.learning.bases))for(const b of variants('passive',id))names.push({kind:'passive',key:b.key,name:passiveDetail(b).name});
 for(const n of names)n.length=[...n.name].length;
 const tile={width:128,height:112,border:2,name_font:12,name_line_height:14,name_lines:3,name_width:116,name_height:42,metadata_height:14,body_gap:2,body_vertical_padding:6,action_height:44};
 const capacity=Math.floor(tile.name_width/tile.name_font)*tile.name_lines;
 if(names.some(n=>n.length>capacity))throw Error('A catalogue name exceeds the common tile name budget');
 return {source_design:'7565afca98684186705a4e865d4fdf0e0ae489c1',scope:'共通m1の全札・心得と許可された修飾の組合せ。将来追加される名称の上限は未確定。',count:names.length,by_kind:['card','passive'].map(kind=>({kind,count:names.filter(n=>n.kind===kind).length,longest:names.filter(n=>n.kind===kind).sort((a,b)=>b.length-a.length)[0]})),max_length:Math.max(...names.map(n=>n.length)),longest:names.sort((a,b)=>b.length-a.length).slice(0,4),tile,full_width_character_budget:capacity,verification:'文字数とCSS寸法による保守的な設計計算。フォントの実描画・実測ではない。'};
}
if(require.main===module)nameMetrics().then(r=>{fs.writeFileSync(path.join(__dirname,'name-metrics.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({count:r.count,max_length:r.max_length,tile:r.tile}));}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={nameMetrics};
