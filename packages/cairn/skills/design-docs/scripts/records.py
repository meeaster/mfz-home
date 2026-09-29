"""Read a design's records (design.md and changes.md) and render them as page HTML.

design.md holds what the design has established: the problem, goals and how it
works in prose, then terms, requirements, parts, phases, decisions with their
options, risks, open questions, evidence and meetings.
Pages pull tables from it with placeholders such as

    <!-- records decisions -->
    <!-- records requirements page=s3-archive -->
    <!-- records decisions-rail ids=D6,D5 -->
    <!-- records reasoning ids=D1 -->
    <!-- records questions blocks=D1,D2 -->
    <!-- records progress -->

Every record is defined once, on the overview (or the first page when a doc
has none), and every other page refers to it. A record lives on one page: a
requirement, part, decision or risk on its Page, a question with the things it
blocks. The overview gathers every record, grouped by where it lives, and an
area page shows its own records and those from elsewhere that reach it.

The rendered markup is what doc.js expects: every requirement, decision,
question and evidence row is a definition that reference cards are built from.
A field named "Recorded from" is private: it says where the record came from
(a session, a meeting, a local file) and is never rendered.
"""

from __future__ import annotations

import datetime as dt
import html as htmllib
import re
from dataclasses import dataclass, field
from pathlib import Path

# The format a design folder is written in: design.md's first line says "<!-- design-docs format 2 -->".
# doc.py migrate brings an older folder up to date; a folder with no line is format 1 (pages written in HTML).
FORMAT = 2
FORMAT_LINE = re.compile(r"^<!--\s*design-docs format (\d+)\s*-->\s*$")

SECTIONS = {
    "terms": "term",
    "requirements": "requirement",
    "parts": "part",
    "decisions": "decision",
    "risks": "risk",
    "costs": "cost",
    "flows": "flow",
    "questions": "question",
    "evidence": "evidence",
    "meetings": "meeting",
    "phases": "phase",
}
# Prose sections an agent reads to understand the design; a page shows them with the design-section component.
PROSE_SECTIONS = {"problem": "problem", "goals": "goals", "how it works": "how-it-works"}
PREFIX = {"requirement": "R", "decision": "D", "question": "Q", "evidence": "E"}
ID_TOKEN = re.compile(r"^[EQDR]\d+$")
FLOW_ID = re.compile(r"^[A-Z][A-Z0-9]*-F\d+$")
MENTION = re.compile(r"(?<![\w#/\\-])([EQDR]\d+)\b")
ESCAPED = re.compile(r"\\([EQDR]\d+)\b")
LINK = re.compile(r"\[([^\]]+)\]\((#[\w.-]+)\)")
PLACEHOLDER = re.compile(r"<!--\s*records\s+([\w-]+)((?:\s+[\w-]+=[^\s>]+)*)\s*-->")
MONEY = re.compile(r"\$([\d,]+(?:\.\d+)?)(?:\s*(?:→|->)\s*\$([\d,]+(?:\.\d+)?))?")
MEETING_HEAD = re.compile(r"^(\d{4}-\d{2}-\d{2})$")
CHANGE_HEAD = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s+·\s+(.+?)\s*$")

REQUIRED = {
    "requirement": ["Priority", "Why", "Source"],
    "decision": ["Status"],
    "question": ["Who"],
    "evidence": ["Found", "How we know", "Gathered from"],
    "meeting": ["Status"],
    "part": ["Does"],
    "risk": ["Likelihood"],
    "cost": ["Monthly"],
    "flow": ["Data", "Crosses", "Assessment"],
    "phase": ["Scope", "Exit criteria", "Status"],
}
ANSWER_LABELS = ("Answer", "Leaning", "For now", "Assuming", "So far")
DECISION_STATUS = {"open": "open", "leaning": "leaning", "decided": "decided", "later": "", "given": ""}
# Option statuses, and the class an option card carries for each. Set aside and Not chosen take a date.
OPTION_STATUS = {"current leaning": "leaning", "chosen": "chosen", "not chosen": "not-chosen", "set aside": "", "found in research": "", "not designed yet": ""}
OPTION_PILL = {"current leaning": "leaning", "chosen": "decided"}
WHY_LIMIT = 240
# How far a decision has got, for progress: Given counts as settled.
DECISION_STATE = {"open": "open", "leaning": "leaning", "later": "later", "decided": "decided", "given": "decided"}
UNSETTLED = ("open", "leaning", "later")
MEETING_STATUS = {"awaiting review": "open", "summarised": ""}
PHASE_STATUS = {"planned": "", "in progress": "leaning", "done": "decided"}
LIKELIHOOD = {"high": "open", "medium": "open", "low": "", "unknown": ""}
VERDICT = {"yes": "yes", "partly": "partly", "no": "no"}
PRIORITY = {"must": "badge", "should": "badge outline"}
WHO_KINDS = {"me": "Me", "our team": "Our team", "other team": "Other team", "vendor": "Vendor"}
PRIVATE = "recorded from"
LOCAL_PATH_PATTERNS = [
    (re.compile(r"file://", re.I), "file:// URL"),
    (re.compile(r"(?<![\w.])/(?:home|Users|mnt|tmp)/[\w.-]+"), "absolute local path"),
    (re.compile(r"\b[A-Z]:\\[\w\\. -]+"), "Windows path"),
    (re.compile(r"\\\\wsl"), "WSL path"),
    (re.compile(r"(?<![\w/])~/[\w.-]+"), "home-relative path"),
]


@dataclass
class Field:
    value: str
    items: list[str]
    line: int


@dataclass
class Record:
    kind: str
    id: str
    title: str
    line: int
    fields: dict[str, Field] = field(default_factory=dict)
    options: list[Record] = field(default_factory=list)
    body: list[str] = field(default_factory=list)

    def get(self, key: str) -> str:
        found = self.field(key)
        return found.value if found else ""

    def field(self, key: str) -> Field | None:
        wanted = key.lower()
        for name, value in self.fields.items():
            if name.lower() == wanted:
                return value
        return None

    def items(self, key: str) -> list[str]:
        found = self.field(key)
        return found.items if found else []


@dataclass
class Term:
    name: str
    pages: list[str]
    text: str
    line: int


@dataclass
class Change:
    date: str
    source: str
    items: list[str]
    line: int


@dataclass
class Design:
    path: Path
    title: str = ""
    dek: str = ""
    terms: list[Term] = field(default_factory=list)
    prose: dict[str, list[str]] = field(default_factory=dict)
    records: list[Record] = field(default_factory=list)
    changes: list[Change] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def of(self, kind: str) -> list[Record]:
        return [r for r in self.records if r.kind == kind]

    def by_id(self) -> dict[str, Record]:
        return {r.id: r for r in self.records}

    def where(self, line: int) -> str:
        return f"{self.path.name}:{line}"


# Reading


def read_design(path: Path) -> Design:
    design = Design(path)
    section: str | None = None
    record: Record | None = None
    option: Record | None = None
    last: Field | None = None
    prose: list[str] = []
    title_seen = False

    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.rstrip()
        stripped = line.strip()

        if line.startswith("# ") and not title_seen:
            design.title = line[2:].strip()
            title_seen = True
            continue
        if line.startswith("## "):
            name = line[3:].strip().lower()
            section = SECTIONS.get(name)
            record = option = last = None
            if name in PROSE_SECTIONS:
                section = "prose"
                prose = design.prose.setdefault(PROSE_SECTIONS[name], [])
                continue
            if section is None:
                design.warnings.append(f"{design.where(number)}: section '{line[3:].strip()}' isn't a records section; nothing in it is rendered")
            continue
        if section == "prose":
            prose.append(line)
            continue
        if section is None:
            if title_seen and stripped and not design.dek and not stripped.startswith(("-", "#")):
                design.dek = stripped
            continue

        if section == "term":
            if stripped.startswith("- "):
                term = read_term(stripped[2:], number, design)
                if term:
                    design.terms.append(term)
            continue

        if line.startswith("### "):
            record = read_heading(section, line[4:].strip(), number, design)
            design.records.append(record)
            option = last = None
            continue
        if line.startswith("#### "):
            if record is None or record.kind != "decision":
                design.errors.append(f"{design.where(number)}: options (####) belong under a decision")
                continue
            letter, _, name = line[5:].strip().partition(" · ")
            option = Record("option", letter.strip(), name.strip(), number)
            record.options.append(option)
            last = None
            continue

        target = option or record
        if target is None:
            if stripped:
                design.warnings.append(f"{design.where(number)}: text before the first ### item is ignored")
            continue

        field_match = re.match(r"^- ([^:]+?):(?:\s+(.*))?$", line)
        if field_match:
            last = Field((field_match.group(2) or "").strip(), [], number)
            target.fields[field_match.group(1).strip()] = last
            continue
        item_match = re.match(r"^\s{2,}- (.+)$", line)
        if item_match and last is not None:
            last.items.append(item_match.group(1).strip())
            continue
        if stripped:
            target.body.append(stripped)
            last = None

    changes_path = path.parent / "changes.md"
    if changes_path.exists():
        design.changes = read_changes(changes_path, design)
    return design


def read_format(path: Path) -> int:
    first = path.read_text(encoding="utf-8").split("\n", 1)[0] if path.exists() else ""
    found = FORMAT_LINE.match(first)
    return int(found.group(1)) if found else 1


def write_format(path: Path, number: int) -> None:
    text = path.read_text(encoding="utf-8")
    first, _, rest = text.partition("\n")
    body = rest if FORMAT_LINE.match(first) else text
    path.write_text(f"<!-- design-docs format {number} -->\n{body}", encoding="utf-8")


def read_term(text: str, number: int, design: Design) -> Term | None:
    match = re.match(r"^\*\*(.+?)\*\*\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$", text)
    if not match:
        design.errors.append(f"{design.where(number)}: write a term as '- **Term** [page, page]: definition'")
        return None
    pages = [p.strip() for p in (match.group(2) or "").split(",") if p.strip()]
    return Term(match.group(1).strip(), pages, match.group(3).strip(), number)


def read_heading(kind: str, text: str, number: int, design: Design) -> Record:
    if kind in PREFIX:
        ident, sep, title = text.partition(" · ")
        ident = ident.strip()
        if not sep or not re.fullmatch(rf"{PREFIX[kind]}\d+", ident):
            design.errors.append(f"{design.where(number)}: a {kind} heading is '### {PREFIX[kind]}<n> · <text>'; got '{text}'")
        return Record(kind, ident, title.strip(), number)
    if kind == "flow":
        ident, sep, title = text.partition(" · ")
        if not sep or not FLOW_ID.match(ident.strip()):
            design.errors.append(f"{design.where(number)}: a flow heading is '### <view>-F<n> · <from> → <to>', such as 'B-F2 · Syslog server → OPW workers'; got '{text}'")
        return Record(kind, ident.strip(), title.strip(), number)
    if kind == "meeting":
        date, sep, title = text.partition(" · ")
        if not sep or not MEETING_HEAD.match(date.strip()):
            design.errors.append(f"{design.where(number)}: a meeting heading is '### YYYY-MM-DD · <title>'; got '{text}'")
        return Record(kind, f"meeting-{date.strip()}", title.strip(), number)
    return Record(kind, text, text, number)


def read_changes(path: Path, design: Design) -> list[Change]:
    changes: list[Change] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if line.startswith("## "):
            match = CHANGE_HEAD.match(line)
            if not match:
                design.errors.append(f"{path.name}:{number}: a change heading is '## YYYY-MM-DD · <source>'; got '{line}'")
                continue
            changes.append(Change(match.group(1), match.group(2), [], number))
        elif line.startswith("- ") and changes:
            changes[-1].items.append(line[2:].strip())
    return changes


# Checking


def check_design(design: Design, pages: dict[str, dict] | None, anchors: dict[str, str] | None) -> None:
    """Check the records on their own, and against the doc's pages when there are any."""
    known = design.by_id()
    seen: dict[str, int] = {}

    for record in design.records:
        if record.id in seen and record.kind in PREFIX | {"meeting": "", "flow": ""}:
            design.errors.append(f"{design.where(record.line)}: duplicate id '{record.id}' (first at line {seen[record.id]})")
        seen.setdefault(record.id, record.line)

        for key in REQUIRED.get(record.kind, []):
            if record.field(key) is None:
                design.errors.append(f"{design.where(record.line)}: {record.kind} '{record.id}' has no '{key}'")

        status = record.get("Status")
        if record.kind == "decision" and status and status.split()[0].lower() not in DECISION_STATUS:
            design.errors.append(f"{design.where(record.line)}: decision status '{status}'; use Open, Leaning <option>, Decided, Later or Given")
        if record.kind == "question":
            check_question(record, design)
        if record.kind == "meeting" and status and status.lower() not in MEETING_STATUS:
            design.errors.append(f"{design.where(record.line)}: meeting status '{status}'; use Awaiting review or Summarised. The doc records meetings that happened, not the next one")
        if record.kind == "meeting" and record.field("Agenda"):
            design.warnings.append(f"{design.where(record.field('Agenda').line)}: meeting '{record.id}' has an 'Agenda'; the doc records meetings that happened, and an agenda is drafted when someone asks")
        if record.kind == "phase" and status and status.lower() not in PHASE_STATUS:
            design.errors.append(f"{design.where(record.line)}: phase status '{status}'; use Planned, In progress or Done")
        if record.kind == "requirement" and record.get("Priority").lower() not in PRIORITY:
            design.errors.append(f"{design.where(record.line)}: priority '{record.get('Priority')}'; use Must or Should")
        if record.kind == "decision":
            check_decision(record, design)
        if record.kind == "cost":
            check_cost(record, design)
        if record.kind == "flow":
            for key in ("Crosses", "Assessment"):
                found = record.field(key)
                if found and not parse_met(found.value):
                    design.errors.append(f"{design.where(found.line)}: write a flow's '{key}' as 'Yes|Partly|No · words [E1, Q2]'")
        if record.kind == "question" and not who(record.get("Who"))[0]:
            design.errors.append(f"{design.where(record.line)}: question '{record.id}' needs someone who can answer it")
        for name, value in record.fields.items():
            if name.lower().startswith("met") and value.value and not parse_met(value.value):
                design.errors.append(f"{design.where(value.line)}: write '{name}' as 'Yes|Partly|No · how [E1, D2]'")

        for text, line in record_texts(record):
            for pattern, label in LOCAL_PATH_PATTERNS:
                found = pattern.search(text)
                if found:
                    design.errors.append(f"{design.where(line)}: {label} would be published: '{found.group(0)}'. Keep it in 'Recorded from'")
            for ident in MENTION.findall(text):
                if ident not in known:
                    design.errors.append(f"{design.where(line)}: '{ident}' is mentioned, but no record has that id")

        if pages is not None:
            for key in ("Page", "Applies to", "Designed on"):
                found = record.field(key)
                for page in split_list(found.value) if found else []:
                    if page not in pages:
                        design.errors.append(f"{design.where(found.line)}: '{key}' names page '{page}', which isn't in the doc")
            for name, value in record.fields.items():
                if name.lower().startswith("met on "):
                    page = name[7:].strip()
                    if page not in pages:
                        design.errors.append(f"{design.where(value.line)}: '{name}' names page '{page}', which isn't in the doc")
            for key in ("Worked out in", "Decided in"):
                worked = record.field(key)
                if not worked or anchors is None:
                    continue
                target = worked.value
                if target.startswith("meeting-"):
                    if target not in known:
                        design.errors.append(f"{design.where(worked.line)}: '{key}' names '{target}', which isn't a meeting in the records")
                elif re.fullmatch(r"[a-z0-9][a-z0-9-]*", target) and target not in pages and target not in anchors:
                    design.errors.append(f"{design.where(worked.line)}: '{key}' names '{target}', which isn't a page or a section on one")

    if pages is not None:
        for term in design.terms:
            for page in term.pages:
                if page not in pages:
                    design.errors.append(f"{design.where(term.line)}: term '{term.name}' names page '{page}', which isn't in the doc")

    check_waiting(design)

    meetings = {r.id for r in design.of("meeting")}
    for change in design.changes:
        if change.source.startswith("meeting ") and f"meeting-{change.source[8:].strip()}" not in meetings:
            design.warnings.append(f"changes.md:{change.line}: change source '{change.source}' has no meeting in design.md")
        if change.source.startswith("email") and not re.match(r"^email \d{4}-\d{2}-\d{2} · \S", change.source):
            design.warnings.append(f"changes.md:{change.line}: write an email source as 'email YYYY-MM-DD · <sender>'; got '{change.source}'")


def parse_money(text: str) -> tuple[float, float] | None:
    """'$36' -> (36, 36); '$3 → $39' -> (3, 39), for a cost that grows; anything else is unknown."""
    match = MONEY.fullmatch(text.strip())
    if not match:
        return None
    low = float(match.group(1).replace(",", ""))
    return low, float(match.group(2).replace(",", "")) if match.group(2) else low


def cost_amounts(record: Record) -> dict[str, tuple[float, float] | None]:
    """A cost's monthly figure under '', or one per option ('A $0 · B $36') when it varies with a decision."""
    monthly = record.get("Monthly")
    if not record.get("Varies with"):
        return {"": parse_money(monthly)}
    amounts: dict[str, tuple[float, float] | None] = {}
    for part in monthly.split("·"):
        letter, _, amount = part.strip().partition(" ")
        amounts[letter] = parse_money(amount)
    return amounts


def check_cost(record: Record, design: Design) -> None:
    where = design.where(record.line)
    monthly = record.get("Monthly")
    varies = record.get("Varies with")
    if not varies:
        if parse_money(monthly) is None and not MENTION.search(monthly) and "per use" not in monthly.lower():
            design.errors.append(f"{where}: cost '{record.title}': write Monthly as '$36', '$3 → $39' for one that grows, or 'unknown (Q8)'")
        return
    decision = design.by_id().get(varies)
    if decision is None or decision.kind != "decision":
        design.errors.append(f"{where}: cost '{record.title}' varies with '{varies}', which isn't a decision")
        return
    amounts = cost_amounts(record)
    letters = [o.id for o in decision.options if option_state(o) != "set aside"]
    if sorted(amounts) != sorted(letters):
        design.errors.append(f"{where}: cost '{record.title}' varies with {varies}; give Monthly for each of its options as '{' · '.join(f'{letter} $0' for letter in letters)}'")


def option_state(option: Record) -> str:
    """The option's status without its date: 'set aside Sep 22' -> 'set aside'."""
    status = option.get("Status").lower()
    return next((s for s in OPTION_STATUS if status.startswith(s)), status)


def design_model(design: Design) -> dict:
    """The records as data for components and bindings: fields, plus the state each is in.

    Only E, Q, D and R records, and never the private Recorded from field or notes,
    since the model is published inside the built doc.
    """
    records: dict[str, dict] = {}

    for r in design.records:
        if not ID_TOKEN.match(r.id):
            continue
        fields = {name: (f.items or f.value) for name, f in r.fields.items() if name.lower() != PRIVATE}
        entry: dict = {"kind": r.kind, "title": r.title, "fields": fields, "options": [], "leaning": None, "chosen": None, "answer": ""}

        if r.kind == "decision":
            status = (r.get("Status") or "Open").split()
            entry["state"] = DECISION_STATE.get(status[0].lower(), "open")
            entry["states"] = ["open", "leaning", "later", "decided"]
            entry["options"] = [
                {"id": o.id, "title": o.title, "status": option_state(o), "statusText": o.get("Status"), "fields": {n: (f.items or f.value) for n, f in o.fields.items() if n.lower() != PRIVATE}}
                for o in r.options
            ]
            entry["follows"] = split_list(r.get("Follows"))
            leaning = [o["id"] for o in entry["options"] if o["status"] == "current leaning"]
            entry["leaning"] = status[1] if len(status) > 1 and status[0].lower() == "leaning" else (leaning[0] if leaning else None)
            entry["chosen"] = next((o["id"] for o in entry["options"] if o["status"] == "chosen"), None)
            entry["answer"] = next((r.get(label) for label in ANSWER_LABELS if r.get(label)), "")
        elif r.kind == "question":
            entry["state"] = "answered" if is_answered(r) else "open"
            entry["states"] = ["open", "answered"]
            entry["answer"] = r.get("Answer") or r.get("So far")
        elif r.kind == "requirement":
            met = parse_met(r.get("Met"))
            entry["state"] = met[0].lower() if met else "unknown"
            entry["states"] = [*VERDICT, "unknown"]
            entry["answer"] = met[1] if met else ""
        else:
            entry["state"] = "found"
            entry["states"] = ["found"]
        records[r.id] = entry

    costs = [
        {
            "title": r.title,
            "page": r.get("Page"),
            "drives": r.get("Drives"),
            "monthly": r.get("Monthly"),
            "amounts": cost_amounts(r),
            "varies": r.get("Varies with"),
            "affected": split_list(r.get("Affected by")),
            "evidence": split_list(r.get("Evidence")),
        }
        for r in design.of("cost")
    ]

    flows = [{"id": r.id, "title": r.title, "fields": {n: (f.items or f.value) for n, f in r.fields.items() if n.lower() != PRIVATE}} for r in design.of("flow")]

    for r in design.of("decision"):
        records[r.id]["shapes"] = shapes_line(r, design)

    for entry in records.values():
        entry["unblocks"] = sorted((i for i, other in records.items() if entry is not other and any(records.get(f) is entry for f in other.get("follows", []))), key=lambda i: int(i[1:]))

    prose = {name: "\n".join(lines).strip() for name, lines in design.prose.items()}
    return {"title": design.title, "records": records, "costs": costs, "flows": flows, "prose": prose}


def shapes_line(record: Record, design: Design) -> str:
    """The line under a decision's question: "Needs D1 first." while it's put off until a decision it follows is settled, else its Shapes."""
    known = design.by_id()
    later = (record.get("Status") or "").lower().startswith("later")
    pending = [d for d in split_list(record.get("Follows")) if d in known and (known[d].get("Status") or "Open").split()[0].lower() in UNSETTLED]
    if later and pending:
        return f"Needs {' and '.join(pending)} first."
    return record.get("Shapes")


def is_answered(question: Record) -> bool:
    return bool(question.get("Answered by")) or question.get("Status").lower() == "answered"


def check_question(record: Record, design: Design) -> None:
    """A question says who can answer it, what it holds up, and when it was asked; what to ask next isn't recorded."""
    where = design.where(record.line)
    if not record.get("Blocks"):
        design.warnings.append(f"{where}: question '{record.id}' blocks nothing; a question that holds up no decision, requirement or flow belongs in the effort's open questions")
    status = record.field("Status")
    if status and status.value.lower() != "answered":
        design.warnings.append(
            f"{design.where(status.line)}: question '{record.id}' has 'Status: {status.value}'; the doc records only whether it's answered. "
            "When and how it was asked goes in 'Asked'"
        )
    for key in ("Latest", "Page"):
        found = record.field(key)
        if found:
            reason = "record a partial answer in 'So far'" if key == "Latest" else "a question lives on the page of what it blocks"
            design.warnings.append(f"{design.where(found.line)}: question '{record.id}' has '{key}'; {reason}")
    if is_answered(record) and not record.get("Answer"):
        design.warnings.append(f"{where}: question '{record.id}' is answered but has no 'Answer': the answer in a few words")
    if record.get("Answer") and not record.get("Answered by"):
        design.warnings.append(f"{where}: question '{record.id}' has an 'Answer' but no 'Answered by': the evidence it became")


def check_waiting(design: Design) -> None:
    """A decision's 'Waiting on' and its questions' 'Blocks' tell the same story."""
    known = design.by_id()
    for decision in design.of("decision"):
        state = (decision.get("Status") or "Open").split()[0].lower()
        waiting = decision.field("Waiting on")
        if state not in UNSETTLED:
            for question in design.of("question"):
                if decision.id in split_list(question.get("Blocks")) and not is_answered(question):
                    design.warnings.append(
                        f"{design.where(question.line)}: {question.id} blocks {decision.id}, which is settled: take {decision.id} off its 'Blocks', "
                        f"or reopen {decision.id} if the answer could still change it"
                    )
            continue
        if waiting is None:
            continue
        listed = set(split_list(waiting.value))
        for ident in listed:
            question = known.get(ident)
            if question and question.kind == "question" and not is_answered(question) and decision.id not in split_list(question.get("Blocks")):
                design.warnings.append(f"{design.where(waiting.line)}: {decision.id} is waiting on {ident}, but {ident}'s 'Blocks' doesn't list {decision.id}")
        for question in design.of("question"):
            if decision.id in split_list(question.get("Blocks")) and not is_answered(question) and question.id not in listed:
                design.warnings.append(f"{design.where(waiting.line)}: {question.id} blocks {decision.id}, but {decision.id}'s 'Waiting on' doesn't list it")


def check_decision(record: Record, design: Design) -> None:
    """A settled decision says why; its options say which won and why the others didn't."""
    status = record.get("Status") or "Open"
    state = status.split()[0].lower()
    where = design.where(record.line)

    if state in ("decided", "leaning") and not record.get("Why"):
        design.errors.append(f"{where}: decision '{record.id}' is {status} but has no 'Why': one sentence on what tipped it, citing the evidence")
    decided_in = record.field("Decided in")
    if decided_in and state != "decided":
        design.warnings.append(f"{design.where(decided_in.line)}: '{record.id}' has 'Decided in' but is {status}")
    if state == "given" and not record.get("Source"):
        design.errors.append(f"{where}: decision '{record.id}' is Given but has no 'Source': who or what set it")
    shapes = record.field("Shapes")
    if shapes and re.match(r"(needs|after|waits? (on|for)|blocked by)\b.*\bD\d+", shapes.value, re.IGNORECASE):
        design.warnings.append(
            f"{design.where(shapes.line)}: '{record.id}' Shapes says what it waits on; put that in Follows (the build writes \"Needs D1 first.\" for a Later decision) and say what it settles here"
        )
    why = record.field("Why")
    if why and len(why.value) > WHY_LIMIT:
        design.warnings.append(f"{design.where(why.line)}: '{record.id}' Why runs {len(why.value)} characters; keep it to a sentence and move the rest to 'Reasoning'")
    also = record.field("Also considered")
    for item in also.items if also else []:
        if ": " not in item:
            design.errors.append(f"{design.where(also.line)}: write each 'Also considered' item as 'Name: why not'; got '{item}'")

    for option in record.options:
        option_status = option.get("Status")
        kind = option_state(option)
        if option_status and kind not in OPTION_STATUS:
            design.warnings.append(f"{design.where(option.line)}: option status '{option_status}'; use Current leaning, Chosen, Not chosen <date>, Set aside <date>, Found in research or Not designed yet")
        if kind in ("not chosen", "set aside") and not option.get("Why not"):
            design.warnings.append(f"{design.where(option.line)}: {record.id} option {option.id} is {option_status} with no 'Why not'")
        if kind == "chosen" and state != "decided":
            design.warnings.append(f"{design.where(option.line)}: {record.id} option {option.id} is Chosen, but the decision is {status}")
        for name, value in option.fields.items():
            if name.lower().startswith("meets "):
                target = name[6:].strip()
                if target not in design.by_id() or design.by_id()[target].kind != "requirement":
                    design.errors.append(f"{design.where(value.line)}: '{name}' names '{target}', which isn't a requirement")
                if not parse_met(value.value):
                    design.errors.append(f"{design.where(value.line)}: write '{name}' as 'Yes|Partly|No · how [E1, D2]'")

    for follows in split_list(record.get("Follows")):
        if follows not in design.by_id() or design.by_id()[follows].kind != "decision":
            design.errors.append(f"{where}: '{record.id}' follows '{follows}', which isn't a decision")

    if record.options and state == "decided":
        chosen = [o.id for o in record.options if option_state(o) == "chosen"]
        unsettled = [o.id for o in record.options if option_state(o) not in ("chosen", "not chosen", "set aside")]
        if len(chosen) != 1 or unsettled:
            design.warnings.append(
                f"{where}: '{record.id}' is Decided; mark the option that won 'Chosen' and each other one 'Not chosen <date>' or 'Set aside <date>'"
                + (f" (still unmarked: {', '.join(unsettled)})" if unsettled else "")
            )
    if record.options and state == "leaning":
        named = status.split(maxsplit=1)[1].strip() if " " in status else ""
        ids = {o.id for o in record.options}
        if named and named not in ids:
            design.warnings.append(f"{where}: '{record.id}' is leaning '{named}', which isn't one of its options ({', '.join(sorted(ids))})")
        elif named and option_state(next(o for o in record.options if o.id == named)) != "current leaning":
            design.warnings.append(f"{where}: '{record.id}' is leaning {named}; mark option {named} 'Current leaning'")


def record_texts(record: Record):
    """Every public text in a record, with its line, for mention checks. Source is private."""
    yield record.title, record.line
    for name, value in record.fields.items():
        if name.lower() == PRIVATE:
            continue
        yield value.value, value.line
        for item in value.items:
            yield item, value.line
    for option in record.options:
        yield from record_texts(option)


def cited_ids(record: Record, key: str) -> list[str]:
    """The IDs a field cites: 'E1, E2', or list items that each start with one ('E1: what it shows')."""
    found = record.field(key)
    if found is None:
        return []
    if found.items:
        return [m.group(1) for m in (re.match(r"([EQDR]\d+)\b", item) for item in found.items) if m]
    return split_list(found.value)


def split_list(text: str) -> list[str]:
    return [part.strip() for part in text.split(",") if part.strip()]


def parse_met(text: str) -> tuple[str, str, list[str]] | None:
    match = re.match(r"^(Yes|Partly|No)\s*·\s*(.*?)\s*(?:\[([^\]]*)\])?$", text, re.I)
    if not match:
        return None
    return match.group(1).capitalize(), match.group(2), split_list(match.group(3) or "")


def who(text: str) -> tuple[str, str]:
    match = re.match(r"^(.*?)\s*\(([^)]*)\)\s*$", text)
    if match and match.group(2).lower() in WHO_KINDS:
        return match.group(1).strip(), WHO_KINDS[match.group(2).lower()]
    return text.strip(), ""


# Rendering


def esc(text: str) -> str:
    return htmllib.escape(text, quote=False).replace('"', "&quot;")


class Renderer:
    def __init__(self, design: Design, pages: dict[str, dict], anchors: dict[str, str]) -> None:
        self.design = design
        self.pages = pages
        self.anchors = anchors
        self.known = design.by_id()
        # The page that defines every record: the overview, or the first page when a doc has none.
        self.home = "overview" if "overview" in pages else next(iter(pages), "overview")
        self.opts: dict[str, str] = {}

    def inline(self, text: str) -> str:
        links: list[str] = []

        def keep(match: re.Match[str]) -> str:
            links.append(f'<a href="{esc(match.group(2))}">{esc(match.group(1))}</a>')
            return f"\x00{len(links) - 1}\x00"

        out = esc(LINK.sub(keep, text))
        out = MENTION.sub(lambda m: f'<a class="mention" href="#{m.group(1)}">{m.group(1)}</a>' if m.group(1) in self.known else m.group(1), out)
        out = ESCAPED.sub(r"\1", out)
        return re.sub(r"\x00(\d+)\x00", lambda m: links[int(m.group(1))], out)

    def ref(self, ident: str) -> str:
        return f'<a class="ref ref-{ident[0].lower()}" href="#{ident}">{ident}</a>'

    def marks(self, idents: list[str], detail: str = "") -> str:
        if not idents:
            return ""
        attrs = f' data-ref-detail="{esc(detail)}" data-ref-value="{esc(", ".join(idents))}"' if detail else ""
        return f'<div class="marks"{attrs}>{"".join(self.ref(i) for i in idents)}</div>'

    def marks_or_text(self, text: str) -> str:
        tokens = split_list(text)
        if tokens and all(ID_TOKEN.match(t) for t in tokens):
            return f"<td>{self.marks(tokens)}</td>"
        return f'<td class="soft">{self.inline(text)}</td>' if text else "<td></td>"

    def table(self, head: list[str], rows: list[str], head_classes: dict[int, str] | None = None) -> str:
        cells = "".join(f'<th{(" class=" + chr(34) + head_classes[i] + chr(34)) if head_classes and i in head_classes else ""}>{esc(h)}</th>' for i, h in enumerate(head))
        return f'<div class="table-wrap"><table class="table"><thead><tr>{cells}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'

    def page_title(self, page: str) -> str:
        return self.pages.get(page, {}).get("title", page)

    # Where records live

    def areas(self) -> list[str]:
        return [page for page, info in self.pages.items() if info["group"] == "area"]

    def home_of(self, record: Record) -> str:
        """The page a record lives on. A question lives with what it blocks, or on the overview when that spans pages."""
        if record.kind == "question":
            homes = {self.home_of(self.known[i]) for i in split_list(record.get("Blocks")) if i in self.known and self.known[i].kind in ("decision", "requirement")}
            return homes.pop() if len(homes) == 1 else self.home
        return record.get("Page") or self.home

    def reaches(self, record: Record, page: str) -> bool:
        """Whether a record that lives elsewhere applies to, shapes or affects a page."""
        if record.kind == "question":
            blocked = [self.known[i] for i in split_list(record.get("Blocks")) if i in self.known]
            # Through what lives here, or a requirement that applies here; a decision's own questions stay with it.
            return any(self.home_of(b) == page or (b.kind == "requirement" and self.reaches(b, page)) for b in blocked)
        return page in split_list(record.get("Applies to"))

    def area_chip(self, page: str) -> str:
        info = self.pages.get(page, {})
        icon = info.get("icon") or "i-box"
        return f'<a class="area-chip" href="#{esc(page)}"><svg><use href="#{esc(icon)}"/></svg>{esc(self.page_title(page))}</a>'

    def lives(self, label: str, pages: list[str]) -> str:
        if not pages:
            return ""
        key = f'<span class="k">{esc(label)}</span>' if label else ""
        return f'<span class="lives">{key}{"".join(self.area_chip(p) for p in pages)}</span>'

    def group_row(self, page: str | None, cols: int, label: str = "", extra: str = "") -> str:
        """A group heading: an area with a link to its page, or a plain label; extra follows the name."""
        if page is None or page == self.home:
            if extra:
                return f'<tr class="group"><td colspan="{cols}"><span class="group-name">{esc(label or "Across all areas")}{extra}</span></td></tr>'
            return f'<tr class="group"><td colspan="{cols}">{esc(label or "Across all areas")}</td></tr>'
        icon = self.pages.get(page, {}).get("icon") or "i-box"
        return (
            f'<tr class="group"><td colspan="{cols}"><span class="group-name"><svg><use href="#{esc(icon)}"/></svg>{esc(self.page_title(page))}{extra}</span>'
            f'<a class="open-area" href="#{esc(page)}">Open area<svg><use href="#i-arrow-right"/></svg></a></td></tr>'
        )

    def by_home(self, records: list[Record]) -> list[tuple[str, list[Record]]]:
        """Records grouped by the page they live on: the overview's first, then each area in page order."""
        order = [self.home] + [a for a in self.areas() if a != self.home]
        order += [p for p in dict.fromkeys(self.home_of(r) for r in records) if p not in order]
        groups = [(page, [r for r in records if self.home_of(r) == page]) for page in order]
        return [(page, members) for page, members in groups if members]

    def gathered(self, records: list[Record], cols: int, row) -> list[str]:
        """Every record, grouped by where it lives when the doc has areas."""
        if not self.areas():
            return [row(r) for r in records]
        rows = []
        for page, members in self.by_home(records):
            rows.append(self.group_row(page, cols))
            rows += [row(r) for r in members]
        return rows

    def local(self, page: str, records: list[Record], cols: int, row, elsewhere_label: str) -> list[str]:
        """An area's own records, then those from elsewhere that reach it."""
        own = [r for r in records if self.home_of(r) == page]
        other = [r for r in records if self.home_of(r) != page and self.reaches(r, page)]
        rows = []
        if own:
            rows.append(self.group_row(None, cols, "This area"))
            rows += [row(r, None) for r in own]
        if other:
            rows.append(self.group_row(None, cols, elsewhere_label))
            rows += [row(r, self.home_of(r)) for r in other]
        return rows

    # Requirements

    def requirement_row(self, r: Record, define: bool, lives_on: str | None = None) -> str:
        priority = r.get("Priority").capitalize()
        badge = f'<span class="{PRIORITY.get(priority.lower(), "badge")}"{" data-ref-status" if define else ""}>{esc(priority)}</span>'
        if define:
            return (
                f'<tr id="{r.id}" data-ref="requirement"><td class="id">{r.id}</td><td data-ref-text>{self.inline(r.title)}</td>'
                f'<td class="soft" data-ref-detail="Why">{self.inline(r.get("Why"))}</td>'
                f'<td class="soft" data-ref-detail="Source">{self.inline(r.get("Source"))}</td><td>{badge}</td></tr>'
            )
        lives = self.lives("Lives on", [lives_on]) if lives_on else ""
        return f'<tr><td class="id">{self.ref(r.id)}</td><td>{self.inline(r.title)}{lives}</td><td class="soft">{self.inline(r.get("Why"))}</td><td>{badge}</td></tr>'

    def requirements(self, page: str, ids: list[str] | None) -> str:
        records = self.design.of("requirement")
        if page == self.home:
            chosen = [r for r in records if ids is None or r.id in ids]
            rows = [self.requirement_row(r, True) for r in chosen] if ids is not None else self.gathered(chosen, 5, lambda r: self.requirement_row(r, True))
            return self.table(["ID", "Requirement", "Why it matters", "Source", "Priority"], rows)
        if ids is not None:
            rows = [self.requirement_row(r, False) for r in records if r.id in ids]
        else:
            rows = self.local(page, records, 4, lambda r, lives_on: self.requirement_row(r, False, lives_on), "Applies here, lives elsewhere")
        return self.table(["ID", "Requirement", "Why it matters", "Priority"], rows)

    def measure_row(self, r: Record, page: str) -> str:
        met_field = r.field(f"Met on {page}") or r.field("Met")
        parsed = parse_met(met_field.value) if met_field else None
        if parsed is None:
            return ""
        verdict, how, rests = parsed
        label = r.get("Short") or r.title
        return (
            f'<tr><td>{self.ref(r.id)} {self.inline(label)}</td><td><span class="verdict {VERDICT[verdict.lower()]}">{verdict}</span></td>'
            f'<td class="soft">{self.inline(how)}</td><td>{self.marks(rests)}</td></tr>'
        )

    def measure(self, page: str, ids: list[str] | None) -> str:
        records = [r for r in self.design.of("requirement") if ids is None or r.id in ids]
        if page == self.home and ids is None:
            rows = self.gathered(records, 4, lambda r: self.measure_row(r, page))
        elif ids is not None:
            rows = [self.measure_row(r, page) for r in records]
        else:
            own = [r for r in records if self.home_of(r) == page]
            rows = [self.measure_row(r, page) for r in own + [r for r in records if r not in own and self.reaches(r, page)]]
        return self.table(["Requirement", "Met", "How", "Rests on"], [r for r in rows if r])

    # Decisions

    def status(self, record: Record) -> tuple[str, str]:
        text = record.get("Status") or "Open"
        return text, DECISION_STATUS.get(text.split()[0].lower(), "")

    def worked_out(self, record: Record) -> str:
        # A Given decision was set elsewhere; it shows who set it rather than an empty "Not started".
        if not record.get("Worked out in") and (record.get("Status") or "").lower().startswith("given"):
            return f'<span class="page-link none"><svg><use href="#i-file-check"/></svg>Given · {self.inline(record.get("Source"))}</span>'
        where = self.place(record.get("Worked out in"))
        decided = record.get("Decided in")
        if decided and decided != record.get("Worked out in"):
            where += f'<span class="decided-in">Decided in {self.place(decided, onward=False)}</span>'
        return where

    def place(self, target: str, onward: bool = True) -> str:
        """A link to the page, section or meeting where a decision was worked out or settled."""
        if target.startswith("meeting-") and target in self.known:
            meeting = self.known[target]
            return f'<a class="page-link" href="#{esc(target)}"><svg><use href="#i-calendar"/></svg>{esc(short_date(target[8:]))} · {esc(meeting.title)}</a>'
        page = target if target in self.pages else self.anchors.get(target)
        if page:
            info = self.pages[page]
            kind = "Brief" if info["group"] == "brief" else "Page"
            link = "Open the brief" if info["group"] == "brief" else f"Open {info['title']}"
            onward_attr = f' data-ref-link="{esc(link)}"' if onward else ""
            return (
                f'<a class="page-link" href="#{esc(target)}"{onward_attr}><svg><use href="#{esc(info["icon"])}"/></svg>'
                f'{kind} · {esc(info["title"])}</a>'
            )
        return f'<span class="page-link none"><svg><use href="#i-circle-dashed"/></svg>{esc(target or "Not started")}</span>'

    def reasoning_parts(self, r: Record, why_detail: bool) -> list[str]:
        """Why, Reasoning and Revisit if, as blocks. The Why can feed the decision's card."""
        parts = []
        if r.get("Why"):
            detail = ' data-ref-detail="Why"' if why_detail else ""
            parts.append(f'<div class="why"><h4>Why</h4><p{detail}>{self.inline(r.get("Why"))}</p></div>')
        points = r.items("Reasoning")
        if points:
            parts.append("<div><h4>Reasoning</h4><ul>" + "".join(f"<li>{self.inline(p)}</li>" for p in points) + "</ul></div>")
        elif r.get("Reasoning"):
            parts.append(f'<div><h4>Reasoning</h4><p>{self.inline(r.get("Reasoning"))}</p></div>')
        if r.get("Revisit if"):
            parts.append(f'<div><h4>Revisit if</h4><p>{self.inline(r.get("Revisit if"))}</p></div>')
        return parts

    def alternatives(self, r: Record) -> str:
        """The options, winner or leaning first, then the lighter 'Also considered' ones, each with its reason."""
        order = {"chosen": 0, "current leaning": 0, "not chosen": 2, "set aside": 3}
        rows = []
        for o in sorted(r.options, key=lambda o: order.get(option_state(o), 1)):
            state = option_state(o)
            status = o.get("Status")
            pill_cls = OPTION_PILL.get(state, "")
            pill = f'<span class="status{" " + pill_cls if pill_cls else ""}">{esc(status)}</span>' if status else ""
            reason = o.get("Why not") if state in ("not chosen", "set aside") else o.get("Summary")
            colour = f"opt-{o.id.lower()}" if re.fullmatch(r"[A-D]", o.id) and state not in ("set aside", "not chosen") else ""
            chip = f'<span class="numeral">{esc(o.id)}</span>' if o.id.isdigit() else f'<span class="letter sm{"" if colour else " plain"}">{esc(o.id)}</span>'
            rows.append(
                f'<li class="{colour}">{chip}<div><div class="name">{self.inline(o.title)}{pill}</div>'
                f'<p class="reason">{self.inline(reason)}{self.marks(cited_ids(o, "Evidence"))}</p></div></li>'
            )
        for item in r.items("Also considered"):
            name, _, why_not = item.partition(": ")
            why_not = why_not[:1].upper() + why_not[1:]
            rows.append(
                f'<li><span class="letter sm plain">–</span><div><div class="name">{self.inline(name)}<span class="status outline">Also considered</span></div>'
                f'<p class="reason">{self.inline(why_not)}</p></div></li>'
            )
        if not rows:
            return ""
        return f'<div><h4>{"Options" if r.options else "Alternatives"}</h4><ul class="alts">{"".join(rows)}</ul></div>'

    def decision_detail(self, r: Record) -> str:
        """What a decision opens to: its answer and reasoning, its options or alternatives, and beside them what it
        waits on, where it's worked out, the other areas it shapes and the evidence behind it."""
        text, cls = self.status(r)
        pill = f'<span class="status{" " + cls if cls else ""}">{esc(text)}</span>'
        shapes = f'<p class="dm-shapes">{self.inline(shapes_line(r, self.design))}</p>' if shapes_line(r, self.design) else ""
        close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
        head = f'<div class="dm-head"><div class="dm-top"><div class="dm-title">{self.ref(r.id)}<h2>{self.inline(r.title)}</h2>{pill}</div>{close}</div>{shapes}</div>'

        main = []
        label = next((key for key in ANSWER_LABELS if r.get(key)), None)
        if label:
            note = f'<p class="note">{self.inline(r.get("Note"))}</p>' if r.get("Note") else ""
            main.append(f'<div class="dm-answer"><h4>{esc(label)}</h4><p>{self.inline(r.get(label))}</p>{note}</div>')
        main += self.reasoning_parts(r, why_detail=True)
        if (r.get("Status") or "").lower() == "given" and r.get("Source"):
            main.append(f'<div><h4>Source</h4><p>{self.inline(r.get("Source"))}</p></div>')
        main.append(self.alternatives(r))

        side = []
        waiting = [i for i in split_list(r.get("Waiting on")) if i in self.known]
        if waiting and self.state(r) != "decided":
            items = "".join(f"<li>{self.ref(i)}<span>{self.inline(self.known[i].get('Short') or self.known[i].title)}</span></li>" for i in waiting)
            side.append(f'<div><h4>Waiting on</h4><ul class="dm-list">{items}</ul></div>')
        side.append(f'<div><h4>Worked out in</h4>{self.worked_out(r)}</div>')
        shaped = [p for p in split_list(r.get("Applies to")) if p != self.home_of(r)]
        if shaped:
            side.append(f'<div><h4>Also shapes</h4><div class="dm-chips">{"".join(self.area_chip(p) for p in shaped)}</div></div>')
        cited = cited_ids(r, "Evidence")
        for key in ("Why", "Revisit if"):
            cited += MENTION.findall(r.get(key))
        for point in r.items("Reasoning"):
            cited += MENTION.findall(point)
        evidence = [i for i in dict.fromkeys(cited) if i.startswith("E") and i in self.known]
        if evidence:
            items = "".join(f"<li>{self.ref(i)}<span>{self.inline(self.known[i].get('Short') or self.known[i].title)}</span></li>" for i in evidence)
            side.append(f'<div><h4>Evidence</h4><ul class="dm-list soft">{items}</ul></div>')

        foot = ""
        target = r.get("Worked out in")
        page = target if target in self.pages else self.anchors.get(target)
        if r.options and page and self.pages[page]["group"] == "brief":
            foot = f'<div class="dm-foot"><a class="dm-compare" href="#{esc(target)}">Compare the options in the brief</a></div>'

        body = f'<div class="dm-body"><div class="dm-main">{"".join(main)}</div><div class="dm-side">{"".join(side)}</div></div>'
        return f'<div class="decision-detail" id="{r.id}-detail" aria-label="{esc(r.id)} · {esc(r.title)}">{head}{body}{foot}</div>'

    def state(self, record: Record) -> str:
        return DECISION_STATE.get((record.get("Status") or "Open").split()[0].lower(), "open")

    def answer(self, r: Record) -> str:
        for label in ANSWER_LABELS:
            if r.get(label):
                return f'<span data-ref-detail="{label}">{self.inline(r.get(label))}</span>'
        return ""

    def decision_row(self, r: Record, define: bool = True, chips: str = "") -> str:
        """A decision: the question and what it shapes, its status, the answer or leaning, and where it's worked out.
        The row opens the decision's detail, which the defining table writes after itself."""
        text, cls = self.status(r)
        shapes = f'<span class="sub">{self.inline(shapes_line(r, self.design))}</span>' if shapes_line(r, self.design) else ""
        note = f" {self.inline(r.get('Note'))}" if r.get("Note") else ""
        detail = self.answer(r) + note + self.marks(split_list(r.get("Waiting on")), "Waiting on") + self.marks(cited_ids(r, "Evidence"))
        status = f'<span class="status{" " + cls if cls else ""}"{" data-ref-status" if define else ""}>{esc(text)}</span>'
        where = self.worked_out(r) + chips
        opens = f' class="opens" data-detail="{r.id}-detail" tabindex="0"'
        if not define:
            return f'<tr{opens}><td class="id">{self.ref(r.id)}</td><td><span class="q">{self.inline(r.title)}</span>{shapes}</td><td>{status}</td><td class="soft">{detail}</td><td>{where}</td></tr>'
        return (
            f'<tr id="{r.id}" data-ref="decision"{opens}><td class="id">{self.ref(r.id)}</td><td><span class="q" data-ref-text>{self.inline(r.title)}</span>{shapes}</td>'
            f"<td>{status}</td><td class=\"soft\">{detail}</td><td>{where}</td></tr>"
        )

    def also(self, r: Record, page: str = "") -> str:
        """The other areas a decision shapes, besides the one it lives on and the page showing it."""
        return self.lives("Also shapes", [p for p in split_list(r.get("Applies to")) if p not in (self.home_of(r), page)])

    def settled_last(self, records: list[Record]) -> list[Record]:
        rank = {"open": 0, "leaning": 0, "later": 1, "decided": 2}
        return sorted(records, key=lambda r: (rank[self.state(r)], (r.get("Status") or "").lower() == "given"))

    def decisions(self, page: str, ids: list[str] | None) -> str:
        records = [r for r in self.design.of("decision") if ids is None or r.id in ids]
        if page == self.home:
            rows = []
            if ids is not None or not self.areas():
                rows = [self.decision_row(r, True, self.also(r)) for r in self.settled_last(records)]
            else:
                for home, members in self.by_home(records):
                    rows.append(self.group_row(home, 5))
                    rows += [self.decision_row(r, True, self.also(r)) for r in self.settled_last(members)]
            details = "".join(self.decision_detail(r) for r in records)
            table = self.table(["ID", "Decision", "Status", "Answer, or where it's leaning", "Worked out in"], rows)
            return f'{table}<div class="decision-details">{details}</div>'


        def row(r: Record, lives_on: str | None) -> str:
            return self.decision_row(r, False, self.lives("Lives on", [lives_on]) if lives_on else self.also(r, page))

        if ids is not None:
            rows = [row(r, None if self.home_of(r) == page else self.home_of(r)) for r in records]
        else:
            rows = self.local(page, self.settled_last(records), 5, row, "Decided elsewhere, shapes this area")
        return self.table(["ID", "Decision", "Status", "Answer, or where it's leaning", "Worked out in"], rows)

    def reasoning(self, page: str, ids: list[str] | None) -> str:
        """A decision's Why, Reasoning and Revisit if, for its section in a brief. Nothing while it's still open."""
        blocks = []
        for ident in ids or []:
            record = self.known.get(ident)
            parts = self.reasoning_parts(record, why_detail=False) if record and record.kind == "decision" else []
            if parts:
                blocks.append(f'<div class="reasoning">{"".join(parts)}</div>')
        return "".join(blocks)

    def decisions_rail(self, page: str, ids: list[str] | None) -> str:
        if ids is None:
            chosen = [r for r in self.design.of("decision") if self.state(r) in UNSETTLED and (page == self.home or self.home_of(r) == page)]
        else:
            chosen = [self.known[i] for i in ids if i in self.known]
        items = []
        for r in chosen:
            text, cls = self.status(r)
            word = text.split()[0]
            items.append(
                f'<a class="rail-item" href="#{r.id}"><span class="top"><span class="id">{r.id}</span>'
                f'<span class="status{" " + cls if cls else ""}">{esc(word)}</span></span><span class="q">{esc(r.get("Rail") or r.title)}</span></a>'
            )
        return "".join(items)

    # Parts and risks

    def parts(self, page: str, ids: list[str] | None) -> str:
        rows = []
        for r in self.design.of("part"):
            if (r.get("Page") or self.home) != page:
                continue
            does = self.inline(r.get("Does"))
            designed = r.get("Designed on")
            if designed:
                does += f' Designed on <a class="page-link" href="#{esc(designed)}">{esc(self.page_title(designed))}</a>.'
            rows.append(
                f'<tr><td class="q">{esc(r.title)}</td><td class="soft">{does}</td>{self.marks_or_text(r.get("Decided by"))}'
                f"{self.marks_or_text(r.get('Evidence'))}</tr>"
            )
        return self.table(["Part", "What it does", "Decided by", "Evidence"], rows)

    def phases(self, page: str, ids: list[str] | None) -> str:
        rows = []
        for r in self.design.of("phase"):
            status = r.get("Status")
            cls = PHASE_STATUS.get(status.lower(), "")
            rows.append(
                f'<tr><td class="q">{self.inline(r.title)}</td><td class="soft">{self.inline(r.get("Scope"))}</td>'
                f'<td class="soft">{self.inline(r.get("Exit criteria"))}</td><td><span class="status{" " + cls if cls else ""}">{esc(status)}</span></td></tr>'
            )
        return self.table(["Phase", "Scope", "Done when", "Status"], rows)

    def risk_row(self, r: Record, lives_on: str | None = None) -> str:
        likelihood = r.get("Likelihood").capitalize()
        cls = LIKELIHOOD.get(likelihood.lower(), "")
        happens = f'<span class="sub">If it happens: {self.inline(r.get("If it happens"))}</span>' if r.get("If it happens") else ""
        lives = self.lives("Lives on", [lives_on]) if lives_on else ""
        return (
            f'<tr><td><span class="q">{self.inline(r.title)}</span>{happens}{lives}</td><td><span class="status{" " + cls if cls else ""}">{esc(likelihood)}</span></td>'
            f'<td class="soft">{self.inline(r.get("What we\'d do"))}</td><td>{self.marks(split_list(r.get("Linked")))}</td></tr>'
        )

    def risks(self, page: str, ids: list[str] | None) -> str:
        records = self.design.of("risk")
        if page == self.home:
            rows = self.gathered(records, 4, self.risk_row)
        else:
            rows = self.local(page, records, 4, self.risk_row, "Owned elsewhere, affects this area")
        return self.table(["Risk", "Likelihood", "What we'd do", "Linked"], rows)

    # Cost

    def cost_amount(self, r: Record) -> tuple[float, float] | None:
        """A line's monthly figure: its own, or the chosen or leaning option's when it varies with a decision."""
        amounts = cost_amounts(r)
        varies = r.get("Varies with")
        if not varies:
            return amounts[""]
        decision = self.known.get(varies)
        option = next((o.id for o in decision.options if option_state(o) == "chosen"), None) if decision else None
        if option is None and decision is not None and self.state(decision) == "leaning":
            option = (decision.get("Status").split() + [""])[1]
        return amounts.get(option) if option else None

    def money(self, amount: tuple[float, float]) -> str:
        low, high = (f"${round(v):,}" for v in amount)
        return low if low == high else f"{low} → {high}"

    def cost_row(self, r: Record) -> str:
        amount = self.cost_amount(r)
        if amount is not None:
            shown = self.money(amount)
        elif r.get("Varies with"):
            shown = esc(r.get("Monthly"))
        else:
            shown = self.inline(r.get("Monthly"))
        linked = split_list(r.get("Evidence")) + split_list(r.get("Varies with")) + split_list(r.get("Affected by"))
        return f'<tr><td>{esc(r.title)}</td><td class="soft">{self.inline(r.get("Drives"))}</td><td class="num">{shown}</td><td>{self.marks(linked)}</td></tr>'

    def cost_total(self, records: list[Record]) -> tuple[str, str]:
        known = [a for a in (self.cost_amount(r) for r in records) if a is not None]
        total = (sum(a[0] for a in known), sum(a[1] for a in known))
        missing = len(records) - len(known)
        lines = f"{missing} line{'s' if missing > 1 else ''} not known yet"
        if not known:
            return "Not known", lines if missing else ""
        return self.money(total), (f"plus {lines}" if missing else "")

    def cost(self, page: str, ids: list[str] | None) -> str:
        """Every cost line, grouped by area with each area's subtotal, and the total per month."""
        records = [r for r in self.design.of("cost") if page == self.home or self.home_of(r) == page]
        rows: list[str] = []
        if page == self.home and self.areas():
            for home, members in self.by_home(records):
                subtotal, _ = self.cost_total(members)
                rows.append(self.group_row(home, 4, extra=f'<span class="soft">{subtotal if subtotal == "Not known" else subtotal + " a month"}</span>'))
                rows += [self.cost_row(r) for r in members]
        else:
            rows += [self.cost_row(r) for r in records]
        total, note = self.cost_total(records)
        rows.append(f'<tr class="total"><td>Total per month</td><td class="soft">{esc(note)}</td><td class="num">{total}</td><td></td></tr>')
        return self.table(["Line item", "What drives it", "Monthly", "Evidence"], rows, {2: "num"})

    def terms(self, page: str, ids: list[str] | None) -> str:
        chosen = [t for t in self.design.terms if not t.pages or page in t.pages]
        return "<dl>" + "".join(f"<div><dt>{esc(t.name)}</dt><dd>{self.inline(t.text)}</dd></div>" for t in chosen) + "</dl>"

    # Shared pages

    def evidence(self, page: str, ids: list[str] | None) -> str:
        rows = []
        for r in self.design.of("evidence"):
            sources = []
            for item in r.items("Gathered from"):
                kind, _, value = item.partition(": ")
                sources.append(f'<div class="source"><span class="k">{esc(kind)}</span><span class="v">{self.inline(value)}</span></div>')
            rows.append(
                f'<tr id="{r.id}" data-ref="evidence"><td class="id">{r.id}</td>'
                f'<td class="has-details"><details><summary data-ref-text>{self.inline(r.title)}</summary><div class="how">'
                f'<div><h4>How we know</h4><p data-ref-detail="How we know">{self.inline(r.get("How we know"))}</p></div>'
                f'<div><h4>Gathered from</h4><div class="sources">{"".join(sources)}</div></div></div></details></td>'
                f'<td data-cited-on></td><td class="soft date" data-ref-status="Found">{esc(r.get("Found"))}</td></tr>'
            )
        return self.table(["ID", "Finding", "Cited on", "Found"], rows)

    def question_row(self, q: Record, define: bool, lives_on: str | None = None) -> str:
        name, kind = who(q.get("Who"))
        kind_html = f'<span class="kind">{esc(kind)}</span>' if kind else ""
        so_far = f'<span class="sub">So far: <span data-ref-detail="So far">{self.inline(q.get("So far"))}</span></span>' if q.get("So far") else ""
        lives = self.lives("Lives on", [lives_on]) if lives_on else ""
        ident = f'<td class="id">{q.id}</td>' if define else f'<td class="id">{self.ref(q.id)}</td>'
        attrs = f' id="{q.id}" data-ref="question"' if define else ""
        text = f'<span{" data-ref-text" if define else ""}>{self.inline(q.title)}</span>'
        who_attrs = f' data-ref-detail="Who can answer" data-ref-value="{esc(q.get("Who"))}"' if define else ""
        return (
            f'<tr{attrs}>{ident}<td>{text}{so_far}{lives}</td><td class="who"{who_attrs}>{kind_html}<span class="name">{esc(name)}</span></td>'
            f'<td>{self.marks(split_list(q.get("Blocks")), "Blocks" if define else "")}</td></tr>'
        )

    def answered_row(self, q: Record, define: bool) -> str:
        evidence = split_list(q.get("Answered by"))
        found = next((self.known[e].get("Found") for e in evidence if e in self.known and self.known[e].get("Found")), "")
        when = f'<span class="sub">Answered {esc(found)}</span>' if found else ""
        attrs = f' id="{q.id}" data-ref="question" data-answered' if define else ""
        ident = q.id if define else self.ref(q.id)
        answer = self.inline(q.get("Answer"))
        return (
            f'<tr{attrs}><td class="id">{ident}</td><td><span class="asked"{" data-ref-text" if define else ""}>{self.inline(q.title)}</span>'
            f'<span class="answer"{" data-ref-detail=" + chr(34) + "Answer" + chr(34) if define else ""}>{answer}</span></td>'
            f'<td>{self.marks(evidence, "Answered by" if define else "")}{when}</td></tr>'
        )

    def answered_group(self, questions: list[Record], define: bool) -> str:
        if not questions:
            return ""
        rows = "".join(self.answered_row(q, define) for q in questions)
        return (
            f'<details class="answered"><summary>Answered <span class="n">{len(questions)}</span></summary>'
            f'<div class="table-wrap"><table class="table"><tbody>{rows}</tbody></table></div></details>'
        )

    def questions(self, page: str, ids: list[str] | None) -> str:
        """Open questions, then the answered ones collapsed. Each is defined on the overview, or on its home page once answered."""
        records = [q for q in self.design.of("question") if ids is None or q.id in ids]
        blocks = split_list(self.opts.get("blocks", ""))
        if blocks:
            records = [q for q in records if set(split_list(q.get("Blocks"))) & set(blocks)]
        open_ = [q for q in records if not is_answered(q)]
        answered = [q for q in records if is_answered(q)]
        head = ["ID", "Question", "Who can answer", "Blocks"]

        if page == self.home and not blocks:
            rows = [self.question_row(q, True) for q in open_] if ids is not None else self.gathered(open_, 4, lambda q: self.question_row(q, True))
            here = [q for q in answered if self.home_of(q) == page]
            return (self.table(head, rows) if rows else "") + self.answered_group(here, True)
        if blocks:
            define = page == self.home
            rows = [self.question_row(q, define, None if define else self.home_of(q)) for q in open_]
            return (self.table(head, rows) if rows else "") + self.answered_group(answered, define)
        rows = self.local(page, open_, 4, lambda q, lives_on: self.question_row(q, False, lives_on), "Owned elsewhere, affects this area")
        here = [q for q in answered if self.home_of(q) == page]
        return (self.table(head, rows) if rows else "") + self.answered_group(here, True)

    # Progress

    def counts(self, decisions: list[Record], questions: list[Record]) -> tuple[dict[str, int], int, int]:
        states = {k: 0 for k in ("decided", "leaning", "open", "later")}
        # A Given decision was never the design's to make, so it doesn't count toward what's settled.
        for d in decisions:
            if not (d.get("Status") or "").lower().startswith("given"):
                states[self.state(d)] += 1
        answered = sum(1 for q in questions if is_answered(q))
        return states, len(questions) - answered, answered

    def bar(self, parts: list[tuple[str, int]]) -> str:
        return '<span class="progress-bar">' + "".join(f'<i class="{k}" style="flex-grow:{n}"></i>' for k, n in parts if n) + "</span>"

    def progress(self, page: str, ids: list[str] | None) -> str:
        """How much is settled: tiles per area on an overview with areas, a single line anywhere else."""
        decisions = self.design.of("decision")
        questions = self.design.of("question")
        if page == self.home and self.areas():
            tiles = []
            for home in [self.home] + [a for a in self.areas() if a != self.home]:
                ds = [d for d in decisions if self.home_of(d) == home]
                qs = [q for q in questions if self.home_of(q) == home]
                st, oq, aq = self.counts(ds, qs)
                icon = self.pages.get(home, {}).get("icon") or "i-box"
                title = esc(self.page_title(home)) if home != self.home else "Across all areas"
                name = f'<a href="#{esc(home)}">{title}</a>' if home != self.home else f"<span>{title}</span>"
                answered_note = f'<span class="soft"> · {aq} answered</span>' if aq else ""
                tiles.append(
                    f'<div class="tile"><div class="tile-head"><svg><use href="#{esc(icon)}"/></svg>{name}</div>'
                    f'{self.marks(sorted((d.id for d in ds), key=lambda i: int(i[1:])))}'
                    f'<span class="sub">{st["decided"]} of {sum(st.values())} decided</span>'
                    f'<div class="tile-q"><svg><use href="#i-circle-help"/></svg><b>{oq} open</b>{answered_note}</div></div>'
                )
            return f'<div class="progress"><div class="progress-tiles">{"".join(tiles)}</div></div>'

        if page == self.home:
            ds, qs, also_d, also_q = decisions, questions, [], []
        else:
            ds = [d for d in decisions if self.home_of(d) == page]
            qs = [q for q in questions if self.home_of(q) == page]
            also_d = [d.id for d in decisions if self.home_of(d) != page and self.reaches(d, page) and self.state(d) in UNSETTLED]
            also_q = [q.id for q in questions if self.home_of(q) != page and self.reaches(q, page) and not is_answered(q)]
        st, oq, aq = self.counts(ds, qs)
        d_note = f"also shaped by {', '.join(also_d)}" if also_d else ", ".join(f"{n} {k}" for k, n in st.items() if n and k != "decided")
        q_note = ", ".join(x for x in (f"{aq} answered" if aq else "", f"{', '.join(also_q)} {'lives' if len(also_q) == 1 else 'live'} elsewhere" if also_q else "") if x)
        return (
            '<div class="progress-line">'
            f'<div class="metric"><span class="label">Decisions</span><span class="n"><b>{st["decided"]}</b> of {sum(st.values())} decided</span>'
            f'{self.bar(list(st.items()))}<span class="note">{self.inline(d_note)}</span></div>'
            '<span class="divider"></span>'
            f'<div class="metric"><span class="label">Open questions</span><span class="n"><b>{oq}</b> open</span>'
            f'{self.bar([("decided", aq), ("open", oq)])}<span class="note">{self.inline(q_note)}</span></div></div>'
        )

    def meetings(self, page: str, ids: list[str] | None) -> str:
        blocks = []
        for r in self.design.of("meeting"):
            date = r.id[8:]
            status = r.get("Status")
            cls = MEETING_STATUS.get(status.lower(), "")
            body = []
            if r.get("Who"):
                body.append(f'<div class="who">{self.inline(r.get("Who"))}</div>')
            if r.items("Summary"):
                body.append("<ul>" + "".join(f"<li>{self.inline(i)}</li>" for i in r.items("Summary")) + "</ul>")
            elif r.get("Summary"):
                body.append(f"<p>{self.inline(r.get('Summary'))}</p>")
            chips = [item for change in self.design.changes if change.source == f"meeting {date}" for item in change.items]
            if chips:
                body.append('<div class="changes"><span>Changed in this doc</span>' + "".join(f'<span class="change">{esc(c)}</span>' for c in chips) + "</div>")
            blocks.append(
                f'<div class="meeting" id="{r.id}">'
                f'<div class="date"><b>{esc(short_date(date))}</b><small>{esc(weekday(date))}</small></div><div class="track"></div>'
                f'<div class="body"><div class="title"><h3>{esc(r.title)}</h3><span class="status{" " + cls if cls else ""}">{esc(status)}</span></div>'
                f'{"".join(body)}</div></div>'
            )
        return f'<div class="meetings">{"".join(blocks)}</div>'

    def meetings_rail(self, page: str, ids: list[str] | None) -> str:
        items = []
        for r in self.design.of("meeting"):
            items.append(f'<a class="rail-meeting" href="#{r.id}"><span class="d">{esc(short_date(r.id[8:]))}</span>{esc(r.title)}</a>')
        return "".join(items)

    def brief_rail(self, page: str, ids: list[str] | None) -> str:
        """A brief's rail: its decisions and those waiting on them, the meetings that touched them, and what blocks them."""
        covered = [i for i in ids or [] if i in self.known]
        decisions = covered + [d.id for d in self.design.of("decision") if d.id not in covered and set(split_list(d.get("Follows"))) & set(covered)]
        blocking = [q for q in self.design.of("question") if not is_answered(q) and set(split_list(q.get("Blocks"))) & set(covered)]
        related = set(decisions) | {q.id for q in blocking}
        groups = []

        if decisions:
            groups.append(f'<div class="rail-group"><span class="rail-label">Decisions</span>{self.decisions_rail(page, decisions)}</div>')

        meetings = []
        for r in self.design.of("meeting"):
            texts = [r.get("Summary"), *r.items("Summary")] + [i for c in self.design.changes if c.source == f"meeting {r.id[8:]}" for i in c.items]
            if related & {m for t in texts for m in MENTION.findall(t)}:
                meetings.append(f'<a class="rail-meeting" href="#{r.id}"><span class="d">{esc(short_date(r.id[8:]))}</span>{esc(r.title)}</a>')
        if meetings:
            groups.append(f'<div class="rail-group"><span class="rail-label">Meetings</span>{"".join(meetings)}</div>')

        if blocking:
            lines = []
            for d in covered:
                qs = [q.id for q in blocking if d in split_list(q.get("Blocks"))]
                if qs:
                    names = qs[0] if len(qs) == 1 else f"{', '.join(qs[:-1])} and {qs[-1]}"
                    lines.append(f"{names} block{'s' if len(qs) == 1 else ''} {d}.")
            count = f"{len(blocking)} open question{'s' if len(blocking) > 1 else ''}"
            groups.append(f'<div class="rail-note"><strong>{count}</strong><span>{self.inline(" ".join(lines))}</span></div>')

        return "".join(groups)

    def render(self, kind: str, page: str, ids: list[str] | None, opts: dict[str, str] | None = None) -> str | None:
        method = {
            "requirements": self.requirements,
            "measure": self.measure,
            "decisions": self.decisions,
            "decisions-rail": self.decisions_rail,
            "brief-rail": self.brief_rail,
            "reasoning": self.reasoning,
            "parts": self.parts,
            "risks": self.risks,
            "phases": self.phases,
            "cost": self.cost,
            "terms": self.terms,
            "evidence": self.evidence,
            "questions": self.questions,
            "meetings": self.meetings,
            "meetings-rail": self.meetings_rail,
            "progress": self.progress,
        }.get(kind)
        self.opts = opts or {}
        return method(page, ids) if method else None


def short_date(iso: str) -> str:
    try:
        day = dt.date.fromisoformat(iso)
    except ValueError:
        return iso
    return f"{day.strftime('%b')} {day.day}"


def weekday(iso: str) -> str:
    try:
        return dt.date.fromisoformat(iso).strftime("%A")
    except ValueError:
        return ""


def fill_placeholders(text: str, renderer: Renderer, page_at) -> tuple[str, list[tuple[int, str]]]:
    """Replace each records placeholder with rendered HTML on a single line, so line numbers stay put."""
    problems: list[tuple[int, str]] = []

    def replace(match: re.Match[str]) -> str:
        kind = match.group(1)
        options = dict(opt.split("=", 1) for opt in match.group(2).split())
        line = text.count("\n", 0, match.start()) + 1
        page = options.get("page") or page_at(match.start()) or "overview"
        ids = split_list(options["ids"]) if "ids" in options else None
        if kind == "reasoning":
            unknown = [i for i in ids or [] if i not in renderer.known]
            if not ids or unknown:
                problems.append((line, f"'records reasoning' needs ids=<decision>{'; unknown: ' + ', '.join(unknown) if unknown else ''}"))
        html = renderer.render(kind, page, ids, options)
        if html is None:
            problems.append((line, f"unknown records placeholder '{kind}'"))
            return match.group(0)
        return html

    return PLACEHOLDER.sub(replace, text), problems
