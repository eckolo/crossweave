"""CO-01A: assemble pinned content input; no exploration, offer draw or save execution."""
from pathlib import Path
import json, subprocess, re

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
CONDITIONS = json.loads((HERE / 'conditions.json').read_text())
SCN = CONDITIONS['scenario_reference_commit']
PREFIX = 'SCN-001-'
cid = lambda x: PREFIX + x
eq = lambda path, value: {'eq': [path, value]}
allof = lambda *xs: {'all': list(xs)}
anyof = lambda *xs: {'any': list(xs)}
no = lambda x: {'not': x}

def source_text(name):
    return subprocess.check_output(['git', 'show', SCN + ':docs/仕様案/シナリオ・探索内容/SCN-001_夜潮の排水路/' + name], cwd=ROOT).decode()

# Only catalogue construction and pure compilation. No Session or action method is called.
catalogue_js = r"""
const A=require('./docs/検証/修飾/ao/affixes.cjs');
const I=require('./docs/検証/統合試作/deck_feedback_trial/information.js');
const NT=require('./docs/検証/試遊/night-tide/src/scenario.js');
const initial=A.runtime.AH.countsFor(A.source,'guard3');
for(const [base,spec] of Object.entries(NT.cards))
 A.catalog[base]=I.card({...spec,place_cost:base==='nt_pressure'?8:10,match_cost:base==='nt_pressure'?12:10});
const new_variants={};
for(const base of Object.keys(NT.cards))new_variants[base]=A.variants('card',base).map(b=>{
 const c=A.compileCard(b);c.place_cost+=c.cost_delta;c.match_cost+=c.cost_delta;
 return {blueprint:b,card:I.card(c),information_signature:I.signature(c),offer_eligible:b.affixes.length===0||b.affixes.some(id=>A.cfg.card_affixes[id].benefit)};
});
process.stdout.write(JSON.stringify({cards:A.catalog,initial_counts:initial,new_variants}));
"""
derived = json.loads(subprocess.check_output(['node', '-e', catalogue_js], cwd=ROOT))
load = lambda path: json.loads((ROOT / path).read_text())
ao = load('docs/検証/修飾/ao/conditions.json')
ap = load('docs/検証/修飾/ap/conditions.json')
aq = load('docs/検証/装備制限/aq/conditions.json')
at = load('docs/検証/資源用途/at/conditions.json')
ah = load('docs/検証/試遊/night-tide/src/vendor/choice_inputs.json')
loop = load('docs/検証/統合試作/deck_feedback_trial/loop_inputs.json')

texts = {}
for line in source_text('本文.md').splitlines():
    m = re.match(r'^\| ((?:TXT\d+[BC]?|DETAIL\d+|COND\d+|OBJ-[A-Z]+|LABEL-RESUME))(?:／[^|]+)? \| ([^|]+) \|', line)
    if m:
        ident, body = m.groups()
        assert cid(ident) not in texts, ident
        texts[cid(ident)] = {'source_id': ident, 'short_text': body.strip(), 'source_document': 'S01-text', 'source_version': '0.2'}

data = {
 'schema': 'CW-M1-input-1', 'version': '0.1', 'task_id': 'CO-01A',
 'status': 'implementation-input-proposal; statically-checked; runtime-not-implemented',
 'rule_set_id': 'CW-M1-rules-0.1', 'content_set_id': 'CW-M1-SCN001-0.1',
 'engine_version': 'CW-M1-engine-0.1', 'card_registry_id': 'CW-M1-cards-0.1',
 'formal_baseline': {'basic_design': '0.53', 'last_decision': 'D53', 'new_adoptions': []},
 'proposals': {
  'P-01': {'use_in_m1': True, 'effect': 'RW01/RW04 kept adds nt_flow to unlocked only', 'if_disabled': 'nt_flow remains observed/borrowed only in this content set', 'formal_adoption': False},
  'P-02': {'use_in_m1': True, 'effect': 'ACT04/ACT05 reuse first-route roles, stats, initial counts and behavior with separate knowledge profiles; ACT02 same content version; RW04/RW05 per run', 'if_disabled': 'resolved case has no new-departure content in M1; resume remains valid', 'formal_adoption': False}},
 'source_refs': CONDITIONS['sources'],
 'content_sources': {'S01-text': {'commit': SCN, 'path': 'docs/仕様案/シナリオ・探索内容/SCN-001_夜潮の排水路/本文.md', 'version': '0.2'}},
 'initial': {'phase': 'home', 'nextRun': 0, 'unspent_units': 0, 'paid_learning_units': 0, 'materials': {}, 'inventory': {}, 'learned': {}, 'equipped': [], 'current_offer': None,
             'unlocked': loop['initial_unlocked'], 'free_card_bases': loop['initial_unlocked'],
             'deck_counts': derived['initial_counts'], 'draft': None,
             'casebook': {'SCN-001': {'attempts': 0, 'status': 'unresolved', 'first_resolved_event': None, 'visible_clue_ids': [], 'read_text_ids': [], 'first_clue_events': {}, 'first_route_checked_event': None, 'run_achievements': {}}}},
 'rules': {
  'units_per_point': 100,
  'deck': {'size': 12, 'per_base_cap': 2, 'owned_uid_max_occurrences': 1, 'initial_build': 'guard3', 'free_source': 'initial.free_card_bases', 'unlocked_is_free': False, 'cap_aggregation': 'base across all variants, not blueprint or display name', 'consumable_reset': 'finite per expedition; selected copy recreated next departure; no refill fee or permanent inventory consumption'},
  'equipment': {'policy': 'cost', 'cost_limit': 8, 'base_cost': aq['base_equipment_cost'], 'affix_surcharge': aq['affix_equipment_surcharge'], 'duplicate_base_limit': None, 'same_uid_max_occurrences': 1, 'learned_plain_option_count_per_base': 1, 'extra_copy_requires_owned_uid': True, 'all_selected_bases_must_be_learned': True, 'capacity_is_not_spending': True},
  'learning': {'bases': ah['skills'], 'cost_units': {k: 200 for k in ah['skills']}, 'refund': 'actual historical paid amount for explicitly cancelled base; exact and free', 'cancel_unequips_same_base': True, 'cancel_preserves_inventory': True, 'implicit_refund': False},
  'conversion': {'value_bands_units': ap['value_bands'], 'rate': [1,4], 'rounding': 'floor(value_band_units * numerator / denominator) per selected item; add integer units retaining point remainder', 'ordinary_return_units': 50, 'special_return_units': 100, 'materials_eligible': False, 'require_owned_not_locked_and_unreferenced': True, 'references': ['equipment','confirmed_deck','saved_draft'], 'historical_learning_refund_uses_conversion_rate': False},
  'player': {'hp': 40, 'max_posture': 100, 'hand_size': 3, 'return_hp': 40},
  'knowledge': {'schema': 'AD1', 'disclosure': 'first_resolution', 'grant_results': ['defeated','traversed'], 'no_grant_result': 'retired', 'retention': 'observed_immediately', 'identity': ['knowledge_profile_id','catalogue_version'], 'current_private_deck': 'unknown'},
  'run_identity': {'run': "JSON.stringify(['CW-M1-run-1',campaign_id,nextRun])", 'index': 'nextRun before increment', 'seed': 'nextRun before increment; nonnegative safe integer; no modulo/reuse', 'increment': 'only atomic successful depart', 'stream_namespace': 'crossweave:AH1', 'stream_key': '{actor}|{initial,allocation,generation,selection,target}', 'stream_seed': '{namespace}:{seed}:{stream_key}', 'stream_initializer': 'CPython random.Random(string), version=2 MT19937 state, as existing choice_inputs.py; browser-compatible initializer must be implemented/checked in D02, no Python subprocess in browser', 'resume': 'restore all saved RNG states; never regenerate'},
  'action_cost': {'resolve': 'base place_cost/match_cost + sum(card affix cost deltas); then max(1, cost - applicable passive discount) * actor action_cost_scale', 'derived_card_cost_fields': 'store compiled base+affix intervals; do not add cost_delta twice', 'life': 'decrement unused hand after that owner action by 1; field cards have no hand expiry', 'normal_expiry': 'shared recovery unless consume_on_recover or doomed exception', 'prediction': 'current action and current reservations only; never future choices or guaranteed next-turn arrival'}},
 'cards': {}, 'new_card_variants': derived['new_variants'],
 'affixes': {'max_count': ao['max_affixes'], 'family_limit': 1, 'card': ao['card_affixes'], 'passive': ao['passive_affixes'], 'passive_strength_units': ao['passive_strength_units'], 'invalid': ['life < 1','power < 0','duplicate affix','same family','incompatible kind/base','passive attribute_B with no eligible trigger card'], 'passive_exclusions': {'PS04': ['focused_B']}, 'blueprint': {'version': 'AO1', 'fields': ['version','kind','base','affixes','key'], 'affix_order': 'ascending ID', 'key': 'AO1:{kind}:{base}[:{sorted affixes}]', 'registry_binding': 'save content_set_id + card_registry_id; same IDs with changed values require new registry/content version; no old save automatic acceptance'}},
 'targets': {}, 'target_sets': {}, 'transitions': {}, 'rewards': {},
 'offers': {'version': 'CW-M1-offers-0.1', 'namespace': 'crossweave:CW-M1-offers-0.1', 'generator_reference': 'AT.generate fixed weighted selection order; inject this catalogue/config; no call of old global AT generator',
  'tiers': at['tiers'], 'reachable_tiers': ['I'], 'kind_weights': at['kind_weights'], 'passive_base_weights': {'A':at['passive_base_weights']['A']},
  'card_base_weight': 1, 'price_units': 400, 'value_band': 'ordinary', 'max_purchases_per_batch': 1,
  'card_pool': 'all known registry bases in profile.unlocked after settlement; exclude weak/filler runtime supply types; do not include borrowed observations alone', 'passive_pool': ['PS01','PS02','PS03','PS04'],
  'variant_pool': 'AO-compatible plain or at least one beneficial affix; tier gives nonzero affix-count weight; no numeric reroll',
  'deduplicate': 'blueprint performance key within batch; second choice different kind:base if available; across-return duplicates allowed',
  'new_cards_guaranteed': False, 'batch_id': "JSON.stringify(['CW-M1-offer-1',run,content_set_id])", 'candidate_id': 'choice-{zero-based-index}',
  'purchase_uid': "JSON.stringify(['AT1',batch_id,candidate_id])", 'source_fields': ['run','index','seed','case_id','mode','target_set_id','content_set_id','reward_ledger_keys','reward_ids','source_event_ids','target_ids','catalogue_versions','tier','card_bases'],
  'tier_rule': 'maximum rank of retained completed authored reward events; all five SCN rewards are I; II/III configured but unreachable in M1',
  'generate_after': 'settlement unlock union and points/materials update; same atomic write as receipt and case change',
  'replace_current': 'next return with at least one retained rated reward source; replace even unpurchased old candidates',
  'retain_current': ['defeat','withdrawal with no retained authored source','inspect','preview','skip','purchase','conversion','respec','depart','resume','ack_return'],
  'no_new_batch': {'initial': 'current null -> status none', 'ineligible_return': 'keep prior current including purchased status; set carried_from_previous_return iff prior batch remains', 'empty_eligible_pool': 'valid qualifying return with zero eligible blueprints replaces current with an empty recorded batch; status none, reason no_eligible_offer; preserve receipt; no fallback/free grant', 'short_pool': 'stop at exhausted pool; zero through requested count allowed; no duplicate filling'},
  'freshness': 'stored context, candidates, purchased receipt and config version survive all reads; stale view rejected; next eligible return changes batch',
  'purchase_conditions': ['phase home after ack_return','current batch, not already purchased','current view_token/revision and choice handle','unspent units >= candidate price','explicit commit_preparation plan; no hidden cancellation'],
  'no_purchase_conditions': ['policy skipped candidate is not a ban','learning/equipment/deck suitability is separate from purchasing; retained purchased item may remain unused'],
  'natural_individual_grants': [], 'disable_AR_generatedRewards_for_scn_unlocks': True},
 'state_mapping': {}, 'modes': {}, 'scenes': {}, 'texts': texts, 'text_selection': {}, 'clues': {}, 'ends': [], 'achievements': {},
 'save': {'schema': 'CW-M1-save-1', 'required_top_level': ['schema','rule_set_id','content_set_id','engine_version','revision','session','draft','casebook','request_log','public_history'], 'supported_rule_sets': ['CW-M1-rules-0.1'], 'supported_content_sets': ['CW-M1-SCN001-0.1'], 'casebook_required': ['SCN-001'], 'missing_casebook': 'reject invalid save; do not infer first mode from clears', 'auto_migration': False, 'unsupported': ['AM1','AR1','AU1','PT-NT-001-file-v1','PT-NT-001-v1','UI-F-001-departure-v1'], 'atomic_fields': ['session.game','session.active','session.scene','session.economy','session.receipts','casebook','draft','request_log','revision'], 'storage': 'IndexedDB one slot/record; compare revision in readwrite transaction; install memory after commit', 'settled_terminal': 'terminal game + receipt + profile + offers + case changes in same save; normal open never re-collect', 'conflicting_outcome': 'reject, preserve original state', 'cutoff': 'not settlement; paused nonterminal diagnostic state; only explicit withdraw may settle'},
 'public_contract': {'view_schema': 'CW-M1-view-1', 'draw_only': 'display_data', 'methods': ['inspect','previewPreparation','quoteConversion','previewAction','execute'], 'operations': ['save_draft','discard_draft','commit_preparation','convert_items','set_item_lock','depart','continue_scene','play','withdraw','ack_return'], 'plan_shape_change': False, 'error_shape_change': False, 'view_shape_change': False, 'read_is_pure': True,
  'compatible_extension': {'operation': 'continue_scene', 'optional_payload': {'advance': 'boolean, default true', 'displayed_text_ids': 'array of currently eligible text IDs, default current mandatory scene texts for advance=true; default empty for advance=false'}, 'advance_false': 'record explicitly opened eligible text/clue and read flag only; no time, draws, outcome, rewards, pause change; exploring/return and home current request scene permitted', 'advance_true': 'same D01 paused exploring/return behavior; server records current mandatory publication/read IDs and advances; never mark unopened optional details', 'compatibility': 'old {scene_id} remains valid; current scene_id and view_token required; no new operation/error schema', 'ui_ids': ['S05','S15','S18','S16','S24'], 'reason': 'ST04/08: optional DETAIL06 publication cannot be persisted by pure inspect; mandatory/known content cannot mark unseen detail read', 'status': 'proposed for CO-01 final UI review; not received/implemented'},
  'return_capabilities': {'previewPreparation': True, 'commit_preparation': False, 'convert_items': False, 'depart': False, 'ack_return': True, 'reason': 'return_not_acknowledged'},
  'return_projection': {'new_unlocks': 'set difference from kept unlock rewards', 'kept_items': 'actual material/individual entries only; unlocks not copied here', 'home.candidates': 'actual current batch only; none yields []', 'home.owned': 'inventory only, no borrowed copies or unlock placeholders', 'home.offers': 'none/available/purchased plus carried_from_previous_return and refresh_rule; internal context excluded', 'save_failure': 'structured storage error + previous committed view/draft; no new return/unlock/purchase/resolve success'},
  'never_display': ['source_refs','rule_set_id','content_set_id','engine_version','card_registry_id','hashes','raw_run','raw_uid','batch_context','seed','RNG','unobserved_catalogues','future_reward_table','future_snapshots','policy_choice']}
}

for base, spec in derived['cards'].items():
    allowed = [k for k,v in ao['card_affixes'].items() if spec['kind'] in v['kinds']]
    data['cards'][base] = {'base_id': base, 'registry_id':data['card_registry_id'], 'card':spec, 'affix_allowlist':allowed, 'free_initial':base in loop['initial_unlocked'], 'offer_requires_kept_unlock':True}
for n, base, actors in [(1,'nt_flow',['ACT01','ACT04']),(2,'nt_pressure',['ACT02']),(3,'nt_stop',['ACT03','ACT05'])]:
    data['cards'][base].update(content_card_id=cid(f'CRD{n:02}'),source_target_ids=[cid(a) for a in actors],source='PT-NT scenario.cards/newCard/cost and card_overrides',affix_source='existing AO1 kind/family constraints; no new affix')

# Runtime supply is excluded from owned/offer catalogues.
data['runtime_supply_cards'] = {}
for attr in 'ABCD':
    for kind in ['weak','filler']:
        filler = kind=='filler'
        data['runtime_supply_cards'][kind+'_'+attr] = {'type':kind+'_'+attr,'name':'補填専用札' if filler else '弱攻撃札','attr':attr,'kind':'none' if filler else 'attack','power':0 if filler else 2,'hit':0 if filler else 20,'evasion':0,'crit_gain':25,'field_power':0,'field_hit':0,'life':1 if filler else 2,'place_cost':10,'match_cost':10,'consume_on_recover':None}

target_rows = [
 ('ACT01','V0','逆流する地下水路','進む','道のり','passage','RW01','nt_flow'),
 ('ACT02','E1','漂着した潜水服','攻撃','余力','optional_enemy','RW02','nt_pressure'),
 ('ACT03','V1','奥の水門','調える','復旧残量','terminal','RW03','nt_stop'),
 ('ACT04','V0','潮の残る地下水路','進む','道のり','passage','RW04','nt_flow'),
 ('ACT05','V1','管理用連絡路','辿る','道のり','terminal','RW05','nt_stop')]
for tid,slot,name,action,remaining,purpose,rw,newbase in target_rows:
    counts = {'weak_A':2,'weak_B':6,'weak_C':2,'weak_D':2} if slot.startswith('V') else {'f':2,'h':2,'l':2,'j':2,'g':2,'r':2}
    old = 'weak_A' if slot=='V0' else 'weak_D' if slot=='V1' else 'l'
    counts[newbase] = counts.pop(old)
    spec = ah['routes']['A']['actors'][slot]
    data['targets'][cid(tid)] = {'id':cid(tid),'runtime_actor_id':slot,'knowledge_profile_id':'SCN-001/target/'+tid,'catalogue_version':data['card_registry_id']+'/'+tid+'/initial-1','display_name':name,'action_label':action,'remaining_label':remaining,'purpose':purpose,'spec':{**spec,'action_cost_scale':1},'initial_card_counts':counts,'initial_replacements':[{'base':old,'count':2,'replacement':newbase}], 'reward_id':cid(rw), 'target_selection':'P only while active', 'npc_policy_reference':'AH.Game.targets and inherited AM public automatic selection; same source roles, no future-information policy', 'source_cards':newbase,'same_type_across_runs':True}
for setid,ids in [('SET-UNRESOLVED',['ACT01','ACT02','ACT03']),('SET-REVISIT',['ACT04','ACT02','ACT05'])]:
    data['target_sets'][cid(setid)]={'targets':[cid(x) for x in ids], 'initial_targets':[cid(x) for x in ids[:2]], 'later_target':cid(ids[2]),'route':'A','slot_map':{data['targets'][cid(x)]['runtime_actor_id']:cid(x) for x in ids}, 'fresh_departure':'full entry stats and empty run reward ledger; no previous run damage/protection/cards', 'resume':'restore exact existing actors including retirements; no new enter'}

for mode,setid,entry,request in [('first','SET-UNRESOLVED','S02','S01'),('retry','SET-UNRESOLVED','S02','S01'),('revisit','SET-REVISIT','S02R','S01R')]:
    data['modes'][cid('MODE-'+mode.upper())]={'value':mode,'target_set_id':cid(setid),'entry_scene_id':cid(entry),'request_scene_id':cid(request),'select_when':eq('case.status','resolved') if mode=='revisit' else allof(eq('case.status','unresolved'),eq('has_departure',mode=='retry')),'selection_gate':'only home successful new depart, after saved-active/return precedence','persist_at':'session.active.mode','resume_selection':False}

for rw,tid,units,unlock in [('RW01','ACT01',100,'nt_flow'),('RW02','ACT02',100,'nt_pressure'),('RW03','ACT03',200,'nt_stop'),('RW04','ACT04',100,'nt_flow'),('RW05','ACT05',200,'nt_stop')]:
    target=data['targets'][cid(tid)]
    items=[{'kind':'points','amount_units':units}]
    if rw in ['RW01','RW04']:items.append({'kind':'material','type':'M','amount':1})
    items.append({'kind':'unlock','type':unlock})
    event=cid(tid+'-DEFEATED' if tid=='ACT02' else tid+'-TRAVERSED')
    data['rewards'][cid(rw)]={'id':cid(rw),'target_id':cid(tid),'source_event_id':event,'legacy_engine_key':'A/'+target['runtime_actor_id'],'ledger_key':"JSON.stringify(['CW-M1-reward-1',run,reward_id,source_event_id])",'once_scope':'run + reward_id + source_event_id','source_fields':['run','case_id','mode','target_set_id','target_id','catalogue_version','content_set_id','source_event_id','legacy_engine_key'], 'items':items,'offer_tier':'I','protect_all_acquired_after_award':rw in ['RW01','RW04'],'grants_individual':False,'repeat_unlock':'set union only; no duplicate payment or item', 'achievement_reward':False}
    data['transitions'][event]={'event_id':event,'trigger':{'kind':'resolution','actor':target['runtime_actor_id'],'result':'defeated' if tid=='ACT02' else 'traversed','target_id':cid(tid)},'reward_id':cid(rw),'protect':rw in ['RW01','RW04'],'retire_surviving_targets':[cid('ACT02')] if rw in ['RW01','RW04'] else [],'enter_targets':[cid('ACT03' if rw=='RW01' else 'ACT05')] if rw in ['RW01','RW04'] else [],'pause_scene_id':cid({'RW01':'S03','RW02':'S02a','RW03':'S05','RW04':'S03R','RW05':'S05R'}[rw]) if rw!='RW02' else None,'terminal':rw in ['RW03','RW05'],'case_resolution':rw=='RW03','priority':'use confirmed engine outcome; defeat suppresses clear text and case resolution; retired never emits defeated reward'}

data['state_mapping']={
 cid('ST01'):{'paths':['session.active.run','session.active.case_id','session.active.content_set_id','session.active.mode','session.active.target_set_id','session.active.targets'], 'owner':'CampaignController', 'write':'successful depart only; immutable within run'},
 cid('ST02'):{'paths':['casebook.SCN-001.status','casebook.SCN-001.first_resolved_event'],'owner':'CampaignController','write':'unresolved RW03 terminal confirmed clear, atomic with settlement; monotonic'},
 cid('ST03'):{'paths':['casebook.SCN-001.attempts','session.nextRun'],'owner':'CampaignController','write':'same successful depart transaction, integer +1; reject/replay/resume +0'},
 cid('ST04'):{'paths':['casebook.SCN-001.visible_clue_ids','casebook.SCN-001.first_clue_events','session.active.published_clue_ids'],'owner':'content adapter in CampaignController','write':'actual mandatory publication or explicit eligible detail publication; set union; first provenance preserved'},
 cid('ST05'):{'paths':['session.economy.profile.knowledge','session.game.state.ah.knowledge'],'owner':'knowledge adapter','write':'encounter/observed/resolution facts use targets profile+version; carry on all settled outcomes'},
 cid('ST06'):{'paths':['session.game','session.bundle','session.scene','session.active.reward_ledger'],'owner':'CampaignController + common game','write':'executed action/event only; scene transition must not reset resources'},
 cid('ST07'):{'paths':['session.receipts[run]','session.economy.profile.returns[run]','session.economy.runs[run].receipt','session.economy.at.returns[run]'],'owner':'CampaignController settlement adapter','write':'one run/outcome; compare source signature on replay; profile/AP/AT/achievements one commit'},
 cid('ST08'):{'paths':['session.scene','casebook.SCN-001.read_text_ids','session.active.read_text_ids'],'owner':'controller for durable IDs; UI for transient open panel','write':'continue_scene recorded read IDs distinct from clue publication; inspect no write; UI open panel not game state'},
 cid('ST09'):{'paths':['session.economy.profile','session.economy.inventory','session.economy.aq.equipped','session.preparation.deck','draft'],'owner':'CampaignController AH/AP/AQ/AU adapters','write':'explicit home plan/conversion; return settlement; no growth writes during exploration'}}
data['save']['field_types']={'revision':'nonnegative safe integer','session.nextRun':'nonnegative safe integer','session.phase':'home | exploring | return','session.active':'null at home, otherwise run/index/seed/case_id/content_set_id/mode/target_set_id/targets/published_clue_ids/read_text_ids/reward_ledger','session.receipts':'map keyed run (adapter over AR historical receipt array)','session.scene':'null or {id,pause,text_ids,publication_event_id}','casebook.SCN-001.attempts':'nonnegative safe integer','casebook.SCN-001.status':'unresolved | resolved','casebook.SCN-001.first_resolved_event':'null or stable settlement event key','casebook.SCN-001.visible_clue_ids':'unique registered clue ID array','casebook.SCN-001.read_text_ids':'unique eligible published/read text ID array','casebook.SCN-001.first_clue_events':'map clue ID to immutable first public event','casebook.SCN-001.first_route_checked_event':'null or stable settlement event key','casebook.SCN-001.run_achievements':'map run to unique achievement event IDs','draft':'null or D01 based_on_revision/plan/intent/errors','request_log':'map request_id to input signature and committed revision/receipt'}

unresolved=anyof(eq('mode','first'),eq('mode','retry'))
revisit=eq('mode','revisit')
in_scene=lambda *xs:{'in':['scene_id',[cid(x) for x in xs]]}
hasclue=lambda x:eq('clues.'+x,True)
newenemy=no(eq('known_actor.ACT02',True))
when={
 'TXT01':allof(eq('mode','first'),in_scene('S01')),'TXT02':allof(unresolved,in_scene('S01')),
 'TXT03':allof(eq('mode','first'),in_scene('S02')),
 'TXT04':allof(unresolved,in_scene('S02'),newenemy),'TXT25':allof(in_scene('S02','S02R'),no(newenemy)),
 'TXT05':allof(unresolved,in_scene('S03'),no(hasclue('CL02'))),'TXT06':allof(unresolved,in_scene('S03'),no(hasclue('CL02'))),
 'TXT07':allof(unresolved,in_scene('S04'),no(hasclue('CL03'))),'TXT08':allof(unresolved,in_scene('S05'),eq('outcome','clear')),
 'TXT09':allof(unresolved,in_scene('S06'),eq('outcome','clear')),
 'TXT10':allof(in_scene('S07'),hasclue('CL05')),'TXT10B':allof(in_scene('S07'),no(hasclue('CL05')),hasclue('CL02')),'TXT10C':allof(in_scene('S07'),no(hasclue('CL02')),no(hasclue('CL05'))),
 'TXT11':allof(revisit,in_scene('S03R')),
 'TXT12':allof(eq('mode','retry'),in_scene('S01'),no(hasclue('CL03'))),'TXT13':allof(eq('mode','retry'),in_scene('S01'),hasclue('CL03')),
 'TXT14':allof(eq('mode','retry'),in_scene('S02')),'TXT15':allof(unresolved,in_scene('S03'),hasclue('CL02')),'TXT16':allof(unresolved,in_scene('S04'),hasclue('CL03')),
 'TXT17':allof(revisit,in_scene('S01R')),'TXT18':allof(revisit,in_scene('S02R')),'TXT19':allof(revisit,in_scene('S04R')),
 'TXT20':allof(revisit,in_scene('S05R'),eq('outcome','clear')),'TXT21':allof(revisit,in_scene('S06'),eq('outcome','clear')),
 'TXT22':allof(in_scene('S06'),eq('outcome','defeat')),'TXT23':allof(revisit,in_scene('S06'),eq('outcome','withdrawal')),
 'TXT24':allof(unresolved,in_scene('S06'),eq('outcome','withdrawal'),no(eq('current.t1',True)),no(hasclue('CL01'))),
 'COND01':eq('current.borrowed_first.nt_flow',True),'COND02':eq('current.borrowed_first.nt_pressure',True),'COND08':eq('current.borrowed_first.nt_stop',True),
 'COND03':eq('current.enemy_result','defeated'),'COND04':eq('current.enemy_result','retired'),
 'COND05':allof(unresolved,in_scene('S06'),eq('outcome','withdrawal'),eq('current.t1',True),no(hasclue('CL03'))),
 'COND06':allof(unresolved,in_scene('S06'),eq('outcome','withdrawal'),eq('current.t1',True),hasclue('CL03')),
 'COND07':allof(unresolved,in_scene('S06'),eq('outcome','withdrawal'),no(eq('current.t1',True)),hasclue('CL01')),
 'DETAIL01':in_scene('S01','S02'),'DETAIL02':allof(in_scene('S02','S02R'),no(eq('catalogue.ACT02',True))),
 'DETAIL03':in_scene('S03'),'DETAIL04':in_scene('S03','S03R'), 'DETAIL05':allof(unresolved,in_scene('S04','S05')), 'DETAIL06':in_scene('S04','S05','S04R','S05R'),
 'OBJ-ENTRY':allof(unresolved,no(hasclue('CL02')),no(hasclue('CL03'))), 'OBJ-PORT':allof(unresolved,hasclue('CL02'),no(hasclue('CL03'))),
 'OBJ-REPAIR':allof(unresolved,hasclue('CL03'),no(eq('outcome','clear'))),'OBJ-REVISIT':allof(revisit,no(eq('outcome','clear'))),
 'OBJ-DONE':allof(unresolved,eq('outcome','clear')),'OBJ-CHECKED':allof(revisit,eq('outcome','clear')),'LABEL-RESUME':eq('resuming_unsettled',True)}
assert set(when)=={v['source_id'] for v in texts.values()}
for key,cond in when.items():
    texts[cid(key)]['eligible_when']=cond
    texts[cid(key)]['kind']='detail' if key.startswith('DETAIL') else 'objective' if key.startswith('OBJ-') else 'label' if key.startswith('LABEL') else 'conditional' if key.startswith('COND') else 'main'
    texts[cid(key)]['economic_effect']=None
data['text_selection']={'condition_language':'all/any/not + eq:[context.path,literal] / in:[context.path,literal_array]; missing booleans false; all other missing fields invalid; no executable code', 'context':'mode is persisted active mode; clues/known_actor/catalogue captured before scene entry publication; scene_id current; current.* refer this run only; resuming_unsettled does not cause transition', 'entry_order':'select using before-publication context, persist chosen text_ids, then publish mandatory clue facts; inspect/resume uses stored IDs and never reselects first text as known text', 'read_suppression':'read_text_ids may shorten main text but never hide current objective/outcome; no game advantage', 'conditional_once':'COND01/02/08 only first actual borrowed card usable in run and previously unknown base; COND03/04 exclusive once per current actor outcome; no owned-item grant', 'revisit_enemy_unknown':'if inconsistent imported case has resolved=true but no ACT02 encounter, allow TXT04 at S02R as same-type first encounter; not current initial save reachable', 'return_S07':'choose TXT10 family using actual persisted clues only; no extra settlement or restored HP'}
# A resolved supported save has encountered ACT02; the fallback remains explicit for future manual fixtures.
texts[cid('TXT04')]['eligible_when']=allof(in_scene('S02','S02R'),newenemy)
for sid,nextsid,pause,kind in [('S01','S02',False,'request'),('S01R','S02R',False,'request'),('S02',None,True,'entry'),('S02R',None,True,'entry'),('S02a',None,False,'optional_enemy_event'),('S03','S04',True,'port'),('S03R','S04R',True,'port'),('S04',None,True,'gate'),('S04R',None,True,'gate'),('S05','S06',True,'settled_end'),('S05R','S06',True,'settled_end'),('S06','S07',False,'return'),('S07',None,False,'home')]:
    data['scenes'][cid(sid)]={'id':cid(sid),'next_scene_id':cid(nextsid) if nextsid else None,'pause':pause,'kind':kind,'progress_rule':'explicit depart' if kind=='request' else 'explicit ack_return' if sid=='S06' else 'no game advance; settled receipt already exists' if kind=='settled_end' else 'continue_scene to next text with unchanged game time/HP/cards' if kind=='port' else 'continue_scene releases pause and advances only to next stop/player ready/outcome' if kind in ['entry','gate'] else 'display only'}
for cl,ts,event in [('CL01',['TXT01','TXT03','TXT14'],'request/entry actually published'),('CL02',['TXT05','TXT06','TXT15'],'port actually published'),('CL03',['TXT07','TXT16'],'cause actually published'),('CL04',['TXT08'],'valid unresolved clear transaction'),('CL05',['DETAIL06'],'explicit optional detail publication; not availability or TXT17')]:
    data['clues'][cid(cl)]={'id':cid(cl),'publication_text_ids':[cid(x) for x in ts],'trigger':event,'retain_all_outcomes':True,'first_event_preserved':True,'is_read_flag':False}

for eid,cond,out,ts in [
 ('END-C',allof(eq('outcome','clear'),unresolved),'clear',['TXT08','TXT09']),('END-R',allof(eq('outcome','clear'),revisit),'clear',['TXT20','TXT21']),
 ('END-E',eq('outcome','defeat'),'defeat',['TXT22']),
 ('END-W0',allof(eq('outcome','withdrawal'),no(eq('current.t1',True))),'withdrawal',[]),
 ('END-W1',allof(eq('outcome','withdrawal'),eq('current.t1',True),no(eq('current.cause_public',True))),'withdrawal',[]),
 ('END-W2',allof(eq('outcome','withdrawal'),eq('current.t1',True),eq('current.cause_public',True)),'withdrawal',[]),
 ('END-S',eq('resuming_unsettled',True),None,['LABEL-RESUME']),('END-SR',eq('resuming_settled',True),None,[])]:
    data['ends'].append({'id':cid(eid),'when':cond,'outcome':out,'main_text_ids':[cid(x) for x in ts], 'kept':'all acquired' if out=='clear' else 'protected acquired only' if out=='withdrawal' else 'none' if out=='defeat' else 'unchanged stored receipt or unclosed ledger','changes_case_to_resolved':eid=='END-C','recompute_settlement':False,'resume_priority':eid in ['END-S','END-SR']})
data['return_rules']={'classification':'resume END-S/SR takes priority and restores saved end ID; new terminal uses engine outcome then current-run T1/cause publication; no ending from text', 'withdrawal_text':'revisit TXT23; unresolved before T1 CL01 ? COND07 : TXT24; after T1 persisted CL03 ? COND06 : COND05', 'past_cause_known':'END-W1 may show COND06 if previous-run CL03 true; do not invent current cause observation or upgrade END-W1 to W2', 'revisit_cause_public':'S04R publication sets current.cause_public for W1/W2 segmentation but does not set CL03 or repair history', 'settlement_order':['validate engine outcome and completion event','freeze reward ledger and kept/lost partition','AH points/materials/unlock union + K carry','AP run receipt without SCN natural individual grant','case/route achievements + CL04 when valid','AT eligible context after unlock and batch generation/retention','one durable record including request id','install state and expose receipt'], 'settlement_event_key':"JSON.stringify(['CW-M1-settlement-1',run])",'reward_replay':'same run/RW/source_event and identical value no duplicate; conflict rejects; other run new per-run entitlement','run_receipt_fields':['run','outcome','mode','case_id','target_set_id','content_set_id','source_events','reward_ledger','kept','lost','new_unlocks','new_knowledge','case_changes','expedition_end_hp','home_hp','offer_batch_id'],'clue_vs_outcome':'CL04 only valid clear; no CL03/CL05 inferred merely from resolved; first_resolved_event survives withdrawal/defeat/revisit'}
for ach,scope,trigger in [('ACH-RESOLVED','case','first unresolved RW03 valid clear'),('ACH-CATALOGUE','profile + catalogue_version','first traversed/defeated fact'),('ACH-CLUE','case + clue_id','first actual eligible publication'),('ACH-ROUTE-CHECKED','case','first revisit RW05 valid clear; per-run completion also stored'),('ACH-UNLOCK','base_id','kept unlock set difference')]:
    data['achievements'][cid(ach)]={'id':cid(ach),'once_scope':scope,'trigger':trigger,'reward_items':[],'ledger_key':"JSON.stringify(['CW-M1-achievement-1',achievement_id,scope_id])",'repeat':'retain first provenance; per-run results recorded separately, no bonus'}
data['compatibility_notes']=[
 {'id':'CO01A-N01','target_ids':[cid('ST04'),cid('ST08'),cid('CL05')],'source':'D01 pure read versus S01 optional detail persistence','resolution':'optional compatible continue_scene payload extension; UI final review remains'},
 {'id':'CO01A-N02','target_ids':[cid('END-W1'),cid('END-W2')],'source':'S01 END boundary and past known cause paragraph','resolution':'classify this-run segment separately from return report using persistent known cause'},
 {'id':'CO01A-N03','target_ids':[cid('RW01'),cid('RW04')],'source':'S01 uses shorthand M1','resolution':'input uses material type M amount 1; no source prose edit needed'},
 {'id':'CO01A-N04','target_ids':[cid('CRD01'),cid('CRD02'),cid('CRD03')],'source':'D01 allowed unspecified individual route','resolution':'this M1 uses purchased individual only; disable AR unlock-to-individual adapter'},
 {'id':'CO01A-N05','target_ids':[cid('ACT04'),cid('ACT05')],'source':'S01 candidate reuse of V0/V1','resolution':'reuse runtime slots/specs; distinct profile/version and RW ID; never old full catalogue inheritance'}]
data['offers']['event_tiers']={r['source_event_id']:r['offer_tier'] for r in data['rewards'].values()}
data['offers']['generation_context_mapping']={'seed':'active.seed','index':'active.index','route':'A','tier':'maximum retained rated source rank','sources':'sorted reward ledger keys; keys include run/RW/source event','card_bases':'sorted unlocked registry base IDs after kept unlock union'}
data['card_pipeline']={'information_keys':['type','name','attr','kind','power','hit','evasion','crit_gain','field_power','field_hit','life','place_cost','match_cost','consume_on_recover'],'signature':'existing I.signature on fully resolved card; includes both action intervals; version carried on knowledge event, not fabricated as an I.card field','blueprint_registry':'AO1 keys unchanged; validate against pinned input.cards, never process-global old AO.catalog','instance_creation':'resolve pinned base + affixes first; populate full numeric spec and both costs; ensure old stats/default/type overrides cannot overwrite authored crit_gain/evasion; verify restored original and compiled cards against same registry','cost':'base lookup for plain and variant must reach same interval pair; add card affix cost once, then passive discount; never f/l/g alias or type-name fallback','owned_identity':'AT uid separate from run card id; source target profile/version stays on run observation; no borrowed-to-inventory conversion'}
data['state_mapping'][cid('ST04')]['paths'].append('session.active.published_scene_ids')
data['save']['field_types']['session.active'] += '/published_scene_ids/departure_case_state'
data['save']['field_types']['session.active.published_scene_ids']='unique scene ID array published this run; append at committed mandatory scene publication, not read or resume'
data['save']['field_types']['session.active.departure_case_state']='{status,attempts_before}; snapshot used to validate persisted mode without selecting again'
data['save']['invariants']=['attempts equals unique successful case run IDs in receipts plus unclosed active run; never count return active twice','resolved requires first_resolved_event matching an existing valid unresolved clear receipt and RW03 source event','first_resolved_event and first_route_checked_event never replaced by repeated achievements','active mode matches departure_case_state, not current case status after clear','active source target mapping and catalogue versions match pinned target set','stored reward and receipt signatures match same run/content/outcome; contradictory outcome rejects','current offer points to stored batch; purchased receipt may remain after conversion removed item','known clues/read texts are registered and supported by eligible publication/read provenance; unknown details are not fabricated']
data['text_selection']['context_sources']={'mode':'session.active.mode, or derived next mode at home request','scene_id':'session.scene.id (home request adapter selects S01/S01R without departure)','clues':'persisted case visible_clue_ids, captured before new scene publication','known_actor.ACT02':'AD encounter records for ACT02 profile; catalogue disclosure is separate','catalogue.ACT02':'AD initial_catalogue_grant for exact ACT02 profile/catalogue_version','current.t1':'active reward ledger contains acquired RW01 or RW04','current.cause_public':'active published_scene_ids includes S04 or S04R; distinct from historical CL03','current.enemy_result':'this run ACT02 resolution fact, defeated or retired, never both','current.borrowed_first.*':'first observed usable hand card with foreign origin and matching base in this run, excluding already known base and read conditional IDs','outcome':'confirmed game outcome or stored receipt outcome; never UI inference','resuming_unsettled':'open restored exploring state with no settlement; takes precedence over new-departure selection','resuming_settled':'open restored return state with saved receipt; selects END-SR wrapper then saved underlying end'}
data['public_contract']['compatible_extension']['validation']='Reject ineligible/unregistered IDs, wrong scene, stale token/revision or advance=true without current pause. advance=false is an explicit publication/read mutation only; returned mandatory text may be published but not human-read. Unopened optional text is never inferred from scene availability.'
data['offers']['no_new_batch']['empty_eligible_pool_reachability']='Configured M1 has four eligible passive bases, so qualifying empty pool is not a normal reachable case; distinguish a valid later empty pool from malformed registry/version, which is rejected rather than treated as empty.'
for row in data['cards'].values():
    row['information_signature']=json.dumps(row['card'],ensure_ascii=False,separators=(',',':'))
data['remaining']=['CO-01 final UI comparison including optional continue_scene extension and storage/input agreement','D02/D03 implement and validate registry injection, single controller, persistent adapter, settlement, offers and next run','U02 real screen connection; D04 persistence/action acceptance checks','human reasons for deck choices, retry/revisit repetition and enjoyment; no numeric proxy conclusion','D05 BF follow-up outside current task']
out=ROOT/CONDITIONS['input_file']
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'input':str(out.relative_to(ROOT)),'cards':len(data['cards']),'texts':len(texts),'targets':len(data['targets']),'rewards':len(data['rewards'])},ensure_ascii=False))
