// Format 3: records kept as JSON, in design.json, evidence.json and meetings.json.
//
// The records in design.md (and evidence.md and meetings.md, when a design had split them out) move to their JSON form
// unchanged: same IDs, fields, options and notes. The Markdown files go; the backup keeps them. changes.md, doc.html,
// the pages and components stay as they are.
//
// Format 3 also adds what a meeting settled (Outcomes), proposals for the user to go through before anything changes,
// and named figures (Facts). Older meetings have no Outcomes; check notes them, and nothing is invented for them.

import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fromDesign } from "../jsonfmt.mjs";
import { readDesign } from "../records.mjs";

export const summary = "Format 3: records kept as JSON, in design.json, evidence.json and meetings.json.";

export function migrate(folder) {
  const designMd = join(folder, "design.md");

  if (!existsSync(designMd)) {
    return ["no design.md; nothing to convert"];
  }

  const design = readDesign(designMd);
  const notes = [];

  for (const [name, content] of Object.entries(fromDesign(design))) {
    const records = Object.values(content)[0];

    if (name !== "design.json" && records.length === 0) {
      continue;
    }

    writeFileSync(join(folder, name), `${JSON.stringify(content, null, 2)}\n`);
    notes.push(`wrote ${name}${name !== "design.json" ? ` (${records.length} record(s))` : ""}`);
  }

  for (const name of ["design.md", "evidence.md", "meetings.md"]) {
    if (existsSync(join(folder, name))) {
      rmSync(join(folder, name));
      notes.push(`removed ${name} (kept in the backup)`);
    }
  }

  const meetings = design.records.filter((record) => record.kind === "meeting" && record.field("Outcomes") === null);

  if (meetings.length > 0) {
    notes.push(`${meetings.length} meeting(s) have no Outcomes; add them when you next take one of those meetings through, never from memory`);
  }

  return notes;
}
