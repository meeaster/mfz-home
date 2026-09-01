import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";

const optionsSchema = z.object({ root: z.string().min(1, "Work Ledger root is required") });
const bindingSchema = z.object({
  ledger: z.string().regex(/^[^./][^/]*$/, "Work Ledger binding contains an invalid ledger name"),
});
const missingFileSchema = z.object({ code: z.literal("ENOENT") });

interface WorkLedgerOptionsInput {
  readonly root?: unknown;
}

const sessionIDSchema = {
  parse(input: string) {
    if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error("Invalid OpenCode session ID");
    return input;
  },
};

export type Ledger = { name: string; path: string };
export type BindingStore = ReturnType<typeof createBindingStore>;
export type EffectiveBinding =
  | { status: "bound"; ledger: Ledger; source: "explicit" | "inherited"; sessionID: string }
  | { status: "stale"; ledger: string; sessionID: string }
  | { status: "unbound" };

export function resolveOptions(input: WorkLedgerOptionsInput, home = homedir()) {
  const { root } = optionsSchema.parse(input);
  const expanded =
    root === "~" ? home : root.startsWith("~/") ? path.join(home, root.slice(2)) : root;
  if (!path.isAbsolute(expanded)) throw new Error("Work Ledger root must be an absolute path");
  return { root: path.resolve(expanded) };
}

export async function discoverLedgers(root: string): Promise<Ledger[]> {
  if (!(await stat(root)).isDirectory())
    throw new Error(`Work Ledger root is not a directory: ${root}`);
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({ name: entry.name, path: path.join(root, entry.name) }))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

export function createBindingStore(
  root = path.join(homedir(), ".mindframe-z", "work-ledger", "bindings", "opencode"),
) {
  const bindingPath = (sessionID: string) =>
    path.join(root, `${sessionIDSchema.parse(sessionID)}.json`);

  return {
    async read(sessionID: string): Promise<string | undefined> {
      try {
        return bindingSchema.parse(JSON.parse(await readFile(bindingPath(sessionID), "utf8")))
          .ledger;
      } catch (error) {
        if (missingFileSchema.safeParse(error).success) return undefined;
        throw error;
      }
    },
    async write(sessionID: string, ledger: string): Promise<void> {
      const binding = bindingSchema.parse({ ledger });
      const destination = bindingPath(sessionID);
      await mkdir(root, { recursive: true });
      const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporary, `${JSON.stringify(binding, null, 2)}\n`, { flag: "wx" });
      await rename(temporary, destination);
    },
    async clear(sessionID: string): Promise<void> {
      await rm(bindingPath(sessionID), { force: true });
    },
  };
}

export async function resolveEffectiveBinding(input: {
  sessionID: string;
  ledgers: readonly Ledger[];
  bindings: Pick<BindingStore, "read">;
  getSession: (sessionID: string) => Promise<{ parentID?: string } | undefined>;
}): Promise<EffectiveBinding> {
  const ledgers = new Map(input.ledgers.map((ledger) => [ledger.name, ledger]));
  const visited = new Set<string>();
  let sessionID: string | undefined = input.sessionID;
  let explicit = true;

  while (sessionID) {
    if (visited.has(sessionID)) return { status: "unbound" };
    visited.add(sessionID);

    const selected = await input.bindings.read(sessionID);
    if (selected) {
      const ledger = ledgers.get(selected);
      if (!ledger) return { status: "stale", ledger: selected, sessionID };
      return {
        status: "bound",
        ledger,
        source: explicit ? "explicit" : "inherited",
        sessionID,
      };
    }

    const session = await input.getSession(sessionID);
    if (!session) return { status: "unbound" };
    sessionID = session.parentID;
    explicit = false;
  }

  return { status: "unbound" };
}
