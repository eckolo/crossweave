/* AE1: finite contract checks plus two consecutive explorations; no human/balance claim. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const L=require('./expedition_loop.js'),I=require('./information.js'),K=require('./knowledge.js');
const {inputs,T,choose,hash,copy}=require('./continuity_study.cjs');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const source=read('input.json'),info=read('information_inputs.json'),version=info.card_version,cfg=L.cfg;
const cards=L.catalog(source),counts={f:2,h:2,l:2,g:2,r:2,read:1,salve:1};
const authored=new T.Game(T.prepare(source));authored.enter('E1',0);
const catalogues={[version]:{}};
for(const w of ['V0','E1']){
  const ledger=I.empty(),profile=info.profiles[w];
  I.add(ledger,{id:w,run:'authored-AE',version,profile,kind:'initial_catalogue_grant',complete:true,
    evidence:'fixed Z profile',cards:authored.s.actors[w].deck.map(id=>({card:authored.s.cards[id],initial_count:1}))});
  catalogues[version][profile]=ledger.events[0].cards;
}
class Recorded extends T.Game{
  constructor(bundle,run,prior){super(bundle);this.run=run;this.knowledge=K.validate(prior);this.seen=new Set();this.seq=0;this.contacts();}
  fact(data){K.receive(this.knowledge,{id:`${this.run}:${++this.seq}`,run:this.run,version,time:this.s.now,...data},'first_resolution',catalogues);}
  contacts(){for(const [actor,a] of Object.entries(this.s.actors))if(a.active&&info.profiles[actor]&&!this.seen.has(actor)){
    this.fact({kind:'encounter',actor,profile:info.profiles[actor]});this.seen.add(actor);
  }}
  play(w,choice){
    const played=I.card(this.s.cards[choice.card_id]),oldEvents=this.s.events.length,oldRewards=new Set(Object.keys(this.s.rewards));
    super.play(w,choice);
    if(info.profiles[w])this.fact({kind:'observed_card',actor:w,profile:info.profiles[w],card:played});
    for(const e of this.s.events.slice(oldEvents)){
      const actor=({V0_traversed:'V0',V1_traversed:'V1',enemy_defeated:'E1'})[e.event];
      if(actor)this.fact({kind:'resolution',actor,profile:info.profiles[actor],result:actor==='E1'?'defeated':'traversed'});
    }
    for(const [key,r] of Object.entries(this.s.rewards))if(!oldRewards.has(key))this.fact({kind:'observed_reward',
      profile:info.profiles[r.source]||'obstacle-Z',reward_key:key,label:cfg.rewards[key].label});
    this.contacts();
  }
}
const checks={legal_decks:0,rejected_decks:0,initial_reward_overlap:0,natural_runs:0,unsettled_rejected:0,
  return_replays:0,game_unchanged_on_return:0,saved_tail_replays:0,canonical_deck_order:0,
  reward_cases:0,growth_choices:0,knowledge_cases:0};
const profile=L.initialProfile();
// Exact finite enumeration of count vectors, not a win-rate simulation.
const types=cfg.initial_unlocked;let ways=[1];
for(const type of types){const next=Array(ways.length+2).fill(0);ways.forEach((n,i)=>{for(let c=0;c<=2;c++)next[i+c]+=n;});ways=next;}
const legalCount=ways[cfg.deck_size];
for(const build of [counts,{f:2,h:2,l:2,g:2,r:2,fast:2},{f:2,h:2,l:2,sweep:2,fast:2,j:2}]){
  L.validateDeck(build,profile,cards);checks.legal_decks++;
}
for(const build of [{...counts,f:3},{...counts,f:1},{...counts,stored:1,h:1},{...counts,f:1.5},{...counts,missing:0}]){
  assert.throws(()=>L.validateDeck(build,profile,cards));checks.rejected_decks++;
}
for(const reward of Object.values(cfg.rewards))if(reward.unlock){assert(!profile.unlocked.includes(reward.unlock));checks.initial_reward_overlap++;}
const first=L.depart(source,inputs[0],profile,counts,'canonical');
const reversed=Object.fromEntries(Object.entries(counts).reverse());
assert.deepEqual(L.depart(source,inputs[0],profile,reversed,'canonical').game.save(),first.game.save());checks.canonical_deck_order++;
assert.throws(()=>L.finish(first.profile,'canonical',first.game,first.profile.knowledge));checks.unsettled_rejected++;
assert.throws(()=>L.buy(first.profile,'premature','vitality'));
// Explicit synthetic settlement fixtures test reward semantics, not natural acquisition frequency.
const rewardFixtures=[
  {id:'unprotected-withdrawal',reason:'withdrawal',rewards:{R:false},kept:[],unlocks:[],points:0},
  {id:'protected-withdrawal',reason:'withdrawal',rewards:{T0:true},kept:['T0'],unlocks:['brace'],points:0},
  {id:'defeat',reason:'defeat',rewards:{T0:true,E:false},kept:[],unlocks:[],points:0},
  {id:'clear',reason:'clear',rewards:{R:false,E:false,T1:true},kept:['R','E','T1'],unlocks:['stored','sharp'],points:1}
];
for(const f of rewardFixtures){
  const d=L.depart(source,inputs[0],profile,counts,f.id);
  for(const [key,protectedValue] of Object.entries(f.rewards)){d.game.acquire(key,'AE-fixture');d.game.s.rewards[key].protected=protectedValue;}
  d.game.settle(f.reason);const state=hash(d.game.save()),out=L.finish(d.profile,f.id,d.game,d.profile.knowledge);
  assert.deepEqual(d.game.s.settlement.kept,f.kept);assert.deepEqual(out.unlocked.filter(t=>!profile.unlocked.includes(t)),f.unlocks);
  assert.equal(out.points,f.points);assert.equal(hash(d.game.save()),state);checks.reward_cases++;
}
// A synthetic repeat-reward profile gives exactly one purchase. Equal prices are not balanced values.
const purchaseRows=[];
for(const mode of cfg.growth_modes){
  let p=L.initialProfile(mode);p.unlocked.push('stored','brace','sharp');
  const d=L.depart(source,inputs[0],p,counts,'repeat-'+mode);
  for(const key of ['R','E','T1'])d.game.acquire(key,'AE-fixture');d.game.settle('clear');
  p=L.finish(d.profile,'repeat-'+mode,d.game,d.profile.knowledge);
  const options=mode==='choose'?['retain','vitality','toughness']:['automatic'];
  for(const kind of options){
    const selected=['retain','automatic'].includes(kind)?copy(p):L.buy(p,'one-purchase',kind);
    const next=L.depart(source,inputs[1],selected,counts,'next-'+mode+'-'+kind);
    assert.equal(next.game.s.actors.P.hp,60+selected.hp_bonus);assert.equal(next.game.passive('P','damage_reduction'),selected.reduction_bonus);
    assert.equal(next.game.s.actors.P.hit,0);assert.equal(next.game.s.actors.P.crit,0);assert.equal(next.game.s.pool.length,0);
    assert.equal(Object.keys(next.game.s.field).length,0);assert.equal(d.game.s.actors.P.max_hp,60);
    if(['vitality','toughness'].includes(kind)){
      assert.deepEqual(L.buy(JSON.parse(JSON.stringify(selected)),'one-purchase',kind),selected);
      assert.throws(()=>L.buy(selected,'one-purchase',kind==='vitality'?'toughness':'vitality'));
      assert.throws(()=>L.buy(selected,'another-purchase',kind));
    }
    purchaseRows.push({mode,choice:kind,remaining_points:selected.points,next_hp:next.game.s.actors.P.hp,next_reduction:next.game.passive('P','damage_reduction')});checks.growth_choices++;
  }
}
// D42 boundaries, including non-player defeat and subsequent death, through the adopted adapter.
for(const result of ['retired','defeated']){
  const ledger=K.validate(I.empty()),event={id:result,run:'D42-fixture',version,actor:'E1',profile:info.profiles.E1,kind:'resolution',result,by:'V1'};
  K.receive(ledger,event,'first_resolution',catalogues);
  const kept=K.carry(I.empty(),ledger,'defeat');assert.equal(kept.events.some(e=>e.kind==='initial_catalogue_grant'),result==='defeated');checks.knowledge_cases++;
}
const rows=[];
for(const mode of cfg.growth_modes)for(const route of ['rock','environment','environment_return']){
  let p=L.initialProfile(mode),build=copy(counts);
  for(const [index,seed] of cfg.run_seeds.entries()){
    const run=`AE-${mode}-${route}-${index+1}`,start=L.depart(source,inputs.find(i=>i.seed===seed),p,build,run);
    const g=new Recorded(start.bundle,run,p.knowledge);let checkpoint=null;
    while(!g.s.outcome&&g.s.actors.P.actions<cfg.max_player_actions){
      g.advance();g.trace=[];if(g.s.outcome)break;
      if(!checkpoint&&g.s.actors.P.actions>=5)checkpoint=g.save();
      g.step(choose(g,route==='rock'?'rock':'environment','attack_first','enemy_first'));g.trace=[];
      if(route==='environment_return'&&!g.s.outcome&&g.s.rewards.T0?.protected)g.settle('withdrawal');
    }
    if(!g.s.outcome){rows.push({run,seed,outcome:'budget_unsettled',p_actions:g.s.actors.P.actions});break;}
    if(checkpoint){
      const restored=new T.Game(start.bundle,JSON.parse(JSON.stringify(checkpoint)));
      while(!restored.s.outcome&&restored.s.actors.P.actions<cfg.max_player_actions){restored.advance();restored.trace=[];if(!restored.s.outcome)restored.step(choose(restored,route==='rock'?'rock':'environment','attack_first','enemy_first'));restored.trace=[];if(route==='environment_return'&&!restored.s.outcome&&restored.s.rewards.T0?.protected)restored.settle('withdrawal');}
      assert.equal(hash(restored.save()),hash(g.save()));checks.saved_tail_replays++;
    }
    const oldHash=hash(g.save()),before=copy(p);p=L.finish(start.profile,run,g,g.knowledge);
    assert.equal(hash(g.save()),oldHash);checks.game_unchanged_on_return++;
    assert.deepEqual(L.finish(JSON.parse(JSON.stringify(p)),run,g,g.knowledge),p);checks.return_replays++;
    assert(before.unlocked.every(t=>p.unlocked.includes(t)));
    assert(before.knowledge.events.every(e=>p.knowledge.events.some(x=>x.id===e.id)));
    const added=p.unlocked.filter(t=>!before.unlocked.includes(t));
    rows.push({run,seed,route,mode,outcome:g.s.outcome,p_actions:g.s.actors.P.actions,settlement:g.s.settlement,
      deck:copy(build),new_unlocks:added,points:p.points,hp_bonus:p.hp_bonus,
      known_initial_profiles:p.knowledge.events.filter(e=>e.kind==='initial_catalogue_grant').map(e=>e.profile),final_hash:hash(g.save())});
    checks.natural_runs++;
    // This documented mechanical choice is only a connection check, not the user's preference.
    if(index===0){
      if(added.includes('stored')){build.h--;build.stored=1;}
      else if(added.includes('brace')){build.l--;build.brace=1;}
      L.validateDeck(build,p,cards);
    }
  }
}
for(const mode of cfg.growth_modes){
  const journey=rows.filter(r=>r.mode===mode&&r.route==='environment_return');
  assert.equal(journey[0].deck.l,2);assert.equal(journey[1].deck.l,1);assert.equal(journey[1].deck.brace,1);
}
const files=['loop_inputs.json','expedition_loop.js','loop_study.cjs','input.json','terrain.js','ecology.js','feedback.js','engine.js',
 'information.js','knowledge.js','information_inputs.json','continuity_study.cjs','event_inputs.py','event_results.json'];
const output={trial:'AE1',base_commit:cfg.base_commit,limits:cfg.limits,checks,legal_initial_count_vectors:legalCount,
  purchase_fixture:purchaseRows,natural_runs:rows,
  initial_preparation:L.preparation(source,profile,info.briefing,version,Object.values(info.profiles)),
  sources:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')]))};
fs.writeFileSync(path.join(__dirname,'loop_results.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({checks,legal_initial_count_vectors:legalCount,purchase_fixture:purchaseRows,natural_runs:rows},null,2));
