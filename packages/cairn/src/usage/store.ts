import type { SessionKey } from "../schemas.ts";
import { transaction, type Cairn } from "../core/db.ts";
import { ensureSession } from "../core/sessions.ts";
import type { CallTokens, Pricer } from "./pricing.ts";

export type ModelCall = {
  readonly provider: string;
  readonly model: string;
  readonly tokens: CallTokens;
};

// One session's own calls: a root session's main agent, or one subagent. parent is null for the root.
export type SessionUsage = {
  readonly key: SessionKey;
  readonly parent: SessionKey | null;
  readonly agent: string | undefined;
  readonly title: string | undefined;
  readonly calls: readonly ModelCall[];
};

type ModelTotal = {
  provider: string;
  model: string;
  calls: number;
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  unpriced: number;
};

function totals(calls: readonly ModelCall[], price: Pricer): ModelTotal[] {
  const byModel = new Map<string, ModelTotal>();

  for (const call of calls) {
    const key = `${call.provider}\n${call.model}`;

    const total = byModel.get(key) ?? {
      provider: call.provider,
      model: call.model,
      calls: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0,
      unpriced: 0
    };

    const dollars = price(call.provider, call.model, call.tokens);

    total.calls += 1;
    total.input += call.tokens.input;
    total.output += call.tokens.output;
    total.reasoning += call.tokens.reasoning;
    total.cacheRead += call.tokens.cacheRead;
    total.cacheWrite += call.tokens.cacheWrite + call.tokens.cacheWriteLong;

    if (dollars === null) {
      total.unpriced += 1;
    } else {
      total.cost += dollars;
    }

    byModel.set(key, total);
  }

  return [...byModel.values()];
}

// Replaces each session's usage rows with its current totals, registering subagents the catalog hasn't seen.
export function recordUsage(cairn: Cairn, sessions: readonly SessionUsage[], price: Pricer): void {
  transaction(cairn, () => {
    for (const session of sessions) {
      const sessionId = ensureSession(cairn, session.key, {
        parent: session.parent ?? undefined,
        agent: session.agent,
        title: session.title
      });

      cairn.sql.run`DELETE FROM session_usage WHERE session_id = ${sessionId}`;

      for (const total of totals(session.calls, price)) {
        const cost = total.unpriced === total.calls ? null : total.cost;

        cairn.sql.run`
          INSERT INTO session_usage (session_id, provider, model, calls, input_tokens, output_tokens, reasoning_tokens,
            cache_read_tokens, cache_write_tokens, cost_usd, unpriced_calls)
          VALUES (${sessionId}, ${total.provider}, ${total.model}, ${total.calls}, ${total.input}, ${total.output},
            ${total.reasoning}, ${total.cacheRead}, ${total.cacheWrite}, ${cost}, ${total.unpriced})
        `;
      }
    }
  });
}
