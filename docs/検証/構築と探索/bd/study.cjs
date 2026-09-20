'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), P = require('./preview.cjs'), cfg = require('./conditions.json');
const manifests = require('../bc/checkpoints-manifest.json'), old = require('../bc/results.json');
const {Q, M, AR, copy} = U;
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const fileHash = p => sha(fs.readFileSync(p).toString());
const unit = U.AP.cfg.units_per_point;
const funds = e => e.profile.points * unit + e.remainder;
const repo = path.resolve(__dirname, '../../../..');
const oldPaths = [...new Set([...Object.keys(require.cache).filter(p => p.startsWith(repo + path.sep) && !p.startsWith(__dirname + path.sep)),
  ...['conditions.json', 'study.cjs', 'results.json', 'checkpoints-manifest.json', 'verification.json', '検討結果.md'].map(p => path.resolve(__dirname, '../bc', p)),
  ...['conditions.json', 'study.cjs', 'results.json', 'verification.json', '検討結果.md'].map(p => path.resolve(__dirname, '../ba', p)),
  path.resolve(repo, 'docs/検証/統合試作/deck_feedback_trial/reward_build_inputs.py')])].sort();
const sourceHashes = Object.fromEntries(oldPaths.map(p => [path.relative(repo, p), fileHash(p)]));
const checks = {snapshot_hashes: 0, bc_prepared_matches: 0, bc_economy_stage_matches: 0, bc_payment_matches: 0,
  repeated_preview_equal: 0, input_and_plan_unchanged: 0, hidden_payload_invariance: 0, current_view_hidden_invariance: 0,
  unordered_composition_invariance: 0, rejected_plans: 0, explicit_legal_boundary_plans: 0,
  historical_fee_refund: 0, candidate_skips_are_not_prohibitions: 0, no_output_secrets: 0,
  complete_free_card_options: 0, historical_operation_collision: 0,
  purchase_pairs: 0, skipped_pairs: 0, skipped_prepared_equal: 0, combat_calls: 0};
// Catch accidental execution, including through an inherited Session method.
for (const proto of [U.Session.prototype, M.Session.prototype, AR.Session.prototype]) {
  for (const method of ['depart', 'action']) proto[method] = () => { checks.combat_calls++; throw Error('Forbidden combat in BD'); };
}
function handleMap(snapshot, purchaseUid = null) {
  const out = new Map(Object.keys(snapshot.economy.inventory).sort().map((uid, i) => [uid, 'owned-' + (i + 1)]));
  if (purchaseUid) out.set(purchaseUid, '$purchase');
  return out;
}
const publicId = (id, map) => id.startsWith('base:') ? id : map.get(id.slice(6));
const publicBp = bp => ({kind: bp.kind, base: bp.base, affixes: bp.affixes, key: bp.key});
const learnedRows = learned => Object.keys(learned).sort().map(base => ({base, paid_units: learned[base] * unit}));
function economyExpected(e) { return {unspent_units: e.unspent_units, paid_learning_units: e.paid_learning_units, learned: learnedRows(e.learned)}; }
function deckExpected(rows, map) {
  const groups = new Map();
  rows.forEach(row => {const id = publicId(row.id, map), r = groups.get(id) || {id, blueprint: publicBp(row.blueprint), count: 0};r.count++;groups.set(id, r);});
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}
// This fixture builder explicitly requests the old AR/AU C preparation. It is
// study-only, never an exported recommendation or preview policy.
function fixturePlan(snapshot, policy, candidate) {
  const cancel = policy === 'refund_acquisition_first' && candidate !== null;
  let e = copy(snapshot.economy), purchaseUid = null;
  const retained = cancel ? [] : Object.keys(e.profile.learned), canceled = cancel ? Object.keys(e.profile.learned) : [];
  e = Q.learn(e, retained);
  if (candidate !== null) {
    const batch = M.view(e); e = M.purchase(e, batch.id, candidate, 'BD-study-explicit');
    purchaseUid = e.at.purchases['BD-study-explicit'].uid;
  }
  const prepared = AR.equipForRoute(e, 'C', 'adapt'), ids = U.chooseDeck(prepared, 'C', 'use_owned');
  const map = handleMap(snapshot, purchaseUid);
  return {retain_learning: retained, cancel_learning: canceled, candidate,
    purchase_timing: policy === 'learning_first' ? 'after_preparation' : 'before_preparation',
    next_preparation: {learn: Object.keys(prepared.profile.learned).filter(base => !Object.hasOwn(e.profile.learned, base)),
      equipment: prepared.aq.equipped.map(id => publicId(id, map)), deck: ids.map(id => publicId(id, map))}};
}
function assertNoSecrets(value) {
  const forbidden = /^(seed|rng|random|random_state|game|bundle|receipts|stats|active|nextRun|knowledge|outcome|win|loss|hp|time|decisions|trace|context|signature|uid|run|tag|sha256|state)$/i;
  function walk(x) {if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) {assert(!forbidden.test(k), 'Nonpublic key ' + k); walk(v);}}
  walk(value); assert(!JSON.stringify(value).includes('AR1-au-natural')); checks.no_output_secrets++;
}
function hiddenVariant(snapshot) {
  const out = copy(snapshot);
  // The current legal home projection and fixed real offer remain unchanged.
  // No past-game restoration or future candidate regeneration is performed.
  out.active = {run: 'hidden-run', route: 'C', index: 998, seed: 918273};
  out.nextRun = 999; out.stats = {hidden: 'changed'};
  out.receipts = [{outcome: 'defeat', hp: -999, seed: 812, decisions: ['hidden']}];
  out.game = {state: {rng: 919, seed: 192, actors: {P: {deck: ['z', 'a'], hand: ['secret']}, E1: {hand: ['private'], deck: ['y', 'x']}}, outcome: 'defeat'}};
  out.bundle = {initial: {state: {seed: 888, secret: 'changed'}}, enemy_private: ['hidden']};
  out.economy.profile.knowledge = {hidden: 'changed'};
  out.economy.runs = {hidden: {receipt: {outcome: 'defeat'}}};
  return out;
}
function evaluate(snapshot, plan) {
  const before = sha(snapshot), planBefore = sha(plan), result = P.preview(snapshot, plan);
  assert.deepEqual(P.preview(snapshot, plan), result); checks.repeated_preview_equal++;
  assert.equal(sha(snapshot), before); assert.equal(sha(plan), planBefore); checks.input_and_plan_unchanged++;
  assert(Object.isFrozen(result)); assertNoSecrets(result);
  return result;
}
const fixtures = [];
for (const id of cfg.sources.checkpoint_ids) {
  const snapshot = manifests.snapshots[id], checkpoint = manifests.checkpoints.find(x => x.id === id);
  assert.equal(sha(snapshot), checkpoint.saved_state_sha256); checks.snapshot_hashes++;
  assert.deepEqual(P.inspect(hiddenVariant(snapshot)), P.inspect(snapshot)); checks.current_view_hidden_invariance++;
  assertNoSecrets(P.inspect(snapshot));
  const specified = require('../bc/conditions.json').reconstruction.checkpoints.find(x => x.offset + '-' + x.first === id).expected_refund_choice;
  for (const policy of ['learning_first', 'refund_acquisition_first']) {
    const candidate = policy === 'learning_first' ? null : specified;
    const plan = fixturePlan(snapshot, policy, candidate), view = evaluate(snapshot, plan);
    assert(view.ok, JSON.stringify(view.refusal));
    const row = old.branches.find(x => x.history === id && x.policy === policy), map = handleMap(snapshot, row.purchase?.uid);
    assert.deepEqual(view.current.economy, economyExpected(row.before));
    assert.deepEqual(view.candidate_consideration.economy, economyExpected(row.choice_input));
    assert.deepEqual(view.stages.before_purchase, economyExpected(row.before_purchase));
    assert.deepEqual(view.stages.after_purchase, economyExpected(row.after_purchase));
    assert.deepEqual(view.stages.prepared, economyExpected(row.prepared));
    const cancellationExpected = row.refund?.after || row.before;
    assert.deepEqual(view.stages.after_cancellation, economyExpected(cancellationExpected)); checks.bc_economy_stage_matches++;
    assert.deepEqual(view.prepared.equipment.entries, row.prepared.equipment.map(x => ({id: publicId(x.id, map), blueprint: publicBp(x.blueprint), cost: x.cost})));
    assert.deepEqual(view.prepared.deck.composition, deckExpected(row.prepared.deck, map));
    assert.equal(view.prepared.deck.size, 12); assert.equal(view.prepared.equipment.capacity, 8); assert(view.prepared.equipment.legal);
    assert(view.differences.existing_possessions_preserved); checks.bc_prepared_matches++;
    assert.equal(view.cancellation.actual_refund_units, row.learning_payment.explicit_refund_units);
    assert.equal(view.purchase.cost_units, row.purchase?.units || 0);
    assert.equal(view.purchase.selected_in_preparation, row.bought_selected_at_departure);
    assert.equal(view.learning.payment_units, row.learning_payment.new_learning_units + row.learning_payment.relearning_units);
    assert.deepEqual(view.learning.newly_learned, row.learning_payment.newly_learned_bases);
    assert.deepEqual(view.learning.relearned, row.learning_payment.relearned_bases); checks.bc_payment_matches++;
    assert.deepEqual(P.preview(hiddenVariant(snapshot), plan), view); checks.hidden_payload_invariance++;
    const reordered = copy(snapshot); reordered.au.deck.reverse();
    assert.deepEqual(P.preview(reordered, plan), view); checks.unordered_composition_invariance++;
    fixtures.push({checkpoint: id, policy_fixture: policy, historical_purchase_or_skip: candidate ? 'purchase' : 'skip',
      plan, display_data: view});
  }
  const pair = fixtures.slice(-2);
  if (specified) checks.purchase_pairs++;
  else {checks.skipped_pairs++; assert.deepEqual(pair[0].display_data.prepared, pair[1].display_data.prepared); checks.skipped_prepared_equal++;}
}
const boundaryRows = [];
function boundary(name, snapshot, plan, expected, code = null, verify = () => {}) {
  const view = evaluate(snapshot, plan); assert.equal(view.ok, expected, name + ': ' + JSON.stringify(view.refusal));
  if (code) assert.equal(view.refusal.code, code, name);
  if (expected) checks.explicit_legal_boundary_plans++; else {checks.rejected_plans++; assert(view.draft_discarded); assert(!view.prepared); assert(!view.stages);}
  verify(view); boundaryRows.push({name, expected_ok: expected, plan, display_data: view}); return view;
}
function keepPlan(snapshot) {
  const current = P.inspect(snapshot);
  return {retain_learning: current.economy.learned.map(x => x.base), cancel_learning: [], candidate: null,
    purchase_timing: 'before_preparation', next_preparation: {learn: [], equipment: current.equipment.entries.map(x => x.id),
      deck: current.deck.composition.flatMap(x => Array(x.count).fill(x.id))}};
}
for (const id of cfg.sources.checkpoint_ids) {
  const snapshot = manifests.snapshots[id], plan = keepPlan(snapshot); plan.candidate = 'choice-0';
  boundary(id + '-purchase-only-underfunded', snapshot, plan, false, 'insufficient_unspent_funds', v => {
    assert.equal(v.refusal.purchase_request.price_units, 400); assert.equal(v.refusal.purchase_request.shortage_units, 100);
  });
}
const snapshot = manifests.snapshots['0-B'];
const cancelOnly = keepPlan(snapshot); cancelOnly.retain_learning = []; cancelOnly.cancel_learning = ['PS02']; cancelOnly.next_preparation.equipment = [];
boundary('explicit-cancel-only', snapshot, cancelOnly, true, null, v => {assert.equal(v.cancellation.actual_refund_units, 200);assert.equal(v.prepared.economy.unspent_units, 500);assert.equal(v.purchase.cost_units, 0);assert.equal(v.prepared.owned.length, 5);});
const passive = copy(cancelOnly); passive.candidate = 'choice-0';
boundary('buy-passive-while-unlearned-owned-but-unavailable', snapshot, passive, true, null, v => {assert.equal(v.prepared.economy.unspent_units, 100);assert.equal(v.prepared.owned.find(x => x.id === '$purchase').eligible, false);assert.equal(v.purchase.selected_in_preparation, false);});
const badPassive = copy(passive); badPassive.next_preparation.equipment = ['$purchase'];
boundary('cannot-equip-unlearned-passive', snapshot, badPassive, false, 'unlearned_equipment_base');
const badPartition = keepPlan(snapshot); badPartition.retain_learning = [];
boundary('no-implicit-cancellation-from-omitted-base', snapshot, badPartition, false, 'learning_partition_required');
const duplicateCard = keepPlan(snapshot); const ownedCard = duplicateCard.next_preparation.deck.find(x => x.startsWith('owned-')); duplicateCard.next_preparation.deck[0] = ownedCard; duplicateCard.next_preparation.deck[1] = ownedCard;
boundary('same-owned-card-cannot-be-selected-twice', snapshot, duplicateCard, false, 'duplicate_owned_card');
const tooMany = keepPlan(snapshot); tooMany.next_preparation.deck.push('base:f');
boundary('deck-size-limit', snapshot, tooMany, false);
const perBase = keepPlan(snapshot); perBase.next_preparation.deck[perBase.next_preparation.deck.findIndex(x => x === 'base:g')] = 'base:f';
boundary('deck-per-base-limit', snapshot, perBase, false);
const capacity = keepPlan(snapshot); capacity.next_preparation.equipment = ['base:PS02', ...P.inspect(snapshot).owned.filter(x => x.blueprint.kind === 'passive' && x.blueprint.base === 'PS02').map(x => x.id)];
boundary('equipment-capacity-limit', snapshot, capacity, false, 'equipment_capacity_exceeded');
const afterLearning = fixturePlan(snapshot, 'learning_first', null); afterLearning.candidate = 'choice-1';
boundary('purchase-after-learning-is-underfunded', snapshot, afterLearning, false, 'insufficient_unspent_funds');
const wrongLearning = keepPlan(snapshot); wrongLearning.next_preparation.learn = ['PS01', 'PS03'];
boundary('learning-budget-limit', snapshot, wrongLearning, false, 'insufficient_learning_funds');
const relearn = copy(cancelOnly); relearn.next_preparation.learn = ['PS02']; relearn.next_preparation.equipment = ['base:PS02'];
boundary('explicit-cancel-then-relearn', snapshot, relearn, true, null, v => {assert.equal(v.cancellation.actual_refund_units, 200);assert.equal(v.learning.payment_units, 200);assert.deepEqual(v.learning.relearned, ['PS02']);assert.equal(v.prepared.economy.unspent_units, 300);});
const historic = copy(snapshot); historic.economy.profile.learned.PS02 = 3;
boundary('historical-payment-refund-is-actual-300', historic, cancelOnly, true, null, v => {assert.equal(v.cancellation.actual_refund_units, 300);assert.equal(v.prepared.economy.unspent_units, 600);checks.historical_fee_refund++;});
const humanSnapshot = manifests.snapshots['8-B'], human = keepPlan(humanSnapshot);
human.retain_learning = []; human.cancel_learning = ['PS02']; human.candidate = 'choice-0'; human.next_preparation.equipment = [];
human.next_preparation.deck[human.next_preparation.deck.indexOf('base:salve')] = '$purchase';
boundary('BC-skip-does-not-forbid-human-owned-salve-build', humanSnapshot, human, true, null, v => {assert(v.purchase.selected_in_preparation);assert.equal(v.prepared.economy.unspent_units, 100);checks.candidate_skips_are_not_prohibitions++;});
const freeCard = keepPlan(snapshot); freeCard.next_preparation.deck[freeCard.next_preparation.deck.indexOf('base:g')] = 'base:j';
assert(P.inspect(snapshot).free_card_options.includes('base:j'));
boundary('legal-free-card-absent-from-initial-deck-is-selectable', snapshot, freeCard, true, null, v => {
  assert(v.prepared.deck.composition.some(x => x.id === 'base:j')); checks.complete_free_card_options++;
});
const collision = copy(snapshot), currentBatch = collision.economy.at.current;
collision.economy.profile.points = 10;
collision.economy.at.current = Object.keys(collision.economy.at.batches).find(id => id !== currentBatch);
collision.economy = M.purchase(collision.economy, collision.economy.at.current, 'choice-0', 'BD-preview-purchase');
collision.economy.at.current = currentBatch;
const collisionPlan = keepPlan(collision); collisionPlan.candidate = 'choice-1';
boundary('historical-operation-name-does-not-block-new-copy-purchase', collision, collisionPlan, true, null, v => {
  assert.equal(v.purchase.cost_units, 400); assert.equal(v.prepared.economy.unspent_units, 200); checks.historical_operation_collision++;
});
assert.equal(checks.combat_calls, 0); assert.equal(checks.bc_prepared_matches, 8); assert.equal(checks.purchase_pairs, 2); assert.equal(checks.skipped_pairs, 2);
for (const [p, hash] of Object.entries(sourceHashes)) assert.equal(fileHash(path.join(repo, p)), hash, 'Changed old source ' + p);
const summary = fixtures.map(x => {const v = x.display_data; return {checkpoint: x.checkpoint, policy_fixture: x.policy_fixture,
  purchase_timing: v.purchase_timing, candidate_consideration_unspent_units: v.candidate_consideration.economy.unspent_units,
  before_purchase_unspent_units: v.purchase.funds_before_purchase_units,
  refund_units: v.cancellation.actual_refund_units, purchase_units: v.purchase.cost_units,
  learning_payment_units: v.learning.payment_units, final_unspent_units: v.prepared.economy.unspent_units,
  final_paid_learning_units: v.prepared.economy.paid_learning_units,
  equipment_used: v.prepared.equipment.used, equipment_capacity: v.prepared.equipment.capacity,
  deck_size: v.prepared.deck.size, selected_purchase: v.purchase.selected_in_preparation};});
const refs = manifests.checkpoints.map(x => ({id: x.id, path: '../bc/checkpoints-manifest.json', pointer: '/snapshots/' + x.id, saved_state_sha256: x.saved_state_sha256}));
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({trial: cfg.trial, base_commit: cfg.base_commit,
  display_boundary: 'Only display_data is a public UI payload; fixture labels, hashes and BC provenance are verification metadata.',
  snapshot_references: refs, checks, summary, fixtures, boundary_cases: boundaryRows}, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({trial: cfg.trial, status: 'passed',
  new_combat_runs: 0, legacy_study_reruns: 0, checks, unchanged_source_files: sourceHashes,
  artifacts: Object.fromEntries(['conditions.json', 'preview.cjs', 'study.cjs', 'results.json'].map(p => [p, fileHash(path.join(__dirname, p))]))}, null, 2) + '\n');
console.log(JSON.stringify({trial: cfg.trial, status: 'passed', checks, summary}, null, 2));
