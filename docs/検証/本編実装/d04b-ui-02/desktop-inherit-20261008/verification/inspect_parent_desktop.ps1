# PowerShellホスト自身のdesktopを読み、Python子への継承落ちと区別する。
# Add-Type内のC#/.NETはWindows APIの読取りbindingで、Godot・本編処理ではない。
# desktop作成・接続変更・切替・前面化・入力・子process起動は行わない。
$desktopProbeSource = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class CrossweaveDesktopRead
{
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr GetThreadDesktop(uint id);
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr GetProcessWindowStation();
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll", SetLastError=true)] static extern bool CloseDesktop(IntPtr handle);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool GetUserObjectInformationW(IntPtr handle, int index, IntPtr value, uint size, out uint needed);
    static string Name(IntPtr handle)
    {
        if(handle==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
        IntPtr value=Marshal.AllocHGlobal(1024);
        try
        {
            uint needed;
            if(!GetUserObjectInformationW(handle,2,value,1024,out needed))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            return Marshal.PtrToStringUni(value);
        }
        finally { Marshal.FreeHGlobal(value); }
    }
    static bool Input(IntPtr handle)
    {
        IntPtr value=Marshal.AllocHGlobal(4);
        try
        {
            uint needed;
            if(!GetUserObjectInformationW(handle,6,value,4,out needed))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            return Marshal.ReadInt32(value)!=0;
        }
        finally { Marshal.FreeHGlobal(value); }
    }
    public static string[] Inspect()
    {
        uint id=GetCurrentThreadId();
        IntPtr desktop=GetThreadDesktop(id);
        string station=Name(GetProcessWindowStation());
        string name=Name(desktop);
        bool input=Input(desktop);
        IntPtr actual=OpenInputDesktop(0,false,1);
        string actualName;
        if(actual==IntPtr.Zero) actualName="query-error:"+Marshal.GetLastWin32Error();
        else { try { actualName=Name(actual); } finally { CloseDesktop(actual); } }
        return new[]{id.ToString(),station,name,input.ToString(),actualName};
    }
}
'@
$parentDesktopRecord = [ordered]@{
    utc = [DateTimeOffset]::UtcNow.ToString('o')
    process = 'PowerShell command host'
    pid = $PID
    requested_execution_mode = 'use_default'
    desktop_created = $false
    desktop_switched = $false
    foreground_changed = $false
    physical_input = $false
    godot_started = $false
    probe_sha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
}
try {
    Add-Type -TypeDefinition $desktopProbeSource -ErrorAction Stop
    $parentDesktopData = [CrossweaveDesktopRead]::Inspect()
    $parentDesktopRecord.tid = $parentDesktopData[0]
    $parentDesktopRecord.process_window_station = $parentDesktopData[1]
    $parentDesktopRecord.thread_desktop = $parentDesktopData[2]
    $parentDesktopRecord.thread_desktop_receives_input = [bool]::Parse($parentDesktopData[3])
    $parentDesktopRecord.input_desktop = $parentDesktopData[4]
    $parentDesktopRecord.status = if($parentDesktopRecord.thread_desktop_receives_input){'blocked-input-desktop'}else{'non-input-desktop-confirmed'}
} catch {
    $parentDesktopRecord.status = 'blocked-api-error'
    $parentDesktopRecord.error = $_.Exception.ToString()
}
$parentDesktopJson = $parentDesktopRecord | ConvertTo-Json -Depth 5
$parentDesktopOutput = Join-Path (Split-Path -Parent $PSScriptRoot) 'parent-desktop-inspection.json'
[IO.File]::WriteAllText($parentDesktopOutput, $parentDesktopJson + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
Write-Output $parentDesktopJson
if($parentDesktopRecord.status -ne 'non-input-desktop-confirmed'){exit 2}
