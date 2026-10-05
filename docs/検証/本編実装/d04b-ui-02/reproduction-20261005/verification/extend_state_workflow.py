from pathlib import Path
R=Path(__file__).resolve().parents[3];p=R/'.github/workflows/d04b-ui-save-01.yml'
t=p.read_text(encoding='utf-8');old='repro-shared-return-withdrawal,repro-shared-return-defeat --review-fixtures';new='repro-shared-return-withdrawal,repro-shared-return-defeat,repro-record-memory,repro-checkbox-states --review-fixtures'
assert t.count(old)==2;t=t.replace(old,new);p.write_text(t,encoding='utf-8')
