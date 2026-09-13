'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const U = require('./session.cjs');
const {M, C, AR, Q, AP, AO, AH, cfg, copy, Session} = U;
const sum = xs => xs.reduce((a, b) => a + b, 0);
const mean = xs => xs.length ? sum(xs) / xs.length : null;
const histogram = xs => xs.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {});
const amount = e => (e.profile.points + sum(Object.values(e.profile.learned))) * 100 + e.remainder;
const check = (v, m) => assert.ok(v, m);
const verification = {predictions: 0, continuation_pairs: 0, return_replays: 0, purchase_replays: 0, withdrawal_checks: 0, last_action_recovery: 0};
const withdrawalExamples = {}, checkpoints = [];

function routeFor(s, first, previous, outcome, index) {
  if (s.data.economy.profile.clears.includes('C')) return index % 2 === 0 ? 'A' : 'B';
  if (!s.data.economy.profile.clears.includes(first)) return first;
  return previous === 'C' && outcome === 'defeat' ? first : 'C';
}
function purchase(s, operation) {
  const e = s.data.economy, reserve = Object.keys(AH.cfg.skills).filter(b => !Object.hasOwn(e.profile.learned, b)).reduce((n, b) => n + AH.cfg.skills[b].cost * 100, 0);
  const view = M.view(e), candidates = (view?.candidates || []).filter(c => !view.purchased && e.profile.points * 100 + e.remainder >= reserve + c.price_units &&
    (c.blueprint.kind === 'card' || Object.hasOwn(e.profile.learned, c.blueprint.base)));
  candidates.sort((a, b) => (a.blueprint.kind === 'card' ? 0 : 1) - (b.blueprint.kind === 'card' ? 0 : 1) || a.id.localeCompare(b.id));
  if (!candidates.length) return null;
  const candidate = candidates[0]; s.buy(candidate.id, operation);
  const after = s.save(); s.buy(candidate.id, operation); assert.deepEqual(s.save(), after); verification.purchase_replays++;
  return copy(s.data.economy.at.purchases[operation]);
}
function phaseMetrics(rows, cards, selected) {
  return {actions: rows.length, modes: histogram(rows.map(r => r.mode)),
    borrowed_uses: rows.filter(r => r.origin !== 'P').length,
    own_initial_uses: rows.filter(r => r.origin === 'P' && cards[r.card_id].birth === 'initial').length,
    acquired_uses: rows.filter(r => selected.has(r.card_id)).length,
    acquired_field_uses: rows.filter(r => selected.has(r.matched_id)).length,
    hp_damage: sum(rows.map(r => r.actual_hp_loss)),
    matched_attacks: rows.filter(r => r.mode === 'attack').length,
    zero_hp_attacks: rows.filter(r => r.mode === 'attack' && r.actual_hp_loss === 0).length,
    zero_hp_and_probe_attacks: rows.filter(r => r.mode === 'attack' && r.actual_hp_loss === 0 && r.hit_gain === 0).length};
}
function execute(s, route, policy, label, sampleKey = null) {
  const deck = copy(s.data.au.deck), equipped = copy(s.data.economy.aq.equipped);
  const learned = Object.keys(s.data.economy.profile.learned), owned = deck.filter(id => id.startsWith('owned:'));
  const changed = U.canonical(s.data.economy, deck).filter(e => e.uid !== null).map(e => e.blueprint);
  s.depart(route);
  let trace = [...s.game.trace], restored = false, opportunities = 0, disagreements = 0;
  const decisions = [];
  while (!s.game.s.outcome) {
    const g = s.game, pub = g.public(), choices = g.choices(), ch = AH.choose(g, policy);
    const progress = AH.choose(g, 'progress_first'), side = AH.choose(g, 'side_first');
    const multi = new Set(choices.filter(x => x.target).map(x => x.target)).size > 1;
    const disagree = progress.target !== side.target;
    opportunities += +multi; disagreements += +disagree;
    if (disagree && decisions.length < 2) decisions.push({action: pub.actors.P.actions + 1, event: pub.current_event,
      hp: pub.actors.P.hp, player_rebuilds: g.s.actors.P.rebuilds,
      progress: {...progress, prediction: g.predict(progress)}, side: {...side, prediction: g.predict(side)}});
    let resumed = null;
    if (!restored && g.s.actors.P.actions >= 10) resumed = new Session(s.seeds, s.data.tag, s.save());
    // Exercise recovery from the final action before the return collector, once for the new adapter.
    let interrupted = null;
    if (!verification.last_action_recovery) {
      interrupted = new Session(s.seeds, s.data.tag, s.save()); interrupted.collect = () => {};
      interrupted.action(ch);
    }
    const before = g.trace.length, eventsBefore = g.s.events.length;
    s.action(ch); verification.predictions++;
    trace.push(...g.trace.slice(before));
    if (resumed) {
      resumed.action(ch); assert.deepEqual(resumed.save(), s.save());
      verification.continuation_pairs++; restored = true;
    }
    if (interrupted?.game.s.outcome) {
      const recovered = new Session(s.seeds, s.data.tag, interrupted.save());
      assert.deepEqual(recovered.save(), s.save()); verification.last_action_recovery++;
    }
    if (sampleKey && !withdrawalExamples[sampleKey] && !g.s.outcome && g.s.events.length > eventsBefore) {
      const snap = s.save(), withdrawn = new Session(s.seeds, s.data.tag, snap); withdrawn.withdraw();
      const receipt = copy(withdrawn.data.receipts.at(-1));
      assert.deepEqual(s.save(), snap);
      for (const uid of Object.keys(s.data.economy.inventory)) check(withdrawn.data.economy.inventory[uid], 'Previously owned card lost on withdrawal');
      withdrawalExamples[sampleKey] = {label, route, policy, action: g.s.actors.P.actions, hp: g.s.actors.P.hp,
        event: g.s.current_event, protected_rewards: Object.entries(g.s.rewards).filter(([, r]) => r.protected).map(([id]) => id),
        gained_points: receipt.gained_points, kept_items: receipt.kept.length, lost_items: receipt.lost.length};
      verification.withdrawal_checks++;
    }
  }
  check(s.game.s.outcome !== 'cutoff', 'AU action cutoff');
  const beforeReplay = s.save(); s.collect(); assert.deepEqual(s.save(), beforeReplay); verification.return_replays++;
  const g = s.game, cards = g.s.cards, selected = new Set(g.s.au.entries.filter(e => e.uid !== null).map(e => e.instance));
  const rows = trace.filter(r => r.type === 'action' && r.actor === 'P'), npc = trace.filter(r => r.type === 'action' && r.actor !== 'P');
  let longest = 0, streak = 0, previous = null;
  for (const r of rows) {
    const key = JSON.stringify([r.event_before, r.mode, r.target]);
    streak = key === previous ? streak + 1 : 1; longest = Math.max(longest, streak); previous = key;
  }
  const segments = {};
  for (const r of rows) { const e = segments[r.event_before] ||= {actions: 0, attacks: 0, placements: 0, zero_hp_attacks: 0};
    e.actions++; e.attacks += +(r.mode === 'attack'); e.placements += +(r.mode === 'place'); e.zero_hp_attacks += +(r.mode === 'attack' && r.actual_hp_loss === 0); }
  return {label, route, policy, seed: s.data.active.seed, outcome: g.s.outcome, actions: g.s.actors.P.actions, hp: g.s.actors.P.hp, time: g.s.now,
    learned, equipped, selected_count: owned.length, selected_blueprints: changed,
    phases: {before_player_refill: phaseMetrics(rows.filter(r => r.player_rebuilds === 0), cards, selected),
      after_player_refill: phaseMetrics(rows.filter(r => r.player_rebuilds > 0), cards, selected)},
    npc_acquired_uses: npc.filter(r => selected.has(r.card_id)).length,
    npc_acquired_field_uses: npc.filter(r => selected.has(r.matched_id)).length,
    npc_examples: npc.filter(r => selected.has(r.card_id) || selected.has(r.matched_id)).slice(0, 2).map(r =>
      ({actor: r.actor, mode: r.mode, target: r.target, card: cards[r.card_id].name, material: r.matched_id ? cards[r.matched_id].name : null,
        owned_card: selected.has(r.card_id), owned_material: selected.has(r.matched_id), hp_damage: r.actual_hp_loss, hit_gain: r.hit_gain})),
    multi_target_actions: opportunities, policy_target_disagreements: disagreements, max_same_mode_target_streak: longest,
    segments, decisions, boundaries: copy(g.s.events), receipt: copy(s.data.receipts.at(-1))};
}

const natural = [];
for (const offset of cfg.journey.offsets) for (const first of cfg.journey.first_routes) {
  const seeds = C.seeds.slice(offset).concat(C.seeds.slice(0, offset)), tag = 'au-natural-' + offset + '-' + first;
  const s = new Session(seeds, tag); let previous = null, outcome = null, firstSaved = false;
  for (let index = 0; index < cfg.journey.expeditions; index++) {
    const route = routeFor(s, first, previous, outcome, index), beforeAmount = amount(s.data.economy);
    s.prepare(route);
    const row = execute(s, route, cfg.journey.policy, tag + '-' + index, 'natural-' + route);
    const bought = purchase(s, 'buy-' + index); s.home();
    const beforeSale = amount(s.data.economy);
    s.data.economy = AR.sellSurplus(s.data.economy, 'sale-' + index);
    const saleUnits = amount(s.data.economy) - beforeSale;
    assert.equal(amount(s.data.economy), beforeAmount + row.receipt.gained_points * 100 - (bought?.units || 0) + saleUnits);
    Object.assign(row, {index, offset, first, bought, sale_units: saleUnits, unspent: s.data.economy.profile.points + s.data.economy.remainder / 100,
      total_owned: Object.keys(s.data.economy.inventory).length}); natural.push(row);
    if (!firstSaved && s.data.economy.profile.clears.includes(first)) {
      checkpoints.push({stage: 'first_clear', offset, first, saved: s.save(), seeds}); firstSaved = true;
    }
    previous = route; outcome = row.outcome;
  }
  checkpoints.push({stage: 'after_eight_returns', offset, first, saved: s.save(), seeds});
}
const paired = [];
for (const checkpoint of checkpoints) for (const route of cfg.paired.routes) for (const policy of cfg.paired.policies) for (const deck of cfg.paired.decks) {
  if (!AH.destinations(checkpoint.saved.economy.profile).includes(route)) continue;
  const s = new Session(checkpoint.seeds, checkpoint.saved.tag, checkpoint.saved);
  s.prepare(route, 'adapt', deck);
  paired.push({...execute(s, route, policy, [checkpoint.offset, checkpoint.first, checkpoint.stage, route, policy, deck].join('-'),
    checkpoint.stage + '-' + route), stage: checkpoint.stage, offset: checkpoint.offset, first: checkpoint.first, deck});
}
function summarize(rows) {
  const clear = rows.filter(r => r.outcome === 'clear');
  const phases = {};
  for (const name of ['before_player_refill', 'after_player_refill']) {
    phases[name] = {};
    for (const key of ['actions', 'borrowed_uses', 'own_initial_uses', 'acquired_uses', 'acquired_field_uses', 'hp_damage', 'matched_attacks', 'zero_hp_attacks', 'zero_hp_and_probe_attacks']) phases[name][key] = sum(rows.map(r => r.phases[name][key]));
  }
  return {runs: rows.length, outcomes: histogram(rows.map(r => r.outcome)), clear_actions_mean: mean(clear.map(r => r.actions)),
    clear_hp_mean: mean(clear.map(r => r.hp)), acquired_departures: rows.filter(r => r.selected_count > 0).length,
    affixed_departures: rows.filter(r => r.selected_blueprints.some(b => b.affixes.length > 0)).length,
    phases, npc_acquired_uses: sum(rows.map(r => r.npc_acquired_uses)), npc_acquired_field_uses: sum(rows.map(r => r.npc_acquired_field_uses)),
    multi_target_actions: sum(rows.map(r => r.multi_target_actions)), policy_target_disagreements: sum(rows.map(r => r.policy_target_disagreements)),
    longest_same_mode_target_streak: Math.max(0, ...rows.map(r => r.max_same_mode_target_streak))};
}
const groups = {};
for (const stage of cfg.paired.checkpoints) for (const route of cfg.paired.routes) for (const policy of cfg.paired.policies) for (const deck of cfg.paired.decks) {
  groups[[stage, route, policy, deck].join('/')] = summarize(paired.filter(r => r.stage === stage && r.route === route && r.policy === policy && r.deck === deck));
}
const comparisons = [];
for (const row of paired.filter(r => r.deck === 'initial')) {
  const match = paired.find(r => r.deck === 'use_owned' && r.stage === row.stage && r.route === row.route && r.policy === row.policy && r.offset === row.offset && r.first === row.first);
  assert.equal(row.seed, match.seed); assert.deepEqual(row.equipped, match.equipped); assert.deepEqual(row.learned, match.learned);
  comparisons.push({stage: row.stage, route: row.route, policy: row.policy, offset: row.offset, first: row.first,
    initial: row.outcome, use_owned: match.outcome, action_difference_if_both_clear: row.outcome === 'clear' && match.outcome === 'clear' ? match.actions - row.actions : null});
}
const sources = {...JSON.parse(fs.readFileSync(path.join(__dirname, '../../資源用途/at/results.json'))).sources};
for (const p of ['docs/検証/資源用途/at/conditions.json', 'docs/検証/資源用途/at/offers.cjs']) sources[p] = C.hash(path.join(C.repo, p));
const result = {trial: cfg.trial, sources, verification, natural_summary: summarize(natural), paired_summary: summarize(paired),
  purchase_count: natural.filter(r => r.bought).length,
  natural_checkpoints: checkpoints.map(({seeds, saved, ...x}) => ({...x, next_run: saved.nextRun, clears: saved.economy.profile.clears, learned: Object.keys(saved.economy.profile.learned), inventory_count: Object.keys(saved.economy.inventory).length})),
  groups, comparisons, withdrawal_examples: withdrawalExamples, natural, paired};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({trial: cfg.trial, natural: result.natural_summary, paired: result.paired_summary, purchases: result.purchase_count, verification}, null, 2));
