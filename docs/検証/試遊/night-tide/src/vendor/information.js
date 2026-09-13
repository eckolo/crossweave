/* AC: trial information projection. Does not choose actions, mutate the game, or unlock knowledge automatically. */
'use strict';
const CWInformation = (() => {
  const copy=x=>JSON.parse(JSON.stringify(x));
  const cardKeys=['type','name','attr','kind','power','hit','evasion','crit_gain','field_power','field_hit','life','place_cost','match_cost','consume_on_recover'];
  const card=c=>Object.fromEntries(cardKeys.map(k=>[k,c[k]??null]));
  const signature=c=>JSON.stringify(card(c));
  function empty(){return {schema:'AC1',events:[]};}
  function add(ledger,event){
    if(ledger.schema!=='AC1')throw Error('Unsupported information schema');
    if(!event.id||!event.run||!event.version||!event.profile)throw Error('Missing evidence identity');
    let value={id:event.id,run:event.run,version:event.version,profile:event.profile,kind:event.kind};
    if(event.kind==='observed_card'){
      if(!event.actor)throw Error('Missing public actor');
      Object.assign(value,{actor:event.actor,time:event.time,card:card(event.card)});
    }else if(event.kind==='initial_catalogue_grant'){
      if(!event.evidence||!event.complete||!event.cards?.length)throw Error('Catalogue needs explicit complete initial knowledge');
      const grouped=new Map();
      for(const row of event.cards){
        if(!Number.isInteger(row.initial_count)||row.initial_count<1)throw Error('Invalid initial count');
        const key=signature(row.card);
        if(!grouped.has(key))grouped.set(key,{card:card(row.card),initial_count:0});
        grouped.get(key).initial_count+=row.initial_count;
      }
      Object.assign(value,{evidence:event.evidence,complete:true,cards:[...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v)});
    }else if(event.kind==='observed_reward'){
      if(!event.reward_key||!event.label)throw Error('Missing observed reward');
      Object.assign(value,{reward_key:event.reward_key,label:event.label,time:event.time});
    }else throw Error('Only explicit public evidence or catalogue grants are accepted');
    const found=ledger.events.find(e=>e.id===value.id);
    if(found){if(JSON.stringify(found)!==JSON.stringify(value))throw Error('Conflicting evidence ID');return ledger;}
    ledger.events.push(value);return ledger;
  }
  function validate(ledger){
    if(ledger.schema!=='AC1')throw Error('Unsupported information schema');
    const fresh=empty();for(const event of ledger.events)add(fresh,event);return fresh;
  }
  // These are two comparison candidates, not an adopted exploration-end rule.
  function carryKnowledge(before,current,outcome,mode){
    if(!['clear','withdrawal','defeat'].includes(outcome))throw Error('Exploration has not settled');
    if(!['observed_immediately','after_safe_return'].includes(mode))throw Error('Unknown retention candidate');
    const next=validate(before);
    if(mode==='observed_immediately'||outcome!=='defeat')for(const e of current.events)add(next,e);
    return next;
  }
  function profileView(ledger,profile,version,run,actor=null){
    const all=ledger.events.filter(e=>e.profile===profile);
    const current=all.filter(e=>e.version===version);
    const grants=current.filter(e=>e.kind==='initial_catalogue_grant');
    // Conflicting complete catalogues must be resolved by their data version, never silently combined.
    if(new Set(grants.map(e=>JSON.stringify(e.cards))).size>1)throw Error('Conflicting initial catalogues for one version');
    const catalogue=grants.at(-1)||null;
    const known=new Set(catalogue?.cards.map(e=>signature(e.card))||[]);
    function seen(events){
      const map=new Map();
      for(const e of events){
        const key=signature(e.card);
        if(!map.has(key))map.set(key,{card:e.card,evidence_ids:[],relation_to_initial:catalogue?(known.has(key)?'known_initial_kind':'outside_known_initial'):'initial_unknown'});
        map.get(key).evidence_ids.push(e.id);
      }
      return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>copy(v));
    }
    const rewards=new Map();
    for(const e of current.filter(e=>e.kind==='observed_reward')){
      if(!rewards.has(e.reward_key))rewards.set(e.reward_key,{reward_key:e.reward_key,label:e.label,evidence_ids:[]});
      rewards.get(e.reward_key).evidence_ids.push(e.id);
    }
    return {profile,initial_catalogue:catalogue?{basis:'explicit_experienced_knowledge',scope:'initial_composition',cards:copy(catalogue.cards),evidence:catalogue.evidence}:null,
      observed_by_current_actor:seen(current.filter(e=>e.kind==='observed_card'&&e.run===run&&e.actor===actor)),
      observed_elsewhere_this_run:seen(current.filter(e=>e.kind==='observed_card'&&e.run===run&&e.actor!==actor)),
      observed_earlier:seen(current.filter(e=>e.kind==='observed_card'&&e.run!==run)),
      confirmed_reward_candidates:[...rewards.values()].map(copy),
      historical_evidence_count:all.filter(e=>e.version!==version).length,
      current_private_composition:'unknown',next_card:'unknown'};
  }
  function departure({briefing,ledger,version,profiles}){
    return {summary:briefing.summary,goals:[...briefing.goals],basis:briefing.basis,
      knowledge:profiles.map(profile=>profileView(ledger,profile,version,null)).filter(k=>k.initial_catalogue||k.observed_earlier.length||k.confirmed_reward_candidates.length||k.historical_evidence_count)};
  }
  function encounter({publicState,ownCatalogue,ledger,version,run,profiles,consequences}){
    const active=Object.entries(publicState.actors).filter(([w,a])=>w!=='P'&&a.active);
    const settled=['clear','withdrawal','defeat'].includes(publicState.outcome);
    return {event:publicState.current_event,outcome:publicState.outcome,
      actors:active.map(([w,a])=>({actor:w,hp:a.hp,guard:copy(a.guard),hit:a.hit,crit:a.crit,evasion:a.evasion,
        reduction:a.reduction,hand_count:a.hand_count,deck_count:a.deck_count,
        knowledge:profiles[w]?profileView(ledger,profiles[w],version,run,w):null})),
      own_cards:ownCatalogue.map(r=>({card:card(r.card),remaining:r.remaining,hand:r.hand,initial:r.initial,doomed_remaining:r.doomed_remaining})),
      field:Object.fromEntries(Object.entries(publicState.field).map(([attr,c])=>[attr,{card:card(c),doomed:!!c.doomed}])),
      current_rewards:Object.entries(publicState.rewards).map(([key,r])=>({key,status:r.status,protected:!!r.protected,
        settlement:!settled?'pending':publicState.outcome==='clear'||publicState.outcome==='withdrawal'&&r.protected?'kept':'lost'})),
      on_completion:consequences.filter(c=>publicState.actors[c.target]?.active).map(c=>({target:c.target,description:c.description}))};
  }
  return {empty,add,validate,carryKnowledge,card,signature,profileView,departure,encounter};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CWInformation;
