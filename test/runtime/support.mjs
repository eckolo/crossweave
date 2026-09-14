// Test adapter only. Production Campaign defaults to IndexedDB and never falls back here.
export class MemoryStore {
  records=new Map(); failNext=false; beforeCommit=null;
  async load(slot){return structuredClone(this.records.get(slot)??null);}
  async commit(slot,expected,document){
    if(this.beforeCommit){const fn=this.beforeCommit;this.beforeCommit=null;await fn();}
    if(this.failNext){this.failNext=false;throw Object.assign(Error('storage_write_failed'),{code:'storage_write_failed'});}
    const actual=this.records.get(slot)?.revision??null;
    if(actual!==expected)throw Object.assign(Error(expected===null?'slot_not_empty':'stale_revision'),{code:expected===null?'slot_not_empty':'stale_revision'});
    this.records.set(slot,structuredClone(document));
  }
}
export function assert(value,message){if(!value)throw Error(message);}
export function equal(a,b,message){assert(JSON.stringify(a)===JSON.stringify(b),message);}
export let serial=0;
const requestPrefix=crypto.randomUUID();
export function command(controller,type,payload){const view=controller.inspect();return {request_id:'test-'+requestPrefix+'-'+(++serial),expected_revision:view.meta.revision,view_token:view.meta.view_token,type,payload};}
export async function execute(controller,type,payload){const result=await controller.execute(command(controller,type,payload));assert(!result.display_data.error,JSON.stringify({type,error:result.display_data.error}));return result;}
export function currentPlan(c){return structuredClone(c.inspect().display_data.draft.plan);}
// Fixed public-only probe for CW-M1-A-001. This is NOT a recommendation/player AI.
export function choose(c) {
  const v=c.inspect(),s=v.display_data.exploration,hand=Object.fromEntries(s.hand.map(x=>[x.id,x]));
  let choices=s.legal_actions.map(choice=>({choice,card:hand[choice.card_id],p:c.previewAction({view_token:v.meta.view_token,choice}).display_data.action_preview}));
  const heals=choices.filter(x=>x.p.mode==='heal'&&(x.p.hp_restored>=x.card.power||x.card.remaining===1&&x.p.hp_restored>0));
  if(heals.length)return heals.sort((a,b)=>b.p.hp_restored-a.p.hp_restored||a.card.remaining-b.card.remaining)[0].choice;
  const nonheal=choices.filter(x=>x.card.kind!=='heal');if(nonheal.length)choices=nonheal;
  const guards=choices.filter(x=>x.p.mode==='guard'&&(x.p.guard.value>0||x.p.guard.evasion>0)).sort((a,b)=>b.p.guard.evasion-a.p.guard.evasion||b.p.guard.value-a.p.guard.value);
  if(!s.self.guard&&s.self.hit>=50&&guards.length)return guards[0].choice;
  const attacks=choices.filter(x=>x.p.mode==='attack').sort((a,b)=>(a.choice.target==='E1'?2:0)-(b.choice.target==='E1'?2:0)||b.p.actual_hp_loss-a.p.actual_hp_loss||b.p.hit_gain-a.p.hit_gain||b.card.power-a.card.power||a.card.remaining-b.card.remaining);
  if(attacks.length)return attacks[0].choice;if(guards.length)return guards[0].choice;
  return choices.sort((a,b)=>a.card.remaining-b.card.remaining||a.p.action_cost-b.p.action_cost||a.card.id.localeCompare(b.card.id))[0].choice;
}
