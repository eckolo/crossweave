'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), cfg = require('./conditions.json'), fixed = require('../au/results.json');
const {M, C, AR, AH, AP, copy, Session} = U;
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const sum = xs => xs.reduce((a, b) => a + b, 0);
const histogram = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
const sorted = xs => [...xs].sort();
const root = 'docs/検証/統合試作/deck_feedback_trial/';
const sourcePaths = [...new Set([
  ...Object.keys(require.cache).filter(p => p.startsWith(C.repo + path.sep) && !p.startsWith(__dirname + path.sep)).map(p => path.relative(C.repo, p)),
  ...['posture_am/engine.js', 'expedition_choices.js', 'reward_preparation.js', 'expedition_loop.js', 'knowledge.js',
    'information.js', 'terrain.js', 'ecology.js', 'feedback.js', 'choice_inputs.json', 'loop_inputs.json',
    'reward_build_inputs.json', 'reward_build_inputs.py'].map(p => root + p)
])].sort();
const sourceHashes = Object.fromEntries(sourcePaths.map(p => [p, C.hash(path.join(C.repo, p))]));
const ownHashes = Object.fromEntries(['conditions.json', 'study.cjs'].map(p => [p, C.hash(path.join(__dirname, p))]));
const verification = {reconstructed_first_returns: 0, first_return_purchase_checks: 0, C_preparation_matches: 0,
  C_terminal_matches: 0, prediction_checks: 0, restored_first_actions: 0, withdrawal_replays: 0,
  withdrawal_reward_checks: 0, terminal_reward_checks: 0, prior_inventory_checks: 0, original_branch_unchanged: 0};
const histories = [], trunks = [], states = [], checkpoints = [];

function inventoryUnchanged(s, prior) {
  for (const [uid, item] of Object.entries(prior)) assert.deepEqual(s.data.economy.inventory[uid], item, 'Previous possession changed');
  verification.prior_inventory_checks++;
}
function step(s, choice) { s.action(choice); verification.prediction_checks++; }
function rewards(s) {
  const route = s.data.active.route, run = s.data.active.run;
  const source = Object.entries(s.game.public().rewards).map(([key, r]) => ({key, ...r,
    items: copy(AH.cfg.routes[route].rewards[r.source]),
    points: sum(AH.cfg.routes[route].rewards[r.source].filter(x => x.kind === 'points').map(x => x.amount))}));
  const grants = Object.entries(s.data.economy.runs[run].grants).map(([id, r]) => ({id, uid: AP.uidFor(run, id),
    protected: r.protected, blueprint: copy(r.blueprint)}));
  return {protected_sources: source.filter(r => r.protected), unprotected_sources: source.filter(r => !r.protected),
    protected_points: sum(source.filter(r => r.protected).map(r => r.points)),
    unprotected_points: sum(source.filter(r => !r.protected).map(r => r.points)),
    protected_items: grants.filter(r => r.protected), unprotected_items: grants.filter(r => !r.protected)};
}
function view(s) {
  const p = s.game.public(), healing = p.actors.P.hand.filter(c => c.kind === 'heal' && c.consume_on_recover);
  return {time: p.now, actions: p.actors.P.actions, hp: p.actors.P.hp, max_hp: p.actors.P.max_hp,
    event: p.current_event, reward: rewards(s),
    held_finite_healing: healing.map(c => ({id: c.id, name: c.name, origin: c.origin, power: c.power,
      remaining: c.remaining, matches_current_field: !!p.field[c.attr]})),
    public_next_actions: Object.entries(p.actors).filter(([, a]) => a.active && a.acts)
      .map(([id, a]) => ({id, next_at: a.next_at, delay: a.next_at - p.now})).sort((a, b) => a.next_at - b.next_at || a.id.localeCompare(b.id)),
    actors: Object.fromEntries(Object.entries(p.actors).map(([id, a]) => [id, {active: a.active, purpose: a.purpose || 'player',
      hp: a.hp, max_hp: a.max_hp, posture_remaining: a.posture_remaining, evasion: a.evasion,
      guard: a.guard, next_at: a.next_at, hand_count: a.hand_count, deck_count: a.deck_count}])),
    hand: p.actors.P.hand, field: p.field, pool_count: p.pool_count, live_card_count: p.N,
    next_action_note: 'Only public actor times are shown; NPC future card, target and draw order are not inferred.'};
}
function checkSettlement(s) {
  const outcome = s.game.s.outcome, r = rewards(s), receipt = s.data.receipts.at(-1);
  const allItems = [...r.protected_items, ...r.unprotected_items], allSources = [...r.protected_sources, ...r.unprotected_sources];
  const kept = x => outcome === 'clear' || outcome === 'withdrawal' && x.protected;
  assert.deepEqual(sorted(receipt.kept), sorted(allItems.filter(kept).map(x => x.uid)));
  assert.deepEqual(sorted(receipt.lost), sorted(allItems.filter(x => !kept(x)).map(x => x.uid)));
  assert.equal(receipt.gained_points, sum(allSources.filter(kept).map(x => x.points)));
  assert.deepEqual(sorted(s.game.s.settlement.kept), sorted(allSources.filter(kept).map(x => x.key)));
  assert.deepEqual(sorted(s.game.s.settlement.lost), sorted(allSources.filter(x => !kept(x)).map(x => x.key)));
  for (const item of allItems) {
    if (kept(item)) assert.deepEqual(s.data.economy.inventory[item.uid].blueprint, item.blueprint);
    else assert.ok(!Object.hasOwn(s.data.economy.inventory, item.uid));
  }
  if (outcome === 'withdrawal') verification.withdrawal_reward_checks++;
  else verification.terminal_reward_checks++;
}
function sameAU(s, row, checkBoundaries = true) {
  assert.equal(s.data.active.seed, row.seed);
  for (const [key, actual] of Object.entries({outcome: s.game.s.outcome, actions: s.game.s.actors.P.actions, hp: s.game.s.actors.P.hp, time: s.game.s.now}))
    assert.equal(actual, row[key], 'AU endpoint mismatch: ' + row.label + '/' + key);
  assert.deepEqual(s.data.receipts.at(-1), row.receipt, 'AU receipt mismatch');
  if (checkBoundaries) assert.deepEqual(s.game.s.events, row.boundaries, 'AU traversal boundaries mismatch');
}
function purchaseEligibility(s) {
  const e = s.data.economy, reserve = sum(Object.keys(AH.cfg.skills).filter(b => !Object.hasOwn(e.profile.learned, b)).map(b => AH.cfg.skills[b].cost * 100));
  const offered = M.view(e);
  return (offered?.candidates || []).filter(c => !offered.purchased && e.profile.points * 100 + e.remainder >= reserve + c.price_units &&
    (c.blueprint.kind === 'card' || Object.hasOwn(e.profile.learned, c.blueprint.base)));
}
function immediateWithdrawal(s, saved, before) {
  const w = new Session(s.seeds, saved.tag, saved), repeat = new Session(s.seeds, saved.tag, saved);
  const prior = copy(w.data.economy.inventory);
  w.withdraw(); repeat.withdraw(); assert.deepEqual(w.save(), repeat.save()); verification.withdrawal_replays++;
  checkSettlement(w); inventoryUnchanged(w, prior);
  const receipt = copy(w.data.receipts.at(-1));
  assert.equal(receipt.gained_points, before.reward.protected_points);
  assert.deepEqual(sorted(receipt.kept), sorted(before.reward.protected_items.map(r => r.uid)));
  assert.deepEqual(s.save(), saved, 'Withdrawal changed original trunk'); verification.original_branch_unchanged++;
  return {outcome: w.game.s.outcome, hp: w.game.s.actors.P.hp, elapsed_time: w.game.s.now - before.time,
    additional_player_actions: w.game.s.actors.P.actions - before.actions, receipt,
    kept_blueprints: before.reward.protected_items.map(r => r.blueprint),
    lost_blueprints: before.reward.unprotected_items.map(r => r.blueprint), final_saved_state_sha256: sha(w.save())};
}

for (const offset of cfg.reconstruction.offsets) for (const first of cfg.reconstruction.first_routes) {
  const seeds = C.seeds.slice(offset).concat(C.seeds.slice(0, offset)), tag = 'au-natural-' + offset + '-' + first;
  const s = new Session(seeds, tag); s.prepare(first); s.depart(first);
  const historyActions = [];
  while (!s.game.s.outcome) { const choice = AH.choose(s.game, 'progress_first'); historyActions.push(copy(choice)); step(s, choice); }
  const prior = fixed.natural.find(r => r.offset === offset && r.first === first && r.index === 0);
  sameAU(s, prior); assert.equal(s.game.s.outcome, 'clear'); verification.reconstructed_first_returns++;
  assert.equal(prior.bought, null); assert.equal(purchaseEligibility(s).length, 0); verification.first_return_purchase_checks++;
  s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'sale-0');
  const firstReturn = s.save(), history = {id: tag, offset, first, seed: prior.seed, actions: historyActions,
    outcome: prior.outcome, hp: prior.hp, time: prior.time, first_return_sha256: sha(firstReturn),
    first_return_economy_sha256: sha(firstReturn.economy), au_match: true};
  histories.push(history);
  for (const deck of cfg.reconstruction.decks) {
    const t = new Session(seeds, tag, firstReturn); t.prepare('C', 'adapt', deck);
    const baseline = fixed.paired.find(r => r.stage === 'first_clear' && r.route === 'C' && r.policy === 'side_first' && r.offset === offset && r.first === first && r.deck === deck);
    assert.deepEqual(t.data.economy.aq.equipped, baseline.equipped);
    assert.deepEqual(Object.keys(t.data.economy.profile.learned), baseline.learned);
    assert.deepEqual(U.canonical(t.data.economy, t.data.au.deck).filter(e => e.uid !== null).map(e => e.blueprint), baseline.selected_blueprints);
    const priorInventory = copy(t.data.economy.inventory), preparation = {deck_ids: copy(t.data.au.deck), equipped: copy(t.data.economy.aq.equipped),
      learned: Object.keys(t.data.economy.profile.learned), inventory_sha256: sha(priorInventory)};
    t.depart('C'); assert.equal(t.data.active.seed, baseline.seed); verification.C_preparation_matches++;
    const label = [offset, first, deck].join('-'), completedCriteria = new Set(), localStates = [], actions = [], protectionTimeline = [];
    let firstActionCheck = false, previousProtection = '';
    while (!t.game.s.outcome) {
      assert.ok(t.game.s.ready, 'Sampling requires player-ready state');
      const pub = t.game.public(), r = rewards(t), protectionSignature = JSON.stringify([r.protected_sources.map(x => x.key), r.protected_items.map(x => x.id)]);
      if (protectionSignature !== previousProtection && (r.protected_sources.length || r.protected_items.length))
        protectionTimeline.push({actions: pub.actors.P.actions, time: pub.now, hp: pub.actors.P.hp,
          protected_sources: r.protected_sources.map(x => x.key), protected_items: r.protected_items.map(x => x.id)});
      previousProtection = protectionSignature;
      const low = r.protected_sources.length > 0 && pub.actors.P.hp <= cfg.selection.low_hp_threshold;
      const tests = {first_protected_item: r.protected_items.length > 0, first_protected_low_hp: low,
        first_protected_low_hp_no_held_finite_heal: low && !pub.actors.P.hand.some(c => c.kind === 'heal' && c.consume_on_recover)};
      const tags = Object.keys(tests).filter(k => tests[k] && !completedCriteria.has(k));
      let restored = null;
      if (tags.length) {
        tags.forEach(k => completedCriteria.add(k));
        const saved = t.save(), before = view(t), id = label + '/P' + before.actions, savedHash = sha(saved);
        const state = {id, trunk: label, tags, saved_state_sha256: savedHash, before, withdraw: immediateWithdrawal(t, saved, before)};
        states.push(state); localStates.push(state);
        checkpoints.push({id, tags, original_tag: tag, active_run: saved.active.run, seed: baseline.seed,
          history: history.id, trunk: label, completed_player_actions: before.actions, time: before.time,
          event: before.event, saved_state_sha256: savedHash});
        if (!firstActionCheck) { restored = new Session(seeds, tag, saved); firstActionCheck = true; }
      }
      const choice = AH.choose(t.game, 'side_first'); actions.push(copy(choice)); step(t, choice);
      if (restored) { restored.action(choice); assert.deepEqual(restored.save(), t.save()); verification.restored_first_actions++; }
    }
    assert.notEqual(t.game.s.outcome, 'cutoff', 'Existing AU endpoint unexpectedly censored');
    sameAU(t, baseline); verification.C_terminal_matches++; checkSettlement(t); inventoryUnchanged(t, priorInventory);
    const receipt = copy(t.data.receipts.at(-1)), finalHash = sha(t.save());
    for (const state of localStates) {
      const current = state.before.reward;
      const lostCurrentItems = current.protected_items.filter(r => receipt.lost.includes(r.uid));
      const lostSources = current.protected_sources.filter(r => t.game.s.settlement.lost.includes(r.key));
      state.continue_existing_journey = {source: 'The actual remaining suffix of the single reconstructed historical AU journey; no separate terminal replay.',
        action_sequence: label, suffix_start_index: state.before.actions,
        additional_player_actions: t.game.s.actors.P.actions - state.before.actions, elapsed_time: t.game.s.now - state.before.time,
        outcome: t.game.s.outcome, hp: t.game.s.actors.P.hp, gained_points: receipt.gained_points,
        kept_item_count: receipt.kept.length, kept_blueprints: receipt.kept_blueprints,
        lost_current_protected_points: sum(lostSources.map(r => r.points)),
        lost_current_protected_items: lostCurrentItems, lost_current_protected_sources: lostSources.map(r => r.key),
        final_saved_state_sha256: finalHash};
      if (t.game.s.outcome === 'defeat') assert.equal(state.continue_existing_journey.lost_current_protected_points, state.withdraw.receipt.gained_points);
    }
    trunks.push({label, offset, first, deck, seed: baseline.seed, original_au_label: baseline.label, preparation,
      launch_history: history.id, actions, outcome: t.game.s.outcome, player_actions: t.game.s.actors.P.actions,
      hp: t.game.s.actors.P.hp, time: t.game.s.now, receipt, protection_timeline: protectionTimeline,
      states: localStates.map(x => x.id), missing_criteria: Object.keys(cfg.selection.criteria).filter(k => !completedCriteria.has(k)),
      au_match: true, final_saved_state_sha256: finalHash});
    process.stdout.write(JSON.stringify({completed: label, outcome: t.game.s.outcome, actions: actions.length,
      states: localStates.length, missing: trunks.at(-1).missing_criteria}) + '\n');
  }
}
assert.ok(states.length <= cfg.selection.maximum_states); assert.ok(verification.restored_first_actions <= 8);
for (const [p, hash] of Object.entries(sourceHashes)) assert.equal(C.hash(path.join(C.repo, p)), hash, 'Used source changed: ' + p);
for (const [p, hash] of Object.entries(ownHashes)) assert.equal(C.hash(path.join(__dirname, p)), hash, 'AW input changed: ' + p);
const summary = {reconstructed_histories: histories.length, C_runs: trunks.length, C_seed_values: [...new Set(trunks.map(x => x.seed))],
  endpoints: histogram(trunks.map(x => x.outcome)), states: states.length,
  criteria: Object.fromEntries(Object.keys(cfg.selection.criteria).map(tag => {
    const rows = states.filter(x => x.tags.includes(tag));
    return [tag, {states: rows.length, hp: rows.map(x => x.before.hp),
      continue_outcomes: histogram(rows.map(x => x.continue_existing_journey.outcome)),
      held_finite_healing_counts: rows.map(x => x.before.held_finite_healing.length),
      withdraw_points: rows.map(x => x.withdraw.receipt.gained_points),
      withdraw_item_counts: rows.map(x => x.withdraw.receipt.kept.length),
      current_protected_item_losses: rows.map(x => x.continue_existing_journey.lost_current_protected_items.length)}];
  })),
  missing_criteria: trunks.filter(x => x.missing_criteria.length).map(x => ({trunk: x.label, missing: x.missing_criteria})),
  independence_note: 'Repeated states of one trunk share its terminal outcome. Eight trunks share four first-return histories and two seed values.'};
const manifest = {trial: cfg.trial, source_hashes: sourceHashes, own_hashes: ownHashes,
  reproduction: 'Run node docs/検証/構築と探索/aw/study.cjs with these sources. results.json histories and trunks preserve each actual P choice. Rotate C.seeds by offset; recreate recorded initial history, return and sale-0; prepare recorded C deck. Replay actions up to completed_player_actions. SHA256 uses JSON.stringify(Session.save()), including RNG. Original states were retained in memory while withdrawal/restored-action branches ran; no full-state archive is required.',
  checkpoints};
const result = {trial: cfg.trial, base_commit: cfg.base_commit, source_hashes: sourceHashes, own_hashes: ownHashes,
  summary, verification, histories, trunks, states};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'checkpoints-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({trial: cfg.trial, verification,
  conditions_sha256: ownHashes['conditions.json'], study_sha256: ownHashes['study.cjs'],
  results_sha256: C.hash(path.join(__dirname, 'results.json')), manifest_sha256: C.hash(path.join(__dirname, 'checkpoints-manifest.json'))}, null, 2) + '\n');
process.stdout.write(JSON.stringify({summary, verification}, null, 2) + '\n');
