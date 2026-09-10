'use strict';
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const M = require('./conversion.cjs'), {AO, copy, cfg} = M;
const root = path.resolve(__dirname, '../../../..');
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
const basePath = 'docs/検証/統合試作/deck_feedback_trial/';
const aoPath = 'docs/検証/修飾/ao/';
const oldAO = require('../ao/results.json');
const sourcePaths = [...Object.keys(oldAO.sources).map(p => basePath + p), aoPath + 'affixes.cjs', aoPath + 'conditions.json',
  'docs/検証/成長節目/an/results.json', basePath + 'posture_am/journey-results.json'];
const sources = Object.fromEntries(sourcePaths.map(p => [p, hash(p)]));
const checks = [];
function test(name, fn) { fn(); checks.push(name); }
function rejected(state, fn, pattern) {
  const before = copy(state); assert.throws(fn, pattern); assert.deepEqual(state, before);
}
const passive = AO.blueprint('passive', 'PS02', ['borrowed', 'forceful']);
const alternate = AO.blueprint('passive', 'PS02', ['swift']);
const card = AO.blueprint('card', 'l', ['heavy']);
const healing = AO.blueprint('card', 'salve', ['rich']);
const plain = AO.blueprint('passive', 'PS02');
function bring(state, run, blueprints, outcome = 'clear') {
  let s = M.start(state, run);
  blueprints.forEach((b, i) => { s = M.award(s, 'item' + i, b); });
  return M.finish(s, run, outcome);
}

test('Equal passive copies retain quantity; different variants share only their base', () => {
  const s = bring(M.initial(), 'duplicates', [passive, passive, alternate]);
  assert.equal(Object.keys(s.inventory).length, 3);
  assert.equal(M.groups(s)[passive.key].quantity, 2);
  assert.equal(M.groups(s)[alternate.key].quantity, 1);
  assert.equal(Object.keys(s.profile.learned).length, 0);
});
test('Repeated reward identity is stable, conflicting identity is rejected', () => {
  let s = M.start(M.initial(), 'grant'); s = M.award(s, 'one', passive); s = M.protect(s);
  assert.deepEqual(M.award(s, 'one', passive), s);
  rejected(s, () => M.award(s, 'one', alternate), /Conflicting reward/);
});
for (const outcome of ['clear', 'withdrawal', 'defeat']) test('Retained possessions obey ' + outcome + ' settlement', () => {
  let s = bring(M.initial(), 'old', [alternate]); const oldId = M.uidFor('old', 'item0');
  s = M.start(s, 'current'); s = M.award(s, 'one', passive); s = M.protect(s); s = M.award(s, 'two', card);
  const out = M.finish(s, 'current', outcome);
  assert.equal(Object.keys(out.inventory).length, {clear: 3, withdrawal: 2, defeat: 1}[outcome]);
  assert.ok(out.inventory[oldId]); assert.ok(out.known[passive.key]); assert.ok(out.known[card.key]);
  assert.deepEqual(M.finish(out, 'current', outcome), out);
  rejected(out, () => M.finish(out, 'current', outcome === 'defeat' ? 'clear' : 'defeat'), /Conflicting settlement/);
});
test('Protection during an expedition does not make its rewards saleable', () => {
  let s = M.start(M.initial(), 'active'); s = M.protect(M.award(s, 'one', passive));
  rejected(s, () => M.sell(s, 'sale', [M.uidFor('active', 'one')]), /Requires home/);
});
test('A duplicate can be sold while the selected equal copy remains intact', () => {
  let s = M.learn(bring(M.initial(2), 'copies', [passive, passive]), ['PS02']);
  const a = M.uidFor('copies', 'item0'), b = M.uidFor('copies', 'item1');
  s = M.assign(s, 'passive:PS02', a);
  rejected(s, () => M.sell(s, 'blocked', [a]), /in preparation/);
  s = M.sell(s, 'extra', [b]);
  assert.equal(s.references['passive:PS02'], a); assert.equal(M.groups(s)[passive.key].quantity, 1);
  assert.equal(s.remainder, 50); assert.equal(s.profile.learned.PS02, 2);
});
test('Last-copy sale removes acquired availability but keeps knowledge and learned base', () => {
  let s = M.learn(bring(M.initial(2), 'last', [passive]), ['PS02']);
  const uid = M.uidFor('last', 'item0'); s = M.assign(s, 'passive:PS02', uid);
  s = M.assign(s, 'passive:PS02', null); s = M.sell(s, 'last_sale', [uid]);
  assert.equal(M.available(s, passive), false); assert.equal(M.available(s, plain), true);
  assert.ok(s.known[passive.key]); assert.equal(s.profile.learned.PS02, 2);
  rejected(s, () => M.assign(s, 'passive:PS02', uid), /Missing possession/);
  s = M.finish(s, 'last', 'clear'); assert.equal(M.available(s, passive), false);
});
test('Locked possessions and invalid batches fail atomically', () => {
  let s = bring(M.initial(), 'atomic', [card, passive]);
  const a = M.uidFor('atomic', 'item0'), b = M.uidFor('atomic', 'item1');
  s = M.lock(s, b, true);
  rejected(s, () => M.sell(s, 'mixed', [a, b]), /protected/);
  rejected(s, () => M.sell(s, 'unknown', [a, 'not-an-item']), /Missing saleable/);
  rejected(s, () => M.sell(s, 'twice', [a, a]), /Duplicate or empty/);
  rejected(s, () => M.sell(s, 'empty', []), /Duplicate or empty/);
});
test('Replaying a completed sale preserves the current balance and rejects a conflicting request', () => {
  let s = bring(M.initial(2), 'once', [card, passive]); const ids = Object.keys(s.inventory);
  s = M.sell(s, 'sale', ids); s = M.learn(s, ['PS02']);
  assert.equal(s.profile.points, 1);
  assert.deepEqual(M.sell(s, 'sale', ids.slice().reverse()), s);
  rejected(s, () => M.sell(s, 'sale', [ids[0]]), /Conflicting sale/);
  rejected(s, () => M.sell(s, 'sale', ids, 'high'), /Conflicting sale/);
  rejected(s, () => M.sell(s, 'another', [ids[0]]), /Missing saleable/);
});
test('Four ordinary copies convert to the two points actually used by AH learning', () => {
  let s = bring(M.initial(), 'learn', [passive, passive, passive, passive]);
  const ids = Object.keys(s.inventory);
  for (let i = 0; i < 3; i++) s = M.sell(s, 'partial' + i, [ids[i]]);
  assert.equal(s.profile.points, 1); assert.equal(s.remainder, 50);
  rejected(s, () => M.learn(s, ['PS02']), /Insufficient points/);
  s = M.sell(s, 'fourth', [ids[3]]); s = M.learn(s, ['PS02']);
  assert.equal(s.profile.learned.PS02, 2); assert.equal(s.profile.points, 0); assert.equal(s.remainder, 0);
  s = M.learn(s, []); assert.equal(s.profile.points, 2); assert.equal(Object.keys(s.inventory).length, 0);
});
test('Free respec neither creates possessions nor changes a fractional balance', () => {
  let s = bring(M.initial(3), 'respec', [passive, card]);
  s = M.sell(s, 'half', [M.uidFor('respec', 'item1')]);
  const inventory = copy(s.inventory), known = copy(s.known);
  for (let i = 0; i < 8; i++) { s = M.learn(s, ['PS02']); s = M.learn(s, []); }
  assert.equal(s.profile.points, 3); assert.equal(s.remainder, 50);
  assert.deepEqual(s.inventory, inventory); assert.deepEqual(s.known, known);
  rejected(s, () => M.sell(s, 'base_only', ['PS02']), /Missing saleable/);
  rejected(s, () => M.sell(s, 'knowledge_only', [card.key]), /Missing saleable/);
});
test('Historical learning payments are still fully refunded at their recorded cost', () => {
  let s = M.initial(); s.profile.learned.PS02 = 3; s.remainder = 50;
  s = M.learn(s, ['PS02']); assert.equal(s.profile.learned.PS02, 3);
  s = M.learn(s, []); assert.equal(s.profile.points, 3); assert.equal(s.remainder, 50);
  s = M.learn(s, ['PS02']); assert.equal(s.profile.learned.PS02, 2); assert.equal(s.profile.points, 1);
});
test('Card preparation and sale do not turn reusable exploration copies into saleable stock', () => {
  let s = bring(M.initial(), 'recipe', [healing]); const uid = M.uidFor('recipe', 'item0');
  s = M.assign(s, 'card:0', uid);
  rejected(s, () => M.sell(s, 'in_deck', [uid]), /in preparation/);
  const before = copy(s);
  for (let i = 0; i < 8; i++) {
    const instance = M.materialize(s, uid, 'expedition_' + i);
    assert.equal(instance.variant_key, healing.key); assert.equal(instance.consume_on_recover, true);
    rejected(s, () => M.sell(s, 'generated_' + i, [instance.id]), /Missing saleable/);
  }
  assert.deepEqual(s, before);
  s = M.assign(s, 'card:0', null); s = M.sell(s, 'recipe_sale', [uid]);
  assert.equal(M.available(s, healing), false);
  rejected(s, () => M.materialize(s, uid, 'after_sale'), /Missing acquired card/);
});
test('Initial free options are not a stock of repeatedly convertible items', () => {
  const baseCard = AO.blueprint('card', 'l');
  let s = M.initial(); assert.equal(M.available(s, baseCard), true);
  rejected(s, () => M.sell(s, 'free', [baseCard.key]), /Missing saleable/);
  s = bring(s, 'real_drop', [baseCard]); s = M.sell(s, 'earned', [M.uidFor('real_drop', 'item0')]);
  assert.equal(M.available(s, baseCard), true); assert.equal(Object.keys(s.inventory).length, 0);
  assert.equal(s.remainder, 50);
});
test('Old settlements replayed during a later run do not restore sold stock or leave that run', () => {
  let s = bring(M.initial(), 'earlier', [passive]); s = M.sell(s, 'sold', [M.uidFor('earlier', 'item0')]);
  s = M.start(s, 'later'); assert.deepEqual(M.finish(s, 'earlier', 'clear'), s);
  s = M.award(s, 'item0', passive); s = M.finish(s, 'later', 'clear');
  assert.equal(Object.keys(s.inventory).length, 1);
  assert.notEqual(Object.keys(s.inventory)[0], M.uidFor('earlier', 'item0'));
  rejected(s, () => M.start(s, 'earlier'), /Duplicate or invalid run/);
});
test('Batching and splitting conversions yield the same exact balance at all trial rates', () => {
  const s = bring(M.initial(), 'rounding', Array(7).fill(passive)); const ids = Object.keys(s.inventory);
  for (const rate of Object.keys(cfg.rates)) {
    const together = M.sell(s, 'together', ids, rate); let separate = s;
    ids.forEach((id, i) => { separate = M.sell(separate, 'part' + i, [id], rate); });
    assert.equal(together.profile.points, separate.profile.points); assert.equal(together.remainder, separate.remainder);
    assert.deepEqual(together.inventory, separate.inventory);
  }
});
test('A changed affix count does not itself raise the assigned conversion value', () => {
  const s = bring(M.initial(), 'value', [plain, passive]);
  assert.equal(M.quote(s, [M.uidFor('value', 'item0')]).units, M.quote(s, [M.uidFor('value', 'item1')]).units);
  for (const band of Object.keys(cfg.value_bands)) for (const rate of Object.keys(cfg.rates)) {
    assert.ok(M.unitsFor(band, rate) > 0 && M.unitsFor(band, rate) < cfg.value_bands[band]);
  }
});

const rates = Object.keys(cfg.rates).map(rate => ({rate, fraction: cfg.rates[rate],
  ordinary_points: M.unitsFor('ordinary', rate) / cfg.units_per_point,
  special_points: M.unitsFor('special', rate) / cfg.units_per_point,
  ordinary_copies_for_one_base: Math.ceil(2 * cfg.units_per_point / M.unitsFor('ordinary', rate)),
  ordinary_copies_for_four_bases: Math.ceil(8 * cfg.units_per_point / M.unitsFor('ordinary', rate))}));
const journey = require(path.join(root, basePath, 'posture_am/journey-results.json'));
const an = require(path.join(root, 'docs/検証/成長節目/an/results.json'));
const frozenReturns = [];
for (const row of journey.rows) {
  const stages = Object.entries(row).filter(([, v]) => v && typeof v === 'object' && v.receipt);
  let points = 0, copies = 0, duplicateCopies = 0; const seen = new Set();
  for (const [stage, detail] of stages) {
    points += detail.receipt.gained_points;
    for (const item of detail.receipt.kept.filter(x => x.kind === 'unlock')) {
      copies++; if (seen.has(item.type)) duplicateCopies++; else seen.add(item.type);
    }
    frozenReturns.push({route: row.route, seed: row.seed, stage, outcome: detail.outcome, points, copies, duplicateCopies,
      rates: rates.map(r => ({rate: r.rate,
        all_sold_points: (points * cfg.units_per_point + copies * M.unitsFor('ordinary', r.rate)) / cfg.units_per_point,
        first_kept_points: (points * cfg.units_per_point + duplicateCopies * M.unitsFor('ordinary', r.rate)) / cfg.units_per_point}))});
  }
}
const repetition = {cohorts: an.repetition.length, expeditions: 0, convertible_card_or_passive_copies: 0, direct_points: 0};
for (const row of an.repetition) for (const run of row.runs) {
  repetition.expeditions++; repetition.direct_points += run.gained;
  repetition.convertible_card_or_passive_copies += run.kept.filter(x => x.kind === 'unlock' || x.kind === 'passive').length;
}
assert.equal(repetition.expeditions, 272); assert.equal(repetition.convertible_card_or_passive_copies, 0);
const cClearSummary = ['A', 'B'].map(route => {
  const rows = frozenReturns.filter(x => x.route === route && x.stage === 'C' && x.outcome === 'clear');
  const unique = field => [...new Set(rows.map(field))].sort((a, b) => a - b);
  return {route, cases: rows.length, direct_points: unique(x => x.points), convertible_copies: unique(x => x.copies),
    duplicates: unique(x => x.duplicateCopies), rates: rates.map(r => ({rate: r.rate,
      all_sold_points: unique(x => x.rates.find(y => y.rate === r.rate).all_sold_points),
      first_kept_points: unique(x => x.rates.find(y => y.rate === r.rate).first_kept_points)}))};
});
for (const [p, h] of Object.entries(sources)) assert.equal(hash(p), h, 'Changed fixed source: ' + p);
const result = {trial: cfg.trial, base_commit: cfg.base_commit, sources,
  implementation_sha256: hash('docs/検証/修飾/ap/conversion.cjs'), conditions_sha256: hash('docs/検証/修飾/ap/conditions.json'),
  study_sha256: hash('docs/検証/修飾/ap/study.cjs'), checks, rates, repetition, cClearSummary, frozenReturns,
  interpretation: 'Accounting only. Each existing retained card unlock is treated as one ordinary possession in the comparison. Sell-all is a post-return resource ceiling that gives up those possessions; first-kept preserves one per known type. No new drops, conversion of material M, changed actions or extra expeditions were simulated.'};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({checks: checks.length, rates, repetition, cClearSummary}, null, 2) + '\n');
