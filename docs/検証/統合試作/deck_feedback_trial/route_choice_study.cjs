/* AB: the same naturally reached 95 entry states, choosing the remaining environment first. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {inputs,T,runObserved,continuation}=require('./continuity_study.cjs');
const root=__dirname,rows=[];
let baselineChecks=0,controls=0;
for(const input of inputs)for(const build of Object.keys(T.builds))for(const policy of ['attack_first','guard_exposed'])for(const route of ['rock','environment']){
  const {bundle,checkpoints,row}=runObserved(input,build,'chain',route,policy);baselineChecks++;
  if(!checkpoints.entry){rows.push({seed:input.seed,build,policy,route,entry:false,baseline:{outcome:row.outcome},exit_first:null});continue;}
  // Fixed public target order only; HP, cards, fields, timers, rewards, memory and RNG are the reached state.
  const original=continuation(bundle,checkpoints.entry,route,policy,false);
  assert.equal(original.final_hash,row.final_hash);
  const alternative=continuation(bundle,checkpoints.entry,route,policy,false,'exit_first');
  assert.equal(alternative.hp_added,0);assert.equal(alternative.start_actions,original.start_actions);controls++;
  rows.push({seed:input.seed,build,policy,route,entry:true,entry_state:checkpoints.entry.state,baseline:original,exit_first:alternative});
}
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const summary=[];
for(const route of ['rock','environment'])for(const build of Object.keys(T.builds)){
  const all=rows.filter(r=>r.route===route&&r.build===build),reached=all.filter(r=>r.entry);
  summary.push({route,build,original_inputs:all.length,entry_states:reached.length,
    baseline_clears:reached.filter(r=>r.baseline.outcome==='clear').length,exit_first_clears:reached.filter(r=>r.exit_first.outcome==='clear').length,
    rescued:reached.filter(r=>r.baseline.outcome!=='clear'&&r.exit_first.outcome==='clear').length,
    reversed:reached.filter(r=>r.baseline.outcome==='clear'&&r.exit_first.outcome!=='clear').length,
    baseline_enemy_rewards_kept:reached.filter(r=>r.baseline.kept.includes('E')).length,
    exit_first_enemy_rewards_kept:reached.filter(r=>r.exit_first.kept.includes('E')).length,
    baseline_followup_actions_median:median(reached.map(r=>r.baseline.decisions)),
    exit_first_followup_actions_median:median(reached.map(r=>r.exit_first.decisions)),
    both_clear_action_differences:reached.filter(r=>r.baseline.outcome==='clear'&&r.exit_first.outcome==='clear').map(r=>({seed:r.seed,policy:r.policy,delta:r.exit_first.decisions-r.baseline.decisions}))});
}
const result={version:'AB1',base_commit:'7f2ee7a9bc7fd707c8819d427357a7ec5df96e05',
  method:'Every naturally reached followup entry in the same 96 Z chain conditions. Change only the public P target priority E1/V1 to V1/E1 after entry; retain healing, guard policy and card ranking. No health restoration. Missing entry states are retained as unreachable, not discarded from original-input counts.',
  limits:['Dependent conditions, not independent players or optimal policies.','Entry states share Z0..Z7; this is not validation on new seeds.','Successful environment-first completion can retire a living enemy and forgo its reward. Incidental enemy death by the environment still counts normally.','No new event, card, reward, protection or forced retreat rule is introduced.','Targets change future card circulation and RNG use; this is a policy comparison, not a same-future controlled replay.'],
  checks:{baseline_final_hashes:baselineChecks,unmodified_continuations:controls,target_priority_controls:controls,hp_conservation:true},
  sources:Object.fromEntries(['continuity_study.cjs','terrain.js','engine.js','input.json','event_inputs.py'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')])),summary,rows};
fs.writeFileSync(path.join(root,'route_choice_results.json'),JSON.stringify(result)+'\n');
console.log(JSON.stringify({checks:result.checks,summary},null,2));
