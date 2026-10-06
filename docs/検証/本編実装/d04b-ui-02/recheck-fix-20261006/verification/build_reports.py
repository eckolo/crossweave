"""固定証拠から提出台帳を作る。再採取・補間・UI合格への書換えは行わない。"""
from pathlib import Path
import hashlib,json,subprocess,shutil
from PIL import Image
R=Path.cwd();E=Path(__file__).resolve().parents[1];OLD=E.parent/'reproduction-20261005'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf8'))
def digest(p):return hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
def relative(p):return p.relative_to(E).as_posix() if p.is_relative_to(E) else '../reproduction-20261005/'+p.relative_to(OLD).as_posix()
CODE=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
review=read(E/'fixed-input/recheck-20261006/判定.json')
groups=read(E/'fixed-input/recheck-20261006/必要群判定.json')
folders=['rendered-dark','approved-dark-final','normal-and-human-final','human-native-corrected','related-final']
runs=[]
for folder in folders:
 d=read(E/folder/'manifest.json');cases=d.get('cases',{})
 rows={k:v for k,v in cases.items() if v['status']=='passed'}
 if folder!='rendered-dark':assert d['status']=='passed' and not d['source_changed_during_run'],folder
 runs.append({'folder':folder,'manifest_status':d['status'],'passed_cases':rows,'source_sha256':d['source_sha256'],'source_changed_during_run':d.get('source_changed_during_run'),'error':d.get('error'),'reuse':'rendered-darkの19成功caseは共通窓cp→cjの変更影響先をapproved-dark-finalで置換。旧追加modeの登録漏れを成功へ書換えない。' if folder=='rendered-dark' else '当該検査版で終了・source不変。'})
actual={}
for folder in ['rendered-dark','approved-dark-final']:
 for p in (E/folder).glob('*.png'):actual[p.name]=p
old_pairs=read(OLD/'comparisons.json')['pairs'];pairs=[]
for p in old_pairs:
 if p['theme']!='dark':continue
 f=actual.get(Path(p['godot']['path']).name);ref=OLD/p['reference']['path']
 if not f or not ref.exists():continue
 pairs.append({'id':p['id'],'theme':'dark','fixture':p.get('initial_fixture'),'reference':relative(ref),'reference_sha256':digest(ref),'before':relative(OLD/p['godot']['path']),'current':relative(f),'current_sha256':digest(f),'reference_nodes':relative(OLD/p['reference_nodes']['path']),'current_nodes':relative(f.with_suffix('.nodes.json')),'status':'同状態の暗色原寸を提出・UI独立再判定待ち','original_limits':p.get('claim')})
for name in ['single','multi']:
 ref=E/'source-notice-owned-final'/('dark-repro-notice-'+name+'.png');cur=E/'approved-dark-final'/('repro-notice-'+name+'.png')
 pairs.append({'id':'notice-'+name+'-dark','theme':'dark','reference':relative(ref),'current':relative(cur),'reference_sha256':digest(ref),'current_sha256':digest(cur),'status':'同一文言の実部品を提出。多行の原本white-space/高さと本文差を未確認へ残す。実保存故障の意味は別検査。'})
ref=E/'source-notice-owned-final/dark-repro-owned-review-owned-unlocked.png';cur=E/'approved-dark-final/repro-owned-review-owned-unlocked.png'
pairs.append({'id':'owned-ST-P08-dark','theme':'dark','fixture':'repro-owned-review (repro-homeと同byte)','reference':relative(ref),'current':relative(cur),'reference_sha256':digest(ref),'current_sha256':digest(cur),'status':'同合法ownedの原本と本編。原本にlock/convert操作がない差はH13の未採用配置判断。'})
save(E/'comparisons.json',{'code_sha':CODE,'original':'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2','theme':'approved-dark','pairs':pairs,'formal_ui_approval':False,'no_interpolation':True})
by_id={p['id']:p for p in pairs};crops=[]
prior=read(OLD/'id-comparisons.json')['items']
for item in review['items']:
 id=item['id'];entry=next((x for x in prior if x['id']==id and x['theme']=='dark'),None)
 if not entry or id=='V-D03':continue
 pair=by_id.get(entry['pair'])
 if id in ['V-W01','V-W02']:pair=by_id.get('repro-prediction-hand-detail-dark')
 if id=='V-W10':pair=by_id.get('repro-explore-deck-dark')
 if not pair:continue
 ref=E/pair['reference'];cur=E/pair['current'];box=entry['images'][0]['crop_box_pixels']
 if id in ['V-W01','V-W02','V-W10']:
  nodes=read(E/pair['current_nodes'])['nodes'];panel=next((n for n in nodes if ('detail-panel' if id!='V-W10' else 'dialog-panel') in n['ids']),None)
  if panel:
   x,y,w,h=panel['rect'];box=[max(0,int(x)-16),max(0,int(y)-16),min(1920,int(x+w)+16),min(1080,int(y+h)+16)]
 dest=E/'id-comparisons'/id;dest.mkdir(parents=True,exist_ok=True)
 images=[]
 for role,file in [('reference',ref),('before',E/pair['before']),('current',cur)]:
  img=Image.open(file);img.crop(box).save(dest/(role+'.png'));images.append({'role':role,'path':relative(dest/(role+'.png')),'source':relative(file),'source_sha256':digest(file),'crop_box_pixels':box,'interpolation':False})
 crops.append({'id':id,'pair':pair['id'],'images':images,'status':'当該領域を含む等倍対。pixel差は合格率にしない。'})
seq=read(E/'approved-dark-final/repro-motion-explore-sequence.json')['sequence'];cue=[]
for f in seq:
 if not f['state']['cue_visible'] and 'cancel' not in f['frame']:continue
 p=E/'approved-dark-final'/f['frame'];nodes=read(p.with_suffix('.nodes.json'))['nodes'];node=next((n for n in nodes if 'hold-cue' in n.get('ids',[])),None)
 if not node:continue
 x,y,w,h=node['rect'];box=[max(0,int(x)-18),max(0,int(y)-8),min(1920,int(x+w)+24),min(1080,int(y+h)+48)]
 dest=E/'id-comparisons/V-D03'/p.name;dest.parent.mkdir(parents=True,exist_ok=True);Image.open(p).crop(box).save(dest)
 cue.append({'frame':relative(p),'crop':relative(dest),'crop_box_pixels':box,'elapsed_ms':f['state']['hold_elapsed_ms'],'state':f['state'],'status':'実frame・cue進行／取消。原本の同時点AA/影照合は独立UIへ。'})
save(E/'id-comparisons.json',{'code_sha':CODE,'items':crops,'cue_frames':cue,'not_a_pixel_pass_test':True})
code_paths=[p.decode('utf8') for p in subprocess.check_output(['git','diff','--name-only','-z','8e992501',CODE,'--','apps/crossweave-godot/Godot/Application']).split(b'\0') if p]
blobs={p:subprocess.check_output(['git','rev-parse',CODE+':'+p],text=True).strip() for p in code_paths}
notes={
 'V-C01':'用途別baselineを実測3px補正。font/size/lineboxを保持。名指したAA残差は未採用。',
 'V-C02':'cj-shellの面/線とcp/cjの同light hexの異なるdark paperを用途で分離。',
 'V-C04':'pin active面をhoverで消さず、内側16pxへ。',
 'V-C05':'外角10と内側1px境界を保持。','V-C06':'10pxの実バー・track/thumb/hover/press/drag/端部を実ノードで追加。',
 'V-P08':'135degの斜線の見える向きと周期を復元。時計はH11待ち。','V-P09':'矢印opacity.6、3px底線の丸角。','V-P10':'1px破線・角5。未登録記号はH11。',
 'V-P12':'実文字幅+gap12の未払いtoken、帯の追加警告を確認窓へ。','V-P13':'元footerの均等幅とprimaryを復元。owned追加配置はH13待ち。','V-P14':'無効確認の原本文言と公開残高/—/価格を復元。合法funded5群の確定を確認。','V-P15':'64×48時計boxと均等footer、112px事実列を保持。',
 'V-E02':'既存絵coverと50%40%を復元。','V-E04':'CSS150degをpixel空間で投影。','V-E07':'空captionを短いlineboxの上寄せへ。','V-E08':'consume文字はmuted。','V-E09':'consumeとchangedを区別、通常線+linkedを保持。','V-E10':'主体バー4pxと内容幅space-between。','V-E12':'本人400pxを保持して内容幅で下段を配置。','V-E13':'選択札へ追従する白いtrack。',
 'V-W01':'数値の実幅とnowrapを確保。4/50の幅1px・縦折返しを実ノードで否定。','V-W02':'pin内側16px/active面。','V-W06':'札リストgap8を復元。親scrollは自身のmaxへclamp。','V-W10':'山札の内容幅button・自動列幅・行間を復元、既登録Swords/HeartPulse定義を復元。未使用itemIcon入口は未確認。',
 'V-H02':'既存coverと多stop/alpha/宣言順を保持。','V-H05':'暗色cj-shellと下64px帯。通常起動をOS非連動へ。','V-S01':'実保存中、一回確定、同一文言単/多行と取得noticeを追加。多行は原本CSS差の限定再判定待ち。','V-D01':'allowed角8/2px、blocked1px破線・対象1列。','V-D02':'探索元opacity1と白glyph。取得元.3は別に維持。','V-D03':'実時計129〜195msのcue9frameと取消を提出。'}
ledger=[]
for item in review['items']:
 id=item['id'];human=[d for d in ['DEC-UI-01','DEC-UI-03','DEC-UI-05','DEC-UI-04'] if d in str(item.get('decision',item.get('judgment','')))]
 ledger.append({'id':id,'title':item['title'],'fixed_ui_status':item['status'],'condition':item['implementation_condition'],'work_result':notes.get(id,'当該差異の解消範囲を継承。属性/親scrollの確定条件を維持。未登録記号・hover・追加routeは個別回答待ち。'),'code_sha':CODE,'code_path_blobs':blobs if item['status']!='解消（当該差異の範囲）' else {},'original':item['original'],'comparisons':[x['pair'] for x in crops if x['id']==id],'status':'修正/証拠提出・独立再判定待ち' if item['status'] in ['要修正','未確認'] else item['status'],'formal_ui_approval':False})
save(E/'UI対応表.json',{'work_id':'20260927-game-application','instruction':'0.9（0.7の独立修正を含む）','code_sha':CODE,'fixed_review':'099d4adeaa025e78ca069c4eca0d54d75fdf0c3b','items':ledger,'old_ui_counts_preserved':review['status_counts'],'new_independent_approvals':0})
for g in groups['items']:g['submitted_evidence']='comparisons.json / results.json / normal-and-human-final / approved-dark-final';g['independent_status_unchanged']=True
save(E/'必要群と残件.json',{'items':groups['items'],'dark_approval_scope':'最新計画0.9で了承範囲は確定。実描画の適合は独立UIへ。','not_self_closed':True,'legal_inputs':['R01-filler','R04-unlimited','U-V01 登録長名称'],'human_answers':['H11 用途別記号','H12 空白境界とpreview追加','H13 route別配置','DEC04 修正後の特定AA'],'owners':{'legal':'既存ゲームバランス検討→本編→UI','human':'人→とりまとめ→本編/UI','appearance':'既存UI改善→とりまとめ'},'resume':'固定した合法command/seed/初期save hash、用途/routeごとの原文回答、または固定SHAのUI再判定を受領して同じWorkの該当項目だけ再開。'})
save(E/'results.json',{'code_sha':CODE,'work_id':'20260927-game-application','instruction':'0.9','runs':runs,'normal_dark':'normal-and-human-final/manifest.json','related_modes':len(runs[-1]['passed_cases']),'rendered_first_dark_passed_cases':len(runs[0]['passed_cases']),'approved_dark_additional_modes':11,'normal_and_candidate_modes':4,'cue_visible_frames':len(cue),'same_state_dark_pairs':len(pairs),'font_metrics':'取得札上端の3px差を補正。残る字面高さ1px/AAは特定領域の未採用残差。','preservation':'start-preservation.json','formal_ui_approval':False,'distribution':False,'physical_input':False,'m1_complete':False})
save(E/'code-path-blobs.json',{'code_sha':CODE,'files':blobs})
print('reports',len(ledger),'IDs',len(pairs),'dark pairs',len(crops),'ID crops',len(cue),'cue frames')
