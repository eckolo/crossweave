'use strict';
// BB1: inspect frozen AU/BA records and call pure offer/deck functions only.
// No sessions are created and no exploration, purchase, learning or sale is run.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const assert = require('assert/strict');
const U = require('../au/session.cjs');
const {M, AH, AO, AP, C} = U;
const repo = path.resolve(__dirname, '../../../..');
const read = p => JSON.parse(fs.readFileSync(path.join(repo, p), 'utf8'));
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, p))).digest('hex');
const au = read('docs/検証/構築と探索/au/results.json');
const ba = read('docs/検証/構築と探索/ba/results.json');
const units = AP.cfg.units_per_point, initial = AH.initialProfile();
assert.equal(units, 100);
assert.equal(M.cfg.price_units, 400);
assert.equal(initial.points, 0);
assert.deepEqual(initial.learned, {});
const sum = xs => xs.reduce((a, b) => a + b, 0);
const learnedUnits = bases => sum(bases.map(base => AH.cfg.skills[base].cost * units));
const firstRows = au.natural.filter(row => row.index === 0);
assert.equal(firstRows.length, 4);

function generatedOffer(row, history) {
  assert.equal(row.outcome, 'clear');
  const sources = [...new Set(row.boundaries
    .filter(b => ['traversed', 'defeated'].includes(b.event) && (AH.cfg.routes[row.route].rewards[b.victim] || []).length)
    .map(b => row.route + '/' + b.victim))].sort();
  assert.ok(sources.length);
  for (const source of sources) assert.ok(M.cfg.event_tiers[source]);
  const tier = sources.map(source => M.cfg.event_tiers[source])
    .sort((a, b) => M.cfg.tiers[b].rank - M.cfg.tiers[a].rank)[0];
  const context = {seed: row.receipt.seed, index: row.receipt.index, route: row.route, tier, sources,
    card_bases: [...new Set(initial.unlocked.concat(history.flatMap(r => r.receipt.new_unlocks)))].sort()};
  return {evidence: 'pure_generation_from_recorded_return_context', context, candidates: M.generate(context)};
}

const first_returns = firstRows.map(row => {
  const checkpoint = au.natural_checkpoints.find(c => c.stage === 'first_clear' && c.offset === row.offset && c.first === row.first);
  const priorHash = ba.histories.find(h => h.offset === row.offset && h.first === row.first).prefix[0];
  assert.equal(checkpoint.next_run, 1);
  assert.deepEqual(checkpoint.learned, []);
  assert.deepEqual(row.learned, []);
  assert.equal(row.bought, null);
  assert.equal(row.sale_units, 0);
  assert.equal(row.unspent, row.receipt.gained_points);
  assert.equal(priorHash.row, row.label);
  assert.deepEqual(priorHash.receipt, row.receipt);
  assert.ok(!checkpoint.clears.includes('C'));
  return {id: row.label, offset: row.offset, first: row.first, return_index: row.index,
    source: 'au/results.json natural and natural_checkpoints', unspent_units: row.unspent * units,
    learned: {}, paid_learning_units: 0, refundable_units: 0, sale_units: row.sale_units,
    clears: checkpoint.clears, C_already_cleared: false,
    ordinary_purchase_funded: row.unspent * units >= M.cfg.price_units,
    refund_purchase_funded: row.unspent * units >= M.cfg.price_units,
    prior_BA_first_return_sha256: priorHash.saved_return_sha256,
    prior_hash_evidence: 'copied_from_BA_histories_prefix_0_not_reconstructed_by_BB',
    generated_offer: generatedOffer(row, [row])};
});

const branchRows = au.paired.filter(row => row.stage === 'first_clear' && ['A', 'B'].includes(row.route)
  && row.policy === 'progress_first' && row.deck === 'use_owned');
assert.equal(branchRows.length, 8);
const ab_branches = branchRows.map(row => {
  const first = firstRows.find(f => f.offset === row.offset && f.first === row.first);
  assert.deepEqual(row.learned, ['PS02']);
  assert.equal(row.outcome, 'clear');
  assert.equal(row.receipt.index, 1);
  const paid = learnedUnits(row.learned);
  const unspent = first.unspent * units - paid + row.receipt.gained_points * units;
  return {id: row.label, first_return_id: first.label, offset: row.offset, first: row.first, route: row.route,
    return_index: row.receipt.index, seed: row.seed, source: 'au/results.json paired',
    measurement_point: 'second_return_before_further_learning_purchase_or_sale',
    prior_unspent_units: first.unspent * units, preparation_learning_units: paid,
    recorded_gain_units: row.receipt.gained_points * units, unspent_units: unspent,
    learned: {PS02: AH.cfg.skills.PS02.cost}, paid_learning_units: paid, refundable_units: paid,
    C_already_cleared: false, ordinary_purchase_funded: unspent >= M.cfg.price_units,
    refund_purchase_funded: unspent + paid >= M.cfg.price_units,
    complete_saved_state_available_in_AU_results: false};
});

function inventoryFromReceipts(rows) {
  const inventory = {};
  for (const row of rows) {
    const r = row.receipt;
    assert.equal(r.kept.length, r.kept_blueprints.length);
    r.kept.forEach((uid, i) => {
      assert.ok(!Object.hasOwn(inventory, uid));
      const [version, kind, base, ...affixes] = r.kept_blueprints[i].split(':');
      assert.equal(version, 'AO1');
      const blueprint = AO.blueprint(kind, base, affixes);
      assert.equal(blueprint.key, r.kept_blueprints[i]);
      inventory[uid] = {uid, blueprint};
    });
  }
  return inventory;
}

const opposite_route_entries = branchRows.filter(row => row.first !== row.route).map(row => {
  const first = firstRows.find(f => f.offset === row.offset && f.first === row.first);
  const funds = ab_branches.find(b => b.id === row.label);
  const generated_offer = generatedOffer(row, [first, row]);
  const inventory = inventoryFromReceipts([first, row]);
  assert.equal(funds.unspent_units, 300);
  assert.equal(funds.paid_learning_units, 200);
  const afterPurchase = funds.unspent_units + funds.refundable_units - M.cfg.price_units;
  assert.equal(afterPurchase, 100);
  const candidate_checks = generated_offer.candidates.map(candidate => {
    const blueprint = candidate.blueprint;
    const hypothetical_uid = JSON.stringify(['AT1', 'offer-' + row.receipt.run, candidate.id]);
    if (blueprint.kind === 'passive') {
      const baseAffordable = afterPurchase >= AH.cfg.skills[blueprint.base].cost * units;
      assert.equal(baseAffordable, false);
      return {id: candidate.id, key: blueprint.key, hypothetical_uid, selected: false,
        reason: 'refunded_learning_empty_and_remaining_1pt_cannot_learn_2pt_base'};
    }
    const projected = {...inventory, [hypothetical_uid]: {uid: hypothetical_uid, blueprint}};
    const deck = U.chooseDeck({inventory: projected}, 'C', 'use_owned');
    const selected = deck.includes('owned:' + hypothetical_uid);
    return {id: candidate.id, key: blueprint.key, hypothetical_uid, selected,
      reason: selected ? 'purchased_uid_selected_by_pure_chooseDeck' : 'purchased_uid_not_selected_by_pure_chooseDeck',
      selected_owned: deck.filter(id => id.startsWith('owned:')).map(id => {
        const uid = id.slice(6); return {uid, key: projected[uid].blueprint.key};
      })};
  });
  const selected = candidate_checks.find(c => c.selected) || null;
  return {...funds, generated_offer, inventory_evidence: 'kept_UID_and_blueprint_pairs_from_first_and_second_return_receipts',
    inventory: Object.values(inventory), candidate_checks,
    selection_evidence: 'pure_chooseDeck_projection_not_complete_preparation_or_combat',
    selected_candidate_id: selected?.id || null, selected_candidate_key: selected?.key || null,
    diagnostic_decision: selected ? 'refund_and_purchase_candidate' : 'skip',
    hypothetical_refund_purchase_remaining_units: afterPurchase,
    hypothetical_refund_purchase_learned: {}, next_C_seed_if_continued: C.seeds[row.offset + 2].seed};
});
assert.deepEqual(opposite_route_entries.map(e => e.selected_candidate_key), [null, 'AO1:card:brace:light', 'AO1:card:read:sturdy', null]);
const natural_next_returns = au.natural.filter(row => row.index === 1).map(row => ({id: row.label, route: row.route, outcome: row.outcome}));
assert.equal(natural_next_returns.length, 4);
assert.ok(natural_next_returns.every(row => row.route === 'C' && row.outcome === 'clear'));
assert.ok(ba.histories.every(h => h.C_already_cleared));

const sourcePaths = ['docs/検証/構築と探索/au/results.json', 'docs/検証/構築と探索/au/study.cjs',
  'docs/検証/構築と探索/au/session.cjs', 'docs/検証/構築と探索/au/conditions.json',
  'docs/検証/構築と探索/ba/results.json', 'docs/検証/資源用途/at/offers.cjs', 'docs/検証/資源用途/at/conditions.json',
  'docs/検証/装備制限/ar/common.cjs', 'docs/検証/装備制限/ar/session.cjs', 'docs/検証/装備制限/ar/conditions.json',
  'docs/検証/装備制限/aq/equipment.cjs', 'docs/検証/修飾/ao/affixes.cjs', 'docs/検証/修飾/ao/conditions.json',
  'docs/検証/統合試作/deck_feedback_trial/expedition_choices.js',
  'docs/検証/統合試作/deck_feedback_trial/reward_build_inputs.py',
  'docs/検証/統合試作/deck_feedback_trial/reward_build_inputs.json'];
const result = {trial: 'BB1', input_base_commit: '7b288fe2df44ceabb598de4e90e97f80407f865e',
  scope: 'frozen_result_reading_and_pure_calculation', new_combat_runs: 0, replayed_combat_runs: 0,
  units_per_point: units, candidate_price_units: M.cfg.price_units,
  source_hashes: Object.fromEntries(sourcePaths.map(p => [p, digest(p)])),
  first_returns, ab_branches, opposite_route_entries, natural_next_returns,
  summary: {first_returns: 4, first_return_funded_purchases: 0, recorded_AB_fund_branches: 8,
    opposite_route_entries: 4, opposite_route_ordinary_purchase_funded: 0,
    opposite_route_refund_purchase_funded: 4, pure_selected_purchase_candidates: 2, skips: 2,
    A_to_A_ordinary_purchase_funded: ab_branches.filter(b => b.first === 'A' && b.route === 'A' && b.ordinary_purchase_funded).length,
    BA_entries_already_C_cleared: ba.histories.length},
  limitations: [
    'Offer contexts are derived from AU seed/index/completed boundaries/unlocks; candidates are M.generate output, not saved actual return offers.',
    'Deck checks use receipt-derived inventory and hypothetical purchase UIDs; they do not restore complete saved states or run preparation sessions.',
    'Fund and refund amounts are arithmetic under fixed existing costs; no purchase, refund, sale or combat was executed.',
    'BA first-return hashes are copied existing evidence; BB does not reproduce or verify those saved states.',
    'Existing AU paired results do not contain complete second-return saves or their state hashes.',
    'Candidate selection does not demonstrate C performance, purchase effectiveness, optimality or player experience.'
  ]};
const serialized = JSON.stringify(result, null, 2) + '\n';
const output = path.join(__dirname, 'results.json');
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(output, 'utf8'), serialized);
else fs.writeFileSync(output, serialized);
console.log(JSON.stringify({trial: result.trial, new_combat_runs: 0, replayed_combat_runs: 0, ...result.summary}));
