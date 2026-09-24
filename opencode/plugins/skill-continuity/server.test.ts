import { describe, expect, it } from "vitest";
import type { Plugin } from "@opencode/plugin";
import type { SessionContext } from "@opencode/plugin/promise/session";
import { setupSkillContinuity } from "./server.js";

type ToolEvent = Parameters<Parameters<Plugin.Context["tool"]["hook"]>[1]>[0];

type ContextEvent = SessionContext;

type Message = Awaited<ReturnType<Plugin.Context["session"]["context"]>>[number];

type Stored = Awaited<ReturnType<Plugin.Context["storage"]["get"]>>;

function harness(storage = new Map<string, Stored>()) {
  const history = new Map<string, Message[]>();
  let onLoad: (event: ToolEvent) => void | Promise<void> = () => {};

  let onContext: (event: ContextEvent) => void | Promise<void> = () => {};

  // SAFETY: The plugin uses only these three context capabilities; the harness implements their exercised methods.
  const ctx = {
    storage: {
      get: async (key: string) => storage.get(key),
      set: async (key: string, value: Exclude<Stored, undefined>) => { storage.set(key, value); },
    },
    tool: {
      hook: async (_name: string, callback: typeof onLoad) => {
        onLoad = callback;

        return { dispose: async () => {} };
      },
    },
    session: {
      context: async ({ sessionID }: { sessionID: string }) => history.get(sessionID) ?? [],
      hook: async (_name: string, callback: typeof onContext) => {
        onContext = callback;

        return { dispose: async () => {} };
      },
    },
  } as Plugin.Context;

  return {
    storage,
    async start() { return setupSkillContinuity(ctx); },
    async load(sessionID: string, id: string, status: "completed" | "error" = "completed") {
      // SAFETY: The hook reads only sessionID, tool, status, and input; other SDK event fields are irrelevant here.
      await onLoad({ sessionID, tool: "skill", status, input: { id } } as ToolEvent);
    },
    async wrongTool(sessionID: string) {
      // SAFETY: This hook exits on tool name before accessing any other event fields.
      await onLoad({ sessionID, tool: "read", status: "completed", input: { id: "orchestrator-mode" } } as ToolEvent);
    },
    compact(sessionID: string, id: string, status: "completed" | "running" | "error" = "completed") {
      const messages = history.get(sessionID) ?? [];

      // SAFETY: The checkpoint reader accesses only id, type, and status.
      messages.push({ id, type: "compaction", status } as Message);
      history.set(sessionID, messages);
    },
    async request(sessionID: string) {
      const system: ContextEvent["system"] = [];

      // SAFETY: The hook accesses only sessionID and the mutable system array.
      await onContext({ sessionID, system } as ContextEvent);

      return system.map((part) => part.type === "text" ? part.text : "").join("\n");
    },
  };
}

describe("skill continuity", () => {
  it("reminds only for successful loads before a completed checkpoint", async () => {
    const app = harness();
    await app.start();
    await app.wrongTool("s1");
    await app.load("s1", "failed", "error");
    await app.load("s1", "orchestrator-mode");
    expect(await app.request("s1")).toBe("");

    app.compact("s1", "pending", "running");
    app.compact("s1", "bad", "error");
    expect(await app.request("s1")).toBe("");

    app.compact("s1", "done");
    expect(await app.request("s1")).toContain("Immediately reload these previously loaded skills with the skill tool: orchestrator-mode");
    expect(await app.request("s1")).toContain("orchestrator-mode");
    expect(await app.request("s1")).not.toContain("failed");
  });

  it("retains mandatory pending across retries and restart until each successful reload", async () => {
    const storage = new Map<string, Stored>();
    const first = harness(storage);
    await first.start();
    await first.load("s1", "orchestrator-mode");
    await first.load("s1", "orchestrator-task-evidence");
    first.compact("s1", "one");
    expect(await first.request("s1")).toContain("orchestrator-task-evidence");
    await first.load("s1", "orchestrator-mode", "error");
    expect(await first.request("s1")).toContain("orchestrator-mode");

    const second = harness(storage);
    await second.start();
    second.compact("s1", "one");
    expect(await second.request("s1")).toContain("orchestrator-mode");
    await second.load("s1", "orchestrator-mode");
    expect(await second.request("s1")).not.toContain("orchestrator-mode");
    expect(await second.request("s1")).toContain("orchestrator-task-evidence");
    await second.load("s1", "orchestrator-task-evidence");
    expect(await second.request("s1")).toBe("");
    second.compact("s1", "two");
    expect(await second.request("s1")).toContain("orchestrator-mode");
  });

  it("suggests optional skills once per checkpoint and only within their session", async () => {
    const storage = new Map<string, Stored>();
    const app = harness(storage);
    await app.start();
    await app.load("s1", "anti-slop");
    app.compact("s1", "one");
    app.compact("s2", "another");
    expect(await app.request("s2")).toBe("");
    expect(await app.request("s1")).toContain("Reload only those still relevant");
    expect(await app.request("s1")).toBe("");

    const restarted = harness(storage);
    await restarted.start();
    restarted.compact("s1", "one");
    expect(await restarted.request("s1")).toBe("");

    app.compact("s1", "two");
    expect(await app.request("s1")).toContain("anti-slop");
    await app.load("s1", "technical-writing");
    expect(await app.request("s1")).toBe("");
    app.compact("s1", "three");
    expect(await app.request("s1")).toContain("technical-writing");
  });

  it("does not fail a skill call if bookkeeping storage fails", async () => {
    const storage = new Map<string, Stored>();
    storage.set = () => { throw new Error("storage unavailable"); };

    const app = harness(storage);
    const errors: string[] = [];
    const original = console.error;
    console.error = (message: string) => { errors.push(message); };

    try {
      await app.start();
      await expect(app.load("s1", "orchestrator-mode")).resolves.toBeUndefined();
      app.compact("s1", "one");
      expect(await app.request("s1")).toBe("");
      expect(errors).toContain("[skill-continuity] unable to update session state");
    } finally {
      console.error = original;
    }
  });

  it("serializes simultaneous loads and reminder preparations", async () => {
    const app = harness();
    await app.start();
    await Promise.all([app.load("s1", "anti-slop"), app.load("s1", "orchestrator-mode")]);
    app.compact("s1", "one");
    const results = await Promise.all([app.request("s1"), app.request("s1")]);
    expect(results.filter((text) => text.includes("anti-slop"))).toHaveLength(1);
    expect(results.filter((text) => text.includes("orchestrator-mode"))).toHaveLength(2);
  });
});
