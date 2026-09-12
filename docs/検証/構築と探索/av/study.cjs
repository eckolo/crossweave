'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), P = require('./policy.cjs'), cfg = require('./conditions.json');
const {C, AR, AH, copy, Session} = U, fixed = require('../au/results.json');
const args = process.argv.slice(2);
assert.ok(args.length === 0 || args.length === 2 && args[0] === '--checkpoints-out', 'Usage: node study.cjs [--checkpoints-out <path>]');
const checkpointsOut = args.length ? path.resolve(args[1]) : null;
const sha = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const sum = xs => xs.reduce((a, b) => a + b, 0);
const histogram = xs => xs.reduce((o, k) => (o[k] = (o[k] || 0) + 1, o), {});
const mean = xs => xs.length ? sum(xs) / xs.length : null;
const verification = {recreated_returns: 0, C_launches: 0, prediction_checks: 0, policy_public_purity: 0,
  target_only_checks: 0, restored_first_actions: 0, full_saved_continuations: 0, withdrawal_replays: 0, ownership_checks: 0};
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const filename = path.join(dir, entry.name);
    if (filename === __dirname) continue;
    if (entry.isDirectory()) walk(filename);
    else files.push(filename);
  }
}
walk(path.resolve(__dirname, '../..'));
const frozen = Object.fromEntries(files.map(f => [path.relative(C.repo, f), C.hash(f)]));
const inputs = [], natural = [], rows = [], protection = [], checkpoints = [];

function rewardView(s) {
  const pub = s.game.public(), grants = s.data.economy.runs[s.data.active.run]?.grants || {};
  return {protected: Object.entries(pub.rewards).filter(([, r]) => r.protected).map(([k]) => k),
    unprotected: Object.entries(pub.rewards).filter(([, r]) => !r.protected).map(([k]) => k),
    protected_grants: Object.values(grants).filter(g => g.protected).length,
    unprotected_grants: Object.values(grants).filter(g => !g.protected).length};
}
function healingView(s) {
  const pub = s.game.public(), hand = pub.actors.P.hand;
  // This own-origin audit uses known card identity, never future ordering or allocation.
  const initial = s.bundle.initial.state.cards;
  const knownOwnFinite = Object.values(s.game.s.cards).filter(c => c.origin === 'P' && c.kind === 'heal' && c.consume_on_recover && !c.destroyed && initial[c.id]);
  return {held_finite: hand.filter(c => c.kind === 'heal' && c.consume_on_recover).map(c => ({id: c.id, power: c.power, remaining: c.remaining})),
    known_own_finite_unconsumed: knownOwnFinite.map(c => ({id: c.id, power: c.power})),
    note: 'Unconsumed is not guaranteed to return to P or be usable before damage; no hidden location is supplied to the policy.'};
}
function view(s) {
  const p = s.game.public();
  return {now: p.now, event: p.current_event, hp: p.actors.P.hp, actions: p.actors.P.actions,
    actors: Object.fromEntries(Object.entries(p.actors).map(([id, a]) => [id, {active: a.active, hp: a.hp, max_hp: a.max_hp,
      purpose: a.purpose || 'player', posture_remaining: a.posture_remaining, evasion: a.evasion,
      guard: a.guard, next_at: a.next_at, actions: a.actions, hand_count: a.hand_count, deck_count: a.deck_count}])),
    hand: p.actors.P.hand, field: p.field, reward: rewardView(s), healing: healingView(s)};
}
function evaluate(s) {
  const saved = s.save(), pair = P.pair(s.game);
  assert.deepEqual(s.save(), saved, 'Policy mutated state');
  verification.policy_public_purity++; verification.target_only_checks++;
  return pair;
}
function step(s, choice) {
  s.action(choice); verification.prediction_checks++;
}
function keepPrior(s, before) {
  for (const [uid, item] of Object.entries(before)) assert.deepEqual(s.data.economy.inventory[uid], item, 'Old inventory changed');
  verification.ownership_checks++;
}
function arm(start, mode, horizon, label) {
  const s = new Session(start.seeds, start.saved.tag, start.saved), before = view(s), initial = s.save();
  assert.equal(sha(initial), start.sha256, 'Different branch initial state');
  const g = s.game, traceStart = g.trace.length, oldInventory = copy(s.data.economy.inventory);
  let n = 0, redirected = 0, retirement = null;
  while (!g.s.outcome && n < horizon) {
    const pair = evaluate(s), picked = pair[mode];
    redirected += +(pair.leave_support.choice.target !== picked.choice.target);
    const activeBefore = !!g.s.actors.V1?.active;
    const resume = n === 0 ? new Session(start.seeds, start.saved.tag, s.save()) : null;
    step(s, picked.choice); n++;
    if (resume) {
      resume.action(picked.choice); assert.deepEqual(resume.save(), s.save(), 'Restored first action mismatch');
      verification.restored_first_actions++;
    }
    if (activeBefore && !g.s.actors.V1.active && !retirement) {
      const live = Object.values(g.s.cards).filter(c => c.origin === 'V1' && !c.destroyed);
      assert.ok(live.every(c => c.doomed), 'Support cards lost retirement flag');
      retirement = {additional_action: n, time: g.s.now, hp: g.s.actors.P.hp,
        player_hand_support_cards: g.public().actors.P.hand.filter(c => c.origin === 'V1'),
        live_support_card_count: live.length, all_live_support_cards_doomed: true,
        evasion: Object.fromEntries(Object.entries(g.public().actors).filter(([, a]) => a.active).map(([id, a]) => [id, a.evasion]))};
    }
  }
  const trace = g.trace.slice(traceStart), actions = trace.filter(r => r.type === 'action'), player = actions.filter(r => r.actor === 'P');
  const after = view(s), supportActions = actions.filter(r => r.actor === 'V1');
  keepPrior(s, oldInventory);
  const result = {label, mode, initial_sha256: start.sha256, outcome: g.s.outcome || 'ongoing',
    additional_actions: n, elapsed_time: after.now - before.now, hp: after.hp, hp_delta: after.hp - before.hp,
    damage_received: sum(actions.filter(r => r.target === 'P').map(r => r.actual_hp_loss)), healed: sum(player.map(r => r.hp_restored || 0)),
    redirected_actions: redirected, modes: histogram(player.map(r => r.mode)), targets: histogram(player.filter(r => r.mode === 'attack').map(r => r.target)),
    support_retirement: retirement, support_damage_to_P: sum(supportActions.filter(r => r.target === 'P').map(r => r.actual_hp_loss)),
    support_damage_to_enemy: sum(supportActions.filter(r => r.target === 'E1').map(r => r.actual_hp_loss)),
    support_probe_to_P: sum(supportActions.filter(r => r.target === 'P').map(r => r.hit_gain)),
    support_probe_to_enemy: sum(supportActions.filter(r => r.target === 'E1').map(r => r.hit_gain)),
    borrowed_uses: player.filter(r => r.origin !== 'P').length,
    support_origin_uses: player.filter(r => r.origin === 'V1').length,
    support_origin_material_uses: player.filter(r => r.matched_id && g.s.cards[r.matched_id].origin === 'V1').length,
    destroyed_support_cards: trace.filter(r => r.type === 'destroy' && r.origin === 'V1').length,
    after, receipt: g.s.outcome && g.s.outcome !== 'cutoff' ? copy(s.data.receipts.at(-1)) : null,
    trace: actions.map(r => ({time: r.time, actor: r.actor, mode: r.mode, target: r.target, card_id: r.card_id, matched_id: r.matched_id,
      origin: r.origin, actual_hp_loss: r.actual_hp_loss, hit_gain: r.hit_gain, hp_restored: r.hp_restored, action_cost: r.action_cost})),
    final_save_sha256: sha(s.save())};
  return {result, saved: s.save()};
}
function capture(s, seeds, label, category) {
  const saved = s.save(), sha256 = sha(saved);
  const start = {id: label + '/' + category, seeds, saved, sha256};
  inputs.push({id: start.id, saved, sha256});
  return start;
}

for (const offset of cfg.natural_reconstruction.offsets) for (const first of cfg.natural_reconstruction.first_routes) {
  const seeds = C.seeds.slice(offset).concat(C.seeds.slice(0, offset)), tag = 'au-natural-' + offset + '-' + first;
  const s = new Session(seeds, tag); s.prepare(first); s.depart(first);
  while (!s.game.s.outcome) step(s, AH.choose(s.game, 'progress_first'));
  const prior = fixed.natural.find(r => r.offset === offset && r.first === first && r.index === 0);
  assert.equal(s.game.s.outcome, prior.outcome); assert.equal(s.game.s.actors.P.actions, prior.actions); assert.equal(s.game.s.actors.P.hp, prior.hp);
  assert.equal(s.game.s.outcome, 'clear'); verification.recreated_returns++;
  s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'sale-0');
  const firstReturn = s.save();
  for (const deck of cfg.natural_reconstruction.decks) {
    const t = new Session(seeds, tag, firstReturn); t.prepare('C', 'adapt', deck);
    const baseline = fixed.paired.find(r => r.stage === 'first_clear' && r.route === 'C' && r.policy === 'progress_first' && r.offset === offset && r.first === first && r.deck === deck);
    assert.deepEqual(t.data.economy.aq.equipped, baseline.equipped);
    assert.deepEqual(U.canonical(t.data.economy, t.data.au.deck).filter(e => e.uid !== null).map(e => e.blueprint), baseline.selected_blueprints);
    t.depart('C'); assert.equal(t.data.active.seed, baseline.seed); verification.C_launches++;
    const label = [offset, first, deck].join('-'), selected = {}, strataSeen = {}, firstFinish = [];
    let protectedStart = null;
    while (!t.game.s.outcome) {
      const pub = t.game.public(), pair = evaluate(t), leave = pair.leave_support.choice, pred = t.game.predict(leave);
      const phase = pub.actors.E1?.active ? 'enemy' : 'entrance';
      const borrowed = pub.actors.P.hand.some(c => c.origin !== 'P'), stratum = phase + '/' + (borrowed ? 'borrowed' : 'no_borrowed');
      if (pub.actors.V1?.active) {
        strataSeen[stratum] = (strataSeen[stratum] || 0) + 1;
        const finish = t.game.choices().filter(ch => pub.actors[ch.target]?.purpose === 'support')
          .some(ch => t.game.predict(ch).actual_hp_loss >= pub.actors[ch.target].hp);
        if (finish) firstFinish.push(pub.actors.P.actions);
        if (!selected[stratum] && pred.mode === 'attack' && ['passage', 'goal_enemy'].includes(pub.actors[leave.target]?.purpose) && pair.target_support.choice.target !== leave.target) {
          const start = capture(t, seeds, label, stratum); selected[stratum] = start;
          checkpoints.push({id: start.id, offset, first, deck, seed: baseline.seed, stratum, initial_sha256: start.sha256,
            before: view(t), choices: Object.fromEntries(Object.entries(pair).map(([k, v]) => [k, {...v, prediction: t.game.predict(v.choice)}]))});
        }
      }
      const protectedBefore = rewardView(t).protected.length;
      step(t, leave);
      if (!protectedStart && !t.game.s.outcome && rewardView(t).protected.length > protectedBefore) protectedStart = capture(t, seeds, label, 'first_protection');
    }
    const finalSaved = t.save();
    natural.push({offset, first, deck, seed: baseline.seed, label, outcome: t.game.s.outcome, actions: t.game.s.actors.P.actions,
      hp: t.game.s.actors.P.hp, strata_seen: strataSeen, sampled: Object.keys(selected),
      missing_strata: cfg.support_comparison.strata.filter(x => !selected[x]), immediate_finish_actions: firstFinish,
      final_save_sha256: sha(finalSaved)});
    for (const [stratum, start] of Object.entries(selected)) {
      const branches = {};
      for (const mode of cfg.support_comparison.branches) branches[mode] = arm(start, mode, cfg.support_comparison.horizon_player_actions, start.id + '/' + mode).result;
      rows.push({id: start.id, offset, first, deck, seed: baseline.seed, stratum, initial_sha256: start.sha256,
        delta_target_minus_leave: {hp: branches.target_support.hp - branches.leave_support.hp,
          elapsed_time: branches.target_support.elapsed_time - branches.leave_support.elapsed_time,
          additional_actions: branches.target_support.additional_actions - branches.leave_support.additional_actions}, branches});
    }
    if (protectedStart) {
      const start = protectedStart, w = new Session(seeds, tag, start.saved), repeat = new Session(seeds, tag, start.saved), before = view(w);
      const owned = copy(w.data.economy.inventory); w.withdraw(); repeat.withdraw();
      assert.deepEqual(w.save(), repeat.save()); verification.withdrawal_replays++;
      keepPrior(w, owned);
      const continuation = arm(start, 'leave_support', Infinity, start.id + '/continue');
      assert.deepEqual(continuation.saved, finalSaved, 'Protection continuation differs from natural trunk'); verification.full_saved_continuations++;
      protection.push({id: start.id, offset, first, deck, seed: baseline.seed, initial_sha256: start.sha256, before,
        withdraw: {outcome: w.game.s.outcome, hp: w.game.s.actors.P.hp, receipt: copy(w.data.receipts.at(-1)), final_save_sha256: sha(w.save())},
        continue: continuation.result});
    }
    process.stdout.write(JSON.stringify({completed: label, checkpoints: Object.keys(selected), trunk: t.game.s.outcome, total_pairs: rows.length}) + '\n');
  }
}
assert.ok(rows.length <= cfg.support_comparison.maximum_pairs);
for (const [file, hash] of Object.entries(frozen)) assert.equal(C.hash(path.join(C.repo, file)), hash, 'Frozen source changed: ' + file);
const summary = cfg.support_comparison.strata.map(stratum => {
  const rs = rows.filter(r => r.stratum === stratum);
  return {stratum, pairs: rs.length, target_retired_support: rs.filter(r => r.branches.target_support.support_retirement).length,
    leave_retired_support: rs.filter(r => r.branches.leave_support.support_retirement).length,
    target_outcomes: histogram(rs.map(r => r.branches.target_support.outcome)), leave_outcomes: histogram(rs.map(r => r.branches.leave_support.outcome)),
    target_hp_greater: rs.filter(r => r.delta_target_minus_leave.hp > 0).length,
    target_hp_equal: rs.filter(r => r.delta_target_minus_leave.hp === 0).length,
    target_hp_lower: rs.filter(r => r.delta_target_minus_leave.hp < 0).length,
    mean_hp_delta: mean(rs.map(r => r.delta_target_minus_leave.hp)), mean_elapsed_time_delta: mean(rs.map(r => r.delta_target_minus_leave.elapsed_time))};
});
const result = {trial: cfg.trial, source_hashes: frozen,
  own_hashes: Object.fromEntries(['conditions.json', 'policy.cjs', 'study.cjs'].map(f => [f, C.hash(path.join(__dirname, f))])),
  verification, independent_seed_values: [...new Set(natural.map(r => r.seed))], reconstructed_first_returns: 4,
  C_trunks: natural, support_summary: summary, checkpoints, support_pairs: rows, protection_pairs: protection};
const compressed = zlib.gzipSync(Buffer.from(JSON.stringify({trial: cfg.trial, inputs})), {level: 9});
if (checkpointsOut) fs.writeFileSync(checkpointsOut, compressed);
result.checkpoints_sha256 = crypto.createHash('sha256').update(compressed).digest('hex');
const manifest = {trial: cfg.trial, optional_archive_sha256: result.checkpoints_sha256, optional_archive_bytes: compressed.length,
  source_hashes: result.source_hashes, own_hashes: result.own_hashes,
  reconstruction: 'Run study.cjs under these source hashes. For a full archive pass --checkpoints-out <path>. Natural tags remain au-natural-<offset>-<first>; rotate C.seeds by offset. Recreate the first return, select the named deck, then take the first eligible state under each recorded stratum. SHA256 is over JSON.stringify(saved), including RNG.',
  checkpoints: inputs.map(x => ({id: x.id, offset: Number(x.id.split('-')[0]), first: x.id.split('-')[1],
    deck: x.id.split('/')[0].split('-').slice(2).join('-'), category: x.id.slice(x.id.indexOf('/') + 1),
    original_tag: x.saved.tag, active_run: x.saved.active.run, seed: x.saved.active.seed,
    completed_player_actions: x.saved.game.state.actors.P.actions, time: x.saved.game.state.now,
    event: x.saved.game.state.current_event, saved_state_sha256: x.sha256}))};
fs.writeFileSync(path.join(__dirname, 'checkpoints-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({trial: cfg.trial, verification, support_summary: summary,
  protection: protection.map(r => ({id: r.id, hp: r.before.hp, held_heal: r.before.healing.held_finite.length,
    own_heal_unconsumed: r.before.healing.known_own_finite_unconsumed.length, outcome: r.continue.outcome,
    continue_hp: r.continue.hp, extra_actions: r.continue.additional_actions,
    withdraw_points: r.withdraw.receipt.gained_points, continue_points: r.continue.receipt?.gained_points,
    withdraw_kept: r.withdraw.receipt.kept.length, continue_kept: r.continue.receipt?.kept.length}))}, null, 2) + '\n');
