import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  advisorSynchronizationState,
  createFileAdvisorContinuationStore,
  createFileAdvisorModeStore,
  createFileAdvisorSettingsStore,
  defaultAdvisorMode,
  resolveAdvisorMode,
  withContinuationFileLock,
} from "./state.js";

describe("advisor state", () => {
  it("defaults to on and persists explicit modes", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODE", undefined);
    const root = await mkdtemp(join(tmpdir(), "advisor-mode-"));
    try {
      const store = createFileAdvisorModeStore(root);
      const input = { directory: "/workspace", sessionID: "session" };

      await expect(store.load(input)).resolves.toBe("on");
      await store.save({ ...input, mode: "manual" });
      await expect(store.load(input)).resolves.toBe("manual");

      const file = join(root, (await readdir(root))[0]!);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      record.mode = "off";
      await writeFile(file, `${JSON.stringify(record)}\n`, "utf8");
      await expect(store.load(input)).resolves.toBe("manual");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses OPENCODE_ADVISOR_MODE for sessions without an explicit mode", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODE", "on");
    expect(defaultAdvisorMode()).toBe("on");

    const root = await mkdtemp(join(tmpdir(), "advisor-mode-env-"));
    try {
      const store = createFileAdvisorModeStore(root);
      await expect(store.load({ directory: "/workspace", sessionID: "session" })).resolves.toBe("on");
      await store.save({ directory: "/workspace", sessionID: "session", mode: "auto" });
      await expect(store.load({ directory: "/workspace", sessionID: "session" })).resolves.toBe("auto");
    } finally {
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });

  it("rejects an invalid environment-selected mode", () => {
    expect(() => defaultAdvisorMode("off")).toThrow(
      'Invalid OPENCODE_ADVISOR_MODE value "off". Use manual, auto, or on.',
    );
  });

  it("rejects malformed and expired mode records", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-mode-invalid-"));
    try {
      const store = createFileAdvisorModeStore(root);
      const input = { directory: "/workspace", sessionID: "session" };
      await store.save({ ...input, mode: "on" });
      const file = join(root, (await readdir(root))[0]!);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      record.mode = "invalid";
      await writeFile(file, `${JSON.stringify(record)}\n`, "utf8");

      await expect(store.load(input)).resolves.toBe("on");
      await expect(store.load(input)).resolves.toBe("on");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("persists a non-expiring global default and resolves precedence", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODE", "on");
    const root = await mkdtemp(join(tmpdir(), "advisor-settings-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const settingsStore = createFileAdvisorSettingsStore(join(root, "settings.json"));
      const input = { directory: "/workspace", sessionID: "session" };

      await expect(resolveAdvisorMode({ modeStore, settingsStore, ...input })).resolves.toMatchObject({
        mode: "on",
        defaultMode: "on",
        explicit: false,
      });
      await settingsStore.save("auto");
      await expect(resolveAdvisorMode({ modeStore, settingsStore, ...input })).resolves.toMatchObject({
        mode: "auto",
        defaultMode: "auto",
        explicit: false,
      });
      await modeStore.save({ ...input, mode: "manual" });
      await expect(resolveAdvisorMode({ modeStore, settingsStore, ...input })).resolves.toMatchObject({
        mode: "manual",
        defaultMode: "auto",
        explicit: true,
      });

      const settingsPath = join(root, "settings.json");
      const record = JSON.parse(await readFile(settingsPath, "utf8")) as Record<string, unknown>;
      record.updatedAt = Date.now() - 365 * 24 * 60 * 60 * 1000;
      await writeFile(settingsPath, `${JSON.stringify(record)}\n`, "utf8");
      await expect(settingsStore.load()).resolves.toBe("auto");
    } finally {
      await rm(root, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });

  it("keeps continuation records target-specific and versioned", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-"));
    try {
      const store = createFileAdvisorContinuationStore(root);
      const continuation = { epoch: "root", sessionID: "child", cursor: "parent-1", childCursor: "child-1" };
      await store.save({ directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model", continuation });

      await expect(
        store.load({ directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" }),
      ).resolves.toEqual(continuation);
      await expect(store.list({ directory: "/workspace", parentSessionID: "parent" })).resolves.toMatchObject([
        { kind: "continuation", version: 2, target: "opencode:test/model", continuation },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports mode and settings write failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-state-failure-"));
    try {
      const blocker = join(root, "blocked");
      await writeFile(blocker, "not a directory", "utf8");
      await expect(
        createFileAdvisorModeStore(join(blocker, "state")).save({ directory: "/workspace", sessionID: "session", mode: "on" }),
      ).rejects.toBeDefined();
      await expect(createFileAdvisorSettingsStore(join(blocker, "settings.json")).save("on")).rejects.toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports removal failure instead of claiming a continuation was removed", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-remove-failure-"));
    try {
      const input = { directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" };
      const digest = createHash("sha256").update(JSON.stringify(["continuation", input.directory, input.parentSessionID, input.target])).digest("hex");
      await mkdir(join(root, `${digest}.json`));
      await expect(createFileAdvisorContinuationStore(root).remove(input)).resolves.toMatchObject({ status: "unavailable" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not delete a fresh continuation that replaces an expired candidate", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-prune-race-"));
    try {
      const store = createFileAdvisorContinuationStore(root);
      const input = { directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" };
      const oldContinuation = { epoch: "old", sessionID: "old-child", cursor: "old" };
      const freshContinuation = { epoch: "fresh", sessionID: "fresh-child", cursor: "fresh" };
      await store.save({ ...input, continuation: oldContinuation });
      const path = join(root, (await readdir(root)).find((name) => name.endsWith(".json"))!);
      const oldRecord = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
      oldRecord.updatedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      await writeFile(path, `${JSON.stringify(oldRecord)}\n`, "utf8");

      let release!: () => void;
      const held = withContinuationFileLock(path, async () => {
        await new Promise<void>((resolve) => (release = resolve));
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      const pruning = store.prune(input.directory);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await writeFile(
        path,
        `${JSON.stringify({ ...oldRecord, updatedAt: Date.now(), continuation: freshContinuation })}\n`,
        "utf8",
      );
      release();
      await held;
      await pruning;
      await expect(store.load(input)).resolves.toEqual(freshContinuation);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a stale write from an independent continuation store", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-cas-"));
    try {
      const first = createFileAdvisorContinuationStore(root);
      const second = createFileAdvisorContinuationStore(root);
      const input = { directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" };
      const oldContinuation = { epoch: "uncompacted", sessionID: "old-child", cursor: "old-message" };
      const newContinuation = { epoch: "compaction:new", sessionID: "new-child", cursor: "new-message" };

       await expect(first.save({ ...input, continuation: newContinuation, expected: null })).resolves.toMatchObject({ status: "committed" });
       await expect(second.save({ ...input, continuation: oldContinuation, expected: null })).resolves.toMatchObject({ status: "conflict" });
      await expect(first.load(input)).resolves.toEqual(newContinuation);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recovers a stale continuation lock", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-"));
    try {
      const store = createFileAdvisorContinuationStore(root);
      const input = { directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" };
      const oldContinuation = { epoch: "uncompacted", sessionID: "old-child", cursor: "old-message" };
      const newContinuation = { epoch: "compaction:new", sessionID: "new-child", cursor: "new-message" };
      await store.save({ ...input, continuation: oldContinuation });
      const file = join(root, (await readdir(root)).find((name) => name.endsWith(".json"))!);
       const lockPath = `${file}.lock-stale`;
      await mkdir(lockPath);
       await writeFile(
         join(lockPath, "owner"),
         JSON.stringify({ pid: 2_147_483_647, token: "stale", choosing: false, ticket: 1 }),
         "utf8",
       );
      const staleTime = new Date(Date.now() - 60_000);
      await utimes(lockPath, staleTime, staleTime);

       await expect(store.save({ ...input, continuation: newContinuation, expected: oldContinuation })).resolves.toMatchObject({ status: "committed" });
      await expect(store.load(input)).resolves.toEqual(newContinuation);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not release a successor lock after lease takeover", async () => {
      const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-owner-"));
    try {
      const path = join(root, "continuation.json");
      let releaseFirst!: () => void;
      let releaseSecond!: () => void;
      let firstStarted!: () => void;
      let secondStarted!: () => void;
      const firstReady = new Promise<void>((resolve) => (firstStarted = resolve));
      const secondReady = new Promise<void>((resolve) => (secondStarted = resolve));
      const first = withContinuationFileLock(path, async () => {
        firstStarted();
        await new Promise<void>((resolve) => (releaseFirst = resolve));
      });
      await firstReady;

      const lockPath = join(root, (await readdir(root)).find((name) => name.startsWith("continuation.json.lock-"))!);
      const initialLockName = lockPath.slice(root.length + 1);
      const ownerPath = join(lockPath, "owner");
      const staleOwner = JSON.stringify({ pid: 2_147_483_647, token: "old-owner", acquiredAt: Date.now() });
      await writeFile(ownerPath, staleOwner, "utf8");
      const staleTime = new Date(Date.now() - 60_000);
      await utimes(lockPath, staleTime, staleTime);
      const second = withContinuationFileLock(path, async () => {
        secondStarted();
        await new Promise<void>((resolve) => (releaseSecond = resolve));
      });
      await secondReady;
      const successorPath = join(root, (await readdir(root)).find((name) => name.startsWith("continuation.json.lock-") && name !== initialLockName)!);
      const successorOwnerPath = join(successorPath, "owner");
      await expect(readFile(successorOwnerPath, "utf8")).resolves.not.toBe(staleOwner);

      releaseFirst();
      await first;
      await expect(readFile(successorOwnerPath, "utf8")).resolves.not.toBe(staleOwner);
      releaseSecond();
      await second;
      await expect(readFile(successorOwnerPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("serializes competing stale-lock reclaimers", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-reclaim-"));
    try {
      const path = join(root, "continuation.json");
       const lockPath = `${path}.lock-stale`;
      await mkdir(lockPath);
       await writeFile(
         join(lockPath, "owner"),
         JSON.stringify({ pid: 2_147_483_647, token: "stale", choosing: false, ticket: 1 }),
         "utf8",
       );
      const staleTime = new Date(Date.now() - 60_000);
      await utimes(lockPath, staleTime, staleTime);

      let acquired = 0;
      let releaseWinner!: () => void;
      let winnerStarted!: () => void;
      const winnerReady = new Promise<void>((resolve) => (winnerStarted = resolve));
      const holdWinner = async () => {
        acquired += 1;
        if (acquired === 1) {
          winnerStarted();
          await new Promise<void>((resolve) => (releaseWinner = resolve));
        }
      };
      const first = withContinuationFileLock(path, async () => {
        await holdWinner();
      });
      const second = withContinuationFileLock(path, async () => {
        await holdWinner();
      });

      await winnerReady;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(acquired).toBe(1);
      releaseWinner();
      await first;
      await second;
      expect(acquired).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let a late contender overtake an active owner", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-arrival-"));
    try {
      const path = join(root, "continuation.json");
      let releaseFirst!: () => void;
      let firstStarted!: () => void;
      let secondEntered = false;
      const firstReady = new Promise<void>((resolve) => (firstStarted = resolve));
      const first = withContinuationFileLock(path, async () => {
        firstStarted();
        await new Promise<void>((resolve) => (releaseFirst = resolve));
      });
      await firstReady;
      await new Promise((resolve) => setTimeout(resolve, 20));
      const second = withContinuationFileLock(path, async () => {
        secondEntered = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(secondEntered).toBe(false);
      releaseFirst();
      await first;
      await second;
      expect(secondEntered).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses tickets instead of token order for a late contender", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-ticket-"));
    try {
      const path = join(root, "continuation.json");
      const activePath = `${path}.lock-z-first`;
      await mkdir(activePath);
      await writeFile(
        join(activePath, "owner"),
        JSON.stringify({ pid: process.pid, token: "z-first", choosing: false, ticket: 1 }),
        "utf8",
      );
      let entered = false;
      const contender = withContinuationFileLock(path, async () => {
        entered = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(entered).toBe(false);
      await rm(activePath, { recursive: true, force: true });
      await contender;
      expect(entered).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never overlaps concurrent critical sections", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-concurrent-"));
    try {
      const path = join(root, "continuation.json");
      let active = 0;
      let maximumActive = 0;
      let firstEntered!: () => void;
      let releaseFirst!: () => void;
      const entered = new Promise<void>((resolve) => (firstEntered = resolve));
      const firstRelease = new Promise<void>((resolve) => (releaseFirst = resolve));
      const contenders = Array.from({ length: 4 }, () =>
        withContinuationFileLock(path, async () => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          if (active === 1 && maximumActive === 1) {
            firstEntered();
            await firstRelease;
          }
          active -= 1;
        }),
      );

      await entered;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(maximumActive).toBe(1);
      releaseFirst();
      await Promise.all(contenders);
      expect(maximumActive).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("waits for a live contender longer than a normal model call", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-continuation-lock-timeout-"));
    try {
      const path = join(root, "continuation.json");
      let releaseFirst!: () => void;
      let entered = false;
      const first = withContinuationFileLock(path, async () => {
        await new Promise<void>((resolve) => (releaseFirst = resolve));
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      const second = withContinuationFileLock(path, async () => {
        entered = true;
      });
      setTimeout(releaseFirst, 5_100);
      await Promise.all([first, second]);
      expect(entered).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 10 });
    }
  }, 15_000);

  it("preserves legacy continuation records while pruning", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-legacy-"));
    try {
      const store = createFileAdvisorContinuationStore(root);
      const input = { directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" };
      const continuation = { epoch: "root", sessionID: "child", cursor: "parent-1" };
      await store.save({ ...input, continuation });
      const file = join(root, (await readdir(root))[0]!);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      delete record.kind;
      delete record.directory;
      record.version = 1;
      const legacy = join(root, `${createHash("sha256").update(JSON.stringify([input.directory, input.parentSessionID, input.target])).digest("hex")}.json`);
      await writeFile(legacy, `${JSON.stringify(record)}\n`, "utf8");
      await rm(file, { force: true });

      await store.prune(input.directory);
      await expect(store.load(input)).resolves.toEqual(continuation);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unknown future continuation versions", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-future-"));
    try {
      const store = createFileAdvisorContinuationStore(root);
      const input = { directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model" };
      await store.save({ ...input, continuation: { epoch: "root", sessionID: "child", cursor: "parent-1" } });
      const file = join(root, (await readdir(root))[0]!);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      record.version = 3;
      await writeFile(file, `${JSON.stringify(record)}\n`, "utf8");

      await expect(store.load(input)).resolves.toBeUndefined();
      await expect(store.list(input)).resolves.toEqual([]);
      await store.prune(input.directory);
      await expect(readdir(root)).resolves.toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    ["cold", undefined, { epoch: "root", cursor: "message", estimatedTokens: 1 }],
    ["reset", { epoch: "old", cursor: "message" }, { epoch: "root", cursor: "message", estimatedTokens: 0 }],
    ["pending", { epoch: "root", cursor: "old" }, { epoch: "root", cursor: "message", estimatedTokens: 1 }],
    ["synchronized", { epoch: "root", cursor: "message" }, { epoch: "root", cursor: "message", estimatedTokens: 0 }],
  ] as const)("reports %s synchronization", (expected, continuation, plan) => {
    expect(advisorSynchronizationState(plan, continuation)).toBe(expected);
  });
});
