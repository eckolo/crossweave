/* Optional review catalogue. Selection is presentation state, never a casebook write.
 * Only the existing public case may depart. Other entries are UI-only fixtures. */
const destinationOptions=Array.isArray(destinationPreview)?clone(destinationPreview):[];
let selectedDestinationId=null;
root.dataset.destinationPreview=String(destinationOptions.length>0);
function destinationItem(){
 const item=destinationOptions.find(x=>x.id===selectedDestinationId)||destinationOptions.find(x=>x.id===d()?.case?.id)||destinationOptions[0];
 if(!item)return null;
 const current=item.id===d()?.case?.id&&!item.previewOnly;
 return {...item,current,name:current?title:item.name,
  status:current?(d().case.status==='resolved'?'踏破済み':'未踏破'):item.status,
  objective:current?(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発時に確認できます。'):item.objective};
}
function destinationCanDepart(){return !(acquisitionPreview&&collection?.modified())&&(!destinationOptions.length||destinationItem()?.current===true);}
function destinationHeading(){return destinationItem()?.name||title;}
function destinationClues(item){return '<div class="cj-destination-clues">'+(item.clues||[]).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>';}
function destinationBoard(){
 const selected=destinationItem();
 const choices=destinationOptions.map(item=>{
  const on=item.id===selected.id,current=item.id===d().case.id&&!item.previewOnly;
  const status=current?(d().case.status==='resolved'?'踏破済み':'未踏破'):item.status;
  return button('<span class="cj-destination-check" aria-hidden="true">'+icon(on?'check':'map-pin')+'</span><span class="cj-destination-name">'+esc(current?title:item.name)+'</span><small>'+esc(status)+'</small><span class="cj-destination-hint">'+esc(item.clues.join(' · '))+'</span>',
   'select-destination','data-id="'+esc(item.id)+'" data-focus="destination-'+esc(item.id)+'" aria-pressed="'+on+'" aria-controls="cj-selected-destination"','cj-destination-choice');
 }).join('');
 return '<section class="cj-fixed-hub cj-destinations">'+landscape()+
  '<div class="cj-destination-list" role="group" aria-label="探索先を一つ選択">'+choices+'</div>'+
  '<section id="cj-selected-destination" class="cj-selected-destination" aria-label="選択中の探索先" aria-live="polite" aria-atomic="true">'+
   '<small>'+esc(selected.status)+'</small><h2>'+esc(selected.name)+'</h2>'+destinationClues(selected)+
   '<h3>目的</h3><p class="cj-prose">'+esc(selected.objective)+'</p>'+button('詳細','destination','aria-label="'+esc(selected.name)+'の詳細"')+'</section></section>';
}
function destinationDescription(){
 const item=destinationItem();
 if(!item)return '<p>'+esc(d().texts?.[d().case.objective_text_id]?.short_text||'目的は出発後の本文で確認できます')+'</p>';
 return '<h3>目的</h3><p class="cj-prose">'+esc(item.objective)+'</p><h3>攻略の手掛かり</h3>'+destinationClues(item);
}
