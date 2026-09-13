'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=cp.execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const base='9d5d2638a3209d03371d82cc4c3006b70a0005b7';
const read=(p)=>cp.execFileSync('git',['show',base+':'+p],{cwd:root,encoding:'utf8'});
const existingPath='docs/検証/接続条件/co-d01/existing-api-examples.json', proposedPath='docs/検証/接続条件/co-d01/proposed-api-examples.json';
const existing=JSON.parse(read(existingPath)).display_data, proposed=JSON.parse(read(proposedPath));
// Only display_data crosses the existing-data boundary. These are declared UI mock
// labels, NOT a runtime fallback that derives Japanese names/performance from keys.
const labels={
 f:['返り音の笛','music-2','card'],fast:['早駆け','wind','card'],g:['防御','shield','card'],h:['沈み石の槌','hammer','card'],j:['小突き','move-up-right','card'],l:['先渡りの靴','footprints','card'],r:['手当て','heart','card'],read:['見切り','eye','card'],salve:['軟膏','flask-conical','card'],sweep:['薙ぎ払い','swords','card'],stored:['溜め打ち','hourglass','card'],brace:['踏ん張り','shield-check','card'],
 PS01:['守りからの設置','layers','passive'],PS02:['属性連携','link','passive'],PS03:['借り札の守り','shield-plus','passive'],PS04:['回復の工夫','heart-handshake','passive'],nt_stop:['汐留め','anchor','card']};
const effects={PS01:'防御一致の後、次の設置間隔 −2',PS02:'前の攻撃一致と異なる属性 → 探査 +20',PS03:'借りた防御札の一致後 → 次の防御一致の身構 +2',PS04:'消耗回復札の一致 → 回復 +4'};
const affixes={light:['軽い','主効果 −1・行動間隔 −1'],precise:['精密な','探査 +20・突破 −1'],sturdy:['堅い','身構 +2・攪乱 −10'],borrowed:['借り技の','借り札で発動'],swift:['速効の','効果を抑え、行動間隔を短縮'],forceful:['強引な','効果を高め、行動間隔を延長']};
const costs={PS01:2,PS02:3,PS03:2,PS04:2};
const detail=(bp)=>{const l=labels[bp.base];if(!l)throw Error('undeclared mock label '+bp.base);return {name:(bp.affixes||[]).map(a=>affixes[a][0]).join('')+l[0],base_name:l[0],base_id:bp.base,kind:l[2],icon:l[1],affixes:(bp.affixes||[]).map(id=>({id,label:affixes[id][0],description:affixes[id][1]})),primary:null,field:null,life:null,action_intervals:null,recovery_rule:null,trigger_text:null,effect_text:bp.affixes?.length?null:(effects[bp.base]||null),equipment_cost:l[2]==='passive'?costs[bp.base]+(bp.affixes?.includes('forceful')?1:0):null,learning_cost_units:l[2]==='passive'?200:null};};
const homes={bc:existing.current_home,empty:existing.empty_initial,purchased:existing.after_lower_level_application};
const details={};for(const [key,h] of Object.entries(homes)){
 details[key]={};for(const o of [...h.deck.composition,...h.owned,...h.candidates,...h.equipment.entries])details[key][o.id]=detail(o.blueprint);
 for(const id of h.free_card_options)if(!details[key][id])details[key][id]=detail({base:id.slice(5),affixes:[]});
 for(const o of h.learning_options)details[key]['base:'+o.base]=detail({base:o.base,affixes:[]});
}
const result={id:'UI-G-001',version:'0.1',execution:'UI mock responses only',source:{design:base,existing_path:existingPath,proposed_path:proposedPath},homes,details,return_receipt:existing.return_receipt,reference_comparison:existing.preparation_comparison,reference_boundaries:existing.boundaries,reference_conversion:existing.conversion,proposed_return:proposed.flows.find(f=>f.id==='return_resume_departure').steps[0].expected_display_subset,reference_plan:proposed.flows[0].steps.find(s=>s.id==='compare').call.args.plan,mock_only:{units_per_point:100,equipment_costs:costs,ordinary_conversion_units:50,special_conversion_units:100,capacity_case:'all four bases learned, 300 unspent; UI boundary injection, not earned play',display_labels:'explicit UI label fixtures; missing primary/field/intervals remain null',nt_detail:detail({base:'nt_stop',affixes:[]})}};
const json=JSON.stringify(result,null,2)+'\n',out=path.join(__dirname,'fixtures.json');
if(process.argv.includes('--check')){if(fs.readFileSync(out,'utf8')!==json)throw Error('fixture drift');}else fs.writeFileSync(out,json);
console.log(JSON.stringify({file:out,sha256:crypto.createHash('sha256').update(json).digest('hex')}));
