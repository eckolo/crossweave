from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';A=R/'apps/crossweave-godot/.tools'
rows=[]
for name,blob in [('home','8dd3e54395fc9fbd42b6f447495114573c1a843d'),('story','d4a5e3cb290326afa0ac930c4b9a260d54afbf8c'),('return','fb4a02002c830c813ca6bd70e440772fa684657d')]:
 b=(A/('readback-'+name+'.png')).read_bytes();local=(E/'environment'/(name+'.png')).read_bytes();actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();assert b==local and actual==blob
 rows.append({'name':name,'path':'environment/'+name+'.png','source_blob':blob,'remote_blob':actual,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'exact_bytes':True,'url':'https://raw.githubusercontent.com/eckolo/crossweave/d4c9d50dfb5d8ba048499454b82733357f84d935/docs/%E6%A4%9C%E8%A8%BC/%E6%9C%AC%E7%B7%A8%E5%AE%9F%E8%A3%85/d04b-ui-02/reproduction-20261005/environment/'+name+'.png'})
(E/'png-readback.json').write_text(json.dumps({'readback_method':'通常の固定GitHub raw URL。UTF-8専用connectorのPNG decode errorを合格にせず、PNG実byteとGit blobを照合。','files':rows,'UI_receipt_confirmed':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('exact original PNG readbacks',len(rows))
