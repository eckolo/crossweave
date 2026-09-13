/* Additional X trial. Rules remain in the unchanged W engine. */
const CWFeedback = (() => {
  const copy = x => JSON.parse(JSON.stringify(x));
  const PROFILES = {
    original: {label:'前回の数値', normal:50, weak:25, heal:25, overrides:{}},
    slow: {label:'会心のみ抑制', normal:25, weak:10, heal:10, overrides:{}},
    roles: {label:'会心抑制・防御札の個性', normal:25, weak:10, heal:10,
      overrides:{g:{crit_gain:20},r:{crit_gain:40},read:{power:1,evasion:30,crit_gain:20}}},
    roles_mix: {label:'防御3枚の構築対照', normal:25, weak:10, heal:10,
      overrides:{g:{crit_gain:20},r:{crit_gain:40},read:{power:1,evasion:30,crit_gain:20}}, mix:true}
  };
  function prepare(source, profile='roles') {
    if(!PROFILES[profile])throw Error('Unknown profile');
    const b=copy(source),p=PROFILES[profile];
    b.feedback_profile=profile;
    b.config.card_defaults={crit_gain:p.normal,evasion:0};
    b.config.card_overrides={salve:{crit_gain:p.heal},salve_slow:{crit_gain:p.heal},salve_zero:{crit_gain:p.heal},...p.overrides};
    b.config.weak_crit_gain=p.weak;b.config.filler_crit_gain=p.weak;
    delete b.actor_specs.P.crit_gain; // Unused legacy metadata; no actor-owned gain.
    if(p.mix){
      for(const [from,to] of [['g','sweep'],['r','fast']]){
        const id=b.initial.state.actors.P.deck.find(id=>b.initial.state.cards[id].type===from);
        Object.assign(b.initial.state.cards[id],copy(b.templates.find(c=>c.type===to)));
      }
    }
    for(const c of Object.values(b.initial.state.cards)){
      Object.assign(c,b.config.card_defaults,b.config.card_overrides[c.type]||{});
      if(c.type.startsWith('weak_'))c.crit_gain=p.weak;
      if(c.type.startsWith('filler_'))c.crit_gain=p.weak;
    }
    return b;
  }
  const keys=['type','name','attr','kind','power','hit','evasion','crit_gain','field_power','field_hit','life','place_cost','match_cost','consume_on_recover'];
  const signature=c=>JSON.stringify(keys.map(k=>c[k]??null));
  function catalogue(game){
    const rows=new Map(),p=game.s.actors.P;
    function add(c,location){
      const key=signature(c);
      if(!rows.has(key))rows.set(key,{card:Object.fromEntries(keys.map(k=>[k,c[k]??null])),remaining:0,hand:0,initial:0,doomed_remaining:0});
      const row=rows.get(key);row[location]++;
      if(location==='remaining'&&c.doomed)row.doomed_remaining++;
    }
    const initial=game.bundle.initial.state;
    for(const id of initial.actors.P.deck)add(initial.cards[id],'initial');
    for(const id of p.deck)add(game.s.cards[id],'remaining');
    for(const id of p.hand)add(game.s.cards[id],'hand');
    return [...rows.values()].sort((a,b)=>a.card.attr.localeCompare(b.card.attr)||a.card.type.localeCompare(b.card.type)||signature(a.card).localeCompare(signature(b.card)));
  }
  function attributes(game,known=new Set()){
    const p=game.s.actors.P;
    for(const id of [...p.deck,...p.hand,...Object.values(game.s.field)])known.add(game.s.cards[id].attr);
    return [...known].sort();
  }
  function mainText(c){
    return c.kind==='attack'?`攻撃 ${c.power}／命中 ${c.hit}`:c.kind==='guard'?`防御 ${c.power}／回避 ${c.evasion>=0?'+':''}${c.evasion}`:c.kind==='heal'?`自分を ${c.power} 回復`:'主効果なし';
  }
  return {PROFILES,prepare,catalogue,attributes,mainText};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CWFeedback;
