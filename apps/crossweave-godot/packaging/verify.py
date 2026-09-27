"""One entry for .NET tests, Godot node/input probes, export and process restart.
Desktop input/GPU/DPI/human observation are intentionally not marked passed here.
"""
from pathlib import Path
import argparse, hashlib, json, os, platform, shutil, subprocess, sys, time, uuid, zipfile
from bootstrap import ROOT, LOCK, digest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--toolchain', type=Path, default=ROOT / 'artifacts/toolchain-local.json')
    parser.add_argument('--target', choices=['windows', 'linux'], default='windows')
    args = parser.parse_args()
    tc = json.loads(args.toolchain.read_text())
    godot, dotnet = Path(tc['godot']), Path(tc['dotnet'])
    if os.name != 'nt': godot.chmod(godot.stat().st_mode | 0o111)
    env = os.environ.copy(); env['DOTNET_ROOT'] = str(dotnet.parent); env['PATH'] = str(dotnet.parent) + os.pathsep + env['PATH']
    env.update(DOTNET_CLI_TELEMETRY_OPTOUT='1', DOTNET_PROCESSOR_COUNT='1', GODOT_SILENCE_ROOT_WARNING='1')
    out = ROOT / 'artifacts'; logs = out / ('verification-' + args.target); logs.mkdir(parents=True, exist_ok=True)
    commands = []
    def run(name, command, *, is_godot=False, environment=None):
        started = time.monotonic()
        result = subprocess.run([str(x) for x in command], cwd=ROOT, env=environment or env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', timeout=600)
        (logs / (name + '.log')).write_text(result.stdout, encoding='utf-8')
        failed = result.returncode != 0 or (is_godot and ('ERROR:' in result.stdout or 'SCRIPT ERROR:' in result.stdout))
        commands.append({'name':name, 'command':[str(x) for x in command], 'exit_code':result.returncode, 'seconds':time.monotonic()-started, 'passed':not failed})
        (logs / 'commands.json').write_text(json.dumps(commands, indent=2)+'\n')
        print(name, 'FAILED' if failed else 'passed', flush=True)
        if failed: raise RuntimeError(result.stdout[-7000:])
        return result.stdout
    if run('sdk-version',[dotnet,'--version']).strip() != LOCK['sdk']: raise RuntimeError('Wrong SDK')
    if run('engine-version',[godot,'--version']).strip() != LOCK['godot']: raise RuntimeError('Wrong engine')
    if digest(ROOT/'Godot/Assets/NotoSansJP.ttf','sha256') != LOCK['assets']['font']['hash']: raise RuntimeError('Wrong Japanese font')
    run('restore',[dotnet,'restore','Crossweave.sln','--locked-mode','--disable-parallel'])
    run('build',[dotnet,'build','Crossweave.sln','--no-restore','-m:1','-nr:false','--nologo'])
    run('dotnet-tests',[dotnet,'test','Crossweave.sln','--no-build','-m:1','--logger','trx;LogFileName=proof.trx'])
    run('import',[godot,'--headless','--path','Godot','--editor','--import'],is_godot=True)
    slot='auto-'+platform.system().lower()+'-'+uuid.uuid4().hex[:10]
    run('engine-nodes-input',[godot,'--headless','--path','Godot','--','--proof-smoke','--probe-slot='+slot],is_godot=True)
    build = out / ('win-x64' if args.target=='windows' else 'linux-x64')
    # Dedicated generated directory only. Prevent a previous successful export masking missing dependencies.
    if build.exists(): shutil.rmtree(build)
    build.mkdir()
    exe = build / ('Crossweave.Proof.exe' if args.target=='windows' else 'Crossweave.Proof.x86_64')
    rid = 'win-x64' if args.target=='windows' else 'linux-x64'
    for project in ['Core','Infrastructure','Godot']:
        if not (ROOT/project/('packages.ExportRelease.'+rid+'.lock.json')).is_file():
            raise RuntimeError('Missing committed export lock: '+project+' '+rid)
    run('restore-export',[dotnet,'restore','Godot/Crossweave.Proof.csproj','--locked-mode','--disable-parallel','-p:Configuration=ExportRelease','-p:RuntimeIdentifier='+rid])
    run('export',[godot,'--headless','--path','Godot','--export-release','Windows Desktop' if args.target=='windows' else 'Linux',exe],is_godot=True)
    # Export must not invalidate the normal IDE/test dependency graph.
    run('restore-after-export',[dotnet,'restore','Crossweave.sln','--locked-mode','--disable-parallel'])
    required = ['Crossweave.Proof.pck','Crossweave.Proof.dll','Crossweave.Core.dll','Crossweave.Infrastructure.dll', 'coreclr.dll' if args.target=='windows' else 'libcoreclr.so']
    for name in required:
        if not any(p.name==name for p in build.rglob('*')): raise RuntimeError('Missing export dependency '+name)
    if args.target=='windows' and exe.read_bytes()[:2] != b'MZ': raise RuntimeError('Not a PE executable')
    # Inspect all .NET runtime metadata; SDK, app TFM and bundled runtime are separate facts.
    runtime = []
    for p in build.rglob('*.runtimeconfig.json'): runtime.append({'path':str(p.relative_to(build)),'content':json.loads(p.read_text())})
    host_matches = (args.target=='windows') == (os.name=='nt')
    process_restart = {'status':'not-run','reason':'Target OS differs from build host'}
    if host_matches:
        if os.name!='nt': exe.chmod(exe.stat().st_mode | 0o111)
        clean_env = env.copy(); clean_env.pop('DOTNET_ROOT',None); clean_env['PATH']=os.environ.get('PATH','')
        run('release-nodes-input',[exe,'--headless','--','--proof-smoke','--probe-slot='+slot],is_godot=True,environment=clean_env)
        run('release-save',[exe,'--headless','--','--probe-write=41','--probe-slot='+slot],is_godot=True,environment=clean_env)
        run('release-restart-read',[exe,'--headless','--','--expect-probe=41','--probe-slot='+slot],is_godot=True,environment=clean_env)
        run('release-write-failure',[exe,'--headless','--','--probe-fail-write','--probe-slot='+slot],is_godot=True,environment=clean_env)
    else:
        run('editor-save',[godot,'--headless','--path','Godot','--','--probe-write=41','--probe-slot='+slot],is_godot=True)
        run('editor-restart-read',[godot,'--headless','--path','Godot','--','--expect-probe=41','--probe-slot='+slot],is_godot=True)
        run('editor-write-failure',[godot,'--headless','--path','Godot','--','--probe-fail-write','--probe-slot='+slot],is_godot=True)
    data_home = Path(os.environ['APPDATA']) if os.name=='nt' else Path(os.environ.get('XDG_DATA_HOME',str(Path.home()/'.local/share')))
    report_dir = data_home/'crossweave/proofs/rd-proof-02'/slot
    for path in report_dir.glob('*.json'): shutil.copy2(path, logs/path.name)
    write=json.loads((logs/'write.json').read_text()); read=json.loads((logs/'read.json').read_text())
    if write['process_instance']==read['process_instance'] or write['state']!=read['state']: raise RuntimeError('Restart proof mismatch')
    process_restart={'status':'passed','scope':'exported release' if host_matches else 'editor runtime','write_pid':write['process_id'],'read_pid':read['process_id'],'write_instance':write['process_instance'],'read_instance':read['process_instance'],'host':platform.system()}
    licenses = build/'licenses'; licenses.mkdir(exist_ok=True)
    for path in (ROOT/'packaging/licenses').iterdir(): shutil.copy2(path,licenses/path.name)
    shutil.copy2(ROOT/'Godot/Assets/OFL.txt',licenses/'NotoSansJP-OFL.txt')
    # Microsoft runtime packages carry their own license/notice alongside the SDK.
    for name in ['LICENSE.txt','ThirdPartyNotices.txt']:
        source=dotnet.parent/name
        if source.exists(): shutil.copy2(source,licenses/('dotnet-'+name))
    for name in ['START-HERE.md','Windows確認票.md','start-proof.cmd','verify-restart.cmd']:
        source=ROOT/'packaging'/name
        if source.exists(): shutil.copy2(source,build/name)
    sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    source_files = {}
    # Record actual source bytes as well as commit, including pending changes if used before publication.
    for path in ROOT.rglob('*'):
        rel=path.relative_to(ROOT)
        if not path.is_file() or any(part in ('artifacts','.tools','.godot','bin','obj','TestResults','__pycache__') for part in rel.parts): continue
        if rel.as_posix()=='Godot/Assets/NotoSansJP.ttf': continue
        source_files[rel.as_posix()]=digest(path,'sha256')
    source_manifest=json.dumps(source_files,sort_keys=True).encode()
    # The generated manifest describes payload files, never a previous manifest.
    (build/'manifest.json').unlink(missing_ok=True)
    files=[{'path':str(p.relative_to(build)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':digest(p,'sha256')} for p in sorted(build.rglob('*')) if p.is_file()]
    manifest={'task':'RD-ENV-02/RD-PROOF-02','source_commit':sha,'source_files_sha256':source_files,'source_manifest_sha256':hashlib.sha256(source_manifest).hexdigest(),
        'toolchain':LOCK,'runtime_configs':runtime,'build_host':platform.platform(),'target':args.target,'commands':commands,'process_restart':process_restart,
        'physical_windows_input_visual_dpi_gpu':'not checked','baseline_performance':'not checked','files':files,'files_bytes':sum(f['bytes'] for f in files),'scope':'small proof; not M1 campaign or production save'}
    (build/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    archive=out/('crossweave-rd-proof-02-'+args.target+'-x64.zip')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(build.rglob('*')):
            if path.is_file(): z.write(path,path.relative_to(build))
    result={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':digest(archive,'sha256'),'source_commit':sha,'source_manifest_sha256':manifest['source_manifest_sha256'],'target':args.target,'process_restart':process_restart}
    (out/('delivery-'+args.target+'.json')).write_text(json.dumps(result,indent=2)+'\n')
    shutil.copy2(build/'manifest.json',logs/'generation-manifest.json')
    print(json.dumps(result,indent=2))
if __name__=='__main__': main()
