"""普通のGit保存と固定SHA読戻しの台帳。未取得・未受領を成功に変えない。"""
from pathlib import Path
import report_io
import argparse,hashlib,json,subprocess,datetime
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';D=R/'apps/crossweave-godot/.tools'
B='0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6';I='c761cbf4950a750b5b337e1bc9926528b87be54a'
EVIDENCE_SHAS=['d4c9d50dfb5d8ba048499454b82733357f84d935','dce858d0ea2fa9b5b1788e0bd9966319a1b5cda1','9429e1abd2380e9298a982657445efdb4032c61d','d0d34969aa28afd09710d4eb5fa77dfbdf074c07']
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*a):return subprocess.check_output(['git',*a],cwd=R)
def tree(ref):
 d={}
 for row in git('ls-tree','-rz',ref).split(b'\0'):
  if not row:continue
  m,p=row.split(b'\t',1);mode,kind,blob=m.split()
  if kind==b'blob':d[p.decode('utf-8')]=blob.decode()
 return d
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def inventory():
 canonical=set(['source-representative-final','source-components-final','source-shared-final','source-extra-final','source-remaining-final','source-boundary-states-final','source-edge-states','source-font-leaves','source-required-boundaries-complete','source-required-states-neutral','source-record-contexts','legal-common','legal-common-fixed','legal-boundaries','legal-return','legal-acquisition-extra','legal-record-contexts','fixtures','fixtures-record-contexts','fixed-input','environment','verification','fixed-light-final','fixed-dark-final','preparation-light-final','preparation-dark-final','settled-light','settled-dark','startup-dark-final','related-final','related-common-final','core-final','id-comparisons','cloud','boundary-light','boundary-dark','hover-use-light','hover-use-dark','common-light-submitted','common-dark-background-final','records-use-light','records-use-dark','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark'])
 rows=[];cache={}
 if a.reuse_fixed_captures and (E/'proof-inventory.json').exists():cache={r['path']:r for r in read(E/'proof-inventory.json')['files']}
 exclude={'proof-inventory.json','publication.json','source-readback.json','publication-policy.json'}
 for p in sorted(E.rglob('*')):
  if not p.is_file() or p.name in exclude or p.name.endswith('.tmp'):continue
  rel=p.relative_to(E);keep=rel.parts[0] in canonical and p.suffix!='.zip'
  keep=keep or len(rel.parts)==1 or p.name=='manifest.json' or p.suffix in ['.log','.trx'] or (p.suffix=='.json' and not p.name.endswith('.nodes.json'))
  if p.suffix=='.zip':keep=False
  previous=cache.get(rel.as_posix());fixed_capture=len(rel.parts)>1 and rel.parts[0] not in {'verification','environment','cloud','fixed-input','fixtures','fixtures-record-contexts','source-record-contexts'} and p.suffix!='.zip'
  reuse=bool(fixed_capture and previous and previous['bytes']==p.stat().st_size)
  rows.append({'path':rel.as_posix(),'bytes':p.stat().st_size,'sha256':previous['sha256'] if reuse else digest(p),'hash_source':'直前に全byte採取済みの確定画像／実結果（再採取なし）' if reuse else '今回全byte読取','publication_target':'通常Gitのpayload' if keep else 'ローカル保全・inventory hashのみ','is_distribution':False})
 save(E/'proof-inventory.json',{'implementation_sha':I,'files':rows,'raw_intermediate_images_not_deleted':True,'raw_cloud_zips_retained_with_receipt_digest':True,'normal_save_not_in_inventory':True,'metadata_excluded_to_avoid_self_hash':sorted(exclude)})
 save(E/'publication-policy.json',{'implementation_sha':I,'method':'既存枝へ通常commitとfast-forward Push。ブランチ全体のmerge・force push・配布なし。','canonical_folders':sorted(canonical),'raw_required_pngs':'原本／提出版・必要部品・連続実描画・端送りは原寸PNGとnodesを通常Gitへ。','intermediate':'古い途中PNG/nodesとCI ZIPはローカル保全、全hashはproof-inventory。途中のmanifest/log/check/TRXは通常Gitへ。初期失敗を後の成功へ読み替えない。','previous_evidence_preserved':True,'original_three_pngs':'E0の固定元PNGをbyte読戻し済み。受領／適合はUIの独立判断。','player_build_required':False,'formal_distribution':False})
 c=read(E/'comparisons.json');missing=[]
 for pair in c['pairs']:
  absent=[role for role in ['reference','godot','reference_nodes','godot_nodes'] if not (E/pair[role]['path']).exists()]
  if not absent:continue
  key=pair['id'];optional='optional-prose' in key
  missing.append({'pair':key,'missing_roles':absent,'status':'この同状態の比較shotは未取得・合格／対象外ではない','reason':'固定原本では任意本文を同じ独立窓へ開く入口がない。追加読了操作の置き場所はDEC-UI-05。' if optional else '初回の公開記録が空で対象／対象札の実入口がない。空記録の原画像と公開payloadを保全。観測済みの合法な別状態はsource-record-contextsとrecords-use明暗へ追加し、初期状態のshotに読み替えない。','owner':'UI改善（原本対応）／本Work（採取）','resumption':'原本対応の入口・同状態条件を固定して必要なshotをこのWorkで採取。','complementary_pairs':[p['id'] for p in c['pairs'] if p['id'].startswith('observed-')] if not optional else []})
 save(E/'missing-comparison-states.json',{'items':missing,'all_missing_preserved':True,'not_used_as_pass':True})
 print('inventory',len(rows),'bytes',sum(r['bytes'] for r in rows),'missing_pairs',len(missing))
def prepare_readback(target):
 major=['apps/crossweave-godot/Godot/Application/GameScreen.AcceptedWindows.cs','apps/crossweave-godot/Godot/Application/GameScreen.AcceptedStyle.cs','apps/crossweave-godot/Godot/Application/GameScreen.Exploration.cs','apps/crossweave-godot/Godot/Application/UiAutomation.cs','docs/作業資料/Work/20260927-game-application.md',*[str((E/n).relative_to(R).as_posix()) for n in ['README.md','UI対応表.json','comparisons.json','results.json','必要証拠と残件.json','screen-states.json','コード解説.md','とりまとめ引継ぎ.md','same-fixture-audit.json','record-fix-comparison.json']]]
 dest=D/'remote-content';dest.mkdir(exist_ok=True)
 save(D/'readback-list.json',{'commit':target,'files':[{'path':p,'destination':str(dest/(str(i)+Path(p).suffix))} for i,p in enumerate(major)]})
 print('readback list',len(major),target)
def validate(target):
 local=tree(target);before=tree(B);remote=read(D/'payload-remote-tree.json');assert not remote['truncated']
 rm={p['path']:p['sha'] for p in remote['tree'] if p['type']=='blob'}
 paths=[p.decode('utf-8') for p in git('diff','--name-only','-z',B,target).split(b'\0') if p]
 rows=[{'path':p,'before_blob':before.get(p),'blob':local.get(p),'github_blob':rm.get(p),'equal':local.get(p)==rm.get(p)} for p in paths]
 assert all(r['equal'] for r in rows)
 texts=[]
 for r in read(D/'readback-list.json')['files']:
  raw=git('show',target+':'+r['path']);body=Path(r['destination']).read_bytes();eq=raw==body
  assert eq,r['path'];texts.append({'path':r['path'],'blob':local[r['path']],'bytes':len(raw),'sha256':hashlib.sha256(body).hexdigest(),'full_text_readback_equal':eq})
 plan=read(E/'sources.json')['plan'];planrows=[{'path':p,'source_blob':b,'payload_blob':local.get(p),'github_blob':rm.get(p),'equal':local.get(p)==rm.get(p)==b} for p,b in plan['files'].items()];assert len(planrows)==64 and all(r['equal'] for r in planrows)
 receipt={'payload_sha':target,'implementation_sha':I,'status':'passed','remote_tree_truncated':False,'all_changed_path_blobs':rows,'major_text_readback':texts,'plan_sync_64_path_blobs':planrows,'original_png_byte_readback':'png-readback.json','formal_ui_approval':False,'other_work_messages_sent':False}
 save(E/'source-readback.json',receipt)
 save(E/'publication.json',{'work_id':'20260927-game-application','task':'D04B-UI-02','instruction':'0.5','status':'依頼全体未完了・独立修正と証拠の通常提出','branch':'impl/m1-godot-application-20260927','base_sha':B,'implementation_sha':I,'payload_sha':target,'source_evidence_shas':EVIDENCE_SHAS[:2],'rendered_evidence_shas':EVIDENCE_SHAS[2:],'implementation_and_evidence_path_blobs':rows,'github_readback':'source-readback.json','ci_readback':'ci-readback.json','all_changed_payload_blobs_equal':True,'major_texts_full_readback':True,'publication_metadata_commit':'このreceiptを含む後続コミットSHAはGit履歴と提出メッセージで固定。自己参照hashは捏造しない。','required_groups':'必要証拠と残件.json','specific_ui_decisions':'原本判断への返却.json','legal_input_boundaries':'contract-boundaries.json','missing_comparison_states':'missing-comparison-states.json','formal_ui_approval':False,'coordinator_received':False,'formal_distribution':False,'windows11_physical':False,'physical_input':False,'other_work_started':False,'player_sdk_required':False})
 print('GitHub readback',len(rows),'blobs',len(texts),'full texts','plan',len(planrows),'mismatches 0')
def handoff():
 rs=read(E/'必要証拠と残件.json')['items'];dec=read(E/'原本判断への返却.json')['items']
 text=f'''# とりまとめへの固定成果と再開条件

**D04B-UI-02（0.5）の依頼全体は未完了。独立して可能な本編修正・証拠・教材を同じWork・枝へ提出した。** 実装 `{I}`、確認基点 `{B}`。原寸証拠・全変更path/blob・GitHub読戻しは[publication.json](publication.json)、最終クラウドの内部manifest／artifact照合は[ci-readback.json](ci-readback.json)へ固定する。

必須開始順は計画23b006047a0c35233fcca48c923a32501dbd878dのとりまとめ64実ファイル → 技術21ddd349b6bec69ecac6d9db288c537553dab860の既定同期 → 全64path/blob再照合。既存配布基点の取り込みはやり直していない。UI入力8b535c2f・原本72d0eb58・基準2026-10-04.1を使用し、破損CP02は利用しない。

## 修正と確認入口

57IDとN01〜03の期待／実績・修正SHA/path/blob・同状態対は[UI対応表](UI対応表.json)。全Mainの使用先を[確認入口](確認入口.md)へ結んだ。共通部品の明暗、取得／探索、詳細／確認、本文／三帰還、記録の空状態と観測済み状態、通常／hover／押下／keyboard focus／選択／無効、バー・120/220ms・端送り・200ms移動を実ノード／無補間原画像で保存。新しい法則・数値・素材・保存形式を作っていない。

共通窓の親menu、同じ公開対象の記録表、cj/cw/cp配色と文字の使い分け、原本headerの非表示条件、既存X/戻るSVG18px、現在予約の主体ごとの間隔を最後に修正した。観測済み記録では孫窓を直近の親から配置し、値列を原本に合わせ、空記録の追加文言を除いた。記録の自然送りは原本597px・Godot598px。親の保持と元の一覧位置への復帰は実入力で確認したが、現固定原本は子詳細／戻るでscrollが0へ戻り、保持基準との判断は未解消。

I10の共通16mode明暗を保全し、記録変更後は共通7mode明暗（明色I11・暗色I12）、空記録の明色1mode（I12）、観測済み3mode明暗（I12）を追加した。[記録修正の前・後・原本12対](record-fix-comparison.json)と[same-fixture-audit.json](same-fixture-audit.json)に同じ保存からの比較を固定する。原本補助採取の入力取り違えは失敗記録のまま保全し、修正後の6ケースは元保存とGodot入力のbyte一致を確認した。

関係する予測・予約・一巡・別プロセス再開と保存回帰を限定検証。Core関連17件と既存oracleを確認し、全旧73件は一律に反復していない。各検査のsource hashと変更外の再利用範囲は[結果](results.json)。専用slotの実ファイルを使い、通常セーブ・旧証拠・未保存差分の保全境界は[preservation.json](preservation.json)。実描画は同じMainでの合成InputEventであり、物理入力・実機受入の合格ではない。

初期空記録では子入口がなく未取得のshotを残す。通常の踏破済み保存から次の編成／本文／撤退をcommandだけで得て、観測済みの子窓を別の同状態対として追加した。[欠けた比較状態](missing-comparison-states.json)は削除・合格・対象外にしていない。

利用者の画面に割り込まないよう、後続の実描画は切り替えないWindows desktopで採取した。[確認入口](確認入口.md)と各`background-desktop.json`に実GPU、専用領域の検査process、利用者の入力desktopが変わらなかった記録を残す。通常画面へのフォールバックは行わない。

## 依頼内の未解消と再開条件

R01-filler／R04-unlimitedは[全入口の境界根拠](contract-boundaries.json)。限定探索の未取得を到達不能にしない。合法command列・seed・旧保存入口か、生成／移行／公開の全入口の除外根拠をゲームバランス検討が固定し、本Workが同じMainへ供給して描画・入力・保存を確認する。長い名称の登録variantは記録したが、合法取得済み表示の入口は未取得である。

原本と基準の具体的な食い違いは以下。判断を自動承認・Godot標準を理由とした免除にしない。

'''
 for r in dec:text+='- **'+r['id']+'／'+','.join(r['difference_ids'])+'**：'+r['reason']+' 担当：'+r['owner']+'。再開：'+r['resumption']+'\n'
 text+='''
元home/story/returnのPNGは固定blobのまま通常Gitへ提供し、byte読戻し済み。UI側の受領は本Workでは未確認。[17必要群](必要証拠と残件.md)と[37状態](screen-states.json)に証拠・未確認・担当・再開条件を残す。

## 教材と後続の境界

[README](README.md) → [確認入口](確認入口.md) → [ID対応](UI対応表.md) → [同状態比較](比較証拠.md) → [17群](必要証拠と残件.md) → [結果](確認結果.md) → [日本語コード解説](コード解説.md)の順。解説はGodot標準、C#／.NET、本作の表示契約と保存契約を区別する。

未承認差異0・必要未確認0の独立UI再判定をとりまとめが受領してから新版配布へ進む。UI適合・修正版配布・Windows11実機受入を本Workが完了扱いにしない。他Workを起動・送信していない。利用者へ開発環境導入・ビルド・保存削除を要求しない。固定判断／合法入口の受領後、同じWork・枝の該当箇所だけ再開する。
'''
 (E/'とりまとめ引継ぎ.md').write_text(text,encoding='utf-8')
 print('handoff saved')
p=argparse.ArgumentParser();p.add_argument('mode',choices=['inventory','prepare-readback','validate','handoff']);p.add_argument('--target');p.add_argument('--reuse-fixed-captures',action='store_true');a=p.parse_args()
if a.mode=='inventory':inventory()
elif a.mode=='prepare-readback':prepare_readback(a.target)
elif a.mode=='validate':validate(a.target)
else:handoff()
