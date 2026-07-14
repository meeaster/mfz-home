import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

export const ADVISOR_STATE_ROOT = join(homedir(), ".opencode", "advisor", "state");
export const ADVISOR_STATE_VERSION = 2;
export const ADVISOR_STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export type AdvisorContinuationRecord = {
  kind: "continuation";
  version: 2;
  directory: string;
  parentSessionID: string;
  target: string;
  updatedAt: number;
  continuation: AdvisorContinuation;
};

export type AdvisorStateRecord = AdvisorModeRecord | AdvisorContinuationRecord;

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
  load(input: { directory: string; sessionID: string }): Promise<AdvisorMode>;
  save(input: { directory: string; sessionID: string; mode: AdvisorMode }): Promise<void>;
  prune(directory?: string): Promise<void>;
}

export function createFileAdvisorModeStore(root = ADVISOR_STATE_ROOT): AdvisorModeStore {
  const fallbackMode = defaultAdvisorMode();
  return {
    async load(input) {
      const path = modePath(root, input.directory, input.sessionID);
      try {
        const mode = parseMode(JSON.parse(await readFile(path, "utf8")), input.directory, input.sessionID);
        if (mode) return mode;
      } catch {
        // A missing or malformed mode starts at the configured default.
      }
      await rm(path, { force: true }).catch(() => undefined);
      return fallbackMode;
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
      try {
        await atomicWrite(modePath(root, input.directory, input.sessionID), record);
      } catch {
        // A state write must not prevent the command from completing.
      }
    },
    async prune(directory) {
      if (!directory) return;
      await pruneStateDirectory(root);
    },
  };
}

export interface AdvisorContinuationStore {
  load(input: { directory: string; parentSessionID: string; target: string }): Promise<AdvisorContinuation | undefined>;
  save(input: { directory: string; parentSessionID: string; target: string; continuation: AdvisorContinuation }): Promise<void>;
  remove(input: { directory: string; parentSessionID: string; target: string }): Promise<void>;
  list(input: { directory: string; parentSessionID: string }): Promise<AdvisorContinuationRecord[]>;
  prune(directory?: string): Promise<void>;
}

export function createFileAdvisorContinuationStore(root = ADVISOR_STATE_ROOT): AdvisorContinuationStore {
  return {
    async load(input) {
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
        await rm(path, { force: true }).catch(() => undefined);
      }
      return undefined;
    },
    async save(input) {
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
      } catch {
        // A state write must not hide valid advisor guidance.
      }
    },
    async remove(input) {
      await rm(continuationPath(root, input.directory, input.parentSessionID, input.target), { force: true }).catch(() => undefined);
      await rm(legacyContinuationPath(root, input.directory, input.parentSessionID, input.target), { force: true }).catch(() => undefined);
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

async function pruneStateDirectory(root: string, _directory?: string): Promise<void> {
  try {
    for (const file of await readdir(root, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith(".json")) continue;
      const path = join(root, file.name);
      try {
        const parsed = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
        const legacyContinuation =
          parsed.version === 1 &&
          typeof parsed.parentSessionID === "string" &&
          typeof parsed.target === "string" &&
          validContinuation(parsed.continuation);
        const currentContinuation = parsed.version === ADVISOR_STATE_VERSION && parsed.kind === "continuation";
        const currentMode = parsed.version === 1 && parsed.kind === "mode";
        if (
          (!legacyContinuation && !currentContinuation && !currentMode) ||
          typeof parsed.updatedAt !== "number" ||
          Date.now() - parsed.updatedAt > ADVISOR_STATE_TTL_MS
        ) {
          await rm(path, { force: true });
        }
      } catch {
        await rm(path, { force: true });
      }
    }
  } catch {
    // State cleanup is best-effort.
  }
}
