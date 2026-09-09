"""Deterministic Z input streams; these are separate from the old W seed family."""
import json
from pathlib import Path
from random import Random

source = json.loads(Path(__file__).with_name('input.json').read_text())
keys = sorted(set(source['initial']['rng']) | set(source['future_rng']))
inputs = []
for seed in range(8):
    states = {key: list(Random(f'crossweave:Z:{seed}:{key}').getstate()[1])
              for key in keys}
    inputs.append({'seed': seed, 'states': states})
print(json.dumps(inputs, separators=(',', ':')))
