"""Create a standalone viewing copy from the canonical interaction fragment."""
from pathlib import Path

root = Path(__file__).resolve().parent
fragment = (root / 'motion.fragment.html').read_text()
head = '''<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>crossweave — 行動演出の比較 VD-001</title>
<style>
:root {color-scheme:light dark;--background:light-dark(#fcfaf5,#181b20);--foreground:light-dark(#252b30,#eee8de);--border:light-dark(#8b9399,#68747d);--viz-series-1:light-dark(#81602d,#e0c493);}
body{margin:0;padding:24px;background:var(--background);color:var(--foreground);font:16px/1.6 system-ui,sans-serif;}
main{max-width:860px;margin:0 auto;}h1{font-size:24px;font-weight:500;}p{margin:8px 0 16px;}
.viz-controls,.viz-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.form-label{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.btn,.form-select{font:inherit;padding:7px 12px;border:1px solid var(--border);border-radius:5px;background:var(--background);color:var(--foreground);cursor:pointer;}
.btn[aria-pressed="true"],.btn-primary{background:var(--foreground);color:var(--background);}
.form-check{display:inline-flex;align-items:center;gap:6px;}.text-small{font-size:14px;}.tabular-nums{font-variant-numeric:tabular-nums;}
@media(max-width:400px){body{padding:12px;}.btn,.form-select{min-height:44px;}}
</style><main><h1>行動演出の比較</h1><p>道・岩・敵への作用と、結果として残る変化を見る模式見本。画風や効果量の確定、ゲーム試遊ではありません。</p>'''
tail = '<p>探査・突破・一閃は、異なる結果の比較です。必須の三手を表しません。通常再生600ms、ゆっくり再生は3倍の時間です。音はありません。</p></main></html>'
(root / 'preview.html').write_text(head + fragment + tail)
print(root / 'preview.html')
