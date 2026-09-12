'use strict';
const M = require('../../資源用途/at/offers.cjs');
const {C, AR, Q, AP, AO, AH, copy} = M;
const cfg = require('./conditions.json');
const check = (v, m) => { if (!v) throw Error(m); };
const free = new Set(AH.initialProfile().unlocked);

function resolve(state, id) {
  check(typeof id === 'string', 'Invalid card selection');
  if (id.startsWith('base:')) {
    const base = id.slice(5); check(free.has(base), 'Not an initial free card');
    return {id, uid: null, blueprint: AO.blueprint('card', base)};
  }
  check(id.startsWith('owned:'), 'Unknown card identity');
  const uid = id.slice(6), item = state.inventory[uid];
  check(item?.blueprint.kind === 'card', 'Missing owned card');
  return {id, uid, blueprint: copy(AO.validate(item.blueprint))};
}
function canonical(state, ids) {
  check(Array.isArray(ids), 'Invalid deck list');
  const entries = ids.map(id => resolve(state, id));
  const uids = entries.filter(e => e.uid !== null).map(e => e.uid);
  check(new Set(uids).size === uids.length, 'Same owned card selected twice');
  AO.validateStartingDeck(entries.map(e => ({blueprint: e.blueprint, count: 1})), cfg.deck.size, cfg.deck.per_base_cap);
  return entries.sort((a, b) => a.blueprint.base.localeCompare(b.blueprint.base) || a.blueprint.key.localeCompare(b.blueprint.key) || a.id.localeCompare(b.id));
}
function initialDeck() {
  const counts = AH.countsFor(AO.source, cfg.deck.initial_build);
  return Object.keys(counts).sort().flatMap(base => Array(counts[base]).fill('base:' + base));
}
function assess(state, ids) {
  const entries = canonical(state, ids), counts = {};
  entries.forEach(e => { counts[e.blueprint.base] = (counts[e.blueprint.base] || 0) + 1; });
  return {entries, counts};
}
function chooseDeck(state, route, policy) {
  check(['initial', 'use_owned'].includes(policy), 'Unknown deck policy');
  let ids = initialDeck();
  if (policy === 'initial') return ids;
  check(cfg.deck.swaps[route], 'Unknown route');
  const items = Object.values(state.inventory).filter(x => x.blueprint.kind === 'card').sort((a, b) =>
    a.blueprint.affixes.length - b.blueprint.affixes.length || a.blueprint.key.localeCompare(b.blueprint.key) || a.uid.localeCompare(b.uid));
  const replace = (from, predicate) => {
    const at = ids.indexOf('base:' + from), item = items.find(x => predicate(x) && !ids.includes('owned:' + x.uid));
    if (at >= 0 && item) ids[at] = 'owned:' + item.uid;
  };
  for (const [from, to] of cfg.deck.swaps[route]) replace(from, x => x.blueprint.base === to);
  for (const base of [...free].sort()) replace(base, x => x.blueprint.base === base && x.blueprint.affixes.length > 0);
  return canonical(state, ids).map(e => e.id);
}
function validateSaved(saved) {
  check(saved.au?.version === 'AU1', 'Wrong deck save version');
  const selected = assess(saved.economy, saved.au.deck);
  check(JSON.stringify(selected.entries.map(e => e.id)) === JSON.stringify(saved.au.deck), 'Noncanonical saved deck');
  check(JSON.stringify(selected.counts) === JSON.stringify(saved.counts), 'Stale saved counts');
  const wanted = {};
  selected.entries.forEach((e, i) => { if (e.uid !== null) wanted['card:' + i] = e.uid; });
  const actual = Object.fromEntries(Object.entries(saved.economy.references).filter(([k]) => k.startsWith('card:')));
  check(JSON.stringify(actual) === JSON.stringify(wanted), 'Stale card references');
  if (saved.game) {
    check(JSON.stringify(saved.game.state.au?.deck) === JSON.stringify(saved.au.deck), 'Run deck differs from preparation');
    const launch = saved.bundle.initial.state.au;
    check(JSON.stringify(launch) === JSON.stringify(saved.game.state.au), 'Run card metadata changed');
    for (const e of launch.entries) {
      const expected = e.uid === null ? AO.catalog[e.blueprint.base] : AO.compileCard(e.blueprint);
      const card = saved.game.state.cards[e.instance];
      for (const [key, value] of Object.entries(expected)) check(JSON.stringify(card?.[key]) === JSON.stringify(value), 'Run card performance changed');
      if (e.uid !== null) check(JSON.stringify(saved.bundle.ao.cards[expected.type]) === JSON.stringify(e.blueprint), 'Missing variant cost map');
    }
  }
}
class Session extends M.Session {
  constructor(seeds, tag, saved = null) {
    super(seeds, tag);
    this.data.au = {version: 'AU1', deck: []};
    this.setDeck(initialDeck());
    if (saved) this.restore(saved);
  }
  setDeck(ids) {
    check(this.data.phase === 'home', 'Deck editing requires home');
    const next = assess(this.data.economy, ids), economy = copy(this.data.economy);
    for (const key of Object.keys(economy.references)) if (key.startsWith('card:')) delete economy.references[key];
    next.entries.forEach((e, i) => { if (e.uid !== null) economy.references['card:' + i] = e.uid; });
    this.data.economy = economy; this.data.counts = next.counts;
    this.data.au.deck = next.entries.map(e => e.id);
  }
  restore(saved) {
    validateSaved(saved); super.restore(saved); validateSaved(this.save());
  }
  prepare(route, strategy = 'adapt', deckPolicy = 'use_owned') {
    super.prepare(route, strategy); this.setDeck(chooseDeck(this.data.economy, route, deckPolicy));
  }
  depart(route) {
    check(this.data.phase === 'home', 'Departure requires home');
    const d = this.data, selected = assess(d.economy, d.au.deck), index = d.nextRun;
    const seed = this.seeds[index % this.seeds.length], run = 'AR1-' + d.tag + '-' + index;
    // AH's legacy unlock list authorizes the count adapter only. AU possession validation remains authoritative.
    const profile = copy(d.economy.profile);
    profile.unlocked = [...new Set(profile.unlocked.concat(Object.keys(selected.counts)))];
    const prepared = C.runtime.depart(AO.source, seed, profile, selected.counts, route, run);
    const bundle = prepared.bundle, state = bundle.initial.state;
    const instances = [...state.actors.P.deck].sort();
    bundle.ao = {cards: {}};
    const entries = selected.entries.map((entry, i) => {
      const instance = instances[i];
      check(state.cards[instance].type === entry.blueprint.base, 'Card-to-instance alignment');
      if (entry.uid !== null) {
        state.cards[instance] = AP.materialize(d.economy, entry.uid, instance);
        bundle.ao.cards[entry.blueprint.key] = copy(entry.blueprint);
      }
      return {...entry, instance};
    });
    state.au = {version: 'AU1', deck: [...d.au.deck], entries};
    const game = Q.launch(d.economy, bundle), economy = AP.start(d.economy, run);
    this.data = {...d, phase: 'exploring', economy, nextRun: index + 1,
      active: {run, route, index, seed: seed.seed},
      stats: {triggers: {}, instances: {}, action_time: 0, time_saved: 0, minimum_time_actions: 0, healed: 0, predictions: 0}};
    this.bundle = game.bundle; this.game = game;
    game.advance(); this.syncRewards(); this.collect(); return game;
  }
}
module.exports = {M, C, AR, Q, AP, AO, AH, cfg, copy, resolve, canonical, assess, initialDeck, chooseDeck, validateSaved, Session};
