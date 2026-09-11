'use strict';
const crypto = require('crypto');
const C = require('./common.cjs'), {Q, AP, AO, AH, cfg, copy, runtime, source, sum} = C;
const check = (ok, message) => { if (!ok) throw Error(message); };
const total = state => state.profile.points + sum(Object.values(state.profile.learned));
function randomWord(seed, expedition, route, key, purpose) {
  return crypto.createHash('sha256').update(JSON.stringify([cfg.loot.namespace, seed, expedition, route, key, purpose])).digest().readUInt32BE(0);
}
function generatedRewards(seed, expedition, route, key, sourceActor) {
  const out = [], drop = cfg.loot.events[key];
  const authored = AH.cfg.routes[route].rewards[sourceActor] || [];
  // Existing card-unlock rewards become one persistent acquired copy as well.
  // Variant generation is separate from the engine RNG and never changes current-run cards.
  authored.forEach((item, i) => {
    if (item.kind !== 'unlock') return;
    const pool = AO.variants('card', item.type).filter(b => b.affixes.length === 0 ||
      b.affixes.length === 1 && AO.cfg.card_affixes[b.affixes[0]].benefit);
    const index = randomWord(seed, expedition, route, key, 'card-' + i) % pool.length;
    out.push({id: 'card-' + sourceActor + '-' + i, blueprint: pool[index]});
  });
  if (drop && randomWord(seed, expedition, route, key, 'present') % drop.chance[1] < drop.chance[0]) {
    const [base, affixes] = drop.passives[randomWord(seed, expedition, route, key, 'passive') % drop.passives.length];
    out.push({id: 'passive-' + sourceActor, blueprint: AO.blueprint('passive', base, affixes)});
  }
  return out;
}
function equipForRoute(state, route, strategy) {
  check(['retain', 'adapt'].includes(strategy), 'Unknown preparation strategy');
  check(AH.destinations(state.profile).includes(route), 'Destination locked');
  const budget = total(state), skills = []; let spent = 0;
  for (const base of cfg.journey.learning_order) {
    const cost = state.profile.learned[base] ?? AH.cfg.skills[base].cost;
    if (spent + cost <= budget) { skills.push(base); spent += cost; }
  }
  let out = Q.learn(state, skills);
  const selected = strategy === 'retain' ? out.aq.equipped.map(id => Q.resolve(out, id)) : [];
  const remaining = Q.candidates(out).filter(e => !selected.some(s => s.id === e.id));
  while (remaining.length) {
    const counts = Q.assess(selected).bases;
    const ranked = remaining.map(e => {
      const factor = cfg.journey.same_base_value_factors[counts[e.base] || 0] || 0;
      const value = (cfg.journey.home_value[route][e.base] + sum(e.blueprint.affixes.map(id => cfg.journey.affix_value[id]))) * factor;
      return {e, value, ratio: value / e.cost};
    }).filter(x => x.value > 0 && Q.assess([...selected, x.e]).fits)
      .sort((a, b) => b.ratio - a.ratio || b.value - a.value || a.e.id.localeCompare(b.e.id));
    if (!ranked.length) break;
    selected.push(ranked[0].e); remaining.splice(remaining.findIndex(e => e.id === ranked[0].e.id), 1);
  }
  out = Q.equip(out, selected.map(e => e.id));
  return out;
}
function sellSurplus(state, operation) {
  const selected = new Set(Object.values(state.references)), sell = [];
  for (const group of Object.values(AP.groups(state))) {
    const limit = group.blueprint.kind === 'passive' ? Math.max(1, Math.floor(Q.cfg.policies.cost.cost_limit / Q.cost(group.blueprint))) : 1;
    let excess = group.quantity - limit;
    for (const uid of [...group.uids].sort().reverse()) {
      if (excess <= 0) break;
      if (!selected.has(uid) && !state.inventory[uid].locked) { sell.push(uid); excess--; }
    }
  }
  return sell.length ? AP.sell(state, operation, sell) : copy(state);
}
function emptyStats() {
  return {triggers: {}, instances: {}, action_time: 0, time_saved: 0, minimum_time_actions: 0, healed: 0, predictions: 0};
}
class Session {
  constructor(seeds, tag, saved = null) {
    this.seeds = seeds;
    this.data = {schema: 'AR1', phase: 'home', tag, economy: Q.initial(), counts: AH.countsFor(source, cfg.journey.build),
      nextRun: 0, active: null, stats: null, receipts: []};
    this.game = null; this.bundle = null;
    check(/^[A-Za-z0-9_-]+$/.test(tag), 'Invalid session tag');
    if (saved) this.restore(saved);
  }
  save() { return {...copy(this.data), bundle: copy(this.bundle), game: this.game ? this.game.save() : null}; }
  restore(saved) {
    check(saved?.schema === 'AR1' && ['home', 'exploring', 'return'].includes(saved.phase), 'Invalid session save');
    const d = copy(saved), game = d.game ? new Q.Game(d.bundle, d.game) : null;
    check(d.economy?.aq?.version === 'AQ1', 'Wrong equipment save');
    check(Number.isSafeInteger(d.nextRun) && d.nextRun >= 0, 'Invalid expedition counter');
    if (d.phase === 'exploring') {
      check(game && d.economy.profile.phase === 'exploring' && d.economy.profile.run === game.s.ah.run, 'Mismatched active expedition');
      check(JSON.stringify(d.economy.aq.equipped) === JSON.stringify(game.s.aq.entries.map(e => e.id).sort()), 'Mismatched run equipment');
      for (const entry of game.s.aq.entries) check(JSON.stringify(Q.resolve(d.economy, entry.id)) === JSON.stringify(entry), 'Mismatched possession');
    } else check(d.economy.profile.phase === 'home', 'Mismatched home state');
    this.bundle = d.bundle; this.game = game; delete d.bundle; delete d.game; this.data = d;
    if (d.phase === 'exploring') { this.syncRewards(); this.collect(); }
  }
  prepare(route, strategy) {
    check(this.data.phase === 'home', 'Preparation requires home');
    this.data.economy = equipForRoute(this.data.economy, route, strategy);
  }
  depart(route) {
    check(this.data.phase === 'home', 'Departure requires home');
    const d = this.data, index = d.nextRun, seed = this.seeds[index % this.seeds.length], run = 'AR1-' + d.tag + '-' + index;
    const prepared = runtime.depart(source, seed, d.economy.profile, d.counts, route, run);
    const game = Q.launch(d.economy, prepared.bundle), economy = AP.start(d.economy, run);
    this.data = {...d, phase: 'exploring', economy, nextRun: index + 1,
      active: {run, route, index, seed: seed.seed}, stats: emptyStats()};
    this.bundle = game.bundle; this.game = game;
    game.advance(); this.syncRewards(); this.collect();
    return game;
  }
  syncRewards() {
    if (this.data.phase !== 'exploring') return;
    let economy = this.data.economy;
    const {seed, index, route, run} = this.data.active;
    for (const [key, reward] of Object.entries(this.game.s.rewards)) {
      for (const generated of generatedRewards(seed, index, route, key, reward.source)) {
        economy = AP.award(economy, generated.id, generated.blueprint);
        economy.runs[run].grants[generated.id].protected = !!reward.protected;
      }
    }
    this.data.economy = economy;
  }
  action(choice) {
    check(this.data.phase === 'exploring' && !this.game.s.outcome, 'No active action');
    const before = this.save(), trace = [...this.game.trace], start = trace.length;
    const prediction = this.game.predict(choice);
    check(JSON.stringify(this.save()) === JSON.stringify(before), 'Prediction changed session');
    try {
      this.game.step(choice); this.game.advance();
      const rows = this.game.trace.slice(start).filter(r => r.type === 'action' && r.actor === 'P');
      check(rows.length === 1, 'Wrong player action count');
      const row = rows[0];
      for (const key of ['actual_hp_loss', 'hit_gain', 'hit_connected', 'posture_multiplier', 'hp_restored', 'action_cost']) check(prediction[key] === row[key], 'Prediction mismatch: ' + key);
      const stats = this.data.stats; stats.predictions++;
      for (const base of new Set(row.passives || [])) stats.triggers[base] = (stats.triggers[base] || 0) + 1;
      for (const base of row.passives || []) stats.instances[base] = (stats.instances[base] || 0) + 1;
      stats.action_time += row.action_cost;
      stats.time_saved += this.game.cost(this.game.s.cards[row.card_id].type, !!row.matched_id) - row.action_cost;
      stats.minimum_time_actions += row.action_cost === 1 ? 1 : 0; stats.healed += row.hp_restored || 0;
      this.syncRewards(); this.collect();
    } catch (e) { this.restore(before); this.game.trace = trace; throw e; }
    return this.game;
  }
  collect() {
    const d = this.data, g = this.game;
    if (d.phase !== 'exploring' || !g || !['clear', 'withdrawal', 'defeat'].includes(g.s.outcome)) return;
    const before = d.economy, afterProfile = AH.finish(before.profile, g);
    const economy = AP.finish(before, d.active.run, g.s.outcome); economy.profile = afterProfile;
    const receipt = {...copy(d.active), outcome: g.s.outcome, actions: g.s.actors.P.actions, hp: g.s.actors.P.hp, time: g.s.now,
      ...copy(d.stats), gained_points: afterProfile.points - before.profile.points,
      new_unlocks: afterProfile.unlocked.filter(t => !before.profile.unlocked.includes(t)),
      opened: AH.destinations(afterProfile).filter(t => !AH.destinations(before.profile).includes(t)),
      ...copy(economy.runs[d.active.run].receipt)};
    receipt.kept_blueprints = receipt.kept.map(uid => economy.inventory[uid].blueprint.key);
    d.economy = economy; d.phase = 'return'; d.receipts.push(receipt);
  }
  withdraw() {
    check(this.data.phase === 'exploring' && (!this.game.s.outcome || this.game.s.outcome === 'cutoff'), 'No expedition to withdraw');
    this.game.settle('withdrawal'); this.syncRewards(); this.collect();
  }
  home() {
    check(this.data.phase === 'return', 'Return required');
    this.data.phase = 'home'; this.data.active = null; this.game = null; this.bundle = null;
  }
}
module.exports = {Session, generatedRewards, equipForRoute, sellSurplus, total};
