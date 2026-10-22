// Makes OpenCode compaction of a Claude Code session use Claude Code's own `/compact`. Claude Code compacts its
// session in place and its summary becomes OpenCode's checkpoint, so the provider keeps resuming the same, now
// smaller, Claude session instead of starting a new one from OpenCode's summary.
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Plugin } from "@opencode/plugin";
import { z } from "zod";
import { claudeOptions, type Settings } from "./claude-options.js";
import { PROVIDER_ID, registry } from "./registry.js";

type Context = Plugin.Context;

type Message = Awaited<ReturnType<Context["session"]["context"]>>[number];

type Reply = Extract<Message, { type: "assistant" }>;

// What each Claude Code reply records in its providerMetadata.
export const ClaudeTurn = z.object({ sessionId: z.string(), model: z.string() });

type ClaudeTurn = z.infer<typeof ClaudeTurn>;

export function compactedKey(openCodeSession: string) {
  return `compacted:${openCodeSession}`;
}

export async function registerCompaction(context: Context, settings: Settings) {
  return context.session.hook("compaction", async (event) => {
    // The compaction request drops this provider's metadata when another model summarizes, so the session's own
    // history is the record of which Claude session to compact. Only Claude Code sessions are affected: any other
    // session, or one whose history cannot be read, compacts as OpenCode would without this plugin.
    const history = await context.session.context({ sessionID: event.sessionID }).catch(() => undefined);
    const turn = history && latestClaudeTurn(history);

    if (!turn) return;

    try {
      const compacted = await compact(settings, turn, event.sessionID);

      await context.storage.set(compactedKey(event.sessionID), turn.sessionId);

      event.result = {
        summary: compacted.summary,
        metadata: { claudeSession: turn.sessionId, preTokens: compacted.preTokens, postTokens: compacted.postTokens ?? null },
      };
    } catch (error) {
      // Without a result OpenCode summarizes on its own and the provider starts a new Claude session from that.
      console.error(`[claude-code] Claude Code compaction failed for ${event.sessionID}: ${String(error)}`);
    }
  });
}

function latestClaudeTurn(messages: ReadonlyArray<Message>): ClaudeTurn | undefined {
  const reply = messages.findLast((message): message is Reply => message.type === "assistant");

  if (reply?.model.providerID !== PROVIDER_ID) return undefined;

  return ClaudeTurn.safeParse(reply.native).data;
}

// Runs `/compact` on the Claude session: inside the session's running process when there is one, since a second
// process must not resume a session that is still open, otherwise in a process started for it.
async function compact(settings: Settings, turn: ClaudeTurn, openCodeSession: string) {
  const collector = new CompactCollector();
  const runtime = registry().runtimes.get(openCodeSession);

  if (runtime?.alive && !runtime.busy && runtime.sessionId === turn.sessionId) {
    await runtime.turn([{ type: "text", text: "/compact" }], (message) => collector.handle(message));
  } else {
    const options = { ...claudeOptions(settings, turn.model, openCodeSession), resume: turn.sessionId };

    for await (const message of query({ prompt: "/compact", options })) collector.handle(message);
  }

  return collector.result();
}

// Claude Code reports the compaction boundary and then the summary the session continues from.
class CompactCollector {
  private boundary: { pre_tokens: number; post_tokens?: number } | undefined;

  private summary: string | undefined;

  handle(message: SDKMessage) {
    if (message.type === "system" && message.subtype === "compact_boundary") this.boundary = message.compact_metadata;

    if (this.boundary && this.summary === undefined && message.type === "user" && !Array.isArray(message.message.content)) {
      this.summary = message.message.content;
    }
  }

  result() {
    if (!this.boundary || this.summary === undefined) throw new Error("Claude Code did not report a compacted summary");

    return { summary: this.summary, preTokens: this.boundary.pre_tokens, postTokens: this.boundary.post_tokens };
  }
}
