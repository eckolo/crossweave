'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict');
const {load}=require('./load.cjs'),selected=require('./selection.json'),runtime=load(selected.variant);
const {Session}=runtime.req('posture_am/session.js'),{AH}=runtime,source=require('../input.json');
const seeds=JSON.parse(cp.execFileSync('python3',[path.join(__dirname,'../reward_build_inputs.py')],{maxBuffer:32e6}));
const copy=AH.copy,rows=[];let restoreChecks=0,settlementChecks=0,transitions=0;
function play(session,policy='progress_first'){
  let restored=false;
  while(!session.game.s.outcome){
    if(!restored&&session.game.s.actors.P.actions>=10){
      const next=new Session(source,session.seeds,session.save());assert.deepEqual(next.save(),session.save());
      const ch=AH.choose(session.game,policy);next.action(ch);session.action(ch);assert.deepEqual(next.save(),session.save());restored=true;restoreChecks++;
    }else session.action(AH.choose(session.game,policy));
  }
  const state=session.save(),next=new Session(source,session.seeds,state);assert.deepEqual(next.save(),state);settlementChecks++;
  return {outcome:session.game.s.outcome,actions:session.game.s.actors.P.actions,hp:session.game.s.actors.P.hp,points:session.data.profile.points,receipt:copy(session.data.receipt)};
}
for(const route of ['A','B'])for(let seed=0;seed<16;seed++){
  const bank=[seeds[seed],seeds[(seed+1)%16],seeds[(seed+2)%16]],s=new Session(source,bank);
  assert.equal(s.data.profile.points,0);s.depart(route,s.data.counts,[]);
  const first=play(s),row={route,seed,first};rows.push(row);if(first.outcome!=='clear')continue;
  s.home();const counts=copy(s.data.counts),reward=route==='A'?'brace':'stored';
  assert(s.data.profile.unlocked.includes(reward));counts.h--;counts[reward]=1;
  s.depart('C',counts,['PS02']);row.C=play(s);transitions++;
  if(row.C.outcome==='defeat'){
    s.home();const before=copy(s.data.profile),plan=s.plan(s.data.counts,['PS04']);
    assert.equal(plan.profile.points,before.points);assert.equal(plan.view.points.refunded,2);
    s.depart('C',s.data.counts,['PS04']);row.retry=play(s);
  }
}
// Normal return uses the first protected boundary, with no HP/stance reset.
const s=new Session(source,seeds);s.depart('A',s.data.counts,[]);
while(!s.game.s.outcome&&!Object.values(s.game.s.rewards).some(r=>r.protected))s.action(AH.choose(s.game,'progress_first'));
assert(!s.game.s.outcome);const actor=copy(s.game.s.actors.P);s.withdraw();assert.deepEqual(s.game.s.actors.P,actor);assert.equal(s.data.receipt.gained_points,1);
const baseline=s.save();assert.throws(()=>new Session(source,seeds,{...baseline,schema:'AJ1'}));
const result={trial:'AM1',initial_runs:32,transitions,restoreChecks,settlementChecks,rows,
  checks:['実獲得ポイントだけでPS02を習得し、片側の保証報酬1枚でCへ進む','死亡も含めて全32開始を保存','死亡後のPS04無料取り直しと1回再挑戦','保護後の撤退はHP・体勢を変えず精算','AM1で旧AJセーブを拒否']};
fs.writeFileSync(path.join(__dirname,'journey-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({initial_runs:32,transitions,restoreChecks,settlementChecks,summary:['A','B'].map(route=>{const a=rows.filter(r=>r.route===route);return {route,first_clear:a.filter(r=>r.first.outcome==='clear').length,C_clear:a.filter(r=>r.C?.outcome==='clear').length,retries:a.filter(r=>r.retry).length,retry_clear:a.filter(r=>r.retry?.outcome==='clear').length};})}));
