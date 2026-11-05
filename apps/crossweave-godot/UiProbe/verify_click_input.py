#!/usr/bin/env python3
"""フレームを分けたGodotのボタン入力回帰。専用の隔離UIスロットだけを使う。

呼出側が確認済みのGodot.NET実行体を指定し、アプリを先にビルドする。
このスクリプトは実行環境のダウンロード・設定変更・通常保存を行わない。
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import subprocess
import uuid

SCENARIOS = ["prediction", "prediction-long", "no-modal", "no-modal-long", "hover",
             "detail", "keyboard", "escape", "right", "focus", "outside", "reenter",
             "navigation", "preview", "double"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--rendered", action="store_true", help="headlessの代わりに通常画面を使う。実マウス入力の試験ではない")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    project = root / "apps/crossweave-godot/Godot"
    fixture = root / "docs/検証/本編実装/d04b-ui-02/input-fix-20261105/fixtures/attack-natural-step1.json"
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    run_id = uuid.uuid4().hex[:12]
    results = []
    for scenario in SCENARIOS:
        mode = "review-click-" + scenario
        report_path = output / (mode + ".json")
        if report_path.exists():
            raise FileExistsError(f"Use a new evidence directory; would overwrite {report_path}")
        command = [str(args.godot.resolve())]
        if not args.rendered:
            command.append("--headless")
        command += ["--path", str(project), "--", "--ui-check=" + mode,
                    "--ui-slot=click-" + run_id + "-" + scenario,
                    "--ui-output=" + str(output), "--ui-fixture=" + str(fixture)]
        with (output / (mode + ".log")).open("w", encoding="utf-8") as log:
            try:
                run = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=60)
                returncode = run.returncode
            except subprocess.TimeoutExpired:
                returncode = "timeout"
        report = json.loads(report_path.read_text()) if report_path.exists() else {}
        passed = returncode == 0 and report.get("status") == "passed"
        results.append({"scenario": scenario, "passed": passed, "returncode": returncode,
                        "checks": len(report.get("checks", [])), "report": report_path.name})
        print(scenario, "passed" if passed else "FAILED", flush=True)
    (output / "click-input-summary.json").write_text(json.dumps({"run_id": run_id,
        "physical_input": False, "windows11_physical": False, "results": results}, indent=2) + "\n")
    return 0 if all(row["passed"] for row in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
