'use strict';
// Fixed public data and a previously recorded PORT input, solely for UI examples.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const code='169686cd77d5d35e4d4b2dd2f6723851fff4491c',records='54d701026ffeaf82b81a4a379b88ce036532d230',prefix='docs/検証/試遊/night-tide/';
const git=(...args)=>cp.execFileSync('git',args,{maxBuffer:16*1024*1024});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crossweave-ui-flow-source-'));
try {
  const files=git('ls-tree','-r','--name-only','-z',code,'--',prefix+'src').toString().split('\0').filter(Boolean);
  for(const file of files){const out=path.join(dir,file.slice(prefix.length));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,git('show',code+':'+file));}
  const N=require(path.join(dir,'src/scenario.js')),s=new N.Session(),cat=N.L.catalog(N.source);
  const terms=JSON.parse(git('show',code+':'+prefix+'ui/terminology.json'));
  const report=JSON.parse(git('show',records+':'+prefix+'verification/engine.json'));
  const port=report.replay_fixtures.find(x=>x.id==='PORT'),run=new N.Session();run.depart();
  for(const choice of port.choices){while(run.data.pause)run.acknowledge();run.action(choice);}
  assert.equal(run.data.pause,'port');assert.equal(crypto.createHash('sha256').update(JSON.stringify(run.game.save())).digest('hex'),port.state_sha256);
  const wd=new N.Session(run.save());wd.withdraw();
  const defeat=new N.Session(run.save());defeat.game.s.actors.P.hp=0;defeat.game.dispatch('P','V1');defeat.checkpoint();
  const clear=report.runs.find(x=>x.build==='guard3'&&x.policy==='progress_first').receipt;
  const icons={f:'music-2',h:'hammer',l:'footprints',j:'move-up-right',g:'lock-keyhole',r:'hand',fast:'needle',read:'lamp',sweep:'wind',salve:'leaf',nt_stop:'anchor'};
  const cards=[...s.data.profile.unlocked.map(k=>({...cat[k],name:terms.cards[k]||cat[k].name,icon:icons[k]})),{...N.cards.nt_stop,name:terms.cards.nt_stop,place_cost:run.game.cost('nt_stop',false),match_cost:run.game.cost('nt_stop',true),consume_on_recover:null,icon:icons.nt_stop}];
  const data={id:'UI-F-001',version:'0.1',source:{code,records,baseTrial:'PT-NT-001'},counts:s.data.counts,unlocked:s.data.profile.unlocked,cards,limits:{total:12,perType:2},quest:{id:'SCN-001',title:'夜潮の排水路',symptom:'雨の降らない夜にも、商店街の地下へ海水が入り込む。',request:'品物は上へ移しましたが、いつまでも使わないわけにはいかなくて。',goal:'浸水の原因を確かめる',tendency:'流れに逆らい、障害を越えて奥へ進む。',place:'商店街の地下'},returns:{clear:{receipt:clear,seen:['entry','port','gate','clear'],kind:'recorded',story:'流れが戻り、地下への浸水が止まった。'},withdrawal:{receipt:wd.data.receipt,seen:wd.data.seen,kind:'replayed-port-withdrawal',story:'港まで辿った道を戻り、店に帰った。'},defeat:{receipt:defeat.data.receipt,seen:defeat.data.seen,kind:'injected-boundary',story:'余力を失い、緊急脱出した。'}}};
  const text=JSON.stringify(data,null,2)+'\n',out=path.join(__dirname,'fixtures.json');
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(out,'utf8'),text,'UI fixtures changed');else fs.writeFileSync(out,text);
  console.log(JSON.stringify({trial:data.id,port_state_matches:true,fixture_sha256:crypto.createHash('sha256').update(text).digest('hex'),written:!process.argv.includes('--check')}));
} finally {fs.rmSync(dir,{recursive:true,force:true});}
