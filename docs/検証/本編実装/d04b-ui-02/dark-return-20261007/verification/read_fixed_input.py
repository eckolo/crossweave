"""GitHubプラグインで受領した本文だけを固定参考コピーへ保存する。

原本・既存証拠は変更しない。pathとGit blobを対応させ、不足した受領を
別画像やメタデータ一致で補わない。PNG・404ログ・artifactの取得は行わない。
"""
from pathlib import Path
import base64
import hashlib
import json

ROOT = Path(__file__).resolve().parents[6]
OUT = Path(__file__).resolve().parents[1]
payload = json.loads((ROOT / '.tools/dark-return-ui-payload.json').read_text(encoding='utf-8'))
receipt = []
for row in payload['files']:
    data = base64.b64decode(row['content'])
    blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    assert blob == row['sha']
    target = OUT / row['target_path']
    assert target.resolve().is_relative_to((OUT / 'fixed-input').resolve())
    assert not target.exists(), '固定参考を上書きしない'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    receipt.append({'source_path': row['source_path'], 'copy_path': row['target_path'],
                    'blob': blob, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
(OUT / 'fixed-input-receipt.json').write_text(json.dumps({
    'source_commit': payload['source_commit'], 'method': 'GitHubプラグイン/fetch_file(base64)',
    'files': receipt, 'tree_complete': payload['tree_complete'],
    'stopped_evidence_not_requested': True
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('固定UI本文受領・blob一致:', len(receipt), '件')
