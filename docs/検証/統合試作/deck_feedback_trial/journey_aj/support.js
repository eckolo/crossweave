(() => {
  const source=CWRequire('input.json'),seedBank=CWRequire('journey_aj/seeds.json');
  const AH=CWRequire('expedition_choices.js'),L=CWRequire('expedition_loop.js'),I=CWRequire('information.js');
  const CWFeedback=CWRequire('feedback.js'),AJ=CWRequire('journey_aj/session.js');
  let bundle;
  const root=document.getElementById('cw-playtable');
  const get=id=>root.querySelector('#'+id);
  let names={P:'あなた'},rewardNames={};
  const phases={'A/start':'A · 通路の突破','A/terminal':'A · 最終環境','A/finished':'A · 完了','B/start':'B · 目的敵の撃破','B/weak':'B · 支援終了','B/finished':'B · 完了','C/start':'C · 通路の突破','C/enemy':'C · 目的敵の撃破','C/finished':'C · 完了'};
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=n=>n>0?'+'+n:String(n);
  const cardName=c=>c.name+(c.type.startsWith('weak_')||c.type.startsWith('filler_')?' '+c.attr:'');
  const fieldText=c=>`攻撃／防御 ${signed(c.field_power)}<br>命中／回避 ${signed(c.field_hit)}`;
  let version=0,notice='',busy=false;
  let game,selected=null,target=null,history=[],last=[],knownAttrs=new Set(),changes=[],beforeTime=null;
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
    if(r.type==='boundary')return r.event==='player_defeated'?'HPが尽き、探索終了':`${names[r.victim]}を${r.event==='traversed'?'踏破。ここまでの獲得成果を撤退時に保護':'撃破'}`;
    return null;
  }
  function absorb(){last=game.trace.map(logText).filter(Boolean);history.push(...last);game.trace=[];}
  function guardText(a){return a.guard?`防御 ${a.guard.value}／回避 ${signed(a.guard.evasion)}／残${a.guard.uses}回`:'防御なし';}
  function previewText(c,pred){
    const p=game.s.actors.P,m=game.s.field[c.attr];let text;
    if(pred.mode==='place')text=`${c.attr}の場へ設置。次に一致した札へ、${fieldText(c).replace('<br>','、')}。`;
    else if(pred.mode==='attack'){
      const d=game.s.actors[target],total=d.hit+pred.hit_gain;
      text=`${names[target]}：${pred.hit_connected?'命中':'未命中'}、HP ${d.hp} → ${d.hp-pred.actual_hp_loss}。命中蓄積 ${d.hit} → ${pred.hit_connected?0:total}。`;
      if(pred.hit_gain===0)text+=` 命中加算0（札 ${c.hit}、場 ${signed(game.s.cards[m].field_hit)}、対象回避 ${game.evasion(target)}）。`;

    } else if(pred.mode==='guard')text=`防御 ${pred.guard.value}・回避 ${signed(pred.guard.evasion)}、命中した攻撃へ残2回。`;
    else if(pred.mode==='heal')text=`HP ${p.hp} → ${p.hp+pred.hp_restored}（回復 +${pred.hp_restored}、余剰 ${Math.max(0,c.power+(pred.passives.includes('PS04')?4:0)-pred.hp_restored)}）。`;
    else text='主効果なし。';
    if(m)text+=` 会心 +${pred.crit_added}。`;
    text+=` 自分の次回予定：時刻 ${game.s.now+pred.action_cost}。`;
    if(p.guard)text+=m?' 現在の防御・回避は終了。':' 現在の防御・回避を保持。';
    const losses=[];
    if(m&&(c.consume_on_recover||c.doomed||c.birth==='filler'))losses.push('使用札の'+cardName(c));
    if(m){const material=game.s.cards[m];if(material.consume_on_recover||material.doomed||material.birth==='filler')losses.push('場の'+cardName(material));}
    if(losses.length)text+=`<div class="cw-loss">この手で消滅：${esc(losses.join('、'))}</div>`;
    const expired=p.hand.filter(id=>id!==c.id&&game.s.cards[id].remaining===1);
    if(expired.length)text+='<div>この手の後に期限切れ：'+expired.map(id=>{const x=game.s.cards[id];return esc(cardName(x))+(x.consume_on_recover?'（消滅）':x.doomed||x.birth==='filler'?'（回収時に消滅）':'（回収）');}).join('、')+'</div>';
    return text;
  }
  const attrBadge=a=>`<span class="cw-attr">${esc(a)}</span>`;
  const mainText=c=>CWFeedback.mainText(c);
  function fullCard(c){return `<div class="cw-deck-effects"><div>主効果：${mainText(c)}<br>会心増加 ${signed(c.crit_gain)} · 期限 ${c.life}手</div><div>場：${fieldText(c)}<br>行動コスト 設置${c.place_cost}／一致${c.match_cost}</div></div>${c.consume_on_recover?'<div class="cw-loss">回収時に消滅</div>':c.doomed?'<div class="cw-loss">退場由来：次の回収で消滅</div>':''}`;}
  function prediction(c,pred){
    const p=game.s.actors.P,mid=game.s.field[c.attr],material=game.s.cards[mid];let heading,impacts=[];
    if(pred.mode==='place'){
      heading=`${c.attr}の場へ置く`;
      impacts=[`次の一致へ 攻撃／防御 ${signed(c.field_power)}`,`命中／回避 ${signed(c.field_hit)}`];
    }else if(pred.mode==='attack'){
      const d=game.s.actors[target];heading=`${names[target]}へ攻撃 · ${pred.hit_connected?'命中':'未命中'}`;
      impacts=[`HP ${d.hp} → ${d.hp-pred.actual_hp_loss}`,`命中蓄積 ${d.hit} → ${pred.hit_connected?0:d.hit+pred.hit_gain}`];
      if(!pred.hit_gain)impacts.push('命中加算 0');
    }else if(pred.mode==='guard'){
      heading='自分の防御を開始';impacts=[`防御 ${pred.guard.value}`,`回避 ${signed(pred.guard.evasion)}`,`命中する攻撃 2回まで`];
    }else if(pred.mode==='heal'){
      heading='自分を回復';impacts=[`HP ${p.hp} → ${p.hp+pred.hp_restored}`,`回復 +${pred.hp_restored} · 余剰 ${Math.max(0,c.power+(pred.passives.includes('PS04')?4:0)-pred.hp_restored)}`];
    }else heading='一致 · 主効果なし';
    if(mid)impacts.push(`会心 +${pred.crit_added}`);
    impacts.push(`次の自分 時刻 ${game.s.now+pred.action_cost}`);
    const notices=[];
    if(p.guard)notices.push(mid?'現在の防御・回避は終了'+(pred.mode==='guard'?' → 新しい防御へ':''):'現在の防御・回避を保持');

    const losses=[];
    if(mid&&(c.consume_on_recover||c.doomed||c.birth==='filler'))losses.push(cardName(c));
    if(mid&&(material.consume_on_recover||material.doomed||material.birth==='filler'))losses.push('場の'+cardName(material));
    if(losses.length)notices.push('この手で消滅：'+losses.join('、'));
    const expired=p.hand.filter(id=>id!==c.id&&game.s.cards[id].remaining===1);
    if(expired.length)notices.push('この手の後に期限切れ：'+expired.map(id=>{const x=game.s.cards[id];return cardName(x)+(x.consume_on_recover||x.doomed||x.birth==='filler'?'（消滅）':'（回収）');}).join('、'));
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
    if(!changes.length)changes.push('HP・防御・報酬の変化なし');
  }
  function renderReferencePanels(s,active){
    const initial=bundle.initial.state,counts={};
    for(const id of initial.actors.P.deck){const c=initial.cards[id],name=cardName(c)+' / '+c.attr;counts[name]=(counts[name]||0)+1;}
    const rewards=Object.entries(s.rewards).map(([k,r])=>`${rewardNames[k]}：${r.protected?'撤退時に保護':'未保護'}`);
    const consuming=Object.values(game.s.cards).filter(c=>c.origin==='P'&&c.birth==='initial'&&c.consume_on_recover);
    get('cw-resources').innerHTML=`<div>持込12枚：${esc(Object.entries(counts).map(([n,v])=>n+' ×'+v).join('、'))}</div><div>持込消費札：${consuming.filter(c=>!c.destroyed).length}/${consuming.length}枚が探索内に残存。探索中の追加補給はありません。</div><p>新たな出発時に、選んだ解放済みの消費札を補充費なしで再セットします。</p><div>${rewards.length?esc(rewards.join('／')):'獲得成果なし'}</div><p>保護は撤退時に有効です。死亡すると今回の獲得成果は全て失います。</p>`;
    get('cw-knowledge').innerHTML=knowledgeHTML(game.s.ah.knowledge,s.route,game.s.ah.run);
  }
  function renderHistory(){
    const rows=get('cw-history-order').value==='oldest'?history:[...history].reverse();
    get('cw-history').innerHTML=rows.map(x=>'<div class="cw-log">'+esc(x)+'</div>').join('');
  }
