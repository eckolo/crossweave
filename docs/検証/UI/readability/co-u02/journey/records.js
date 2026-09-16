// Read-only grouping of public knowledge. Never resolve private IDs or infer counts.
function recordedCards(rows,counts=false){
 return '<table class="cj-record-cards"><thead><tr><th>札</th><th>属性</th>'+(counts?'<th>初期枚数</th>':'')+'</tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.card.name)+'</td><td>'+esc(row.card.attr)+'</td>'+(counts?'<td>'+esc(row.initial_count)+'</td>':'')+'</tr>').join('')+'</tbody></table>';
}
function recordsView(){
 const tabs='<div class="cj-record-tabs">'+button('相手・環境','record-tab','data-tab="targets" aria-pressed="'+(recordTab==='targets')+'"')+button('札','record-tab','data-tab="cards" aria-pressed="'+(recordTab==='cards')+'"')+'</div>';
 if(recordTab==='cards'){
  const cards=(d().case?.unlocked_card_ids||[]).map(base=>'base:'+base).filter(id=>info(id).name);
  return tabs+'<p class="cj-record-purpose">判明した札の性能</p><div class="cj-record-list">'+cards.map(id=>detailsButton(id)).join('')+'</div>';
 }
 const targets=list(d().knowledge_views);
 return tabs+'<p class="cj-record-purpose">探索で判明した構成と札</p><div class="cj-record-targets">'+targets.map(target=>{
  const catalogue=target.initial_catalogue?.cards,open=recordTarget===target.target_id;
  let body='';
  if(open){
   const observed=[...new Map([...(target.observed_by_current_actor||[]),...(target.observed_elsewhere_this_run||[]),...(target.observed_earlier||[])].map(row=>[JSON.stringify(row.card),row])).values()];
   body='<div class="cj-record-content"><h3>基本構成</h3>'+(catalogue?recordedCards(catalogue,true):'<p class="cj-muted">まだ判明していない</p>')+
    '<h3>観測した札</h3>'+(observed.length?recordedCards(observed):'<p class="cj-muted">観測なし</p>')+
    '<p class="cj-muted">現在の手札・次に出す札は未公開。</p></div>';
  }
  return '<section class="cj-record-target">'+button('<strong>'+esc(target.name)+'</strong><small>基本構成 '+(catalogue?'判明':'未判明')+'</small>','record-target','data-id="'+esc(target.target_id)+'" aria-expanded="'+open+'"')+body+'</section>';
 }).join('')+'</div>';
}
