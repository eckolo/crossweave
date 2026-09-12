'use strict';
const assert = require('assert/strict');
const {AH} = require('../au/session.cjs');
const AU = require('../au/public-policy.cjs');

// Only these three public operations reach the policy; no session/game state is exposed.
function publicAPI(game) {
  return Object.freeze({public: () => game.public(), choices: () => game.choices(), predict: ch => game.predict(ch)});
}
function common(api) {
  const pick = AU.choose(api);
  return pick.reason === 'finish_visible_support'
    ? {choice: AH.choose(api, 'progress_first'), reason: 'progress_without_finish_override'} : pick;
}
function pair(game) {
  const api = publicAPI(game), leave = common(api), pub = api.public(), pred = api.predict(leave.choice);
  let remove = {...leave};
  if (pred.mode === 'attack') {
    const support = api.choices().filter(ch => ch.card_id === leave.choice.card_id && pub.actors[ch.target]?.active && pub.actors[ch.target].purpose === 'support')
      .map(ch => ({ch, p: api.predict(ch)}))
      .sort((a, b) => b.p.actual_hp_loss - a.p.actual_hp_loss || b.p.hit_gain - a.p.hit_gain || a.ch.target.localeCompare(b.ch.target));
    if (support.length) remove = {choice: support[0].ch, reason: 'target_support'};
  }
  assert.equal(remove.choice.card_id, leave.choice.card_id, 'Policy changed card rather than target');
  assert.equal(api.predict(remove.choice).mode, pred.mode, 'Policy changed mode');
  if (pred.mode !== 'attack') assert.deepEqual(remove.choice, leave.choice, 'Nonattack choices differ');
  return {leave_support: leave, target_support: remove};
}
module.exports = {pair, publicAPI, common};
