#!/usr/bin/env python3
"""Check a design doc and build its self-contained, publishable HTML.

Usage:
  doc.py check <doc.html>
  doc.py build <doc.html> [-o <out.html>] [--pages <id,id>]

A doc is a shell page (doc.html) that pulls in one file per page with
<!-- include pages/<id>.html --> comments. A single self-contained HTML file
with no includes works too.

`build` runs `check` first and refuses to write output when it finds errors.
It assembles the pages, writes the page switcher into the rail, moves each
page's own rail content next to it, and inlines doc.css and doc.js (from the
doc's folder if present, otherwise from this skill's assets) so the result is
one portable file.

`--pages` builds a copy with only the listed pages. Shared pages (evidence,
questions, meetings) come along, trimmed to the items the listed pages cite,
and references to anything left out become plain text.
"""

from __future__ import annotations

import argparse
import html as htmllib
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

SKILL_ASSETS = Path(__file__).resolve().parent.parent / "assets"
REF_ID = re.compile(r"^[EQDR]\d+$")
FLOW_ID = re.compile(r"^[A-Z][A-Z0-9]*-F\d+$")
KIND_FOR_PREFIX = {"E": "evidence", "Q": "question", "D": "decision", "R": "requirement"}
PAGE_GROUPS = {"overview": "", "area": "Areas", "brief": "Briefs", "shared": "Shared"}
DEFAULT_ICONS = {"overview": "i-layout-dashboard", "area": "i-box", "brief": "i-signpost", "shared": "i-file-check"}
ALLOWED_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com")
INCLUDE = re.compile(r"<!--\s*include\s+(\S+?)\s*-->")
ARTICLE_TAG = re.compile(r"<article\b[^>]*>|</article>")
PAGE_CLASS = re.compile(r'\bclass="page\b')
PAGE_RAIL = re.compile(r'<nav\b[^>]*\bclass="page-rail\b[^"]*"[^>]*>.*?</nav>\s*', re.S)
LOCAL_PATH_PATTERNS = [
    (re.compile(r"file://", re.I), "file:// URL"),
    (re.compile(r"(?<![\w.])/(?:home|Users|mnt|tmp)/[\w.-]+"), "absolute local path"),
    (re.compile(r"\b[A-Z]:\\[\w\\. -]+"), "Windows path"),
    (re.compile(r"\\\\wsl"), "WSL path"),
    (re.compile(r"(?<![\w/])~/[\w.-]+"), "home-relative path"),
]
VOID = {"br", "img", "input", "link", "meta", "hr", "source", "use", "path", "circle", "rect", "line", "wbr", "col"}


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


def assemble(shell: Path) -> Source:
    text = shell.read_text(encoding="utf-8")
    out: list[str] = []
    segments: list[tuple[int, Path, int]] = []
    files = [shell]
    errors: list[str] = []
    line = 1
    position = 0

    def add(chunk: str, path: Path, first: int) -> None:
        nonlocal line
        segments.append((line, path, first))
        out.append(chunk)
        line += chunk.count("\n")

    for match in INCLUDE.finditer(text):
        add(text[position : match.start()], shell, text.count("\n", 0, position) + 1)
        included = shell.parent / match.group(1)

        if included.exists():
            files.append(included)
            add(included.read_text(encoding="utf-8"), included, 1)
        else:
            errors.append(f"{shell.name}:{text.count(chr(10), 0, match.start()) + 1}: included file '{match.group(1)}' doesn't exist")

        position = match.end()

    add(text[position:], shell, text.count("\n", 0, position) + 1)
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
        self.stack: list[tuple[str, str | None, str | None]] = []

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
            self.stack.append((tag, definition, page))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1][0] == tag:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                return


def parse(text: str) -> DocParser:
    p = DocParser()
    p.feed(text)
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
        if d.kind == "question" and "Who can answer" not in d.details:
            errors.append(f"{where(d.line)}: question '{d.id}' has no data-ref-detail=\"Who can answer\"")
        if d.kind in {"question", "decision"} and not d.has_status:
            warnings.append(f"{where(d.line)}: '{d.id}' has no data-ref-status")

    link_errors, link_warnings, cited = check_links(p, where)
    errors += link_errors
    warnings += link_warnings

    for d in p.definitions.values():
        if d.kind == "evidence" and d.id not in cited:
            warnings.append(f"{where(d.line)}: evidence '{d.id}' isn't cited anywhere")
        if d.kind == "question" and d.id not in cited:
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
                if d.kind in {"evidence", "question"} and d.page is not None and groups.get(d.page) != "shared":
                    warnings.append(f"{where(d.line)}: {d.kind} '{d.id}' is on page '{d.page}'; with shared pages, keep it on the shared page")

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


def check(shell: Path) -> tuple[list[str], list[str], Source]:
    source = assemble(shell)
    p = parse(source.text)
    errors = list(source.errors)
    warnings: list[str] = []

    text_errors, text_warnings = check_text(p, source.where)
    page_errors, page_warnings = check_pages(p, source.text, source.where)
    errors += text_errors + page_errors + check_local_paths(source.files)
    warnings += text_warnings + page_warnings

    if "doc.css" not in " ".join(p.stylesheets):
        warnings.append("no <link rel=\"stylesheet\" href=\"doc.css\">; build will not inline the shared styles")
    if "doc.js" not in " ".join(p.scripts):
        warnings.append("no <script src=\"doc.js\">; pages, reference cards and rail tracking won't work")

    return errors, warnings, source


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
            "count": len(re.findall(r'\bdata-ref="', block)),
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


def build(shell: Path, source: Source, out: Path, keep: list[str] | None) -> int:
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

    css = asset(shell.parent, "doc.css")
    js = asset(shell.parent, "doc.js")
    text, css_count = re.subn(r'<link[^>]*href="doc\.css"[^>]*>', lambda _m: f"<style>\n{css}</style>", text)
    text, js_count = re.subn(r'<script[^>]*src="doc\.js"[^>]*>\s*</script>\s*', "", text)
    if js_count:
        text = text.replace("</body>", f"<script>\n{js}</script>\n</body>", 1)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"built {out} ({page_count} page(s); styles inlined: {bool(css_count)}, script inlined: {bool(js_count)})")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    c = sub.add_parser("check", help="report broken references, missing parts, and local paths")
    c.add_argument("doc", type=Path)
    b = sub.add_parser("build", help="check, then write one self-contained HTML file")
    b.add_argument("doc", type=Path)
    b.add_argument("-o", "--out", type=Path, help="output file (default: <doc folder>/published/<slug>.html, the slug from <html data-doc>)")
    b.add_argument("--pages", help="comma-separated page ids to include; shared pages are trimmed to match")
    args = parser.parse_args()

    errors, warnings, source = check(args.doc)
    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")

    if args.command == "build":
        if errors:
            print("not built: fix the errors first")
            return 1
        slug = re.search(r'<html\b[^>]*\bdata-doc="([^"]+)"', source.text)
        if slug:
            name = slug.group(1)
        else:
            name = args.doc.parent.resolve().name if args.doc.name == "doc.html" else args.doc.stem
        out = args.out or args.doc.parent / "published" / f"{name}.html"
        keep = [p.strip() for p in args.pages.split(",") if p.strip()] if args.pages else None
        return build(args.doc, source, out, keep)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
