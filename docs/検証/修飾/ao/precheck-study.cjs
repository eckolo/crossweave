'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict'),crypto=require('crypto');
const A=require('./affixes.cjs'),{cfg,root,runtime,source,copy,Game}=A;
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sourceFiles=['posture_am/engine.js','posture_am/load.cjs','posture_am/conditions.json','expedition_choices.js','reward_preparation.js','expedition_loop.js','knowledge.js','information.js','input.json','choice_inputs.json','reward_build_inputs.py'];
const sourceHashes=Object.fromEntries(sourceFiles.map(p=>[p,hash(path.join(root,p))]));
const seed=JSON.parse(cp.execFileSync('python3',[path.join(root,'reward_build_inputs.py')],{maxBuffer:32e6}))[0];
const prepared=runtime.depart(source,seed,runtime.AH.initialProfile(),runtime.AH.countsFor(source,'guard3'),'A','AO1-fixture');
const variants={card:cfg.card_bases.flatMap(base=>A.variants('card',base)),passive:cfg.passive_bases.flatMap(base=>A.variants('passive',base))};
const registry=Object.fromEntries(variants.card.map(b=>[b.key,b]));
function fixture(maximum=100,accumulated=0,skills=[],selected={}){
  const b=copy(prepared.bundle);b.ao={cards:copy(registry)};
  const s=b.initial.state;s.cards={};s.field={};s.pool=[];s.outcome=null;s.ready=true;
  for(const a of Object.values(s.actors)){a.hand=[];a.deck=[];a.hp=a.max_hp=100000;a.crit=0;a.guard=null;a.hit=0;a.max_posture=maximum;a.passives=[];}
  s.actors.V0.hit=accumulated;s.actors.P.hp=99980;
  s.ah.learned=[...skills];s.ah.pending={after_guard:true,last_match_attr:'A',borrowed_guard:true};s.ao={selected:copy(selected)};
  return new Game(b);
}
function card(g,b,{user='P',origin=user,attr=null,match=true,kind=null}={}){
  const c={...A.compileCard(b),id:'use-'+Object.keys(g.s.cards).length,origin,birth:'initial',remaining:null,doomed:false,destroyed:false,crit_gain:0};
  if(attr)c.attr=attr;if(kind)c.kind=kind;if(c.evasion===undefined)c.evasion=0;c.remaining=c.life;
  g.s.cards[c.id]=c;g.s.actors[user].hand.push(c.id);
  if(match){const id='field-'+Object.keys(g.s.cards).length;
    g.s.cards[id]={id,origin:'V0',birth:'initial',type:'fixture',attr:c.attr,kind:'attack',power:0,hit:0,field_power:0,field_hit:0,life:2,remaining:null,doomed:false,destroyed:false,crit_gain:0,evasion:0};
    g.s.field[c.attr]=id;
  }
  g.assert();return {card_id:c.id,target:match&&c.kind==='attack'?'V0':null};
}
let restores=0,actions=0;const rows=[];
function execute(g,ch,user='P',label={}){
  const before=g.save(),pred=copy(g.predict(ch,user));assert.deepEqual(g.save(),before,'Prediction mutated state');
  const savedCard=copy(g.s.cards[ch.card_id]),restored=new Game(copy(g.bundle),before);
  g.play(user,ch);restored.play(user,ch);assert.deepEqual(g.save(),restored.save());restores++;actions++;
  const actual=g.trace.findLast(x=>x.type==='action');
  for(const key of ['actual_hp_loss','hit_gain','hit_connected','posture_multiplier','hp_restored'])assert.equal(pred[key],actual[key],key);
  assert.equal(pred.action_cost,actual.action_cost);assert.equal(g.s.actors[user].next_at,g.s.now+pred.action_cost);
  if(pred.mode==='guard')assert.deepEqual(pred.guard,g.s.actors[user].guard);
  assert.equal(g.s.cards[ch.card_id].power,savedCard.power,'Transient passive power leaked');
  assert.equal(g.s.cards[ch.card_id].hit,savedCard.hit,'Transient passive hit leaked');
  assert.equal(g.s.cards[ch.card_id].variant_key,savedCard.variant_key);
  assert.deepEqual(g.s.cards[ch.card_id].affixes,savedCard.affixes);
  const row={...label,user,variant:savedCard.variant_key,mode:pred.mode,damage:pred.actual_hp_loss,hit:pred.hit_gain,
    multiplier:pred.posture_multiplier,healed:pred.hp_restored,guard:pred.guard,cost:pred.action_cost,passives:pred.passives,affixes:pred.affixes};rows.push(row);return row;
}
for(const b of variants.card){
  assert.deepEqual(A.blueprint(b.kind,b.base,[...b.affixes].reverse()),b);
  const c=A.compileCard(b);
  if(c.kind==='attack')for(const maximum of cfg.contexts.maximum_posture)for(const accumulated of cfg.contexts.accumulated){
    if(accumulated>=maximum)continue;
    for(const user of cfg.contexts.users){const g=fixture(maximum,accumulated);execute(g,card(g,b,{user}),user,{test:'card',maximum,accumulated});}
  }else{const g=fixture();execute(g,card(g,b),'P',{test:'card'});}
}
for(const b of variants.passive)for(const origin of cfg.contexts.origins)for(const attr of cfg.contexts.attributes){
  const base=b.base,selected={[base]:b},g=fixture(100,40,[base],selected);
  const cb=A.blueprint('card',base==='PS03'?'read':base==='PS04'?'salve':'l');
  const ch=card(g,cb,{origin:origin==='own'?'P':'E1',attr,match:base!=='PS01'});
  // Compare plain variants directly with frozen AH's actual contribution.
  if(!b.affixes.length){const plain=new runtime.AI.Game(copy(g.bundle),g.save());const e=plain.effect('P',plain.s.cards[ch.card_id]),actual=g.effect('P',g.s.cards[ch.card_id]);for(const key of ['ids','hit','power','discount'])assert.deepEqual(actual[key],e[key]);}
  execute(g,ch,'P',{test:'passive',base,passive_variant:b.key,origin,attr});
}
const lifecycle=[];
// A card's field modifier is used as material; its active hit/cost do not transfer to the user's other card.
{
  const g=fixture(100,30),used=A.blueprint('card','l'),ch=card(g,used),material=g.s.cards[g.s.field.B];
  const echo=A.compileCard(A.blueprint('card','l',['echoing']));Object.assign(material,echo,{id:material.id,origin:'E1',birth:'initial',remaining:null,doomed:false,destroyed:false,crit_gain:0,evasion:0});
  const row=execute(g,ch,'P',{test:'field_material'});assert.equal(row.hit,70);assert.equal(row.multiplier,1);assert.equal(row.cost,12);lifecycle.push('Field affix applies through material field statistics, not the material active effect');
}
// Borrowed exact instance can circulate and be used by an NPC with the same intrinsic variant.
{
  const b=A.blueprint('card','l',['heavy','frail']),g=fixture(1),ch=card(g,b,{origin:'E1'});
  execute(g,ch,'P',{test:'borrowed_first'});const id=ch.card_id,c=g.s.cards[id],key=c.variant_key;
  assert(g.s.pool.includes(id));g.s.pool.splice(g.s.pool.indexOf(id),1);g.s.actors.E1.hand.push(id);c.remaining=c.life;
  const m='borrow-material';g.s.cards[m]={...copy(c),id:m,origin:'V0',remaining:null,power:0,hit:0,field_power:0,field_hit:0};g.s.field[c.attr]=m;
  const row=execute(g,{card_id:id,target:'V0'},'E1',{test:'borrowed_npc'});assert.equal(row.damage,6);assert.equal(row.cost,13);assert.equal(c.variant_key,key);lifecycle.push('Exact affixed instance survives recovery and NPC use without reroll');
}
{
  const g=fixture(),b=A.blueprint('card','l',['precise']),ch=card(g,b,{origin:'E1',match:false});const c=g.s.cards[ch.card_id];
  g.retire('E1');assert(c.doomed);assert.equal(c.variant_key,b.key);g.s.actors.P.hand.splice(g.s.actors.P.hand.indexOf(c.id),1);g.recover(c.id,'AO1-expiry');assert(c.destroyed);g.assert();lifecycle.push('Retired origin still marks borrowed variant for destruction');
}
{
  const b=A.blueprint('card','salve',['rich','frail']),g=fixture(),ch=card(g,b);execute(g,ch,'P',{test:'consumable'});assert(g.s.cards[ch.card_id].destroyed);
  const next=fixture(),again=card(next,b);assert.equal(next.s.cards[again.card_id].variant_key,b.key);assert(!next.s.cards[again.card_id].destroyed);lifecycle.push('Consumable instance disappears; next expedition instantiates the same acquired recipe');
}
assert.throws(()=>A.blueprint('card','l',['heavy','light']),/family/);
assert.throws(()=>A.blueprint('card','l',['heavy','heavy']),/Duplicate/);
assert.throws(()=>A.blueprint('passive','PS01',['swift']),/Incompatible/);
const bp=(base,aff=[])=>A.blueprint('card',base,aff);
A.validateStartingDeck([{blueprint:bp('l'),count:1},{blueprint:bp('l',['heavy']),count:1},{blueprint:bp('f'),count:2}],4,2);
assert.throws(()=>A.validateStartingDeck([{blueprint:bp('l'),count:2},{blueprint:bp('l',['heavy']),count:2}],4,2),/Base card cap/);
lifecycle.push('Different names and affix bundles do not bypass the proposed base-level starting cap');
const rewards=[];let repeatedGrants=0,settlements=0;
const deliverable=Object.fromEntries(['card','passive'].map(kind=>[kind,variants[kind].filter(b=>!b.affixes.length||b.affixes.some(id=>(kind==='card'?cfg.card_affixes:cfg.passive_affixes)[id].benefit))]));
for(let seed=0;seed<cfg.reward_seed_cases;seed++){
  const book=A.book();A.start(book,'past',seed);A.grant(book,'past','old',[bp('l')]);A.settle(book,'past','clear');
  A.start(book,'current',seed);
  const first=A.grant(book,'current','first',deliverable.card.filter(b=>b.affixes.length===1));
  const saved=JSON.stringify(book),again=A.grant(book,'current','first',deliverable.passive);assert.deepEqual(again,first);assert.equal(JSON.stringify(book),saved);repeatedGrants++;
  const reloaded=JSON.parse(saved);assert.deepEqual(A.grant(reloaded,'current','first',deliverable.passive),first);assert.equal(JSON.stringify(reloaded),saved);repeatedGrants++;
  A.protect(book,'current');A.grant(book,'current','second',deliverable.passive.filter(b=>b.affixes.length===3));
  for(const outcome of ['clear','withdrawal','defeat']){
    const b=copy(book),r=A.settle(b,'current',outcome),after=JSON.stringify(b);assert.deepEqual(A.settle(b,'current',outcome),r);assert.equal(JSON.stringify(b),after);settlements++;
    assert(b.owned[bp('l').key]);assert.equal(r.kept.length,outcome==='clear'?2:outcome==='withdrawal'?1:0);
    assert.equal(r.lost.length,2-r.kept.length);assert.throws(()=>A.settle(b,'current',outcome==='defeat'?'clear':'defeat'),/Conflicting/);
    rewards.push({seed,outcome,first:first.blueprint.key,second:book.runs.current.grants.second.blueprint.key,kept:r.kept,lost:r.lost});
  }
}
{
  const book=A.book(),combo=A.blueprint('passive','PS02',['borrowed','forceful']);A.start(book,'earned',7);A.grant(book,'earned','passive',[combo]);A.protect(book,'earned');A.settle(book,'earned','withdrawal');
  const profile=runtime.AH.initialProfile(8),all=A.prepare(profile,cfg.passive_bases,{PS02:combo.key},book);
  assert.equal(all.profile.points,0);assert.equal(Object.keys(all.profile.learned).length,4);
  const snapshot=JSON.stringify(book),refund=A.prepare(all.profile,[],{},book);assert.equal(refund.profile.points,8);assert.equal(JSON.stringify(book),snapshot);
  assert.throws(()=>A.prepare(refund.profile,['PS02'],{PS02:A.blueprint('passive','PS02',['forceful']).key},book),/Unowned/);
  const again=A.prepare(refund.profile,cfg.passive_bases,{PS02:combo.key},book);assert.deepEqual(again,all);assert.equal(JSON.stringify(book),snapshot);
  lifecycle.push('All four base passives coexist; refund/relearn preserves the owned bundle and cannot strip its condition');
}
const counts={};for(const kind of ['card','passive'])counts[kind]=Object.fromEntries((kind==='card'?cfg.card_bases:cfg.passive_bases).map(base=>[base,variants[kind].filter(b=>b.base===base).reduce((out,b)=>(out[b.affixes.length]=(out[b.affixes.length]||0)+1,out),{})]));
const examples=rows.filter(r=>r.test==='card'&&r.user==='P'&&r.maximum===100&&r.accumulated===40&&['AO1:card:l','AO1:card:l:heavy','AO1:card:l:precise','AO1:card:l:heavy:precise','AO1:card:l:dull:heavy'].includes(r.variant));
for(const [p,h]of Object.entries(sourceHashes))assert.equal(hash(path.join(root,p)),h,p);
const result={trial:'AO1',base_commit:cfg.base_commit,conditions_sha256:hash(path.join(__dirname,'conditions.json')),implementation_sha256:hash(path.join(__dirname,'affixes.cjs')),sources:sourceHashes,
  checks:{actions,restores,repeatedGrants,settlements,fixture_cases:rows.length,loot_cases:rewards.length},counts,examples,lifecycle,rows,rewards};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({checks:result.checks,counts,examples,lifecycle},null,2)+'\n');
