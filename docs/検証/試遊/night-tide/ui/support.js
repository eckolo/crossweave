(() => {
  const NT=CWRequire("scenario.js"), source=NT.source;
  const uiTerms=__CW_TERMS__;
  const initialReplay={build:'guard3',choices:[]};
  let bundle;
  const root=document.getElementById('cw-playtable');
  const get=id=>root.querySelector('#'+id);
  const names=NT.names;
  const phases={'A/start':'地下水路','A/terminal':'奥の水門','A/finished':'復旧完了'};
  const rewardNames={'A/V0':'地下水路：着想1・水路の記憶1','A/E1':'潜水服：着想1・潮底の踏み足の解放','A/V1':'水門：着想2・汐留めの解放'};
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=n=>n>0?'+'+n:String(n);
  const cardName=c=>uiCardName(c);
  const fieldText=c=>`${term('power')}／${term('guard')} ${signed(c.field_power)}<br>${term('hit')}／${term('evasion')} ${signed(c.field_hit)}`;
  let version=0,notice='',busy=false;
  let game,selected=null,target='V0',history=[],last=[],knownAttrs=new Set(),eventSequence=0;
  function actionText(r,after){
    const c=game.s.cards[r.card_id],who=names[r.actor];let result;
    if(r.mode==='place')result=`${cardName(c)} → ${c.attr}の場`;
    else if(r.mode==='attack')result=`${cardName(c)} → ${names[r.target]} · ${r.hit_connected?`${r.target==='P'?'消耗':'進展'} ${r.actual_hp_loss}`:`${term('conceal')} −${r.hit_gain}`}`;
    else if(r.mode==='guard')result=`${cardName(c)} · ${guardText(after.actors[r.actor])}`;
    else if(r.mode==='heal')result=`${cardName(c)} · ${hpLabel(r.actor)} +${r.hp_restored}`;
    else result=`${cardName(c)} · 一致`;
    return `${who}：${result}`;
  }
  // Read each completed engine step. Public deltas belong to that step, not the end of a turn batch.
  // The engine and its trace format remain unchanged; hidden NPC draws/expiry/retirement cards stay hidden.
  function stepEvents(before,after,trace){
    const rows=[],actions=trace.filter(r=>r.type==='action');
    const add=(text,time=after.now)=>rows.push({id:++eventSequence,time,text});
    for(const r of trace.filter(r=>r.type==='rebuild'))add(`${names[r.actor]}：${uiTerms.cycle.rebuild} · ${r.cycle}巡目`,r.time);
    for(const r of actions)add(actionText(r,after),r.time);
    session.data.toolSeen??=[];
    for(const c of after.actors.P.hand){
      if(c.origin==='P'||!['nt_flow','nt_pressure'].includes(c.type)||session.data.toolSeen.includes(c.type))continue;
      session.data.toolSeen.push(c.type);
      add(c.type==='nt_flow'?'逆らう水の働きが、小さな櫂に収まる。今なら、この流れを使えそうだ。':'靴底を重ねると、足元が沈むように落ち着く。潜水服の足運びを写し取った。');
    }
    for(const [id,a]of Object.entries(after.actors)){
      const b=before.actors[id];if(!b)continue;
      if(b.guard&&!a.guard)add(`${names[id]}：${term('guard')}終了`);
      else if(a.guard&&b.guard&&a.guard.uses!==b.guard.uses&&!actions.some(r=>r.actor===id&&r.mode==='guard'))add(`${names[id]}：${term('guard')} 残${a.guard.uses}回`);
      if(a.crit!==b.crit)add(`${names[id]}：${term('crit')} ${b.crit} → ${a.crit}`);
    }
    const visible=new Map([...before.actors.P.hand,...Object.values(before.field).filter(Boolean)].map(c=>[c.id,c]));
    for(const r of actions)for(const id of [r.card_id,r.matched_id].filter(Boolean))visible.set(id,game.s.cards[id]);
    const expired=new Set(actions.filter(r=>r.actor==='P').flatMap(r=>r.expired));
    const destroyed=new Set(trace.filter(r=>r.type==='destroy').map(r=>r.card_id));
    for(const id of expired)add(`期限切れ：${cardName(game.s.cards[id])} · ${destroyed.has(id)?'消滅':uiTerms.cycle.send}`);
    for(const r of trace)if(r.type==='destroy'&&visible.has(r.card_id)&&!expired.has(r.card_id))add(`消滅：${cardName(visible.get(r.card_id))}`,r.time);
    for(const [key,r]of Object.entries(after.rewards)){
      const old=before.rewards[key];
      if(!old)add(`${rewardNames[key]}：獲得 · ${r.protected?'撤退時保持':'撤退時喪失'}`);
      else if(!old.protected&&r.protected)add(`${rewardNames[key]}：撤退時保持`);
    }
    for(const r of trace){
      if(r.type==='retire')add(r.actor==='E1'&&!after.rewards['A/E1']?'潜水服を後ろに残して進んだ':`${names[r.actor]}：退場`,r.time);
      if(r.type==='enter')add(`${names[r.actor]}：出現`,r.time);
    }
    
    if(before.current_event!==after.current_event&&!after.outcome)add(phases[after.current_event]);
    if(!before.outcome&&after.outcome)for(const key of game.s.settlement?.lost||[])add(`${rewardNames[key]}：喪失`);
    if(!before.outcome&&after.outcome)add(({clear:'探索完了',defeat:'探索終了 · 余力 0',withdrawal:'撤退',cutoff:'探索終了 · 試行上限'})[after.outcome]||'探索終了');
    return rows;
  }
  function absorb(before){
    const rows=stepEvents(before,game.public(),game.trace);game.trace=[];
    history.push(...rows);last.push(...rows);enqueueEvents(rows);
  }
  function advanceWithHistory(choice=null){
    last=[];
    if(choice)session.action(choice,absorb);else session.advance(absorb);
    persistNightTide();
  }
  function start(){resetTrial();}

  function guardText(a){return a.guard?`${term('guard')} ${a.guard.value} · ${term('evasion')} ${signed(a.guard.evasion)} · 残${a.guard.uses}回`:term('guard')+'なし';}
  function calculation(c,pred){
    const s=game.public(),p=s.actors.P,d=s.actors[target],m=s.field[c.attr];
    const attackMultiplier=1+Math.floor((p.crit+pred.crit_added)/100);
    const shield=d.guard?d.guard.value*(1+Math.floor(d.crit/100)):0;
    const total=d.hit+pred.hit_gain;
    const rows=[[term('hit')+'加算',`max(0, ${c.hit} ${signed(m.field_hit)} − ${d.evasion}) = ${pred.hit_gain}`],[term('power')+' × '+term('critical')+'倍率',`(${c.power} ${signed(m.field_power)}) × ${attackMultiplier}`],[term('guard')+'・軽減',`${shield} + ${d.reduction||0}`]];
    if(pred.hit_connected)rows.push(['進展倍率',`1 + ⌊(${total} − ${d.max_posture}) / 100⌋ = ${pred.posture_multiplier}`]);
    return `<dl class="cw-facts">${rows.map(([label,value])=>`<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
  }
  const attrBadge=a=>`<span class="cw-attr">${esc(a)}</span>`;
  const mainText=c=>primaryText(c);
  function fullCard(c){
    const rows=[['主効果',mainText(c)],['場',fieldText(c).replace('<br>',' · ')],[term('crit'),signed(c.crit_gain)],['時間',`設置 ${c.place_cost} · 一致 ${c.match_cost}`],['期限',`${c.life}行動`]];
    return `${c.origin?`<p>出現元：${names[c.origin]||c.origin}${c.doomed?' · 退場済み／捨てる時に消滅':''}</p>`:''}<dl class="cw-facts" data-card-facts>${rows.map(([label,value])=>`<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl>${c.consume_on_recover||c.doomed?`<div class="cw-loss">${uiTerms.cycle.loss}</div>`:''}`;
  }
  function prediction(c,pred){
    const p=game.s.actors.P,mid=game.s.field[c.attr],material=game.s.cards[mid];let heading,impacts=[];
    if(pred.mode==='place'){
      heading='場に出す';
      impacts=[];
    }else if(pred.mode==='attack'){
      const d=game.s.actors[target];heading=`${names[target]} · ${actionName(target)} · ${pred.hit_connected?'見極める':'隠蔽を削る'}`;
      impacts=[`${hpLabel(target)} ${d.hp} → ${d.hp-pred.actual_hp_loss}`,`${term('conceal')} ${conceal(d)} → ${pred.posture_after}`];
    }else if(pred.mode==='guard'){
      heading=term('guard');impacts=[`${term('guard')} ${pred.guard.value}`,`${term('evasion')} ${signed(pred.guard.evasion)}`,`見極め2回分`];
    }else if(pred.mode==='heal'){
      heading='回復';impacts=[`${hpLabel('P')} ${p.hp} → ${p.hp+pred.hp_restored}`];if(c.power>pred.hp_restored)impacts.push(`余剰 ${c.power-pred.hp_restored}`);
    }else heading='一致 · 主効果なし';
    if(mid)impacts.push(`${term('crit')} +${pred.crit_added}`);
    impacts.push(`次回 時刻 ${game.s.now+pred.action_cost}`);
    const notices=[];
    if(p.guard)notices.push(mid?(pred.mode==='guard'?term('guard')+'を更新':term('guard')+'終了'):term('guard')+'を維持');
    if(pred.mode==='attack'&&pred.actual_hp_loss===game.s.actors[target].hp){
      if(target==='V0')notices.push('水路を踏破・ここまでの成果を保護。潜水服が残っていれば生存退場');
      if(target==='V1')notices.push('水門を復旧・今回の成果を持ち帰る');
    }
    const losses=[];
    if(mid&&(c.consume_on_recover||c.doomed||c.birth==='filler'))losses.push(cardName(c));
    if(mid&&(material.consume_on_recover||material.doomed||material.birth==='filler'))losses.push('場の'+cardName(material));
    if(losses.length)notices.push('消滅：'+losses.join('、'));
    const expired=p.hand.filter(id=>id!==c.id&&game.s.cards[id].remaining===1);
    if(expired.length)notices.push('期限切れ：'+expired.map(id=>{const x=game.s.cards[id];return cardName(x)+(x.consume_on_recover||x.doomed||x.birth==='filler'?'（消滅）':'（捨てる）');}).join('、'));
    return `<strong>${esc(heading)}</strong><div class="cw-impact">${impacts.map(x=>`<span>${esc(x)}</span>`).join('')}</div>${notices.map(x=>`<div class="cw-warning">${esc(x)}</div>`).join('')}`;
  }
  function renderReferencePanels(s,active){
    get('cw-knowledge').innerHTML=Object.keys(s.actors).filter(w=>w!=='P').map(w=>`<div class="cw-log"><strong>${names[w]}</strong>${knownActorInfo(w)}</div>`).join('');

  }
  function knownActorInfo(id){return knowledgeMarkup(id);}

  function eventMarkup(row){return `<time>${esc(row.time)}</time><span>${esc(row.text)}</span>`;}
  function renderHistory(){
    get('cw-history').innerHTML=[...history].reverse().map(row=>`<li class="cw-history-row" data-event-id="${row.id}">${eventMarkup(row)}</li>`).join('');
  }
