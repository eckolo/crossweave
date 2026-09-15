/* CO-U02: UI-only asynchronous boundary. No economy, storage, or game state owner. */
(function (scope) {
  'use strict';
  const copy = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const retryable = new Set(['storage_write_failed','storage_unavailable','storage_open_failed','storage_open_blocked','storage_read_failed','connection_failed','invalid_response']);
  const outdated = new Set(['stale_view','stale_revision','stale_candidate','unknown_selection_handle']);
  function fault(code) { return {code,field:null,details:{}}; }
  function responseError(r) { return r?.display_data?.error || r?.error || null; }
  function validateView(r) {
    if (r?.schema !== 'CW-M1-view-1' || !Number.isSafeInteger(r?.meta?.revision) || r.meta.revision < 0 ||
        typeof r.meta.view_token !== 'string' || !r.meta.view_token ||
        !['home','exploring','return'].includes(r?.display_data?.phase)) throw fault('invalid_response');
    return r;
  }
  function requestId() {
    if (!scope.crypto?.randomUUID) throw fault('secure_request_id_unavailable');
    return 'cw-ui-' + scope.crypto.randomUUID();
  }
  function currentPlan(view) {
    const h=view?.display_data?.home;
    return h ? {retain_learning:h.economy.learned.map(x=>x.base),cancel_learning:[],candidate:null,
      purchase_timing:view.display_data.draft?.plan?.purchase_timing||'after_preparation',next_preparation:{learn:[],equipment:h.equipment.entries.map(x=>x.id),
      deck:h.deck.composition.flatMap(x=>Array(x.count).fill(x.id))}} : null;
  }
  function makeSession(controller, {idFactory=requestId,reopen=null}={}) {
    if (!controller || !['inspect','execute'].every(k=>typeof controller[k]==='function')) throw fault('controller_not_connected');
    let view=null,draft=null,draftDetails={},comparison=null,quote=null,actionPreview=null,reservations=null;
    let pending=null,error=null,failed=null,stale=false,disposed=false,epoch=0,readSeq=0,editSeq=0;
    const listeners=new Set(), displayed=new Map();
    const state=()=>copy({view,draft,draftDetails,comparison,quote,actionPreview,reservations,pending,error,stale,
      canRetry:!!failed,localDirty:!!view&&!same(draft,view.display_data.draft?.plan ?? currentPlan(view))});
    const notify=()=>{if(!disposed)for(const f of listeners)f(state());};
    const busy=()=>disposed||pending?.kind==='write'||pending?.kind==='inspect';
    const allowed=type=>view?.display_data?.capabilities?.[type]?.available===true;
    function publish(r,keepLocal=false) {
      validateView(r);
      if(view && r.meta.revision<view.meta.revision)throw fault('stale_response');
      const beforeScene=view?.display_data.scene,afterScene=r.display_data.scene;
      if(beforeScene?.id!==afterScene?.id||view?.display_data.phase!==r.display_data.phase||view?.display_data.case?.attempts!==r.display_data.case?.attempts)displayed.clear();
      view=copy(r);
      if(!keepLocal){draft=copy(r.display_data.draft?.plan ?? currentPlan(r));draftDetails=copy(r.display_data.details||{});editSeq++;}
      comparison=quote=actionPreview=reservations=null;
    }
    async function refresh({preserveLocal=true}={}) {
      if(busy())return {ok:false,error:fault('busy')};
      const myEpoch=++epoch;readSeq++;pending={kind:'inspect'};error=null;notify();
      try {
        const source=view&&reopen?await reopen():controller;
        const r=await source.inspect();
        if(disposed||myEpoch!==epoch)return {ok:false,ignored:true};
        if(responseError(r))throw responseError(r);
        const changed=!!view&&(r?.meta?.view_token!==view.meta.view_token||r?.meta?.revision!==view.meta.revision);
        publish(r,preserveLocal&&!!view);controller=source;
        stale=preserveLocal&&changed;failed=null;return {ok:true,view:copy(view)};
      } catch(e){error=typeof e?.code==='string'?copy(e):fault('connection_failed');return {ok:false,error:copy(error)};}
      finally{if(myEpoch===epoch&&!disposed){pending=null;notify();}}
    }
    function setDraft(p) {
      if(busy()||failed||stale)return false;
      draft=copy(p);editSeq++;readSeq++;if(pending?.kind==='read')pending=null;comparison=quote=null;error=null;notify();return true;
    }
    async function read(method,args,field,destination=field) {
      if(busy()||stale||failed||!view)return {ok:false,error:fault('busy')};
      if(typeof controller[method]!=='function'){error=fault('feature_not_connected');notify();return {ok:false,error:copy(error)};}
      const seq=++readSeq,gen=epoch,edits=editSeq,token=view.meta.view_token,revision=view.meta.revision;
      pending={kind:'read',method};error=null;notify();
      try{
        const r=await controller[method]({view_token:token,...copy(args)});
        if(disposed||gen!==epoch||seq!==readSeq||edits!==editSeq||view.meta.view_token!==token)return {ok:false,ignored:true};
        validateView(r);
        if(r.meta.revision!==revision||r.meta.view_token!==token)throw fault('stale_view');
        if(responseError(r))throw responseError(r);
        const value=r.display_data[field];if(value==null)throw fault('invalid_response');
        if(field==='preparation_comparison')comparison=copy(value);
        if(field==='conversion_quote')quote=copy(value);
        if(field==='action_preview'&&destination==='action_preview')actionPreview=copy(value);
        if(destination==='reservations')reservations=copy(value.current_reservations);
        const refusal=value.refusal;if(refusal&&outdated.has(refusal.code)){error=copy(refusal);stale=true;}
        return {ok:!refusal,value:copy(value)};
      }catch(e){if(gen===epoch&&seq===readSeq&&!disposed){error=typeof e?.code==='string'?copy(e):fault('connection_failed');if(outdated.has(error.code))stale=true;}return {ok:false,error:copy(error)};}
      finally{if(gen===epoch&&seq===readSeq&&!disposed){pending=null;notify();}}
    }
    async function send(command) {
      if(busy())return {ok:false,error:fault('busy')};
      const gen=++epoch;readSeq++;pending={kind:'write',type:command.type};error=null;comparison=quote=actionPreview=null;notify();
      try{
        const r=await controller.execute(copy(command));
        if(disposed||gen!==epoch)return {ok:false,ignored:true};
        if(responseError(r))throw responseError(r);
        validateView(r);
        const op=r.display_data.operation;
        if(!['committed','replayed'].includes(op?.status)||!Number.isSafeInteger(op.committed_revision)||op.committed_revision>r.meta.revision)throw fault('invalid_response');
        publish(r);failed=null;stale=false;error=null;
        if(command.type==='continue_scene'&&command.payload.advance===false){const key=command.payload.scene_id,seen=displayed.get(key)||new Set();for(const id of command.payload.displayed_text_ids||[])seen.add(id);displayed.set(key,seen);}
        return {ok:true,view:copy(view),operation:copy(op)};
      }catch(e){
        if(gen!==epoch||disposed)return {ok:false,ignored:true};
        error=typeof e?.code==='string'?copy(e):fault('connection_failed');
        failed=retryable.has(error.code)?copy(command):null;
        if(outdated.has(error.code)||error.code==='stale_response')stale=true;
        return {ok:false,error:copy(error)};
      }finally{if(gen===epoch&&!disposed){pending=null;notify();}}
    }
    async function execute(type,payload={}) {
      if(busy()||failed||!view||(stale&&type!=='discard_draft'))return {ok:false,error:fault('busy')};
      if(!(type==='continue_scene'&&payload.advance===false?(allowed('record_displayed_text')||allowed(type)):allowed(type))){error=fault('feature_not_connected');error.details.reasons=copy(view.display_data.capabilities?.[type]?.reasons||['feature_not_connected']);notify();return {ok:false,error:copy(error)};}
      if(!['save_draft','commit_preparation','discard_draft','ack_return'].includes(type)&&state().localDirty){error=fault('unsaved_draft');notify();return {ok:false,error:copy(error)};}
      if(type==='commit_preparation'&&(!comparison?.ok||!same(payload.plan,draft)))return {ok:false,error:fault('comparison_required')};
      if(type==='convert_items'&&(!quote||!same(payload.item_ids,quote.items.map(x=>x.id))))return {ok:false,error:fault('quote_required')};
      let id;try{id=idFactory();}catch(e){error=fault('secure_request_id_unavailable');notify();return {ok:false,error:copy(error)};}
      return send({request_id:id,expected_revision:view.meta.revision,view_token:view.meta.view_token,type,payload:copy(payload)});
    }
    async function ackReturn() {
      const cancelled=copy(draft?.cancel_learning||[]);
      const result=await execute('ack_return');if(!result.ok)return result;
      // Only stable base IDs are carried; no handle/name remapping or purchase plan transfer.
      const learned=new Set(view.display_data.home?.economy.learned.map(x=>x.base)||[]);
      const cancel=cancelled.filter(id=>learned.has(id));
      if(draft&&cancel.length){const p=copy(draft);p.cancel_learning=cancel;p.retain_learning=p.retain_learning.filter(x=>!cancel.includes(x));
        p.next_preparation.equipment=p.next_preparation.equipment.filter(id=>!cancel.includes(view.display_data.details?.[id]?.base_id));
        setDraft(p);await read('previewPreparation',{plan:draft},'preparation_comparison');}
      return result;
    }
    function publicChoice(choice) {return view?.display_data?.exploration?.legal_actions?.some(c=>same(c.choice??c,choice));}
    async function previewAction(choice){
      if(!publicChoice(choice))return {ok:false,error:fault('illegal_action')};
      return read('previewAction',{choice},'action_preview');
    }
    async function play(choice){if(!publicChoice(choice))return {ok:false,error:fault('illegal_action')};return execute('play',{choice});}
    async function recordDisplayed(scene_id,text_ids) {
      if(busy()||failed||stale||!view)return {ok:false,error:fault('busy')};
      const d=view.display_data;
      const texts=Array.isArray(d.texts)?d.texts:Object.values(d.texts||{});
      const known=new Set(texts.map(t=>t.id));
      const eligible=new Set([...(d.scene?.text_ids||[]),...(d.scene?.optional_text_ids||[])]);
      if(d.scene?.id!==scene_id||!text_ids.length||text_ids.some(id=>!known.has(id)||!eligible.has(id)))return {ok:false,error:fault('invalid_displayed_text')};
      const seen=displayed.get(scene_id)||new Set(),fresh=[...new Set(text_ids)].filter(id=>!seen.has(id));
      if(!fresh.length)return {ok:true,skipped:true};
      const r=await execute('continue_scene',{scene_id,advance:false,displayed_text_ids:fresh});
      if(r.ok){fresh.forEach(id=>seen.add(id));displayed.set(scene_id,seen);}return r;
    }
    return {state,subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn);},refresh,setDraft,
      compare:()=>read('previewPreparation',{plan:draft},'preparation_comparison'),
      quote:item_ids=>read('quoteConversion',{item_ids},'conversion_quote'),previewAction,play,execute,ackReturn,recordDisplayed,
      reservations(){const a=view?.display_data?.exploration?.legal_actions?.[0];return a?read('previewAction',{choice:a.choice??a},'action_preview','reservations'):Promise.resolve({ok:false,error:fault('illegal_action')});},
      retry:()=>failed&&!busy()?send(copy(failed)):Promise.resolve({ok:false,error:fault('nothing_to_retry')}),
      can:allowed,dispose(){disposed=true;epoch++;readSeq++;listeners.clear();},
      async exportSave(){if(busy()||failed||typeof controller.exportSave!=='function')throw fault('export_not_available');return controller.exportSave();}};
  }
  function makeLauncher(Campaign, config, {idFactory=requestId}={}) {
    let pending=false,failed=null,active=null,error=null,disposed=false,rawImport='';
    const configCopy=copy(config),listeners=new Set();
    const state=()=>({pending,error:copy(error),canRetry:!!failed,active:!!active,rawImport});
    const emit=()=>{if(!disposed)for(const fn of listeners)fn(state());};
    const controllerFrom=r=>{
      if(responseError(r))throw responseError(r);
      // The design-owned provider must return an inspect/execute controller.
      // A module export path or an alternate result wrapper is never guessed here.
      if(!r||!['inspect','execute'].every(k=>typeof r[k]==='function'))throw fault('controller_result_not_connected');
      return r;
    };
    async function run(method,args,retrying=false){
      if(pending||disposed||(!retrying&&failed))return {ok:false,error:fault('busy')};
      if(active&&method!=='open')return {ok:false,error:fault('active_campaign')};
      if(typeof Campaign?.[method]!=='function'){error=fault('feature_not_connected');emit();return {ok:false,error};}
      pending=true;error=null;emit();
      try{const c=controllerFrom(await Campaign[method](copy(args)));if(disposed)return {ok:false,ignored:true};
        active=c;failed=null;return {ok:true,controller:c};
      }catch(e){if(disposed)return {ok:false,ignored:true};error=typeof e?.code==='string'?copy(e):fault('connection_failed');failed=method!=='open'&&retryable.has(error.code)?{method,args:copy(args)}:null;return {ok:false,error:copy(error)};}
      finally{pending=false;emit();}
    }
    return {state,subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn);},
      open:()=>run('open',{slot_id:configCopy.slot_id}),
      create:()=>run('create',{...configCopy,request_id:idFactory()}),
      importSave(document){if(pending||failed||active)return Promise.resolve({ok:false,error:fault('busy')});
        rawImport=typeof document==='string'?document:JSON.stringify(document);let parsed;
        try{parsed=typeof document==='string'?JSON.parse(document):copy(document);}catch{error=fault('invalid_save_json');emit();return Promise.resolve({ok:false,error:copy(error)});}
        return run('importSave',{slot_id:configCopy.slot_id,document:parsed,request_id:idFactory()});},
      retry:()=>failed?run(failed.method,failed.args,true):Promise.resolve({ok:false,error:fault('nothing_to_retry')}),
      dispose(){disposed=true;listeners.clear();}};
  }
  const api={makeSession,makeLauncher,currentPlan,validateView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.CrossweaveUI=api;
})(globalThis);

/* UI-G-001 rendering, with the controller supplied by the caller. */
(function(api){'use strict';
api.mountPreparation=function(root,session){
 const $=s=>root.querySelector(s),clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pt=n=>Number.isInteger(n)?String(n/100):'—';
 const icon=(name,fallback='◇')=>`<i aria-hidden="true" data-lucide="${esc(name)}">${fallback}</i>`;
 const button=(text,action,extra='',cls='')=>`<button type="button" data-action="${action}" ${extra} class="${cls}">${text}</button>`;
 let view,plan,section='deck',win=null,comparison=null,quote=null,notice='',stale=false,failed=false;
 let hoverTimer,leaveTimer,disposed=false,snapshot,previousToken=null,oldDetails={};
 const events=new AbortController();
 root.classList.add('cw-m1');
 root.innerHTML='<div class="cw-game"><header class="cw-top" data-top></header><div class="cw-workspace" data-workspace></div><div class="cw-notice" data-notice role="status" aria-live="polite"></div><footer class="cw-footer" data-footer></footer><div data-overlay></div></div>';
 const home=()=>view?.display_data.home,dd=()=>view.display_data;
 const currentPlan=()=>api.currentPlan(view);
 const dirty=()=>!!plan&&JSON.stringify(plan)!==JSON.stringify(currentPlan());
 const unsaved=()=>!!plan&&JSON.stringify(plan)!==JSON.stringify(dd().draft?.plan);
 const blocked=()=>!!snapshot?.pending||snapshot?.canRetry||stale;
 function detail(id){const key=id==='$purchase'?plan?.candidate:id;return dd().details?.[key]||{name:'詳細の接続待ち',icon:'circle-help',kind:'card'};}
 function name(id){return detail(id).name;}
 function counts(ids){const r=new Map();for(const id of ids||[])r.set(id,(r.get(id)||0)+1);return [...r].map(([id,count])=>({id,count}));}
 function isLearned(base){return plan?.retain_learning.includes(base)||plan?.next_preparation.learn.includes(base);}
 function noticeFor(e){const z=e?.details||{};return ({insufficient_unspent_funds:`着想が ${pt(z.shortage_units)} 不足。取得を見送るか、心得を取り直す`,insufficient_learning_funds:`着想が ${pt(z.shortage_units)} 不足。習得予定を減らす`,unlearned_equipment_base:'基礎心得が未習得。習得するか、装備予定から外す',equipment_capacity_exceeded:`装備容量 ${z.used??'—'} / ${z.capacity??'—'}。装備予定を減らす`,deck_size:`札が ${z.size??'—'} / ${z.required_size??'—'} 枚。札組を調整する`,deck_base_cap:`同種は ${z.cap??'—'} 枚まで。札組を調整する`,duplicate_owned_card:'同じ個体を重ねて選べない。札組を調整する',duplicate_equipment:'同じ個体を重ねて装備できない',item_in_use:'札組・装備・下書きで使用中。準備から外して確定する',item_locked:'保護中。保護を外してから選び直す',storage_write_failed:'保存できなかった。下書きを保持しています',stale_revision:'内容が更新された。最新の候補を読み直す',stale_view:'この表示は古くなった。最新の候補を読み直す',stale_candidate:'前の候補は失効。最新の候補から選び直す',unknown_selection_handle:'前の選択は失効。今の準備から選び直す',candidate_unavailable:'この候補からは購入済み。次の候補を待つ',feature_not_connected:'この機能は接続待ち',conversion_value_not_connected:'この個体の変換額は接続待ち',return_not_acknowledged:'準備へ進んでから確定する',purchase_not_selected:'取得候補を選ぶか、購入予定の札を外す',dirty_draft:'未確定の変更あり。比較して確定する',content_not_ready:'探索への接続は次の段階です',learning_partition:'心得の選択を見直す',invalid_plan:'下書きの形式を確認できない',request_conflict:'再試行する操作が一致しない',invalid_request:'この操作を確認できない'})[e?.code]||'選択を確認してください';}

 function errorText(e){return ({connection_failed:'応答を確認できません。下書きを保持しています',invalid_response:'保存結果を確認できません。現在値は変更していません',comparison_required:'もう一度比較してください',busy:'処理中です',stale_response:'古い応答は適用しませんでした',secure_request_id_unavailable:'この環境では要求を安全に識別できません'})[e?.code]||noticeFor(e);}
 function publicFields(d){
  const rows=[];const add=(label,x)=>{if(x!==null&&x!==undefined)rows.push(`<dt>${esc(label)}</dt><dd>${esc(x)}</dd>`);};
  if(d.primary){add('主効果',d.primary.power);add('探査',d.primary.hit);add('攪乱',d.primary.evasion);add('機転',d.primary.crit_gain);}
  if(d.field){add('場の効果',d.field.power);add('場の探査',d.field.hit);}
  add('手札期限',d.life);add('設置間隔',d.action_intervals?.place);add('一致間隔',d.action_intervals?.match);
  const recovery={shared_recovery:'共有回収へ',consumed_on_recovery:'回収時に消耗',destroyed_on_recovery_retired_origin:'元の主体が離脱したため回収時に消滅',destroyed_on_recovery_filler:'回収時に消滅'};
  return (d.trigger_text?`<p>${esc(d.trigger_text)}</p>`:'')+(rows.length?`<dl class="cw-ledger">${rows.join('')}</dl>`:'')+(recovery[d.recovery_rule]?`<small>${recovery[d.recovery_rule]}</small>`:'');
 }
 function tile(id,origin,amount){const d=detail(id);return `<button type="button" class="cw-tile ${origin==='予定'?'cw-planned':''}" data-detail="${esc(id)}" data-origin="${origin}" aria-label="${esc(d.name+'・'+origin)}" aria-pressed="${win?.id===id&&win?.pinned?'true':'false'}"><span class="cw-art">${icon(d.icon)}</span><span class="cw-name">${esc(d.name)}</span><small>${origin==='初期札'?'初期札':origin==='候補'?'取得候補':origin==='心得'?(isLearned(d.base_id)?'習得予定':'未習得'):origin}</small>${amount?`<span class="cw-count">${origin==='候補'?amount:amount+'枚'}</span>`:''}</button>`;}
function mini(id,count=1){if(stale)return `<span class="cw-mini" title="前の下書き">${esc(oldDetails[id==='$purchase'?plan?.candidate:id]?.name||'前の選択')} ×${count}</span>`;return `<button type="button" class="cw-mini ${id==='$purchase'?'cw-planned':''}" data-detail="${esc(id)}" data-origin="予定" aria-label="${esc(name(id)+'・予定'+count)}">${icon(detail(id).icon)}${count>1?`<small>×${count}</small>`:''}</button>`;}
function ledger(c){if(!c?.ok)return c?`<div class="cw-error" role="alert">${esc(noticeFor(c.refusal))}</div>`:'';const s=c.stages;return `<dl class="cw-ledger"><dt>取消による返還</dt><dd>+${pt(c.cancellation.actual_refund_units)}</dd><dt>取消後</dt><dd>${pt(s.after_cancellation.unspent_units)}</dd><dt>購入予定</dt><dd>−${pt(c.purchase.cost_units)}</dd><dt>習得予定</dt><dd>−${pt(c.learning.payment_units)}</dd><dt class="cw-result">確定後の残額</dt><dd class="cw-result">${pt(s.prepared.unspent_units)}</dd><dt>確定後の既払</dt><dd>${pt(s.prepared.paid_learning_units)}</dd></dl>`;}
function draftPane(){if(!home())return '';const p=plan.next_preparation,used=comparison?.ok?comparison.prepared.equipment.used:dirty()?null:home().equipment.used,c=comparison;return `<aside class="cw-draft" aria-label="変更案"><div class="cw-row"><h3>${dirty()?'変更案':'今の準備'}</h3><small>${dirty()?'未確定':''}</small></div><div class="cw-draft-content"><div class="cw-row"><span>札組</span><small>${p.deck.length} / ${home().deck.required_size} 枚</small></div><div class="cw-mini-grid">${counts(p.deck).map(x=>mini(x.id,x.count)).join('')}</div><div class="cw-row"><span>装備</span><small>${used??'—'} / ${home().equipment.capacity}</small></div><div class="cw-mini-grid">${p.equipment.length?p.equipment.map(id=>mini(id)).join(''):'<small>なし</small>'}</div>${plan.candidate?`<small>購入予定 · ${esc(name('$purchase'))}</small>`:''}${dirty()?(c?.ok?`<dl class="cw-ledger"><dt>返還予定</dt><dd>+${pt(c.cancellation.actual_refund_units)}</dd><dt>支出予定</dt><dd>−${pt(c.purchase.cost_units+c.learning.payment_units)}</dd><dt class="cw-result">確定後</dt><dd class="cw-result">${pt(c.stages.prepared.unspent_units)}</dd></dl>`:ledger(c)):''}</div><div class="cw-draft-actions">${dirty()?`<div class="cw-actions">${button('比較','review','','cw-primary')}</div><div class="cw-actions">${button('下書きを保存','save-draft',stale?'disabled':'')}${button('戻す','discard-confirm')}</div>`:`<div class="cw-actions">${button('出発','depart','','cw-primary')}</div>`}</div></aside>`;}
function content(){const h=home();if(!h)return `<div class="cw-main" style="grid-column:1/-1"><h2>準備</h2><div class="cw-empty"><p>準備データの接続待ち</p><small>帰還結果は保持されています</small></div></div>`;let body='',heading='',summary='';
 if(section==='deck'){heading='札組';summary='初期札と所持札';body=`<span class="cw-section-title">初期札</span><div class="cw-grid">${h.free_card_options.map(id=>tile(id,'初期札',plan.next_preparation.deck.filter(x=>x===id).length)).join('')}</div><span class="cw-section-title">所持札</span><div class="cw-grid">${h.owned.filter(o=>o.selection_kind==='deck').map(o=>tile(o.id,'所持',plan.next_preparation.deck.includes(o.id)?1:0)).join('')||'<small>なし</small>'}</div>${plan.candidate&&detail('$purchase').kind==='card'?`<span class="cw-section-title">購入予定</span><div class="cw-grid">${tile('$purchase','予定',plan.next_preparation.deck.includes('$purchase')?1:0)}</div>`:''}`;}
 if(section==='skills'){heading='心得';summary='習得と装備';body=`<span class="cw-section-title">基礎心得</span><div class="cw-grid">${h.learning_options.map(o=>tile('base:'+o.base,'心得')).join('')}</div><span class="cw-section-title">所持している心得</span><div class="cw-grid">${h.owned.filter(o=>o.selection_kind==='equipment').map(o=>tile(o.id,'所持')).join('')||'<small>なし</small>'}</div>${plan.candidate&&detail('$purchase').kind==='passive'?`<span class="cw-section-title">購入予定</span><div class="cw-grid">${tile('$purchase','予定')}</div>`:''}`;}
 if(section==='owned'&&!dd().capabilities?.purchase?.available&&!dd().capabilities?.convert_items?.available)return '<main class="cw-main"><h2>所持</h2><p>個体の所持・変換は接続待ち</p></main>'+draftPane();if(section==='owned'){heading='所持';summary=`${h.owned.length}個`;body=`<div class="cw-grid">${h.owned.map(o=>tile(o.id,o.locked?'保護中':'所持')).join('')}</div>${!h.owned.length?'<div class="cw-empty"><p>所持品はまだありません</p>'+button('取得候補へ','nav-offers')+'</div>':''}`;}
 if(section==='offers'){heading='取得';summary=h.offers?.status==='purchased'?'購入済み':h.offers?.carried_from_previous_return?'前回の候補':h.candidates.length?'候補から1つ':'';if(!dd().capabilities?.purchase?.available)body='<div class="cw-empty"><p>取得は接続待ち</p>'+button('札組へ','nav-deck')+'</div>';else if(!h.candidates.length)body='<div class="cw-empty"><p>今回の候補なし</p>'+button('準備を続ける','nav-deck')+'</div>';else body=`<div class="cw-grid">${h.candidates.map(o=>tile(o.id,'候補',pt(o.price_units))).join('')}</div><div class="cw-actions" style="margin-top:16px">${h.offers?.status!=='purchased'?button('見送る','skip'):''}</div>`;}
 return `<main class="cw-main"><div class="cw-row"><h2>${heading}</h2><small>${summary}</small></div><div class="cw-scroll" data-scroll>${body}</div><small data-scroll-hint hidden>↓ 続き</small></main>${draftPane()}`;
}

 function returnPage(){const r=dd().return_receipt;if(!r)return '<main class="cw-return"><p>帰還表示の接続待ち</p></main>';
  const lookup=id=>Object.values(dd().details||{}).find(d=>d.base_id===id)?.name||'解放された種類';
  const unlocked=(r.new_unlocks||[]).map(id=>esc(lookup(id))).join('・')||'なし';
  const outcome={clear:'踏破',withdrawal:'撤退',defeat:'緊急脱出'}[r.outcome]||'帰還';
  return `<main class="cw-return"><div class="cw-return-head"><small>${outcome}</small><h2>帰還</h2><div>着想 <strong>+${pt(r.gained_units)}</strong></div><small>精算済み</small></div><div class="cw-return-list"><div class="cw-row"><span>持ち帰り</span><span>${Array.isArray(r.kept_items)?r.kept_items.length:'—'}個</span></div><div class="cw-row"><span>喪失</span><span>${Array.isArray(r.lost_items)?r.lost_items.length:'—'}個</span></div><div><small>種類解放</small><p>${unlocked}</p></div><dl class="cw-ledger"><dt>未使用</dt><dd>${pt(r.unspent_after_units)}</dd><dt>既払</dt><dd>${pt(r.paid_learning_units)}</dd></dl></div><div class="cw-return-actions">${home()?button('心得の取り直しを比較','return-compare'):''}${button('次の準備へ','ack','','cw-primary')}</div></main>`;
 }
 function icons(){} // Host may replace the fallback glyph through its asset pipeline.
 function controls(){
  const readonly=new Set(['close','pin','review','return-compare','discard-confirm','refresh']);
  const caps={'commit':'commit_preparation','save-draft':'save_draft','discard':'discard_draft','ack':'ack_return','depart':'depart','convert':'convert_items','quote':'convert_items','lock':'set_item_lock','candidate':'purchase'};
  for(const b of root.querySelectorAll('[data-action]')){
   const a=b.dataset.action;if(a.startsWith('nav-')||readonly.has(a))continue;
   if((blocked()&&a!=='retry')||(caps[a]&&!session.can(caps[a])))b.disabled=true;
  }
  if(stale){for(const b of root.querySelectorAll('[data-action="discard"]'))b.disabled=!!snapshot.pending||snapshot.canRetry;}
  root.querySelectorAll('[data-timing]').forEach(e=>e.disabled=blocked());
  root.querySelectorAll('[data-action="depart"]').forEach(b=>{if(!dd().case?.id)b.disabled=true;});
  root.setAttribute('aria-busy',String(!!snapshot?.pending));
 }
 function render(){if(disposed||!view)return;
  const scroll=[...root.querySelectorAll('[data-scroll],.cw-draft-content,.cw-popup')].map(e=>[e.matches('[data-scroll]')?'[data-scroll]':e.classList.contains('cw-popup')?'.cw-popup':'.cw-draft-content',e.scrollTop]);
  const h=home(),returning=dd().phase==='return';
  $('[data-top]').innerHTML=`<div class="cw-top-title"><span>crossweave</span><small>${returning?'帰還':'出発準備'}</small></div><div class="cw-wallet">${h?`<span>着想 <strong>${pt(h.economy.unspent_units)}</strong></span><small>既払 ${pt(h.economy.paid_learning_units)}</small>`:''}</div>`;
  $('[data-workspace]').dataset.screen=returning?'return':section;
  $('[data-workspace]').innerHTML=returning?returnPage():content();
  $('[data-footer]').innerHTML=returning?'<small>帰還結果</small>':[['deck','札組'],['skills','心得'],['owned','所持'],['offers','取得']].map(([s,l])=>button(l,'nav-'+s,`aria-pressed="${section===s}" ${!h?'disabled':''}`)).join('');
  if(stale)notice='前の下書きを保全中。最新を読み、今の準備から選び直してください';
  if(snapshot.pending)notice=snapshot.pending.kind==='write'?'保存中…':snapshot.pending.kind==='inspect'?'読み込み中…':'比較中…';
  $('[data-notice]').innerHTML=notice?`<span>${esc(notice)}</span>${failed?button('再試行','retry')+button('最新を読む','refresh'):''}${stale?button('最新を読む','refresh')+button('今の準備へ戻す','discard-confirm'):''}`:'';
  renderWindow();controls();scroll.forEach(([s,y])=>{const e=$(s);if(e)e.scrollTop=y;});queueMicrotask(updateLayout);
 }
 function popupHeader(title){return `<div class="cw-row"><h2>${esc(title)}</h2>${button(icon(win?.pinned?'pin':'pin-off',win?.pinned?'◆':'◇'),'pin',`aria-label="${win?.pinned?'ピン留めを解除':'ピン留め'}" aria-pressed="${!!win?.pinned}"`,'cw-pin')}</div>`;}
function renderWindow(){const overlay=$('[data-overlay]');if(!win){overlay.innerHTML='';return;}let body='',review=false;
 if(win.type==='detail'){
  const id=win.id,d=detail(id),h=home(),candidate=h?.candidates.find(c=>c.id===id),owned=h?.owned.find(o=>o.id===id),base=isLearned(d.base_id),n=plan?.next_preparation.deck.filter(x=>x===id).length||0;
  body=popupHeader(d.name)+`<div class="cw-art">${icon(d.icon)}</div><div class="cw-row"><small>${candidate?'取得候補':owned?'所持個体':id==='$purchase'?'購入予定':d.kind==='passive'?'基礎心得':'初期札'}</small><small>${d.kind==='passive'?'装備容量 '+d.equipment_cost:''}</small></div>${d.affixes?.length?d.affixes.map(a=>`<div><small>${esc(a.label)}</small><p>${esc(a.description)}</p></div>`).join(''):''}${d.effect_text?`<p>${esc(d.effect_text)}</p>`:'<small>効果の詳細は接続待ち</small>'}`;
  body+=publicFields(d);if(candidate){body+=`<dl class="cw-ledger"><dt>価格</dt><dd>${pt(candidate.price_units)}</dd><dt>現在の不足</dt><dd>${candidate.affordable_now===false?'比較で確認':'—'}</dd></dl>${d.kind==='passive'&&!base?'<small>購入後も所持のみ · 基礎心得が未習得</small>':''}<div class="cw-actions">${button(plan.candidate===id?'購入予定を外す':'購入予定にする','candidate',`data-id="${esc(id)}" ${!candidate.available?'disabled':''}`,'cw-primary')}</div>`;}
  else{
   if(id.startsWith('base:')&&d.kind==='passive'){
    const already=h.economy.learned.some(l=>l.base===d.base_id),cancelled=plan.cancel_learning.includes(d.base_id),newly=plan.next_preparation.learn.includes(d.base_id),paid=h.economy.learned.find(l=>l.base===d.base_id)?.paid_units;
    body+=`<div class="cw-row"><span>${already?(cancelled?'取消予定':'習得済み'):newly?'習得予定':'未習得'}</span><span>${already?'既払 '+pt(paid):'習得 '+pt(d.learning_cost_units)}</span></div><div class="cw-actions">${button(already?(cancelled?'取消を戻す':'習得を取り消す'):(newly?'習得予定を外す':'習得予定にする'),'learning',`data-base="${d.base_id}"`)}</div>`;
   }
   if(d.kind==='card')body+=`<div class="cw-row"><span>札組 · ${n}枚</span><div class="cw-actions">${button('−','deck-remove',`data-id="${esc(id)}" aria-label="札組から1枚外す" ${!n?'disabled':''}`)}${button('＋','deck-add',`data-id="${esc(id)}" aria-label="札組に1枚加える" ${(!id.startsWith('base:')&&n)?'disabled':''}`,'cw-primary')}</div></div>`;
   else body+=`${!base?'<small>装備には基礎心得の習得が必要</small>':''}<div class="cw-actions">${button(plan.next_preparation.equipment.includes(id)?'装備予定から外す':'装備予定にする','equip',`data-id="${esc(id)}"`,base?'cw-primary':'')}</div>`;
   if(owned)body+=`<div class="cw-actions">${button(icon(owned.locked?'lock-keyhole':'lock-open',owned.locked?'◆':'◇'),'lock',`data-id="${esc(id)}" aria-label="${owned.locked?'変換保護を外す':'変換から保護する'}"`)}${button('変換','quote',`data-id="${esc(id)}"`,'cw-danger')}</div>`;
  }
 }
 if(win.type==='review'){
  review=true;const c=comparison;body=popupHeader(dd().phase==='return'?'取り直しの比較':'変更の比較');
  if(c?.ok){const changes=c.differences;body+=`<div class="cw-review-cols"><section>${ledger(c)}</section><section class="cw-review-list"><h3>差分</h3>${changes.equipment.removed.map(x=>`<small>装備から外す · ${esc(name(x.id))}</small>`).join('')}${changes.equipment.added.map(x=>`<small>装備する · ${esc(name(x.id))}</small>`).join('')}${changes.deck.removed.map(x=>`<small>札組 −${x.count} · ${esc(name(x.id))}</small>`).join('')}${changes.deck.added.map(x=>`<small>札組 +${x.count} · ${esc(name(x.id))}</small>`).join('')}<small>所持 ${home().owned.length} → ${c.prepared.owned.length}個</small><small>札 ${c.prepared.deck.size}枚 · 装備 ${c.prepared.equipment.used}/${c.prepared.equipment.capacity}</small>${plan.candidate&&detail('$purchase').kind==='passive'&&!isLearned(detail('$purchase').base_id)?'<small>購入する心得は所持のみ · 未習得</small>':''}</section></div>`;}
  else body+=c?ledger(c):'<p>比較中…</p>';
  body+=`<div class="cw-row"><small>取消後の順序</small><select data-timing aria-label="比較の処理順"><option value="before_preparation" ${plan?.purchase_timing==='before_preparation'?'selected':''}>取得 → 習得</option><option value="after_preparation" ${plan?.purchase_timing==='after_preparation'?'selected':''}>習得 → 取得</option></select></div><div class="cw-actions">${button('修正する','close')}${dd().phase==='return'?button('次の準備へ','ack','','cw-primary'):button('変更を確定','commit',c?.ok&&!stale?'':'disabled','cw-primary')}</div>`;
 }
 if(win.type==='conversion'){
  body=popupHeader('変換');if(quote){body+=`<div class="cw-art">${icon(detail(win.id).icon)}</div><p>${esc(name(win.id))}</p><dl class="cw-ledger"><dt>手放す</dt><dd>${quote.removed_count}個</dd><dt>着想</dt><dd>+${pt(quote.total_units)}</dd><dt>確定後</dt><dd>${pt(quote.unspent_after_units)}</dd></dl><div class="cw-actions">${button('戻る','close')}${button('変換する','convert',`data-id="${esc(win.id)}"`,'cw-danger')}</div>`;}else body+=`<p class="cw-error" role="alert">${esc(notice)}</p><div class="cw-actions">${button(unsaved()?'下書きを保存':'準備へ','conversion-recover')}</div>`;
 }
 if(win.type==='discard'){body=popupHeader('変更を戻す')+'<p>未確定の変更を取り消します</p><div class="cw-actions">'+button('続ける','close')+button('今の準備に戻す','discard','','cw-danger')+'</div>';}
 overlay.innerHTML=`<div class="${win.type==='detail'?'cw-detail-layer':'cw-shade'}" data-outside><section class="cw-popup ${review?'cw-review':''}" role="dialog" aria-label="${esc(win.type==='detail'?name(win.id):win.type==='review'?'変更の比較':win.type==='conversion'?'変換':'変更を戻す')}">${body}</section></div>`;positionDetail();icons();
}
function openDetail(id,origin,pinned){if(win?.type==='detail'&&win.id===id&&pinned){if(win.pinned){win=null;renderWindow();return;}win.pinned=true;renderWindow();return;}if(!pinned&&win?.pinned)return;win={type:'detail',id,origin,pinned};renderWindow();}

 async function edit(fn){if(blocked())return;const next=clone(plan);fn(next);if(!session.setDraft(next))return;win=null;notice='';render();await session.compare();}
 root.addEventListener('click',async event=>{
  const source=event.target.closest('[data-detail]');
  if(source&&root.contains(source)){clearTimeout(hoverTimer);clearTimeout(leaveTimer);openDetail(source.dataset.detail,source.dataset.origin,true);controls();return;}
  const b=event.target.closest('[data-action]');if(!b){if(event.target.matches('[data-outside]')||(win?.type==='detail'&&event.target.closest('.cw-game')&&!event.target.closest('.cw-popup'))){win=null;renderWindow();}return;}
  if(b.disabled)return;const action=b.dataset.action,id=b.dataset.id,base=b.dataset.base;
  if(action.startsWith('nav-')){section=action.slice(4);win=null;render();return;}
  if(action==='close'){win=null;renderWindow();return;}if(action==='pin'){win.pinned=!win.pinned;renderWindow();controls();return;}
  if(action==='review'||action==='return-compare'){
   if(blocked())return;
   if(action==='return-compare'){const p=currentPlan();p.cancel_learning=[...p.retain_learning];p.retain_learning=[];p.next_preparation.equipment=[];session.setDraft(p);}
   win={type:'review',pinned:true};render();await session.compare();return;
  }
  if(action==='ack'){await session.ackReturn();return;}
  if(action==='candidate'||action==='skip'){await edit(p=>{p.next_preparation.deck=p.next_preparation.deck.filter(x=>x!=='$purchase');p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>x!=='$purchase');p.candidate=action==='skip'||p.candidate===id?null:id;});return;}
  if(action==='learning'){await edit(p=>{const learnt=home().economy.learned.some(x=>x.base===base);if(learnt){if(p.cancel_learning.includes(base)){p.cancel_learning=p.cancel_learning.filter(x=>x!==base);p.retain_learning.push(base);}else{p.retain_learning=p.retain_learning.filter(x=>x!==base);p.cancel_learning.push(base);p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>detail(x).base_id!==base);}}else{const a=p.next_preparation.learn;if(a.includes(base)){p.next_preparation.learn=a.filter(x=>x!==base);p.next_preparation.equipment=p.next_preparation.equipment.filter(x=>detail(x).base_id!==base);}else a.push(base);}});return;}
  if(action==='deck-add'||action==='deck-remove'){await edit(p=>{const a=p.next_preparation.deck;if(action==='deck-add')a.push(id);else{const n=a.indexOf(id);if(n>=0)a.splice(n,1);}});return;}
  if(action==='equip'){await edit(p=>{const a=p.next_preparation.equipment;p.next_preparation.equipment=a.includes(id)?a.filter(x=>x!==id):[...a,id];});return;}
  if(action==='discard-confirm'){win={type:'discard',pinned:true};renderWindow();controls();return;}
  if(action==='retry'){await session.retry();return;}
  if(action==='refresh'){await session.refresh();return;}
  if(action==='quote'){if(unsaved()){notice='先に下書きを保存し、対象を選び直してください';render();return;}win={type:'conversion',id,pinned:true};await session.quote([id]);return;}
  const command={commit:['commit_preparation',{plan}], 'save-draft':['save_draft',{plan}],discard:['discard_draft',{}],convert:['convert_items',{item_ids:[id]}],depart:['depart',{case_id:dd().case?.id}],lock:['set_item_lock',{item_id:id,locked:!home()?.owned.find(o=>o.id===id)?.locked}], 'conversion-recover':['save_draft',{plan}]}[action];
  if(command){if(action==='depart'&&dirty()){notice='変更を比較して確定するか、戻してください';render();return;}await session.execute(...command);}
 },{signal:events.signal});
 root.addEventListener('change',e=>{if(e.target.matches('[data-timing]')&&!blocked()){const p=clone(plan);p.purchase_timing=e.target.value;if(session.setDraft(p))session.compare();}},{signal:events.signal});
 root.addEventListener('mouseover',e=>{if(e.target.closest('.cw-popup')){clearTimeout(leaveTimer);return;}const b=e.target.closest('[data-detail]');if(!b||b.contains(e.relatedTarget)||win?.pinned)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(!disposed){openDetail(b.dataset.detail,b.dataset.origin,false);controls();}},180);},{signal:events.signal});
 root.addEventListener('mouseout',e=>{const b=e.target.closest('[data-detail]');if(b&&!b.contains(e.relatedTarget))clearTimeout(hoverTimer);if((b||e.target.closest('.cw-popup'))&&!e.relatedTarget?.closest?.('.cw-popup'))leaveTimer=setTimeout(()=>{if(!disposed&&win&&!win.pinned){win=null;renderWindow();}},140);},{signal:events.signal});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&win){win=null;renderWindow();}},{signal:events.signal});
 function updateScrollCue(){const s=$('[data-scroll]'),hint=$('[data-scroll-hint]');if(s&&hint)hint.hidden=s.scrollHeight-s.scrollTop<=s.clientHeight+4;}
function positionDetail(){
 if(win?.type!=='detail')return;
 const source=[...root.querySelectorAll('[data-detail]')].find(n=>n.dataset.detail===win.id),layer=$('.cw-detail-layer');
 const g=$('.cw-game').getBoundingClientRect(),r=source?.getBoundingClientRect();
 if(layer)layer.style.justifyItems=r&&r.left-g.left>g.width/2?'start':'end';
}
function updateLayout(){
 const game=$('.cw-game'),g=game.getBoundingClientRect();
 if(g.height>0){
  const top=$('[data-top]').getBoundingClientRect(),foot=$('[data-footer]').getBoundingClientRect(),message=$('[data-notice]').getBoundingClientRect();
  const lower=message.height>0?Math.min(message.top,foot.top):foot.top;
  game.style.setProperty('--cw-detail-top',Math.ceil(top.bottom-g.top+8)+'px');
  game.style.setProperty('--cw-detail-bottom',Math.ceil(g.bottom-lower+8)+'px');
 }
 updateScrollCue();positionDetail();
}

 const observer=new ResizeObserver(updateLayout);for(const s of ['.cw-game','[data-top]','[data-workspace]','[data-notice]','[data-footer]'])observer.observe($(s));
 root.addEventListener('scroll',updateScrollCue,{capture:true,signal:events.signal});
 const unsubscribe=session.subscribe(s=>{snapshot=s;if(!s.view)return;const next=s.view;
  if(previousToken!==next.meta.view_token&&!s.stale){win=null;section=next.display_data.phase==='return'?'return':section==='return'?'deck':section;}
  if(s.error&&s.canRetry)win=null;
  previousToken=next.meta.view_token;view=next;plan=s.draft;comparison=s.comparison;quote=s.quote;stale=s.stale;failed=s.canRetry;oldDetails=s.draftDetails;notice=s.error?errorText(s.error):'';render();});
 return {dispose(){disposed=true;clearTimeout(hoverTimer);clearTimeout(leaveTimer);events.abort();observer.disconnect();unsubscribe();root.replaceChildren();root.classList.remove('cw-m1');}};
};})(globalThis.CrossweaveUI);

/* UI-R-002 v0.15 layout/gestures, projected exclusively from CW-M1-view-1.
 * No game object, card registry, economy, saved document, or speculative actor AI.
 */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=x=>Array.isArray(x)?x:Object.values(x||{});
 const glyph=kind=>({attack:'↗',guard:'◇',heal:'✚',self:'●',passage:'≈',terminal:'▥',optional_enemy:'◈'})[kind]||'◇';
 const icon=kind=>`<span aria-hidden="true">${glyph(kind)}</span>`;
 const retirement={shared_recovery:'共有回収へ',consumed_on_recovery:'回収時に消耗',destroyed_on_recovery_retired_origin:'元の主体が離脱したため回収時に消滅',destroyed_on_recovery_filler:'回収時に消滅'};
 api.mountExploration=function(root,{session,display_data,onScene,onWithdraw}){
  let data=display_data,state=session.state(),selected=null,target=null,windowState=null,previewChoice=null;
  let previousToken=null,reservationToken=null,dead=false,drag=null,suppressUntil=0,hoverTimer=null,leaveTimer=null;
  const settings={diagram:true,details:true,quick:true,drag:true,hold:220};
  const events=new AbortController(),timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(!dead)fn();},ms);timers.add(t);return t;};
  root.classList.add('cw-explore');root.setAttribute('aria-label','crossweave 探索');
  root.innerHTML=`<div id="cw-scene" aria-hidden="true"><div id="cw-scene-base"></div></div>
   <section class="cw-region cw-world" aria-label="相手と環境"><div class="cw-heading"><div class="cw-order-strip"><ol id="cw-turn-order" aria-label="現在の行動予約"></ol></div></div><div class="cw-scroll" id="cw-actors"></div><div class="cw-scroll-help" data-track="cw-actors"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-board" id="cw-drop-zone" aria-label="札を出す場"><div class="cw-heading"><span id="cw-match-label"></span></div><div class="cw-scroll" id="cw-field"></div><div class="cw-scroll-help" data-track="cw-field"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div></section>
   <section class="cw-region cw-hand-region" aria-label="手札"><div class="cw-heading"><span id="cw-notice" role="status"></span></div><div class="cw-scroll" id="cw-hand"></div><div class="cw-scroll-help" data-track="cw-hand"><button type="button" data-x-scroll="-1">前へ</button><span></span><button type="button" data-x-scroll="1">次へ</button></div><div id="cw-action-track"><div class="cw-actions" id="cw-action-anchor" hidden><button type="button" data-x="preview">予測</button><button type="button" id="cw-use" data-x="use" class="cw-primary">場に出す</button></div></div></section>
   <footer class="cw-bottom"><div class="cw-footer-state"><div class="cw-self" id="cw-self"></div><span id="cw-hand-count"></span></div><nav class="cw-menu" aria-label="探索メニュー"><button type="button" data-x="objective">目的</button><button type="button" data-x="status">状況</button><button type="button" data-x="deck">山札</button><button type="button" data-x="history">履歴</button><button type="button" data-x="settings">設定</button><button type="button" data-x="scene">本文</button></nav><button type="button" data-x="withdraw">撤退</button></footer>
   <svg id="cw-relations" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden></svg><div id="cw-drag-ghost" aria-hidden="true" hidden></div>
   <section class="cw-drawer" id="cw-drawer" role="dialog" aria-label="詳細" hidden><header><strong id="cw-drawer-title"></strong><button type="button" data-x="pin" aria-label="ピン留め" id="cw-window-state">◆</button><button type="button" data-x="close" aria-label="詳細を閉じる">×</button></header><div class="cw-drawer-body"></div></section>`;
  const $=s=>root.querySelector(s),x=()=>data.exploration,details=id=>data.details?.[id];
  const hand=()=>list(x()?.hand),field=()=>list(x()?.field),actors=()=>list(x()?.actors).filter(a=>a.active);
  const card=()=>hand().find(c=>c.id===selected),actor=id=>x()?.actors?.[id]||list(x()?.actors).find(a=>a.id===id);
  const names=id=>details(id)?.name||actor(id)?.name||'札';
  const label=(key,fallback)=>data.stat_labels?.[key]||fallback;
  const busy=()=>!!state.pending||state.canRetry||state.stale;
  const choices=()=>list(x()?.legal_actions).map(a=>a.choice??a).filter(a=>a.card_id===selected);
  const choice=()=>choices().find(a=>a.target===target)||choices().find(a=>a.target===null)||null;
  const art=(kind,k)=>`<span class="cw-illustration" data-art-kind="${kind}" aria-hidden="true">${icon(k)}</span>`;
  const attribute=c=>`<span class="cw-attr">${esc(c.attr)}</span>`;
  const main=c=>{const d=details(c.id);return d?.primary?`${d.primary.kind==='heal'?'回復':label(d.primary.kind==='guard'?'guard':'power',d.primary.kind==='guard'?'身構':'突破')} ${d.primary.power} · ${label('hit','探査')} ${d.primary.hit}`:'詳細未提供';};
  function cardDetails(id){const d=details(id);if(!d)return '<p>この詳細はまだ公開されていません</p>';
   const p=d.primary,f=d.field,rows=[];const add=(k,v)=>{if(v!=null)rows.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);};
   if(p){add(p.kind==='guard'?label('guard','身構'):p.kind==='heal'?'回復':label('power','突破'),p.power);add(label('hit','探査'),p.hit);add(label('evasion','攪乱'),p.evasion);add(label('crit_gain','機転'),p.crit_gain);}
   if(f){add('場の突破／身構',f.power);add('場の探査／攪乱',f.hit);}add('期限',d.life);add('設置間隔',d.action_intervals?.place);add('一致間隔',d.action_intervals?.match);
   return `<dl class="cw-ledger">${rows.join('')}</dl>${d.effect_text?`<p>${esc(d.effect_text)}</p>`:''}${d.trigger_text?`<p>${esc(d.trigger_text)}</p>`:''}<p>${esc(retirement[d.recovery_rule]||'')}</p>`;
  }
  function prediction(){const p=state.actionPreview;if(!p||!previewChoice||JSON.stringify(previewChoice)!==JSON.stringify(choice()))return '<p>予測を確認中…</p>';
   if(!p.supported)return '<p>この行動は予測に未対応です</p>';
   const rows=[['行動間隔',p.action_cost]];
   if(p.mode==='attack'){rows.push(['対象の減少量',p.actual_hp_loss],[label('hit','探査')+'の進展',p.hit_gain]);}
   if(p.mode==='heal')rows.push(['回復',p.hp_restored]);
   if(p.mode==='guard')rows.push([label('guard','身構'),p.guard?.value],[label('evasion','攪乱'),p.guard?.evasion]);
   if(p.mode==='place')rows.push(['主効果','発動なし']);
   const expiry=(p.unused_hand_expiry||[]).filter(a=>a.expires);
   return `<dl class="cw-ledger">${rows.filter(([,v])=>v!=null).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${expiry.length?`<p class="cw-loss">期限切れ：${expiry.map(a=>`${esc(names(a.id))}（${a.destination==='destroyed'?'消滅':'共有回収'}）`).join('、')}</p>`:''}<p>現在の一手の予測です。続く相手の行動で変わります。</p>`;
  }
  function history(){return list(x()?.public_history).slice().reverse().map(r=>{
   const action=r.mode==='attack'?`${names(r.target)} ${actor(r.target)?.remaining_label||'残量'} −${r.actual_hp_loss}`:r.mode==='guard'?label('guard','身構'):r.mode==='heal'?`回復 +${r.hp_restored}`:'設置';
   return `<li class="cw-log"><time>${esc(r.time)}</time> ${r.type==='action'?`${esc(names(r.actor))} · ${esc(action)}`:'場面が変化'}</li>`;
  }).join('')||'<li>まだ履歴がありません</li>';}
  function windowContent(){const w=windowState;if(!w)return;
   let title='',body='';
   if(['card','field','preview'].includes(w.type)){title=names(w.id);body=w.type==='preview'?prediction():cardDetails(w.id);}
   if(w.type==='actor'){const a=actor(w.id);title=a?.name||'相手';body=a?`<p>${esc(a.remaining_label)} ${a.hp}/${a.max_hp}</p><p>${label('hit','探査')} ${a.hit} · ${label('crit','一閃')} ${a.crit}</p><p>${label('evasion','攪乱')} ${a.evasion} · 軽減 ${a.reduction}</p>`:'<p>この対象は離脱しました</p>';}
   if(w.type==='order'){title='行動予約';const rows=state.reservations,base=rows?.find(r=>r.actor===w.id);body=rows?`<p>${esc(names(w.id))} を基準</p><table class="cw-order-table"><thead><tr><th>順</th><th>主体</th><th>時差</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(names(r.actor))}</td><td>${r.at-(base?.at??x().now)}</td></tr>`).join('')}</tbody></table><p>現在の予約です。行動後に変わります。</p>`:'<p>予約の公開応答を確認中…</p>';}
   if(w.type==='objective'){title='目的';const t=list(data.texts).find(t=>t.id===data.case?.objective_text_id);body=`<p>${esc(t?.short_text||'目的の本文はまだ公開されていません')}</p>`;}
   if(w.type==='status'){title='状況';body=`<p>時刻 ${x().now} · 本人の行動 ${x().self.actions}回</p>`+actors().map(a=>`<p>${esc(a.name)}：${esc(a.remaining_label)} ${a.hp}/${a.max_hp} · ${label('crit','一閃')} ${a.crit}</p>`).join('');}
   if(w.type==='deck'){title='山札';body=`<p>山札 ${x().self.deck_count}枚 · 手札 ${hand().length}枚 · 共有回収 ${x().recovery_count}枚</p><p>山札の種類別残数は、この接続版では未対応です。</p>`;}
   if(w.type==='history'){title='履歴';body=`<ol>${history()}</ol>`;}
   if(w.type==='settings'){title='操作';body=`<p>タップで選択・詳細。短く押し続けて場へ運ぶと出札できます。押してすぐ横へ動かすと手札を送ります。</p>${[['diagram','関係線を表示'],['details','選択時に詳細を開く'],['quick','通常の設置をすぐ実行'],['drag','ドラッグを使う']].map(([k,l])=>`<label><input type="checkbox" data-x-setting="${k}" ${settings[k]?'checked':''}> ${l}</label>`).join('')}<label>つかむまで <select data-x-hold><option value="150">0.15秒</option><option value="220">0.22秒</option><option value="320">0.32秒</option></select></label>`;}
   $('#cw-drawer-title').textContent=title;$('.cw-drawer-body').innerHTML=body;
   const popup=$('#cw-drawer');popup.hidden=false;popup.dataset.window=w.type;popup.setAttribute('aria-label',title);
   $('#cw-window-state').textContent=w.pinned?'◆':'◇';$('#cw-window-state').setAttribute('aria-pressed',String(w.pinned));
   if(w.type==='settings')$('[data-x-hold]').value=String(settings.hold);
  }
  function close(){windowState=null;$('#cw-drawer').hidden=true;layout();}
  function open(type,id=null,pinned=true){
   if(windowState?.pinned&&!pinned)return;
   if(pinned&&windowState?.type===type&&windowState.id===id){if(windowState.pinned){close();return;}windowState.pinned=true;}
   else windowState={type,id,pinned};
   windowContent();layout();
  }
  function redraw(){if(dead||!x())return;const c=card();
   const scrolls=['cw-actors','cw-field','cw-hand','cw-turn-order'].map(id=>[id,$('#'+id).scrollLeft]);
   root.dataset.cardDrag=String(settings.drag);root.setAttribute('aria-busy',String(!!state.pending));
   $('#cw-actors').innerHTML=actors().filter(a=>a.id!==x().self.id).map(a=>`<button type="button" class="cw-actor" data-x-actor="${esc(a.id)}" aria-pressed="${target===a.id}">${art('actors',a.purpose)}<span class="cw-face-caption"><strong>${esc(a.name)}</strong><span>${esc(a.remaining_label)} ${a.hp}/${a.max_hp}</span><progress value="${a.hp}" max="${a.max_hp}" aria-label="${esc(a.remaining_label)}"></progress></span></button>`).join('');
   const attrs=[...new Set([...field().map(c=>c.attr),...hand().map(c=>c.attr)])];
   $('#cw-field').innerHTML=attrs.map(attr=>{const f=field().find(f=>f.attr===attr),tag=f?'button':'div';return `<${tag} ${f?`type="button" data-x-field="${esc(f.id)}"`:''} class="cw-slot" data-x-attr="${esc(attr)}" data-linked="${c?.attr===attr}">${f?art('cards',f.kind):''}<span class="cw-face-caption"><strong>${esc(attr)} ${f?esc(names(f.id)):''}</strong>${f?`<span>場 ${c?.kind==='guard'&&c.attr===attr?'身構／攪乱':'突破／探査'} ${f.field_power} / ${f.field_hit}</span>`:''}</span></${tag}>`;}).join('');
   $('#cw-hand').innerHTML=hand().map(h=>`<article class="cw-hand-card" data-selected="${h.id===selected}"><button type="button" class="cw-select" data-x-card="${esc(h.id)}" aria-pressed="${h.id===selected}">${art('cards',h.kind)}<span class="cw-face-caption"><strong>${attribute(h)}${esc(names(h.id))}</strong><span>${esc(main(h))}</span><span class="${h.remaining===1?'cw-loss':''}">${h.remaining===1?'今回まで':'あと'+h.remaining+'行動'}</span></span></button></article>`).join('');
   $('#cw-turn-order').innerHTML=state.reservations?state.reservations.map(r=>`<li><button type="button" data-x-order="${esc(r.actor)}" aria-label="${esc(names(r.actor))}、次回 ${r.at}"><span class="cw-turn-face">${icon(actor(r.actor)?.purpose)}</span><span>+${r.at-x().now}</span></button></li>`).join(''):'<li>行動予約を確認中…</li>';
   $('#cw-self').textContent=`${label('hp','余力')} ${x().self.hp}/${x().self.max_hp}`;$('#cw-hand-count').textContent=`手札 ${hand().length}枚`;
   const match=c&&field().some(f=>f.attr===c.attr);$('#cw-match-label').textContent=c?c.attr+' · '+(match?'一致':'設置'):'';
   $('#cw-notice').textContent=state.pending?'処理中…':state.error?'操作結果を確認してください':c&&choices().length&&!choice()?'対象を選択':'';
   const q=choice();$('#cw-use').textContent=q?q.target?`${names(q.target)}を${actor(q.target)?.action_label||'進める'}`:match?(c.kind==='guard'?label('guard','身構'):c.kind==='heal'?'回復':'一致して使う'):'場に出す':'対象を選択';
   $('#cw-use').disabled=busy()||!q||!session.can('play');$('[data-x="preview"]').disabled=busy()||!q;
   $('[data-x="withdraw"]').disabled=busy()||!session.can('withdraw');
   if(windowState)windowContent();scrolls.forEach(([id,v])=>$('#'+id).scrollLeft=v);queueMicrotask(layout);
  }
  function layout(){if(dead)return;const rr=root.getBoundingClientRect();if(!rr.width||!rr.height)return;
   const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
   root.style.setProperty('--cw-footer-height',(rr.width<=600?(coarse?96:76):(coarse?48:32))+'px');
   const node=[...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===selected),cr=node?.getBoundingClientRect(),track=$('#cw-action-track'),tr=track.getBoundingClientRect(),dock=$('#cw-action-anchor');
   dock.hidden=!node;if(node){const width=dock.getBoundingClientRect().width||164;dock.style.left=Math.max(0,Math.min(tr.width-width,(cr.left+cr.right)/2-tr.left-width/2))+'px';}
   for(const el of root.querySelectorAll('[data-track]')){const row=$('#'+el.dataset.track),overflow=row.scrollWidth>row.clientWidth+2;el.dataset.hidden=String(!overflow);el.querySelector('span').textContent=row.children.length+'件';el.querySelector('button:first-child').disabled=row.scrollLeft<=2;el.querySelector('button:last-child').disabled=row.scrollLeft>=row.scrollWidth-row.clientWidth-2;}
   if(windowState){const popup=$('#cw-drawer'),type=windowState.type,margin=10;
    const width=Math.min(type==='preview'?420:560,rr.width-2*margin);popup.style.width=width+'px';popup.style.height='auto';
    const hr=$('#cw-hand').getBoundingClientRect(),fr=$('#cw-field').getBoundingClientRect();let top=margin,max=rr.height-2*margin;
    if(type==='card'||type==='preview'){max=Math.max(100,hr.top-rr.top-2*margin);}
    else if(type==='field'){top=fr.bottom-rr.top+margin;max=Math.max(100,rr.height-top-margin);}
    else if(type==='actor'||type==='order'){top=$('#cw-actors').getBoundingClientRect().bottom-rr.top+margin;max=Math.max(100,rr.height-top-margin);}
    popup.style.maxHeight=Math.min(max,rr.height-2*margin)+'px';popup.style.top=Math.max(margin,Math.min(top,rr.height-popup.getBoundingClientRect().height-margin))+'px';
    const center=cr?(cr.left+cr.right)/2-rr.left:rr.width/2;popup.style.left=Math.max(margin,Math.min(rr.width-width-margin,center-width/2))+'px';
   }
   drawRelations(rr);
  }
  function drawRelations(rr){const svg=$('#cw-relations'),c=card(),q=choice();svg.replaceChildren();svg.hidden=!settings.diagram||!c;svg.toggleAttribute('hidden',!settings.diagram||!c);if(!settings.diagram||!c)return;
   svg.setAttribute('viewBox',`0 0 ${rr.width} ${rr.height}`);
   const point=(node,track,edge)=>{if(!node)return null;const b=node.getBoundingClientRect(),r=track.getBoundingClientRect();const l=Math.max(b.left,r.left,rr.left),right=Math.min(b.right,r.right,rr.right);if(right-l<4)return null;return {x:(l+right)/2-rr.left,y:(edge==='top'?b.top:b.bottom)-rr.top};};
   const h=point([...root.querySelectorAll('[data-x-card]')].find(e=>e.dataset.xCard===c.id),$('#cw-hand'),'top');
   const fNode=[...root.querySelectorAll('[data-x-attr]')].find(e=>e.dataset.xAttr===c.attr),fBottom=point(fNode,$('#cw-field'),'bottom'),fTop=point(fNode,$('#cw-field'),'top');
   const dst=q?.target?[...root.querySelectorAll('[data-x-actor]')].find(e=>e.dataset.xActor===q.target):null;
   const end=dst?point(dst,$('#cw-actors'),'bottom'):null;
   const ns='http://www.w3.org/2000/svg';
   for(const [a,b] of [[h,fBottom],[fTop,end]])if(a&&b){const p=document.createElementNS(ns,'path'),mid=(a.y+b.y)/2;p.setAttribute('d',`M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','2');svg.append(p);}
  }
  async function select(id){if(busy())return;const previous=selected;selected=id;const legal=choices();if(!legal.some(q=>q.target===target))target=legal.length===1?legal[0].target:target;previewChoice=null;redraw();if(settings.details)open('card',id,true);else if(previous===id)open('card',id,true);}
  async function preview(pinned=true){const q=choice();if(!q||busy())return;previewChoice=JSON.parse(JSON.stringify(q));windowState={type:'preview',id:selected,pinned};await session.previewAction(q);if(!dead){windowContent();layout();}}
  async function perform(){const q=choice();if(!q||busy())return;close();const r=await session.play(q);if(r.ok){selected=null;target=null;previewChoice=null;}if(!dead)redraw();}
  root.addEventListener('click',async e=>{
   if(Date.now()<suppressUntil){e.preventDefault();e.stopPropagation();return;}
   const c=e.target.closest('[data-x-card]');if(c){await select(c.dataset.xCard);return;}
   const a=e.target.closest('[data-x-actor]');if(a){target=a.dataset.xActor;previewChoice=null;redraw();open('actor',target);return;}
   const f=e.target.closest('[data-x-field]');if(f){open('field',f.dataset.xField);return;}
   const o=e.target.closest('[data-x-order]');if(o){open('order',o.dataset.xOrder);return;}
   const scroll=e.target.closest('[data-x-scroll]');if(scroll){const row=$('#'+scroll.closest('[data-track]').dataset.track);row.scrollLeft+=Number(scroll.dataset.xScroll)*row.clientWidth*.8;layout();return;}
   const b=e.target.closest('[data-x]');if(!b){if(windowState&&!e.target.closest('#cw-drawer'))close();return;}if(b.disabled)return;
   const k=b.dataset.x;if(k==='close'){close();return;}if(k==='pin'){windowState.pinned=!windowState.pinned;windowContent();return;}
   if(k==='preview'){await preview();return;}if(k==='use'){await perform();return;}if(k==='scene'){onScene?.();return;}if(k==='withdraw'){onWithdraw?.();return;}open(k);
  },{signal:events.signal});
  root.addEventListener('change',e=>{const k=e.target.dataset.xSetting;if(k)settings[k]=e.target.checked;if(e.target.hasAttribute('data-x-hold'))settings.hold=Number(e.target.value);root.dataset.cardDrag=String(settings.drag);layout();},{signal:events.signal});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelDrag();close();}},{signal:events.signal});
  root.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;clearTimeout(leaveTimer);const b=e.target.closest('.cw-menu [data-x],#cw-use');if(!b||b.contains(e.relatedTarget)||(windowState?.pinned&&b.id!=='cw-use'))return;clearTimeout(hoverTimer);hoverTimer=later(()=>{if(b.id==='cw-use')preview(false);else if(!['scene'].includes(b.dataset.x))open(b.dataset.x,null,false);},180);},{signal:events.signal});
  root.addEventListener('pointerout',e=>{if(e.target.contains(e.relatedTarget))return;clearTimeout(hoverTimer);if(!e.relatedTarget?.closest?.('#cw-drawer'))leaveTimer=later(()=>{if(windowState&&!windowState.pinned)close();},160);},{signal:events.signal});
  function cancelDrag(){if(!drag)return;clearTimeout(drag.timer);if(root.hasPointerCapture?.(drag.pointer))root.releasePointerCapture(drag.pointer);drag=null;$('#cw-drag-ghost').hidden=true;$('#cw-drop-zone').dataset.drag='false';}
  root.addEventListener('pointerdown',e=>{const c=e.target.closest('[data-x-card]');if(!c||!settings.drag||busy()||e.button!==0)return;
   drag={id:c.dataset.xCard,pointer:e.pointerId,x:e.clientX,y:e.clientY,initialScroll:$('#cw-hand').scrollLeft,scroll:false,held:false,token:state.view.meta.view_token};
   const current=drag;current.timer=later(()=>{if(drag!==current||drag.scroll)return;drag.held=true;selected=drag.id;const qs=choices();if(qs.length===1)target=qs[0].target;close();const ghost=$('#cw-drag-ghost');ghost.textContent=names(drag.id);ghost.hidden=false;$('#cw-drop-zone').dataset.drag='true';root.setPointerCapture?.(e.pointerId);},settings.hold);
  },{signal:events.signal});
  root.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.held&&(drag.scroll||Math.hypot(dx,dy)>8)){clearTimeout(drag.timer);drag.scroll=true;$('#cw-hand').scrollLeft=drag.initialScroll-dx;e.preventDefault();layout();return;}
   if(drag.held){e.preventDefault();const r=root.getBoundingClientRect(),g=$('#cw-drag-ghost');g.style.left=Math.max(0,Math.min(r.width-180,e.clientX-r.left-90))+'px';g.style.top=Math.max(0,e.clientY-r.top-70)+'px';}
  },{signal:events.signal,passive:false});
  root.addEventListener('pointerup',async e=>{const d=drag;if(!d)return;const hit=document.elementFromPoint?.(e.clientX,e.clientY);cancelDrag();if(!d.held&&!d.scroll)return;suppressUntil=Date.now()+500;if(!d.held||d.token!==state.view.meta.view_token)return;redraw();
   if(!hit?.closest?.('#cw-drop-zone'))return;
   const q=choice();if(!q)return;
   const r=await session.previewAction(q);previewChoice=JSON.parse(JSON.stringify(q));if(!r.ok)return;
   const p=session.state().actionPreview,loses=(p?.unused_hand_expiry||[]).some(a=>a.expires&&a.destination==='destroyed');
   if(settings.quick&&p?.mode==='place'&&!loses)await perform();else{windowState={type:'preview',id:selected,pinned:true};windowContent();layout();}
  },{signal:events.signal});
  root.addEventListener('pointercancel',cancelDrag,{signal:events.signal});
  root.addEventListener('scroll',layout,{capture:true,signal:events.signal});
  const observer=new ResizeObserver(layout);observer.observe(root);
  function update(d,s=session.state()){data=d;state=s;if(!x())return;
   const token=s.view.meta.view_token;if(previousToken&&token!==previousToken){cancelDrag();selected=null;target=null;previewChoice=null;close();}previousToken=token;
   if(selected&&!hand().some(c=>c.id===selected)){selected=null;close();}redraw();
   if(!state.reservations&&!state.pending&&!state.error&&reservationToken!==token&&session.can('previewAction')){reservationToken=token;queueMicrotask(()=>{if(!dead)session.reservations();});}
  }
  update(data,state);
  return {update,dispose(){dead=true;cancelDrag();observer.disconnect();events.abort();for(const t of timers)clearTimeout(t);root.replaceChildren();root.classList.remove('cw-explore');}};
 };
})(globalThis.CrossweaveUI);

/* Public-view routing and Campaign lifecycle. No import of a guessed runtime path. */
(function(api){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const texts=d=>Array.isArray(d.texts)?d.texts:Object.values(d.texts||{});
 const reason=e=>({save_not_found:'保存がありません。新しく始める場合は「はじめから」を選んでください',save_already_exists:'保存があります。「続きから」を選んでください',slot_not_empty:'保存があります。上書きはしません',unsupported_save_schema:'対応していない保存形式です。元ファイルは変更していません',invalid_save_json:'保存JSONを読めません。入力は保持しています',storage_write_failed:'保存できませんでした。元の状態と入力を保持しています',storage_unavailable:'保存先を利用できません',indexeddb_unavailable:'この表示環境では永続保存を利用できません',storage_open_failed:'保存先を開けませんでした',storage_open_blocked:'保存先が別の画面で使用されています',storage_read_failed:'保存内容を読み出せませんでした',feature_not_connected:'この操作は現在の接続版では未対応です',controller_result_not_connected:'本体の戻り値との接続が必要です',connection_failed:'応答を確認できませんでした',unsaved_draft:'先に下書きを保存してください',busy:'処理が終わるまでお待ちください'})[e?.code]||'保存内容を確認できません。元のデータは変更していません';
 const makeId=x=>typeof x==='string'?x:x?.id;
 api.mountApplication=function(root,{Campaign=null,config=null,controller=null,explorationRenderer=null}={}){
  let session=null,child=null,unsubscribe=null,kind=null,dead=false,changing=false,menu=false,sceneRequested=false;
  let sceneKey=null,openText=null,seen=new Set(),toRecord=new Set(),recording=false,observer=null,selected=null;
  let rawImport='',startupError='',lastSceneToken=null;
  const events=new AbortController(),launcher=Campaign&&config?api.makeLauncher(Campaign,config):null;
  root.classList.add('cw-app');root.innerHTML='<div class="cw-appbar"><span>crossweave</span><div><button type="button" data-global="scene">本文</button><button type="button" data-global="menu">保存</button></div></div><div class="cw-app-message" role="status" aria-live="polite" data-message></div><section data-start></section><section data-save hidden></section><div data-stage></div>';
  const $=s=>root.querySelector(s),message=s=>{$('[data-message]').textContent=s;};
  function start(){
   $('[data-start]').hidden=!!session;
   $('[data-start]').innerHTML=`<div class="cw-start"><h1>crossweave</h1><p>${launcher?'継続データ':'本体APIの接続待ち'}</p><div class="cw-actions"><button type="button" data-global="open" ${!launcher?'disabled':''}>続きから</button><button type="button" data-global="create" ${!launcher?'disabled':''}>はじめから</button><button type="button" data-global="menu">保存を読み込む</button></div></div>`;
   saveMenu();
  }
  function saveMenu(){const box=$('[data-save]');box.hidden=!menu;if(!menu)return;
   if(!box.firstChild)box.innerHTML='<div class="cw-save"><h2>保存データ</h2><div class="cw-actions"><button type="button" data-global="export">書き出す</button><button type="button" data-global="menu">閉じる</button></div><label>読み込むJSONファイル<input type="file" accept=".json,application/json" data-import-file></label><label>保存JSON<textarea data-import-document rows="5" spellcheck="false"></textarea></label><button type="button" data-global="import">空の保存先へ読み込む</button><p data-import-error role="alert"></p></div>';
   $('[data-import-document]').value=rawImport;
   const importing=!!launcher?.state().pending||!!launcher?.state().canRetry||!!session;
   $('[data-import-document]').disabled=importing; $('[data-import-file]').disabled=importing;
   $('[data-global="export"]').disabled=!session||!!session.state().pending||session.state().canRetry;
   $('[data-global="import"]').disabled=!launcher||!!session||!!launcher?.state().pending;
  }
  function controls(s){
   const busy=changing||!!s?.pending;
   $('[data-global="scene"]').disabled=busy||!s?.view?.display_data?.scene;
   root.querySelectorAll('[data-scene-action],[data-play],[data-preview]').forEach(b=>{b.disabled=busy||s?.canRetry||s?.stale;});
   const d=s?.view?.display_data;
   if(d)root.querySelectorAll('[data-scene-action="continue"]').forEach(b=>b.disabled=b.disabled||!d.scene?.can_continue||!session.can('continue_scene')||!seen.size);
   if(d)root.querySelectorAll('[data-scene-action="withdraw"]').forEach(b=>b.disabled=b.disabled||!d.scene?.can_withdraw||!session.can('withdraw'));
   if(d)root.querySelectorAll('[data-play]').forEach(b=>b.disabled=b.disabled||!session.can('play'));
   if(menu)saveMenu();
  }
  async function connect(c){
   if(changing||dead)return;changing=true;message('読み込み中…');
   const next=api.makeSession(c,{reopen:Campaign&&config?()=>Campaign.open({slot_id:config.slot_id}):null}),r=await next.refresh({preserveLocal:false});
   changing=false;if(dead){next.dispose();return;}
   if(!r.ok){next.dispose();startupError=reason(r.error);message(startupError);return;}
   child?.dispose();child=null;unsubscribe?.();session?.dispose();session=next;kind=null;sceneRequested=false;
   $('[data-start]').hidden=true;message('');unsubscribe=session.subscribe(render);menu=false;saveMenu();
  }
  function stopChild(){child?.dispose();child=null;observer?.disconnect();observer=null;lastSceneToken=null;}
  function render(s){if(dead||!s.view)return;const d=s.view.display_data;
   const next=d.scene&&(d.scene.paused||sceneRequested)?'scene':d.phase==='exploring'?'exploration':'preparation';
   if(next!==kind){stopChild();kind=next;selected=null;$('[data-stage]').replaceChildren();
    if(next==='preparation')child=api.mountPreparation($('[data-stage]'),session);
    if(next==='exploration'&&(explorationRenderer||api.mountExploration))child=(explorationRenderer||api.mountExploration)($('[data-stage]'),{session,display_data:d,onScene:()=>{sceneRequested=true;render(session.state());},onWithdraw:async()=>{if(scopeConfirm())await session.execute('withdraw');}});
   }
   if(next==='scene')renderScene(s);
   if(next==='exploration'){if(child?.update)child.update(d,s);else if(!child)$('[data-stage]').textContent='探索画面の接続部品を読み込めませんでした';}
   controls(s);
   if(next!=='preparation'){
    message(s.error?reason(s.error):s.pending?.kind==='write'?'保存中…':s.pending?'読み込み中…':'');
    const errorBox=root.querySelector('[data-recovery]');errorBox?.remove();
    if(s.error){const node=document.createElement('div');node.dataset.recovery='';node.innerHTML=`${s.canRetry?'<button type="button" data-global="retry">再試行</button>':''}<button type="button" data-global="refresh">最新を読む</button>`;$('[data-message]').append(node);}
   }
   if(next==='scene'&&!s.pending&&!s.error)queueMicrotask(flushDisplayed);
  }
  function renderScene(s){const d=s.view.display_data,key=d.phase+'|'+d.scene.id+'|'+(d.case?.attempts??'');
   if(key!==sceneKey){sceneKey=key;openText=null;seen=new Set();toRecord=new Set();lastSceneToken=null;}
   if(lastSceneToken===s.view.meta.view_token&&$('[data-stage]').firstChild)return;
   lastSceneToken=s.view.meta.view_token;observer?.disconnect();
   const available=texts(d),ids=new Set([...(d.scene.text_ids||[]),...(d.scene.optional_text_ids||[])]),current=available.filter(t=>ids.has(t.id));
   const text=current.find(t=>t.id===openText);
   const labels=new Map();let mainNumber=0,detailNumber=0;
   for(const t of current)labels.set(t.id,t.title||(t.kind==='detail'?'詳しく '+(++detailNumber):'本文 '+(++mainNumber)));
   const body=text?[...new Set([text.short_text,text.detail_text].filter(Boolean))]:[];
   $('[data-stage]').innerHTML=`<div class="cw-scene"><h2>本文</h2><nav>${current.map(t=>`<button type="button" data-text-id="${esc(t.id)}" aria-pressed="${t.id===openText}">${esc(labels.get(t.id))}</button>`).join('')}</nav><div class="cw-scene-body">${text?`<article><h3>${esc(labels.get(text.id))}</h3>${body.map(p=>`<p data-displayed-text="${esc(text.id)}">${esc(p)}</p>`).join('')}</article>`:'<p>読む本文を選んでください</p>'}</div><div class="cw-actions"><button type="button" data-scene-action="back" ${d.scene.paused?'hidden':''}>戻る</button><button type="button" data-scene-action="continue" ${!d.scene.paused?'hidden':''}>進む</button><button type="button" data-scene-action="withdraw" ${!d.scene.can_withdraw?'hidden':''}>撤退</button></div></div>`;
   const article=root.querySelector('[data-displayed-text]');
   if(article&&(text.short_text||text.detail_text)){
    observer=new IntersectionObserver(entries=>{for(const en of entries){if(!document.hidden&&en.isIntersecting&&en.intersectionRatio>0){toRecord.add(en.target.dataset.displayedText);flushDisplayed();}}},{root:null,threshold:0.01});observer.observe(article);
   }
  }
  async function flushDisplayed(){
   if(recording||!session||kind!=='scene'||dead)return;const s=session.state(),d=s.view?.display_data;
   if(s.pending||s.error||s.localDirty||!(session.can('record_displayed_text')||session.can('continue_scene')))return;
   const ids=[...toRecord].filter(id=>!seen.has(id));if(!ids.length)return;
   const key=sceneKey,scene_id=d.scene.id;recording=true;
   const r=await session.recordDisplayed(scene_id,ids);recording=false;
   if(dead||key!==sceneKey)return;
   if(r.ok){ids.forEach(id=>{seen.add(id);toRecord.delete(id);});controls(session.state());queueMicrotask(flushDisplayed);}
  }
  root.addEventListener('click',async e=>{
   const text=e.target.closest('[data-text-id]');if(text){openText=text.dataset.textId;lastSceneToken=null;render(session.state());return;}
   const scene=e.target.closest('[data-scene-action]');if(scene&&!scene.disabled){const s=session.state(),d=s.view.display_data;
    if(scene.dataset.sceneAction==='back'){sceneRequested=false;if(!d.scene.paused){kind=null;render(s);}return;}
    if(scene.dataset.sceneAction==='continue'){sceneRequested=false;await session.execute('continue_scene',{scene_id:d.scene.id,advance:true,displayed_text_ids:[...seen]});}
    if(scene.dataset.sceneAction==='withdraw'&&scopeConfirm())await session.execute('withdraw');return;
   }
   const b=e.target.closest('[data-global]');if(!b||b.disabled)return;const a=b.dataset.global;
   try{
    if(a==='menu'){menu=!menu;saveMenu();return;}
    if(a==='scene'){if(!session?.state().view.display_data.scene)return;if(session.state().localDirty){message(reason({code:'unsaved_draft'}));return;}sceneRequested=true;render(session.state());return;}
    if(a==='retry'){await session?.retry();return;}if(a==='refresh'){await session?.refresh();return;}
    if(a==='close-detail'){selected=null;render(session.state());return;}
    if(a==='withdraw'){if(session.can('withdraw')&&scopeConfirm())await session.execute('withdraw');return;}
    if(a==='export'){const raw=await session.exportSave(),data=typeof raw==='string'?raw:JSON.stringify(raw,null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='crossweave-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('書き出しデータを作成しました');return;}
    if(!launcher)return;
    let r;if(a==='retry-start')r=await launcher.retry();if(a==='open')r=await launcher.open();if(a==='create')r=await launcher.create();if(a==='import'){rawImport=$('[data-import-document]').value;r=await launcher.importSave(rawImport);}
    if(r?.ok)await connect(r.controller);else if(r){message(reason(r.error));if(menu)$('[data-import-error]').textContent=reason(r.error);if(launcher.state().canRetry){const retry=document.createElement('button');retry.type='button';retry.dataset.global='retry-start';retry.textContent='同じ要求を再試行';$('[data-message]').append(retry);}}
   }catch(err){message(reason(err));}
  },{signal:events.signal});
  function scopeConfirm(){return globalThis.confirm('今回の探索から撤退しますか？');}
  root.addEventListener('input',e=>{if(e.target.matches('[data-import-document]'))rawImport=e.target.value;},{signal:events.signal});
  root.addEventListener('change',async e=>{if(e.target.matches('[data-import-file]')){const f=e.target.files?.[0];if(!f)return;try{rawImport=await f.text();if(!dead)saveMenu();}catch{message('ファイルを読めません。元ファイルは変更していません');}}},{signal:events.signal});
  const offLauncher=launcher?.subscribe(s=>{root.querySelectorAll('[data-global="open"],[data-global="create"],[data-global="import"]').forEach(b=>b.disabled=s.pending||s.canRetry||!!session||(s.active&&b.dataset.global!=='open'));});
  start();if(controller)connect(controller);
  return {get session(){return session;},dispose(){dead=true;stopChild();unsubscribe?.();session?.dispose();launcher?.dispose();offLauncher?.();events.abort();root.replaceChildren();}};
 };})(globalThis.CrossweaveUI);
