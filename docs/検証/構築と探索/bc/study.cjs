'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const U = require('../au/session.cjs'), cfg = require('./conditions.json'), fixed = require('../au/results.json');
const {M, C, AR, Q, AP, AO, AH, copy, Session} = U;
const baFixed = require('../ba/results.json'), bbFixed = require('../bb/results.json');
const sum = xs => xs.reduce((a, b) => a + b, 0);
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const units = e => e.profile.points * AP.cfg.units_per_point + e.remainder;
const fees = e => sum(Object.values(e.profile.learned)) * AP.cfg.units_per_point;
const total = e => units(e) + fees(e);
const root = 'docs/検証/統合試作/deck_feedback_trial/';
const sourcePaths = [...new Set([
  'docs/検証/構築と探索/bb/aggregate.cjs',
  ...Object.keys(require.cache).filter(p => p.startsWith(C.repo + path.sep) && !p.startsWith(__dirname + path.sep)).map(p => path.relative(C.repo, p)),
  ...['posture_am/engine.js', 'expedition_choices.js', 'reward_preparation.js', 'expedition_loop.js', 'knowledge.js',
    'information.js', 'terrain.js', 'ecology.js', 'feedback.js', 'choice_inputs.json', 'loop_inputs.json',
    'reward_build_inputs.json', 'reward_build_inputs.py'].map(p => root + p)
])].sort();
const sourceHashes = Object.fromEntries(sourcePaths.map(p => [p, C.hash(path.join(C.repo, p))]));
const ownHashes = Object.fromEntries(['conditions.json', 'study.cjs'].map(p => [p, C.hash(path.join(__dirname, p))]));
const verification = {cutoff_no_return_checks: 0, prefix_aggregate_matches: 0, first_return_hash_matches: 0, bb_offer_matches: 0, zero_previous_C_checks: 0, skipped_pair_equality: 0, prefix_prediction_checks: 0, new_C_prediction_checks: 0, underfunded_purchase_rejections: 0, refund_replays: 0, refund_undo_checks: 0, refund_save_restores: 0, no_choice_unchanged_saves: 0, economy_conservation_checks: 0, prepared_save_restores: 0, purchase_save_restores: 0, prefix_runs: 0, prefix_preparation_matches: 0, prefix_terminal_matches: 0, checkpoint_conditions: 0,
  prediction_checks: 0, candidate_copy_purity: 0, purchase_replays: 0, purchase_ownership_checks: 0,
  first_action_restores: 0, return_replays: 0, branch_ownership_checks: 0, unchanged_checkpoints: 0};
const histories = [], branches = [], manifests = [], pending = [];


function preparation(e) {
  const out = AR.equipForRoute(e, cfg.comparison.route, 'adapt');
  return {economy: out, deck: U.chooseDeck(out, cfg.comparison.route, 'use_owned')};
}
function preparationView(s) {
  const e = s.data.economy;
  return {unspent_units: units(e), paid_learning_units: fees(e), learned: copy(e.profile.learned),
    equipment: e.aq.equipped.map(id => Q.resolve(e, id)), deck: U.canonical(e, s.data.au.deck)};
}
function refundPlan(e, price) {
  const required = Math.max(0, price - units(e)), removed = [];
  let refunded = 0;
  for (const base of [...C.cfg.journey.learning_order].reverse()) {
    if (refunded >= required) break;
    if (Object.hasOwn(e.profile.learned, base)) {
      removed.push(base); refunded += e.profile.learned[base] * AP.cfg.units_per_point;
    }
  }
  return {required_units: required, removed_bases: removed, refunded_units: refunded,
    retained_bases: Object.keys(e.profile.learned).filter(x => !removed.includes(x)),
    affordable: units(e) + refunded >= price};
}
function candidateChoice(e, operation, allowRefund) {
  const before = sha(e), batch = M.view(e), evaluations = [];
  for (const c of batch?.candidates || []) {
    const plan = refundPlan(e, c.price_units), affordableNow = !batch.purchased && units(e) >= c.price_units;
    const affordable = !batch.purchased && (affordableNow || allowRefund && plan.affordable);
    const entry = {id: c.id, blueprint: copy(c.blueprint), price_units: c.price_units,
      purchase_affordable_now: affordableNow, purchase_affordable_with_refund: !batch.purchased && plan.affordable,
      purchase_affordable_in_policy: affordable, refund_plan: plan,
      already_owned_copies: Object.values(e.inventory).filter(x => x.blueprint.key === c.blueprint.key).length,
      learned_base_before: c.blueprint.kind === 'passive' ? Object.hasOwn(e.profile.learned, c.blueprint.base) : null,
      eligible_for_equipment_after_preparation: null, selected_in_preparation: false, role_ratio: null,
      reason: affordable ? null : batch.purchased ? 'offer_already_purchased' : 'insufficient_unspent_funds_without_explicit_refund'};
    if (affordable) {
      const funded = allowRefund && plan.removed_bases.length ? Q.learn(e, plan.retained_bases) : copy(e);
      const draft = M.purchase(funded, batch.id, c.id, operation), uid = draft.at.purchases[operation].uid;
      const planned = preparation(draft);
      entry.funds_after_refund_units = units(funded); entry.funds_after_purchase_units = units(draft);
      entry.learned_after_refund = copy(funded.profile.learned);
      entry.learned_after_preparation = copy(planned.economy.profile.learned);
      entry.eligible_for_equipment_after_preparation = c.blueprint.kind === 'passive' ? Object.hasOwn(planned.economy.profile.learned, c.blueprint.base) : null;
      entry.selected_in_preparation = c.blueprint.kind === 'card' ? planned.deck.includes('owned:' + uid) : planned.economy.aq.equipped.includes('owned:' + uid);
      if (c.blueprint.kind === 'passive') entry.role_ratio = (C.cfg.journey.home_value.C[c.blueprint.base] + sum(c.blueprint.affixes.map(id => C.cfg.journey.affix_value[id]))) / Q.cost(c.blueprint);
      entry.reason = entry.selected_in_preparation ? 'selected_by_existing_preparation' :
        c.blueprint.kind === 'passive' && !entry.eligible_for_equipment_after_preparation ? 'unlearned_base_after_refund_and_purchase' : 'not_selected_by_existing_preparation';
    }
    evaluations.push(entry);
  }
  assert.equal(sha(e), before, 'Candidate evaluation modified original economy'); verification.candidate_copy_purity++;
  const selected = evaluations.filter(x => x.purchase_affordable_in_policy && x.selected_in_preparation).sort((a, b) =>
    (a.blueprint.kind === 'card' ? 0 : 1) - (b.blueprint.kind === 'card' ? 0 : 1) ||
    (a.blueprint.kind === 'passive' ? b.role_ratio - a.role_ratio : 0) || a.id.localeCompare(b.id))[0] || null;
  return {evaluations, chosen: selected?.id || null};
}
function economyView(e) {
  return {unspent_units: units(e), paid_learning_units: fees(e), learned: copy(e.profile.learned),
    equipped: [...e.aq.equipped], inventory_sha256: sha(e.inventory), offer_sha256: sha(M.view(e))};
}
function itemUsage(item, origin, prepared, game, receipt) {
  const bp = item.blueprint, actions = game.trace.filter(x => x.type === 'action');
  const selectedCard = game.s.au.entries.find(x => x.uid === item.uid);
  const selectedPassive = prepared.equipment.find(x => x.uid === item.uid);
  const eligible = bp.kind === 'card' || Object.hasOwn(prepared.learned, bp.base);
  const result = {uid: item.uid, origin, blueprint: copy(bp), possession_authorizes_selection: eligible,
    availability_basis: bp.kind === 'card' ? 'Owned copy authorizes one initial instance; deck size and per-base cap still apply.' : 'Owned passive additionally requires its learned base.',
    selected_at_departure: !!(selectedCard || selectedPassive), card_instance: selectedCard?.instance || null};
  if (bp.kind === 'card') {
    const id = selectedCard?.instance, count = f => id ? actions.filter(f).length : 0;
    Object.assign(result, {measurement: 'Direct exploration card-ID action trace.',
      player_uses_before_refill: count(x => x.actor === 'P' && x.card_id === id && x.player_rebuilds === 0),
      player_uses_after_refill: count(x => x.actor === 'P' && x.card_id === id && x.player_rebuilds > 0),
      npc_uses: count(x => x.actor !== 'P' && x.card_id === id),
      player_field_material_uses: count(x => x.actor === 'P' && x.matched_id === id),
      npc_field_material_uses: count(x => x.actor !== 'P' && x.matched_id === id)});
  } else if (!selectedPassive) {
    Object.assign(result, {passive_trigger_count: 0, measurement: 'Not equipped at departure; no exploration instance was launched.'});
  } else if (!receipt) {
    Object.assign(result, {passive_trigger_count: null, measurement: 'Cutoff has no settlement receipt; per-instance passive trigger measurement unavailable.'});
  } else {
    const sameBase = prepared.equipment.filter(x => x.base === bp.base);
    const ungated = sameBase.every(x => x.blueprint.affixes.every(id => !AO.cfg.passive_affixes[id].gate));
    if (ungated) {
      const n = receipt.triggers[bp.base] || 0;
      assert.equal(receipt.instances[bp.base] || 0, n * sameBase.length);
      Object.assign(result, {passive_trigger_count: n, measurement: 'Derived from base-trigger actions and same-base instance total; all equipped copies have no extra gate. Not an instance-ID trace measurement.'});
    } else Object.assign(result, {passive_trigger_count: null, measurement: 'Unavailable: frozen action trace has no passive instance IDs and same-base equipped copies may have different gates.'});
  }
  return result;
}
function oldPurchase(s, operation) {
  const e = s.data.economy, reserve = sum(Object.keys(AH.cfg.skills).filter(b => !Object.hasOwn(e.profile.learned, b)).map(b => AH.cfg.skills[b].cost * 100));
  const v = M.view(e), candidates = (v?.candidates || []).filter(c => !v.purchased && units(e) >= reserve + c.price_units &&
    (c.blueprint.kind === 'card' || Object.hasOwn(e.profile.learned, c.blueprint.base)));
  candidates.sort((a, b) => (a.blueprint.kind === 'card' ? 0 : 1) - (b.blueprint.kind === 'card' ? 0 : 1) || a.id.localeCompare(b.id));
  if (!candidates.length) return null;
  s.buy(candidates[0].id, operation); return copy(s.data.economy.at.purchases[operation]);
}
function step(s, choice) { s.action(choice); verification.prediction_checks++; }
function samePrefix(s, row) {
  assert.equal(s.data.active.seed, row.seed);
  assert.equal(s.game.s.outcome, row.outcome); assert.equal(s.game.s.actors.P.actions, row.actions);
  assert.equal(s.game.s.actors.P.hp, row.hp); assert.equal(s.game.s.now, row.time);
  assert.deepEqual(s.data.receipts.at(-1), row.receipt); assert.deepEqual(s.game.s.events, row.boundaries);
  verification.prefix_terminal_matches++;
}
function runBranch(saved, seeds, label, policy) {
  const checkpointHash = sha(saved), s = new Session(seeds, saved.tag, saved), initialEconomy = copy(s.data.economy);
  const before = {...economyView(initialEconomy), refundable_learning_units: fees(initialEconomy),
    total_with_refundable_learning_units: total(initialEconomy)};
  s.home();
  if (policy === 'learning_first') s.prepare('C');
  const decisionSave = s.save(), choiceInput = copy(s.data.economy), operation = 'BC-purchase-' + policy;
  const choice = candidateChoice(s.data.economy, operation, policy === 'refund_acquisition_first');
  assert.deepEqual(s.save(), decisionSave);
  let refund = null, purchase = null;
  if (choice.chosen && policy === 'refund_acquisition_first') {
    const plan = choice.evaluations.find(x => x.id === choice.chosen).refund_plan;
    const prior = copy(s.data.economy), after = Q.learn(prior, plan.retained_bases);
    assert.equal(units(after), units(prior) + plan.refunded_units);
    assert.equal(fees(after), fees(prior) - plan.refunded_units);
    assert.equal(total(after), total(prior)); assert.equal(after.remainder, prior.remainder); assert.deepEqual(after.inventory, prior.inventory);
    for (const key of ['unlocked', 'knowledge', 'clears', 'returns']) assert.deepEqual(after.profile[key], prior.profile[key]);
    for (const key of ['known', 'sales', 'runs', 'at']) assert.deepEqual(after[key], prior[key]);
    assert.deepEqual(M.view(after), M.view(prior));
    assert(after.aq.equipped.every(id => !plan.removed_bases.includes(Q.resolve(after, id).base)));
    assert.deepEqual(Q.learn(after, plan.retained_bases), after); verification.refund_replays++;
    const undo = Q.equip(Q.learn(after, Object.keys(prior.profile.learned)), prior.aq.equipped);
    assert.deepEqual(undo, prior); verification.refund_undo_checks++;
    s.data.economy = after;
    const refundSave = s.save(), restored = new Session(seeds, saved.tag, refundSave);
    assert.deepEqual(restored.save(), refundSave); verification.refund_save_restores++;
    refund = {...plan, before: economyView(prior), after: economyView(after)};
  }
  const actualPurchaseFunds = units(s.data.economy), beforePurchaseLearning = copy(s.data.economy.profile.learned);
  const beforePurchase = economyView(s.data.economy);
  if (choice.chosen) {
    const purchaseBefore = copy(s.data.economy); s.buy(choice.chosen, operation);
    purchase = copy(s.data.economy.at.purchases[operation]);
    assert.equal(units(s.data.economy), actualPurchaseFunds - purchase.units);
    assert.deepEqual(s.data.economy.profile.learned, beforePurchaseLearning, 'Purchase silently changed learning');
    for (const [uid, item] of Object.entries(purchaseBefore.inventory)) assert.deepEqual(s.data.economy.inventory[uid], item);
    assert.equal(Object.keys(s.data.economy.inventory).length, Object.keys(purchaseBefore.inventory).length + 1);
    verification.purchase_ownership_checks++;
    const paid = s.save(); s.buy(choice.chosen, operation); assert.deepEqual(s.save(), paid); verification.purchase_replays++;
    const restoredPaid = new Session(seeds, saved.tag, paid); assert.deepEqual(restoredPaid.save(), paid); verification.purchase_save_restores++;
  } else if (policy === 'refund_acquisition_first') {
    assert.deepEqual(s.save(), decisionSave); verification.no_choice_unchanged_saves++;
  }
  const afterPurchase = economyView(s.data.economy), beforePreparationLearning = copy(s.data.economy.profile.learned);
  if (policy === 'refund_acquisition_first' || purchase) s.prepare('C');
  const prepared = preparationView(s), newlyLearned = Object.keys(prepared.learned).filter(b => !Object.hasOwn(beforePreparationLearning, b));
  const payment = {checkpoint_paid_learning_units: fees(initialEconomy), explicit_refund_units: refund?.refunded_units || 0,
    retained_learning_after_refund_units: fees(initialEconomy) - (refund?.refunded_units || 0),
    relearned_bases: newlyLearned.filter(b => Object.hasOwn(initialEconomy.profile.learned, b)),
    newly_learned_bases: Object.keys(prepared.learned).filter(b => !Object.hasOwn(initialEconomy.profile.learned, b))};
  payment.relearning_units = sum(payment.relearned_bases.map(b => prepared.learned[b] * 100));
  payment.new_learning_units = sum(payment.newly_learned_bases.map(b => prepared.learned[b] * 100));
  payment.final_paid_learning_units = prepared.paid_learning_units;
  assert.equal(total(s.data.economy), total(initialEconomy) - (purchase?.units || 0));
  assert.equal(payment.final_paid_learning_units, payment.retained_learning_after_refund_units + payment.relearning_units + payment.new_learning_units);
  verification.economy_conservation_checks++;
  assert.equal(prepared.deck.length, cfg.comparison.deck_size); assert(Q.assess(prepared.equipment, Q.cfg.policies[s.data.economy.aq.policy]).fits);
  const preparedSave = s.save(), restoredPrepared = new Session(seeds, saved.tag, preparedSave);
  assert.deepEqual(restoredPrepared.save(), preparedSave); verification.prepared_save_restores++;
  const boughtSelected = purchase ? prepared.deck.some(x => x.uid === purchase.uid) || prepared.equipment.some(x => x.uid === purchase.uid) : false;
  assert.equal(boughtSelected, !!purchase, 'Chosen purchase did not enter the real preparation');
  const preparedHash = sha(s.save()), purchasedItem = purchase ? copy(s.data.economy.inventory[purchase.uid]) : null;
  assert(!s.data.economy.profile.clears.includes('C'));
  assert(!s.data.receipts.some(r => r.route === 'C'));
  s.depart('C'); const launch = s.save(), nativeSeed = s.data.active.seed;
  let firstAction = true, replay = null;
  const decisions = [];
  while (!s.game.s.outcome) {
    const action = AH.choose(s.game, cfg.comparison.combat_policy.replace('AH.', ''));
    decisions.push(copy(action));
    if (firstAction) replay = new Session(seeds, saved.tag, s.save());
    step(s, action); verification.new_C_prediction_checks++;
    assert(s.game.s.actors.P.actions <= cfg.comparison.action_limit);
    if (firstAction) { replay.action(action); assert.deepEqual(replay.save(), s.save()); verification.first_action_restores++; firstAction = false; }
  }
  assert(['clear', 'defeat', 'cutoff'].includes(s.game.s.outcome));
  const settled = s.save(); s.collect(); assert.deepEqual(s.save(), settled);
  if (s.game.s.outcome === 'cutoff') {assert.equal(s.data.receipts.length, saved.receipts.length); verification.cutoff_no_return_checks++;}
  else verification.return_replays++;
  for (const [uid, item] of Object.entries(initialEconomy.inventory)) assert.deepEqual(s.data.economy.inventory[uid], item);
  if (purchase) assert.deepEqual(s.data.economy.inventory[purchase.uid], purchasedItem);
  verification.branch_ownership_checks++;
  assert.equal(sha(saved), checkpointHash); verification.unchanged_checkpoints++;
  const g = s.game, receipt = g.s.outcome === 'cutoff' ? null : copy(s.data.receipts.at(-1));
  const oldUsage = Object.values(initialEconomy.inventory).map(x => itemUsage(x, 'old_owned', prepared, g, receipt));
  const boughtUsage = purchasedItem ? itemUsage(purchasedItem, 'purchased', prepared, g, receipt) : null;
  return {id: label + '-' + policy, history: label, policy, native_seed: nativeSeed, before,
    choice_input: economyView(choiceInput), actual_before_purchase_unspent_units: actualPurchaseFunds,
    before_purchase_learning: beforePurchaseLearning, before_purchase: beforePurchase, after_purchase: afterPurchase,
    refund, learning_payment: payment, candidates: choice.evaluations, chosen: choice.chosen, purchase,
    purchased_blueprint: purchasedItem?.blueprint || null, bought_selected_at_departure: boughtSelected,
    prepared, preparation_sha256: preparedHash, launch_sha256: sha(launch),
    old_owned_usage: oldUsage, bought_usage: boughtUsage, outcome: g.s.outcome,
    actions: g.s.actors.P.actions, hp: g.s.actors.P.hp, time: g.s.now,
    receipt, decisions, final_saved_sha256: sha(s.save())};
}

function phaseMetrics(rows, cards, selected) {
  const histogram = xs => xs.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {});
  return {actions: rows.length, modes: histogram(rows.map(r => r.mode)),
    borrowed_uses: rows.filter(r => r.origin !== 'P').length,
    own_initial_uses: rows.filter(r => r.origin === 'P' && cards[r.card_id].birth === 'initial').length,
    acquired_uses: rows.filter(r => selected.has(r.card_id)).length,
    acquired_field_uses: rows.filter(r => selected.has(r.matched_id)).length,
    hp_damage: sum(rows.map(r => r.actual_hp_loss)),
    matched_attacks: rows.filter(r => r.mode === 'attack').length,
    zero_hp_attacks: rows.filter(r => r.mode === 'attack' && r.actual_hp_loss === 0).length,
    zero_hp_and_probe_attacks: rows.filter(r => r.mode === 'attack' && r.actual_hp_loss === 0 && r.hit_gain === 0).length};
}
function comparePrefixAggregates(s, row, opportunities, disagreements, decisions) {
  const g = s.game, cards = g.s.cards, selected = new Set(g.s.au.entries.filter(e => e.uid !== null).map(e => e.instance));
  const rows = g.trace.filter(r => r.type === 'action' && r.actor === 'P'), npc = g.trace.filter(r => r.type === 'action' && r.actor !== 'P');
  const phases = {before_player_refill: phaseMetrics(rows.filter(r => r.player_rebuilds === 0), cards, selected),
    after_player_refill: phaseMetrics(rows.filter(r => r.player_rebuilds > 0), cards, selected)};
  assert.deepEqual(phases, row.phases);
  assert.equal(npc.filter(r => selected.has(r.card_id)).length, row.npc_acquired_uses);
  assert.equal(npc.filter(r => selected.has(r.matched_id)).length, row.npc_acquired_field_uses);
  const examples = npc.filter(r => selected.has(r.card_id) || selected.has(r.matched_id)).slice(0, 2).map(r =>
    ({actor: r.actor, mode: r.mode, target: r.target, card: cards[r.card_id].name, material: r.matched_id ? cards[r.matched_id].name : null,
      owned_card: selected.has(r.card_id), owned_material: selected.has(r.matched_id), hp_damage: r.actual_hp_loss, hit_gain: r.hit_gain}));
  assert.deepEqual(examples, row.npc_examples);
  assert.equal(opportunities, row.multi_target_actions); assert.equal(disagreements, row.policy_target_disagreements);
  assert.deepEqual(decisions, row.decisions);
  let longest = 0, streak = 0, previous = null;
  const segments = {};
  for (const r of rows) {
    const key = JSON.stringify([r.event_before, r.mode, r.target]);
    streak = key === previous ? streak + 1 : 1; longest = Math.max(longest, streak); previous = key;
    const e = segments[r.event_before] ||= {actions: 0, attacks: 0, placements: 0, zero_hp_attacks: 0};
    e.actions++; e.attacks += +(r.mode === 'attack'); e.placements += +(r.mode === 'place'); e.zero_hp_attacks += +(r.mode === 'attack' && r.actual_hp_loss === 0);
  }
  assert.equal(longest, row.max_same_mode_target_streak); assert.deepEqual(segments, row.segments);
  verification.prefix_aggregate_matches++;
}
for (const checkpoint of cfg.reconstruction.checkpoints) {
  const {offset, first} = checkpoint;
  const seeds = C.seeds.slice(offset).concat(C.seeds.slice(0, offset)), tag = 'au-natural-' + offset + '-' + first;
  const s = new Session(seeds, tag), prefix = [];
  const firstRow = fixed.natural.find(r => r.offset === offset && r.first === first && r.index === 0);
  const secondRow = fixed.paired.find(r => r.label === checkpoint.paired_label);
  assert(firstRow && secondRow); assert.equal(secondRow.route, checkpoint.second_route);
  for (const [index, row] of [firstRow, secondRow].entries()) {
    s.prepare(row.route, 'adapt', 'use_owned');
    assert.deepEqual(Object.keys(s.data.economy.profile.learned), row.learned);
    assert.deepEqual(s.data.economy.aq.equipped, row.equipped);
    const entries = U.canonical(s.data.economy, s.data.au.deck).filter(x => x.uid !== null);
    assert.deepEqual(entries.map(x => x.blueprint), row.selected_blueprints); assert.equal(entries.length, row.selected_count);
    verification.prefix_preparation_matches++;
    s.depart(row.route); const decisions = [], publicDecisions = []; let opportunities = 0, disagreements = 0;
    while (!s.game.s.outcome) {
      const g = s.game, pub = g.public(), choices = g.choices(), action = AH.choose(g, 'progress_first'), side = AH.choose(g, 'side_first');
      const multi = new Set(choices.filter(x => x.target).map(x => x.target)).size > 1, disagree = action.target !== side.target;
      opportunities += +multi; disagreements += +disagree;
      if (disagree && publicDecisions.length < 2) publicDecisions.push({action: pub.actors.P.actions + 1, event: pub.current_event,
        hp: pub.actors.P.hp, player_rebuilds: g.s.actors.P.rebuilds,
        progress: {...action, prediction: g.predict(action)}, side: {...side, prediction: g.predict(side)}});
      decisions.push(copy(action)); step(s, action); verification.prefix_prediction_checks++;
      assert(s.game.s.actors.P.actions <= row.actions, 'Prefix exceeded existing player-action count');
    }
    samePrefix(s, row); comparePrefixAggregates(s, row, opportunities, disagreements, publicDecisions); verification.prefix_runs++;
    const savedHash = sha(s.save());
    if (index === 0) {
      const prior = baFixed.histories.find(h => h.id === offset + '-' + first).prefix[0];
      assert.equal(prior.row, row.label); assert.equal(savedHash, prior.saved_return_sha256); verification.first_return_hash_matches++;
    }
    prefix.push({row: row.label, original_full_action_list_available: false,
      original_saved_state_hash_available: index === 0, decisions, saved_return_sha256: savedHash,
      action_trace_sha256: sha(s.game.trace), receipt: copy(s.data.receipts.at(-1))});
    if (index === 0) {
      const bought = oldPurchase(s, 'buy-0'); assert.deepEqual(bought, row.bought);
      s.home(); const beforeSale = total(s.data.economy);
      s.data.economy = AR.sellSurplus(s.data.economy, 'sale-0');
      assert.equal(total(s.data.economy) - beforeSale, row.sale_units);
      assert.equal(units(s.data.economy), Math.round(row.unspent * 100));
      assert.equal(Object.keys(s.data.economy.inventory).length, row.total_owned);
    }
  }
  const saved = s.save(), offered = M.view(saved.economy), label = offset + '-' + first;
  assert.equal(units(saved.economy), checkpoint.expected_unspent_units); assert.equal(fees(saved.economy), checkpoint.expected_paid_learning_units);
  assert.deepEqual(saved.economy.profile.learned, {PS02: 2});
  const plan = refundPlan(saved.economy, cfg.comparison.price_units);
  assert.deepEqual(plan.removed_bases, checkpoint.expected_refund_bases); assert.equal(plan.refunded_units, 200);
  const beforeRejected = sha(saved.economy);
  assert.throws(() => M.purchase(saved.economy, offered.id, offered.candidates[0].id, 'BC-underfunded'), /Insufficient unspent/);
  assert.equal(sha(saved.economy), beforeRejected); verification.underfunded_purchase_rejections++;
  assert(offered && !offered.purchased); assert(!saved.economy.profile.clears.includes('C'));
  assert(!saved.receipts.some(r => r.route === 'C')); verification.zero_previous_C_checks++;
  assert.equal(saved.nextRun, 2); assert.equal(seeds[saved.nextRun].seed, checkpoint.next_seed);
  // BB stores a pure-generation estimate, not an old saved return offer. Compare it with this real reconstructed offer.
  const bb = bbFixed.opposite_route_entries.find(r => r.id === checkpoint.paired_label);
  assert(bb); assert.deepEqual(offered.context, bb.generated_offer.context);
  assert.deepEqual(offered.candidates, bb.generated_offer.candidates);
  verification.bb_offer_matches++; verification.checkpoint_conditions++;
  histories.push({id: label, ...checkpoint, prefix, checkpoint_sha256: sha(saved), economy_sha256: sha(saved.economy),
    unspent_units: units(saved.economy), paid_learning_units: fees(saved.economy), learned: copy(saved.economy.profile.learned),
    refund_plan: plan, C_already_cleared: false, previous_C_departures: 0, offer: copy(offered), inventory: copy(saved.economy.inventory), next_run: saved.nextRun});
  manifests.push({id: label, ...checkpoint, saved_state_sha256: sha(saved), economy_sha256: sha(saved.economy),
    reconstruction: 'Replay AU first natural return and the named existing opposite-route paired branch with unchanged tag, seeds and preparation; stop before second-return preparation/purchase/sale.',
    snapshot_status: 'Newly fixed by BC after matching available AU fields; AU did not retain the full second-return snapshot.'});
  assert.equal(candidateChoice(saved.economy, 'BC-preflight', true).chosen, checkpoint.expected_refund_choice);
  pending.push({saved, seeds, label, checkpoint});
  process.stdout.write('BC ' + label + ': existing prefix and BB offer matched; first-C comparison pending\n');
}
assert.equal(pending.length, 4);
assert.equal(verification.prefix_runs, 8);
for (const {saved, seeds, label, checkpoint} of pending) {
  for (const policy of cfg.comparison.policies) {
    const branch = runBranch(saved, seeds, label, policy); assert.equal(branch.native_seed, checkpoint.next_seed);
    if (policy === 'refund_acquisition_first') assert.equal(branch.chosen, checkpoint.expected_refund_choice);
    assert.equal(branch.prepared.unspent_units, 100);
    if (branch.purchase) {assert.equal(branch.refund.refunded_units, 200); assert.deepEqual(branch.prepared.learned, {});}
    branches.push(branch);
  }
  if (checkpoint.expected_refund_choice === null) {
    const a = branches.at(-2), b = branches.at(-1);
    for (const key of ['prepared', 'preparation_sha256', 'launch_sha256', 'decisions', 'receipt', 'final_saved_sha256']) assert.deepEqual(a[key], b[key]);
    verification.skipped_pair_equality++;
  }
  process.stdout.write('BC ' + label + ': two first-C branches complete\n');
}
assert.equal(branches.length, cfg.comparison.expected_runs);
for (const [p, hash] of Object.entries(sourceHashes)) assert.equal(C.hash(path.join(C.repo, p)), hash, 'Changed source during study: ' + p);
const pairs = histories.map(h => {
  const a = branches.find(x => x.history === h.id && x.policy === 'learning_first'), b = branches.find(x => x.history === h.id && x.policy === 'refund_acquisition_first');
  assert.equal(a.native_seed, b.native_seed); assert.deepEqual(a.before, b.before);
  return {history: h.id, seed: a.native_seed, learning_first: {outcome: a.outcome, actions: a.actions, hp: a.hp, time: a.time},
    refund_acquisition_first: {outcome: b.outcome, actions: b.actions, hp: b.hp, time: b.time},
    actions_difference_if_both_clear: a.outcome === 'clear' && b.outcome === 'clear' ? b.actions - a.actions : null};
});
const summary = Object.fromEntries(cfg.comparison.policies.map(policy => {
  const rows = branches.filter(x => x.policy === policy);
  return [policy, {runs: rows.length, clear: rows.filter(x => x.outcome === 'clear').length, defeat: rows.filter(x => x.outcome === 'defeat').length, cutoff: rows.filter(x => x.outcome === 'cutoff').length,
    purchased: rows.filter(x => x.purchase).length, selected_purchases: rows.filter(x => x.bought_selected_at_departure).length,
    player_purchased_card_uses: sum(rows.map(x => (x.bought_usage?.player_uses_before_refill || 0) + (x.bought_usage?.player_uses_after_refill || 0))),
    npc_purchased_card_uses: sum(rows.map(x => x.bought_usage?.npc_uses || 0))}];
}));
const results = {trial: cfg.trial, base_commit: cfg.base_commit, execution_head: require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], {cwd: C.repo, encoding: 'utf8'}).trim(),
  execution_head_note: 'The BC start commit changes only Work-start records and fixed BC conditions after input base7b288fe; AU/AT/AR runtime inputs are unchanged.',
  source_hashes: sourceHashes, own_hashes: ownHashes, verification, summary, pairs, histories, branches};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'checkpoints-manifest.json'), JSON.stringify({trial: cfg.trial, count: manifests.length,
  full_snapshots_included: true, snapshots: Object.fromEntries(pending.map(x => [x.label, x.saved])), reconstruction_command: 'node docs/検証/構築と探索/bc/study.cjs', checkpoints: manifests}, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({trial: cfg.trial, status: 'passed', execution_checks: verification,
  source_files_verified: sourcePaths.length, artifact_hashes: Object.fromEntries(['conditions.json', 'study.cjs', 'results.json', 'checkpoints-manifest.json'].map(p => [p, C.hash(path.join(__dirname, p))]))}, null, 2) + '\n');
console.log(JSON.stringify({trial: cfg.trial, summary, pairs, verification}, null, 2));
