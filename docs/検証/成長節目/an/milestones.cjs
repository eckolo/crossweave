'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const cfg=require('./milestones.json'),rows=[];
for(const stage of cfg.stages){
  const entries=Object.entries(stage.skills),all=entries.reduce((s,[,c])=>s+c,0);
  const subsets=Array.from({length:2**entries.length},(_,mask)=>entries.filter((_,i)=>mask&(1<<i)));
  for(const earned of cfg.budgets)for(const mode of ['uncapped','stage_cap']){
    const budget=mode==='uncapped'?earned:Math.min(earned,stage.cap_comparison);
    const feasible=subsets.filter(xs=>xs.reduce((s,[,cost])=>s+cost,0)<=budget);
    for(const xs of feasible){
      const spent=xs.reduce((s,[,cost])=>s+cost,0),liquid=earned-spent;
      assert.equal(liquid+spent,earned);assert.equal(Math.min(liquid+spent,budget),budget);
    }
    rows.push({stage:stage.id,mode,earned,usable:budget,temporarily_unusable:earned-budget,
      all_cost:all,can_learn_all:all<=budget,max_count:Math.max(...feasible.map(xs=>xs.length)),
      combinations_including_empty:feasible.length});
  }
}
const x=cfg.refund_example;assert.equal(x.liquid+x.historically_spent,x.earned);
const refund={...x,after_full_refund_liquid:x.liquid+x.historically_spent,usable_after_refund:Math.min(x.earned,x.cap),above_cap:Math.max(0,x.earned-x.cap)};
assert.equal(refund.after_full_refund_liquid,10);assert.equal(refund.usable_after_refund,8);assert.equal(refund.above_cap,2);
const out={trial:'AN1-budget',input_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'milestones.json'))).digest('hex'),rows,refund};
fs.writeFileSync(path.join(__dirname,'milestone-results.json'),JSON.stringify(out,null,2)+'\n');
process.stdout.write(JSON.stringify({comparisons:rows.length,refund,selected:rows.filter(r=>[5,6,8,14].includes(r.earned))},null,2)+'\n');
