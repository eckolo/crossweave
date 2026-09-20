export const copy = x => structuredClone(x);
export function check(condition, code, field = null, details = {}) {
  if (!condition) throw Object.assign(new Error(code), {code, field, details});
}
export function canonical(x) {
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
export const unique = xs => Array.isArray(xs) && xs.every(x => typeof x === 'string') && new Set(xs).size === xs.length;
export const integer = x => Number.isSafeInteger(x) && x >= 0;
export const sum = xs => xs.reduce((a, b) => a + b, 0);
export const fail = error => ({ok: false, error: {code: typeof error.code==='string'?error.code:'invalid_state', field: error.field || null, details: error.details || {}}});
