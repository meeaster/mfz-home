import { appendFile, mkdir, stat, truncate } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const enabled = process.env.OPENCODE_ADVISOR_DEBUG === "1";
const directory = join(homedir(), ".opencode", "logs");
const file = join(directory, "advisor-tui.log");
const maxBytes = 256 * 1024;
let pending = Promise.resolve();

export function advisorDebugEnabled(): boolean {
  return enabled;
}

export function advisorDebug(event: string, fields: Record<string, unknown> = {}): void {
  if (!enabled) return;
  const line = `${JSON.stringify({ at: new Date().toISOString(), event, ...fields })}\n`;
  pending = pending
    .then(async () => {
      await mkdir(directory, { recursive: true });
      try {
        if ((await stat(file)).size >= maxBytes) await truncate(file, 0);
      } catch {
        // The log is created by appendFile below.
      }
      await appendFile(file, line);
    })
    .catch(() => {
      // Diagnostics must never disrupt the TUI.
    });
}
