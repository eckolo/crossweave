/* AC: explicit evidence, unchanged game trajectories, hidden-state equivalence, and knowledge retention alternatives. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const I=require('./information.js'),F=require('./feedback.js');
const {inputs,T,copy,hash,bundleFor,choose}=require('./continuity_study.cjs');
const root=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const cfg=read('information_inputs.json'),prior=read('event_results.json'),version=cfg.card_version;
const checks={baseline_final_hashes:0,public_decisions:0,nonmutating_projections:0,hidden_state_pairs:0,own_order_pairs:0,
  own_stat_change_visible:0,roundtrips:0,duplicate_replays:0,saved_tail_replays:0,actor_scope_cases:0,
  version_change_cases:0,conflicting_evidence_rejections:0,card_variants_separate:0,retention_cases:0,settled_reward_views:0};
const firstBrief=I.departure({briefing:cfg.briefing,ledger:I.empty(),version,profiles:Object.values(cfg.profiles)});
assert.equal(firstBrief.knowledge.length,0);

function grants(b){
  const g=new T.Game(copy(b));g.enter('V1',0);g.enter('E1',0);const ledger=I.empty();
  for(const [w,profile] of [['V1','weak-terrain-Z'],['E1','core-enemy-Z']]){
    I.add(ledger,{id:'fixture:'+profile,run:'earlier-experience-fixture',version,profile,kind:'initial_catalogue_grant',
      complete:true,evidence:'診断で与える既知初期構成。実際の情報解放条件を仮定しない。',
      cards:g.s.actors[w].deck.map(id=>({card:g.s.cards[id],initial_count:1}))});
  }return ledger;
}
function combine(before,current){const l=I.validate(before);for(const e of current.events)I.add(l,e);return l;}
class Recorded extends T.Game{
  constructor(b,run,saved=null,ledger=I.empty(),sequence=0){super(b,saved);this.run=run;this.ledger=I.validate(ledger);this.sequence=sequence;}
  play(w,c){
    const visibleCard=I.card(this.s.cards[c.card_id]),before=new Set(Object.keys(this.s.rewards));
    super.play(w,c);this.sequence++;
    if(cfg.profiles[w])I.add(this.ledger,{id:this.run+':action:'+this.sequence,run:this.run,version,profile:cfg.profiles[w],
      kind:'observed_card',actor:w,time:this.s.now,card:visibleCard});
    for(const [key,r] of Object.entries(this.s.rewards))if(!before.has(key))I.add(this.ledger,{
      id:this.run+':reward:'+key,run:this.run,version,profile:cfg.profiles[r.source]||'obstacle-Z',kind:'observed_reward',
      time:this.s.now,reward_key:key,label:({R:'障害物の報酬',T0:'初区間の踏破報酬',E:'敵撃破の個別報酬',T1:'最終環境の踏破報酬'})[key]+'（具体内容は未設定）'});
  }
}
function view(g,ledger){return I.encounter({publicState:g.public(),ownCatalogue:F.catalogue(g),ledger,version,run:g.run,
  profiles:cfg.profiles,consequences:cfg.consequences[g.s.current_event]||[]});}
function testCurrent(g,experienced,doPair){
  const original=hash(g.save()),fresh=view(g,g.ledger),known=view(g,combine(experienced,g.ledger));
  assert.equal(hash(g.save()),original);checks.nonmutating_projections++;
  assert.deepEqual(fresh.own_cards,known.own_cards);
  for(const actor of known.actors)if(actor.knowledge){
    const k=actor.knowledge;assert.equal(k.current_private_composition,'unknown');assert.equal(k.next_card,'unknown');
    for(const row of k.observed_by_current_actor)for(const id of row.evidence_ids){
      const e=g.ledger.events.find(e=>e.id===id);assert(e&&e.actor===actor.actor&&e.run===g.run);
    }
  }
  const restored=I.validate(JSON.parse(JSON.stringify(g.ledger)));assert.deepEqual(view(g,restored),fresh);checks.roundtrips++;
  const duplicate=restored.events.at(-1);if(duplicate){const n=restored.events.length;I.add(restored,duplicate);assert.equal(restored.events.length,n);checks.duplicate_replays++;}
  if(doPair){
    const changed=new T.Game(copy(g.bundle),copy(g.save()));changed.run=g.run;
    for(const [w,a] of Object.entries(changed.s.actors))if(w!=='P'){
      a.deck.reverse();for(const id of [...a.deck,...a.hand])Object.assign(changed.s.cards[id],{type:'private-card',name:'非公開の差替え',attr:'Z',power:999,hit:999});
    }
    for(const rng of Object.values(changed.rng))rng.uint();
    for(const spec of Object.values(changed.bundle.actor_specs))spec.hp+=999;
    assert.deepEqual(view(changed,g.ledger),fresh);assert.deepEqual(view(changed,combine(experienced,g.ledger)),known);checks.hidden_state_pairs++;
    const reordered=new T.Game(copy(g.bundle),copy(g.save()));reordered.run=g.run;reordered.s.actors.P.deck.reverse();
    assert.deepEqual(view(reordered,g.ledger),fresh);checks.own_order_pairs++;
    const held=reordered.s.actors.P.deck[0]||reordered.s.actors.P.hand[0];
    if(held){reordered.s.cards[held].power+=1;assert.notDeepEqual(view(reordered,g.ledger).own_cards,fresh.own_cards);checks.own_stat_change_visible++;}
  }
  return {fresh,known};
}
function complete(g,cfgCase){while(!g.s.outcome){g.advance();if(g.s.outcome)break;g.step(choose(g,cfgCase.route,cfgCase.policy));g.trace=[];}}
function retentionCase(run,boundary,game,earlier,observed){
  const stateHash=hash(game.save()),settlement=copy(game.s.settlement),beforeIds=new Set(earlier.events.map(e=>e.id));
  const current=view(game,observed).current_rewards;
  assert.deepEqual(current.filter(r=>r.settlement==='kept').map(r=>r.key),settlement.kept);
  assert.deepEqual(current.filter(r=>r.settlement==='lost').map(r=>r.key),settlement.lost);checks.settled_reward_views++;
  const after=cfg.retention_candidates.map(mode=>{
    const ledger=I.carryKnowledge(earlier,observed,game.s.outcome,mode);
    assert.deepEqual(I.validate(JSON.parse(JSON.stringify(ledger))),ledger);
    assert(earlier.events.every(e=>ledger.events.some(f=>f.id===e.id)));
    return {mode,new_evidence_kept:ledger.events.filter(e=>!beforeIds.has(e.id)).length,earlier_evidence_kept:earlier.events.length,
      reward_candidate_keys:[...new Set(ledger.events.filter(e=>e.kind==='observed_reward').map(e=>e.reward_key))]};
  });
  assert.equal(hash(game.save()),stateHash);assert.deepEqual(game.s.settlement,settlement);
  return {run,boundary,outcome:game.s.outcome,kept:settlement.kept,lost:settlement.lost,current_reward_view:current,new_public_evidence:observed.events.length,alternatives:after};
}
const runs=[],samples=[],retention=[];
let experiencedExample=null;
for(const c of cfg.cases){
  const run=`Z${c.seed}:${c.build}:${c.route}:${c.policy}`,b=bundleFor(c.build,inputs.find(i=>i.seed===c.seed)),g=new Recorded(b,run);
  const learned=grants(b);experiencedExample??=I.departure({briefing:cfg.briefing,ledger:learned,version,profiles:[...new Set(Object.values(cfg.profiles))]});
  const seenPhases=new Set();let decisions=0,checkpoint=null;
  while(!g.s.outcome){
    g.advance();g.trace=[];if(g.s.outcome)break;
    const ph=g.s.current_event==='rock'?(g.s.actors.P.rebuilds?'terrain_after_rebuild':'terrain_first'):
      g.s.actors.E1.active?(g.s.actors.E1.rebuilds?'enemy_after_rebuild':'enemy_first'):'enemy_retired';
    const first=!seenPhases.has(ph);const projected=testCurrent(g,learned,first);seenPhases.add(ph);checks.public_decisions++;decisions++;
    if(first&&((samples.length<2&&c===cfg.cases[0])||ph==='enemy_after_rebuild'&&c===cfg.cases[0]||ph==='enemy_retired'&&c===cfg.cases[0])){
      samples.push({run,phase:ph,p_actions:g.s.actors.P.actions,view:projected.known});
    }
    if(!checkpoint&&g.s.current_event==='followup')checkpoint=JSON.parse(JSON.stringify({game:g.save(),ledger:g.ledger,sequence:g.sequence}));
    g.step(choose(g,c.route,c.policy));g.trace=[];
  }
  const old=prior.runs.find(r=>r.scenario==='chain'&&r.seed===c.seed&&r.build===c.build&&r.route===c.route&&r.policy===c.policy);
  assert.equal(hash(g.save()),old.final_hash);assert.equal(decisions,old.decisions);checks.baseline_final_hashes++;
  if(checkpoint){
    const resumed=new Recorded(copy(b),run,checkpoint.game,checkpoint.ledger,checkpoint.sequence);complete(resumed,c);
    assert.equal(hash(resumed.save()),hash(g.save()));assert.deepEqual(resumed.ledger,g.ledger);checks.saved_tail_replays++;
    const withdrawal=new T.Game(copy(b),copy(checkpoint.game));withdrawal.settle('withdrawal');
    retention.push(retentionCase(run,'arrival_withdrawal_counterfactual',withdrawal,learned,checkpoint.ledger));
  }
  const profiles=[...new Set([...Object.values(cfg.profiles),'obstacle-Z'])];
  const k=profiles.map(p=>I.profileView(combine(learned,g.ledger),p,version,run));
  runs.push({run,outcome:g.s.outcome,decisions,final_hash:hash(g.save()),evidence:g.ledger.events.length,
    observed_cards:g.ledger.events.filter(e=>e.kind==='observed_card').length,observed_rewards:g.ledger.events.filter(e=>e.kind==='observed_reward').map(e=>e.reward_key),
    outside_known_initial_variants:k.reduce((n,p)=>n+[...p.observed_by_current_actor,...p.observed_elsewhere_this_run].filter(r=>r.relation_to_initial==='outside_known_initial').length,0),
    phases:[...seenPhases],settlement:g.s.settlement});
  retention.push(retentionCase(run,'natural_end',g,learned,g.ledger));
}
checks.retention_cases=retention.length;

// Deliberately constructed evidence cases cover distinctions a small natural trajectory need not contain.
const synthetic=I.empty(),c0={type:'g',name:'防御',attr:'D',kind:'guard',power:3,hit:0,evasion:0,crit_gain:20,field_power:0,field_hit:0,life:3};
I.add(synthetic,{id:'s:grant',run:'earlier',version,profile:'same-profile',kind:'initial_catalogue_grant',complete:true,evidence:'人工の既知初期構成',cards:[{card:c0,initial_count:2}]});
for(const [id,actor,card] of [['s:a','V0',c0],['s:b','V1',{...c0,evasion:30}]])I.add(synthetic,{id,run:'current',version,profile:'same-profile',kind:'observed_card',actor,time:1,card});
const scoped=I.profileView(synthetic,'same-profile',version,'current','V1');
assert.equal(scoped.observed_by_current_actor.length,1);assert.equal(scoped.observed_elsewhere_this_run.length,1);
assert.equal(scoped.observed_by_current_actor[0].relation_to_initial,'outside_known_initial');
assert.equal(scoped.observed_elsewhere_this_run[0].relation_to_initial,'known_initial_kind');checks.actor_scope_cases++;checks.card_variants_separate++;
const oldVersion=I.profileView(synthetic,'same-profile','new-version','current','V1');assert.equal(oldVersion.initial_catalogue,null);
assert.equal(oldVersion.observed_by_current_actor.length,0);assert.equal(oldVersion.historical_evidence_count,3);checks.version_change_cases++;
assert.throws(()=>I.add(synthetic,{...synthetic.events[1],card:{...c0,power:999}}),/Conflicting evidence/);checks.conflicting_evidence_rejections++;
const conflicting=copy(synthetic);I.add(conflicting,{...synthetic.events[0],id:'s:other-grant',cards:[{card:c0,initial_count:1}]});
assert.throws(()=>I.profileView(conflicting,'same-profile',version,'current','V1'),/Conflicting initial catalogues/);checks.conflicting_evidence_rejections++;
const sources=['information.js','information_inputs.json','continuity_study.cjs','event_inputs.py','event_results.json','engine.js','feedback.js','ecology.js','terrain.js','input.json'];
const result={version:'AC1',base_commit:cfg.base_commit,method:cfg.limits,checks,sources:Object.fromEntries(sources.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')])),
  departure_examples:{first_visit:firstBrief,experienced_fixture:experiencedExample},runs,retention,samples,
  synthetic:{same_name_different_stats:scoped,old_version:oldVersion}};
fs.writeFileSync(path.join(root,'information_results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checks,runs,retention,sample_count:samples.length,bytes:fs.statSync(path.join(root,'information_results.json')).size},null,2));
