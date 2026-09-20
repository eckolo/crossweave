/* Display projection only: consume public preview results, never replay combat.
 * A missing result is unknown, not a fabricated zero or a local rules estimate. */
(function(api){'use strict';
 api.projectActionForecast=function(data,choice,preview){
  if(!preview?.supported||!data?.exploration||!choice)return null;
  const x=data.exploration,hand=Array.isArray(x.hand)?x.hand:Object.values(x.hand||{});
  const card=hand.find(c=>c.id===choice.card_id);if(!card)return null;
  const result={actors:{},field:null,unavailable:[],active:{},defense:{}};
  for(const [id,row] of Object.entries(preview.actor_changes||{})){
   result.actors[id]={};
   for(const [key,source] of Object.entries({hp:'hp',posture:'posture_remaining',guard:'guard',crit:'crit',critical:'critical_multiplier',evasion:'evasion',reduction:'reduction'})){
    const v=row.values?.[source];
    result.actors[id][key]=row.status==='known'&&v?.status==='known'?{...v}:{status:row.status==='known'?'unsupported':'unknown'};
   }
   result.active[id]=row.active;result.defense[id]=row.defense;
  }
  const change=(id,key,before,after)=>{if(!Number.isFinite(before)||!Number.isFinite(after))return;result.actors[id]??={};result.actors[id][key]={status:'known',before,after,delta:after-before};};
  const subject=id=>x.actors[id]||Object.values(x.actors).find(a=>a.id===id);
  const self=x.self,target=subject(choice.target);
  if(preview.mode==='attack'&&target&&preview.actor_changes?.[target.id]?.status==='known'){
   // Show the strike before reset, directly from the already resolved hit_gain.
   // This is a display subtraction, not a second combat/evasion calculation.
   if(Number.isFinite(preview.posture_before)&&Number.isFinite(preview.hit_gain))change(target.id,'posture',preview.posture_before,preview.posture_before-preview.hit_gain);
  }
  if(preview.mode==='place'){
   const detail=data.details?.[card.id];
   if(detail?.field)result.field={kind:'place',attr:card.attr,id:card.id,name:detail.name,power:detail.field.power,hit:detail.field.hit};
  }else if(preview.matched_field_id)result.field={kind:'consume',id:preview.matched_field_id,attr:card.attr};
  return result;
 };
})(globalThis.CrossweaveUI);
