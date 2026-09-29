#!/usr/bin/env node
// Render design-doc pages and apply record bindings. doc.py sends one JSON
// request on stdin and reads one JSON answer from stdout.
//
//   {"cmd": "pages", "folder", "model", "pages": [{"file", "text"}],
//    "components": [{"name", "props", "page"}]}
//     A page written in Markdown (pages/<id>.md) becomes a page article: the
//     header, rail, numbered sections, standard record sections and decision
//     sections come from here, so a change to them reaches every doc on its
//     next build. Any page can pull in a component with
//     <!-- component <name> key=value -->, or in Markdown with a ::: <name>
//     block. A component is <name>.html (a fragment) or <name>.mjs (a function
//     of the records, given the kit in kit.mjs), from the design's components/
//     folder first, then this skill's assets/components/.
//
//   {"cmd": "bind", "model", "html"}
//     Elements that depend on a record say which, and take their state from it:
//       data-pending="D1 D2"  dashed (class pending) while any of them is unsettled
//       data-when="D1=B"      shown only while it holds: D1=B (chosen, or leaning
//                             while undecided), D6:decided, Q3:answered, R4:partly;
//                             several are all required, !x negates one
//       data-text="D1.answer" text from a field (answer, title, state, or any field)
//       data-state-of="D6"    adds class state-<state> for the component's own CSS
//     Every change stays on its line, so doc.py's line numbers still hold.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { esc, ids, longDate, makeKit } from "./kit.mjs";

const SKILL_COMPONENTS = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/components");

const MENTION = /(?<![\w#/\\-])([EQDR]\d+)\b/g;

const ESCAPED_ID = /\\([EQDR]\d+)\b/g;

const COMPONENT_COMMENT = /<!--\s*component\s+([\w-]+)((?:\s+[\w-]+(?:="[^"]*"|=\S+)?)*)\s*-->/g;

const BOUND_TAG = /<([a-zA-Z][\w:-]*)(\s[^<>]*?\bdata-(?:pending|when|text|state-of)="[^"]*"[^<>]*?)(\/?)>/g;

const DECISION_HEADING = /^D\d+$/;

// Record tables doc.py renders; ::: <kind> asks for one, and a design's own component of that name replaces it.
const RECORD_KINDS = new Set(["requirements", "measure", "decisions", "decisions-rail", "reasoning", "parts", "risks", "cost", "terms", "evidence", "questions", "meetings", "meetings-rail", "progress", "phases"]);

const STANDARD_SECTIONS = {
  "in short": { suffix: "short", layout: "short" },
  "what we're after": { suffix: "after" },
  requirements: { suffix: "requirements", records: "requirements" },
  "how it fits together": { suffix: "map" },
  "the whole system": { suffix: "system" },
  design: { suffix: "design" },
  "decision map": { suffix: "map" },
  "how it measures up": { suffix: "measure", records: "measure" },
  cost: { suffix: "cost", records: "cost" },
  risks: { suffix: "risks", records: "risks" },
  decisions: { suffix: "decisions", records: "decisions" },
  phases: { suffix: "phases", records: "phases" },
  "open questions": { suffix: "questions", records: "questions" },
};

const RAIL_DECISIONS = { overview: "Open decisions", area: "Open decisions in this area" };

// Shared pages list every finding or meeting; front matter "shows: evidence" picks one.
const SHARED_LISTS = {
  evidence: { rail: '  <div class="rail-group cite-filter">\n    <span class="rail-label">Show findings cited on</span>\n  </div>' },
  meetings: { rail: '  <div class="rail-group">\n    <span class="rail-label">Meetings</span>\n    <!-- records meetings-rail -->\n  </div>' },
};

// Text

function inline(text, model) {
  const kept = [];

  const keep = (html) => {
    kept.push(html);

    return `\u0000${kept.length - 1}\u0000`;
  };

  // Code spans go first, so a tag-like `<slug>` inside one is escaped as text rather than kept as a tag.
  let out = String(text)
    .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${esc(code)}</code>`))
    .replace(/<\/?[a-zA-Z][^<>]*>/g, keep)
    .replace(/\[([^\]]+)\]\((#[\w.-]+)\)/g, (_, label, href) => keep(`<a href="${esc(href)}">${esc(label)}</a>`));

  out = esc(out)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "<em>$1</em>")
    .replace(MENTION, (match, id) => (id in model.records ? `<a class="mention" href="#${id}">${id}</a>` : match))
    .replace(ESCAPED_ID, "$1");

  // A kept piece can hold another's placeholder, such as a code span inside a link's label.
  while (/\u0000\d+\u0000/.test(out)) out = out.replace(/\u0000(\d+)\u0000/g, (_, index) => kept[Number(index)]);

  return out;
}

function blocksOf(lines) {
  const blocks = [];
  let current = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) blocks.push(current);

      current = [];
    } else {
      current.push(line.trim());
    }
  }

  if (current.length > 0) blocks.push(current);

  return blocks;
}

// key=value and key="value" pairs; bare words are also listed in order under args.
function parseProps(text) {
  const props = { args: [] };

  for (const match of text.matchAll(/([\w-]+)(?:="([^"]*)"|=(\S+))?/g)) {
    const value = match[2] ?? match[3];

    if (value === undefined) props.args.push(match[1]);

    props[match[1]] = value ?? true;
  }

  return props;
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Components

async function loadComponent(name, folder) {
  for (const base of [join(folder, "components"), SKILL_COMPONENTS]) {
    const module = join(base, `${name}.mjs`);
    const fragment = join(base, `${name}.html`);

    if (existsSync(module)) {
      const loaded = await import(pathToFileURL(module).href);

      return { render: loaded.default, file: module };
    }

    if (existsSync(fragment)) {
      const html = readFileSync(fragment, "utf8").trim();

      return { render: () => html, file: fragment };
    }
  }

  return null;
}

function makeContext(request, page, errors) {
  const kit = makeKit(request.model, (text) => inline(text, request.model));

  const context = {
    ...kit,
    model: request.model,
    page,
    folder: request.folder,
    railLinks: [],
    error: (message) => errors.push(message),
    markdown: (text) => renderFlow(text.split("\n"), context),
    component: (name, props = { args: [] }, body = "") => renderComponent(name, props, body, context),
  };

  return context;
}

function recordsPlaceholder(kind, props) {
  const options = Object.entries(props)
    .filter(([key, value]) => key !== "args" && value !== true)
    .map(([key, value]) => ` ${key}=${value}`)
    .join("");

  return `<!-- records ${kind}${options} -->`;
}

async function renderComponent(name, props, body, context) {
  const component = await loadComponent(name, context.folder);

  if (component === null && RECORD_KINDS.has(name)) return recordsPlaceholder(name, props);

  if (component === null) {
    context.error(`component '${name}' isn't in components/ or the skill's components`);

    return "";
  }

  const html = await component.render({ ...context, props, body });

  return expandComments(html, context);
}

async function expandComments(html, context) {
  const parts = [];
  let position = 0;

  for (const match of html.matchAll(COMPONENT_COMMENT)) {
    parts.push(html.slice(position, match.index), await context.component(match[1], parseProps(match[2])));
    position = match.index + match[0].length;
  }

  parts.push(html.slice(position));

  return parts.join("");
}

// Markdown pages

function frontMatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);

  if (match === null) return { meta: {}, body: text };

  const meta = {};

  for (const line of match[1].split("\n")) {
    const field = /^([\w-]+):\s*(.*)$/.exec(line);

    if (field !== null) meta[field[1]] = field[2].trim();
  }

  return { meta, body: text.slice(match[0].length) };
}

function splitSections(body) {
  const intro = [];
  const sections = [];

  for (const line of body.split("\n")) {
    const heading = /^## (.+?)(?:\s+\{#([\w-]+)\})?\s*$/.exec(line);

    if (heading !== null) {
      sections.push({ title: heading[1], id: heading[2], lines: [] });
    } else if (sections.length > 0) {
      sections.at(-1).lines.push(line);
    } else {
      intro.push(line);
    }
  }

  return { intro, sections };
}

function pipeTable(block, context) {
  const rows = block
    .filter((line, index) => index !== 1)
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => context.inline(cell.trim())));

  return context.table(rows[0], rows.slice(1));
}

// Flow content: paragraphs, lists, pipe tables, subheads, raw HTML, comments and ::: component blocks.
async function renderFlow(lines, context) {
  const out = [];
  let prose = [];
  let index = 0;

  const flushProse = () => {
    if (prose.length > 0) out.push(`<div class="prose">\n${prose.join("\n")}\n</div>`);

    prose = [];
  };

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (trimmed === "") {
      index += 1;
      continue;
    }

    const open = /^:::\s*([\w-]+)(.*)$/.exec(trimmed);

    if (open !== null) {
      const body = [];

      index += 1;

      while (index < lines.length && lines[index].trim() !== ":::") {
        body.push(lines[index]);
        index += 1;
      }

      index += 1;
      flushProse();
      out.push(await context.component(open[1], parseProps(open[2]), body.join("\n").trim()));
      continue;
    }

    const block = [];

    while (index < lines.length && lines[index].trim() !== "" && !/^:::/.test(lines[index].trim())) {
      block.push(lines[index].trim());
      index += 1;
    }

    if (trimmed.startsWith("<")) {
      flushProse();
      out.push(await expandComments(block.join("\n"), context));
    } else if (trimmed.startsWith("### ")) {
      flushProse();
      out.push(subhead(block, context));
    } else if (trimmed.startsWith("|") && /^\|?\s*:?-+/.test(block[1] ?? "")) {
      flushProse();
      out.push(pipeTable(block, context));
    } else if (trimmed.startsWith("- ")) {
      prose.push(`<ul>${block.map((item) => `<li>${context.inline(item.replace(/^- /, ""))}</li>`).join("")}</ul>`);
    } else {
      prose.push(`<p>${context.inline(block.join(" "))}</p>`);
    }
  }

  flushProse();

  return out.join("\n");
}

// "### Title {#id}" and an optional line under it. An id also puts it in the rail, under its section;
// "{#id rail=API calls}" gives it a shorter name there, quoted or not.
function subhead(block, context) {
  const [head, ...rest] = block;
  const match = /^### (.+?)(?:\s+\{#([\w-]+)(?:\s+rail=(?:"([^"]*)"|([^"}]+?)))?\s*\})?$/.exec(head);
  const note = rest.length > 0 ? `<p>${context.inline(rest.join(" "))}</p>` : "";
  const id = match[2] === undefined ? "" : ` id="${esc(match[2])}"`;
  const railName = match[3] ?? match[4];

  if (match[2] === undefined && /\{#/.test(match[1])) context.error(`'${head}': write the id as {#id} or {#id rail=Name}`);

  if (match[2] !== undefined) context.railLinks.push({ id: match[2], title: railName ?? match[1], sub: true });

  return `<div class="subhead"${id}><h3>${context.inline(match[1])}</h3>${note}</div>`;
}

function sectionHead(number, titleHtml, extra = "") {
  const more = extra === "" ? "" : `\n    ${extra}`;

  return `  <div class="section-head">\n    <div class="section-title"><span class="num">${number}</span>${titleHtml}</div>${more}\n  </div>`;
}

// Follows, unblocks and waiting on, from the decision's record.
function relations(id, context) {
  const record = context.model.records[id];
  const waiting = record.state === "decided" ? [] : ids(context.field(record, "Waiting on"));

  const parts = [
    ["Follows", record.follows ?? []],
    ["Unblocks", record.unblocks ?? []],
    ["Waiting on", waiting],
  ].filter(([, list]) => list.length > 0);

  if (parts.length === 0) return "";

  return `<div class="relations">\n${parts.map(([label, list]) => `      <span>${label} ${list.map(context.ref).join(" ")}</span>`).join("\n")}\n    </div>`;
}

// Leading paragraphs of a section, up to the first block that isn't one.
function leadingProse(lines) {
  let index = 0;
  const kept = [];

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (trimmed !== "" && /^(?:<|:::|###|- |\|)/.test(trimmed)) break;

    kept.push(lines[index]);
    index += 1;
  }

  return { prose: blocksOf(kept).map((block) => block.join(" ")), rest: lines.slice(index) };
}

async function renderSection(section, number, context) {
  const num = String(number).padStart(2, "0");
  const decision = DECISION_HEADING.test(section.title) ? section.title : null;
  const standard = STANDARD_SECTIONS[section.title.toLowerCase()];
  const id = section.id ?? `${context.prefix}-${decision?.toLowerCase() ?? standard?.suffix ?? slug(section.title)}`;
  const text = section.lines.join("\n");

  context.railLinks.push({ id, title: section.title, number: num });

  if (decision !== null) {
    const record = context.model.records[decision];

    if (record?.kind !== "decision") {
      context.error(`section '## ${decision}' names a decision that isn't in design.md`);

      return `<section class="section" id="${esc(id)}"></section>`;
    }

    context.railLinks.at(-1).title = `${decision} · ${context.field(record, "Rail") ?? record.title}`;

    const { prose, rest } = leadingProse(section.lines);
    const intro = prose.length === 0 ? "" : `<p class="intro">${context.inline(prose.join(" "))}</p>`;
    const extra = [intro, relations(decision, context)].filter(Boolean).join("\n    ");
    const reasoning = context.field(record, "Why") === undefined ? "" : `\n  <!-- records reasoning ids=${decision} -->\n`;
    const body = await renderFlow(rest, context);

    return `<section class="section" id="${esc(id)}">\n${sectionHead(num, `${context.ref(decision)}<h2>${context.inline(record.title)}</h2>${context.status(decision)}`, extra)}\n${reasoning}\n${body}\n</section>`;
  }

  const title = `<h2>${context.inline(section.title)}</h2>`;

  if (standard?.layout === "short") {
    const paragraphs = blocksOf(section.lines).map((block) => `<p>${context.inline(block.join(" "))}</p>`).join("\n");
    const body = `  <div class="short-row">\n    <div class="prose">\n${paragraphs}\n    </div>\n    <div class="terms">\n      <h3>Terms used on this page</h3>\n      <!-- records terms -->\n    </div>\n  </div>`;

    return `<section class="section" id="${esc(id)}">\n${sectionHead(num, title)}\n${body}\n</section>`;
  }

  // Opening prose is the section's intro when something follows it: a record table (from design.md unless
  // the body places it), a diagram, a table. A section of prose alone stays prose.
  const { prose, rest } = leadingProse(section.lines);
  const framed = standard?.records !== undefined || rest.some((line) => line.trim() !== "");
  const intro = prose.length === 0 || !framed ? "" : `<p class="intro">${context.inline(prose.join(" "))}</p>`;
  let body = await renderFlow(framed ? rest : section.lines, context);

  // A record section with nothing but prose gets its table; one that places its own content keeps just that.
  if (standard?.records !== undefined && rest.every((line) => line.trim() === "")) {
    const options = parseProps(context.recordOptions[standard.records] ?? "");

    body += `\n  ${await context.component(standard.records, options)}`;
  }

  return `<section class="section" id="${esc(id)}">\n${sectionHead(num, title, intro)}\n${body}\n</section>`;
}

function rail(meta, group, context) {
  if (SHARED_LISTS[meta.shows] !== undefined) return `<nav class="page-rail">\n${SHARED_LISTS[meta.shows].rail}\n</nav>`;

  const links = context.railLinks.map((link) =>
    link.sub ? `    <a class="sub" href="#${esc(link.id)}">${esc(link.title)}</a>` : `    <a href="#${esc(link.id)}"><span class="n">${link.number}</span>${esc(link.title)}</a>`,
  );

  const groups = [`  <div class="rail-group rail-nav">\n    <span class="rail-label">On this page</span>\n${links.join("\n")}\n  </div>`];

  // Overviews and areas list their open decisions. A brief lists its decisions and those waiting on them,
  // the meetings that touched them, and the open questions that block them.
  if (meta.rail !== "none" && group === "brief") {
    groups.push(`  <!-- records brief-rail ids=${ids(String(meta.meta ?? "").split(/\s+/)).join(",")} -->`);
  } else if (meta.rail !== "none" && RAIL_DECISIONS[group] !== undefined) {
    groups.push(`  <div class="rail-group">\n    <span class="rail-label">${RAIL_DECISIONS[group]}</span>\n    <!-- records decisions-rail -->\n  </div>`);
  }

  if (meta["rail-note"]) {
    const [label, ...note] = meta["rail-note"].split(": ");

    groups.push(`  <div class="rail-note">\n    <strong>${esc(label)}</strong>\n    <span>${context.inline(note.join(": "))}</span>\n  </div>`);
  }

  return `<nav class="page-rail">\n${groups.join("\n\n")}\n</nav>`;
}

async function renderMarkdownPage(file, text, request, errors) {
  const id = file.replace(/^.*\//, "").replace(/\.md$/, "");
  // Guidance comments are for whoever writes the page; records and component comments are directives.
  const { meta, body } = frontMatter(text.replace(/<!--(?!\s*(?:records|component)\b)[\s\S]*?-->[ \t]*\n?/g, ""));
  const group = meta.group ?? "area";
  const context = makeContext(request, id, errors);
  const { intro, sections } = splitSections(body);

  // Components see the page they're on: its section prefix and the decisions it has sections for.
  context.prefix = meta.prefix ?? id;
  context.pageDecisions = sections.map((section) => section.title).filter((title) => DECISION_HEADING.test(title));
  const [dek, ...extra] = blocksOf(intro).map((block) => block.join(" "));
  const rendered = [];

  // A brief's open questions are the ones blocking its decisions.
  context.recordOptions = group === "brief" && meta.meta ? { questions: ` blocks=${ids(meta.meta.split(/\s+/)).join(",")}` } : {};

  for (const [index, section] of sections.entries()) {
    rendered.push(await renderSection(section, index + 1, context));
  }

  if (SHARED_LISTS[meta.shows] !== undefined) {
    rendered.push(`<section class="section" id="${esc(id)}-list">\n  <!-- records ${meta.shows} -->\n</section>`);
  } else if (meta.shows !== undefined) {
    errors.push(`${id}.md: 'shows: ${meta.shows}'; a shared page shows ${Object.keys(SHARED_LISTS).join(" or ")}`);
  }

  if (!meta.title) errors.push(`${id}.md needs a title in its front matter`);

  if (extra.length > 0) errors.push(`${id}.md: only the dek, one paragraph, goes before the first ## section`);

  const home = request.home ?? { id: "overview", title: "Overview" };
  const icon = meta.icon ? ` data-page-icon="i-${esc(meta.icon.replace(/^i-/, ""))}"` : "";
  const pageMeta = meta.meta ? ` data-page-meta="${esc(meta.meta)}"` : "";

  // The home page names its effort, or only its date when the design has none; other pages link home.
  let where = `<a class="mono" href="#${esc(home.id)}">${esc(home.title)}</a><span class="sep">/</span><span class="mono">${esc(meta.shows ?? group)}</span>`;

  if (meta.context) {
    where = meta.context.split("/").map((part) => `<span class="mono">${esc(part.trim())}</span>`).join('<span class="sep">/</span>');
  } else if (id === home.id) {
    where = "";
  }

  const updated = meta.updated ? `${where === "" ? "" : "<span>·</span>"}<span>Updated ${longDate(meta.updated)}</span>` : "";
  const dekHtml = dek === undefined ? "" : `\n  <p class="dek">${context.inline(dek)}</p>`;
  const progress = (group === "overview" || group === "area") && meta.progress !== "none" ? "\n  <!-- records progress -->" : "";

  return [
    `<article class="page" id="${esc(id)}" data-page-title="${esc(meta.title ?? id)}" data-page-group="${esc(group)}"${icon}${pageMeta}>`,
    "",
    rail(meta, group, context),
    "",
    '<header class="doc-header">',
    `  <div class="context-line">${where}${updated}</div>`,
    `  <h1>${context.inline(meta.heading ?? meta.title ?? id)}</h1>${dekHtml}${progress}`,
    "</header>",
    "",
    rendered.join("\n\n"),
    "",
    "</article>",
    "",
  ].join("\n");
}

// Markdown pages render whole; an HTML page sends each of its component comments.
async function renderPages(request) {
  const pages = [];
  const components = [];

  for (const page of request.pages ?? []) {
    const errors = [];
    const html = await renderMarkdownPage(page.file, page.text, request, errors);

    pages.push({ file: page.file, html, errors });
  }

  for (const use of request.components ?? []) {
    const errors = [];
    const context = makeContext(request, use.page, errors);
    const found = await loadComponent(use.name, request.folder);
    const html = await renderComponent(use.name, parseProps(use.props ?? ""), "", context);

    components.push({ file: found?.file ?? null, html, errors });
  }

  return { pages, components };
}

// Bindings

function holds(condition, model) {
  if (condition.startsWith("!")) return !holds(condition.slice(1), model);

  const option = /^([EQDR]\d+)=(\w+)$/.exec(condition);

  if (option !== null) {
    const record = model.records[option[1]];

    return record.chosen === option[2] || (record.chosen === null && record.leaning === option[2]);
  }

  const [id, state] = condition.split(":");
  const record = model.records[id];

  if (state === "settled") return record.state === "decided";

  if (state === "unsettled") return record.state !== "decided";

  return record.state === state;
}

function checkCondition(condition, model) {
  const bare = condition.replace(/^!/, "");
  const option = /^([EQDR]\d+)=(\w+)$/.exec(bare);
  const stated = /^([EQDR]\d+):(\w+)$/.exec(bare);
  const id = (option ?? stated)?.[1];
  const record = model.records[id];

  if (id === undefined) return `'${condition}' should look like D1=B or D6:decided`;

  if (record === undefined) return `'${condition}' names ${id}, which isn't in design.md`;

  if (option !== null && !record.options.some((item) => item.id === option[2])) return `'${condition}': ${id} has no option ${option[2]}`;

  if (stated !== null && ![...record.states, "settled", "unsettled"].includes(stated[2])) {
    return `'${condition}': ${id} is never '${stated[2]}' (${record.states.join(", ")})`;
  }

  return null;
}

function fieldValue(record, name) {
  const wanted = name.toLowerCase();

  if (wanted === "answer") return record.answer;

  if (wanted === "title") return record.title;

  if (wanted === "state") return record.state;

  const key = Object.keys(record.fields).find((field) => field.toLowerCase() === wanted);

  return key === undefined ? undefined : record.fields[key];
}

function setClass(attrs, add, remove) {
  const match = /\sclass="([^"]*)"/.exec(attrs);
  const classes = new Set(match === null ? [] : match[1].split(/\s+/).filter(Boolean));

  for (const name of remove) classes.delete(name);

  for (const name of add) classes.add(name);

  const value = [...classes].join(" ");

  if (match !== null) return attrs.replace(match[0], value === "" ? "" : ` class="${value}"`);

  return value === "" ? attrs : ` class="${value}"${attrs}`;
}

function attribute(attrs, name) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1];
}

function bind(request) {
  const { model, html } = request;
  const errors = [];
  const out = [];
  let position = 0;

  const fail = (offset, message) => errors.push({ line: html.slice(0, offset).split("\n").length, message });

  for (const match of html.matchAll(BOUND_TAG)) {
    const [whole, tag, original, selfClosing] = match;
    let attrs = original;
    let after = match.index + whole.length;
    let inner = null;

    out.push(html.slice(position, match.index));

    const pending = attribute(attrs, "data-pending");

    if (pending !== undefined) {
      const listed = pending.split(/\s+/).filter(Boolean);
      const unknown = listed.filter((id) => model.records[id]?.kind !== "decision");

      if (unknown.length > 0) fail(match.index, `data-pending="${pending}": ${unknown.join(", ")} isn't a decision in design.md`);

      const waiting = listed.some((id) => model.records[id]?.kind === "decision" && model.records[id].state !== "decided");

      attrs = setClass(attrs, waiting ? ["pending"] : [], waiting ? [] : ["pending"]);
    }

    const when = attribute(attrs, "data-when");

    if (when !== undefined) {
      const conditions = when.split(/\s+/).filter(Boolean);
      const problems = conditions.map((condition) => checkCondition(condition, model)).filter((problem) => problem !== null);

      for (const problem of problems) fail(match.index, `data-when: ${problem}`);

      const shown = problems.length === 0 && conditions.every((condition) => holds(condition, model));

      attrs = attrs.replace(/\shidden(?:="[^"]*")?(?=\s|$)/, "");

      if (!shown) attrs += " hidden";
    }

    const state = attribute(attrs, "data-state-of");

    if (state !== undefined) {
      const record = model.records[state];

      if (record === undefined) fail(match.index, `data-state-of="${state}" isn't in design.md`);
      else attrs = setClass(attrs, [`state-${record.state}`], record.states.map((name) => `state-${name}`));
    }

    const text = attribute(attrs, "data-text");

    if (text !== undefined) {
      const [id, field = "title"] = text.split(".");
      const record = model.records[id];
      const value = record === undefined ? undefined : fieldValue(record, field);
      const close = `</${tag}>`;
      const end = html.indexOf(close, after);
      const current = end === -1 ? null : html.slice(after, end);

      if (record === undefined) fail(match.index, `data-text="${text}": ${id} isn't in design.md`);
      else if (value === undefined) fail(match.index, `data-text="${text}": ${id} has no field '${field}'`);

      if (selfClosing || current === null || /[<\n]/.test(current)) {
        fail(match.index, `data-text="${text}" needs an element with no markup inside, on one line`);
      } else if (value !== undefined) {
        inner = inline(Array.isArray(value) ? value.join("; ") : value, model);
        after = end;
      }
    }

    out.push(`<${tag}${attrs}${selfClosing}>`);

    if (inner !== null) out.push(inner);

    position = after;
  }

  out.push(html.slice(position));

  return { html: out.join(""), errors };
}

// Entry

const request = JSON.parse(readFileSync(0, "utf8"));

const commands = { pages: renderPages, bind };

const run = commands[request.cmd];

if (run === undefined) {
  process.stderr.write(`unknown command '${request.cmd}'\n`);
  process.exit(2);
}

process.stdout.write(JSON.stringify(await run(request)));
