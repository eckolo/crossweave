// Current content plus the pinned 0.1 target/card registry for in-progress runs and receipts.
// Shared fields are unchanged by the additive 0.2 content patch.
import C from '../content/m1.mjs';
import {check} from './common.mjs';
const old=C.previous_content;
const previous=old?Object.freeze({...C,...old,
  cards:Object.freeze(Object.fromEntries(old.card_types.map(id=>[id,C.cards[id]])))}):null;
export function contentFor(id) {
  if(id===C.content_set_id)return C;
  check(previous&&id===previous.content_set_id,'unsupported_content_set');
  return previous;
}
export const contentSets=Object.freeze(previous?[C,previous]:[C]);
