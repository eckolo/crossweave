/* AI: validate an entire home preparation and expose the actual changes to UI. */
'use strict';
const AH=require('./expedition_choices.js'),L=require('./expedition_loop.js');
const I=require('./information.js');
const cfg=require('./reward_build_inputs.json');
const copy=AH.copy;
const check=(v,m)=>{if(!v)throw Error(m);};
class Game extends AH.Game{
  refill(w){
    super.refill(w);if(w!=='P')return;
    // A borrowed card becomes public to the player on draw, even if nobody played
    // that kind before. Record the revealing actor P, not a fictitious NPC action.
    const ah=this.s.ah,version=Object.keys(ah.catalogues)[0];
    for(const id of this.s.actors.P.hand){
      const c=this.s.cards[id];if(c.origin==='P')continue;
      const profile=ah.route+'/'+c.origin,signature=I.signature(c);
      const known=ah.knowledge.events.some(e=>e.version===version&&e.profile===profile&&
        (e.kind==='observed_card'&&I.signature(e.card)===signature||
         e.kind==='initial_catalogue_grant'&&e.cards.some(row=>I.signature(row.card)===signature)));
      if(!known)this.fact({kind:'observed_card',actor:'P',profile,card:I.card(c)});
    }
  }
}
function countsFor(source,id){
  check(Object.hasOwn(cfg.builds,id),'Unknown build proposal');
  const b=cfg.builds[id],out=AH.countsFor(source,b.base);
  for(const [from,to,n] of b.swaps){check(out[from]>=n,'Missing source cards');out[from]-=n;out[to]=(out[to]||0)+n;}
  return out;
}
function plan(source,profile,before,after,skills){
  const cards=L.catalog(source),beforeSummary=L.validateDeck(before,profile,cards);
  const next=AH.reallocate(profile,skills),afterSummary=L.validateDeck(after,next,cards);
  const removed=Object.keys(profile.learned).filter(id=>!Object.hasOwn(next.learned,id));
  const added=Object.keys(next.learned).filter(id=>!Object.hasOwn(profile.learned,id));
  return {profile:next,counts:copy(after),view:{
    deck_change:[...new Set([...Object.keys(before),...Object.keys(after)])].sort()
      .filter(type=>(before[type]||0)!==(after[type]||0))
      .map(type=>({type,name:cards[type].name,before:before[type]||0,after:after[type]||0,card:copy(cards[type])})),
    composition_before:beforeSummary,composition_after:afterSummary,
    skill_change:{removed,added,retained:Object.keys(next.learned).filter(id=>!added.includes(id))},
    points:{before:profile.points,refunded:removed.reduce((n,id)=>n+profile.learned[id],0),
      spent:added.reduce((n,id)=>n+next.learned[id],0),after:next.points},
    materials:copy(next.materials),unlocked:[...next.unlocked]
  }};
}
function depart(source,input,profile,counts,run,variant='C32',{comparison=false}={}){
  check(Object.hasOwn(cfg.variants,variant),'Unknown content variant');
  const out=AH.depart(source,input,profile,counts,'C',run,{comparison});
  const hp=cfg.variants[variant];
  out.bundle.actor_specs.V0.hp=hp;
  out.bundle.initial.state.actors.V0.hp=out.bundle.initial.state.actors.V0.max_hp=hp;
  out.game=new Game(out.bundle);return out;
}
module.exports={cfg,countsFor,plan,depart,Game};
