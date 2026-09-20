'use strict';
const AH=require('./vendor/expedition_choices.js');
const AI=require('./vendor/reward_preparation.js');
const L=require('./vendor/expedition_loop.js');
const I=require('./vendor/information.js');
const source=require('./vendor/input.json'),seed=require('./seed.json');
const copy=x=>JSON.parse(JSON.stringify(x));
const check=(v,m)=>{if(!v)throw Error(m);};
const schema='PT-NT-001-v1';
const names={P:'あなた',V0:'逆流する地下水路',E1:'漂着した潜水服',V1:'奥の水門'};
const cards={
  nt_flow:{type:'nt_flow',name:'返し潮',attr:'A',kind:'attack',power:3,hit:70,field_power:0,field_hit:30,life:2,evasion:0,crit_gain:25},
  nt_pressure:{type:'nt_pressure',name:'潮底の踏み足',attr:'B',kind:'attack',power:4,hit:50,field_power:6,field_hit:0,life:2,evasion:0,crit_gain:25},
  nt_stop:{type:'nt_stop',name:'汐留め',attr:'D',kind:'guard',power:3,hit:0,field_power:2,field_hit:20,life:2,evasion:20,crit_gain:20}
};
const story={
  entry:{title:'逆流する地下水路',text:'水が、下り坂を上ってくる。壁の白い筋を辿ると、照明の途切れた奥へ続いていた。',detail:'古い潜水服が流れの中に立っている。足元の水だけが割れ、こちらへ重い腕を伸ばした。'},
  port:{title:'頭上の海',text:'通路を抜けると、頭上に海があった。遠い舟底の影が、港の屋根をゆっくり横切っていく。',detail:'港の壁にも、地下で見た水位の筋がある。奥の水門で噴き返した白い水が、こちらの通路へ流れ込んでいた。'},
  gate:{title:'奥の水門',text:'鎖が歯車に噛み込み、逃がし口を開いたまま留めている。擦れた正常位置は、そのすぐ隣にあった。',detail:'流れと作業箇所を見極め、ずれた鎖を戻す。水路で使った余力と札は、そのまま引き継いでいる。'},
  clear:{title:'流れが戻る',text:'噛み込んだ鎖が外れ、水門がゆっくり戻る。足元へ向かっていた水が曲がり、港の水路へ流れていった。',detail:'日常側への流入が止まった。'}
};
class Game extends AI.Game{
  cost(type,match){return type==='nt_pressure'?(match?12:8):super.cost(type,match);}
  newCard(w,birth,attr=null,spec=null){
    let replacement=null;
    if(birth==='initial'){
      if(w==='V0'&&attr==='A')replacement=cards.nt_flow;
      if(w==='E1'&&spec?.type==='l')replacement=cards.nt_pressure;
      if(w==='V1'&&attr==='D')replacement=cards.nt_stop;
    }
    const id=super.newCard(w,birth,attr,replacement||spec);
    if(replacement)this.s.cards[id].crit_gain=replacement.crit_gain;
    return id;
  }
}
function prepare(counts){
  // AH prepares the player and A topology. Re-enter the NPCs through this scenario's
  // authored initial-card hook, before any draw/action or public catalogue grant.
  const out=AH.depart(source,seed,AH.initialProfile(),counts,'A','PT-NT-001-seed0');
  const b=out.bundle,s=b.initial.state;
  b.actor_specs.P.hp=40;b.actor_specs.P.max_posture=100;
  s.actors.P.hp=s.actors.P.max_hp=40;
  for(const w of ['V0','E1']){for(const id of s.actors[w].deck)delete s.cards[id];delete s.actors[w];}
  s.ah.knowledge=AH.initialProfile().knowledge;s.ah.seq=0;s.ah.catalogues={'AH1-cards':{}};
  b.initial.next_card_number=12;
  for(const k of Object.keys(b.initial.rng))if(!k.startsWith('P|'))delete b.initial.rng[k];
  b.initial.memory={recent:{P:[]},observed_types:{}};
  b.config.card_overrides.nt_stop={crit_gain:20,evasion:20};
  const setup=new Game(b);setup.enter('V0',0);setup.enter('E1',0);b.initial=setup.save();
  return {bundle:b,profile:out.profile,game:new Game(b)};
}
class Session{
  constructor(saved=null){
    this.data={schema,phase:'preparation',counts:AH.countsFor(source,'guard3'),profile:AH.initialProfile(),scene:'shop',pause:null,seen:[],choices:[],receipt:null};
    this.bundle=null;this.game=null;
    if(saved)this.restore(saved);
  }
  validateCounts(counts){return L.validateDeck(counts,AH.initialProfile(),L.catalog(source));}
  depart(counts=this.data.counts){
    check(this.data.phase==='preparation','出発済みです');this.validateCounts(counts);
    const out=prepare(counts);this.bundle=out.bundle;this.game=out.game;this.game.trace=[];
    Object.assign(this.data,{phase:'exploring',counts:copy(counts),profile:out.profile,scene:'entry',pause:'entry',seen:['entry']});
  }
  checkpoint(){
    const g=this.game;
    if(g.s.outcome){
      if(g.s.outcome==='cutoff'){this.data.pause='cutoff';return;}
      if(this.data.phase!=='return'){
        const after=AH.finish(this.data.profile,g);
        this.data.receipt={outcome:g.s.outcome,settlement:copy(g.s.settlement),points:after.points-this.data.profile.points,unlocked:after.unlocked.filter(t=>!this.data.profile.unlocked.includes(t)),actions:g.s.actors.P.actions,expedition_end_hp:g.s.actors.P.hp,return_hp:g.s.actors.P.max_hp};
        this.data.profile=after;this.data.phase='return';
        if(g.s.outcome==='clear'){this.data.scene='clear';this.data.pause='clear';this.data.seen.push('clear');}
        else this.data.pause=null;
      }
    }else if(g.s.current_event==='A/terminal'&&!this.data.seen.includes('port')){
      this.data.scene='port';this.data.pause='port';this.data.seen.push('port');
    }
  }
  advance(onStep=()=>{}){
    let steps=0;
    while(this.game&&!this.game.s.ready&&!this.game.s.outcome&&!this.data.pause){
      check(++steps<10000,'進行上限');const before=this.game.public();this.game.step();this.checkpoint();onStep(before);
    }
  }
  acknowledge(onStep=()=>{}){
    const pause=this.data.pause;check(pause&&pause!=='cutoff','確認する場面がありません');
    this.data.pause=null;
    if(pause==='port'){this.data.scene='gate';this.data.pause='gate';this.data.seen.push('gate');}
    else if(pause!=='clear')this.advance(onStep);
  }
  action(choice,onStep=()=>{}){
    check(this.data.phase==='exploring'&&!this.data.pause&&this.game.s.ready,'今は札を出せません');
    const before=this.game.public();this.game.step(choice);this.data.choices.push(copy(choice));this.checkpoint();onStep(before);this.advance(onStep);
  }
  withdraw(onStep=()=>{}){
    check(this.data.phase==='exploring','帰還済みです');
    const before=this.game.public();this.game.settle('withdrawal');this.checkpoint();onStep(before);
  }
  save(){return {...copy(this.data),bundle:this.bundle?copy(this.bundle):null,game:this.game?this.game.save():null};}
  restore(saved){
    check(saved?.schema===schema,'この試遊版の記録ではありません');
    const d=copy(saved);
    check(d.counts&&typeof d.counts==='object'&&!Array.isArray(d.counts),'構成が不正です');
    for(const [t,n]of Object.entries(d.counts))check(AH.initialProfile().unlocked.includes(t)&&Number.isInteger(n)&&n>=0&&n<=2,'札の枚数が不正です');
    if(d.phase!=='preparation')this.validateCounts(d.counts);
    check(['preparation','exploring','return'].includes(d.phase)&&Array.isArray(d.seen)&&Array.isArray(d.choices),'記録形式が不正です');
    check(d.pause===null||['entry','port','gate','clear','cutoff'].includes(d.pause),'場面の記録が不正です');
    if(d.phase!=='preparation'){
      check(d.bundle&&d.game?.state?.ah?.run==='PT-NT-001-seed0','探索の版が一致しません');
      this.bundle=d.bundle;this.game=new Game(d.bundle,d.game);
      check(d.phase!=='return'||d.receipt&&['clear','withdrawal','defeat'].includes(this.game.s.outcome),'帰還記録が不正です');
    }
    delete d.bundle;delete d.game;this.data=d;
  }
}
module.exports={schema,Session,Game,prepare,cards,names,story,source,seed,AH,L,I,copy};
