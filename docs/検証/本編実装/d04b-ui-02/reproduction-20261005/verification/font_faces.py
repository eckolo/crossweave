"""OS既存TTCのface情報だけを読む。書体ファイルの複製・変更はしない。"""
import struct, json
from pathlib import Path

def u16(b, p): return struct.unpack_from('>H', b, p)[0]
def u32(b, p): return struct.unpack_from('>I', b, p)[0]
rows=[]
for p in Path('C:/Windows/Fonts').glob('YuGoth*.ttc'):
    b=p.read_bytes()
    for face in range(u32(b,8)):
        start=u32(b,12+face*4)
        tables={b[start+12+i*16:start+16+i*16].decode('ascii'):(u32(b,start+20+i*16),u32(b,start+24+i*16)) for i in range(u16(b,start+4))}
        n=tables['name'][0]; names={}
        for i in range(u16(b,n+2)):
            r=n+6+i*12
            platform,encoding,language,ident,length,offset=struct.unpack_from('>6H',b,r)
            if platform==3 and language==0x409 and ident in [1,2,6,16,17]:
                names[ident]=b[n+u16(b,n+4)+offset:n+u16(b,n+4)+offset+length].decode('utf-16be')
        cmap=tables['cmap'][0]; candidates=[]
        for i in range(u16(b,cmap+2)):
            record=cmap+4+i*8; sub=cmap+u32(b,record+4)
            if u16(b,record)==3 and u16(b,sub) in [4,12]:candidates.append(sub)
        sub=max(candidates,key=lambda s:u16(b,s))
        def glyph(ch):
            n=ord(ch)
            if u16(b,sub)==12:
                for j in range(u32(b,sub+12)):
                    start,end,g=struct.unpack_from('>3I',b,sub+16+j*12)
                    if start<=n<=end:return g+n-start
                return 0
            count=u16(b,sub+6)//2; ends=sub+14; starts=ends+count*2+2; deltas=starts+count*2; offsets=deltas+count*2
            for j in range(count):
                if u16(b,starts+j*2)<=n<=u16(b,ends+j*2):
                    delta=u16(b,deltas+j*2); off=u16(b,offsets+j*2)
                    if not off:return (n+delta)%65536
                    g=u16(b,offsets+j*2+off+2*(n-u16(b,starts+j*2)))
                    return (g+delta)%65536 if g else 0
            return 0
        count=u16(b,tables['hhea'][0]+34); em=u16(b,tables['head'][0]+18)
        advances={ch:u16(b,tables['hmtx'][0]+min(glyph(ch),count-1)*4)*16/em for ch in '次の行動まで'}
        rows.append(dict(file=str(p),face=face,names=names,weight=u16(b,tables['OS/2'][0]+4),advances_16=advances,total_width_16=sum(advances[ch] for ch in '次の行動まで')))
print(json.dumps(rows,ensure_ascii=False,indent=2))
