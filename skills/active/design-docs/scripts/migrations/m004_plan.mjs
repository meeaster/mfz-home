// Format 4: the phases become the plan, deliverables P1, P2… with what each follows.
//
// Each phase becomes a deliverable in the same order, with the same title, Scope, Exit criteria and Status; each
// follows the one before it, since phases ran one after another. A phase's Effort goes: the doc is published and names
// no effort, so record in each effort which deliverables it works on. A page's "## Phases" section becomes "## Plan".
// Nothing is guessed: groups, the goals each deliverable serves, Jira items and links stay for the next session to add.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const summary = "Format 4: the phases become the plan, deliverables P1, P2… with what each follows.";

export function migrate(folder) {
  const path = join(folder, "design.json");

  if (!existsSync(path)) {
    return ["no design.json; nothing to convert"];
  }

  let data = JSON.parse(readFileSync(path, "utf8"));
  const notes = [];
  const phases = data.phases ?? [];

  delete data.phases;

  const plan = phases.map((phase, index) => {
    const number = index + 1;
    const deliverable = { id: `P${number}`, title: phase.title ?? "" };

    for (const [key, value] of Object.entries(phase)) {
      if (key !== "title" && key !== "Effort") {
        deliverable[key] = value;
      }
    }

    if (number > 1) {
      deliverable.Follows = `P${number - 1}`;
    }

    if (phase.Effort) {
      notes.push(`P${number} (${deliverable.title}) named effort '${phase.Effort}'; record in that effort that it works on P${number}`);
    }

    return deliverable;
  });

  if (plan.length > 0) {
    // The plan sits where the phases did, so the file keeps its order.
    const ordered = {};

    for (const [key, value] of Object.entries(data)) {
      ordered[key] = value;

      if (key === "parts") {
        ordered.plan = plan;
      }
    }

    if (!("plan" in ordered)) {
      ordered.plan = plan;
    }

    data = ordered;
    notes.push(`turned ${plan.length} phase(s) into deliverables P1 to P${plan.length}, each following the one before`);
  }

  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

  const pages = join(folder, "pages");

  if (existsSync(pages) && statSync(pages).isDirectory()) {
    for (const name of readdirSync(pages)
      .filter((file) => file.endsWith(".md"))
      .sort()) {
      const page = join(pages, name);
      const text = readFileSync(page, "utf8");
      const changed = text.replace(/^## Phases\s*$/gm, "## Plan");

      if (changed !== text) {
        writeFileSync(page, changed);
        notes.push(`${name}: '## Phases' is now '## Plan'`);
      }
    }
  }

  return notes;
}
