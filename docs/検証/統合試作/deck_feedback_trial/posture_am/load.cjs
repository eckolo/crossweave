'use strict';
const fs=require('fs'),path=require('path');
const base=path.dirname(__dirname),conditions=require('./conditions.json');
const copy=x=>JSON.parse(JSON.stringify(x));
function config(id){
  const v=conditions.variants[id];if(!v)throw Error('Unknown AM variant');
  const cfg=copy(require('../choice_inputs.json'));
  if(v.engine==='AM1')for(const route of Object.values(cfg.routes))for(const [w,a] of Object.entries(route.actors)){
    a.max_posture=100;
    if(v.road_hp){
      if(a.purpose==='passage'){a.hp=v.road_hp;a.max_posture=1;}
      if(a.purpose==='terminal')a.hp=v.fog_hp;
      if(a.purpose==='support')a.hp=v.support_hp;
      if(w.startsWith('E'))a.hp=route===cfg.routes.C?v.goal_c_hp:v.enemy_hp;
      if(a.purpose==='weak_environment')a.max_posture=1;
    }
  }
  if(v.road_hp){
    cfg.routes.A.briefing='着実に進む道の先に、体勢を削って抜ける霧。入口の敵は追加目標。成長・素材と札候補。';
    cfg.routes.B.briefing='目的敵の撃破。周囲を避けやすくする霧は先に晴らしてもよい。成長・素材と札候補。';
    cfg.routes.C.briefing='道の先で目的敵を撃破。回避を支援する霧と消耗が後半へ続く。成長・素材と札候補。';
  }
  return cfg;
}
function load(id){
  const v=conditions.variants[id],cfg=config(id),cache={};
  function req(name){
    if(cache[name])return cache[name].exports;
    const m={exports:{}};cache[name]=m;
    if(name==='choice_inputs.json')m.exports=copy(cfg);
    else{
      const actual=name==='engine.js'&&v.engine==='AM1'?path.join(__dirname,'engine.js'):path.join(base,name);
      const s=fs.readFileSync(actual,'utf8');
      if(name.endsWith('.json'))m.exports=JSON.parse(s);
      else new Function('module','exports','require',s)(m,m.exports,child=>req(path.posix.normalize(path.posix.join(path.posix.dirname(name),child))));
    }
    return m.exports;
  }
  const AH=req('expedition_choices.js'),AI=req('reward_preparation.js');
  function depart(source,input,profile,counts,route,run,options={}){
    const out=AH.depart(source,input,profile,counts,route,run,options);
    out.bundle.actor_specs.P.hp=v.player_hp;
    out.bundle.initial.state.actors.P.hp=out.bundle.initial.state.actors.P.max_hp=v.player_hp;
    out.game=new AI.Game(out.bundle);return out;
  }
  return {AH,AI,depart,req,variant:v};
}
module.exports={load,config,conditions};
