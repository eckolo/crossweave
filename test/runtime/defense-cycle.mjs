// Content experiment. The temporary modules are byte-identical to production runtime.
// Only their pinned content module is replaced; no alternate resolver or production save.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import C from '../../src/content/m1.mjs';
import {canonical,copy} from '../../src/runtime/common.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.argv[2]||path.join(root,'docs/検証/接続条件/co-d02/defense-cycle'));
const inputPath='test/runtime/defense-cycle-input.json';
const input=JSON.parse(await fs.readFile(path.join(root,inputPath),'utf8'));
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'crossweave-defense-cycle-'));
const runs=[],examples={},moduleHashes={};
const bump=(obj,key,n=1)=>obj[key]=(obj[key]||0)+n;
const ward=e=>e.effect_kind==='ward';
const ek=e=>e.source_actor_id+'|'+e.effect_kind;
const beforeState=g=>Object.fromEntries(Object.entries(g.s.actors).map(([id,a])=>[id,{active:a.active,hp:a.hp,effects:copy(a.defense_effects)}]));

function choose(g,policy){
  // Match support.mjs's public-only probe, with priorities declared in this input.
  const pub=g.public(),P=pub.actors.P,hand=Object.fromEntries(P.hand.map(c=>[c.id,c]));
  let options=g.choices().map(choice=>({choice,card:hand[choice.card_id],p:g.predict(choice)}));
  const tie=(a,b)=>a.card.remaining-b.card.remaining||a.card.id.localeCompare(b.card.id);
  const heals=options.filter(x=>x.p.mode==='heal'&&(x.p.hp_restored>=x.card.power||x.card.remaining===1&&x.p.hp_restored>0));
  if(heals.length)return heals.sort((a,b)=>b.p.hp_restored-a.p.hp_restored||tie(a,b))[0].choice;
  const nonheal=options.filter(x=>x.card.kind!=='heal');if(nonheal.length)options=nonheal;
  const guards=options.filter(x=>x.p.mode==='guard'&&(x.p.guard.value>0||x.p.guard.evasion>0))
    .sort((a,b)=>b.p.guard.evasion-a.p.guard.evasion||b.p.guard.value-a.p.guard.value||tie(a,b));
  if(policy==='guard_first'&&!P.defense.effects.some(e=>e.effect_kind==='self_guard')&&guards.length)return guards[0].choice;
  const attacks=options.filter(x=>x.p.mode==='attack').sort((a,b)=>(a.choice.target==='V0'?0:1)-(b.choice.target==='V0'?0:1)
    ||b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.card.power-a.card.power||tie(a,b));
  if(attacks.length)return attacks[0].choice;
  if(guards.length)return guards[0].choice;
  return options.sort((a,b)=>a.card.remaining-b.card.remaining||a.p.action_cost-b.p.action_cost||a.card.id.localeCompare(b.card.id))[0].choice;
}

function contentFor(v,selfUses){
  const c=copy(C),tag=v.id+'-self'+(selfUses===null?'unlimited':selfUses);
  c.content_set_id=input.id+'/'+tag;c.card_registry_id=input.id+'/cards/'+tag;
  const self={...copy(input.self_card),defense_uses:selfUses};
  c.cards[self.type]={...copy(c.cards.g),card:self};
  if(v.copies){
    const support=copy(input.support_card);support.defense_grant.uses=v.uses;
    if(!v.grant){support.kind='none';delete support.defense_grant;support.name='効果なし対照札（試行）';}
    c.cards[support.type]={...copy(c.cards.g),card:support};
    const t=c.targets['SCN-001-ACT01'];
    t.initial_replacements.push({base:'weak_B',count:v.copies,replacement:support.type});
    t.initial_card_counts.weak_B-=v.copies;t.initial_card_counts[support.type]=v.copies;
  }
  for(const t of Object.values(c.targets))t.catalogue_version=c.card_registry_id+'/'+t.id;
  return c;
}

function observe(g,before,row,metrics,details){
  if(!row)return;
  const card=g.s.cards[row.card_id];
  if(card.type===input.support_card.type){
    bump(metrics,'support_'+row.mode);bump(metrics,'support_actions_by_'+row.actor);
    if(row.mode==='defense_support'){
      bump(metrics,'grant_actions');bump(metrics,'grant_actions_by_'+row.actor);
      if(metrics.first_grant_P_action===null)metrics.first_grant_P_action=g.s.actors.P.actions;
      details.push({time:row.time,at_P_action:g.s.actors.P.actions,actor:row.actor,card_id:card.id,
        origin:card.origin,mode:row.mode,recipients:Object.entries(g.s.actors).filter(([id,a])=>id!==row.actor&&a.active).map(([id,a])=>({id,effect:a.defense_effects.find(e=>ward(e)&&e.source_actor_id===row.actor)}))});
    }
  }
  if(row.mode==='attack'&&row.target==='P'){
    bump(metrics,'P_incoming_attacks');
    if(before.P.effects.some(ward))bump(metrics,'P_attacks_with_ward');
    bump(metrics,'P_hp_loss',row.actual_hp_loss);
  }
  if(row.actor==='P'&&row.mode==='guard')bump(metrics,'P_self_guard_matches');
  for(const [id,a] of Object.entries(g.s.actors)){
    const old=before[id]?.effects||[],current=a.defense_effects;
    if(row.mode==='defense_support'&&id!==row.actor&&a.active){
      const prev=old.find(e=>ward(e)&&e.source_actor_id===row.actor);
      bump(metrics,id+'_ward_grants');if(prev)bump(metrics,id+'_ward_refreshes');
    }
    for(const e of old.filter(ward)){
      if(!current.some(x=>ek(x)===ek(e))){
        const reason=!a.active?'recipient_retired':row.actor===id&&row.matched_id?'owner_match':
          row.mode==='attack'&&row.target===id&&e.uses===1?'uses_spent':'unexpected';
        assert.notEqual(reason,'unexpected');bump(metrics,id+'_ward_end_'+reason);
      }
    }
  }
}

await fs.mkdir(output,{recursive:true});
try{
  assert.equal(C.rule_set_id,'CW-M1-rules-0.4');assert.equal(C.engine_version,'CW-M1-engine-0.4');
  const runtimeNames=(await fs.readdir(path.join(root,'src/runtime'))).filter(x=>x.endsWith('.mjs')).sort();
  for(const f of ['src/content/m1.mjs',inputPath,'test/runtime/defense-cycle.mjs',...runtimeNames.map(x=>'src/runtime/'+x)])
    moduleHashes[f]=hash(await fs.readFile(path.join(root,f)));
  for(const variant of input.supply_variants)for(const selfUses of input.self_duration_variants){
    const content=contentFor(variant,selfUses),dir=path.join(tmp,variant.id+'-'+String(selfUses));
    await fs.mkdir(path.join(dir,'src/content'),{recursive:true});
    await fs.cp(path.join(root,'src/runtime'),path.join(dir,'src/runtime'),{recursive:true});
    for(const name of runtimeNames)assert.equal(hash(await fs.readFile(path.join(dir,'src/runtime',name))),moduleHashes['src/runtime/'+name]);
    await fs.writeFile(path.join(dir,'src/content/m1.mjs'),'export default '+JSON.stringify(content)+';\n');
    const {Game,departGame,bundleFor}=await import(pathToFileURL(path.join(dir,'src/runtime/game.mjs')).href);
    for(const policy of input.policies)for(const seed of input.seeds){
      const key=variant.id+'/self'+String(selfUses)+'/'+policy+'/'+seed;
      const initial=await departGame({target_set_id:input.target_set_id,run:key,seed,
        deck:Object.entries(input.player_deck_counts).flatMap(([type,n])=>Array(n).fill('base:'+type)),
        learned:{},equipped:[],knowledge:{schema:'AD1',events:[],encounters:[]}});
      const bundle={...bundleFor(input.target_set_id),future_rng:copy(initial.future_rng)};
      let g=new Game(bundle,initial),reopened=false,traceBeforeReopen=[],previewChecks=0;
      const metrics={first_grant_P_action:null},details=[];
      // Assertions check experiment construction, not game balance or UI quality.
      assert.equal(Object.values(g.s.cards).filter(c=>c.origin==='V0'&&c.type===input.support_card.type).length,variant.copies);
      assert.equal(g.s.actors.P.deck.length,12);assert.equal(g.s.actors.V0.deck.length,12);
      for(let steps=0;g.s.actors.V0.active&&!g.s.outcome&&g.s.actors.P.actions<input.player_action_limit;steps++){
        assert(steps<2000,'step ceiling');assert(!g.s.pending_scene,'unexpected scene before first passage');
        const before=beforeState(g),startTrace=g.trace.length;
        let preview=null,choice=null;
        if(g.s.ready){
          if(g.defense('P').duration.all.status==='mixed')bump(metrics,'P_mixed_duration_turns');
          if(g.s.actors.P.defense_effects.some(ward))bump(metrics,'P_turns_with_ward');
          choice=choose(g,policy);
          // One selected-action forecast per run; old exhaustive resolver tests remain fixed.
          if(!previewChecks){
            const snapshot=hash(g.save());preview=g.predict(choice);assert.equal(hash(g.save()),snapshot);
          }
        }
        g.step(choice);
        const added=g.trace.slice(startTrace),row=added.findLast(x=>x.type==='action');
        observe(g,before,row,metrics,details);
        for(const event of added){
          if(event.type==='draw'&&g.s.cards[event.card_id].type===input.support_card.type)bump(metrics,'support_draws_by_'+event.actor);
          if(event.type==='action'){
            for(const id of event.expired)if(g.s.cards[id].type===input.support_card.type)bump(metrics,'support_expired');
            if(event.matched_id&&g.s.cards[event.matched_id].type===input.support_card.type)bump(metrics,'support_used_as_material');
          }
        }
        if(preview){
          for(const [id,change] of Object.entries(preview.actor_changes))if(change.status==='known')assert.deepEqual(change.defense.after,g.defense(id));
          previewChecks++;
        }
        if(!reopened&&g.s.actors.P.actions>=5){
          const saved=g.save();traceBeforeReopen=g.trace;
          g=new Game(copy(g.bundle),JSON.parse(JSON.stringify(saved)));assert.deepEqual(g.save(),saved);reopened=true;
        }
      }
      for(const [id,a] of Object.entries(g.s.actors))metrics[id+'_ward_at_stop']=a.defense_effects.filter(ward).length;
      const reason=!g.s.actors.V0.active?'passage':g.s.outcome||'action_limit';
      const row={id:key,variant:variant.id,self_uses:selfUses,policy,seed,content_sha256:hash(content),initial_sha256:hash(initial),
        stop:reason,P_actions:g.s.actors.P.actions,P_hp:g.s.actors.P.hp,V0_hp:g.s.actors.V0.hp,E1_hp:g.s.actors.E1.hp,
        now:g.s.now,reopened,selected_preview_checks:previewChecks,metrics,trace_sha256:hash([...traceBeforeReopen,...g.trace])};
      runs.push(row);
      // Deterministic examples: first encountered grant and first later grant by a borrower.
      if(details.length&&!examples.first_grant)examples.first_grant={run:key,events:details,summary:row};
      if(details.some(x=>x.actor!=='V0')&&!examples.borrowed_use)examples.borrowed_use={run:key,events:details,summary:row};
    }
    process.stdout.write(JSON.stringify({completed:variant.id,self_uses:selfUses,runs:runs.length})+'\n');
  }
  const total=input.supply_variants.length*input.self_duration_variants.length*input.policies.length*input.seeds.length;
  assert.equal(runs.length,total);assert.equal(new Set(runs.map(r=>r.id)).size,total);
  // All original source bytes remain intact, including generated production content.
  for(const [f,h] of Object.entries(moduleHashes))assert.equal(hash(await fs.readFile(path.join(root,f))),h);
  const groups=input.supply_variants.map(v=>{
    const rr=runs.filter(r=>r.variant===v.id),sum=k=>rr.reduce((n,r)=>n+(r.metrics[k]||0),0);
    return {variant:v.id,runs:rr.length,stops:Object.fromEntries([...new Set(rr.map(r=>r.stop))].map(k=>[k,rr.filter(r=>r.stop===k).length])),
      mean_P_actions:rr.reduce((n,r)=>n+r.P_actions,0)/rr.length,mean_P_hp:rr.reduce((n,r)=>n+r.P_hp,0)/rr.length,
      runs_with_grant:rr.filter(r=>r.metrics.grant_actions>0).length,
      grant_actions:sum('grant_actions'),grant_by_V0:sum('grant_actions_by_V0'),grant_by_P:sum('grant_actions_by_P'),grant_by_E1:sum('grant_actions_by_E1'),
      P_ward_grants:sum('P_ward_grants'),P_ward_refreshes:sum('P_ward_refreshes'),P_incoming_attacks:sum('P_incoming_attacks'),
      P_attacks_with_ward:sum('P_attacks_with_ward'),P_ward_end_owner_match:sum('P_ward_end_owner_match'),P_ward_end_uses_spent:sum('P_ward_end_uses_spent'),
      P_ward_at_stop:sum('P_ward_at_stop'),P_mixed_duration_turns:sum('P_mixed_duration_turns'),
      support_expired:sum('support_expired'),support_used_as_material:sum('support_used_as_material')};
  });
  const report={id:input.id,version:input.version,node:process.version,base_commit:input.base_commit,
    runtime_versions:{rule_set_id:C.rule_set_id,engine_version:C.engine_version,base_content_set_id:C.content_set_id},
    status:'completed',scope:input.scope,source_sha256:moduleHashes,runs:total,groups,
    checks:{temporary_runtime_identical:true,source_files_unchanged:true,unique_conditions:total,
      selected_forecasts:runs.reduce((n,r)=>n+r.selected_preview_checks,0),json_Game_roundtrips:runs.filter(r=>r.reopened).length},
    limitations:['SCN-001 first passage only; no full return/economy/Campaign migration/IndexedDB/UI validation',
      'Self duration control uses equal amount/attribute, not real guard versus dodge balance',
      'Two deterministic probes; no human understanding/enjoyment/strategy claim',
      'Support field modifiers remain the pre-existing fixed-value implementation; no new rule adopted'],results:runs};
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(output,'examples.json'),JSON.stringify({id:input.id,selection:'First encountered matching cases in input order; not selected by success',examples},null,2)+'\n');
  process.stdout.write(JSON.stringify({status:'completed',runs:total,groups})+'\n');
}finally{await fs.rm(tmp,{recursive:true,force:true});}
