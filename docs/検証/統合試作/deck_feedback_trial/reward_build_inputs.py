"""AI reuses AH seeds 0-7 for comparison, and adds previously unused 8-15."""
import json
from pathlib import Path
from random import Random

cfg = json.loads(Path(__file__).with_name('reward_build_inputs.json').read_text())
keys = [f'{actor}|{purpose}' for actor in ['P', 'V0', 'V1', 'V2', 'E1']
        for purpose in ['initial', 'allocation', 'generation', 'selection', 'target']]
print(json.dumps([{'seed': seed, 'states': {
    key: list(Random(f'{cfg["seed_namespace"]}:{seed}:{key}').getstate()[1])
    for key in keys}} for seed in cfg['main_seeds'] + cfg['unseen_seeds']], separators=(',', ':')))
