import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { ModelLifetime } from "./cache-lifetime.js";
import { createLifetimeLearner } from "./lifetime-learner.js";
import { createLifetimeStore } from "./lifetime-store.js";
import type { SessionMessage } from "./messages.js";

const NOW = Date.UTC(2026, 9, 19);

const MINUTE = 60_000;

const DAY = 86_400_000;

type Session = { id: string; parentID?: string; updated: number; prompt: number; messages: SessionMessage[] };

type ListInput = { sessionID: string; limit: number; order?: "asc" | "desc"; cursor?: string };

/** An in-memory server that lists sessions and pages messages the way OpenCode's endpoints do. */
function fakeServer(sessions: Session[]) {
  const byID = new Map(sessions.map((session) => [session.id, session]));
  const reads: ListInput[] = [];

  const info = (session: Session) => ({
    id: session.id,
    time: { updated: session.updated },
    tokens: { input: session.prompt, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
  });

  const client = {
    session: {
      async list(input: { limit: number; cursor?: string }) {
        const ordered = [...byID.values()].sort((left, right) => right.updated - left.updated);
        const start = input.cursor === undefined ? 0 : Number(input.cursor);
        const data = ordered.slice(start, start + input.limit).map(info);

        return { data, cursor: { next: start + input.limit < ordered.length ? String(start + input.limit) : undefined } };
      },
      async get(input: { sessionID: string }) {
        const session = byID.get(input.sessionID);

        if (!session) throw new Error("not found");

        return info(session);
      }
    },
    message: {
      async list(input: ListInput) {
        reads.push(input);
        const all = byID.get(input.sessionID)?.messages ?? [];
        const [cursorOrder, cursorID] = input.cursor?.split(":") ?? [];
        const order = cursorID === undefined ? input.order ?? "desc" : cursorOrder === "asc" ? "asc" : "desc";
        const ordered = order === "asc" ? all : all.toReversed();
        const start = cursorID === undefined ? 0 : ordered.findIndex((message) => message.id === cursorID) + 1;
        const data = ordered.slice(start, start + input.limit);
        const last = data.at(-1);

        return { data, cursor: { next: last && start + input.limit < ordered.length ? `${order}:${last.id}` : undefined } };
      }
    }
  };

  // SAFETY: The fake implements the subset of the generated client the learner uses.
  return { byID, reads, client: client as never };
}

const step = (id: string, minutesAgo: number, read = 0): SessionMessage => ({
  id,
  type: "assistant",
  model: { providerID: "openai", id: "gpt-6-luna" },
  time: { created: NOW - minutesAgo * MINUTE, completed: NOW - minutesAgo * MINUTE + 1_000 },
  tokens: { input: 100_000 - read, output: 100, reasoning: 0, cache: { read, write: 0 } }
});

const learn = async (server: ReturnType<typeof fakeServer>, path: string) => {
  let latest: Record<string, ModelLifetime> = {};

  const learner = createLifetimeLearner({
    client: server.client,
    store: createLifetimeStore(path),
    now: () => NOW,
    startDelay: 0,
    pause: 0,
    saveDelay: 0,
    onEstimates: (models) => { latest = models; }
  });

  await learner.loaded;

  return { learner, estimates: () => latest };
};

describe("lifetime learner", () => {
  it("learns from sessions updated in the last 30 days, subagents included, and later reads only what follows a checkpoint", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "lifetime-learner-test-")), "cache-lifetimes.json");

    const server = fakeServer([
      { id: "root", updated: NOW - DAY, prompt: 300_000, messages: [step("r1", 200), step("r2", 189, 99_000)] },
      { id: "child", parentID: "root", updated: NOW - DAY, prompt: 300_000, messages: [step("c1", 100), step("c2", 89, 99_000), step("c3", 78, 99_000)] },
      { id: "tiny", updated: NOW - DAY, prompt: 1_000, messages: [step("t1", 50)] },
      { id: "old", updated: NOW - 40 * DAY, prompt: 300_000, messages: [step("o1", 60_000), step("o2", 59_990, 99_000)] }
    ]);

    const first = await learn(server, path);

    // Three 11-minute gaps that hit: the root's and two of its subagent's.
    await vi.waitFor(() => expect(first.estimates()["openai/gpt-6-luna"]?.buckets.find((bucket) => bucket.from === 10 * 60)?.hits).toBeGreaterThan(2.9));
    await first.learner.dispose();

    expect(new Set(server.reads.map(({ sessionID }) => sessionID))).toEqual(new Set(["root", "child"]));

    const child = server.byID.get("child");

    if (!child) throw new Error("missing child");

    child.messages.push(step("c4", 30));
    child.updated = NOW;
    server.reads.length = 0;

    const second = await learn(server, path);

    await vi.waitFor(() => expect(server.reads).toEqual([{ sessionID: "child", limit: 20, order: "desc" }]));
    // The new step missed after 47 minutes, and what the first learner saved is still counted.
    await vi.waitFor(() => expect(second.estimates()["openai/gpt-6-luna"]?.buckets.find((bucket) => bucket.from === 45 * 60)?.misses).toBeGreaterThan(0.9));
    expect(second.estimates()["openai/gpt-6-luna"]?.buckets.find((bucket) => bucket.from === 10 * 60)?.hits).toBeGreaterThan(2.9);
    await second.learner.dispose();
  });
});
