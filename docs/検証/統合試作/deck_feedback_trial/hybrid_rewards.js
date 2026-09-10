/* AF: typed reward bundles. The existing engine owns acquisition, protection and settlement. */
'use strict';
const L=require('./expedition_loop.js'),cfg=require('./hybrid_inputs.json');
const copy=x=>JSON.parse(JSON.stringify(x));
const check=(v,message)=>{if(!v)throw Error(message);};
const has=(o,k)=>Object.hasOwn(o,k);
function initialProfile(){return {...L.initialProfile('choose'),schema:'AF1',materials:{},pending_card_duplicates:[],uses:{}};}
function depart(source,input,profile,counts,runId){
  check(profile.schema==='AF1','Use an AF profile');
  const started=L.depart(source,input,{...profile,schema:'AE1'},counts,runId);
  started.profile.schema='AF1';return started;
}
function finish(profile,runId,game){
  check(profile.schema==='AF1','Use an AF profile');
  const s=game.s,r=s.settlement;
  check(['clear','withdrawal','defeat'].includes(s.outcome)&&r?.reason===s.outcome,'Unsettled exploration');
  const expectedKept=Object.keys(s.rewards).filter(key=>s.outcome==='clear'||s.outcome==='withdrawal'&&s.rewards[key].protected);
  const expectedLost=Object.keys(s.rewards).filter(key=>!expectedKept.includes(key));
  check(JSON.stringify([...r.kept].sort())===JSON.stringify(expectedKept.sort())&&
    JSON.stringify([...r.lost].sort())===JSON.stringify(expectedLost.sort()),'Settlement does not match reward protection');
  const entries=Object.keys(s.rewards).sort().map(key=>{check(has(cfg.rewards,key),'Unknown reward');return {key,components:cfg.rewards[key]};});
  const receipt=JSON.stringify({version:cfg.reward_version,reason:r.reason,kept:expectedKept,lost:expectedLost,entries});
  if(has(profile.returns,runId)){check(profile.returns[runId]===receipt,'Conflicting return');return copy(profile);}
  check(profile.phase==='exploring'&&profile.run===runId,'Wrong active run');
  const out=copy(profile);out.phase='home';out.run=null;
  for(const key of r.kept)for(const item of cfg.rewards[key]){
    if(item.kind==='points')out.points+=item.amount;
    else if(item.kind==='material')out.materials[item.type]=(out.materials[item.type]||0)+item.amount;
    else if(item.kind==='unlock'){
      if(out.unlocked.includes(item.type))out.pending_card_duplicates.push({run:runId,reward:key,type:item.type});
      else out.unlocked.push(item.type);
    }else throw Error('Unknown reward kind');
  }
  out.returns[runId]=receipt;return out;
}
function buy(profile,id,kind){check(profile.schema==='AF1','Use an AF profile');return L.buy(profile,id,kind);}
function useMaterial(profile,id,recipeId){
  check(profile.schema==='AF1'&&profile.phase==='home','Use materials after return');
  check(id&&has(cfg.recipes,recipeId),'Unknown material operation');
  const recipe=cfg.recipes[recipeId],receipt=JSON.stringify({version:cfg.reward_version,recipeId,recipe});
  if(has(profile.uses,id)){check(profile.uses[id]===receipt,'Conflicting material operation');return copy(profile);}
  check(!recipe.unlock||!profile.unlocked.includes(recipe.unlock),'Card already unlocked');
  check(profile.points>=recipe.points,'Insufficient points');
  for(const [type,amount] of Object.entries(recipe.materials))check((profile.materials[type]||0)>=amount,'Insufficient material: '+type);
  // Validate every input before consuming anything; no partial point/material payment.
  const out=copy(profile);out.points-=recipe.points;
  for(const [type,amount] of Object.entries(recipe.materials))out.materials[type]-=amount;
  if(recipe.unlock)out.unlocked.push(recipe.unlock);
  else {out.hp_bonus+=recipe.hp;out.reduction_bonus+=recipe.reduction;}
  out.uses[id]=receipt;return out;
}
function rewardsView(publicState){
  // Only already-acquired channels. Do not expose the complete authored reward table before acquisition.
  return Object.entries(publicState.rewards).map(([key,r])=>{
    check(has(cfg.rewards,key),'Unknown acquired reward');
    const retained=publicState.outcome==='clear'||publicState.outcome==='withdrawal'&&r.protected;
    return {key,status:publicState.outcome?(retained?'kept':'lost'):(r.protected?'protected':'unprotected'),components:copy(cfg.rewards[key])};
  });
}
function holdings(profile){
  return {points:profile.points,materials:Object.entries(profile.materials).filter(([,n])=>n>0).map(([type,amount])=>({
    type,name:cfg.materials[type].name,amount,
    uses:Object.entries(cfg.recipes).filter(([,r])=>has(r.materials,type)).map(([id,r])=>({id,label:r.label,points:r.points,materials:copy(r.materials)}))})),
    unlocked:[...profile.unlocked],pending_card_duplicates:copy(profile.pending_card_duplicates)};
}
module.exports={cfg,initialProfile,depart,finish,buy,useMaterial,rewardsView,holdings};
