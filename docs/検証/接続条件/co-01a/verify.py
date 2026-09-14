"""Static content reconciliation only. Does not run a campaign/controller or offer RNG."""
from pathlib import Path
from itertools import product
import json, hashlib, subprocess

ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
conditions=json.loads((HERE/'conditions.json').read_text())
input_path=ROOT/conditions['input_file']
d=json.loads(input_path.read_text())
cid=lambda x:'SCN-001-'+x
checks=[]
def check(value, label):
    if not value: raise AssertionError(label)
    checks.append(label)
def read_source(row):
    return subprocess.check_output(['git','show',row['commit']+':'+row['path']],cwd=ROOT)
for source in conditions['sources']:
    data=read_source(source)
    check(hashlib.sha256(data).hexdigest()==source['sha256'],'source '+source['path'])
    check(hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==source['blob'],'blob '+source['path'])

check(d['source_refs']==conditions['sources'],'input uses fixed sources')
check(d['formal_baseline']=={'basic_design':'0.53','last_decision':'D53','new_adoptions':[]},'formal baseline unchanged')
check(set(d['state_mapping'])=={cid('ST'+str(i).zfill(2)) for i in range(1,10)},'all nine meaning states')
check(set(d['targets'])=={cid('ACT'+str(i).zfill(2)) for i in range(1,6)},'all five targets')
check(set(d['rewards'])=={cid('RW'+str(i).zfill(2)) for i in range(1,6)},'all five rewards')
check(len(d['texts'])==48,'48 source text/detail/conditional/objective/label rows')
text_source=next(s for s in conditions['sources'] if s['path'].endswith('/本文.md'))
text_body=read_source(text_source).decode()
for ident,row in d['texts'].items():
    check(ident==cid(row['source_id']) and row['short_text'] in text_body,'source text verbatim '+ident)
    check(row['economic_effect'] is None,'text has no economic effect '+ident)
for ident,target in d['targets'].items():
    check(sum(target['initial_card_counts'].values())==12,'initial target size '+ident)
    check(all(type(n) is int and n>0 for n in target['initial_card_counts'].values()),'integer initial counts '+ident)
    check(set(target['initial_card_counts'])<=set(d['cards'])|set(d['runtime_supply_cards']),'initial card refs '+ident)
    check(target['reward_id'] in d['rewards'],'target reward ref '+ident)
    check(target['spec']['purpose']==target['purpose'],'target role '+ident)
check(len({t['knowledge_profile_id'] for t in d['targets'].values()})==5,'knowledge does not alias runtime slots')
for a,b in [('ACT01','ACT04'),('ACT03','ACT05')]:
    x,y=[d['targets'][cid(t)] for t in [a,b]]
    check(x['runtime_actor_id']==y['runtime_actor_id'] and x['initial_card_counts']==y['initial_card_counts'] and x['spec']==y['spec'],'P02 role/stat inheritance '+a)
    check(x['knowledge_profile_id']!=y['knowledge_profile_id'] and x['catalogue_version']!=y['catalogue_version'],'new environment knowledge identity '+b)
check(all(cid('ACT02') in s['targets'] for s in d['target_sets'].values()),'ACT02 same type/version in both sets')
for ident,s in d['target_sets'].items():
    check(set(s['targets'])<=set(d['targets']) and s['later_target'] in s['targets'],'target set refs '+ident)
    check(all(d['targets'][tid]['runtime_actor_id']==slot for slot,tid in s['slot_map'].items()),'slot map '+ident)
for e in d['transitions'].values():
    check(e['reward_id'] in d['rewards'],'transition reward '+e['event_id'])
    check(set(e['retire_surviving_targets']+e['enter_targets'])<=set(d['targets']),'transition target refs '+e['event_id'])
    check(e['pause_scene_id'] is None or e['pause_scene_id'] in d['scenes'],'transition scene ref '+e['event_id'])
for s in d['scenes'].values():
    check(s['next_scene_id'] is None or s['next_scene_id'] in d['scenes'],'scene next ref '+s['id'])
for clue in d['clues'].values():
    check(set(clue['publication_text_ids'])<=set(d['texts']),'clue text refs '+clue['id'])
check(d['clues'][cid('CL05')]['publication_text_ids']==[cid('DETAIL06')],'only explicit optional detail grants CL05')
def check_expression(expr):
    check(isinstance(expr,dict) and len(expr)==1,'single condition operator')
    op=next(iter(expr));value=expr[op]
    if op in ['all','any']:
        check(isinstance(value,list) and len(value)>0,'condition term array')
        for term in value:check_expression(term)
    elif op=='not':check_expression(value)
    else:
        check(op in ['eq','in'] and isinstance(value,list) and len(value)==2,'typed leaf condition')
        path,expected=value
        check(isinstance(path,str),'condition path type')
        if path=='scene_id':
            check(op=='in' and set(expected)<=set(d['scenes']),'condition scene references')
        if path.startswith('clues.'):
            check(cid(path.split('.')[1]) in d['clues'] and type(expected) is bool,'condition clue reference')
        if path=='mode':check(expected in ['first','retry','revisit'],'condition mode value')
for row in d['texts'].values():check_expression(row['eligible_when'])

# Independently use the actual information/blueprint APIs on a temporary in-process catalogue.
js=r"""
const fs=require('fs');
const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const A=require('./docs/検証/修飾/ao/affixes.cjs');
const I=require('./docs/検証/統合試作/deck_feedback_trial/information.js');
const NT=require('./docs/検証/試遊/night-tide/src/scenario.js');
const eq=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label);};
for(const [base,row]of Object.entries(d.cards)) {
 if(base in NT.cards) {
  const expected=I.card({...NT.cards[base],place_cost:base==='nt_pressure'?8:10,match_cost:base==='nt_pressure'?12:10});
  eq(row.card,expected,'NT base '+base);
 } else eq(row.card,A.catalog[base],'common base '+base);
 eq(row.information_signature,I.signature(row.card),'signature '+base);
}
Object.assign(A.catalog,Object.fromEntries(Object.entries(d.cards).map(([k,v])=>[k,v.card])));
let variants=0,signatures=0;
for(const [base,rows]of Object.entries(d.new_card_variants)) {
 eq(rows.map(r=>r.blueprint),A.variants('card',base),'all legal variants '+base);
 for(const row of rows) {
  A.validate(row.blueprint);
  const c=A.compileCard(row.blueprint);c.place_cost+=c.cost_delta;c.match_cost+=c.cost_delta;
  eq(row.card,I.card(c),'compiled fields');eq(row.information_signature,I.signature(c),'compiled signature');
  const other={...c,place_cost:c.place_cost+1};
  if(I.signature(other)===row.information_signature)throw Error('interval missing from signature');
  if(c.evasion!==row.card.evasion||c.crit_gain!==row.card.crit_gain)throw Error('overwritten stats');
  variants++;signatures++;
 }
}
process.stdout.write(JSON.stringify({variants,signatures,game_actions:0,offer_draws:0}));
"""
api=json.loads(subprocess.check_output(['node','-e',js,str(input_path)],cwd=ROOT))
check(api['variants']>0 and api['variants']==api['signatures'],'actual AO compile / I signature including intervals')
for base in ['nt_flow','nt_pressure','nt_stop']:
    check(base not in d['initial']['free_card_bases'] and base not in d['initial']['unlocked'],'new base not initially granted '+base)
    check(d['cards'][base]['content_card_id'] in [cid('CRD01'),cid('CRD02'),cid('CRD03')],'CRD base ID '+base)
    for row in d['new_card_variants'][base]:
        check(set(row['blueprint']['affixes'])<=set(d['cards'][base]['affix_allowlist']),'allowlist '+row['blueprint']['key'])
        families=[d['affixes']['card'][a]['family'] for a in row['blueprint']['affixes']]
        check(len(set(families))==len(families),'family exclusion '+row['blueprint']['key'])
check(d['cards']['nt_pressure']['card']['place_cost']==8 and d['cards']['nt_pressure']['card']['match_cost']==12,'nt_pressure 8/12')
stop=d['cards']['nt_stop']['card']
check((stop['evasion'],stop['crit_gain'],stop['field_power'],stop['field_hit'])==(20,20,2,20),'nt_stop evasion/crit/field')

check(sum(d['initial']['deck_counts'].values())==12 and max(d['initial']['deck_counts'].values())<=2,'initial deck legal')
check(set(d['initial']['deck_counts'])<=set(d['initial']['free_card_bases']),'initial deck free identity')
check(d['rules']['deck']['per_base_cap']==2 and d['rules']['equipment']['cost_limit']==8,'trial capacities')
check(d['rules']['units_per_point']==100 and d['offers']['price_units']==400,'trial point denomination and price')
check(d['rules']['conversion']['ordinary_return_units']==200//4==50,'lossy conversion separate')
check(d['rules']['learning']['implicit_refund'] is False,'no implicit refund')
check(d['offers']['natural_individual_grants']==[] and d['offers']['disable_AR_generatedRewards_for_scn_unlocks'],'no hidden natural grant')
check(d['offers']['reachable_tiers']==['I'] and set(d['offers']['event_tiers'].values())=={'I'},'rated source events all I')
for rid,row in d['rewards'].items():
    check(row['target_id'] in d['targets'] and row['source_event_id'] in d['transitions'],'reward refs '+rid)
    check(d['offers']['event_tiers'][row['source_event_id']]==row['offer_tier'],'offer tier ref '+rid)
    check(row['grants_individual'] is False and all(x['kind']!='individual' for x in row['items']),'no reward individual '+rid)
    for item in row['items']:
        if item['kind']=='points':check(type(item['amount_units']) is int and item['amount_units']>0,'integer points '+rid)
        elif item['kind']=='material':check(item=={'kind':'material','type':'M','amount':1},'M quantity 1 '+rid)
        elif item['kind']=='unlock':check(item['type'] in d['cards'],'unlock card ref '+rid)
        else:raise AssertionError('unknown reward kind')
check(all(p['use_in_m1'] and not p['formal_adoption'] for p in d['proposals'].values()),'P01/P02 trial usage only')

def evaluate(expr,ctx):
    if 'all' in expr:return all(evaluate(v,ctx) for v in expr['all'])
    if 'any' in expr:return any(evaluate(v,ctx) for v in expr['any'])
    if 'not' in expr:return not evaluate(expr['not'],ctx)
    op=next(iter(expr));path,want=expr[op];value=ctx
    for key in path.split('.'):value=value.get(key,False) if isinstance(value,dict) else False
    if op=='eq':return value==want
    if op=='in':return value in want
    raise AssertionError('unknown condition operator '+op)

# Abstract content states, not simulated battles or executed saves.
ending_cases=0
for mode,outcome,t1,cause in product(['first','retry','revisit'],['clear','withdrawal','defeat'],[False,True],[False,True]):
    if cause and not t1 or outcome=='clear' and not t1:continue
    ctx={'mode':mode,'outcome':outcome,'current':{'t1':t1,'cause_public':cause},'resuming_unsettled':False,'resuming_settled':False}
    selected=[x for x in d['ends'] if evaluate(x['when'],ctx)]
    check(len(selected)==1,'one END '+str((mode,outcome,t1,cause)))
    check(selected[0]['changes_case_to_resolved']==(mode!='revisit' and outcome=='clear'),'resolve boundary '+str((mode,outcome,t1,cause)))
    ending_cases+=1
mode_cases=[]
for status,attempts in [('unresolved',0),('unresolved',1),('resolved',1),('resolved',4)]:
    got=[m['value'] for m in d['modes'].values() if evaluate(m['select_when'],{'case':{'status':status},'has_departure':attempts>0})]
    check(len(got)==1,'one departure mode '+str((status,attempts)))
    mode_cases.append({'status':status,'attempts':attempts,'mode':got[0]})

# Ledger arithmetic: explicit acquired/protected sets from S01 examples only.
settlements=[]
for name,outcome,acquired,protected,expected in [
 ('EX01 clear no enemy','clear',['RW01','RW03'],['RW01'],(300,1,['nt_flow','nt_stop'])),
 ('EX02 protected withdrawal','withdrawal',['RW01','RW02'],['RW01','RW02'],(200,1,['nt_flow','nt_pressure'])),
 ('EX02 enemy before T1 withdrawal','withdrawal',['RW02'],[],(0,0,[])),
 ('protected defeat','defeat',['RW01','RW02'],['RW01','RW02'],(0,0,[])),
 ('EX03 revisit no enemy','clear',['RW04','RW05'],['RW04'],(300,1,['nt_flow','nt_stop'])),
 ('first clear with optional enemy','clear',['RW01','RW02','RW03'],['RW01','RW02'],(400,1,['nt_flow','nt_pressure','nt_stop']))]:
    kept=acquired if outcome=='clear' else protected if outcome=='withdrawal' else []
    items=[i for rid in kept for i in d['rewards'][cid(rid)]['items']]
    value=(sum(i.get('amount_units',0) for i in items),sum(i.get('amount',0) for i in items if i['kind']=='material'),sorted({i['type'] for i in items if i['kind']=='unlock'}))
    check(value==expected,'settlement arithmetic '+name)
    settlements.append({'case':name,'outcome':outcome,'kept':kept,'gained_units':value[0],'material_M':value[1],'unlock_types':value[2],'owned_individual_delta':0,'input_kind':'authored abstract ledger; not executed run'})
check(300+200==500 and 500-400==100 and 300<400,'D01 actual-paid refund example remains separate from funds')
check(d['save']['schema']=='CW-M1-save-1' and not d['save']['auto_migration'],'save version and no automatic migration')
check(d['public_contract']['view_schema']=='CW-M1-view-1' and not d['public_contract']['plan_shape_change'] and not d['public_contract']['error_shape_change'],'public schema/plan/error maintained')
check(d['public_contract']['operations']==['save_draft','discard_draft','commit_preparation','convert_items','set_item_lock','depart','continue_scene','play','withdraw','ack_return'],'operation names unchanged')
check(d['public_contract']['compatible_extension']['optional_payload']['advance'].endswith('default true'),'old continue_scene payload keeps default')
check(d['public_contract']['return_capabilities']['previewPreparation'] and not d['public_contract']['return_capabilities']['commit_preparation'],'return preview is not committed purchase')

artifacts=[HERE/'conditions.json',HERE/'build_input.py',HERE/'verify.py',input_path]
result={'id':conditions['id'],'version':'0.1','status':'passed','checks':len(checks),'source_count':len(conditions['sources']),'static_counts':{'states':9,'modes':3,'targets':5,'cards':16,'texts':48,'reward_ids':5,'ends':8,'achievements':5,'compiled_new_card_variants':api['variants'],'ending_table_cases':ending_cases},'mode_examples':mode_cases,'settlement_examples':settlements,'game_actions':0,'offer_draws':0,'old_study_reruns':0,'runtime_implemented':False,'storage_executed':False,'ui_acceptance':False,'human_evaluation':False,'artifacts':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in artifacts},'check_labels':checks}
(HERE/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','checks','static_counts','game_actions','offer_draws']},ensure_ascii=False))
