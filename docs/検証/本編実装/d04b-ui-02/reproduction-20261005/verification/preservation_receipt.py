from pathlib import Path
import report_io
import hashlib,json,subprocess
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';B='0a4142cae97c0d6e3a56a943ad2e3cbe76ac5dc6'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def git(*args):return subprocess.check_output(['git',*args],cwd=R)
def tree(ref):
 d={}
 for line in git('ls-tree','-rz',ref).split(b'\0'):
  if not line:continue
  meta,path=line.split(b'\t',1);mode,kind,sha=meta.split();d[path.decode()]=sha.decode()
 return d
def rawblob(path):
 b=path.read_bytes();return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
start=read(E/'start-state.json');before=tree(B);after=tree('HEAD');protected=[]
for path,blob in before.items():
 scope=path.startswith(('apps/crossweave-godot/Infrastructure/','apps/crossweave-godot/Core/','apps/crossweave-godot/Godot/Assets/','apps/crossweave-godot/Godot/Proof','docs/検証/本編実装/d04b-ui-02/review-','src/','test/'))
 if path in ['apps/crossweave-godot/Core/Application/GameApplication.cs']:scope=False
 if scope:protected.append({'path':path,'base_blob':blob,'current_blob':after.get(path),'equal':blob==after.get(path)})
assert all(x['equal'] for x in protected)
packages=[]
for path,record in start['untracked_files'].items():
 p=R/path;actual=hashlib.sha256(p.read_bytes()).hexdigest();packages.append({'path':path,'bytes':p.stat().st_size,'before_sha256':record['sha256'],'after_sha256':actual,'equal':record['sha256']==actual})
assert all(p['equal'] for p in packages)
plan=read(E/'sources.json')['plan'];synced=[]
assert {p:b for p,b in tree(plan['source_commit']).items() if p.startswith(plan['scope'])}==plan['files']
for path,blob in plan['files'].items():
 raw=rawblob(R/path);actual=git('hash-object','--path='+path,path).decode().strip()
 synced.append({'path':path,'source_blob':blob,'disk_git_blob':actual,'raw_disk_blob':raw,'disk_sha256':hashlib.sha256((R/path).read_bytes()).hexdigest(),'working_tree_line_endings_only':raw!=actual,'equal':actual==blob})
print('plan_count',len(synced),'mismatches',[x for x in synced if not x['equal']])
assert all(x['equal'] for x in synced)
reports=[]
for folder in ['fixed-light-final','fixed-dark-final','preparation-light-final','preparation-dark-final','settled-light','settled-dark','startup-dark-final','related-final','boundary-light','boundary-dark','hover-use-light','hover-use-dark','memory-light-final','memory-dark-final','common-light-complete','common-dark-complete','common-light-followup','common-light-submitted','common-dark-background-final','records-use-light','records-use-dark','related-common-final','common-light-records-final','common-dark-records-final','common-light-empty-final','records-use-final-light','records-use-final-dark']:
 for p in (E/folder).glob('*.json'):
  if p.name.endswith('.nodes.json') or p.name=='manifest.json':continue
  d=read(p)
  if 'save_path' not in d:continue
  save=d['save_path'].replace('\\','/');assert '/proofs/d04b-ui-save-01/ui-' in save
  reports.append({'report':p.relative_to(E).as_posix(),'save_path':d['save_path'],'dedicated_new_slot':True})
payload={'base_sha':B,'implementation_sha':'c761cbf4950a750b5b337e1bc9926528b87be54a','protected_tracked':protected,'existing_untracked_packages':packages,'plan_source_sha':plan['source_commit'],'plan_files_rechecked':synced,'latest_remote_plan_sha':'23b006047a0c35233fcca48c923a32501dbd878d','latest_remote_technical_sha':'21ddd349b6bec69ecac6d9db288c537553dab860','remote_refs_rechecked':True,'isolated_save_reports':reports,'normal_save_boundaries':'通常保存の開始時hashは採取していないため、事後hash一致を捏造しない。全確認入口は--ui-check/--ui-slotの専用pathで、通常slotを渡さず書込み先を分離。','old_unreachable_environment':'未保存バッファの不存在を推定しない。利用できない旧環境に書込みを行っていない。','distribution_created':False,'branches_created':False,'other_work_messages_sent':False}
(E/'preservation.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('protected',len(protected),'packages',len(packages),'plan',len(synced),'slots',len(reports))
