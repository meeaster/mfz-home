import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  advisorSynchronizationState,
  createFileAdvisorContinuationStore,
  createFileAdvisorModeStore,
  defaultAdvisorMode,
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
