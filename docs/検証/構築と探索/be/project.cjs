'use strict';
const assert = require('assert/strict');

// Pure allowlist projection. No game, policy, trace, outcome, or post-action state.
class MissingSavedPublicData extends Error {}
function need(value, label) {
  if (value === undefined) throw new MissingSavedPublicData(label);
  return value;
}
function role(id) {
  // Existing posture_am/engine.js enter(): role derives from the public actor ID.
  assert(['P', 'V0', 'V1'].includes(id), 'Unsupported actor outside the fixed AZ snapshots');
  return id === 'P' ? 'P' : id[0];
}
const order = {V: 0, P: 1, E: 2};
function compareReservations(a, b) {
  return a.next_at - b.next_at || order[a.role] - order[b.role] || a.actor.localeCompare(b.actor);
}

function projectObservation(observation) {
  const before = need(observation.before, 'before');
  const now = need(before.now, 'before.now');
  const player = need(before.actors?.P, 'before.actors.P');
  const sourceHand = need(before.hand, 'before.hand');
  const sourceField = need(before.field, 'before.field');
  const choices = need(observation.decision?.choices, 'decision.choices');
  assert.equal(need(player.next_at, 'P.next_at'), now);
  const self = {hp: need(player.hp, 'P.hp'), max_hp: need(player.max_hp, 'P.max_hp')};
  const hand = sourceHand.map(c => ({
    id: need(c.id, 'hand.id'), name: need(c.name, 'hand.name'), attr: need(c.attr, 'hand.attr'),
    kind: need(c.kind, 'hand.kind'), remaining: need(c.remaining, 'hand.remaining')
  }));
  assert(hand.every(c => Number.isInteger(c.remaining) && c.remaining > 0));
  const field = Object.entries(sourceField).map(([attr, c]) => {
    assert.equal(c.attr, attr); assert.equal(need(c.remaining, 'field.remaining'), null);
    return {id: need(c.id, 'field.id'), name: need(c.name, 'field.name'), attr, hand_expiry: null};
  });
  const reservations = Object.entries(before.actors).filter(([id, a]) =>
    id !== 'P' && need(a.active, `actors.${id}.active`) && need(a.next_at, `actors.${id}.next_at`) !== null
  ).map(([actor, a]) => ({actor, purpose: need(a.purpose, `actors.${actor}.purpose`), role: role(actor), next_at: a.next_at}));
  assert(reservations.every(a => Number.isFinite(a.next_at) && a.next_at >= now));
  reservations.sort(compareReservations);

  const legalActions = choices.map(row => {
    const choice = need(row.choice, 'choice'), prediction = need(row.prediction, 'prediction');
    const card = sourceHand.find(c => c.id === choice.card_id);
    assert(card, 'Legal choice must use a current hand card');
    const material = sourceField[card.attr] || null;
    const mode = need(prediction.mode, 'prediction.mode');
    assert.equal(mode, material ? card.kind : 'place');
    // These three fixed observations have no attack or guard matches. Do not invent their forecasts.
    assert(['place', 'heal'].includes(mode), 'Unsupported case action');
    assert.equal(need(choice.target, 'choice.target'), null);
    const cost = need(prediction.action_cost, 'prediction.action_cost');
    assert(Number.isFinite(cost) && cost > 0);
    const hpRestored = need(prediction.hp_restored, 'prediction.hp_restored');
    assert.equal(hpRestored, mode === 'heal' ? Math.min(need(card.power, 'heal.power'), self.max_hp - self.hp) : 0);
    const next = {actor: 'P', role: 'P', next_at: now + cost};
    const unusedHand = sourceHand.filter(c => c.id !== card.id).map(c => {
      const remaining = need(c.remaining, 'unused.remaining') - 1;
      // Expiring cards in the selected cases are ordinary initial nonconsumable cards.
      // Do not generalize shared recovery to consumables, doomed cards, or filler cards.
      // consume_on_recover is optional in the saved card schema; the existing
      // recovery rule treats its absent/null value as false. doomed is saved explicitly.
      if (remaining === 0) assert(!c.consume_on_recover && need(c.doomed, 'expiring.doomed') === false && c.id.includes('_initial_'));
      return {card_id: c.id, remaining_after_action: remaining,
        destination: remaining === 0 ? 'shared_recovery' : 'hand'};
    });
    return {
      card_id: card.id, target: null, mode, matched_field_id: material?.id || null,
      current_hp_restored: hpRestored, action_cost: cost, next_self_reservation: next.next_at,
      unused_hand_after_action: unusedHand,
      currently_reserved_before_next_self: reservations.filter(a => compareReservations(a, next) < 0)
        .map(a => ({actor: a.actor, next_at: a.next_at, relation: a.next_at === next.next_at ? 'same_time_V_before_P' : 'earlier_time'}))
    };
  });
  assert.equal(legalActions.length, hand.length);
  assert.equal(new Set(legalActions.map(a => a.card_id)).size, hand.length);

  const matched = legalActions.filter(a => a.mode !== 'place');
  const smallHeals = matched.filter(a => a.mode === 'heal');
  const decisionMaterials = [{question: 'いま一致で使える手札はあるか',
    fact: matched.length ? '現在の一致は回復草だけ。攻撃・防御の一致はない。' : '手札の属性と場の属性が一致せず、現在の合法行動は設置だけ。',
    legal_match_card_ids: matched.map(a => a.card_id)}];
  for (const heal of smallHeals) {
    decisionMaterials.push({question: '小回復を使うと、いまの他の手札期限はどうなるか',
      fact: `${heal.current_hp_restored}回復できる。使わない手札の残期限は1減り、期限1の札は共有の回収山へ移る。`,
      action_card_id: heal.card_id,
      expiring_card_ids: heal.unused_hand_after_action.filter(c => c.destination === 'shared_recovery').map(c => c.card_id)});
  }
  decisionMaterials.push({question: '設置した材料は次の自分まで残るか',
    fact: '設置では札の主効果は発動しない。場札に手札の期限切れはないが、公開予約上は次の自分より先に行動する主体がいる。相手の次札は不明で、材料が残る保証も、使われる確定予測もない。'});
  if (legalActions.some(a => a.currently_reserved_before_next_self.some(r => r.relation === 'same_time_V_before_P'))) {
    decisionMaterials.push({question: '次の自分と他主体が同時刻ならどちらが先か',
      fact: 'Bの踏み込みを設置すると次の自分の予約は150。V0・V1の公開予約も150で、既存の同時刻順により予約はV0、V1、自分の順に並ぶ。使用札や再予約・退場後までの全順序、自分の次手番への到達は保証しない。'});
  }
  return {id: `az-time-${now}`, now, self, hand, field, other_current_reservations: reservations,
    legal_actions: legalActions, decision_materials: decisionMaterials};
}

function project(source, candidateTimes) {
  const observations = need(source.six_placement_public_observations, 'six_placement_public_observations');
  const cases = [], omitted = [];
  for (const time of candidateTimes) {
    const matches = observations.filter(o => o.before?.now === time);
    if (matches.length !== 1) { omitted.push({time, reason: 'Required unique saved public snapshot is missing'}); continue; }
    try { cases.push(projectObservation(matches[0])); }
    catch (error) {
      if (!(error instanceof MissingSavedPublicData)) throw error;
      omitted.push({time, reason: `Saved public field missing: ${error.message}`});
    }
  }
  return {
    schema: 'BE1-public-decision-context',
    rule_notes: [
      '残期限は本人が行動した後、使わなかった手札だけ1減る。内部時刻の1進行ではない。',
      'ここで期限0になる通常札は共有の回収山へ移り、破壊や永久喪失を意味しない。消耗品等の回収例外を全札へ一般化しない。',
      '設置は場へ出す行動で、主効果は発動しない。一致時は札の種類に応じた主効果と適用される場効果を解決する。',
      '場札に手札の期限切れはない。他主体による利用は共有の場の循環であり、一方的な損失とは判定しない。',
      '公開済みの次行動予約だけを並べる。同時刻はV→P→E、同じ種では主体ID順。予約後の新しい行動や配分は予測しない。'
    ],
    cases, omitted
  };
}
module.exports = {project, projectObservation, compareReservations};
