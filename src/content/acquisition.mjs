// D03R trial policy. Derived from the existing free-card cap / learning prices.
// Not a product balance decision; offers keep their separately pinned prices.
import C from './m1.mjs';
export default Object.freeze({version:'CW-M1-acquisition-1',initial_card_quantity:C.rules.deck.per_base_cap,
  initial_cards_convertible:false,basic_passive_stock:1,basic_passive_prices:C.rules.learning.cost_units,
  value_band:'ordinary'});
