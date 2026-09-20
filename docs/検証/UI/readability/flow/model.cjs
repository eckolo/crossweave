'use strict';
function createFlowModel(data) {
  const copy = x => JSON.parse(JSON.stringify(x));
  const drafts = {initial: copy(data.counts)};
  const state = {page: 'hub', example: 'initial', dialog: null, windowMode: 'pinned', card: null};
  const available = () => [...data.unlocked, ...(data.returns[state.example]?.receipt.unlocked || [])];
  const counts = () => drafts[state.example];
  function inspect() {
    const receipt = data.returns[state.example]?.receipt || null;
    const total = Object.values(counts()).reduce((a, b) => a + b, 0);
    return copy({...state, counts: counts(), available: available(), total, valid: total === data.limits.total,
      receipt, points: receipt?.points || 0, resolved: state.example === 'clear'});
  }
  function navigate(page) {
    if (!['hub', 'preparation', 'return'].includes(page)) throw Error('Unknown screen');
    if (page === 'return' && state.example === 'initial') return false;
    state.page = page; state.dialog = null; state.card = null; return true;
  }
  function example(kind) {
    if (kind !== 'initial' && !data.returns[kind]) throw Error('Unknown example');
    state.example = kind;
    drafts[kind] ||= copy(data.counts);
    state.page = kind === 'initial' ? 'hub' : 'return';
    state.dialog = null; state.card = null;
  }
  function open(name, card = null, mode = 'pinned') {
    if (!['quest', 'records', 'card', 'passives'].includes(name)) throw Error('Unknown window');
    if (name === 'card' && !data.cards.some(c => c.type === card)) throw Error('Unknown card');
    if (mode === 'peek' && state.dialog && state.windowMode === 'pinned') return;
    if (state.dialog === name && state.card === card && state.windowMode === mode && mode === 'pinned') return close();
    state.dialog = name; state.card = card; state.windowMode = mode;
  }
  function close() { state.dialog = null; state.card = null; }
  function adjust(card, delta) {
    if (state.page !== 'preparation' || !available().includes(card) || ![-1, 1].includes(delta)) return false;
    const next = (counts()[card] || 0) + delta;
    if (next < 0 || next > data.limits.perType) return false;
    counts()[card] = next; return true;
  }
  function depart() {
    if (state.page !== 'preparation' || !inspect().valid || state.dialog) return null;
    state.page = 'departure';
    return copy({schema: 'UI-F-001-departure-v1',quest: data.quest.id,example: state.example,
      revisit: state.example === 'clear',counts: counts(),unlocked: available()});
  }
  return {inspect, navigate, example, open, close, adjust, depart};
}
if (typeof module !== 'undefined') module.exports = {createFlowModel};
