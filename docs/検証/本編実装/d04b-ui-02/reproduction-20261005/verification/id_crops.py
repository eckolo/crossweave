"""実画像の画素を等倍で切り出す。配置を加工せず、差分値を適合判定へ変えない。"""
from pathlib import Path
import report_io
import json,hashlib,math
from PIL import Image,ImageChops,ImageStat
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def nodes(p):
 d=read(p);return d.get('nodes',[]) if isinstance(d,dict) else d
def rect_for(ns,selector,fallback):
 for n in ns:
  classes=str(n.get('classes','')).split();ids=n.get('ids',[])
  if any(s in classes or s in ids or (s.endswith('*') and any(i.startswith(s[:-1]) for i in ids)) for s in selector):
   r=n['rect']
   if r[2]>0 and r[3]>0 and n.get('visible',True):return r
 return fallback
# 一つのIDには代表領域と、対応表にある全原寸対の両方を結ぶ。
profiles={
 'V-C01':('repro-home-card',[412,80,370,124]),'V-C02':('repro-explore-entry',[704,413,248,208]),
 'V-C03':('repro-home-entry',[1678,1,225,64]),'V-C04':('repro-home-prepare-focus',[1,980,390,99]),
 'V-C05':('repro-home-card',[0,0,145,80]),'V-C06':('repro-bars-prep-bar-hover',[362,119,42,225]),
 'V-P01':('repro-home-card',[12,76,1896,132]),'V-P02':('repro-home-card',[406,118,755,881]),
 'V-P03':('repro-home-card',[1,1,310,64]),'V-P04':('repro-home-card',[414,122,352,80]),
 'V-P05':('repro-home-card',[692,122,74,80]),'V-P06':('repro-home-card',[1169,122,352,80]),
 'V-P07':('repro-home-card',[414,177,713,115]),'V-P08':('repro-home-pending',[414,122,352,80]),
 'V-P09':('repro-home-pending',[16,122,354,82]),'V-P10':('repro-home-empty-composition',[1169,122,713,82]),
 'V-P11':('repro-home-pending',[1280,1,390,64]),'V-P12':('repro-home-pending',[1,1014,1918,65]),
 'V-P13':('repro-home-owned-detail',[480,130,960,820]),'V-P14':('repro-home-confirmation',[480,130,960,820]),
 'V-P15':('repro-home-pending-detail',[480,130,960,820]),'V-E01':('repro-explore-entry',[560,350,900,640]),
 'V-E02':('repro-explore-entry',[25,351,1870,60]),'V-E03':('repro-explore-entry',[25,381,1870,250]),
 'V-E04':('repro-explore-entry',[572,688,248,208]),'V-E05':('repro-explore-entry',[628,89,664,256]),
 'V-E06':('repro-explore-entry',[572,850,248,46]),'V-E07':('repro-explore-entry',[968,413,248,208]),
 'V-E08':('repro-prediction-prediction',[25,380,1870,518]),'V-E09':('repro-prediction-prediction',[25,380,1870,518]),
 'V-E10':('repro-explore-entry',[628,226,664,119]),'V-E11':('repro-explore-entry',[628,89,664,256]),
 'V-E12':('repro-explore-entry',[25,982,800,74]),'V-E13':('repro-prediction-selected',[430,900,1020,72]),
 'V-E14':('repro-prediction-prediction',[25,300,1870,630]),'V-E15':('repro-explore-entry',[25,25,450,65]),
 'V-W01':('repro-prediction-hand-detail',[1,20,620,650]),'V-W02':('repro-prediction-hand-detail',[1,20,620,120]),
 'V-W03':('repro-prediction-hand-detail',[1,20,620,650]),'V-W04':('repro-prediction-actor-detail',[1,20,620,650]),
 'V-W05':('repro-explore-deck',[1,20,1100,690]),'V-W06':('repro-explore-records-current',[1,20,1200,740]),
 'V-W07':('repro-explore-records-card-child',[1,20,1200,740]),'V-W08':('repro-explore-settings',[1,20,720,640]),
 'V-W09':('repro-explore-operation',[1,20,720,800]),'V-W10':('repro-explore-help',[1,20,720,800]),
 'V-H01':('repro-home-entry',[25,660,870,375]),'V-H02':('repro-story-entry',[25,660,870,375]),
 'V-H03':('repro-return-clear-entry',[25,580,870,455]),'V-H04':('repro-story-entry',[25,660,870,375]),
 'V-H05':('startup-entry',[550,330,820,748]),'V-S01':('repro-acquisition-funded-all-groups-committed',[1,64,1918,104]),
 'V-D01':('repro-explore-drag-field',[25,360,1870,280]),'V-D02':('repro-explore-drag-field',[540,400,730,540]),
 'V-D03':('repro-explore-drag-field',[540,400,730,540]),'V-D04':('repro-edges-hand-edge-one-second',[25,680,1870,245]),
 'V-D05':('repro-home-pending',[414,122,352,80])}
c=read(E/'comparisons.json');ledger=read(E/'UI対応表.json');pairs={p['id']:p for p in c['pairs']};out=[]
for row in ledger['items']:
 id=row['id'];key,fallback=profiles[id]
 for theme in ['light','dark']:
  p=pairs.get(key+'-'+theme);fallback_used=False
  if not p or p['reference'].get('status') or p['godot'].get('status'):
   candidates=[pairs[k] for k in row['same_state_pairs'] if k.endswith('-'+theme) and not pairs[k]['reference'].get('status') and not pairs[k]['godot'].get('status')]
   if not candidates:out.append({'id':id,'theme':theme,'status':'未取得','requested_pair':key+'-'+theme});continue
   p=candidates[0];fallback_used=True
  srcns=nodes(E/p['reference_nodes']['path']);dstns=nodes(E/p['godot_nodes']['path'])
  box=fallback
  if id.startswith('V-W'):
   sr=rect_for(srcns,['cw-edge-detail','cw-detail','cj-inspect-item'],fallback)
   # 要素ではなく元画像座標に固定し、ずれも含めて比較する。
   if sr[2]>=300 and sr[3]>=120:box=[sr[0]-3,sr[1]-3,sr[2]+6,sr[3]+6]
  x,y,w,h=box;box=[max(0,math.floor(x)),max(0,math.floor(y)),min(1920,math.ceil(x+w)),min(1080,math.ceil(y+h))]
  images=[];refs=[]
  for side,metadata,ns in [('reference',p['reference'],srcns),('godot',p['godot'],dstns)]:
   path=E/metadata['path'];target=E/'id-comparisons'/id/(theme+'-'+side+'.png');target.parent.mkdir(parents=True,exist_ok=True)
   with Image.open(path) as im:crop=im.convert('RGB').crop(box);crop.save(target);images.append(crop)
   in_region=[n for n in ns if n['rect'][0]<box[2] and n['rect'][1]<box[3] and n['rect'][0]+n['rect'][2]>box[0] and n['rect'][1]+n['rect'][3]>box[1] and n.get('visible',True)]
   leaves=[n for n in in_region if n.get('text') or n.get('icon') or n.get('ids')]
   refs.append({'side':side,'source_png':metadata,'crop_path':target.relative_to(E).as_posix(),'crop_sha256':sha(target),'crop_box_pixels':box,'size':[box[2]-box[0],box[3]-box[1]],'resized':False,'nodes_path':p[side+'_nodes']['path'],'actual_nodes':leaves})
  diff=ImageChops.difference(*images);stats=ImageStat.Stat(diff)
  out.append({'id':id,'theme':theme,'pair':p['id'],'requested_pair':key+'-'+theme,'representative_fallback':fallback_used,'status':'実画素の等倍領域を提出・UI適合未判定','expected':row['expected'],'actual_change':row['actual_change'],'code':row['code'],'implementation_sha':row['implementation_sha'],'images':refs,'pixel_observation':{'mean_absolute_rgb':stats.mean,'identical_pixels':sum(1 for pixel in diff.getdata() if pixel==(0,0,0)),'total_pixels':diff.width*diff.height,'not_an_acceptance_test':True},'remaining':row['remaining'],'timing_limits':'V-Dの動作全体はsequence/trace参照。静止切出しを時間一致や全操作合格にしない。'})
target=E/'id-comparisons.json';target.write_text(json.dumps({'implementation_sha':ledger['implementation_sha'],'source':'comparisons.json','method':'同一canvas座標で元PNGの画素を等倍crop。合成/再配置/補間なし。','items':out},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('crop pairs',len(out),'unavailable',sum(i['status']=='未取得' for i in out),'fallback',sum(i.get('representative_fallback',False) for i in out))
