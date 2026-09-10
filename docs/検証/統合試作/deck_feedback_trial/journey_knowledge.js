/* AG: join the existing AD knowledge ledger and AF typed rewards, without changing combat. */
'use strict';
const H=require('./hybrid_rewards.js'),L=require('./expedition_loop.js');
const I=require('./information.js'),K=require('./knowledge.js'),T=require('./terrain.js');
const info=require('./information_inputs.json');
const check=(v,message)=>{if(!v)throw Error(message);};
const has=(o,k)=>Object.hasOwn(o,k);
function requireProfile(profile){check(profile.schema==='AG1'&&profile.knowledge_returns,'Use an AG profile');}
function initialProfile(){return {...H.initialProfile(),schema:'AG1',knowledge_returns:{}};}
function depart(source,input,profile,counts,runId){
  requireProfile(profile);
  const out=H.depart(source,input,{...profile,schema:'AF1'},counts,runId);
  out.profile.schema='AG1';return out;
}
function finish(profile,runId,game,ledger){
  requireProfile(profile);
  const incoming=K.validate(ledger),receipt=JSON.stringify(incoming);
  const out=H.finish({...profile,schema:'AF1'},runId,game);
  if(has(profile.knowledge_returns,runId)){
    check(profile.knowledge_returns[runId]===receipt,'Conflicting knowledge receipt');
    return {...out,schema:'AG1'};
  }
  check(!has(profile.returns,runId),'Existing return has no knowledge receipt');
  out.knowledge=K.carry(profile.knowledge,incoming,game.s.outcome);
  out.knowledge_returns[runId]=receipt;out.schema='AG1';return out;
}
function preparation(source,profile){
  requireProfile(profile);
  return {...L.preparation(source,{...profile,schema:'AE1'},info.briefing,info.card_version,Object.values(info.profiles)),
    holdings:H.holdings({...profile,schema:'AF1'})};
}
function buy(profile,id,kind){
  requireProfile(profile);return {...H.buy({...profile,schema:'AF1'},id,kind),schema:'AG1'};
}
function useMaterial(profile,id,recipe){
  requireProfile(profile);return {...H.useMaterial({...profile,schema:'AF1'},id,recipe),schema:'AG1'};
}

// Recorder for the fixed Z content only. Authored initial catalogues are private
// inputs to D42 disclosure; the preparation view never receives them directly.
function recorderFor(source){
  const authored=new T.Game(T.prepare(source)),catalogues={[info.card_version]:{}},cards=L.catalog(source);
  for(const [actor,profile] of Object.entries(info.profiles)){
    if(catalogues[info.card_version][profile])continue;
    if(!authored.s.actors[actor]?.active)authored.enter(actor,0);
    const ledger=I.empty();
    I.add(ledger,{id:'AG-authored-'+actor,run:'AG-authoring',version:info.card_version,profile,
      kind:'initial_catalogue_grant',complete:true,evidence:'fixed Z authored initial profile',
      cards:authored.s.actors[actor].deck.map(id=>({card:authored.s.cards[id],initial_count:1}))});
    catalogues[info.card_version][profile]=ledger.events[0].cards;
  }
  function rewardLabel(key){
    check(has(H.cfg.rewards,key),'Unknown acquired reward');
    return H.cfg.rewards[key].map(item=>{
      if(item.kind==='points')return '成長ポイント '+item.amount;
      if(item.kind==='material')return H.cfg.materials[item.type].name+' '+item.amount;
      if(item.kind==='unlock')return cards[item.type].name+'の解放';
      throw Error('Unknown reward component');
    }).join('、');
  }
  return class Recorded extends T.Game{
    constructor(bundle,run,prior){
      super(bundle);this.run=run;this.knowledge=K.validate(prior);this.seen=new Set();this.seq=0;this.contacts();
    }
    fact(data){
      K.receive(this.knowledge,{id:`${this.run}:${++this.seq}`,run:this.run,version:info.card_version,time:this.s.now,...data},
        'first_resolution',catalogues);
    }
    contacts(){
      for(const [actor,a] of Object.entries(this.s.actors))if(a.active&&info.profiles[actor]&&!this.seen.has(actor)){
        this.fact({kind:'encounter',actor,profile:info.profiles[actor]});this.seen.add(actor);
      }
    }
    play(w,choice){
      const played=I.card(this.s.cards[choice.card_id]),oldEvents=this.s.events.length;
      const oldRewards=new Set(Object.keys(this.s.rewards));
      super.play(w,choice);
      if(info.profiles[w])this.fact({kind:'observed_card',actor:w,profile:info.profiles[w],card:played});
      for(const event of this.s.events.slice(oldEvents)){
        const actor=({V0_traversed:'V0',V1_traversed:'V1',enemy_defeated:'E1'})[event.event];
        if(actor&&info.profiles[actor])this.fact({kind:'resolution',actor,profile:info.profiles[actor],
          result:actor==='E1'?'defeated':'traversed'});
      }
      for(const [key,reward] of Object.entries(this.s.rewards))if(!oldRewards.has(key)){
        this.fact({kind:'observed_reward',profile:info.profiles[reward.source]||'obstacle-Z',
          reward_key:key,label:rewardLabel(key)});
      }
      this.contacts();
    }
  };
}
module.exports={initialProfile,depart,finish,preparation,buy,useMaterial,recorderFor};
