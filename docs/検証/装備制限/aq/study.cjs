'use strict';
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const Q = require('./equipment.cjs'), {AP, AO, cfg, copy} = Q;
const repo = path.resolve(__dirname, '../../../..');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const amPath = 'docs/検証/統合試作/deck_feedback_trial/';
const sourcePaths = [...Object.keys(require('../../修飾/ao/results.json').sources).map(p => amPath + p),
  ...['ao/affixes.cjs', 'ao/conditions.json', 'ap/conversion.cjs', 'ap/conditions.json'].map(p => 'docs/検証/修飾/' + p)];
const sources = Object.fromEntries(sourcePaths.map(p => [p, hash(path.join(repo, p))]));
const checks = [];
function test(name, fn) { fn(); checks.push(name); }
function rejected(state, fn, pattern) { const before = copy(state); assert.throws(fn, pattern); assert.deepEqual(state, before); }
function bring(state, run, items) {
  let out = AP.start(state, run);
  for (const item of items) out = AP.award(out, item.reward, AO.blueprint('passive', item.base, item.affixes || []));
  return AP.finish(AP.protect(out), run, 'clear');
}
const state = Q.learn(bring(Q.initial(8), 'pool', cfg.acquired_pool), AO.cfg.passive_bases);
const owned = reward => 'owned:' + AP.uidFor('pool', reward);
const candidates = Q.candidates(state), subsets = [];
for (let mask = 0; mask < 2 ** candidates.length; mask++) subsets.push(candidates.filter((_, i) => mask & (1 << i)));
const composition = entries => entries.map(e => e.blueprint.key).sort().join('|');
function summarize(policy) {
  const allowed = subsets.filter(entries => Q.assess(entries, policy).fits);
  return {policy, raw_subsets: allowed.length, performance_compositions: new Set(allowed.map(composition)).size,
    max_equipped: Math.max(...allowed.map(a => a.length)),
    max_PS02: Math.max(...allowed.map(a => a.filter(e => e.base === 'PS02').length)),
    all_four_bases: allowed.filter(a => new Set(a.map(e => e.base)).size === 4).length};
}
const policies = Object.fromEntries(Object.entries(cfg.policies).map(([key, policy]) => [key, summarize(policy)]));
const capacitySensitivity = cfg.capacity_sensitivity.map(cost_limit => summarize({cost_limit}));
const examples = [
  {id: 'none', label: '全習得・装備なし', ids: []},
  {id: 'double_advance', label: '同じ削り補助2個＋配置補助', ids: ['base:PS02', owned('plain_a'), 'base:PS01']},
  {id: 'balanced', label: '削り・防御・回復', ids: ['base:PS02', 'base:PS03', 'base:PS04']},
  {id: 'conditional', label: '借り札用の強い削り＋防御・回復', ids: [owned('forceful'), 'base:PS03', 'base:PS04']},
  {id: 'four_light', label: '配置・防御2個・回復', ids: ['base:PS01', 'base:PS03', owned('guard_swift'), 'base:PS04']},
  {id: 'all_plain', label: '通常版4種を全て装備', ids: AO.cfg.passive_bases.map(b => 'base:' + b)},
  {id: 'triple_advance', label: '同じ削り補助3個', ids: ['base:PS02', owned('plain_a'), owned('plain_b')]},
  {id: 'four_advance', label: '削り補助へ4個集中', ids: ['base:PS02', owned('plain_a'), owned('borrowed'), owned('forceful')]}
].map(x => { const entries = x.ids.map(id => Q.resolve(state, id)); return {...x, cost: Q.assess(entries).cost,
  fits: Object.fromEntries(Object.entries(cfg.policies).map(([k, p]) => [k, Q.assess(entries, p).fits]))}; });

test('All bases can be learned without automatic effects or consuming equipment capacity', () => {
  assert.equal(Object.keys(state.profile.learned).length, 4); assert.equal(state.profile.points, 0);
  assert.deepEqual(state.aq.equipped, []); assert.equal(candidates.length, 10); assert.equal(subsets.length, 1024);
});
test('Equal-performance copies are counted as quantities, not new compositions from identity swaps', () => {
  const equal = candidates.filter(e => e.blueprint.key === 'AO1:passive:PS02');
  assert.equal(equal.length, 3); assert.equal(new Set(equal.map(e => e.id)).size, 3);
  assert.equal(composition(equal.slice(0, 1)), composition(equal.slice(1, 2)));
  assert.notEqual(composition(equal.slice(0, 1)), composition(equal.slice(0, 2)));
});
test('The same acquired instance or learned plain option cannot be equipped twice', () => {
  for (const id of ['base:PS02', owned('plain_a')]) rejected(state, () => Q.equip(state, [id, id]), /Same copy/);
});
test('Distinct equal copies stack within capacity and replace equipment without spending points', () => {
  const out = Q.equip(state, examples[1].ids);
  assert.equal(out.aq.equipped.length, 3); assert.deepEqual(out.profile, state.profile);
  assert.deepEqual(out.inventory, state.inventory); assert.equal(out.remainder, state.remainder);
  assert.equal(Object.keys(out.references).length, 1);
});
test('Cost, slot, same-kind, role and duplicate-surcharge constraints differ on concrete builds', () => {
  assert.equal(examples[1].fits.cost, true); assert.equal(examples[1].fits.surcharge, false);
  assert.equal(examples[4].fits.cost, true); assert.equal(examples[4].fits.hybrid, false);
  assert.equal(examples[5].fits.cost, false); assert.equal(examples[5].fits.slots, true);
  assert.equal(examples[6].fits.same_kind, false); assert.equal(examples[6].fits.slots, true);
  assert.equal(examples[4].fits.roles, false);
});
test('Over-capacity, missing and unlearned equipment requests fail atomically', () => {
  rejected(state, () => Q.equip(state, examples[5].ids), /limit/);
  rejected(state, () => Q.equip(state, ['owned:missing']), /Unowned/);
  const unlearned = Q.learn(state, []);
  rejected(unlearned, () => Q.equip(unlearned, [owned('plain_a')]), /Unlearned/);
});
test('Authored costs stay positive and negative affixes do not automatically grant discounts', () => {
  for (const base of AO.cfg.passive_bases) for (const b of AO.variants('passive', base)) assert(Q.cost(b) >= 1);
  const plain = Q.cost(AO.blueprint('passive', 'PS02'));
  assert.equal(Q.cost(AO.blueprint('passive', 'PS02', ['sluggish'])), plain);
  assert.equal(Q.cost(AO.blueprint('passive', 'PS02', ['borrowed', 'forceful'])), plain + 1);
  const entries = copy(candidates.slice(0, 1)); entries[0].cost = 0;
  assert.throws(() => Q.assess(entries), /Stale equipment cost/);
});
test('Selling a selected copy is blocked while an equal unused copy can be converted', () => {
  const equipped = Q.equip(state, examples[1].ids);
  rejected(equipped, () => AP.sell(equipped, 'blocked', [AP.uidFor('pool', 'plain_a')]), /in preparation/);
  const sold = AP.sell(equipped, 'extra', [AP.uidFor('pool', 'plain_b')]);
  assert.deepEqual(sold.aq, equipped.aq); assert.equal(sold.remainder, 50);
  assert.equal(sold.profile.points, 0);
});
test('Unequipping releases a copy for sale; sale does not erase learning or recreate the copy', () => {
  let out = Q.equip(state, examples[1].ids); out = Q.equip(out, ['base:PS02', 'base:PS01']);
  out = AP.sell(out, 'released', [AP.uidFor('pool', 'plain_a')]);
  assert.equal(out.profile.learned.PS02, 2); assert.equal(out.remainder, 50);
  rejected(out, () => Q.equip(out, [owned('plain_a')]), /Unowned/);
  assert.deepEqual(AP.finish(out, 'pool', 'clear'), out);
});
test('Free respec refunds actual payments, removes invalid equipment, and retains possessions', () => {
  const equipped = Q.equip(state, examples[1].ids), out = Q.learn(equipped, []);
  assert.equal(out.profile.points, 8); assert.deepEqual(out.aq.equipped, []); assert.deepEqual(out.references, {});
  assert.deepEqual(out.inventory, equipped.inventory); assert.deepEqual(out.known, equipped.known);
  const again = Q.learn(out, AO.cfg.passive_bases); assert.deepEqual(again, state);
  let historical = Q.initial(); historical.profile.learned.PS02 = 3;
  historical = Q.equip(historical, ['base:PS02']); assert.equal(Q.learn(historical, []).profile.points, 3);
});
test('Home equipment survives serialization and cannot be changed during an expedition', () => {
  const equipped = Q.equip(state, examples[1].ids);
  assert.deepEqual(Q.equip(JSON.parse(JSON.stringify(equipped)), examples[1].ids), equipped);
  const active = AP.start(equipped, 'active'); rejected(active, () => Q.equip(active, []), /home/);
  rejected(active, () => Q.learn(active, []), /home/);
});

const seed = JSON.parse(cp.execFileSync('python3', [path.join(AO.root, 'reward_build_inputs.py')], {maxBuffer: 32e6}))[0];
const prepared = AO.runtime.depart(AO.source, seed, AO.runtime.AH.initialProfile(), AO.runtime.AH.countsFor(AO.source, 'guard3'), 'A', 'AQ1-fixture');
function fixture(profile, maximum = 100, accumulated = 0) {
  const g = Q.launch(profile, prepared.bundle), s = g.s;
  s.cards = {}; s.field = {}; s.pool = []; s.outcome = null; s.ready = true;
  for (const a of Object.values(s.actors)) {
    a.hand = []; a.deck = []; a.hp = a.max_hp = 100000; a.crit = 0; a.guard = null; a.hit = 0; a.max_posture = maximum; a.passives = [];
  }
  s.actors.V0.hit = accumulated; s.actors.P.hp = 99900;
  s.ah.pending = {after_guard: true, last_match_attr: 'A', borrowed_guard: true};
  return g;
}
function card(g, base, {user = 'P', origin = user, match = true} = {}) {
  const b = AO.blueprint('card', base); g.bundle.ao.cards[b.key] = copy(b);
  const c = {...AO.compileCard(b), id: 'use-' + Object.keys(g.s.cards).length, origin, birth: 'initial',
    remaining: null, doomed: false, destroyed: false, crit_gain: 0};
  if (c.evasion === undefined) c.evasion = 0; c.remaining = c.life;
  g.s.cards[c.id] = c; g.s.actors[user].hand.push(c.id);
  if (match) {
    const id = 'field-' + Object.keys(g.s.cards).length;
    g.s.cards[id] = {id, origin: 'V0', birth: 'initial', type: 'fixture', attr: c.attr, kind: 'attack', power: 0,
      hit: 0, field_power: 0, field_hit: 0, life: 2, remaining: null, doomed: false, destroyed: false, crit_gain: 0, evasion: 0};
    g.s.field[c.attr] = id;
  }
  g.assert(); return {card_id: c.id, target: match && c.kind === 'attack' ? 'V0' : null};
}
const rows = []; let restores = 0;
function execute(g, choice, user = 'P', label = {}) {
  const saved = g.save(), savedCard = copy(g.s.cards[choice.card_id]), pred = copy(g.predict(choice, user));
  assert.deepEqual(g.save(), saved, 'Prediction mutated state');
  const restored = new Q.Game(copy(g.bundle), saved);
  g.play(user, choice); restored.play(user, choice); assert.deepEqual(g.save(), restored.save()); restores++;
  const actual = g.trace.findLast(x => x.type === 'action');
  for (const key of ['actual_hp_loss', 'hit_gain', 'hit_connected', 'posture_multiplier', 'hp_restored', 'action_cost']) assert.equal(pred[key], actual[key], key);
  assert.equal(g.s.actors[user].next_at, g.s.now + pred.action_cost);
  if (pred.mode === 'guard') assert.deepEqual(pred.guard, g.s.actors[user].guard);
  for (const key of ['power', 'hit', 'variant_key', 'affixes']) assert.deepEqual(g.s.cards[choice.card_id][key], savedCard[key]);
  const row = {...label, user, mode: pred.mode, damage: pred.actual_hp_loss, hit: pred.hit_gain, connected: pred.hit_connected,
    multiplier: pred.posture_multiplier, healed: pred.hp_restored, guard: pred.guard, action_cost: pred.action_cost,
    passives: pred.passives, instances: pred.passive_instances, pending: copy(g.s.ah.pending)};
  rows.push(row); return row;
}
const contexts = [
  {id: 'own_attack', base: 'l'}, {id: 'borrowed_attack', base: 'l', origin: 'E1'},
  {id: 'overflow', base: 'l', origin: 'E1', accumulated: 70}, {id: 'road', base: 'l', maximum: 1},
  {id: 'borrowed_guard', base: 'read', origin: 'E1'}, {id: 'own_heal', base: 'salve'},
  {id: 'placement', base: 'f', match: false}
];
for (const example of examples) for (const context of contexts) {
  // A four-slot profile is used only to exercise examples excluded by the preferred cost cap.
  const profile = Q.equip({...copy(state), aq: {...state.aq, policy: example.fits.cost ? 'cost' : 'slots'}}, example.ids);
  const g = fixture(profile, context.maximum || 100, context.accumulated || 0);
  execute(g, card(g, context.base, context), 'P', {example: example.id, context: context.id, policy: profile.aq.policy});
}
test('Only equipped entries contribute; two equal attack bonuses sum once and remain below the threshold at 90', () => {
  const empty = rows.find(r => r.example === 'none' && r.context === 'own_attack');
  assert.equal(empty.hit, 50); assert.deepEqual(empty.instances, []);
  const double = rows.find(r => r.example === 'double_advance' && r.context === 'own_attack');
  assert.equal(double.hit, 90); assert.equal(double.connected, false); assert.equal(double.damage, 0); assert.equal(double.instances.length, 2);
  assert.equal(double.pending.last_match_attr, 'B');
});
test('Conditional bundles preserve their drawback while threshold and healing contributions resolve once', () => {
  assert.equal(rows.find(r => r.example === 'conditional' && r.context === 'own_attack').hit, 50);
  assert.equal(rows.find(r => r.example === 'conditional' && r.context === 'borrowed_attack').hit, 90);
  assert.equal(rows.find(r => r.example === 'triple_advance' && r.context === 'own_attack').multiplier, 1);
  assert.equal(rows.find(r => r.example === 'balanced' && r.context === 'own_heal').healed, AO.catalog.salve.power + 4);
});
test('Four placement discounts sum before one minimum-action-cost clamp', () => {
  let profile = bring(Q.initial(2), 'discount', [0, 1, 2].map(i => ({reward: 'd' + i, base: 'PS01'})));
  profile = Q.learn(profile, ['PS01']); profile = Q.equip(profile, Q.candidates(profile).map(e => e.id));
  const g = fixture(profile), row = execute(g, card(g, 'l', {match: false}), 'P', {example: 'four_PS01', context: 'minimum_cost'});
  assert.equal(row.action_cost, 1); assert.equal(row.instances.length, 4); assert.equal(row.pending.after_guard, false);
});
test('Two strong conditional copies cost the entire capacity and reach multiplier two only at the correct excess', () => {
  let profile = bring(Q.initial(2), 'strong', [0, 1].map(i => ({reward: 's' + i, base: 'PS02', affixes: ['borrowed', 'forceful']})));
  profile = Q.learn(profile, ['PS02']); profile = Q.equip(profile, Q.candidates(profile).filter(e => e.uid !== null).map(e => e.id));
  const g = fixture(profile, 100, 70), row = execute(g, card(g, 'l', {origin: 'E1'}), 'P', {example: 'two_strong', context: 'overflow'});
  assert.equal(row.hit, 130); assert.equal(row.multiplier, 2); assert.equal(row.damage, AO.catalog.l.power * 2);
  assert.equal(row.action_cost, 14); assert.equal(g.s.actors.V0.hit, 0);
});
test('Two guard copies read the same pending flag and a borrowed guard re-arms only one shared flag', () => {
  const profile = Q.equip(state, examples[4].ids), g = fixture(profile);
  const row = execute(g, card(g, 'read', {origin: 'E1'}), 'P', {example: 'two_guard', context: 'shared_pending'});
  assert.equal(row.instances.length, 2); assert.equal(row.guard.value, AO.catalog.read.power + 3);
  assert.equal(row.pending.borrowed_guard, true); assert.equal(typeof row.pending.borrowed_guard, 'boolean');
});
test('Player equipment does not contribute to an NPC using the same card', () => {
  const g = fixture(Q.equip(state, examples[1].ids));
  const row = execute(g, card(g, 'l', {user: 'E1'}), 'E1', {example: 'npc', context: 'own_attack'});
  assert.equal(row.hit, 50); assert.deepEqual(row.instances, []);
});

for (const [p, h] of Object.entries(sources)) assert.equal(hash(path.join(repo, p)), h, p);
const result = {trial: 'AQ1', base_commit: cfg.base_commit, sources,
  conditions_sha256: hash(path.join(__dirname, 'conditions.json')), implementation_sha256: hash(path.join(__dirname, 'equipment.cjs')),
  study_sha256: hash(__filename), checks, raw_subsets: subsets.length, policies, capacitySensitivity, examples,
  actions: rows.length, restores, contexts, rows};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({checks: checks.length, actions: result.actions, restores, policies, capacitySensitivity, examples}, null, 2) + '\n');
