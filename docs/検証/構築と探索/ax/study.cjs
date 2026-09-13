'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), cfg = require('./conditions.json');
const {M, C, AR, AH, AP, copy, Session} = U;
const au = require('../au/results.json'), av = require('../av/results.json'), aw = require('../aw/results.json');
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const sum = xs => xs.reduce((a, b) => a + b, 0), sorted = xs => [...xs].sort();
const histogram = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
const root = 'docs/検証/統合試作/deck_feedback_trial/';
const frozenDirs = ['../au', '../av', '../aw'].flatMap(d => fs.readdirSync(path.join(__dirname, d)).map(f => path.join(__dirname, d, f)));
const sourcePaths = [...new Set([
  ...Object.keys(require.cache).filter(p => p.startsWith(C.repo + path.sep) && !p.startsWith(__dirname + path.sep)),
  ...frozenDirs,
  ...['posture_am/engine.js', 'expedition_choices.js', 'reward_preparation.js', 'expedition_loop.js', 'knowledge.js',
    'information.js', 'terrain.js', 'ecology.js', 'feedback.js', 'choice_inputs.json', 'loop_inputs.json',
    'reward_build_inputs.json', 'reward_build_inputs.py'].map(p => path.join(C.repo, root + p))
].map(p => path.relative(C.repo, p)))].sort();
const sourceHashes = Object.fromEntries(sourcePaths.map(p => [p, C.hash(path.join(C.repo, p))]));
const ownHashes = Object.fromEntries(['conditions.json', 'study.cjs'].map(p => [p, C.hash(path.join(__dirname, p))]));
const verification = {natural_endpoint_matches: 0, natural_preparation_matches: 0, natural_purchase_matches: 0,
  natural_home_matches: 0, paired_preparation_matches: 0, paired_endpoint_matches: 0, paired_streak_matches: 0,
  prediction_checks: 0, policy_public_purity: 0, exact_initial_diffs: 0, restored_initial_saves: 0,
  restored_first_actions: 0, baseline_suffix_exact_replay: 0, settlement_checks: 0,
  settlement_idempotence: 0, previous_possession_checks: 0, original_checkpoint_unchanged: 0};
function publicPolicy(s, policy = cfg.selection.policy) {
  const before = sha(s.save()), game = s.game;
  const api = Object.freeze({public: () => game.public(), choices: () => game.choices(), predict: ch => game.predict(ch)});
  const choice = AH.choose(api, policy);
  assert.equal(sha(s.save()), before, 'Public policy mutated state'); verification.policy_public_purity++;
  return copy(choice);
}
function action(s, choice) { s.action(choice); verification.prediction_checks++; }
function sameEndpoint(s, row) {
  for (const [key, value] of Object.entries({seed: s.data.active.seed, outcome: s.game.s.outcome,
    actions: s.game.s.actors.P.actions, hp: s.game.s.actors.P.hp, time: s.game.s.now})) assert.equal(value, row[key], row.label + '/' + key);
  assert.deepEqual(s.data.receipts.at(-1), row.receipt, 'Saved receipt differs');
  assert.deepEqual(s.game.s.events, row.boundaries, 'Saved boundaries differ');
}
function samePreparation(s, row) {
  assert.deepEqual(s.data.economy.aq.equipped, row.equipped);
  assert.deepEqual(Object.keys(s.data.economy.profile.learned), row.learned);
  assert.deepEqual(U.canonical(s.data.economy, s.data.au.deck).filter(e => e.uid !== null).map(e => e.blueprint), row.selected_blueprints);
}
function routeFor(s, first, previous, outcome, index) {
  if (s.data.economy.profile.clears.includes('C')) return index % 2 === 0 ? 'A' : 'B';
  if (!s.data.economy.profile.clears.includes(first)) return first;
  return previous === 'C' && outcome === 'defeat' ? first : 'C';
}
function purchase(s, operation) {
  const e = s.data.economy, reserve = sum(Object.keys(AH.cfg.skills).filter(b => !Object.hasOwn(e.profile.learned, b)).map(b => AH.cfg.skills[b].cost * 100));
  const view = M.view(e), candidates = (view?.candidates || []).filter(c => !view.purchased && e.profile.points * 100 + e.remainder >= reserve + c.price_units &&
    (c.blueprint.kind === 'card' || Object.hasOwn(e.profile.learned, c.blueprint.base)));
  candidates.sort((a, b) => (a.blueprint.kind === 'card' ? 0 : 1) - (b.blueprint.kind === 'card' ? 0 : 1) || a.id.localeCompare(b.id));
  if (!candidates.length) return null;
  s.buy(candidates[0].id, operation); return copy(s.data.economy.at.purchases[operation]);
}
function streaks(rows, withEvent) {
  const out = [];
  rows.forEach((r, index) => {
    const key = JSON.stringify(withEvent ? [r.event_before, r.mode, r.target] : [r.mode, r.target]);
    if (!out.length || out.at(-1).key !== key) out.push({key, first_index: index, rows: []});
    out.at(-1).rows.push(r);
  });
  return out;
}
function traceMetrics(rows) {
  const player = rows.filter(r => r.actor === 'P'), attacks = player.filter(r => r.mode === 'attack');
  return {player_actions: player.length, modes: histogram(player.map(r => r.mode)),
    attack_targets: histogram(attacks.map(r => r.target)),
    hp_progress_attacks: attacks.filter(r => r.actual_hp_loss > 0).length,
    probe_only_attacks: attacks.filter(r => r.actual_hp_loss === 0 && r.hit_gain > 0).length,
    no_hp_no_probe_attacks: attacks.filter(r => r.actual_hp_loss === 0 && r.hit_gain === 0).length,
    target_hp_loss: sum(attacks.map(r => r.actual_hp_loss)), probe_gain: sum(attacks.map(r => r.hit_gain)),
    distinct_player_cards: new Set(player.map(r => r.card_id)).size,
    distinct_match_materials: new Set(player.filter(r => r.matched_id).map(r => r.matched_id)).size,
    player_damage_received: sum(rows.filter(r => r.target === 'P').map(r => r.actual_hp_loss)),
    player_healed: sum(player.map(r => r.hp_restored || 0))};
}
function inspectOldResults() {
  const rank = [...au.paired].sort((a, b) => b.max_same_mode_target_streak - a.max_same_mode_target_streak || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  assert.equal(rank[0].label, cfg.selection.label); assert.equal(rank[0].max_same_mode_target_streak, cfg.selection.saved_maximum);
  assert.deepEqual(rank.filter(r => r.max_same_mode_target_streak === rank[0].max_same_mode_target_streak).map(r => r.label), cfg.selection.ties);
  const avLong = [];
  for (const pair of av.support_pairs) for (const [mode, branch] of Object.entries(pair.branches)) {
    const rows = branch.trace.filter(r => r.actor === 'P');
    for (const streak of streaks(rows, false)) if (streak.rows.length >= 5) avLong.push({checkpoint: pair.id, branch: mode,
      mode: streak.rows[0].mode, target: streak.rows[0].target, first_player_index: streak.first_index,
      length: streak.rows.length, first_time: streak.rows[0].time, metrics: traceMetrics(streak.rows)});
  }
  return {AU: {natural_runs: au.natural.length, paired_runs: au.paired.length,
    natural_longest: Math.max(...au.natural.map(r => r.max_same_mode_target_streak)), paired_longest: rank[0].max_same_mode_target_streak,
    longest_ties: cfg.selection.ties, selected: cfg.selection.label,
    ranked_top: rank.slice(0, 8).map(r => ({label: r.label, length: r.max_same_mode_target_streak, outcome: r.outcome, segments: r.segments}))},
    AV: {branches: av.support_pairs.length * 2, traces_with_at_least_five_identical_mode_target_actions: avLong,
      note: 'AV traces omit event_before; this supporting scan uses only mode and target and may cross an event boundary. Counts are not pooled with AU event-bounded streaks.'},
    AW: {trunks: aw.trunks.length, input_actions_saved: sum(aw.trunks.map(r => r.actions.length)),
      note: 'first_clear/side_first action sequences are available but do not reconstruct the selected after_eight_returns/progress_first sample; no AW journeys re-run.'}};
}
function rewardView(s) {
  const route = s.data.active.route, run = s.data.active.run;
  const sources = Object.entries(s.game.public().rewards).map(([key, r]) => ({key, ...r,
    points: sum((AH.cfg.routes[route].rewards[r.source] || []).filter(x => x.kind === 'points').map(x => x.amount))}));
  const grants = Object.entries(s.data.economy.runs[run].grants).map(([id, r]) => ({id, uid: AP.uidFor(run, id), protected: r.protected, blueprint: copy(r.blueprint)}));
  return {sources, grants};
}
function beforeView(s, target = null) {
  const p = s.game.public();
  const legal = s.game.choices().map(choice => ({choice, prediction: s.game.predict(choice)}));
  return {public: p, reward: rewardView(s), legal_attack_targets: sorted(new Set(legal.filter(x => x.prediction.mode === 'attack').map(x => x.choice.target))),
    progress_first: publicPolicy(s, 'progress_first'), side_first: publicPolicy(s, 'side_first'),
    target: target === null ? null : copy(p.actors[target])};
}
function differences(a, b, name = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object')
    return sorted(new Set([...Object.keys(a), ...Object.keys(b)])).flatMap(k => differences(a[k], b[k], name ? name + '.' + k : k));
  return [{path: name, before: a, after: b}];
}
function settleAndCheck(s) {
  const original = s.save(), prior = copy(s.data.economy.inventory), alreadyTerminal = !!s.game.s.outcome;
  let checked = s;
  if (!alreadyTerminal) { checked = new Session(s.seeds, s.data.tag, original); checked.withdraw(); }
  assert.ok(['clear', 'defeat', 'withdrawal'].includes(checked.game.s.outcome));
  const r = rewardView(checked), receipt = checked.data.receipts.at(-1), outcome = checked.game.s.outcome;
  const keep = x => outcome === 'clear' || outcome === 'withdrawal' && x.protected;
  assert.deepEqual(sorted(receipt.kept), sorted(r.grants.filter(keep).map(x => x.uid)));
  assert.deepEqual(sorted(receipt.lost), sorted(r.grants.filter(x => !keep(x)).map(x => x.uid)));
  assert.equal(receipt.gained_points, sum(r.sources.filter(keep).map(x => x.points)));
  assert.deepEqual(sorted(checked.game.s.settlement.kept), sorted(r.sources.filter(keep).map(x => x.key)));
  assert.deepEqual(sorted(checked.game.s.settlement.lost), sorted(r.sources.filter(x => !keep(x)).map(x => x.key)));
  for (const [uid, item] of Object.entries(prior)) assert.deepEqual(checked.data.economy.inventory[uid], item);
  verification.previous_possession_checks++; verification.settlement_checks++;
  const settled = checked.save(); checked.collect(); assert.deepEqual(checked.save(), settled); verification.settlement_idempotence++;
  assert.deepEqual(s.save(), original, 'Settlement branch changed measured branch');
  return {kind: alreadyTerminal ? 'existing_terminal_settlement' : 'separate_withdrawal_clone',
    outcome, receipt: copy(receipt), rewards: r, saved_state_sha256: sha(settled)};
}

const audit = inspectOldResults();
const seeds = C.seeds.slice(cfg.selection.offset).concat(C.seeds.slice(0, cfg.selection.offset)), tag = 'au-natural-' + cfg.selection.offset + '-' + cfg.selection.first_route;
const historySession = new Session(seeds, tag), history = [];
let previous = null, outcome = null;
for (let index = 0; index < cfg.selection.returns; index++) {
  const row = au.natural.find(r => r.offset === cfg.selection.offset && r.first === cfg.selection.first_route && r.index === index);
  const route = routeFor(historySession, cfg.selection.first_route, previous, outcome, index);
  assert.equal(route, row.route); historySession.prepare(route); samePreparation(historySession, row); verification.natural_preparation_matches++;
  historySession.depart(route); const choices = [];
  while (!historySession.game.s.outcome) { const choice = publicPolicy(historySession); choices.push(choice); action(historySession, choice); }
  sameEndpoint(historySession, row); verification.natural_endpoint_matches++;
  const bought = purchase(historySession, 'buy-' + index); assert.deepEqual(bought, row.bought); verification.natural_purchase_matches++;
  historySession.home(); historySession.data.economy = AR.sellSurplus(historySession.data.economy, 'sale-' + index);
  assert.equal(historySession.data.economy.profile.points + historySession.data.economy.remainder / 100, row.unspent);
  assert.equal(Object.keys(historySession.data.economy.inventory).length, row.total_owned); verification.natural_home_matches++;
  history.push({label: row.label, route, seed: row.seed, choices, outcome: row.outcome, actions: row.actions,
    hp: row.hp, time: row.time, receipt: row.receipt, bought, home_save_sha256: sha(historySession.save())});
  previous = route; outcome = row.outcome;
  process.stdout.write(JSON.stringify({reconstructed_history: index + 1, route, actions: choices.length, matched_AU: true}) + '\n');
}
const selected = au.paired.find(r => r.label === cfg.selection.label), home = historySession.save();
const natural = new Session(seeds, tag, home); natural.prepare(cfg.selection.route, 'adapt', cfg.selection.deck);
samePreparation(natural, selected); verification.paired_preparation_matches++;
const preparation = {deck: copy(natural.data.au.deck), equipped: copy(natural.data.economy.aq.equipped),
  learned: copy(natural.data.economy.profile.learned), inventory_sha256: sha(natural.data.economy.inventory)};
const priorInventory = copy(natural.data.economy.inventory);
natural.depart(cfg.selection.route);
const baselineInputs = [], snapshots = [], baselineViews = [];
while (!natural.game.s.outcome) {
  snapshots.push(natural.save()); baselineViews.push(beforeView(natural));
  const choice = publicPolicy(natural); baselineInputs.push(choice); action(natural, choice);
}
sameEndpoint(natural, selected); verification.paired_endpoint_matches++;
const naturalFinal = natural.save(), naturalActions = natural.game.trace.filter(r => r.type === 'action');
const playerRows = naturalActions.filter(r => r.actor === 'P'), allStreaks = streaks(playerRows, true);
const maximum = Math.max(...allStreaks.map(s => s.rows.length)); assert.equal(maximum, selected.max_same_mode_target_streak);
const chosen = allStreaks.find(s => s.rows.length === maximum); verification.paired_streak_matches++;
assert.equal(chosen.rows[0].mode, 'attack');
const target = chosen.rows[0].target, checkpoint = snapshots[chosen.first_index], initialHash = sha(checkpoint);
assert.ok(checkpoint.game.state.actors[target].active); assert.ok(checkpoint.game.state.actors[target].hp > 0);
const checkpointView = baselineViews[chosen.first_index], checkpointHP = checkpoint.game.state.actors[target].hp;
const originalLength = chosen.rows.length, naturalSegmentViews = baselineViews.slice(chosen.first_index, chosen.first_index + originalLength);
function changeCount(views, key) { return views.slice(1).filter((v, i) => JSON.stringify(key(v)) !== JSON.stringify(key(views[i]))).length; }
const segment = {first_player_index: chosen.first_index, first_action_number: chosen.rows[0].action_number,
  event: chosen.rows[0].event_before, mode: chosen.rows[0].mode, target, length: originalLength,
  checkpoint_sha256: initialHash, target_hp: checkpointHP, metrics: traceMetrics(chosen.rows),
  legal_attack_targets: naturalSegmentViews.map(v => v.legal_attack_targets),
  progress_side_target_disagreements: naturalSegmentViews.filter(v => v.progress_first.target !== v.side_first.target).length,
  changes_between_player_ready_states: {
    comparisons: Math.max(0, naturalSegmentViews.length - 1),
    hand_identity: changeCount(naturalSegmentViews, v => v.public.actors.P.hand.map(c => c.id).sort()),
    hand_identity_or_lifetime: changeCount(naturalSegmentViews, v => v.public.actors.P.hand.map(c => [c.id, c.remaining]).sort()),
    field_identity: changeCount(naturalSegmentViews, v => Object.entries(v.public.field).map(([attr, c]) => [attr, c.id]).sort()),
    target_posture: changeCount(naturalSegmentViews, v => v.public.actors[target].posture_remaining),
    target_hp: changeCount(naturalSegmentViews, v => v.public.actors[target].hp),
    player_hp: changeCount(naturalSegmentViews, v => v.public.actors.P.hp)
  },
  public_before_actions: naturalSegmentViews, action_rows: chosen.rows};
process.stdout.write(JSON.stringify({selected: selected.label, matched_AU: true, longest: maximum, target,
  checkpoint_P_actions: checkpoint.game.state.actors.P.actions, target_hp: checkpointHP}) + '\n');

const branches = [], manifestBranches = [];
for (const condition of cfg.intervention.branches) {
  const start = copy(checkpoint), hp = Math.max(1, Math.ceil(checkpointHP * condition.ratio));
  start.game.state.actors[target].hp = hp;
  const delta = differences(checkpoint, start), expected = hp === checkpointHP ? [] : [{path: 'game.state.actors.' + target + '.hp', before: checkpointHP, after: hp}];
  assert.deepEqual(delta, expected, 'Local intervention changed another saved field'); verification.exact_initial_diffs++;
  const s = new Session(seeds, tag, start); assert.deepEqual(s.save(), start); verification.restored_initial_saves++;
  const views = [], choices = [], initialTime = s.game.s.now, before = beforeView(s, target);
  let retiredAt = null;
  while (!s.game.s.outcome && s.game.s.actors[target].active && choices.length < cfg.intervention.max_player_actions) {
    views.push(beforeView(s, target)); const choice = publicPolicy(s); choices.push(choice);
    const resumed = choices.length === 1 ? new Session(seeds, tag, s.save()) : null;
    action(s, choice);
    if (resumed) { resumed.action(choice); assert.deepEqual(resumed.save(), s.save()); verification.restored_first_actions++; }
    if (!s.game.s.actors[target].active) retiredAt = {additional_player_actions: choices.length, time: s.game.s.now, hp: s.game.s.actors.P.hp};
  }
  const trace = copy(s.game.trace), actionRows = trace.filter(r => r.type === 'action'), pRows = actionRows.filter(r => r.actor === 'P');
  const supportIds = Object.entries(before.public.actors).filter(([, a]) => a.active && a.purpose === 'support').map(([id]) => id);
  const supportRows = actionRows.filter(r => supportIds.includes(r.actor));
  const finalSave = s.save();
  if (condition.ratio === 1) { assert.deepEqual(finalSave, naturalFinal); verification.baseline_suffix_exact_replay++; }
  for (const [uid, item] of Object.entries(priorInventory)) assert.deepEqual(s.data.economy.inventory[uid], item);
  verification.previous_possession_checks++;
  const settlement = settleAndCheck(s);
  assert.equal(sha(checkpoint), initialHash); verification.original_checkpoint_unchanged++;
  const lead = streaks(pRows, true)[0];
  const result = {id: condition.id, ratio: condition.ratio, initial_target_hp: hp, initial_saved_state_sha256: sha(start), initial_differences: delta,
    stop_reason: s.game.s.outcome ? 'game_' + s.game.s.outcome : retiredAt ? 'selected_target_retired' : '24_player_action_limit',
    additional_player_actions: choices.length, elapsed_game_ticks: s.game.s.now - initialTime,
    outcome: s.game.s.outcome || 'ongoing', target_retirement: retiredAt,
    leading_same_mode_target: lead ? {mode: lead.rows[0].mode, target: lead.rows[0].target, length: lead.rows.length} : null,
    metrics: traceMetrics(actionRows), support: {actors: supportIds, actions: supportRows.length,
      target_hp_loss: sum(supportRows.filter(r => r.target === target).map(r => r.actual_hp_loss)),
      target_probe_gain: sum(supportRows.filter(r => r.target === target).map(r => r.hit_gain)),
      player_hp_loss: sum(supportRows.filter(r => r.target === 'P').map(r => r.actual_hp_loss)), rows: supportRows},
    before, public_before_actions: views, actions: choices, action_rows: actionRows,
    other_events: trace.filter(r => r.type !== 'action'),
    after: {time: s.game.s.now, hp: s.game.s.actors.P.hp, target: copy(s.game.public().actors[target]),
      actors: copy(s.game.public().actors), field: copy(s.game.public().field), rewards: rewardView(s)},
    settlement, final_saved_state_sha256: sha(finalSave)};
  branches.push(result); manifestBranches.push({id: condition.id, ratio: condition.ratio, initial_target_hp: hp,
    initial_saved_state_sha256: sha(start), initial_differences: delta, final_saved_state_sha256: sha(finalSave)});
  process.stdout.write(JSON.stringify({branch: condition.id, actions: choices.length, stop: result.stop_reason,
    ticks: result.elapsed_game_ticks, probe_only_attacks: result.metrics.probe_only_attacks}) + '\n');
}
for (const [p, hash] of Object.entries(sourceHashes)) assert.equal(C.hash(path.join(C.repo, p)), hash, 'Source changed: ' + p);
for (const [p, hash] of Object.entries(ownHashes)) assert.equal(C.hash(path.join(__dirname, p)), hash, 'AX input changed: ' + p);
const summary = {history_reconstructions: 1, natural_return_runs: history.length, original_paired_runs: 1, selected_checkpoint: selected.label,
  selected_streak_length: originalLength, branch_count: branches.length,
  branches: branches.map(b => ({id: b.id, target_hp: b.initial_target_hp, actions: b.additional_player_actions,
    ticks: b.elapsed_game_ticks, outcome: b.outcome, player_hp: b.after.hp,
    hp_progress_attacks: b.metrics.hp_progress_attacks, probe_only_attacks: b.metrics.probe_only_attacks,
    no_hp_no_probe_attacks: b.metrics.no_hp_no_probe_attacks, modes: b.metrics.modes,
    support_actions: b.support.actions, gained_points: b.settlement.receipt.gained_points,
    kept_items: b.settlement.receipt.kept.length})),
  interpretation: 'Three local continuations of one selected natural checkpoint; two states have only current target HP edited. No population frequencies, fun claims or formal-value adoption.'};
const result = {trial: cfg.trial, base_commit: cfg.base_commit, source_hashes: sourceHashes, own_hashes: ownHashes,
  audit, summary, verification, history, preparation,
  reconstructed_baseline: {label: selected.label, home_save_sha256: sha(home), actions: baselineInputs,
    outcome: selected.outcome, player_actions: selected.actions, hp: selected.hp, time: selected.time,
    receipt: selected.receipt, boundaries: selected.boundaries, final_saved_state_sha256: sha(naturalFinal)},
  segment, branches};
const manifest = {trial: cfg.trial, base_commit: cfg.base_commit, source_hashes: sourceHashes, own_hashes: ownHashes,
  reproduction: 'Run node docs/検証/構築と探索/ax/study.cjs. Rotate C.seeds by offset, replay results.history choices with recorded purchases and sale-i using unchanged AU preparation. Prepare selected C/initial, replay reconstructed_baseline.actions up to segment.first_player_index. Hash JSON.stringify(Session.save()). For each artificial branch edit only its recorded target HP field, then replay its actions. No full-state archive is necessary.',
  checkpoint: {label: selected.label, target, original_target_hp: checkpointHP,
    completed_player_actions: checkpoint.game.state.actors.P.actions, time: checkpoint.game.state.now,
    original_saved_state_sha256: initialHash}, branches: manifestBranches};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'checkpoints-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({trial: cfg.trial, verification,
  conditions_sha256: ownHashes['conditions.json'], study_sha256: ownHashes['study.cjs'],
  results_sha256: C.hash(path.join(__dirname, 'results.json')), manifest_sha256: C.hash(path.join(__dirname, 'checkpoints-manifest.json'))}, null, 2) + '\n');
process.stdout.write(JSON.stringify({summary, verification}, null, 2) + '\n');
