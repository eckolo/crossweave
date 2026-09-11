'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const Q = require('../aq/equipment.cjs'), {AP, AO, copy} = Q, {runtime, source} = AO, {AH} = runtime;
const cfg = require('./conditions.json'), repo = path.resolve(__dirname, '../../../..');
const seeds = JSON.parse(cp.execFileSync('python3', [path.join(AO.root, 'reward_build_inputs.py')], {maxBuffer: 32e6}));
const sum = xs => xs.reduce((a, b) => a + b, 0), mean = xs => xs.length ? sum(xs) / xs.length : null;
const histogram = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function sources() {
  const paths = [...Object.keys(require('../aq/results.json').sources),
    ...['terrain.js', 'engine.js'].map(p => 'docs/検証/統合試作/deck_feedback_trial/' + p),
    'docs/検証/装備制限/aq/equipment.cjs', 'docs/検証/装備制限/aq/conditions.json'];
  return Object.fromEntries([...new Set(paths)].map(p => [p, hash(path.join(repo, p))]));
}
function metrics(g) {
  const rows = g.trace.filter(r => r.type === 'action' && r.actor === 'P'), triggers = {}, instances = {};
  for (const row of rows) {
    for (const id of new Set(row.passives || [])) triggers[id] = (triggers[id] || 0) + 1;
    for (const id of row.passives || []) instances[id] = (instances[id] || 0) + 1;
  }
  return {outcome: g.s.outcome, actions: g.s.actors.P.actions, hp: g.s.actors.P.hp, time: g.s.now,
    triggers, instances, action_time: sum(rows.map(r => r.action_cost)),
    time_saved: sum(rows.map(r => g.cost(g.s.cards[r.card_id].type, !!r.matched_id) - r.action_cost)),
    minimum_time_actions: rows.filter(r => r.action_cost === 1).length,
    healed: sum(rows.map(r => r.hp_restored || 0)),
    player_damage: sum(rows.map(r => r.actual_hp_loss || 0)),
    signature: crypto.createHash('sha256').update(JSON.stringify(g.save())).digest('hex')};
}
module.exports = {Q, AP, AO, AH, cfg, copy, runtime, source, repo, seeds, sum, mean, histogram, hash, sources, metrics};
