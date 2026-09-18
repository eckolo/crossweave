// Public browser/Node entry. All commands are explicit, durable, and awaitable.
import C from '../content/m1.mjs';
import {IndexedDBStore} from './storage.mjs';
import {copy,check,canonical,fail,integer} from './common.mjs';
import {validateDocument,safeID} from './validate.mjs';
import {project,token,capabilities,actionPreview} from './view.mjs';
import {preview,planFor,draftFor,checkPlanShape} from './preparation.mjs';
import {departGame,restoreGame} from './game.mjs';
import {nextMode,publishScene,publishConditionals,recordDisplayed} from './story.mjs';
import {settle,rewardLedger} from './settlement.mjs';
import {publicContract} from './action-public.mjs';
const uuid=()=>globalThis.crypto.randomUUID();
const typedError=error=>fail(error).error;
function assertToken(d,t){check(t===token(d),'stale_view','view_token');}
function requireCapability(d,type){const a=capabilities(d)[type];check(a?.available,a?.reasons[0]||'feature_not_connected','type');}
function assertPayload(payload,allowed) {
  check(payload&&typeof payload==='object'&&!Array.isArray(payload),'invalid_payload','payload');
  check(Object.keys(payload).every(k=>allowed.includes(k)),'unexpected_payload_field','payload');
}
function syncGame(d,g) {
  // Also covers an old save whose currently owned, now-public deck was not
  // recorded by the old hand-only observation rule. A pure read never writes.
  g.observeOwnedCards([...g.s.actors.P.hand,...g.s.actors.P.deck]);
  const s=d.session;s.game=g.save();s.active.reward_ledger=rewardLedger(s);
  for(const row of g.trace.filter(e=>['action','boundary'].includes(e.type)))s.action_history.push(copy(row));
  if(s.game.state.outcome){settle(d);const scene=s.game.state.pending_scene||'SCN-001-S06';s.game.state.pending_scene=null;publishScene(d,scene);}
  else if(s.game.state.pending_scene){const scene=s.game.state.pending_scene;s.game.state.pending_scene=null;publishScene(d,scene);}
  publishConditionals(d);
}
class CampaignController {
  #document; #store; #slot;
  constructor(store,slot,document){this.#store=store;this.#slot=slot;this.#document=document;}
  inspect(){return project(this.#document);}
  previewPreparation({view_token,plan}={}) {
    try{assertToken(this.#document,view_token);requireCapability(this.#document,'previewPreparation');return project(this.#document,{preparation_comparison:preview(this.#document.session,plan).display});}
    catch(error){return project(this.#document,{error:typedError(error)});}
  }
  quoteConversion({view_token}={}) {
    try{assertToken(this.#document,view_token);requireCapability(this.#document,'quoteConversion');}
    catch(error){return project(this.#document,{error:typedError(error)});}
  }
  previewAction({view_token,choice}={}) {
    try{assertToken(this.#document,view_token);requireCapability(this.#document,'previewAction');const game=restoreGame(this.#document.session);
      check(game.choices().some(c=>canonical(c)===canonical(choice)),'illegal_choice','choice');
      return project(this.#document,{action_preview:actionPreview(this.#document,choice)});}
    catch(error){return project(this.#document,{error:typedError(error),action_preview:{supported:false,reason:error.code||'invalid_request',mode:null,matched_field_id:null,actual_hp_loss:null,hit_gain:null,hit_connected:null,hp_restored:null,guard:null,action_cost:null,passive_effects:null,next_self_reservation:null,current_reservations:null,unused_hand_expiry:null,actor_changes:null,resolution_scope:null}});}
  }
  exportSave(){return copy(this.#document);}
  async execute(command) {
    try {
      check(command&&typeof command==='object','invalid_request');safeID(command.request_id,'request_id');
      check(typeof command.type==='string'&&integer(command.expected_revision),'invalid_request');
      // Semantic request signature deliberately excludes a refreshed revision/token.
      const signature=canonical({type:command.type,payload:command.payload});
      const saved=await this.#store.load(this.#slot);check(saved,'save_not_found');const current=validateDocument(saved);
      const prior=Object.hasOwn(current.request_log,command.request_id)?current.request_log[command.request_id]:null;
      if(prior){check(prior.signature===signature,'request_conflict','request_id');this.#document=current;
        return project(current,{operation:{status:'replayed',committed_revision:prior.committed_revision}});}
      check(command.expected_revision===current.revision,'stale_revision','expected_revision',{actual_revision:current.revision});assertToken(current,command.view_token);
      const next=copy(current),s=next.session,{type,payload}=command;
      if(type!=='continue_scene')requireCapability(next,type);
      if(type==='save_draft'){assertPayload(payload,['plan']);checkPlanShape(payload.plan);next.draft=draftFor(s,payload.plan,next.revision);}
      else if(type==='discard_draft'){assertPayload(payload,[]);next.draft=draftFor(s,planFor(s),next.revision);}
      else if(type==='commit_preparation'){
        assertPayload(payload,['plan']);const result=preview(s,payload.plan);
        check(result.ok,result.display.refusal?.code||'invalid_plan',result.display.refusal?.field,result.display.refusal?.details);
        next.session=result.next;next.draft=draftFor(next.session,planFor(next.session),next.revision);
      }else if(type==='depart'){
        assertPayload(payload,['case_id']);check(payload.case_id==='SCN-001','case_not_available','case_id');
        const c=next.casebook[payload.case_id],mode=nextMode(c),target_set_id=mode==='revisit'?'SCN-001-SET-REVISIT':'SCN-001-SET-UNRESOLVED';
        const index=s.nextRun;check(index<Number.MAX_SAFE_INTEGER,'run_index_exhausted');const run=JSON.stringify(['CW-M1-run-1',s.campaign_id,index]);
        const previousKnowledge=copy(s.economy.profile.knowledge);
        s.active={run,index,seed:index,case_id:payload.case_id,content_set_id:C.content_set_id,mode,target_set_id,targets:copy(C.target_sets[target_set_id].slot_map),
          published_clue_ids:[],read_text_ids:[],reward_ledger:{},published_scene_ids:[],emitted_conditionals:[],departure_case_state:{status:c.status,attempts_before:c.attempts}};
        s.game=await departGame({target_set_id,run,seed:index,deck:s.au.deck,equipped:s.economy.aq.equipped,learned:Object.keys(s.economy.profile.learned),knowledge:previousKnowledge});
        s.phase='exploring';s.economy.profile.phase='exploring';s.economy.profile.run=run;s.nextRun++;c.attempts++;s.action_history=[];next.draft=null;
        publishScene(next,mode==='revisit'?'SCN-001-S02R':'SCN-001-S02',{knowledge:previousKnowledge});
      }else if(type==='continue_scene'){
        assertPayload(payload,['scene_id','advance','displayed_text_ids']);check(payload.advance===undefined||typeof payload.advance==='boolean','invalid_advance','advance');
        const advance=payload.advance??true;
        requireCapability(next,advance?'continue_scene':'record_displayed_text');
        recordDisplayed(next,{...payload,displayed_text_ids:payload.displayed_text_ids??(advance?[...s.scene.text_ids]:[])});
        if(advance){const spec=C.scenes[s.scene.id];s.scene.pause=false;
          if(spec.next_scene_id)publishScene(next,spec.next_scene_id);
          else {const game=restoreGame(s);game.advance();syncGame(next,game);}}
      }else if(type==='play'){
        assertPayload(payload,['choice']);const game=restoreGame(s);
        check(game.choices().some(c=>canonical(c)===canonical(payload.choice)),'illegal_choice','choice');
        game.step(payload.choice);if(!game.s.pending_scene&&!game.s.outcome)game.advance();syncGame(next,game);
      }else if(type==='withdraw'){
        assertPayload(payload,[]);const game=restoreGame(s);game.s.pending_scene=null;game.settle('withdrawal');syncGame(next,game);
      }else if(type==='ack_return'){
        assertPayload(payload,[]);s.phase='home';s.active=null;s.game=null;s.action_history=[];
        next.draft=draftFor(s,planFor(s),next.revision);publishScene(next,'SCN-001-S07');
      }else check(false,'feature_not_connected','type');
      check(current.revision<Number.MAX_SAFE_INTEGER,'revision_exhausted');next.revision++;
      next.view_nonce=uuid();if(next.draft)next.draft=draftFor(next.session,next.draft.plan,next.revision);
      next.request_log[command.request_id]={signature,committed_revision:next.revision};
      validateDocument(next);
      try {await this.#store.commit(this.#slot,current.revision,next);}
      catch(error){
        // Another tab may have committed this SAME request while we computed.
        // Re-read only; never replay the game calculation after a lost CAS.
        if(error.code==='stale_revision'){
          const latest=validateDocument(await this.#store.load(this.#slot));
          const same=Object.hasOwn(latest.request_log,command.request_id)?latest.request_log[command.request_id]:null;
          if(same){check(same.signature===signature,'request_conflict','request_id');this.#document=latest;
            return project(latest,{operation:{status:'replayed',committed_revision:same.committed_revision}});}
        }
        throw error;
      }
      this.#document=next;return project(next,{operation:{status:'committed',committed_revision:next.revision}});
    }catch(error){return project(this.#document,{error:typedError(error)});}
  }
}
export function createCampaign({storage=new IndexedDBStore()}={}) {
  return {
    async create({slot_id,rule_set_id,content_set_id,request_id}) {
      safeID(slot_id,'slot_id');safeID(request_id,'request_id');check(rule_set_id===C.rule_set_id,'unsupported_rule_set');check(content_set_id===C.content_set_id,'unsupported_content_set');
      check(await storage.load(slot_id)===null,'slot_not_empty','slot_id');
      const profile={schema:'AH1',phase:'home',run:null,points:0,learned:{},materials:{},unlocked:copy(C.initial.unlocked),clears:[],knowledge:{schema:'AD1',events:[],encounters:[]},returns:{}};
      const economy={schema:'AP1',profile,remainder:0,inventory:{},known:{},runs:{},sales:{},references:{},aq:{policy:'cost',equipped:[]},at:{current:null,batches:{},purchases:{},returns:{},pending_contexts:[]}};
      const d={schema:'CW-M1-save-1',rule_set_id,content_set_id,engine_version:C.engine_version,revision:0,view_nonce:uuid(),
        session:{campaign_id:uuid(),phase:'home',nextRun:0,economy,au:{deck:Object.entries(C.initial.deck_counts).sort().flatMap(([base,n])=>Array(n).fill('base:'+base))},
          active:null,game:null,scene:null,receipts:{},action_history:[]},draft:null,casebook:copy(C.initial.casebook),request_log:{},public_history:[]};
      d.request_log[request_id]={signature:canonical({type:'create',payload:{rule_set_id,content_set_id}}),committed_revision:0};publishScene(d,'SCN-001-S01');validateDocument(d);
      await storage.commit(slot_id,null,d);return new CampaignController(storage,slot_id,d);
    },
    async open({slot_id}) {safeID(slot_id,'slot_id');const saved=await storage.load(slot_id);check(saved,'save_not_found','slot_id');return new CampaignController(storage,slot_id,validateDocument(saved));},
    async importSave({slot_id,document,request_id}) {
      safeID(slot_id,'slot_id');safeID(request_id,'request_id');check(await storage.load(slot_id)===null,'slot_not_empty','slot_id');
      let parsed=document;if(typeof document==='string'){try{parsed=JSON.parse(document);}catch{check(false,'invalid_save_json','document');}}
      const d=validateDocument(parsed);check(!Object.hasOwn(d.request_log,request_id),'request_conflict','request_id');check(d.revision<Number.MAX_SAFE_INTEGER,'revision_exhausted');
      d.revision++;d.view_nonce=uuid();if(d.draft)d.draft=draftFor(d.session,d.draft.plan,d.revision);
      d.request_log[request_id]={signature:canonical({type:'importSave',payload:{source_revision:parsed.revision}}),committed_revision:d.revision};validateDocument(d);
      await storage.commit(slot_id,null,d);return new CampaignController(storage,slot_id,d);
    }
  };
}
export const Campaign=createCampaign();
export const versions=Object.freeze({schema:'CW-M1-save-1',rule_set_id:C.rule_set_id,content_set_id:C.content_set_id,engine_version:C.engine_version,input_version:C.version,public_contract:publicContract});
