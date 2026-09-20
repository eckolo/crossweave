// CPython Random.seed(str, version=2): UTF-8 + SHA-512, then init_by_array.
// MT draw/getrandbits/rejection/shuffle are the frozen AM implementation.
import {MT} from './core.mjs';
import {check, integer} from './common.mjs';

export async function seedState(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-512', bytes));
  const input = new Uint8Array(bytes.length + digest.length);
  input.set(bytes); input.set(digest, bytes.length);
  const key = [];
  for (let end = input.length; end > 0; end -= 4) {
    let word = 0;
    for (let i = Math.max(0, end - 4); i < end; i++) word = (word * 256 + input[i]) >>> 0;
    key.push(word);
  }
  const mt = [19650218];
  for (let i = 1; i < 624; i++) mt[i] = (Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1812433253) + i) >>> 0;
  let i = 1, j = 0;
  for (let k = Math.max(624, key.length); k > 0; k--) {
    mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j) >>> 0;
    i++; j++;
    if (i >= 624) { mt[0] = mt[623]; i = 1; }
    if (j >= key.length) j = 0;
  }
  for (let k = 623; k > 0; k--) {
    mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0;
    i++;
    if (i >= 624) { mt[0] = mt[623]; i = 1; }
  }
  mt[0] = 0x80000000;
  return [...mt, 624];
}
export async function runStreams(seed) {
  check(integer(seed), 'invalid_run_seed');
  const states = {};
  for (const actor of ['P', 'V0', 'E1', 'V1']) for (const purpose of ['initial', 'allocation', 'generation', 'selection', 'target']) {
    const key = actor + '|' + purpose;
    states[key] = await seedState(`crossweave:AH1:${seed}:${key}`);
  }
  return states;
}
export {MT};
