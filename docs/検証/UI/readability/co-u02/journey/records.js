// Read-only views of public knowledge; snapshots are not resolved through private IDs.
function recordButton(key,entry){
 recordEntries.set(key,entry);
 return button('<span>'+esc(entry.name)+'</span>'+icon('chevron-right'),'record-detail','data-id="'+esc(key)+'" aria-expanded="'+(recordDetail?.key===key)+'"','cj-record-link');
}
function recordedCards(rows,counts=false,scope=''){
 return '<table class="cj-record-cards"><thead><tr><th>札</th><th>属性</th>'+(counts?'<th>初期枚数</th>':'')+'</tr></thead><tbody>'+rows.map((row,i)=>'<tr><td>'+recordButton(scope+':'+i,{name:row.card.name,snapshot:row.card})+'</td><td>'+esc(row.card.attr)+'</td>'+(counts?'<td>'+esc(row.initial_count)+'</td>':'')+'</tr>').join('')+'</tbody></table>';
}
function recordsView(){
 recordEntries.clear();
 const tabs='<div class="cj-record-tabs">'+button('相手・環境','record-tab','data-tab="targets" aria-pressed="'+(recordTab==='targets')+'"')+button('札','record-tab','data-tab="cards" aria-pressed="'+(recordTab==='cards')+'"')+'</div>';
 if(recordTab==='cards'){
  const cards=(d().case?.unlocked_card_ids||[]).map(base=>'base:'+base).filter(id=>info(id).name);
  return tabs+'<p class="cj-record-purpose">判明した札の性能</p><div class="cj-record-list">'+cards.map(id=>recordButton(id,{name:name(id),detail:info(id)})).join('')+'</div>';
 }
 return tabs+'<p class="cj-record-purpose">探索で判明した構成と札</p><div class="cj-record-targets">'+list(d().knowledge_views).map(target=>{
  const catalogue=target.initial_catalogue?.cards,open=recordTarget===target.target_id;
  return '<section class="cj-record-target">'+button('<span><strong>'+esc(target.name)+'</strong><small>基本構成 '+(catalogue?'判明':'未判明')+'</small></span>'+icon('chevron-right'),'record-target','data-id="'+esc(target.target_id)+'" aria-expanded="'+open+'"')+'</section>';
 }).join('')+'</div>';
}
function recordTargetBody(){
 const target=list(d().knowledge_views).find(t=>t.target_id===recordTarget);if(!target)return '';
 const catalogue=target.initial_catalogue?.cards;
 const observed=[...new Map([...(target.observed_by_current_actor||[]),...(target.observed_elsewhere_this_run||[]),...(target.observed_earlier||[])].map(row=>[JSON.stringify(row.card),row])).values()];
 return '<h3>基本構成</h3>'+(catalogue?recordedCards(catalogue,true,target.target_id+':initial'):'<p class="cj-muted">まだ判明していない</p>')+
  '<h3>観測した札</h3>'+(observed.length?recordedCards(observed,false,target.target_id+':observed'):'<p class="cj-muted">観測なし</p>')+'<p class="cj-muted">現在の手札・次に出す札は未公開。</p>';
}
// Keep the immediate source visible beside its detail, with a back path to the list.
function recordsPanelView(){
 const parent=recordsView(),target=list(d().knowledge_views).find(t=>t.target_id===recordTarget);
 const childTitle=recordDetail?.name||target?.name,hasChild=!!childTitle;
 const head=(title,back)=>'<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'record-back','aria-label="'+esc(back)+'"','cj-record-back'):panelTrail.length?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+esc(title)+'</h2>'+button(icon('x'),'close','aria-label="調査記録を閉じる"','cj-icon-button')+'</div>';
 const pane=(key,title,body,back='')=>'<section class="cj-inspect-item" data-inspect-key="'+esc(key)+'">'+head(title,back)+'<div class="cj-inspect-scroll">'+body+'</div></section>';
 const detailBody=recordTargetBody(); // Also registers public snapshot entries.
 const source=recordDetail&&target?pane('target:'+recordTarget,target.name,detailBody,'調査記録の一覧に戻る'):pane('records:'+recordTab,'調査記録',parent);
 return source+(hasChild?pane(recordDetail?'record:'+recordDetail.key:'target:'+recordTarget,childTitle,recordDetail?recordDetailView():detailBody,recordDetail&&target?target.name+'に戻る':'調査記録の一覧に戻る'):'');
}
function recordDetailView(){
 const entry=recordDetail,s=entry.snapshot,d=entry.detail,p=d?.primary||s,rows=[];
 const add=(name,value)=>{if(value!=null)rows.push('<div><dt>'+esc(name)+'</dt><dd>'+esc(value)+'</dd></div>');};
 if(s)add('属性',s.attr);
 if(p){add(p.kind==='guard'?'身構':p.kind==='heal'?'回復':'突破',p.power);add(p.kind==='guard'?'攪乱':'探査',p.kind==='guard'?p.evasion:p.hit);add('機転',p.crit_gain);}
 add('場の突破／身構',d?.field?.power??s?.field_power);add('場の探査／攪乱',d?.field?.hit??s?.field_hit);add('手札期限',d?.life??s?.life);add('設置間隔',d?.action_intervals?.place??s?.place_cost);add('一致間隔',d?.action_intervals?.match??s?.match_cost);
 return '<dl class="cj-record-stats">'+rows.join('')+'</dl>';
}
