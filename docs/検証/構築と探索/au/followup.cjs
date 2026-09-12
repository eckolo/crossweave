'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const U = require('./session.cjs'), P = require('./public-policy.cjs');
const {C, AR, AH, copy, Session} = U, fixed = require('./results.json'), cfg = require('./followup-conditions.json');
const rows = [], checkpoints = []; let predictions = 0, replay = 0;
for (const offset of U.cfg.journey.offsets) for (const first of U.cfg.journey.first_routes) {
  const seeds = C.seeds.slice(offset).concat(C.seeds.slice(0, offset)), tag = 'au-natural-' + offset + '-' + first;
  const s = new Session(seeds, tag); s.prepare(first); s.depart(first);
  while (!s.game.s.outcome) { s.action(AH.choose(s.game, 'progress_first')); predictions++; }
  assert.equal(s.game.s.outcome, 'clear'); s.home(); s.data.economy = AR.sellSurplus(s.data.economy, 'sale-0');
  checkpoints.push({offset, first, outcome: 'clear', owned: Object.keys(s.data.economy.inventory).length});
  for (const deck of U.cfg.paired.decks) {
    const t = new Session(seeds, tag, s.save()); t.prepare('C', 'adapt', deck);
    const baseline = fixed.paired.find(r => r.stage === 'first_clear' && r.route === 'C' && r.policy === 'progress_first' && r.offset === offset && r.first === first && r.deck === deck);
    assert.deepEqual(t.data.economy.aq.equipped, baseline.equipped);
    assert.deepEqual(U.canonical(t.data.economy, t.data.au.deck).filter(e => e.uid !== null).map(e => e.blueprint), baseline.selected_blueprints);
    t.depart('C'); assert.equal(t.data.active.seed, baseline.seed);
    const changes = {}, examples = []; let restored = false;
    while (!t.game.s.outcome) {
      const before = t.save(), picked = P.choose(t.game); assert.deepEqual(t.save(), before);
      changes[picked.reason] = (changes[picked.reason] || 0) + 1;
      if (picked.reason !== 'progress_default' && examples.length < 3) examples.push({action: t.game.s.actors.P.actions + 1, reason: picked.reason,
        event: t.game.s.current_event, hp: t.game.s.actors.P.hp, choice: picked.choice, prediction: t.game.predict(picked.choice)});
      let restoredSession = null;
      if (!restored && t.game.s.actors.P.actions >= 10) restoredSession = new Session(seeds, tag, before);
      t.action(picked.choice); predictions++;
      if (restoredSession) { restoredSession.action(picked.choice); assert.deepEqual(restoredSession.save(), t.save()); replay++; restored = true; }
    }
    assert.notEqual(t.game.s.outcome, 'cutoff');
    rows.push({offset, first, deck, seed: t.data.active.seed, outcome: t.game.s.outcome, actions: t.game.s.actors.P.actions, hp: t.game.s.actors.P.hp,
      baseline: {outcome: baseline.outcome, actions: baseline.actions, hp: baseline.hp}, changes, examples, boundaries: copy(t.game.s.events)});
  }
}
const result = {trial: cfg.trial, fixed_results_sha256: C.hash(path.join(__dirname, 'results.json')), checkpoint_runs: checkpoints,
  predictions, continuation_pairs: replay, rows};
fs.writeFileSync(path.join(__dirname, 'followup-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
