"""再開時の保全と、計画→既定技術→計画再照合を同じ枝で行う。

C#・Godotの処理ではなく、本Workの受領記録用Pythonである。
Git blobを直接読み、計画配下だけを同じpathへ保存する。削除や
技術元の新差分があれば自動で範囲を広げず、その段階で停止する。
"""
from pathlib import Path
import datetime
import base64
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[6]
OUT = Path(__file__).resolve().parents[1]
BRANCH = 'impl/m1-godot-application-20260927'
PLAN = 'ops/project-coordination-20260913'
TECH = 'dev_design_tmp_assembly'
SCOPE = 'docs/作業資料/とりまとめ/'
PREVIOUS_TECH = '21ddd349b6bec69ecac6d9db288c537553dab860'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def tree(ref, scope=None):
    args = ['ls-tree', '-rz', ref]
    if scope:
        args += ['--', scope]
    result = {}
    for row in git(*args).split(b'\0'):
        if row:
            meta, path = row.split(b'\t', 1)
            result[path.decode('utf-8')] = meta.split()[2].decode()
    return result


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


assert git('branch', '--show-current').decode().strip() == BRANCH
if sys.argv[1] == 'preserve':
    assert not (OUT / 'start-state.json').exists(), '開始記録を上書きしない'
    head = git('rev-parse', 'HEAD').decode().strip()
    (OUT / 'start-index.patch').write_bytes(git('diff', '--cached', '--binary', 'HEAD'))
    (OUT / 'start-worktree.patch').write_bytes(git('diff', '--binary'))
    untracked = {}
    for raw in git('ls-files', '-z', '--others', '--exclude-standard').split(b'\0'):
        if not raw:
            continue
        name = raw.decode('utf-8')
        p = ROOT / name
        if str(p.resolve()).startswith(str(OUT.resolve())):
            continue
        untracked[name] = {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    write('start-state.json', {
        'utc': now(), 'work_id': '20260927-game-application', 'branch': BRANCH,
        'head': head, 'head_tree': git('rev-parse', 'HEAD^{tree}').decode().strip(),
        'fixed_code': 'aabfefab076252f050824640fba6d8a8dd13e8e0',
        'index_patch': 'start-index.patch', 'worktree_patch': 'start-worktree.patch',
        'tracked_changes': bool(git('status', '--porcelain', '--untracked-files=no').strip()),
        'untracked_files': untracked,
        'preservation': '既存ファイルをその場に保持。旧証拠・入力・配布物は上書きしない。',
        'editor_buffers': 'アクセス不能な旧環境・未保存編集バッファの不存在は推定しない。',
        'execution': '同Work・同枝・Codexアプリの1窓口。新枝・並列実装・他Work操作なし。'
    })
    print(json.dumps({'head': head, 'untracked_preserved': len(untracked)}, ensure_ascii=False))
elif sys.argv[1] in ('sync', 'plugin-sync'):
    assert (OUT / 'start-state.json').exists()
    plugin = sys.argv[1] == 'plugin-sync'
    payload = json.loads((ROOT / '.tools/dark-return-plan-payload.json').read_text(encoding='utf-8')) if plugin else None
    plan = payload['source_commit'] if plugin else git('rev-parse', 'origin/' + PLAN).decode().strip()
    files = payload['files'] if plugin else tree(plan, SCOPE)
    if plugin:
        assert payload['remote_self']['sha'] == git('rev-parse', 'HEAD').decode().strip(), '自枝の別書込みを照合する'
        assert all(p.startswith(SCOPE) for p in files)
        for item in payload['changed']:
            data = base64.b64decode(item['content'])
            actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
            assert actual == files[item['path']] == item['sha']
            p = ROOT / item['path']
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
    deleted = set(tree('HEAD', SCOPE)) - set(files)
    assert not deleted, f'計画削除の移行確認が必要: {deleted}'
    receipt_path = ROOT / 'docs/作業資料/計画同期/20260927-game-application.json'
    if not (OUT / 'previous-plan-receipt.json').exists():
        (OUT / 'previous-plan-receipt.json').write_bytes(receipt_path.read_bytes())
    changed = []
    for path, blob in files.items():
        p = ROOT / path
        old = git('hash-object', '--path=' + path, path).decode().strip() if p.exists() else None
        if old != blob:
            assert not plugin, f'受領本文不足: {path}'
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(git('cat-file', 'blob', blob))
            changed.append(path)
        assert git('hash-object', '--path=' + path, path).decode().strip() == blob
    # 計画の実同期後に技術元を照合する。既取込の配布3ファイルは戻さない。
    tech = payload['technical_sha'] if plugin else git('rev-parse', 'origin/' + TECH).decode().strip()
    diff = git('diff', '--name-status', PREVIOUS_TECH, tech).decode()
    write('technical-diff.json', {'previous': PREVIOUS_TECH, 'source_commit': tech, 'diff': diff})
    assert not diff.strip(), '既定技術同期の新差分を読んでから取り込む必要がある'
    mismatches = [p for p, b in files.items() if git('hash-object', '--path=' + p, p).decode().strip() != b]
    assert not mismatches, mismatches
    receipt = {
        'work_id': '20260927-game-application', 'source_work_id': '20260913-project-coordination',
        'source_branch': PLAN, 'source_commit': plan, 'scope': SCOPE,
        'mode': 'scoped-file-sync', 'files': files, 'instruction_revision': '0.11',
        'task_ids': ['D04B-UI-02'], 'technical_source': tech,
        'technical_status': '既定技術元21ddd349から追加差分なし。受領済み規則・通常保存接続・配布3ファイルを継承。',
        'status': '計画全path/blob実同期→既定技術同期確認→計画全件再照合済み。枝全体マージなし。',
        'review_source': 'ab1b6fa067877a140ac9e9c9c006c70da76e40b4', 'checked_at_utc': now()
    }
    if plugin:
        changed = [r['path'] for r in payload['changed']]
        receipt['acquisition_method'] = 'GitHubプラグインのref/tree/fetch_file(base64)。tree全体はtruncated=false。'
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write('sources.json', {'plan': receipt, 'changed_plan_paths': changed, 'technical_diff': diff,
                          'plan_rechecked': len(files), 'plan_mismatches': mismatches})
    print(json.dumps({'plan': plan, 'files': len(files), 'changed': changed, 'technical': tech}, ensure_ascii=False))
else:
    raise ValueError('preserve / plugin-sync')
