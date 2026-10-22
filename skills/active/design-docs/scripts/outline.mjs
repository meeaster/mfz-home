// A design read and edited a record at a time, for a model whose context can't hold the whole folder. outline prints the
// prose in full and one line per record; show prints named records in full; refs finds every place an ID or phrase
// appears; set applies a list of field changes by record name. Records without an ID (risks, parts, terms, meetings)
// are named by kind and position, the way the doc names risks: risk-3, part-1, meeting-4. A decision's option is
// D6/A. The evidence is listed by its range only.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class OutlineError extends Error {}

const LABEL = { risks: "risk", parts: "part", terms: "term", meetings: "meeting", links: "link", jira: "jira" };

const TITLE_KEYS = ["title", "term", "name"];

// Past this, a harness may save the output to a file for the model to read back in pieces, which costs more than
// a second call.
const SHOW_LIMIT = 24000;

const FILES = { design: "design.json", evidence: "evidence.json", meetings: "meetings.json" };

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

const titleOf = (record) => TITLE_KEYS.map((key) => record[key]).find((value) => value !== undefined) ?? "";

const labelOf = (kind, record, index) => record.id ?? `${LABEL[kind] ?? kind}-${index + 1}`;

function stateOf(kind, record) {
  if (kind === "questions") return record.Status ?? (record.Answer ? "Answered" : "Open");

  if (kind === "requirements") return record.Priority;

  if (kind === "meetings") return [record.date, record.Status].filter(Boolean).join(" · ");

  return record.Status;
}

// The three record files, as read, with the lists in each.
function readFolder(folder) {
  const design = readJson(join(folder, FILES.design));

  if (design === null) throw new OutlineError(`${folder}: no design.json here`);

  const evidence = readJson(join(folder, FILES.evidence)) ?? { evidence: [] };
  const meetings = readJson(join(folder, FILES.meetings)) ?? { meetings: [] };
  const lists = Object.entries(design).filter(([, value]) => Array.isArray(value) && value.every((item) => item instanceof Object));

  return {
    files: { design, evidence, meetings },
    lists: [...lists.map(([kind, records]) => ({ kind, records, file: "design" })), { kind: "evidence", records: evidence.evidence, file: "evidence" }, { kind: "meetings", records: meetings.meetings, file: "meetings" }]
  };
}

// Every addressable thing by its name: each record, each decision's options, and each non-list section of design.json.
function namedTargets(read) {
  const targets = new Map();

  for (const [key, value] of Object.entries(read.files.design)) {
    if (!Array.isArray(value) && key !== "format") targets.set(key, { file: "design", holder: read.files.design, key });
  }

  for (const { kind, records, file } of read.lists) {
    for (const [index, record] of records.entries()) {
      const label = labelOf(kind, record, index);

      targets.set(label, { file, holder: records, key: index, kind });

      for (const [at, option] of (record.options ?? []).entries()) {
        targets.set(`${label}/${option.id ?? at + 1}`, { file, holder: record.options, key: at });
      }
    }
  }

  return targets;
}

const prose = (value) => (Array.isArray(value) ? value.join("\n") : String(value));

export function outline(folder) {
  const read = readFolder(folder);
  const { design } = read.files;
  const lines = [`# ${design.title ?? folder}`];

  // The prose sections in full: they carry the connected understanding the records hang from. A table such as the
  // costs is named only; show prints it.
  for (const [key, value] of Object.entries(design)) {
    if (key === "title" || key === "format" || Array.isArray(value)) continue;

    lines.push("", `## ${key}`, value instanceof Object ? `(a table: show ${key})` : prose(value));
  }

  for (const { kind, records } of read.lists) {
    if (records.length === 0) continue;

    // The evidence outnumbers everything else and is cited, not read through: its IDs are enough to show what's cited.
    if (kind === "evidence") {
      lines.push("", `## evidence (${records.length}): ${records[0].id}–${records.at(-1).id}; show prints any of them`);

      continue;
    }

    lines.push("", `## ${kind} (${records.length})`);

    for (const [index, record] of records.entries()) {
      const state = stateOf(kind, record);
      const recommended = record.Recommendation ? " · AI recommends" : "";

      lines.push(`${labelOf(kind, record, index)}${state ? ` [${state}]` : ""} ${titleOf(record)}${recommended}`);
    }
  }

  return lines.join("\n");
}

export function show(folder, names) {
  const targets = namedTargets(readFolder(folder));
  const missing = names.filter((name) => !targets.has(name));

  if (missing.length > 0) throw new OutlineError(`no record named ${missing.join(", ")}; the outline lists every record's name`);

  const blocks = [];
  let size = 0;

  for (const [index, name] of names.entries()) {
    const target = targets.get(name);
    const block = `## ${name}\n${JSON.stringify(target.holder[target.key], null, 2)}`;

    if (blocks.length > 0 && size + block.length > SHOW_LIMIT) {
      blocks.push(`(stopped here to keep the output readable in one piece; show the rest in another call: ${names.slice(index).join(" ")})`);

      break;
    }

    blocks.push(block);
    size += block.length;
  }

  return blocks.join("\n\n");
}

// Where a string sits inside a record: "Recommendation › items 2", "options/A › Summary".
function* strings(value, path) {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* strings(item, value.length === 1 ? path : `${path} › ${index + 1}`);
  } else if (value instanceof Object) {
    for (const [key, item] of Object.entries(value)) {
      if (key !== "id") yield* strings(item, path === "" ? key : `${path} › ${key}`);
    }
  } else if (value !== undefined && value !== null) {
    yield [path, String(value)];
  }
}

const ID_LIKE = /^([A-Z]{1,2}-)?[A-Z]{1,2}\d+$/;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// An ID matches as a whole word (D6, not D60); anything else is a phrase, matched regardless of case.
const patternFor = (term) => (ID_LIKE.test(term) ? new RegExp(`(?<![\\w-])${escapeRegExp(term)}(?![\\w])`, "g") : new RegExp(escapeRegExp(term), "gi"));

const snippet = (text, index) => {
  const flat = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const at = Math.max(0, Math.min(index, flat.length) - 70);

  return `${at > 0 ? "…" : ""}${flat.slice(at, at + 160).trim()}${at + 160 < flat.length ? "…" : ""}`;
};

export function refs(folder, terms) {
  const read = readFolder(folder);
  const targets = namedTargets(read);
  const sections = [];

  for (const term of terms) {
    const pattern = patternFor(term);
    const hits = [];

    for (const [name, target] of targets) {
      // Options are searched with their decision; the decision's own ID field isn't a mention.
      if (name.includes("/")) continue;

      for (const [path, text] of strings(target.holder[target.key], "")) {
        for (const match of text.matchAll(pattern)) hits.push(`${name}${path ? ` › ${path}` : ""}: ${snippet(text, match.index)}`);
      }
    }

    for (const dir of ["pages", "components"]) {
      if (!existsSync(join(folder, dir))) continue;

      for (const file of readdirSync(join(folder, dir)).sort()) {
        for (const [index, line] of readFileSync(join(folder, dir, file), "utf8").split("\n").entries()) {
          const flat = line.replace(/<[^>]+>/g, " ");

          for (const match of flat.matchAll(pattern)) hits.push(`${dir}/${file}:${index + 1}: ${snippet(flat, match.index)}`);
        }
      }
    }

    sections.push(`## ${term} (${hits.length} place${hits.length === 1 ? "" : "s"})\n${hits.join("\n")}`);
  }

  return sections.join("\n\n");
}

// Replaces one exact passage among a record's strings; it must occur exactly once, so a change can't land in the wrong
// place.
function replaceOnce(value, find, replacement) {
  let count = 0;

  const walk = (item) => {
    if (Array.isArray(item)) return item.map(walk);

    if (item instanceof Object) return Object.fromEntries(Object.entries(item).map(([key, inner]) => [key, walk(inner)]));

    if (item?.constructor !== String || !item.includes(find)) return item;

    count += item.split(find).length - 1;

    return item.replace(find, () => replacement);
  };

  const result = walk(value);

  return { result, count };
}

const describe = (change) => JSON.stringify(change).slice(0, 80);

// Applies a list of changes to design.json and evidence.json, all or none:
//   {"target": "D6", "set": {"Status": "Decided", ...}}        set or replace whole fields
//   {"target": "D6/A", "set": {"Status": "Not chosen"}}         an option
//   {"target": "Q31", "replace": [["old passage", "new"]]}      an exact passage, which must occur once in the target
//   {"target": "D6", "remove": ["Recommendation"]}             drop fields
//   {"add": "questions", "record": {...}}                      append a record; "D6/options" adds an option
//   {"delete": "Q23"}                                          drop a record
export function setRecords(folder, changes) {
  if (!Array.isArray(changes)) throw new OutlineError("set takes a JSON list of changes");

  const read = readFolder(folder);
  const targets = namedTargets(read);
  const touched = new Set();
  const report = [];
  const deletions = [];

  for (const change of changes) {
    if (change.add !== undefined) {
      const [owner, list] = change.add.split("/");
      const holder = list === undefined ? (owner === "evidence" ? read.files.evidence.evidence : read.files.design[owner]) : targets.get(owner)?.holder[targets.get(owner).key]?.[list];

      if (!Array.isArray(holder)) throw new OutlineError(`${describe(change)}: nothing to add to at '${change.add}'`);

      if (owner === "meetings") throw new OutlineError("meetings change through the update playbook's proposals, not set");

      holder.push(change.record);
      touched.add(owner === "evidence" ? "evidence" : "design");
      report.push(`added to ${change.add}: ${change.record?.id ?? titleOf(change.record ?? {})}`);

      continue;
    }

    const name = change.target ?? change.delete;
    const target = targets.get(name);

    if (target === undefined) throw new OutlineError(`${describe(change)}: no record named '${name}'`);

    if (target.file === "meetings") throw new OutlineError("meetings change through the update playbook's proposals, not set");

    touched.add(target.file);

    if (change.delete !== undefined) {
      deletions.push(target);
      report.push(`deleted ${name}`);

      continue;
    }

    let record = target.holder[target.key];

    for (const [field, value] of Object.entries(change.set ?? {})) {
      record[field] = value;
      report.push(`${name} › ${field} set`);
    }

    for (const field of change.remove ?? []) {
      if (!(field in record)) throw new OutlineError(`${name} has no field '${field}' to remove`);

      delete record[field];
      report.push(`${name} › ${field} removed`);
    }

    for (const [find, replacement] of change.replace ?? []) {
      const { result, count } = replaceOnce(record, find, replacement);

      if (count !== 1) throw new OutlineError(`${name}: '${find.slice(0, 60)}' occurs ${count} times; give a passage that occurs once`);

      target.holder[target.key] = result;
      record = result;
      report.push(`${name}: replaced '${find.slice(0, 40)}…'`);
    }
  }

  // Deleting last, from the end of each list, keeps every other position-based name pointing where it did.
  for (const target of deletions.sort((left, right) => right.key - left.key)) {
    if (Array.isArray(target.holder)) target.holder.splice(target.key, 1);
    else delete target.holder[target.key];
  }

  for (const file of touched) writeFileSync(join(folder, FILES[file]), `${JSON.stringify(read.files[file], null, 2)}\n`);

  return report;
}
