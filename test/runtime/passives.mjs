// Isolated shared-resolver inputs, not Campaign saves or natural play.
import {restoreGame} from '../../src/runtime/game.mjs';
import {validateEquipment} from '../../src/runtime/preparation.mjs';
import {actionFixture} from './boundaries.mjs';
import {assert} from './support.mjs';
export function passiveChecks(saved) {
  const checks=[];
  const placement=restoreGame(actionFixture(saved.entry,'f').session),place={card_id:placement.s.actors.P.hand[0],target:null};
  placement.s.ah.pending.after_guard=true;placement.s.ah.learned=['PS01'];placement.s.ah.equipped=[];
  assert(placement.predict(place).action_cost===10,'learned but not equipped passive applied');
  placement.s.ah.equipped=['base:PS01'];assert(placement.predict(place).action_cost===8,'PS01 discount');
  placement.s.ah.pending.after_guard=false;assert(placement.predict(place).action_cost===10,'PS01 persisted without previous guard');checks.push('PS01_equipped_and_immediately_previous_guard');
  const attack=restoreGame(actionFixture(saved.entry,'f',{matched:true}).session),ac={card_id:attack.s.actors.P.hand[0],target:'V0'};
  attack.s.actors.V0.guard=null;attack.s.ah.pending.last_match_attr='B';attack.s.ah.equipped=[];const base=attack.predict(ac).hit_gain;
  attack.s.ah.equipped=['base:PS02'];assert(attack.predict(ac).hit_gain===base+20,'PS02 hit');attack.s.ah.pending.last_match_attr='A';assert(attack.predict(ac).hit_gain===base,'same attr PS02');checks.push('PS02_different_last_matched_attribute');
  const guard=restoreGame(actionFixture(saved.port,'nt_stop',{matched:true}).session),gc={card_id:guard.s.actors.P.hand[0],target:null};
  // Only test the passive contribution before shared field/clamping; no funds or save mutation.
  guard.s.ah.equipped=['base:PS03'];guard.s.ah.pending.borrowed_guard=true;
  const e=guard.effect('P',guard.s.cards[gc.card_id]);assert(e.power===2&&e.ids.includes('PS03'),'PS03 charged effect');
  guard.play('P',gc);assert(guard.s.ah.pending.borrowed_guard===true,'foreign guard must consume then re-arm');
  guard.s.ah.pending.borrowed_guard=false;assert(guard.effect('P',{kind:'guard',attr:'D'}).power===0,'uncharged PS03');checks.push('PS03_borrowed_charge_consumed_then_rearmed');
  const heal=restoreGame(actionFixture(saved.entry,'salve',{matched:true,hp:16}).session),hc={card_id:heal.s.actors.P.hand[0],target:null};
  heal.s.ah.equipped=[];assert(heal.predict(hc).hp_restored===16,'base salve');heal.s.ah.equipped=['base:PS04'];assert(heal.predict(hc).hp_restored===20,'PS04 recovery');
  heal.play('P',hc);assert(heal.s.actors.P.hp===36&&heal.s.cards[hc.card_id].destroyed,'PS04 actual finite recovery');checks.push('PS04_consumable_recovery_and_actual_consumption');
  let rejected=null;try{validateEquipment({profile:{learned:{PS01:2,PS02:2,PS03:2,PS04:2}}},['base:PS01','base:PS02','base:PS03','base:PS04']);}catch(e){rejected=e.code;}
  assert(rejected==='equipment_capacity_exceeded','capacity 9/8');checks.push('AQ_capacity_distinct_from_learning');
  return {ok:true,checks,scope:'constructed resolver inputs; no additional natural run or price adoption'};
}
