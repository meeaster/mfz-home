#!/usr/bin/env node
// Start, check and list re-checks for a knowledge base. Node built-ins only.
//
//   kb.mjs init <folder> [--name NAME]
//   kb.mjs check <folder>
//   kb.mjs stale <folder> [--article PATH] [--older-than DAYS]

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const format = "1";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const date = /^\d{4}-\d{2}-\d{2}$/;

const originKeyPattern = /^[a-z][a-z0-9-]*:\S+$/;

const linkPattern = /\[[^\]]*\]\(([^)\s]+)\)/g;

const headingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

const numbered = /^\d+\.\s+(.*)$/;

// Where each kind of source lives under sources/. A kind not listed here gets a folder named for it.
const sourceFolders = { meeting: "meetings", email: "email", chat: "chat", ticket: "tickets", page: "pages" };

const threads = new Set(["email", "chat", "ticket"]);

const message = /^## \d{4}-\d{2}-\d{2}( \d{2}:\d{2})? · /;

function report() {
  const errors = [];
  const warnings = [];

  return {
    errors,
    warnings,
    error: (where, text) => errors.push(`${where}: ${text}`),
    warn: (where, text) => warnings.push(`${where}: ${text}`)
  };
}

// A Markdown file's front matter and the lines after it.
function read(path) {
  let lines = readFileSync(path, "utf8").split(/\r?\n/);
  const meta = new Map();

  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

    if (end !== -1) {
      for (const line of lines.slice(1, end)) {
        const colon = line.indexOf(":");

        if (colon > 0) {
          meta.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
        }
      }

      lines = lines.slice(end + 1);
    }
  }

  return { path, meta, lines };
}

function headings(doc) {
  const found = [];
  let fenced = false;

  doc.lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      fenced = !fenced;

      return;
    }

    const match = fenced ? null : headingPattern.exec(line);

    if (match !== null) {
      found.push({ level: match[1].length, text: match[2], index });
    }
  });

  return found;
}

// The lines under a ## heading, up to the next ## or # heading, or null when there's no such heading.
function section(doc, title) {
  const all = headings(doc);
  const position = all.findIndex((heading) => heading.level === 2 && heading.text === title);

  if (position === -1) {
    return null;
  }

  const next = all.slice(position + 1).find((heading) => heading.level <= 2);

  return doc.lines.slice(all[position].index + 1, next === undefined ? doc.lines.length : next.index);
}

function markdownFiles(folder) {
  if (!existsSync(folder)) {
    return [];
  }

  const found = [];

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);

    if (entry.isDirectory()) {
      found.push(...markdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(path);
    }
  }

  return found.sort();
}

const rel = (root, path) => relative(root, path).split(sep).join("/");

function requireMeta(out, where, doc, key, isDate = false) {
  const value = doc.meta.get(key) ?? "";

  if (value === "") {
    out.error(where, `front matter needs \`${key}:\``);
  } else if (isDate && !date.test(value)) {
    out.error(where, `\`${key}:\` must be a date like 2026-10-19, not '${value}'`);
  }
}

// Resolves a relative link from a file, reporting links that leave the knowledge base or point at nothing.
function resolveLink(out, root, where, source, target) {
  if ((/^[a-z]+:\/\//.test(target) && !target.startsWith("file://")) || target.startsWith("#") || target.startsWith("mailto:")) {
    return null;
  }

  const outside = `link to ${target} is outside the knowledge base; copy it in as evidence`;

  if (target.startsWith("file://") || target.startsWith("/") || target.startsWith("~")) {
    out.error(where, outside);

    return null;
  }

  const path = resolve(dirname(source), target.split("#")[0]);
  const fromRoot = relative(root, path);

  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    out.error(where, outside);

    return null;
  }

  if (!existsSync(path)) {
    out.error(where, `link to ${target} points at nothing`);

    return null;
  }

  return path;
}

function loadOrigins(root, out) {
  const origins = new Map();
  const path = join(root, "origins.md");

  if (!existsSync(path)) {
    out.error("origins.md", "missing; `init` creates it");

    return origins;
  }

  const doc = read(path);
  let current = null;

  for (const line of doc.lines) {
    const match = headingPattern.exec(line);

    if (match !== null && match[1].length === 2) {
      const key = match[2].replaceAll("`", "");

      current = null;

      if (!originKeyPattern.test(key)) {
        out.error("origins.md", `heading '${match[2]}' isn't an origin key like \`aws:4471-0938-2215\``);
      } else if (origins.has(key)) {
        out.error("origins.md", `origin ${key} is listed twice`);
      } else {
        origins.set(key, []);
        current = key;
      }
    } else if (current !== null && line.trim() !== "") {
      origins.get(current).push(line.trim());
    }
  }

  for (const [key, body] of origins) {
    if (!body.some((line) => /^-?\s*access:/i.test(line))) {
      out.warn("origins.md", `origin ${key} says nothing about how to reach it (\`- Access:\`)`);
    }
  }

  return origins;
}

const splitParts = (item) => item.split(" · ").map((part) => part.trim());

const originKey = (part) => /^`([^`]+)`$/.exec(part)?.[1] ?? null;

const links = (text) => [...text.matchAll(linkPattern)].map((match) => match[1]);

const topFolder = (root, path) => rel(root, path).split("/")[0];

function checkReference(out, root, where, doc, item, origins, sectionNames, cited) {
  const parts = splitParts(item);
  const key = originKey(parts[0]);
  let rest = parts.slice(1);

  if (key !== null) {
    if (!origins.has(key)) {
      out.error(where, `reference to origin ${key}, which isn't in origins.md`);
    }

    if (rest.length === 0 || /^(observed |version |supports:|via )/.test(rest[0])) {
      out.error(where, `reference to ${key} needs a locator after the origin`);
    } else {
      rest = rest.slice(1);
    }

    if (!rest.some((part) => part.startsWith("observed "))) {
      out.error(where, `reference to ${key} needs \`observed <date>\``);
    }
  } else {
    const found = links(parts[0]);

    if (found.length !== 1) {
      out.error(where, `reference '${parts[0]}' must start with an origin key in backticks or one link`);
    } else {
      const target = resolveLink(out, root, where, doc.path, found[0]);

      if (target !== null) {
        cited.add(target);

        if (!["sources", "evidence"].includes(topFolder(root, target))) {
          out.error(where, `reference to ${found[0]} must be a source or evidence; link articles in the text`);
        }
      }
    }
  }

  for (const part of rest) {
    if (part.startsWith("observed ")) {
      const value = part.slice("observed ".length).trim();

      if (!date.test(value)) {
        out.error(where, `\`observed ${value}\` must be a date like 2026-10-19`);
      }
    } else if (part.startsWith("supports:")) {
      for (const name of part.slice("supports:".length).split(";").map((entry) => entry.trim())) {
        if (name !== "" && !sectionNames.has(name)) {
          out.error(where, `supports '${name}', which isn't a heading in the article`);
        }
      }
    } else if (part.startsWith("via ")) {
      const found = links(part);

      if (found.length === 0) {
        out.error(where, `\`${part}\` needs a link to the evidence`);
      } else {
        const target = resolveLink(out, root, where, doc.path, found[0]);

        if (target !== null) {
          cited.add(target);

          if (topFolder(root, target) !== "evidence") {
            out.error(where, `\`via\` must link to evidence, not ${found[0]}`);
          }
        }
      }
    } else if (!part.startsWith("version ")) {
      out.error(where, `unknown part '${part}' in a reference`);
    }
  }
}

function checkBodyLinks(out, root, where, doc, from = doc.lines.length) {
  let fenced = false;

  doc.lines.slice(0, from).forEach((line) => {
    if (line.startsWith("```")) {
      fenced = !fenced;
    }

    if (!fenced) {
      for (const target of links(line)) {
        resolveLink(out, root, where, doc.path, target);
      }
    }
  });
}

function checkArticle(out, root, path, origins, cited) {
  const where = rel(root, path);
  const doc = read(path);

  requireMeta(out, where, doc, "description");
  requireMeta(out, where, doc, "updated", true);

  const all = headings(doc);

  if (!all.some((heading) => heading.level === 1)) {
    out.error(where, "needs a `#` title");
  }

  const sectionNames = new Set(all.filter((heading) => heading.level >= 2 && heading.text !== "References").map((heading) => heading.text));
  const references = section(doc, "References");

  if (references === null) {
    out.error(where, "needs a `## References` section listing what it rests on");
    checkBodyLinks(out, root, where, doc);

    return;
  }

  const secondLevel = all.filter((heading) => heading.level === 2);

  if (secondLevel.at(-1).text !== "References") {
    out.error(where, "`## References` must be the last `##` section");
  }

  const items = references.filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim());

  if (items.length === 0) {
    out.error(where, "`## References` lists nothing");
  }

  for (const item of items) {
    checkReference(out, root, where, doc, item, origins, sectionNames, cited);
  }

  checkBodyLinks(out, root, where, doc, secondLevel.find((heading) => heading.text === "References").index);
}

function checkEvidence(out, root, path, origins) {
  const where = rel(root, path);
  const doc = read(path);

  requireMeta(out, where, doc, "description");
  requireMeta(out, where, doc, "observed", true);

  const lines = section(doc, "Origins");

  if (lines === null || !lines.some((line) => line.trim() !== "")) {
    out.error(where, "needs a `## Origins` section naming what was observed");
  }

  for (const line of lines ?? []) {
    const match = numbered.exec(line.trim());

    if (match === null) {
      continue;
    }

    const first = splitParts(match[1])[0];
    const key = originKey(first);

    if (key !== null) {
      if (!origins.has(key)) {
        out.error(where, `origin ${key} isn't in origins.md`);
      }
    } else if (!/^<?https?:\/\//.test(first)) {
      out.error(where, `origin '${first}' must be an origin key in backticks or a URL`);
    }
  }

  checkBodyLinks(out, root, where, doc);
}

function checkSource(out, root, path) {
  const where = rel(root, path);
  const doc = read(path);

  requireMeta(out, where, doc, "kind");
  requireMeta(out, where, doc, "occurred", true);
  requireMeta(out, where, doc, "description");

  const parts = rel(join(root, "sources"), path).split("/");
  const kind = doc.meta.get("kind") ?? "";
  const folder = sourceFolders[kind];

  if (folder !== undefined && parts[0] !== folder) {
    out.error(where, `a source of kind ${kind} belongs in sources/${folder}/`);
  }

  if (parts[0] === "meetings") {
    if (parts.length !== 3) {
      out.error(where, "a meeting is a folder sources/meetings/<yyyy-mm-dd>-<subject>/ holding its transcripts and summary");
    }
  } else if (parts.length !== 2) {
    out.error(where, "a thread or page is one file directly in its kind's folder; only meetings get a folder of their own");
  }

  if (threads.has(kind) && !doc.lines.some((line) => message.test(line))) {
    out.error(where, "a thread's messages go under `## <date> [time] · <sender> (<team or role>)` headings, oldest first");
  }
}

function git(root, ...args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });

  return result.error === undefined && result.status === 0 ? result.stdout : null;
}

// In git, sources may only grow at their end and evidence never changes.
function checkUnchanged(out, root) {
  if (git(root, "rev-parse", "--verify", "-q", "HEAD") === null) {
    return;
  }

  const diff = git(root, "diff", "HEAD", "--name-status", "--no-renames", "--relative", "--", "sources", "evidence");

  for (const line of (diff ?? "").split("\n").filter((entry) => entry !== "")) {
    const [status, name] = line.split("\t");

    if (status === "A") {
      continue;
    }

    if (status === "D") {
      out.error(name, "deleted; sources and evidence are kept as they were");
    } else if (name.startsWith("evidence/")) {
      out.error(name, "edited; evidence is never edited, so save a later look as new evidence");
    } else {
      const before = git(root, "show", `HEAD:./${name}`);
      const after = readFileSync(join(root, name), "utf8");

      if (before !== null && !after.startsWith(before.replace(/\n+$/, ""))) {
        out.error(name, "edited; a source may only grow at its end");
      }
    }
  }
}

function check(root) {
  const out = report();
  const agents = join(root, "AGENTS.md");

  if (!existsSync(agents)) {
    out.error("AGENTS.md", "missing; `init` creates it");
  } else {
    const doc = read(agents);
    const version = doc.meta.get("knowledge-base-format");

    if (version !== format) {
      out.error("AGENTS.md", `front matter must say \`knowledge-base-format: ${format}\`, not '${version ?? ""}'`);
    }

    if (doc.lines.join("\n").includes("{{")) {
      out.warn("AGENTS.md", "still has `{{…}}` placeholders to fill in");
    }
  }

  const origins = loadOrigins(root, out);
  const cited = new Set();

  for (const path of markdownFiles(join(root, "articles"))) {
    checkArticle(out, root, path, origins, cited);
  }

  for (const path of markdownFiles(join(root, "evidence"))) {
    checkEvidence(out, root, path, origins);
  }

  for (const path of markdownFiles(join(root, "sources"))) {
    checkSource(out, root, path);
  }

  for (const path of markdownFiles(join(root, "evidence"))) {
    if (!cited.has(path)) {
      out.warn(rel(root, path), "no article cites it yet");
    }
  }

  checkUnchanged(out, root);

  return out;
}

function init(root, name) {
  if (existsSync(join(root, "AGENTS.md"))) {
    console.error(`${join(root, "AGENTS.md")} already exists; nothing changed`);

    return 1;
  }

  for (const folder of ["articles", "sources", "evidence"]) {
    mkdirSync(join(root, folder), { recursive: true });
  }

  const template = readFileSync(join(skillDir, "assets", "AGENTS.md"), "utf8");

  writeFileSync(join(root, "AGENTS.md"), name === undefined ? template : template.replaceAll("{{name}}", name));

  if (!existsSync(join(root, "origins.md"))) {
    writeFileSync(join(root, "origins.md"), "# Origins\n\nThe systems this knowledge base's claims come from, and how to reach each.\n");
  }

  console.log(`started a knowledge base at ${root}; fill in the placeholders in AGENTS.md`);

  return 0;
}

function stale(root, article, olderThan) {
  const origins = loadOrigins(root, report());
  const paths = article === undefined ? markdownFiles(join(root, "articles")) : [join(root, article)];
  const today = new Date(new Date().toISOString().slice(0, 10));
  const rows = [];

  for (const path of paths) {
    if (!existsSync(path)) {
      console.error(`${path} doesn't exist`);

      return 1;
    }

    for (const line of section(read(path), "References") ?? []) {
      if (!line.startsWith("- ")) {
        continue;
      }

      const parts = splitParts(line.slice(2).trim());
      const key = originKey(parts[0]);
      const observed = parts.find((part) => part.startsWith("observed "))?.slice("observed ".length) ?? "";

      if (key === null || !date.test(observed)) {
        continue;
      }

      const age = (today.getTime() - new Date(observed).getTime()) / 86_400_000;

      if (olderThan === undefined || age >= olderThan) {
        rows.push({ observed, where: rel(root, path), key, locator: parts[1] ?? "" });
      }
    }
  }

  rows.sort((left, right) => left.observed.localeCompare(right.observed) || left.where.localeCompare(right.where));

  for (const row of rows) {
    console.log(`${row.observed}  ${row.where}  ${row.key} · ${row.locator}`);

    for (const line of origins.get(row.key) ?? []) {
      console.log(`    ${line}`);
    }
  }

  if (rows.length === 0) {
    console.log("no origin references to re-check");
  }

  return 0;
}

function main() {
  const usage = "usage: kb.mjs init <folder> [--name NAME] | check <folder> | stale <folder> [--article PATH] [--older-than DAYS]";

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { name: { type: "string" }, article: { type: "string" }, "older-than": { type: "string" }, help: { type: "boolean", short: "h" } }
  });

  const [command, folder] = positionals;

  if (values.help === true || folder === undefined || !["init", "check", "stale"].includes(command)) {
    console.error(usage);

    return values.help === true ? 0 : 2;
  }

  const root = resolve(folder.startsWith("~") ? join(homedir(), folder.slice(1)) : folder);

  if (command === "init") {
    return init(root, values.name);
  }

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`${root} isn't a folder`);

    return 1;
  }

  if (command === "stale") {
    const days = values["older-than"];

    return stale(root, values.article, days === undefined ? undefined : Number(days));
  }

  const out = check(root);

  for (const line of out.errors) {
    console.log(`error: ${line}`);
  }

  for (const line of out.warnings) {
    console.log(`warning: ${line}`);
  }

  console.log(`${out.errors.length} error(s), ${out.warnings.length} warning(s)`);

  return out.errors.length > 0 ? 1 : 0;
}

process.exitCode = main();
