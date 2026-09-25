/* Temporary artwork bindings use public case/target IDs only; no game decisions. */
(function(api){'use strict';
 const assets=__ART_ASSETS__;
 function profile(data,actor){return (data.knowledge_views||[]).find(v=>v.key===actor?.knowledge_key)?.target_id;}
 api.actorArtwork=function(data,actor){
  if(data.case?.id!=='SCN-001')return null;
  const id=profile(data,actor);return id==='SCN-001-ACT02'?assets.diver:['SCN-001-ACT01','SCN-001-ACT04'].includes(id)?assets.water:null;
 };
 api.sceneArtwork=function(data){
  if(data.case?.id!=='SCN-001')return null;
  if(['home','return'].includes(data.phase))return assets.shop;
  const actors=Object.values(data.exploration?.actors||{});
  // ACT04/S02R explicitly share the temporary location art in this review.
  // A distinct post-resolution water state remains a visual-production task.
  return ['SCN-001-S02','SCN-001-S02R'].includes(data.scene?.id)||actors.some(a=>a.active&&['SCN-001-ACT01','SCN-001-ACT04'].includes(profile(data,a)))?assets.water:null;
 };
 api.applySceneArtwork=function(node,data){const a=api.sceneArtwork(data);
  if(a){node.dataset.artwork=a.id;node.style.backgroundImage='url("'+a.src+'")';node.style.backgroundPosition=a.position;}
  else{delete node.dataset.artwork;node.style.removeProperty('background-image');node.style.removeProperty('background-position');}
 };
})(globalThis.CrossweaveUI);
