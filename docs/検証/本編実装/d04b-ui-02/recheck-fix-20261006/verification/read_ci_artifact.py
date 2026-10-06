"""接続済みGitHubから返った通常file referenceのZIPを照合。URLは結果へ保存しない。"""
from pathlib import Path
import urllib.request,json,hashlib,zipfile,subprocess
R=Path.cwd();E=Path(__file__).resolve().parents[1];d=json.loads((R/'.tools/d04b-ci-download.json').read_text(encoding='utf8'));out=E/'cloud';out.mkdir(exist_ok=True);zip_path=R/'.tools/d04b-ci-artifact.zip'
with urllib.request.urlopen(d['url'],timeout=90) as source,zip_path.open('wb') as dest:
 while block:=source.read(1024*1024):dest.write(block)
actual=hashlib.file_digest(zip_path.open('rb'),'sha256').hexdigest();assert actual==d['expected_sha256']
rows=[]
with zipfile.ZipFile(zip_path) as z:
 for name in z.namelist():
  if not name.endswith('manifest.json'):continue
  body=z.read(name);m=json.loads(body);p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(body)
  if m.get('task')!='D04B-UI-02':continue
  bindings=[]
  for path,h in m['source_sha256'].items():
   b=subprocess.check_output(['git','show',d['code_sha']+':'+path]);direct=hashlib.sha256(b).hexdigest()==h;crlf=hashlib.sha256(b.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')).hexdigest()==h
   bindings.append({'path':path,'matches_git_source':direct or crlf,'crlf_only':not direct and crlf})
  assert m['status']=='passed' and all(x['matches_git_source'] for x in bindings)
  rows.append({'path':name,'status':m['status'],'cases':m['cases'],'source_bindings':bindings})
 trx=[json.loads('{}') for n in []]
 report={'code_sha':d['code_sha'],'run_id':d['run_id'],'artifact_id':d['artifact_id'],'zip_sha256':actual,'digest_equal':True,'manifests':rows,'latest_code_equivalence':'後続aabfefabは候補の検査待ちだけを修正。通常UI/既定CImodeの製品差分なし。最新CIは別に読戻す。','physical_input':False,'formal_ui_approval':False}
(E/'ci-readback.json').write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode('utf8'));print('CI ZIP verified',len(rows),'manifests',sum(len(r['cases']) for r in rows),'cases')
