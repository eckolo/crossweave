"""RD-PACK-02: 固定済み本編からWindows x64の自己完結したRelease ZIPを作る。"""
from pathlib import Path
import hashlib, json, os, platform, shutil, subprocess, sys, tempfile, zipfile

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[1]
sys.path.insert(0, str(ROOT / 'packaging'))
from bootstrap import LOCK, digest
OUT = ROOT / 'artifacts/m1-package'
EVIDENCE = OUT / 'evidence'


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO, text=True, encoding='utf-8').strip()


def clean():
    # 全リポジトリの追跡変更・未追跡入力を拒否する。ignoredな生成物は入力にしない。
    status = git('status', '--porcelain', '--untracked-files=all')
    if status:
        # 何が変わったかを失敗時にも残す。許可範囲を広げて黙認しない。
        EVIDENCE.mkdir(parents=True, exist_ok=True)
        (EVIDENCE/'source-changes.txt').write_text(status+'\n'+git('diff','--no-ext-diff'), encoding='utf-8')
        raise RuntimeError('生成入力が変化しました: '+ascii(status)+'; source-changes.txtを参照')


def main():
    if os.name != 'nt':
        raise RuntimeError('この入口はWindows x64生成・実行のためのものです。')
    clean()
    sha = git('rev-parse', 'HEAD')
    OUT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(exist_ok=True)
    tc = json.loads((ROOT / 'artifacts/toolchain-local.json').read_text())
    dotnet, godot = Path(tc['dotnet']), Path(tc['godot'])
    env = os.environ.copy()
    env.update(DOTNET_ROOT=str(dotnet.parent), DOTNET_CLI_TELEMETRY_OPTOUT='1', DOTNET_PROCESSOR_COUNT='1')
    env['PATH'] = str(dotnet.parent) + os.pathsep + env['PATH']
    commands = []

    def run(name, command, engine=False):
        result = subprocess.run([str(x) for x in command], cwd=ROOT, env=env, capture_output=True,
                                text=True, encoding='utf-8', errors='replace', timeout=900)
        log = result.stdout + result.stderr
        (EVIDENCE / (name + '.log')).write_text(log, encoding='utf-8')
        passed = result.returncode == 0 and not (engine and ('ERROR:' in log or 'SCRIPT ERROR:' in log))
        commands.append(dict(name=name, arguments=[str(x) for x in command], exit=result.returncode, passed=passed))
        write_json(EVIDENCE / 'build-commands.json', commands)
        print(name, 'passed' if passed else 'FAILED', flush=True)
        if not passed: raise RuntimeError(log[-10000:])
        return log.strip()

    if run('sdk-version', [dotnet, '--version']) != LOCK['sdk']: raise RuntimeError('SDK版不一致')
    if run('godot-version', [godot, '--version']) != LOCK['godot']: raise RuntimeError('Godot版不一致')
    if digest(ROOT/'Godot/Assets/NotoSansJP.ttf', 'sha256') != LOCK['assets']['font']['hash']:
        raise RuntimeError('固定日本語フォントのhash不一致')
    # 既存72試験を再利用する。今回新しく全ゲーム経路を作り直さない。
    run('regression-72', [sys.executable, ROOT/'SaveProbe/verify.py', '--no-acquire', '--evidence', EVIDENCE/'regression'])
    run('restore-debug', [dotnet, 'restore', 'Crossweave.sln', '--locked-mode', '--disable-parallel', '-m:1'])
    run('build-debug', [dotnet, 'build', 'Crossweave.sln', '--no-restore', '-m:1', '-nr:false'])
    run('import', [godot, '--headless', '--path', 'Godot', '--editor', '--import', '--quit'], engine=True)
    run('restore-export', [dotnet, 'restore', 'Godot/Crossweave.Proof.csproj', '--locked-mode', '--disable-parallel',
                           '-p:Configuration=ExportRelease', '-p:RuntimeIdentifier=win-x64', '-m:1'])
    # 毎回空の新規ディレクトリを用意し、前回成功したDLLの混入を防ぐ。
    payload = Path(tempfile.mkdtemp(prefix='payload-', dir=OUT))
    exe = payload / 'Crossweave.exe'
    run('export', [godot, '--headless', '--path', 'Godot', '--export-release', 'Windows Desktop', exe], engine=True)
    run('restore-after-export', [dotnet, 'restore', 'Crossweave.sln', '--locked-mode', '--disable-parallel', '-m:1'])
    for name in ['Crossweave.exe', 'Crossweave.pck', 'Crossweave.Proof.dll', 'Crossweave.Core.dll',
                 'Crossweave.Infrastructure.dll', 'coreclr.dll', 'System.Private.CoreLib.dll']:
        if not any(p.is_file() and p.name == name for p in payload.rglob('*')):
            raise RuntimeError('同梱依存が欠落: ' + name)
    if exe.read_bytes()[:2] != b'MZ': raise RuntimeError('Windows PE形式ではありません')
    runtime = [dict(path=p.relative_to(payload).as_posix(), content=json.loads(p.read_text()))
               for p in payload.rglob('*.runtimeconfig.json')]
    if not runtime or LOCK['runtime_framework_version'] not in json.dumps(runtime):
        raise RuntimeError('固定runtimeをruntimeconfigで確認できません')
    licenses = payload / 'licenses'; licenses.mkdir()
    for source in (ROOT / 'packaging/licenses').iterdir(): shutil.copy2(source, licenses/source.name)
    shutil.copy2(ROOT/'Godot/Assets/OFL.txt', licenses/'NotoSansJP-OFL.txt')
    # Microsoft同梱原文は欠落を無視しない。利用条件を独自に書き換えない。
    for name in ['LICENSE.txt', 'ThirdPartyNotices.txt']:
        shutil.copy2(dotnet.parent/name, licenses/('dotnet-'+name))
    for name in ['START-HERE.md', 'Windows11確認票.md']:
        shutil.copy2(ROOT/'packaging/m1'/name, payload/name)
    shutil.copy2(ROOT/'packaging/m1/素材出典.md', licenses/'素材出典.md')
    for name in ['source.json', 'Application/source.json']:
        shutil.copy2(ROOT/'Godot/Assets'/name, licenses/('assets-'+name.replace('/', '-')))
    # JSONはCore.dllの埋込資源、フォント・画像はGodotのPCK/変換済み資源として出荷する。
    inputs = [ROOT/'Godot/Assets/NotoSansJP.ttf', *sorted((ROOT/'Godot/Assets/Application').glob('*.webp')),
              *sorted((ROOT/'Core/Application/Content').glob('*.json'))]
    resources = [dict(path=p.relative_to(REPO).as_posix(), bytes=p.stat().st_size, sha256=digest(p,'sha256')) for p in inputs]
    clean()  # import/exportが設定・lockを書き換えたらこの版は提出しない。
    files = [dict(path=p.relative_to(payload).as_posix(), bytes=p.stat().st_size, sha256=digest(p,'sha256'))
             for p in sorted(payload.rglob('*')) if p.is_file()]
    manifest = dict(task='RD-PACK-02', edition='m1-20260930-'+sha[:12], source_commit=sha,
        accepted_main_commit='749d648fac7f439f243b84b2e84ce9cd0e5198b2', target='win-x64', configuration='ExportRelease',
        main_scene='res://Main.tscn', launch='Crossweave.exe', toolchain=LOCK, runtime_configs=runtime,
        save_file_version=1, normal_save='user://saves/local/m1.json', windows_save=r'%APPDATA%\crossweave\saves\local\m1.json',
        generation_host=platform.platform(), resource_inputs=resources, files=files,
        inventory_note='全payload。manifest自身は循環hashを避けて除外。manifestを含むZIP全体hashは外部delivery.jsonに記録。',
        verification='生成後に完成ZIPを展開して実行。結果は同一ZIP hashを持つcompanion verification.json。',
        unchecked=['Windows 11 physical input', 'DPI 100/125/150%', 'audio', 'physical GPU performance', 'human playtest', 'future save migration'])
    write_json(payload/'manifest.json', manifest)
    archive = OUT/('crossweave-'+manifest['edition']+'-win-x64.zip')
    if archive.exists(): raise RuntimeError('既存版ZIPを上書きしません: '+str(archive))
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in sorted(payload.rglob('*')):
            if p.is_file(): z.write(p, p.relative_to(payload).as_posix())
    delivery = dict(archive=archive.name, bytes=archive.stat().st_size, sha256=digest(archive,'sha256'),
                    source_commit=sha, manifest_sha256=digest(payload/'manifest.json','sha256'))
    write_json(OUT/'delivery.json', delivery)
    shutil.copy2(payload/'manifest.json', EVIDENCE/'generation-manifest.json')
    # 転送制限用の分割。元ZIPのバイトをそのまま分け、再ZIPしない。
    transport = OUT/'transport'; transport.mkdir(exist_ok=True)
    parts = []
    with archive.open('rb') as stream:
        while data := stream.read(24*1024*1024):
            name = 'payload-%02d.part' % (len(parts)+1)
            (transport/name).write_bytes(data)
            parts.append(dict(name=name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    if len(parts)>6: raise RuntimeError('転送定義の上限を超えました。分割数を明示更新してください。')
    write_json(transport/'transport.json', dict(**delivery, parts=parts))
    print(json.dumps(delivery, indent=2))

if __name__ == '__main__': main()
