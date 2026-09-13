/* AD: D41 retention, with three explicitly experimental initial-catalogue disclosure policies. */
'use strict';
const I=require('./information.js');
const policies=['observations_only','first_encounter','first_resolution'];
const ac=ledger=>({schema:'AC1',events:ledger.events});
function addEncounter(ledger,event){
  const value=Object.fromEntries(['id','run','version','profile','actor'].map(k=>[k,event[k]]));
  if(Object.values(value).some(v=>!v))throw Error('Missing encounter identity');
  const prior=ledger.encounters.find(e=>e.id===value.id);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(value))throw Error('Conflicting encounter identity');
  if(!prior)ledger.encounters.push(value);
}
function validate(saved){
  if(!['AC1','AD1'].includes(saved.schema))throw Error('Unsupported knowledge schema');
  const ledger={schema:'AD1',events:I.validate(ac(saved)).events,encounters:[]};
  // AC has no explicit encounter records. Import its actual evidence without inventing any.
  for(const e of saved.encounters||[])addEncounter(ledger,e);
  return ledger;
}

// The caller supplies only already-public facts. Catalogues are authored initial
// profiles, never the current actor's private deck, hand, or shuffled order.
function receive(ledger,event,policy,catalogues){
  if(ledger.schema!=='AD1')throw Error('Use an AD knowledge ledger');
  if(!policies.includes(policy))throw Error('Unknown disclosure trial');
  if(['observed_card','observed_reward'].includes(event.kind)){I.add(ac(ledger),event);return ledger;}
  if(!['encounter','resolution'].includes(event.kind))throw Error('Unsupported public fact');
  if(!event.id||!event.run||!event.profile||!event.version||!event.actor)throw Error('Missing public fact identity');
  if(event.kind==='resolution'&&!['defeated','traversed','retired'].includes(event.result))throw Error('Unknown resolution');
  if(event.kind==='encounter')addEncounter(ledger,event);
  const eligible=policy==='first_encounter'&&event.kind==='encounter'||
    policy==='first_resolution'&&event.kind==='resolution'&&['defeated','traversed'].includes(event.result);
  if(!eligible)return ledger;
  if(ledger.events.some(e=>e.kind==='initial_catalogue_grant'&&e.profile===event.profile&&e.version===event.version))return ledger;
  const catalogue=catalogues[event.version]?.[event.profile];
  if(!catalogue?.length)throw Error('No authored initial catalogue for this disclosed profile');
  I.add(ac(ledger),{id:'grant:'+event.id,run:event.run,version:event.version,profile:event.profile,
    kind:'initial_catalogue_grant',complete:true,
    evidence:`AD trial ${policy}: public fact ${event.id} (${event.kind==='resolution'?event.result:'encounter'})`,
    cards:catalogue});
  return ledger;
}

// D41 selects the approved mode; AC retains its historical comparison function.
function carry(before,current,outcome){
  const existing=validate(before),incoming=validate(current),fresh=I.empty();
  for(const event of incoming.events){
    const sameId=existing.events.find(e=>e.id===event.id);
    if(sameId){I.add(ac(existing),event);continue;} // Validate conflicting event identities too.
    if(event.kind==='initial_catalogue_grant'){
      const prior=existing.events.find(e=>e.kind==='initial_catalogue_grant'&&e.profile===event.profile&&e.version===event.version);
      if(prior){
        if(JSON.stringify(prior.cards)!==JSON.stringify(event.cards))throw Error('Conflicting initial catalogues for one version');
        continue; // Keep the first disclosure's provenance when another run reveals the same fact.
      }
    }
    I.add(fresh,event);
  }
  const kept=I.carryKnowledge(ac(existing),fresh,outcome,'observed_immediately');
  for(const e of incoming.encounters)addEncounter(existing,e);
  return {schema:'AD1',events:kept.events,encounters:existing.encounters};
}
function replay(facts,policy,catalogues,before=I.empty()){
  const ledger=validate(before);
  for(const fact of facts)receive(ledger,fact,policy,catalogues);
  return ledger;
}
function departure({briefing,ledger,version,profiles}){
  return {summary:briefing.summary,goals:[...briefing.goals],basis:briefing.basis,
    knowledge:profiles.map(profile=>({...I.profileView(ledger,profile,version,null),
      encounter_history:(ledger.encounters||[]).filter(e=>e.profile===profile).map(e=>({...e}))}))
      .filter(k=>k.encounter_history.length||k.initial_catalogue||k.observed_earlier.length||k.confirmed_reward_candidates.length||k.historical_evidence_count)};
}
module.exports={receive,carry,replay,departure,validate,policies};
