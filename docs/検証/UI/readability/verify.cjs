// DOM interaction and fixed-engine equivalence; this does not measure browser layout or usability.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'jsdom');
const {build,sha}=require('./build.cjs'),fixtures=require('./fixtures.json');
const fixed=path.resolve(__dirname,'../../試遊/terrain-build-z/fixed');
function baseline(){
  let s=fs.readFileSync(path.join(fixed,'play.fragment.html'),'utf8');
  for(const [token,file]of Object.entries({__CW_ENGINE__:'engine.js',__CW_FEEDBACK__:'feedback.js',__CW_ECOLOGY__:'ecology.js',__CW_TERRAIN__:'terrain.js',__CW_DATA__:'input.json'})){
    let v=fs.readFileSync(path.join(fixed,file),'utf8');if(file==='input.json')v=JSON.stringify(JSON.parse(v)).replace(/</g,'\\u003c');s=s.replace(token,()=>v);
  }return s;
}
const errors=[];
function open(fragment){
  // Test-only hook, injected in memory. Never included in deliverables.
  fragment=fragment.replace('  function render(){','  function render(){ window.__inspect=()=>JSON.parse(JSON.stringify({s:game.s,memory:game.memory,rng:Object.fromEntries(Object.entries(game.rng).map(([k,v])=>[k,v.state()]))}));');
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  return new JSDOM(fragment,{runScripts:'dangerously',virtualConsole:vc});
}
const text=(d,id)=>d.querySelector('#'+id).textContent;
const json=x=>JSON.stringify(x);
function compare(a,b){assert.equal(json(a.window.__inspect()),json(b.window.__inspect()),'game state / RNG / memory changed');}
function choose(d,choice){
  if(choice.target)d.querySelector(`[data-target="${choice.target}"]`).click();
  const c=d.querySelector(`[data-card="${choice.card_id}"]`);assert(c,'card missing');c.click();
}
const counts={states:0,selection_pairs:0,actions:0};
for(const run of fixtures.runs){
  const a=open(baseline()),b=open(build()),da=a.window.document,db=b.window.document;
  for(const d of [da,db]){d.querySelector('#cw-build').value=run.build;d.querySelector('#cw-restart').click();}
  compare(a,b);
  for(const choice of run.choices){
    const before=json(b.window.__inspect());
    const targets=[...da.querySelectorAll('[data-target]')].map(n=>n.dataset.target);
    const cards=[...da.querySelectorAll('[data-card]')].map(n=>n.dataset.card);
    for(const target of targets)for(const card of cards){
      choose(da,{card_id:card,target});choose(db,{card_id:card,target});
      let old=text(da,'cw-prediction').replace(/^今回の結果/,'');
      // The one intentional text correction: expiring doomed/filler cards disappear
      // on recovery, already visible from their flags; no game calculation change.
      const state=b.window.__inspect().s;
      for(const id of state.actors.P.hand){const x=state.cards[id];if(id!==card&&x.remaining===1&&!x.consume_on_recover&&(x.doomed||x.birth==='filler')){
        const name=x.name+(x.type.startsWith('weak_')||x.type.startsWith('filler_')?' '+x.attr:'');old=old.replace(name+'（回収）',name+'（回収時に消滅）');
      }}
      assert.equal(text(db,'cw-prediction-detail'),old,'original prediction not retained');
      const selected=b.window.__inspect().s.cards[card];
      assert(db.querySelector(`.cw-slot[data-linked="true"]`).textContent.includes(selected.attr));
      counts.selection_pairs++;
    }
    assert.equal(json(b.window.__inspect()),before,'selection changed simulation state');
    choose(da,choice);choose(db,choice);compare(a,b);
    for(const id of ['cw-resources','cw-knowledge','cw-history','cw-last'])assert.equal(text(da,id),text(db,id),id);
    da.querySelector('#cw-use').click();db.querySelector('#cw-use').click();compare(a,b);
    assert(!text(db,'cw-outcome').includes('中断'),'UI handler error');counts.actions++;counts.states++;
  }
  for(const d of [da,db])d.querySelector('#cw-withdraw').click();compare(a,b);
  assert(db.querySelector('#cw-use').disabled);assert.equal(text(da,'cw-outcome'),text(db,'cw-outcome'));
  // Restart really returns to the entrance with selected build.
  for(const d of [da,db])d.querySelector('#cw-restart').click();compare(a,b);
  a.window.close();b.window.close();
}
const fixtureChecks=[];
for(const [name,replay]of Object.entries(fixtures.cases)){
  const dom=open(build(replay)),d=dom.window.document,state=dom.window.__inspect().s,p=state.actors.P;
  assert.equal(p.actions,replay.player_actions);
  const cards=p.hand.map(id=>state.cards[id]);
  if(name==='deadline'){
    const expired=cards.find(c=>c.remaining===1),other=cards.find(c=>c.id!==expired.id);
    d.querySelector(`[data-card="${other.id}"]`).click();assert(text(d,'cw-prediction').includes('この手の後に期限切れ'));
  }
  if(name==='guard_end'){
    const match=cards.find(c=>state.field[c.attr]);d.querySelector(`[data-card="${match.id}"]`).click();assert(text(d,'cw-prediction').includes('現在の防御・回避は終了'));
  }
  if(name==='vanishing'){
    const match=cards.find(c=>state.field[c.attr]&&(c.doomed||c.consume_on_recover));d.querySelector(`[data-card="${match.id}"]`).click();assert(text(d,'cw-prediction').includes('この手で消滅'));
  }
  if(name==='multiple')assert.equal(d.querySelectorAll('[data-target]').length,2);
  if(name==='mixed'){assert(cards.some(c=>c.origin!=='P'));assert(text(d,'cw-deck').includes('残数＝未ドロー分'));}
  d.querySelector('#cw-deck-panel').open=true;
  d.querySelector('[data-card]').click();assert(d.querySelector('#cw-deck-panel').open,'detail panel closed on selection');
  d.querySelector('#cw-history-order').value='oldest';d.querySelector('#cw-history-order').dispatchEvent(new dom.window.Event('change'));
  assert(text(d,'cw-history').startsWith('時刻 0'),'history order');
  fixtureChecks.push({name,build:replay.build,actions:replay.player_actions,time:replay.time});dom.window.close();
}
function initiallyVisibleText(fragment,rootId){
  const dom=open(fragment),d=dom.window.document,root=d.getElementById(rootId);
  function visit(el){if(el.nodeType===3)return el.textContent;if(el.nodeType!==1||el.hidden||['STYLE','SCRIPT'].includes(el.tagName))return '';if(el.tagName==='DETAILS'&&!el.open)return visit(el.querySelector('summary'));return [...el.childNodes].map(visit).join(' ');}
  const n=visit(root).replace(/\s+/g,' ').trim().length;dom.window.close();return n;
}
assert.deepEqual(errors,[]);
const result={test_id:'UI-R-001',verification:'DOM interaction; not browser rendering or human play',engine_input_commit:fixtures.code_input_commit,baseline_sha256:sha(baseline()),ui_sha256:sha(build()),...counts,fixtures:fixtureChecks,errors,initial_visible_text_characters:{baseline:initiallyVisibleText(baseline(),'cw-terrain-hunt'),ui:initiallyVisibleText(build(),'cw-readability')},unverified:['browser rendering (URL policy rejected local preview)','real keyboard/touch, viewport overflow and theme contrast','human readability, decision time and fun']};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
