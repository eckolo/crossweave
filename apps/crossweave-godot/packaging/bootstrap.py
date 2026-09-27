"""Acquire the pinned toolchain into .tools, with hash checks; no system install."""
from pathlib import Path
import argparse, hashlib, json, os, platform, shutil, subprocess, tarfile, urllib.request, zipfile
ROOT = Path(__file__).resolve().parents[1]
LOCK = json.loads((ROOT / 'packaging/toolchain.lock.json').read_text())

def digest(path, algorithm):
    h = hashlib.new(algorithm)
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def acquire(spec, cache):
    target = cache / spec['file']
    if not target.exists() or digest(target, spec['algorithm']) != spec['hash']:
        partial = target.with_name(target.name + '.part')
        print('Downloading', spec['file'], flush=True)
        urllib.request.urlretrieve(spec['url'], partial)
        if digest(partial, spec['algorithm']) != spec['hash']:
            raise RuntimeError('Download hash mismatch: ' + spec['file'])
        partial.replace(target)
    return target

def bootstrap(base):
    base.mkdir(parents=True, exist_ok=True)
    cache = base / 'downloads'; cache.mkdir(exist_ok=True)
    host = 'windows' if os.name == 'nt' else 'linux'
    if platform.machine().lower() not in ('amd64', 'x86_64'):
        raise RuntimeError('This proof toolchain supports x64 build hosts only')
    sdk_archive = acquire(LOCK['assets']['sdk_' + host], cache)
    sdk_dir = base / 'dotnet'; sdk_dir.mkdir(exist_ok=True)
    dotnet = sdk_dir / ('dotnet.exe' if os.name == 'nt' else 'dotnet')
    if not dotnet.exists():
        if os.name == 'nt':
            with zipfile.ZipFile(sdk_archive) as archive: archive.extractall(sdk_dir)
        else:
            with tarfile.open(sdk_archive) as archive: archive.extractall(sdk_dir, filter='data')
    editor_archive = acquire(LOCK['assets']['godot_' + host], cache)
    editor_dir = base / 'godot'; editor_dir.mkdir(exist_ok=True)
    suffix = '_mono_win64.exe' if os.name == 'nt' else '_mono_linux.x86_64'
    existing = list(editor_dir.glob('**/*' + suffix))
    if not existing:
        with zipfile.ZipFile(editor_archive) as archive: archive.extractall(editor_dir)
    godot = next(editor_dir.glob('**/*' + suffix))
    if os.name != 'nt': godot.chmod(godot.stat().st_mode | 0o111)
    templates = acquire(LOCK['assets']['templates'], cache)
    data_home = Path(os.environ['APPDATA']) / 'Godot' if os.name == 'nt' else Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share'))) / 'godot'
    template_dir = data_home / 'export_templates/4.7.2.stable.mono'
    template_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(templates) as archive:
        for name in archive.namelist():
            leaf = Path(name).name
            if leaf in ('version.txt', 'icudt_godot.dat') or ('x86_64' in leaf and leaf.startswith(('windows_', 'linux_'))):
                (template_dir / leaf).write_bytes(archive.read(name))
    font = acquire(LOCK['assets']['font'], cache)
    shutil.copy2(font, ROOT / 'Godot/Assets/NotoSansJP.ttf')
    env = os.environ.copy(); env['DOTNET_ROOT'] = str(sdk_dir); env['PATH'] = str(sdk_dir) + os.pathsep + env['PATH']
    env['DOTNET_CLI_TELEMETRY_OPTOUT'] = '1'; env['GODOT_SILENCE_ROOT_WARNING'] = '1'
    actual_sdk = subprocess.check_output([str(dotnet), '--version'], cwd=ROOT, env=env, text=True).strip()
    actual_godot = subprocess.check_output([str(godot), '--version'], env=env, text=True).strip()
    if actual_sdk != LOCK['sdk'] or actual_godot != LOCK['godot']:
        raise RuntimeError(f'Version mismatch: {actual_sdk} / {actual_godot}')
    result = {'dotnet': str(dotnet.resolve()), 'godot': str(godot.resolve()), 'templates': str(template_dir), 'sdk': actual_sdk, 'engine': actual_godot}
    out = ROOT / 'artifacts'; out.mkdir(exist_ok=True)
    (out / 'toolchain-local.json').write_text(json.dumps(result, indent=2) + '\n')
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--tools', type=Path, default=ROOT / '.tools')
    print(json.dumps(bootstrap(parser.parse_args().tools.resolve()), indent=2))
