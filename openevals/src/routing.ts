/**
 * The `orchestration-routing` skill's model table, read from its Markdown. Benchmarks keep routing variants
 * as copies of the live skill that differ only in model cells; judges read the table the lead actually loaded.
 */
export type RoutingRow = { role: string; taskType: string; model: string };

/** A table row: `| role | task type | `provider/model#variant` |`. */
const tableRow = /^\| *([\w-]+) *\| *([\w-]+) *\| *`([^`]+)` *\|$/u;

export function routingTable(text: string): RoutingRow[] {
  const rows: RoutingRow[] = [];

  for (const line of text.split("\n")) {
    const match = tableRow.exec(line.trim());

    if (match?.[1] !== undefined && match[2] !== undefined && match[3] !== undefined) rows.push({ role: match[1], taskType: match[2], model: match[3] });
  }

  return rows;
}

/**
 * Models a dispatch may use: a named task type's row, else the role's default. A description that names only
 * the role, as orchestrate asks, may also use any of the role's task-type rows when the role has no default.
 */
export function routedModels(rows: readonly RoutingRow[], role: string, taskType?: string): string[] {
  const roleRows = rows.filter((row) => row.role === role);

  const specific = roleRows.find((row) => row.taskType === taskType);

  const fallback = roleRows.find((row) => row.taskType === "default");

  if (specific !== undefined) return [specific.model];

  if (fallback !== undefined) return [fallback.model];

  return taskType === undefined ? [...new Set(roleRows.map((row) => row.model))] : [];
}

/** Ways a variant differs from the live skill other than its model cells; empty when it is a faithful copy. */
export function routingDrift(live: string, variant: string): string[] {
  const prose = (text: string) => text.split("\n").filter((line) => !tableRow.test(line.trim()));

  const keys = (text: string) => routingTable(text).map((row) => `${row.role}/${row.taskType}`);

  const drift: string[] = [];

  if (prose(live).join("\n") !== prose(variant).join("\n")) drift.push("text outside the model table differs");

  if (keys(live).join(",") !== keys(variant).join(",")) drift.push("the table's roles or task types differ");

  return drift;
}
