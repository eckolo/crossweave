'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), V = require('../av/policy.cjs'), cfg = require('./followup-conditions.json');
const base = require('./results.json'), manifest = require('./checkpoints-manifest.json'), av = require('../av/results.json');
const {C, AR, AH, Session, copy} = U, sel = cfg.selection;
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const sum = xs => xs.reduce((a, b) => a + b, 0), hist = xs => xs.reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {});
const keys = (obj, names) => Object.fromEntries(names.filter(k => Object.hasOwn(obj, k)).map(k => [k, copy(obj[k])]));
const frozen = {...manifest.source_hashes};
for (const f of ['conditions.json', 'study.cjs', 'results.json', 'checkpoints-manifest.json', 'verification.json', '検討結果.md']) frozen[path.relative(C.repo, path.join(__dirname, f))] = C.hash(path.join(__dirname, f));
for (const [p, hash] of Object.entries(manifest.source_hashes)) assert.equal(C.hash(path.join(C.repo, p)), hash);
const ownHashes = Object.fromEntries(['followup-conditions.json', 'followup.cjs'].map(f => [f, C.hash(path.join(__dirname, f))]));
const checks = {prefix_first_A_hash: 0, prefix_home_hash: 0, C_launch_hash: 0, AV_checkpoint_sha: 0,
  original_first_three_action_trace: 0, public_followup_state: 0, restored_start_sha: 0, forced_choice_legal: 0,
  prediction_checks: 0, public_policy_purity: 0, retained_inventory: 0, original_inputs_unchanged: 0};
function policy(s, AHonly = false) {
  const before = sha(s.save()), api = V.publicAPI(s.game), pick = AHonly ? {choice: AH.choose(api, 'progress_first'), reason: 'AH.progress_first'} : V.pair(api).leave_support;
  assert.equal(sha(s.save()), before); checks.public_policy_purity++; return pick;
}
function step(s, ch) { s.action(ch); checks.prediction_checks++; }
function card(c) { return keys(c, ['id', 'type', 'name', 'attr', 'kind', 'origin', 'remaining', 'life', 'power', 'hit', 'field_power', 'field_hit', 'place_cost', 'match_cost', 'evasion', 'crit_gain', 'consume_on_recover', 'doomed']); }
function publicView(pub) {
  return {now: pub.now, event: pub.current_event, outcome: pub.outcome, pool_count: pub.pool_count, live_card_count: pub.N,
    actors: Object.fromEntries(Object.entries(pub.actors).map(([id, a]) => [id, keys(a, ['active', 'hp', 'max_hp', 'purpose', 'hit', 'posture_remaining', 'evasion', 'crit', 'guard', 'next_at', 'actions', 'hand_count', 'deck_count', 'rebuilds'])])),
    hand: pub.actors.P.hand.map(card), field: Object.fromEntries(Object.entries(pub.field).map(([attr, c]) => [attr, card(c)]))};
}
function actionRow(r) { return keys(r, ['time', 'actor', 'mode', 'target', 'card_id', 'matched_id', 'origin', 'actual_hp_loss', 'hit_gain', 'hp_restored', 'action_cost']); }
function rewards(s) {
  const pub = s.game.public(), grants = s.data.economy.runs[s.data.active.run]?.grants || {};
  return {protected: Object.entries(pub.rewards).filter(([, r]) => r.protected).map(([k]) => k),
    unprotected: Object.entries(pub.rewards).filter(([, r]) => !r.protected).map(([k]) => k),
    protected_grants: Object.values(grants).filter(g => g.protected).length, unprotected_grants: Object.values(grants).filter(g => !g.protected).length};
}
const s = new Session(C.seeds, base.selection.tag);
s.prepare('A'); s.depart('A');
for (const ch of base.reconstruction_inputs.first_A) { assert.deepEqual(policy(s, true).choice, ch); step(s, ch); }
assert.equal(sha(s.save()), manifest.reconstruction_hashes.first_A_terminal); checks.prefix_first_A_hash++;
s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'sale-0');
assert.equal(sha(s.save()), manifest.reconstruction_hashes.first_return_after_home_sale0); checks.prefix_home_hash++;
s.prepare('C', 'adapt', 'use_owned'); s.depart('C');
assert.equal(sha(s.save()), manifest.reconstruction_hashes.C_launch); checks.C_launch_hash++;
for (const ch of base.reconstruction_inputs.C_prefix) { assert.deepEqual(policy(s).choice, ch); step(s, ch); }
assert.equal(sha(s.save()), sel.baseline_checkpoint_sha256); checks.AV_checkpoint_sha++;
const startTrace = s.game.trace.length;
for (const d of base.baseline_decisions.slice(0, sel.baseline_player_index)) { assert.deepEqual(policy(s).choice, d.choice); step(s, d.choice); }
const cut = base.full_baseline_action_trace.findIndex(r => r.actor === 'P' && r.time === sel.time);
assert.deepEqual(s.game.trace.slice(startTrace).filter(r => r.type === 'action').map(actionRow), base.full_baseline_action_trace.slice(0, cut)); checks.original_first_three_action_trace++;
assert.equal(s.game.s.actors.P.actions, sel.completed_player_actions); assert.equal(s.game.s.now, sel.time);
const originalPublic = base.six_placement_public_observations.find(d => d.index === sel.baseline_player_index).before;
assert.deepEqual(publicView(s.game.public()), originalPublic); checks.public_followup_state++;
const saved = s.save(), checkpointSha = sha(saved), run = new Session(C.seeds, base.selection.tag, saved), before = run.game.public();
assert.equal(sha(run.save()), checkpointSha); checks.restored_start_sha++;
assert(run.game.choices().some(ch => JSON.stringify(ch) === JSON.stringify(sel.choice)));
const forcedPred = run.game.predict(sel.choice), heal = before.actors.P.hand.find(c => c.id === sel.choice.card_id);
assert.equal(forcedPred.mode, 'heal'); assert.equal(forcedPred.hp_restored, sel.predicted_hp_restored); assert.equal(heal.remaining, sel.healing_remaining);
assert.equal(before.actors.P.hand.find(c => c.id === sel.baseline_expiring_nonheal_card).remaining, 1); checks.forced_choice_legal++;
const runStart = run.game.trace.length, inventory = copy(run.data.economy.inventory), decisions = [], observed = [];
for (let index = 0; index < cfg.comparison.horizon_player_actions && !run.game.s.outcome; index++) {
  const pub = run.game.public(), common = policy(run), pick = index === 0 ? {choice: sel.choice, reason: 'one_early_legal_positive_heal'} : common;
  const choicePred = copy(run.game.predict(pick.choice)), traceAt = run.game.trace.length;
  const choices = run.game.choices().map(ch => ({choice: copy(ch), prediction: copy(run.game.predict(ch))}));
  step(run, pick.choice);
  const rows = run.game.trace.slice(traceAt), action = rows.find(r => r.type === 'action' && r.actor === 'P');
  decisions.push({index, before_time: pub.now, policy_reason: pick.reason, common_choice: copy(common.choice), choice: copy(pick.choice), prediction: choicePred,
    actual: {...actionRow(action), expired: action.expired}, after_time: run.game.s.now});
  observed.push({index, before: publicView(pub), legal_choices: choices, after: publicView(run.game.public()),
    player_expiries: action.expired.map(id => card(pub.actors.P.hand.find(c => c.id === id))),
    realized_events_audit_only: rows.filter(r => ['action', 'draw', 'recover', 'destroy', 'rebuild'].includes(r.type)).map(r => r.type === 'action' ? {...actionRow(r), type: r.type, expired: r.expired} : copy(r))});
}
for (const [uid, item] of Object.entries(inventory)) { assert.deepEqual(run.data.economy.inventory[uid], item); checks.retained_inventory++; }
const actualTrace = run.game.trace.slice(runStart), old = av.support_pairs.find(r => r.id === sel.baseline_id).branches[sel.baseline_mode];
const baselineTrace = base.full_baseline_action_trace.slice(cut), newTrace = actualTrace.filter(r => r.type === 'action').map(actionRow);
function metrics(trace, after, reward) {
  const player = trace.filter(r => r.actor === 'P'), targets = [...new Set(trace.filter(r => r.mode === 'attack').map(r => r.target))];
  return {player_actions: player.length, elapsed_time: after.now - sel.time, end_time: after.now,
    outcome: after.outcome || 'ongoing', player_hp: after.actors.P.hp, damage_received: sum(trace.filter(r => r.target === 'P').map(r => r.actual_hp_loss)),
    healed: sum(player.map(r => r.hp_restored)), player_modes: hist(player.map(r => r.mode)),
    target_progress: Object.fromEntries(targets.map(id => [id, {all_actor_hp_loss: sum(trace.filter(r => r.target === id).map(r => r.actual_hp_loss)),
      player_hp_loss: sum(player.filter(r => r.target === id).map(r => r.actual_hp_loss)), player_probe: sum(player.filter(r => r.target === id).map(r => r.hit_gain)),
      ending_hp: after.actors[id]?.hp, ending_posture_remaining: after.actors[id]?.posture_remaining, active: after.actors[id]?.active}])),
    player_borrowed_card_uses: player.filter(r => r.origin !== 'P').length,
    player_support_origin_card_uses: player.filter(r => r.origin === 'V1').length,
    player_support_origin_material_uses: player.filter(r => r.matched_id && run.game.s.cards[r.matched_id].origin === 'V1').length,
    npc_own_P_card_uses: trace.filter(r => r.actor !== 'P' && r.origin === 'P').length,
    npc_own_P_material_uses: trace.filter(r => r.actor !== 'P' && r.matched_id && run.game.s.cards[r.matched_id].origin === 'P').length,
    rewards: copy(reward)};
}
const baselineAfter = {now: old.after.now, outcome: old.outcome === 'ongoing' ? null : old.outcome, actors: old.after.actors};
const baselineMetrics = metrics(baselineTrace, baselineAfter, old.after.reward), newMetrics = metrics(newTrace, run.game.public(), rewards(run));
// Baseline records retain detailed expiry/draw events only through the six placement interval.
// Do not invent its later suffix expiry total or replay the baseline to fill this gap.
const baselineDetailed = base.six_placement_public_observations.filter(d => d.index >= sel.baseline_player_index);
const baselineKnownEvents = baselineDetailed.flatMap(d => d.interval.realized_events_audit_only);
const tracked = sel.baseline_expiring_nonheal_card;
function trackedEvents(events) {
  return events.filter(r => r.card_id === tracked || r.matched_id === tracked || r.received?.includes(tracked) || r.expired?.includes(tracked)).map(r => r.type === 'rebuild' ? {type: r.type, time: r.time, actor: r.actor, received_tracked_card: true} : copy(r));
}
const baselineTracked = trackedEvents(baselineKnownEvents);
for (const r of baselineTrace.filter(r => r.time >= 150 && (r.card_id === tracked || r.matched_id === tracked))) if (!baselineTracked.some(x => x.time === r.time && x.actor === r.actor && x.mode === r.mode)) baselineTracked.push({...r, type: 'action'});
const expiryAudit = {baseline: {known_interval_player_actions: baselineDetailed.length,
  known_interval_start: sel.time, known_interval_end: baselineDetailed.at(-1).next_player_ready.now,
  known_player_expiries: baselineDetailed.flatMap(d => d.interval.expired_player_cards),
  full_suffix_player_expiry_count: null, note: 'Original AZ1 detailed expiry/draw logs end at t150; AV action summaries omit expired. The remainder is unavailable, not zero. No baseline rerun.'},
  early_heal: {full_suffix_player_expiry_count: sum(observed.map(d => d.player_expiries.length)),
    expiries: observed.flatMap(d => d.player_expiries.map(c => ({time: d.before.now, card: c}))),
    comparable_first_four_player_actions_expiries: observed.slice(0, baselineDetailed.length).flatMap(d => d.player_expiries.map(c => ({time: d.before.now, card: c})))}};
const firstExpired = observed[0].player_expiries.find(c => c.id === tracked);
assert(firstExpired); assert(actualTrace.some(r => r.type === 'recover' && r.card_id === tracked && r.reason === 'expiry'));
assert(!actualTrace.some(r => r.type === 'destroy' && r.card_id === tracked));
const finalSha = sha(run.save()); assert.equal(sha(saved), checkpointSha);
for (const [p, hash] of Object.entries(frozen)) { assert.equal(C.hash(path.join(C.repo, p)), hash, 'Frozen source changed: ' + p); checks.original_inputs_unchanged++; }
for (const [p, hash] of Object.entries(ownHashes)) assert.equal(C.hash(path.join(__dirname, p)), hash);
const result = {trial: cfg.trial, selection: sel, baseline: {source: 'AZ1/AV saved suffix only', metrics: baselineMetrics, action_trace: baselineTrace, final_save_sha256: old.final_save_sha256},
  early_heal: {metrics: newMetrics, decisions, public_observations: observed, action_trace: newTrace, after: publicView(run.game.public()), final_save_sha256: finalSha},
  delta_early_minus_baseline: {hp: newMetrics.player_hp - baselineMetrics.player_hp, elapsed_time: newMetrics.elapsed_time - baselineMetrics.elapsed_time,
    player_actions: newMetrics.player_actions - baselineMetrics.player_actions, placements: (newMetrics.player_modes.place || 0) - (baselineMetrics.player_modes.place || 0),
    player_damage_to_V0: (newMetrics.target_progress.V0?.player_hp_loss || 0) - (baselineMetrics.target_progress.V0?.player_hp_loss || 0)},
  expiry_audit: expiryAudit, tracked_card: {id: tracked, baseline: baselineTracked, early_heal: trackedEvents(actualTrace),
    note: 'Early expiry moves this borrowed card to the shared recovery pool; it is not destroyed. Later allocation is retrospective audit only.'},
  checkpoint_manifest: {original_AV_checkpoint_sha256: sel.baseline_checkpoint_sha256, followup_start_sha256: checkpointSha,
    time: sel.time, completed_player_actions: sel.completed_player_actions, forced_choice: sel.choice,
    reconstruction: 'Reconstruct original AZ1 A42 + C8 + first3 baseline actions, verify saved hashes and t114 public view; run only early-heal9. Do not rerun full baseline.'},
  verification: {checks, frozen_source_hashes: frozen, own_hashes: ownHashes,
    execution_scope: {new_seeds: 0, A_prefix_actions: base.reconstruction_inputs.first_A.length, C_prefix_actions: base.reconstruction_inputs.C_prefix.length + sel.baseline_player_index,
      baseline_suffix_reruns: 0, new_comparison_branches: 1, new_branch_player_actions: decisions.length, extra_first_action_replays: 0, final_simulation_retests: 0}}};
fs.writeFileSync(path.join(__dirname, 'followup-results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({trial: cfg.trial, baseline: baselineMetrics, early_heal: newMetrics, delta: result.delta_early_minus_baseline, expiry: expiryAudit, checks}) + '\n');
