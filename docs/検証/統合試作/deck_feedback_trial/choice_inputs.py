"""AH streams are independent of historical Z and include the new V2 actor."""
import json
from pathlib import Path
from random import Random

cfg = json.loads(Path(__file__).with_name('choice_inputs.json').read_text())
keys = [f'{actor}|{purpose}' for actor in ['P', 'V0', 'V1', 'V2', 'E1']
        for purpose in ['initial', 'allocation', 'generation', 'selection', 'target']]
print(json.dumps([{'seed': seed, 'states': {
    key: list(Random(f'{cfg["seed_namespace"]}:{seed}:{key}').getstate()[1])
    for key in keys}} for seed in cfg['seeds']], separators=(',', ':')))
