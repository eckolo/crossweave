// AO composition and AQ costs, bound to the unchanged CO-01A economy input.
import C from '../content/m1.mjs';
import E from '../content/economy.mjs';
import {copy,check,canonical,unique} from './common.mjs';
import {contentFor} from './content.mjs';
const A=E.affixes;
export function blueprint(kind,base,affixes=[],contentSet=C.content_set_id){
  const content=contentFor(contentSet),table=A[kind];
  check(['card','passive'].includes(kind)&&table,'invalid_blueprint_kind');
  check(kind==='card'?!!content.cards[base]?.affix_allowlist:Object.hasOwn(content.rules.learning.bases,base),'unknown_blueprint_base');
  check(unique(affixes)&&affixes.length<=A.max_count,'invalid_affix_count');
  const ids=[...affixes].sort(),families=new Set();
  for(const id of ids){
    const a=table[id];check(a,'unknown_affix');
    check(kind==='card'?content.cards[base].affix_allowlist.includes(id):a.bases.includes(base)&&!A.passive_exclusions[base]?.includes(id),'incompatible_affix');
    check(!families.has(a.family),'incompatible_affix_family');families.add(a.family);
  }
  const b={version:'AO1',kind,base,affixes:ids,key:['AO1',kind,base,...ids].join(':')};
  if(kind==='card'){const c=compileCard(b,contentSet,false);check(c.life>=1&&c.power>=0,'invalid_composed_card');}
  return b;
}
export function validateBlueprint(b,contentSet=C.content_set_id){
  check(b&&canonical(b)===canonical(blueprint(b.kind,b.base,b.affixes,contentSet)),'invalid_blueprint');return b;
}
export function compileCard(b,contentSet=C.content_set_id,validateFirst=true){
  if(validateFirst)validateBlueprint(b,contentSet);check(b.kind==='card','not_card');
  const original=contentFor(contentSet).cards[b.base].card;
  const c={...copy(original),base_type:b.base,type:b.key,variant_key:b.key,affixes:[...b.affixes],cost_delta:0};
  for(const id of b.affixes)for(const [key,n] of Object.entries(A.card[id].delta)){
    if(key==='cost')c.cost_delta+=n;else c[key]=(c[key]||0)+n;
  }
  c.place_cost+=c.cost_delta;c.match_cost+=c.cost_delta; // Compiled once; Game.cost must not add this again.
  c.name=b.affixes.map(id=>A.card[id].label).concat(original.name).join('・');return c;
}
export function variantSpec(type,contentSet=C.content_set_id){
  if(typeof type!=='string'||!type.startsWith('AO1:card:'))return null;
  const [version,kind,base,...ids]=type.split(':');
  const b=blueprint(kind,base,ids,contentSet);check(b.key===type,'noncanonical_variant_key');return compileCard(b,contentSet);
}
export function variants(kind,base,contentSet=C.content_set_id){
  const ids=Object.keys(A[kind]),out=[];
  for(let mask=0;mask<2**ids.length;mask++){
    const affixes=ids.filter((_,i)=>mask&(1<<i));if(affixes.length>A.max_count)continue;
    try{out.push(blueprint(kind,base,affixes,contentSet));}
    catch(e){if(!['incompatible_affix','incompatible_affix_family','invalid_composed_card'].includes(e.code))throw e;}
  }
  return out;
}
export function equipmentCost(b){
  validateBlueprint(b);check(b.kind==='passive','not_passive');
  return C.rules.equipment.base_cost[b.base]+b.affixes.reduce((n,id)=>n+C.rules.equipment.affix_surcharge[id],0);
}
export function passiveSpec(b){
  validateBlueprint(b);check(b.kind==='passive','not_passive');
  const base=C.rules.learning.bases[b.base],a=b.affixes.map(id=>A.passive[id]);
  const field=b.base==='PS01'?'discount':b.base==='PS02'?'hit':'power';
  const value=b.base==='PS01'?base.placement_discount:b.base==='PS02'?base.hit_bonus:b.base==='PS03'?base.guard_bonus:base.heal_bonus;
  return {field,value:value+a.reduce((n,x)=>n+(x.strength||0),0)*A.passive_strength_units[b.base],
    extra_discount:a.reduce((n,x)=>n+(x.discount||0),0),gates:a.filter(x=>x.gate).map(x=>x.gate),equipment_cost:equipmentCost(b)};
}
export function adjustedEffect(baseEffect,b,card,user){
  if(!baseEffect.ids.length)return baseEffect;
  const spec=passiveSpec(b);
  if(spec.gates.some(g=>g==='borrowed'&&card.origin===user||g==='attribute_B'&&card.attr!=='B'))return {ids:[],hit:0,power:0,discount:0};
  const out=copy(baseEffect);out[spec.field]=spec.value;out.discount+=spec.extra_discount;return out;
}
