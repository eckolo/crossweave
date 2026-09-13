  const nt=id=>document.getElementById(id),storageKey='crossweave-PT-NT-001-v1';
  let session=new NT.Session(),saveWarning='',restoreBlocked=false;
  function snapshot(){return {schema:'PT-NT-001-file-v1',session:session.save(),history:history.slice(-1000),knownAttrs:[...knownAttrs],settings:settings()};}
  function persistNightTide(){
    if(restoreBlocked)return;
    try{localStorage.setItem(storageKey,JSON.stringify(snapshot()));saveWarning='この端末に進行を保存しています。';}
    catch(e){saveWarning='自動保存を利用できません。記録を書き出すと再開できます。';}
    nt('nt-save-state').textContent=saveWarning;
  }
  function syncGame(){game=session.game;bundle=session.bundle;}
  function endText(){return {clear:'日常側への流入が止まった',withdrawal:'探索を切り上げて帰還した',defeat:'余力が尽き、緊急脱出した',cutoff:'試遊の行動上限に到達した'}[game?.s.outcome]||'';}
  function knowledgeMarkup(id){
    const ledger=session.data.phase==='return'?session.data.profile.knowledge:game.s.ah.knowledge;
    const v=NT.I.profileView(ledger,'A/'+id,'AH1-cards',game.s.ah.run,id);
    const seen=new Map([...v.observed_by_current_actor,...v.observed_elsewhere_this_run,...v.observed_earlier].map(r=>[NT.I.signature(r.card),r.card]));
    const text={V0:'流れの作用が、こちらの前進を妨げる。',E1:'近づくものを重い腕で押し返す。水路を先に抜けると、その場に残る。',V1:'流れを読み、噛み込んだ連結鎖を正常な位置へ戻す。'};
    const rows=v.initial_catalogue?v.initial_catalogue.cards.map(r=>({card:r.card,count:r.initial_count})):[...seen.values()].map(card=>({card,count:null}));
    return `<p>${text[id]||''}</p><details><summary>${v.initial_catalogue?'初攻略で確認した初期構成':'観測した札 '+rows.length+'種'}</summary>${rows.map(r=>`<details><summary>${esc(cardName(r.card))} · ${r.card.attr}${r.count?' ×'+r.count:''}</summary>${fullCard(r.card)}</details>`).join('')||'<p>札はまだ観測していません。</p>'}<p>現在の相手の手札・山札の内訳や順序は不明です。</p></details>`;
  }
  function renderReceipt(){
    if(!game?.s.outcome){nt('nt-return-story').textContent='';nt('nt-return-records').textContent='';return;}
    const d=session.data;
    let text='';
    if(game.s.outcome==='clear')text='「地下の水、引きました。まずは空の棚から戻してみます。……奥には、港があったんですか」';
    else if(game.s.outcome==='withdrawal')text=d.seen.includes('gate')?'奥の水門が戻らない原因は分かった。復旧は、次の機会に。':d.seen.includes('port')?'水の来る側に、別の港があった。奥はまだ調べ切れていない。':'水は奥から流れ込んでいる。今回はここまでを確かめて戻った。';
    else text='緊急脱出の道具が働き、探索先を離れた。今回の成果は、保護済みも含めて失った。観測した記録は残る。';
    nt('nt-return-story').innerHTML=`<p>${text}</p><p>${d.receipt?.actions??game.s.actors.P.actions}行動 · 着想 +${d.receipt?.points||0}</p><p>帰還後の余力 ${d.receipt?.return_hp??40}/40</p>`;
    get('cw-self').textContent=`帰還後の余力 ${d.receipt?.return_hp??40}/40`;
    const facts=['逆流の跡',...(d.seen.includes('port')?['頭上に海のある港・続く水位線']:[]),...(d.seen.includes('gate')?['鎖の噛み込みと正常位置']:[]),...(game.s.outcome==='clear'?['正常な流れへの復旧']:[])];
    nt('nt-return-records').innerHTML=`<h3>確認したこと</h3><p>${facts.join('／')}</p>${Object.keys(game.s.actors).filter(w=>w!=='P').map(w=>`<details><summary>${names[w]}</summary>${knowledgeMarkup(w)}</details>`).join('')}${game.s.outcome==='clear'?'<details><summary>港の先に</summary><p>水門の裏に古い案内板がある。港の名の隣に「渡り場」の文字。使われなくなっても、道筋は残っているらしい。</p></details>':''}<p>今回の試遊はここまで。</p>`;
  }
  function renderStory(){
    const pause=session.data.pause,el=nt('nt-story');el.hidden=!pause;
    root.querySelectorAll(':scope > .cw-region,:scope > .cw-bottom').forEach(e=>e.inert=!!pause);
    if(!pause)return;
    hideWindow(false);const row=NT.story[pause]||{title:'試遊上限',text:'行動上限に達したため、ここで記録を残せます。',detail:''};
    nt('nt-story-position').textContent='夜潮の排水路';nt('nt-story-title').textContent=row.title;
    nt('nt-story-text').textContent=row.text;nt('nt-story-detail').textContent=row.detail;
    const p=game.s.actors.P;
    nt('nt-story-resource').textContent=pause==='port'?`余力 ${p.hp}/${p.max_hp} · ここまでの成果は撤退時に保持（緊急脱出時は喪失）`:'';
    nt('nt-continue').hidden=pause==='cutoff';
    nt('nt-continue').textContent={entry:'水の来る側へ',port:'水門を確かめる',gate:'復旧に取りかかる',clear:'帰還して報告する'}[pause]||'進む';
    nt('nt-story-withdraw').hidden=session.data.phase==='return';
    nt('nt-story-withdraw').textContent=pause==='entry'?'引き返す':'ここで帰る';
  }
  function renderPreparation(){
    nt('nt-preparation').hidden=false;root.hidden=true;
    const cards=NT.L.catalog(source),counts=session.data.counts;
    const total=Object.values(counts).reduce((a,b)=>a+b,0),summary={attack:0,guard:0,heal:0};
    for(const [t,n]of Object.entries(counts))summary[cards[t].kind]=(summary[cards[t].kind]||0)+n;
    nt('nt-deck-summary').textContent=`${total}/12枚 · 突破 ${summary.attack}／身構 ${summary.guard}／回復 ${summary.heal}`;
    nt('nt-deck-editor').innerHTML=session.data.profile.unlocked.map(t=>{const c=cards[t],n=counts[t]||0;return `<article class="nt-deck-row"><details><summary>${esc(cardName(c))} · ${c.attr}</summary><p>${primaryText(c)}</p><p>場：${fieldText(c).replace('<br>','／')}</p><p>期限 ${c.life}行動 · 一致 ${c.match_cost}／設置 ${c.place_cost}</p></details><div><button type="button" data-count="${t}" data-delta="-1" aria-label="${esc(cardName(c))}を1枚減らす" ${!n?'disabled':''}>−</button><output>${n}</output><button type="button" data-count="${t}" data-delta="1" aria-label="${esc(cardName(c))}を1枚増やす" ${n>=2?'disabled':''}>＋</button></div></article>`;}).join('');
    let error='';try{session.validateCounts(counts);}catch(e){error='札を12枚にしてください。同じ札は2枚までです。';}
    nt('nt-prep-error').textContent=restoreBlocked?'前の記録を読み込めませんでした。記録を保全してから新しい試行を始めてください。':error;
    nt('nt-depart').disabled=!!error||restoreBlocked;
  }
  function renderApp(){
    if(session.data.phase==='preparation'){renderPreparation();return;}
    nt('nt-preparation').hidden=true;root.hidden=false;syncGame();render();
    if(session.data.phase==='return'&&!session.data.pause)showWindow('return',get('cw-withdraw'));
  }
  function resetTrial(){
    cancelDrag();hideWindow(false);session=new NT.Session();syncGame();selected=null;history=[];last=[];target='V0';version++;knownAttrs=new Set();restoreBlocked=false;resetEvents();persistNightTide();renderApp();
  }
  function importRecord(saved){
    if(saved?.schema!=='PT-NT-001-file-v1')throw Error('夜潮の排水路の記録を選んでください');
    const next=new NT.Session(saved.session);session=next;syncGame();
    history=Array.isArray(saved.history)?saved.history.filter(r=>r&&typeof r.text==='string'&&Number.isFinite(r.time)).slice(-1000):[];
    knownAttrs=new Set((saved.knownAttrs||[]).filter(a=>typeof a==='string'&&a.length<=40));
    eventSequence=history.reduce((n,r)=>Math.max(n,r.id||0),0);last=[];selected=null;target='V0';version++;changedAttrs=new Set();resetEvents();hideWindow(false);restoreBlocked=false;
    for(const [key,id]of Object.entries({quick:'cw-quick-setting',drag:'cw-drag-setting',peek:'cw-peek-setting',diagram:'cw-diagram-setting'}))if(typeof saved.settings?.[key]==='boolean')get(id).checked=saved.settings[key];
    if([150,220,320].includes(saved.settings?.hold))get('cw-hold-setting').value=String(saved.settings.hold);
  }
  function initializeNightTide(){
    try{const saved=localStorage.getItem(storageKey);if(saved)importRecord(JSON.parse(saved));}
    catch(e){restoreBlocked=true;saveWarning='保存記録を読み込めませんでした。新規試行を選ぶまで保存を保持します。';}
    nt('nt-depart').addEventListener('click',()=>{
      try{session.depart();syncGame();version++;history=[];last=[];knownAttrs=new Set();resetEvents();renderApp();persistNightTide();}
      catch(e){nt('nt-prep-error').textContent=e.message;}
    });
    nt('nt-deck-editor').addEventListener('click',e=>{
      const b=e.target.closest('[data-count]');if(!b||b.disabled)return;
      const t=b.dataset.count;session.data.counts[t]=(session.data.counts[t]||0)+Number(b.dataset.delta);renderPreparation();persistNightTide();
      nt('nt-deck-editor').querySelector(`[data-count="${t}"][data-delta="${b.dataset.delta}"]`)?.focus();
    });
    nt('nt-continue').addEventListener('click',()=>{last=[];session.acknowledge(absorb);version++;renderApp();persistNightTide();});
    nt('nt-story-withdraw').addEventListener('click',()=>{last=[];session.withdraw(absorb);version++;renderApp();persistNightTide();});
    nt('nt-export').addEventListener('click',()=>{
      const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='crossweave-night-tide-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    nt('nt-copy-record').addEventListener('click',()=>{nt('nt-record-text').value=JSON.stringify(snapshot());nt('nt-record-text').select();});
    for(const id of ['nt-import','nt-prep-import'])nt(id).addEventListener('change',async e=>{
      const f=e.target.files[0];if(!f)return;
      try{if(f.size>5000000)throw Error('記録が大きすぎます');importRecord(JSON.parse(await f.text()));persistNightTide();renderApp();}
      catch(err){nt(id==='nt-import'?'nt-save-state':'nt-prep-error').textContent='読み込めません：'+err.message;}
      finally{e.target.value='';}
    });
    nt('nt-new').addEventListener('click',resetTrial);
    nt('nt-save-state').textContent=saveWarning;renderApp();
    __NT_TEST_BRIDGE__
  }
