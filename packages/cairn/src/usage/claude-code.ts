import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { SessionKey } from "../schemas.ts";
import type { ModelCall, SessionUsage } from "./store.ts";

const usage = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_input_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
  cache_creation: z.object({ ephemeral_5m_input_tokens: z.number().optional(), ephemeral_1h_input_tokens: z.number().optional() }).optional()
});

const assistantEntry = z.object({
  type: z.literal("assistant"),
  message: z.object({ id: z.string(), model: z.string(), usage })
});

const subagentMeta = z.object({ agentType: z.string().optional(), description: z.string().optional(), parentAgentId: z.string().optional() });

// Claude Code's placeholder for a message it wrote itself, which no model call produced.
const syntheticModel = "<synthetic>";

function claudeKey(nativeId: string): SessionKey {
  return { harness: "claude-code", nativeId };
}

// The calls in one transcript. Claude Code writes a line for each content block of a response, all carrying the
// response's usage, so each response ID counts once, with its last line's usage. A response from a branch a
// rewind left behind still counts: it was billed.
function calls(transcript: string): ModelCall[] {
  const responses = new Map<string, ModelCall>();

  for (const line of readFileSync(transcript, "utf8").split("\n")) {
    if (!line.includes('"usage"')) {
      continue;
    }

    let value: unknown;

    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }

    const entry = assistantEntry.safeParse(value);

    if (!entry.success || entry.data.message.model === syntheticModel) {
      continue;
    }

    const counts = entry.data.message.usage;
    const long = counts.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    const written = counts.cache_creation?.ephemeral_5m_input_tokens ?? (counts.cache_creation_input_tokens ?? 0) - long;

    responses.set(entry.data.message.id, {
      provider: "anthropic",
      model: entry.data.message.model,
      tokens: {
        input: counts.input_tokens,
        output: counts.output_tokens,
        reasoning: 0,
        cacheRead: counts.cache_read_input_tokens ?? 0,
        cacheWrite: Math.max(0, written),
        cacheWriteLong: long
      }
    });
  }

  return [...responses.values()];
}

function meta(path: string): z.infer<typeof subagentMeta> {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const parsed = subagentMeta.safeParse(JSON.parse(readFileSync(path, "utf8")));

    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

// A Claude Code session's usage: the main agent's from its transcript, and each subagent's from the transcript
// Claude Code keeps beside it, under the subagent that spawned it.
export function readClaudeCodeUsage(transcript: string, sessionId: string): SessionUsage[] {
  const root = claudeKey(sessionId);
  const sessions: SessionUsage[] = [{ key: root, parent: null, agent: undefined, title: undefined, calls: calls(transcript) }];
  const folder = join(dirname(transcript), sessionId, "subagents");

  if (!existsSync(folder)) {
    return sessions;
  }

  for (const name of readdirSync(folder)) {
    const agentId = /^agent-(.+)\.jsonl$/.exec(name)?.[1];

    if (agentId === undefined) {
      continue;
    }

    const facts = meta(join(folder, `agent-${agentId}.meta.json`));

    sessions.push({
      key: claudeKey(agentId),
      parent: facts.parentAgentId === undefined ? root : claudeKey(facts.parentAgentId),
      agent: facts.agentType,
      title: facts.description,
      calls: calls(join(folder, name))
    });
  }

  return sessions;
}
