  const appGet=id=>document.getElementById(id),storageKey='crossweave-AJ1';
  let session=new AJ.Session(source,seedBank),draft=null,saveError='',loadingError=false;
  const catalogue=L.catalog(source),roleNames={attack:'攻撃',guard:'防御',heal:'回復',none:'主効果なし'};
  try{
    const raw=localStorage.getItem(storageKey);
    if(raw){const saved=JSON.parse(raw);session=new AJ.Session(source,seedBank,saved.session);history=Array.isArray(saved.history)?saved.history.filter(x=>typeof x==='string').slice(-600):[];draft=saved.draft||null;
      for(const [key,id]of Object.entries({quick:'cw-quick-setting',drag:'cw-drag-setting',buttons:'cw-button-setting'}))if(typeof saved.settings?.[key]==='boolean')get(id).checked=saved.settings[key];}
  }catch(e){loadingError=true;saveError='前の自動保存を読み込めませんでした。保存ファイルがあれば「読み込む」で復元できます。';}
  function newDraft(){return {counts:AH.copy(session.data.counts),skills:Object.keys(session.data.profile.learned),intent:session.data.intent,route:session.data.route};}
  function ensureDraft(){
    if(!draft||!draft.counts||!Array.isArray(draft.skills)||typeof draft.intent!=='string'||draft.intent.length>160||!AH.cfg.routes[draft.route])draft=newDraft();
    // A draft is editable and may be over budget, but may not invent card or skill types.
    if(Object.entries(draft.counts).some(([t,n])=>!session.data.profile.unlocked.includes(t)||!Number.isInteger(n)||n<0||n>2)||draft.skills.some(id=>!AJ.skillText[id]))draft=newDraft();
  }
  function snapshot(){return {schema:'AJ1-file',session:session.save(),draft,settings:settings(),history:history.slice(-600)};}
  function persist(){
    if(loadingError)return;
    try{localStorage.setItem(storageKey,JSON.stringify(snapshot()));saveError='';}catch(e){saveError='自動保存を利用できません。「保存ファイル」で進行を書き出せます。';}
    appGet('aj-save-state').textContent=saveError||'進行を自動保存';
  }
  function actorLabel(route,actor){return `${AJ.purposeText[AH.cfg.routes[route]?.actors[actor]?.purpose]||actor} ${actor}`;}
  function rewardText(item){return item.kind==='points'?`成長ポイント ${item.amount}`:item.kind==='material'?`素材 ${item.type} ×${item.amount}`:`札の解放：${catalogue[item.type]?.name||item.type}`;}
  function knowledgeHTML(ledger,route,run=null){
    const profiles=[...new Set([...(ledger.encounters||[]).map(x=>x.profile),...ledger.events.map(x=>x.profile)])].filter(p=>p.startsWith(route+'/'));
    if(!profiles.length)return '<p>まだ訪問していません。探索で見た札や成果は、次の準備でも確認できます。</p>';
    return profiles.map(profile=>{
      const v=I.profileView(ledger,profile,'AH1-cards',run,profile.split('/')[1]);
      const observed=new Map([...v.observed_by_current_actor,...v.observed_elsewhere_this_run,...v.observed_earlier].map(row=>[I.signature(row.card),row.card]));
      return `<details><summary>${esc(actorLabel(route,profile.split('/')[1]))} · ${v.initial_catalogue?'初期構成を確認済み':'観測した札 '+observed.size+'種'}</summary>${v.initial_catalogue?'<p>初回の踏破・撃破で確認した初期構成です。</p>'+v.initial_catalogue.cards.map(row=>`<details><summary>${esc(row.card.name)} / ${esc(row.card.attr)} ×${row.initial_count}</summary>${fullCard(row.card)}</details>`).join(''):''}${observed.size?'<p>行動または借り札から観測した種類</p>'+[...observed.values()].map(c=>`<details><summary>${esc(c.name)} / ${esc(c.attr)}</summary>${fullCard(c)}</details>`).join(''):''}${v.confirmed_reward_candidates.map(r=>`<p>確認した成果：${esc(r.label.replace(/札解放:(\w+)/g,(_,t)=>'札の解放：'+(catalogue[t]?.name||t)))}</p>`).join('')}<p class="aj-muted">現在の手札・山札の構成や順序は不明です。</p></details>`;
    }).join('');
  }
  function consequence(actor){
    if(!actor)return '';
    return {passage:'踏破すると先へ進み、ここまでの成果を撤退時に保護。',terminal:'踏破すると探索クリア。',goal_enemy:'撃破すると探索クリア。',optional_enemy:'撃破で追加成果。通路を踏破すると生存したまま退場。',support:'踏破すると周囲への回避支援が終了。弱まった環境が残る。',weak_environment:'HPは1で止まり、追加の踏破成果はない。'}[actor.purpose];
  }
  function pendingText(p){
    if(!p.learned.length)return '習得なし';
    const pending=[];
    if(p.after_guard)pending.push('次の設置コスト−2');
    if(p.borrowed_guard)pending.push('次の防御＋2');
    if(p.learned.includes('PS02'))pending.push(p.last_match_attr?`直前の一致 ${p.last_match_attr}（別属性の攻撃で命中＋20）`:'属性連携：最初の一致待ち');
    if(p.learned.includes('PS04'))pending.push('消費型の回復＋4');
    return pending.length?pending.join(' · '):'習得効果：条件待ち';
  }
  function syncBattle(){
    game=session.game;bundle=session.bundle;names={P:'あなた'};rewardNames={};
    for(const [actor,spec]of Object.entries(bundle.actor_specs))if(actor!=='P')names[actor]=actorLabel(session.data.route,actor);
    for(const [actor,items]of Object.entries(AH.cfg.routes[session.data.route].rewards))rewardNames[session.data.route+'/'+actor]=items.map(rewardText).join('、');
  }
  function preparationSummary(){
    const total=Object.values(draft.counts).reduce((n,v)=>n+v,0),roles={},attrs={};
    for(const [t,n]of Object.entries(draft.counts)){const c=catalogue[t];if(c){roles[c.kind]=(roles[c.kind]||0)+n;attrs[c.attr]=(attrs[c.attr]||0)+n;}}
    return `${total}/12枚 · `+Object.entries(roles).filter(([,n])=>n).map(([r,n])=>roleNames[r]+' '+n).join(' / ')+' · 属性 '+Object.entries(attrs).filter(([,n])=>n).sort().map(([a,n])=>a+' '+n).join(' / ');
  }
  function renderPreparation(){
    ensureDraft();const profile=session.data.profile,available=AH.destinations(profile);
    appGet('aj-home-summary').textContent=`未使用 ${profile.points}pt · 習得 ${Object.keys(profile.learned).length}種 · 解放済み札 ${profile.unlocked.length}種`;
    appGet('aj-routes').innerHTML=Object.entries(AH.cfg.routes).map(([id,route])=>`<button type="button" data-route="${id}" aria-pressed="${draft.route===id}" ${!available.includes(id)?'disabled':''}><strong>探索 ${id}${profile.clears.includes(id)?' · 踏破済み':''}</strong><span>${esc(route.briefing)}</span><small>${available.includes(id)?'選択可能':'AまたはBのクリアで開通'}</small></button>`).join('');
    appGet('aj-deck').innerHTML=profile.unlocked.map(t=>{const c=catalogue[t],n=draft.counts[t]||0;return `<article class="aj-card-row"><details><summary><b>${esc(c.name)}</b> <span class="aj-muted">${c.attr} · ${roleNames[c.kind]}</span></summary>${fullCard(c)}</details><div class="aj-counter"><button type="button" data-count="${t}" data-delta="-1" aria-label="${esc(c.name)}を1枚減らす" ${!n?'disabled':''}>−</button><output aria-label="${esc(c.name)}の枚数">${n}</output><button type="button" data-count="${t}" data-delta="1" aria-label="${esc(c.name)}を1枚増やす" ${n>=2?'disabled':''}>＋</button></div></article>`;}).join('');
    appGet('aj-skills').innerHTML=Object.entries(AJ.skillText).map(([id,s])=>`<label class="aj-skill"><input type="checkbox" data-skill="${id}" ${draft.skills.includes(id)?'checked':''}><span><b>${s.name}</b> · ${AH.cfg.skills[id].cost}pt<br><small>${s.text}</small></span></label>`).join('');
    appGet('aj-intent').value=draft.intent;
    appGet('aj-known').innerHTML=knowledgeHTML(profile.knowledge,draft.route);
    appGet('aj-materials').textContent=Object.keys(profile.materials).length?Object.entries(profile.materials).map(([t,n])=>t+' ×'+n).join(' / ')+'（用途は未設定）':'まだ素材はありません。素材の用途は別途検討します。';
    renderPlan();
  }
  function renderPlan(){
    appGet('aj-composition').textContent=preparationSummary();
    const profile=session.data.profile,total=Object.values(draft.counts).reduce((n,v)=>n+v,0);let plan=null,error='';
    try{plan=session.plan(draft.counts,draft.skills);}catch(e){error=total!==12?`札を12枚にしてください（現在${total}枚）。`:e.message==='Insufficient points'?'習得に使えるポイントが不足しています。':e.message;}
    appGet('aj-deck-total').textContent=total+'/12枚';
    appGet('aj-skill-budget').textContent='取り直しを含め '+(profile.points+Object.values(profile.learned).reduce((a,b)=>a+b,0))+'pt';
    appGet('aj-plan-error').textContent=error;
    appGet('aj-depart').disabled=!!error||!AH.destinations(profile).includes(draft.route)||loadingError;
    if(plan){const v=plan.view;appGet('aj-plan-points').textContent=`未使用 ${v.points.before}pt ＋ 返還 ${v.points.refunded}pt − 習得 ${v.points.spent}pt ＝ 残り ${v.points.after}pt`;
      const cardChanges=v.deck_change.map(x=>`${x.name} ${x.before}→${x.after}`),skillChanges=[...v.skill_change.removed.map(id=>AJ.skillText[id].name+'を外す'),...v.skill_change.added.map(id=>AJ.skillText[id].name+'を習得')];
      appGet('aj-diff').textContent=[...cardChanges,...skillChanges].join(' / ')||'札と習得は前回の構成を維持します。';
    }else{appGet('aj-plan-points').textContent='構成案を直すと、返還・習得後のポイントを確認できます。';appGet('aj-diff').textContent='確定済みの構成と習得は保持されています。';}
    appGet('aj-depart').textContent=`変更を適用して探索 ${draft.route} へ`;
  }
  function renderReturn(){
    const r=session.data.receipt,profile=session.data.profile;
    appGet('aj-return-title').textContent={clear:'探索をクリア',withdrawal:'撤退して帰還',defeat:'探索で倒れた'}[r.outcome];
    appGet('aj-return-summary').textContent=`探索 ${r.route} · ${r.actions}手 · 成長ポイント ＋${r.gained_points}`;
    appGet('aj-return-intent').textContent=session.data.intent?'今回の狙い：'+session.data.intent:'今回の構築を起点に、札と習得を見直せます。';
    const rows=items=>items.length?items.map(item=>`<li>${esc(rewardText(item))} <small>（${esc(actorLabel(r.route,item.source.split('/')[1]))}）</small></li>`).join(''):'<li>なし</li>';
    appGet('aj-kept').innerHTML=rows(r.kept);appGet('aj-lost').innerHTML=rows(r.lost);
    appGet('aj-unlocks').textContent=r.new_unlocks.length?'構築に追加できる札：'+r.new_unlocks.map(t=>catalogue[t].name).join('、'):'新しい札の解放はありません。';
    appGet('aj-opened').textContent=r.opened.length?'次の探索先 '+r.opened.join('、')+' が開通しました。':'';
    appGet('aj-return-knowledge').innerHTML=`<p>観測した知識を保持。今回初めて確認した初期構成 ${r.new_catalogues}件。</p>`+knowledgeHTML(profile.knowledge,r.route);
    appGet('aj-return-last').textContent=last.slice(-5).join('\n')||history.slice(-5).join('\n');
  }
  function renderJourney(){
    const phase=session.data.phase;
    appGet('aj-home').hidden=phase!=='home';appGet('aj-expedition').hidden=phase!=='exploring';appGet('aj-return').hidden=phase!=='return';
    appGet('aj-save-state').textContent=saveError||'進行を自動保存';
    appGet('aj-recovery').hidden=!loadingError;
    if(phase==='home')renderPreparation();
    else {syncBattle();if(phase==='return')renderReturn();else{appGet('aj-run-info').textContent=(session.data.intent?'狙い：'+session.data.intent+' / ':'')+pendingText(game.public().passive_state);render();}}
  }
  appGet('aj-home').addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.route){draft.route=b.dataset.route;renderPreparation();persist();}
    if(b.dataset.count){const t=b.dataset.count;draft.counts[t]=(draft.counts[t]||0)+Number(b.dataset.delta);const focusKey=`[data-count="${t}"][data-delta="${b.dataset.delta}"]`;renderPreparation();appGet('aj-home').querySelector(focusKey)?.focus({preventScroll:true});persist();}
  });
  appGet('aj-skills').addEventListener('change',event=>{const id=event.target.dataset.skill;if(!id)return;draft.skills=event.target.checked?[...draft.skills,id]:draft.skills.filter(x=>x!==id);renderPlan();persist();});
  appGet('aj-intent').addEventListener('input',event=>{draft.intent=event.target.value;persist();});
  appGet('aj-discard').addEventListener('click',()=>{draft=newDraft();renderPreparation();persist();});
  appGet('aj-depart').addEventListener('click',()=>{
    try{game=session.depart(draft.route,draft.counts,draft.skills,draft.intent);bundle=session.bundle;draft=null;history=[];last=[];selected=null;target=null;notice='';changes=[];knownAttrs=new Set();beforeTime=null;changedAttrs=new Set();version++;get('cw-drawer').hidden=true;syncBattle();absorb();persist();renderJourney();appGet('aj-expedition').scrollIntoView({block:'start'});}
    catch(e){appGet('aj-plan-error').textContent=e.message;}
  });
  appGet('aj-go-home').addEventListener('click',()=>{session.home();draft=newDraft();game=null;bundle=null;persist();renderJourney();appGet('aj-home').scrollIntoView({block:'start'});});
  appGet('aj-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(snapshot())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='crossweave-AJ1-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  appGet('aj-import').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{const saved=JSON.parse(await file.text());if(saved.schema!=='AJ1-file')throw Error('AJ1の保存ファイルを選んでください');const next=new AJ.Session(source,seedBank,saved.session);session=next;draft=saved.draft||null;history=Array.isArray(saved.history)?saved.history.filter(x=>typeof x==='string').slice(-600):[];last=[];selected=null;target=null;knownAttrs=new Set();changes=[];beforeTime=null;version++;get('cw-drawer').hidden=true;loadingError=false;saveError='';
      for(const [key,id]of Object.entries({quick:'cw-quick-setting',drag:'cw-drag-setting',buttons:'cw-button-setting'}))if(typeof saved.settings?.[key]==='boolean')get(id).checked=saved.settings[key];persist();renderJourney();
    }catch(e){appGet('aj-save-state').textContent='読み込めませんでした：'+e.message;}finally{event.target.value='';}
  });
  appGet('aj-reset').addEventListener('click',()=>{session=new AJ.Session(source,seedBank);draft=null;history=[];last=[];game=null;bundle=null;selected=null;target=null;loadingError=false;saveError='';persist();renderJourney();appGet('aj-reset-panel').open=false;});
