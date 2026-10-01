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
  const catalogue=target.initial_catalogue?.cards,open=recordTarget===target.key;
  const versions=list(d().knowledge_views).filter(t=>t.target_id===target.target_id),version=versions.length>1?'・記録 '+(versions.findIndex(t=>t.key===target.key)+1):'',current=Object.values(d().exploration?.actors||{}).some(a=>a.knowledge_key===target.key)?'・今回の相手':'';
  return '<section class="cj-record-target">'+button('<span><strong>'+esc(target.name)+'</strong><small>基本構成 '+(catalogue?'判明':'未判明')+version+current+'</small></span>'+icon('chevron-right'),'record-target','data-id="'+esc(target.key)+'" aria-expanded="'+open+'"')+'</section>';
 }).join('')+'</div>';
}
function recordTargetBody(){
 const target=list(d().knowledge_views).find(t=>t.key===recordTarget);if(!target)return '';
 const catalogue=target.initial_catalogue?.cards;
 const groups=[['observed_by_current_actor','この相手の札'],['observed_elsewhere_this_run','今回の探索で観測'],['observed_earlier','過去の探索で観測']];
 const rewards=target.confirmed_reward_candidates||[];
 return '<h3>基本構成</h3>'+(catalogue?recordedCards(catalogue,true,target.key+':initial'):'<p class="cj-muted">まだ判明していない</p>')+
  groups.map(([key,title])=>target[key]?.length?'<h3>'+title+'</h3>'+recordedCards(target[key],false,target.key+':'+key):'').join('')+
  '<h3>獲得記録</h3>'+(rewards.length?'<ul>'+rewards.map(r=>'<li>'+esc(r.label)+'</li>').join('')+'</ul>':'<p class="cj-muted">記録なし</p>')+
  '<p class="cj-muted">現在の手札・次に出す札は未公開。</p>';
}
// Keep the immediate source visible beside its detail, with a back path to the list.
function recordsPanelView(){
 const parent=recordsView(),target=list(d().knowledge_views).find(t=>t.key===recordTarget);
 const childTitle=recordDetail?.name||target?.name,hasChild=!!childTitle;
 const head=(title,back)=>'<div class="cj-inspect-top">'+(back?button(icon('arrow-left'),'record-back','aria-label="'+esc(back)+'"','cj-record-back'):panelTrail.length?button(icon('arrow-left'),'window-back','aria-label="元の窓に戻る"','cj-icon-button'):'')+'<h2>'+esc(title)+'</h2>'+button(icon('x'),'close','aria-label="調査記録を閉じる"','cj-icon-button')+'</div>';
 const pane=(key,title,body,back='')=>'<section class="cj-inspect-item" data-inspect-key="'+esc(key)+'">'+head(title,back)+'<div class="cj-inspect-scroll">'+body+'</div></section>';
 const detailBody=recordTargetBody(); // Also registers public snapshot entries.
 const source=recordDetail&&target?pane('target:'+recordTarget,target.name,detailBody,'調査記録の一覧に戻る'):pane('records:'+recordTab,'調査記録',parent);
 return source+(hasChild?pane(recordDetail?'record:'+recordDetail.key:'target:'+recordTarget,childTitle,recordDetail?recordDetailView():detailBody,recordDetail&&target?target.name+'に戻る':'調査記録の一覧に戻る'):'');
}
function recordDetailView(){
 const entry=recordDetail;return cardFacts(entry.snapshot||entry.detail,!!entry.snapshot);
}

// Public history preserves read/unread; opening it never invents a historical read command.
function textHistoryView(){const rows=list(d().text_history).filter(t=>t.published&&(t.kind!=='detail'||t.read));return rows.length?'<div class="cj-text-history">'+rows.map((t,i)=>'<section data-history-text="'+esc(t.id)+'"><h3>'+('記録 '+(i+1))+'</h3><p class="cj-prose">'+esc(t.short_text||t.detail_text||'')+'</p></section>').join('')+'</div>':'<p>文章の記録はまだありません</p>'; }
