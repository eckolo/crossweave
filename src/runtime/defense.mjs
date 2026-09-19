// D56: saved effects are authoritative; totals and duration summaries are projections.
import {copy,check} from './common.mjs';
const count=n=>n===null||(Number.isSafeInteger(n)&&n>=1);
const key=e=>JSON.stringify([e.source_actor_id,e.effect_kind]);
const identifier=x=>typeof x==='string'&&x.length>0&&x.length<=1024;
export function validateEffect(e,actors) {
  check(e&&typeof e==='object'&&!Array.isArray(e)&&
    Object.keys(e).sort().join(',')==='effect_kind,evasion,guard,source_actor_id,uses'&&
    identifier(e.source_actor_id)&&Object.hasOwn(actors,e.source_actor_id)&&identifier(e.effect_kind)&&
    Number.isSafeInteger(e.guard)&&e.guard>=0&&Number.isSafeInteger(e.evasion)&&count(e.uses),'invalid_defense_effect');
}
export function validateDefense(a,actors) {
  check(!Object.hasOwn(a,'guard')&&Array.isArray(a.defense_effects),'invalid_defense_state');
  for(const e of a.defense_effects)validateEffect(e,actors);
  check(new Set(a.defense_effects.map(key)).size===a.defense_effects.length,'duplicate_defense_source');
  check(Number.isSafeInteger(a.defense_effects.reduce((n,e)=>n+e.guard,0))&&
    Number.isSafeInteger(a.defense_effects.reduce((n,e)=>n+e.evasion,0)),'invalid_defense_total');
}
export function grantDefense(state,recipient,effect) {
  const a=state.actors[recipient];check(a?.active&&state.actors[effect.source_actor_id]?.active,'inactive_defense_actor');
  validateEffect(effect,state.actors);
  const effects=a.defense_effects.filter(e=>key(e)!==key(effect)).concat(copy(effect));
  effects.sort((a,b)=>key(a).localeCompare(key(b)));
  validateDefense({...a,defense_effects:effects},state.actors);
  a.defense_effects=effects;
}
export function spendDefense(a) {
  a.defense_effects=a.defense_effects.filter(e=>e.uses===null||--e.uses>0);
}
function duration(effects) {
  const finite=effects.map(e=>e.uses).filter(n=>n!==null),unlimited=finite.length!==effects.length;
  const same=effects.length>0&&!unlimited&&finite.every(n=>n===finite[0]);
  return {effect_count:effects.length,finite_min:finite.length?Math.min(...finite):null,
    finite_max:finite.length?Math.max(...finite):null,unlimited,
    status:!effects.length?'empty':same?'uniform':unlimited&&!finite.length?'unlimited':'mixed',
    uniform_uses:!effects.length?0:same?finite[0]:null};
}
export function defenseView(a) {
  const effects=a.defense_effects;
  return {guard:effects.reduce((n,e)=>n+e.guard,0),evasion:effects.reduce((n,e)=>n+e.evasion,0),
    effects:copy(effects),duration:{all:duration(effects),guard:duration(effects.filter(e=>e.guard!==0)),
      evasion:duration(effects.filter(e=>e.evasion!==0))},clear_on:'owner_match'};
}
export function guardView(a) {
  if(!a.defense_effects.length)return null;
  const v=defenseView(a);return {value:v.guard,evasion:v.evasion,uses:v.duration.all.uniform_uses};
}
export function migrateLegacyDefense(state) {
  check(state&&state.actors&&!Object.hasOwn(state,'defense_rule'),'invalid_legacy_defense_state');
  for(const [id,a] of Object.entries(state.actors)) {
    check(!Object.hasOwn(a,'defense_effects')&&Object.hasOwn(a,'guard'),'invalid_legacy_defense_state');
    const g=a.guard;
    check(g===null||(g&&typeof g==='object'&&Object.keys(g).sort().join(',')==='evasion,uses,value'&&
      Number.isSafeInteger(g.value)&&g.value>=0&&Number.isSafeInteger(g.evasion)&&[1,2].includes(g.uses)),'invalid_legacy_guard');
    a.defense_effects=g===null?[]:[{source_actor_id:id,effect_kind:'self_guard',guard:g.value,evasion:g.evasion,uses:g.uses}];
    delete a.guard;
  }
  state.defense_rule='D56';
}
