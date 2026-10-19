import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Observation } from "./cache-lifetime.js";
import { createLifetimeStore, lifetimeStatePath, STATE_VERSION, type LifetimeState } from "./lifetime-store.js";

const observation = (id: string, at = 1_000): Observation => ({ id, sessionID: "ses", model: "openai/gpt-6-luna", at, gap: 600, share: 0.99 });

const tail = (id: string, completed: number) => ({ id, model: "openai/gpt-6-luna", completed, prompt: 50_000 });

const temporaryPath = async () => join(await mkdtemp(join(tmpdir(), "lifetime-store-test-")), "state", "cache-lifetimes.json");

describe("lifetime state file", () => {
  it("lives under XDG_STATE_HOME, or ~/.local/state when it is unset", () => {
    expect(lifetimeStatePath("/state")).toBe("/state/opencode-session-usage/cache-lifetimes.json");
    expect(lifetimeStatePath("")).toMatch(/\/\.local\/state\/opencode-session-usage\/cache-lifetimes\.json$/);
  });

  it("reads back what it wrote", async () => {
    const store = createLifetimeStore(await temporaryPath());

    const state: LifetimeState = {
      observations: [observation("a")],
      checkpoints: { ses: { updated: 5, tail: tail("a", 4) }, small: { updated: 3 } },
      watermark: 5,
      estimates: { computedAt: 6, models: { "openai/gpt-6-luna": { lifetime: { type: "atLeast", seconds: 600 }, buckets: [{ from: 60, to: 120, hits: 1, misses: 0 }] } } }
    };

    await store.write(state);

    expect(await store.read()).toEqual(state);
  });

  it("keeps what another OpenCode saved: every observation, each session's newer checkpoint and the later watermark", async () => {
    const path = await temporaryPath();
    const first = createLifetimeStore(path);
    const second = createLifetimeStore(path);

    await first.write({
      observations: [observation("a"), observation("b")],
      checkpoints: { one: { updated: 10, tail: tail("b", 9) }, two: { updated: 1 } },
      watermark: 10
    });

    const merged = await second.write({
      observations: [observation("c", 2_000)],
      checkpoints: { one: { updated: 5 }, two: { updated: 20, tail: tail("x", 19) } },
      watermark: 8
    });

    expect(merged.observations.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(merged.checkpoints).toEqual({ one: { updated: 10, tail: tail("b", 9) }, two: { updated: 20, tail: tail("x", 19) } });
    expect(merged.watermark).toBe(10);
    expect(await first.read()).toEqual(merged);
  });

  it("ignores a file of another version or a truncated one", async () => {
    const path = await temporaryPath();
    const store = createLifetimeStore(path);

    await store.write({ observations: [observation("a")], checkpoints: {} });
    await writeFile(path, JSON.stringify({ version: STATE_VERSION + 1, observations: [], checkpoints: {} }));
    expect(await store.read()).toBeUndefined();

    await writeFile(path, `{"version":${STATE_VERSION},"observations":[{"id"`);
    expect(await store.read()).toBeUndefined();
  });
});
