/* Reproducible UI comparison states. No game rules or input values are edited. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const T=require('../fixed/terrain.js'),F=require('../fixed/feedback.js');
const root=__dirname;
const BASE='e9b5b0a27b6fc51694c347c7e941a28ff97856f5';
const expectedBlobs={
  'engine.js':'148df4635f0fb170c8c79e9dcb993484c5a504ef',
  'feedback.js':'9880d7a379c396cfa03041cefa5d5ff9fea1e8af',
  'ecology.js':'887529db17fa72ae50eae503fa50724fe5e4e7dc',
  'terrain.js':'145be355d26951363f51539fe93e3bf5bccff3ac',
  'input.json':'6122c64539fc7021fb020296c592586e234e22b3'
};
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
for(const [name,sha] of Object.entries(expectedBlobs)){
  const bytes=fs.readFileSync(path.join(root,'../fixed',name));
  const got=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(got,sha,'fixed source mismatch: '+name);
}
const input=JSON.parse(fs.readFileSync(path.join(root,'../fixed/input.json'),'utf8'));
assert.equal(input.selection.seed,32);
assert.equal(input.initial.state.policy,'environment_first');
// Exact function copied from study.cjs, source commit 8f86da70a8519ad3db88bde4a701ba1b1fa51ada.
// It uses the player's hand and public information. No rollout or private opponent cards.
function choose(game,priority,guardMode){
  const s=game.public(),p=s.actors.P,missing=p.max_hp-p.hp;
  const heals=p.hand.filter(c=>c.kind==='heal'&&s.field[c.attr]&&(missing>=16||missing>0&&c.remaining===1));
  if(heals.length)return {card_id:heals.sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
  const other=p.hand.filter(c=>c.kind!=='heal'),hand=other.length?other:p.hand;
  const target=(priority==='obstacle_first'?['O','E1','V0','V1']:['V0','V1','O','E1']).find(w=>s.actors[w]?.active);
  const attacks=hand.filter(c=>c.kind==='attack'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target})}));
  attacks.sort((a,b)=>b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.c.power-a.c.power||a.c.remaining-b.c.remaining);
  if(attacks.length)return {card_id:attacks[0].c.id,target};
  const guards=hand.filter(c=>c.kind==='guard'&&s.field[c.attr]).map(c=>({c,p:game.predict({card_id:c.id,target:null})}));
  const key=x=>guardMode==='evasion'?x.p.guard.evasion:guardMode==='critical'?x.p.crit_added:x.c.power;
  guards.sort((a,b)=>key(b)-key(a)||b.p.guard.value-a.p.guard.value||a.c.remaining-b.c.remaining);
  if(guards.length)return {card_id:guards[0].c.id,target:null};
  return {card_id:[...hand].sort((a,b)=>a.remaining-b.remaining)[0].id,target:null};
}

const definitions=[
  {id:'CMP-Z-START',purpose:'入口の読み取り',predicate:g=>g.s.actors.P.actions===0},
  {id:'CMP-Z-MIXED',purpose:'再構築後の札の把握',predicate:g=>{
    const p=g.s.actors.P;
    return p.rebuilds>=1&&[...p.hand,...p.deck].some(id=>g.s.cards[id].origin!=='P');
  }},
  {id:'CMP-Z-LATER',purpose:'循環が進んだ複数対象の把握',predicate:g=>
    g.s.actors.P.rebuilds>=2&&g.s.actors.E1?.active&&g.s.actors.V1?.active}
];
function observable(game,known){
  return {public:game.public(),catalogue:F.catalogue(game),known_attributes:[...known].sort(),
    current_choices:game.choices().map(choice=>({choice,prediction:game.predict(choice)}))};
}
function signature(game,known){
  return {save_sha256:digest(game.save()),observable_sha256:digest(observable(game,known)),
    trace_sha256:digest(game.trace)};
}
function replay(item){
  const game=new T.Game(T.prepare(input,item.build)),known=new Set();
  game.advance();F.attributes(game,known);
  for(const choice of item.prefix){
    assert.ok(!game.s.outcome&&game.s.ready,'prefix reached invalid boundary');
    assert.ok(game.choices().some(c=>c.card_id===choice.card_id&&c.target===choice.target),'illegal recorded choice');
    game.step(choice);game.advance();F.attributes(game,known);
  }
  assert.ok(game.s.ready&&!game.s.outcome,'case must await player input');
  return {game,known};
}
function generate(){
  const build='guard5',game=new T.Game(T.prepare(input,build)),known=new Set(),prefix=[],cases=[];
  while(!game.s.outcome&&game.s.actors.P.actions<160){
    game.advance();if(game.s.outcome)break;F.attributes(game,known);
    for(const d of definitions)if(!cases.some(c=>c.id===d.id)&&d.predicate(game)){
      const p=game.s.actors.P;
      cases.push({id:d.id,purpose:d.purpose,build,prefix:clone(prefix),
        at:{player_action:p.actions+1,hp:p.hp,max_hp:p.max_hp,rebuilds:p.rebuilds,
          current_event:game.s.current_event,active_actors:Object.entries(game.s.actors).filter(([,a])=>a.active).map(([id])=>id)},
        expected:signature(game,known),observable:observable(game,known)});
    }
    if(cases.length===definitions.length)break;
    const choice=choose(game,'environment_first','defense');
    prefix.push(clone(choice));game.step(choice);
  }
  assert.equal(cases.length,definitions.length,'required cases were not reached; do not alter input to fill gaps');
  return {schema:'crossweave-ui-comparison-cases-v1',base_commit:BASE,seed:32,build:'guard5',
    selection:'One fixed trajectory; first eligible ready state per declared predicate; stop after all three. No terminal-outcome filter.',
    human_play:false,engine_mutations:false,base_blobs:expectedBlobs,cases};
}
function verify(data){
  assert.equal(data.base_commit,BASE);assert.equal(data.cases.length,3);
  for(const item of data.cases){
    const {game,known}=replay(item);
    assert.deepEqual(signature(game,known),item.expected,'replay state differs: '+item.id);
    assert.deepEqual(observable(game,known),item.observable,'display data differs: '+item.id);
    assert.ok(definitions.find(d=>d.id===item.id).predicate(game),'selection condition differs');
    const p=game.s.actors.P,rows=item.observable.catalogue;
    assert.equal(rows.reduce((n,r)=>n+r.remaining,0),p.deck.length,'deck display count');
    assert.equal(rows.reduce((n,r)=>n+r.hand,0),p.hand.length,'hand display count');
    for(const [id,a] of Object.entries(item.observable.public.actors))if(id!=='P'){
      assert.ok(!Object.hasOwn(a,'hand')&&!Object.hasOwn(a,'deck'),'private opponent cards in DTO');
    }
    // Exercise one continuation after replay using the same recorded public policy.
    const saved=game.save(),restored=new T.Game(T.prepare(input,item.build),clone(saved));
    const choice=choose(game,'environment_first','defense');
    game.step(choice);game.advance();restored.step(choice);restored.advance();
    assert.deepEqual(game.save(),restored.save(),'continued replay differs: '+item.id);
  }
}
const file=path.join(root,'comparison_cases.json');
if(process.argv.includes('--verify')){
  const saved=JSON.parse(fs.readFileSync(file,'utf8'));verify(saved);
  assert.deepEqual(generate(),saved,'regenerated cases differ');
  console.log(JSON.stringify({verified:saved.cases.map(c=>({id:c.id,...c.at})),source_blobs:5}));
}else{
  const data=generate();verify(data);
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({written:'comparison_cases.json',cases:data.cases.map(c=>({id:c.id,...c.at})),bytes:fs.statSync(file).size}));
}
