"""Format 2: pages written in Markdown, with the page structure rendered by the skill.

Each pages/<id>.html becomes pages/<id>.md. The parts the skill now renders are
dropped or turned into their Markdown form: the rail, the header, section
numbers, record placeholders a standard section gets anyway, decision relations
and reasoning, and subheads. Everything else a page drew by hand (diagrams,
option cards, cost and flow tables) is kept as raw HTML inside its section, so
nothing is lost; move it into components/ or records when you next work on it.
"""

from __future__ import annotations

import html as htmllib
import re
from pathlib import Path

MONTHS = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), start=1)}
STANDARD = {
    "in short": "short",
    "what we're after": "after",
    "requirements": "requirements",
    "how it fits together": "map",
    "the whole system": "system",
    "design": "design",
    "decision map": "map",
    "how it measures up": "measure",
    "cost": "cost",
    "risks": "risks",
    "decisions": "decisions",
    "open questions": "questions",
}
RECORDS = {"requirements", "measure", "cost", "risks", "decisions", "questions"}


def attr(tag: str, name: str) -> str:
    found = re.search(rf'\b{name}="([^"]*)"', tag)
    return htmllib.unescape(found.group(1)) if found else ""


def to_markdown(fragment: str) -> str:
    """Inline HTML as the Markdown pages write it: mentions as bare IDs, page links as [text](#id)."""
    text = re.sub(r'<a class="mention" href="#([EQDR]\d+)">\1</a>', r"\1", fragment)
    text = re.sub(r'<a href="(#[\w.-]+)">([^<]+)</a>', r"[\2](\1)", text)
    text = re.sub(r"<b>(.*?)</b>", r"**\1**", text)
    text = re.sub(r"\s+", " ", text)
    return htmllib.unescape(text).strip()


def iso(date: str) -> str:
    found = re.match(r"(\w{3}) (\d{1,2}), (\d{4})", date)
    return f"{found.group(3)}-{MONTHS[found.group(1)]:02d}-{int(found.group(2)):02d}" if found else ""


def raw(block: str) -> str:
    """HTML kept as it is, without blank lines, which would end a raw block in Markdown."""
    lines = [line for line in block.split("\n") if line.strip()]
    indent = min((len(line) - len(line.lstrip()) for line in lines), default=0)
    return "\n".join(line[indent:] for line in lines)


def body_blocks(body: str) -> list[str]:
    """A section's content as Markdown blocks: subheads become ### lines, the rest stays raw HTML."""
    blocks: list[str] = []
    position = 0
    for found in re.finditer(r'<div class="subhead"(?: id="([^"]+)")?><h3>(.*?)</h3>(?:<p>(.*?)</p>)?</div>', body, re.S):
        before = body[position : found.start()]
        if before.strip():
            blocks.append(raw(before))
        head = f"### {to_markdown(found.group(2))}" + (f" {{#{found.group(1)}}}" if found.group(1) else "")
        blocks.append(head + (f"\n{to_markdown(found.group(3))}" if found.group(3) else ""))
        position = found.end()
    if body[position:].strip():
        blocks.append(raw(body[position:]))
    return blocks


def div_end(text: str, start: int) -> int:
    """Where the <div> opening at start closes, counting the divs nested in it."""
    depth = 0
    for found in re.finditer(r"<div\b|</div>", text[start:]):
        depth += -1 if found.group(0) == "</div>" else 1
        if depth == 0:
            return start + found.end()
    return len(text)


def section(block: str, prefix: str, group: str) -> str:
    sid = attr(block[: block.index(">")], "id")
    head_start = block.index('<div class="section-head">')
    head = block[head_start : div_end(block, head_start)]
    rest = block[div_end(block, head_start) : block.rindex("</section>")]
    title_html = re.search(r'<div class="section-title">(.*?)</div>', head, re.S).group(1)
    decision = re.search(r'class="ref ref-d" href="#(D\d+)"', title_html)
    title = to_markdown(re.search(r"<h2>(.*?)</h2>", title_html, re.S).group(1))
    intro = re.search(r'<p class="intro">(.*?)</p>', head, re.S)
    lines: list[str] = []

    if decision:
        name = decision.group(1)
        rest = re.sub(rf"<!--\s*records reasoning ids={name}\s*-->", "", rest)
        heading = f"## {name}"
        default = f"{prefix}-{name.lower()}"
    else:
        heading = f"## {title}"
        default = f"{prefix}-{STANDARD.get(title.lower(), re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-'))}"
    if sid and sid != default:
        heading += f" {{#{sid}}}"
    lines.append(heading)
    if intro:
        lines += ["", to_markdown(intro.group(1))]

    short = re.search(r'<div class="short-row">\s*<div class="prose">(.*?)</div>', rest, re.S)
    kind = STANDARD.get(title.lower())
    if short:
        lines += [""] + [f"{to_markdown(p)}\n" for p in re.findall(r"<p>(.*?)</p>", short.group(1), re.S)]
        return "\n".join(lines).rstrip() + "\n"
    if kind in RECORDS:
        rest = re.sub(rf"<!--\s*records {kind}\s*-->", "", rest, count=1)
    if group == "brief" and kind == "questions":
        rest = re.sub(r"<!--\s*records questions blocks=[\w,]+\s*-->", "", rest, count=1)
    rest = re.sub(r"<!--(?!\s*(?:records|component)\b).*?-->", "", rest, flags=re.S)
    for chunk in body_blocks(rest):
        lines += ["", chunk]
    return "\n".join(lines).rstrip() + "\n"


def convert(page: str) -> str:
    opening = page[: page.index(">") + 1]
    pid = attr(opening, "id")
    group = attr(opening, "data-page-group")
    meta = {"title": attr(opening, "data-page-title"), "group": group}
    heading = to_markdown(re.search(r"<h1>(.*?)</h1>", page, re.S).group(1))
    if heading != meta["title"]:
        meta["heading"] = heading
    if attr(opening, "data-page-icon"):
        meta["icon"] = attr(opening, "data-page-icon").removeprefix("i-")
    if attr(opening, "data-page-meta"):
        meta["meta"] = attr(opening, "data-page-meta")

    rail = re.search(r'<nav class="page-rail">(.*?)</nav>', page, re.S)
    rail_html = rail.group(1) if rail else ""
    if "cite-filter" in rail_html:
        meta["shows"] = "evidence"
    elif "meetings-rail" in rail_html:
        meta["shows"] = "meetings"
    elif "decisions-rail" not in rail_html and group in ("overview", "area"):
        meta["rail"] = "none"
    note = re.search(r'<div class="rail-note">\s*<strong>(.*?)</strong>(.*?)</div>', rail_html, re.S)
    if note:
        meta["rail-note"] = f"{to_markdown(note.group(1))}: {to_markdown(note.group(2))}"

    context = re.search(r'<div class="context-line">(.*?)</div>', page, re.S).group(1)
    updated = re.search(r"Updated ([^<]+)</span>", context)
    if updated and iso(updated.group(1)):
        meta["updated"] = iso(updated.group(1))
    if not context.startswith('<a class="mono"'):
        parts = [to_markdown(p) for p in re.findall(r'<span class="mono">(.*?)</span>', context)]
        if parts:
            meta["context"] = " / ".join(parts)
    if group in ("overview", "area") and "<!-- records progress -->" not in page:
        meta["progress"] = "none"

    dek = re.search(r'<p class="dek">(.*?)</p>', page, re.S)
    sections = [page[m.start() : page.index("</section>", m.start()) + 10] for m in re.finditer(r'<section class="section"', page)]
    ids = [attr(s[: s.index(">")], "id") for s in sections]
    prefix = ids[0].split("-")[0] if ids and ids[0] else pid
    if prefix != pid and not meta.get("shows"):
        meta["prefix"] = prefix

    out = ["---", *(f"{key}: {value}" for key, value in meta.items()), "---", ""]
    if dek:
        out += [to_markdown(dek.group(1)), ""]
    if not meta.get("shows"):
        out += [section(s, prefix, group) for s in sections]
    return "\n".join(out).rstrip() + "\n"


def add_follows(folder: Path, pages: list[str]) -> list[str]:
    """Decision relations are drawn from records now: a section's "Follows D0" becomes the decision's Follows field."""
    follows: dict[str, list[str]] = {}
    for page in pages:
        for found in re.finditer(r'<div class="section-title">.*?href="#(D\d+)".*?<div class="relations">(.*?)</div>', page, re.S):
            span = re.search(r"<span>Follows (.*?)</span>", found.group(2), re.S)
            for parent in re.findall(r'href="#(D\d+)"', span.group(1)) if span else []:
                follows.setdefault(found.group(1), []).append(parent)
            # "Unblocks D2 D3" says the same from the other side: D2 and D3 follow this decision.
            span = re.search(r"<span>Unblocks (.*?)</span>", found.group(2), re.S)
            for child in re.findall(r'href="#(D\d+)"', span.group(1)) if span else []:
                follows.setdefault(child, []).append(found.group(1))
    follows = {child: sorted(set(parents), key=lambda d: int(d[1:])) for child, parents in follows.items()}
    design = folder / "design.md"
    lines = design.read_text(encoding="utf-8").split("\n")
    notes: list[str] = []
    for index in range(len(lines) - 1, -1, -1):
        heading = re.match(r"### (D\d+) · ", lines[index])
        if not heading or heading.group(1) not in follows:
            continue
        end = index + 1
        while end < len(lines) and lines[end].startswith(("- ", "  ")):
            end += 1
        if any(line.startswith("- Follows:") for line in lines[index + 1 : end]):
            continue
        lines.insert(end, f"- Follows: {', '.join(follows[heading.group(1)])}")
        notes.append(f"design.md: {heading.group(1)} follows {', '.join(follows[heading.group(1)])}")
    design.write_text("\n".join(lines), encoding="utf-8")
    return notes


def migrate(folder: Path) -> list[str]:
    notes: list[str] = []
    originals: list[str] = []
    shell = folder / "doc.html"
    if not shell.exists():
        return notes
    text = shell.read_text(encoding="utf-8")
    for found in re.finditer(r"<!--\s*include\s+(pages/[\w-]+)\.html\s*-->", text):
        source = folder / f"{found.group(1)}.html"
        if not source.exists():
            continue
        page = source.read_text(encoding="utf-8")
        page = re.sub(r"\A\s*<!--.*?-->\s*", "", page, flags=re.S)
        originals.append(page)
        target = source.with_suffix(".md")
        target.write_text(convert(page), encoding="utf-8")
        source.unlink()
        text = text.replace(found.group(0), f"<!-- include {found.group(1)}.md -->")
        kept = sum(1 for block in target.read_text(encoding="utf-8").split("\n\n") if block.startswith("<"))
        notes.append(f"{source.name} → {target.name}" + (f" ({kept} block(s) of hand-written HTML kept as they were)" if kept else ""))
    shell.write_text(text, encoding="utf-8")
    return notes + add_follows(folder, originals)
