"""AK1: budget arithmetic, not a combat simulation or a measure of fun."""
from hashlib import sha256
from itertools import combinations
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def affordable(costs, budget):
    return [
        list(ids)
        for size in range(len(costs) + 1)
        for ids in combinations(range(len(costs)), size)
        if sum(costs[i] for i in ids) <= budget
    ]


def main():
    source = (HERE / "入力.json").read_bytes()
    cfg = json.loads(source)
    baseline_bytes = (ROOT / cfg["baseline_source"]).read_bytes()
    if sha256(baseline_bytes).hexdigest() != cfg["baseline_sha256"]:
        raise ValueError("Fixed AH input hash changed")
    baseline = json.loads(baseline_bytes)
    costs = [v["cost"] for v in baseline["skills"].values()]
    if costs != cfg["stages"][0]["costs"]:
        raise ValueError("Baseline cost assumptions changed")

    aj_path = ROOT / cfg["aj_verification_source"]
    aj = json.loads(aj_path.read_text())
    html_hash = sha256((aj_path.parent / "crossweave-journey.html").read_bytes()).hexdigest()
    if html_hash != cfg["aj_html_sha256"] or aj["html_sha256"] != html_hash:
        raise ValueError("Fixed AJ distribution hash changed")
    # These are the recorded consecutive A→C returns, with spending restored.
    # The separate B and death fixtures are not appended to that same journey.
    a, c = aj["runs"][:2]
    if (a["route"], c["route"], a["outcome"], c["outcome"]) != ("A", "C", "clear", "clear"):
        raise ValueError("Recorded AJ sequence changed")
    acquired = a["points"] + c["points"]

    rows = []
    cap = cfg["comparison_total_budget_cap"]
    for stage in cfg["stages"]:
        for earned in stage["budgets"]:
            for mode in ("no_cap", "total_budget_cap_example"):
                budget = earned if mode == "no_cap" else min(earned, cap)
                sets = affordable(stage["costs"], budget)
                rows.append({
                    "stage": stage["id"], "mode": mode,
                    "earned_total": earned, "usable_budget": budget,
                    "candidate_count": len(stage["costs"]),
                    "all_cost": sum(stage["costs"]),
                    "max_simultaneous_learned": max(map(len, sets)),
                    "can_learn_all": budget >= sum(stage["costs"]),
                    "points_beyond_cap": earned - budget,
                })

    fixture = cfg["allocation_example"]
    if fixture["spent"] + fixture["liquid"] != fixture["earned_total"]:
        raise ValueError("Invalid allocation example")
    usable = min(fixture["earned_total"], cap)
    before = {"spent": fixture["spent"], "liquid": fixture["liquid"],
              "additional_spendable": usable - fixture["spent"]}
    refund = fixture["spent"]
    after = {"spent": 0, "liquid": fixture["liquid"] + refund,
             "additional_spendable": usable}
    result = {
        "trial": cfg["trial"], "base_commit": cfg["base_commit"],
        "input_sha256": sha256(source).hexdigest(),
        "calculator_sha256": sha256(Path(__file__).read_bytes()).hexdigest(),
        "fixed_baseline_sha256": cfg["baseline_sha256"], "fixed_aj_html_sha256": html_hash,
        "aj_recorded_A_C": {"source": cfg["aj_verification_source"],
            "status": "existing automated DOM record, not a new playthrough",
            "earned_total": acquired, "all_cost": sum(costs),
            "points_to_all": max(0, sum(costs) - acquired)},
        "rows": rows,
        "cap_and_refund_example": {"cap": cap, "before": before,
            "refunded": refund, "after": after,
            "unused_reserve": fixture["earned_total"] - usable,
            "note": "Reserve is one comparison option; overflow reward policy remains undecided"},
        "limits": cfg["limits"],
    }
    (HERE / "結果.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"rows": len(rows), "aj_earned_total": acquired,
                      "aj_points_to_all": result["aj_recorded_A_C"]["points_to_all"],
                      "cap_refund_preserves_total": before["spent"] + before["liquid"] == after["spent"] + after["liquid"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
