'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), cfg = require('./conditions.json'), fixed = require('../au/results.json');
const {M, C, AR, Q, AP, AO, AH, copy, Session} = U;
const sum = xs => xs.reduce((a, b) => a + b, 0);
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const units = e => e.profile.points * AP.cfg.units_per_point + e.remainder;
const fees = e => sum(Object.values(e.profile.learned)) * AP.cfg.units_per_point;
const total = e => units(e) + fees(e);
const root = 'docs/検証/統合試作/deck_feedback_trial/';
const sourcePaths = [...new Set([
  ...Object.keys(require.cache).filter(p => p.startsWith(C.repo + path.sep) && !p.startsWith(__dirname + path.sep)).map(p => path.relative(C.repo, p)),
  ...['posture_am/engine.js', 'expedition_choices.js', 'reward_preparation.js', 'expedition_loop.js', 'knowledge.js',
    'information.js', 'terrain.js', 'ecology.js', 'feedback.js', 'choice_inputs.json', 'loop_inputs.json',
    'reward_build_inputs.json', 'reward_build_inputs.py'].map(p => root + p)
])].sort();
const sourceHashes = Object.fromEntries(sourcePaths.map(p => [p, C.hash(path.join(C.repo, p))]));
const ownHashes = Object.fromEntries(['conditions.json', 'study.cjs'].map(p => [p, C.hash(path.join(__dirname, p))]));
const verification = {prefix_runs: 0, prefix_preparation_matches: 0, prefix_terminal_matches: 0, checkpoint_conditions: 0,
  prediction_checks: 0, candidate_copy_purity: 0, purchase_replays: 0, purchase_ownership_checks: 0,
  first_action_restores: 0, return_replays: 0, branch_ownership_checks: 0, unchanged_checkpoints: 0};
const histories = [], branches = [], manifests = [];

function preparation(e) {
  const out = AR.equipForRoute(e, cfg.comparison.route, 'adapt');
  return {economy: out, deck: U.chooseDeck(out, cfg.comparison.route, 'use_owned')};
}
function preparationView(s) {
  const e = s.data.economy;
  return {unspent_units: units(e), paid_learning_units: fees(e), learned: copy(e.profile.learned),
    equipment: e.aq.equipped.map(id => Q.resolve(e, id)), deck: U.canonical(e, s.data.au.deck)};
}
function candidateChoice(e, operation) {
  const before = sha(e), batch = M.view(e), evaluations = [];
  for (const c of batch?.candidates || []) {
    const affordable = !batch.purchased && units(e) >= c.price_units;
    const entry = {id: c.id, blueprint: copy(c.blueprint), price_units: c.price_units,
      purchase_affordable: affordable, already_owned_copies: Object.values(e.inventory).filter(x => x.blueprint.key === c.blueprint.key).length,
      learned_base_before: c.blueprint.kind === 'passive' ? Object.hasOwn(e.profile.learned, c.blueprint.base) : null,
      eligible_for_equipment_after_preparation: null, selected_in_preparation: false, role_ratio: null,
      reason: affordable ? null : batch.purchased ? 'offer_already_purchased' : 'insufficient_unspent_funds'};
    if (affordable) {
      const draft = M.purchase(e, batch.id, c.id, operation), uid = draft.at.purchases[operation].uid;
      const planned = preparation(draft);
      entry.learned_after_preparation = copy(planned.economy.profile.learned);
      entry.eligible_for_equipment_after_preparation = c.blueprint.kind === 'passive' ? Object.hasOwn(planned.economy.profile.learned, c.blueprint.base) : null;
      entry.selected_in_preparation = c.blueprint.kind === 'card' ? planned.deck.includes('owned:' + uid) : planned.economy.aq.equipped.includes('owned:' + uid);
      if (c.blueprint.kind === 'passive') entry.role_ratio = (C.cfg.journey.home_value.C[c.blueprint.base] + sum(c.blueprint.affixes.map(id => C.cfg.journey.affix_value[id]))) / Q.cost(c.blueprint);
      entry.reason = entry.selected_in_preparation ? 'selected_by_existing_preparation' :
        c.blueprint.kind === 'passive' && !entry.eligible_for_equipment_after_preparation ? 'unlearned_base_after_purchase' : 'not_selected_by_existing_preparation';
    }
    evaluations.push(entry);
  }
  assert.equal(sha(e), before, 'Candidate evaluation modified original economy'); verification.candidate_copy_purity++;
  const selected = evaluations.filter(x => x.purchase_affordable && x.selected_in_preparation).sort((a, b) =>
    (a.blueprint.kind === 'card' ? 0 : 1) - (b.blueprint.kind === 'card' ? 0 : 1) ||
    (a.blueprint.kind === 'passive' ? b.role_ratio - a.role_ratio : 0) || a.id.localeCompare(b.id))[0] || null;
  return {evaluations, chosen: selected?.id || null};
}
function oldPurchase(s, operation) {
  const e = s.data.economy, reserve = sum(Object.keys(AH.cfg.skills).filter(b => !Object.hasOwn(e.profile.learned, b)).map(b => AH.cfg.skills[b].cost * 100));
  const v = M.view(e), candidates = (v?.candidates || []).filter(c => !v.purchased && units(e) >= reserve + c.price_units &&
    (c.blueprint.kind === 'card' || Object.hasOwn(e.profile.learned, c.blueprint.base)));
  candidates.sort((a, b) => (a.blueprint.kind === 'card' ? 0 : 1) - (b.blueprint.kind === 'card' ? 0 : 1) || a.id.localeCompare(b.id));
  if (!candidates.length) return null;
  s.buy(candidates[0].id, operation); return copy(s.data.economy.at.purchases[operation]);
}
function step(s, choice) { s.action(choice); verification.prediction_checks++; }
function samePrefix(s, row) {
  assert.equal(s.data.active.seed, row.seed);
  assert.equal(s.game.s.outcome, row.outcome); assert.equal(s.game.s.actors.P.actions, row.actions);
  assert.equal(s.game.s.actors.P.hp, row.hp); assert.equal(s.game.s.now, row.time);
  assert.deepEqual(s.data.receipts.at(-1), row.receipt); assert.deepEqual(s.game.s.events, row.boundaries);
  verification.prefix_terminal_matches++;
}
function runBranch(saved, seeds, label, policy) {
  const checkpointHash = sha(saved), s = new Session(seeds, saved.tag, saved), initialEconomy = copy(s.data.economy);
  const before = {unspent_units: units(initialEconomy), paid_learning_units: fees(initialEconomy),
    refundable_learning_units: fees(initialEconomy), total_with_refundable_learning_units: total(initialEconomy),
    learned: copy(initialEconomy.profile.learned), inventory_sha256: sha(initialEconomy.inventory)};
  s.home();
  if (policy === 'learning_first') s.prepare('C');
  const actualPurchaseFunds = units(s.data.economy), beforePurchaseLearning = copy(s.data.economy.profile.learned);
  const operation = 'AY-purchase-' + policy, choice = candidateChoice(s.data.economy, operation);
  let purchase = null;
  if (choice.chosen) {
    const purchaseBefore = copy(s.data.economy); s.buy(choice.chosen, operation);
    purchase = copy(s.data.economy.at.purchases[operation]);
    assert.equal(units(s.data.economy), actualPurchaseFunds - purchase.units);
    assert.deepEqual(s.data.economy.profile.learned, beforePurchaseLearning, 'Purchase silently refunded learning');
    for (const [uid, item] of Object.entries(purchaseBefore.inventory)) assert.deepEqual(s.data.economy.inventory[uid], item);
    assert.equal(Object.keys(s.data.economy.inventory).length, Object.keys(purchaseBefore.inventory).length + 1);
    verification.purchase_ownership_checks++;
    const paid = s.save(); s.buy(choice.chosen, operation); assert.deepEqual(s.save(), paid); verification.purchase_replays++;
  }
  if (policy === 'acquisition_first' || purchase) s.prepare('C');
  const prepared = preparationView(s);
  assert.equal(total(s.data.economy), total(initialEconomy) - (purchase?.units || 0));
  assert.equal(prepared.deck.length, cfg.comparison.deck_size);
  assert(Q.assess(prepared.equipment).fits);
  const boughtSelected = purchase ? prepared.deck.some(x => x.uid === purchase.uid) || prepared.equipment.some(x => x.uid === purchase.uid) : false;
  assert.equal(boughtSelected, !!purchase, 'Chosen purchase did not enter the real preparation');
  const preparedHash = sha(s.save()), purchasedBlueprint = purchase ? copy(s.data.economy.inventory[purchase.uid].blueprint) : null;
  s.depart('C'); const launch = s.save(), nativeSeed = s.data.active.seed;
  let firstAction = true, replay = null;
  const decisions = [];
  while (!s.game.s.outcome) {
    const action = AH.choose(s.game, cfg.comparison.combat_policy.replace('AH.', ''));
    decisions.push(copy(action));
    if (firstAction) replay = new Session(seeds, saved.tag, s.save());
    step(s, action);
    if (firstAction) { replay.action(action); assert.deepEqual(replay.save(), s.save()); verification.first_action_restores++; firstAction = false; }
  }
  assert.notEqual(s.game.s.outcome, 'cutoff');
  const settled = s.save(); s.collect(); assert.deepEqual(s.save(), settled); verification.return_replays++;
  for (const [uid, item] of Object.entries(initialEconomy.inventory)) assert.deepEqual(s.data.economy.inventory[uid], item);
  if (purchase) assert.deepEqual(s.data.economy.inventory[purchase.uid].blueprint, purchasedBlueprint);
  verification.branch_ownership_checks++;
  assert.equal(sha(saved), checkpointHash); verification.unchanged_checkpoints++;
  const g = s.game, actions = g.trace.filter(x => x.type === 'action');
  const cardEntry = purchase ? g.s.au.entries.find(x => x.uid === purchase.uid) : null;
  const instance = cardEntry?.instance || null;
  const count = predicate => actions.filter(predicate).length;
  const player = actions.filter(x => x.actor === 'P');
  const passiveId = purchase && purchasedBlueprint.kind === 'passive' ? 'owned:' + purchase.uid : null;
  // The frozen AH trace keeps base IDs, not AQ instance IDs. A count can be
  // derived only when every equipped copy of that base has identical ungated
  // activation; otherwise retain a missing value rather than inventing zero.
  let passiveTriggers = 0, passiveTriggerBasis = 'not_a_purchased_passive';
  if (passiveId) {
    const sameBase = prepared.equipment.filter(x => x.base === purchasedBlueprint.base);
    const ungated = sameBase.every(x => x.blueprint.affixes.every(id => !AO.cfg.passive_affixes[id].gate));
    if (ungated) {
      passiveTriggers = s.data.receipts.at(-1).triggers[purchasedBlueprint.base] || 0;
      assert.equal(s.data.receipts.at(-1).instances[purchasedBlueprint.base] || 0, passiveTriggers * sameBase.length);
      passiveTriggerBasis = 'Derived from saved base-trigger actions and same-base instance total; all same-base equipped copies have no extra activation gate. Not an instance-ID trace measurement.';
    } else {
      passiveTriggers = null; passiveTriggerBasis = 'Unavailable: frozen action trace has no passive instance IDs and equipped copies may have different activation gates.';
    }
  }
  const usage = {purchased_card_instance: instance, player_card_uses_before_refill: instance ? count(x => x.actor === 'P' && x.card_id === instance && x.player_rebuilds === 0) : 0,
    player_card_uses_after_refill: instance ? count(x => x.actor === 'P' && x.card_id === instance && x.player_rebuilds > 0) : 0,
    npc_card_uses: instance ? count(x => x.actor !== 'P' && x.card_id === instance) : 0,
    player_field_material_uses: instance ? count(x => x.actor === 'P' && x.matched_id === instance) : 0,
    npc_field_material_uses: instance ? count(x => x.actor !== 'P' && x.matched_id === instance) : 0,
    purchased_passive_trigger_count: passiveTriggers, purchased_passive_trigger_basis: passiveTriggerBasis,
    player_usage_examples: instance ? player.filter(x => x.card_id === instance || x.matched_id === instance).slice(0, 3).map(x => ({mode: x.mode, target: x.target, player_rebuilds: x.player_rebuilds, actual_hp_loss: x.actual_hp_loss, hit_gain: x.hit_gain, hp_restored: x.hp_restored})) : []};
  return {id: label + '-' + policy, history: label, policy, native_seed: nativeSeed, before,
    actual_before_purchase_unspent_units: actualPurchaseFunds, before_purchase_learning: beforePurchaseLearning,
    candidates: choice.evaluations, chosen: choice.chosen, purchase, purchased_blueprint: purchasedBlueprint,
    bought_selected_at_departure: boughtSelected, prepared, preparation_sha256: preparedHash, launch_sha256: sha(launch),
    usage, outcome: g.s.outcome, actions: g.s.actors.P.actions, hp: g.s.actors.P.hp, time: g.s.now,
    receipt: copy(s.data.receipts.at(-1)), decisions, final_saved_sha256: sha(s.save())};
}

for (const checkpoint of cfg.reconstruction.checkpoints) {
  const {offset, first, return_index: endIndex} = checkpoint;
  const seeds = C.seeds.slice(offset).concat(C.seeds.slice(0, offset)), tag = 'au-natural-' + offset + '-' + first;
  const s = new Session(seeds, tag), prefix = [];
  for (let index = 0; index <= endIndex; index++) {
    const row = fixed.natural.find(r => r.offset === offset && r.first === first && r.index === index);
    s.prepare(row.route);
    assert.deepEqual(Object.keys(s.data.economy.profile.learned), row.learned);
    assert.deepEqual(s.data.economy.aq.equipped, row.equipped);
    assert.deepEqual(U.canonical(s.data.economy, s.data.au.deck).filter(x => x.uid !== null).map(x => x.blueprint), row.selected_blueprints);
    verification.prefix_preparation_matches++;
    s.depart(row.route); const decisions = [];
    while (!s.game.s.outcome) { const action = AH.choose(s.game, 'progress_first'); decisions.push(copy(action)); step(s, action); }
    samePrefix(s, row); verification.prefix_runs++;
    prefix.push({row: row.label, decisions, saved_return_sha256: sha(s.save()), receipt: copy(s.data.receipts.at(-1))});
    if (index < endIndex) {
      const bought = oldPurchase(s, 'buy-' + index); assert.deepEqual(bought, row.bought);
      s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'sale-' + index);
      assert.equal(units(s.data.economy), Math.round(row.unspent * 100));
      assert.equal(Object.keys(s.data.economy.inventory).length, row.total_owned);
    }
  }
  const saved = s.save(), offered = M.view(saved.economy), label = offset + '-' + first;
  assert.equal(units(saved.economy), 400); assert(Object.keys(saved.economy.profile.learned).length < 4);
  assert(offered && !offered.purchased); assert(saved.economy.profile.clears.includes('C'));
  verification.checkpoint_conditions++;
  histories.push({id: label, ...checkpoint, prefix, checkpoint_sha256: sha(saved), economy_sha256: sha(saved.economy),
    unspent_units: units(saved.economy), paid_learning_units: fees(saved.economy), learned: copy(saved.economy.profile.learned),
    offer: copy(offered), inventory: copy(saved.economy.inventory), next_run: saved.nextRun});
  manifests.push({id: label, ...checkpoint, saved_state_sha256: sha(saved), economy_sha256: sha(saved.economy),
    reconstruction: 'Replay the saved prefix with the unchanged AU tag and seed rotation; stop before target-return purchase/surplus conversion.'});
  for (const policy of cfg.comparison.policies) {
    const branch = runBranch(saved, seeds, label, policy); assert.equal(branch.native_seed, checkpoint.next_seed); branches.push(branch);
  }
  process.stdout.write('AY ' + label + ': prefix and two branches complete\n');
}
assert.equal(branches.length, cfg.comparison.expected_runs);
for (const [p, hash] of Object.entries(sourceHashes)) assert.equal(C.hash(path.join(C.repo, p)), hash, 'Changed source during study: ' + p);
const pairs = histories.map(h => {
  const a = branches.find(x => x.history === h.id && x.policy === 'learning_first'), b = branches.find(x => x.history === h.id && x.policy === 'acquisition_first');
  assert.equal(a.native_seed, b.native_seed); assert.deepEqual(a.before, b.before);
  return {history: h.id, seed: a.native_seed, learning_first: {outcome: a.outcome, actions: a.actions, hp: a.hp, time: a.time},
    acquisition_first: {outcome: b.outcome, actions: b.actions, hp: b.hp, time: b.time},
    actions_difference_if_both_clear: a.outcome === 'clear' && b.outcome === 'clear' ? b.actions - a.actions : null};
});
const summary = Object.fromEntries(cfg.comparison.policies.map(policy => {
  const rows = branches.filter(x => x.policy === policy);
  return [policy, {runs: rows.length, clear: rows.filter(x => x.outcome === 'clear').length, defeat: rows.filter(x => x.outcome === 'defeat').length,
    purchased: rows.filter(x => x.purchase).length, selected_purchases: rows.filter(x => x.bought_selected_at_departure).length,
    player_purchased_card_uses: sum(rows.map(x => x.usage.player_card_uses_before_refill + x.usage.player_card_uses_after_refill)),
    npc_purchased_card_uses: sum(rows.map(x => x.usage.npc_card_uses))}];
}));
const results = {trial: cfg.trial, base_commit: cfg.base_commit, execution_head: cfg.execution_head,
  source_hashes: sourceHashes, own_hashes: ownHashes, verification, summary, pairs, histories, branches};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'checkpoints-manifest.json'), JSON.stringify({trial: cfg.trial, count: manifests.length,
  full_snapshots_included: false, reconstruction_command: 'node docs/検証/構築と探索/ay/study.cjs', checkpoints: manifests}, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({trial: cfg.trial, status: 'passed', execution_checks: verification,
  source_files_verified: sourcePaths.length, artifact_hashes: Object.fromEntries(['conditions.json', 'study.cjs', 'results.json', 'checkpoints-manifest.json'].map(p => [p, C.hash(path.join(__dirname, p))]))}, null, 2) + '\n');
console.log(JSON.stringify({trial: cfg.trial, summary, pairs, verification}, null, 2));
