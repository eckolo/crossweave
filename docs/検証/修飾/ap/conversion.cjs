'use strict';
const AO = require('../ao/affixes.cjs');
const cfg = require('./conditions.json');
const copy = AO.copy;
const has = (object, key) => Object.hasOwn(object, key);
const check = (value, message) => { if (!value) throw Error(message); };
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id);
const uidFor = (run, reward) => JSON.stringify(['AP1', run, reward]);
const initialCards = AO.runtime.AH.initialProfile().unlocked;

function initial(points = 0) {
  return {version: 'AP1', profile: AO.runtime.AH.initialProfile(points), remainder: 0,
    runs: {}, inventory: {}, known: {}, references: {}, sales: {}};
}
function home(state) { check(state.version === 'AP1' && state.profile.phase === 'home', 'Requires home'); }
function start(state, id) {
  home(state); check(validId(id) && !has(state.runs, id), 'Duplicate or invalid run');
  const out = copy(state);
  out.runs[id] = {grants: {}, receipt: null}; out.profile.phase = 'exploring'; out.profile.run = id;
  return out;
}
function award(state, id, blueprint, band = 'ordinary') {
  check(state.profile.phase === 'exploring' && validId(id), 'Requires active run and reward id');
  AO.validate(blueprint); check(has(cfg.value_bands, band), 'Unknown value band');
  const run = state.profile.run, grants = state.runs[run].grants;
  const signature = JSON.stringify({blueprint, band});
  if (has(grants, id)) {
    check(grants[id].signature === signature, 'Conflicting reward'); return copy(state);
  }
  const out = copy(state);
  out.runs[run].grants[id] = {signature, blueprint: copy(blueprint), band, protected: false};
  out.known[blueprint.key] = copy(blueprint);
  return out;
}
function protect(state) {
  check(state.profile.phase === 'exploring', 'Requires active run');
  const out = copy(state);
  for (const item of Object.values(out.runs[out.profile.run].grants)) item.protected = true;
  return out;
}
function finish(state, run, outcome) {
  check(has(state.runs, run) && ['clear', 'withdrawal', 'defeat'].includes(outcome), 'Invalid settlement');
  const previous = state.runs[run].receipt;
  if (previous) {
    check(previous.outcome === outcome, 'Conflicting settlement'); return copy(state);
  }
  check(state.profile.phase === 'exploring' && state.profile.run === run, 'Wrong active run');
  const out = copy(state), receipt = {outcome, kept: [], lost: []};
  for (const [id, item] of Object.entries(out.runs[run].grants)) {
    const uid = uidFor(run, id);
    if (outcome === 'clear' || outcome === 'withdrawal' && item.protected) {
      check(!has(out.inventory, uid), 'Duplicate possession identity');
      out.inventory[uid] = {uid, blueprint: copy(item.blueprint), band: item.band, locked: false};
      receipt.kept.push(uid);
    } else receipt.lost.push(uid);
  }
  out.runs[run].receipt = receipt; out.profile.phase = 'home'; out.profile.run = null;
  return out;
}
function groups(state) {
  const out = {};
  for (const item of Object.values(state.inventory)) {
    const key = item.blueprint.key;
    if (!has(out, key)) out[key] = {blueprint: copy(item.blueprint), uids: [], quantity: 0};
    out[key].uids.push(item.uid); out[key].quantity++;
  }
  return out;
}
function available(state, blueprint) {
  AO.validate(blueprint);
  if (blueprint.affixes.length === 0 && (blueprint.kind === 'card'
    ? initialCards.includes(blueprint.base) : has(state.profile.learned, blueprint.base))) return true;
  return Object.values(state.inventory).some(item => item.blueprint.key === blueprint.key);
}
function learn(state, skills) {
  home(state);
  const out = copy(state); out.profile = AO.runtime.AH.reallocate(state.profile, skills);
  for (const slot of Object.keys(out.references)) {
    if (slot.startsWith('passive:') && !skills.includes(slot.slice(8))) delete out.references[slot];
  }
  return out;
}
// A narrow preparation-reference adapter. It does not choose the final simultaneous passive limit.
function assign(state, slot, uid) {
  home(state);
  check(/^passive:PS\d+$/.test(slot) || /^card:\d+$/.test(slot), 'Invalid preparation slot');
  const out = copy(state);
  if (uid === null) { delete out.references[slot]; return out; }
  const item = state.inventory[uid]; check(item, 'Missing possession');
  if (slot.startsWith('passive:')) {
    const base = slot.slice(8);
    check(item.blueprint.kind === 'passive' && item.blueprint.base === base && has(state.profile.learned, base), 'Wrong or unlearned passive');
  } else check(item.blueprint.kind === 'card', 'Not a card');
  out.references[slot] = uid; return out;
}
function lock(state, uid, locked) {
  home(state); check(has(state.inventory, uid) && typeof locked === 'boolean', 'Invalid protection edit');
  const out = copy(state); out.inventory[uid].locked = locked; return out;
}
function materialize(state, uid, instanceId) {
  check(has(state.inventory, uid) && validId(instanceId), 'Missing acquired card or invalid instance');
  const item = state.inventory[uid]; check(item.blueprint.kind === 'card', 'Not a card');
  return {...AO.compileCard(item.blueprint), id: instanceId, origin: 'P', birth: 'initial', remaining: null, doomed: false, destroyed: false};
}
function unitsFor(band, rate = cfg.primary_rate) {
  check(has(cfg.value_bands, band) && has(cfg.rates, rate), 'Unknown value or rate');
  const [n, d] = cfg.rates[rate];
  check(Number.isSafeInteger(n) && Number.isSafeInteger(d) && n > 0 && n < d, 'Invalid rate');
  return Math.floor(cfg.value_bands[band] * n / d);
}
function quote(state, ids, rate = cfg.primary_rate) {
  home(state);
  check(Array.isArray(ids) && ids.length > 0 && new Set(ids).size === ids.length, 'Duplicate or empty sale');
  const references = new Set(Object.values(state.references));
  let units = 0;
  for (const uid of ids) {
    check(has(state.inventory, uid), 'Missing saleable possession');
    const item = state.inventory[uid];
    check(!item.locked && !references.has(uid), 'Possession is protected or in preparation');
    units += unitsFor(item.band, rate);
  }
  check(Number.isSafeInteger(units), 'Invalid conversion total');
  return {ids: [...ids].sort(), rate, units, point_gain: Math.floor((state.remainder + units) / cfg.units_per_point),
    remainder_after: (state.remainder + units) % cfg.units_per_point};
}
function sell(state, operation, ids, rate = cfg.primary_rate) {
  check(validId(operation) && Array.isArray(ids), 'Invalid sale operation');
  const signature = JSON.stringify({ids: [...ids].sort(), rate});
  if (has(state.sales, operation)) {
    check(state.sales[operation].signature === signature, 'Conflicting sale'); return copy(state);
  }
  const q = quote(state, ids, rate), out = copy(state);
  for (const uid of q.ids) delete out.inventory[uid];
  out.profile.points += q.point_gain; out.remainder = q.remainder_after;
  out.sales[operation] = {signature, ...q}; return out;
}
module.exports = {AO, cfg, copy, initial, start, award, protect, finish, groups, available,
  learn, assign, lock, materialize, unitsFor, quote, sell, uidFor};
