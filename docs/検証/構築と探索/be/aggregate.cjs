'use strict';
// Saved-JSON aggregation only: never imports or runs an old game/policy/study.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const {project, compareReservations} = require('./project.cjs');
const root = path.resolve(__dirname, '../../../..');
const rel = name => path.relative(root, path.join(__dirname, name));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fileHash = file => hash(fs.readFileSync(path.join(root, file)));
const copy = value => JSON.parse(JSON.stringify(value));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const cfg = json(rel('conditions.json'));
assert.deepEqual(cfg.selection.candidate_times, [94, 114, 142]);
assert.equal(cfg.selection.maximum_cases, 3);
const base = 'docs/検証/構築と探索/';
const azFile = base + 'az/results.json', followupFile = base + 'az/followup-results.json';
const avFile = base + 'av/results.json';
const engineFile = 'docs/検証/統合試作/deck_feedback_trial/posture_am/engine.js';
const choicesFile = 'docs/検証/統合試作/deck_feedback_trial/expedition_choices.js';
const historical = json(base + 'az/verification.json').source_hashes;
const oldFiles = new Set(Object.keys(historical));
function freezeDir(dir) {
  for (const ent of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) freezeDir(file); else oldFiles.add(file);
  }
}
for (const dir of ['au', 'av', 'aw', 'ax', 'ay', 'az', 'ba', 'bb', 'bc']) freezeDir(base + dir);
oldFiles.add(engineFile); oldFiles.add(choicesFile);
const frozen = Object.fromEntries([...oldFiles].sort().map(file => [file, fileHash(file)]));
for (const [file, sha] of Object.entries(historical)) assert.equal(frozen[file], sha, 'Historical source changed: ' + file);

const source = json(azFile), followup = json(followupFile), av = json(avFile);
assert.equal(source.selection.id, cfg.selection.baseline_id);
assert.equal(source.selection.branch, cfg.selection.mode);
const original = av.support_pairs.find(p => p.id === cfg.selection.baseline_id);
assert(original?.branches[cfg.selection.mode]);
const engine = read(engineFile), choicesEngine = read(choicesFile);
const anchors = {
  role_from_public_actor_id: "role=w==='P'?'P':w==='O'?'O':w[0]",
  same_time_role_order: 'const order={V:0,P:1,E:2}',
  same_role_id_order: 'order[this.s.actors[x].role]-order[this.s.actors[y].role]||x.localeCompare(y)',
  hand_decrement_then_expiry: "this.s.cards[id].remaining--;if(!this.s.cards[id].remaining){a.hand.splice(a.hand.indexOf(id),1);expired.push(id);this.recover(id,'expiry');}",
  placement_clears_hand_deadline: 'a.hand.splice(a.hand.indexOf(c.id),1);c.remaining=null;',
  placement_without_main_effect: "if(!mid){assert(target===null,'placement target');this.s.field[c.attr]=c.id;}",
  ordinary_recovery_to_shared_pool: "this.s.pool.push(id);this.log('recover',{card_id:id,reason});",
  recovery_exceptions: "if(c.consume_on_recover||c.doomed||c.birth==='filler')",
  current_heal_cap: "else if(c.kind==='heal')result.hp_restored=Math.min(c.power,a.max_hp-a.hp);",
  non_hand_has_no_deadline: "if(!hands.has(c.id))assert(c.remaining===null,'non-hand deadline');"
};
for (const anchor of Object.values(anchors)) assert(engine.includes(anchor), 'Existing rule anchor no longer matches: ' + anchor);
const reservationAnchor = 'if(this.s.actors[w].active)this.s.actors[w].next_at=this.s.now+cost;';
assert(choicesEngine.includes(reservationAnchor));
const output = project(source, cfg.selection.candidate_times);
assert(output.cases.length <= cfg.selection.maximum_cases);
let legalActionsChecked = 0;
for (const item of output.cases) {
  const saved = source.six_placement_public_observations.find(o => o.before?.now === item.now);
  assert.deepEqual(item.hand.map(c => [c.id, c.remaining]), saved.before.hand.map(c => [c.id, c.remaining]));
  assert(original.branches[cfg.selection.mode].trace.some(r => r.actor === 'P' && r.time === item.now));
  for (const action of item.legal_actions) {
    const old = saved.decision.choices.find(c => c.choice.card_id === action.card_id && c.choice.target === action.target);
    assert(old);
    assert.equal(action.mode, old.prediction.mode);
    assert.equal(action.current_hp_restored, old.prediction.hp_restored);
    assert.equal(action.action_cost, old.prediction.action_cost);
    assert.equal(action.next_self_reservation, item.now + old.prediction.action_cost);
    assert.equal(action.matched_field_id, saved.before.field[saved.before.hand.find(c => c.id === action.card_id).attr]?.id || null);
    legalActionsChecked++;
  }
}
const at = now => output.cases.find(c => c.now === now);
if (at(94)) assert(at(94).legal_actions.every(a => a.mode === 'place' && a.current_hp_restored === 0));
if (at(114)) {
const heal114 = at(114).legal_actions.filter(a => a.mode !== 'place');
assert.equal(heal114.length, 1); assert.equal(heal114[0].current_hp_restored, 4);
assert.deepEqual(heal114[0].unused_hand_after_action, [
  {card_id: 'V1_initial_0025', remaining_after_action: 0, destination: 'shared_recovery'},
  {card_id: 'P_initial_0008', remaining_after_action: 1, destination: 'hand'}
]);
}
if (at(142)) {
const b142 = at(142).legal_actions.find(a => a.card_id === 'P_initial_0007');
assert.equal(b142.next_self_reservation, 150);
assert.deepEqual(b142.currently_reserved_before_next_self, [
  {actor: 'V0', next_at: 150, relation: 'same_time_V_before_P'},
  {actor: 'V1', next_at: 150, relation: 'same_time_V_before_P'}
]);
}
// Public snapshot and legal predictions were independently saved at the early-heal branch start.
if (at(114)) {
const firstFollowup = followup.early_heal.public_observations[0];
const firstBaseline = source.six_placement_public_observations.find(o => o.before?.now === 114);
assert.deepEqual(firstFollowup.before, firstBaseline.before);
assert.deepEqual(firstFollowup.legal_choices, firstBaseline.decision.choices.map(r => ({choice: r.choice, prediction: r.prediction})));
}

// Meaningful information-boundary tests: changing all nonpublic/future/selection branches
// and adding private data cannot influence the display projection.
const changed = copy(source);
for (const key of Object.keys(changed)) if (key !== 'six_placement_public_observations') changed[key] = {excluded_marker: key};
for (const observation of changed.six_placement_public_observations) {
  if (!at(observation.before?.now)) continue;
  for (const key of Object.keys(observation)) if (!['before', 'decision'].includes(key)) observation[key] = {future_marker: key};
  for (const key of Object.keys(observation.decision)) if (key !== 'choices') observation.decision[key] = {policy_marker: key};
  observation.before.outcome = 'CHANGED_FUTURE_OUTCOME';
  observation.before.private_rng = {seed: 'SECRET_MARKER'};
  observation.before.private_pool = ['SECRET_MARKER'];
  for (const [id, actor] of Object.entries(observation.before.actors)) if (id !== 'P') {
    actor.hand = ['SECRET_MARKER']; actor.deck = ['SECRET_MARKER']; actor.next_card = 'SECRET_MARKER';
  }
  for (const choice of observation.decision.choices) {
    choice.healing_priority_eligible = 'POLICY_MARKER';
    choice.active_enemy_before_next_P = ['STRICT_LT_MARKER'];
    choice.matched_field_id = 'IGNORED_DERIVED_COPY_MARKER';
    choice.card = {future_marker: 'IGNORED_DUPLICATE_CARD'};
    choice.prediction.future_damage = 'SECRET_MARKER';
  }
}
assert.deepEqual(project(changed, cfg.selection.candidate_times), output);
const deniedKeys = new Set(['actual', 'interval', 'next_player_ready', 'choice', 'policy_reason', 'AH_base_choice', 'explanatory_reason', 'fallback_rank']);
const denied = copy(source);
for (const o of denied.six_placement_public_observations) {
  if (!at(o.before?.now)) continue;
  for (const key of ['actual', 'interval', 'next_player_ready']) Object.defineProperty(o, key, {get() { throw Error('Future access: ' + key); }});
  for (const key of [...deniedKeys].filter(k => !['actual', 'interval', 'next_player_ready'].includes(k))) Object.defineProperty(o.decision, key, {get() { throw Error('Policy access: ' + key); }});
}
assert.deepEqual(project(denied, cfg.selection.candidate_times), output);
// No future fields are needed: the projection also succeeds with only the accepted source envelope.
const minimal = {six_placement_public_observations: source.six_placement_public_observations.map(o => !at(o.before?.now) ? o : ({
  before: {now: o.before.now, actors: Object.fromEntries(Object.entries(o.before.actors).map(([id, a]) => [id,
    id === 'P' ? {next_at: a.next_at, hp: a.hp, max_hp: a.max_hp} : {active: a.active, next_at: a.next_at, purpose: a.purpose}])),
  hand: o.before.hand, field: o.before.field},
  decision: {choices: o.decision.choices.map(c => ({choice: c.choice, prediction: {
    mode: c.prediction.mode, action_cost: c.prediction.action_cost, hp_restored: c.prediction.hp_restored}}))}
}))};
assert.deepEqual(project(minimal, cfg.selection.candidate_times), output);
let missingFieldChecks = 0;
for (const [time, remove] of [
  [94, o => { delete o.before.field; }],
  [114, o => { delete o.before.actors.P.next_at; }],
  [114, o => { delete o.before.hand.find(c => c.kind === 'heal').power; }],
  [142, o => { delete o.before.hand.find(c => c.remaining === 1).doomed; }]
]) {
  if (!at(time)) continue;
  const unavailable = copy(minimal);
  remove(unavailable.six_placement_public_observations.find(o => o.before?.now === time));
  const reduced = project(unavailable, cfg.selection.candidate_times);
  assert.deepEqual(reduced.cases.map(c => c.now), output.cases.map(c => c.now).filter(t => t !== time));
  assert.equal(reduced.omitted.length, output.omitted.length + 1); missingFieldChecks++;
}
// No strictly-earlier-only shortcut: same-time V precedes P, same-time E follows P.
assert(compareReservations({actor: 'V0', role: 'V', next_at: 150}, {actor: 'P', role: 'P', next_at: 150}) < 0);
assert(compareReservations({actor: 'E1', role: 'E', next_at: 150}, {actor: 'P', role: 'P', next_at: 150}) > 0);

const serialized = JSON.stringify(output);
for (const forbidden of ['SECRET_MARKER', 'POLICY_MARKER', 'STRICT_LT_MARKER', 'CHANGED_FUTURE_OUTCOME',
  'policy_reason', 'fallback_rank', 'realized_events', 'first_material_consumption', 'final_save_sha256']) assert(!serialized.includes(forbidden));
for (const [file, sha] of Object.entries(frozen)) assert.equal(fileHash(file), sha, 'Input modified: ' + file);
assert(Object.keys(require.cache).every(file => file.startsWith(__dirname + path.sep)), 'Imported an old executable module');
write('results.json', output);
write('verification.json', {
  trial: cfg.trial, base_commit: cfg.base_commit, formal_spec: cfg.formal_spec,
  input_resolution: {source: azFile, observation_key: 'six_placement_public_observations',
    selected_times: output.cases.map(c => c.now), omitted: output.omitted,
    source_checkpoint_sha256: source.initial_save_sha256},
  checks: {
    old_files_unchanged: Object.keys(frozen).length, historical_source_hashes_match: Object.keys(historical).length,
    saved_cases: output.cases.length, legal_actions: legalActionsChecked,
    followup_start_public_state_equal: at(114) ? true : null, followup_start_legal_predictions_equal: at(114) ? true : null,
    forbidden_fields_mutation_invariant: true, forbidden_fields_access_denied: true,
    minimal_public_input_equal: true, missing_public_snapshot_omitted: missingFieldChecks,
    same_time_V_before_P_and_E_after_P: true, legacy_executable_imports: 0
  },
  public_boundary: {
    source_allowlist: ['before.now', 'before.actors.P.{hp,max_hp,next_at}', 'before.actors[others].{active,purpose,next_at}',
      'before.hand.{id,name,attr,kind,remaining,power,consume_on_recover,doomed}', 'before.field.{id,name,attr,remaining}',
      'decision.choices[].choice.{card_id,target}', 'decision.choices[].prediction.{mode,action_cost,hp_restored}'],
    role_mapping_scope: 'Only P,V0,V1 in these fixed saved AZ snapshots, from existing engine.enter(). Unknown IDs fail.',
    optional_card_flag: 'consume_on_recover may be absent/null in saved ordinary cards. Existing recover() uses a truthy check; its absence is not an inferred private value. No default flag is displayed.',
    rule_anchors: Object.fromEntries(Object.entries(anchors).map(([rule, text]) => [rule, {file: engineFile, anchor: text}])),
    reservation_anchor: {file: choicesFile, anchor: reservationAnchor},
    excluded: cfg.excluded_from_display,
    limit: 'Current public reservations only; later NPC choices, re-reservation, retirement, allocation and arrival at the next P turn are not predicted. Audit sources are not display input.'
  },
  frozen_source_hashes: frozen,
  own_hashes: Object.fromEntries(['conditions.json', 'project.cjs', 'aggregate.cjs', 'results.json'].map(file => [file, fileHash(rel(file))])),
  execution_scope: {...cfg.execution_limits, loaded_old_executable_modules: 0, public_projections_only: true}
});
process.stdout.write(JSON.stringify({cases: output.cases.map(c => c.now), legal_actions: legalActionsChecked,
  unchanged_files: Object.keys(frozen).length, new_battles: 0, old_comparison_reruns: 0}) + '\n');
