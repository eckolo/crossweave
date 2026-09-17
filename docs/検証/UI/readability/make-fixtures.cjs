// Generate UI inspection positions through legal choices. No state or seed overrides.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const fixed=path.resolve(__dirname,'../../試遊/terrain-build-z/fixed');
const T=require(path.join(fixed,'terrain.js')),source=JSON.parse(fs.readFileSync(path.join(fixed,'input.json'),'utf8'));
function next(game,style){
  const s=game.public(),p=s.actors.P;
  const order=style==='guard'?['V0','E1','V1','O']:['V0','V1','E1','O'];
  const target=order.find(w=>s.actors[w]?.active);
  const choices=game.choices().filter(c=>!c.target||c.target===target);
  const score=choice=>{
    const c=game.s.cards[choice.card_id],pred=game.predict(choice);
    if(pred.mode==='heal')return p.max_hp-p.hp>=12?100:0;
    if(pred.mode==='guard')return style==='guard'&&!p.guard?65:8;
    if(pred.mode==='attack')return 30+pred.actual_hp_loss+pred.hit_gain/10;
    if(pred.mode==='place')return (c.kind==='attack'?20:10)+c.field_power/2+(3-c.remaining);
    return 1;
  };
  return choices.sort((a,b)=>score(b)-score(a)||a.card_id.localeCompare(b.card_id))[0];
}
const cases={},runs=[];
for(const [build,style]of [['guard5','guard'],['guard3','attack'],['guard0','attack']]){
  const game=new T.Game(T.prepare(source,build)),choices=[];game.advance();game.trace=[];
  while(!game.s.outcome&&choices.length<160){
    const s=game.public(),p=s.actors.P,all=game.choices();
    const flags={
      mixed:p.rebuilds>0&&p.hand.some(c=>c.origin!=='P'),
      multiple:!!s.actors.E1?.active&&!!s.actors.V1?.active,
      deadline:p.hand.some(c=>c.remaining===1)&&p.hand.length>1,
      guard_end:!!p.guard&&all.some(x=>s.field[game.s.cards[x.card_id].attr]),
      vanishing:p.hand.some(c=>c.doomed||c.consume_on_recover)&&all.some(x=>s.field[game.s.cards[x.card_id].attr]&&(game.s.cards[x.card_id].doomed||game.s.cards[x.card_id].consume_on_recover))
    };
    for(const [name,hit]of Object.entries(flags))if(hit&&!cases[name])cases[name]={build,choices:JSON.parse(JSON.stringify(choices)),time:s.now,player_actions:p.actions,hp:p.hp,rebuilds:p.rebuilds,purpose:name};
    const choice=next(game,style);choices.push(choice);game.step(choice);game.advance();game.trace=[];
    if(Object.keys(cases).length===5&&choices.length>24)break;
  }
  runs.push({build,style,choices});
}
for(const name of ['mixed','multiple','deadline','guard_end','vanishing'])assert(cases[name],`unreached ${name}`);
const output={test_id:'UI-R-001',origin:'AI-generated legal UI inspection positions; not user play logs',code_input_commit:'e9b5b0a27b6fc51694c347c7e941a28ff97856f5',entry:'W seed32',cases,runs};
fs.writeFileSync(path.join(__dirname,'fixtures.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(cases).map(([k,v])=>[k,{build:v.build,actions:v.player_actions,time:v.time,hp:v.hp}]))));
