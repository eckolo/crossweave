const C={
 f:{a:'A',k:'atk',p:3,h:70,fh:30,fp:0,t:2}, h:{a:'B',k:'atk',p:12,h:30,fh:-20,fp:0,t:3},
 j:{a:'C',k:'atk',p:3,h:40,fh:0,fp:0,t:1}, g:{a:'D',k:'guard',p:3,h:0,fh:0,fp:-4,t:2},
 l:{a:'B',k:'atk',p:4,h:50,fh:0,fp:6,t:2},
 a:{a:'A',k:'atk',p:2,h:20,fh:0,fp:0,t:1}, c:{a:'C',k:'atk',p:2,h:20,fh:0,fp:0,t:1}, d:{a:'D',k:'atk',p:2,h:20,fh:0,fp:0,t:1},
 u:{a:'A',k:'atk',p:8,h:100,fh:0,fp:0,t:2}, v:{a:'D',k:'atk',p:8,h:100,fh:0,fp:0,t:2}, x:{a:'C',k:'atk',p:8,h:100,fh:0,fp:0,t:2}
};
function makeTrial(cfg){
 const cards={...C,...cfg.cards};
 let id=0;const make=k=>({...cards[k],key:k,id:++id,left:cards[k].t});
 const actor=(cap,hp,rate,deck)=>({cap,hp,rate,crit:0,hit:0,guard:null,started:false,hand:[],deck:deck.map(make)});
 const s={field:{},discard:[],trace:[],end:null,actors:{
  P:actor(3,cfg.php??18,cfg.rate??50,cfg.decks?.P??['f','j','j','f','f','g','l','h','j','a','d',...(cfg.followThrough?['j','j']:[])]),
  N:actor(3,cfg.nhp??60,cfg.nrate??0,cfg.decks?.N??['d','a','a','c','d','d','x','a','a','v','a','a','u','v','x']),
  E:actor(1,200,0,cfg.decks?.E??['a','a','a','d',cfg.fullField?'d':'c',...(cfg.followThrough?['a']:[])])
 }};
 const total=id;
 function start(w){const a=s.actors[w];if(a.started)return;a.started=true;if(cfg.expiry==='turn')a.guard=null;
  while(a.hand.length<a.cap){if(!a.deck.length)throw Error('deck exhausted');a.hand.push(a.deck.shift())}}
 function preview(w,key,target){
  const a=s.actors[w],c=a.hand.find(c=>c.key===key),d=s.actors[target];if(!c)throw Error('missing card '+w+':'+key+' hand='+a.hand.map(c=>c.key));
  const f=s.field[c.a];if(!f||c.k!=='atk')return {damage:0,hit:false,inc:0};
  const ownTurn=s.trace.filter(t=>t.w===w).length+1;
  const raw=(w==='N'&&cfg.missProbe&&ownTurn===4)?60:(w==='N'&&cfg.missProbe&&ownTurn===5)?40:c.h;
  const inc=raw+f.fh,hm=d.hit+inc,cm=a.crit+a.rate;
  if(inc<0)throw Error('negative increment outside probe');
  const defendCrit=d.crit+(d.guard&&hm>=100&&cfg.critGain==='guard_hit'?d.rate:0);
  const def=d.guard?d.guard.power*(1+Math.floor(defendCrit/100)):0;
  return {damage:hm<100?0:Math.max(0,((c.p+f.fp)*(1+Math.floor(cm/100))-def)*Math.floor((100+hm)/100)),hit:hm>=100,inc,hm,cm};
 }
 function act(w,key,target){
  if(s.end)throw Error('action after terminal');start(w);const a=s.actors[w],d=s.actors[target],pr=preview(w,key,target);
  const c=a.hand.splice(a.hand.findIndex(c=>c.key===key),1)[0],f=s.field[c.a];
  const log={w,key,target,match:!!f,hit:false,damage:0,guardBefore:JSON.parse(JSON.stringify(a.guard))};
  if(f){
   // The user's own matching action ends the old guard; a new guard replaces it.
   if(cfg.expiry!=='turn')a.guard=null;
   if(c.k==='atk'||cfg.critGain!=='guard_hit')a.crit+=a.rate;
   if(c.k==='guard')a.guard={power:c.p,uses:cfg.uses??2};
   else{
    d.hit+=pr.inc;const guarded=!!d.guard;
    if(pr.hit){if(guarded&&cfg.critGain==='guard_hit')d.crit+=d.rate;
     log.hit=true;log.damage=pr.damage;log.defended=guarded;log.attackCrit=a.crit;log.defendCrit=d.crit;log.hitMeter=d.hit;
     d.hp=Math.max(0,d.hp-pr.damage);d.hit=0;if(a.crit>=100)a.crit=0;if(guarded&&d.crit>=100)d.crit=0;}
    if(guarded&&(pr.hit||cfg.count==='attack')){d.guard.uses--;if(d.guard.uses<=0)d.guard=null;}
   }
   delete s.field[c.a];s.discard.push(c,f);
  }else s.field[c.a]=c;
  a.hand.forEach(c=>c.left--);s.discard.push(...a.hand.filter(c=>c.left<=0));a.hand=a.hand.filter(c=>c.left>0);a.started=false;
  if(s.actors.P.hp<=0)s.end='defeat';else if(s.actors.N.hp<=0)s.end='enemy_defeated';else if(s.actors.E.hp<=0)s.end='escape';
  log.field=Object.keys(s.field).sort().join('');
  log.actors=Object.fromEntries(Object.entries(s.actors).map(([w,a])=>[w,{hp:a.hp,crit:a.crit,hit:a.hit,guard:a.guard?{...a.guard}:null,hand:a.hand.map(c=>c.key+':'+c.left)}]));
  const live=[...Object.values(s.field),...s.discard,...Object.values(s.actors).flatMap(a=>[...a.hand,...a.deck])];
  if(live.length!==total||new Set(live.map(c=>c.id)).size!==total)throw Error('card conservation');s.trace.push(log);
 }
 if(cfg.raw)return {s,start,act,preview};
 for(const args of [['E','a','P'],['P','f','N'],['N','d','P'],['E','a','P'],['P','f','E'],['N','c','P'],['E','a','P'],['P','g','P'],['N','x','E'],['E','d','P'],['P','l','N'],['N','v','P']]){act(...args);if(s.end)return {s,start,act,preview};}
 act('E',cfg.fullField?'d':'c','P');start('P');
 if(s.actors.P.hand.map(c=>c.key+':'+c.left).join(',')!=='h:2,a:1,d:1')throw Error('wrong hand');
 if(Object.keys(s.field).sort().join('')!==(cfg.fullField?'ABD':'ABC'))throw Error('wrong field');
 return {s,start,act,preview};
}
function run(cfg,choice){
 const t=makeTrial(cfg);const point=t.s.trace.length;
 if(!t.s.end){t.act('P',choice,'N');if(!t.s.end){t.start('N');const opts=t.s.actors.N.hand.map(c=>({key:c.key,...t.preview('N',c.key,'P')})).sort((a,b)=>b.damage-a.damage||Number(b.hit)-Number(a.hit)||b.inc-a.inc);t.act('N',opts[0].key,'P');}}
 if(cfg.followThrough&&!t.s.end){t.act('E','a','P');t.act('P','h','N');}
 return {cfg,choice,end:t.s.end,php:t.s.actors.P.hp,nhp:t.s.actors.N.hp,pcrit:t.s.actors.P.crit,guard:t.s.actors.P.guard,
  firstProtectedHit:t.s.trace.find(t=>t.w==='N'&&t.key==='v'&&t.target==='P'),point,trace:t.s.trace};
}
const baselineResults=[
 ...['h','a','d'].map(c=>run({label:'wait_or_attack',expiry:'match',uses:2},c)),
 ...['h','d'].map(c=>run({label:'kill_now',expiry:'match',uses:2,nhp:36},c)),
 ...['h','d'].map(c=>run({label:'old_turn_expiry',expiry:'turn',uses:2},c)),
 ...['h','a','d'].map(c=>run({label:'all_match',expiry:'match',uses:2,fullField:true},c)),
 run({label:'no_refill',expiry:'match',uses:1},'d'),
 run({label:'miss_preserves_use',expiry:'match',uses:1,missProbe:true},'d'),
 run({label:'miss_spends_use',expiry:'match',uses:1,missProbe:true,count:'attack'},'d')
];
const gainResults=[
 ...[25,50].flatMap(rate=>['guard_activation','guard_hit'].map(critGain=>run({label:'guard_crit_gain',expiry:'match',uses:2,rate,critGain},'d'))),
 ...['guard_activation','guard_hit'].map(critGain=>run({label:'guard_crit_counter',expiry:'match',uses:2,rate:50,critGain,followThrough:true},'d'))
];
// Additional bounded probes. All values, decks, and cost timings are provisional.
function timedTrial(cfg){
 const t=makeTrial({...cfg,raw:true,expiry:'match',critGain:'guard_activation',count:'hit'});
 const ready={E:0,P:1,N:2},turns={E:0,P:0,N:0},rank={E:0,P:1,N:2};
 function step(w,key,target,delay=10){
  const expected=Object.keys(ready).sort((a,b)=>ready[a]-ready[b]||rank[a]-rank[b])[0];
  if(w!==expected)throw Error('scheduler mismatch '+w+' '+expected);
  const at=ready[w];t.act(w,key,target);turns[w]++;ready[w]=at+delay;
  Object.assign(t.s.trace.at(-1),{at,readyAfter:{...ready},turns:{...turns}});
 }
 return {...t,step,ready,turns};
}
function bestAttack(t,w,target){
 t.start(w);
 return t.s.actors[w].hand.map((c,i)=>({key:c.key,i,...t.preview(w,c.key,target)}))
  .sort((a,b)=>b.damage-a.damage||Number(b.hit)-Number(a.hit)||b.inc-a.inc||a.i-b.i)[0].key;
}
function finishRow(t,cfg,point){
 return {cfg,point,end:t.s.end,php:t.s.actors.P.hp,nhp:t.s.actors.N.hp,pcrit:t.s.actors.P.crit,
  guard:t.s.actors.P.guard,trace:t.s.trace};
}
function intervention(cfg,choice){
 const t=timedTrial({php:cfg.php,nhp:60,cards:{b:{...C.a,a:'B'},y:{...C.x,a:'B'}},decks:{
  P:['f','j','j','f','f','h','l','j','j','j'],
  N:['d','a','a','c','d','d','x',cfg.enemyB?'y':'a','a'],
  E:['a','a','a',cfg.envB?'b':'d']
 }});
 for(const a of [['E','a','P'],['P','f','N'],['N','d','P'],['E','a','P'],['P','f','E'],['N','c','P'],['E','a','P']])t.step(...a);
 t.start('P');
 if(t.s.actors.P.hand.map(c=>c.key+':'+c.left).join(',')!=='f:1,h:2,l:2')throw Error('setup hand');
 const point=t.s.trace.length;
 t.step('P',choice,'N',choice==='f'?10:cfg.placeCost);
 if(!t.s.end)t.step('N',bestAttack(t,'N','P'),'P');
 if(!t.s.end&&t.ready.E<t.ready.P)t.step('E',cfg.envB?'b':'d','N');
 if(!t.s.end)t.step('P',bestAttack(t,'P','N'),'N');
 return finishRow(t,{label:'intervention',...cfg,choice},point);
}
function guardChain(cfg){
 const t=timedTrial({php:30,nhp:cfg.burst?120:60,uses:cfg.uses??2,cards:{x:{...C.x,p:15,h:cfg.enemyHit},q:{...C.g,a:'A',fp:0,t:1}},decks:{
  P:cfg.burst?['f','j','j','f','f','g','g','g','g','g','g','h','l','j','j']:['f','j','j','f','f','g',...Array(40).fill('g')],
  N:['d','a','a','c','d','d',...Array(45).fill('x')],
  E:['a','a','a',...Array(14).fill(cfg.supplyD?'d':'q')]
 }});
 for(const a of [['E','a','P'],['P','f','N'],['N','d','P'],['E','a','P'],['P','f','E'],['N','c','P'],['E','a','P']])t.step(...a);
 const point=t.s.trace.length;
 t.step('P','g','P');t.step('N','x','P');
 for(let r=4;r<=17&&!t.s.end;r++){
  t.step('E',cfg.supplyD?'d':'q',cfg.supplyD?'N':'E');
  if(!t.s.end){const key=cfg.burst&&r===7?'l':cfg.burst&&r===8?'h':'g';t.step('P',key,key==='g'?'P':'N');}
  if(!t.s.end)t.step('N','x','P');
 }
 return finishRow(t,{label:'guard_chain',...cfg},point);
}
function enemyGuard(cfg,choice){
 const t=timedTrial({php:30,nhp:cfg.nhp,nrate:50,uses:2,cards:{
  s:{...C.f,p:6},aim:{...C.a,a:'B',fh:70},q:{...C.g,a:'C',fp:0,t:1}
 },decks:{
  P:['a','j','j','f','f','j','j','s','h','j','j','j','j'],
  N:['g','g','d','g','d','aim','d','d','d','d'],
  E:['d','d','f','a','q']
 }});
 // Each actor has one action per ten time units. Enemy matches two guards,
 // then waits; player resets its shared critical meter by hitting the environment.
 for(const a of [['E','d','P'],['P','a','N'],['N','g','N'],['E','d','P'],['P','f','N'],['N','g','N'],['E','f','P'],['P','f','E'],['N','aim','P'],['E','a','P']])t.step(...a);
 t.start('P');
 const p=t.s.actors.P,n=t.s.actors.N;
 if(p.crit!==0||n.crit!==100||n.hit!==70||!n.guard||n.guard.uses!==2)throw Error('enemy guard state');
 if(p.hand.map(c=>c.key).join(',')!=='s,h,j')throw Error('enemy guard hand '+p.hand.map(c=>c.key));
 const point=t.s.trace.length;
 t.step('P',choice,'N');
 if(!t.s.end)t.step('N','d','P');
 if(!t.s.end)t.step('E','q','E');
 if(!t.s.end)t.step('P',bestAttack(t,'P','N'),'N');
 return finishRow(t,{label:'enemy_guard',...cfg,choice},point);
}
const interventionResults=[
 {enemyB:false,envB:false,placeCost:10,php:30},
 {enemyB:true,envB:false,placeCost:10,php:30},
 {enemyB:false,envB:true,placeCost:10,php:30},
 {enemyB:false,envB:true,placeCost:8,php:30},
 {enemyB:true,envB:true,placeCost:8,php:30},
 {enemyB:false,envB:false,placeCost:10,php:18},
 {enemyB:true,envB:false,placeCost:10,php:18}
].flatMap(cfg=>['f','h','l'].map(choice=>intervention(cfg,choice)));
const chainResults=[{enemyHit:30,supplyD:true},{enemyHit:100,supplyD:true},{enemyHit:30,supplyD:false},{enemyHit:30,supplyD:true,uses:1},{enemyHit:30,supplyD:true,burst:true}].map(guardChain);
const enemyGuardResults=[60,12].flatMap(nhp=>['s','h','j'].map(choice=>enemyGuard({nhp},choice)));
const extraResults=[...interventionResults,...chainResults,...enemyGuardResults];
function compactExtra(r){
 return {cfg:r.cfg,end:r.end,php:r.php,nhp:r.nhp,pcrit:r.pcrit,
  actions:r.trace.filter((x,i)=>i>=r.point).map(x=>({at:x.at,w:x.w,key:x.key,target:x.target,match:x.match,hit:x.hit,damage:x.damage,defendCrit:x.defendCrit})),
  playerDamage:r.trace.filter((x,i)=>i>=r.point&&x.w==='P'&&x.target==='N').reduce((v,x)=>v+x.damage,0)};
}

const results=process.argv.includes('--extra')?extraResults:process.argv.includes('--gain')?gainResults:baselineResults;
console.log(JSON.stringify(process.argv.includes('--full')?results:process.argv.includes('--extra')?results.map(compactExtra):results.map(({trace,firstProtectedHit,...r})=>({...r,firstIncomingDamage:firstProtectedHit?.damage})),null,2));
