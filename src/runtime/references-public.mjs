import I from './information.mjs';
import {copy} from './common.mjs';

export const knowledgeKey = target => JSON.stringify(['knowledge',target.id,target.catalogue_version]);

// Aggregate the player's cards, not their draw order or instance identifiers.
// Initial, undrawn, held and doomed counts deliberately remain separate.
export function deckCatalogue(game) {
  const a=game.s.actors.P,groups=new Map();
  function add(id,location) {
    const c=game.s.cards[id],signature=I.signature(c);
    if(!groups.has(signature))groups.set(signature,{card:I.card(c),deck_count:0,hand_count:0,initial_count:0,doomed_deck_count:0,doomed_hand_count:0});
    const row=groups.get(signature);row[location+'_count']++;
    if(c.doomed&&location!=='initial')row['doomed_'+location+'_count']++;
  }
  for(const c of Object.values(game.s.cards))if(c.origin==='P'&&c.birth==='initial')add(c.id,'initial');
  for(const id of a.deck)add(id,'deck');
  for(const id of a.hand)add(id,'hand');
  const entries=[...groups.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0)
    .map(([,row],i)=>({detail_id:'own-card:'+i,...row}));
  return {status:'known',owner_actor_id:'P',reference_scope:'current_view',order_disclosed:false,
    deck_count:a.deck.length,hand_count:a.hand.length,initial_count:a.initial_size,entries};
}

const actionKeys=['type','time','actor','action_number','card_id','target','matched_id','mode','damage','actual_hp_loss',
  'hit_gain','hit_connected','posture_before','posture_after','posture_overflow','posture_multiplier','hp_restored','crit_added',
  'expired','old_guard_ended','event_before','passives','action_cost'];
const boundaryKeys=['type','time','number','event','victim','attacker','P_actions','from_event','to_event'];
export function actionHistory(rows) {
  return rows.filter(r=>['action','boundary'].includes(r.type)).map(row=>{
    const keys=row.type==='action'?actionKeys:boundaryKeys;
    const out=Object.fromEntries(keys.filter(k=>Object.hasOwn(row,k)).map(k=>[k,copy(row[k])]));
    if(row.type==='action')Object.assign(out,{card_name:row.card_name??null,
      card_name_status:row.card_name===undefined?'not_recorded':'recorded_at_resolution'});
    return out;
  });
}
