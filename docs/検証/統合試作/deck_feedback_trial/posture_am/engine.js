/* AM1: D48 posture resolver. Fork of the frozen core; old trials remain reproducible. */
const CWCardStats = (() => {
  const copy = x => JSON.parse(JSON.stringify(x));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  class MT {
    constructor(state) { this.mt = state.slice(0,624); this.index = state[624]; }
    uint() {
      if (this.index >= 624) {
        for (let i=0;i<624;i++) {
          const y = (this.mt[i]&0x80000000)|(this.mt[(i+1)%624]&0x7fffffff);
          this.mt[i] = (this.mt[(i+397)%624]^(y>>>1)^((y&1)?0x9908b0df:0))>>>0;
        }
        this.index=0;
      }
      let y=this.mt[this.index++];
      y^=y>>>11; y^=(y<<7)&0x9d2c5680; y^=(y<<15)&0xefc60000; y^=y>>>18;
      return y>>>0;
    }
    random() { return ((this.uint()>>>5)*67108864+(this.uint()>>>6))/9007199254740992; }
    below(n) { const k=n.toString(2).length; let r; do {r=this.uint()>>>(32-k);} while(r>=n); return r; }
    shuffle(a) { for(let i=a.length-1;i>0;i--) {const j=this.below(i+1); [a[i],a[j]]=[a[j],a[i]];} }
    state() { return [...this.mt,this.index]; }
  }
  class Game {
    constructor(bundle,saved=null) {
      this.bundle=bundle;
      const data=saved||bundle.initial;
      this.s=copy(data.state); this.number=data.next_card_number;
      this.memory=copy(data.memory); this.rng={}; this.trace=[];
      if(saved)assert(this.s.posture_rule==='AM1','Incompatible posture save');
      else{
        this.s.posture_rule='AM1';
        for(const [w,a] of Object.entries(this.s.actors))a.max_posture??=bundle.actor_specs?.[w]?.max_posture??100;
      }
      for(const [key,state] of Object.entries(data.rng)) this.rng[key]=new MT(state);
      this.assert();
    }
    stream(w,p) { return this.rng[w+'|'+p]; }
    log(type,data={}) { this.trace.push({type,time:this.s.now,...copy(data)}); }
    live() { return Object.values(this.s.cards).filter(c=>!c.destroyed).length; }
    state() { this.s.N=this.live(); return copy(this.s); }
    save() { return {state:this.state(),next_card_number:this.number,memory:copy(this.memory),rng:Object.fromEntries(Object.entries(this.rng).map(([k,v])=>[k,v.state()]))}; }
    passive(w,kind) { return Object.values(this.s.actors).filter(a=>a.active).flatMap(a=>a.passives).filter(p=>p.target===w&&p.kind===kind).reduce((v,p)=>v+p.value,0); }
    evasion(w) { const a=this.s.actors[w]; return this.passive(w,'evasion')+(a.guard?a.guard.evasion:0); }
    crit(w,c) { return ['card_only','corrected'].includes(this.s.rules)?c.crit_gain:(w==='P'?50:0); }
    cost(type,match) { return type==='l'?(match?12:8):(type==='salve_slow'&&match?14:10); }
    stats(c) {
      Object.assign(c,this.bundle.config.card_defaults,this.bundle.config.card_overrides[c.type]||{});
      if(c.type.startsWith('weak_')) c.crit_gain=this.bundle.config.weak_crit_gain;
      if(c.type.startsWith('filler_')) c.crit_gain=this.bundle.config.filler_crit_gain;
    }
    newCard(w,birth,attr=null,spec=null) {
      this.number++;
      const id=w+'_'+birth+'_'+String(this.number).padStart(4,'0');
      if(!spec) {
        const filler=birth==='filler';
        spec={type:(filler?'filler_':'weak_')+attr,name:filler?'補填専用札':(birth==='initial'?'弱攻撃札':'基本札'),
          attr,kind:filler?'none':'attack',power:filler?0:2,hit:filler?0:20,
          field_power:0,field_hit:0,life:filler?1:2,core:false};
      }
      const c={...copy(spec),id,origin:w,birth,remaining:null,doomed:false,destroyed:false};
      c.place_cost=this.cost(c.type,false);c.match_cost=this.cost(c.type,true);this.stats(c);
      this.s.cards[id]=c;return id;
    }
    enter(w,at) {
      assert(!this.s.actors[w],'duplicate actor');
      const spec=this.bundle.actor_specs[w], role=w==='P'?'P':w==='O'?'O':w[0];
      const count=role==='P'?this.s.p_size:role==='O'?0:12;
      const a={role,acts:role!=='O',hp:spec.hp,max_hp:spec.hp,hit:0,max_posture:spec.max_posture??100,crit:0,guard:null,hand:[],deck:[],active:true,
        next_at:role!=='O'?at:null,actions:0,hand_size:spec.hand_size,initial_size:count,cap:count,minimum:spec.hand_size,
        passives:[],rebuilds:0};
      this.s.actors[w]=a;
      for(const p of ['initial','allocation','generation','selection','target']) this.rng[w+'|'+p]=new MT(this.bundle.future_rng[w+'|'+p]);
      if(role==='V') {
        ['A','B','C','D'].forEach((attr,i)=>{for(let n=0;n<[2,6,2,2][i];n++)a.deck.push(this.newCard(w,'initial',attr));});
      } else if(['P','E'].includes(role)) {
        for(const c of this.bundle.templates) {
          if((role==='E'||this.s.p_size===12)&&!c.core)continue;
          for(let n=0;n<2;n++)a.deck.push(this.newCard(w,'initial',null,c));
        }
      }
      this.stream(w,'initial').shuffle(a.deck);
      this.memory.recent[w]=[];if(['V','E'].includes(role))this.memory.observed_types[w]=[];
      this.log('enter',{actor:w,first_at:at});
    }
    recover(id,reason) {
      const c=this.s.cards[id];assert(!c.destroyed,'destroyed card recovered');c.remaining=null;
      if(c.consume_on_recover||c.doomed||c.birth==='filler') {
        c.destroyed=true;this.log('destroy',{card_id:id,reason,origin:c.origin,consumable:!!c.consume_on_recover});
      } else { this.s.pool.push(id);this.log('recover',{card_id:id,reason}); }
    }
    rebuild(w) {
      const a=this.s.actors[w];assert(!a.deck.length&&a.active&&a.acts,'invalid rebuild');
      const stream=this.stream(w,'allocation');stream.shuffle(this.s.pool);
      const taken=this.s.pool.splice(0,a.cap), need=Math.max(0,a.minimum-taken.length), basic=Math.min(need,Math.max(0,32-this.live()));
      const generated=[],weights=a.role==='V'?[2,6,2,2]:[4,4,2,2];
      for(const [birth,n] of [['basic',basic],['filler',need-basic]]) {
        for(let i=0;i<n;i++) {
          const value=this.stream(w,'generation').random()*weights.reduce((x,y)=>x+y,0);
          let cumulative=0,index=0;while(index<3&&(cumulative+=weights[index])<=value)index++;
          generated.push(this.newCard(w,birth,'ABCD'[index]));
        }
      }
      a.deck=taken.concat(generated);stream.shuffle(a.deck);a.rebuilds++;
      this.log('rebuild',{actor:w,received:taken,generated,basic_count:basic,filler_count:need-basic,cycle:a.rebuilds+1});
    }
    refill(w) {
      const a=this.s.actors[w];
      while(a.hand.length<a.hand_size) {
        if(!a.deck.length)this.rebuild(w);
        const id=a.deck.shift();this.s.cards[id].remaining=this.s.cards[id].life;a.hand.push(id);
        this.log('draw',{actor:w,card_id:id});
      }
      this.assert();
    }
    retire(w) {
      const a=this.s.actors[w];assert(a.active,'retiring inactive actor');a.active=false;a.next_at=null;
      for(const c of Object.values(this.s.cards))if(c.origin===w&&!c.destroyed)c.doomed=true;
      const held=a.hand.concat(a.deck);a.hand=[];a.deck=[];
      for(const id of held)this.recover(id,w+'_retirement_private');
      const doomed=this.s.pool.filter(id=>this.s.cards[id].origin===w);
      this.s.pool=this.s.pool.filter(id=>this.s.cards[id].origin!==w);
      for(const id of doomed)this.recover(id,w+'_retirement_pool');
      this.log('retire',{actor:w});
    }
    acquire(reward,source) {assert(!this.s.rewards[reward],'duplicate reward');this.s.rewards[reward]={status:'acquired',protected:false,source,time:this.s.now};}
    traverse(w,reward) {this.acquire(reward,w);for(const r of Object.values(this.s.rewards))if(r.status==='acquired')r.protected=true;}
    settle(reason) {
      if(this.s.settlement){assert(this.s.outcome===reason,'duplicate settlement');return;}
      const kept=[],lost=[];
      for(const [k,r] of Object.entries(this.s.rewards))((reason==='clear'||reason==='withdrawal'&&r.protected)?kept:lost).push(k);
      this.s.settlement={reason,kept,lost,prior_growth:'unchanged'};this.s.outcome=reason;this.s.ready=false;
      this.log('settlement',this.s.settlement);
    }
    followup() {this.s.current_event='followup';for(const w of ['V1','E1'])this.enter(w,this.s.now+this.s.entry_delay);}
    dispatch(victim,attacker) {
      const old=this.s.current_event;let event;
      if(victim==='P'){this.settle('defeat');event='player_defeated';}
      else if(victim==='O'){
        assert(attacker==='P','unsupported third-party rock damage');this.acquire('R','O');this.retire('O');event='rock_destroyed';
        if(this.s.successor==='keep_environment')this.s.current_event='open_rock';else{this.retire('V0');this.followup();}
      } else if(victim==='V0'){
        this.traverse('V0','T0');this.retire('V0');if(this.s.actors.O.active)this.retire('O');this.followup();event='V0_traversed';
      } else if(victim==='E1'){this.acquire('E','E1');this.retire('E1');event='enemy_defeated';}
      else{
        assert(victim==='V1','unknown victim');this.traverse('V1','T1');this.retire('V1');if(this.s.actors.E1.active)this.retire('E1');
        this.s.current_event='finished';this.settle('clear');event='V1_traversed';
      }
      this.s.boundary_number++;
      const row={number:this.s.boundary_number,event,attacker,time:this.s.now,P_actions:this.s.actors.P.actions,from_event:old,to_event:this.s.current_event};
      this.s.events.push(row);this.log('boundary',row);
    }
    target(w) {
      if(w==='P')return this.primary();
      if(w!=='V1')return 'P';
      const eligible=this.s.actors.E1.active?['P','E1']:['P'];
      return eligible[Math.min(Math.floor(this.stream(w,'target').random()*eligible.length),eligible.length-1)];
    }
    primary(){const order=this.s.policy==='obstacle_first'?['O','E1','V0','V1']:['V0','V1','O','E1'];return order.find(w=>this.s.actors[w]?.active);}
    npc(w) {
      const a=this.s.actors[w],cards=a.hand.map(id=>this.s.cards[id]);
      const heals=cards.filter(c=>c.kind==='heal'&&c.power>0&&this.s.field[c.attr]&&a.max_hp-a.hp>=16);
      if(heals.length)return {card_id:heals[0].id,target:null};
      const attacks=cards.filter(c=>c.kind==='attack'&&this.s.field[c.attr]),guards=cards.filter(c=>c.kind==='guard'&&this.s.field[c.attr]);
      const group=attacks.length?attacks:guards.length?guards:cards;
      const c=group[a.role==='V'?0:this.stream(w,'selection').below(group.length)];
      return {card_id:c.id,target:c.kind==='attack'&&this.s.field[c.attr]?this.target(w):null};
    }
    choices() {
      if(!this.s.ready||this.s.outcome)return [];
      const result=[];
      for(const id of this.s.actors.P.hand){const c=this.s.cards[id],targets=c.kind==='attack'&&this.s.field[c.attr]?Object.keys(this.s.actors).filter(w=>w!=='P'&&this.s.actors[w].active):[null];
        for(const target of targets)result.push({card_id:id,target});}
      return result;
    }
    play(w,choice) {
      const a=this.s.actors[w],c=this.s.cards[choice.card_id],target=choice.target;
      assert(!this.s.outcome&&a.active&&a.hand.includes(c.id),'illegal card');
      const hpBefore=Object.fromEntries(Object.entries(this.s.actors).map(([k,v])=>[k,v.hp]));
      const oldGuard=copy(a.guard),eventBefore=this.s.current_event;
      a.hand.splice(a.hand.indexOf(c.id),1);c.remaining=null;
      const mid=this.s.field[c.attr]||null;if(mid)delete this.s.field[c.attr];
      let mode='place',damage=0,actual=0,gain=0,connected=false,restored=0,crit=0,postureBefore=null,postureAfter=null,overflow=0,multiplier=0;
      if(!mid){assert(target===null,'placement target');this.s.field[c.attr]=c.id;}
      else{
        const m=this.s.cards[mid];a.guard=null;crit=this.crit(w,c);a.crit+=crit;mode=c.kind;
        if(mode==='guard'){
          const mapped=['field_only','corrected'].includes(this.s.rules);
          a.guard={value:Math.max(0,c.power+(mapped?m.field_power:0)),evasion:c.evasion+(mapped?m.field_hit:0),uses:2};
        } else if(mode==='attack'){
          const d=this.s.actors[target];assert(d?.active&&target!==w,'invalid target');
          postureBefore=d.max_posture-d.hit;
          gain=Math.max(0,c.hit+m.field_hit-this.evasion(target));d.hit+=gain;
          postureAfter=Math.max(0,d.max_posture-d.hit);
          if(d.hit>=d.max_posture){
            connected=true;
            const am=1+Math.floor(a.crit/100),hm=1+Math.floor((d.hit-d.max_posture)/100),guard=d.guard;
            overflow=d.hit-d.max_posture;multiplier=hm;postureAfter=d.max_posture;
            const defense=guard?guard.value*(1+Math.floor(d.crit/100)):0;
            damage=Math.max(0,((c.power+m.field_power)*am-defense-this.passive(target,'damage_reduction'))*hm);
            actual=Math.min(d.hp,damage);d.hp-=actual;d.hit=0;if(a.crit>=100)a.crit=0;
            if(guard){guard.uses--;if(d.crit>=100)d.crit=0;if(!guard.uses)d.guard=null;}
          }
        } else if(mode==='heal'){restored=Math.min(c.power,a.max_hp-a.hp);a.hp+=restored;}
        else assert(mode==='none','unsupported card kind');
        this.recover(c.id,'played_match');this.recover(mid,'field_match');
      }
      const expired=[];
      for(const id of [...a.hand]){this.s.cards[id].remaining--;if(!this.s.cards[id].remaining){a.hand.splice(a.hand.indexOf(id),1);expired.push(id);this.recover(id,'expiry');}}
      a.actions++;a.next_at=this.s.now+this.cost(c.type,!!mid);
      const zero=Object.keys(hpBefore).filter(who=>hpBefore[who]>0&&this.s.actors[who].hp===0);assert(zero.length<=1,'simultaneous HP0 outside trial');
      if(zero.length)this.dispatch(zero[0],w);
      if(!this.s.outcome&&this.s.actors.P.actions>=160)this.s.outcome='cutoff';
      this.log('action',{actor:w,action_number:a.actions,card_id:c.id,target,matched_id:mid,mode,damage,actual_hp_loss:actual,hit_gain:gain,hit_connected:connected,posture_before:postureBefore,posture_after:postureAfter,posture_overflow:overflow,posture_multiplier:multiplier,hp_restored:restored,crit_added:crit,expired,old_guard_ended:mid?oldGuard:null,event_before:eventBefore});
      const row={actor:w,time:this.s.now,type:c.type,attr:c.attr,mode,target};
      this.memory.recent[w]=this.memory.recent[w].concat([row]).slice(-3);
      const seen=this.memory.observed_types[w];if(seen&&!seen.includes(c.type))seen.push(c.type);
      this.assert();
    }
    step(choice=null) {
      if(this.s.outcome)return;
      if(this.s.ready){assert(this.choices().some(x=>x.card_id===choice?.card_id&&x.target===choice?.target),'illegal choice');this.s.ready=false;this.play('P',choice);}
      else{
        assert(choice===null,'unexpected choice');
        const order={V:0,P:1,E:2};
        const w=Object.keys(this.s.actors).filter(k=>this.s.actors[k].active&&this.s.actors[k].acts).sort((x,y)=>this.s.actors[x].next_at-this.s.actors[y].next_at||order[this.s.actors[x].role]-order[this.s.actors[y].role]||x.localeCompare(y))[0];
        this.s.now=this.s.actors[w].next_at;this.refill(w);
        if(w==='P')this.s.ready=true;else this.play(w,this.npc(w));
      }
    }
    advance(){let steps=0;while(!this.s.ready&&!this.s.outcome){assert(++steps<10000,'step budget');this.step();}}
    public() {
      const actors={};
      for(const [w,a] of Object.entries(this.s.actors)){
        actors[w]=copy(Object.fromEntries(Object.entries(a).filter(([k])=>!['hand','deck'].includes(k))));
        Object.assign(actors[w],{posture_remaining:a.max_posture-a.hit,hand_count:a.hand.length,deck_count:a.deck.length,evasion:this.evasion(w),reduction:this.passive(w,'damage_reduction')});
        if(w==='P')actors[w].hand=a.hand.map(id=>copy(this.s.cards[id]));
      }
      return {now:this.s.now,outcome:this.s.outcome,actors,field:Object.fromEntries(Object.entries(this.s.field).map(([a,id])=>[a,copy(this.s.cards[id])])),pool_count:this.s.pool.length,N:this.live(),rules:this.s.rules,current_event:this.s.current_event,rewards:copy(this.s.rewards)};
    }
    predict(choice,w='P') {
      const s=this.public(),c=this.s.cards[choice.card_id],a=s.actors[w],m=s.field[c.attr];
      const result={mode:m?c.kind:'place',crit_added:0,actual_hp_loss:0,hit_gain:0,hit_connected:false,posture_before:null,posture_after:null,posture_overflow:0,posture_multiplier:0,hp_restored:0,guard:null};
      if(!m)return result;
      const crit=this.crit(w,c);result.crit_added=crit;
      if(c.kind==='attack'){
        const d=s.actors[choice.target],gain=Math.max(0,c.hit+m.field_hit-d.evasion),total=d.hit+gain;
        const force=(c.power+m.field_power)*(1+Math.floor((a.crit+crit)/100)),shield=d.guard?d.guard.value*(1+Math.floor(d.crit/100)):0;
        Object.assign(result,{posture_before:d.max_posture-d.hit,posture_after:total>=d.max_posture?d.max_posture:d.max_posture-total,posture_overflow:Math.max(0,total-d.max_posture),posture_multiplier:total>=d.max_posture?1+Math.floor((total-d.max_posture)/100):0,hit_gain:gain,hit_connected:total>=d.max_posture,actual_hp_loss:total>=d.max_posture?Math.min(d.hp,Math.max(0,force-shield-d.reduction)*(1+Math.floor((total-d.max_posture)/100))):0});
      } else if(c.kind==='guard'){
        const mapped=['field_only','corrected'].includes(s.rules);
        result.guard={value:Math.max(0,c.power+(mapped?m.field_power:0)),evasion:c.evasion+(mapped?m.field_hit:0),uses:2};
      } else if(c.kind==='heal')result.hp_restored=Math.min(c.power,a.max_hp-a.hp);
      return result;
    }
    assert() {
      const members=this.s.pool.concat(Object.values(this.s.field));
      for(const a of Object.values(this.s.actors)){
        members.push(...a.hand,...a.deck);assert(a.hp>=0&&a.hp<=a.max_hp&&a.hit>=0&&Number.isSafeInteger(a.max_posture)&&a.max_posture>=1&&a.hit<a.max_posture&&a.crit>=0,'actor state');
        assert(a.hand.length<=a.hand_size&&(!a.guard||a.guard.value>=0&&[1,2].includes(a.guard.uses)),'guard or hand state');
        for(const id of a.hand)assert(this.s.cards[id].remaining>=1&&this.s.cards[id].remaining<=this.s.cards[id].life,'card deadline');
        if(!a.active)assert(!a.hand.length&&!a.deck.length,'retired cards');
      }
      const set=new Set(members);assert(set.size===members.length&&set.size===this.live(),'card conservation');
      const hands=new Set(Object.values(this.s.actors).flatMap(a=>a.hand));
      for(const c of Object.values(this.s.cards)){
        assert(set.has(c.id)===!c.destroyed,'card location');
        if(!hands.has(c.id))assert(c.remaining===null,'non-hand deadline');
        if(!c.destroyed&&!this.s.actors[c.origin].active)assert(c.doomed,'retired origin');
      }
      for(const id of this.s.pool)assert(!this.s.cards[id].doomed&&!this.s.cards[id].consume_on_recover&&this.s.cards[id].birth!=='filler','invalid recycled card');
    }
  }
  return {Game,MT};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CWCardStats;
