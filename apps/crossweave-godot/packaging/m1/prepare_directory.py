"""P5-DIR: 確認済み実行一式を再利用し、案内だけ改訂した受渡しフォルダーを作る。"""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import shutil


HERE = Path(__file__).resolve().parent
SOURCE = '0765f1588e63b591733f3ea87635c8f4814dc1bc'
DOCUMENTS = ('START-HERE.md', '更新案内.md', 'Windows11確認票.md')


def digest(path):
    # 大きなexeもメモリーへ丸ごと載せず、ファイルのバイト列を順に照合する。
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def inventory(root):
    # symlinkは配布物の実体を曖昧にするため拒否する。サブディレクトリは保持する。
    paths = sorted(root.rglob('*'))
    if any(p.is_symlink() for p in paths):
        raise ValueError('実行フォルダーにsymlinkを含められません')
    return {p.relative_to(root).as_posix(): p for p in paths if p.is_file()}


def check_manifest(root, manifest):
    actual = inventory(root)
    expected = {}
    for entry in manifest['files']:
        name = entry['path']
        rel = PurePosixPath(name)
        if rel.is_absolute() or '..' in rel.parts or '\\' in name or ':' in name:
            raise ValueError('不正な相対パス: ' + name)
        if name in expected:
            raise ValueError('一覧の重複: ' + name)
        expected[name] = entry
    # manifest自身は自己hashの循環を避け、受渡し記録側でhashを保持する。
    if set(actual) != set(expected) | {'manifest.json'}:
        raise ValueError('manifestと実ファイルの一覧が一致しません')
    if len({n.casefold() for n in actual}) != len(actual):
        raise ValueError('Windowsで名前が衝突するファイルがあります')
    for name, entry in expected.items():
        path = actual[name]
        if path.stat().st_size != entry['bytes'] or digest(path) != entry['sha256']:
            raise ValueError('内容不一致: ' + name)
    return actual


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path, help='元manifestを含む既存の完全な実行フォルダー')
    parser.add_argument('--output', required=True, type=Path, help='まだ存在しない受渡しフォルダー')
    parser.add_argument('--revision', default='20260930-dir.1', help='バイナリの版とは別の案内改訂番号')
    args = parser.parse_args()
    source, output = args.input.resolve(), args.output.resolve()
    if output.exists() or source == output or source in output.parents:
        raise ValueError('既存成果への上書き・元フォルダー内への出力は行いません')
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    if manifest['source_commit'] != SOURCE:
        raise ValueError('今回受領した固定ビルドのmanifestではありません')
    original = check_manifest(source, manifest)
    for name in DOCUMENTS:
        if not (HERE / name).is_file():
            raise ValueError('配布用資料が不足: ' + name)
    # ビルド済みexe・DLL・PCK・ライセンスをそのままコピーし、案内だけ入れ替える。
    shutil.copytree(source, output)
    for name in DOCUMENTS:
        shutil.copy2(HERE / name, output / name)
    unchanged = []
    for name, path in original.items():
        if name != 'manifest.json' and name not in DOCUMENTS:
            if digest(output / name) != digest(path):
                raise ValueError('既存実行物が変化: ' + name)
            unchanged.append(name)
    files = [dict(path=name, bytes=path.stat().st_size, sha256=digest(path))
             for name, path in inventory(output).items() if name != 'manifest.json']
    # source_commitは実行バイナリのビルド元を維持。今回の資料改訂で偽の版にしない。
    manifest.update(task='RD-PACK-02/P5-DIR', delivery_format='directory',
        delivery_revision=args.revision, directory_name=output.name, files=files,
        reused_manifest_sha256=digest(source / 'manifest.json'),
        preparation_script_sha256=digest(Path(__file__)),
        updated_documents=list(DOCUMENTS), unchanged_file_count=len(unchanged),
        inventory_note='実行フォルダーの全ファイル。manifest自身だけは外部の受渡し記録でhashを保持。',
        verification='実行物はsource0765f158のWindows CI 36686770622と同一。案内改訂後の一覧・hashを照合。Windows11実機は未確認。')
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    check_manifest(output, manifest)
    print(json.dumps(dict(directory=str(output), source_commit=SOURCE, revision=args.revision,
        files_including_manifest=len(files) + 1, unchanged_files=len(unchanged),
        manifest_sha256=digest(output / 'manifest.json')), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
