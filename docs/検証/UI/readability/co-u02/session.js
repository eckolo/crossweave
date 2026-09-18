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
