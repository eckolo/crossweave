'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), V = require('../av/policy.cjs'), cfg = require('./conditions.json');
const au = require('../au/results.json'), av = require('../av/results.json'), avManifest = require('../av/checkpoints-manifest.json');
const {C, AR, AH, Session, copy} = U, sel = cfg.selection;
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const sum = xs => xs.reduce((a, b) => a + b, 0);
const hist = xs => xs.reduce((out, key) => (out[key] = (out[key] || 0) + 1, out), {});
const paths = new Set(Object.keys(C.sources()));
for (const file of Object.keys(require.cache)) if (file.startsWith(C.repo + path.sep) && !file.startsWith(__dirname + path.sep)) paths.add(path.relative(C.repo, file));
function freezeDir(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) freezeDir(file); else paths.add(path.relative(C.repo, file));
  }
}
for (const dir of ['au', 'av', 'aw', 'ax', 'ay']) freezeDir(path.resolve(__dirname, '..', dir));
for (const file of ['posture_am/engine.js', 'expedition_choices.js', 'reward_preparation.js', 'expedition_loop.js', 'knowledge.js', 'information.js', 'terrain.js', 'ecology.js', 'feedback.js', 'choice_inputs.json', 'loop_inputs.json', 'reward_build_inputs.json', 'reward_build_inputs.py']) paths.add('docs/検証/統合試作/deck_feedback_trial/' + file);
const sourceHashes = Object.fromEntries([...paths].sort().map(p => [p, C.hash(path.join(C.repo, p))]));
const ownHashes = Object.fromEntries(['conditions.json', 'study.cjs'].map(p => [p, C.hash(path.join(__dirname, p))]));
const checks = {recreated_first_returns: 0, old_return_matches: 0, preparation_matches: 0, seed_matches: 0,
  public_policy_purity: 0, prediction_checks: 0, checkpoint_sha_matches: 0, restored_checkpoint_matches: 0,
  restored_first_action_matches: 0, saved_branch_trace_matches: 0, saved_final_sha_matches: 0,
  saved_other_branch_placement_rows_matches: 0, input_checkpoint_unchanged: 0, old_source_files_unchanged: 0};
const oldPair = av.support_pairs.find(x => x.id === sel.id), old = oldPair.branches[sel.branch];
const expected = avManifest.checkpoints.find(x => x.id === sel.id);
assert.equal(expected.saved_state_sha256, sel.saved_state_sha256);
const oldPlayer = old.trace.filter(x => x.actor === 'P');
const oldPlacements = oldPlayer.slice(sel.placement_first_player_index, sel.placement_first_player_index + sel.placement_count);
assert(oldPlacements.every(x => x.mode === 'place'));
assert.deepEqual(oldPlacements, oldPair.branches.target_support.trace.filter(x => x.actor === 'P').slice(sel.placement_first_player_index, sel.placement_first_player_index + sel.placement_count));
checks.saved_other_branch_placement_rows_matches++;

function policy(s, mode = 'pair') {
  const before = sha(s.save()), api = V.publicAPI(s.game);
  const value = mode === 'pair' ? V.pair(api) : AH.choose(api, 'progress_first');
  assert.equal(sha(s.save()), before, 'Public policy changed session'); checks.public_policy_purity++;
  return value;
}
function step(s, ch) { s.action(ch); checks.prediction_checks++; }
function traceRow(r) {
  return Object.fromEntries(['time', 'actor', 'mode', 'target', 'card_id', 'matched_id', 'origin', 'actual_hp_loss', 'hit_gain', 'hp_restored', 'action_cost'].map(k => [k, r[k]]));
}
function card(c) {
  return Object.fromEntries(['id', 'type', 'name', 'attr', 'kind', 'origin', 'remaining', 'life', 'power', 'hit', 'field_power', 'field_hit', 'place_cost', 'match_cost', 'evasion', 'crit_gain', 'consume_on_recover', 'doomed'].filter(k => Object.hasOwn(c, k)).map(k => [k, copy(c[k])]));
}
function publicView(pub) {
  return {now: pub.now, event: pub.current_event, outcome: pub.outcome, pool_count: pub.pool_count, live_card_count: pub.N,
    actors: Object.fromEntries(Object.entries(pub.actors).map(([id, a]) => [id, Object.fromEntries(['active', 'hp', 'max_hp', 'purpose', 'hit', 'posture_remaining', 'evasion', 'crit', 'guard', 'next_at', 'actions', 'hand_count', 'deck_count', 'rebuilds'].filter(k => Object.hasOwn(a, k)).map(k => [k, copy(a[k])]))])),
    hand: pub.actors.P.hand.map(card), field: Object.fromEntries(Object.entries(pub.field).map(([attr, c]) => [attr, card(c)]))};
}
function auditChoice(s, pair) {
  const api = V.publicAPI(s.game), pub = api.public(), hand = Object.fromEntries(pub.actors.P.hand.map(c => [c.id, c]));
  const base = AH.choose(api, 'progress_first'), picked = pair.leave_support;
  const choices = api.choices().map(ch => {
    const c = hand[ch.card_id], p = api.predict(ch);
    return {choice: copy(ch), card: card(c), prediction: copy(p), matched_field_id: pub.field[c.attr]?.id || null,
      healing_priority_eligible: p.mode === 'heal' && (p.hp_restored >= c.power || c.remaining === 1 && p.hp_restored > 0),
      active_enemy_before_next_P: Object.entries(pub.actors).filter(([, a]) => a.active && ['optional_enemy', 'goal_enemy'].includes(a.purpose) && a.next_at < pub.now + p.action_cost).map(([id]) => id)};
  });
  const matched = choices.filter(c => c.prediction.mode !== 'place'), selected = choices.find(c => JSON.stringify(c.choice) === JSON.stringify(picked.choice));
  const nonheal = choices.filter(c => c.card.kind !== 'heal');
  const fallback = [...(nonheal.length ? nonheal : choices)].sort((a, b) => a.card.remaining - b.card.remaining || a.prediction.action_cost - b.prediction.action_cost || a.card.id.localeCompare(b.card.id));
  let reason = 'nonplacement';
  if (selected.prediction.mode === 'place') {
    assert.equal(choices.filter(c => c.healing_priority_eligible).length, 0);
    assert.equal(nonheal.filter(c => c.prediction.mode === 'attack' || c.prediction.mode === 'guard' && (c.prediction.guard.value > 0 || c.prediction.guard.evasion > 0)).length, 0);
    assert.deepEqual(fallback[0].choice, base);
    reason = matched.length ? 'legal_match_exists_but_not_prioritized_then_nonheal_earliest_expiry' : 'no_legal_match_then_nonheal_earliest_expiry';
  }
  return {choice: copy(picked.choice), prediction: copy(selected.prediction), policy_reason: picked.reason,
    AH_base_choice: copy(base), explanatory_reason: reason, same_choice_between_public_policies: JSON.stringify(pair.leave_support.choice) === JSON.stringify(pair.target_support.choice),
    legal_match_choices: matched.length, legal_match_cards: [...new Set(matched.map(c => c.card.id))], legal_match_modes: hist(matched.map(c => c.prediction.mode)),
    legal_nonheal_match_cards: [...new Set(matched.filter(c => c.card.kind !== 'heal').map(c => c.card.id))],
    fallback_rank: fallback.map(c => ({card_id: c.card.id, remaining: c.card.remaining, action_cost: c.prediction.action_cost})), choices};
}
function intervalAudit(g, rows, before, after) {
  const actions = rows.filter(r => r.type === 'action'), played = actions.find(r => r.actor === 'P');
  const snapshots = new Map([...before.actors.P.hand, ...Object.values(before.field), ...after.actors.P.hand, ...Object.values(after.field)].map(c => [c.id, c]));
  const annotation = id => card(snapshots.get(id) || g.s.cards[id]);
  return {expired_player_cards: played.expired.map(id => ({...annotation(id), remaining_before: before.actors.P.hand.find(c => c.id === id)?.remaining})),
    player_retained: before.actors.P.hand.filter(c => after.actors.P.hand.some(x => x.id === c.id)).map(c => ({id: c.id, remaining_before: c.remaining, remaining_after: after.actors.P.hand.find(x => x.id === c.id).remaining})),
    player_drawn: rows.filter(r => r.type === 'draw' && r.actor === 'P').map(r => ({time: r.time, card: annotation(r.card_id)})),
    realized_events_audit_only: rows.filter(r => ['action', 'draw', 'recover', 'destroy', 'rebuild'].includes(r.type)).map(r => {
      if (r.type === 'action') return {...traceRow(r), type: r.type, expired: r.expired};
      if (r.type === 'draw') return {type: r.type, time: r.time, actor: r.actor, card_id: r.card_id, attr: g.s.cards[r.card_id].attr, kind: g.s.cards[r.card_id].kind, origin: g.s.cards[r.card_id].origin};
      return copy(r);
    })};
}

const seeds = C.seeds.slice(sel.offset).concat(C.seeds.slice(0, sel.offset));
const first = new Session(seeds, sel.tag), historyDecisions = [];
first.prepare(sel.first); first.depart(sel.first);
while (!first.game.s.outcome) { const ch = policy(first, 'AH'); historyDecisions.push(copy(ch)); step(first, ch); }
checks.recreated_first_returns++;
const prior = au.natural.find(x => x.offset === sel.offset && x.first === sel.first && x.index === 0);
for (const [k, actual] of Object.entries({outcome: first.game.s.outcome, actions: first.game.s.actors.P.actions, hp: first.game.s.actors.P.hp, time: first.game.s.now})) assert.equal(actual, prior[k], 'AU return mismatch: ' + k);
assert.deepEqual(first.data.receipts.at(-1), prior.receipt); assert.deepEqual(first.game.s.events, prior.boundaries); checks.old_return_matches++;
assert.equal(first.game.s.outcome, 'clear');
const firstTerminalHash = sha(first.save()); first.home(); first.data.economy = AR.sellSurplus(first.data.economy, 'sale-0');
const firstReturnHash = sha(first.save()); first.prepare('C', 'adapt', sel.deck);
const baseline = au.paired.find(x => x.stage === 'first_clear' && x.route === 'C' && x.policy === 'progress_first' && x.offset === sel.offset && x.first === sel.first && x.deck === sel.deck);
assert.deepEqual(first.data.economy.aq.equipped, baseline.equipped);
assert.deepEqual(U.canonical(first.data.economy, first.data.au.deck).filter(x => x.uid !== null).map(x => x.blueprint), baseline.selected_blueprints); checks.preparation_matches++;
first.depart('C'); assert.equal(first.data.active.seed, baseline.seed); assert.equal(first.data.active.seed, sel.seed); checks.seed_matches++;
const prefixDecisions = [], launchHash = sha(first.save());
while (!first.game.s.outcome) {
  const pub = first.game.public(), pair = policy(first), leave = pair.leave_support.choice, pred = first.game.predict(leave);
  const stratum = (pub.actors.E1?.active ? 'enemy' : 'entrance') + '/' + (pub.actors.P.hand.some(c => c.origin !== 'P') ? 'borrowed' : 'no_borrowed');
  if (stratum === expected.category && pub.actors.V1?.active && pred.mode === 'attack' && ['passage', 'goal_enemy'].includes(pub.actors[leave.target]?.purpose) && pair.target_support.choice.target !== leave.target) break;
  assert(first.game.s.actors.P.actions < sel.completed_player_actions, 'Passed expected checkpoint');
  prefixDecisions.push(copy(leave)); step(first, leave);
}
assert.equal(first.game.s.actors.P.actions, sel.completed_player_actions); assert.equal(first.game.s.now, sel.time);
const saved = first.save(), initialSha = sha(saved); assert.equal(initialSha, sel.saved_state_sha256); checks.checkpoint_sha_matches++;
const run = new Session(seeds, sel.tag, saved); assert.equal(sha(run.save()), initialSha); checks.restored_checkpoint_matches++;
const traceStart = run.game.trace.length, decisions = [], placementDetails = [], intervals = [];
for (let index = 0; index < sel.horizon_player_actions && !run.game.s.outcome; index++) {
  const before = run.game.public(), pair = policy(run), ch = pair[sel.branch].choice, picked = auditChoice(run, pair);
  const detail = index >= sel.placement_first_player_index && index < sel.placement_first_player_index + sel.placement_count;
  const rowStart = run.game.trace.length, replay = index === 0 ? new Session(seeds, sel.tag, run.save()) : null;
  step(run, ch);
  if (replay) { replay.action(ch); assert.deepEqual(replay.save(), run.save()); checks.restored_first_action_matches++; }
  const after = run.game.public(), rows = run.game.trace.slice(rowStart), action = rows.find(r => r.type === 'action' && r.actor === 'P');
  decisions.push({index, player_action_number: action.action_number, policy_reason: picked.policy_reason, choice: copy(ch), actual: traceRow(action)});
  intervals.push({index, before: before.now, next_player_ready: after.now, rows});
  if (detail) placementDetails.push({index, placement_number: index - sel.placement_first_player_index + 1,
    before: publicView(before), decision: picked, actual: traceRow(action), interval: intervalAudit(run.game, rows, before, after), next_player_ready: publicView(after)});
}
const fullTrace = run.game.trace.slice(traceStart), actions = fullTrace.filter(r => r.type === 'action').map(traceRow);
assert.deepEqual(actions, old.trace); checks.saved_branch_trace_matches++;
const finalSha = sha(run.save()); assert.equal(finalSha, old.final_save_sha256); checks.saved_final_sha_matches++;
assert.equal(sha(saved), initialSha); checks.input_checkpoint_unchanged++;
const lifecycles = placementDetails.map(d => {
  const chosen = d.decision.choices.find(c => c.choice.card_id === d.actual.card_id), actionIndex = fullTrace.findIndex(r => r.type === 'action' && r.actor === 'P' && r.card_id === d.actual.card_id && r.time === d.actual.time);
  const consumed = fullTrace.slice(actionIndex + 1).find(r => r.type === 'action' && r.matched_id === d.actual.card_id);
  const nextReady = d.next_player_ready.now;
  return {placement_number: d.placement_number, card: chosen.card, placed_at: d.actual.time, next_player_ready: nextReady,
    first_material_consumption: consumed ? {...traceRow(consumed), at_or_before_next_player_ready: consumed.time <= nextReady} : null,
    survived_until_next_player_ready: Object.values(d.next_player_ready.field).some(c => c.id === d.actual.card_id),
    in_field_at_horizon: Object.values(run.game.public().field).some(c => c.id === d.actual.card_id),
    field_lifetime_note: 'remaining is cleared on placement; hand-life expiry does not apply on the field. A consumed card can later circulate and be placed again.'};
});
const summary = {placement_actions: placementDetails.length, classification: hist(placementDetails.map(d => d.decision.explanatory_reason)),
  public_policy_reasons: hist(placementDetails.map(d => d.decision.policy_reason)),
  legal_nonheal_match_present_actions: placementDetails.filter(d => d.decision.legal_nonheal_match_cards.length).length,
  placed_card_first_consumption_by_actor: hist(lifecycles.map(d => d.first_material_consumption?.actor || 'unconsumed')),
  placed_cards_consumed_by_other_actor_before_next_P: lifecycles.filter(d => d.first_material_consumption?.actor !== 'P' && d.first_material_consumption?.at_or_before_next_player_ready).length,
  player_hand_expiries: sum(placementDetails.map(d => d.interval.expired_player_cards.length)),
  player_draws: sum(placementDetails.map(d => d.interval.player_drawn.length)),
  streak_start_time: placementDetails[0].before.now, first_player_ready_after_streak: placementDetails.at(-1).next_player_ready.now,
  player_hp_before_streak: placementDetails[0].before.actors.P.hp, player_hp_after_streak: placementDetails.at(-1).next_player_ready.actors.P.hp,
  horizon: {additional_actions: decisions.length, elapsed_time: run.game.s.now - sel.time, outcome: run.game.s.outcome || 'ongoing', hp: run.game.s.actors.P.hp}};
for (const [p, hash] of Object.entries(sourceHashes)) { assert.equal(C.hash(path.join(C.repo, p)), hash, 'Frozen input changed: ' + p); checks.old_source_files_unchanged++; }
for (const [p, hash] of Object.entries(ownHashes)) assert.equal(C.hash(path.join(__dirname, p)), hash);
const manifest = {trial: cfg.trial, source_hashes: sourceHashes, own_hashes: ownHashes, reconstruction: 'node docs/検証/構築と探索/az/study.cjs; reconstruct only one A return, C prefix through P8, and one 12-action AV leave_support branch. The first action is restored once for save verification. No full checkpoint archive is required.',
  checkpoints: [{id: sel.id, tag: sel.tag, seed: sel.seed, completed_player_actions: sel.completed_player_actions, time: sel.time, saved_state_sha256: initialSha}],
  reconstruction_hashes: {first_A_terminal: firstTerminalHash, first_return_after_home_sale0: firstReturnHash, C_launch: launchHash, AV_checkpoint: initialSha, AV_branch_final: finalSha},
  hidden_state_note: 'SHA includes complete Session save with RNG; diagnostics store current public views and retrospective event traces separately. No hidden deck or future stream reaches the policy.'};
write('results.json', {trial: cfg.trial, selection: sel, summary, reconstruction_inputs: {first_A: historyDecisions, C_prefix: prefixDecisions},
  baseline_decisions: decisions, six_placement_public_observations: placementDetails, placed_material_lifecycles: lifecycles,
  full_baseline_action_trace: actions, initial_save_sha256: initialSha, final_save_sha256: finalSha});
write('checkpoints-manifest.json', manifest);
write('verification.json', {trial: cfg.trial, checks, source_hashes: sourceHashes, own_hashes: ownHashes,
  output_hashes: Object.fromEntries(['results.json', 'checkpoints-manifest.json'].map(p => [p, C.hash(path.join(__dirname, p))])),
  execution_scope: {new_seeds: 0, reconstructed_first_returns: 1, partial_C_trunks: 1, baseline_branches: 1, additional_comparison_branches: 0, first_action_restore_only: 1, extra_final_simulation_retests: 0}});
process.stdout.write(JSON.stringify({trial: cfg.trial, summary, checks}) + '\n');
