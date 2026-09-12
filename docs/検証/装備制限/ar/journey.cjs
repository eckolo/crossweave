'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const C = require('./common.cjs'), {Q, AP, AO, AH, cfg, copy, seeds, hash, sum, mean, histogram} = C;
const M = require('./session.cjs'), {Session, sellSurplus, total} = M;
const sourceHashes = C.sources(), cohorts = []; let restores = 0, settlementReplays = 0;
function routeFor(s, first, lastRoute, lastOutcome, index) {
  const p = s.data.economy.profile;
  if (p.clears.includes('C')) return index % 2 === 0 ? 'A' : 'B';
  if (!p.clears.includes(first)) return first;
  return lastRoute === 'C' && lastOutcome === 'defeat' ? first : 'C';
}
for (const offset of cfg.journey.offsets) for (const first of cfg.journey.first_routes) for (const strategy of cfg.journey.preparations) {
  const bank = seeds.map((_, i) => seeds[(offset + i) % seeds.length]), tag = [offset, first, strategy].join('-');
  const s = new Session(bank, tag), runs = []; let lastRoute = null, lastOutcome = null;
  assert.equal(total(s.data.economy), 0); assert.equal(Object.keys(s.data.economy.inventory).length, 0);
  for (let index = 0; index < cfg.journey.expeditions; index++) {
    const route = routeFor(s, first, lastRoute, lastOutcome, index);
    const oldEquipment = [...s.data.economy.aq.equipped];
    s.prepare(route, strategy);
    const before = copy(s.data.economy), equipped = before.aq.equipped.map(id => Q.resolve(before, id));
    s.depart(route); let restored = false;
    while (!s.game.s.outcome) {
      const choice = AH.choose(s.game, cfg.journey.policy);
      if (!restored && s.game.s.actors.P.actions >= 10) {
        const snapshot = s.save(), next = new Session(bank, tag, snapshot); assert.deepEqual(next.save(), snapshot);
        s.action(choice); next.action(choice); assert.deepEqual(s.save(), next.save()); restores++; restored = true;
      } else s.action(choice);
    }
    if (s.game.s.outcome === 'cutoff') {
      runs.push({route, outcome: 'cutoff', index, actions: s.game.s.actors.P.actions}); break;
    }
    const receipt = copy(s.data.receipts.at(-1));
    const after = copy(s.data.economy);
    assert.equal(total(after), total(before) + receipt.gained_points);
    assert.deepEqual(AH.finish(after.profile, s.game), after.profile);
    assert.deepEqual(AP.finish(after, receipt.run, receipt.outcome), after); settlementReplays++;
    s.collect(); assert.deepEqual(s.data.economy, after);
    const savedReturn = s.save(); assert.deepEqual(new Session(bank, tag, savedReturn).save(), savedReturn);
    s.home(); s.data.economy = sellSurplus(s.data.economy, 'surplus-' + index);
    const sold = s.data.economy.sales['surplus-' + index];
    const previousKnowledge = Object.keys(after.known).length;
    assert.equal(Object.keys(s.data.economy.known).length, previousKnowledge);
    const nextState = s.data.economy;
    const noLongerEquipped = oldEquipment.filter(id => !before.aq.equipped.includes(id));
    runs.push({...receipt, equipped: equipped.map(e => ({id: e.id, key: e.blueprint.key, cost: e.cost})),
      equipped_cost: Q.assess(equipped).cost, removed_equipment: noLongerEquipped.length,
      added_equipment: before.aq.equipped.filter(id => !oldEquipment.includes(id)).length,
      total_points: total(nextState), available_points: nextState.profile.points, fractional_units: nextState.remainder,
      learned: copy(nextState.profile.learned), owned: Object.keys(nextState.inventory).length,
      owned_performance_groups: Object.keys(AP.groups(nextState)).length,
      sold_copies: sold?.ids.length || 0, sale_units: sold?.units || 0,
      clears: [...nextState.profile.clears], destinations: AH.destinations(nextState.profile)});
    for (const uid of Object.keys(before.inventory)) assert(nextState.inventory[uid] || sold?.ids.includes(uid), 'Old possessions lost through expedition outcome');
    lastRoute = route; lastOutcome = receipt.outcome;
  }
  cohorts.push({offset, first, strategy, runs, completed_expeditions: runs.filter(r => r.outcome !== 'cutoff').length,
    clears: [...s.data.economy.profile.clears], total_points: total(s.data.economy), fractional_units: s.data.economy.remainder,
    owned: Object.keys(s.data.economy.inventory).length,
    final_snapshot_sha256: require('crypto').createHash('sha256').update(JSON.stringify(s.save())).digest('hex')});
  process.stdout.write(tag + ': ' + runs.length + ' expeditions complete\n');
}
const summary = cfg.journey.preparations.map(strategy => {
  const selected = cohorts.filter(c => c.strategy === strategy), runs = selected.flatMap(c => c.runs), clear = runs.filter(r => r.outcome === 'clear');
  return {strategy, cohorts: selected.length, expeditions: runs.length, outcomes: histogram(runs.map(r => r.outcome)),
    c_cleared_cohorts: selected.filter(c => c.clears.includes('C')).length,
    total_player_actions: sum(runs.map(r => r.actions)), mean_clear_actions: mean(clear.map(r => r.actions)), mean_clear_hp: mean(clear.map(r => r.hp)),
    equipment_removals: sum(runs.map(r => r.removed_equipment || 0)), equipment_additions: sum(runs.map(r => r.added_equipment || 0)),
    retained_copies: sum(runs.map(r => r.kept?.length || 0)), lost_new_copies: sum(runs.map(r => r.lost?.length || 0)),
    sold_copies: sum(runs.map(r => r.sold_copies || 0)), mean_final_total_points: mean(selected.map(c => c.total_points + c.fractional_units / 100)),
    mean_final_owned: mean(selected.map(c => c.owned)), all_four_learned_cohorts: selected.filter(c => Object.keys(c.runs.at(-1).learned || {}).length === 4).length};
});
const pairs = cohorts.filter(c => c.strategy === 'retain').map(a => {
  const b = cohorts.find(c => c.strategy === 'adapt' && c.offset === a.offset && c.first === a.first);
  return {offset: a.offset, first: a.first, retain_c: a.clears.includes('C'), adapt_c: b.clears.includes('C'),
    retain_clear: a.runs.filter(r => r.outcome === 'clear').length, adapt_clear: b.runs.filter(r => r.outcome === 'clear').length,
    retain_points: a.total_points + a.fractional_units / 100, adapt_points: b.total_points + b.fractional_units / 100};
});
for (const [p, h] of Object.entries(sourceHashes)) assert.equal(hash(path.join(C.repo, p)), h);
const result = {trial: cfg.trial, base_commit: cfg.base_commit, sources: sourceHashes,
  own_hashes: Object.fromEntries(['conditions.json', 'common.cjs', 'session.cjs', 'journey.cjs'].map(p => [p, hash(path.join(__dirname, p))])),
  checks: {cohorts: cohorts.length, expeditions: sum(cohorts.map(c => c.runs.length)), restored_continuations: restores, settlement_replays: settlementReplays,
    player_prediction_checks: sum(cohorts.flatMap(c => c.runs).map(r => r.predictions || 0))}, summary, pairs, cohorts};
fs.writeFileSync(path.join(__dirname, 'journey-results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({checks: result.checks, summary, pairs}, null, 2) + '\n');
