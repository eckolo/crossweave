// Focused review-only destination selection. JSDOM is not a real rendering/input check.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require(process.env.CW_JSDOM_PATH||'/workspace/scratch/851bbd91bf24/verification-deps/node_modules/jsdom');
const {build}=require('./build-inline.cjs');
const checks=[],errors=[],instances=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(5);}throw Error('timeout');}
function check(name,fn){fn();checks.push({name,passed:true});}
async function mount(destinations){
 const {html}=build({testing:true,fhd:true,art:true,destinations});
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(e.type!=='css parsing')errors.push(String(e));});
 const dom=new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/,''),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://inline.invalid/',virtualConsole:vc}),w=dom.window;
 instances.push(dom);
 for(const key of ['structuredClone','TextEncoder','TextDecoder','Blob','Response','DecompressionStream'])w[key]=globalThis[key];
 Object.defineProperty(w,'crypto',{value:crypto.webcrypto});
 let requests=0;
 w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{requests++;throw Error('network forbidden');};
 w.indexedDB={open(){throw Error('persistent save forbidden');}};
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.IntersectionObserver=class{observe(){}disconnect(){}};
 w.matchMedia=()=>({matches:false});
 const root=w.document.getElementById('crossweave-journey'),host=w.document.getElementById('cw-exploration-fhd');
 function rect(el){
  if(el.classList.contains('cw-display-viewport'))return [0,0,1024,576];
  if(el===root||el.classList.contains('cj-shell'))return [0,0,1920,1080];
  if(el.hasAttribute('data-main'))return [1,65,1918,950];
  return [80,120,520,152];
 }
 w.HTMLElement.prototype.getBoundingClientRect=function(){const [x,y,width,height]=rect(this);return {x,y,left:x,top:y,right:x+width,bottom:y+height,width,height};};
 for(const [prop,index] of [['clientWidth',2],['clientHeight',3]])Object.defineProperty(w.HTMLElement.prototype,prop,{configurable:true,get(){return rect(this)[index];}});
 Object.defineProperty(w.HTMLElement.prototype,'scrollWidth',{configurable:true,get(){return this.clientWidth;}});
 const s=w.document.createElement('script');s.textContent=script;w.document.body.append(s);
 await until(()=>host.__test);const review=host.__test.review;assert(await review.ready);
 const q=selector=>root.querySelector(selector);
 async function settled(){await wait(5);await until(()=>!review.app.session.state().pending);await wait(5);}
 async function click(selector){const b=q(selector);assert(b,selector);assert(!b.disabled,selector);b.click();await settled();}
 await settled();
 return {dom,w,root,host,review,q,click,settled,requests:()=>requests};
}
(async()=>{let multi,normal;try{
 multi=await mount(true);
 const {root,review,q,click,settled}=multi,session=review.app.session;
 const options=JSON.parse(fs.readFileSync(path.join(__dirname,'destinations.json')));
 const state=()=>session.state(),before=JSON.stringify(state().view),draft=JSON.stringify(state().draft),revision=state().view.meta.revision;
 const commands=[],execute=session.execute.bind(session);session.execute=async(...args)=>{commands.push(args);return execute(...args);};
 const selected=()=>q('[data-j="select-destination"][aria-pressed="true"]');
 const readOnly=()=>{assert.equal(JSON.stringify(state().view),before);assert.equal(JSON.stringify(state().draft),draft);assert.equal(commands.length,0);};
 check('既存の出発前画面に4候補を表示し、現在の探索先だけを選択する',()=>{
  assert.equal(root.dataset.screen,'hub');assert.equal(root.querySelectorAll('[data-j="select-destination"]').length,4);
  assert.equal(root.querySelectorAll('[data-j="select-destination"][aria-pressed="true"]').length,1);
  assert.equal(selected().dataset.id,'SCN-001');assert.match(q('#cj-selected-destination h2').textContent,/夜潮の排水路/);assert(!q('[data-j="depart"]').disabled);readOnly();
 });
 for(const item of options){await click('[data-j="select-destination"][data-id="'+item.id+'"]');
  assert.equal(selected().dataset.id,item.id);assert.equal(root.querySelectorAll('[data-j="select-destination"][aria-pressed="true"]').length,1);
  assert.equal(q('#cj-selected-destination h2').textContent,item.name);assert.equal(q('.cj-selected-label').textContent,item.name);
  assert.equal(q('[data-j="depart"]').disabled,item.previewOnly);readOnly();
 }
 check('候補を往復して名称・状態・手掛かりを更新し、保存・着想・編成を変えない',()=>{assert.equal(q('#cj-selected-destination>small').textContent,'踏破済み');assert.match(q('#cj-selected-destination').textContent,/敵との遭遇/);readOnly();});
 await click('[data-j="destination"]');
 assert.match(q('[data-inspector]').textContent,/風の抜ける見張り台/);assert.match(q('[data-inspector]').textContent,/見張り台の最上階/);
 await click('[data-j="select-destination"][data-id="UI-DEST-DEMO-03"]');assert(q('[data-inspector]').hidden);
 await click('[data-j="destination"]');
 check('詳細も選択先に対応し、候補を替えたら旧候補の窓を閉じる',()=>{assert.match(q('[data-inspector]').textContent,/灯りの消えた停車場/);assert(!q('[data-inspector]').textContent.includes('見張り台の最上階'));readOnly();});
 for(const action of ['deck','skills']){await click('[data-j="'+action+'"]');await click('[data-j="hub"]');assert.equal(selected().dataset.id,'UI-DEST-DEMO-03');}
 check('札組・心得から戻っても選択を保持し、出発しない',readOnly);
 const disabled=q('[data-j="depart"]');assert(disabled.disabled);disabled.disabled=false;disabled.click();await settled();
 check('仮候補の出発はUIと処理の両方で防ぎ、現在の実探索へのすり替えや決済をしない',readOnly);
 await click('[data-j="select-destination"][data-id="SCN-001"]');await click('[data-j="depart"]');
 check('実探索は明示した出発だけでSCN-001へ接続する',()=>{
  assert.equal(commands.length,1);assert.equal(commands[0][0],'depart');assert.equal(commands[0][1].case_id,'SCN-001');
  assert.equal(state().view.display_data.phase,'exploring');assert(state().view.meta.revision>revision);
 });
 normal=await mount(false);assert(await normal.review.show('hub-d03'));await normal.settled();
 check('カタログを渡さない通常入口は1件表示・既存の目的と出発を維持する',()=>{
  assert.equal(normal.root.dataset.destinationPreview,'false');assert(!normal.q('[data-j="select-destination"]'));
  assert(normal.q('.cj-destination-summary'));assert(!normal.q('[data-j="depart"]').disabled);assert(!normal.root.textContent.includes('灯りの消えた停車場'));
 });
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'destination-selection-manifest.json')));
 check('提示物は保存した生成物と一致し、外部通信・実行例外がない',()=>{
  assert.equal(crypto.createHash('sha256').update(build({destinations:true}).html).digest('hex'),manifest.sha256);
  assert.equal(multi.requests()+normal.requests(),0);assert.deepEqual(errors,[]);
 });
 fs.writeFileSync(path.join(__dirname,'destination-selection-checks.json'),JSON.stringify({version:'0.14.9',checked_at_utc:new Date().toISOString(),passed:checks.length,checks,environment:{node:process.version,dom:'JSDOM 26.1.0'},inline_sha256:manifest.sha256,read_only_until_explicit_departure:true,fixture_candidates:options.length,real_case_ids:['SCN-001'],injected:['client寸法・getBoundingClientRect','ResizeObserver・IntersectionObserver','button.click()'],old_suites_rerun:false,unverified:['実ブラウザー描画・実フォント・実際の窓の重なり','実マウス・タッチ・実キーボード','IndexedDB・複数タブ']},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length,errors}));
}finally{multi?.review.dispose();normal?.review.dispose();for(const dom of instances)dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
