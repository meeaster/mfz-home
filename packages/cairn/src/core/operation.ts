import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { dailyBackup } from "./backup.ts";
import { CairnError, openCairn, type Cairn } from "./db.ts";
import { rootPaths } from "./root.ts";
import { regenerateDirty } from "./views.ts";

// hot: runs on every harness event, so it skips index regeneration.
// write: changes the catalog, so it may take the daily backup.
export type Mode = "hot" | "write" | "read";

// Opens the catalog for one operation, then regenerates dirty indexes and takes the daily backup as the mode allows.
export function withCairn<T>(root: string, now: () => Date, mode: Mode, work: (cairn: Cairn) => T): T {
  const cairn = openCairn(root, now);

  try {
    const result = work(cairn);

    if (mode !== "hot") {
      regenerateDirty(cairn);
    }

    if (mode !== "read") {
      dailyBackup(cairn);
    }

    return result;
  } finally {
    cairn.db.close();
  }
}

export function logFailure(root: string, label: string, error: Error, now: Date): void {
  try {
    const logs = rootPaths(root).logs;

    mkdirSync(logs, { recursive: true });
    appendFileSync(join(logs, "cairn.log"), `${now.toISOString()} ${label}: ${error.stack ?? error.message}\n`);
  } catch {
    // Logging is best effort; the caller still reports the error.
  }
}

// The message to show for a failed operation. Unexpected errors are also logged under the root.
export function failureMessage(root: string, label: string, failure: Error, now: Date): string {
  if (failure instanceof z.ZodError) {
    return failure.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("\n");
  }

  if (!(failure instanceof CairnError)) {
    logFailure(root, label, failure, now);
  }

  return failure.message;
}
