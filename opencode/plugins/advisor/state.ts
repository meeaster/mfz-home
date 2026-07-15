import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

export const ADVISOR_STATE_ROOT = join(homedir(), ".opencode", "advisor", "state");
export const ADVISOR_SETTINGS_PATH = join(homedir(), ".opencode", "advisor", "settings.json");
export const ADVISOR_STATE_VERSION = 2;
export const ADVISOR_STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ADVISOR_LOCK_LEASE_MS = 30_000;

export type AdvisorMode = "manual" | "auto" | "on";

export function defaultAdvisorMode(value = process.env.OPENCODE_ADVISOR_MODE): AdvisorMode {
  if (value === "manual" || value === "auto" || value === "on") return value;
  if (value === undefined || value === "") return "on";
  throw new Error(`Invalid OPENCODE_ADVISOR_MODE value "${value}". Use manual, auto, or on.`);
}

export type AdvisorContinuation = {
  epoch: string;
  sessionID: string;
  cursor: string | undefined;
  childCursor?: string | undefined;
};

export type AdvisorModeRecord = {
  kind: "mode";
  version: 1;
  directory: string;
  sessionID: string;
  mode: AdvisorMode;
  updatedAt: number;
};

export type AdvisorSettingsRecord = {
  kind: "settings";
  version: 1;
  defaultMode: AdvisorMode;
  updatedAt: number;
};

export type AdvisorContinuationRecord = {
  kind: "continuation";
  version: 2;
  directory: string;
  parentSessionID: string;
  target: string;
  updatedAt: number;
  continuation: AdvisorContinuation;
};

export type AdvisorStateRecord = AdvisorModeRecord | AdvisorContinuationRecord | AdvisorSettingsRecord;

export type AdvisorSynchronizationState = "cold" | "synchronized" | "pending" | "reset";

export function advisorSynchronizationState(
  plan: { epoch: string; cursor: string | undefined; estimatedTokens: number },
  continuation: Pick<AdvisorContinuation, "epoch" | "cursor"> | undefined,
): AdvisorSynchronizationState {
  if (!continuation) return "cold";
  if (continuation.epoch !== plan.epoch) return "reset";
  return continuation.cursor === plan.cursor && plan.estimatedTokens === 0 ? "synchronized" : "pending";
}

function statePath(root: string, key: string): string {
  const digest = createHash("sha256").update(key).digest("hex");
  return join(root, `${digest}.json`);
}

function modePath(root: string, directory: string, sessionID: string): string {
  return statePath(root, JSON.stringify(["mode", directory, sessionID]));
}

function continuationPath(root: string, directory: string, parentSessionID: string, target: string): string {
  return statePath(root, JSON.stringify(["continuation", directory, parentSessionID, target]));
}

function legacyContinuationPath(root: string, directory: string, parentSessionID: string, target: string): string {
  return statePath(root, JSON.stringify([directory, parentSessionID, target]));
}

function parseModeValue(value: unknown): AdvisorMode | undefined {
  if (value === "off" || value === "manual") return "manual";
  if (value === "auto" || value === "on") return value;
  return undefined;
}

function validContinuation(value: unknown): value is AdvisorContinuation {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.epoch === "string" &&
    typeof record.sessionID === "string" &&
    (record.cursor === undefined || typeof record.cursor === "string") &&
    (record.childCursor === undefined || typeof record.childCursor === "string")
  );
}

function parseMode(value: unknown, directory: string, sessionID: string): AdvisorMode | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const mode = parseModeValue(record.mode);
  if (
    record.kind !== "mode" ||
    record.version !== 1 ||
    record.directory !== directory ||
    record.sessionID !== sessionID ||
    typeof record.updatedAt !== "number" ||
    Date.now() - record.updatedAt > ADVISOR_STATE_TTL_MS ||
    !mode
  ) {
    return undefined;
  }
  return mode;
}

function parseContinuation(value: unknown, directory: string, parentSessionID: string, target: string): AdvisorContinuation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 &&
    record.version !== ADVISOR_STATE_VERSION
  ) {
    return undefined;
  }
  if (
    (record.kind !== "continuation" && record.version !== 1) ||
    (record.version === ADVISOR_STATE_VERSION && record.directory !== directory) ||
    record.parentSessionID !== parentSessionID ||
    record.target !== target ||
    typeof record.updatedAt !== "number" ||
    Date.now() - record.updatedAt > ADVISOR_STATE_TTL_MS ||
    !validContinuation(record.continuation)
  ) {
    return undefined;
  }
  return record.continuation;
}

async function atomicWrite(path: string, value: AdvisorStateRecord): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, "utf8");
  await rename(temporary, path);
}

export interface AdvisorModeStore {
  loadOverride(input: { directory: string; sessionID: string }): Promise<AdvisorMode | undefined>;
  load(input: { directory: string; sessionID: string }): Promise<AdvisorMode>;
  save(input: { directory: string; sessionID: string; mode: AdvisorMode }): Promise<void>;
  prune(directory?: string): Promise<void>;
}

export function createFileAdvisorModeStore(
  root = process.env.OPENCODE_ADVISOR_STATE_ROOT ?? ADVISOR_STATE_ROOT,
): AdvisorModeStore {
  const loadOverride = async (input: { directory: string; sessionID: string }): Promise<AdvisorMode | undefined> => {
    const path = modePath(root, input.directory, input.sessionID);
    try {
      const mode = parseMode(JSON.parse(await readFile(path, "utf8")), input.directory, input.sessionID);
      if (mode) return mode;
    } catch {
      // A missing or malformed mode starts at the configured default.
    }
    return undefined;
  };
  return {
    loadOverride,
    async load(input) {
      return (await loadOverride(input)) ?? defaultAdvisorMode();
    },
    async save(input) {
      const record: AdvisorModeRecord = {
        kind: "mode",
        version: 1,
        directory: input.directory,
        sessionID: input.sessionID,
        mode: input.mode,
        updatedAt: Date.now(),
      };
      await atomicWrite(modePath(root, input.directory, input.sessionID), record);
    },
    async prune(directory) {
      if (!directory) return;
      await pruneStateDirectory(root);
    },
  };
}

export interface AdvisorSettingsStore {
  load(): Promise<AdvisorMode | undefined>;
  save(mode: AdvisorMode): Promise<void>;
}

function parseSettings(value: unknown): AdvisorMode | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const mode = parseModeValue(record.defaultMode);
  if (
    record.kind !== "settings" ||
    record.version !== 1 ||
    typeof record.updatedAt !== "number" ||
    !mode
  ) {
    return undefined;
  }
  return mode;
}

export function createFileAdvisorSettingsStore(
  path = process.env.OPENCODE_ADVISOR_SETTINGS_PATH ?? ADVISOR_SETTINGS_PATH,
): AdvisorSettingsStore {
  return {
    async load() {
      try {
        const mode = parseSettings(JSON.parse(await readFile(path, "utf8")));
        if (mode) return mode;
      } catch {
        // A missing or malformed settings record means no UI-selected default.
      }
      return undefined;
    },
    async save(mode) {
      const record: AdvisorSettingsRecord = {
        kind: "settings",
        version: 1,
        defaultMode: mode,
        updatedAt: Date.now(),
      };
      await atomicWrite(path, record);
    },
  };
}

export type AdvisorModeResolution = {
  mode: AdvisorMode;
  defaultMode: AdvisorMode;
  explicit: boolean;
  modeSessionID: string;
};

export async function resolveAdvisorMode(input: {
  modeStore: AdvisorModeStore;
  settingsStore?: AdvisorSettingsStore;
  directory: string;
  sessionID: string;
}): Promise<AdvisorModeResolution> {
  const [explicit, uiDefault] = await Promise.all([
    input.modeStore.loadOverride({ directory: input.directory, sessionID: input.sessionID }),
    input.settingsStore?.load(),
  ]);
  const defaultMode = uiDefault ?? defaultAdvisorMode();
  return {
    mode: explicit ?? defaultMode,
    defaultMode,
    explicit: explicit !== undefined,
    modeSessionID: input.sessionID,
  };
}

export async function resolveInheritedAdvisorMode(input: {
  modeStore: AdvisorModeStore;
  settingsStore?: AdvisorSettingsStore;
  directory: string;
  sessionID: string;
  parentID: (sessionID: string) => Promise<string | undefined>;
}): Promise<AdvisorModeResolution> {
  const defaultMode = (await input.settingsStore?.load()) ?? defaultAdvisorMode();
  let sessionID = input.sessionID;
  let first = true;
  let modeSessionID = input.sessionID;
  const visited = new Set<string>();

  while (!visited.has(sessionID)) {
    visited.add(sessionID);
    const parentID = await input.parentID(sessionID);
    if (parentID) {
      if (visited.has(parentID)) return { mode: defaultMode, defaultMode, explicit: false, modeSessionID };
      sessionID = parentID;
      first = false;
      if (modeSessionID === input.sessionID) modeSessionID = sessionID;
      const explicit = await input.modeStore.loadOverride({ directory: input.directory, sessionID });
      if (explicit) return { mode: explicit, defaultMode, explicit: true, modeSessionID };
      continue;
    }

    const explicit = await input.modeStore.loadOverride({
      directory: input.directory,
      sessionID: first ? input.sessionID : sessionID,
    });
    return {
      mode: explicit ?? defaultMode,
      defaultMode,
      explicit: explicit !== undefined,
      modeSessionID,
    };
  }

  return { mode: defaultMode, defaultMode, explicit: false, modeSessionID };
}

export interface AdvisorContinuationStore {
  load(input: { directory: string; parentSessionID: string; target: string }): Promise<AdvisorContinuation | undefined>;
  save(input: {
    directory: string;
    parentSessionID: string;
    target: string;
    continuation: AdvisorContinuation;
    expected?: AdvisorContinuation | null;
  }): Promise<AdvisorContinuationSaveResult>;
  remove(input: {
    directory: string;
    parentSessionID: string;
    target: string;
    expected?: AdvisorContinuation | null;
  }): Promise<AdvisorContinuationRemoveResult>;
  transaction<T>(
    input: { directory: string; parentSessionID: string; target: string },
    operation: (transaction: AdvisorContinuationTransaction) => Promise<T>,
  ): Promise<T>;
  list(input: { directory: string; parentSessionID: string }): Promise<AdvisorContinuationRecord[]>;
  prune(directory?: string): Promise<void>;
}

export type AdvisorContinuationSaveResult =
  | { status: "committed"; continuation: AdvisorContinuation }
  | { status: "conflict"; current?: AdvisorContinuation }
  | { status: "unavailable"; error: unknown };

export type AdvisorContinuationRemoveResult =
  | { status: "removed" }
  | { status: "conflict"; current?: AdvisorContinuation }
  | { status: "unavailable"; error: unknown };

export type AdvisorContinuationReadResult =
  | { status: "available"; continuation?: AdvisorContinuation }
  | { status: "unavailable"; error: unknown };

export type AdvisorContinuationTransaction = {
  readonly previous?: AdvisorContinuation;
  reload(): Promise<AdvisorContinuationReadResult>;
  save(input: {
    continuation: AdvisorContinuation;
    expected?: AdvisorContinuation | null;
  }): Promise<AdvisorContinuationSaveResult>;
  remove(input?: { expected?: AdvisorContinuation | null }): Promise<AdvisorContinuationRemoveResult>;
};

function sameContinuation(left: AdvisorContinuation | undefined, right: AdvisorContinuation | undefined): boolean {
  return (
    left?.epoch === right?.epoch &&
    left?.sessionID === right?.sessionID &&
    left?.cursor === right?.cursor &&
    left?.childCursor === right?.childCursor
  );
}

type AdvisorLockRecord = {
  pid: number;
  token: string;
  choosing: boolean;
  ticket?: number;
};

async function writeAdvisorLockRecord(path: string, record: AdvisorLockRecord): Promise<string> {
  const value = JSON.stringify(record);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, value, "utf8");
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
  return value;
}

export async function withContinuationFileLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const parent = join(path, "..");
  const lockPrefix = `${path}.lock-`;
  const lockPrefixName = lockPrefix.slice(parent.length + 1);
  const ownerToken = randomUUID();
  const lockPath = `${lockPrefix}${ownerToken}`;
  const ownerPath = join(lockPath, "owner");
  await mkdir(parent, { recursive: true });

  let acquired = false;
  let ownerRecord: string | undefined;

  const readContenders = async (): Promise<Array<{ path: string; token: string; record?: AdvisorLockRecord }>> => {
    const contenders: Array<{ path: string; token: string; record?: AdvisorLockRecord }> = [];
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (!entry.name.startsWith(lockPrefixName)) continue;
      const contender = join(parent, entry.name);
      const lock = await stat(contender).catch(() => undefined);
      if (!lock?.isDirectory()) continue;
      const token = entry.name.slice(lockPrefixName.length);
      let record: AdvisorLockRecord | undefined;
      try {
        const parsed = JSON.parse(await readFile(join(contender, "owner"), "utf8")) as {
          pid?: unknown;
          token?: unknown;
          choosing?: unknown;
          ticket?: unknown;
        };
        if (
          typeof parsed.pid === "number" &&
          Number.isInteger(parsed.pid) &&
          parsed.pid > 0 &&
          parsed.token === token &&
          typeof parsed.choosing === "boolean" &&
          (parsed.choosing || (typeof parsed.ticket === "number" && Number.isSafeInteger(parsed.ticket) && parsed.ticket > 0))
        ) {
          record = parsed as AdvisorLockRecord;
        }
      } catch {
        // A missing or malformed owner record is provisional until its lease expires.
      }

      let ownerAlive = false;
      if (record) {
        try {
          process.kill(record.pid, 0);
          ownerAlive = true;
        } catch (ownerError) {
          ownerAlive = (ownerError as NodeJS.ErrnoException).code === "EPERM";
        }
      }
      if (!ownerAlive && Date.now() - lock.mtimeMs > ADVISOR_LOCK_LEASE_MS) {
        await rm(contender, { recursive: true, force: true }).catch(() => undefined);
        continue;
      }
      contenders.push({ path: contender, token, record });
    }
    return contenders;
  };

  try {
    while (!acquired) {
      try {
        await mkdir(lockPath);
        acquired = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
    await writeAdvisorLockRecord(ownerPath, { pid: process.pid, token: ownerToken, choosing: true });
    const choosing = await readContenders();
    const maxTicket = Math.max(
      0,
      ...choosing.flatMap((contender) =>
        contender.record?.choosing === false && contender.record.ticket !== undefined ? [contender.record.ticket] : [],
      ),
    );
    const ticket = maxTicket + 1;
    ownerRecord = await writeAdvisorLockRecord(ownerPath, { pid: process.pid, token: ownerToken, choosing: false, ticket });

    while (true) {
      const contenders = await readContenders();
      const blocked = contenders.some((contender) => {
        if (contender.path === lockPath) return false;
        if (!contender.record || contender.record.choosing || contender.record.ticket === undefined) return true;
        return contender.record.ticket < ticket || (contender.record.ticket === ticket && contender.token < ownerToken);
      });
      if (!blocked) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    return await operation();
  } finally {
    if (acquired) {
      try {
        const owner = await readFile(ownerPath, "utf8").catch(() => undefined);
        if (ownerRecord === undefined || owner === ownerRecord) {
          await rm(lockPath, { recursive: true, force: true });
        }
      } catch {
        // Release is best-effort. Never turn a completed advisor operation into a failure.
      }
    }
  }
}

export function createFileAdvisorContinuationStore(
  root = process.env.OPENCODE_ADVISOR_STATE_ROOT ?? ADVISOR_STATE_ROOT,
): AdvisorContinuationStore {
  const readForPersistence = async (
    input: { directory: string; parentSessionID: string; target: string },
  ): Promise<AdvisorContinuationReadResult> => {
    for (const path of [
      continuationPath(root, input.directory, input.parentSessionID, input.target),
      legacyContinuationPath(root, input.directory, input.parentSessionID, input.target),
    ]) {
      let raw: string;
      try {
        raw = await readFile(path, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { status: "unavailable", error };
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const continuation = parseContinuation(parsed, input.directory, input.parentSessionID, input.target);
      if (continuation) return { status: "available", continuation };
    }
    return { status: "available" };
  };

  const load = async (input: { directory: string; parentSessionID: string; target: string }) => {
    for (const path of [
      continuationPath(root, input.directory, input.parentSessionID, input.target),
      legacyContinuationPath(root, input.directory, input.parentSessionID, input.target),
    ]) {
      try {
        const continuation = parseContinuation(
          JSON.parse(await readFile(path, "utf8")),
          input.directory,
          input.parentSessionID,
          input.target,
        );
        if (continuation) return continuation;
      } catch {
        // A missing or malformed record means this continuation starts fresh.
      }
    }
    return undefined;
  };

  const saveUnlocked = async (input: {
    directory: string;
    parentSessionID: string;
    target: string;
    continuation: AdvisorContinuation;
    expected?: AdvisorContinuation | null;
  }): Promise<AdvisorContinuationSaveResult> => {
    const current = await readForPersistence(input);
    if (current.status === "unavailable") return current;
    if (input.expected !== undefined && !sameContinuation(current.continuation, input.expected ?? undefined)) {
      return { status: "conflict", ...(current.continuation ? { current: current.continuation } : {}) };
    }
    const record: AdvisorContinuationRecord = {
      kind: "continuation",
      version: ADVISOR_STATE_VERSION,
      directory: input.directory,
      parentSessionID: input.parentSessionID,
      target: input.target,
      updatedAt: Date.now(),
      continuation: input.continuation,
    };
    try {
      await atomicWrite(continuationPath(root, input.directory, input.parentSessionID, input.target), record);
      return { status: "committed", continuation: input.continuation };
    } catch (error) {
      return { status: "unavailable", error };
    }
  };

  const removeUnlocked = async (input: {
    directory: string;
    parentSessionID: string;
    target: string;
    expected?: AdvisorContinuation | null;
  }): Promise<AdvisorContinuationRemoveResult> => {
    const current = await readForPersistence(input);
    if (current.status === "unavailable") return current;
    if (input.expected !== undefined && !sameContinuation(current.continuation, input.expected ?? undefined)) {
      return { status: "conflict", ...(current.continuation ? { current: current.continuation } : {}) };
    }
    try {
      await rm(continuationPath(root, input.directory, input.parentSessionID, input.target), { force: true });
      await rm(legacyContinuationPath(root, input.directory, input.parentSessionID, input.target), { force: true });
      return { status: "removed" };
    } catch (error) {
      return { status: "unavailable", error };
    }
  };

  return {
    load,
    async save(input) {
      const path = continuationPath(root, input.directory, input.parentSessionID, input.target);
      try {
        return await withContinuationFileLock(path, () => saveUnlocked(input));
      } catch (error) {
        return { status: "unavailable", error };
      }
    },
    async remove(input) {
      const path = continuationPath(root, input.directory, input.parentSessionID, input.target);
      try {
        return await withContinuationFileLock(path, () => removeUnlocked(input));
      } catch (error) {
        return { status: "unavailable", error };
      }
    },
    transaction(input, operation) {
      const path = continuationPath(root, input.directory, input.parentSessionID, input.target);
      return withContinuationFileLock(path, async () => {
        const initial = await readForPersistence(input);
        if (initial.status === "unavailable") throw initial.error;
        const transaction: AdvisorContinuationTransaction = {
          previous: initial.continuation,
          async reload() {
            return readForPersistence(input);
          },
          save(next) {
            return saveUnlocked({ ...input, ...next });
          },
          remove(next = {}) {
            return removeUnlocked({ ...input, ...next });
          },
        };
        return operation(transaction);
      });
    },
    async list(input) {
      const records: AdvisorContinuationRecord[] = [];
      try {
        for (const file of await readdir(root, { withFileTypes: true })) {
          if (!file.isFile() || !file.name.endsWith(".json")) continue;
          try {
            const parsed = JSON.parse(await readFile(join(root, file.name), "utf8")) as unknown;
            if (!parsed || typeof parsed !== "object") continue;
            const record = parsed as Record<string, unknown>;
            if (
              record.kind !== "continuation" ||
              record.version !== ADVISOR_STATE_VERSION ||
              record.directory !== input.directory ||
              record.parentSessionID !== input.parentSessionID ||
              typeof record.target !== "string" ||
              typeof record.updatedAt !== "number" ||
              Date.now() - record.updatedAt > ADVISOR_STATE_TTL_MS ||
              !validContinuation(record.continuation)
            ) continue;
            records.push(record as unknown as AdvisorContinuationRecord);
          } catch {
            // Ignore unrelated or malformed state files.
          }
        }
      } catch {
        // State discovery is best-effort for observability.
      }
      return records;
    },
    prune: (directory) => pruneStateDirectory(root, directory),
  };
}

function shouldPruneStateRecord(raw: string): boolean {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return true;
    parsed = value as Record<string, unknown>;
  } catch {
    return true;
  }

  if (parseSettings(parsed) !== undefined) return false;
  const legacyContinuation =
    parsed.version === 1 &&
    typeof parsed.parentSessionID === "string" &&
    typeof parsed.target === "string" &&
    validContinuation(parsed.continuation);
  const currentContinuation = parsed.version === ADVISOR_STATE_VERSION && parsed.kind === "continuation";
  const currentMode = parsed.version === 1 && parsed.kind === "mode";
  return (
    (!legacyContinuation && !currentContinuation && !currentMode) ||
    typeof parsed.updatedAt !== "number" ||
    Date.now() - parsed.updatedAt > ADVISOR_STATE_TTL_MS
  );
}

async function pruneStateDirectory(root: string, _directory?: string): Promise<void> {
  try {
    for (const file of await readdir(root, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith(".json")) continue;
      const path = join(root, file.name);
      try {
        const candidate = await readFile(path, "utf8");
        if (!shouldPruneStateRecord(candidate)) continue;
        await withContinuationFileLock(path, async () => {
          let current: string;
          try {
            current = await readFile(path, "utf8");
          } catch {
            return;
          }
          if (current !== candidate || !shouldPruneStateRecord(current)) return;
          await rm(path, { force: true });
        });
      } catch {
        // State cleanup is best-effort; a replacement or storage failure wins.
      }
    }
  } catch {
    // State cleanup is best-effort.
  }
}
