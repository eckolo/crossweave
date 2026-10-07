"""継承検査の前提をWindows APIで読み取り、既存desktopは変更しない。

Python標準ctypesによる実行環境の診断であり、Godot/C#/.NETの製品処理ではない。
現在threadのdesktopとprocessのwindow stationを読み、入力desktopと区別する。
新規desktopの作成、thread接続の変更、切替、前面化、入力注入は行わない。
API失敗はerrno付きで記録する。前提を推定で成立扱いにしない。
"""
from pathlib import Path
import ctypes as C
from ctypes import wintypes as W
import datetime
import hashlib
import json
import os

OUT=Path(__file__).resolve().parents[1]
assert os.name=='nt'
u=C.WinDLL('user32',use_last_error=True)
k=C.WinDLL('kernel32',use_last_error=True)
u.GetThreadDesktop.argtypes=[W.DWORD];u.GetThreadDesktop.restype=W.HANDLE
k.GetCurrentThreadId.argtypes=[];k.GetCurrentThreadId.restype=W.DWORD
u.GetProcessWindowStation.argtypes=[];u.GetProcessWindowStation.restype=W.HANDLE
u.GetUserObjectInformationW.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD,C.POINTER(W.DWORD)]
u.GetUserObjectInformationW.restype=W.BOOL
u.OpenInputDesktop.argtypes=[W.DWORD,W.BOOL,W.DWORD];u.OpenInputDesktop.restype=W.HANDLE
u.CloseDesktop.argtypes=[W.HANDLE];u.CloseDesktop.restype=W.BOOL

def name(h):
    if not h:raise C.WinError(C.get_last_error())
    needed=W.DWORD()
    text=C.create_unicode_buffer(512)
    if not u.GetUserObjectInformationW(h,2,text,C.sizeof(text),C.byref(needed)):
        raise C.WinError(C.get_last_error())
    return text.value

def input_enabled(h):
    # UOI_IOは対象desktopが実入力を受けるかを返す。接続・切替は発生しない。
    value=W.BOOL();needed=W.DWORD()
    if not u.GetUserObjectInformationW(h,6,C.byref(value),C.sizeof(value),C.byref(needed)):
        raise C.WinError(C.get_last_error())
    return bool(value.value)

def inspect():
    r={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'pid':os.getpid(),'tid':k.GetCurrentThreadId(),
       'sandbox_execution':True,'desktop_created':False,'desktop_switched':False,
       'foreground_changed':False,'physical_input':False,'godot_started':False,
       'probe_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    try:
        desktop=u.GetThreadDesktop(r['tid'])
        r['process_window_station']=name(u.GetProcessWindowStation())
        r['thread_desktop']=name(desktop)
        r['thread_desktop_receives_input']=input_enabled(desktop)
        h=u.OpenInputDesktop(0,False,1)
        if h:
            try:r['input_desktop']=name(h)
            finally:u.CloseDesktop(h)
        else:r['input_desktop_query_error']=C.get_last_error()
        # 入力desktop上では窓を作らない。名前だけでCodex専用と断定しない。
        r['non_input_desktop_confirmed']=not r['thread_desktop_receives_input']
        r['status']='non-input-desktop-confirmed' if r['non_input_desktop_confirmed'] else 'blocked-input-desktop'
    except OSError as e:
        r.update(status='blocked-api-error',error=str(e),winerror=e.winerror)
    return r

if __name__=='__main__':
    result=inspect()
    (OUT/'desktop-inspection.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(result,ensure_ascii=False))
    raise SystemExit(0 if result['status']=='non-input-desktop-confirmed' else 2)
