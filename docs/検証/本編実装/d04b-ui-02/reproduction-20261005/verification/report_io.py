"""Dropbox配下の短い共有競合を回避して提出文書を一ファイルずつ保存する。"""
from pathlib import Path
import os,time,uuid
_old=Path.write_text
def atomic_text(self,data,encoding=None,errors=None,newline=None):
    # 対象は呼出側が選んだ同一directoryのファイルだけ。再帰移動や削除はしない。
    temp=self.with_name(self.name+'.ui02-'+uuid.uuid4().hex+'.tmp')
    raw=data.replace('\n',os.linesep) if newline is None else data.replace('\n',newline)
    temp.write_bytes(raw.encode(encoding or 'utf-8',errors or 'strict'))
    for attempt in range(12):
        try:os.replace(temp,self);return len(data)
        except OSError:
            if attempt==11:raise
            time.sleep(.25)
Path.write_text=atomic_text
