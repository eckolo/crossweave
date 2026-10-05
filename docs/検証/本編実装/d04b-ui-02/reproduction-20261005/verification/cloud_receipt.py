"""通常読戻ししたActions ZIPの内部結果を照合する。jobの緑だけでは合格にしない。"""
from pathlib import Path
import hashlib,json,subprocess,zipfile,argparse
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
p=argparse.ArgumentParser();p.add_argument('stage');p.add_argument('sha');p.add_argument('run',type=int);p.add_argument('artifact',type=int);p.add_argument('digest');a=p.parse_args()
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
zpath=E/'environment'/('cloud-'+a.stage+'.zip');digest=hashlib.sha256(zpath.read_bytes()).hexdigest();assert digest==a.digest
entries=[];all_pass=True
with zipfile.ZipFile(zpath) as z:
 for n in z.namelist():
  if not n.endswith('manifest.json'):continue
  d=json.loads(z.read(n));target=E/'cloud'/a.stage/n;save(target,d)
  binding={}
  for k,h in d.get('source_sha256',{}).items():
   raw=subprocess.check_output(['git','show',a.sha+':'+k],cwd=R)
   crlf=raw.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
   exact=h==hashlib.sha256(raw).hexdigest();checkout=h==hashlib.sha256(crlf).hexdigest()
   binding[k]={'captured_sha256':h,'git_blob_sha256':hashlib.sha256(raw).hexdigest(),'exact_bytes':exact,'windows_checkout_crlf_only':not exact and checkout,'code_content_matched':exact or checkout}
  if d.get('task')!='D04B-UI-02':continue
  entries.append({'manifest':target.relative_to(E).as_posix(),'status':d['status'],'commit':d['commit'],'cases':d.get('cases',{}),'error':d.get('error'),'source_changed_during_run':d.get('source_changed_during_run',[]),'source_binding':binding,'sha256':hashlib.sha256(z.read(n)).hexdigest()})
  all_pass &= d['status']=='passed' and d['commit']==a.sha and all(v['code_content_matched'] for v in binding.values()) and not d.get('source_changed_during_run')
 for n in z.namelist():
  if n.endswith(('.log','.trx')):
   target=E/'cloud'/a.stage/n;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(n))
save(E/'cloud'/a.stage/'receipt.json',{'stage':a.stage,'implementation_sha':a.sha,'status':'passed' if all_pass and len(entries)==3 else 'failed','run_id':a.run,'url':f'https://github.com/eckolo/crossweave/actions/runs/{a.run}','artifact_id':a.artifact,'zip_sha256':digest,'zip_digest_matched':True,'manifests':entries,'raw_zip_locally_preserved':zpath.relative_to(E).as_posix(),'zip_is_not_distribution':True,'rendered_pngs_in_zip':'原本対は通常Gitの別画像を参照。CI原寸画像もZIP内へ保存済み。','physical_input':False})
print(a.stage,all_pass,len(entries),[(e['manifest'],len(e['cases'])) for e in entries])
