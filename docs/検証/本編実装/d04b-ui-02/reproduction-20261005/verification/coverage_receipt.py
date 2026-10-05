"""採取済みと未取得を分ける。CSSで到達しない状態にも原本根拠を付ける。"""
from pathlib import Path
import report_io
import json,hashlib,subprocess
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
cmp=read(E/'comparisons.json');rows=[]
roles={'navigation':['prepare','depart','menu','knowledge'],'acquisition':['tab-card','review','discard','empty-composition'],'exploration':['preview','play'],'window':['window-pin','detail-close'],'records-tabs':['records-tab-targets','records-tab-cards'],'checkbox':['reduced-motion'],'native-select':['hold-select-open']}
for role,names in roles.items():
 for name in names:
  states=[]
  for p in cmp['pairs']:
   if name not in p['id']:continue
   states.append({'pair':p['id'],'state':next((s for s in ['normal','hover','focus','pressed','disabled','selected','open'] if s in p['id']),'captured'),'reference':p['reference'],'godot':p['godot'],'comparison_status':p['comparison_status']})
  rows.append({'role':role,'control':name,'states':states,'status':'証拠を提出・独立判定未確認' if states else '未取得・依頼内未完了','no_combinatorial_approval':True})
original='72d0eb58c7e3d04759f1ab56a939d1dff20a46b2';path='docs/検証/UI/readability/co-u02/acquisition-preview/structure.css'
blob=subprocess.check_output(['git','rev-parse',original+':'+path],cwd=R,text=True).strip()
write(E/'interaction-state-coverage.json',{'implementation_sha':read(E/'UI対応表.json')['implementation_sha'],'roles':rows,'reachable_state_boundaries':[{'scope':'empty slot','source':{'commit':original,'path':path,'blob':blob,'locator':'.cp-empty / .cp-slot'},'fact':'原本はbuttonではないdiv。selected/pressed/keyboard focusを持つ取得actionへ変更しない。GodotもMouseFilter.Ignoreの同じ空Control。空状態の原画像は通常状態対として記録。'},{'scope':'review/discard before plan','fact':'初期無変更の同状態ではdisabled。normalの有効像は合法pending/混合確認の対へ分け、disabled imageをnormal successへ読み替えない。'},{'scope':'native select popup','fact':'元ブラウザーのOS popupとGodot実PopupMenuを撮影。選択値150/220/320とcallback保持を検査。将来の無効入口がないことや全DPIの適合は宣言しない。'}],'remaining':'全使用先の画面対と役割別部品対を結ぶ。未取得の組合せや独立判定を合格へ埋めない。'})
receipt=read(E/'fixtures/receipt.json');files=receipt if isinstance(receipt,list) else receipt.get('files',[])
if isinstance(files,list):
 for row in files:
  if 'fixture' in row:
   row['path']='fixtures/'+row.pop('fixture');row['source_path']='fixtures/'+row.pop('source_fixture')
   dest=E/row['path'];source=E/row['source_path'];assert dest.read_bytes()==source.read_bytes()
   row['bytes_unchanged']=True
 write(E/'fixtures/receipt.json',receipt)
print('roles',len(rows),'receipts',len(files))
