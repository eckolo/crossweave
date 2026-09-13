'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const U = require('./session.cjs');
const {M, C, AP, AO, AH, copy, Session} = U;
const tests = [];
function test(name, fn) { fn(); tests.push({name, passed: true}); }
function fixture() {
  const s = new Session(C.seeds, 'au-boundary');
  let e = s.data.economy; e.profile.points = 20; e = AP.start(e, 'fixture');
  for (const [id, base, affixes] of [['brace', 'brace', []], ['f1', 'f', ['heavy']], ['f2', 'f', ['precise']], ['f3', 'f', ['heavy']], ['salve', 'salve', ['rich']]])
    e = AP.award(e, id, AO.blueprint('card', base, affixes));
  s.data.economy = AP.finish(e, 'fixture', 'clear');
  return s;
}
const uid = id => AP.uidFor('fixture', id);
function replace(ids, from, to) { const out = [...ids], at = out.indexOf('base:' + from); assert.ok(at >= 0); out[at] = 'owned:' + uid(to); return out; }
test('Initial normal deck matches AT combat state before and after one action', () => {
  const s = new Session(C.seeds, 'same'), t = new M.Session(C.seeds, 'same');
  s.prepare('A', 'adapt', 'initial'); t.prepare('A', 'adapt'); s.depart('A'); t.depart('A');
  const combat = g => { const x = g.save(); delete x.state.au; return x; };
  assert.deepEqual(combat(s.game), combat(t.game));
  const choice = AH.choose(s.game, 'progress_first'); s.action(choice); t.action(choice);
  assert.deepEqual(combat(s.game), combat(t.game));
});
test('Selection order cannot reorder the initial draw or combat RNG', () => {
  const s = fixture(); s.setDeck(replace(s.data.au.deck, 'h', 'brace'));
  const t = new Session(C.seeds, 'au-boundary', s.save()); t.setDeck([...t.data.au.deck].reverse());
  s.depart('A'); t.depart('A'); assert.deepEqual(s.save(), t.save());
});
test('One owned copy cannot fill two slots; the rejected edit is atomic', () => {
  const s = fixture(), before = s.save(); let ids = replace(s.data.au.deck, 'f', 'f1'); ids = replace(ids, 'f', 'f1');
  assert.throws(() => s.setDeck(ids), /Same owned/); assert.deepEqual(s.save(), before);
});
test('Choosing an equivalent possession cannot reorder distinct variants or redraw the combat seed', () => {
  const s = fixture(), t = fixture();
  s.setDeck(replace(replace(U.initialDeck(), 'f', 'f1'), 'f', 'f2'));
  t.setDeck(replace(replace(U.initialDeck(), 'f', 'f3'), 'f', 'f2'));
  s.depart('A'); t.depart('A');
  const combat = g => { const x = g.save(); delete x.state.au; return x; };
  assert.deepEqual(combat(s.game), combat(t.game));
});
test('Variants share the base cap, including normal cards', () => {
  const s = fixture(); let ids = replace(s.data.au.deck, 'f', 'f1'); ids = replace(ids, 'h', 'f2');
  assert.throws(() => s.setDeck(ids), /Base card cap/);
});
test('Two separately owned variants may fill two allowed base slots', () => {
  const s = fixture(); let ids = replace(s.data.au.deck, 'f', 'f1'); ids = replace(ids, 'f', 'f2');
  s.setDeck(ids); s.depart('A'); assert.equal(s.game.s.au.entries.filter(e => e.uid !== null).length, 2);
});
test('An old unlock alone does not supply a free reward-base card', () => {
  const s = fixture(); s.data.economy.profile.unlocked.push('brace');
  const ids = [...s.data.au.deck]; ids[ids.indexOf('base:h')] = 'base:brace';
  assert.throws(() => s.setDeck(ids), /Not an initial free card/);
});
test('Selected cards cannot be sold; last-copy sale removes use but keeps knowledge', () => {
  const s = fixture(); s.setDeck(replace(s.data.au.deck, 'h', 'brace'));
  assert.throws(() => AP.sell(s.data.economy, 'blocked', [uid('brace')]), /protected or in preparation/);
  s.setDeck(U.initialDeck()); s.data.economy = AP.sell(s.data.economy, 'sold', [uid('brace')]);
  assert.ok(s.data.economy.known[AO.blueprint('card', 'brace').key]);
  assert.throws(() => s.setDeck(replace(s.data.au.deck, 'h', 'brace')), /Missing owned card/);
});
test('Preparation, departure, refill and defeat cannot mint or remove existing possessions', () => {
  const s = fixture(); s.setDeck(replace(s.data.au.deck, 'h', 'brace'));
  const inventory = copy(s.data.economy.inventory); s.depart('A');
  while (!s.game.s.outcome && s.game.s.actors.P.rebuilds < 1) s.action(AH.choose(s.game, 'progress_first'));
  assert.deepEqual(s.data.economy.inventory, inventory);
  s.game.settle('defeat'); s.syncRewards(); s.collect();
  assert.deepEqual(s.data.economy.inventory, inventory); s.home();
  s.depart('A'); assert.deepEqual(s.data.economy.inventory, inventory);
});
test('A consumed acquired healing instance can be prepared again with no replenishment cost', () => {
  const s = fixture(); s.setDeck(replace(s.data.au.deck, 'salve', 'salve')); s.depart('A');
  const id = s.game.s.au.entries.find(e => e.uid === uid('salve')).instance;
  const p = s.game.s.actors.P;
  // A boundary fixture explicitly moves this one valid instance to the normal discard path.
  p.hand = p.hand.filter(x => x !== id); p.deck = p.deck.filter(x => x !== id);
  s.game.recover(id, 'AU-consumable-boundary'); s.game.assert(); assert.equal(s.game.s.cards[id].destroyed, true);
  s.withdraw(); s.home(); const before = copy(s.data.economy.inventory);
  s.depart('A'); const next = s.game.s.au.entries.find(e => e.uid === uid('salve')).instance;
  assert.equal(s.game.s.cards[next].destroyed, false); assert.deepEqual(s.data.economy.inventory, before);
});
test('An active deck cannot be edited, and stale save references are rejected', () => {
  const s = fixture(); s.setDeck(replace(s.data.au.deck, 'h', 'brace')); s.depart('A');
  assert.throws(() => s.setDeck(U.initialDeck()), /requires home/);
  const bad = s.save(); delete bad.economy.references[Object.keys(bad.economy.references).find(k => k.startsWith('card:'))];
  assert.throws(() => new Session(C.seeds, 'au-boundary', bad), /Stale card references/);
});
test('Restoration rejects changed acquired card effects and a missing variant cost map', () => {
  const s = fixture(); s.setDeck(replace(s.data.au.deck, 'f', 'f1')); s.depart('A');
  const saved = s.save(), e = s.game.s.au.entries.find(e => e.uid !== null), changed = copy(saved);
  changed.game.state.cards[e.instance].power++;
  assert.throws(() => new Session(C.seeds, 'au-boundary', changed), /performance changed/);
  const missing = copy(saved); delete missing.bundle.ao.cards[e.blueprint.key];
  assert.throws(() => new Session(C.seeds, 'au-boundary', missing), /Missing variant cost map/);
});
test('A real AT purchase can enter the deck and preserve its exact affixes in a resumed exploration', () => {
  const s = fixture(); s.prepare('A'); s.depart('A');
  while (!s.game.s.outcome) s.action(AH.choose(s.game, 'progress_first'));
  const candidate = M.view(s.data.economy).candidates.find(x => x.blueprint.kind === 'card'); assert.ok(candidate);
  s.buy(candidate.id, 'bought-card'); const receipt = s.data.economy.at.purchases['bought-card']; s.home();
  const ids = U.initialDeck(), base = candidate.blueprint.base;
  let at = ids.indexOf('base:' + base); if (at < 0) at = ids.indexOf('base:h');
  ids[at] = 'owned:' + receipt.uid; s.setDeck(ids); s.depart('A');
  const restored = new Session(C.seeds, 'au-boundary', s.save());
  const entry = restored.game.s.au.entries.find(e => e.uid === receipt.uid);
  assert.deepEqual(entry.blueprint, candidate.blueprint); assert.equal(restored.game.s.cards[entry.instance].variant_key, candidate.blueprint.key);
});
fs.writeFileSync(path.join(__dirname, 'boundary-results.json'), JSON.stringify({trial: 'AU1', tests}, null, 2) + '\n');
console.log(JSON.stringify({trial: 'AU1', passed: tests.length}));
