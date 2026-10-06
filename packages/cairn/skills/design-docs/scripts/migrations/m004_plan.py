"""Format 4: the phases become the plan, deliverables P1, P2… with what each follows.

Each phase becomes a deliverable in the same order, with the same title, Scope, Exit criteria and Status; each follows
the one before it, since phases ran one after another. A phase's Effort goes: the doc is published and names no
effort, so record in each effort which deliverables it works on. A page's "## Phases" section becomes "## Plan".
Nothing is guessed: groups, the goals each deliverable serves, Jira items and links stay for the next session to add.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


def migrate(folder: Path) -> list[str]:
    path = folder / "design.json"
    if not path.exists():
        return ["no design.json; nothing to convert"]
    data = json.loads(path.read_text(encoding="utf-8"))
    notes = []
    phases = data.pop("phases", [])
    plan = []
    for number, phase in enumerate(phases, start=1):
        deliverable = {"id": f"P{number}", "title": phase.get("title", "")}
        for key, value in phase.items():
            if key in ("title", "Effort"):
                continue
            deliverable[key] = value
        if number > 1:
            deliverable["Follows"] = f"P{number - 1}"
        if phase.get("Effort"):
            notes.append(f"P{number} ({deliverable['title']}) named effort '{phase['Effort']}'; record in that effort that it works on P{number}")
        plan.append(deliverable)
    if plan:
        # The plan sits where the phases did, so the file keeps its order.
        ordered = {}
        for key, value in data.items():
            ordered[key] = value
            if key == "parts":
                ordered["plan"] = plan
        ordered.setdefault("plan", plan)
        data = ordered
        notes.append(f"turned {len(plan)} phase(s) into deliverables P1 to P{len(plan)}, each following the one before")
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for page in sorted((folder / "pages").glob("*.md")) if (folder / "pages").is_dir() else []:
        text = page.read_text(encoding="utf-8")
        changed = re.sub(r"^## Phases\s*$", "## Plan", text, flags=re.MULTILINE)
        if changed != text:
            page.write_text(changed, encoding="utf-8")
            notes.append(f"{page.name}: '## Phases' is now '## Plan'")
    return notes
