/* Human labels for public card properties. The normal recovery path is implicit. */
(function(api){'use strict';
 api.cardProperties=detail=>{
  const recovery={consumed_on_recovery:'回収時に消滅',destroyed_on_recovery_retired_origin:'回収時に消滅（元の主体が離脱）',destroyed_on_recovery_filler:'回収時に消滅'}[detail?.recovery_rule];
  const p=detail?.primary||detail;
  const grant=p?.kind==='defense_support'?'使用者以外の活動中の全主体へ付与。同じ発生源からの付与は張り直す。':null;
  const uses=p?.defense_grant&&Object.hasOwn(p.defense_grant,'uses')?p.defense_grant.uses:p?.defense_uses;
  const duration=uses!==undefined?'防御の回数：'+(uses===null?'制限なし':uses+'回'):null;
  return [...new Set([detail?.trigger_text,detail?.effect_text,grant,duration,recovery].filter(t=>typeof t==='string'&&t.trim()))];
 };
 api.defenseDuration=d=>!d||d.status==='empty'?'':d.status==='uniform'?'×'+d.uniform_uses:d.status==='unlimited'?'∞':'混在';
})(globalThis.CrossweaveUI);
