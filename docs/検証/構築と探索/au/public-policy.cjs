'use strict';
const {AH} = require('./session.cjs');
function choose(game) {
  const base = AH.choose(game, 'progress_first'), pub = game.public(), def = game.predict(base);
  const cards = Object.fromEntries(pub.actors.P.hand.map(c => [c.id, c]));
  const choices = game.choices().map(ch => ({ch, card: cards[ch.card_id], prediction: game.predict(ch)}));
  if (def.mode === 'attack' && def.actual_hp_loss < pub.actors[base.target].hp) {
    const finish = choices.filter(x => x.prediction.mode === 'attack' && pub.actors[x.ch.target].purpose === 'support' &&
      x.prediction.actual_hp_loss >= pub.actors[x.ch.target].hp).sort((a, b) => a.prediction.action_cost - b.prediction.action_cost || a.ch.card_id.localeCompare(b.ch.card_id));
    if (finish.length) return {choice: finish[0].ch, reason: 'finish_visible_support'};
  }
  if (def.mode === 'place') {
    const exposed = x => Object.values(pub.actors).some(a => a.active && ['optional_enemy', 'goal_enemy'].includes(a.purpose) && a.next_at < pub.now + x.prediction.action_cost);
    const material = c => c.field_power + c.field_hit / 10;
    const candidates = choices.filter(x => x.prediction.mode === 'place' && x.card.kind !== 'heal' && x.card.remaining === cards[base.card_id].remaining);
    if (candidates.some(exposed)) {
      candidates.sort((a, b) => (exposed(a) ? material(a.card) : 0) - (exposed(b) ? material(b.card) : 0) ||
        a.prediction.action_cost - b.prediction.action_cost || a.ch.card_id.localeCompare(b.ch.card_id));
      if (candidates.length && candidates[0].ch.card_id !== base.card_id) return {choice: candidates[0].ch, reason: 'public_order_material'};
    }
  }
  return {choice: base, reason: 'progress_default'};
}
module.exports = {choose};
