'use strict';
const crypto = require('crypto');
const C = require('../../装備制限/ar/common.cjs');
const AR = require('../../装備制限/ar/session.cjs');
const {Q, AP, AO, AH, copy} = C, cfg = require('./conditions.json');
const check = (x, message) => { if (!x) throw Error(message); };
const has = (x, key) => Object.hasOwn(x, key);
const digest = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const config = digest(cfg);
const validId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(x);
const pools = new Map();
function attach(state) {
  const out = copy(state);
  if (!out.at) out.at = {version: 'AT1', config, current: null, batches: {}, returns: {}, purchases: {}};
  check(out.at.version === 'AT1' && out.at.config === config, 'Unsupported offer version or conditions');
  return out;
}
function pool(context) {
  check(cfg.tiers[context.tier] && cfg.passive_base_weights[context.route], 'Unknown difficulty or route');
  check(Array.isArray(context.card_bases) && context.card_bases.length > 0, 'Missing unlocked cards');
  const key = JSON.stringify(context.card_bases);
  if (pools.has(key)) return pools.get(key);
  const entries = [...context.card_bases.map(base => ['card', base]), ...AO.cfg.passive_bases.map(base => ['passive', base])];
  const result = entries.flatMap(([kind, base]) => AO.variants(kind, base)).filter(b => b.affixes.length === 0 ||
    b.affixes.some(id => (b.kind === 'card' ? AO.cfg.card_affixes : AO.cfg.passive_affixes)[id].benefit));
  pools.set(key, result); return result;
}
// Pure deterministic generation; contexts are retained with the offer before it is displayed.
function generate(context) {
  check(Number.isSafeInteger(context.seed) && Number.isSafeInteger(context.index), 'Invalid reward seed');
  const tier = cfg.tiers[context.tier]; check(tier, 'Unknown tier');
  let serial = 0;
  const word = purpose => crypto.createHash('sha256').update(JSON.stringify([cfg.namespace, context.seed, context.index,
    context.route, context.tier, context.sources, purpose, serial++])).digest().readUInt32BE(0);
  const draw = (entries, weight, purpose) => {
    const positive = entries.map(x => ({x, w: weight(x)})).filter(x => x.w > 0);
    const total = positive.reduce((n, x) => n + x.w, 0); check(total > 0, 'No eligible offer');
    let n = word(purpose) % total;
    for (const x of positive) { if (n < x.w) return x.x; n -= x.w; }
    throw Error('Invalid offer draw');
  };
  const count = tier.count[0] + word('count') % (tier.count[1] - tier.count[0] + 1);
  const candidates = [], used = new Set();
  for (let i = 0; i < count; i++) {
    let eligible = pool(context).filter(b => !used.has(b.key) && tier.affix_count_weights[b.affixes.length] > 0);
    if (i === 1) {
      const alternatives = eligible.filter(b => b.kind + ':' + b.base !== candidates[0].blueprint.kind + ':' + candidates[0].blueprint.base);
      if (alternatives.length) eligible = alternatives;
    }
    const kinds = [...new Set(eligible.map(b => b.kind))];
    const kind = draw(kinds, k => cfg.kind_weights[k], 'kind');
    const bases = [...new Set(eligible.filter(b => b.kind === kind).map(b => b.base))];
    const base = draw(bases, b => kind === 'passive' ? cfg.passive_base_weights[context.route][b] : 1, 'base');
    const variants = eligible.filter(b => b.kind === kind && b.base === base);
    const lengths = [...new Set(variants.map(b => b.affixes.length))];
    const length = draw(lengths, n => tier.affix_count_weights[n], 'affix-count');
    const blueprint = draw(variants.filter(b => b.affixes.length === length), () => 1, 'variant');
    candidates.push({id: 'choice-' + i, blueprint: copy(blueprint), price_units: cfg.price_units, band: cfg.value_band});
    used.add(blueprint.key);
  }
  return candidates;
}
function validate(state) {
  check(state?.at?.version === 'AT1' && state.at.config === config, 'Unsupported offer save');
  check(Number.isSafeInteger(state.profile.points) && state.profile.points >= 0 &&
    Number.isSafeInteger(state.remainder) && state.remainder >= 0 && state.remainder < AP.cfg.units_per_point, 'Invalid offer funds');
  check(state.at.current === null || has(state.at.batches, state.at.current), 'Missing current offer');
  for (const [id, batch] of Object.entries(state.at.batches)) {
    check(id === batch.id && JSON.stringify(batch.candidates) === JSON.stringify(generate(batch.context)), 'Changed saved candidates');
    check(batch.purchased === null || has(state.at.purchases, batch.purchased), 'Missing purchase receipt');
    for (const c of batch.candidates) {
      AO.validate(c.blueprint);
      check(Number.isSafeInteger(c.price_units) && c.price_units > AP.unitsFor(c.band), 'Nonpositive conversion loss');
    }
  }
  for (const [id, receipt] of Object.entries(state.at.purchases)) {
    const batch = state.at.batches[receipt.batch];
    const choice = batch?.candidates.find(c => c.id === receipt.choice);
    check(validId(id) && batch?.purchased === id && choice && receipt.units === choice.price_units &&
      receipt.uid === JSON.stringify(['AT1', receipt.batch, receipt.choice]), 'Invalid purchase receipt');
    const item = state.inventory[receipt.uid];
    if (item) check(JSON.stringify(item.blueprint) === JSON.stringify(choice.blueprint) && item.band === choice.band, 'Changed purchased item');
    // Sold purchases need not still be in inventory; a replay must not recreate them.
  }
  return state;
}
function qualifyingContext(session) {
  const {data: d, game: g} = session;
  check(d.phase === 'return' && g && d.active, 'Return must be settled first');
  const receipt = d.receipts.at(-1), run = d.active.run;
  check(receipt.run === run && g.s.ah.run === run && receipt.outcome === g.s.outcome &&
    d.economy.runs[run]?.receipt?.outcome === receipt.outcome && d.economy.profile.phase === 'home', 'Mismatched return receipt');
  if (receipt.outcome === 'defeat') return null;
  const sources = Object.entries(g.s.rewards).filter(([key, r]) =>
    (receipt.outcome === 'clear' || receipt.outcome === 'withdrawal' && r.protected) &&
    (AH.cfg.routes[d.active.route].rewards[r.source] || []).length > 0).map(([key]) => key).sort();
  if (!sources.length) return null;
  for (const key of sources) check(cfg.event_tiers[key], 'Unrated retained reward source');
  const tier = sources.map(key => cfg.event_tiers[key]).sort((a, b) => cfg.tiers[b].rank - cfg.tiers[a].rank)[0];
  return {seed: d.active.seed, index: d.active.index, route: d.active.route, tier, sources,
    card_bases: [...d.economy.profile.unlocked].sort()};
}
function fromReturn(session) {
  let out = attach(session.data.economy); validate(out);
  const context = qualifyingContext(session), receipt = session.data.receipts.at(-1), run = receipt.run;
  const signature = digest({context, receipt});
  if (has(out.at.returns, run)) {
    check(out.at.returns[run].signature === signature, 'Conflicting return offer'); return out;
  }
  const id = 'offer-' + run;
  out.at.returns[run] = {signature, batch: context ? id : null};
  if (context) {
    check(!has(out.at.batches, id), 'Duplicate offer identity');
    const candidates = generate(context);
    out.at.batches[id] = {id, context: copy(context), candidates, purchased: null}; out.at.current = id;
    for (const c of candidates) out.known[c.blueprint.key] = copy(c.blueprint);
  }
  return out;
}
function view(state) {
  check(state.profile.phase === 'home', 'Offers require home'); validate(state);
  return state.at.current === null ? null : copy(state.at.batches[state.at.current]);
}
function purchase(state, batchId, choiceId, operation) {
  check(validId(operation) && state.profile.phase === 'home', 'Purchase requires home and an operation id'); validate(state);
  const signature = digest({batch: batchId, choice: choiceId});
  if (has(state.at.purchases, operation)) {
    check(state.at.purchases[operation].signature === signature, 'Conflicting purchase operation'); return copy(state);
  }
  check(state.at.current === batchId, 'Offer is no longer current');
  const batch = state.at.batches[batchId]; check(batch && batch.purchased === null, 'Offer already purchased');
  const c = batch.candidates.find(x => x.id === choiceId); check(c, 'Unknown candidate');
  const beforeUnits = state.profile.points * AP.cfg.units_per_point + state.remainder;
  check(beforeUnits >= c.price_units, 'Insufficient unspent learning points');
  const uid = JSON.stringify(['AT1', batchId, choiceId]); check(!has(state.inventory, uid), 'Existing purchase identity');
  // Build the whole new state; the caller installs it only after all checks succeed.
  const out = copy(state), remaining = beforeUnits - c.price_units;
  out.profile.points = Math.floor(remaining / AP.cfg.units_per_point); out.remainder = remaining % AP.cfg.units_per_point;
  out.inventory[uid] = {uid, blueprint: copy(c.blueprint), band: c.band, locked: false};
  out.known[c.blueprint.key] = copy(c.blueprint);
  out.at.batches[batchId].purchased = operation;
  out.at.purchases[operation] = {signature, batch: batchId, choice: choiceId, units: c.price_units, uid};
  return out;
}
class Session extends AR.Session {
  constructor(seeds, tag, saved = null) {
    super(seeds, tag); this.data.economy = attach(this.data.economy);
    if (saved) this.restore(saved);
  }
  restore(saved) {
    validate(saved.economy); super.restore(saved); validate(this.data.economy);
  }
  collect() {
    super.collect();
    if (this.data.phase === 'return') this.data.economy = fromReturn(this);
  }
  buy(choiceId, operation) {
    check(['home', 'return'].includes(this.data.phase), 'Purchase requires return');
    this.data.economy = purchase(this.data.economy, this.data.economy.at.current, choiceId, operation);
    return view(this.data.economy);
  }
}
module.exports = {C, AR, Q, AP, AO, AH, cfg, copy, attach, generate, validate, qualifyingContext, fromReturn, view, purchase, Session};
