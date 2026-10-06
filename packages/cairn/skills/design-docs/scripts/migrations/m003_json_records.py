"""Format 3: records kept as JSON, in design.json, evidence.json and meetings.json.

The records in design.md (and evidence.md and meetings.md, when a design had split them out) move to their JSON
form unchanged: same IDs, fields, options and notes. The Markdown files go; the backup keeps them. changes.md,
doc.html, the pages and components stay as they are.

Format 3 also adds what a meeting settled (Outcomes), proposals for the user to go through before anything changes,
and named figures (Facts). Older meetings have no Outcomes; check notes them, and nothing is invented for them.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def migrate(folder: Path) -> list[str]:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from jsonfmt import from_design
    from records import read_design

    design_md = folder / "design.md"
    if not design_md.exists():
        return ["no design.md; nothing to convert"]
    design = read_design(design_md)
    notes = []
    for name, content in from_design(design).items():
        if name != "design.json" and not next(iter(content.values())):
            continue
        (folder / name).write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        count = len(design.records) if name == "design.json" else len(next(iter(content.values())))
        notes.append(f"wrote {name}" + (f" ({count} record(s))" if name != "design.json" else ""))
    for name in ("design.md", "evidence.md", "meetings.md"):
        if (folder / name).exists():
            (folder / name).unlink()
            notes.append(f"removed {name} (kept in the backup)")
    meetings = [r for r in design.records if r.kind == "meeting" and r.field("Outcomes") is None]
    if meetings:
        notes.append(f"{len(meetings)} meeting(s) have no Outcomes; add them when you next take one of those meetings through, never from memory")
    return notes
