import { existsSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { basename, join } from "node:path";
import type { SessionKey } from "../schemas.ts";
import { spawnerFromEnvironment, type Environment } from "../harness/spawner.ts";

// The opencode run process that created a session, found under /proc. `opencode run` sends its prompt to the
// OpenCode service, where the plugin runs, so the plugin can't see the environment the command started with.
// The process can be read directly, because it runs as the same user on the same machine.
export type RunClient = {
  readonly spawnedBy: SessionKey | undefined;
};

export type RunSession = {
  readonly id: string;
  readonly directory: string;
  // When OpenCode created the session, in milliseconds since the epoch.
  readonly created: number;
};

// A run creates its session just after it starts: a fraction of a second, but model setup can take longer. The
// start time from /proc is only accurate to a second, since the boot time it counts from is in whole seconds.
const startedBefore = 60_000;

const startedAfter = 2_000;

// Linux reports process start times in clock ticks, which are 100 per second on every supported architecture.
const ticksPerSecond = 100;

const sessionFlags = new Set(["--session", "-s"]);

type Candidate = {
  readonly pid: string;
  readonly started: number;
  readonly exact: boolean;
};

function bootTime(proc: string): number | null {
  const stat = join(proc, "stat");

  if (!existsSync(stat)) {
    return null;
  }

  const seconds = /^btime (\d+)$/m.exec(readFileSync(stat, "utf8"))?.[1];

  return seconds === undefined ? null : Number(seconds) * 1000;
}

// The process's start time: field 22 of its stat line, after the command name, which can hold spaces and parentheses.
function startTime(proc: string, pid: string, boot: number): number {
  const stat = readFileSync(join(proc, pid, "stat"), "utf8");
  const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");

  return boot + (Number(fields[19]) / ticksPerSecond) * 1000;
}

// The session a run names with --session, or undefined when it lets OpenCode create one.
function namedSession(argv: readonly string[]): string | undefined {
  const flag = argv.findIndex((arg) => sessionFlags.has(arg));

  if (flag !== -1) {
    return argv[flag + 1];
  }

  return argv.find((arg) => arg.startsWith("--session="))?.slice("--session=".length);
}

// A process is a candidate when its executable is OpenCode, it runs `run` in the session's directory, and it
// started around when the session was created. After an upgrade the executable's link ends in " (deleted)".
function candidate(proc: string, pid: string, boot: number, session: RunSession): Candidate | null {
  const executable = basename(readlinkSync(join(proc, pid, "exe")).replace(/ \(deleted\)$/, ""));

  if (!executable.startsWith("opencode")) {
    return null;
  }

  const argv = readFileSync(join(proc, pid, "cmdline"), "utf8").split("\0").filter((arg) => arg !== "");

  if (!argv.includes("run") || readlinkSync(join(proc, pid, "cwd")) !== session.directory) {
    return null;
  }

  const named = namedSession(argv);

  if (named !== undefined && named !== session.id) {
    return null;
  }

  const started = startTime(proc, pid, boot);

  if (started < session.created - startedBefore || started > session.created + startedAfter) {
    return null;
  }

  return { pid, started, exact: named === session.id };
}

// The variables the process started with, as NAME=value entries separated by NUL.
function environment(proc: string, pid: string): Environment {
  const pairs = readFileSync(join(proc, pid, "environ"), "utf8").split("\0");

  return Object.fromEntries(
    pairs.flatMap((pair) => {
      const separator = pair.indexOf("=");

      return separator > 0 ? [[pair.slice(0, separator), pair.slice(separator + 1)]] : [];
    })
  );
}

// Finds the run that created the session, or null when none did: the session came from the TUI or another
// client, or the system has no /proc. A run that names the session with --session is an exact match; otherwise
// the latest run to start is the one that created it.
export function findRunClient(proc: string, session: RunSession): RunClient | null {
  const boot = bootTime(proc);

  if (boot === null) {
    return null;
  }

  let best: Candidate | null = null;

  for (const pid of readdirSync(proc)) {
    if (!/^\d+$/.test(pid)) {
      continue;
    }

    let found: Candidate | null;

    try {
      found = candidate(proc, pid, boot, session);
    } catch {
      // The process exited while it was being read, or belongs to another user.
      continue;
    }

    if (found !== null && (best === null || found.exact || (!best.exact && found.started > best.started))) {
      best = found;
    }
  }

  if (best === null) {
    return null;
  }

  try {
    return { spawnedBy: spawnerFromEnvironment(environment(proc, best.pid)) };
  } catch {
    return { spawnedBy: undefined };
  }
}
