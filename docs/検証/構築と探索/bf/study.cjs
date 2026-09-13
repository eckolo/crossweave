'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const dir = __dirname, repo = path.resolve(dir, '../../../..');
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'conditions.json')));
const hash = x => crypto.createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = p => hash(fs.readFileSync(p));
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name)));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const sum = xs => xs.reduce((a, b) => a + b, 0);
const counts = xs => xs.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {});
function sourcesUnchanged() {
  for (const [p, h] of Object.entries(cfg.source_hashes)) assert.equal(fileHash(path.join(repo, p)), h, p);
}
sourcesUnchanged();
if (process.argv.includes('--check') || fs.existsSync(path.join(dir, 'verification.json'))) {
  const v = read('verification.json');
  for (const [p, h] of Object.entries(v.artifacts)) assert.equal(fileHash(path.join(dir, p)), h, p);
  const home = read('home-snapshot.json'), result = read('results.json');
  assert.equal(hash(home.snapshot), cfg.selection.home_sha256);
  assert.equal(result.new_branches.length, 4); assert.equal(result.reused_branches.length, 4);
  console.log(JSON.stringify({trial: cfg.trial, saved_results_verified: true, new_combat: 0}));
  process.exit(0);
}
const U = require('../au/session.cjs'), {C, AR, Q, AH, copy, Session} = U;
const au = require('../au/results.json'), ax = require('../ax/results.json');
const seeds = C.seeds, tag = 'au-natural-0-A';
const checks = {prefix_returns: 0, prefix_actions: 0, reused_preparations: 0, new_predictions: 0,
  public_policy_purity: 0, initial_restore_and_first_action: 0, original_possessions_preserved: 0,
  repeat_settlement: 0, input_home_unchanged: 0, economy_unchanged_by_preparation: 0};
function endpoint(s, row) {
  for (const [k, v] of Object.entries({seed: s.data.active.seed, outcome: s.game.s.outcome,
    actions: s.game.s.actors.P.actions, hp: s.game.s.actors.P.hp, time: s.game.s.now})) assert.equal(v, row[k], row.label + '/' + k);
  assert.deepEqual(s.data.receipts.at(-1), row.receipt);
}
let checkpoint;
if (fs.existsSync(path.join(dir, 'home-snapshot.json'))) {
  checkpoint = read('home-snapshot.json');
  assert.equal(checkpoint.conditions_sha256, fileHash(path.join(dir, 'conditions.json')));
  assert.equal(hash(checkpoint.snapshot), cfg.selection.home_sha256);
  Object.assign(checks, checkpoint.reconstruction_checks);
} else {
  const s = new Session(seeds, tag), history = [];
  assert.equal(ax.history.length, cfg.selection.returns);
  for (let i = 0; i < ax.history.length; i++) {
    const old = ax.history[i], row = au.natural.find(r => r.label === old.label);
    assert.equal(row.offset, 0); assert.equal(row.first, 'A'); assert.equal(row.index, i);
    s.prepare(old.route); assert.deepEqual(s.data.economy.aq.equipped, row.equipped);
    assert.deepEqual(Object.keys(s.data.economy.profile.learned), row.learned);
    assert.deepEqual(U.canonical(s.data.economy, s.data.au.deck).filter(e => e.uid !== null).map(e => e.blueprint), row.selected_blueprints);
    s.depart(old.route);
    for (const choice of old.choices) { s.action(choice); checks.prefix_actions++; }
    endpoint(s, row); assert.deepEqual(s.game.s.events, row.boundaries);
    if (old.bought) {
      s.buy(old.bought.choice, 'buy-' + i);
      assert.deepEqual(s.data.economy.at.purchases['buy-' + i], old.bought);
    }
    s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'sale-' + i);
    assert.equal(hash(s.save()), old.home_save_sha256, 'Prefix return ' + i);
    assert.equal(s.data.economy.profile.points + s.data.economy.remainder / 100, row.unspent);
    assert.equal(Object.keys(s.data.economy.inventory).length, row.total_owned);
    checks.prefix_returns++;
    history.push({index: i, label: old.label, actions: old.choices.length, saved_state_sha256: old.home_save_sha256});
    console.log(JSON.stringify({prefix_return: i + 1, saved_hash_matches: true}));
  }
  assert.equal(checks.prefix_actions, cfg.selection.prefix_actions);
  assert.equal(hash(s.save()), cfg.selection.home_sha256);
  checkpoint = {trial: cfg.trial, source: cfg.selection.prefix_source,
    conditions_sha256: fileHash(path.join(dir, 'conditions.json')), saved_state_sha256: hash(s.save()),
    reconstruction_checks: {prefix_returns: checks.prefix_returns, prefix_actions: checks.prefix_actions},
    history, snapshot: s.save(), disclosure: 'Internal full save for reuse and verification; never pass to display.'};
  write('home-snapshot.json', checkpoint);
}
const home = checkpoint.snapshot;
assert.equal(home.nextRun, 8); assert.equal(seeds[8].seed, cfg.selection.next_seed);
assert.deepEqual(Object.keys(home.economy.profile.learned).sort(), ['PS01', 'PS02', 'PS03', 'PS04']);
const equipment = Object.fromEntries(Object.entries(cfg.equipment).map(([id, ids]) => {
  const entries = ids.map(x => Q.resolve(home.economy, x)), assessment = Q.assess(entries);
  assert.ok(assessment.fits); return [id, {ids, entries, assessment, unused_capacity: cfg.limits.capacity - assessment.cost}];
}));
function stableEconomy(e) {
  return {profile: copy(e.profile), inventory: copy(e.inventory), remainder: e.remainder, at: copy(e.at)};
}
function prepare(route, deck, kind) {
  const s = new Session(seeds, tag, home), original = stableEconomy(s.data.economy);
  s.setDeck(U.chooseDeck(s.data.economy, route, deck));
  s.data.economy = Q.equip(s.data.economy, cfg.equipment[kind]);
  assert.deepEqual(stableEconomy(s.data.economy), original); checks.economy_unchanged_by_preparation++;
  return s;
}
const deckRecipes = {};
const reused = cfg.reuse.map(ref => {
  const row = au.paired.find(r => r.label === ref.label); assert.ok(row);
  const s = prepare(ref.route, ref.deck, ref.equipment);
  assert.deepEqual(s.data.economy.aq.equipped, row.equipped);
  assert.deepEqual(Object.keys(s.data.economy.profile.learned), row.learned);
  assert.deepEqual(U.canonical(s.data.economy, s.data.au.deck).filter(e => e.uid !== null).map(e => e.blueprint), row.selected_blueprints);
  const automatic = new Session(seeds, tag, home); automatic.prepare(ref.route, 'adapt', ref.deck);
  assert.deepEqual(s.save(), automatic.save(), 'Reused AU preparation exact');
  checks.reused_preparations++;
  const ids = s.data.au.deck;
  if (deckRecipes[ref.deck]) assert.deepEqual(ids, deckRecipes[ref.deck], 'A/C deck equality');
  else deckRecipes[ref.deck] = copy(ids);
  return {id: ref.route + '-' + ref.equipment + '-' + ref.deck, ...ref, provenance: 'saved_AU_no_replay',
    source: 'docs/検証/構築と探索/au/results.json#/paired/' + au.paired.indexOf(row),
    preparation_sha256: hash(s.save()), seed: row.seed, outcome: row.outcome, actions: row.actions,
    hp: row.hp, time: row.time, phases: row.phases, npc_acquired_uses: row.npc_acquired_uses,
    npc_acquired_field_uses: row.npc_acquired_field_uses, max_same_mode_target_streak: row.max_same_mode_target_streak,
    segments: row.segments, boundaries: row.boundaries, receipt: row.receipt,
    limitation: 'AU stores aggregate phases and selected decisions, not a complete comparable public trace.'};
});
const knownSources = new Set(Object.keys(cfg.source_hashes).map(x => path.join(repo, x)));
for (const p of Object.keys(require.cache)) {
  if (p.startsWith(repo + path.sep) && !p.startsWith(dir + path.sep)) assert.ok(knownSources.has(p), 'Unfrozen dependency ' + p);
}
const runs = fs.existsSync(path.join(dir, 'completed-branches.json')) ? read('completed-branches.json') : [];
function phase(rows, cards, selected) {
  return {actions: rows.length, modes: counts(rows.map(r => r.mode)), borrowed_uses: rows.filter(r => r.origin !== 'P').length,
    own_initial_uses: rows.filter(r => r.origin === 'P' && cards[r.card_id].birth === 'initial').length,
    acquired_uses: rows.filter(r => selected.has(r.card_id)).length,
    acquired_field_uses: rows.filter(r => selected.has(r.matched_id)).length,
    hp_damage: sum(rows.map(r => r.actual_hp_loss)), matched_attacks: rows.filter(r => r.mode === 'attack').length,
    zero_hp_attacks: rows.filter(r => r.mode === 'attack' && r.actual_hp_loss === 0).length,
    zero_hp_and_probe_attacks: rows.filter(r => r.mode === 'attack' && r.actual_hp_loss === 0 && r.hit_gain === 0).length};
}
for (const spec of cfg.new_branches) {
  const priorRun = runs.find(r => r.id === spec.id);
  if (priorRun) {
    assert.equal(priorRun.conditions_sha256, fileHash(path.join(dir, 'conditions.json')));
    assert.equal(priorRun.code_sha256, fileHash(__filename));
    for (const [k, v] of Object.entries(priorRun.checks)) checks[k] += v;
    continue;
  }
  const startChecks = copy(checks), s = prepare(spec.route, spec.deck, spec.equipment), preparation = s.save();
  assert.deepEqual(s.data.au.deck, deckRecipes[spec.deck]);
  const priorPossessions = copy(s.data.economy.inventory);
  s.depart(spec.route); const launch = s.save(), decisions = [];
  let restored = false, trace = [...s.game.trace];
  while (!s.game.s.outcome) {
    const g = s.game, before = hash(s.save());
    const publicAPI = Object.freeze({public: () => g.public(), choices: () => g.choices(), predict: c => g.predict(c)});
    const choice = copy(AH.choose(publicAPI, cfg.selection.policy));
    assert.equal(hash(s.save()), before); checks.public_policy_purity++;
    if (decisions.length < 10) decisions.push({index: g.s.actors.P.actions + 1, public: g.public(),
      legal: g.choices().map(c => ({choice: c, prediction: g.predict(c)})), selected: choice,
      disclosure: 'Research trace; selected policy is not a player recommendation.'});
    let other;
    if (!restored) { other = new Session(seeds, tag, launch); assert.deepEqual(other.save(), launch); }
    const n = g.trace.length; s.action(choice); checks.new_predictions++; trace.push(...g.trace.slice(n));
    if (other) { other.action(choice); assert.deepEqual(other.save(), s.save()); restored = true; checks.initial_restore_and_first_action++; }
  }
  assert.ok(cfg.execution.per_branch_terminal.includes(s.game.s.outcome));
  for (const [uid, item] of Object.entries(priorPossessions)) assert.deepEqual(s.data.economy.inventory[uid], item);
  checks.original_possessions_preserved++;
  if (s.game.s.outcome !== 'cutoff') {
    const settled = s.save(); s.collect(); assert.deepEqual(s.save(), settled); checks.repeat_settlement++;
  }
  assert.equal(hash(home), cfg.selection.home_sha256); checks.input_home_unchanged++;
  const g = s.game, rows = trace.filter(r => r.type === 'action' && r.actor === 'P');
  const npc = trace.filter(r => r.type === 'action' && r.actor !== 'P');
  const selected = new Set(g.s.au.entries.filter(e => e.uid !== null).map(e => e.instance));
  let maximum = 0, n = 0, last = null; const segments = {};
  for (const r of rows) {
    const k = JSON.stringify([r.event_before, r.mode, r.target]); n = k === last ? n + 1 : 1; maximum = Math.max(maximum, n); last = k;
    const seg = segments[r.event_before] ||= {actions: 0, attacks: 0, placements: 0, zero_hp_attacks: 0};
    seg.actions++; seg.attacks += +(r.mode === 'attack'); seg.placements += +(r.mode === 'place');
    seg.zero_hp_attacks += +(r.mode === 'attack' && r.actual_hp_loss === 0);
  }
  const run = {...spec, provenance: 'new_cross_branch', conditions_sha256: fileHash(path.join(dir, 'conditions.json')),
    code_sha256: fileHash(__filename), preparation_sha256: hash(preparation), launch_sha256: hash(launch),
    final_saved_sha256: hash(s.save()), seed: s.data.active.seed, outcome: g.s.outcome,
    actions: g.s.actors.P.actions, hp: g.s.actors.P.hp, time: g.s.now,
    phases: {before_player_refill: phase(rows.filter(r => r.player_rebuilds === 0), g.s.cards, selected),
      after_player_refill: phase(rows.filter(r => r.player_rebuilds > 0), g.s.cards, selected)},
    npc_acquired_uses: npc.filter(r => selected.has(r.card_id)).length,
    npc_acquired_field_uses: npc.filter(r => selected.has(r.matched_id)).length,
    max_same_mode_target_streak: maximum, segments, boundaries: copy(g.s.events),
    receipt: g.s.outcome === 'cutoff' ? null : copy(s.data.receipts.at(-1)),
    decisions, player_trace: rows,
    checks: Object.fromEntries(Object.keys(checks).map(k => [k, checks[k] - startChecks[k]]))};
  runs.push(run); write('completed-branches.json', runs);
  console.log(JSON.stringify({completed: spec.id, actions: run.actions, hp: run.hp, outcome: run.outcome}));
}
assert.equal(runs.length, 4);
const all = [...reused, ...runs], comparisons = [];
for (const route of cfg.selection.routes) for (const deck of cfg.selection.decks) {
  const focus = all.find(r => r.route === route && r.deck === deck && r.equipment === 'focus');
  const mixed = all.find(r => r.route === route && r.deck === deck && r.equipment === 'mixed');
  assert.equal(focus.seed, mixed.seed);
  const both = focus.outcome === 'clear' && mixed.outcome === 'clear';
  comparisons.push({route, deck, focus: focus.id, mixed: mixed.id, both_clear: both,
    mixed_minus_focus: both ? {actions: mixed.actions - focus.actions, hp: mixed.hp - focus.hp, time: mixed.time - focus.time} : null});
}
sourcesUnchanged();
write('results.json', {trial: cfg.trial, base_commit: cfg.base_commit, execution_head: require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repo, encoding: 'utf8'}).trim(),
  completed: true, checkpoint: {file: 'home-snapshot.json', sha256: hash(home), inventory_count: Object.keys(home.economy.inventory).length,
    learned: home.economy.profile.learned, unspent_units: home.economy.profile.points * 100 + home.economy.remainder},
  equipment, deck_recipes: deckRecipes, reused_branches: reused, new_branches: runs, comparisons, checks,
  limits: ['One owned collection and seed; no optimal-policy or human evaluation.', 'This is a same-start counterfactual, not an actual post-defeat next-seed retry.', 'No exact causal claim from unavailable old full traces.']});
const artifacts = Object.fromEntries(['conditions.json', 'study.cjs', 'home-snapshot.json', 'completed-branches.json', 'results.json'].map(p => [p, fileHash(path.join(dir, p))]));
write('verification.json', {trial: cfg.trial, status: 'passed', source_files_unchanged: Object.keys(cfg.source_hashes).length,
  prefix_reconstructed: 8, prefix_actions: 269, old_comparisons_rerun: 0, saved_branches_reused: 4, new_combat_branches: 4,
  checks, artifacts, note: 'Initial restore checks repeat one action on an independent clone per new branch; not extra full combat branches.'});
console.log(JSON.stringify({trial: cfg.trial, comparisons, checks}));
