'use strict';
const assert=require('assert/strict'),fs=require('fs'),crypto=require('crypto');
const N=require('./src/scenario.js');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const result={trial:'PT-NT-001',human_play:false,seed:N.seed.seed,runs:[],checks:[],replay_fixtures:[],prediction_checks:0,restores:0};
function checked(session){
  const play=session.game.play.bind(session.game);
  session.game.play=function(w,ch){const pred=this.predict(ch,w);play(w,ch);const actual=this.trace.findLast(r=>r.type==='action');
    for(const key of ['mode','hit_gain','hit_connected','actual_hp_loss','hp_restored','posture_after','posture_multiplier'])assert.deepEqual(actual[key],pred[key],key);
    if(pred.mode==='guard')assert.deepEqual(this.s.actors[w].guard,pred.guard);result.prediction_checks++;
  };
}
function replayFixture(s,name){result.replay_fixtures.push({id:name,choices:N.copy(s.data.choices),pause:s.data.pause,seen:s.data.seen.slice(),public:s.game.public(),state_sha256:hash(s.game.save())});}
let portSave,enemySave,mixedSave;
for(const build of ['guard3','guard5','guard0'])for(const policy of ['progress_first','side_first']){
  let s=new N.Session();s.depart(N.AH.countsFor(N.source,build));checked(s);let safety=0;
  while(s.data.phase==='exploring'){
    assert(++safety<170);
    if(s.data.pause){
      if(s.data.pause==='port'){
        assert(!s.game.s.actors.V0.active&&!s.game.s.actors.E1.active&&s.game.s.actors.V1.active);
        assert(s.game.s.rewards['A/V0'].protected);
        if(policy==='progress_first'){assert(!s.game.s.rewards['A/E1']);assert(!s.game.s.ah.knowledge.events.some(e=>e.profile==='A/E1'&&e.kind==='initial_catalogue_grant'));}
        if(build==='guard3'&&policy==='progress_first'){portSave=s.save();replayFixture(s,'PORT');}
        const prior=s.game.save();s.acknowledge();assert.deepEqual(s.game.save(),prior,'port narrative must not advance time/cards');continue;
      }
      s.acknowledge();
    }else{
      const choice=N.AH.choose(s.game,policy),saved=s.save(),restored=new N.Session(saved);
      assert.deepEqual(restored.game.save(),s.game.save());
      restored.action(choice);s.action(choice);assert.deepEqual(restored.game.save(),s.game.save(),'restored continuation');result.restores++;
      if(build==='guard3'&&policy==='side_first'&&s.game.s.rewards['A/E1']&&!s.game.s.rewards['A/V0']&&!enemySave){enemySave=s.save();replayFixture(s,'ENEMY_UNPROTECTED');}
      if(build==='guard3'&&policy==='progress_first'&&s.game.s.actors.P.rebuilds&&!mixedSave){mixedSave=s.save();replayFixture(s,'REBUILT');}
    }
  }
  assert.equal(s.game.s.outcome,'clear');assert(s.data.receipt.return_hp===40);assert(s.data.receipt.points=== (policy==='side_first'?4:3));
  assert(s.game.s.ah.knowledge.events.some(e=>e.profile==='A/V1'&&e.kind==='initial_catalogue_grant'));
  result.runs.push({build,policy,actions:s.game.s.actors.P.actions,remaining_hp:s.game.s.actors.P.hp,receipt:s.data.receipt});
}
result.checks.push('six deterministic legal runs; both target orders; no refill/heal/reset at port; bypass is not defeat; predicted/actual posture and damage; save continuation');
assert(portSave&&enemySave&&mixedSave);
let s=new N.Session();s.depart();s.withdraw();assert.equal(s.data.receipt.points,0);assert.equal(s.game.s.outcome,'withdrawal');
s=new N.Session(enemySave);s.withdraw();assert.equal(s.data.receipt.points,0);assert.deepEqual(s.data.receipt.settlement.lost,['A/E1']);assert(s.data.profile.knowledge.events.some(e=>e.profile==='A/E1'&&e.kind==='initial_catalogue_grant'));
s=new N.Session(portSave);s.withdraw();assert.equal(s.data.receipt.points,1);assert(!s.data.seen.includes('gate'));assert.equal(s.data.phase,'return');
s=new N.Session(portSave);s.acknowledge();s.withdraw();assert.equal(s.data.receipt.points,1);assert(s.data.seen.includes('gate'));
// Defeat settlement after protection is an explicit boundary fixture, not a human run.
s=new N.Session(portSave);s.game.s.actors.P.hp=0;s.game.dispatch('P','V1');s.checkpoint();assert.equal(s.data.receipt.points,0);assert.deepEqual(s.data.receipt.settlement.lost,['A/V0']);assert(s.data.profile.knowledge.events.length>0);
result.checks.push('withdrawal before/after protection; observed knowledge retained; explicit protected-reward defeat fixture loses current rewards');
s=new N.Session();s.depart();let n=0;while(s.data.phase==='exploring'&&n++<170){if(s.data.pause)s.acknowledge();else{const c=s.game.choices().map(ch=>({ch,p:s.game.predict(ch)}));s.action((c.find(x=>x.p.mode==='place')||c.find(x=>x.p.mode==='guard')||c[0]).ch);}}assert.equal(s.game.s.outcome,'defeat');result.checks.push('legal passive play reaches defeat without state injection');
s=new N.Session();s.data.counts.f--;assert(new N.Session(s.save()));assert.throws(()=>s.depart());assert.throws(()=>new N.Session({...s.save(),schema:'AM1'}));
result.checks.push('unfinished deck draft can be resumed but cannot depart; old trial save rejected');
fs.mkdirSync('verification',{recursive:true});fs.writeFileSync('verification/engine.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({runs:result.runs.length,predictions:result.prediction_checks,restores:result.restores,checks:result.checks.length,fixtures:result.replay_fixtures.map(x=>x.id)}));
