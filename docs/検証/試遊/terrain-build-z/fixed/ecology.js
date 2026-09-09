/* Y: shared cover and weak-card accuracy. X/W remain reproducible. */
const CWEcology = (() => {
  const Core=typeof module!=='undefined'&&module.exports?require('./engine.js'):CWCardStats;
  const F=typeof module!=='undefined'&&module.exports?require('./feedback.js'):CWFeedback;
  const profiles={
    local20:{scope:'V0',weak_hit:20},
    shared20:{scope:'all',weak_hit:20},
    local50:{scope:'V0',weak_hit:50},
    shared50:{scope:'all',weak_hit:50}
  };
  function prepare(source,profile='shared50'){
    const p=profiles[profile];if(!p)throw Error('Unknown ecology profile');
    const b=F.prepare(source,'roles');b.ecology_profile=profile;
    b.config.weak_hit=p.weak_hit;
    const cover=b.initial.state.actors.O.passives.find(p=>p.kind==='evasion');
    if(!cover)throw Error('Missing cover effect');cover.target=p.scope;
    for(const c of Object.values(b.initial.state.cards))if(c.type.startsWith('weak_'))c.hit=p.weak_hit;
    return b;
  }
  class Game extends Core.Game {
    passive(w,kind){
      if(!this.s.actors[w]?.active)return 0;
      return Object.values(this.s.actors).filter(a=>a.active).flatMap(a=>a.passives)
        .filter(p=>p.kind===kind&&(p.target===w||p.target==='all')).reduce((n,p)=>n+p.value,0);
    }
    stats(c){super.stats(c);if(c.type.startsWith('weak_')&&this.bundle.config.weak_hit!==undefined)c.hit=this.bundle.config.weak_hit;}
    play(w,choice){
      const a=this.s.actors[w],c=this.s.cards[choice.card_id],mid=this.s.field[c.attr],m=mid?this.s.cards[mid]:null;
      const context={crit_before:a.crit,target_crit_before:choice.target?this.s.actors[choice.target].crit:null,
        hit_components:m&&c.kind==='attack'?{card:c.hit,field:m.field_hit,evasion:this.evasion(choice.target)}:null,
        power_before_multiplier:m?c.power+m.field_power:null,weak:c.type.startsWith('weak_'),
        attack_progress_possible_same_target:choice.target?a.hand.map(id=>this.s.cards[id]).some(card=>{
          const material=this.s.cards[this.s.field[card.attr]];
          return card.kind==='attack'&&material&&card.hit+material.field_hit-this.evasion(choice.target)>0;
        }):false};
      super.play(w,choice);
      const row=this.trace[this.trace.length-1];
      if(row?.type==='action')Object.assign(row,context,{crit_after:a.crit});
    }
  }
  return {Game,prepare,profiles};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CWEcology;
