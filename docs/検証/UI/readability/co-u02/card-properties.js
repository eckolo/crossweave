/* Human labels for public card properties. The normal recovery path is implicit. */
(function(api){'use strict';
 // Formatting public prose, not a catalogue keyed by hidden IDs or names.
 // Unrecognised wording remains intact; no condition or number is inferred.
 api.explanationLines=text=>String(text||'').replace(/他主体由来/g,'他者由来')
  .replace(/直前の本人行動が/g,'直前：').replace(/で、今回が/g,'。今回：')
  .replace(/し、その後に/g,'。その後に')
  .replace(/を(\d+)加算/g,' +$1').replace(/を(\d+)短縮/g,' −$1').replace(/を(\d+)延長/g,' +$1')
  .split(/[／\n]|。(?=.)/u).map(s=>s.trim().replace(/。$/u,'')).filter(Boolean);
 api.effectRows=detail=>{
  const rows=[],add=(label,text)=>{const lines=api.explanationLines(text);if(lines.length)rows.push({label,lines});};
  add('条件',detail?.trigger_text);add('効果',detail?.effect_text);
  const p=detail?.primary||detail;
  if(p?.kind==='defense_support'){
   add('対象','使用者以外の活動中の全主体');
   add('重複','同じ発生源の付与は張り直し');
  }
  const uses=p?.defense_grant&&Object.hasOwn(p.defense_grant,'uses')?p.defense_grant.uses:p?.defense_uses;
  if(uses!==undefined)add('持続',uses===null?'回数制限なし':uses+'回');
  add('性質',({consumed_on_recovery:'回収時に消滅',destroyed_on_recovery_retired_origin:'回収時に消滅（元の主体が離脱）',destroyed_on_recovery_filler:'回収時に消滅'})[detail?.recovery_rule]);
  return rows;
 };
 api.effectHTML=detail=>{
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows=api.effectRows(detail);if(!rows.length)return '';
  return '<dl class="cw-effect-structure">'+rows.map(({label,lines})=>'<div><dt>'+esc(label)+'：</dt><dd>'+lines.map(s=>'<span>'+esc(s)+'</span>').join('')+'</dd></div>').join('')+'</dl>';
 };
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
