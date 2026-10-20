// Draft changes: rewrites of a design's existing text, kept in <design>/.review/changes.json until they're applied.
// They are for editing passes (shorter, clearer, less repeated); the meaning stays. `review` shows them in a local copy
// of the doc; `apply-changes` writes chosen ones into the design. Nothing here is read by check or build.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REVIEW_FOLDER = ".review";

const RECORD_FILES = ["design.json", "evidence.json"];

const ID_PATTERN = /\b[EQDRP]\d+\b/g;

export class ChangesError extends Error {}

export function reviewFolder(folder) {
  const path = join(folder, REVIEW_FOLDER);

  mkdirSync(path, { recursive: true });

  // The folder ignores itself, so draft changes and review copies never reach the repository.
  if (!existsSync(join(path, ".gitignore"))) writeFileSync(join(path, ".gitignore"), "*\n");

  return path;
}

// A change as drafted: an id, a target naming a field or a page, the text as it is, and the rewrite.
function parseChange(raw, path) {
  const { id, target, was, proposed, where, why } = raw ?? {};

  if (!id || !target?.file || was === undefined || proposed === undefined) {
    throw new ChangesError(`${path}: each change needs id, target (with file), was and proposed`);
  }

  return { id: String(id), target, was, proposed, where, why };
}

export function readChanges(folder) {
  const path = join(folder, REVIEW_FOLDER, "changes.json");

  if (!existsSync(path)) throw new ChangesError(`${path}: no draft changes; write them there first`);

  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const changes = (Array.isArray(parsed.changes) ? parsed.changes : []).map((raw) => parseChange(raw, path));

  return { path, changes };
}

// The JSON value a record target points at: { file, record, option?, field } or a top-level { file, field }.
function recordSlot(folder, target) {
  const file = target.file ?? "design.json";

  if (!RECORD_FILES.includes(file)) throw new ChangesError(`target file '${file}' isn't a records file`);

  const path = join(folder, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  let holder = data;

  if (target.record !== undefined) {
    holder = Object.values(data)
      .filter(Array.isArray)
      .flat()
      .find((item) => item?.id === target.record);

    if (holder === undefined) throw new ChangesError(`no record '${target.record}' in ${file}`);

    if (target.option !== undefined) {
      holder = (holder.options ?? []).find((option) => option.id === target.option);

      if (holder === undefined) throw new ChangesError(`no option '${target.option}' on '${target.record}'`);
    }
  }

  if (!(target.field in holder)) throw new ChangesError(`'${target.record ?? file}' has no field '${target.field}'`);

  return { path, data, holder };
}

const pagePath = (folder, target) => {
  if (!/^pages\/[\w.-]+\.md$/.test(target.file ?? "")) throw new ChangesError(`page target '${target.file}' should be pages/<name>.md`);

  return join(folder, target.file);
};

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const occurrences = (text, part) => (part === "" ? 0 : text.split(part).length - 1);

// Whether a change still applies: its `was` is what the design says now.
export function changeState(folder, change) {
  try {
    if (change.target.field !== undefined) {
      const { holder } = recordSlot(folder, change.target);

      return same(holder[change.target.field], change.was) ? "ready" : "stale";
    }

    const text = readFileSync(pagePath(folder, change.target), "utf8");

    return occurrences(text, String(change.was)) === 1 ? "ready" : "stale";
  } catch (error) {
    if (error instanceof ChangesError) return "stale";

    throw error;
  }
}

// A rewrite may cut references but can't add any, so it can't bring in a claim the text didn't make.
export function addedIds(change) {
  const before = new Set(JSON.stringify(change.was).match(ID_PATTERN) ?? []);

  return [...new Set(JSON.stringify(change.proposed).match(ID_PATTERN) ?? [])].filter((id) => !before.has(id));
}

// Text a reader sees, from Markdown or a field value: link labels kept, emphasis marks dropped.
export function plainText(value) {
  const text = Array.isArray(value) ? value.join(" ") : String(value);

  return text
    .replace(/\[([^\]]+)\]\((?:#[\w.-]+)\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Explanation parts ("Means here: …") as label and text, for showing a field written in parts.
const partsOf = (value) =>
  Array.isArray(value)
    ? value.map((item) => {
        const at = String(item).indexOf(":");

        return at > 0 && at < 40 ? [item.slice(0, at), plainText(item.slice(at + 1))] : ["", plainText(item)];
      })
    : null;

const startOf = (value) => plainText(Array.isArray(value) ? String(value[0]).replace(/^[^:]{1,40}:\s*/, "") : value);

export function reviewData(folder, changes) {
  return changes.map((change) => ({
    id: change.id,
    where: change.where ?? change.target.field ?? change.target.file,
    why: change.why ?? "",
    state: changeState(folder, change),
    added: addedIds(change),
    was: plainText(change.was),
    // What the passage starts with on the page, now and once changed: a field in parts shows its first part's text
    // under its label.
    match: startOf(change.was),
    changedMatch: startOf(change.proposed),
    proposed: plainText(change.proposed),
    proposedParts: partsOf(change.proposed),
    recordId: change.target.record ?? null,
  }));
}

// Writes one change into a design folder: the design itself, or the review's changed copy.
export function writeChange(folder, change) {
  if (change.target.field !== undefined) {
    const slot = recordSlot(folder, change.target);

    slot.holder[change.target.field] = change.proposed;
    writeFileSync(slot.path, `${JSON.stringify(slot.data, null, 2)}\n`);

    return;
  }

  const file = pagePath(folder, change.target);

  writeFileSync(file, readFileSync(file, "utf8").replace(String(change.was), () => String(change.proposed)));
}

export function applyChanges(folder, ids) {
  const { path, changes } = readChanges(folder);
  const chosen = ids.includes("all") ? changes : changes.filter((change) => ids.includes(change.id));
  const missing = ids.filter((id) => id !== "all" && !changes.some((change) => change.id === id));

  if (missing.length > 0) throw new ChangesError(`no draft change ${missing.join(", ")}`);

  const applied = [];
  const skipped = [];

  for (const change of chosen) {
    const added = addedIds(change);

    if (added.length > 0) {
      skipped.push(`${change.id}: cites ${added.join(", ")}, which the current text doesn't; an editing pass can't add references`);
      continue;
    }

    if (changeState(folder, change) === "stale") {
      skipped.push(`${change.id}: the text it rewrites has changed since; redraft it`);
      continue;
    }

    writeChange(folder, change);
    applied.push(change);
  }

  const remaining = changes.filter((change) => !applied.includes(change));

  writeFileSync(path, `${JSON.stringify({ changes: remaining }, null, 2)}\n`);

  return { applied, skipped };
}
