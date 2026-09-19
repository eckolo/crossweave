// Public ability snapshots only. The resolver, never this projection, changes abilities.
export const publicContract = 'CW-M1-public-0.3';
export function abilityValues(game, id) {
  const a=game.s.actors[id],g=game.guard(id);
  return {hp:a.hp,max_hp:a.max_hp,hit:a.hit,posture_remaining:a.max_posture-a.hit,max_posture:a.max_posture,
    crit:a.crit,critical_multiplier:1+Math.floor(a.crit/100),guard:g?.value??0,guard_uses:g?g.uses:0,
    guard_evasion:g?.evasion??0,evasion:game.evasion(id),reduction:game.passive(id,'damage_reduction')};
}
export function persistentSources(game, id) {
  return Object.entries(game.s.actors).filter(([,a])=>a.active).flatMap(([source,a])=>a.passives
    .filter(p=>p.target===id&&['evasion','damage_reduction'].includes(p.kind))
    .map(p=>({source_actor_id:source,kind:p.kind,value:p.value})));
}
export function abilityChanges(before, after) {
  const ids=Object.keys(before.s.actors);
  return Object.fromEntries(ids.map(id=>{
    const a=before.s.actors[id],b=after.s.actors[id],sourcesBefore=persistentSources(before,id),sourcesAfter=persistentSources(after,id);
    // A new, not-yet-public source must not turn a private transition into a forecast.
    if(!b||sourcesAfter.concat(after.defense(id).effects).some(p=>!ids.includes(p.source_actor_id)))return [id,{status:'unknown',reason:'unpublished_source',values:null,
      active:null,stance:null,persistent_sources:null,defense:null}];
    const bv=abilityValues(before,id),av=abilityValues(after,id);
    const values=Object.fromEntries(Object.keys(bv).map(key=>[key,Number.isFinite(bv[key])&&Number.isFinite(av[key])
      ?{status:'known',before:bv[key],after:av[key],delta:av[key]-bv[key]}
      :{status:'unsupported',before:null,after:null,delta:null}]));
    return [id,{status:'known',values,active:{before:a.active,after:b.active},
      stance:{before:before.guard(id),after:after.guard(id)},defense:{before:before.defense(id),after:after.defense(id)},persistent_sources:{before:sourcesBefore,after:sourcesAfter}}];
  }));
}
