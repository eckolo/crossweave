/* AD: public experience -> persistent knowledge -> a different exploration. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const I=require('./information.js'),K=require('./knowledge.js');
const {inputs,T,copy,hash,bundleFor,choose}=require('./continuity_study.cjs');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const cfg=read('knowledge_inputs.json'),info=read(cfg.information_input),version=info.card_version;
const z=read('event_results.json'),ab=read('route_choice_results.json');
const profiles=[...new Set(Object.values(info.profiles))];
const checks={baseline_final_hashes:0,settled_carries:0,reward_settlement_unchanged:0,
  saved_fact_tails:0,duplicate_fact_replays:0,next_run_scopes:0,unseen_catalogues_closed:0,
  observed_only_catalogues_closed:0,retirement_not_resolution:0,other_actor_defeat:0,
  two_exploration_merges:0,version_separation:0,variant_separation:0,unsettled_carry_rejected:0,
  conflicting_observation_rejected:0,conflicting_catalogue_rejected:0,encounter_before_any_card_retained:0};

// Build the authored fixed Z profile in an isolated, unused game. No live
// actor's private holdings or random order are the source of a knowledge grant.
function authoredCatalogues(){
  const g=new T.Game(bundleFor('guard5',inputs[0]));g.enter('V1',0);g.enter('E1',0);
  const registry={[version]:{}};
  for(const w of ['V0','V1','E1']){
    const profile=info.profiles[w],ledger=I.empty();
    I.add(ledger,{id:w,run:'authored-profile',version,profile,kind:'initial_catalogue_grant',complete:true,
      evidence:'fixed Z initial profile',cards:g.s.actors[w].deck.map(id=>({card:g.s.cards[id],initial_count:1}))});
    const cards=ledger.events[0].cards;
    if(registry[version][profile])assert.deepEqual(cards,registry[version][profile]);
    registry[version][profile]=cards;
  }
  return registry;
}
const catalogues=authoredCatalogues();

class Recorded extends T.Game{
  constructor(bundle,run){super(bundle);this.run=run;this.facts=[];this.seenActors=new Set();this.arrival=null;this.contacts();}
  fact(data){this.facts.push({id:`${this.run}:fact:${this.facts.length+1}`,run:this.run,version,time:this.s.now,...data});}
  contacts(){
    for(const [actor,a] of Object.entries(this.s.actors))if(a.active&&info.profiles[actor]&&!this.seenActors.has(actor)){
      this.fact({kind:'encounter',actor,profile:info.profiles[actor]});this.seenActors.add(actor);
    }
  }
  play(w,choice){
    const played=I.card(this.s.cards[choice.card_id]),oldEvents=this.s.events.length;
    const oldRewards=new Set(Object.keys(this.s.rewards));
    const oldActive=Object.keys(this.s.actors).filter(a=>this.s.actors[a].active);
    super.play(w,choice);
    if(info.profiles[w])this.fact({kind:'observed_card',actor:w,profile:info.profiles[w],card:played});
    const resolved=new Set();
    for(const e of this.s.events.slice(oldEvents)){
      const target=({V0_traversed:'V0',V1_traversed:'V1',enemy_defeated:'E1'})[e.event];
      if(target){
        this.fact({kind:'resolution',actor:target,profile:info.profiles[target],
          result:target==='E1'?'defeated':'traversed',by:e.attacker});resolved.add(target);
      }
    }
    for(const actor of oldActive)if(info.profiles[actor]&&!this.s.actors[actor].active&&!resolved.has(actor)){
      this.fact({kind:'resolution',actor,profile:info.profiles[actor],result:'retired'});
    }
    for(const [key,r] of Object.entries(this.s.rewards))if(!oldRewards.has(key))this.fact({
      kind:'observed_reward',profile:info.profiles[r.source]||'obstacle-Z',reward_key:key,
      label:({R:'障害物報酬',T0:'初区間踏破報酬',E:'敵個別報酬',T1:'最終環境踏破報酬'})[key]+'（具体内容未設定）'});
    this.contacts();
    if(!this.arrival&&this.s.current_event==='followup')this.arrival={game:this.save(),facts:copy(this.facts)};
  }
}
function run(c){
  const bundle=bundleFor(c.build,inputs.find(i=>i.seed===c.seed)),g=new Recorded(bundle,c.id);
  while(!g.s.outcome){g.advance();g.trace=[];if(!g.s.outcome)g.step(choose(g,c.route,c.policy,c.followup));g.trace=[];}
  const match=r=>r.seed===c.seed&&r.build===c.build&&r.route===c.route&&r.policy===c.policy;
  const expected=c.followup==='exit_first'?ab.rows.find(match).exit_first:z.runs.find(r=>r.scenario==='chain'&&match(r));
  assert.equal(hash(g.save()),expected.final_hash);checks.baseline_final_hashes++;
  return {c,bundle,g};
}
const learning=cfg.learning_cases.map(run),evaluation=run(cfg.evaluation_case);
const cases=learning.map(({c,bundle,g})=>({id:c.id,bundle,game:g.save(),facts:g.facts}));
for(const {c,bundle,g} of learning.slice(0,2)){
  const withdrawal=new T.Game(copy(bundle),copy(g.arrival.game));withdrawal.settle('withdrawal');
  cases.push({id:c.id+'-arrival-withdrawal',bundle,game:withdrawal.save(),facts:g.arrival.facts});
}

function knownSummary(ledger,profile,run=null,actor=null){
  const v=I.profileView(ledger,profile,version,run,actor);
  const observed=[...v.observed_by_current_actor,...v.observed_elsewhere_this_run,...v.observed_earlier];
  const observedSignatures=new Set(observed.map(r=>I.signature(r.card)));
  const initial=catalogues[version][profile],initialSignatures=new Set(initial.map(r=>I.signature(r.card)));
  const matching=initial.filter(r=>observedSignatures.has(I.signature(r.card)));
  return {
    profile,initial_catalogue_open:!!v.initial_catalogue,
    initial_count_shown:v.initial_catalogue?v.initial_catalogue.cards.reduce((n,r)=>n+r.initial_count,0):null,
    observed_variants:observedSignatures.size,
    reward_channels:v.confirmed_reward_candidates.map(r=>r.reward_key),
    // Diagnostic oracle only. These missing/full counts are not a player view.
    diagnostic:{initial_variants:initial.length,matching_initial_variants:matching.length,
      outside_initial_variants:[...observedSignatures].filter(k=>!initialSignatures.has(k)).length,
      unobserved_initial_cards:initial.filter(r=>!observedSignatures.has(I.signature(r.card))).map(r=>r.card.name+'／'+r.card.attr)},
    observation_events:ledger.events.filter(e=>e.profile===profile&&e.kind==='observed_card').length
  };
}
function nextNewCards(before,profile){
  const known=I.profileView(before,profile,version,null),seen=new Set([
    ...(known.initial_catalogue?.cards||[]),...known.observed_earlier].map(r=>I.signature(r.card)));
  const novel=new Map();
  for(const e of evaluation.g.facts)if(e.kind==='observed_card'&&e.profile===profile&&!seen.has(I.signature(e.card))){
    seen.add(I.signature(e.card));novel.set(I.signature(e.card),e.card.name+'／'+e.card.attr);
  }
  return [...novel.values()];
}

const rows=[],departureSamples=[];
for(const c of cases){
  const stateHash=hash(c.game),settlement=copy(c.game.state.settlement);
  const alternatives=[];
  for(const policy of cfg.disclosure_candidates){
    const current=K.replay(c.facts,policy,catalogues);
    const mid=Math.floor(c.facts.length/2),saved=JSON.parse(JSON.stringify(K.replay(c.facts.slice(0,mid),policy,catalogues)));
    assert.deepEqual(K.replay(c.facts.slice(mid),policy,catalogues,saved),current);checks.saved_fact_tails++;
    assert.deepEqual(K.replay(c.facts,policy,catalogues,current),current);checks.duplicate_fact_replays++;
    const retained=K.carry(I.empty(),current,c.game.state.outcome);
    assert.deepEqual(retained,current);checks.settled_carries++;
    assert.equal(hash(c.game),stateHash);assert.deepEqual(c.game.state.settlement,settlement);checks.reward_settlement_unchanged++;
    const nextFacts=evaluation.g.arrival.facts;
    const next=K.replay(nextFacts,policy,catalogues,retained);
    const v=I.profileView(next,'core-enemy-Z',version,evaluation.c.id,'E1');
    assert.equal(v.observed_by_current_actor.length,0); // Actual arrival, before E1 has acted.
    assert(v.observed_earlier.every(r=>r.evidence_ids.every(id=>id.startsWith(c.facts[0].run+':'))));
    assert.equal(v.current_private_composition,'unknown');assert.equal(v.next_card,'unknown');checks.next_run_scopes++;
    const reended=K.carry(retained,K.replay(evaluation.g.facts,policy,catalogues),evaluation.g.s.outcome);
    assert(retained.events.every(e=>reended.events.some(f=>f.id===e.id)));
    const expectedMerged=K.replay(evaluation.g.facts,policy,catalogues,retained);
    // Repeated disclosure preserves the first provenance, including when runs were recorded independently.
    for(const p of profiles){
      assert.deepEqual(I.profileView(reended,p,version,'after-two'),I.profileView(expectedMerged,p,version,'after-two'));
    }
    checks.two_exploration_merges++;
    if(policy==='observations_only'){
      assert(!retained.events.some(e=>e.kind==='initial_catalogue_grant'));checks.observed_only_catalogues_closed++;
    }
    const summaries=profiles.map(p=>({...knownSummary(retained,p),
      new_observed_variants_in_N1:nextNewCards(retained,p)}));
    alternatives.push({policy,retained_evidence:retained.events.length,profiles:summaries,
      at_next_enemy_arrival:{initial_catalogue_open:!!v.initial_catalogue,previous_observed_variants:v.observed_earlier.length,
        current_enemy_observed_variants:v.observed_by_current_actor.length},
      grants:retained.events.filter(e=>e.kind==='initial_catalogue_grant').map(e=>({profile:e.profile,evidence:e.evidence}))});
    if(c.id==='L4')departureSamples.push({case:c.id,policy,
      view:K.departure({briefing:info.briefing,ledger:retained,version,profiles:[...profiles,'obstacle-Z']})});
    if(c.id.endsWith('arrival-withdrawal')){
      const departure=K.departure({briefing:info.briefing,ledger:retained,version,profiles});
      const encounteredEnemy=departure.knowledge.find(p=>p.profile==='core-enemy-Z');
      assert(encounteredEnemy);assert.equal(encounteredEnemy.encounter_history.length,1);
      assert.equal(encounteredEnemy.observed_earlier.length,0);checks.encounter_before_any_card_retained++;
    }
  }
  rows.push({case:c.id,outcome:c.game.state.outcome,p_actions:c.game.state.actors.P.actions,
    settlement,public_facts:c.facts.length,
    resolutions:c.facts.filter(e=>e.kind==='resolution').map(e=>({actor:e.actor,result:e.result,time:e.time})),alternatives});
}

// The three policies intentionally differ only at these disclosure boundaries.
const encountered={id:'S:e',run:'S',version,profile:'core-enemy-Z',actor:'E1',kind:'encounter'};
const retired={...encountered,id:'S:r',kind:'resolution',result:'retired'};
const defeated={...retired,id:'S:d',result:'defeated',by:'V1'};
const onlyEnvironment=learning[0].g.facts.slice(0,1);
assert.equal(onlyEnvironment[0].actor,'V0');
for(const p of cfg.disclosure_candidates){
  const ledger=K.replay(onlyEnvironment,p,catalogues);
  assert.equal(I.profileView(ledger,'core-enemy-Z',version,'S').initial_catalogue,null);checks.unseen_catalogues_closed++;
}
const beforeVictory=K.replay([encountered,retired],'first_resolution',catalogues);
assert.equal(beforeVictory.events.length,0);checks.retirement_not_resolution++;
const afterOtherKill=K.replay([encountered,defeated],'first_resolution',catalogues);
assert(I.profileView(afterOtherKill,'core-enemy-Z',version,'S').initial_catalogue);checks.other_actor_defeat++;
const conflicting=copy(afterOtherKill);conflicting.events[0].id='S:conflict';conflicting.events[0].cards[0].initial_count++;
assert.throws(()=>K.carry(afterOtherKill,conflicting,'clear'),/Conflicting initial catalogues/);checks.conflicting_catalogue_rejected++;
const old=I.profileView(afterOtherKill,'core-enemy-Z','later-content','N1','E1');
assert.equal(old.initial_catalogue,null);assert.equal(old.historical_evidence_count,1);checks.version_separation++;
assert.equal(I.profileView(afterOtherKill,'visually-similar-other-profile',version,'N1','E1').initial_catalogue,null);checks.variant_separation++;
assert.throws(()=>K.carry(I.empty(),afterOtherKill,'cutoff'),/not settled/);checks.unsettled_carry_rejected++;
const observed=learning[0].g.facts.find(e=>e.kind==='observed_card');
assert.throws(()=>K.replay([observed,{...observed,card:{...observed.card,power:999}}],'observations_only',catalogues),/Conflicting evidence/);checks.conflicting_observation_rejected++;

// Identical public observations can come from different initial multiplicities.
// Never certify a full catalogue merely because every observed kind was counted.
const firstCard=catalogues[version]['core-enemy-Z'][0].card,secondCard=catalogues[version]['core-enemy-Z'][1].card;
const ambiguousWorlds=[
  {X:2,Y:10,public_sequence:['X','Y','X']},
  {X:8,Y:4,public_sequence:['X','Y','X']}
];
assert.deepEqual(ambiguousWorlds[0].public_sequence,ambiguousWorlds[1].public_sequence);
const ambiguityLedger=K.replay(['X','Y','X'].map((k,n)=>({id:'A:'+n,run:'A',version,profile:'core-enemy-Z',actor:'E1',
  kind:'observed_card',time:n,card:k==='X'?firstCard:secondCard})),'observations_only',catalogues);
assert.equal(I.profileView(ambiguityLedger,'core-enemy-Z',version,'A','E1').initial_catalogue,null);

const sources=['knowledge.js','knowledge_inputs.json','knowledge_study.cjs','information.js','information_inputs.json',
  'continuity_study.cjs','event_inputs.py','event_results.json','route_choice_results.json','engine.js','feedback.js','ecology.js','terrain.js','input.json'];
const result={version:'AD1',base_commit:cfg.base_commit,adopted_retention:cfg.adopted_retention,limits:cfg.limits,checks,
  sources:Object.fromEntries(sources.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')])),
  authored_initial_catalogues:catalogues,
  evaluation:{...cfg.evaluation_case,outcome:evaluation.g.s.outcome,p_actions:evaluation.g.s.actors.P.actions,final_hash:hash(evaluation.g.save())},
  rows,departure_samples:departureSamples,
  synthetic:{third_party_defeat_opens_trial_catalogue:true,live_retirement_does_not_open_resolution_trial:true,
    same_observation_different_initial_counts:ambiguousWorlds}};
fs.writeFileSync(path.join(__dirname,'knowledge_results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checks,evaluation:result.evaluation,rows:rows.map(r=>({...r,alternatives:r.alternatives.map(a=>({...a,grants:undefined}))})),
  bytes:fs.statSync(path.join(__dirname,'knowledge_results.json')).size},null,2));
