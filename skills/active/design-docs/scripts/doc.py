#!/usr/bin/env python3
"""Check a design and build its self-contained, publishable HTML doc.

Usage:
  doc.py check <design folder | doc.html>
  doc.py build <design folder | doc.html> [-o <out.html>] [--pages <id,id>]
  doc.py migrate <design folder>

A design folder holds design.md (the records), changes.md (accepted changes),
and, once the design has a doc, doc.html (the shell) with one Markdown file per
page in pages/, pulled in with <!-- include pages/<id>.md --> comments, and the
doc's own components in components/. render.mjs (Node) renders the pages and
components and applies record bindings; record tables come from design.md
through <!-- records <kind> [page=<id>] [ids=<ids>] -->. A folder with only
design.md is checked on its own.

`build` runs `check` first and refuses to write output when it finds errors.
It renders the record tables, assembles the pages, writes the page switcher
into the rail, moves each page's own rail content next to it, and inlines
doc.css and doc.js (from the doc's folder if present, otherwise from this
skill's assets) so the result is one portable file.

`migrate` brings a design folder written for an older version of this skill
up to date: it copies the folder's files to .migrate-backup/format-<n>/, runs
each migration in migrations/ newer than the folder's format, in order, and
records the new format on design.md's first line.

`--pages` builds a copy with only the listed pages. Shared pages (evidence,
meetings) come along, trimmed to the items the listed pages cite,
and references to anything left out become plain text.
"""

from __future__ import annotations

import argparse
import importlib.util
import html as htmllib
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

from records import FORMAT, LOCAL_PATH_PATTERNS, OPTION_STATUS, Design, read_format, write_format, Renderer, check_design, design_model, fill_placeholders, option_state, read_design

SKILL_ASSETS = Path(__file__).resolve().parent.parent / "assets"
RENDER = Path(__file__).resolve().parent / "render.mjs"
REF_ID = re.compile(r"^[EQDR]\d+$")
FLOW_ID = re.compile(r"^[A-Z][A-Z0-9]*-F\d+$")
KIND_FOR_PREFIX = {"E": "evidence", "Q": "question", "D": "decision", "R": "requirement"}
PAGE_GROUPS = {"overview": "", "area": "Areas", "brief": "Briefs", "shared": "Shared"}
DEFAULT_ICONS = {"overview": "i-layout-dashboard", "area": "i-box", "brief": "i-signpost", "shared": "i-file-check"}
ALLOWED_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com")
INCLUDE = re.compile(r"<!--\s*include\s+(\S+?)\s*-->")
COMPONENT = re.compile(r'<!--\s*component\s+([\w-]+)((?:\s+[\w-]+(?:="[^"]*"|=\S+)?)*)\s*-->')
BINDING = re.compile(r'\sdata-(?:pending|when|text|state-of)="')
ARTICLE_TAG = re.compile(r"<article\b[^>]*>|</article>")
PAGE_CLASS = re.compile(r'\bclass="page\b')
PAGE_RAIL = re.compile(r'<nav\b[^>]*\bclass="page-rail\b[^"]*"[^>]*>.*?</nav>\s*', re.S)
VOID = {"br", "img", "input", "link", "meta", "hr", "source", "use", "path", "circle", "rect", "line", "wbr", "col"}
# Elements whose end tag HTML lets you leave out; an unclosed one is not a mistake.
OPTIONAL_END = {"p", "li", "dt", "dd", "td", "th", "tr", "thead", "tbody", "tfoot", "option", "html", "head", "body"}


# Assembling: resolve includes and remember where each line came from.


@dataclass
class Source:
    text: str
    files: list[Path]
    segments: list[tuple[int, Path, int]]  # (first line in text, file, first line in file)
    errors: list[str] = field(default_factory=list)

    def where(self, line: int) -> str:
        found = self.segments[0]

        for segment in self.segments:
            if segment[0] <= line:
                found = segment

        start, path, first = found
        return f"{path.name}:{first + line - start}"


def run_render(request: dict) -> dict:
    """Ask render.mjs to render Markdown pages and components, or to apply bindings."""
    if shutil.which("node") is None:
        raise SystemExit("this doc has Markdown pages, components or bindings, and rendering them needs Node")
    done = subprocess.run(["node", str(RENDER)], input=json.dumps(request), capture_output=True, text=True, check=False)
    if done.returncode != 0:
        raise SystemExit(f"render.mjs failed:\n{done.stderr}")
    return json.loads(done.stdout)


def home_page(shell: Path, text: str) -> dict:
    """The page every other page's context line links back to: the overview, or the first page."""
    names = [shell.parent / m.group(1) for m in INCLUDE.finditer(text)]
    names = [p for p in names if p.exists()]
    home = next((p for p in names if p.stem == "overview"), names[0] if names else None)
    if home is None:
        return {"id": "overview", "title": "Overview"}
    body = home.read_text(encoding="utf-8")
    found = re.search(r"^title:\s*(.+)$", body, re.M) if home.suffix == ".md" else re.search(r'data-page-title="([^"]+)"', body)
    return {"id": home.stem, "title": found.group(1).strip() if found else home.stem}


def assemble(shell: Path, model: dict) -> Source:
    """Resolve includes, render Markdown pages and components, and remember where each line came from.

    A rendered page or .mjs component is reported as '<file> (rendered)', with line
    numbers counted in the rendered HTML; an .html component keeps its own lines.
    """
    text = shell.read_text(encoding="utf-8")
    out: list[str] = []
    segments: list[tuple[int, Path, int]] = []
    files = [shell]
    errors: list[str] = []
    pieces: list[tuple[str, object, Path, int]] = []  # ("text", chunk, file, first line) or ("page"/"component", index, file, 0)
    pages: list[dict] = []
    components: list[dict] = []
    line = 1
    position = 0

    def add(chunk: str, path: Path, first: int) -> None:
        nonlocal line
        segments.append((line, path, first))
        out.append(chunk)
        line += chunk.count("\n")

    for match in INCLUDE.finditer(text):
        pieces.append(("text", text[position : match.start()], shell, text.count("\n", 0, position) + 1))
        position = match.end()
        included = shell.parent / match.group(1)

        if not included.exists():
            errors.append(f"{shell.name}:{text.count(chr(10), 0, match.start()) + 1}: included file '{match.group(1)}' doesn't exist")
            continue

        files.append(included)
        body = included.read_text(encoding="utf-8")

        if included.suffix == ".md":
            pieces.append(("page", len(pages), included, 0))
            pages.append({"file": included.name, "text": body})
            continue

        at = 0
        for use in COMPONENT.finditer(body):
            pieces.append(("text", body[at : use.start()], included, body.count("\n", 0, at) + 1))
            pieces.append(("component", len(components), included, 0))
            components.append({"name": use.group(1), "props": use.group(2), "page": included.stem})
            at = use.end()
        pieces.append(("text", body[at:], included, body.count("\n", 0, at) + 1))

    pieces.append(("text", text[position:], shell, text.count("\n", 0, position) + 1))

    rendered = {"pages": [], "components": []}
    if pages or components:
        request = {"cmd": "pages", "folder": str(shell.parent), "model": model, "pages": pages, "components": components, "home": home_page(shell, text)}
        rendered = run_render(request)

    for kind, value, path, first in pieces:
        if kind == "text":
            add(str(value), path, first)
            continue
        result = rendered["pages" if kind == "page" else "components"][int(str(value))]
        source = path
        if kind == "component" and result["file"]:
            source = Path(result["file"])
            files.append(source)
        label = source if source.suffix == ".html" else Path(f"{source.name} (rendered)")
        errors += [f"{label.name}: {message}" for message in result["errors"]]
        add(result["html"], label, 1)

    return Source("".join(out), files, segments, errors)


# Parsing


@dataclass
class Definition:
    id: str
    kind: str
    line: int
    page: str | None
    has_status: bool = False
    has_text: bool = False
    details: set[str] = field(default_factory=set)


@dataclass
class Link:
    href: str
    classes: set[str]
    line: int
    inside: str | None
    page: str | None


@dataclass
class Page:
    id: str
    title: str
    group: str
    icon: str
    meta: str
    line: int
    has_rail: bool = False
    definitions: int = 0


class DocParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: dict[str, int] = {}
        self.duplicate_ids: list[tuple[str, int]] = []
        self.definitions: dict[str, Definition] = {}
        self.links: list[Link] = []
        self.external: list[tuple[str, int]] = []
        self.stylesheets: list[str] = []
        self.scripts: list[str] = []
        self.symbols: set[str] = set()
        self.pages: list[Page] = []
        self.stack: list[tuple[str, str | None, str | None, int]] = []
        self.unbalanced: list[tuple[int, str, int | None]] = []

    def current(self, index: int) -> str | None:
        for entry in reversed(self.stack):
            if entry[index] is not None:
                return entry[index]
        return None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k: (v or "") for k, v in attrs}
        line = self.getpos()[0]
        classes = set(a.get("class", "").split())
        definition = None
        page = None

        if tag == "article" and "page" in classes:
            page = a.get("id", "")
            group = a.get("data-page-group", "")
            self.pages.append(
                Page(page, a.get("data-page-title", ""), group, a.get("data-page-icon", DEFAULT_ICONS.get(group, "")), a.get("data-page-meta", ""), line)
            )

        if tag == "nav" and "page-rail" in classes and self.pages:
            self.pages[-1].has_rail = True

        if tag == "symbol" and "id" in a:
            self.symbols.add(a["id"])

        in_page = page or self.current(2)

        if "id" in a:
            if a["id"] in self.ids:
                self.duplicate_ids.append((a["id"], line))
            self.ids.setdefault(a["id"], line)
            if "data-ref" in a:
                definition = a["id"]
                self.definitions[a["id"]] = Definition(a["id"], a["data-ref"], line, in_page)
                if self.pages and in_page == self.pages[-1].id:
                    self.pages[-1].definitions += 1

        owner = definition or self.current(1)
        if owner is not None and owner in self.definitions:
            d = self.definitions[owner]
            if "data-ref-status" in a:
                d.has_status = True
            if "data-ref-text" in a:
                d.has_text = True
            if "data-ref-detail" in a:
                d.details.add(a["data-ref-detail"])

        if tag == "a" and "href" in a:
            self.links.append(Link(a["href"], classes, line, owner, in_page))
        if tag == "link" and a.get("rel") == "stylesheet":
            self.stylesheets.append(a.get("href", ""))
        if tag == "script" and "src" in a:
            self.scripts.append(a["src"])
        for attr in ("src", "href"):
            url = a.get(attr, "")
            if url.startswith(("http://", "https://", "//")) and not any(h in url for h in ALLOWED_HOSTS):
                if not (tag == "a" and attr == "href"):
                    self.external.append((url, line))

        if tag not in VOID:
            self.stack.append((tag, definition, page, line))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1][0] == tag:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID:
            return
        line = self.getpos()[0]
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for left_open in self.stack[i + 1 :]:
                    if left_open[0] not in OPTIONAL_END:
                        self.unbalanced.append((left_open[3], f"<{left_open[0]}> is never closed; </{tag}> closes around it", line))
                del self.stack[i:]
                return
        self.unbalanced.append((line, f"</{tag}> has no matching <{tag}>", None))

    def close(self) -> None:
        super().close()
        for left_open in self.stack:
            if left_open[0] not in OPTIONAL_END:
                self.unbalanced.append((left_open[3], f"<{left_open[0]}> is never closed", None))


def parse(text: str) -> DocParser:
    p = DocParser()
    p.feed(text)
    p.close()
    return p


# Checking


def check_links(p: DocParser, where) -> tuple[list[str], list[str], set[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    cited: set[str] = set()

    for link in p.links:
        if not link.href.startswith("#") or link.href == "#":
            continue
        target = link.href[1:]
        if target not in p.ids:
            errors.append(f"{where(link.line)}: link to '#{target}', but nothing has that id")
            continue
        if link.inside != target:
            cited.add(target)
        is_trigger = bool(link.classes & {"ref", "mention", "flow"})
        if is_trigger and target not in p.definitions:
            errors.append(f"{where(link.line)}: reference to '#{target}', which isn't a definition (no data-ref)")
        if "ref" in link.classes and REF_ID.match(target):
            want = f"ref-{target[0].lower()}"
            if want not in link.classes:
                warnings.append(f"{where(link.line)}: marker for '{target}' should have class '{want}'")

    return errors, warnings, cited


def check_text(p: DocParser, where) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    for ident, line in p.duplicate_ids:
        errors.append(f"{where(line)}: duplicate id '{ident}' (ids are shared by every page of the doc)")
    for line, problem, closed_at in p.unbalanced:
        errors.append(f"{where(line)}: {problem}" + (f" at {where(closed_at)}" if closed_at else ""))

    for d in p.definitions.values():
        if d.kind == "flow":
            expected = "flow" if FLOW_ID.match(d.id) else None
        else:
            expected = KIND_FOR_PREFIX.get(d.id[0]) if REF_ID.match(d.id) else None
        if expected is None:
            errors.append(f"{where(d.line)}: definition id '{d.id}' should look like E1, Q1, D1, R1, or B-F1 for a data flow")
        elif d.kind != expected:
            errors.append(f"{where(d.line)}: '{d.id}' has data-ref=\"{d.kind}\"; expected \"{expected}\"")
        if not d.has_text:
            warnings.append(f"{where(d.line)}: '{d.id}' has no data-ref-text; its card will show the whole row")
        if d.kind == "question" and not {"Who can answer", "Answer"} & set(d.details):
            errors.append(f"{where(d.line)}: question '{d.id}' has no data-ref-detail=\"Who can answer\" (or \"Answer\" once answered)")
        if d.kind == "decision" and not d.has_status:
            warnings.append(f"{where(d.line)}: '{d.id}' has no data-ref-status")

    link_errors, link_warnings, cited = check_links(p, where)
    errors += link_errors
    warnings += link_warnings

    for d in p.definitions.values():
        if d.kind == "evidence" and d.id not in cited:
            warnings.append(f"{where(d.line)}: evidence '{d.id}' isn't cited anywhere")
        if d.kind == "question" and d.id not in cited and "Answer" not in d.details:
            warnings.append(f"{where(d.line)}: question '{d.id}' isn't referenced by any decision, diagram or page")
        if d.kind == "flow" and d.id not in cited:
            warnings.append(f"{where(d.line)}: flow '{d.id}' has no chip in its diagram linking to it")

    for url, line in p.external:
        warnings.append(f"{where(line)}: loads an external resource ({url}); the page may not work offline")

    return errors, warnings


def check_pages(p: DocParser, text: str, where) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    groups = {page.id: page.group for page in p.pages}

    for page in p.pages:
        if not page.id:
            errors.append(f"{where(page.line)}: a page needs an id")
        if not page.title:
            errors.append(f"{where(page.line)}: page '{page.id}' needs data-page-title")
        if page.group not in PAGE_GROUPS:
            errors.append(f"{where(page.line)}: page '{page.id}' has data-page-group=\"{page.group}\"; use overview, area, brief or shared")
        if len(p.pages) > 1:
            if not page.has_rail:
                warnings.append(f"{where(page.line)}: page '{page.id}' has no <nav class=\"page-rail\">; the rail will be empty on it")
            if page.icon and page.icon not in p.symbols:
                errors.append(f"{where(page.line)}: page '{page.id}' uses icon '#{page.icon}', which isn't in the SVG definitions")

    if len(p.pages) > 1:
        for marker in ("pages-nav", "page-rails"):
            if f"<!-- {marker} -->" not in text:
                errors.append(f"the shell's rail has no <!-- {marker} --> marker for build to fill")
        if any(page.group == "shared" for page in p.pages):
            for d in p.definitions.values():
                if d.kind == "evidence" and d.page is not None and groups.get(d.page) != "shared":
                    warnings.append(f"{where(d.line)}: evidence '{d.id}' is on page '{d.page}'; with shared pages, keep it on the Evidence page")

    return errors, warnings


def check_local_paths(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        for number, text in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            for pattern, label in LOCAL_PATH_PATTERNS:
                match = pattern.search(text)
                if match:
                    errors.append(f"{path.name}:{number}: {label} would be published: '{match.group(0)}'")
    return errors


def page_map(text: str) -> tuple[dict[str, dict], dict[str, str], list[tuple[int, int, str]]]:
    """Each page's title, group and icon; which page every id is on; and where each page sits."""
    pages: dict[str, dict] = {}
    anchors: dict[str, str] = {}
    spans: list[tuple[int, int, str]] = []

    for start, end in page_spans(text):
        head = opening(text[start:end])
        page = attr(head, "id")
        group = attr(head, "data-page-group")
        pages[page] = {"title": attr(head, "data-page-title"), "group": group, "icon": attr(head, "data-page-icon") or DEFAULT_ICONS.get(group, "")}
        spans.append((start, end, page))
        for ident in re.findall(r'\bid="([^"]+)"', text[start:end]):
            anchors.setdefault(ident, page)

    return pages, anchors, spans


def check_against_records(design: Design, text: str, where) -> list[str]:
    """Warnings where hand-written page content disagrees with the records."""
    warnings: list[str] = []
    known = design.by_id()

    def line_of(position: int) -> str:
        return where(text.count("\n", 0, position) + 1)

    for match in re.finditer(r'<section\b[^>]*>(.*?)</section>', text, re.S):
        title = re.search(r'<div class="section-title">(.*?)</div>', match.group(1), re.S)
        head = re.search(r'href="#(D\d+)"', title.group(1)) if title else None
        if not head or head.group(1) not in known:
            continue
        decision = known[head.group(1)]
        if not decision.options:
            continue
        body = match.group(1)
        cards = re.finditer(r'<article class="option([^"]*)">\s*<div class="option-head">\s*<span class="(?:letter|numeral)">([^<]+)</span>\s*<div class="text"><h3>(.*?)</h3>', body, re.S)
        card_classes = {}
        shown = {}
        for card in cards:
            shown[card.group(2)] = htmllib.unescape(card.group(3)).strip()
            card_classes[card.group(2)] = {c for c in card.group(1).split() if c in OPTION_STATUS.values() and c}
        aside = {m.group(1): htmllib.unescape(m.group(2)).strip() for m in re.finditer(r'<span class="letter sm plain">([^<]+)</span>\s*<div>\s*<h4>Set aside:\s*(.*?)\s*<span', body, re.S)}
        for option in decision.options:
            state = option_state(option)
            set_aside = state == "set aside"
            page_titles = aside if set_aside else shown
            if option.id not in page_titles:
                where_to = "set aside" if set_aside else "an option card"
                warnings.append(f"{line_of(match.start())}: {decision.id} option {option.id} ('{option.title}') is in design.md but not shown as {where_to} on the page")
                continue
            if page_titles[option.id].lower() != option.title.lower():
                warnings.append(f"{line_of(match.start())}: {decision.id} option {option.id} is '{page_titles[option.id]}' on the page but '{option.title}' in design.md")
            expected = {OPTION_STATUS[state]} - {""} if state in OPTION_STATUS else set()
            if not set_aside and card_classes[option.id] != expected:
                want = f'class "{" ".join(sorted(expected))}"' if expected else "no status class"
                warnings.append(f"{line_of(match.start())}: {decision.id} option {option.id}'s card should have {want} for '{option.get('Status') or 'no status'}' in design.md")
        for letter in set(shown) | set(aside):
            if letter not in {o.id for o in decision.options}:
                warnings.append(f"{line_of(match.start())}: {decision.id} option {letter} is on the page but not in design.md")

    for match in re.finditer(r'class="node decision[^"]*"[^>]*>\s*<div class="top"><span class="mono">(D\d+)</span><span class="status[^"]*">([^<]*)</span>', text):
        record = known.get(match.group(1))
        if record and record.get("Status") and match.group(2).strip().lower() != record.get("Status").lower():
            warnings.append(f"{line_of(match.start())}: decision map shows {match.group(1)} as '{match.group(2)}', but design.md says '{record.get('Status')}'")

    return warnings


MARKER_WIDTH = 40
DIAGRAM = re.compile(r'<div class="diagram"[^>]*style="[^"]*--w:(\d+)')
PLACED_MARKER = re.compile(r'<(a|span) class="(ref ref-\w|pins)"[^>]*style="[^"]*--x:(-?\d+)[^"]*"[^>]*>(.*?)</\1>', re.S)


def check_marker_edges(text: str, where) -> list[str]:
    """Warnings for evidence and question markers that stick out past a diagram's left or right edge."""
    warnings: list[str] = []
    diagrams = [(m.start(), int(m.group(1))) for m in DIAGRAM.finditer(text)]
    for m in PLACED_MARKER.finditer(text):
        width = next((w for start, w in reversed(diagrams) if start < m.start()), None)
        if width is None:
            continue
        x = int(m.group(3))
        count = m.group(4).count('class="ref') if m.group(2) == "pins" else 1
        label = re.sub(r"<[^>]+>", " ", m.group(4)).split()
        right = x + MARKER_WIDTH * count
        if right > width + 4 or x < 0:
            fix = f"--x:{width - 4 - MARKER_WIDTH * count}" if x >= 0 else "--x:0 or more"
            warnings.append(f"{where(text.count(chr(10), 0, m.start()) + 1)}: marker {' '.join(label)} at --x:{x} runs past the diagram's edge (width {width}); try {fix}")
    return warnings


def resolve(target: Path) -> tuple[Path | None, Path | None, Path]:
    """Return (doc.html, design.md, folder) for a folder, a doc.html, or a design.md."""
    folder = target if target.is_dir() else target.parent
    shell = target if target.is_file() and target.suffix == ".html" else folder / "doc.html"
    design = folder / "design.md"
    return (shell if shell.exists() else None), (design if design.exists() else None), folder


def published_mark(path: Path) -> int | None:
    if not path.exists():
        return None
    match = re.search(r'<meta name="design-changes" content="(\d+)"', path.read_text(encoding="utf-8"))
    return int(match.group(1)) if match else None


def check(target: Path) -> tuple[list[str], list[str], Source | None, Design | None]:
    shell, design_path, folder = resolve(target)
    errors: list[str] = []
    warnings: list[str] = []
    design = read_design(design_path) if design_path else None

    if shell is None:
        if design is None:
            raise SystemExit(f"{target}: no doc.html or design.md here")
        check_design(design, None, None)
        return design.errors, design.warnings, None, design

    if design_path is not None and read_format(design_path) < FORMAT:
        raise SystemExit(f"{design_path.parent}: written in format {read_format(design_path)}; this skill writes format {FORMAT}. Run: doc.py migrate {design_path.parent}")

    model = design_model(design) if design is not None else {"title": "", "records": {}}
    source = assemble(shell, model)
    errors += source.errors

    if design is not None:
        pages, anchors, spans = page_map(source.text)
        check_design(design, pages, anchors)
        errors += design.errors
        warnings += design.warnings

        def page_at(position: int) -> str | None:
            for start, end, page in spans:
                if start <= position < end:
                    return page
            return None

        filled, problems = fill_placeholders(source.text, Renderer(design, pages, anchors), page_at)
        errors += [f"{source.where(line)}: {message}" for line, message in problems]
        source.text = filled

        # Parts of diagrams and components that take their state from a record.
        if BINDING.search(filled):
            bound = run_render({"cmd": "bind", "model": model, "html": filled})
            errors += [f"{source.where(e['line'])}: {e['message']}" for e in bound["errors"]]
            source.text = bound["html"]
        warnings += check_against_records(design, filled, source.where)
    elif "<!-- records " in source.text or BINDING.search(source.text):
        errors.append(f"{shell.name}: the pages use records placeholders or bindings, but there's no design.md next to it")

    p = parse(source.text)

    if design is not None:
        recorded = {r.id for r in design.records}
        for d in p.definitions.values():
            if REF_ID.match(d.id) and d.id not in recorded:
                errors.append(f"{source.where(d.line)}: '{d.id}' is defined on a page; define it in design.md and render it with a records placeholder")

    text_errors, text_warnings = check_text(p, source.where)
    warnings += check_marker_edges(source.text, source.where)
    page_errors, page_warnings = check_pages(p, source.text, source.where)
    errors += text_errors + page_errors + check_local_paths(source.files)
    warnings += text_warnings + page_warnings

    if "doc.css" not in " ".join(p.stylesheets):
        warnings.append("no <link rel=\"stylesheet\" href=\"doc.css\">; build will not inline the shared styles")
    if "doc.js" not in " ".join(p.scripts):
        warnings.append("no <script src=\"doc.js\">; pages, reference cards and rail tracking won't work")

    if design is not None and design.changes:
        mark = published_mark(folder / "published" / f"{doc_slug(source.text, shell)}.html")
        if mark is not None and mark < len(design.changes):
            behind = design.changes[mark:]
            warnings.append(f"the published doc is {len(behind)} change entr{'y' if len(behind) == 1 else 'ies'} behind changes.md (from '{behind[0].date} · {behind[0].source}'); rebuild to include them")

    return errors, warnings, source, design


def doc_slug(text: str, shell: Path) -> str:
    slug = re.search(r'<html\b[^>]*\bdata-doc="([^"]+)"', text)
    if slug:
        return slug.group(1)
    return shell.parent.resolve().name if shell.name == "doc.html" else shell.stem


# Building


def page_spans(text: str) -> list[tuple[int, int]]:
    """Where each page article starts and ends. Pages hold option articles, so count nesting."""
    spans: list[tuple[int, int]] = []
    depth = 0
    start: int | None = None

    for match in ARTICLE_TAG.finditer(text):
        if match.group(0).startswith("</"):
            depth -= 1
            if depth == 0 and start is not None:
                spans.append((start, match.end()))
                start = None
        else:
            if depth == 0 and PAGE_CLASS.search(match.group(0)):
                start = match.start()
            depth += 1

    return spans


def map_pages(text: str, change) -> str:
    """Replace each page article with change(block)."""
    out: list[str] = []
    position = 0

    for start, end in page_spans(text):
        out.append(text[position:start])
        out.append(change(text[start:end]))
        position = end

    out.append(text[position:])
    return "".join(out)


def opening(block: str) -> str:
    return block[: block.index(">") + 1]


def attr(tag: str, name: str) -> str:
    match = re.search(rf'\b{name}="([^"]*)"', tag)
    return htmllib.unescape(match.group(1)) if match else ""


def select_pages(text: str, keep: list[str]) -> tuple[str, list[str]]:
    """Keep the listed pages and the shared pages, trimmed to what the listed pages cite."""
    notes: list[str] = []
    blocks = [text[start:end] for start, end in page_spans(text)]
    known = {attr(opening(block), "id") for block in blocks}

    for wanted in keep:
        if wanted not in known:
            raise SystemExit(f"--pages: no page with id '{wanted}' (pages: {', '.join(sorted(known))})")

    kept_content = "".join(block for block in blocks if attr(opening(block), "id") in keep)
    cited = set(re.findall(r'href="#([^"]+)"', kept_content))

    def trim(block: str) -> str:
        page_id = attr(opening(block), "id")
        if page_id in keep:
            return block
        if attr(opening(block), "data-page-group") != "shared":
            notes.append(f"left out page '{page_id}'")
            return ""

        def row(r: re.Match[str]) -> str:
            row_id = attr(r.group(1), "id")
            if "data-ref=" in r.group(1) and row_id and row_id not in cited:
                return ""
            return r.group(0)

        return re.sub(r"(<tr\b[^>]*>).*?</tr>\s*", row, block, flags=re.S)

    return map_pages(text, trim), notes


def unlink_missing(text: str) -> tuple[str, list[str]]:
    """Turn links to ids that no longer exist into plain text."""
    ids = set(re.findall(r'\bid="([^"]+)"', text))
    dropped: set[str] = set()

    def fix(match: re.Match[str]) -> str:
        opening, body = match.group(1), match.group(2)
        target = attr(opening, "href")[1:]
        if target in ids:
            return match.group(0)
        dropped.add(target)
        classes = attr(opening, "class")
        if "ref" in classes.split() or "flow" in classes.split():
            return f'<span class="{classes}">{body}</span>'
        return body

    text = re.sub(r'(<a\b[^>]*\bhref="#[^"]+"[^>]*>)(.*?)</a>', fix, text, flags=re.S)
    return text, sorted(dropped)


def page_switcher(text: str) -> tuple[str, int]:
    """Write the page switcher and move each page's rail into the rail."""
    pages = []
    rails = []

    def take_rail(block: str) -> str:
        head = opening(block)
        page = {
            "id": attr(head, "id"),
            "title": attr(head, "data-page-title"),
            "group": attr(head, "data-page-group"),
            "icon": attr(head, "data-page-icon"),
            "meta": attr(head, "data-page-meta"),
            # Answered questions stay on the page but don't count as open.
            "count": len(re.findall(r'\bdata-ref="', block)) - len(re.findall(r"\bdata-answered\b", block)) or len(re.findall(r'<div class="meeting[ "]', block)),
        }
        pages.append(page)
        rail = PAGE_RAIL.search(block)
        if rail is None:
            return block
        nav = rail.group(0).rstrip()
        nav = nav.replace("<nav ", f'<nav data-page="{page["id"]}" ', 1)
        if "aria-label=" not in nav[: nav.index(">")]:
            nav = nav.replace("<nav ", f'<nav aria-label="{htmllib.escape(page["title"])}" ', 1)
        rails.append(nav)
        return block[: rail.start()] + block[rail.end() :]

    text = map_pages(text, take_rail)
    if len(pages) < 2:
        return text, len(pages)

    lines = ['<div class="rail-pages">', '  <span class="rail-label">Pages</span>']
    for group, label in PAGE_GROUPS.items():
        members = [page for page in pages if page["group"] == group]
        if members and label:
            lines.append(f'  <span class="rail-sub">{label}</span>')
        for page in members:
            icon = page["icon"] or DEFAULT_ICONS[group]
            meta = page["meta"] or (str(page["count"]) if group == "shared" and page["count"] else "")
            meta_html = f'<span class="m">{htmllib.escape(meta)}</span>' if meta else ""
            lines.append(
                f'  <a class="rail-page" href="#{page["id"]}"><svg><use href="#{icon}"/></svg><span class="l">{htmllib.escape(page["title"])}</span>{meta_html}</a>'
            )
    lines.append("</div>")

    text = text.replace("<!-- pages-nav -->", "\n".join(lines), 1)
    text = text.replace("<!-- page-rails -->", "\n".join(rails), 1)
    text = re.sub(r'class="doc"', 'class="doc multi"', text, count=1)
    return text, len(pages)


def asset(folder: Path, name: str) -> str:
    local = folder / name
    source = local if local.exists() else SKILL_ASSETS / name
    return source.read_text(encoding="utf-8")


def build(shell: Path, source: Source, design: Design | None, out: Path, keep: list[str] | None) -> int:
    text = source.text
    if keep:
        text, notes = select_pages(text, keep)
        text, dropped = unlink_missing(text)
        for note in notes:
            print(f"note: {note}")
        if dropped:
            print(f"note: references to items not in this copy are plain text: {', '.join(dropped)}")

    text, page_count = page_switcher(text)

    final = parse(text)
    errors, _warnings, _cited = check_links(final, lambda line: f"built line {line}")
    for ident, line in final.duplicate_ids:
        errors.append(f"built line {line}: duplicate id '{ident}'")
    if errors:
        for e in errors:
            print(f"error: {e}")
        print("not built: the assembled doc has broken links")
        return 1

    if design is not None:
        text = text.replace("<head>", f'<head>\n<meta name="design-changes" content="{len(design.changes)}">', 1)

    if design is not None:
        # The records as data, for components' own scripts; design_model leaves out the private fields.
        model = json.dumps(design_model(design), ensure_ascii=False).replace("</", "<\\/")
        text = text.replace("</body>", f'<script type="application/json" id="doc-model">{model}</script>\n</body>', 1)

    # A design's own components bring their styles and scripts along.
    own = sorted((shell.parent / "components").glob("*")) if (shell.parent / "components").is_dir() else []
    css = asset(shell.parent, "doc.css") + "".join(f"\n/* {p.name} */\n{p.read_text(encoding='utf-8')}" for p in own if p.suffix == ".css")
    js = asset(shell.parent, "doc.js") + "".join(f"\n// {p.name}\n{p.read_text(encoding='utf-8')}" for p in own if p.suffix == ".js")
    text, css_count = re.subn(r'<link[^>]*href="doc\.css"[^>]*>', lambda _m: f"<style>\n{css}</style>", text)
    text, js_count = re.subn(r'<script[^>]*src="doc\.js"[^>]*>\s*</script>\s*', "", text)
    if js_count:
        text = text.replace("</body>", f"<script>\n{js}</script>\n</body>", 1)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"built {out} ({page_count} page(s); styles inlined: {bool(css_count)}, script inlined: {bool(js_count)})")
    return 0


def migrate(folder: Path) -> int:
    design = folder / "design.md"
    if not design.exists():
        print(f"{folder}: no design.md here")
        return 1
    current = read_format(design)
    if current >= FORMAT:
        print(f"{folder}: already format {current}; nothing to migrate")
        return 0

    backup = folder / ".migrate-backup" / f"format-{current}"
    if not backup.exists():
        for name in ("design.md", "changes.md", "doc.html", "pages", "components"):
            source = folder / name
            if source.is_dir():
                shutil.copytree(source, backup / name)
            elif source.exists():
                backup.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, backup / name)
        print(f"copied the folder's files to {backup}")

    steps = sorted(Path(__file__).resolve().parent.joinpath("migrations").glob("m[0-9][0-9][0-9]_*.py"))
    for step in steps:
        number = int(step.name[1:4])
        if not current < number <= FORMAT:
            continue
        spec = importlib.util.spec_from_file_location(step.stem, step)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        print(module.__doc__.strip().splitlines()[0])
        for note in module.migrate(folder):
            print(f"  {note}")
        write_format(design, number)

    errors, warnings, _source, _design = check(folder)
    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"migrated to format {FORMAT}; {len(errors)} error(s), {len(warnings)} warning(s). Review the changes before building.")
    return 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    c = sub.add_parser("check", help="report broken references, missing parts, and local paths")
    c.add_argument("doc", type=Path, help="a design folder, its doc.html, or its design.md")
    b = sub.add_parser("build", help="check, then write one self-contained HTML file")
    b.add_argument("doc", type=Path, help="a design folder or its doc.html")
    b.add_argument("-o", "--out", type=Path, help="output file (default: <folder>/published/<slug>.html, the slug from <html data-doc>)")
    b.add_argument("--pages", help="comma-separated page ids to include; shared pages are trimmed to match")
    m = sub.add_parser("migrate", help="bring a design folder written for an older version of this skill up to date")
    m.add_argument("doc", type=Path, help="a design folder")
    args = parser.parse_args()

    if args.command == "migrate":
        return migrate(args.doc)

    errors, warnings, source, design = check(args.doc)
    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")

    if args.command == "build":
        if errors:
            print("not built: fix the errors first")
            return 1
        if source is None:
            print("not built: there's no doc.html yet; the records are checked on their own")
            return 1
        shell = resolve(args.doc)[0]
        out = args.out or shell.parent / "published" / f"{doc_slug(source.text, shell)}.html"
        keep = [p.strip() for p in args.pages.split(",") if p.strip()] if args.pages else None
        return build(shell, source, design if not keep else None, out, keep)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
