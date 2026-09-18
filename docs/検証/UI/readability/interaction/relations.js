  // Overlay coordinates come from the actual card/actor elements, not a separate diagram.
  function relationPlan(s,cardId,targetId){
    const c=s.actors.P.hand.find(x=>x.id===cardId);
    if(!c||s.outcome)return null;
    const material=s.field[c.attr];
    return {card:c,material,mode:material?c.kind:'place',destination:material?(c.kind==='attack'?targetId:'P'):null};
  }
  function drawRelations(){
    const svg=get('cw-relations'),plan=game&&relationPlan(game.public(),selected,target);
    svg.replaceChildren();
    svg.toggleAttribute('hidden',!plan||!get('cw-diagram-setting').checked);
    if(svg.hasAttribute('hidden'))return;
    const canvas=svg.getBoundingClientRect();
    if(!canvas.width||!canvas.height)return;
    svg.setAttribute('viewBox',`0 0 ${canvas.width} ${canvas.height}`);
    const box=(node,viewport)=>{
      if(!node||!viewport)return null;
      const r=node.getBoundingClientRect(),v=viewport.getBoundingClientRect();
      const left=Math.max(r.left,v.left,canvas.left),right=Math.min(r.right,v.right,canvas.right);
      const top=Math.max(r.top,v.top,canvas.top),bottom=Math.min(r.bottom,v.bottom,canvas.bottom);
      if(right-left<4||bottom-top<4)return null;
      return {left:left-canvas.left,top:top-canvas.top,width:right-left,height:bottom-top};
    };
    const hand=box(root.querySelector(`[data-card="${plan.card.id}"]`),get('cw-hand'));
    const field=box([...get('cw-field').children].find(n=>n.dataset.attr===plan.card.attr),get('cw-field'));
    const dest=plan.destination==='P'?box(get('cw-self'),root.querySelector('.cw-footer-state')):
      plan.destination?box(get('cw-actors').querySelector(`[data-target="${plan.destination}"]`),get('cw-actors')):null;
    const edge=(r,side)=>({x:r.left+r.width/2,y:side==='top'?r.top+3:r.top+r.height-3});
    const segments=[];
    const connect=(from,to,key)=>{
      const y=(from.y+to.y)/2;
      segments.push(`<path data-link="${key}" d="M ${from.x} ${from.y} C ${from.x} ${y}, ${to.x} ${y}, ${to.x} ${to.y}"/>`);
    };
    if(hand&&field)connect(edge(hand,'top'),edge(field,'bottom'),'hand-field');
    if(field&&dest)connect(edge(field,plan.destination==='P'?'bottom':'top'),edge(dest,plan.destination==='P'?'top':'bottom'),'field-target');
    const marks=[[hand,'hand'],[field,'field'],[dest,'target']].filter(([r])=>r).map(([r,key])=>
      `<rect data-node="${key}" x="${r.left+2}" y="${r.top+2}" width="${r.width-4}" height="${r.height-4}" rx="7"/>`).join('');
    svg.dataset.mode=plan.mode;svg.dataset.target=plan.destination||'';
    svg.innerHTML=`<defs><marker id="cw-relation-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M 2 2 L 10 6 L 2 10"/></marker></defs><g class="cw-relation-marks">${marks}</g><g class="cw-relation-lines">${segments.join('')}</g>`;
  }
