// Format 2: pages written in Markdown, with the page structure rendered by the skill.
//
// Each pages/<id>.html becomes pages/<id>.md. The parts the skill now renders are dropped or turned into their Markdown
// form: the rail, the header, section numbers, record placeholders a standard section gets anyway, decision relations
// and reasoning, and subheads. Everything else a page drew by hand (diagrams, option cards, cost and flow tables) is
// kept as raw HTML inside its section, so nothing is lost; move it into components/ or records when you next work on it.
//
// The shared Open questions page goes: the overview and area pages list questions. A question's Status and Latest, and
// a meeting that hasn't happened, move to the effort; the notes list them.

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { unescape } from "../text.mjs";

export const summary = "Format 2: pages written in Markdown, with the page structure rendered by the skill.";

const MONTHS = Object.fromEntries(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, index) => [month, index + 1]));

const STANDARD = {
  "in short": "short",
  "what we're after": "after",
  requirements: "requirements",
  "how it fits together": "map",
  "the whole system": "system",
  design: "design",
  "decision map": "map",
  "how it measures up": "measure",
  cost: "cost",
  risks: "risks",
  decisions: "decisions",
  "open questions": "questions"
};

const RECORDS = new Set(["requirements", "measure", "cost", "risks", "decisions", "questions"]);

function attr(tag, name) {
  const found = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);

  return found === null ? "" : unescape(found[1]);
}

// Inline HTML as the Markdown pages write it: mentions as bare IDs, page links as [text](#id).
function toMarkdown(fragment) {
  let text = fragment.replace(/<a class="mention" href="#([EQDR]\d+)">\1<\/a>/g, "$1");

  text = text.replace(/<a href="(#[\p{L}\p{N}_.-]+)">([^<]+)<\/a>/gu, "[$2]($1)");
  text = text.replace(/<b>(.*?)<\/b>/g, "**$1**");
  text = text.replace(/\s+/g, " ");

  return unescape(text).trim();
}

function iso(date) {
  const found = /^([\p{L}\p{N}_]{3}) (\d{1,2}), (\d{4})/u.exec(date);

  return found === null ? "" : `${found[3]}-${String(MONTHS[found[1]]).padStart(2, "0")}-${found[2].padStart(2, "0")}`;
}

// HTML kept as it is, without blank lines, which would end a raw block in Markdown.
function raw(block) {
  const lines = block.split("\n").filter((line) => line.trim());
  const indent = lines.length === 0 ? 0 : Math.min(...lines.map((line) => line.length - line.trimStart().length));

  return lines.map((line) => line.slice(indent)).join("\n");
}

// A section's content as Markdown blocks: subheads become ### lines, the rest stays raw HTML.
function bodyBlocks(body) {
  const blocks = [];
  let position = 0;

  for (const found of body.matchAll(/<div class="subhead"(?: id="([^"]+)")?><h3>(.*?)<\/h3>(?:<p>(.*?)<\/p>)?<\/div>/gs)) {
    const before = body.slice(position, found.index);

    if (before.trim()) {
      blocks.push(raw(before));
    }

    const head = `### ${toMarkdown(found[2])}${found[1] ? ` {#${found[1]}}` : ""}`;

    blocks.push(head + (found[3] ? `\n${toMarkdown(found[3])}` : ""));
    position = found.index + found[0].length;
  }

  if (body.slice(position).trim()) {
    blocks.push(raw(body.slice(position)));
  }

  return blocks;
}

// Where the <div> opening at start closes, counting the divs nested in it.
function divEnd(text, start) {
  let depth = 0;

  for (const found of text.slice(start).matchAll(/<div\b|<\/div>/g)) {
    depth += found[0] === "</div>" ? -1 : 1;

    if (depth === 0) {
      return start + found.index + found[0].length;
    }
  }

  return text.length;
}

function section(block, prefix, group) {
  const sid = attr(block.slice(0, block.indexOf(">")), "id");
  const headStart = block.indexOf('<div class="section-head">');
  const head = block.slice(headStart, divEnd(block, headStart));
  let rest = block.slice(divEnd(block, headStart), block.lastIndexOf("</section>"));
  const titleHtml = /<div class="section-title">(.*?)<\/div>/s.exec(head)[1];
  const decision = /class="ref ref-d" href="#(D\d+)"/.exec(titleHtml);
  const title = toMarkdown(/<h2>(.*?)<\/h2>/s.exec(titleHtml)[1]);
  const intro = /<p class="intro">(.*?)<\/p>/s.exec(head);
  const lines = [];
  let heading;
  let fallback;

  if (decision !== null) {
    const name = decision[1];

    rest = rest.replace(new RegExp(`<!--\\s*records reasoning ids=${name}\\s*-->`, "g"), "");
    heading = `## ${name}`;
    fallback = `${prefix}-${name.toLowerCase()}`;
  } else {
    heading = `## ${title}`;
    fallback = `${prefix}-${STANDARD[title.toLowerCase()] ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
  }

  if (sid && sid !== fallback) {
    heading += ` {#${sid}}`;
  }

  lines.push(heading);

  if (intro !== null) {
    lines.push("", toMarkdown(intro[1]));
  }

  const short = /<div class="short-row">\s*<div class="prose">(.*?)<\/div>/s.exec(rest);
  const kind = STANDARD[title.toLowerCase()];

  if (short !== null) {
    lines.push("", ...[...short[1].matchAll(/<p>(.*?)<\/p>/gs)].map((paragraph) => `${toMarkdown(paragraph[1])}\n`));

    return `${lines.join("\n").trimEnd()}\n`;
  }

  if (RECORDS.has(kind)) {
    rest = rest.replace(new RegExp(`<!--\\s*records ${kind}\\s*-->`), "");
  }

  if (group === "brief" && kind === "questions") {
    rest = rest.replace(/<!--\s*records questions blocks=[\p{L}\p{N}_,]+\s*-->/u, "");
  }

  rest = rest.replace(/<!--(?!\s*(?:records|component)\b).*?-->/gs, "");

  for (const chunk of bodyBlocks(rest)) {
    lines.push("", chunk);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function convert(page) {
  const open = page.slice(0, page.indexOf(">") + 1);
  const id = attr(open, "id");
  const group = attr(open, "data-page-group");
  const meta = { title: attr(open, "data-page-title"), group };
  const heading = toMarkdown(/<h1>(.*?)<\/h1>/s.exec(page)[1]);

  if (heading !== meta.title) {
    meta.heading = heading;
  }

  if (attr(open, "data-page-icon")) {
    const icon = attr(open, "data-page-icon");

    meta.icon = icon.startsWith("i-") ? icon.slice(2) : icon;
  }

  if (attr(open, "data-page-meta")) {
    meta.meta = attr(open, "data-page-meta");
  }

  const rail = /<nav class="page-rail">(.*?)<\/nav>/s.exec(page);
  const railHtml = rail === null ? "" : rail[1];

  if (railHtml.includes("cite-filter")) {
    meta.shows = "evidence";
  } else if (railHtml.includes("meetings-rail")) {
    meta.shows = "meetings";
  } else if (!railHtml.includes("decisions-rail") && (group === "overview" || group === "area")) {
    meta.rail = "none";
  }

  const note = /<div class="rail-note">\s*<strong>(.*?)<\/strong>(.*?)<\/div>/s.exec(railHtml);

  if (note !== null) {
    meta["rail-note"] = `${toMarkdown(note[1])}: ${toMarkdown(note[2])}`;
  }

  const context = /<div class="context-line">(.*?)<\/div>/s.exec(page)[1];
  const updated = /Updated ([^<]+)<\/span>/.exec(context);

  if (updated !== null && iso(updated[1])) {
    meta.updated = iso(updated[1]);
  }

  if (!context.startsWith('<a class="mono"')) {
    const parts = [...context.matchAll(/<span class="mono">(.*?)<\/span>/gs)].map((part) => toMarkdown(part[1]));

    if (parts.length > 0) {
      meta.context = parts.join(" / ");
    }
  }

  if ((group === "overview" || group === "area") && !page.includes("<!-- records progress -->")) {
    meta.progress = "none";
  }

  const dek = /<p class="dek">(.*?)<\/p>/s.exec(page);
  const sections = [...page.matchAll(/<section class="section"/g)].map((match) => page.slice(match.index, page.indexOf("</section>", match.index) + 10));
  const ids = sections.map((s) => attr(s.slice(0, s.indexOf(">")), "id"));
  const prefix = ids.length > 0 && ids[0] ? ids[0].split("-")[0] : id;

  if (prefix !== id && !meta.shows) {
    meta.prefix = prefix;
  }

  const out = ["---", ...Object.entries(meta).map(([key, value]) => `${key}: ${value}`), "---", ""];

  if (dek !== null) {
    out.push(toMarkdown(dek[1]), "");
  }

  if (!meta.shows) {
    out.push(...sections.map((s) => section(s, prefix, group)));
  }

  return `${out.join("\n").trimEnd()}\n`;
}

// Decision relations are drawn from records now: a section's "Follows D0" becomes the decision's Follows field.
function addFollows(folder, pages) {
  const follows = new Map();

  const add = (child, parent) => {
    if (!follows.has(child)) {
      follows.set(child, []);
    }

    follows.get(child).push(parent);
  };

  for (const page of pages) {
    for (const found of page.matchAll(/<div class="section-title">.*?href="#(D\d+)".*?<div class="relations">(.*?)<\/div>/gs)) {
      const parents = /<span>Follows (.*?)<\/span>/s.exec(found[2]);

      for (const parent of parents === null ? [] : [...parents[1].matchAll(/href="#(D\d+)"/g)].map((m) => m[1])) {
        add(found[1], parent);
      }

      // "Unblocks D2 D3" says the same from the other side: D2 and D3 follow this decision.
      const children = /<span>Unblocks (.*?)<\/span>/s.exec(found[2]);

      for (const child of children === null ? [] : [...children[1].matchAll(/href="#(D\d+)"/g)].map((m) => m[1])) {
        add(child, found[1]);
      }
    }
  }

  for (const [child, parents] of follows) {
    follows.set(
      child,
      [...new Set(parents)].sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)))
    );
  }

  const design = join(folder, "design.md");
  const lines = readFileSync(design, "utf8").split("\n");
  const notes = [];

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const heading = /^### (D\d+) · /.exec(lines[index]);

    if (heading === null || !follows.has(heading[1])) {
      continue;
    }

    let end = index + 1;

    while (end < lines.length && (lines[end].startsWith("- ") || lines[end].startsWith("  "))) {
      end += 1;
    }

    if (lines.slice(index + 1, end).some((line) => line.startsWith("- Follows:"))) {
      continue;
    }

    lines.splice(end, 0, `- Follows: ${follows.get(heading[1]).join(", ")}`);
    notes.push(`design.md: ${heading[1]} follows ${follows.get(heading[1]).join(", ")}`);
  }

  writeFileSync(design, lines.join("\n"));

  return notes;
}

// Chasing a question and planning a meeting are the effort's business now: take them out of design.md and list them.
function moveToEffort(folder) {
  const design = join(folder, "design.md");
  const lines = readFileSync(design, "utf8").split("\n");
  const kept = [];
  const notes = [];
  let index = 0;

  while (index < lines.length) {
    const heading = /^### (Q\d+) · |^### (\d{4}-\d{2}-\d{2} · .+)$/.exec(lines[index]);
    let end = index + 1;

    while (heading !== null && end < lines.length && (lines[end].startsWith("- ") || lines[end].startsWith("  "))) {
      end += 1;
    }

    let record = lines.slice(index, end);
    const status = record.find((line) => line.startsWith("- Status: "))?.slice("- Status: ".length) ?? "";

    if (heading !== null && heading[2] && status !== "Awaiting review" && status !== "Summarised") {
      notes.push(`design.md: removed meeting '${heading[2]}' (Status: ${status}); the doc records meetings that happened`);
      index = end < lines.length && !lines[end].trim() ? end + 1 : end;
      continue;
    }

    if (heading !== null && heading[1]) {
      const chasing = record.slice(1).filter((line) => /^- (Status|Latest): /.test(line) && line !== "- Status: Answered");

      if (chasing.length > 0) {
        notes.push(`design.md: ${heading[1]} dropped ${chasing.map((line) => line.slice(2)).join(" · ")}; record who was asked and when in the question's 'Asked'`);
      }

      record = record.filter((line) => !chasing.includes(line));
    }

    kept.push(...record);
    index = end;
  }

  writeFileSync(design, kept.join("\n"));

  return notes;
}

export function migrate(folder) {
  const notes = [];
  const originals = [];
  const shell = join(folder, "doc.html");

  if (!existsSync(shell)) {
    return notes;
  }

  let text = readFileSync(shell, "utf8");

  for (const found of [...text.matchAll(/<!--\s*include\s+(pages\/[\p{L}\p{N}_-]+)\.html\s*-->/gu)]) {
    const source = join(folder, `${found[1]}.html`);

    if (!existsSync(source)) {
      continue;
    }

    let page = readFileSync(source, "utf8").replace(/^\s*<!--.*?-->\s*/s, "");

    // The shared Open questions page is gone: the overview and each area list their questions.
    if (page.slice(0, page.indexOf(">")).includes('data-page-group="shared"') && /<!--\s*records questions\s*-->/.test(page)) {
      rmSync(source);
      text = text.split(`${found[0]}\n`).join("").split(found[0]).join("");
      notes.push(`${basename(source)} removed: open questions are listed on the overview and area pages`);
      continue;
    }

    originals.push(page);

    const target = source.replace(/\.html$/, ".md");

    writeFileSync(target, convert(page));
    rmSync(source);
    text = text.split(found[0]).join(`<!-- include ${found[1]}.md -->`);

    const kept = readFileSync(target, "utf8")
      .split("\n\n")
      .filter((block) => block.startsWith("<")).length;

    notes.push(`${basename(source)} → ${basename(target)}${kept ? ` (${kept} block(s) of hand-written HTML kept as they were)` : ""}`);
  }

  const pages = join(folder, "pages");

  for (const name of existsSync(pages)
    ? readdirSync(pages)
        .filter((file) => file.endsWith(".md"))
        .sort()
    : []) {
    const target = join(pages, name);
    const markdown = readFileSync(target, "utf8");

    if (/^group: (overview|area)$/m.test(markdown) && !/^## Open questions\b/m.test(markdown)) {
      writeFileSync(target, `${markdown.trimEnd()}\n\n## Open questions\n`);
      notes.push(`${name}: added the Open questions section`);
    }
  }

  writeFileSync(shell, text);

  return [...notes, ...addFollows(folder, originals), ...moveToEffort(folder)];
}
