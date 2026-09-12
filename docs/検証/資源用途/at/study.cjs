'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const M = require('./offers.cjs'), {C, AR, Q, AP, AO, AH, cfg, copy, Session} = M;
const {seeds, hash, histogram, mean, sum} = C;
const sources = {...C.sources(), ...Object.fromEntries(['common.cjs', 'session.cjs', 'conditions.json'].map(name => {
  const filename = 'docs/検証/装備制限/ar/' + name; return [filename, hash(path.join(C.repo, filename))];
}))};
const checks = [], distributions = [], cohorts = []; let predictions = 0, restores = 0, returnReplays = 0, purchaseReplays = 0;
let fixture = null, activeFixture = null, finalActionRecovery = false;
function checked(name, fn) { fn(); checks.push(name); }
function unchanged(state, fn) { const before = copy(state); assert.throws(fn); assert.deepEqual(state, before); }
function amount(s) { return (s.profile.points + sum(Object.values(s.profile.learned))) * 100 + s.remainder; }
function routeFor(s, first, lastRoute, lastOutcome, index) {
  const p = s.data.economy.profile;
  if (p.clears.includes('C')) return index % 2 === 0 ? 'A' : 'B';
  if (!p.clears.includes(first)) return first;
  return lastRoute === 'C' && lastOutcome === 'defeat' ? first : 'C';
}
for (const tier of cfg.distribution_probe.tiers) for (const route of cfg.distribution_probe.routes) {
  const rows = [];
  for (let seed = 0; seed < cfg.distribution_probe.seeds; seed++) {
    const context = {seed, index: 0, route, tier, sources: ['constructed-offer'], card_bases: [...AH.initialProfile().unlocked].sort()};
    const offers = M.generate(context); assert.deepEqual(M.generate(context), offers);
    assert(offers.length >= cfg.tiers[tier].count[0] && offers.length <= cfg.tiers[tier].count[1]);
    assert.equal(new Set(offers.map(c => c.blueprint.key)).size, offers.length);
    assert.notEqual(offers[0].blueprint.kind + ':' + offers[0].blueprint.base, offers[1].blueprint.kind + ':' + offers[1].blueprint.base);
    offers.forEach(c => { AO.validate(c.blueprint); assert.equal(c.price_units, 400); assert(c.price_units > AP.unitsFor(c.band)); });
    rows.push({seed, count: offers.length, keys: offers.map(c => c.blueprint.key)});
  }
  distributions.push({tier, route, constructed_batches: rows.length, counts: histogram(rows.map(r => r.count)),
    affix_counts: histogram(rows.flatMap(r => r.keys.map(key => key.split(':').length - 3))), rows});
}
checked('Difficulty-dependent candidate counts, canonical affixes, diversity and deterministic redisplay across 576 constructed batches', () => {
  assert.equal(sum(distributions.map(d => d.constructed_batches)), 576);
  for (const tier of cfg.distribution_probe.tiers) {
    const counts = new Set(distributions.filter(d => d.tier === tier).flatMap(d => d.rows.map(r => r.count)));
    assert.equal(counts.size, 3);
  }
});
function choosePurchase(s, nextRoute) {
  const state = s.data.economy, batch = M.view(state);
  if (!batch || batch.purchased) return null;
  const reserve = AO.cfg.passive_bases.filter(base => !Object.hasOwn(state.profile.learned, base)).reduce((n, base) => n + AH.cfg.skills[base].cost * 100, 0);
  const affordable = batch.candidates.filter(c => state.profile.points * 100 + state.remainder >= reserve + c.price_units);
  return affordable.map(c => {
    const b = c.blueprint, learned = b.kind === 'passive' && Object.hasOwn(state.profile.learned, b.base);
    const value = learned ? C.cfg.journey.home_value[nextRoute][b.base] / Q.cost(b) : 0;
    return {c, learned: learned ? 1 : 0, value};
  }).sort((a, b) => b.learned - a.learned || b.value - a.value || a.c.id.localeCompare(b.c.id))[0]?.c || null;
}
for (const offset of cfg.journey.offsets) for (const first of cfg.journey.first_routes) for (const strategy of cfg.journey.strategies) {
  const bank = seeds.map((_, i) => seeds[(offset + i) % seeds.length]), tag = ['AT', offset, first, strategy].join('-');
  const s = new Session(bank, tag), rows = []; let lastRoute = null, lastOutcome = null, ledger = 0;
  assert.equal(amount(s.data.economy), 0);
  for (let index = 0; index < cfg.journey.expeditions; index++) {
    const route = routeFor(s, first, lastRoute, lastOutcome, index);
    s.prepare(route, cfg.journey.preparation);
    const start = copy(s.data.economy), equipped = start.aq.equipped.map(id => Q.resolve(start, id));
    s.depart(route); let restored = false;
    if (!activeFixture) activeFixture = {bank, tag, saved: s.save()};
    while (!s.game.s.outcome) {
      const action = AH.choose(s.game, cfg.journey.policy);
      const beforeFinal = !finalActionRecovery ? s.save() : null;
      if (!restored && s.game.s.actors.P.actions >= 10) {
        const next = new Session(bank, tag, s.save());
        s.action(action); next.action(action); assert.deepEqual(s.save(), next.save()); restores++; restored = true;
      } else s.action(action);
      if (beforeFinal && ['clear', 'defeat'].includes(s.game.s.outcome)) {
        const interrupted = new Session(bank, tag, beforeFinal);
        interrupted.collect = () => {};
        interrupted.action(action);
        assert.equal(interrupted.data.phase, 'exploring');
        assert(interrupted.game.s.outcome);
        const recovered = new Session(bank, tag, interrupted.save());
        assert.deepEqual(recovered.save(), s.save());
        finalActionRecovery = true;
      }
    }
    assert.notEqual(s.game.s.outcome, 'cutoff', 'A cutoff must be reported separately');
    if (!fixture && s.game.s.outcome === 'clear') fixture = {bank, tag, saved: s.save()};
    const receipt = s.data.receipts.at(-1); predictions += receipt.predictions;
    const settled = s.save(); s.collect(); assert.deepEqual(s.save(), settled); returnReplays++;
    assert.deepEqual(new Session(bank, tag, settled).save(), settled);
    ledger += receipt.gained_points * 100;
    const oldOffer = copy(M.view(s.data.economy));
    if (receipt.outcome === 'defeat') assert.equal(oldOffer?.id || null, start.at.current);
    const nextRoute = routeFor(s, first, route, receipt.outcome, index + 1);
    let purchase = null;
    if (strategy === 'buy') {
      const chosen = choosePurchase(s, nextRoute);
      if (chosen) {
        const id = 'purchase-' + index; s.buy(chosen.id, id);
        purchase = copy(s.data.economy.at.purchases[id]); ledger -= purchase.units;
        const paid = s.save(); s.buy(chosen.id, id); assert.deepEqual(s.save(), paid); purchaseReplays++;
        assert.deepEqual(new Session(bank, tag, paid).save(), paid);
      }
    }
    s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'surplus-' + index);
    const sale = s.data.economy.sales['surplus-' + index]; ledger += sale?.units || 0;
    assert.equal(amount(s.data.economy), ledger);
    rows.push({route, index, seed: receipt.seed, outcome: receipt.outcome, actions: receipt.actions,
      hp: receipt.hp, gained_points: receipt.gained_points, kept_count: receipt.kept.length, lost_count: receipt.lost.length,
      offer: oldOffer ? {id: oldOffer.id, tier: oldOffer.context.tier, sources: oldOffer.context.sources, count: oldOffer.candidates.length,
        keys: oldOffer.candidates.map(c => c.blueprint.key), already_purchased: oldOffer.purchased !== null} : null,
      purchase, equipped: equipped.map(e => ({id: e.id, key: e.blueprint.key, cost: e.cost})),
      purchased_equipped: equipped.filter(e => e.uid?.startsWith('["AT1",')).length,
      sale_units: sale?.units || 0, sold_copies: sale?.ids.length || 0,
      total_points_including_spent_learning: amount(s.data.economy) / 100, unspent_points: s.data.economy.profile.points + s.data.economy.remainder / 100,
      learned: copy(s.data.economy.profile.learned), owned: Object.keys(s.data.economy.inventory).length});
    lastRoute = route; lastOutcome = receipt.outcome;
  }
  cohorts.push({offset, first, strategy, clears: [...s.data.economy.profile.clears], rows});
  process.stdout.write(tag + ': ' + rows.length + ' expeditions complete\n');
}
assert(fixture && activeFixture && finalActionRecovery);
checked('Final action saved before return settlement recovers one identical offer and settlement', () => assert(finalActionRecovery));
const original = new Session(fixture.bank, fixture.tag, fixture.saved);
const rich = copy(original.data.economy); rich.profile.points += 20;
const learned = Q.learn(rich, AO.cfg.passive_bases), batch = M.view(learned);
const passive = batch.candidates.find(c => c.blueprint.kind === 'passive');
const card = batch.candidates.find(c => c.blueprint.kind === 'card');
assert(passive && card, 'The fixed first returned fixture must offer both kinds');
checked('Offer display changes neither inventory nor funds nor active game random state', () => {
  const before = original.save(); M.view(original.data.economy); M.generate(batch.context); assert.deepEqual(original.save(), before);
});
let paid, uid;
checked('A successful purchase atomically spends only unspent funds and adds one exact acquired item', () => {
  const before = copy(learned); paid = M.purchase(learned, batch.id, passive.id, 'buy-passive');
  assert.deepEqual(learned, before); assert.equal(amount(paid), amount(before) - 400);
  assert.equal(Object.keys(paid.inventory).length, Object.keys(before.inventory).length + 1);
  uid = paid.at.purchases['buy-passive'].uid; assert.deepEqual(paid.inventory[uid].blueprint, passive.blueprint);
  assert.deepEqual(M.purchase(paid, batch.id, passive.id, 'buy-passive'), paid);
});
checked('Insufficient unspent funds cannot silently refund learned bases or partially purchase', () => {
  const poor = copy(learned); poor.profile.points = 3; poor.remainder = 99;
  unchanged(poor, () => M.purchase(poor, batch.id, passive.id, 'too-poor'));
});
checked('Second purchase, conflicting operation, stale candidate and reserved object-key operation fail unchanged', () => {
  unchanged(paid, () => M.purchase(paid, batch.id, card.id, 'buy-card-too'));
  unchanged(paid, () => M.purchase(paid, batch.id, card.id, 'buy-passive'));
  unchanged(learned, () => M.purchase(learned, batch.id, 'not-offered', 'bad-choice'));
  unchanged(learned, () => M.purchase(learned, batch.id, passive.id, '__proto__'));
});
checked('Purchased passive obeys learned-base and total equipment cost gates; an equipped copy cannot be sold', () => {
  const equipped = Q.equip(paid, ['owned:' + uid]); assert(Q.assess(equipped.aq.equipped.map(id => Q.resolve(equipped, id))).fits);
  unchanged(equipped, () => AP.sell(equipped, 'sell-equipped', [uid]));
  const forgotten = Q.learn(equipped, []); assert(forgotten.inventory[uid]);
  unchanged(forgotten, () => Q.equip(forgotten, ['owned:' + uid]));
});
checked('Free relearning refunds actual base fees, keeps purchases and fractions, and does not refund acquisition spending', () => {
  const fractional = copy(paid); fractional.remainder = 50;
  const forgotten = Q.learn(fractional, []); assert.equal(amount(forgotten), amount(fractional));
  assert.equal(forgotten.profile.points, fractional.profile.points + 8);
  assert.equal(forgotten.remainder, 50); assert.deepEqual(forgotten.inventory, fractional.inventory);
  assert.deepEqual(Q.learn(forgotten, AO.cfg.passive_bases), fractional);
});
checked('Immediate conversion loses 3.5 points and purchase replay after sale never recreates an item', () => {
  const sold = AP.sell(paid, 'sell-bought', [uid]); assert.equal(amount(sold), amount(learned) - 350);
  assert(!sold.inventory[uid]); assert.deepEqual(M.purchase(sold, batch.id, passive.id, 'buy-passive'), sold);
});
checked('Purchased cards materialize their exact variant without a new saleable possession', () => {
  const bought = M.purchase(learned, batch.id, card.id, 'buy-card'), before = copy(bought);
  const id = bought.at.purchases['buy-card'].uid, instance = AP.materialize(bought, id, 'materialized-card');
  assert.equal(instance.variant_key, card.blueprint.key); assert.deepEqual(bought, before);
  unchanged(bought, () => AP.sell(bought, 'sell-free-instance', [instance.id]));
});
checked('Saved offer or price modification is rejected; replay and free respec keep the offer', () => {
  const altered = copy(paid); altered.at.batches[batch.id].candidates[0].price_units = 1;
  assert.throws(() => M.validate(altered));
  assert.deepEqual(M.view(Q.learn(paid, [])), M.view(paid));
  const snapshot = copy(fixture.saved); snapshot.economy = paid;
  const resumed = new Session(fixture.bank, fixture.tag, snapshot); assert.deepEqual(resumed.save(), snapshot);
});
checked('Buying while exploring fails without changing the session', () => {
  const active = new Session(activeFixture.bank, activeFixture.tag, activeFixture.saved);
  const before = active.save(); assert.throws(() => active.buy('choice-0', 'exploring-purchase')); assert.deepEqual(active.save(), before);
});
// Explicit synthetic settlement metadata isolates retained-completion difficulty from entry and effort.
function returnFixture(run, outcome, rewards) {
  const d = copy(original.data), g = {s: {outcome, ah: {run}, rewards}};
  d.active = {...d.active, run, route: 'C', index: d.active.index + 1};
  d.receipts = [{run, outcome}]; d.economy = copy(learned);
  d.economy.runs[run] = {grants: {}, receipt: {outcome, kept: [], lost: []}};
  return {data: d, game: g};
}
const low = {'C/V0': {source: 'V0', protected: true}}, mixed = {...low, 'C/V1': {source: 'V1', protected: false}};
checked('A retained easy completion inside C does not earn unretained higher-difficulty candidates', () => {
  const partial = returnFixture('partial-C', 'withdrawal', mixed);
  assert.equal(M.qualifyingContext(partial).tier, 'I');
  const higher = returnFixture('higher-C', 'clear', mixed); assert.equal(M.qualifyingContext(higher).tier, 'II');
});
checked('Defeat and empty withdrawal do not refresh; effort and low HP do not raise difficulty', () => {
  for (const [run, outcome, rewards] of [['dead-C', 'defeat', low], ['empty-C', 'withdrawal', {}]]) {
    const s = returnFixture(run, outcome, rewards), out = M.fromReturn(s);
    assert.equal(out.at.current, s.data.economy.at.current);
  }
  const s = returnFixture('effort-C', 'withdrawal', mixed), context = M.qualifyingContext(s);
  s.game.s.now = 999999; s.game.s.actors = {P: {hp: 1, actions: 9999}};
  assert.deepEqual(M.qualifyingContext(s), context);
});
checked('Only a new retained-completion return refreshes the batch; earlier unbought candidates cannot be purchased', () => {
  const s = returnFixture('next-C', 'clear', mixed), out = M.fromReturn(s);
  assert.notEqual(out.at.current, learned.at.current);
  unchanged(out, () => M.purchase(out, batch.id, passive.id, 'stale-batch'));
  s.data.economy = out; assert.deepEqual(M.fromReturn(s), out);
});
checked('A later return may sell the identical performance again as a distinct acquired copy', () => {
  const context = copy(batch.context), laterId = batch.id + '-later';
  const state = copy(paid); state.at.current = laterId;
  state.at.batches[laterId] = {id: laterId, context, candidates: M.generate(context), purchased: null};
  const twice = M.purchase(state, laterId, passive.id, 'buy-same-later'), second = twice.at.purchases['buy-same-later'].uid;
  assert.notEqual(uid, second); assert.deepEqual(twice.inventory[uid].blueprint, twice.inventory[second].blueprint);
});
const summary = cfg.journey.strategies.map(strategy => {
  const selected = cohorts.filter(c => c.strategy === strategy), rows = selected.flatMap(c => c.rows);
  return {strategy, cohorts: selected.length, expeditions: rows.length, outcomes: histogram(rows.map(r => r.outcome)),
    c_cleared_cohorts: selected.filter(c => c.clears.includes('C')).length,
    purchases: rows.filter(r => r.purchase).length, purchase_units: sum(rows.map(r => r.purchase?.units || 0)),
    purchased_equipped_departures: rows.filter(r => r.purchased_equipped > 0).length,
    offer_counts: histogram(rows.filter(r => r.offer).map(r => r.offer.count)),
    mean_final_unspent_points: mean(selected.map(c => c.rows.at(-1).unspent_points))};
});
const output = {trial: 'AT1', base_commit: cfg.base_commit, sources,
  own_hashes: Object.fromEntries(['conditions.json', 'offers.cjs', 'study.cjs'].map(n => [n, hash(path.join(__dirname, n))])),
  checks, counts: {constructed_offer_batches: 576, natural_start_expeditions: cohorts.reduce((n, c) => n + c.rows.length, 0),
    player_prediction_checks: predictions, restored_continuations: restores, return_replays: returnReplays, purchase_replays: purchaseReplays,
    final_action_recovery: 1, boundary_items: checks.length, synthetic_difficulty_boundaries: true},
  distributions, summary, cohorts};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(output, null, 2) + '\n');
process.stdout.write(JSON.stringify({counts: output.counts, summary}, null, 2) + '\n');
