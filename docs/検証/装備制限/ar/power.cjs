'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const C = require('./common.cjs'), {Q, AP, AO, AH, cfg, copy, runtime, source, seeds, mean, sum, histogram, hash, metrics} = C;
function profileFor(def) {
  let s = AP.start(Q.initial(8, def.policy), 'fixture-' + def.id); const ids = [];
  for (const [base, affixes, count] of def.items) {
    for (let i = 0; i < count; i++) {
      if (!affixes.length && i === 0) { ids.push('base:' + base); continue; }
      const reward = 'item' + ids.length;
      s = AP.award(s, reward, AO.blueprint('passive', base, affixes));
      ids.push('owned:' + AP.uidFor('fixture-' + def.id, reward));
    }
  }
  return Q.equip(Q.learn(AP.finish(s, 'fixture-' + def.id, 'clear'), AO.cfg.passive_bases), ids);
}
const profiles = Object.fromEntries(cfg.power_probe.loadouts.map(d => [d.id, profileFor(d)]));
const sourceHashes = C.sources(), rows = []; let restores = 0, predictionChecks = 0;
for (const def of cfg.power_probe.loadouts) {
  for (const route of cfg.power_probe.routes) for (const build of cfg.power_probe.builds)
    for (const policy of cfg.power_probe.policies) for (const seed of cfg.power_probe.seeds) {
      const p = profiles[def.id], counts = AH.countsFor(source, build);
      const out = runtime.depart(source, seeds[seed], p.profile, counts, route, 'AR1-power-' + [def.id, route, build, policy, seed].join('-'), {comparison: true});
      const g = Q.launch(p, out.bundle); g.advance(); let restored = false;
      while (!g.s.outcome) {
        const choice = AH.choose(g, policy), before = g.save(), prediction = g.predict(choice);
        assert.deepEqual(g.save(), before, 'Prediction must not mutate the run');
        let next = null;
        if (!restored && g.s.actors.P.actions >= 10) { next = new Q.Game(copy(g.bundle), before); restored = true; }
        const start = g.trace.length; g.step(choice); g.advance();
        const actual = g.trace.slice(start).find(r => r.type === 'action' && r.actor === 'P');
        for (const key of ['actual_hp_loss', 'hit_gain', 'hit_connected', 'posture_multiplier', 'hp_restored', 'action_cost']) assert.equal(prediction[key], actual[key], key);
        predictionChecks++;
        if (next) { next.step(choice); next.advance(); assert.deepEqual(g.save(), next.save()); restores++; }
      }
      rows.push({loadout: def.id, equipment_policy: def.policy, route, build, policy, seed, ...metrics(g)});
    }
  process.stdout.write(def.id + ': ' + rows.filter(r => r.loadout === def.id).length + ' runs complete\n');
}
function summarize(rows) {
  const clear = rows.filter(r => r.outcome === 'clear');
  return {runs: rows.length, outcomes: histogram(rows.map(r => r.outcome)),
    mean_clear_actions: mean(clear.map(r => r.actions)), mean_clear_hp: mean(clear.map(r => r.hp)), mean_clear_time: mean(clear.map(r => r.time)),
    mean_actions_all: mean(rows.map(r => r.actions)), triggered_actions: Object.fromEntries(AO.cfg.passive_bases.map(id => [id, sum(rows.map(r => r.triggers[id] || 0))])),
    total_player_actions: sum(rows.map(r => r.actions)), minimum_time_actions: sum(rows.map(r => r.minimum_time_actions)),
    total_time_saved: sum(rows.map(r => r.time_saved))};
}
const summary = cfg.power_probe.loadouts.map(d => ({loadout: d.id, label: d.label, ...summarize(rows.filter(r => r.loadout === d.id))}));
const byRoute = cfg.power_probe.loadouts.flatMap(d => cfg.power_probe.routes.map(route => ({loadout: d.id, route, ...summarize(rows.filter(r => r.loadout === d.id && r.route === route))})));
const pairs = cfg.power_probe.loadouts.filter(d => d.id !== 'empty').map(d => {
  const compared = rows.filter(r => r.loadout === d.id).map(r => [rows.find(b => b.loadout === 'empty' && b.route === r.route && b.build === r.build && b.policy === r.policy && b.seed === r.seed), r]);
  const both = compared.filter(([a, b]) => a.outcome === 'clear' && b.outcome === 'clear');
  return {loadout: d.id, pairs: compared.length, both_clear: both.length,
    gained_clear: compared.filter(([a, b]) => a.outcome !== 'clear' && b.outcome === 'clear').length,
    lost_clear: compared.filter(([a, b]) => a.outcome === 'clear' && b.outcome !== 'clear').length,
    mean_paired_actions_delta: mean(both.map(([a, b]) => b.actions - a.actions)),
    mean_paired_time_delta: mean(both.map(([a, b]) => b.time - a.time)), mean_paired_hp_delta: mean(both.map(([a, b]) => b.hp - a.hp))};
});
for (const [p, h] of Object.entries(sourceHashes)) assert.equal(hash(path.join(C.repo, p)), h);
assert.equal(rows.length, 1152);
const result = {trial: cfg.trial, base_commit: cfg.base_commit, sources: sourceHashes,
  own_hashes: Object.fromEntries(['conditions.json', 'common.cjs', 'power.cjs'].map(p => [p, hash(path.join(__dirname, p))])),
  checks: {runs: rows.length, player_prediction_checks: predictionChecks, restored_continuations: restores}, summary, byRoute, pairs, rows};
fs.writeFileSync(path.join(__dirname, 'power-results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({checks: result.checks, summary, pairs}, null, 2) + '\n');
