#!/usr/bin/env python3
"""個別Markdownを正本として索引を更新する。Python標準ライブラリのみ使用。"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
CATEGORIES = {
    "LOC": "異界",
    "ENT": "敵・存在",
    "NPC": "人物・組織",
    "OBJ": "環境・オブジェクト",
    "EVT": "イベント・依頼",
    "CRD": "札",
    "KNW": "心得",
    "MOD": "修飾",
    "CUL": "文化・生業",
    "HIS": "歴史・伝承",
}
STATUSES = {"案", "検討中", "採用", "見送り", "統合"}
SCOPES = {"描写案", "既存接続案", "新効果案"}
BEGIN = "<!-- related:start -->"
END = "<!-- related:end -->"
REQUIRED = {"id", "name", "category", "status", "origins", "tags", "related", "scope", "summary"}


def load_entries():
    entries = []
    seen = set()
    for path in sorted(ROOT.glob("*/WB-*.md")):
        content = path.read_text(encoding="utf-8")
        if not content.startswith("---\n") or "\n---\n" not in content[4:]:
            raise ValueError(f"{path.name}: front matter がありません")
        raw, body = content[4:].split("\n---\n", 1)
        data = {}
        for line in raw.splitlines():
            key, sep, value = line.partition(": ")
            if not sep or key in data:
                raise ValueError(f"{path.name}: 重複キーまたは不正な行: {line}")
            data[key] = json.loads(value)
        if set(data) != REQUIRED:
            raise ValueError(f"{path.name}: 必須項目との差分 {set(data) ^ REQUIRED}")
        for key in REQUIRED - {"origins", "tags", "related"}:
            if not isinstance(data[key], str) or not data[key].strip():
                raise ValueError(f"{path.name}: {key} は空でない文字列にしてください")
        for key in ("origins", "tags", "related"):
            value = data[key]
            if not isinstance(value, list) or any(not isinstance(x, str) or not x for x in value):
                raise ValueError(f"{path.name}: {key} は文字列の配列にしてください")
            if len(set(value)) != len(value):
                raise ValueError(f"{path.name}: {key} に重複があります")
        match = re.fullmatch(r"WB-([A-Z]{3})-([0-9]{3,})", data["id"])
        if not match or match[1] not in CATEGORIES:
            raise ValueError(f"{path.name}: 不正なID")
        if data["id"] in seen:
            raise ValueError(f"重複ID: {data['id']}")
        seen.add(data["id"])
        if path.parent.name != CATEGORIES[match[1]] or data["category"] != path.parent.name:
            raise ValueError(f"{path.name}: ID・分類・格納先が不一致")
        if not path.name.startswith(data["id"] + "_"):
            raise ValueError(f"{path.name}: ファイル名はID_名称.mdにしてください")
        if data["status"] not in STATUSES or data["scope"] not in SCOPES:
            raise ValueError(f"{path.name}: 状態または接続区分が不正")
        if not data["origins"] or not data["tags"]:
            raise ValueError(f"{path.name}: 由来とタグを少なくとも一つ指定してください")
        if f"# {data['name']}\n" not in body:
            raise ValueError(f"{path.name}: 見出しと名称が不一致")
        for heading in ("## 具体像", "## 活かし方・接続案", "## 検討メモ"):
            if heading not in body:
                raise ValueError(f"{path.name}: {heading} がありません")
        if content.count(BEGIN) != 1 or content.count(END) != 1 or content.index(BEGIN) > content.index(END):
            raise ValueError(f"{path.name}: 関連案の生成マーカーが不正")
        data.update(path=path.relative_to(ROOT).as_posix(), _content=content)
        entries.append(data)
    if not entries:
        raise ValueError("個別案がありません")
    rank = {key: i for i, key in enumerate(CATEGORIES)}
    entries.sort(key=lambda e: (rank[e["id"].split("-")[1]], int(e["id"].split("-")[2])))
    lookup = {e["id"]: e for e in entries}
    incoming = defaultdict(list)
    for e in entries:
        for target in e["related"]:
            if target not in lookup or target == e["id"]:
                raise ValueError(f"{e['id']}: 存在しない参照または自己参照 {target}")
            incoming[target].append(e["id"])
    for e in entries:
        e["referenced_by"] = incoming[e["id"]]
    return entries, lookup


def cell(text):
    return str(text).replace("|", "\\|").replace("\n", " ")


def link(entry, prefix=""):
    return f"[{entry['id']} {entry['name']}]({prefix}{entry['path']})"


def generated_files(entries, lookup):
    outputs = {}
    header = "<!-- 自動生成：個別案を編集し、索引更新.py を実行してください。 -->\n\n"
    counts = Counter(e["category"] for e in entries)
    public_entries = [{k: v for k, v in e.items() if not k.startswith("_")} for e in entries]
    payload = {
        "schema_version": 1,
        "source": "分類別ディレクトリの個別Markdown。索引の直接編集は行わない。",
        "count": len(entries),
        "categories": {v: counts[v] for v in CATEGORIES.values()},
        "entries": public_entries,
    }
    outputs[ROOT / "総合索引.json"] = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    overview = [header + "# 件数・状態一覧\n", "[入口へ戻る](README.md)\n",
                "| 分類 | 件数 |", "|---|---:|"]
    for category in CATEGORIES.values():
        overview.append(f"| [{category}]({category}/README.md) | {counts[category]} |")
        group = [e for e in entries if e["category"] == category]
        lines = [header + f"# {category}\n", f"{len(group)}件。[入口](../README.md)／[関連索引](../関連索引.md)\n",
                 "| ID・名称 | 概要 | 状態 | 接続区分 |", "|---|---|---|---|"]
        for e in group:
            target = Path(e["path"]).name
            lines.append(f"| [{e['id']} {e['name']}]({target}) | {cell(e['summary'])} | {e['status']} | {e['scope']} |")
        outputs[ROOT / category / "README.md"] = "\n".join(lines) + "\n"
    overview += [f"| 合計 | {len(entries)} |", "", "## 状態\n", "| 状態 | 件数 |", "|---|---:|"]
    status_counts = Counter(e["status"] for e in entries)
    overview += [f"| {s} | {status_counts[s]} |" for s in ("案", "検討中", "採用", "見送り", "統合")]
    overview += ["", "## 接続区分\n", "| 区分 | 件数 |", "|---|---:|"]
    scope_counts = Counter(e["scope"] for e in entries)
    overview += [f"| {s} | {scope_counts[s]} |" for s in ("描写案", "既存接続案", "新効果案")]
    outputs[ROOT / "件数・状態一覧.md"] = "\n".join(overview) + "\n"
    for field, title in (("tags", "テーマ索引"), ("origins", "由来索引")):
        groups = defaultdict(list)
        for e in entries:
            for value in e[field]:
                groups[value].append(e)
        lines = [header + f"# {title}\n", "[入口へ戻る](README.md)\n"]
        if field == "origins":
            lines += ["ここでの由来は着想・背景の分類です。ゲーム中の札が持つ由来情報や、属性の分類とは別です。\n"]
        lines += ["| 分類語 | 件数 | 該当案 |", "|---|---:|---|"]
        for value, group in sorted(groups.items()):
            lines.append(f"| {cell(value)} | {len(group)} | " + "／".join(link(e) for e in group) + " |")
        outputs[ROOT / f"{title}.md"] = "\n".join(lines) + "\n"
    related = [header + "# 関連索引\n", "[入口へ戻る](README.md)\n",
               "関連は着想や検討の接点です。地理的な直結、同時採用、必須の取得順を意味しません。\n"]
    for e in entries:
        outgoing = "／".join(link(lookup[x]) for x in e["related"]) or "なし"
        incoming = "／".join(link(lookup[x]) for x in e["referenced_by"]) or "なし"
        related += [f"## {e['id']}\n", f"{link(e)}\n", f"関連先：{outgoing}\n", f"この案を参照：{incoming}\n"]
        block = "\n\n## 関連案\n\n"
        block += "\n".join(f"- {link(lookup[x], '../')}" for x in e["related"]) or "関連先は未登録。"
        block += f"\n\n[この案を参照する項目](../関連索引.md#{e['id'].lower()})／[分類の索引](README.md)／[全体の入口](../README.md)\n\n"
        before, tail = e["_content"].split(BEGIN, 1)
        _, after = tail.split(END, 1)
        outputs[ROOT / e["path"]] = before + BEGIN + block + END + after
    outputs[ROOT / "関連索引.md"] = "\n".join(related).rstrip() + "\n"
    return outputs


def validate_links(outputs):
    # 新規生成予定のファイルも解決対象に含め、--checkでファイルを変更せず確認する。
    planned = {p.resolve() for p in outputs}
    sources = {p: p.read_text(encoding="utf-8") for p in ROOT.rglob("*.md")}
    sources.update({p: s for p, s in outputs.items() if p.suffix == ".md"})
    for path, content in sources.items():
        for href in re.findall(r"\]\(([^)]+)\)", content):
            if re.match(r"[a-z]+://", href) or href.startswith("#"):
                continue
            target = (path.parent / href.split("#", 1)[0]).resolve()
            if not target.exists() and target not in planned:
                raise ValueError(f"{path.name}: リンク先がありません: {href}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="ファイルを変更せず索引の一致と参照を検査する")
    args = parser.parse_args()
    try:
        entries, lookup = load_entries()
        outputs = generated_files(entries, lookup)
        validate_links(outputs)
        changed = [p for p, text in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
        if args.check and changed:
            for p in changed:
                print(f"要更新: {p.relative_to(ROOT)}", file=sys.stderr)
            return 1
        if not args.check:
            for p in changed:
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(outputs[p], encoding="utf-8")
        print(f"{len(entries)}件 / {len(CATEGORIES)}分類 / 関連{sum(len(e['related']) for e in entries)}本。"
              f"{'索引・参照の検査完了' if args.check else str(len(changed)) + 'ファイル更新'}。")
        return 0
    except (ValueError, OSError) as exc:
        print(f"検査エラー: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
