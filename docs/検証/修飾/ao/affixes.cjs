'use strict';
const path=require('path'),crypto=require('crypto'),cfg=require('./conditions.json');
const root=path.resolve(__dirname,'../../統合試作/deck_feedback_trial');
const {load}=require(path.join(root,'posture_am/load.cjs')),runtime=load('terrain40_p40');
const copy=runtime.AH.copy,check=(x,m)=>{if(!x)throw Error(m);};
const source=require(path.join(root,'input.json')),catalog=runtime.req('expedition_loop.js').catalog(source);
const tables={card:cfg.card_affixes,passive:cfg.passive_affixes};
function blueprint(kind,base,affixes=[]){
  check(tables[kind],'Unknown kind');check(Array.isArray(affixes)&&affixes.length<=cfg.max_affixes,'Affix count');
  check(new Set(affixes).size===affixes.length,'Duplicate affix');
  check(kind==='card'?Object.hasOwn(catalog,base):cfg.passive_bases.includes(base),'Unknown base');
  const ids=[...affixes].sort(),families=new Set();
  for(const id of ids){const a=tables[kind][id];check(a,'Unknown affix');
    check(kind==='card'?a.kinds.includes(catalog[base].kind):a.bases.includes(base),'Incompatible base');
    if(kind==='passive'&&a.gate==='attribute_B'){
      const kindForBase={PS02:'attack',PS03:'guard',PS04:'heal'}[base];
      const eligible=Object.values(catalog).filter(c=>(!kindForBase||c.kind===kindForBase)&&(base!=='PS04'||c.consume_on_recover));
      check(eligible.some(c=>c.attr==='B'),'Incompatible trigger attribute in current catalogue');
    }
    check(!families.has(a.family),'Incompatible family');families.add(a.family);
  }
  const out={version:'AO1',kind,base,affixes:ids,key:['AO1',kind,base,...ids].join(':')};
  if(kind==='card'){const c=compileCard(out,false);check(c.life>=1&&c.power>=0,'Invalid composed card');}
  return out;
}
function validate(b){check(b&&b.version==='AO1','Unknown blueprint version');const out=blueprint(b.kind,b.base,b.affixes);check(JSON.stringify(out)===JSON.stringify(b),'Noncanonical blueprint');return out;}
function compileCard(b,validateFirst=true){
  if(validateFirst)validate(b);check(b.kind==='card','Not a card');
  const c={...copy(catalog[b.base]),base_type:b.base,type:b.key,variant_key:b.key,affixes:[...b.affixes],cost_delta:0};
  for(const id of b.affixes)for(const [key,value]of Object.entries(cfg.card_affixes[id].delta)){
    if(key==='cost')c.cost_delta+=value;else c[key]=(c[key]||0)+value;
  }
  c.name=b.affixes.map(id=>cfg.card_affixes[id].label).concat(catalog[b.base].name).join('・');return c;
}
function variants(kind,base){
  const ids=Object.keys(tables[kind]),out=[];
  for(let mask=0;mask<2**ids.length;mask++){
    const aff=ids.filter((_,i)=>mask&(1<<i));if(aff.length>cfg.max_affixes)continue;
    try{out.push(blueprint(kind,base,aff));}catch(e){if(!/Incompatible|Invalid composed/.test(e.message))throw e;}
  }
  return out;
}
function adjustedEffect(baseEffect,b,c,user){
  validate(b);const out=copy(baseEffect);if(!out.ids.length)return out;
  const aff=b.affixes.map(id=>cfg.passive_affixes[id]);
  if(aff.some(a=>a.gate==='borrowed'&&c.origin===user||a.gate==='attribute_B'&&c.attr!=='B'))return {ids:[],hit:0,power:0,discount:0};
  const amount=aff.reduce((s,a)=>s+(a.strength||0),0)*cfg.passive_strength_units[b.base];
  const field=b.base==='PS01'?'discount':b.base==='PS02'?'hit':'power';out[field]+=amount;
  out.discount+=aff.reduce((s,a)=>s+(a.discount||0),0);out.affixes=[...b.affixes];return out;
}
class Game extends runtime.AI.Game{
  cost(type,match){const b=this.bundle.ao?.cards?.[type];return b?super.cost(b.base,match)+compileCard(b).cost_delta:super.cost(type,match);}
  effect(w,c){
    if(w!=='P')return super.effect(w,c);
    const learned=this.s.ah.learned,out={ids:[],hit:0,power:0,discount:0,affixes:[]};
    try{for(const base of learned){
      this.s.ah.learned=[base];let part=super.effect(w,c);
      const b=this.s.ao?.selected?.[base];if(b)part=adjustedEffect(part,b,c,w);
      out.ids.push(...part.ids);for(const key of ['hit','power','discount'])out[key]+=part[key];
      if(part.affixes)out.affixes.push({base,ids:part.affixes});
    }}finally{this.s.ah.learned=learned;}
    return out;
  }
  predict(choice,w='P'){const e=this.effect(w,this.s.cards[choice.card_id]),out=super.predict(choice,w);out.affixes=copy(e.affixes||[]);return out;}
}
function validateStartingDeck(entries,expected=12,cap=2){
  let n=0;const bases={};
  for(const {blueprint:b,count}of entries){validate(b);check(b.kind==='card'&&Number.isInteger(count)&&count>=0,'Invalid deck row');n+=count;bases[b.base]=(bases[b.base]||0)+count;}
  check(n===expected,'Wrong deck size');check(Object.values(bases).every(n=>n<=cap),'Base card cap');return bases;
}
// A separate grant model; generation happens once per reward identity, before settlement.
function book(){return {version:'AO1',owned:{},runs:{}};}
function start(book,run,seed){check(!book.runs[run],'Duplicate run');book.runs[run]={seed,grants:{},settled:null};}
function grant(book,run,id,pool){
  const r=book.runs[run];check(r&&!r.settled,'Closed run');if(r.grants[id])return copy(r.grants[id]);
  check(pool.length,'Empty pool');pool.forEach(validate);
  const index=crypto.createHash('sha256').update('crossweave:AO1:'+r.seed+':'+run+':'+id).digest().readUInt32BE(0)%pool.length;
  const g={id,blueprint:copy(pool[index]),protected:false};r.grants[id]=g;return copy(g);
}
function protect(book,run){const r=book.runs[run];check(r&&!r.settled,'Closed run');Object.values(r.grants).forEach(g=>g.protected=true);}
function settle(book,run,outcome){
  const r=book.runs[run];check(r&&['clear','withdrawal','defeat'].includes(outcome),'Invalid settlement');
  if(r.settled){check(r.settled.outcome===outcome,'Conflicting settlement');return copy(r.settled);}
  const result={outcome,kept:[],lost:[],duplicates:[]};
  for(const g of Object.values(r.grants)){
    validate(g.blueprint);if(outcome==='clear'||outcome==='withdrawal'&&g.protected){
      result.kept.push(g.id);if(book.owned[g.blueprint.key])result.duplicates.push(g.id);
      else book.owned[g.blueprint.key]=copy(g.blueprint);
    }else result.lost.push(g.id);
  }
  r.settled=copy(result);return result;
}
function prepare(profile,skills,selected,collection){
  const next=runtime.AH.reallocate(profile,skills),choice={};
  for(const base of skills){
    const key=selected[base];if(!key){choice[base]=blueprint('passive',base);continue;}
    const b=collection.owned[key];check(b&&b.kind==='passive'&&b.base===base,'Unowned passive variant');choice[base]=copy(validate(b));
  }
  check(Object.keys(selected).every(k=>skills.includes(k)),'Selection for unlearned base');
  return {profile:next,selected:choice};
}
module.exports={cfg,root,runtime,source,catalog,copy,blueprint,validate,compileCard,variants,adjustedEffect,Game,validateStartingDeck,book,start,grant,protect,settle,prepare};
