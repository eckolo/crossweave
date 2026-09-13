/* AH: authored destinations and learned passives. Historical engines are unchanged. */
'use strict';
const T=require('./terrain.js'),Core=require('./engine.js'),L=require('./expedition_loop.js');
const I=require('./information.js'),K=require('./knowledge.js'),cfg=require('./choice_inputs.json');
const copy=x=>JSON.parse(JSON.stringify(x));
const check=(v,m)=>{if(!v)throw Error(m);};
const has=(o,k)=>Object.hasOwn(o,k);
const version='AH1-cards';

function initialProfile(points=0){
  check(Number.isInteger(points)&&points>=0,'Invalid points');
  return {schema:'AH1',phase:'home',run:null,points,learned:{},materials:{},
    unlocked:[...L.cfg.initial_unlocked],clears:[],knowledge:K.validate(I.empty()),returns:{}};
}
function reallocate(profile,skills){
  check(profile.schema==='AH1'&&profile.phase==='home','Learning requires return');
  check(Array.isArray(skills)&&new Set(skills).size===skills.length,'Duplicate skills');
  const out=copy(profile),total=profile.points+Object.values(profile.learned).reduce((a,b)=>a+b,0);
  let cost=0;const learned={};
  for(const id of [...skills].sort()){
    check(has(cfg.skills,id),'Unknown skill');
    // A retained skill keeps its actual historical purchase cost; a removed one is fully refunded.
    learned[id]=has(profile.learned,id)?profile.learned[id]:cfg.skills[id].cost;cost+=learned[id];
  }
  check(cost<=total,'Insufficient points');out.points=total-cost;out.learned=learned;return out;
}
function destinations(profile){return profile.clears.some(r=>['A','B'].includes(r))?['A','B','C']:['A','B'];}
function countsFor(source,build){
  const b=T.prepare(source,build),counts={};
  for(const id of b.initial.state.actors.P.deck){const type=b.initial.state.cards[id].type;counts[type]=(counts[type]||0)+1;}
  return counts;
}
function rewardItems(route,actor){return cfg.routes[route].rewards[actor]||[];}
function rewardLabel(route,actor){return rewardItems(route,actor).map(x=>x.kind==='unlock'?`札解放:${x.type}`:x.kind==='points'?`成長ポイント ${x.amount}`:`素材 ${x.type} ${x.amount}`).join('、');}

class Game extends T.Game{
  enter(w,at){
    super.enter(w,at);
    const spec=this.bundle.actor_specs[w],a=this.s.actors[w],ah=this.s.ah;
    if(spec.evasion_others)a.passives.push({id:'AH-support',kind:'evasion',target:'others',value:spec.evasion_others});
    const profile=ah.route+'/'+w;
    const ledger=I.empty();
    I.add(ledger,{id:'authored-'+profile,run:'AH-authoring',version,profile,kind:'initial_catalogue_grant',complete:true,
      evidence:'Authored initial cards before any action',cards:a.deck.map(id=>({card:this.s.cards[id],initial_count:1}))});
    ah.catalogues[version][profile]=ledger.events[0].cards;
    this.fact({kind:'encounter',actor:w,profile});
  }
  fact(data){const ah=this.s.ah;K.receive(ah.knowledge,{id:`${ah.run}:${++ah.seq}`,run:ah.run,version,time:this.s.now,...data},'first_resolution',ah.catalogues);}
  target(w){
    const targets=this.bundle.actor_specs[w].targets.filter(k=>this.s.actors[k]?.active);
    check(targets.length,'No target');
    return targets.length===1?targets[0]:targets[Math.floor(this.stream(w,'target').random()*targets.length)];
  }
  public(){
    const out=super.public(),ah=this.s.ah;
    for(const [w,a] of Object.entries(out.actors))if(w!=='P'){
      a.purpose=this.bundle.actor_specs[w].purpose;a.hp_floor=this.bundle.actor_specs[w].hp_floor||0;
    }
    out.passive_state={learned:[...ah.learned],...copy(ah.pending)};out.route=ah.route;return out;
  }
  effect(w,c){
    const out={ids:[],hit:0,power:0,discount:0},ah=this.s.ah;
    if(w!=='P')return out;
    const match=!!this.s.field[c.attr],knows=id=>ah.learned.includes(id),p=ah.pending;
    if(knows('PS01')&&p.after_guard&&!match){out.ids.push('PS01');out.discount=cfg.skills.PS01.placement_discount;}
    if(knows('PS02')&&match&&c.kind==='attack'&&p.last_match_attr&&p.last_match_attr!==c.attr){out.ids.push('PS02');out.hit=cfg.skills.PS02.hit_bonus;}
    if(knows('PS03')&&match&&c.kind==='guard'&&p.borrowed_guard){out.ids.push('PS03');out.power+=cfg.skills.PS03.guard_bonus;}
    if(knows('PS04')&&match&&c.kind==='heal'&&c.consume_on_recover){out.ids.push('PS04');out.power+=cfg.skills.PS04.heal_bonus;}
    return out;
  }
  predict(choice,w='P'){
    const c=this.s.cards[choice.card_id],e=this.effect(w,c),base={power:c.power,hit:c.hit};
    try{
      c.power+=e.power;c.hit+=e.hit;const out=super.predict(choice,w);
      const floor=this.bundle.actor_specs[choice.target]?.hp_floor||0;
      if(floor)out.actual_hp_loss=Math.min(out.actual_hp_loss,Math.max(0,this.s.actors[choice.target].hp-floor));
      out.passives=e.ids;out.action_cost=Math.max(1,this.cost(c.type,!!this.s.field[c.attr])-e.discount)*(this.bundle.actor_specs[w].action_cost_scale||1);
      return out;
    }finally{Object.assign(c,base);}
  }
  play(w,choice){
    const ah=this.s.ah,c=this.s.cards[choice.card_id],played=I.card(c),e=this.effect(w,c);
    const match=!!this.s.field[c.attr],base={power:c.power,hit:c.hit},start=this.trace.length;
    const targetHP=choice.target?this.s.actors[choice.target].hp:null;
    try{c.power+=e.power;c.hit+=e.hit;super.play(w,choice);}finally{Object.assign(c,base);}
    const row=this.trace.slice(start).findLast(x=>x.type==='action'&&x.actor===w);
    check(row,'Missing completed action');
    const cost=Math.max(1,this.cost(c.type,match)-e.discount)*(this.bundle.actor_specs[w].action_cost_scale||1);
    if(this.s.actors[w].active)this.s.actors[w].next_at=this.s.now+cost;
    if(choice.target)row.actual_hp_loss=targetHP-this.s.actors[choice.target].hp;
    Object.assign(row,{passives:e.ids,action_cost:cost,origin:c.origin,player_rebuilds:this.s.actors.P.rebuilds});
    if(w==='P'){
      ah.pending.after_guard=ah.learned.includes('PS01')&&match&&c.kind==='guard';
      if(match){
        ah.pending.last_match_attr=c.attr;
        if(c.kind==='guard')ah.pending.borrowed_guard=false;
        // A borrowed guard consumes the old charge, then arms one future charge.
        if(ah.learned.includes('PS03')&&c.origin!=='P')ah.pending.borrowed_guard=true;
      }
    }else this.fact({kind:'observed_card',actor:w,profile:ah.route+'/'+w,card:played});
    this.assert();
  }
  dispatch(victim,attacker){
    const ah=this.s.ah,route=ah.route,spec=this.bundle.actor_specs[victim];
    if(spec.hp_floor){this.s.actors[victim].hp=spec.hp_floor;this.log('hp_floor',{actor:victim,floor:spec.hp_floor});return;}
    const old=this.s.current_event;
    if(victim==='P')this.settle('defeat');
    else{
      const key=route+'/'+victim;
      if(victim.startsWith('V'))this.traverse(victim,key);else this.acquire(key,victim);
      this.fact({kind:'resolution',actor:victim,profile:key,result:victim.startsWith('V')?'traversed':'defeated'});
      this.fact({kind:'observed_reward',profile:key,reward_key:key,label:rewardLabel(route,victim)});
      this.retire(victim);
      const enter=w=>this.enter(w,this.s.now+this.s.entry_delay);
      if(route==='A'&&victim==='V0'){
        if(this.s.actors.E1.active)this.retire('E1');enter('V1');this.s.current_event='A/terminal';
      }else if(route==='A'&&victim==='V1'||route!=='A'&&victim==='E1'){
        this.s.current_event=route+'/finished';this.settle('clear');
      }else if(route==='B'&&victim==='V0'){
        enter('V1');this.s.current_event='B/weak';
      }else if(route==='C'&&victim==='V0'){
        enter('E1');this.s.current_event='C/enemy';
      }else if(route==='C'&&victim==='V1')enter('V2');
    }
    this.s.boundary_number++;
    const row={number:this.s.boundary_number,event:victim==='P'?'player_defeated':victim.startsWith('V')?'traversed':'defeated',victim,attacker,
      time:this.s.now,P_actions:this.s.actors.P.actions,from_event:old,to_event:this.s.current_event};
    this.s.events.push(row);this.log('boundary',row);
  }
}

function depart(source,input,profile,counts,route,run,{comparison=false}={}){
  check(profile.schema==='AH1'&&profile.phase==='home','Departure requires home');
  check(run&&!has(profile.returns,run),'Duplicate or missing run');
  check(has(cfg.routes,route),'Unknown route');
  check(comparison||destinations(profile).includes(route),'Destination locked');
  const cards=L.catalog(source);L.validateDeck(counts,profile,cards);
  const b=T.prepare(source),s=b.initial.state,p=s.actors.P,ids=[...p.deck].sort();
  b.actor_specs={P:{hp:60,hand_size:3},...copy(cfg.routes[route].actors)};
  s.actors={P:p};s.cards={};s.pool=[];s.field={};s.rewards={};s.events=[];s.current_event=route+'/start';s.seed='AH1-'+input.seed;
  s.ah={route,run,learned:Object.keys(profile.learned).sort(),pending:{after_guard:false,last_match_attr:null,borrowed_guard:false},
    knowledge:copy(profile.knowledge),seq:0,catalogues:{[version]:{}}};
  const types=Object.keys(counts).sort().flatMap(t=>Array(counts[t]).fill(t));
  ids.forEach((id,i)=>s.cards[id]={...copy(cards[types[i]]),id,origin:'P',birth:'initial',remaining:null,doomed:false,destroyed:false});
  p.deck=ids;p.hp=p.max_hp=60;p.passives=[];
  b.initial.rng={};b.future_rng=copy(input.states);
  for(const purpose of ['initial','allocation','generation','selection','target'])b.initial.rng['P|'+purpose]=copy(input.states['P|'+purpose]);
  const rng=new Core.MT(b.initial.rng['P|initial']);rng.shuffle(p.deck);b.initial.rng['P|initial']=rng.state();
  b.initial.memory={recent:{P:[]},observed_types:{}};b.initial.next_card_number=12;
  const setup=new Game(b);for(const w of cfg.routes[route].start)setup.enter(w,0);
  b.initial=setup.save();
  const next=copy(profile);next.phase='exploring';next.run=run;
  return {profile:next,bundle:b,game:new Game(b)};
}
function finish(profile,game){
  const {run,route,knowledge}=game.s.ah,settlement=game.s.settlement;
  check(['clear','withdrawal','defeat'].includes(game.s.outcome)&&settlement?.reason===game.s.outcome,'Unsettled expedition');
  const expected={kept:[],lost:[]};
  for(const [key,r] of Object.entries(game.s.rewards)){
    check(key===route+'/'+r.source&&rewardItems(route,r.source).length,'Unknown reward');
    expected[game.s.outcome==='clear'||game.s.outcome==='withdrawal'&&r.protected?'kept':'lost'].push(key);
  }
  for(const key of ['kept','lost'])check(JSON.stringify([...settlement[key]].sort())===JSON.stringify(expected[key].sort()),'Invalid settlement');
  const receipt=JSON.stringify({route,settlement,knowledge});
  if(has(profile.returns,run)){check(profile.returns[run]===receipt,'Conflicting return');return copy(profile);}
  check(profile.phase==='exploring'&&profile.run===run,'Wrong active run');
  const out=copy(profile);out.phase='home';out.run=null;out.knowledge=K.carry(profile.knowledge,knowledge,game.s.outcome);
  for(const key of settlement.kept)for(const item of rewardItems(route,game.s.rewards[key].source)){
    if(item.kind==='points')out.points+=item.amount;
    else if(item.kind==='material')out.materials[item.type]=(out.materials[item.type]||0)+item.amount;
    else if(!out.unlocked.includes(item.type))out.unlocked.push(item.type);
  }
  if(game.s.outcome==='clear'&&!out.clears.includes(route))out.clears.push(route);
  out.returns[run]=receipt;return out;
}
function preparation(profile){
  return {phase:profile.phase,points:profile.points,learned:copy(profile.learned),skills:copy(cfg.skills),
    materials:copy(profile.materials),unlocked:[...profile.unlocked],
    destinations:destinations(profile).map(id=>({id,summary:cfg.routes[id].briefing})),
    knowledge:K.departure({briefing:{summary:'既知情報',goals:[],basis:'AH'},ledger:profile.knowledge,version,
      profiles:[...new Set(profile.knowledge.encounters.map(e=>e.profile))]})};
}

// A current-public-state policy probe. No private deck, future stream, or reward table reads.
function choose(game,policy){
  check(cfg.policies.includes(policy),'Unknown policy');
  const s=game.public(),p=s.actors.P,cards=Object.fromEntries(p.hand.map(c=>[c.id,c]));
  let choices=game.choices().map(ch=>({ch,c:cards[ch.card_id],v:game.predict(ch)}));
  const heals=choices.filter(x=>x.v.mode==='heal'&&(x.v.hp_restored>=x.c.power||x.c.remaining===1&&x.v.hp_restored>0));
  if(heals.length)return heals.sort((a,b)=>b.v.hp_restored-a.v.hp_restored||a.c.remaining-b.c.remaining)[0].ch;
  const nonheal=choices.filter(x=>x.c.kind!=='heal');if(nonheal.length)choices=nonheal;
  const guards=choices.filter(x=>x.v.mode==='guard'&&(x.v.guard.value>0||x.v.guard.evasion>0))
    .sort((a,b)=>b.v.guard.evasion-a.v.guard.evasion||b.v.guard.value-a.v.guard.value||a.c.remaining-b.c.remaining);
  if(!p.guard&&p.hit>=50&&guards.length)return guards[0].ch;
  const priority=purpose=>({passage:policy==='side_first'?1:0,terminal:0,goal_enemy:policy==='side_first'?1:0,
    support:policy==='side_first'?0:2,optional_enemy:policy==='side_first'?0:2,weak_environment:9})[purpose];
  const attacks=choices.filter(x=>x.v.mode==='attack');
  attacks.sort((a,b)=>priority(s.actors[a.ch.target].purpose)-priority(s.actors[b.ch.target].purpose)||
    b.v.actual_hp_loss-a.v.actual_hp_loss||b.v.hit_gain-a.v.hit_gain||b.c.power-a.c.power||a.c.remaining-b.c.remaining);
  if(attacks.length)return attacks[0].ch;if(guards.length)return guards[0].ch;
  return choices.sort((a,b)=>a.c.remaining-b.c.remaining||a.v.action_cost-b.v.action_cost||a.c.id.localeCompare(b.c.id))[0].ch;
}
module.exports={cfg,copy,Game,initialProfile,reallocate,destinations,countsFor,depart,finish,preparation,choose};
