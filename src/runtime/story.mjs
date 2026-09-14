import C from '../content/m1.mjs';
import {copy,check} from './common.mjs';
const caseID='SCN-001';
export function nextMode(caseState) {return caseState.status==='resolved'?'revisit':caseState.attempts?'retry':'first';}
export function context(d, sceneID=d.session.scene?.id, knowledgeOverride=null) {
  const s=d.session,a=s.active,c=d.casebook[caseID],k=knowledgeOverride||s.game?.state.ah.knowledge||s.economy.profile.knowledge;
  const actor=C.targets['SCN-001-ACT02'];
  return {mode:a?.mode||nextMode(c),scene_id:sceneID,outcome:s.game?.state.outcome||null,
    clues:Object.fromEntries(Object.keys(C.clues).map(id=>[id.slice(8),c.visible_clue_ids.includes(id)])),
    known_actor:{ACT02:k.encounters.some(e=>e.profile===actor.knowledge_profile_id)},
    catalogue:{ACT02:k.events.some(e=>e.kind==='initial_catalogue_grant'&&e.profile===actor.knowledge_profile_id&&e.version===actor.catalogue_version)},
    current:{t1:!!s.game&&(!!s.game.state.rewards['SCN-001-RW01']||!!s.game.state.rewards['SCN-001-RW04']),
      cause_public:!!a?.published_scene_ids.some(id=>['SCN-001-S04','SCN-001-S04R'].includes(id)),
      enemy_result:s.game?.state.ah.enemy_result||null,borrowed_first:s.game?.state.ah.borrowed_first||{}},
    resuming_unsettled:false,resuming_settled:false};
}
export function eligible(condition, ctx) {
  if(condition.all)return condition.all.every(c=>eligible(c,ctx));
  if(condition.any)return condition.any.some(c=>eligible(c,ctx));
  if(condition.not)return !eligible(condition.not,ctx);
  const [path,wanted]=condition.eq||condition.in||[];
  check(typeof path==='string','invalid_text_condition');
  let value=path.split('.').reduce((v,k)=>v?.[k],ctx);
  if(value===undefined&&typeof wanted==='boolean')value=false;
  check(value!==undefined,'missing_text_context',path);
  return condition.eq?value===wanted:wanted.includes(value);
}
function history(d,kind,scene,ids,ctx) {
  const event={id:`M1-public:${d.revision}:${d.public_history.length+1}`,kind,scene_id:scene,run:d.session.active?.run||null,text_ids:copy(ids),context:copy(ctx)};
  d.public_history.push(event);return event.id;
}
function clueFacts(d, ids, eventID) {
  const c=d.casebook[caseID],a=d.session.active;
  for(const [id,clue] of Object.entries(C.clues))if(clue.publication_text_ids.some(t=>ids.includes(t))) {
    if(id==='SCN-001-CL04'&&!(a&&d.session.receipts[a.run]?.outcome==='clear'&&a.mode!=='revisit'))continue;
    if(!c.visible_clue_ids.includes(id)){c.visible_clue_ids.push(id);c.first_clue_events[id]=eventID;}
    if(a&&!a.published_clue_ids.includes(id))a.published_clue_ids.push(id);
  }
}
export function publishScene(d,id,{knowledge=null}={}) {
  const spec=C.scenes[id];check(spec,'unknown_scene');
  const ctx=context(d,id,knowledge), a=d.session.active;
  const selected=Object.entries(C.texts).filter(([,t])=>['main','conditional'].includes(t.kind)&&eligible(t.eligible_when,ctx)).map(([id])=>id);
  const ids=selected.filter(id=>C.texts[id].kind!=='conditional'||!a?.emitted_conditionals.includes(id));
  const optional=Object.entries(C.texts).filter(([,t])=>t.kind==='detail'&&eligible(t.eligible_when,ctx)).map(([id])=>id);
  const event=history(d,'scene',id,ids,ctx);
  d.session.scene={id,pause:spec.pause,text_ids:ids,optional_text_ids:optional,publication_event_id:event,context:ctx};
  if(a){if(!a.published_scene_ids.includes(id))a.published_scene_ids.push(id);for(const t of ids)if(C.texts[t].kind==='conditional'&&!a.emitted_conditionals.includes(t))a.emitted_conditionals.push(t);}
  clueFacts(d,ids,event);
}
export function publishConditionals(d) {
  const a=d.session.active,scene=d.session.scene;if(!a||!scene)return;
  const ctx=context(d),ids=Object.entries(C.texts).filter(([id,t])=>t.kind==='conditional'&&!a.emitted_conditionals.includes(id)&&eligible(t.eligible_when,ctx)).map(([id])=>id);
  if(!ids.length)return;
  history(d,'conditional',scene.id,ids,ctx);scene.text_ids.push(...ids);a.emitted_conditionals.push(...ids);
}
export function recordDisplayed(d,payload) {
  const scene=d.session.scene;check(scene&&payload.scene_id===scene.id,'stale_scene','scene_id');
  const ids=payload.displayed_text_ids??[];
  check(Array.isArray(ids)&&ids.every(x=>typeof x==='string')&&new Set(ids).size===ids.length,'invalid_displayed_text_ids','displayed_text_ids');
  const allowed=[...scene.text_ids,...scene.optional_text_ids];
  for(const id of ids)check(allowed.includes(id),'text_not_available','displayed_text_ids',{related_ids:[id]});
  if(!ids.length)return;
  const c=d.casebook[caseID],a=d.session.active;
  for(const id of ids){
    const source=d.public_history.findLast(e=>e.scene_id===scene.id&&e.kind!=='displayed'&&e.text_ids.includes(id));
    const event=history(d,'displayed',scene.id,[id],source?.context||scene.context);
    if(!c.read_text_ids.includes(id))c.read_text_ids.push(id);if(a&&!a.read_text_ids.includes(id))a.read_text_ids.push(id);
    clueFacts(d,[id],event);
  }
}
export function publicStory(d) {
  const ctx=context(d),scene=d.session.scene;
  const objective=Object.entries(C.texts).find(([,t])=>t.kind==='objective'&&eligible(t.eligible_when,ctx))?.[0]||null;
  const ids=[...(scene?.text_ids||[]),...(scene?.optional_text_ids||[]),...(objective?[objective]:[])];
  const texts=Object.fromEntries(ids.map(id=>[id,{id,title:null,short_text:C.texts[id].short_text,detail_text:C.texts[id].kind==='detail'?C.texts[id].short_text:null,kind:C.texts[id].kind,read:d.casebook[caseID].read_text_ids.includes(id)}]));
  return {objective,texts,scene:scene?{id:scene.id,text_ids:copy(scene.text_ids),optional_text_ids:copy(scene.optional_text_ids),paused:scene.pause,
    can_continue:scene.pause,can_withdraw:d.session.phase==='exploring'}:null};
}
