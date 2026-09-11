'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const C = require('./common.cjs'), {Q, AP, AO, AH, cfg, copy, runtime, source, seeds, sum, mean, histogram, hash, metrics} = C;
const conditions = require('./tempo-conditions.json');
const baselineHash = hash(path.join(__dirname, 'power-results.json'));
function profileFor(def) {
  let s = AP.start(Q.initial(8), 'tempo-' + def.id), ids = [];
  for (const [base, affixes, count] of def.items) for (let i = 0; i < count; i++) {
    if (!affixes.length && i === 0) ids.push('base:' + base);
    else { const reward = 'item' + ids.length; s = AP.award(s, reward, AO.blueprint('passive', base, affixes)); ids.push('owned:' + AP.uidFor('tempo-' + def.id, reward)); }
  }
  return Q.equip(Q.learn(AP.finish(s, 'tempo-' + def.id, 'clear'), AO.cfg.passive_bases), ids);
}
function choose(g, policy) {
  const fallback = AH.choose(g, 'progress_first');
  if (policy === 'progress_first' || g.s.aq.entries.filter(e => e.base === 'PS01').length < 2) return fallback;
  const s = g.public(), p = s.actors.P, f = g.predict(fallback);
  if (f.mode === 'heal' || f.mode === 'attack' && f.actual_hp_loss >= s.actors[fallback.target].hp) return fallback;
  const cards = Object.fromEntries(p.hand.map(c => [c.id, c]));
  const choices = g.choices().map(ch => ({ch, c: cards[ch.card_id], v: g.predict(ch)}));
  const places = choices.filter(x => x.v.mode === 'place' && x.c.kind !== 'heal');
  const cheap = places.filter(x => x.v.action_cost <= 3).sort((a, b) => a.v.action_cost - b.v.action_cost || a.c.remaining - b.c.remaining || a.c.id.localeCompare(b.c.id));
  if (s.passive_state.after_guard && cheap.length) return cheap[0].ch;
  if (!p.guard && places.length) {
    const guards = choices.filter(x => x.v.mode === 'guard' && places.some(p => p.c.attr !== x.c.attr))
      .sort((a, b) => b.v.guard.evasion - a.v.guard.evasion || b.v.guard.value - a.v.guard.value || a.c.remaining - b.c.remaining);
    if (guards.length) return guards[0].ch;
  }
  return fallback;
}
const profiles = Object.fromEntries(conditions.loadouts.map(id => [id, profileFor(cfg.power_probe.loadouts.find(d => d.id === id))]));
const rows = []; let restores = 0, predictionChecks = 0;
for (const loadout of conditions.loadouts) {
  for (const route of conditions.routes) for (const build of conditions.builds) for (const policy of conditions.policies) for (const seed of conditions.seeds) {
    const p = profiles[loadout], out = runtime.depart(source, seeds[seed], p.profile, AH.countsFor(source, build), route,
      'AR1-tempo-' + [loadout, route, build, policy, seed].join('-'), {comparison: true});
    const g = Q.launch(p, out.bundle); g.advance(); let restored = false;
    while (!g.s.outcome) {
      const ch = choose(g, policy), pred = g.predict(ch), start = g.trace.length;
      let next = null;
      if (!restored && g.s.actors.P.actions >= 10) { next = new Q.Game(copy(g.bundle), g.save()); restored = true; }
      g.step(ch); g.advance();
      const actual = g.trace.slice(start).find(r => r.type === 'action' && r.actor === 'P');
      for (const key of ['actual_hp_loss', 'hit_gain', 'hit_connected', 'posture_multiplier', 'hp_restored', 'action_cost']) assert.equal(pred[key], actual[key], key);
      predictionChecks++;
      if (next) { next.step(ch); next.advance(); assert.deepEqual(g.save(), next.save()); restores++; }
    }
    rows.push({loadout, route, build, policy, seed, ...metrics(g)});
  }
  process.stdout.write(loadout + ': tempo runs complete\n');
}
const summary = conditions.loadouts.flatMap(loadout => conditions.policies.map(policy => {
  const rs = rows.filter(r => r.loadout === loadout && r.policy === policy), wins = rs.filter(r => r.outcome === 'clear');
  return {loadout, policy, runs: rs.length, outcomes: histogram(rs.map(r => r.outcome)),
    mean_clear_actions: mean(wins.map(r => r.actions)), mean_clear_time: mean(wins.map(r => r.time)), mean_clear_hp: mean(wins.map(r => r.hp)),
    ps01_triggered_actions: sum(rs.map(r => r.triggers.PS01 || 0)), total_player_actions: sum(rs.map(r => r.actions)), minimum_time_actions: sum(rs.map(r => r.minimum_time_actions))};
}));
const pairs = conditions.loadouts.map(loadout => {
  const compared = rows.filter(r => r.loadout === loadout && r.policy === 'progress_first').map(a => [a, rows.find(b => b.loadout === loadout && b.policy === 'guard_then_place' && b.route === a.route && b.build === a.build && b.seed === a.seed)]);
  const both = compared.filter(([a, b]) => a.outcome === 'clear' && b.outcome === 'clear');
  return {loadout, pairs: compared.length, both_clear: both.length,
    gained_clear: compared.filter(([a, b]) => a.outcome !== 'clear' && b.outcome === 'clear').length,
    lost_clear: compared.filter(([a, b]) => a.outcome === 'clear' && b.outcome !== 'clear').length,
    mean_paired_actions_delta: mean(both.map(([a, b]) => b.actions - a.actions)), mean_paired_time_delta: mean(both.map(([a, b]) => b.time - a.time))};
});
assert.equal(hash(path.join(__dirname, 'power-results.json')), baselineHash);
assert.equal(rows.length, 384);
const result = {trial: conditions.trial, base_commit: cfg.base_commit, main_result_sha256: baselineHash, sources: C.sources(),
  own_hashes: Object.fromEntries(['conditions.json', 'common.cjs', 'tempo-conditions.json', 'tempo.cjs'].map(p => [p, hash(path.join(__dirname, p))])),
  checks: {runs: rows.length, player_prediction_checks: predictionChecks, restored_continuations: restores}, summary, pairs, rows};
fs.writeFileSync(path.join(__dirname, 'tempo-results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({checks: result.checks, summary, pairs}, null, 2) + '\n');
