import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { findRunClient } from "./run-client.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const boot = 1_790_000_000;

type Process = {
  readonly executable: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  // Seconds after boot.
  readonly started: number;
  readonly env: Readonly<Record<string, string>>;
};

// A /proc with a boot time and the given processes, laid out the way Linux presents them.
function proc(processes: Readonly<Record<string, Process>>): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-proc-test-"));

  roots.push(root);
  writeFileSync(join(root, "stat"), `cpu  1 2 3\nbtime ${boot}\nprocesses 9\n`);

  for (const [pid, process] of Object.entries(processes)) {
    const folder = join(root, pid);
    // The fields after the command name, starting with the state; the start time is the 22nd field overall.
    const fields = Array.from({ length: 50 }, () => "0");

    fields[0] = "S";
    fields[19] = String(Math.round(process.started * 100));
    mkdirSync(folder);
    symlinkSync(process.executable, join(folder, "exe"));
    symlinkSync(process.cwd, join(folder, "cwd"));
    writeFileSync(join(folder, "cmdline"), `${process.argv.join("\0")}\0`);
    writeFileSync(join(folder, "stat"), `${pid} (open code) ${fields.join(" ")}`);
    writeFileSync(join(folder, "environ"), `${Object.entries(process.env).map(([name, value]) => `${name}=${value}`).join("\0")}\0`);
  }

  return root;
}

const directory = "/home/user/repo";

// The session was created 100 seconds after boot.
const session = { id: "ses_new", directory, created: (boot + 100) * 1000 };

const run = (overrides: Partial<Process>): Process => ({
  executable: "/home/user/.opencode/bin/opencode",
  argv: ["opencode", "run", "Review the access design"],
  cwd: directory,
  started: 99.8,
  env: {},
  ...overrides
});

describe("finding the opencode run that created a session", () => {
  test("the run in the session's directory names its spawner, CAIRN_SESSION before an inherited OPENCODE_SESSION_ID", () => {
    const found = findRunClient(
      proc({
        "100": run({ env: { CAIRN_SESSION: "claude-code:lead", OPENCODE_SESSION_ID: "ses_grandparent" } }),
        // timeout wraps the run; its own executable isn't OpenCode.
        "99": run({ executable: "/usr/bin/timeout", argv: ["timeout", "240", "opencode", "run", "x"], started: 99.7, env: { CAIRN_SESSION: "claude-code:other" } }),
        "101": run({ cwd: "/home/user/elsewhere", env: { CAIRN_SESSION: "claude-code:other" } }),
        "102": run({ argv: ["opencode", "serve"], env: { CAIRN_SESSION: "claude-code:other" } })
      }),
      session
    );

    expect(found).toEqual({ spawnedBy: { harness: "claude-code", nativeId: "lead" } });
  });

  test("a run from an OpenCode shell names that session, and one from a plain terminal names none", () => {
    expect(findRunClient(proc({ "100": run({ env: { OPENCODE_SESSION_ID: "ses_lead" } }) }), session)).toEqual({
      spawnedBy: { harness: "opencode", nativeId: "ses_lead" }
    });
    expect(findRunClient(proc({ "100": run({}) }), session)).toEqual({ spawnedBy: undefined });
  });

  test("a run that names the session wins; otherwise the latest run that started before the session", () => {
    const processes = {
      "100": run({ started: 99.5, env: { OPENCODE_SESSION_ID: "ses_earlier" } }),
      "101": run({ started: 99.9, env: { OPENCODE_SESSION_ID: "ses_latest" } }),
      "102": run({ started: 160, env: { OPENCODE_SESSION_ID: "ses_after" } })
    };

    expect(findRunClient(proc(processes), session)?.spawnedBy?.nativeId).toBe("ses_latest");

    const named = run({
      executable: "/home/user/.opencode/bin/opencode (deleted)",
      argv: ["opencode", "run", "--session", "ses_new", "Continue"],
      started: 99.1,
      env: { OPENCODE_SESSION_ID: "ses_named" }
    });

    expect(findRunClient(proc({ ...processes, "103": named }), session)?.spawnedBy?.nativeId).toBe("ses_named");
  });

  test("a session no run created, such as one from the TUI, has no run client", () => {
    const tui = run({ argv: ["opencode"], env: { OPENCODE_SESSION_ID: "ses_x" } });
    const other = run({ argv: ["opencode", "run", "-s", "ses_other", "Continue"] });

    expect(findRunClient(proc({ "100": tui, "101": other }), session)).toBeNull();
    expect(findRunClient(join(tmpdir(), "cairn-no-proc"), session)).toBeNull();
  });
});
