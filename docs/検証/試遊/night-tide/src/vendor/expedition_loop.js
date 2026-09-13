/* AE: provisional preparation/return adapter. Existing combat and AD history stay unchanged. */
'use strict';
const T=require('./terrain.js'),Core=require('./engine.js');
const K=require('./knowledge.js'),I=require('./information.js');
const cfg=require('./loop_inputs.json');
const copy=x=>JSON.parse(JSON.stringify(x));
const requireThat=(condition,message)=>{if(!condition)throw Error(message);};
const fingerprint=x=>JSON.stringify(x);
function catalog(source){
  const b=T.prepare(source),game=new T.Game(b),out={};
  for(const spec of b.templates){const id=game.newCard('P','initial',null,spec);out[spec.type]=I.card(game.s.cards[id]);}
  for(const id of b.initial.state.actors.P.deck){const c=b.initial.state.cards[id];out[c.type]=I.card(c);}
  return out;
}
function initialProfile(mode='choose'){
  requireThat(cfg.growth_modes.includes(mode),'Unknown growth mode');
  return {schema:'AE1',mode,phase:'home',run:null,unlocked:[...cfg.initial_unlocked],points:0,
    hp_bonus:0,reduction_bonus:0,knowledge:K.validate(I.empty()),returns:{},purchases:{}};
}
function validateDeck(counts,profile,cards){
  requireThat(counts&&typeof counts==='object'&&!Array.isArray(counts),'Invalid deck');
  let total=0;const attributes={},roles={};
  for(const [type,count] of Object.entries(counts)){
    requireThat(Object.hasOwn(cards,type)&&profile.unlocked.includes(type),'Unavailable card: '+type);
    requireThat(Number.isInteger(count)&&count>=0&&count<=cfg.same_type_limit,'Invalid count: '+type);
    total+=count;attributes[cards[type].attr]=(attributes[cards[type].attr]||0)+count;
    roles[cards[type].kind]=(roles[cards[type].kind]||0)+count;
  }
  requireThat(total===cfg.deck_size,'Deck must contain '+cfg.deck_size+' cards');
  return {total,attributes,roles};
}
function depart(source,input,profile,counts,runId){
  requireThat(profile.schema==='AE1'&&profile.phase==='home','Departure requires home phase');
  requireThat(runId&&!Object.hasOwn(profile.returns,runId),'Duplicate or missing run ID');
  const cards=catalog(source);validateDeck(counts,profile,cards);
  const b=T.prepare(source);b.initial.state.seed='AE-Z'+input.seed;
  for(const key of Object.keys(b.initial.rng))b.initial.rng[key]=copy(input.states[key]);
  for(const key of Object.keys(b.future_rng))b.future_rng[key]=copy(input.states[key]);
  const p=b.initial.state.actors.P,ids=[...p.deck].sort(),types=[];
  // Counts are canonicalized: object-key order cannot be used to choose the shuffle.
  for(const type of Object.keys(counts).sort())for(let i=0;i<counts[type];i++)types.push(type);
  ids.forEach((id,i)=>{
    b.initial.state.cards[id]={...copy(cards[types[i]]),id,origin:'P',birth:'initial',remaining:null,doomed:false,destroyed:false};
  });
  p.deck=ids;p.hp=p.max_hp=60+profile.hp_bonus;
  if(profile.reduction_bonus)p.passives.push({id:'AE-toughness',kind:'damage_reduction',target:'P',value:profile.reduction_bonus});
  for(const [w,a] of Object.entries(b.initial.state.actors)){
    a.deck.sort();const rng=new Core.MT(b.initial.rng[w+'|initial']);rng.shuffle(a.deck);b.initial.rng[w+'|initial']=rng.state();
  }
  const next=copy(profile);next.phase='exploring';next.run=runId;
  return {profile:next,bundle:b,game:new T.Game(b)};
}
function buy(profile,purchaseId,kind){
  requireThat(profile.phase==='home','Upgrade requires return');
  requireThat(profile.mode==='choose','Automatic mode has no purchase operation');
  requireThat(purchaseId&&Object.hasOwn(cfg.upgrades,kind),'Unknown purchase');
  if(Object.hasOwn(profile.purchases,purchaseId)){
    requireThat(profile.purchases[purchaseId]===kind,'Conflicting purchase ID');return copy(profile);
  }
  const u=cfg.upgrades[kind];requireThat(profile.points>=u.cost,'Insufficient growth points');
  const out=copy(profile);out.points-=u.cost;out.hp_bonus+=u.hp;out.reduction_bonus+=u.reduction;
  out.purchases[purchaseId]=kind;return out;
}
function finish(profile,runId,game,knowledge){
  const s=game.s,settlement=s.settlement;
  requireThat(['clear','withdrawal','defeat'].includes(s.outcome)&&settlement?.reason===s.outcome,'Unsettled exploration');
  const evidence=fingerprint({settlement,knowledge});
  if(Object.hasOwn(profile.returns,runId)){
    requireThat(profile.returns[runId]===evidence,'Conflicting return ID');return copy(profile);
  }
  requireThat(profile.phase==='exploring'&&profile.run===runId,'Wrong active run');
  const out=copy(profile);out.phase='home';out.run=null;
  out.knowledge=K.carry(profile.knowledge,knowledge,s.outcome);
  for(const key of settlement.kept){
    const reward=cfg.rewards[key];requireThat(reward,'Unknown reward');
    if(reward.unlock){
      if(out.unlocked.includes(reward.unlock))out.points+=cfg.duplicate_points;
      else out.unlocked.push(reward.unlock);
    }else out.points+=reward.points;
  }
  if(out.mode==='automatic_hp'){
    const u=cfg.upgrades.vitality,count=Math.floor(out.points/u.cost);out.points-=count*u.cost;out.hp_bonus+=count*u.hp;
  }
  out.returns[runId]=evidence;return out;
}
function preparation(source,profile,briefing,version,profiles){
  const cards=catalog(source);
  return {phase:profile.phase,card_choices:profile.unlocked.map(type=>({card:cards[type],limit:cfg.same_type_limit})),
    deck_size:cfg.deck_size,attribute_quota:null,points:profile.points,
    upgrades:profile.mode==='choose'?copy(cfg.upgrades):{},
    knowledge:K.departure({briefing,ledger:profile.knowledge,version,profiles:[...new Set(profiles)]})};
}
module.exports={cfg,catalog,initialProfile,validateDeck,depart,buy,finish,preparation};
