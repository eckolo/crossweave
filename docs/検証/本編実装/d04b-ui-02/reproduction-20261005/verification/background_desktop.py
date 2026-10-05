"""検証だけを切り替えないWindows desktopへ隔離し、実描画を保つ。

STARTUPINFO.lpDesktopを子Pythonへ指定する。Godotもそのdesktopを継承する。
SwitchDesktop、SetForegroundWindow、実マウス／キー入力を使わない。
失敗しても通常desktopで再起動しない。製品とUiProbeのソースは変更しない。
"""
from pathlib import Path
import report_io
import ctypes as C
from ctypes import wintypes as W
import hashlib, json, msvcrt, os, subprocess, sys, time, uuid

assert os.name == 'nt', 'Windows専用の隔離起動です'
R=Path(__file__).resolve().parents[3]
args=sys.argv[1:]
assert '--evidence' in args
E=Path(args[args.index('--evidence')+1]).resolve()
assert E.is_relative_to(R/'docs/検証/本編実装/d04b-ui-02')
E.mkdir(parents=True,exist_ok=True)
u=C.WinDLL('user32',use_last_error=True)
k=C.WinDLL('kernel32',use_last_error=True)

class SI(C.Structure):
    _fields_=[('cb',W.DWORD),('lpReserved',W.LPWSTR),('lpDesktop',W.LPWSTR),('lpTitle',W.LPWSTR),
      ('dwX',W.DWORD),('dwY',W.DWORD),('dwXSize',W.DWORD),('dwYSize',W.DWORD),
      ('dwXCountChars',W.DWORD),('dwYCountChars',W.DWORD),('dwFillAttribute',W.DWORD),
      ('dwFlags',W.DWORD),('wShowWindow',W.WORD),('cbReserved2',W.WORD),
      ('lpReserved2',C.POINTER(W.BYTE)),('hStdInput',W.HANDLE),('hStdOutput',W.HANDLE),('hStdError',W.HANDLE)]
class PI(C.Structure):
    _fields_=[('hProcess',W.HANDLE),('hThread',W.HANDLE),('dwProcessId',W.DWORD),('dwThreadId',W.DWORD)]
u.CreateDesktopW.argtypes=[W.LPCWSTR,W.LPCWSTR,C.c_void_p,W.DWORD,W.DWORD,C.c_void_p]
u.CreateDesktopW.restype=W.HANDLE
u.CloseDesktop.argtypes=[W.HANDLE];u.CloseDesktop.restype=W.BOOL
u.OpenInputDesktop.argtypes=[W.DWORD,W.BOOL,W.DWORD];u.OpenInputDesktop.restype=W.HANDLE
u.GetUserObjectInformationW.argtypes=[W.HANDLE,C.c_int,C.c_void_p,W.DWORD,C.POINTER(W.DWORD)]
u.GetUserObjectInformationW.restype=W.BOOL
k.CreateProcessW.argtypes=[W.LPCWSTR,W.LPWSTR,C.c_void_p,C.c_void_p,W.BOOL,W.DWORD,C.c_void_p,W.LPCWSTR,C.POINTER(SI),C.POINTER(PI)]
k.CreateProcessW.restype=W.BOOL
k.SetHandleInformation.argtypes=[W.HANDLE,W.DWORD,W.DWORD];k.SetHandleInformation.restype=W.BOOL
k.WaitForSingleObject.argtypes=[W.HANDLE,W.DWORD];k.WaitForSingleObject.restype=W.DWORD
k.GetExitCodeProcess.argtypes=[W.HANDLE,C.POINTER(W.DWORD)];k.GetExitCodeProcess.restype=W.BOOL
k.CloseHandle.argtypes=[W.HANDLE];k.CloseHandle.restype=W.BOOL
ENUM=C.WINFUNCTYPE(W.BOOL,W.HWND,W.LPARAM)
u.EnumDesktopWindows.argtypes=[W.HANDLE,ENUM,W.LPARAM];u.EnumDesktopWindows.restype=W.BOOL
u.GetWindowThreadProcessId.argtypes=[W.HWND,C.POINTER(W.DWORD)];u.GetWindowThreadProcessId.restype=W.DWORD
def checked(value):
    if not value:raise C.WinError(C.get_last_error())
    return value
def input_desktop():
    h=checked(u.OpenInputDesktop(0,False,1));buf=C.create_unicode_buffer(256);n=W.DWORD()
    try:checked(u.GetUserObjectInformationW(h,2,buf,C.sizeof(buf),C.byref(n)));return buf.value
    finally:u.CloseDesktop(h)
name='crossweave-test-'+uuid.uuid4().hex
before=input_desktop()
desktop=checked(u.CreateDesktopW(name,None,None,0,0x01FF,None))
receipt={'method':'CreateDesktopW + STARTUPINFO.lpDesktop; never switched',
 'input_desktop_before':before,'test_desktop':name,'rendered':True,'physical_input':False,
 'foreground_fallback':False,'product_source_modified':False,'status':'running',
 'launcher_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
window_pids=set()
@ENUM
def window_on_test_desktop(hwnd,param):
    pid=W.DWORD();u.GetWindowThreadProcessId(hwnd,C.byref(pid));window_pids.add(pid.value);return True
pi=PI();started=False
try:
    with open(E/'background-launch.log','wb') as log,open(os.devnull,'rb') as stdin:
        oh=msvcrt.get_osfhandle(log.fileno());ih=msvcrt.get_osfhandle(stdin.fileno())
        checked(k.SetHandleInformation(oh,1,1));checked(k.SetHandleInformation(ih,1,1))
        si=SI();si.cb=C.sizeof(si);si.lpDesktop='winsta0\\'+name
        si.dwFlags=0x100|0x01|0x80;si.wShowWindow=0
        si.hStdInput=ih;si.hStdOutput=oh;si.hStdError=oh
        command=[sys.executable,'-X','utf8',str(R/'apps/crossweave-godot/UiProbe/verify.py'),*args]
        cmd=C.create_unicode_buffer(subprocess.list2cmdline(command))
        checked(k.CreateProcessW(sys.executable,cmd,None,None,True,0x08000000,None,str(R),C.byref(si),C.byref(pi)))
        started=True;receipt['controller_process_id']=pi.dwProcessId
        print('background desktop test started',flush=True)
        last_size=0
        while k.WaitForSingleObject(pi.hProcess,1000)==258:
            u.EnumDesktopWindows(desktop,window_on_test_desktop,0)
            size=(E/'background-launch.log').stat().st_size
            if size!=last_size:
                log.flush()
                with (E/'background-launch.log').open('rb') as reader:reader.seek(last_size);chunk=reader.read()
                print(chunk.decode('utf-8',errors='replace'),end='',flush=True);last_size=size
        code=W.DWORD();checked(k.GetExitCodeProcess(pi.hProcess,C.byref(code)))
        receipt['exit']=code.value;receipt['status']='passed' if code.value==0 else 'failed'
    receipt['input_desktop_after']=input_desktop()
    receipt['input_desktop_unchanged']=receipt['input_desktop_after']==before
    receipt['window_process_ids_on_test_desktop']=sorted(window_pids)
    assert receipt['input_desktop_unchanged']
finally:
    if started:k.CloseHandle(pi.hThread);k.CloseHandle(pi.hProcess)
    receipt['closed_desktop_handle']=bool(u.CloseDesktop(desktop))
    (E/'background-desktop.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
raise SystemExit(receipt.get('exit',1))
