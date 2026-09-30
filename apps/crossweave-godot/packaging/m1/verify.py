"""完成ZIPをWindowsの別フォルダへ展開し、そのexeで通常sceneと実保存を検査する。"""
from pathlib import Path, PurePosixPath
import hashlib, json, os, platform, shutil, subprocess, tempfile, uuid, zipfile
from build import ROOT, OUT, EVIDENCE, digest, write_json


def require(condition, reason):
    if not condition: raise RuntimeError(reason)


def extract(archive, destination, delivery):
    # manifestによる欠落・混入・byte/hash検査。未検査の任意ZIPを実行しない。
    require(digest(archive,'sha256') == delivery['sha256'], '完成ZIPのhashが変化しました')
    destination.mkdir()
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        require(len(names)==len(set(names)), 'ZIP内の重複名')
        for name in names:
            p = PurePosixPath(name)
            require(not p.is_absolute() and '..' not in p.parts and '\\' not in name and ':' not in name, '不正なZIPパス')
        z.extractall(destination)
    manifest = json.loads((destination/'manifest.json').read_text(encoding='utf-8'))
    require(digest(destination/'manifest.json','sha256')==delivery['manifest_sha256'], 'manifest不一致')
    require(manifest['source_commit']==delivery['source_commit'], 'ソースSHA不一致')
    require(set(names)=={'manifest.json', *[r['path'] for r in manifest['files']]}, '内容一覧との過不足')
    for r in manifest['files']:
        p=destination/r['path']
        require(p.stat().st_size==r['bytes'] and digest(p,'sha256')==r['sha256'], 'payload不一致: '+r['path'])
    return manifest


def main():
    require(os.name=='nt', 'Windows上の配布exe検査専用です')
    delivery=json.loads((OUT/'delivery.json').read_text())
    archive=OUT/delivery['archive']
    EVIDENCE.mkdir(exist_ok=True)
    workspace=Path(tempfile.mkdtemp(prefix='crossweave pack '))
    install_a=workspace/'初回 展開A'; install_b=workspace/'更新 展開B'
    manifest=extract(archive, install_a, delivery)
    # 検査原本はZIP外に置く。通常ユーザーには不要で、資源不足を隠す代用もしない。
    fixture=workspace/'oracle.json.br'
    shutil.copy2(ROOT/'Tests/Fixtures/application-oracle.json.br',fixture)
    env=os.environ.copy()
    for key in list(env):
        if key.startswith(('DOTNET_', 'MSBUILD', 'NUGET_', 'GODOT_')): env.pop(key)
    system=Path(env['SystemRoot'])
    env['PATH']=str(system/'System32')+os.pathsep+str(system)
    env['DOTNET_MULTILEVEL_LOOKUP']='0'
    # SDKがあるCIという事実を残しつつ、実際にロードされたDLLが展開先かを照合する。
    result=dict(task='RD-PACK-02', status='running', source_commit=delivery['source_commit'], archive=delivery,
        host=platform.platform(), ci_sdk_installed=True, execution_path=env['PATH'],
        execution='extracted Release exe; same Main.tscn and FileGameSession; synthetic viewport InputEvent',
        physical_input=False, windows11_physical=False, dpi=False, audio=False, gpu_performance=False, human_playtest=False,
        cases={}, replacement={}, normal_save_route={})
    prefix='pack-'+uuid.uuid4().hex[:16]
    expected_normal=Path(env['APPDATA'])/'crossweave/saves/local/m1.json'
    normal_before=digest(expected_normal,'sha256') if expected_normal.exists() else None

    def process(name, install, arguments):
        log=EVIDENCE/(name+'.log')
        with log.open('w',encoding='utf-8') as output:
            p=subprocess.run([str(install/'Crossweave.exe'), *arguments], cwd=install, env=env, stdout=output, stderr=subprocess.STDOUT, timeout=360)
        require(p.returncode==0, name+' exit='+str(p.returncode))
        return log.read_text(encoding='utf-8')

    def case(mode, install, slot):
        process(mode, install, ['--','--ui-check='+mode,'--ui-slot='+slot,
                    '--ui-output='+str(EVIDENCE), '--ui-fixture='+str(fixture), '--package-evidence'])
        report=json.loads((EVIDENCE/(mode+'.json')).read_text(encoding='utf-8'))
        require(report['status']=='passed', mode+': '+str(report.get('error')))
        package=report['package']
        require(report['normal_scene']=='res://Main.tscn', '本編入口ではありません')
        require(Path(package['executable']).resolve()==(install/'Crossweave.exe').resolve(), 'exe所在不一致')
        require(package['japanese_glyphs'] and len(package['images'])==3, '資源が不足')
        require(all(i['width']>0 and i['height']>0 for i in package['images']), '画像読込失敗')
        require(Path(package['normal_save_path']).resolve()==expected_normal.resolve(), '通常保存先が変化')
        require(Path(report['save_path']).resolve()!=expected_normal.resolve(), '検査slot未分離')
        require(any(m['name'].lower()=='coreclr.dll' for m in package['modules']), '実CLRの証拠なし')
        for path in [package['core_library'],package['application_core'],*[m['path'] for m in package['modules']]]:
            require(Path(path).resolve().is_relative_to(install.resolve()), '外部runtime/本編DLLを利用: '+path)
        for resource in manifest['resource_inputs']:
            if '/Content/' in resource['path']:
                require(any(r['name'].endswith('.'+Path(resource['path']).name) and r['sha256']==resource['sha256'] for r in package['resources']), '埋込JSON不一致')
        require(report['display']!='headless', '描画を伴う配布exe確認ではありません')
        result['cases'][mode]=dict(status='passed', checks=len(report['checks']), commands=len(report['commands']),
            process_id=report['process_id'], process_instance=report['process_instance'], executable=package['executable'],
            save_path=report['save_path'], final_revision=report['final_revision'], final_phase=report['final_phase'])
        print(mode,'passed',flush=True)
        return report

    try:
        # 通常引数でタイトル画面まで起動。隔離検査への分岐なし、勝手な初期保存なし。
        log=process('normal-start', install_a, ['--headless','--quit-after','60'])
        require('ERROR:' not in log and 'SCRIPT ERROR:' not in log, '通常起動エラー')
        result['normal_save_route']=dict(path=str(expected_normal), before=normal_before, normal_start='passed')
        a=case('interaction',install_a,prefix+'-interaction')
        b=case('resume',install_a,prefix+'-interaction')
        require(a['process_instance']!=b['process_instance'], '別プロセス再開ではありません')
        natural=case('natural',install_a,prefix+'-natural')
        save=Path(natural['save_path']); before=digest(save,'sha256')
        checkpoint=case('package-checkpoint',install_a,prefix+'-natural')
        require(digest(save,'sha256')==before, '読み取り専用checkpointが保存を変更')
        # 同一完成ZIP・保存v1のフォルダ差替え。将来の異なる実版移行の実績ではない。
        extract(archive, install_b, delivery)
        after_extract=digest(save,'sha256'); require(before==after_extract,'展開による保存変更')
        resumed=case('package-resume',install_b,prefix+'-natural')
        require(checkpoint['process_instance']!=resumed['process_instance'], '差替えが別プロセスではない')
        result['replacement']=dict(status='passed', scope='same ZIP, same save format v1, different install directory',
            before_sha256=before, after_extract_sha256=after_extract, after_next_command_sha256=digest(save,'sha256'),
            old_directory=str(install_a), new_directory=str(install_b), full_dto_and_next_rng='passed')
        # 検査入口を拡張したので、既存の保存失敗・成否不明の代表経路も同じexeで確認する。
        case('failure',install_a,prefix+'-failure'); case('unknown',install_a,prefix+'-unknown')
        normal_after=digest(expected_normal,'sha256') if expected_normal.exists() else None
        require(normal_after==normal_before,'通常ユーザーの保存を変更しました')
        result['normal_save_route']['after']=normal_after
        pngs=list(EVIDENCE.glob('*.png')); require(len(pngs)>=5,'描画証拠が不足')
        require(digest(archive,'sha256')==delivery['sha256'], '検査後ZIPが変更')
        result['status']='passed'
    except Exception as error:
        result['status']='failed'; result['error']=str(error)
        raise
    finally:
        result['evidence_files']={p.relative_to(EVIDENCE).as_posix():dict(bytes=p.stat().st_size,sha256=digest(p,'sha256'))
            for p in sorted(EVIDENCE.rglob('*')) if p.is_file() and p.name!='verification.json'}
        write_json(EVIDENCE/'verification.json',result)

if __name__=='__main__': main()
