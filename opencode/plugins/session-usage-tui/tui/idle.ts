import type { Lifetime } from "./cache-lifetime.js";
import type { SessionMessage } from "./messages.js";

/** Idle seconds past which the timer warns, and past which the prompt cache has likely expired. */
export type IdleThresholds = { warnAfter: number; expiredAfter: number };

export type IdleLevel = "fresh" | "warning" | "expired";

/** What the footer shows: the idle text and the level that colors it. */
export type IdleStatus = { text: string; level: IdleLevel };

export type ModelKey = { providerID: string; modelID: string };

/** The session's latest completed step: when it completed and the model it used. */
export type LastStep = { completed: number; model?: ModelKey };

/**
 * The session's latest completed assistant message, leaving out messages from `boundary` on, which a revert removed.
 */
export function lastStep(messages: readonly Pick<SessionMessage, "id" | "type" | "time" | "model">[], boundary?: string): LastStep | undefined {
  const boundaryIndex = boundary === undefined ? -1 : messages.findIndex((message) => message.id === boundary);
  const end = boundaryIndex === -1 ? messages.length : boundaryIndex;

  for (let index = end - 1; index >= 0; index--) {
    const message = messages[index];
    const completed = message?.time?.completed;

    if (message?.type !== "assistant" || completed === undefined) continue;

    const providerID = message.model?.providerID;
    const modelID = message.model?.id;

    return providerID && modelID ? { completed, model: { providerID, modelID } } : { completed };
  }

  return undefined;
}

/** An idle duration in seconds, compactly: "idle 42s", "idle 6m", "idle 1h 12m". */
export function idleLabel(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));

  if (whole < 60) return `idle ${whole}s`;

  const minutes = Math.floor(whole / 60);

  if (minutes < 60) return `idle ${minutes}m`;

  const rest = minutes % 60;

  return `idle ${Math.floor(minutes / 60)}h${rest === 0 ? "" : ` ${rest}m`}`;
}

/** How stale an idle duration is: past `warnAfter` seconds it warns, past `expiredAfter` it has expired. */
export function idleLevel(seconds: number, thresholds: IdleThresholds): IdleLevel {
  if (seconds > thresholds.expiredAfter) return "expired";

  if (seconds > thresholds.warnAfter) return "warning";

  return "fresh";
}

/**
 * The thresholds for a model's learned lifetime. A known lifetime warns at 80% of it and expires at it. A lower bound
 * warns past it, beyond what has been seen, and expires only at `fallback`'s expiry when that is later. An unknown
 * lifetime uses `fallback`.
 */
export function idleThresholds(lifetime: Lifetime | undefined, fallback: IdleThresholds): IdleThresholds {
  if (lifetime?.type === "point") return { warnAfter: 0.8 * lifetime.seconds, expiredAfter: lifetime.seconds };

  if (lifetime?.type === "atLeast") {
    return { warnAfter: lifetime.seconds, expiredAfter: fallback.expiredAfter > lifetime.seconds ? fallback.expiredAfter : Infinity };
  }

  return fallback;
}

/**
 * The footer's idle text and level. When the prompt's selected model isn't the one the session last used, the next
 * request can't reuse the cache however long the session waited, so it says so in the warning color.
 */
export function idleStatus(
  seconds: number,
  thresholds: IdleThresholds,
  last: ModelKey | undefined,
  selected: ModelKey | undefined
): IdleStatus {
  const label = idleLabel(seconds);

  if (last && selected && (last.providerID !== selected.providerID || last.modelID !== selected.modelID)) {
    return { text: `${label} · new model`, level: "warning" };
  }

  return { text: label, level: idleLevel(seconds, thresholds) };
}
