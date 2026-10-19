import { describe, expect, it } from "vitest";

import { idleLabel, idleLevel, idleStatus, idleThresholds, lastStep } from "./idle.js";
import type { SessionMessage } from "./messages.js";

const assistant = (id: string, completed?: number, modelID = "gpt-6-luna"): SessionMessage => ({
  id,
  type: "assistant",
  model: { providerID: "openai", id: modelID },
  time: completed === undefined ? { created: 0 } : { created: 0, completed }
});

describe("last step", () => {
  it("is the latest completed assistant message, with its model", () => {
    const messages = [
      assistant("a", 100, "gpt-6.1-sol"),
      { id: "u", type: "user", time: { created: 150 } },
      assistant("b", 200),
      { id: "i", type: "idle", time: { created: 210 } }
    ];

    expect(lastStep(messages)).toEqual({ completed: 200, model: { providerID: "openai", modelID: "gpt-6-luna" } });
  });

  it("skips a step still in progress and messages a revert removed", () => {
    expect(lastStep([assistant("a", 100), assistant("b")])?.completed).toBe(100);
    expect(lastStep([assistant("a", 100), assistant("b", 200), assistant("c", 300)], "b")?.completed).toBe(100);
  });

  it("is unknown before any assistant message completes", () => {
    expect(lastStep([])).toBeUndefined();
    expect(lastStep([{ id: "u", type: "user", time: { created: 1 } }, assistant("a")])).toBeUndefined();
  });
});

describe("idle label", () => {
  it("shows seconds, then whole minutes, then hours and minutes", () => {
    expect([0, 42.9, 59, 60, 359, 3_599, 3_600, 4_320, 93_900].map(idleLabel)).toEqual([
      "idle 0s",
      "idle 42s",
      "idle 59s",
      "idle 1m",
      "idle 5m",
      "idle 59m",
      "idle 1h",
      "idle 1h 12m",
      "idle 26h 5m"
    ]);
  });

  it("never shows a negative duration when the clock trails the completion time", () => {
    expect(idleLabel(-3)).toBe("idle 0s");
  });
});

describe("idle level", () => {
  const thresholds = { warnAfter: 1_200, expiredAfter: 1_800 };

  it("warns past the warning threshold and expires past the expiry threshold", () => {
    expect([0, 1_200, 1_201, 1_800, 1_801].map((seconds) => idleLevel(seconds, thresholds))).toEqual([
      "fresh",
      "fresh",
      "warning",
      "warning",
      "expired"
    ]);
  });
});

describe("idle thresholds from the learned lifetime", () => {
  const fallback = { warnAfter: 1_200, expiredAfter: 1_800 };

  it("warns at 80% of a known lifetime and expires at it", () => {
    const thresholds = idleThresholds({ type: "point", seconds: 1_500 }, fallback);

    expect([1_199, 1_201, 1_499, 1_501].map((seconds) => idleLevel(seconds, thresholds))).toEqual(["fresh", "warning", "warning", "expired"]);
  });

  it("warns past a lower bound and expires only at a later fallback expiry", () => {
    const short = idleThresholds({ type: "atLeast", seconds: 600 }, fallback);
    const long = idleThresholds({ type: "atLeast", seconds: 12_600 }, fallback);

    expect([599, 601, 1_801].map((seconds) => idleLevel(seconds, short))).toEqual(["fresh", "warning", "expired"]);
    expect([12_599, 12_601, 86_400].map((seconds) => idleLevel(seconds, long))).toEqual(["fresh", "warning", "warning"]);
  });

  it("uses the options while the lifetime is unknown", () => {
    expect(idleThresholds({ type: "unknown" }, fallback)).toEqual(fallback);
    expect(idleThresholds(undefined, fallback)).toEqual(fallback);
  });
});

describe("idle status", () => {
  const thresholds = { warnAfter: 1_200, expiredAfter: 1_800 };
  const luna = { providerID: "openai", modelID: "gpt-6-luna" };

  it("says the next request starts a new cache when the selected model differs, however short the wait", () => {
    expect(idleStatus(360, thresholds, luna, { providerID: "openai", modelID: "gpt-6.1-sol" })).toEqual({ text: "idle 6m · new model", level: "warning" });
    expect(idleStatus(360, thresholds, luna, { providerID: "azure", modelID: "gpt-6-luna" }).level).toBe("warning");
  });

  it("follows the thresholds when the selected model is the last one used, in another variant, or unknown", () => {
    const high = { ...luna, variant: "high" };

    expect(idleStatus(360, thresholds, luna, luna)).toEqual({ text: "idle 6m", level: "fresh" });
    expect(idleStatus(1_300, thresholds, luna, high)).toEqual({ text: "idle 21m", level: "warning" });
    expect(idleStatus(1_900, thresholds, luna, undefined)).toEqual({ text: "idle 31m", level: "expired" });
  });
});
