// A single public detail projection for bases, owned variants, offers and actual cards.
import C from '../content/m1.mjs';
import E from '../content/economy.mjs';
import {passiveLabels} from '../content/display.mjs';
import {blueprint,compileCard,passiveSpec} from './affixes.mjs';
import {copy} from './common.mjs';
const signed=n=>(n>0?'+':'')+n;
const labels={power:'主効果',hit:'探査',evasion:'攪乱',crit_gain:'一閃',field_power:'場の効果量',field_hit:'場の探査補正',life:'使用期限',cost:'設置・一致の行動間隔'};
function affixDetails(b){return b.affixes.map(id=>{
  const a=E.affixes[b.kind][id];let parts;
  if(b.kind==='card')parts=Object.entries(a.delta).map(([k,n])=>labels[k]+signed(n));
  else{
    parts=[];if(a.gate)parts.push(a.gate==='borrowed'?'他主体由来の札に限定':'B属性の札に限定');
    if(a.strength)parts.push('効果量'+signed(a.strength*E.affixes.passive_strength_units[b.base]));
    if(a.discount)parts.push('行動間隔'+signed(-a.discount));
  }
  return {id,label:a.label,description:parts.join('／')};
});}
export function cardDetail(c){
  const variant=typeof c.type==='string'&&c.type.startsWith('AO1:card:'),parts=variant?c.type.split(':'):null;
  const base=parts?.[2]||c.type,b=variant?blueprint('card',base,parts.slice(3)):null;
  return {name:c.name,base_name:C.cards[base]?.card.name||c.name,base_id:base,kind:'card',affixes:b?affixDetails(b):[],
    primary:{kind:c.kind,power:c.power,hit:c.hit,evasion:c.evasion,crit_gain:c.crit_gain,
      ...Object.fromEntries(['defense_uses','defense_grant'].filter(k=>Object.hasOwn(c,k)).map(k=>[k,copy(c[k])]))},
    field:{power:c.field_power,hit:c.field_hit},life:c.life,action_intervals:{place:c.place_cost,match:c.match_cost},
    recovery_rule:c.consume_on_recover?'consumed_on_recovery':c.doomed?'destroyed_on_recovery_retired_origin':c.birth==='filler'?'destroyed_on_recovery_filler':'shared_recovery',
    trigger_text:null,effect_text:null,equipment_cost:null,learning_cost_units:null};
}
export function passiveDetail(value){
  const b=typeof value==='string'?blueprint('passive',value):value,spec=passiveSpec(b),base=b.base;
  const triggers={PS01:'直前の本人行動が防御一致で、今回が設置',PS02:'直前の本人の一致と異なる属性で攻撃一致',PS03:'他主体由来の札で本人が一致し、その後に防御一致',PS04:'消耗する回復札で本人が回復一致'};
  const gateText=spec.gates.map(g=>g==='borrowed'?'今回の札が他主体由来':'今回の札がB属性');
  const effects={PS01:`行動間隔を${spec.value+spec.extra_discount}短縮（最小1）`,PS02:`探査を${spec.value}加算`,PS03:`今回の身構の基礎値を${spec.value}加算`,PS04:`回復量を${spec.value}加算（最大余力まで）`};
  const interval=base==='PS01'||!spec.extra_discount?'':`／行動間隔を${Math.abs(spec.extra_discount)}${spec.extra_discount>0?'短縮（最小1）':'延長'}`;
  return {name:b.affixes.map(id=>E.affixes.passive[id].label).concat(passiveLabels[base]).join('・'),base_name:passiveLabels[base],base_id:base,kind:'passive',affixes:affixDetails(b),
    primary:null,field:null,life:null,action_intervals:null,recovery_rule:null,trigger_text:[triggers[base],...gateText].join('／'),effect_text:effects[base]+interval,
    effect:{field:spec.field,value:spec.value,action_interval_discount:spec.extra_discount,gates:copy(spec.gates)},equipment_cost:spec.equipment_cost,learning_cost_units:C.rules.learning.cost_units[base]};
}
export const itemDetail=b=>b.kind==='card'?cardDetail(compileCard(b)):passiveDetail(b);
