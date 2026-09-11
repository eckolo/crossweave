from pathlib import Path
from statistics import mean
import hashlib
import json

folder = Path(__file__).resolve().parent
root = folder.parents[3]
cfg = json.loads((folder / 'conditions.json').read_text())
source = root / cfg['source']
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert digest(source) == cfg['source_sha256']
data = json.loads(source.read_text())
assert len(data['cohorts']) == 32
rows = []
for c in data['cohorts']:
    assert c['completed_expeditions'] == 8
    assert sum(c['runs'][-1]['learned'].values()) == cfg['base_learning_points_reserved']
    available = c['total_points'] * 100 + c['fractional_units'] - cfg['base_learning_points_reserved'] * 100
    direct = sum(r['gained_points'] for r in c['runs']) * 100
    sales = sum(r['sale_units'] for r in c['runs'])
    assert available == direct + sales - cfg['base_learning_points_reserved'] * 100
    rows.append({'offset': c['offset'], 'first': c['first'], 'strategy': c['strategy'],
                 'available_units': available, 'direct_reward_units': direct, 'sale_units': sales,
                 'affordable_counts': {str(p): available // (p * 100) for p in cfg['prices_points']}})
summary = []
for strategy in ['retain', 'adapt', 'combined']:
    selected = [r for r in rows if strategy == 'combined' or r['strategy'] == strategy]
    for price in cfg['prices_points']:
        counts = [r['affordable_counts'][str(price)] for r in selected]
        summary.append({'strategy': strategy, 'cohorts': len(selected), 'price_points': price,
                        'mean_available_points': mean(r['available_units'] / 100 for r in selected),
                        'mean_sale_points': mean(r['sale_units'] / 100 for r in selected),
                        'mean_affordable': mean(counts), 'minimum_affordable': min(counts),
                        'maximum_affordable': max(counts), 'unable_to_buy_one': counts.count(0)})
recycling = [{'purchase_price_points': p, 'ordinary_sale_points': cfg['example_acquired_item_sale_units'] / 100,
              'net_cost_points_if_immediately_sold': p - cfg['example_acquired_item_sale_units'] / 100,
              'effective_return_fraction_of_purchase': cfg['example_acquired_item_sale_units'] / (p * 100)}
             for p in cfg['prices_points']]
result = {'trial': 'AS1', 'base_commit': cfg['base_commit'], 'source_sha256': digest(source),
          'conditions_sha256': digest(folder / 'conditions.json'), 'analysis_sha256': digest(Path(__file__)),
          'new_expeditions': 0, 'purchases_executed': 0, 'cohorts_reanalyzed': len(rows),
          'summary': summary, 'recycling_example': recycling, 'rows': rows,
          'limits': cfg['basis']}
(folder / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'cohorts': len(rows), 'new_expeditions': 0, 'summary': summary}, ensure_ascii=False))
