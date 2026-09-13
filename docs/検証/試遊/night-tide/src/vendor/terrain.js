/* Z: rock cover benefits other actors. Y stays available as a comparison. */
const CWTerrain = (() => {
  const E=typeof module!=='undefined'&&module.exports?require('./ecology.js'):CWEcology;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const builds={
    guard5:{label:'攻撃6・防御5・回復1',swaps:[]},
    guard3:{label:'攻撃8・防御3・回復1',swaps:[['g','sweep',1],['r','fast',1]]},
    guard0:{label:'攻撃11・防御0・回復1',swaps:[['g','sweep',2],['r','fast',2],['read','j',1]]}
  };
  function prepare(source,build='guard5'){
    if(!builds[build])throw Error('Unknown starting build');
    const b=E.prepare(source,'shared50');b.terrain_build=build;
    b.initial.state.actors.O.passives.find(p=>p.id==='rock_cover').target='others';
    delete b.actor_specs.O.V0_evasion_support;
    b.actor_specs.O.cover={target:'other_active_actors',evasion:20};
    for(const [from,to,count] of builds[build].swaps){
      const ids=b.initial.state.actors.P.deck.filter(id=>b.initial.state.cards[id].type===from).slice(0,count);
      if(ids.length!==count)throw Error('Insufficient cards for build');
      for(const id of ids){
        const c=b.initial.state.cards[id],spec=b.templates.find(t=>t.type===to);
        if(!spec||spec.attr!==c.attr)throw Error('Build must preserve attributes');
        Object.assign(c,copy(spec),b.config.card_defaults,b.config.card_overrides[to]||{});
      }
    }
    return b;
  }
  class Game extends E.Game {
    passive(w,kind){
      if(!this.s.actors[w]?.active)return 0;
      let value=0;
      for(const [source,a] of Object.entries(this.s.actors))if(a.active){
        for(const p of a.passives)if(p.kind===kind&&(p.target===w||p.target==='all'||p.target==='others'&&source!==w))value+=p.value;
      }
      return value;
    }
  }
  return {Game,prepare,builds};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CWTerrain;
