'use strict';
// BD1 is a discardable read-only adapter. It never creates/restores a Session,
// chooses a candidate, departs, advances a game, or returns a writable save.
const U = require('../au/session.cjs');
const {Q, AP, AO, AH, M, copy} = U;
const unit = AP.cfg.units_per_point;
const sum = xs => xs.reduce((a, b) => a + b, 0);
const sorted = xs => [...xs].sort();
const sameSet = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const funds = e => e.profile.points * unit + e.remainder;
const paid = e => sum(Object.values(e.profile.learned)) * unit;
const assert = (condition, code) => { if (!condition) throw Object.assign(Error(code), {code}); };
function list(value, code) {
  assert(Array.isArray(value) && value.every(x => typeof x === 'string') && new Set(value).size === value.length, code);
  return value;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
// Identity handles are local to this input. They expose no run/tag/source IDs.
function handles(e) {
  const byUid = new Map(sorted(Object.keys(e.inventory)).map((uid, i) => [uid, 'owned-' + (i + 1)]));
  return {byUid, byHandle: new Map([...byUid].map(([uid, id]) => [id, uid]))};
}
function bpView(bp) {
  AO.validate(bp);
  return {kind: bp.kind, base: bp.base, affixes: [...bp.affixes], key: bp.key};
}
function idView(id, h) { return id.startsWith('base:') ? id : h.byUid.get(id.slice(6)); }
function resolveHandle(id, h) {
  if (id.startsWith('base:')) return id;
  assert(h.byHandle.has(id), 'unknown_selection_handle');
  return 'owned:' + h.byHandle.get(id);
}
function economyView(e) {
  return {unspent_units: funds(e), paid_learning_units: paid(e),
    learned: sorted(Object.keys(e.profile.learned)).map(base => ({base, paid_units: e.profile.learned[base] * unit}))};
}
function equipmentView(e, h) {
  const entries = e.aq.equipped.map(id => Q.resolve(e, id));
  const assessment = Q.assess(entries, Q.cfg.policies[e.aq.policy]);
  return {entries: entries.map(x => ({id: idView(x.id, h), blueprint: bpView(x.blueprint), cost: x.cost})),
    capacity: Q.cfg.policies[e.aq.policy].cost_limit, used: assessment.cost,
    remaining: Q.cfg.policies[e.aq.policy].cost_limit - assessment.cost, legal: assessment.fits};
}
function deckView(e, ids, h) {
  const assessment = U.assess(e, ids), groups = new Map();
  for (const entry of assessment.entries) {
    const id = idView(entry.id, h);
    const row = groups.get(id) || {id, blueprint: bpView(entry.blueprint), count: 0};
    row.count++; groups.set(id, row);
  }
  return {composition: [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)),
    order_semantics: 'unordered_composition', size: assessment.entries.length,
    required_size: U.cfg.deck.size, per_base_cap: U.cfg.deck.per_base_cap,
    base_counts: Object.fromEntries(Object.entries(assessment.counts).sort()), legal: true};
}
function ownedView(e, ids, h) {
  const selectedDeck = new Set(ids), selectedEquipment = new Set(e.aq.equipped);
  return Object.values(e.inventory).map(item => {
    const bp = item.blueprint, passive = bp.kind === 'passive';
    const eligible = !passive || Object.hasOwn(e.profile.learned, bp.base);
    return {id: h.byUid.get(item.uid), blueprint: bpView(bp), owned: true,
      selection_kind: passive ? 'equipment' : 'deck', eligible,
      eligibility_reason: eligible ? 'owned_and_base_requirement_met' : 'owned_but_base_not_learned',
      equipment_cost: passive ? Q.cost(bp) : null,
      selected: (passive ? selectedEquipment : selectedDeck).has('owned:' + item.uid)};
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function currentView(e, ids, h) {
  return {economy: economyView(e), equipment: equipmentView(e, h), deck: deckView(e, ids, h), owned: ownedView(e, ids, h)};
}
function deltaItems(before, after, key = 'id') {
  const a = new Map(before.map(x => [x[key], x.count ?? 1])), b = new Map(after.map(x => [x[key], x.count ?? 1]));
  return {removed: [...a].filter(([id, n]) => n > (b.get(id) || 0)).map(([id, n]) => ({id, count: n - (b.get(id) || 0)})),
    added: [...b].filter(([id, n]) => n > (a.get(id) || 0)).map(([id, n]) => ({id, count: n - (a.get(id) || 0)}))};
}
function readInput(snapshot) {
  assert(snapshot && ['home', 'return'].includes(snapshot.phase) && snapshot.economy?.profile.phase === 'home', 'home_or_settled_return_required');
  // Only current home economy + own preparation are read. Old game/bundle,
  // receipts, stats, active, nextRun and future simulation inputs are ignored.
  const e = copy(snapshot.economy), ids = copy(snapshot.au?.deck);
  assert(e.aq?.policy === 'cost', 'unsupported_equipment_policy');
  assert(Number.isSafeInteger(e.profile.points) && e.profile.points >= 0 && Number.isSafeInteger(e.remainder) && e.remainder >= 0 && e.remainder < unit, 'invalid_funds');
  assert(Object.entries(e.profile.learned).every(([base, cost]) => AH.cfg.skills[base] && Number.isSafeInteger(cost) && cost >= 0), 'invalid_learning');
  for (const [uid, item] of Object.entries(e.inventory)) { assert(uid === item.uid, 'invalid_possession'); AO.validate(item.blueprint); }
  Q.equip(e, e.aq.equipped); U.canonical(e, ids);
  const batch = M.view(e); // Validate the fixed actual offer; never generate a new batch.
  return {e, ids, batch, h: handles(e)};
}
function rejectionCode(error) {
  if (error.code) return error.code;
  const message = String(error.message);
  if (/Insufficient unspent/.test(message)) return 'insufficient_unspent_funds';
  if (/Insufficient|Not enough|budget|points/i.test(message)) return 'insufficient_learning_funds';
  if (/Unlearned/.test(message)) return 'unlearned_equipment_base';
  if (/Equipment limit/.test(message)) return 'equipment_capacity_exceeded';
  if (/Same copy equipped/.test(message)) return 'duplicate_equipment';
  if (/Same owned card/.test(message)) return 'duplicate_owned_card';
  if (/deck|base cap|same base|copies|count/i.test(message)) return 'invalid_deck';
  return 'existing_api_rejected';
}
function inspect(snapshot) {
  try {
    const {e, ids, batch, h} = readInput(snapshot);
    return freeze({schema: 'BD1-current-public', ok: true, ...currentView(e, ids, h),
      candidates: (batch?.candidates || []).map(c => ({id: c.id, blueprint: bpView(c.blueprint),
        price_units: c.price_units, available: !batch.purchased, affordable_now: !batch.purchased && funds(e) >= c.price_units})),
      free_card_options: AH.initialProfile().unlocked.map(base => 'base:' + base).sort(),
      learning_options: Object.entries(AH.cfg.skills).sort().map(([base, x]) => ({base, cost_units: x.cost * unit}))});
  } catch (error) { return freeze({schema: 'BD1-current-public', ok: false, refusal: rejectionCode(error)}); }
}
function preview(snapshot, plan) {
  let stage = 'input', current = null, purchaseRequest = null;
  try {
    const source = readInput(snapshot), h = source.h;
    let e = source.e, deck = source.ids;
    current = currentView(e, deck, h);
    assert(plan && typeof plan === 'object', 'explicit_plan_required');
    const retained = list(plan.retain_learning, 'invalid_retained_learning');
    const canceled = list(plan.cancel_learning, 'invalid_canceled_learning');
    assert(retained.every(x => !canceled.includes(x)) && sameSet([...retained, ...canceled], Object.keys(e.profile.learned)), 'learning_partition_required');
    assert(['before_preparation', 'after_preparation'].includes(plan.purchase_timing), 'purchase_timing_required');
    assert(plan.candidate === null || typeof plan.candidate === 'string', 'candidate_or_null_required');
    const prep = plan.next_preparation;
    assert(prep && Array.isArray(prep.deck) && prep.deck.every(x => typeof x === 'string'), 'explicit_preparation_required');
    list(prep.learn, 'invalid_additional_learning'); list(prep.equipment, 'invalid_equipment_list');
    const candidate = plan.candidate === null ? null : source.batch?.candidates.find(c => c.id === plan.candidate);
    assert(plan.candidate === null || candidate, 'unknown_candidate');
    stage = 'cancellation';
    const oldEquipment = equipmentView(e, h);
    e = Q.learn(e, retained);
    const afterCancellation = economyView(e), refunded = funds(e) - current.economy.unspent_units;
    const removedByCancel = deltaItems(oldEquipment.entries, equipmentView(e, h).entries).removed;
    let beforePurchase, afterPurchase, purchase = null, learningCost = 0, learningAdded = [], relearned = [];
    function buy() {
      stage = 'purchase'; beforePurchase = economyView(e);
      if (candidate) {
        purchaseRequest = {candidate: candidate.id, price_units: candidate.price_units,
          funds_before_purchase_units: funds(e), shortage_units: Math.max(0, candidate.price_units - funds(e))};
        assert(!source.batch.purchased, 'offer_already_purchased');
        // Existing purchase checks only unspent funds. No refund or selection AI.
        let operation = 'BD-preview-purchase', suffix = 0;
        while (Object.hasOwn(e.at.purchases, operation)) operation = 'BD-preview-purchase-' + (++suffix);
        e = M.purchase(e, source.batch.id, candidate.id, operation);
        const receipt = e.at.purchases[operation];
        h.byUid.set(receipt.uid, '$purchase'); h.byHandle.set('$purchase', receipt.uid);
        purchase = {candidate: candidate.id, item: '$purchase', blueprint: bpView(candidate.blueprint), cost_units: receipt.units};
      }
      afterPurchase = economyView(e);
    }
    function prepare() {
      stage = 'learning';
      assert(prep.learn.every(base => !Object.hasOwn(e.profile.learned, base)), 'additional_learning_must_be_new');
      const beforeLearning = funds(e);
      const next = sorted([...Object.keys(e.profile.learned), ...prep.learn]);
      e = Q.learn(e, next); learningCost = beforeLearning - funds(e);
      learningAdded = prep.learn.filter(base => !Object.hasOwn(source.e.profile.learned, base));
      relearned = prep.learn.filter(base => Object.hasOwn(source.e.profile.learned, base));
      stage = 'equipment'; e = Q.equip(e, prep.equipment.map(id => resolveHandle(id, h)));
      stage = 'deck'; deck = U.canonical(e, prep.deck.map(id => resolveHandle(id, h))).map(x => x.id);
    }
    if (plan.purchase_timing === 'before_preparation') { buy(); prepare(); }
    else { prepare(); buy(); }
    const prepared = currentView(e, deck, h);
    const existingPreserved = current.owned.every(item => prepared.owned.some(x => x.id === item.id && JSON.stringify(x.blueprint) === JSON.stringify(item.blueprint)));
    return freeze({schema: 'BD1-preparation-preview', ok: true, read_only: true, units_per_point: unit,
      current, purchase_timing: plan.purchase_timing,
      candidate_consideration: {timing: plan.purchase_timing === 'before_preparation' ? 'before_cancellation_and_preparation' : 'after_preparation',
        economy: plan.purchase_timing === 'before_preparation' ? current.economy : beforePurchase},
      stages: {after_cancellation: afterCancellation, before_purchase: beforePurchase, after_purchase: afterPurchase, prepared: prepared.economy},
      cancellation: {bases: sorted(canceled), actual_refund_units: refunded, equipment_removed: removedByCancel},
      purchase: {requested: candidate?.id || null, performed_on_copy: !!purchase, cost_units: purchase?.cost_units || 0,
        requested_price_units: candidate?.price_units || 0, funds_before_purchase_units: beforePurchase.unspent_units,
        selected_in_preparation: !!purchase && prepared.owned.find(x => x.id === '$purchase').selected, item: purchase},
      learning: {retained: sorted(retained), newly_learned: sorted(learningAdded), relearned: sorted(relearned),
        removed_at_end: current.economy.learned.map(x => x.base).filter(base => !Object.hasOwn(e.profile.learned, base)),
        payment_units: learningCost, paid_learning_before_units: current.economy.paid_learning_units,
        paid_learning_after_units: prepared.economy.paid_learning_units},
      prepared, differences: {equipment: deltaItems(current.equipment.entries, prepared.equipment.entries),
        deck: deltaItems(current.deck.composition, prepared.deck.composition), existing_possessions_preserved: existingPreserved,
        owned_but_ineligible_after: prepared.owned.filter(x => !x.eligible).map(x => x.id)} });
  } catch (error) {
    // No mutable draft/save or raw exception content crosses the display boundary.
    return freeze({schema: 'BD1-preparation-preview', ok: false, read_only: true, current,
      refusal: {stage, code: rejectionCode(error), purchase_request: purchaseRequest}, draft_discarded: true});
  }
}
module.exports = {inspect, preview};
