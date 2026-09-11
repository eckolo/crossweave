(() => {
  const source=__CW_DATA__;
  const initialReplay=__CW_REPLAY__;
  let bundle;
  const root=document.getElementById('cw-playtable');
  const get=id=>root.querySelector('#'+id);
  const names={P:'あなた',O:'大岩',V0:'最初の環境',V1:'後続の環境',E1:'後続の敵'};
  const phases={rock:'大岩のある区間',open_rock:'開通後の区間',followup:'後続の区間',finished:'探索終了'};
  const rewardNames={R:'大岩の獲得物',T0:'最初の踏破の獲得物',E:'敵の獲得物',T1:'後続の踏破の獲得物'};
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=n=>n>0?'+'+n:String(n);
  const cardName=c=>c.name+(c.type.startsWith('weak_')||c.type.startsWith('filler_')?' '+c.attr:'');
  const fieldText=c=>`攻撃／防御 ${signed(c.field_power)}<br>命中／回避 ${signed(c.field_hit)}`;
  let version=0,notice='',busy=false;
  let game,selected=null,target='V0',history=[],last=[],knownAttrs=new Set(),changes=[],beforeTime=null;
  function logText(r) {
    if(r.type==='action'){
      const c=game.s.cards[r.card_id],who=names[r.actor];let result;
      if(r.mode==='place')result=`${who}：${cardName(c)}を${c.attr}の場へ設置`;
      else if(r.mode==='attack')result=`${who}：${cardName(c)} → ${names[r.target]}。${r.hit_connected?`HP −${r.actual_hp_loss}`:`未命中、命中蓄積 +${r.hit_gain}`}`;
      else if(r.mode==='guard')result=`${who}：${cardName(c)}で防御を開始`;
      else if(r.mode==='heal')result=`${who}：${cardName(c)}でHP +${r.hp_restored}`;
      else result=`${who}：${cardName(c)}が一致、会心 +${r.crit_added}`;
      if(r.mode!=='place'&&c.consume_on_recover)result+='。使用札は消滅';
      if(r.actor==='P'&&r.expired.length)result+='。期限切れ：'+r.expired.map(id=>cardName(game.s.cards[id])+(game.s.cards[id].consume_on_recover?'（消滅）':'')).join('、');
      return `時刻 ${r.time} · ${result}`;
    }
    if(r.type==='rebuild')return `${names[r.actor]}：山札を再構築（${r.cycle}巡目）`;
    if(r.type==='boundary')return {rock_destroyed:'大岩を破壊し、後続の区間へ',V0_traversed:'最初の環境を踏破。ここまでの獲得物を保護',enemy_defeated:'敵を撃破し、獲得物を入手',V1_traversed:'後続の環境を踏破し、探索クリア',player_defeated:'HPが尽き、探索終了'}[r.event];
    return null;
  }
  function absorb(){last=game.trace.map(logText).filter(Boolean);const extra=changes.filter(row=>!last.includes(row)).map(row=>'結果 · '+row);const rows=[...last,...extra];history.push(...rows);enqueueEvents(rows);game.trace=[];}
  function start(buildId=initialReplay.build){
    cancelDrag();clearUsePreview();changedAttrs=new Set();busy=false;
    version++;notice='';selected=null;target='V0';history=[];knownAttrs=new Set();changes=[];beforeTime=null;resetEvents();hideWindow(false);
    bundle=CWTerrain.prepare(source,buildId);
    game=new CWTerrain.Game(bundle);
    game.advance();absorb();history.unshift('持ち込み · '+CWTerrain.builds[buildId].label,'補給 · 回復草 1枚');render();
  }
  function guardText(a){return a.guard?`防御 ${a.guard.value}／回避 ${signed(a.guard.evasion)}／残${a.guard.uses}回`:'防御なし';}
  function calculation(c,pred){
    const s=game.public(),p=s.actors.P,d=s.actors[target],m=s.field[c.attr];
    const attackMultiplier=1+Math.floor((p.crit+pred.crit_added)/100);
    const shield=d.guard?d.guard.value*(1+Math.floor(d.crit/100)):0;
    const total=d.hit+pred.hit_gain;
    const rows=[['命中加算',`max(0, ${c.hit} ${signed(m.field_hit)} − ${d.evasion}) = ${pred.hit_gain}`],['攻撃力',`(${c.power} ${signed(m.field_power)}) × ${attackMultiplier}`],['防御・軽減',`${shield} + ${d.reduction||0}`]];
    if(pred.hit_connected)rows.push(['命中倍率',`1 + ⌊${total} / 100⌋ = ${1+Math.floor(total/100)}`]);
    return `<dl class="cw-facts">${rows.map(([label,value])=>`<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
  }
  const attrBadge=a=>`<span class="cw-attr">${esc(a)}</span>`;
  const mainText=c=>CWFeedback.mainText(c);
  function fullCard(c){
    const rows=[['主効果',mainText(c)],['場',fieldText(c).replace('<br>',' · ')],['会心',signed(c.crit_gain)],['時間',`設置 ${c.place_cost} · 一致 ${c.match_cost}`],['期限',`${c.life}行動`]];
    return `<dl class="cw-facts" data-card-facts>${rows.map(([label,value])=>`<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl>${c.consume_on_recover||c.doomed?'<div class="cw-loss">回収で消滅</div>':''}`;
  }
  function prediction(c,pred){
    const p=game.s.actors.P,mid=game.s.field[c.attr],material=game.s.cards[mid];let heading,impacts=[];
    if(pred.mode==='place'){
      heading='場に出す';
      impacts=[];
    }else if(pred.mode==='attack'){
      const d=game.s.actors[target];heading=`${names[target]}へ攻撃 · ${pred.hit_connected?'命中':'未命中'}`;
      impacts=[`HP ${d.hp} → ${d.hp-pred.actual_hp_loss}`,`命中蓄積 ${d.hit} → ${pred.hit_connected?0:d.hit+pred.hit_gain}`];
    }else if(pred.mode==='guard'){
      heading='防御';impacts=[`防御 ${pred.guard.value}`,`回避 ${signed(pred.guard.evasion)}`,`命中2回分`];
    }else if(pred.mode==='heal'){
      heading='回復';impacts=[`HP ${p.hp} → ${p.hp+pred.hp_restored}`];if(c.power>pred.hp_restored)impacts.push(`余剰 ${c.power-pred.hp_restored}`);
    }else heading='一致 · 主効果なし';
    if(mid)impacts.push(`会心 +${pred.crit_added}`);
    impacts.push(`次回 時刻 ${game.s.now+game.cost(c.type,!!mid)}`);
    const notices=[];
    if(p.guard)notices.push(mid?(pred.mode==='guard'?'防御を更新':'防御終了'):'防御を維持');
    if(pred.mode==='attack'&&['O','V0'].includes(target)&&pred.actual_hp_loss===game.s.actors[target].hp&&game.s.actors.O.active)notices.push('大岩の遮蔽終了');
    const losses=[];
    if(mid&&(c.consume_on_recover||c.doomed||c.birth==='filler'))losses.push(cardName(c));
    if(mid&&(material.consume_on_recover||material.doomed||material.birth==='filler'))losses.push('場の'+cardName(material));
    if(losses.length)notices.push('消滅：'+losses.join('、'));
    const expired=p.hand.filter(id=>id!==c.id&&game.s.cards[id].remaining===1);
    if(expired.length)notices.push('期限切れ：'+expired.map(id=>{const x=game.s.cards[id];return cardName(x)+(x.consume_on_recover||x.doomed||x.birth==='filler'?'（消滅）':'（回収）');}).join('、'));
    return `<strong>${esc(heading)}</strong><div class="cw-impact">${impacts.map(x=>`<span>${esc(x)}</span>`).join('')}</div>${notices.map(x=>`<div class="cw-warning">${esc(x)}</div>`).join('')}`;
  }
  function recordChanges(before){
    const after=game.public();changes=[];beforeTime=before.now;
    for(const [id,a]of Object.entries(after.actors)){
      const b=before.actors[id];if(!b){if(a.active)changes.push(`${names[id]}が参加`);continue;}
      if(a.hp!==b.hp)changes.push(`${names[id]} HP ${b.hp} → ${a.hp}`);
      if(b.active&&!a.active)changes.push(`${names[id]}が退場`);
      if(a.rebuilds>b.rebuilds)changes.push(`${names[id]} 山札を再構築`);
      if(b.guard&&!a.guard)changes.push(`${names[id]} 防御・回避が終了`);
      else if(a.guard&&JSON.stringify(a.guard)!==JSON.stringify(b.guard))changes.push(`${names[id]} ${guardText(a)}`);
    }
    for(const [key,r]of Object.entries(after.rewards)){
      const old=before.rewards[key];if(!old)changes.push(`${rewardNames[key]}を獲得${r.protected?'（保護済み）':'（未保護）'}`);
      else if(!old.protected&&r.protected)changes.push(`${rewardNames[key]}を保護`);
    }
    if(before.actors.O?.active&&!after.actors.O?.active)changes.push('大岩の遮蔽が終了');
    // Only expose losses of cards already visible in the player's hand or shared field.
    const visible=new Map([...before.actors.P.hand,...Object.values(before.field).filter(Boolean)].map(c=>[c.id,c]));
    for(const r of game.trace){
      if(r.type==='action'&&r.actor==='P'&&r.expired.length)changes.push('期限切れ：'+r.expired.map(id=>cardName(game.s.cards[id])).join('、'));
      if(r.type==='destroy'&&visible.has(r.card_id))changes.push(cardName(visible.get(r.card_id))+'が消滅');
    }
    const playerAction=game.trace.find(r=>r.type==='action'&&r.actor==='P');
    if(playerAction){
      changes.unshift(logText(playerAction));
      if(playerAction.old_guard_ended&&!changes.some(x=>x.includes('あなた')&&x.includes('防御')))changes.push('この一致で、直前の防御・回避を終了');
    }
    if(!changes.length)changes.push('HP・防御・獲得物の変化なし');
  }
  function renderReferencePanels(s,active){
    get('cw-knowledge').innerHTML=active.filter(w=>w!=='O').map(w=>`<div class="cw-log"><strong>${names[w]}</strong>${knownActorInfo(w)}</div>`).join('');

  }
  function knownActorInfo(id){
    const personality={V0:'あなたを攻撃',V1:'生存しているあなた／敵を等確率で攻撃',E1:'あなたへの一致攻撃を優先'};
    if(!personality[id])return '';
    const types=game.memory.observed_types[id]||[],labels=types.map(type=>{const c=Object.values(game.s.cards).find(v=>v.type===type);return c?cardName(c):type;});
    return `<p>${personality[id]}<br>確認済み：${labels.length?esc(labels.join('、')):'まだなし'}</p>`;
  }
  function renderHistory(){
    const rows=get('cw-history-order').value==='oldest'?history:[...history].reverse();
    get('cw-history').innerHTML=rows.map(x=>'<div class="cw-log">'+esc(x)+'</div>').join('');
  }
