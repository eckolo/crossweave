'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const C = require('./common.cjs'), {Q, AP, AO, AH, cfg, copy, seeds, hash} = C;
const M = require('./session.cjs'), {Session, generatedRewards} = M;
const checks = [];
function test(name, fn) { fn(); checks.push(name); }
function reject(s, fn) { const before = s.save(); assert.throws(fn); assert.deepEqual(s.save(), before); }
function oldPossession(state) {
  let s = AP.start(state, 'old'); s = AP.award(s, 'one', AO.blueprint('passive', 'PS04', ['swift']));
  return AP.finish(s, 'old', 'clear');
}
// A real action prefix with a protected reward; the rich starting profile is a boundary fixture.
function prefix() {
  const s = new Session(seeds, 'boundary'); s.data.economy = oldPossession(Q.initial(8));
  s.prepare('B', 'adapt'); s.depart('B');
  while (!s.game.s.outcome && !Object.values(s.game.s.rewards).some(r => r.protected)) s.action(AH.choose(s.game, 'side_first'));
  assert.equal(s.game.s.outcome, null); assert(s.game.s.rewards['B/V0']?.protected);
  return s;
}
const p = prefix(), snapshot = p.save(), run = p.data.active.run;
const currentUid = AP.uidFor(run, 'passive-V0'), oldUid = AP.uidFor('old', 'one');
test('New protected rewards stay uncredited as inventory until return', () => {
  assert(p.data.economy.runs[run].grants['passive-V0'].protected);
  assert(!p.data.economy.inventory[currentUid]); assert(p.data.economy.inventory[oldUid]);
  reject(p, () => { p.data.economy = AP.sell(p.data.economy, 'early', [currentUid]); });
});
test('Reward synchronization is repeatable and never consumes an engine random stream', () => {
  const game = p.game.save(), before = p.save(); p.syncRewards(); p.syncRewards();
  assert.deepEqual(p.game.save(), game); assert.deepEqual(p.save(), before);
});
test('Save and resume preserve the same generated reward before outcome', () => {
  const next = new Session(seeds, 'boundary', snapshot); assert.deepEqual(next.save(), snapshot);
  const choice = AH.choose(p.game, 'progress_first'); p.action(choice); next.action(choice);
  assert.deepEqual(next.save(), p.save());
});
for (const outcome of ['clear', 'withdrawal', 'defeat']) test('Artificial outcome boundary ' + outcome + ' preserves old stock and obeys source protection', () => {
  const s = new Session(seeds, 'boundary', snapshot);
  // Only the outcome is imposed here; this is not counted as a natural clear or death.
  s.game.settle(outcome); s.syncRewards(); s.collect();
  assert(s.data.economy.inventory[oldUid]);
  assert.equal(!!s.data.economy.inventory[currentUid], outcome !== 'defeat');
  const before = s.save(); s.collect(); assert.deepEqual(s.save(), before);
  assert.deepEqual(AP.finish(s.data.economy, run, outcome), s.data.economy);
  assert.deepEqual(AH.finish(s.data.economy.profile, s.game), s.data.economy.profile);
  assert(Object.keys(s.data.economy.known).length >= 2);
});
test('A completed action saved before return collection recovers the reward exactly once', () => {
  const s = new Session(seeds, 'terminal'); s.prepare('A', 'adapt'); s.depart('A');
  s.collect = () => {};
  while (!s.game.s.outcome) s.action(AH.choose(s.game, 'progress_first'));
  assert.notEqual(s.game.s.outcome, 'cutoff'); assert.equal(s.data.phase, 'exploring');
  const pending = s.save(), next = new Session(seeds, 'terminal', pending);
  assert.equal(next.data.phase, 'return'); assert.equal(next.data.receipts.length, 1);
  delete s.collect; s.collect(); assert.deepEqual(next.save(), s.save());
  const again = new Session(seeds, 'terminal', next.save()); assert.deepEqual(again.save(), next.save());
});
test('Changing equipment or learning during exploration is rejected without a partial edit', () => {
  const s = new Session(seeds, 'boundary', snapshot);
  reject(s, () => s.prepare('B', 'adapt'));
  reject(s, () => { s.data.economy = Q.learn(s.data.economy, []); });
});
test('Mismatched owned equipment cannot be loaded as the same active expedition', () => {
  const saved = copy(snapshot), id = saved.economy.aq.equipped.find(id => id.startsWith('base:'));
  saved.economy.aq.equipped = saved.economy.aq.equipped.filter(x => x !== id);
  assert.throws(() => new Session(seeds, 'boundary', saved), /Mismatched run equipment/);
});
test('Illegal action leaves the active session unchanged', () => {
  const s = new Session(seeds, 'boundary', snapshot);
  reject(s, () => s.action({card_id: 'missing', target: 'P'}));
});
test('Free relearning preserves fractional sale funds and acquired variants after return', () => {
  const s = new Session(seeds, 'boundary', snapshot); s.withdraw(); s.home();
  const inventory = copy(s.data.economy.inventory), before = M.total(s.data.economy);
  s.data.economy.remainder = 50;
  const cleared = Q.learn(s.data.economy, []); assert.equal(cleared.profile.points, before);
  assert.equal(cleared.remainder, 50); assert.deepEqual(cleared.inventory, inventory);
  const relearned = Q.learn(cleared, AO.cfg.passive_bases); assert.equal(relearned.remainder, 50);
  assert.deepEqual(relearned.inventory, inventory); assert.deepEqual(relearned.aq.equipped, []);
});
test('Conservative surplus sale retains usable duplicates and does not multiply resources on replay', () => {
  const bp = AO.blueprint('passive', 'PS02'), card = AO.blueprint('card', 'l', ['heavy']);
  let state = AP.start(Q.initial(2), 'surplus');
  for (let i = 0; i < 5; i++) state = AP.award(state, 'p' + i, bp);
  state = AP.award(AP.award(state, 'c0', card), 'c1', card); state = AP.finish(state, 'surplus', 'clear');
  state = Q.learn(state, ['PS02']); state = Q.equip(state, ['base:PS02', 'owned:' + AP.uidFor('surplus', 'p0')]);
  const out = M.sellSurplus(state, 'sell');
  assert.equal(AP.groups(out)[bp.key].quantity, 2); assert.equal(AP.groups(out)[card.key].quantity, 1);
  assert.equal(out.profile.points, 2); assert.equal(out.remainder, 0); assert.deepEqual(out.aq, state.aq);
  assert.deepEqual(AP.sell(out, 'sell', out.sales.sell.ids), out);
});
test('Learning and route gates are still required at a zero-point start', () => {
  const s = new Session(seeds, 'zero'); reject(s, () => s.prepare('C', 'adapt'));
  reject(s, () => s.depart('C')); s.prepare('A', 'adapt');
  assert.deepEqual(s.data.economy.aq.equipped, []); assert.deepEqual(s.data.economy.profile.learned, {});
});
const result = {trial: 'AR1-boundaries', base_commit: cfg.base_commit, checks, artificial_outcome_cases: 3,
  own_hashes: Object.fromEntries(['conditions.json', 'common.cjs', 'session.cjs', 'boundaries.cjs'].map(p => [p, hash(path.join(__dirname, p))]))};
fs.writeFileSync(path.join(__dirname, 'boundary-results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
