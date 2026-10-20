#!/usr/bin/env node
// Check a design and build its self-contained, publishable HTML doc.
//
// Usage:
//   doc.mjs check <design folder | doc.html>
//   doc.mjs build <design folder | doc.html> [-o <out.html>] [--pages <id,id>]
//   doc.mjs migrate <design folder>
//
// A design folder holds design.json, evidence.json and meetings.json (the records), changes.md (accepted changes),
// and, once the design has a doc, doc.html (the shell) with one Markdown file per page in pages/, pulled in with
// <!-- include pages/<id>.md --> comments, and the doc's own components in components/. render.mjs renders the pages and
// components and applies record bindings; record tables come from the records through
// <!-- records <kind> [page=<id>] [ids=<ids>] -->. A folder with only records is checked on its own.
//
// `build` runs `check` first and refuses to write output when it finds errors. It renders the record tables, assembles
// the pages, writes the page switcher into the rail, moves each page's own rail content next to it, and inlines doc.css
// and doc.js (from the doc's folder if present, otherwise from this skill's assets) so the result is one portable file.
//
// `migrate` brings a design folder written for an older version of this skill up to date: it copies the folder's files
// to .migrate-backup/format-<n>/, runs each migration in migrations/ newer than the folder's format, in order, and
// records the new format.
//
// `--pages` builds a copy with only the listed pages. Shared pages (evidence, meetings) come along, trimmed to the items
// the listed pages cite, and references to anything left out become plain text.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { JsonError } from "./jsonfmt.mjs";
import {
  checkDesign,
  designModel,
  fillFacts,
  fillPlaceholders,
  FORMAT,
  LOCAL_PATH_PATTERNS,
  OPTION_STATUS,
  optionState,
  readDesign,
  readFormat,
  Renderer,
  writeFormat
} from "./records.mjs";
import { ChangesError, applyChanges, readChanges, reviewData, reviewFolder, writeChange } from "./changes.mjs";
import { bind, renderPages } from "./render.mjs";
import { SNIPPET_LANGUAGES } from "./snippets.mjs";
import { esc, escAll, splitLines, unescape } from "./text.mjs";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));

const SKILL_ASSETS = join(SCRIPTS, "..", "assets");

const REF_ID = /^[EQDRP]\d+$/;

const FLOW_ID = /^[A-Z][A-Z0-9]*-F\d+$/;

const KIND_FOR_PREFIX = { E: "evidence", Q: "question", D: "decision", R: "requirement", P: "deliverable" };

const PAGE_GROUPS = { overview: "", plan: "", area: "Areas", brief: "Briefs", shared: "Shared" };

const DEFAULT_ICONS = { overview: "i-layout-dashboard", plan: "i-route", area: "i-box", brief: "i-signpost", shared: "i-file-check" };

const ALLOWED_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const INCLUDE = /<!--\s*include\s+(\S+?)\s*-->/g;

const COMPONENT = /<!--\s*component\s+([\w-]+)((?:\s+[\w-]+(?:="[^"]*"|=\S+)?)*)\s*-->/g;

const BINDING = /\sdata-(?:pending|when|text|state-of)="/;

const ARTICLE_TAG = /<article\b[^>]*>|<\/article>/g;

const PAGE_CLASS = /\bclass="page\b/;

const PAGE_RAIL = /<nav\b[^>]*\bclass="page-rail\b[^"]*"[^>]*>[\s\S]*?<\/nav>\s*/;

const VOID = new Set(["br", "img", "input", "link", "meta", "hr", "source", "use", "path", "circle", "rect", "line", "wbr", "col"]);

// Elements whose end tag HTML lets you leave out; an unclosed one is not a mistake.
const OPTIONAL_END = new Set(["p", "li", "dt", "dd", "td", "th", "tr", "thead", "tbody", "tfoot", "option", "html", "head", "body"]);

// Elements whose content is raw text, not markup.
const RAW_TEXT = new Set(["script", "style"]);

// A problem that stops the command, reported on its own.
class Stop extends Error {}

const has = (object, key) => Object.hasOwn(object, key);

const lineAt = (text, position) => text.slice(0, position).split("\n").length;

// Replaces the first occurrence of a string, without reading $ in the replacement as a pattern.
function replaceFirst(text, needle, replacement) {
  const at = text.indexOf(needle);

  return at === -1 ? text : text.slice(0, at) + replacement + text.slice(at + needle.length);
}

// Assembling: resolve includes and remember where each line came from.

class Source {
  constructor(text, files, segments, errors) {
    this.text = text;
    this.files = files;
    // [first line in text, file name, first line in file]
    this.segments = segments;
    this.errors = errors;
  }

  where(line) {
    let found = this.segments[0];

    for (const segment of this.segments) {
      if (segment[0] <= line) {
        found = segment;
      }
    }

    const [start, name, firstLine] = found;

    return `${name}:${firstLine + line - start}`;
  }
}

// The page every other page's context line links back to: the overview, or the first page.
function homePage(shell, text) {
  const names = [...text.matchAll(INCLUDE)].flatMap((match) => {
    const path = join(dirname(shell), match[1]);

    return existsSync(path) ? [path] : [];
  });

  const stem = (path) => basename(path, extname(path));
  const home = names.find((path) => stem(path) === "overview") ?? names[0];

  if (home === undefined) {
    return { id: "overview", title: "Overview" };
  }

  const body = readFileSync(home, "utf8");
  const found = extname(home) === ".md" ? /^title:\s*(.+)$/m.exec(body) : /data-page-title="([^"]+)"/.exec(body);

  return { id: stem(home), title: found ? found[1].trim() : stem(home) };
}

// Resolve includes, render Markdown pages and components, and remember where each line came from. A rendered page or
// .mjs component is reported as '<file> (rendered)', with line numbers counted in the rendered HTML; an .html component
// keeps its own lines.
async function assemble(shell, model) {
  const text = readFileSync(shell, "utf8");
  const out = [];
  const segments = [];
  const files = [shell];
  const errors = [];
  // ["text", chunk, file, first line] or ["page" | "component", index, file, 0]
  const pieces = [];
  const pages = [];
  const components = [];
  let line = 1;
  let position = 0;

  const add = (chunk, name, firstLine) => {
    segments.push([line, name, firstLine]);
    out.push(chunk);
    line += chunk.split("\n").length - 1;
  };

  for (const match of text.matchAll(INCLUDE)) {
    pieces.push(["text", text.slice(position, match.index), shell, lineAt(text, position)]);
    position = match.index + match[0].length;

    const included = join(dirname(shell), match[1]);

    if (!existsSync(included)) {
      errors.push(`${basename(shell)}:${lineAt(text, match.index)}: included file '${match[1]}' doesn't exist`);
      continue;
    }

    files.push(included);

    const body = readFileSync(included, "utf8");

    if (extname(included) === ".md") {
      pieces.push(["page", pages.length, included, 0]);
      pages.push({ file: basename(included), text: body });
      continue;
    }

    let at = 0;

    for (const use of body.matchAll(COMPONENT)) {
      pieces.push(["text", body.slice(at, use.index), included, lineAt(body, at)]);
      pieces.push(["component", components.length, included, 0]);
      components.push({ name: use[1], props: use[2], page: basename(included, extname(included)) });
      at = use.index + use[0].length;
    }

    pieces.push(["text", body.slice(at), included, lineAt(body, at)]);
  }

  pieces.push(["text", text.slice(position), shell, lineAt(text, position)]);

  let rendered = { pages: [], components: [] };

  if (pages.length > 0 || components.length > 0) {
    rendered = await renderPages({ cmd: "pages", folder: dirname(shell), model, pages, components, home: homePage(shell, text) });
  }

  for (const [kind, value, path, firstLine] of pieces) {
    if (kind === "text") {
      add(value, basename(path), firstLine);
      continue;
    }

    const result = rendered[kind === "page" ? "pages" : "components"][value];
    let source = path;

    if (kind === "component" && result.file) {
      source = result.file;
      files.push(source);
    }

    const label = extname(source) === ".html" ? basename(source) : `${basename(source)} (rendered)`;

    errors.push(...result.errors.map((message) => `${label}: ${message}`));
    add(result.html, label, 1);
  }

  return new Source(out.join(""), files, segments, errors);
}

// Parsing: the tags of the assembled doc, tokenized the way an HTML parser reads them.

function attributes(text) {
  const found = {};
  const pattern = /([^\s/>"'=][^\s/>=]*)(?:\s*=+\s*("[^"]*"|'[^']*'|[^\s>"']*))?/g;

  for (const match of text.matchAll(pattern)) {
    let value = match[2] ?? null;

    if (value !== null && (value.startsWith('"') || value.startsWith("'"))) {
      value = value.slice(1, -1);
    }

    found[match[1].toLowerCase()] = value === null ? "" : unescape(value);
  }

  return found;
}

// Where a start tag ends: the > outside any quoted attribute value.
function tagEnd(text, from) {
  let quote = null;

  for (let index = from; index < text.length; index += 1) {
    const char = text[index];

    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return index;
    }
  }

  return -1;
}

class DocParser {
  constructor() {
    this.ids = new Map();
    this.duplicateIds = [];
    this.definitions = new Map();
    this.links = [];
    this.external = [];
    this.stylesheets = [];
    this.scripts = [];
    this.symbols = new Set();
    this.pages = [];
    // [tag, definition, page, line]
    this.stack = [];
    this.unbalanced = [];
  }

  current(index) {
    for (const entry of [...this.stack].reverse()) {
      if (entry[index] !== null) {
        return entry[index];
      }
    }

    return null;
  }

  start(tag, a, line) {
    const classes = new Set((a.class ?? "").split(/\s+/).filter((name) => name !== ""));
    let definition = null;
    let page = null;

    if (tag === "article" && classes.has("page")) {
      page = a.id ?? "";

      const group = a["data-page-group"] ?? "";

      this.pages.push({
        id: page,
        title: a["data-page-title"] ?? "",
        group,
        icon: a["data-page-icon"] ?? DEFAULT_ICONS[group] ?? "",
        meta: a["data-page-meta"] ?? "",
        line,
        hasRail: false,
        definitions: 0
      });
    }

    if (tag === "nav" && classes.has("page-rail") && this.pages.length > 0) {
      this.pages.at(-1).hasRail = true;
    }

    if (tag === "symbol" && has(a, "id")) {
      this.symbols.add(a.id);
    }

    const inPage = page || this.current(2);

    if (has(a, "id")) {
      if (this.ids.has(a.id)) {
        this.duplicateIds.push([a.id, line]);
      } else {
        this.ids.set(a.id, line);
      }

      if (has(a, "data-ref")) {
        definition = a.id;
        this.definitions.set(a.id, { id: a.id, kind: a["data-ref"], line, page: inPage, hasStatus: false, hasText: false, details: new Set() });

        if (this.pages.length > 0 && inPage === this.pages.at(-1).id) {
          this.pages.at(-1).definitions += 1;
        }
      }
    }

    const owner = definition || this.current(1);

    if (owner !== null && this.definitions.has(owner)) {
      const d = this.definitions.get(owner);

      if (has(a, "data-ref-status")) {
        d.hasStatus = true;
      }

      if (has(a, "data-ref-text")) {
        d.hasText = true;
      }

      if (has(a, "data-ref-detail")) {
        d.details.add(a["data-ref-detail"]);
      }
    }

    if (tag === "a" && has(a, "href")) {
      this.links.push({ href: a.href, classes, line, inside: owner, page: inPage });
    }

    if (tag === "link" && a.rel === "stylesheet") {
      this.stylesheets.push(a.href ?? "");
    }

    if (tag === "script" && has(a, "src")) {
      this.scripts.push(a.src);
    }

    for (const attr of ["src", "href"]) {
      const url = a[attr] ?? "";

      if ((url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) && !ALLOWED_HOSTS.some((host) => url.includes(host))) {
        if (!(tag === "a" && attr === "href")) {
          this.external.push([url, line]);
        }
      }
    }

    if (!VOID.has(tag)) {
      this.stack.push([tag, definition, page, line]);
    }
  }

  end(tag, line) {
    if (VOID.has(tag)) {
      return;
    }

    for (let index = this.stack.length - 1; index >= 0; index -= 1) {
      if (this.stack[index][0] === tag) {
        for (const leftOpen of this.stack.slice(index + 1)) {
          if (!OPTIONAL_END.has(leftOpen[0])) {
            this.unbalanced.push([leftOpen[3], `<${leftOpen[0]}> is never closed; </${tag}> closes around it`, line]);
          }
        }

        this.stack.splice(index);

        return;
      }
    }

    this.unbalanced.push([line, `</${tag}> has no matching <${tag}>`, null]);
  }

  close() {
    for (const leftOpen of this.stack) {
      if (!OPTIONAL_END.has(leftOpen[0])) {
        this.unbalanced.push([leftOpen[3], `<${leftOpen[0]}> is never closed`, null]);
      }
    }
  }

  feed(text) {
    const lineStarts = [0];

    for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) {
      lineStarts.push(index + 1);
    }

    const lineOf = (position) => {
      let low = 0;
      let high = lineStarts.length - 1;

      while (low < high) {
        const middle = (low + high + 1) >> 1;

        if (lineStarts[middle] <= position) {
          low = middle;
        } else {
          high = middle - 1;
        }
      }

      return low + 1;
    };

    let position = 0;

    while (position < text.length) {
      const open = text.indexOf("<", position);

      if (open === -1) {
        break;
      }

      if (text.startsWith("<!--", open)) {
        const close = text.indexOf("-->", open + 4);

        position = close === -1 ? text.length : close + 3;
        continue;
      }

      if (text.startsWith("<!", open) || text.startsWith("<?", open)) {
        const close = text.indexOf(">", open);

        position = close === -1 ? text.length : close + 1;
        continue;
      }

      const endTag = /^<\/([a-zA-Z][^\s/>]*)[^>]*>/.exec(text.slice(open, open + 512));

      if (endTag !== null) {
        this.end(endTag[1].toLowerCase(), lineOf(open));
        position = open + endTag[0].length;
        continue;
      }

      const name = /^<([a-zA-Z][^\t\n\r\f />\x00]*)/.exec(text.slice(open, open + 256));

      if (name === null) {
        position = open + 1;
        continue;
      }

      const close = tagEnd(text, open + name[0].length);

      if (close === -1) {
        break;
      }

      const tag = name[1].toLowerCase();
      const inner = text.slice(open + name[0].length, close);
      const selfClosing = inner.endsWith("/");
      const line = lineOf(open);

      this.start(tag, attributes(selfClosing ? inner.slice(0, -1) : inner), line);

      if (selfClosing && !VOID.has(tag) && this.stack.length > 0 && this.stack.at(-1)[0] === tag) {
        this.stack.pop();
      }

      position = close + 1;

      if (RAW_TEXT.has(tag) && !selfClosing) {
        const rest = new RegExp(`</${tag}(?=[\\s/>])`, "i").exec(text.slice(position));

        position = rest === null ? text.length : position + rest.index;
      }
    }

    this.close();
  }
}

function parse(text) {
  const parser = new DocParser();

  parser.feed(text);

  return parser;
}

// Checking

function checkLinks(p, where) {
  const errors = [];
  const warnings = [];
  const cited = new Set();

  for (const link of p.links) {
    if (!link.href.startsWith("#") || link.href === "#") {
      continue;
    }

    const target = link.href.slice(1);

    if (!p.ids.has(target)) {
      errors.push(`${where(link.line)}: link to '#${target}', but nothing has that id`);
      continue;
    }

    if (link.inside !== target) {
      cited.add(target);
    }

    const isTrigger = ["ref", "mention", "flow"].some((name) => link.classes.has(name));

    if (isTrigger && !p.definitions.has(target)) {
      errors.push(`${where(link.line)}: reference to '#${target}', which isn't a definition (no data-ref)`);
    }

    if (link.classes.has("ref") && REF_ID.test(target)) {
      const want = `ref-${target[0].toLowerCase()}`;

      if (!link.classes.has(want)) {
        warnings.push(`${where(link.line)}: marker for '${target}' should have class '${want}'`);
      }
    }
  }

  return { errors, warnings, cited };
}

function checkText(p, where) {
  const errors = [];
  const warnings = [];

  for (const [ident, line] of p.duplicateIds) {
    errors.push(`${where(line)}: duplicate id '${ident}' (ids are shared by every page of the doc)`);
  }

  for (const [line, problem, closedAt] of p.unbalanced) {
    errors.push(`${where(line)}: ${problem}${closedAt ? ` at ${where(closedAt)}` : ""}`);
  }

  for (const d of p.definitions.values()) {
    let expected;

    if (d.kind === "flow") {
      expected = FLOW_ID.test(d.id) ? "flow" : null;
    } else {
      expected = REF_ID.test(d.id) ? (KIND_FOR_PREFIX[d.id[0]] ?? null) : null;
    }

    if (expected === null) {
      errors.push(`${where(d.line)}: definition id '${d.id}' should look like E1, Q1, D1, R1, or B-F1 for a data flow`);
    } else if (d.kind !== expected) {
      errors.push(`${where(d.line)}: '${d.id}' has data-ref="${d.kind}"; expected "${expected}"`);
    }

    if (!d.hasText) {
      warnings.push(`${where(d.line)}: '${d.id}' has no data-ref-text; its card will show the whole row`);
    }

    if (d.kind === "decision" && !d.hasStatus) {
      warnings.push(`${where(d.line)}: '${d.id}' has no data-ref-status`);
    }
  }

  const links = checkLinks(p, where);

  errors.push(...links.errors);
  warnings.push(...links.warnings);

  for (const d of p.definitions.values()) {
    if (d.kind === "evidence" && !links.cited.has(d.id)) {
      warnings.push(`${where(d.line)}: evidence '${d.id}' isn't cited anywhere`);
    }

    if (d.kind === "question" && !links.cited.has(d.id) && !d.details.has("Answer")) {
      warnings.push(`${where(d.line)}: question '${d.id}' isn't referenced by any decision, diagram or page`);
    }

    if (d.kind === "flow" && !links.cited.has(d.id)) {
      warnings.push(`${where(d.line)}: flow '${d.id}' has no chip in its diagram linking to it`);
    }
  }

  for (const [url, line] of p.external) {
    warnings.push(`${where(line)}: loads an external resource (${url}); the page may not work offline`);
  }

  return { errors, warnings };
}

function checkPages(p, text, where) {
  const errors = [];
  const warnings = [];
  const groups = new Map(p.pages.map((page) => [page.id, page.group]));

  for (const page of p.pages) {
    if (!page.id) {
      errors.push(`${where(page.line)}: a page needs an id`);
    }

    if (!page.title) {
      errors.push(`${where(page.line)}: page '${page.id}' needs data-page-title`);
    }

    if (!has(PAGE_GROUPS, page.group)) {
      errors.push(`${where(page.line)}: page '${page.id}' has data-page-group="${page.group}"; use overview, plan, area, brief or shared`);
    }

    if (p.pages.length > 1) {
      if (!page.hasRail) {
        warnings.push(`${where(page.line)}: page '${page.id}' has no <nav class="page-rail">; the rail will be empty on it`);
      }

      if (page.icon && !p.symbols.has(page.icon)) {
        errors.push(`${where(page.line)}: page '${page.id}' uses icon '#${page.icon}', which isn't in the SVG definitions`);
      }
    }
  }

  if (p.pages.length > 1) {
    for (const marker of ["pages-nav", "page-rails"]) {
      if (!text.includes(`<!-- ${marker} -->`)) {
        errors.push(`the shell's rail has no <!-- ${marker} --> marker for build to fill`);
      }
    }

    if (p.pages.some((page) => page.group === "shared")) {
      for (const d of p.definitions.values()) {
        if (d.kind === "evidence" && d.page !== null && groups.get(d.page) !== "shared") {
          warnings.push(`${where(d.line)}: evidence '${d.id}' is on page '${d.page}'; with shared pages, keep it on the Evidence page`);
        }
      }
    }
  }

  return { errors, warnings };
}

function checkLocalPaths(files) {
  const errors = [];

  for (const path of files) {
    splitLines(readFileSync(path, "utf8")).forEach((text, index) => {
      for (const [pattern, label] of LOCAL_PATH_PATTERNS) {
        const match = pattern.exec(text);

        if (match !== null) {
          errors.push(`${basename(path)}:${index + 1}: ${label} would be published: '${match[0]}'`);
        }
      }
    });
  }

  return errors;
}

const KNOWLEDGE_ITEM = /^Knowledge base:\s*`?([^`#\s]+)(?:#([^`\s]+))?`?/;

// The knowledge base beside the design: the nearest folder above it holding knowledge/AGENTS.md.
function knowledgeRoot(folder) {
  let parent = dirname(resolvePath(folder));

  for (;;) {
    const candidate = join(parent, "knowledge");

    if (existsSync(join(candidate, "AGENTS.md")) && statSync(join(candidate, "AGENTS.md")).isFile()) {
      return candidate;
    }

    if (dirname(parent) === parent) {
      return null;
    }

    parent = dirname(parent);
  }
}

// The anchors a Markdown file's headings get: lower case, punctuation dropped, spaces as hyphens.
function headingAnchors(path) {
  const anchors = new Set();

  for (const line of splitLines(readFileSync(path, "utf8"))) {
    const match = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);

    if (match !== null) {
      anchors.add(match[1].trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s/g, "-"));
    }
  }

  return anchors;
}

// Each 'Knowledge base:' source names an article, and a heading in it, that exist.
function checkKnowledgeLinks(design, folder) {
  const errors = [];
  const warnings = [];

  const cited = design.records.flatMap((record) =>
    record
      .items("Gathered from")
      .map((item) => KNOWLEDGE_ITEM.exec(item))
      .filter((match) => match !== null)
      .map((match) => [record, match])
  );

  if (cited.length === 0) {
    return { errors, warnings };
  }

  const root = knowledgeRoot(folder);

  if (root === null) {
    warnings.push("evidence cites the knowledge base, but no knowledge/ folder with an AGENTS.md sits beside the design, so those citations weren't checked");

    return { errors, warnings };
  }

  for (const [record, match] of cited) {
    const path = join(root, match[1]);

    if (!existsSync(path) || !statSync(path).isFile()) {
      errors.push(`${record.id}: cites knowledge base file '${match[1]}', which doesn't exist`);
    } else if (match[2] && !headingAnchors(path).has(match[2].toLowerCase())) {
      errors.push(`${record.id}: cites heading '#${match[2]}' in '${match[1]}', which has no such heading`);
    }
  }

  return { errors, warnings };
}

// Each page's title, group and icon; which page every id is on; and where each page sits.
function pageMap(text) {
  const pages = {};
  const anchors = {};
  const spans = [];

  for (const [start, end] of pageSpans(text)) {
    const head = opening(text.slice(start, end));
    const page = attr(head, "id");
    const group = attr(head, "data-page-group");

    pages[page] = { title: attr(head, "data-page-title"), group, icon: attr(head, "data-page-icon") || (DEFAULT_ICONS[group] ?? "") };
    spans.push([start, end, page]);

    for (const match of text.slice(start, end).matchAll(/\bid="([^"]+)"/g)) {
      if (!has(anchors, match[1])) {
        anchors[match[1]] = page;
      }
    }
  }

  return { pages, anchors, spans };
}

// Warnings where hand-written page content disagrees with the records.
function checkAgainstRecords(design, text, where) {
  const warnings = [];
  const known = design.byId();
  const lineOf = (position) => where(lineAt(text, position));

  for (const match of text.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)) {
    const title = /<div class="section-title">([\s\S]*?)<\/div>/.exec(match[1]);
    const head = title ? /href="#(D\d+)"/.exec(title[1]) : null;

    if (!head || !known.has(head[1])) {
      continue;
    }

    const decision = known.get(head[1]);

    if (decision.options.length === 0) {
      continue;
    }

    const body = match[1];
    const cardClasses = new Map();
    const shown = new Map();

    for (const card of body.matchAll(/<article class="option([^"]*)">\s*<div class="option-head">\s*<span class="(?:letter|numeral)">([^<]+)<\/span>\s*<div class="text"><h3>([\s\S]*?)<\/h3>/g)) {
      shown.set(card[2], unescape(card[3]).trim());
      cardClasses.set(card[2], new Set(card[1].split(/\s+/).filter((name) => name && Object.values(OPTION_STATUS).includes(name))));
    }

    const aside = new Map(
      [...body.matchAll(/<span class="letter sm plain">([^<]+)<\/span>\s*<div>\s*<h4>Set aside:\s*([\s\S]*?)\s*<span/g)].map((found) => [found[1], unescape(found[2]).trim()])
    );

    for (const option of decision.options) {
      const state = optionState(option);
      const setAside = state === "set aside";
      const pageTitles = setAside ? aside : shown;

      if (!pageTitles.has(option.id)) {
        warnings.push(`${lineOf(match.index)}: ${decision.id} option ${option.id} ('${option.title}') is in design.md but not shown as ${setAside ? "set aside" : "an option card"} on the page`);
        continue;
      }

      if (pageTitles.get(option.id).toLowerCase() !== option.title.toLowerCase()) {
        warnings.push(`${lineOf(match.index)}: ${decision.id} option ${option.id} is '${pageTitles.get(option.id)}' on the page but '${option.title}' in design.md`);
      }

      const expected = has(OPTION_STATUS, state) && OPTION_STATUS[state] ? [OPTION_STATUS[state]] : [];
      const actual = setAside ? [] : [...cardClasses.get(option.id)];

      if (!setAside && (actual.length !== expected.length || actual.some((name) => !expected.includes(name)))) {
        const want = expected.length > 0 ? `class "${[...expected].sort().join(" ")}"` : "no status class";

        warnings.push(`${lineOf(match.index)}: ${decision.id} option ${option.id}'s card should have ${want} for '${option.get("Status") || "no status"}' in design.md`);
      }
    }

    const ids = new Set(decision.options.map((o) => o.id));

    for (const letter of new Set([...shown.keys(), ...aside.keys()])) {
      if (!ids.has(letter)) {
        warnings.push(`${lineOf(match.index)}: ${decision.id} option ${letter} is on the page but not in design.md`);
      }
    }
  }

  for (const match of text.matchAll(/class="node decision[^"]*"[^>]*>\s*<div class="top"><span class="mono">(D\d+)<\/span><span class="status[^"]*">([^<]*)<\/span>/g)) {
    const record = known.get(match[1]);

    if (record && record.get("Status") && match[2].trim().toLowerCase() !== record.get("Status").toLowerCase()) {
      warnings.push(`${lineOf(match.index)}: decision map shows ${match[1]} as '${match[2]}', but design.md says '${record.get("Status")}'`);
    }
  }

  return warnings;
}

const MARKER_WIDTH = 40;

const DIAGRAM = /<div class="diagram"[^>]*style="[^"]*--w:(\d+)/g;

const PLACED_MARKER = /<(a|span) class="(ref ref-\w|pins)"[^>]*style="[^"]*--x:(-?\d+)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g;

// Where a tag from the rendered doc is written: the page or component file and line that hold it.
function writtenAt(tag, folder) {
  const listed = (sub, extension) => {
    const path = join(folder, sub);

    return existsSync(path) && statSync(path).isDirectory()
      ? readdirSync(path)
          .filter((name) => name.endsWith(extension))
          .map((name) => join(path, name))
      : [];
  };

  for (const path of [...listed("pages", ".md"), ...listed("components", ".html")].sort()) {
    const text = readFileSync(path, "utf8");
    const at = text.indexOf(tag);

    if (at >= 0) {
      return `${basename(dirname(path))}/${basename(path)}:${lineAt(text, at)}`;
    }
  }

  return null;
}

// A part drawn as pending by hand stays dashed after its decision is made; a binding follows the record.
function checkHandPending(text, where, folder) {
  const warnings = [];

  for (const match of text.matchAll(/<[a-zA-Z][^<>]*\bclass="([^"]*)"[^<>]*>/g)) {
    const classes = match[1].split(/\s+/);

    if (classes.includes("pending") && !classes.includes("swatch") && !BINDING.test(match[0])) {
      const at = writtenAt(match[0], folder) ?? where(lineAt(text, match.index));

      warnings.push(`${at}: drawn as pending by hand; replace the 'pending' class with data-pending naming the decision it waits on, so it follows the record`);
    }
  }

  return warnings;
}

// A flow's chip in a diagram has the colour of its row in the flows table.
// Page prose: decisions, questions and requirements named in words, not written as bracketed IDs.
const BRACKETED_RECORD = /\((?:[^()]*?[,;]\s*)?[DQR]\d+\b[^()]*\)/g;

function checkPageProse(folder) {
  const warnings = [];
  const pagesFolder = join(folder, "pages");

  if (!existsSync(pagesFolder)) {
    return warnings;
  }

  for (const name of readdirSync(pagesFolder).filter((file) => file.endsWith(".md")).sort()) {
    const lines = splitLines(readFileSync(join(pagesFolder, name), "utf8"));
    let inBlock = false;
    let inFence = false;
    let bracketed = 0;

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        const fence = line.trim().slice(3).trim().toLowerCase();

        if (!inFence && fence !== "" && !SNIPPET_LANGUAGES.includes(fence)) {
          warnings.push(`pages/${name}: snippet language '${fence}' isn't one the doc colours; it shows plain. Known: ${SNIPPET_LANGUAGES.join(", ")}`);
        }

        inFence = !inFence;
        continue;
      }

      if (inFence) {
        continue;
      }

      if (line.startsWith(":::")) {
        inBlock = !inBlock && line.trim() !== ":::";
        continue;
      }

      const prose = !inBlock && line.trim() !== "" && !/^\s*(?:\||<|#|---)/.test(line);

      if (!prose) {
        continue;
      }

      bracketed += [...line.matchAll(BRACKETED_RECORD)].length;
    }

    if (bracketed > 0) {
      warnings.push(`pages/${name}: ${bracketed} decision, question or requirement ID${bracketed === 1 ? "" : "s"} in brackets in prose; link the words that name each one, [the phrase](#D1)`);
    }
  }

  return warnings;
}

function checkFlowChips(text, where) {
  const rows = new Map([...text.matchAll(/<tr id="([\w-]+-F\d+)" data-ref="flow"><td><span class="([^"]*)"/g)].map((match) => [match[1], new Set(match[2].split(/\s+/))]));
  const warnings = [];
  const colours = (names) => ["cross", "warn"].filter((name) => names.has(name));

  for (const match of text.matchAll(/<a class="([^"]*\bflow\b[^"]*)" href="#([\w-]+-F\d+)"/g)) {
    const want = rows.get(match[2]);

    if (want === undefined) {
      continue;
    }

    const have = colours(new Set(match[1].split(/\s+/)));
    const expected = colours(want);

    if (have.join(" ") !== expected.join(" ")) {
      warnings.push(`${where(lineAt(text, match.index))}: chip for '${match[2]}' should be ${expected.sort().join(" ") || "plain"}, like its row in the flows table`);
    }
  }

  return warnings;
}

// Warnings for evidence and question markers that stick out past a diagram's left or right edge.
function checkMarkerEdges(text, where) {
  const warnings = [];
  const diagrams = [...text.matchAll(DIAGRAM)].map((match) => [match.index, Number(match[1])]);

  for (const match of text.matchAll(PLACED_MARKER)) {
    const width = [...diagrams].reverse().find(([start]) => start < match.index)?.[1];

    if (width === undefined) {
      continue;
    }

    const x = Number(match[3]);
    const count = match[2] === "pins" ? match[4].split('class="ref').length - 1 : 1;

    const label = match[4]
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter((word) => word !== "");

    const right = x + MARKER_WIDTH * count;

    if (right > width + 4 || x < 0) {
      const fix = x >= 0 ? `--x:${width - 4 - MARKER_WIDTH * count}` : "--x:0 or more";

      warnings.push(`${where(lineAt(text, match.index))}: marker ${label.join(" ")} at --x:${x} runs past the diagram's edge (width ${width}); try ${fix}`);
    }
  }

  return warnings;
}

// Diagram markers sit in a box's corner group or a line's group (see diagrams.md › Markers). This only reports; where a
// marker goes is the author's call.
const ANY_DIAGRAM = /<div class="diagram(?: [^"]*)?"[^>]*style="[^"]*--w:\d+/g;

const BOX = /<div class="(?:node|zone|area-node)(?: [^"]*)?"[^>]*style="([^"]*)"/g;

const POSITIONED = /<(a|span) class="((?:ref ref-\w|pins)[^"]*)"[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g;

const styleVars = (style) => Object.fromEntries([...style.matchAll(/--(\w+):\s*(-?\d+(?:\.\d+)?)/g)].map((match) => [match[1], Number(match[2])]));

function checkCornerMarkers(text, where) {
  const warnings = [];
  const starts = [...text.matchAll(ANY_DIAGRAM)].map((match) => match.index);

  starts.forEach((start, index) => {
    const segment = text.slice(start, starts[index + 1] ?? text.length);

    const boxes = [...segment.matchAll(BOX)].flatMap((match) => {
      const box = styleVars(match[1]);

      return box.w === undefined ? [] : [box];
    });

    for (const match of segment.matchAll(POSITIONED)) {
      const classes = match[2].split(/\s+/);
      const at = styleVars(match[3]);
      const label = match[4].replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).join(" ");
      const line = where(lineAt(text, start + match.index));

      if (at.x === undefined || classes.includes("line")) continue;

      if (!classes.includes("pins")) {
        warnings.push(`${line}: marker ${label} is placed on its own; put it in its box's corner group (pins corner) or a line's group (pins line)`);
      } else if (!classes.includes("corner")) {
        warnings.push(`${line}: marker group ${label} isn't a corner or line group; use pins corner at its box's top-right, or pins line on a connection`);
      } else if (!boxes.some((box) => Math.abs(box.x + box.w - at.x) <= 2 && Math.abs(box.y - at.y) <= 2)) {
        warnings.push(`${line}: corner group ${label} at --x:${at.x};--y:${at.y} isn't on a box's top-right corner; give it the box's --x plus --w, and its --y`);
      }
    }
  });

  return warnings;
}

// [doc.html, the records file, folder] for a folder, a doc.html, or a records file.
function resolve(target) {
  const isDir = existsSync(target) && statSync(target).isDirectory();
  const folder = isDir ? target : dirname(target);
  const shell = !isDir && existsSync(target) && extname(target) === ".html" ? target : join(folder, "doc.html");
  let design = join(folder, "design.json");

  if (!existsSync(design)) {
    design = join(folder, "design.md");
  }

  return [existsSync(shell) ? shell : null, existsSync(design) ? design : null, folder];
}

function publishedMark(path) {
  if (!existsSync(path)) {
    return null;
  }

  const match = /<meta name="design-changes" content="(\d+)"/.exec(readFileSync(path, "utf8"));

  return match === null ? null : Number(match[1]);
}

async function check(target) {
  const [shell, designPath, folder] = resolve(target);
  const errors = [];
  const warnings = [];
  const design = designPath ? readDesign(designPath) : null;

  if (shell === null) {
    if (design === null) {
      throw new Stop(`${target}: no doc.html or design.md here`);
    }

    checkDesign(design, null, null);

    return { errors: design.errors, warnings: design.warnings, source: null, design };
  }

  if (designPath !== null && readFormat(designPath) < FORMAT) {
    throw new Stop(`${dirname(designPath)}: written in format ${readFormat(designPath)}; this skill writes format ${FORMAT}. Run: doc.mjs migrate ${dirname(designPath)}`);
  }

  const model = design !== null ? designModel(design) : { title: "", records: {} };
  const source = await assemble(shell, model);

  errors.push(...source.errors);

  const where = (line) => source.where(line);

  if (design !== null) {
    const { pages, anchors, spans } = pageMap(source.text);

    checkDesign(design, pages, anchors);
    errors.push(...design.errors);
    warnings.push(...design.warnings);

    const pageAt = (position) => spans.find(([start, end]) => start <= position && position < end)?.[2] ?? null;
    const placed = fillPlaceholders(source.text, new Renderer(design, pages, anchors), pageAt);

    errors.push(...placed.problems.map(([line, message]) => `${where(line)}: ${message}`));

    const facts = fillFacts(placed.text, design);
    const filled = facts.text;

    errors.push(...[...new Set(facts.missing)].sort().map((key) => `'{fact:${key}}' on a page or component names no fact under '## Facts'`));
    source.text = filled;

    // Parts of diagrams and components that take their state from a record.
    if (BINDING.test(filled)) {
      const bound = bind({ cmd: "bind", model, html: filled });

      errors.push(...bound.errors.map((error) => `${where(error.line)}: ${error.message}`));
      source.text = bound.html;
    }

    warnings.push(...checkAgainstRecords(design, filled, where));
    warnings.push(...checkHandPending(filled, where, dirname(shell)));
    warnings.push(...checkPageProse(dirname(shell)));

    const knowledge = checkKnowledgeLinks(design, folder);

    errors.push(...knowledge.errors);
    warnings.push(...knowledge.warnings);
  } else if (source.text.includes("<!-- records ") || BINDING.test(source.text)) {
    errors.push(`${basename(shell)}: the pages use records placeholders or bindings, but there's no design.md next to it`);
  }

  const p = parse(source.text);

  if (design !== null) {
    const recorded = new Set(design.records.map((record) => record.id));

    for (const d of p.definitions.values()) {
      if (REF_ID.test(d.id) && !recorded.has(d.id)) {
        errors.push(`${where(d.line)}: '${d.id}' is defined on a page; define it in design.md and render it with a records placeholder`);
      }
    }
  }

  const text = checkText(p, where);

  warnings.push(...checkMarkerEdges(source.text, where));
  warnings.push(...checkCornerMarkers(source.text, where));
  warnings.push(...checkFlowChips(source.text, where));

  const pages = checkPages(p, source.text, where);

  errors.push(...text.errors, ...pages.errors, ...checkLocalPaths(source.files));
  warnings.push(...text.warnings, ...pages.warnings);

  if (!p.stylesheets.join(" ").includes("doc.css")) {
    warnings.push('no <link rel="stylesheet" href="doc.css">; build will not inline the shared styles');
  }

  if (!p.scripts.join(" ").includes("doc.js")) {
    warnings.push('no <script src="doc.js">; pages, reference cards and rail tracking won\'t work');
  }

  if (design !== null && design.changes.length > 0) {
    const mark = publishedMark(join(folder, "published", `${docSlug(source.text, shell)}.html`));

    if (mark !== null && mark < design.changes.length) {
      const behind = design.changes.slice(mark);

      warnings.push(
        `the published doc is ${behind.length} change entr${behind.length === 1 ? "y" : "ies"} behind changes.md (from '${behind[0].date} · ${behind[0].source}'); rebuild to include them`
      );
    }
  }

  return { errors, warnings, source, design };
}

function docSlug(text, shell) {
  const slug = /<html\b[^>]*\bdata-doc="([^"]+)"/.exec(text);

  if (slug !== null) {
    return slug[1];
  }

  return basename(shell) === "doc.html" ? basename(resolvePath(dirname(shell))) : basename(shell, extname(shell));
}

// Building

// Where each page article starts and ends. Pages hold option articles, so count nesting.
function pageSpans(text) {
  const spans = [];
  let depth = 0;
  let start = null;

  for (const match of text.matchAll(ARTICLE_TAG)) {
    if (match[0].startsWith("</")) {
      depth -= 1;

      if (depth === 0 && start !== null) {
        spans.push([start, match.index + match[0].length]);
        start = null;
      }
    } else {
      if (depth === 0 && PAGE_CLASS.test(match[0])) {
        start = match.index;
      }

      depth += 1;
    }
  }

  return spans;
}

// Replace each page article with change(block).
function mapPages(text, change) {
  const out = [];
  let position = 0;

  for (const [start, end] of pageSpans(text)) {
    out.push(text.slice(position, start), change(text.slice(start, end)));
    position = end;
  }

  out.push(text.slice(position));

  return out.join("");
}

function opening(block) {
  return block.slice(0, block.indexOf(">") + 1);
}

function attr(tag, name) {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);

  return match === null ? "" : unescape(match[1]);
}

// Keep the listed pages and the shared pages, trimmed to what the listed pages cite.
function selectPages(text, keep) {
  const notes = [];
  const blocks = pageSpans(text).map(([start, end]) => text.slice(start, end));
  const known = new Set(blocks.map((block) => attr(opening(block), "id")));

  for (const wanted of keep) {
    if (!known.has(wanted)) {
      throw new Stop(`--pages: no page with id '${wanted}' (pages: ${[...known].sort().join(", ")})`);
    }
  }

  const keptContent = blocks.filter((block) => keep.includes(attr(opening(block), "id"))).join("");
  const cited = new Set([...keptContent.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]));

  const trim = (block) => {
    const pageId = attr(opening(block), "id");

    if (keep.includes(pageId)) {
      return block;
    }

    if (attr(opening(block), "data-page-group") !== "shared") {
      notes.push(`left out page '${pageId}'`);

      return "";
    }

    return block.replace(/(<tr\b[^>]*>)[\s\S]*?<\/tr>\s*/g, (whole, row) => {
      const rowId = attr(row, "id");

      return row.includes("data-ref=") && rowId && !cited.has(rowId) ? "" : whole;
    });
  };

  return { text: mapPages(text, trim), notes };
}

// Turn links to ids that no longer exist into plain text.
function unlinkMissing(text) {
  const ids = new Set([...text.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const dropped = new Set();

  const fixed = text.replace(/(<a\b[^>]*\bhref="#[^"]+"[^>]*>)([\s\S]*?)<\/a>/g, (whole, open, body) => {
    const target = attr(open, "href").slice(1);

    if (ids.has(target)) {
      return whole;
    }

    dropped.add(target);

    const classes = attr(open, "class");
    const names = classes.split(/\s+/);

    return names.includes("ref") || names.includes("flow") ? `<span class="${classes}">${body}</span>` : body;
  });

  return { text: fixed, dropped: [...dropped].sort() };
}

// Write the page switcher and move each page's rail into the rail.
function pageSwitcher(text) {
  const pages = [];
  const rails = [];

  const takeRail = (block) => {
    const head = opening(block);
    const count = (pattern) => [...block.matchAll(pattern)].length;

    const page = {
      id: attr(head, "id"),
      title: attr(head, "data-page-title"),
      group: attr(head, "data-page-group"),
      icon: attr(head, "data-page-icon"),
      meta: attr(head, "data-page-meta"),
      // Answered questions stay on the page but don't count as open.
      count: count(/\bdata-ref="/g) - count(/\bdata-answered\b/g) || count(/<div class="meeting[ "]/g)
    };

    pages.push(page);

    const rail = PAGE_RAIL.exec(block);

    if (rail === null) {
      return block;
    }

    let nav = rail[0].trimEnd();

    nav = replaceFirst(nav, "<nav ", `<nav data-page="${page.id}" `);

    if (!nav.slice(0, nav.indexOf(">")).includes("aria-label=")) {
      nav = replaceFirst(nav, "<nav ", `<nav aria-label="${escAll(page.title)}" `);
    }

    rails.push(nav);

    return block.slice(0, rail.index) + block.slice(rail.index + rail[0].length);
  };

  let out = mapPages(text, takeRail);

  if (pages.length < 2) {
    return { text: out, count: pages.length };
  }

  const lines = ['<div class="rail-pages">', '  <span class="rail-label">Pages</span>'];

  for (const [group, label] of Object.entries(PAGE_GROUPS)) {
    const members = pages.filter((page) => page.group === group);

    if (members.length > 0 && label) {
      lines.push(`  <span class="rail-sub">${label}</span>`);
    }

    for (const page of members) {
      const icon = page.icon || DEFAULT_ICONS[group];
      const meta = page.meta || (group === "shared" && page.count ? String(page.count) : "");
      const metaHtml = meta ? `<span class="m">${escAll(meta)}</span>` : "";

      lines.push(`  <a class="rail-page" href="#${page.id}"><svg><use href="#${icon}"/></svg><span class="l">${escAll(page.title)}</span>${metaHtml}</a>`);
    }
  }

  lines.push("</div>");
  out = replaceFirst(out, "<!-- pages-nav -->", lines.join("\n"));
  out = replaceFirst(out, "<!-- page-rails -->", rails.join("\n"));
  out = replaceFirst(out, 'class="doc"', 'class="doc multi"');

  return { text: out, count: pages.length };
}

function asset(folder, name) {
  const local = join(folder, name);

  return readFileSync(existsSync(local) ? local : join(SKILL_ASSETS, name), "utf8");
}

// extras: a review copy's own styles, script and data, added after the doc's.
function build(shell, source, design, out, keep, extras = null) {
  let text = source.text;

  if (keep) {
    const selected = selectPages(text, keep);
    const unlinked = unlinkMissing(selected.text);

    text = unlinked.text;

    for (const note of selected.notes) {
      console.log(`note: ${note}`);
    }

    if (unlinked.dropped.length > 0) {
      console.log(`note: references to items not in this copy are plain text: ${unlinked.dropped.join(", ")}`);
    }
  }

  const switched = pageSwitcher(text);

  text = switched.text;

  const final = parse(text);
  const { errors } = checkLinks(final, (line) => `built line ${line}`);

  for (const [ident, line] of final.duplicateIds) {
    errors.push(`built line ${line}: duplicate id '${ident}'`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.log(`error: ${error}`);
    }

    console.log("not built: the assembled doc has broken links");

    return 1;
  }

  if (design !== null) {
    text = replaceFirst(text, "<head>", `<head>\n<meta name="design-changes" content="${design.changes.length}">`);

    // The records as data, for components' own scripts; designModel leaves out the private fields.
    const model = fillFacts(JSON.stringify(designModel(design)), design).text.replaceAll("</", "<\\/");

    text = replaceFirst(text, "</body>", `<script type="application/json" id="doc-model">${model}</script>\n</body>`);
  }

  // A design's own components bring their styles and scripts along.
  const components = join(dirname(shell), "components");
  const own = existsSync(components) && statSync(components).isDirectory() ? readdirSync(components).sort().map((name) => join(components, name)) : [];
  const css = asset(dirname(shell), "doc.css") + own.filter((path) => extname(path) === ".css").map((path) => `\n/* ${basename(path)} */\n${readFileSync(path, "utf8")}`).join("");
  const js = asset(dirname(shell), "doc.js") + own.filter((path) => extname(path) === ".js").map((path) => `\n// ${basename(path)}\n${readFileSync(path, "utf8")}`).join("");
  let cssCount = 0;
  let jsCount = 0;

  text = text.replace(/<link[^>]*href="doc\.css"[^>]*>/g, () => {
    cssCount += 1;

    return `<style>\n${css}</style>`;
  });
  text = text.replace(/<script[^>]*src="doc\.js"[^>]*>\s*<\/script>\s*/g, () => {
    jsCount += 1;

    return "";
  });

  if (jsCount > 0) {
    text = replaceFirst(text, "</body>", `<script>\n${js}</script>\n</body>`);
  }

  if (extras !== null) {
    const data = JSON.stringify(extras.data).replaceAll("</", "<\\/");

    text = replaceFirst(text, "</head>", `<style>\n${extras.css}</style>\n</head>`);
    text = replaceFirst(text, "</body>", `<script type="application/json" id="review-changes">${data}</script>\n<script>\n${extras.js}</script>\n</body>`);
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(`built ${out} (${switched.count} page(s); styles inlined: ${cssCount > 0 ? "True" : "False"}, script inlined: ${jsCount > 0 ? "True" : "False"})`);

  return 0;
}

async function migrate(folder) {
  let design = existsSync(join(folder, "design.json")) ? join(folder, "design.json") : join(folder, "design.md");

  if (!existsSync(design)) {
    console.log(`${folder}: no design.json or design.md here`);

    return 1;
  }

  const current = readFormat(design);

  if (current >= FORMAT) {
    console.log(`${folder}: already format ${current}; nothing to migrate`);

    return 0;
  }

  const backup = join(folder, ".migrate-backup", `format-${current}`);

  if (!existsSync(backup)) {
    for (const name of ["design.json", "evidence.json", "meetings.json", "design.md", "evidence.md", "meetings.md", "changes.md", "doc.html", "pages", "components"]) {
      const source = join(folder, name);

      if (existsSync(source)) {
        mkdirSync(backup, { recursive: true });
        cpSync(source, join(backup, name), { recursive: true, preserveTimestamps: true });
      }
    }

    console.log(`copied the folder's files to ${backup}`);
  }

  const steps = readdirSync(join(SCRIPTS, "migrations"))
    .filter((name) => /^m\d{3}_.*\.mjs$/.test(name))
    .sort();

  for (const step of steps) {
    const number = Number(step.slice(1, 4));

    if (!(current < number && number <= FORMAT)) {
      continue;
    }

    const module = await import(join(SCRIPTS, "migrations", step));

    console.log(module.summary);

    for (const note of await module.migrate(folder)) {
      console.log(`  ${note}`);
    }

    writeFormat(design, number);

    if (existsSync(join(folder, "design.json"))) {
      design = join(folder, "design.json");
    }
  }

  const { errors, warnings } = await check(folder);

  for (const warning of warnings) {
    console.log(`warning: ${warning}`);
  }

  for (const error of errors) {
    console.log(`error: ${error}`);
  }

  console.log(`migrated to format ${FORMAT}; ${errors.length} error(s), ${warnings.length} warning(s). Review the changes before building.`);

  return errors.length > 0 ? 1 : 0;
}

const USAGE = `usage: doc.mjs check <design folder | doc.html>
       doc.mjs build <design folder | doc.html> [-o <out.html>] [--pages <id,id>]
       doc.mjs migrate <design folder>
       doc.mjs review <design folder>
       doc.mjs apply-changes <design folder> <C1 C2 … | all>

  check    report broken references, missing parts, and local paths
  build    check, then write one self-contained HTML file (default: <folder>/published/<slug>.html,
           the slug from <html data-doc>; with --pages, <slug>-<page ids>.html)
  migrate  bring a design folder written for an older version of this skill up to date
  review   build a local review copy showing the draft changes in <folder>/.review/changes.json
           (written to <folder>/.review/<slug>.review.html; the folder is git-ignored)
  apply-changes  write the named draft changes into the design and drop them from the draft`;

// The design's own files, without its review copies or published doc; the copy sits inside the folder it copies.
function copyDesign(from, to) {
  mkdirSync(to, { recursive: true });

  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.name === ".review" || entry.name === "published") continue;

    if (entry.isDirectory()) copyDesign(join(from, entry.name), join(to, entry.name));
    else cpSync(join(from, entry.name), join(to, entry.name));
  }
}

// Two review copies: the doc as it is and the doc with every draft change applied, each built the normal way, so the
// changed one shows exactly what would publish. The review script switches between them.
async function review(doc, source, design) {
  const shell = resolve(doc)[0];
  const folder = dirname(shell);
  const { changes } = readChanges(folder);
  const data = reviewData(folder, changes);
  const reviewDir = reviewFolder(folder);
  const slug = docSlug(source.text, shell);
  const names = { current: `${slug}.review.html`, changed: `${slug}.changed.html` };
  const extras = (variant) => ({ css: asset(folder, "review.css"), js: asset(folder, "review.js"), data: { variant, other: names[variant === "current" ? "changed" : "current"], changes: data } });

  for (const change of data) {
    if (change.state === "stale") console.log(`note: ${change.id} rewrites text that has changed since it was drafted; it isn't in the changed copy`);

    if (change.added.length > 0) console.log(`note: ${change.id} cites ${change.added.join(", ")}, which the current text doesn't`);
  }

  console.log(`${data.length} draft change(s)`);

  const copy = join(reviewDir, "changed");

  rmSync(copy, { recursive: true, force: true });
  copyDesign(folder, copy);

  for (const change of changes) {
    if (data.find((item) => item.id === change.id)?.state === "ready") writeChange(copy, change);
  }

  const changed = await check(copy);

  for (const error of changed.errors) console.log(`note: with the changes applied: ${error}`);

  const builtCurrent = build(shell, source, design, join(reviewDir, names.current), null, extras("current"));

  if (changed.source === null) return builtCurrent;

  const builtChanged = build(resolve(copy)[0], changed.source, changed.design, join(reviewDir, names.changed), null, extras("changed"));

  return Math.max(builtCurrent, builtChanged);
}

function applyDraft(doc, ids) {
  const folder = dirname(resolve(doc)[0]);
  const { applied, skipped } = applyChanges(folder, ids);

  for (const change of applied) console.log(`applied ${change.id}: ${change.where ?? change.target.field ?? change.target.file}`);

  for (const note of skipped) console.log(`skipped ${note}`);

  console.log(`${applied.length} applied, ${skipped.length} skipped; log them in changes.md, then check and build`);

  return skipped.length > 0 ? 1 : 0;
}

async function main(argv) {
  let parsed;

  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { out: { type: "string", short: "o" }, pages: { type: "string" }, help: { type: "boolean", short: "h" } } });
  } catch (error) {
    console.error(`${USAGE}\n\ndoc.mjs: ${error.message}`);

    return 2;
  }

  const [command, doc] = parsed.positionals;

  if (parsed.values.help) {
    console.log(USAGE);

    return 0;
  }

  const applying = command === "apply-changes";

  if (!["check", "build", "migrate", "review", "apply-changes"].includes(command) || doc === undefined || (applying ? parsed.positionals.length < 3 : parsed.positionals.length > 2)) {
    console.error(USAGE);

    return 2;
  }

  if (command === "migrate") {
    return migrate(doc);
  }

  if (applying) {
    return applyDraft(doc, parsed.positionals.slice(2));
  }

  const { errors, warnings, source, design } = await check(doc);

  for (const warning of warnings) {
    console.log(`warning: ${warning}`);
  }

  for (const error of errors) {
    console.log(`error: ${error}`);
  }

  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);

  if (command === "build") {
    if (errors.length > 0) {
      console.log("not built: fix the errors first");

      return 1;
    }

    if (source === null) {
      console.log("not built: there's no doc.html yet; the records are checked on their own");

      return 1;
    }

    const shell = resolve(doc)[0];

    const keep = parsed.values.pages
      ? parsed.values.pages
          .split(",")
          .map((page) => page.trim())
          .filter((page) => page !== "")
      : null;

    // A copy with some pages goes beside the full doc, never over it, so the full doc keeps its change stamp.
    const name = docSlug(source.text, shell) + (keep && keep.length > 0 ? `-${keep.join("-")}` : "");
    const out = parsed.values.out ?? join(dirname(shell), "published", `${name}.html`);

    return build(shell, source, keep && keep.length > 0 ? null : design, out, keep && keep.length > 0 ? keep : null);
  }

  if (command === "review") {
    if (errors.length > 0 || source === null) {
      console.log("no review copy: fix the errors first");

      return 1;
    }

    return await review(doc, source, design);
  }

  return errors.length > 0 ? 1 : 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  if (error instanceof Stop || error instanceof JsonError || error instanceof ChangesError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
