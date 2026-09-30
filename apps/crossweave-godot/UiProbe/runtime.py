"""検査と開発起動で同じ固定環境を使う。システムへのSDK導入や配布ZIP生成はしない。"""
from pathlib import Path
import importlib.util, os, shutil, subprocess, tarfile, zipfile
ROOT = Path(__file__).resolve().parents[1]

def prepare(acquire=True):
    host = 'windows' if os.name == 'nt' else 'linux'
    spec = importlib.util.spec_from_file_location('crossweave_bootstrap', ROOT / 'packaging/bootstrap.py')
    bootstrap = importlib.util.module_from_spec(spec); spec.loader.exec_module(bootstrap)
    base = ROOT / '.tools'; cache = base / 'downloads'; cache.mkdir(parents=True, exist_ok=True)
    sdk = base / 'dotnet'; dotnet = sdk / ('dotnet.exe' if os.name == 'nt' else 'dotnet')
    suffix = '_mono_win64.exe' if os.name == 'nt' else '_mono_linux.x86_64'
    if acquire:
        archive = bootstrap.acquire(bootstrap.LOCK['assets']['sdk_' + host], cache)
        if not dotnet.exists():
            sdk.mkdir(exist_ok=True)
            if os.name == 'nt':
                with zipfile.ZipFile(archive) as z: z.extractall(sdk)
            else:
                with tarfile.open(archive) as z: z.extractall(sdk, filter='data')
        archive = bootstrap.acquire(bootstrap.LOCK['assets']['godot_' + host], cache)
        if not list((base / 'godot').glob('**/*' + suffix)):
            with zipfile.ZipFile(archive) as z: z.extractall(base / 'godot')
        shutil.copy2(bootstrap.acquire(bootstrap.LOCK['assets']['font'], cache), ROOT / 'Godot/Assets/NotoSansJP.ttf')
    godot = next((base / 'godot').glob('**/*' + suffix))
    if os.name != 'nt': godot.chmod(godot.stat().st_mode | 0o111)
    env = os.environ.copy(); env.update(DOTNET_ROOT=str(sdk), DOTNET_CLI_TELEMETRY_OPTOUT='1', GODOT_SILENCE_ROOT_WARNING='1')
    env['PATH'] = str(sdk) + os.pathsep + env.get('PATH', '')
    assert subprocess.check_output([str(dotnet), '--version'], cwd=ROOT, env=env, text=True).strip() == bootstrap.LOCK['sdk']
    assert subprocess.check_output([str(godot), '--version'], cwd=ROOT, env=env, text=True).strip() == bootstrap.LOCK['godot']
    return dotnet, godot, env, bootstrap.LOCK
