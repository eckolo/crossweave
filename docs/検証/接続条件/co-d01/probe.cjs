'use strict';
// CO-D01 only: lower-level operations on copies, never a production controller.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const root = path.resolve(__dirname, '../../../..'), read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const digest = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const fileHash = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const conditions = read('docs/検証/接続条件/co-d01/conditions.json');
function fixedSources() { for (const [p, hash] of Object.entries(conditions.sources)) assert.equal(fileHash(p), hash, p); }
fixedSources();
const verificationPath = path.join(__dirname, 'verification.json');
if (fs.existsSync(verificationPath)) {
  const v = JSON.parse(fs.readFileSync(verificationPath));
  for (const [p, hash] of Object.entries(v.artifacts)) assert.equal(fileHash(p), hash, p);
  process.stdout.write(JSON.stringify({check_only: true, passed: true, battles: 0}) + '\n');
  process.exit(0);
}
assert(!process.argv.includes('--check'), 'No completed record to check');
const U = require('../../構築と探索/au/session.cjs'), BD = require('../../構築と探索/bd/preview.cjs');
const {M, Q, AP, copy} = U;
const before = read('docs/検証/構築と探索/bc/checkpoints-manifest.json').snapshots['0-B'];
const savedHash = digest(before);
const bd = read('docs/検証/構築と探索/bd/results.json');
const fixture = bd.fixtures.find(f => f.checkpoint === '0-B' && f.policy_fixture === 'refund_acquisition_first');
assert(fixture?.display_data.ok);
const s = new U.Session(U.C.seeds, before.tag, before);
assert.deepEqual(s.save(), before);
s.collect(); s.collect(); assert.deepEqual(s.save(), before);
const restored = new U.Session(U.C.seeds, before.tag, JSON.parse(JSON.stringify(s.save())));
assert.deepEqual(restored.save(), before);
restored.home();
assert.equal(restored.data.phase, 'home'); assert.equal(restored.game, null);
assert.deepEqual(restored.data.economy, before.economy);
assert.equal(restored.data.nextRun, before.nextRun);
const current = BD.inspect(restored.save()); assert(current.ok);
const plan = copy(fixture.plan), uidByHandle = Object.fromEntries(Object.keys(before.economy.inventory).sort().map((uid, i) => ['owned-' + (i + 1), uid]));
// Q/M APIs return a copy. Direct installation below is a probe, not atomic durable application.
const canceled = Q.learn(restored.data.economy, plan.retain_learning);
const bought = M.purchase(canceled, canceled.at.current, plan.candidate, 'CO-D01-purchase-1');
assert.deepEqual(M.purchase(bought, canceled.at.current, plan.candidate, 'CO-D01-purchase-1'), bought);
const purchaseUid = bought.at.purchases['CO-D01-purchase-1'].uid;
const resolve = id => id === '$purchase' ? 'owned:' + purchaseUid : id.startsWith('owned-') ? 'owned:' + uidByHandle[id] : id;
restored.data.economy = Q.equip(Q.learn(bought, [...plan.retain_learning, ...plan.next_preparation.learn]), plan.next_preparation.equipment.map(resolve));
restored.setDeck(plan.next_preparation.deck.map(resolve));
const applied = BD.inspect(restored.save()); assert(applied.ok);
const p = fixture.display_data.prepared;
assert.deepEqual(applied.economy, p.economy);
assert.equal(applied.equipment.used, p.equipment.used);
assert.deepEqual(applied.deck.base_counts, p.deck.base_counts);
assert.equal(applied.owned.length, p.owned.length);
assert.deepEqual(applied.owned.map(x => x.blueprint.key).sort(), p.owned.map(x => x.blueprint.key).sort());
const reload = new U.Session(U.C.seeds, before.tag, JSON.parse(JSON.stringify(restored.save())));
assert.deepEqual(reload.save(), restored.save());
const referenced = new Set(Object.values(reload.data.economy.references));
const saleUid = Object.keys(reload.data.economy.inventory).sort().find(uid => !referenced.has(uid) && !reload.data.economy.inventory[uid].locked);
assert(saleUid);
const quote = AP.quote(reload.data.economy, [saleUid]);
const sold = AP.sell(reload.data.economy, 'CO-D01-sale-1', [saleUid]);
assert.deepEqual(AP.sell(sold, 'CO-D01-sale-1', [saleUid]), sold);
assert(!sold.inventory[saleUid]); assert(reload.data.economy.inventory[saleUid]);
const initial = new U.Session(U.C.seeds, 'CO-D01-empty');
const empty = BD.inspect(initial.save()); assert(empty.ok); assert.deepEqual(empty.candidates, []);
assert.equal(digest(before), savedHash); fixedSources();
const boundaryNames = ['0-B-purchase-only-underfunded', 'explicit-cancel-only', 'buy-passive-while-unlearned-owned-but-unavailable', 'cannot-equip-unlearned-passive', 'equipment-capacity-limit'];
const publicNames = ['insufficient_funds', 'cancel_only', 'purchase_unlearned', 'unlearned_equipment', 'capacity_limit'];
const receipt = before.receipts.at(-1);
const examples = {
  schema: 'CO-D01-existing-api-examples-1',
  status: '既存APIのコピー上で限定確認。新本体API・UI・永続保存・出発は未実行。BD比較は保存済みdisplay_dataを再利用。',
  source: {commit: conditions.base_commit, snapshot_path: conditions.input.snapshot, snapshot_sha256: savedHash},
  display_data: {
    empty_initial: empty, current_home: current, preparation_comparison: fixture.display_data,
    after_lower_level_application: applied,
    return_receipt: {outcome: receipt.outcome, gained_units: receipt.gained_points * AP.cfg.units_per_point,
      new_unlocks: receipt.new_unlocks, kept_count: receipt.kept.length, lost_count: receipt.lost.length,
      available_units: current.economy.unspent_units, paid_learning_units: current.economy.paid_learning_units},
    conversion: {quote_units: quote.units, units_before: applied.economy.unspent_units,
      units_after: sold.profile.points * AP.cfg.units_per_point + sold.remainder,
      point_gain: quote.point_gain, remainder_after: quote.remainder_after, removed_count: 1},
    boundaries: boundaryNames.map((name, i) => ({example_id: publicNames[i], result: bd.boundary_cases.find(x => x.name === name).display_data}))
  },
  // Research input only; the outer fields are not a display payload.
  explicit_plan: plan
};
fs.writeFileSync(path.join(__dirname, 'existing-api-examples.json'), JSON.stringify(examples, null, 2) + '\n');
const artifacts = ['conditions.json', 'probe.cjs', 'existing-api-examples.json'].map(x => 'docs/検証/接続条件/co-d01/' + x);
const v = {id: conditions.id, passed: true, base_commit: conditions.base_commit,
  checks: {fixed_sources: Object.keys(conditions.sources).length, restored_return_equal: true,
    repeated_collect_unchanged: 2, saved_return_restored_equal: true, home_preserves_economy: true,
    explicit_plan_matches_saved_bd: true, purchase_replay_unchanged: true,
    prepared_save_restored_equal: true, conversion_replay_unchanged: true,
    initial_empty_candidates: true, source_snapshot_unchanged: true},
  execution: {departures: 0, player_actions: 0, npc_actions: 0, old_study_reruns: 0,
    new_controller: false, browser_storage: false, ui: false},
  artifacts: Object.fromEntries(artifacts.map(p => [p, fileHash(p)]))};
fs.writeFileSync(verificationPath, JSON.stringify(v, null, 2) + '\n');
process.stdout.write(JSON.stringify({passed: true, return_units: current.economy.unspent_units,
  after_plan_units: applied.economy.unspent_units, conversion_units: quote.units, battles: 0}) + '\n');
