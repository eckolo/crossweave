/* AM1: human-controlled preparation, expedition, settlement and retry. */
'use strict';
const AH=require('../expedition_choices.js'),AI=require('../reward_preparation.js');
const L=require('../expedition_loop.js'),K=require('../knowledge.js'),balance=require('./selection.json');
const copy=AH.copy;
const check=(v,m)=>{if(!v)throw Error(m);};
const skillText={
  PS01:{name:'守りから展開',text:'防御の一致直後、次の自分の行動が設置なら行動コスト−2（最低1）。別の行動では失効。'},
  PS02:{name:'属性をつなぐ',text:'直前の自分の一致と異なる属性で攻撃を一致させると、その攻撃の体勢削り＋20。'},
  PS03:{name:'借り札を守りへ',text:'他者由来の札を一致させると、次の防御一致の防御値＋2。重複せず、発動後に再び条件を満たせる。'},
  PS04:{name:'回復を伸ばす',text:'消費型の回復札を一致させると、回復量＋4。'}
};
const purposeText={passage:'道',terminal:'霧',optional_enemy:'任意の敵',goal_enemy:'目的の敵',support:'支援する霧',weak_environment:'弱まった環境'};
class Session{
  constructor(source,seeds,saved=null){
    this.source=source;this.seeds=seeds;
    this.data={schema:'AM1',phase:'home',profile:AH.initialProfile(),counts:AH.countsFor(source,'guard3'),intent:'',route:'A',nextRun:0,receipt:null};
    this.game=null;this.bundle=null;
    if(saved)this.restore(saved);
  }
  restore(saved){
    check(saved?.schema==='AM1','この試作の保存データではありません');
    const d=copy(saved);check(['home','exploring','return'].includes(d.phase),'保存された画面が不正です');
    check(Number.isSafeInteger(d.nextRun)&&d.nextRun>=0&&typeof d.intent==='string'&&d.intent.length<=160,'保存された進行が不正です');
    check(AH.cfg.routes[d.route]&&d.profile?.schema==='AH1','保存された探索先が不正です');
    check(Number.isInteger(d.profile.points)&&d.profile.points>=0,'保存されたポイントが不正です');
    for(const [id,cost]of Object.entries(d.profile.learned))check(AH.cfg.skills[id]&&Number.isInteger(cost)&&cost>=0,'保存された習得が不正です');
    K.validate(d.profile.knowledge);L.validateDeck(d.counts,d.profile,L.catalog(this.source));
    let game=null;
    if(d.game){check(d.bundle&&d.game.state.ah.run===d.bundle.initial.state.ah.run,'探索記録が一致しません');game=new AI.Game(d.bundle,d.game);}
    check(d.phase!=='exploring'||game&&d.profile.phase==='exploring'&&d.profile.run===game.s.ah.run,'探索中の保存が不正です');
    check(d.phase==='exploring'||d.profile.phase==='home','帰還状態が不正です');
    check(d.phase!=='return'||game&&d.receipt&&['clear','withdrawal','defeat'].includes(game.s.outcome),'精算状態が不正です');
    this.bundle=d.bundle||null;this.game=game;delete d.bundle;delete d.game;this.data=d;
    // Recover a fully completed action saved immediately before its return screen.
    if(d.phase==='exploring')this.collect();
  }
  save(){return {...copy(this.data),bundle:copy(this.bundle),game:this.game?this.game.save():null};}
  plan(counts,skills){check(this.data.phase==='home','構築と習得の変更は帰還後に行います');return AI.plan(this.source,this.data.profile,this.data.counts,counts,skills);}
  depart(route,counts,skills,intent=''){
    check(typeof intent==='string'&&intent.length<=160,'狙いは160文字以内で入力してください');
    const planned=this.plan(counts,skills),index=this.data.nextRun;
    const out=AH.depart(this.source,this.seeds[index%this.seeds.length],planned.profile,planned.counts,route,'AM1-'+index);
    out.bundle.actor_specs.P.hp=balance.player_hp;
    out.bundle.initial.state.actors.P.hp=out.bundle.initial.state.actors.P.max_hp=balance.player_hp;
    const game=new AI.Game(out.bundle);game.advance();
    this.data={...this.data,phase:'exploring',profile:out.profile,counts:planned.counts,intent,route,nextRun:index+1,receipt:null};
    this.bundle=out.bundle;this.game=game;this.collect();return this.game;
  }
  action(choice){
    check(this.data.phase==='exploring'&&!this.game.s.outcome,'行動できる探索ではありません');
    const before=this.game.save(),trace=[...this.game.trace];
    try{this.game.step(choice);this.game.advance();this.collect();}
    catch(e){this.game=new AI.Game(this.bundle,before);this.game.trace=trace;throw e;}
    return this.game;
  }
  withdraw(){
    check(this.data.phase==='exploring'&&(!this.game.s.outcome||this.game.s.outcome==='cutoff'),'撤退できる探索ではありません');
    this.game.settle('withdrawal');this.collect();return this.game;
  }
  collect(){
    const g=this.game;if(!g||!['clear','withdrawal','defeat'].includes(g.s.outcome)||this.data.phase==='return')return;
    const before=this.data.profile,after=AH.finish(before,g),route=g.s.ah.route;
    const items=keys=>keys.flatMap(key=>AH.cfg.routes[route].rewards[g.s.rewards[key].source].map(item=>({...item,source:key})));
    const receipt={run:g.s.ah.run,route,outcome:g.s.outcome,actions:g.s.actors.P.actions,
      kept:items(g.s.settlement.kept),lost:items(g.s.settlement.lost),
      gained_points:after.points-before.points,new_unlocks:after.unlocked.filter(x=>!before.unlocked.includes(x)),
      opened:AH.destinations(after).filter(x=>!AH.destinations(before).includes(x)),
      new_catalogues:after.knowledge.events.filter(e=>e.kind==='initial_catalogue_grant').length-before.knowledge.events.filter(e=>e.kind==='initial_catalogue_grant').length};
    this.data={...this.data,profile:after,phase:'return',receipt};
  }
  home(){check(this.data.phase==='return','帰還結果を先に確認してください');this.data.phase='home';this.game=null;this.bundle=null;}
}
module.exports={Session,skillText,purposeText};
