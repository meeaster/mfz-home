"""Read a design's records (design.md and changes.md) and render them as page HTML.

design.md holds what the design has established: the problem, goals and how it
works in prose, then terms, requirements, parts, phases, decisions with their
options, risks, open questions, evidence and meetings.
Pages pull tables from it with placeholders such as

    <!-- records decisions -->
    <!-- records requirements page=s3-archive -->
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
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

# The format a design folder is written in: design.md's first line says "<!-- design-docs format 2 -->".
# doc.py migrate brings an older folder up to date; a folder with no line is format 1 (pages written in HTML).
FORMAT = 4
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
    "plan": "deliverable",
    "links": "link",
    "jira": "jira",
    "facts": "fact",
}
# design.md holds what an update reads every time; Evidence and Meetings may sit in their own files beside it.
SPLIT_FILES = ("design.md", "evidence.md", "meetings.md")
FACT_REF = re.compile(r"\{fact:([a-z0-9][a-z0-9-]*)\}")
# A meeting's Outcomes: one line per thing it settled, '<Kind> · <what> → <record IDs, fact:key or a phase title>'.
OUTCOME_KINDS = {"decided", "leaning", "later", "answer", "so far", "deferred", "new question", "requirement", "deliverable", "phase", "fact", "evidence", "scope", "risk", "follow-on"}
OUTCOME = re.compile(r"^(?P<kind>[^·]+?)\s+·\s+(?P<what>.+?)\s+(?:→|->)\s+(?P<to>.+)$")
# Prose sections an agent reads to understand the design; a page shows them with the design-section component.
PROSE_SECTIONS = {"problem": "problem", "goals": "goals", "how it works": "how-it-works"}
PREFIX = {"requirement": "R", "decision": "D", "question": "Q", "evidence": "E", "deliverable": "P"}
ID_TOKEN = re.compile(r"^[EQDRP]\d+$")
FLOW_ID = re.compile(r"^[A-Z][A-Z0-9]*-F\d+$")
MENTION = re.compile(r"(?<![\w#/\\-])([EQDRP]\d+)\b")
ESCAPED = re.compile(r"\\([EQDRP]\d+)\b")
LINK = re.compile(r"\[([^\]]+)\]\((#[\w.-]+)\)")
PLACEHOLDER = re.compile(r"<!--\s*records\s+([\w-]+)((?:\s+[\w-]+=[^\s>]+)*)\s*-->")
MONEY = re.compile(r"\$([\d,]+(?:\.\d+)?)(?:\s*(?:→|->)\s*\$([\d,]+(?:\.\d+)?))?")
MEETING_HEAD = re.compile(r"^(\d{4}-\d{2}-\d{2})$")
CHANGE_HEAD = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s+·\s+(.+?)\s*$")

REQUIRED = {
    "requirement": ["Priority", "Why", "Source"],
    "decision": ["Status"],
    "evidence": ["Found", "How we know", "Gathered from"],
    "meeting": ["Status"],
    "part": ["Does"],
    "risk": ["Likelihood"],
    "cost": ["Monthly"],
    "flow": ["Data", "Crosses", "Assessment"],
    "deliverable": ["Scope", "Exit criteria", "Status"],
    "link": ["URL"],
    "jira": ["URL", "Type", "Status"],
}
ANSWER_LABELS = ("Answer", "Leaning", "For now", "Assuming", "So far")
DECISION_STATUS = {"open": "open", "leaning": "leaning", "decided": "decided", "later": "", "given": ""}
# Option statuses, and the class an option card carries for each. Set aside and Not chosen take a date.
OPTION_STATUS = {"current leaning": "leaning", "chosen": "chosen", "not chosen": "not-chosen", "set aside": "", "found in research": "", "not designed yet": ""}
OPTION_PILL = {"current leaning": "leaning", "chosen": "decided"}
WHY_LIMIT = 240
EXPLANATION_HINT = "a few sentences on what it asks and where it fits, for a reader who doesn't follow it"
# How far a decision has got, for progress: Given counts as settled.
DECISION_STATE = {"open": "open", "leaning": "leaning", "later": "later", "decided": "decided", "given": "decided"}
UNSETTLED = ("open", "leaning", "later")
MEETING_STATUS = {"awaiting review": "open", "summarised": ""}
# A meeting's proposals: what the meeting could change in the design, each gone through with the user.
PROPOSAL_STATUS = {"proposed": "open", "accepted": "decided", "changed": "decided", "rejected": "", "deferred": "leaning"}
PROPOSAL_LABEL = {"proposed": "To review", "accepted": "Accepted", "changed": "Accepted with changes", "rejected": "Rejected", "deferred": "Deferred"}
# Proposals that change what the design says come first and in full; record-keeping ones fold into one group.
PROPOSAL_ORDER = ["decided", "leaning", "later", "deferred", "answer", "so far", "deliverable", "phase", "scope", "requirement", "fact", "new question", "risk", "evidence", "follow-on"]
ROUTINE_KINDS = {"evidence", "risk", "follow-on"}
FIELD_TALK = re.compile(r"\b(Needed by|Answer from|Blocks|Waiting on|Status|Recorded from|Answered by|Explanation|Still to show)\s*:", re.I)
RECOMMEND = {"accept": "decided", "accept as leaning": "leaning", "ask": "open", "defer": "leaning", "reject": ""}
# A decisions table: the decision with where it stands under it, then what it waits on and where it's worked out.
DECISION_HEAD = ["ID", "Decision", "Waiting on", "Worked out in"]
# A deliverable's Status, and the class its pill takes.
DELIVERABLE_STATUS = {"proposed": "", "planned": "", "in progress": "leaning", "done": "decided"}
# The roles a link plays: something the design published, or someone else's page it relies on.
LINK_ROLES = {"published": "Published from here", "referenced": "Referenced"}
# A Jira item's status as Jira's three categories, from its Category or, without one, from the status words.
JIRA_DONE = re.compile(r"\b(done|closed|resolved|complete|completed|released|shipped)\b", re.IGNORECASE)
JIRA_TODO = re.compile(r"\b(to ?do|open|backlog|new|selected for development|not started)\b", re.IGNORECASE)
JIRA_KEY = re.compile(r"(?:/browse/|[?&]selectedIssue=)([A-Z][A-Z0-9_]*-\d+)")
LIKELIHOOD = {"high": "open", "medium": "open", "low": "", "unknown": ""}
VERDICT = {"yes": "yes", "partly": "partly", "no": "no"}
# How a requirement measures up, three ways: the system as it is today, what this design covers, and what still has to
# be shown before anyone can say it holds. Each maps a verdict to its class; Still to show also to its label.
TODAY = {"meets": "yes", "doesn't meet": "no", "unknown": "unknown", "nothing today": "none"}
DESIGN = {"covers": "yes", "partly covers": "partly", "partly": "partly", "not covered": "no"}
STILL = {"demonstrated": ("Demonstrated", "decided"), "intended": ("Intended, not tested", "leaning"), "unconfirmed": ("Unconfirmed", "open"), "nothing left": ("Nothing left", "")}
# The older single verdict, read as what the design covers.
LEGACY_MET = {"yes": "covers", "partly": "partly", "no": "not covered"}
TODAY_LABEL = {"meets": "Meets", "doesn't meet": "Doesn't meet", "unknown": "Unknown", "nothing today": "Nothing today"}
DESIGN_LABEL = {"covers": "Covers", "partly covers": "Partly covers", "partly": "Partly covers", "not covered": "Not covered"}
# When a question's answer is needed; a phase's title works too.
NEEDED_BY = {"choosing the design": "choose", "before building": "build", "later phase": "later"}
# How a question's answer can be got: by research an agent can do (reading documentation, a repository, an account),
# from a person, or as someone's approval. Research says where to look after a "·".
ANSWER_FROM = {"research": "Research", "person": "Person", "approval": "Approval"}
# An AI recommendation on an open decision or question: advice for the people deciding, never what they agreed. Its parts,
# in the order they're written. Model names the model that made it, since different models recommend differently; Seen is
# the newest evidence it was made from, so later evidence can mark it out of date.
RECOMMEND_PARTS = ("because", "would change if", "confidence", "model", "made", "seen")
CONFIDENCE = ("high", "medium", "low")
# A model's short name fits the AI tag beside a table row; a provider, platform or model ID doesn't.
MODEL_LIMIT = 24
# The parts an Explanation can be written in, in the order they show.
EXPLAIN_PARTS = [("means here", "What it means here"), ("matters", "Why it matters"), ("answer changes", "What the answer changes"), ("settled by", "What settles it")]
# A verdict of "not built yet" says nothing about whether the design fits; these words give it away.
NOT_BUILT = re.compile(r"\b(not (yet )?built|isn't built|aren't built|to be built|once (it's|it is) built|when (it's|it is) built)\b", re.I)
PRIORITY = {"must": "badge", "should": "badge outline"}
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
    # What the cost figures assume and leave out: '- Assumes:' and '- Leaves out:' under '## Costs', before its lines.
    cost_basis: dict[str, Field] = field(default_factory=dict)
    changes: list[Change] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    # Named values defined once under '## Facts' and written as {fact:key} anywhere else: key -> (value, line).
    facts: dict[str, tuple[str, int]] = field(default_factory=dict)
    # Where each read line came from, for messages: (first line number, file name, that file's first line).
    spans: list[tuple[int, str, int]] = field(default_factory=list)
    fact_sources: dict[str, str] = field(default_factory=dict)
    # For a design kept as JSON: where each generated line came from ("design.json › decisions › D1 › Status").
    labels: list[str] = field(default_factory=list)

    def of(self, kind: str) -> list[Record]:
        return [r for r in self.records if r.kind == kind]

    def by_id(self) -> dict[str, Record]:
        return {r.id: r for r in self.records}

    def where(self, line: int) -> str:
        if self.labels and 0 < line <= len(self.labels):
            return self.labels[line - 1]
        for start, name, first in reversed(self.spans):
            if line >= start:
                return f"{name}:{line - start + first}"
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

    lines: list[str] = []
    from jsonfmt import to_markdown
    generated = to_markdown(path.parent)
    if generated is not None:
        lines, design.labels = generated
        design.path = path.parent / "design.json"
    for name in SPLIT_FILES if generated is None else ():
        part = path if name == "design.md" else path.parent / name
        if not part.exists():
            continue
        design.spans.append((len(lines) + 1, part.name, 1))
        lines += part.read_text(encoding="utf-8").splitlines()

    for number, raw in enumerate(lines, start=1):
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

        if section == "fact":
            fact = re.match(r"^- ([a-z0-9][a-z0-9-]*):\s*(.+)$", stripped)
            if fact:
                key, value = fact.group(1), re.split(r"\s+·\s+Source:", fact.group(2))[0].strip()
                source = re.search(r"·\s+Source:\s*(.+)$", fact.group(2))
                if source:
                    design.fact_sources[key] = source.group(1).strip()
                if key in design.facts:
                    design.errors.append(f"{design.where(number)}: fact '{key}' is defined twice")
                design.facts[key] = (value, number)
            elif stripped:
                design.errors.append(f"{design.where(number)}: write a fact as '- key: value · Source: E1'")
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
            basis = re.match(r"^- (Assumes|Leaves out):\s*(.*)$", line)
            if section == "cost" and basis:
                design.cost_basis[basis.group(1)] = last = Field(basis.group(2).strip(), [], number)
                continue
            if section == "cost" and last is not None and re.match(r"^\s{2,}- (.+)$", line):
                last.items.append(line.strip()[2:].strip())
                continue
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
    if path.suffix == ".json" or (path.parent / "design.json").exists():
        import json
        return int(json.loads((path.parent / "design.json").read_text(encoding="utf-8")).get("format", FORMAT))
    first = path.read_text(encoding="utf-8").split("\n", 1)[0] if path.exists() else ""
    found = FORMAT_LINE.match(first)
    return int(found.group(1)) if found else 1


def write_format(path: Path, number: int) -> None:
    json_path = path.parent / "design.json"
    if json_path.exists():
        import json
        data = json.loads(json_path.read_text(encoding="utf-8"))
        data["format"] = number
        json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return
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
    if kind == "jira":
        key, sep, title = text.partition(" · ")
        if not sep or not re.fullmatch(r"[A-Z][A-Z0-9_]*-\d+", key.strip()):
            design.errors.append(f"{design.where(number)}: a Jira item's heading is '### <KEY> · <title>', such as 'OBS-220 · Run the OPW workers'; got '{text}'")
        return Record(kind, key.strip(), title.strip(), number)
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
        if record.kind == "deliverable":
            check_deliverable(record, design)
        if record.kind == "link":
            check_link(record, design)
        if record.kind == "jira":
            check_jira(record, design)
        if record.kind == "requirement" and record.get("Priority").lower() not in PRIORITY:
            design.errors.append(f"{design.where(record.line)}: priority '{record.get('Priority')}'; use Must or Should")
        if record.kind == "decision":
            check_decision(record, design)
        if record.kind in ("decision", "question"):
            check_recommendation(record, design)
        if record.kind == "cost":
            check_cost(record, design)
        if record.kind == "flow":
            for key in ("Crosses", "Assessment"):
                found = record.field(key)
                if found and not parse_met(found.value):
                    design.errors.append(f"{design.where(found.line)}: write a flow's '{key}' as 'Yes|Partly|No · words [E1, Q2]'")
        if record.kind == "requirement":
            check_requirement(record, design)
        if record.field("Explanation") is not None:
            explanation_parts(record, design)

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
                on = re.match(r"^(?:met|design|still to show) on (.+)$", name, re.I)
                if on:
                    page = on.group(1).strip()
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
    check_facts(design)
    check_proposals(design)
    check_outcomes(design)
    check_plan_order(design)

    costs = design.of("cost")
    categorised = [c for c in costs if c.get("Category")]
    if categorised and len(categorised) < len(costs):
        missing = [c.title for c in costs if not c.get("Category")]
        design.warnings.append(f"{design.path.name}: cost lines without a 'Category' ({'; '.join(missing[:4])}); give every line one so totals compare")
    if costs and not design.cost_basis:
        design.warnings.append(f"{design.path.name}: '## Costs' has no '- Assumes:' or '- Leaves out:' before its lines; say what the figures assume and what they leave out")

    meetings = {r.id for r in design.of("meeting")}
    for change in design.changes:
        if change.source.startswith("meeting ") and f"meeting-{change.source[8:].strip()}" not in meetings:
            design.warnings.append(f"changes.md:{change.line}: change source '{change.source}' has no meeting in design.md")
        if change.source.startswith("email") and not re.match(r"^email \d{4}-\d{2}-\d{2} · \S", change.source):
            design.warnings.append(f"changes.md:{change.line}: write an email source as 'email YYYY-MM-DD · <sender>'; got '{change.source}'")


def check_facts(design: Design) -> None:
    """Every {fact:key} in a record names a defined fact."""
    for record in design.records:
        for text, line in record_texts(record):
            for key in FACT_REF.findall(text):
                if key not in design.facts:
                    design.errors.append(f"{design.where(line)}: '{{fact:{key}}}' names no fact under '## Facts'")


def proposals_of(meeting: Record) -> list[dict]:
    """A meeting's proposals, each an object (see records.md)."""
    out = []
    for item in meeting.items("Proposals"):
        try:
            value = json.loads(item)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            out.append(value)
    return out


def check_proposals(design: Design) -> None:
    """Each proposal names what it changes and how it was settled; the meeting's status and Outcomes agree with them."""
    known = design.by_id()
    for meeting in design.of("meeting"):
        found = meeting.field("Proposals")
        if found is None:
            continue
        where = design.where(found.line)
        items = proposals_of(meeting)
        if len(items) != len(found.items):
            design.errors.append(f"{where}: every proposal is an object with n, kind, proposal, recommend and status")
        numbers = [p.get("n") for p in items]
        if len(set(numbers)) != len(numbers):
            design.errors.append(f"{where}: proposal numbers repeat; number them 1, 2, 3 …")
        pending = 0
        outcomes = " ".join(meeting.items("Outcomes"))
        for p in items:
            label = f"{where} › proposal {p.get('n', '?')}"
            for key in ("n", "kind", "proposal", "recommend", "status"):
                if not p.get(key):
                    design.errors.append(f"{label}: no '{key}'")
            status = str(p.get("status", "")).lower()
            if status and status not in PROPOSAL_STATUS:
                design.errors.append(f"{label}: status '{p.get('status')}'; use Proposed, Accepted, Changed, Rejected or Deferred")
            rec = str(p.get("recommend", "")).lower()
            if rec and rec not in RECOMMEND:
                design.errors.append(f"{label}: recommend '{p.get('recommend')}'; use Accept, Accept as leaning, Ask, Defer or Reject, and say why in 'why'")
            if p.get("recommend") and not p.get("why"):
                design.errors.append(f"{label}: give the recommendation's reason in 'why'")
            for t in split_list(str(p.get("target", ""))):
                if ID_TOKEN.match(t) and t not in known and not p.get("new"):
                    design.errors.append(f"{label}: target '{t}' is no record; for a record the proposal would create, set \"new\": true")
            for key, limit in (("proposal", 30), ("before", 14), ("after", 14)):
                words = len(str(p.get(key, "")).split())
                if words > limit:
                    design.warnings.append(f"{label}: '{key}' is {words} words; keep it under {limit} so it reads at a glance")
            for key in ("proposal", "before", "after"):
                if FIELD_TALK.search(str(p.get(key, ""))):
                    design.warnings.append(f"{label}: '{key}' uses field names ('{FIELD_TALK.search(str(p.get(key, ''))).group(0)}'); say it in plain words")
            if status == "proposed":
                pending += 1
            if status in ("accepted", "changed"):
                targets = [t for t in split_list(str(p.get("target", ""))) if t]
                if targets and not any(t in outcomes for t in targets):
                    design.errors.append(f"{label} is {p.get('status')}, but no Outcome points at {', '.join(targets)}; apply it and list it in Outcomes")
            if status in ("changed", "rejected", "deferred") and not p.get("note"):
                design.warnings.append(f"{label} is {p.get('status')}; say what the user decided in 'note'")
        if len(meeting.items("Worth a look")) > 3:
            design.warnings.append(f"{design.where(meeting.line)}: meeting '{meeting.id}' has {len(meeting.items('Worth a look'))} 'Worth a look' notes; keep the three that matter most")
        status = meeting.get("Status").lower()
        if pending and status != "awaiting review":
            design.errors.append(f"{design.where(meeting.line)}: meeting '{meeting.id}' has {pending} proposal(s) still to review; its status is Awaiting review until they're all settled")
        if not pending and items and status == "awaiting review":
            design.warnings.append(f"{design.where(meeting.line)}: every proposal of '{meeting.id}' is settled; set its status to Summarised")


def check_outcomes(design: Design) -> None:
    """Each meeting outcome points at what it changed; the latest meeting's statuses must still hold."""
    known = design.by_id()
    phases = {p.title.lower(): p for p in design.of("deliverable")}
    meetings = design.of("meeting")
    latest = max((m.id for m in meetings), default=None)
    for meeting in meetings:
        found = meeting.field("Outcomes")
        if found is None and meeting.get("Status").lower() == "awaiting review":
            continue
        if found is None:
            design.warnings.append(f"{design.where(meeting.line)}: meeting '{meeting.id}' has no 'Outcomes'; list each thing it settled and the record it changed")
            continue
        for item in found.items:
            m = OUTCOME.match(item)
            if not m or m.group("kind").strip().lower() not in OUTCOME_KINDS:
                design.errors.append(f"{design.where(found.line)}: outcome '{item[:60]}'; write '<Kind> · <what> → <IDs, fact:key or deliverable title>' with Kind one of {', '.join(sorted(OUTCOME_KINDS))}")
                continue
            kind = m.group("kind").strip().lower()
            targets = [t.strip() for t in re.split(r",\s*", m.group("to")) if t.strip()]
            resolved = []
            for t in targets:
                if t in known:
                    resolved.append(known[t])
                elif t.startswith("fact:") and t[5:] in design.facts:
                    resolved.append(None)
                elif t.lower() in phases:
                    resolved.append(phases[t.lower()])
                else:
                    design.errors.append(f"{design.where(found.line)}: outcome '{item[:60]}' points at '{t}', which is no record ID, fact:key or deliverable title")
            if meeting.id != latest:
                continue
            for r in resolved:
                if r is None:
                    continue
                if kind in ("decided", "leaning", "later") and r.kind == "decision":
                    status = r.get("Status").split()[0].lower() if r.get("Status") else ""
                    if status != kind:
                        design.errors.append(f"{design.where(found.line)}: the latest meeting records '{kind}' for {r.id}, but {r.id}'s status is '{r.get('Status')}'")
                if kind == "answer" and r.kind == "question" and not r.get("Answer"):
                    design.errors.append(f"{design.where(found.line)}: the latest meeting answered {r.id}, but {r.id} has no 'Answer'")
                if kind == "so far" and r.kind == "question" and (not r.get("So far") or r.get("Answer")):
                    design.errors.append(f"{design.where(found.line)}: the latest meeting partly answered {r.id}; give it 'So far' and no 'Answer'")


def fill_facts(text: str, design: Design) -> tuple[str, list[str]]:
    """Put each fact's value where a page, component or record writes {fact:key}."""
    missing: list[str] = []

    def value(match: re.Match) -> str:
        key = match.group(1)
        if key not in design.facts:
            missing.append(key)
            return match.group(0)
        return design.facts[key][0]

    return FACT_REF.sub(value, text), missing


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

    Only E, Q, D, R and P records, and never the private Recorded from field or notes,
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
            option = recommended_option(r)
            entry["recommended"] = option.id if option and entry["state"] in UNSETTLED else None
            entry["recommendedBy"] = (recommendation(r) or {}).get("model", "") if entry["recommended"] else ""
            entry["answer"] = next((r.get(label) for label in ANSWER_LABELS if r.get(label)), "")
        elif r.kind == "question":
            state = question_state(r)
            entry["state"] = "answered" if state == "answered" else "deferred" if state == "deferred" else "open"
            entry["states"] = ["open", "deferred", "answered"]
            entry["answer"] = r.get("Answer") or r.get("So far")
        elif r.kind == "requirement":
            # The state bindings follow is how the design covers it: yes, partly or no, as it always was.
            views = requirement_views(r)
            covered = views["design"]
            entry["state"] = DESIGN[covered[0]] if covered else "unknown"
            entry["states"] = [*VERDICT, "unknown"]
            entry["answer"] = covered[1] if covered else ""
            entry["today"] = views["today"][0] if views["today"] else None
            entry["still"] = views["still"][0] if views["still"] else None
        elif r.kind == "deliverable":
            status = (r.get("Status") or "Planned").lower()
            entry["state"] = {"in progress": "progress", "done": "done", "proposed": "proposed"}.get(status, "planned")
            entry["states"] = ["proposed", "planned", "progress", "done"]
            entry["follows"] = split_list(r.get("Follows"))
            entry["group"] = r.get("Group")
            entry["serves"] = split_list(r.get("Serves"))
            jira = {j.id: j for j in design.of("jira")}
            entry["jira"] = [
                {"key": jira_key(u), "url": u, "state": jira_category(jira[jira_key(u)]) if jira_key(u) in jira else None,
                 "type": jira[jira_key(u)].get("Type").lower() if jira_key(u) in jira else ""}
                for u in (r.items("Jira") or split_list(r.get("Jira")))
            ]
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
            "category": r.get("Category"),
            "when": r.get("Applies when"),
        }
        for r in design.of("cost")
    ]
    basis = {key: value.value for key, value in design.cost_basis.items()}

    flows = [{"id": r.id, "title": r.title, "fields": {n: (f.items or f.value) for n, f in r.fields.items() if n.lower() != PRIVATE}} for r in design.of("flow")]

    for r in design.of("decision"):
        records[r.id]["shapes"] = shapes_line(r, design)

    for entry in records.values():
        entry["unblocks"] = sorted((i for i, other in records.items() if entry is not other and any(records.get(f) is entry for f in other.get("follows", []))), key=lambda i: int(i[1:]))

    prose = {name: "\n".join(lines).strip() for name, lines in design.prose.items()}
    groups = list(dict.fromkeys(d.get("Group") for d in design.of("deliverable") if d.get("Group")))
    return {"title": design.title, "records": records, "costs": costs, "costBasis": basis, "flows": flows, "prose": prose, "groups": groups}


def named(record: Record) -> str:
    """How prose names a record: its Rail or Short, lower-cased to sit mid-sentence, else its title."""
    name = record.get("Rail") or record.get("Short")
    if name:
        return name[:1].lower() + name[1:] if not re.match(r"^[A-Z]{2,}", name) else name
    return f"“{record.title}”"


def shapes_line(record: Record, design: Design) -> str:
    """The line under a decision's question: "Needs where the workers run (D1) first." while it's put off until a decision
    it follows is settled, else its Shapes. The name leads, so the line reads without knowing what D1 is."""
    known = design.by_id()
    later = (record.get("Status") or "").lower().startswith("later")
    pending = [d for d in split_list(record.get("Follows")) if d in known and (known[d].get("Status") or "Open").split()[0].lower() in UNSETTLED]
    if later and pending:
        return f"Needs {' and '.join(f'{named(known[d])} ({d})' for d in pending)} first."
    return record.get("Shapes")


def is_answered(question: Record) -> bool:
    return bool(question.get("Answered by")) or question.get("Status").lower() == "answered"


def is_deferred(question: Record) -> bool:
    """Put off on someone's word: it still bears on what it blocks, but nothing waits on it now."""
    return bool(question.get("Deferred")) and not is_answered(question)


def question_state(question: Record) -> str:
    if is_answered(question):
        return "answered"
    if is_deferred(question):
        return "deferred"
    return "partly" if question.get("So far") else "open"


QUESTION_PILL = {"answered": ("Answered", ""), "deferred": ("Deferred", "outline"), "partly": ("Partly answered", "leaning"), "open": ("Open", "open")}


def ask_name(question: Record) -> str:
    """Who to ask, only when someone named them. An older design's 'Who' still shows, without its kind, except the
    reader themselves ('(me)'), which means nothing to anyone else reading the doc."""
    if question.get("Ask"):
        return question.get("Ask")
    match = re.match(r"^(.*?)\s*\(([^)]*)\)\s*$", question.get("Who"))
    if match:
        return "" if match.group(2).strip().lower() == "me" else match.group(1).strip()
    return "" if question.get("Who").strip().lower() == "me" else question.get("Who").strip()


def answer_from(question: Record) -> tuple[str, str]:
    """How the answer can be got, as a key of ANSWER_FROM (or the word as written when it isn't one), and where to look."""
    kind, _, where = question.get("Answer from").partition("·")
    return kind.strip().lower(), where.strip()


def goal_lines(design: Design) -> list[str]:
    """The goals, one per bullet of the Goals prose, numbered from 1 in the order written."""
    return [line.strip()[2:].strip() for line in design.prose.get("goals", []) if line.strip().startswith("- ")]


def jira_key(url: str) -> str:
    """A Jira item's key from its URL ('…/browse/OBS-220'), or the URL itself when it has none."""
    found = JIRA_KEY.search(url)
    return found.group(1) if found else url.strip()


def jira_category(item: Record) -> str:
    """Where a Jira item stands as Jira's three categories: todo, progress or done."""
    category = item.get("Category").lower()
    if category:
        return "done" if "done" in category else "todo" if "do" in category else "progress"
    status = item.get("Status")
    return "done" if JIRA_DONE.search(status) else "todo" if JIRA_TODO.search(status) else "progress"


def link_kind(url: str) -> str:
    """What a link points at, from its URL, as Cairn's pointer types name them."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    path, host = parsed.path, parsed.netloc.lower()
    if re.search(r"/(pull|pulls|merge_requests|pull-requests)/\d+", path):
        return "pull_request"
    if JIRA_KEY.search(url):
        return "jira_issue"
    if (host.endswith("atlassian.net") and path.startswith("/wiki/")) or re.search(r"/(confluence|display)/", path):
        return "confluence_page"
    return "url"


def check_deliverable(record: Record, design: Design) -> None:
    """A deliverable says what it delivers and how everyone knows it's done, what must come first, and which goals and Jira
    items it ties to. It never names an effort: the doc is published, and efforts are local to whoever keeps them."""
    where = design.where(record.line)
    status = record.get("Status")
    if status and status.lower() not in DELIVERABLE_STATUS:
        design.errors.append(f"{where}: deliverable '{record.id}' status '{status}'; use Proposed, Planned, In progress or Done")
    known = {d.id for d in design.of("deliverable")}
    for follows in split_list(record.get("Follows")):
        if follows == record.id or follows not in known:
            design.errors.append(f"{where}: '{record.id}' follows '{follows}', which isn't another deliverable")
    goals = len(goal_lines(design))
    for serves in split_list(record.get("Serves")):
        if not serves.isdigit() or not 1 <= int(serves) <= goals:
            design.warnings.append(f"{where}: '{record.id}' serves goal '{serves}'; name goals by their number in the Goals list (1 to {goals})")
    for url in record.items("Jira") or split_list(record.get("Jira")):
        if not url.startswith("http"):
            design.warnings.append(f"{where}: '{record.id}' Jira '{url}'; give the item's URL, so the doc can link to it")
    if record.field("Effort"):
        design.warnings.append(f"{design.where(record.field('Effort').line)}: '{record.id}' names an effort; a published doc names no effort. Record in the effort which deliverables it works on, and drop it here")


def check_plan_order(design: Design) -> None:
    """Deliverables follow one another without going round in a circle."""
    follows = {d.id: split_list(d.get("Follows")) for d in design.of("deliverable")}
    state: dict[str, int] = {}

    def visit(ident: str, trail: list[str]) -> None:
        if state.get(ident) == 2:
            return
        if state.get(ident) == 1:
            loop = trail[trail.index(ident):] + [ident]
            design.errors.append(f"the plan goes round in a circle: {' → '.join(loop)}")
            return
        state[ident] = 1
        for parent in follows.get(ident, []):
            if parent in follows:
                visit(parent, trail + [ident])
        state[ident] = 2

    for ident in follows:
        visit(ident, [])


def check_link(record: Record, design: Design) -> None:
    where = design.where(record.line)
    url = record.get("URL")
    if url and not url.startswith("http"):
        design.errors.append(f"{where}: link '{record.title}' URL '{url}'; give the full address")
    role = record.get("Role")
    if role and role.lower() not in LINK_ROLES:
        design.warnings.append(f"{where}: link '{record.title}' role '{role}'; use Published or Referenced")
    if not record.get("Why"):
        design.warnings.append(f"{where}: link '{record.title}' doesn't say why it's here; add 'Why', one sentence")


def check_jira(record: Record, design: Design) -> None:
    where = design.where(record.line)
    keys = {j.id for j in design.of("jira")}
    if record.get("URL") and jira_key(record.get("URL")) != record.id:
        design.warnings.append(f"{where}: Jira item '{record.id}' has the URL of '{jira_key(record.get('URL'))}'")
    parent = record.get("Parent")
    if parent and parent not in keys:
        design.warnings.append(f"{where}: Jira item '{record.id}' has parent '{parent}', which isn't in the design's Jira items")
    if not record.get("Read"):
        design.warnings.append(f"{where}: Jira item '{record.id}' doesn't say when it was read from Jira; add 'Read: YYYY-MM-DD HH:MM'")


def check_question(record: Record, design: Design) -> None:
    """A question says what it holds up and, when it matters, when its answer is needed; what to ask next isn't recorded."""
    where = design.where(record.line)
    if not is_answered(record) and not is_deferred(record) and record.field("Explanation") is None:
        design.warnings.append(f"{where}: open question '{record.id}' has no 'Explanation': {EXPLANATION_HINT}")
    if not record.get("Blocks"):
        design.warnings.append(f"{where}: question '{record.id}' blocks nothing; a question that holds up no decision, requirement or flow belongs in the effort's open questions")
    needed = record.field("Needed by")
    planned = {p.title.lower() for p in design.of("deliverable")} | {p.id.lower() for p in design.of("deliverable")}
    if needed and needed.value.lower() not in NEEDED_BY and needed.value.lower() not in planned:
        design.warnings.append(f"{design.where(needed.line)}: question '{record.id}' is needed by '{needed.value}'; use Choosing the design, Before building, Later phase, or a deliverable (P3, or its title)")
    source = record.field("Answer from")
    if source:
        kind, where_to_look = answer_from(record)
        if kind not in ANSWER_FROM:
            design.warnings.append(f"{design.where(source.line)}: question '{record.id}' is answered from '{source.value}'; use Research · where to look, Person, or Approval")
        elif kind == "research" and not where_to_look:
            design.warnings.append(f"{design.where(source.line)}: question '{record.id}' is answered from research but doesn't say where to look: 'Research · Datadog OPW docs'")
    elif not is_answered(record) and not is_deferred(record):
        design.warnings.append(f"{where}: open question '{record.id}' has no 'Answer from': Research · where to look, when an agent could find the answer; Person, when someone has to tell us; Approval, when someone has to sign it off")
    reopen = record.field("Could reopen")
    if reopen and not record.get("Deferred"):
        design.warnings.append(f"{design.where(reopen.line)}: question '{record.id}' has 'Could reopen' but isn't deferred; it's for what a deferred question could still change")
    deferred = record.field("Deferred")
    if deferred and not deferred.value:
        design.errors.append(f"{design.where(deferred.line)}: question '{record.id}' is deferred with no reason; say why it can wait")
    status = record.field("Status")
    if status and status.value.lower() != "answered":
        design.warnings.append(
            f"{design.where(status.line)}: question '{record.id}' has 'Status: {status.value}'; the doc records whether it's answered, partly answered ('So far') or deferred ('Deferred'), and when its answer is needed ('Needed by')"
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
                if decision.id in split_list(question.get("Blocks")) and not is_answered(question) and not is_deferred(question):
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
            if question and question.kind == "question" and is_deferred(question):
                design.warnings.append(f"{design.where(waiting.line)}: {decision.id} is waiting on {ident}, which is deferred; take it off 'Waiting on'")
            elif question and question.kind == "question" and not is_answered(question) and decision.id not in split_list(question.get("Blocks")):
                design.warnings.append(f"{design.where(waiting.line)}: {decision.id} is waiting on {ident}, but {ident}'s 'Blocks' doesn't list {decision.id}")
        for question in design.of("question"):
            if decision.id in split_list(question.get("Blocks")) and not is_answered(question) and not is_deferred(question) and question.id not in listed:
                design.warnings.append(f"{design.where(waiting.line)}: {question.id} blocks {decision.id}, but {decision.id}'s 'Waiting on' doesn't list it")


def check_decision(record: Record, design: Design) -> None:
    """A settled decision says why; its options say which won and why the others didn't."""
    status = record.get("Status") or "Open"
    state = status.split()[0].lower()
    where = design.where(record.line)

    if state in UNSETTLED and not record.get("Explanation"):
        design.warnings.append(f"{where}: decision '{record.id}' is {status} but has no 'Explanation': {EXPLANATION_HINT}")
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
            f"{design.where(shapes.line)}: '{record.id}' Shapes says what it waits on; put that in Follows (the build writes \"Needs where the workers run (D1) first.\" for a Later decision) and say what it settles here"
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


def recommendation(record: Record) -> dict[str, str] | None:
    """A record's AI recommendation: what it recommends, under "value", and each of its parts by lowercase name."""
    found = record.field("Recommendation")
    if found is None:
        return None
    parts = {"value": found.value.strip()}
    for item in found.items:
        key, _, text = item.partition(":")
        parts[key.strip().lower()] = text.strip()
    return parts


def recommended_option(record: Record) -> Record | None:
    """The option a decision's recommendation names, when it names one of its options."""
    rec = recommendation(record)
    return next((o for o in record.options if rec and o.id == rec["value"]), None)


def check_recommendation(record: Record, design: Design) -> None:
    """A recommendation names what it recommends and why, what would change it, how sure it is, the model that made it,
    when, and the newest evidence it saw. Evidence the record has come to rest on since then makes it out of date."""
    rec = recommendation(record)
    if rec is None:
        return
    found = record.field("Recommendation")
    where = design.where(found.line)
    if not rec["value"]:
        design.errors.append(f"{where}: '{record.id}' Recommendation says nothing; its value is the option's ID, or the answer in a few words")
    unknown = [key for key in rec if key != "value" and key not in RECOMMEND_PARTS]
    if unknown:
        design.warnings.append(f"{where}: '{record.id}' Recommendation has '{unknown[0]}'; its parts are Because, Would change if, Confidence, Model, Made and Seen")
    missing = [key.capitalize() for key in RECOMMEND_PARTS if not rec.get(key)]
    if missing:
        design.warnings.append(f"{where}: '{record.id}' Recommendation has no {', '.join(missing)}")
    model = rec.get("model", "")
    if len(model) > MODEL_LIMIT or re.search(r"[()]|\bon\b|\bvia\b|/", model):
        design.warnings.append(f"{where}: '{record.id}' Recommendation model '{model}'; give the model's short name, as people say it (Opus 5.5, Sonnet, GPT Sol 6.1), without provider, platform or model ID")
    if rec.get("confidence") and rec["confidence"].lower() not in CONFIDENCE:
        design.warnings.append(f"{where}: '{record.id}' Recommendation confidence '{rec['confidence']}'; use High, Medium or Low")
    if rec.get("made") and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", rec["made"]):
        design.warnings.append(f"{where}: '{record.id}' Recommendation made '{rec['made']}'; write the date as YYYY-MM-DD")
    if record.options and rec["value"]:
        option = recommended_option(record)
        if option is None:
            design.warnings.append(f"{where}: '{record.id}' recommends '{rec['value']}', which isn't one of its options ({', '.join(o.id for o in record.options)}); name the option by its ID")
        elif option_state(option) in ("set aside", "not chosen"):
            design.warnings.append(f"{where}: '{record.id}' recommends option {option.id}, which is {option.get('Status')}")
    seen = re.fullmatch(r"E(\d+)", rec.get("seen", ""))
    if rec.get("seen") and seen is None:
        design.warnings.append(f"{where}: '{record.id}' Recommendation seen '{rec['seen']}'; name the newest evidence it was made from (E9)")
    if seen is None:
        return
    # What the record rests on now: its own text and options, and what the questions it waits on have found.
    related = [record, *(design.by_id()[i] for i in split_list(record.get("Waiting on")) if i in design.by_id())]
    texts = [text for r in related for text, _ in record_texts(r) if not (r is record and text in found.items)]
    newer = sorted({i for t in texts for i in MENTION.findall(t) if i.startswith("E") and int(i[1:]) > int(seen.group(1))}, key=lambda i: int(i[1:]))
    if newer:
        design.warnings.append(f"{where}: '{record.id}' rests on {', '.join(newer)}, which came after its recommendation (made from evidence through {rec['seen']}); refresh it")


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


def parse_verdict(text: str, verdicts: dict) -> tuple[str, str, list[str]] | None:
    """'Partly covers · words [E1, D2]' -> ('partly covers', 'words', ['E1', 'D2']); the words and the IDs are optional."""
    match = re.match(r"^(.+?)\s*(?:·\s*(.*?))?\s*(?:\[([^\]]*)\])?$", text.strip())
    if not match or match.group(1).strip().lower() not in verdicts:
        return None
    return match.group(1).strip().lower(), (match.group(2) or "").strip(), split_list(match.group(3) or "")


def requirement_views(record: Record, page: str | None = None) -> dict[str, tuple[str, str, list[str]] | None]:
    """How a requirement measures up on a page: today (the same everywhere), the design's cover and what's still to show,
    each the page's own when it has one. An older 'Met' stands in for the design's cover."""
    def pick(key: str):
        return (record.field(f"{key} on {page}") if page else None) or record.field(key)

    design = pick("Design")
    parsed_design = parse_verdict(design.value, DESIGN) if design else None
    if design is None:
        met = pick("Met")
        legacy = parse_met(met.value) if met else None
        parsed_design = (LEGACY_MET[legacy[0].lower()], legacy[1], legacy[2]) if legacy else None
    today = record.field("Today")
    still = pick("Still to show")
    return {
        "today": parse_verdict(today.value, TODAY) if today else None,
        "design": parsed_design,
        "still": parse_verdict(still.value, STILL) if still else None,
    }


def check_requirement(record: Record, design: Design) -> None:
    """Today, Design and Still to show each hold a verdict from their own set; the older Met stays readable."""
    shapes = {"today": (TODAY, "Meets|Doesn't meet|Unknown|Nothing today · what the system does now [E1]"),
              "design": (DESIGN, "Covers|Partly covers|Not covered · how the design meets it [E1, D2]"),
              "still to show": (STILL, "Demonstrated|Intended|Unconfirmed|Nothing left · what shows it holds [E1]")}
    for name, value in record.fields.items():
        lower = name.lower()
        base = re.sub(r" on .+$", "", lower)
        if base == "today" and lower != "today":
            design.errors.append(f"{design.where(value.line)}: '{name}': Today describes the system as it is, for the whole requirement; it has no per-page form")
        elif base in shapes and value.value and parse_verdict(value.value, shapes[base][0]) is None:
            design.errors.append(f"{design.where(value.line)}: write '{name}' as '{shapes[base][1]}'")
        elif base == "met" and value.value and not parse_met(value.value):
            design.errors.append(f"{design.where(value.line)}: write '{name}' as 'Yes|Partly|No · how [E1, D2]', or split it into Today, Design and Still to show")
        if base in ("design", "met") and NOT_BUILT.search(value.value):
            design.warnings.append(
                f"{design.where(value.line)}: '{record.id}' {name} says it isn't built; say how the design meets it, and put what remains to be shown in 'Still to show'"
            )
        if base == "still to show":
            parsed = parse_verdict(value.value, STILL)
            if parsed and parsed[0] == "demonstrated" and not any(i.startswith("E") for i in parsed[2] + MENTION.findall(parsed[1])):
                design.warnings.append(f"{design.where(value.line)}: '{record.id}' is Demonstrated without the evidence that shows it; cite it [E1], or call it Intended")
    if record.field("Met") and record.field("Design"):
        design.warnings.append(f"{design.where(record.field('Met').line)}: '{record.id}' has both Met and Design; Design replaces Met, so drop Met")


def explanation_parts(record: Record, design: Design | None = None) -> list[tuple[str, str]]:
    """An Explanation as labelled parts: a plain one is a single part with no label; a list names each part."""
    found = record.field("Explanation")
    if found is None:
        return []
    if not found.items:
        return [("", found.value)] if found.value else []
    parts = []
    for item in found.items:
        key, _, text = item.partition(":")
        label = next((label for prefix, label in EXPLAIN_PARTS if key.strip().lower().startswith(prefix)), None)
        if label is None or not text.strip():
            if design is not None:
                design.errors.append(
                    f"{design.where(found.line)}: '{record.id}' Explanation item '{item[:40]}'; write each part as 'Means here: …', 'Matters because: …', 'Answer changes: …' or 'Settled by: …'"
                )
            continue
        parts.append((label, text.strip()))
    order = [label for _, label in EXPLAIN_PARTS]
    return sorted(parts, key=lambda p: order.index(p[0]))


def parse_met(text: str) -> tuple[str, str, list[str]] | None:
    match = re.match(r"^(Yes|Partly|No)\s*·\s*(.*?)\s*(?:\[([^\]]*)\])?$", text, re.I)
    if not match:
        return None
    return match.group(1).capitalize(), match.group(2), split_list(match.group(3) or "")



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
        # The records whose modal detail is already written, so a record shown in two tables gets one.
        self.written: set[str] = set()

    def inline(self, text: str) -> str:
        kept: list[str] = []

        def keep(html: str) -> str:
            kept.append(html)
            return f"\x00{len(kept) - 1}\x00"

        # Code spans first, so an ID or a tag-like <slug> inside one stays text; render.mjs does the same.
        out = re.sub(r"`([^`]+)`", lambda m: keep(f"<code>{esc(m.group(1))}</code>"), text)
        out = esc(LINK.sub(lambda m: keep(f'<a href="{esc(m.group(2))}">{esc(m.group(1))}</a>'), out))
        out = MENTION.sub(lambda m: f'<a class="mention" href="#{m.group(1)}">{m.group(1)}</a>' if m.group(1) in self.known else m.group(1), out)
        out = ESCAPED.sub(r"\1", out)
        while re.search(r"\x00\d+\x00", out):
            out = re.sub(r"\x00(\d+)\x00", lambda m: kept[int(m.group(1))], out)
        return out

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

    def verdict_cell(self, view: tuple[str, str, list[str]] | None, classes: dict, labels: dict) -> str:
        if view is None:
            return '<td><span class="not-assessed">Not assessed</span></td>'
        key, words, _ = view
        note = f'<span class="sub">{self.inline(words)}</span>' if words else ""
        return f'<td><span class="verdict {classes[key]}">{esc(labels[key])}</span>{note}</td>'

    def still_cell(self, view: tuple[str, str, list[str]] | None) -> str:
        if view is None:
            return '<td><span class="not-assessed">Not assessed</span></td>'
        label, cls = STILL[view[0]]
        note = f'<span class="sub">{self.inline(view[1])}</span>' if view[1] else ""
        return f'<td><span class="state{" " + cls if cls else ""}">{esc(label)}</span>{note}</td>'

    def measure_row(self, r: Record, page: str) -> str:
        """Three views of a requirement: the system today, what this design covers, and what still has to be shown."""
        views = requirement_views(r, page)
        if not any(views.values()):
            return ""
        rests = list(dict.fromkeys(i for view in views.values() if view for i in view[2]))
        label = r.get("Short") or r.title
        return (
            f'<tr><td>{self.ref(r.id)} {self.inline(label)}</td>{self.verdict_cell(views["today"], TODAY, TODAY_LABEL)}'
            f'{self.verdict_cell(views["design"], DESIGN, DESIGN_LABEL)}{self.still_cell(views["still"])}<td>{self.marks(rests)}</td></tr>'
        )

    def measure(self, page: str, ids: list[str] | None) -> str:
        records = [r for r in self.design.of("requirement") if ids is None or r.id in ids]
        if page == self.home and ids is None:
            rows = self.gathered(records, 5, lambda r: self.measure_row(r, page))
        elif ids is not None:
            rows = [self.measure_row(r, page) for r in records]
        else:
            own = [r for r in records if self.home_of(r) == page]
            rows = [self.measure_row(r, page) for r in own + [r for r in records if r not in own and self.reaches(r, page)]]
        return self.table(["Requirement", "Today", "This design", "Still to show", "Rests on"], [r for r in rows if r])

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

    def detail_head(self, r: Record, pill: str, sub: str) -> str:
        close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
        line = f'<p class="dm-shapes">{self.inline(sub)}</p>' if sub else ""
        if r.kind == "question":
            # A question runs long, so it takes its own line under the ID and status.
            return f'<div class="dm-head"><div class="dm-top"><div class="dm-title">{self.ref(r.id)}{pill}</div>{close}</div><h2>{self.inline(r.title)}</h2>{line}</div>'
        return f'<div class="dm-head"><div class="dm-top"><div class="dm-title">{self.ref(r.id)}<h2>{self.inline(r.title)}</h2>{pill}</div>{close}</div>{line}</div>'

    def explanation(self, r: Record) -> list[str]:
        """What a record means in the design: one paragraph, or its labelled parts side by side with their labels."""
        parts = explanation_parts(r)
        if not parts:
            return []
        if len(parts) == 1 and not parts[0][0]:
            return [f'<div class="dm-explain"><h4>Explanation</h4><p>{self.inline(parts[0][1])}</p></div>']
        rows = "".join(f"<div><dt>{esc(label)}</dt><dd>{self.inline(text)}</dd></div>" for label, text in parts)
        return [f'<div class="dm-explain"><h4>Explanation</h4><dl class="dm-parts">{rows}</dl></div>']

    def id_list(self, idents: list[str], soft: bool = False) -> str:
        """Records as a list, each ID beside its short title."""
        items = "".join(
            f"<li>{self.ref(i)}<span>{self.inline(self.known[i].get('Short') or self.known[i].get('Rail') or self.known[i].title)}</span></li>"
            for i in idents
            if i in self.known
        )
        return f'<ul class="dm-list{" soft" if soft else ""}">{items}</ul>' if items else ""

    def details(self, records: list[Record]) -> str:
        """The modal details of records not written yet, hidden after the table that defines them."""
        fresh = [r for r in records if self.detail_id(r) not in self.written]
        self.written.update(self.detail_id(r) for r in fresh)
        render = {"decision": self.decision_detail, "question": self.question_detail, "risk": self.risk_detail, "deliverable": self.deliverable_detail}
        written = "".join(render[r.kind](r) for r in fresh)
        return f'<div class="record-details">{written}</div>' if written else ""

    def detail_id(self, r: Record) -> str:
        """The id of a record's modal. A risk has no ID of its own, so it takes its place among the risks."""
        if r.kind == "risk":
            return f"risk-{next(i for i, other in enumerate(self.design.of('risk'), start=1) if other is r)}-detail"
        return f"{r.id}-detail"

    def stage(self, q: Record) -> str:
        value = q.get("Needed by")
        if not value:
            return ""
        return f'<span class="stage {esc(NEEDED_BY.get(value.lower(), "phase"))}">{esc(value)}</span>'

    def open_recommendation(self, r: Record) -> dict[str, str] | None:
        """A record's AI recommendation while there's still something to decide: none once it's settled or deferred."""
        settled = self.state(r) not in UNSETTLED if r.kind == "decision" else question_state(r) not in ("open", "partly")
        return None if settled else recommendation(r)

    def recommended(self, r: Record, rec: dict[str, str]) -> str:
        """What a recommendation picks: the option by its ID and title, or the answer it suggests."""
        option = recommended_option(r)
        return f"{esc(option.id)} · {self.inline(option.title)}" if option else self.inline(rec["value"])

    def ai_block(self, r: Record) -> str:
        """The AI recommendation in full, for a record's modal and its section in a brief: kept apart from the team's
        leaning and answer, and labelled as advice."""
        rec = self.open_recommendation(r)
        if rec is None:
            return ""
        meta = " · ".join(filter(None, [rec.get("model", ""), f"{rec['confidence'].capitalize()} confidence" if rec.get("confidence") else "", short_date(rec.get("made", ""))]))
        change = f'<p class="ai-change"><b>Would change if</b> {self.inline(rec["would change if"])}</p>' if rec.get("would change if") else ""
        because = f"<p>{self.inline(rec['because'])}</p>" if rec.get("because") else ""
        return (
            f'<div class="ai-rec"><div class="ai-head"><span class="ai-tag">AI recommendation</span><span class="ai-meta">{esc(meta)}</span></div>'
            f'<p class="ai-pick">{self.recommended(r, rec)}</p>{because}{change}</div>'
        )

    def ai_line(self, r: Record, define: bool) -> str:
        """The AI recommendation in a table row, one line; on the record's definition it's also a line of its card."""
        rec = self.open_recommendation(r)
        if rec is None:
            return ""
        detail = ' data-ref-detail="AI recommends"' if define else ""
        model = f'&nbsp;·&nbsp;<span{" data-ref-detail=" + chr(34) + "AI model" + chr(34) if define else ""}>{esc(rec["model"])}</span>' if rec.get("model") else ""
        # The tag comes after the pick so a card lists what's recommended before the model; CSS shows the tag first.
        return f'<span class="ai-line"><span{detail}>{self.recommended(r, rec)}</span><span class="ai-tag sm"><span>AI{model}</span></span></span>'

    def answer_source(self, q: Record, define: bool) -> str:
        """How a question's answer can be got, as a chip, with where to look for research or who to ask otherwise. On the
        question's definition each part is also a line of its reference card."""
        def part(label: str, html: str, cls: str = "") -> str:
            attrs = (f' class="{cls}"' if cls else "") + (f' data-ref-detail="{label}"' if define else "")
            return f"<span{attrs}>{html}</span>"

        ask = part("Ask", self.inline(ask_name(q))) if ask_name(q) else ""
        if not q.get("Answer from"):
            return ask
        kind, where = answer_from(q)
        chip = part("Answer from", esc(ANSWER_FROM.get(kind, q.get("Answer from"))), f"route {esc(kind)}")
        if kind == "research":
            return chip + (part("Where to look", self.inline(where), "sub") if where else "")
        return chip + (f'<span class="who">{ask}</span>' if ask else "")

    def question_detail(self, q: Record) -> str:
        """What a question opens to: what it asks and where it fits, and what's known so far, its answer, or why it can wait;
        beside them when its answer is needed, who to ask when someone was named, what it blocks, its evidence and where it lives."""
        state = question_state(q)
        answered = state == "answered"
        text, cls = QUESTION_PILL[state]
        pill = f'<span class="status{" " + cls if cls else ""}">{text}</span>'
        main = [self.ai_block(q)] + self.explanation(q)
        label = "Answer" if answered else "So far"
        if q.get(label):
            main.append(f'<div class="dm-answer"><h4>{label}</h4><p>{self.inline(q.get(label))}</p></div>')
        if state == "deferred":
            reopen = f'<p class="note">Could reopen {self.inline(q.get("Could reopen"))}</p>' if q.get("Could reopen") else ""
            main.append(f'<div class="dm-deferred"><h4>Deferred</h4><p>{self.inline(q.get("Deferred"))}</p>{reopen}</div>')

        side = []
        if q.get("Needed by") and not answered:
            side.append(f'<div><h4>Needed by</h4>{self.stage(q)}</div>')
        if q.get("Answer from") and not answered:
            kind, where = answer_from(q)
            look = f"<p>{self.inline(where)}</p>" if kind == "research" and where else ""
            side.append(f'<div><h4>Answer from</h4><span class="route {esc(kind)}">{esc(ANSWER_FROM.get(kind, q.get("Answer from")))}</span>{look}</div>')
        if ask_name(q) and not answered:
            side.append(f'<div><h4>Ask</h4><p>{self.inline(ask_name(q))}</p></div>')
        blocks = split_list(q.get("Blocks"))
        if blocks:
            others = [b for b in blocks if b not in self.known]
            rest = f"<p>{esc(', '.join(others))}</p>" if others else ""
            side.append(f'<div><h4>{"Blocked" if answered else "Blocks"}</h4>{self.id_list(blocks)}{rest}</div>')
        if answered:
            side.append(f'<div><h4>Answered by</h4>{self.id_list(split_list(q.get("Answered by")), soft=True)}</div>')
        cited = [i for i in dict.fromkeys(MENTION.findall(q.get("So far")) + MENTION.findall(q.get("Explanation"))) if i.startswith("E") and i in self.known]
        if cited and not answered:
            side.append(f'<div><h4>Evidence</h4>{self.id_list(cited, soft=True)}</div>')
        if self.home_of(q) != self.home:
            side.append(f'<div><h4>Lives on</h4><div class="dm-chips">{self.area_chip(self.home_of(q))}</div></div>')

        body = f'<div class="dm-body"><div class="dm-main">{"".join(main)}</div><div class="dm-side">{"".join(side)}</div></div>'
        return f'<div class="record-detail" id="{q.id}-detail" aria-label="{esc(q.id)} · {esc(q.title)}">{self.detail_head(q, pill, "")}{body}</div>'

    def risk_detail(self, r: Record) -> str:
        """What a risk opens to, when it has an Explanation: what it means and why it matters, what happens and what we'd do;
        beside them what it's linked to and where it lives."""
        likelihood = r.get("Likelihood").capitalize()
        cls = LIKELIHOOD.get(likelihood.lower(), "")
        pill = f'<span class="status{" " + cls if cls else ""}">{esc(likelihood)}</span>'
        close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
        head = f'<div class="dm-head"><div class="dm-top"><div class="dm-title"><span class="kind">Risk</span>{pill}</div>{close}</div><h2>{self.inline(r.title)}</h2></div>'
        main = self.explanation(r)
        for key in ("If it happens", "What we'd do"):
            if r.get(key):
                main.append(f'<div><h4>{esc(key)}</h4><p>{self.inline(r.get(key))}</p></div>')
        side = []
        linked = [i for i in split_list(r.get("Linked")) if i in self.known]
        if linked:
            side.append(f'<div><h4>Linked</h4>{self.id_list(linked)}</div>')
        if self.home_of(r) != self.home:
            side.append(f'<div><h4>Lives on</h4><div class="dm-chips">{self.area_chip(self.home_of(r))}</div></div>')
        affects = [p for p in split_list(r.get("Applies to")) if p != self.home_of(r)]
        if affects:
            side.append(f'<div><h4>Also affects</h4><div class="dm-chips">{"".join(self.area_chip(p) for p in affects)}</div></div>')
        body = f'<div class="dm-body"><div class="dm-main">{"".join(main)}</div><div class="dm-side">{"".join(side)}</div></div>'
        return f'<div class="record-detail" id="{self.detail_id(r)}" aria-label="Risk · {esc(r.title)}">{head}{body}</div>'

    def decision_detail(self, r: Record) -> str:
        """What a decision opens to: what it asks and where it fits, its answer and reasoning, its options or alternatives,
        and beside them what it waits on, where it's worked out, the other areas it shapes and the evidence behind it."""
        text, cls = self.status(r)
        pill = f'<span class="status{" " + cls if cls else ""}">{esc(text)}</span>'
        head = self.detail_head(r, pill, shapes_line(r, self.design))

        # The AI's recommendation leads, so a reader deciding sees it before the detail it weighs.
        main = [self.ai_block(r)] + self.explanation(r)
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
            side.append(f'<div><h4>Waiting on</h4>{self.id_list(waiting)}</div>')
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
            side.append(f'<div><h4>Evidence</h4>{self.id_list(evidence, soft=True)}</div>')

        foot = ""
        target = r.get("Worked out in")
        page = target if target in self.pages else self.anchors.get(target)
        if r.options and page and self.pages[page]["group"] == "brief":
            foot = f'<div class="dm-foot"><a class="dm-compare" href="#{esc(target)}">Compare the options in the brief</a></div>'

        body = f'<div class="dm-body"><div class="dm-main">{"".join(main)}</div><div class="dm-side">{"".join(side)}</div></div>'
        return f'<div class="record-detail" id="{r.id}-detail" aria-label="{esc(r.id)} · {esc(r.title)}">{head}{body}{foot}</div>'

    def state(self, record: Record) -> str:
        return DECISION_STATE.get((record.get("Status") or "Open").split()[0].lower(), "open")

    def answer(self, r: Record) -> str:
        for label in ANSWER_LABELS:
            if r.get(label):
                return f'<span data-ref-detail="{label}">{self.inline(r.get(label))}</span>'
        return ""

    def decision_row(self, r: Record, define: bool = True, chips: str = "") -> str:
        """A decision as the questions table shows a question: what it asks, and under it where it stands with the answer
        or leaning (or, with neither, what it shapes) and the AI's recommendation; then what it waits on and where it's
        worked out. The row opens the decision's detail, which the defining table writes after itself."""
        text, cls = self.status(r)
        status = f'<span class="status{" " + cls if cls else ""}"{" data-ref-status" if define else ""}>{esc(text)}</span>'
        note = f" {self.inline(r.get('Note'))}" if r.get("Note") else ""
        said = self.answer(r) or self.inline(shapes_line(r, self.design))
        stands = f'<span class="d-stands">{status}<span class="t">{said}{note}</span></span>'
        title = f'<span class="q"{" data-ref-text" if define else ""}>{self.inline(r.title)}</span>'
        waiting = self.marks(split_list(r.get("Waiting on")), "Waiting on" if define else "")
        opens = f' class="opens" data-detail="{r.id}-detail" tabindex="0"'
        ident = f'<td class="id">{self.ref(r.id)}</td>'
        head = f'<tr id="{r.id}" data-ref="decision"{opens}>' if define else f"<tr{opens}>"
        return f"{head}{ident}<td>{title}{stands}{self.ai_line(r, define)}</td><td>{waiting}</td><td>{self.worked_out(r) + chips}</td></tr>"

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
                    rows.append(self.group_row(home, len(DECISION_HEAD)))
                    rows += [self.decision_row(r, True, self.also(r)) for r in self.settled_last(members)]
            table = self.table(DECISION_HEAD, rows)
            return table + self.details(records)


        def row(r: Record, lives_on: str | None) -> str:
            return self.decision_row(r, False, self.lives("Lives on", [lives_on]) if lives_on else self.also(r, page))

        if ids is not None:
            rows = [row(r, None if self.home_of(r) == page else self.home_of(r)) for r in records]
        else:
            rows = self.local(page, self.settled_last(records), len(DECISION_HEAD), row, "Decided elsewhere, shapes this area")
        return self.table(DECISION_HEAD, rows)

    def reasoning(self, page: str, ids: list[str] | None) -> str:
        """A decision's Why, Reasoning and Revisit if, for its section in a brief, and the AI recommendation while it's
        still to decide."""
        blocks = []
        for ident in ids or []:
            record = self.known.get(ident)
            parts = self.reasoning_parts(record, why_detail=False) + [self.ai_block(record)] if record and record.kind == "decision" else []
            parts = [part for part in parts if part]
            if parts:
                blocks.append(f'<div class="reasoning">{"".join(parts)}</div>')
        return "".join(blocks)

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

    # The plan

    def plan_home(self) -> str:
        """The page that defines the deliverables: the plan page when the doc has one, otherwise the home page."""
        return next((page for page, info in self.pages.items() if info["group"] == "plan"), self.home)

    def group_class(self, r: Record) -> str:
        """A colour for the deliverable's group, the same on every page: groups in the order they first appear."""
        groups = list(dict.fromkeys(d.get("Group") for d in self.design.of("deliverable") if d.get("Group")))
        return f"grp-{groups.index(r.get('Group')) % 6 + 1}" if r.get("Group") in groups else ""

    def jira_items(self) -> dict[str, Record]:
        return {j.id: j for j in self.design.of("jira")}

    def jira_chip(self, url: str) -> str:
        """A Jira item as its key, linking to Jira, with the item's status as last read when the design holds it."""
        key = jira_key(url)
        item = self.jira_items().get(key)
        kind = "epic" if item and item.get("Type").lower() == "epic" else "item"
        state = f' data-state="{jira_category(item)}"' if item else ""
        title = f' title="{esc(item.title)} · {esc(item.get("Status"))}"' if item else ""
        return f'<a class="jira-key {kind}" href="{esc(url)}"{state}{title}>{esc(key)}</a>'

    def deliverable_jira(self, r: Record) -> list[str]:
        return r.items("Jira") or split_list(r.get("Jira"))

    def deliverable_status(self, r: Record) -> str:
        status = r.get("Status")
        cls = DELIVERABLE_STATUS.get(status.lower(), "")
        return f'<span class="status{" " + cls if cls else ""}" data-ref-status>{esc(status)}</span>'

    def plan(self, page: str, ids: list[str] | None) -> str:
        """The deliverables, each opening in its modal: what it delivers, what comes first, its status and Jira items."""
        records = [r for r in self.design.of("deliverable") if ids is None or r.id in ids]
        define = page == self.plan_home()
        rows = []
        for r in records:
            attrs = (f' id="{r.id}" data-ref="deliverable"' if define else "") + f' class="opens" data-detail="{r.id}-detail" tabindex="0"'
            group = f'<span class="grp-dot {self.group_class(r)}"></span>' if self.group_class(r) else ""
            ident = f'<td class="id">{group}{r.id if define else self.ref(r.id)}</td>'
            scope = f'<span class="sub"{" data-ref-detail=" + chr(34) + "Scope" + chr(34) if define else ""}>{self.inline(r.get("Scope"))}</span>'
            jira = "".join(self.jira_chip(u) for u in self.deliverable_jira(r)) or '<span class="soft">–</span>'
            rows.append(
                f'<tr{attrs}>{ident}<td><span class="q"{" data-ref-text" if define else ""}>{self.inline(r.title)}</span>{scope}</td>'
                f'<td>{self.marks(split_list(r.get("Follows")))}</td><td>{self.deliverable_status(r)}</td><td><div class="jira-keys">{jira}</div></td></tr>'
            )
        if not rows:
            return ""
        return self.table(["ID", "Deliverable", "Follows", "Status", "Jira"], rows) + (self.details(records) if define else "")

    def deliverable_detail(self, r: Record) -> str:
        """What a deliverable opens to: what it delivers and how everyone knows it's done, the goals it serves and its Jira
        items as last read; beside them what comes first and what it unblocks."""
        head = self.detail_head(r, self.deliverable_status(r), r.get("Group"))
        goals = goal_lines(self.design)
        served = [goals[int(n) - 1] for n in split_list(r.get("Serves")) if n.isdigit() and 1 <= int(n) <= len(goals)]
        main = [f'<div><h4>Scope</h4><p>{self.inline(r.get("Scope"))}</p></div>',
                f'<div><h4>Exit criteria</h4><p data-ref-detail="Exit criteria">{self.inline(r.get("Exit criteria"))}</p></div>']
        if served:
            main.append("<div><h4>Serves</h4><ul class=\"served\">" + "".join(f"<li>{self.inline(g)}</li>" for g in served) + "</ul></div>")
        jira = self.jira_tree(self.deliverable_jira(r))
        if jira:
            main.append(f'<div><h4>Jira items <span class="soft">{esc(self.jira_read())}</span></h4>{jira}</div>')
        side = []
        follows = [i for i in split_list(r.get("Follows")) if i in self.known]
        if follows:
            side.append(f'<div><h4>Follows</h4>{self.id_list(follows)}</div>')
        unblocks = [d.id for d in self.design.of("deliverable") if r.id in split_list(d.get("Follows"))]
        if unblocks:
            side.append(f'<div><h4>Unblocks</h4>{self.id_list(unblocks)}</div>')
        body = f'<div class="dm-body"><div class="dm-main">{"".join(main)}</div><div class="dm-side">{"".join(side)}</div></div>'
        return f'<div class="record-detail" id="{r.id}-detail" aria-label="{esc(r.id)} · {esc(r.title)}">{head}{body}</div>'

    def jira_read(self) -> str:
        reads = sorted(j.get("Read") for j in self.design.of("jira") if j.get("Read"))
        return f"as read {short_date(reads[-1][:10])}{reads[-1][10:]}" if reads else ""

    def jira_tree(self, urls: list[str]) -> str:
        """Jira items with the stories under each, as last read, each linking to Jira."""
        items = self.jira_items()
        rows = []
        for url in urls:
            key = jira_key(url)
            item = items.get(key)
            rows.append(self.jira_row(item, url, nested=False))
            for child in (c for c in items.values() if c.get("Parent") == key):
                rows.append(self.jira_row(child, child.get("URL"), nested=True))
        return f'<ul class="jira-tree">{"".join(rows)}</ul>' if rows else ""

    def jira_row(self, item: Record | None, url: str, nested: bool) -> str:
        key = item.id if item else jira_key(url)
        epic = item is not None and item.get("Type").lower() == "epic"
        title = self.inline(item.title) if item else '<span class="soft">Not read from Jira yet</span>'
        state = f'<span class="jira-state js-{jira_category(item)}">{esc(item.get("Status"))}</span>' if item else ""
        return (f'<li class="{"ji-epic" if epic else "ji-item"}{" nested" if nested else ""}"><a class="jira-key{" epic" if epic else ""}" href="{esc(url)}">{esc(key)}</a>'
                f'<span class="t">{title}</span>{state}</li>')

    # Links

    def links_of(self, kinds: set[str]) -> list[Record]:
        return [r for r in self.design.of("link") if link_kind(r.get("URL")) in kinds]

    def confluence(self, page: str, ids: list[str] | None) -> str:
        """Confluence pages: the ones published from this design, then the ones it relies on."""
        order = {"published": 0, "referenced": 1}
        records = sorted(self.links_of({"confluence_page"}), key=lambda r: order.get(r.get("Role").lower(), 2))
        rows = []
        for r in records:
            role = r.get("Role").lower()
            pill = f'<span class="status{" new" if role == "published" else " outline"}">{esc(LINK_ROLES.get(role, r.get("Role")))}</span>' if role else ""
            meta = " · ".join(filter(None, [r.get("Space"), r.get("Updated")]))
            rows.append(
                f'<tr><td><a class="link-title" href="{esc(r.get("URL"))}">{self.inline(r.title)}</a><span class="sub">{self.inline(r.get("Why"))}</span></td>'
                f'<td>{pill}</td><td class="soft mono">{esc(meta)}</td></tr>'
            )
        return self.table(["Page", "Role", "Space · updated"], rows) if rows else '<p class="soft">No Confluence pages yet.</p>'

    def other_links(self, page: str, ids: list[str] | None) -> str:
        labels = {"pull_request": "Pull request", "url": "Link", "jira_issue": "Jira item"}
        rows = [
            f'<tr><td><a class="link-title" href="{esc(r.get("URL"))}">{self.inline(r.title)}</a><span class="sub">{self.inline(r.get("Why"))}</span></td>'
            f'<td class="soft">{labels.get(link_kind(r.get("URL")), "Link")}</td></tr>'
            for r in self.links_of({"pull_request", "url", "jira_issue"})
        ]
        return self.table(["Link", "Kind"], rows) if rows else '<p class="soft">No other links yet.</p>'

    def jira(self, page: str, ids: list[str] | None) -> str:
        """Every Jira item the design holds, under the deliverable that links it, then those no deliverable links."""
        items = self.jira_items()
        placed: set[str] = set()
        blocks = []
        for d in self.design.of("deliverable"):
            urls = self.deliverable_jira(d)
            if not urls:
                continue
            keys = [jira_key(u) for u in urls]
            placed.update(keys)
            placed.update(c.id for c in items.values() if c.get("Parent") in keys)
            blocks.append(f'<div class="jira-group"><h3>{self.ref(d.id)} {self.inline(d.title)}</h3>{self.jira_tree(urls)}</div>')
        rest = [i for i in items.values() if i.id not in placed and i.get("Parent") not in placed]
        tops = [i for i in rest if not i.get("Parent") or i.get("Parent") not in items]
        if tops:
            blocks.append(f'<div class="jira-group"><h3>Not in the plan</h3>{self.jira_tree([i.get("URL") for i in tops])}</div>')
        if not blocks:
            return '<p class="soft">No Jira items yet.</p>'
        read = self.jira_read()
        return (f'<p class="soft jira-read">{esc(read[0].upper() + read[1:])}.</p>' if read else "") + "".join(blocks)

    def risk_row(self, r: Record, lives_on: str | None = None) -> str:
        likelihood = r.get("Likelihood").capitalize()
        cls = LIKELIHOOD.get(likelihood.lower(), "")
        happens = f'<span class="sub">If it happens: {self.inline(r.get("If it happens"))}</span>' if r.get("If it happens") else ""
        lives = self.lives("Lives on", [lives_on]) if lives_on else ""
        # A risk with an Explanation opens in the modal, as decisions and questions do; the rest stay one line.
        opens = f' class="opens" data-detail="{self.detail_id(r)}" tabindex="0"' if explanation_parts(r) else ""
        return (
            f'<tr{opens}><td><span class="q">{self.inline(r.title)}</span>{happens}{lives}</td><td><span class="status{" " + cls if cls else ""}">{esc(likelihood)}</span></td>'
            f'<td class="soft">{self.inline(r.get("What we\'d do"))}</td><td>{self.marks(split_list(r.get("Linked")))}</td></tr>'
        )

    def risks(self, page: str, ids: list[str] | None) -> str:
        records = self.design.of("risk")
        if page == self.home:
            rows = self.gathered(records, 4, self.risk_row)
        else:
            rows = self.local(page, records, 4, self.risk_row, "Owned elsewhere, affects this area")
        # Each explained risk's modal is written once, after the first table that shows it.
        explained = [r for r in records if explanation_parts(r) and (page == self.home or self.home_of(r) == page or self.reaches(r, page))]
        return self.table(["Risk", "Likelihood", "What we'd do", "Linked"], rows) + self.details(explained)

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

    def cost_tags(self, r: Record) -> str:
        """A line's category, and when it applies: its own words, or the decision it varies with."""
        tags = []
        if r.get("Category"):
            tags.append(f'<span class="cost-tag">{esc(r.get("Category"))}</span>')
        varies = self.known.get(r.get("Varies with"))
        when = r.get("Applies when") or (f"Varies with {named(varies)} ({varies.id})" if varies else "")
        if when:
            tags.append(f'<span class="cost-tag when">{self.inline(when)}</span>')
        return f'<span class="cost-tags">{"".join(tags)}</span>' if tags else ""

    def cost_row(self, r: Record) -> str:
        amount = self.cost_amount(r)
        if amount is not None:
            shown = self.money(amount)
        elif r.get("Varies with"):
            shown = esc(r.get("Monthly"))
        else:
            # Unknown is never $0: it says so, and stays out of the total.
            label = "Per use" if "per use" in r.get("Monthly").lower() else "Unknown"
            shown = f'<span class="unknown">{label}</span><span class="sub">Not in the total</span>'
        linked = split_list(r.get("Evidence")) + split_list(r.get("Varies with")) + split_list(r.get("Affected by"))
        linked += [i for i in MENTION.findall(r.get("Monthly")) if i not in linked]
        return (
            f'<tr><td><span class="q">{esc(r.title)}</span>{self.cost_tags(r)}</td><td class="soft">{self.inline(r.get("Drives"))}</td>'
            f'<td class="num">{shown}</td><td>{self.marks(linked)}</td></tr>'
        )

    def cost_total(self, records: list[Record]) -> tuple[str, list[Record]]:
        """The sum of the lines that have a figure, and the lines left out of it."""
        amounts = [(r, self.cost_amount(r)) for r in records]
        known = [a for _, a in amounts if a is not None]
        missing = [r for r, a in amounts if a is None]
        if not known:
            return "Not known", missing
        return self.money((sum(a[0] for a in known), sum(a[1] for a in known))), missing

    def cost_basis(self) -> str:
        basis = self.design.cost_basis
        if not basis:
            return ""
        rows = "".join(f"<div><dt>{esc(key)}</dt><dd>{self.inline(basis[key].value)}</dd></div>" for key in ("Assumes", "Leaves out") if key in basis)
        return f'<dl class="cost-basis">{rows}</dl>'

    def cost(self, page: str, ids: list[str] | None) -> str:
        """What the figures assume and leave out, then every cost line grouped by area with each area's subtotal, the total
        per month (only what's known, and labelled so), and the totals by category."""
        records = [r for r in self.design.of("cost") if page == self.home or self.home_of(r) == page]
        rows: list[str] = []
        if page == self.home and self.areas():
            for home, members in self.by_home(records):
                subtotal, missing = self.cost_total(members)
                shown = subtotal if subtotal == "Not known" else subtotal + " a month"
                if missing and subtotal != "Not known":
                    shown += f", plus {'one' if len(missing) == 1 else len(missing)} unknown"
                rows.append(self.group_row(home, 4, extra=f'<span class="soft">{shown}</span>'))
                rows += [self.cost_row(r) for r in members]
        else:
            rows += [self.cost_row(r) for r in records]
        total, missing = self.cost_total(records)
        label = "Known total per month" if missing and total != "Not known" else "Total per month"
        note = f"Leaves out {', '.join(r.title[:1].lower() + r.title[1:] for r in missing)}, not known yet." if missing and total != "Not known" else ""
        rows.append(f'<tr class="total"><td>{label}</td><td class="soft">{esc(note)}</td><td class="num">{total}</td><td></td></tr>')
        categories = list(dict.fromkeys(r.get("Category") for r in records if r.get("Category")))
        if categories:
            parts = []
            for category in categories:
                members = [r for r in records if r.get("Category") == category]
                amount, unknown = self.cost_total(members)
                shown = amount if not unknown or amount == "Not known" else f"{amount} + unknown"
                parts.append(f'<span class="cat"><b>{esc(category)}</b> <span class="num">{shown}</span></span>')
            rows.append(f'<tr class="by-category"><td colspan="4"><span class="k">By category</span>{"".join(parts)}</td></tr>')
        return self.cost_basis() + self.table(["Line item", "What drives it", "Monthly", "Evidence"], rows, {2: "num"})

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
        """An open question: what it asks and how far it has got (open, partly answered, or deferred and why), when its
        answer is needed, who to ask when someone was named, and what it blocks."""
        state = question_state(q)
        detail = ' data-ref-detail="So far"' if define else ""
        if state == "partly":
            status = f'<span class="q-state partly">Partly answered</span><span class="sub"{detail}>{self.inline(q.get("So far"))}</span>'
        elif state == "deferred":
            reopen = f" Could reopen {self.inline(q.get('Could reopen'))}" if q.get("Could reopen") else ""
            status = f'<span class="q-state deferred">Deferred</span><span class="sub"{" data-ref-detail=" + chr(34) + "Deferred" + chr(34) if define else ""}>{self.inline(q.get("Deferred"))}{reopen}</span>'
        else:
            status = '<span class="q-state">Open</span>'
        lives = self.lives("Lives on", [lives_on]) if lives_on else ""
        ident = f'<td class="id">{q.id}</td>' if define else f'<td class="id">{self.ref(q.id)}</td>'
        attrs = (f' id="{q.id}" data-ref="question"' if define else "") + f' class="opens{" deferred" if state == "deferred" else ""}" data-detail="{q.id}-detail" tabindex="0"'
        text = f'<span{" data-ref-text" if define else ""}>{self.inline(q.title)}</span>'
        stage = f'<td{" data-ref-detail=" + chr(34) + "Needed by" + chr(34) if define and q.get("Needed by") else ""}>{self.stage(q)}</td>'
        ask = f'<td class="ask">{self.answer_source(q, define)}</td>'
        return (
            f'<tr{attrs}>{ident}<td>{text}<span class="q-status">{status}</span>{self.ai_line(q, define)}{lives}</td>{stage}{ask}'
            f'<td>{self.marks(split_list(q.get("Blocks")), "Blocks" if define else "")}</td></tr>'
        )

    def answered_row(self, q: Record, define: bool) -> str:
        evidence = split_list(q.get("Answered by"))
        found = next((self.known[e].get("Found") for e in evidence if e in self.known and self.known[e].get("Found")), "")
        when = f'<span class="sub">Answered {esc(found)}</span>' if found else ""
        attrs = (f' id="{q.id}" data-ref="question" data-answered' if define else "") + f' class="opens" data-detail="{q.id}-detail" tabindex="0"'
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
        ) + (self.details(questions) if define else "")

    def questions(self, page: str, ids: list[str] | None) -> str:
        """Open questions, then the answered ones collapsed. Each is defined on the overview, or on its home page once answered."""
        records = [q for q in self.design.of("question") if ids is None or q.id in ids]
        blocks = split_list(self.opts.get("blocks", ""))
        if blocks:
            records = [q for q in records if set(split_list(q.get("Blocks"))) & set(blocks)]
        open_ = [q for q in records if not is_answered(q)]
        answered = [q for q in records if is_answered(q)]
        head = ["ID", "Question", "Needed by", "Answer from", "Blocks"]

        if page == self.home and not blocks:
            rows = [self.question_row(q, True) for q in open_] if ids is not None else self.gathered(open_, 5, lambda q: self.question_row(q, True))
            here = [q for q in answered if self.home_of(q) == page]
            return (self.table(head, rows) + self.details(open_) if rows else "") + self.answered_group(here, True)
        if blocks:
            define = page == self.home
            rows = [self.question_row(q, define, None if define else self.home_of(q)) for q in open_]
            return (self.table(head, rows) + (self.details(open_) if define else "") if rows else "") + self.answered_group(answered, define)
        rows = self.local(page, open_, 5, lambda q, lives_on: self.question_row(q, False, lives_on), "Owned elsewhere, affects this area")
        here = [q for q in answered if self.home_of(q) == page]
        return (self.table(head, rows) if rows else "") + self.answered_group(here, True)

    # Progress

    def counts(self, decisions: list[Record], questions: list[Record]) -> tuple[dict[str, int], int, int, int]:
        states = {k: 0 for k in ("decided", "leaning", "open", "later")}
        # A Given decision was never the design's to make, so it doesn't count toward what's settled.
        for d in decisions:
            if not (d.get("Status") or "").lower().startswith("given"):
                states[self.state(d)] += 1
        answered = sum(1 for q in questions if is_answered(q))
        deferred = sum(1 for q in questions if is_deferred(q))
        return states, len(questions) - answered - deferred, answered, deferred

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
                st, oq, aq, dq = self.counts(ds, qs)
                icon = self.pages.get(home, {}).get("icon") or "i-box"
                title = esc(self.page_title(home)) if home != self.home else "Across all areas"
                name = f'<a href="#{esc(home)}">{title}</a>' if home != self.home else f"<span>{title}</span>"
                answered_note = "".join(f'<span class="soft"> · {n} {word}</span>' for n, word in ((dq, "deferred"), (aq, "answered")) if n)
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
            also_q = [q.id for q in questions if self.home_of(q) != page and self.reaches(q, page) and not is_answered(q) and not is_deferred(q)]
        st, oq, aq, dq = self.counts(ds, qs)
        d_note = f"also shaped by {', '.join(also_d)}" if also_d else ", ".join(f"{n} {k}" for k, n in st.items() if n and k != "decided")
        q_note = " · ".join(x for x in (f"{dq} deferred" if dq else "", f"{aq} answered" if aq else "", f"{', '.join(also_q)} {'lives' if len(also_q) == 1 else 'live'} elsewhere" if also_q else "") if x)
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
            proposals = proposals_of(r)
            if proposals:
                body.append(self.proposals_line(r, proposals))
            chips = [item for change in self.design.changes if change.source == f"meeting {date}" for item in change.items]
            if chips:
                body.append('<div class="changes"><span>Changed in this doc</span>' + "".join(f'<span class="change">{esc(c)}</span>' for c in chips) + "</div>")
            blocks.append(
                f'<div class="meeting" id="{r.id}">'
                f'<div class="date"><b>{esc(short_date(date))}</b><small>{esc(weekday(date))}</small></div><div class="track"></div>'
                f'<div class="body"><div class="title"><h3>{esc(r.title)}</h3><span class="status{" " + cls if cls else ""}">{esc(status)}</span></div>'
                f'{"".join(body)}</div></div>'
            )
        modals = "".join(self.proposals_detail(r, proposals_of(r)) for r in self.design.of("meeting") if proposals_of(r))
        return f'<div class="meetings">{"".join(blocks)}</div>' + (f'<div class="record-details">{modals}</div>' if modals else "")

    def proposal_counts(self, proposals: list[dict]) -> tuple[int, int, int]:
        pending = sum(str(p.get("status", "")).lower() == "proposed" for p in proposals)
        accepted = sum(str(p.get("status", "")).lower() in ("accepted", "changed") for p in proposals)
        return pending, accepted, len(proposals) - pending - accepted

    def proposals_line(self, r: Record, proposals: list[dict]) -> str:
        pending, accepted, other = self.proposal_counts(proposals)
        if pending:
            text = f"{pending} of {len(proposals)} proposals to review"
        else:
            text = f"{len(proposals)} proposals reviewed: {accepted} accepted" + (f", {other} not" if other else "")
        return (f'<div class="proposals-line" role="button" tabindex="0" data-detail="{r.id}-proposals">'
                f'<span class="status{" open" if pending else ""}">{esc(text)}</span><span class="open-link">Open the proposals →</span></div>')

    def proposal_also(self, p: dict) -> str:
        """The other records an accepted proposal would write, so one proposal covers everything an outcome touches."""
        items = p.get("also") or []
        if isinstance(items, str):
            items = [items]
        return f'<p class="pr-also"><span>Also records</span> {"; ".join(self.inline(str(i)) for i in items)}</p>' if items else ""

    def proposals_detail(self, r: Record, proposals: list[dict]) -> str:
        """The modal a meeting opens to: every change it could make to the design, in plain words, with what it would
        change, the meeting's words behind it, the recommendation and why, and how the user settled it."""
        close = '<button type="button" class="dm-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
        pending, accepted, other = self.proposal_counts(proposals)
        summary = " · ".join(part for part in (f"{pending} to review" if pending else "", f"{accepted} accepted" if accepted else "", f"{other} not accepted" if other else "") if part)
        head = (f'<div class="dm-head"><div class="dm-top"><div class="dm-title"><span class="kind">Proposals</span>'
                f'<span class="status{" open" if pending else ""}">{esc(summary)}</span></div>{close}</div>'
                f'<h2>What the {esc(short_date(r.id[8:]))} meeting could change</h2>'
                f'<p class="dm-shapes">{esc(r.title)}. What would change, the meeting\'s words behind it, and what I recommend. Settle them by number.</p></div>')
        def rank(p: dict) -> tuple:
            kind = str(p.get("kind", "")).lower()
            return (PROPOSAL_ORDER.index(kind) if kind in PROPOSAL_ORDER else len(PROPOSAL_ORDER), p.get("n", 0))

        def routine(p: dict) -> bool:
            tier = str(p.get("tier", "")).lower()
            return tier == "routine" if tier else str(p.get("kind", "")).lower() in ROUTINE_KINDS

        key = sorted((p for p in proposals if not routine(p)), key=rank)
        rest = sorted((p for p in proposals if routine(p)), key=rank)
        cards = []
        for p in key:
            status = str(p.get("status", "proposed")).lower()
            rec = str(p.get("recommend", "")).lower()
            targets = [t for t in split_list(str(p.get("target", ""))) if t]
            chips = "".join(self.ref(t) if t in self.known else f'<span class="change">{esc(t)}{" (new)" if p.get("new") else ""}</span>' for t in targets)
            change = ""
            if p.get("before") or p.get("after"):
                change = (f'<div class="pr-change"><div><span class="pr-label">Now</span>{self.inline(str(p.get("before") or "Nothing recorded"))}</div>'
                          f'<span class="pr-arrow">→</span><div><span class="pr-label">If accepted</span>{self.inline(str(p.get("after", "")))}</div></div>')
            quote = f'<blockquote class="pr-quote"><span class="pr-label">From the meeting</span>{self.inline(str(p["from"]))}</blockquote>' if p.get("from") else ""
            advice = (f'<div class="pr-rec {RECOMMEND.get(rec, "")}"><span class="pr-label">I recommend</span>'
                      f'<b>{esc(str(p.get("recommend", "")))}</b><p>{self.inline(str(p.get("why", "")))}</p></div>')
            note = f'<div class="pr-note"><span class="pr-label">What we decided</span>{self.inline(str(p["note"]))}</div>' if p.get("note") else ""
            cards.append(
                f'<li class="proposal {status}"><div class="pr-top"><span class="pr-n">{esc(str(p.get("n", "")))}</span>'
                f'<span class="pr-kind">{esc(str(p.get("kind", "")))}</span>{chips}'
                f'<span class="status {PROPOSAL_STATUS.get(status, "")}">{esc(PROPOSAL_LABEL.get(status, str(p.get("status", ""))))}</span></div>'
                f'<p class="pr-text">{self.inline(str(p.get("proposal", "")))}</p>{self.proposal_also(p)}{change}{quote}{advice}{note}</li>')
        group = ""
        if rest:
            rows = []
            for p in rest:
                status = str(p.get("status", "proposed")).lower()
                rec = str(p.get("recommend", "")).lower()
                targets = [t for t in split_list(str(p.get("target", ""))) if t]
                chips = "".join(self.ref(t) if t in self.known else f'<span class="change">{esc(t)}</span>' for t in targets)
                note = f'<span class="pr-row-note">{self.inline(str(p["note"]))}</span>' if p.get("note") else ""
                rows.append(f'<li class="pr-row {status}"><span class="pr-n">{esc(str(p.get("n", "")))}</span><span class="pr-kind">{esc(str(p.get("kind", "")))}</span>{chips}'
                            f'<span class="pr-row-text">{self.inline(str(p.get("proposal", "")))}{self.proposal_also(p)}{note}</span>'
                            f'<span class="pr-rec-pill {RECOMMEND.get(rec, "")}">{esc(str(p.get("recommend", "")))}</span>'
                            f'<span class="status {PROPOSAL_STATUS.get(status, "")}">{esc(PROPOSAL_LABEL.get(status, str(p.get("status", ""))))}</span></li>')
            open_attr = " open" if any(str(p.get("status", "")).lower() == "proposed" for p in rest) and not key else ""
            group = (f'<details class="pr-routine"{open_attr}><summary><b>Record keeping</b> · {len(rest)} proposal{"s" if len(rest) != 1 else ""}: evidence, risk updates and follow-ons that keep the design consistent. '
                     f'Say "accept the rest" to take my recommendation on all of them.</summary><ol class="pr-rows">{"".join(rows)}</ol></details>')
        look = ""
        if r.items("Worth a look"):
            look = ('<div class="pr-look"><span class="pr-label">Worth a look (not discussed in the meeting)</span><ul>'
                    + "".join(f"<li>{self.inline(i)}</li>" for i in r.items("Worth a look")) + "</ul></div>")
        heading = '<h3 class="pr-group">Changes to what the design says</h3>' if key and rest else ""
        return (f'<div class="record-detail" id="{r.id}-proposals" aria-label="Proposals from {esc(r.title)}">{head}'
                f'<div class="pr-body">{heading}<ol class="proposals">{"".join(cards)}</ol>{group}{look}</div></div>')

    def render(self, kind: str, page: str, ids: list[str] | None, opts: dict[str, str] | None = None) -> str | None:
        method = {
            "requirements": self.requirements,
            "measure": self.measure,
            "decisions": self.decisions,
            "reasoning": self.reasoning,
            "parts": self.parts,
            "risks": self.risks,
            "plan": self.plan,
            "confluence": self.confluence,
            "other-links": self.other_links,
            "jira": self.jira,
            "cost": self.cost,
            "terms": self.terms,
            "evidence": self.evidence,
            "questions": self.questions,
            "meetings": self.meetings,
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
