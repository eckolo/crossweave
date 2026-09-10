'use strict';
const AP = require('../../修飾/ap/conversion.cjs');
const {AO, copy} = AP, cfg = require('./conditions.json');
const check = (value, message) => { if (!value) throw Error(message); };
const has = (object, key) => Object.hasOwn(object, key);

function cost(blueprint) {
  AO.validate(blueprint); check(blueprint.kind === 'passive', 'Not a passive');
  const value = cfg.base_equipment_cost[blueprint.base] + blueprint.affixes.reduce((n, id) => n + cfg.affix_equipment_surcharge[id], 0);
  check(Number.isSafeInteger(value) && value >= 1, 'Nonpositive or invalid equipment cost');
  return value;
}
function initial(points = 0, policy = cfg.primary_policy) {
  check(has(cfg.policies, policy), 'Unknown equipment policy');
  return {...AP.initial(points), aq: {version: 'AQ1', policy, equipped: []}};
}
function resolve(state, id) {
  check(typeof id === 'string', 'Invalid equipment identity');
  let blueprint, uid = null;
  if (id.startsWith('base:')) blueprint = AO.blueprint('passive', id.slice(5));
  else {
    check(id.startsWith('owned:'), 'Invalid equipment identity'); uid = id.slice(6);
    check(has(state.inventory, uid), 'Unowned equipment'); blueprint = state.inventory[uid].blueprint;
  }
  check(blueprint.kind === 'passive' && has(state.profile.learned, blueprint.base), 'Unlearned or nonpassive equipment');
  return {id, uid, blueprint: copy(blueprint), base: blueprint.base, cost: cost(blueprint), role: cfg.roles[blueprint.base]};
}
function candidates(state) {
  const ids = Object.keys(state.profile.learned).sort().map(base => 'base:' + base);
  for (const item of Object.values(state.inventory)) {
    if (item.blueprint.kind === 'passive' && has(state.profile.learned, item.blueprint.base)) ids.push('owned:' + item.uid);
  }
  return ids.map(id => resolve(state, id));
}
function assess(entries, policy = cfg.policies[cfg.primary_policy]) {
  check(new Set(entries.map(x => x.id)).size === entries.length, 'Same copy equipped twice');
  const bases = {}, roles = {}, reasons = [];
  let total = 0;
  for (const item of entries) {
    check(item.cost === cost(item.blueprint), 'Stale equipment cost');
    check(item.base === item.blueprint.base && item.role === cfg.roles[item.base], 'Stale equipment metadata');
    bases[item.base] = (bases[item.base] || 0) + 1; roles[item.role] = (roles[item.role] || 0) + 1; total += item.cost;
  }
  const surcharge = (policy.duplicate_surcharge || 0) * Object.values(bases).reduce((n, count) => n + count * (count - 1) / 2, 0);
  total += surcharge;
  if (policy.cost_limit != null && total > policy.cost_limit) reasons.push('cost');
  if (policy.slot_limit != null && entries.length > policy.slot_limit) reasons.push('slots');
  if (policy.per_base_limit != null && Object.values(bases).some(n => n > policy.per_base_limit)) reasons.push('same_kind');
  if (policy.role_limits && Object.entries(roles).some(([role, n]) => n > (policy.role_limits[role] || 0))) reasons.push('roles');
  return {fits: reasons.length === 0, reasons, count: entries.length, cost: total, surcharge, bases, roles};
}
function equip(state, ids) {
  check(state.profile.phase === 'home' && state.aq?.version === 'AQ1', 'Equipment requires home');
  check(Array.isArray(ids), 'Invalid equipment list');
  const entries = ids.map(id => resolve(state, id));
  check(assess(entries, cfg.policies[state.aq.policy]).fits, 'Equipment limit exceeded');
  const out = copy(state); out.aq.equipped = [...ids].sort();
  for (const key of Object.keys(out.references)) if (key.startsWith('aq-passive:') || key.startsWith('passive:')) delete out.references[key];
  entries.filter(x => x.uid !== null).forEach((item, i) => { out.references['aq-passive:' + i] = item.uid; });
  return out;
}
function learn(state, bases) {
  check(state.aq?.version === 'AQ1', 'Wrong equipment version');
  const old = state.aq.equipped.map(id => resolve(state, id));
  const out = AP.learn(state, bases);
  return equip(out, old.filter(item => has(out.profile.learned, item.base)).map(item => item.id));
}
function launch(state, bundle) {
  check(state.profile.phase === 'home', 'Departure requires home');
  const entries = state.aq.equipped.map(id => resolve(state, id));
  const policy = cfg.policies[state.aq.policy]; check(assess(entries, policy).fits, 'Equipment limit exceeded');
  const out = copy(bundle);
  out.initial.state.aq = {version: 'AQ1', entries, policy: copy(policy)};
  out.initial.state.ah.learned = [...new Set(entries.map(item => item.base))].sort();
  out.initial.state.ah.pending = {after_guard: false, last_match_attr: null, borrowed_guard: false};
  out.initial.state.ao = {selected: {}};
  out.ao = out.ao || {cards: {}};
  return new Game(out);
}
class Game extends AO.Game {
  effect(w, card) {
    if (w !== 'P') return super.effect(w, card);
    const equipment = this.s.aq;
    check(equipment?.version === 'AQ1' && assess(equipment.entries, equipment.policy).fits, 'Invalid run equipment');
    const equippedBases = this.s.ah.learned;
    const out = {ids: [], hit: 0, power: 0, discount: 0, affixes: [], instances: []};
    try {
      for (const item of equipment.entries) {
        this.s.ah.learned = [item.base];
        const base = AO.runtime.AI.Game.prototype.effect.call(this, w, card);
        const part = AO.adjustedEffect(base, item.blueprint, card, w);
        for (const key of ['hit', 'power', 'discount']) out[key] += part[key];
        if (part.ids.length) {
          out.ids.push(item.base); out.instances.push(item.id);
          out.affixes.push({base: item.base, ids: [...item.blueprint.affixes], instance: item.id});
        }
      }
    } finally { this.s.ah.learned = equippedBases; }
    return out;
  }
  predict(choice, who = 'P') {
    const out = super.predict(choice, who);
    out.passive_instances = this.effect(who, this.s.cards[choice.card_id]).instances || [];
    return out;
  }
}
module.exports = {AP, AO, cfg, copy, cost, initial, resolve, candidates, assess, equip, learn, launch, Game};
