// design.json, evidence.json and meetings.json: the records as JSON.
//
// Each record is an object. Its identity is "id" and "title" (a meeting has "date" and "title"; a part, risk, link or cost
// line has only "title"). Every other key is a field with the same name as in the Markdown form ("Status", "Recorded
// from"): a string, a list of strings when the field is a list, or {"value": ..., "items": [...]} when it has both. A
// decision's options are in "options"; notes for whoever works on the design next are in "notes".
//
// The build turns these files into the Markdown form in memory and reads that, so every check and renderer is shared.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { jsonKind, plain, spacedJson, splitLines } from "./text.mjs";

const SECTION_KEYS = [
  ["terms", "Terms"],
  ["facts", "Facts"],
  ["requirements", "Requirements"],
  ["parts", "Parts"],
  ["plan", "Plan"],
  ["decisions", "Decisions"],
  ["risks", "Risks"],
  ["costs", "Costs"],
  ["flows", "Flows"],
  ["questions", "Questions"],
  ["links", "Links"],
  ["jira", "Jira"],
  ["evidence", "Evidence"],
  ["meetings", "Meetings"]
];

const PROSE_KEYS = [
  ["problem", "Problem"],
  ["direction", "Working direction"],
  ["goals", "Goals"],
  ["howItWorks", "How it works"]
];

const JSON_FILES = ["design.json", "evidence.json", "meetings.json"];

const IDENTITY = new Set(["id", "title", "date", "options", "notes"]);

const isObject = (value) => jsonKind(value) === "object";

function fieldLines(name, value, label) {
  const where = `${label} › ${name}`;

  if (Array.isArray(value) && value.length > 0 && value.every(isObject)) {
    return [[`- ${name}:`, where], ...value.map((item) => [`  - ${spacedJson(item)}`, `${where} › ${plain(item.n ?? "")}`])];
  }

  if (Array.isArray(value)) {
    return [[`- ${name}:`, where], ...value.map((item) => [`  - ${plain(item)}`, where])];
  }

  if (isObject(value)) {
    return [[`- ${name}: ${plain(value.value ?? "")}`.trimEnd(), where], ...(value.items ?? []).map((item) => [`  - ${plain(item)}`, where])];
  }

  return [[`- ${name}: ${plain(value)}`.trimEnd(), where]];
}

function recordLines(kind, record, label) {
  let head;

  if (kind === "meetings") {
    head = `${plain(record.date ?? "")} · ${plain(record.title ?? "")}`;
  } else if ("id" in record) {
    head = `${plain(record.id)} · ${plain(record.title ?? "")}`;
  } else {
    head = plain(record.title ?? "");
  }

  const me = `${label} › ${record.id || record.date || String(record.title ?? "").slice(0, 40)}`;
  const out = [[`### ${head}`, me]];

  for (const [name, value] of Object.entries(record)) {
    if (!IDENTITY.has(name)) {
      out.push(...fieldLines(name, value, me));
    }
  }

  for (const note of record.notes ?? []) {
    out.push([note, `${me} › notes`]);
  }

  for (const option of record.options ?? []) {
    const where = `${me} › option ${plain(option.id ?? "")}`;

    out.push([`#### ${plain(option.id ?? "")} · ${plain(option.title ?? "")}`, where]);

    for (const [name, value] of Object.entries(option)) {
      if (!IDENTITY.has(name)) {
        out.push(...fieldLines(name, value, where));
      }
    }

    for (const note of option.notes ?? []) {
      out.push([note, `${where} › notes`]);
    }
  }

  out.push(["", me]);

  return out;
}

export class JsonError extends Error {}

// Where a JSON.parse error happened, as line and column, from the position it reports.
function position(text, error) {
  const at = /position (\d+)/.exec(error.message);

  if (at === null) {
    return "1:1";
  }

  const before = text.slice(0, Number(at[1]));

  return `${before.split("\n").length}:${before.length - before.lastIndexOf("\n")}`;
}

// The Markdown form of a folder's JSON records, with a "where" label for each line; null without design.json.
export function toMarkdown(folder) {
  if (!existsSync(join(folder, "design.json"))) {
    return null;
  }

  const data = {};

  for (const name of JSON_FILES) {
    const path = join(folder, name);

    if (!existsSync(path)) {
      continue;
    }

    const text = readFileSync(path, "utf8");
    let loaded;

    try {
      loaded = JSON.parse(text);
    } catch (error) {
      throw new JsonError(`${name}:${position(text, error)}: not valid JSON: ${error.message.replace(/ \(line \d+ column \d+\)$/, "")}`);
    }

    for (const [key, value] of Object.entries(loaded)) {
      if (!(key in data)) {
        data[key] = value;
      }
    }
  }

  const lines = [
    [`<!-- design-docs format ${plain(data.format ?? 2)} -->`, "design.json › format"],
    [`# ${plain(data.title ?? "")}`, "design.json › title"],
    ["", "design.json"],
    [plain(data.summary ?? ""), "design.json › summary"],
    ["", "design.json"]
  ];

  for (const [key, section] of PROSE_KEYS) {
    if (key in data) {
      lines.push([`## ${section}`, `design.json › ${key}`], ["", `design.json › ${key}`]);
      lines.push(...splitLines(plain(data[key])).map((line) => [line, `design.json › ${key}`]), ["", `design.json › ${key}`]);
    }
  }

  for (const [key, section] of SECTION_KEYS) {
    if (!(key in data)) {
      continue;
    }

    const file = key === "evidence" ? "evidence.json" : key === "meetings" ? "meetings.json" : "design.json";
    const label = `${file} › ${key}`;
    const value = data[key];

    lines.push([`## ${section}`, label], ["", label]);

    if (key === "terms") {
      for (const term of value) {
        const pages = term.pages?.length ? ` [${term.pages.join(", ")}]` : "";

        lines.push([`- **${plain(term.term ?? "")}**${pages}: ${plain(term.definition ?? "")}`, `${label} › ${plain(term.term ?? "")}`]);
      }

      lines.push(["", label]);
    } else if (key === "facts") {
      for (const [name, fact] of Object.entries(value)) {
        const source = isObject(fact) && fact.source ? ` · Source: ${plain(fact.source)}` : "";
        const shown = isObject(fact) ? (fact.value ?? "") : fact;

        lines.push([`- ${name}: ${plain(shown)}${source}`, `${label} › ${name}`]);
      }

      lines.push(["", label]);
    } else if (key === "costs") {
      for (const basis of ["Assumes", "Leaves out"]) {
        if (basis in value) {
          lines.push(...fieldLines(basis, value[basis], label));
        }
      }

      lines.push(["", label]);

      for (const record of value.lines ?? []) {
        lines.push(...recordLines(key, record, label));
      }
    } else {
      for (const record of value) {
        lines.push(...recordLines(key, record, label));
      }
    }
  }

  return { lines: lines.map(([line]) => line), labels: lines.map(([, where]) => where) };
}

// The JSON form of a design read from Markdown: {file name: content}.
export function fromDesign(design) {
  const fieldValue = (field) => {
    if (field.items.length > 0 && field.items.every((item) => item.startsWith("{"))) {
      try {
        return field.items.map((item) => JSON.parse(item));
      } catch {
        // Not all JSON after all; keep the items as text.
      }
    }

    if (field.items.length > 0 && field.value) {
      return { value: field.value, items: field.items };
    }

    return field.items.length > 0 ? field.items : field.value;
  };

  const record = (r, kind) => {
    const out = {};

    if (kind === "meeting") {
      out.date = r.id.startsWith("meeting-") ? r.id.slice("meeting-".length) : r.id;
      out.title = r.title;
    } else if (["requirement", "decision", "question", "evidence", "flow", "deliverable", "jira"].includes(kind)) {
      out.id = r.id;
      out.title = r.title;
    } else {
      out.title = r.title;
    }

    for (const [name, field] of r.fields) {
      out[name] = fieldValue(field);
    }

    if (r.body.length > 0) {
      out.notes = r.body;
    }

    if (r.options.length > 0) {
      out.options = r.options.map((option) => {
        const entry = { id: option.id, title: option.title };

        for (const [name, field] of option.fields) {
          entry[name] = fieldValue(field);
        }

        if (option.body.length > 0) {
          entry.notes = option.body;
        }

        return entry;
      });
    }

    return out;
  };

  const designJson = { format: 2, title: design.title, summary: design.dek };

  for (const [key, prose] of [
    ["problem", "problem"],
    ["direction", "direction"],
    ["goals", "goals"],
    ["howItWorks", "how-it-works"]
  ]) {
    if (design.prose.has(prose)) {
      designJson[key] = design.prose.get(prose).join("\n").trim();
    }
  }

  if (design.terms.length > 0) {
    designJson.terms = design.terms.map((term) => ({ term: term.name, pages: term.pages, definition: term.text }));
  }

  if (design.facts.size > 0) {
    designJson.facts = Object.fromEntries(
      [...design.facts].map(([key, [value]]) => [key, design.factSources.get(key) ? { value, source: design.factSources.get(key) } : { value }])
    );
  }

  const keys = { requirement: "requirements", part: "parts", deliverable: "plan", decision: "decisions", risk: "risks", cost: "costs", flow: "flows", question: "questions", link: "links", jira: "jira" };

  for (const kind of ["requirement", "part", "deliverable", "decision", "risk", "cost", "flow", "question", "link", "jira"]) {
    const records = design.of(kind).map((r) => record(r, kind));

    if (kind === "cost") {
      if (records.length > 0 || design.costBasis.size > 0) {
        const costs = {};

        for (const [name, field] of design.costBasis) {
          costs[name] = fieldValue(field);
        }

        costs.lines = records;
        designJson.costs = costs;
      }
    } else if (records.length > 0) {
      designJson[keys[kind]] = records;
    }
  }

  return {
    "design.json": designJson,
    "evidence.json": { evidence: design.of("evidence").map((r) => record(r, "evidence")) },
    "meetings.json": { meetings: design.of("meeting").map((r) => record(r, "meeting")) }
  };
}
