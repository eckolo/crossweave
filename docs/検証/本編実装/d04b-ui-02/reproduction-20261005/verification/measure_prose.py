from pathlib import Path
from PIL import Image
import json
r=Path('docs/検証/本編実装/d04b-ui-02/reproduction-20261005')
result=[]
for file in ['same-state-reference-remaining-fourth/light-repro-return-clear-entry.png','final-light/repro-return-clear-entry.png']:
    im=Image.open(r/file).convert('RGB');rows=[]
    for y in range(773,978):
        if any(max(im.getpixel((x,y)))<130 for x in range(1079,1430)): rows.append(y)
    groups=[]
    for y in rows:
        if not groups or y>groups[-1][-1]+1:groups.append([])
        groups[-1].append(y)
    result.append({'file':file,'dark_pixel_rows':[(a[0],a[-1]) for a in groups], 'method':'左側の同じ不透明本文領域。max(R,G,B)<130の連続行。文字の同一性や適合判定をこの閾値だけで推定しない。'})
print(json.dumps(result,ensure_ascii=False,indent=2))
