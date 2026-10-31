import { describe, expect, it } from "vitest";

import { estimateLifetimes, extractObservations, lifetimeLabel, type Observation } from "./cache-lifetime.js";
import type { SessionMessage } from "./messages.js";

const MINUTE = 60_000;

/** A completed step at minute `start` that took a second, with `input` uncached tokens and `read` read from cache. */
const step = (id: string, start: number, input: number, read = 0, modelID = "gpt-6-luna", variant?: string): SessionMessage => ({
  id,
  type: "assistant",
  model: variant ? { providerID: "openai", id: modelID, variant } : { providerID: "openai", id: modelID },
  time: { created: start * MINUTE, completed: start * MINUTE + 1_000 },
  tokens: { input, output: 500, reasoning: 0, cache: { read, write: 0 } }
});

const user = (id: string, start: number): SessionMessage => ({ id, type: "user", time: { created: start * MINUTE } });

const gaps = (messages: SessionMessage[], boundary?: string) => extractObservations("ses", messages, { boundary }).observations.map(({ id, gap }) => [id, gap]);

describe("observation extraction", () => {
  it("pairs consecutive steps on one model across user messages, measuring the idle gap and the cached share", () => {
    const { observations } = extractObservations("ses", [step("a", 0, 100_000), user("u", 5), step("b", 10, 1_000, 99_000)]);

    expect(observations).toEqual([{ id: "b", sessionID: "ses", model: "openai/gpt-6-luna", at: 10 * MINUTE, gap: 599, share: 0.99 }]);
  });

  it("starts over after a compaction, an agent switch, or an unfinished step", () => {
    const unfinished: SessionMessage = { id: "x", type: "assistant", model: { providerID: "openai", id: "gpt-6-luna" }, time: { created: 12 * MINUTE } };

    expect(gaps([step("a", 0, 100_000), { id: "c", type: "compaction", status: "completed", time: { created: 5 * MINUTE } }, step("b", 10, 100_000)])).toEqual([]);
    expect(gaps([step("a", 0, 100_000), { id: "s", type: "agent-switched", time: { created: 5 * MINUTE } }, step("b", 10, 100_000)])).toEqual([]);
    expect(gaps([step("a", 0, 100_000), unfinished, step("b", 20, 100_000)])).toEqual([]);
  });

  it("skips pairs whose model or variant changed", () => {
    expect(gaps([step("a", 0, 100_000), step("b", 10, 100_000, 0, "gpt-6.1-sol")])).toEqual([]);
    expect(gaps([step("a", 0, 100_000, 0, "gpt-6-luna", "high"), step("b", 10, 100_000, 0, "gpt-6-luna", "low")])).toEqual([]);
  });

  it("skips small earlier prompts, which are mostly the shared system prompt, and gaps under a minute", () => {
    expect(gaps([step("a", 0, 19_000), step("b", 10, 100_000)])).toEqual([]);
    expect(gaps([step("a", 0, 100_000), step("b", 0.5, 100_000)])).toEqual([]);
  });

  it("leaves out pairs from the revert boundary on, and everything when the boundary precedes the messages", () => {
    const messages = [step("a", 0, 100_000), step("b", 10, 100_000), step("c", 20, 100_000)];

    expect(gaps(messages, "c")).toEqual([["b", 599]]);
    expect(gaps(messages, "earlier")).toEqual([]);
  });

  it("reads on from a checkpoint's tail, which stays the latest completed step past a later reset", () => {
    const first = extractObservations("ses", [step("a", 0, 100_000), { id: "c", type: "compaction", time: { created: 5 * MINUTE } }]);

    expect(first.tail?.id).toBe("a");

    const next = extractObservations("ses", [step("b", 30, 100_000)], { tail: extractObservations("ses", [step("a", 0, 100_000)]).tail });

    expect(next.observations.map(({ id, gap }) => [id, gap])).toEqual([["b", 1_799]]);
    expect(next.tail?.id).toBe("b");
  });
});

const NOW = Date.UTC(2026, 9, 19);

let sequence = 0;

/** An observation `daysAgo` before now, spread a few minutes apart so none fall in the same minute by accident. */
const seen = (minutes: number, share: number, daysAgo = 1, model = "openai/m"): Observation => {
  sequence += 1;

  return { id: `o${sequence}`, sessionID: `s${sequence}`, model, at: NOW - daysAgo * 86_400_000 - sequence * 7 * MINUTE, gap: minutes * 60, share };
};

const repeat = (count: number, make: () => Observation) => Array.from({ length: count }, make);

const lifetime = (observations: Observation[]) => estimateLifetimes(observations, NOW)["openai/m"]?.lifetime;

// What a request after the cache expired reads: only the system prompt and tools other sessions keep warm.
const PREFIX_ONLY = 13_800 / 120_000;

describe("lifetime estimate", () => {
  const warm = () => [...repeat(4, () => seen(4, 0.99)), ...repeat(4, () => seen(12, 0.99)), ...repeat(3, () => seen(18, 0.98))];

  it("is the start of the first gap bucket where misses are the majority, counting prefix-only reads as misses", () => {
    const estimate = estimateLifetimes([...warm(), ...repeat(3, () => seen(25, PREFIX_ONLY))], NOW)["openai/m"];

    expect(estimate?.lifetime).toEqual({ type: "point", seconds: 20 * 60 });
    expect(estimate?.buckets.find((bucket) => bucket.from === 20 * 60)?.misses).toBeGreaterThan(2);
  });

  it("isn't set by a stray miss at a short gap", () => {
    expect(lifetime([...warm(), seen(6, 0), ...repeat(3, () => seen(25, 0))])).toEqual({ type: "point", seconds: 20 * 60 });
  });

  it("is a lower bound at the longest hit when nothing was seen between it and the first expired bucket", () => {
    expect(lifetime([...warm(), seen(50, 0.99), ...repeat(3, () => seen(7 * 60, 0))])).toEqual({ type: "atLeast", seconds: 50 * 60 });
  });

  it("is a lower bound at the longest hit when no bucket has a miss majority", () => {
    expect(lifetime([...warm(), seen(210, 0.97)])).toEqual({ type: "atLeast", seconds: 210 * 60 });
  });

  it("is unknown with too little evidence", () => {
    expect(lifetime([seen(4, 0.99)])).toEqual({ type: "unknown" });
    expect(lifetime([...warm()].map((observation) => ({ ...observation, at: NOW - 100 * 86_400_000 })))).toBeUndefined();
  });

  it("follows recent evidence when a model's lifetime shrinks", () => {
    const before = [...warm(), ...repeat(8, () => seen(35, 0.99, 60))];

    expect(lifetime(before)).toEqual({ type: "atLeast", seconds: 35 * 60 });
    expect(lifetime([...before, ...repeat(3, () => seen(35, 0))])).toEqual({ type: "point", seconds: 30 * 60 });
  });

  it("counts steps of one model that resumed in the same minute as one event", () => {
    const at = NOW - 86_400_000;
    const burst = Array.from({ length: 10 }, (_, index) => ({ ...seen(220, PREFIX_ONLY), at: at + index * 1_000 }));
    const hits = repeat(3, () => seen(220, 0.99));

    expect(lifetime([...warm(), ...hits, ...burst])).toEqual({ type: "atLeast", seconds: 220 * 60 });
  });

  it("keeps models apart", () => {
    const estimates = estimateLifetimes([...warm(), ...repeat(3, () => seen(25, 0, 1, "openai/other"))], NOW);

    expect(estimates["openai/m"]?.lifetime).toEqual({ type: "atLeast", seconds: 18 * 60 });
    expect(estimates["openai/other"]?.lifetime).toEqual({ type: "point", seconds: 20 * 60 });
  });
});

describe("lifetime label", () => {
  it("shows minutes below two hours, then hours to the half hour, and rounds lower bounds down", () => {
    const point = (minutes: number) => lifetimeLabel({ type: "point", seconds: minutes * 60 });
    const atLeast = (minutes: number) => lifetimeLabel({ type: "atLeast", seconds: minutes * 60 });

    expect([point(0.4), point(25), point(90), point(150), point(180), point(13 * 60 + 20)]).toEqual(["1M", "25M", "90M", "2.5H", "3H", "13H"]);
    expect([atLeast(50.9), atLeast(3.6 * 60), lifetimeLabel({ type: "unknown" })]).toEqual(["≥50M", "≥3.5H", "?"]);
  });
});
