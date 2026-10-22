// State shared by the plugin entry point and the provider module. OpenCode imports the provider module on
// its own, so the two can hold different module instances; the registry therefore lives on globalThis.
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import type { Plugin } from "@opencode/plugin";
import type { SessionRuntime } from "./runtime.js";

export const PROVIDER_ID = "claude-code";

export const MIRROR_MODEL_ID = "subagent-mirror";

// Key of this provider's entry in providerMetadata and providerOptions.
export const METADATA_KEY = "claude-code";

// Text of the synthetic message that wakes an OpenCode session when Claude Code produced output on its own. The
// provider recognizes it and never forwards it to Claude.
export const WAKE_TEXT = "<claude-code-background-output/>";

// Replays one Claude Code subagent's transcript into the OpenCode child session that shows it.
export class MirrorChannel {
  private readonly parts: LanguageModelV3StreamPart[] = [];

  private readonly waiters = new Set<() => void>();

  private done = false;

  push(part: LanguageModelV3StreamPart) {
    if (this.done) return;

    this.parts.push(part);
    this.wake();
  }

  end() {
    this.done = true;
    this.wake();
  }

  async *read(signal?: AbortSignal) {
    let index = 0;

    while (true) {
      while (index < this.parts.length) yield this.parts[index++];

      if (this.done || signal?.aborted) return;

      await new Promise<void>((resolve) => {
        this.waiters.add(resolve);
        signal?.addEventListener("abort", () => resolve(), { once: true });
      });
    }
  }

  private wake() {
    for (const resolve of this.waiters) resolve();

    this.waiters.clear();
  }
}

type Registry = {
  context?: Plugin.Context;
  mirrors: Map<string, MirrorChannel>;
  // Claude Code processes, keyed by OpenCode session.
  runtimes: Map<string, SessionRuntime>;
};

declare global {
  var claudeCodeProvider: Registry | undefined;
}

export function registry(): Registry {
  globalThis.claudeCodeProvider ??= { mirrors: new Map(), runtimes: new Map() };

  return globalThis.claudeCodeProvider;
}
