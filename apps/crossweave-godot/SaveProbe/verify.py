"""RD-SAVE-02A: 固定SDKで実ファイル・別プロセス検査と証拠を生成する。Godotは起動しない。"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, platform, subprocess, tarfile, xml.etree.ElementTree as ET, zipfile

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence', type=Path)
    parser.add_argument('--no-acquire', action='store_true')
    args = parser.parse_args()
    host = 'windows' if os.name == 'nt' else 'linux'
    evidence = (args.evidence or ROOT / ('artifacts/rd-save-02a-' + host)).resolve()
    evidence.mkdir(parents=True, exist_ok=True)

    # 既存bootstrapのURL・hash照合を再利用する。版変更やGodot/templatesの追加取得は不要。
    spec = importlib.util.spec_from_file_location('crossweave_bootstrap', ROOT / 'packaging/bootstrap.py')
    bootstrap = importlib.util.module_from_spec(spec); spec.loader.exec_module(bootstrap)
    sdk_dir = ROOT / '.tools/dotnet'; sdk_dir.mkdir(parents=True, exist_ok=True)
    dotnet = sdk_dir / ('dotnet.exe' if os.name == 'nt' else 'dotnet')
    if not args.no_acquire:
        cache = ROOT / '.tools/downloads'; cache.mkdir(parents=True, exist_ok=True)
        archive = bootstrap.acquire(bootstrap.LOCK['assets']['sdk_' + host], cache)
        if not dotnet.exists():
            if os.name == 'nt':
                with zipfile.ZipFile(archive) as file: file.extractall(sdk_dir)
            else:
                with tarfile.open(archive) as file: file.extractall(sdk_dir, filter='data')
    env = os.environ.copy()
    env.update(DOTNET_ROOT=str(sdk_dir), CROSSWEAVE_DOTNET=str(dotnet), RD_SAVE_EVIDENCE=str(evidence / 'checks'), DOTNET_CLI_TELEMETRY_OPTOUT='1')
    env['PATH'] = str(sdk_dir) + os.pathsep + env.get('PATH', '')
    sdk = subprocess.check_output([str(dotnet), '--version'], cwd=ROOT, env=env, text=True).strip()
    if sdk != bootstrap.LOCK['sdk']: raise RuntimeError('固定SDKと不一致: ' + sdk)
    runtimes = subprocess.check_output([str(dotnet), '--list-runtimes'], cwd=ROOT, env=env, text=True)
    if 'Microsoft.NETCore.App 10.0.12 ' not in runtimes: raise RuntimeError('固定runtime10.0.12がありません。')
    manifest = dict(task='RD-SAVE-02A', host=host, platform=platform.platform(), sdk=sdk, runtime='10.0.12',
                    commit=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
                    commands={}, artifacts={}, scope='Real application DTO + real files + separate processes; no Godot UI or physical Windows acceptance')
    steps = [
        ('restore', ['restore', 'Tests/Crossweave.Tests.csproj', '-m:1', '--locked-mode', '-p:NuGetAudit=false']),
        ('build', ['build', 'Tests/Crossweave.Tests.csproj', '--no-restore', '-m:1', '--nologo']),
        ('test', ['test', 'Tests/Crossweave.Tests.csproj', '--no-build', '--no-restore', '-m:1', '--nologo', '--logger', 'trx;LogFileName=save.trx', '--results-directory', str(evidence)])]
    result = 0
    try:
        for name, command in steps:
            print(name, flush=True)
            with (evidence / (name + '.log')).open('w', encoding='utf-8') as log:
                code = subprocess.run([str(dotnet), *command], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=600).returncode
            manifest['commands'][name] = dict(arguments=command, exit=code)
            if code: result = code; break
        if (evidence / 'save.trx').exists():
            ns = {'t': 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'}
            tree = ET.parse(evidence / 'save.trx')
            manifest['test_counters'] = tree.find('.//t:Counters', ns).attrib
        # 検証時のコードをコミット前にも同定できるよう、入力ファイルの内容ハッシュを保存する。
        paths = [*ROOT.glob('Core/Application/*.cs'), *ROOT.glob('Infrastructure/Application/*.cs'), *ROOT.glob('SaveProbe/*.cs'),
                 ROOT / 'SaveProbe/verify.py', ROOT / 'Tests/SaveTests.cs', ROOT / 'Tests/Fixtures/save-file-v1.json',
                 ROOT / 'Tests/Fixtures/application-oracle.json.br']
        manifest['source_sha256'] = {str(path.relative_to(REPO)).replace('\\', '/'): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(paths)}
        for path in sorted(evidence.rglob('*')):
            if path.is_file() and path.name != 'manifest.json':
                manifest['artifacts'][path.relative_to(evidence).as_posix()] = dict(bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    finally:
        (evidence / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result

if __name__ == '__main__': raise SystemExit(main())
