"""design.json, evidence.json and meetings.json: the records as JSON.

Each record is an object. Its identity is "id" and "title" (a meeting has "date" and "title"; a part, risk, link or cost
line has only "title"). Every other key is a field with the same name as in the Markdown form ("Status", "Recorded from"):
a string, a list of strings when the field is a list, or {"value": ..., "items": [...]} when it has both. A decision's
options are in "options"; notes for whoever works on the design next are in "notes".

The build turns these files into the Markdown form in memory and reads that, so every check and renderer is shared.
"""
from __future__ import annotations

import json
from pathlib import Path

SECTION_KEYS = [  # (json key, Markdown section)
    ("terms", "Terms"), ("facts", "Facts"), ("requirements", "Requirements"), ("parts", "Parts"), ("plan", "Plan"),
    ("decisions", "Decisions"), ("risks", "Risks"), ("costs", "Costs"), ("flows", "Flows"), ("questions", "Questions"),
    ("links", "Links"), ("jira", "Jira"), ("evidence", "Evidence"), ("meetings", "Meetings")]
PROSE_KEYS = [("problem", "Problem"), ("goals", "Goals"), ("howItWorks", "How it works")]
JSON_FILES = ("design.json", "evidence.json", "meetings.json")
IDENTITY = ("id", "title", "date", "options", "notes")


def field_lines(name: str, value, label: str) -> list[tuple[str, str]]:
    where = f"{label} › {name}"
    if isinstance(value, list) and value and all(isinstance(v, dict) for v in value):
        return [(f"- {name}:", where)] + [(f"  - {json.dumps(v, ensure_ascii=False)}", f"{where} › {v.get('n', '')}") for v in value]
    if isinstance(value, list):
        return [(f"- {name}:", where)] + [(f"  - {v}", where) for v in value]
    if isinstance(value, dict):
        return [(f"- {name}: {value.get('value', '')}".rstrip(), where)] + [(f"  - {v}", where) for v in value.get("items", [])]
    return [(f"- {name}: {value}".rstrip(), where)]


def record_lines(kind: str, rec: dict, label: str) -> list[tuple[str, str]]:
    if kind == "meetings":
        head = f"{rec.get('date', '')} · {rec.get('title', '')}"
    elif "id" in rec:
        head = f"{rec['id']} · {rec.get('title', '')}"
    else:
        head = rec.get("title", "")
    me = f"{label} › {rec.get('id') or rec.get('date') or rec.get('title', '')[:40]}"
    out = [(f"### {head}", me)]
    for name, value in rec.items():
        if name in IDENTITY:
            continue
        out += field_lines(name, value, me)
    for note in rec.get("notes", []):
        out.append((note, f"{me} › notes"))
    for opt in rec.get("options", []):
        om = f"{me} › option {opt.get('id', '')}"
        out.append((f"#### {opt.get('id', '')} · {opt.get('title', '')}", om))
        for name, value in opt.items():
            if name not in IDENTITY:
                out += field_lines(name, value, om)
        for note in opt.get("notes", []):
            out.append((note, f"{om} › notes"))
    out.append(("", me))
    return out


def to_markdown(folder: Path) -> tuple[list[str], list[str]] | None:
    """The Markdown form of a folder's JSON records, with a 'where' label for each line; None without design.json."""
    if not (folder / "design.json").exists():
        return None
    data: dict = {}
    for name in JSON_FILES:
        path = folder / name
        if path.exists():
            try:
                loaded = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as e:
                raise SystemExit(f"{name}:{e.lineno}:{e.colno}: not valid JSON: {e.msg}")
            for k, v in loaded.items():
                data.setdefault(k, v)
    lines: list[tuple[str, str]] = [(f"<!-- design-docs format {data.get('format', 2)} -->", "design.json › format"),
                                    (f"# {data.get('title', '')}", "design.json › title"), ("", "design.json"),
                                    (data.get("summary", ""), "design.json › summary"), ("", "design.json")]
    for key, section in PROSE_KEYS:
        if key in data:
            lines += [(f"## {section}", f"design.json › {key}"), ("", f"design.json › {key}")]
            lines += [(l, f"design.json › {key}") for l in str(data[key]).splitlines()] + [("", f"design.json › {key}")]
    for key, section in SECTION_KEYS:
        if key not in data:
            continue
        file = "evidence.json" if key == "evidence" else "meetings.json" if key == "meetings" else "design.json"
        label = f"{file} › {key}"
        lines += [(f"## {section}", label), ("", label)]
        value = data[key]
        if key == "terms":
            for t in value:
                pages = f" [{', '.join(t.get('pages', []))}]" if t.get("pages") else ""
                lines.append((f"- **{t.get('term', '')}**{pages}: {t.get('definition', '')}", f"{label} › {t.get('term', '')}"))
            lines.append(("", label))
        elif key == "facts":
            for k, f in value.items():
                src = f" · Source: {f['source']}" if isinstance(f, dict) and f.get("source") else ""
                val = f.get("value", "") if isinstance(f, dict) else f
                lines.append((f"- {k}: {val}{src}", f"{label} › {k}"))
            lines.append(("", label))
        elif key == "costs":
            for basis in ("Assumes", "Leaves out"):
                if basis in value:
                    lines += field_lines(basis, value[basis], label)
            lines.append(("", label))
            for rec in value.get("lines", []):
                lines += record_lines(key, rec, label)
        else:
            for rec in value:
                lines += record_lines(key, rec, label)
    return [l for l, _ in lines], [w for _, w in lines]


def from_design(design) -> dict[str, dict]:
    """The JSON form of a parsed Markdown design: {file name: content}."""
    def fval(f):
        if f.items and all(i.startswith("{") for i in f.items):
            try:
                return [json.loads(i) for i in f.items]
            except json.JSONDecodeError:
                pass
        if f.items and f.value:
            return {"value": f.value, "items": f.items}
        return f.items if f.items else f.value

    def rec(r, kind):
        out: dict = {}
        if kind == "meeting":
            out["date"], out["title"] = r.id.removeprefix("meeting-"), r.title
        elif kind in ("requirement", "decision", "question", "evidence", "flow", "deliverable", "jira"):
            out["id"], out["title"] = r.id, r.title
        else:
            out["title"] = r.title
        for name, f in r.fields.items():
            out[name] = fval(f)
        if r.body:
            out["notes"] = r.body
        if r.options:
            out["options"] = []
            for o in r.options:
                opt = {"id": o.id, "title": o.title} | {name: fval(f) for name, f in o.fields.items()}
                if o.body:
                    opt["notes"] = o.body
                out["options"].append(opt)
        return out

    design_json: dict = {"format": 2, "title": design.title, "summary": design.dek}
    for key, prose in (("problem", "problem"), ("goals", "goals"), ("howItWorks", "how-it-works")):
        if prose in design.prose:
            design_json[key] = "\n".join(design.prose[prose]).strip()
    if design.terms:
        design_json["terms"] = [{"term": t.name, "pages": t.pages, "definition": t.text} for t in design.terms]
    if design.facts:
        design_json["facts"] = {k: ({"value": v, "source": design.fact_sources[k]} if design.fact_sources.get(k) else {"value": v})
                                for k, (v, _line) in design.facts.items()}
    order = ["requirement", "part", "deliverable", "decision", "risk", "cost", "flow", "question", "link", "jira"]
    keys = {"requirement": "requirements", "part": "parts", "deliverable": "plan", "decision": "decisions", "risk": "risks",
            "cost": "costs", "flow": "flows", "question": "questions", "link": "links", "jira": "jira"}
    for kind in order:
        records = [rec(r, kind) for r in design.of(kind)]
        if kind == "cost":
            if records or design.cost_basis:
                costs = {name: fval(f) for name, f in design.cost_basis.items()}
                costs["lines"] = records
                design_json["costs"] = costs
        elif records:
            design_json[keys[kind]] = records
    files = {"design.json": design_json,
             "evidence.json": {"evidence": [rec(r, "evidence") for r in design.of("evidence")]},
             "meetings.json": {"meetings": [rec(r, "meeting") for r in design.of("meeting")]}}
    return files
