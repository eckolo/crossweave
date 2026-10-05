"""本編通常sceneの実ノード・実ファイル確認。正式配布物の生成はしない。"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, platform, shutil, subprocess, sys, tarfile, uuid, zipfile
ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
MODES = ['interaction', 'resume', 'inheritance', 'natural', 'withdraw-before', 'withdraw-protected', 'defeat', 'withdraw-unprotected', 'legal-acquisition', 'failure', 'unknown', 'in-use', 'corrupt', 'future', 'busy-close']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence', type=Path)
    parser.add_argument('--no-acquire', action='store_true')
    parser.add_argument('--skip-build', action='store_true')
    parser.add_argument('--skip-regression', action='store_true')
    parser.add_argument('--modes', default=','.join(MODES))
    parser.add_argument('--review-fixtures', type=Path, help='レビュー限定検査に使う固定合法状態のディレクトリ')
    parser.add_argument('--rendered', action='store_true', help='実描画を試す。取得画像も自動確認であり物理入力合格とは別')
    parser.add_argument('--full-hd', action='store_true', help='1920×1080の実描画を保存する。通常起動の窓サイズは変更しない')
    parser.add_argument('--theme', choices=['light','dark'], help='同状態比較の撮影テーマ。通常起動ではOS判定')
    args = parser.parse_args()
    host = 'windows' if os.name == 'nt' else 'linux'
    evidence = (args.evidence or ROOT / ('artifacts/d04b-ui-save-01-' + host)).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    from runtime import prepare
    dotnet, godot, env, lock = prepare(not args.no_acquire)
    # .NETのUTF-8出力に含まれる日本語パスを、子PythonがWindows既定CP932で誤読しない。
    env['PYTHONUTF8']='1'
    manifest = dict(task='D04B-UI-02', commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),
        host=host, platform=platform.platform(), sdk=lock['sdk'], engine=lock['godot'], rendered=args.rendered,
        physical_input=False, windows11_physical=False, formal_distribution=False, theme=args.theme or 'os', commands={}, cases={}, source_sha256={})
    # ビルド開始前に入力を固定する。検査中に編集があった場合も、終了時の新ソースへ読み替えない。
    source_paths=[p for folder in ['Godot/Application','Core/Application','Infrastructure/Application','UiProbe'] for p in sorted((ROOT/folder).glob('*')) if p.is_file()]
    source_paths += [ROOT/p for p in ['Godot/Main.tscn','Godot/Proof.tscn','Godot/project.godot','Infrastructure/Assembly.cs']]
    manifest['source_sha256']={p.relative_to(REPO).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in source_paths}
    def run(name, command, timeout=600):
        print(name, flush=True)
        with (evidence / (name+'.log')).open('w',encoding='utf-8') as log:
            result = subprocess.run([str(x) for x in command],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=timeout)
        manifest['commands'][name] = dict(arguments=[str(x) for x in command],exit=result.returncode)
        if result.returncode: raise RuntimeError(name + ' failed; see '+ str(evidence / (name+'.log')))
        if 'ERROR:' in (evidence/(name+'.log')).read_text(encoding='utf-8'):
            raise RuntimeError(name+' emitted an engine error; see '+str(evidence/(name+'.log')))
    result = 0
    try:
        if not args.skip_regression:
            run('regression',[sys.executable,ROOT/'SaveProbe/verify.py','--no-acquire','--evidence',evidence/'regression'])
        if not args.skip_build:
            run('restore-ui',[dotnet,'restore','Godot/Crossweave.Proof.csproj','--locked-mode','--disable-parallel','-m:1'])
            run('build-ui',[dotnet,'build','Godot/Crossweave.Proof.csproj','--no-restore','-m:1'])
            run('import-ui',[godot,'--headless','--path','Godot','--editor','--import','--quit'])
        slot_prefix='ui-'+uuid.uuid4().hex[:16]
        interaction_slot=slot_prefix+'-interaction'
        for mode in args.modes.split(','):
            # 公開mode名のdefense_supportは識別子。保存slotは従来の英数・hyphen契約へ写す。
            slot=interaction_slot if mode in ('interaction','resume') else slot_prefix+'-'+mode.replace('_','-')
            if mode=='review-resume':slot=slot_prefix+'-review-safety-quick'
            fixture_args=[]
            if args.review_fixtures and (mode.startswith('review-') and mode not in ('review-fixtures','review-resume') or mode.startswith('repro-')):
                fixture=(args.review_fixtures/(mode+'.json')).resolve()
                assert fixture.is_file(), fixture
                manifest.setdefault('fixture_sha256',{})[mode]=hashlib.sha256(fixture.read_bytes()).hexdigest()
                fixture_args=['--ui-fixture='+str(fixture)]
            # 画面・入力・保存の隔離検査は音声デバイスを検査しない。Windows CIは
            # WASAPI出力端点が無く、描画成功後にも初期化ERRORを残すため明示Dummy。
            # 実ゲームのproject/audio設定は変更せず、他のengine ERRORは引続き失敗。
            run(mode,[godot,'--audio-driver','Dummy',*([] if args.rendered else ['--headless']),*(['--resolution','1920x1080'] if args.full_hd else []),'--path','Godot','--','--ui-check='+mode,'--ui-slot='+slot,'--ui-output='+str(evidence),*(['--ui-theme='+args.theme] if args.theme else []),*fixture_args],timeout=240)
            report=json.loads((evidence/(mode+'.json')).read_text(encoding='utf-8'))
            assert report['status']=='passed', mode
            manifest['cases'][mode]=dict(status=report['status'],process_id=report['process_id'],checks=len(report['checks']),commands=len(report['commands']),final_revision=report['final_revision'])
            if mode=='busy-close':
                # Godot終了後、別の.NETプロセスから確定完了とロック解放を確認する。
                probe=ROOT/'SaveProbe/bin/Debug/net10.0/Crossweave.SaveProbe.dll'
                run('busy-close-read',[dotnet,probe,'snapshot',report['save_path'],evidence/'busy-close-read.json'])
                read=json.loads((evidence/'busy-close-read.json').read_text(encoding='utf-8'))
                assert read['view']['revision']==1 and read['view']['phase']=='exploring'
                assert read['pid'] != report['process_id']
        if 'interaction' in manifest['cases'] and 'resume' in manifest['cases']:
            assert manifest['cases']['interaction']['process_id'] != manifest['cases']['resume']['process_id']
        if 'review-safety-quick' in manifest['cases'] and 'review-resume' in manifest['cases']:
            assert manifest['cases']['review-safety-quick']['process_id'] != manifest['cases']['review-resume']['process_id']
        run('proof-entry-regression',[godot,'--headless','--path','Godot','--','--proof-smoke','--probe-slot='+slot_prefix],timeout=120)
    except Exception as e:
        manifest['error']=str(e); print(str(e),file=sys.stderr); result=1
    finally:
        manifest['source_changed_during_run']=[p.relative_to(REPO).as_posix() for p in source_paths if hashlib.sha256(p.read_bytes()).hexdigest()!=manifest['source_sha256'][p.relative_to(REPO).as_posix()]]
        if manifest['source_changed_during_run']: result=1;manifest['error']='Source changed during execution; rerun required'
        manifest['status']='passed' if result==0 else 'failed'
        manifest['artifacts']={p.relative_to(evidence).as_posix():dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(evidence.rglob('*')) if p.is_file() and p!=evidence/'manifest.json'}
        (evidence/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return result
if __name__=='__main__':raise SystemExit(main())
