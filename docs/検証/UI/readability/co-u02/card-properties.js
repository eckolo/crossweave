/* Human labels for public card properties. The normal recovery path is implicit. */
(function(api){'use strict';
 api.cardProperties=detail=>{
  const recovery={consumed_on_recovery:'回収時に消滅',destroyed_on_recovery_retired_origin:'回収時に消滅（元の主体が離脱）',destroyed_on_recovery_filler:'回収時に消滅'}[detail?.recovery_rule];
  return [...new Set([detail?.trigger_text,detail?.effect_text,recovery].filter(t=>typeof t==='string'&&t.trim()))];
 };
})(globalThis.CrossweaveUI);
