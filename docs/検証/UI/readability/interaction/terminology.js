  // Display vocabulary only. Engine keys and fixed input records are never renamed.
  const term=key=>uiTerms.stats[key];
  const actorLabel=(id,key)=>uiTerms.actors[id]?.[key]?.trim()||uiTerms.actors.default[key];
  const hpLabel=id=>actorLabel(id,'hp');
  const actionName=id=>actorLabel(id,'attack');
  const conceal=a=>100-a.hit;
  const uiCardName=c=>(uiTerms.cards[c.type]||(c.type.startsWith('weak_')?uiTerms.weak_name:c.name))+(c.type.startsWith('weak_')||c.type.startsWith('filler_')?' '+c.attr:'');
  function fieldShort(c,defense=false){
    return `<span class="cw-field-stats" data-field-mode="${defense?'guard':'attack'}"><span>${term(defense?'guard':'power')} ${signed(c.field_power)}</span><span>${term(defense?'evasion':'hit')} ${signed(c.field_hit)}</span></span>`;
  }
  function primaryText(c){
    if(c.kind==='attack')return `${term('power')} ${c.power} · ${term('hit')} ${c.hit}`;
    if(c.kind==='guard')return `${term('guard')} ${c.power} · ${term('evasion')} ${signed(c.evasion)}`;
    if(c.kind==='heal')return `回復 ${c.power}`;
    return '主効果なし';
  }
