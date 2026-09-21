"""Extract D03 inputs without changing the original input or D58 content."""
from pathlib import Path
import hashlib
import json
root = Path(__file__).resolve().parents[1]
source = root / 'docs/仕様案/接続データ/co-01a/m1-input.v0.1.json'
data = json.loads(source.read_text())
selected = {k: data[k] for k in ('affixes', 'offers')}
selected['source'] = {'path': str(source.relative_to(root)), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}
(root / 'src/content/economy.mjs').write_text('// Build-time extraction of unchanged CO-01A input 0.1. No historical modules in the browser.\nconst data='+json.dumps(selected,ensure_ascii=False,indent=2)+';\nfunction freeze(x){if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}\nexport default freeze(data);\n')
