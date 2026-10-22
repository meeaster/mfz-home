// Measures the tokens each Claude Code turn used, per model, so OpenCode usage tools can price a turn the way they
// price any other provider's steps. One OpenCode step runs a whole Claude Code turn of many model calls, and the
// step's own token counts hold only the last call, which OpenCode reads as the context size.
import type { ModelUsage, SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export const Tokens = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative(),
});

export type Tokens = z.infer<typeof Tokens>;

// A session's running token totals by model.
export const Totals = z.record(z.string(), Tokens);

export type Totals = z.infer<typeof Totals>;

// A model's tokens in one turn. `context` is the largest prompt of any single call to it, which decides prices that
// change with the context size.
export type ModelTurn = Tokens & { context?: number };

export type TurnUsage = Record<string, ModelTurn>;

const NONE: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

// Claude Code reports cumulative usage by model with each result, carried over from the transcript when a process
// resumes the session, so a turn's usage is what its result adds to the totals before it.
export class UsageMeter {
  private readonly peaks = new Map<string, number>();

  constructor(private totals: Totals) {}

  observe(message: SDKMessage) {
    if (message.type !== "assistant") return;

    const { model, usage } = message.message;
    const prompt = usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);

    this.peaks.set(model, Math.max(this.peaks.get(model) ?? 0, prompt));
  }

  // The turn's usage and the session's new totals.
  settle(result: SDKResultMessage) {
    const turn: TurnUsage = {};
    const totals: Totals = { ...this.totals };

    for (const [key, usage] of Object.entries(result.modelUsage)) {
      const model = usage.canonicalModel ?? key;
      const current = tokensOf(usage);
      const added = difference(current, this.totals[model] ?? NONE);

      // A total that went down, such as a crashed run's zeroed usage, leaves the running total as it was.
      if (!added) continue;

      totals[model] = current;

      if (added.input + added.output + added.cacheRead + added.cacheWrite === 0) continue;

      const context = this.peaks.get(key) ?? this.peaks.get(model);

      turn[model] = context === undefined ? added : { ...added, context };
    }

    this.peaks.clear();
    this.totals = totals;

    return { turn, totals };
  }
}

// Output tokens include thinking tokens, which are billed as output.
function tokensOf(usage: ModelUsage): Tokens {
  return {
    input: usage.inputTokens,
    output: usage.outputTokens,
    cacheRead: usage.cacheReadInputTokens,
    cacheWrite: usage.cacheCreationInputTokens,
  };
}

function difference(current: Tokens, before: Tokens): Tokens | undefined {
  const added = {
    input: current.input - before.input,
    output: current.output - before.output,
    cacheRead: current.cacheRead - before.cacheRead,
    cacheWrite: current.cacheWrite - before.cacheWrite,
  };

  return Object.values(added).every((value) => value >= 0) ? added : undefined;
}
