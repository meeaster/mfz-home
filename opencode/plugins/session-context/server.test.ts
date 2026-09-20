import { describe, expect, it } from "vitest";

import { formatSessionContext, readSessionContext } from "./server.js";
import type { SessionContextMessage, SessionContextSource } from "./server.js";

const created = 1_000;

function message<T extends SessionContextMessage>(message: T) {
  return message;
}

function user(id: string, text: string): SessionContextMessage {
  // SAFETY: This fixture supplies decoded public user-message fields; test IDs are plain strings in place of branded IDs.
  return message({ type: "user", id, text, time: { created }, metadata: undefined } as SessionContextMessage);
}

function assistant(
  id: string,
  text: string,
  options: { completed?: number; toolStatus?: "streaming" | "running" | "completed" | "error" } = {},
): SessionContextMessage {
  type AssistantPart = Extract<SessionContextMessage, { type: "assistant" }>["content"][number];

  const parts: AssistantPart[] = [{ type: "text", text, state: {} }];

  if (options.toolStatus) {
    parts.push({
      type: "tool",
      id: `${id}-tool`,
      name: "read",
      executed: true,
      state:
        options.toolStatus === "streaming"
          ? { status: "streaming", input: "{}" }
          : options.toolStatus === "running"
            ? { status: "running", input: {}, metadata: {} }
            : options.toolStatus === "completed"
              ? { status: "completed", input: {}, content: [{ type: "text", text: "done" }], metadata: undefined }
              : { status: "error", input: {}, error: { type: "Error", message: "failed" }, content: undefined, metadata: undefined },
      providerState: undefined,
      providerResultState: undefined,
      time: { created },
    });
  }

  // SAFETY: This fixture supplies decoded public assistant fields; test IDs and agent/model IDs are plain strings in place of branded IDs.
  return message({
    type: "assistant",
    id,
    agent: "worker",
    model: { providerID: "openai", id: "model" },
    content: parts,
    time: { created, completed: options.completed },
    metadata: undefined,
  } as SessionContextMessage);
}

function synthetic(id: string, text: string): SessionContextMessage {
  // SAFETY: This fixture supplies decoded public synthetic-message fields; test IDs are plain strings in place of branded IDs.
  return message({ type: "synthetic", id, text, description: undefined, time: { created }, metadata: undefined } as SessionContextMessage);
}

function skill(id: string): SessionContextMessage {
  // SAFETY: This fixture supplies decoded public skill-message fields; test IDs and skill IDs are plain strings in place of branded IDs.
  return message({ type: "skill", id, skill: "demo", name: "demo-skill", text: "secret body", time: { created }, metadata: undefined } as SessionContextMessage);
}

function shell(id: string, status: "running" | "exited" = "exited"): SessionContextMessage {
  // SAFETY: This fixture supplies decoded public shell-message fields; test IDs are plain strings in place of branded IDs.
  return message({
    type: "shell",
    id,
    shellID: "shell",
    command: "printf ok",
    status,
    output: { output: "ok", cursor: 2, size: 2, truncated: false },
    time: { created, completed: status === "running" ? undefined : created + 1 },
    metadata: undefined,
  } as SessionContextMessage);
}

function compaction(id: string, status: "running" | "completed" | "failed"): SessionContextMessage {
  // SAFETY: This fixture supplies decoded public compaction-message fields; test IDs are plain strings in place of branded IDs.
  return message(
    (status === "failed"
      ? {
          type: "compaction",
          id,
          status,
          reason: "manual",
          error: { type: "Error", message: "could not compact" },
          time: { created },
          metadata: undefined,
        }
      : {
          type: "compaction",
          id,
          status,
          reason: "manual",
          summary: "summary",
          recent: "serialized recent",
          time: { created },
          metadata: undefined,
        }) as SessionContextMessage,
  );
}

function system(id: string): SessionContextMessage {
  // SAFETY: This fixture supplies decoded public system-message fields; test IDs are plain strings in place of branded IDs.
  return message({ type: "system", id, text: "catalog noise", description: undefined, time: { created }, metadata: undefined } as SessionContextMessage);
}

function createSessionSource(
  session: { id: string; title?: string },
  messages: readonly SessionContextMessage[],
  failure?: Error,
) {
  const context = {
    session: {
      get: async (_input: { sessionID: string }) => {
        if (failure) throw failure;

        return session;
      },
      context: async (_input: { sessionID: string }) => {
        if (failure) throw failure;

        return messages;
      },
    },
  };

  return context satisfies SessionContextSource;
}

describe("session-context formatter", () => {
  it("renders each supported transcript type and omits compaction recent text", () => {
    const output = formatSessionContext(
      [
        user("u", "hello"),
        synthetic("y", "generated"),
        assistant("a", "answer", { completed: created + 1, toolStatus: "completed" }),
        skill("k"),
        shell("s"),
        compaction("c", "completed"),
      ],
      "Demo",
      "ses_demo",
    );

    expect(output).toContain("[USER]\nhello");
    expect(output).toContain("[SYNTHETIC]\ngenerated");
    expect(output).toContain("[ASSISTANT]");
    expect(output).toContain("TOOL CALL read: {}");
    expect(output).toContain("TOOL RESULT: done");
    expect(output).toContain("[SKILL] demo-skill (body omitted — load via the skill tool)");
    expect(output).toContain("[SHELL] printf ok (exited) ok");
    expect(output).toContain("[COMPACTION SUMMARY] summary");
    expect(output).not.toContain("serialized recent");
  });

  it("skips reasoning while rendering tool errors, attachments, and bounded prefixes", () => {
    const longResult = "x".repeat(500);
    const result = assistant("a", "answer", { completed: created + 1 });

    const output = formatSessionContext(
      [
        // SAFETY: This fixture supplies decoded public user-message fields; test IDs and attachment IDs are plain strings in place of branded IDs.
        message({
          type: "user",
          id: "u",
          text: "hello",
          files: [{ data: "", mime: "text/plain", source: { type: "inline" }, name: "notes.txt" }],
          agents: [{ name: "worker", mention: undefined }],
          skills: [{ id: "skill", name: "demo", text: undefined, mention: undefined }],
          time: { created },
          metadata: undefined,
        } as SessionContextMessage),
        // SAFETY: This fixture supplies decoded public assistant fields; test IDs are plain strings in place of branded IDs.
        message({
          ...result,
          content: [
            { type: "reasoning", text: "thinking", state: {}, time: undefined },
            { type: "tool", id: "tool", name: "read", executed: true, state: { status: "error", input: {}, error: { type: "Error", message: "failed" }, content: [{ type: "text", text: longResult }], metadata: undefined }, providerState: undefined, providerResultState: undefined, time: { created } },
          ],
        } as SessionContextMessage),
      ],
      "Demo",
      "ses_demo",
    );

    expect(output).toContain("ATTACHMENTS: notes.txt");
    expect(output).toContain("AGENTS: worker");
    expect(output).toContain("SKILLS: demo");
    expect(output).not.toContain("thinking");
    expect(output).toContain("… (truncated)");
  });

  it("filters control rows while retaining their marker positions", () => {
    const output = formatSessionContext([user("u", "hello"), system("sys"), user("v", "world")], "Demo", "ses_demo");

    expect(output).not.toContain("catalog noise");
    expect(output).toContain("CONTEXT: 3 messages, active post-compaction window");
    expect(output).toContain("MARKER: v");
  });

  it.each([
    [assistant("a", "answer"), "assistant"],
    [assistant("a", "answer", { completed: created + 1, toolStatus: "running" }), "assistant tool"],
    [compaction("c", "running"), "compaction"],
    [shell("s", "running"), "shell"],
  ])("does not settle an in-flight %s row", (row) => {
    const output = formatSessionContext([row, user("u", "later")], "Demo", "ses_demo");

    expect(output).toContain("MARKER: u");
    expect(output).not.toContain("IN FLIGHT:");
  });

  it("reports an unsettled tail after the last settled marker", () => {
    const output = formatSessionContext([user("u", "hello"), assistant("a", "answer")], "Demo", "ses_demo");

    expect(output).toContain("MARKER: u");
    expect(output).toContain("IN FLIGHT: 1 unsettled message(s) after the marker");
  });

  it("returns a delta after a marker and a notice on a stale marker", () => {
    const messages = [user("u", "hello"), user("v", "world"), user("w", "again")];
    const delta = formatSessionContext(messages, "Demo", "ses_demo", "u");
    const stale = formatSessionContext(messages, "Demo", "ses_demo", "missing");

    expect(delta).toContain("DELTA: 2 messages after u (1 skipped)");
    expect(delta).not.toContain("hello");
    expect(stale).toContain("NOTICE: marker missing not found in current window — returning full context");
    expect(stale).toContain("hello");
    expect(stale).not.toContain("CONTEXT:");
  });

  it("chunks at message boundaries and resumes with the settled marker", () => {
    const messages = [user("u", "first"), user("v", "second"), user("w", "third")];
    const first = formatSessionContext(messages, "Demo", "ses_demo", undefined, 120);
    const marker = first.match(/MARKER: (.+)/)?.[1];
    const second = formatSessionContext(messages, "Demo", "ses_demo", marker, 120);

    expect(first).toContain("MORE: true");
    expect(first).toContain("[USER]\nfirst");
    expect(first).not.toContain("[USER]\nsecond");
    expect(marker).toBe("u");
    expect(second).toContain("[USER]\nsecond");
    expect(second).toContain("[USER]\nthird");
    expect(second).toContain("MORE: false");
  });

  it("allows one oversized message to exceed the budget", () => {
    const output = formatSessionContext([user("u", "x".repeat(500))], "Demo", "ses_demo", undefined, 100);

    expect(output).toContain("MORE: false");
    expect(output).toContain("x".repeat(500));
  });

  it("reads through the session source and returns formatted context", async () => {
    const source = createSessionSource({ id: "ses_target", title: "Target" }, [user("u", "hello")]);
    const result = await readSessionContext(source, { sessionID: "ses_target" });

    expect(result.content).toContain("SESSION: Target (ses_target)");
    expect(result.content).toContain("[USER]\nhello");
  });

  it.each(["missing session", "decode failed"])('returns a clean error for %s', async (failureMessage) => {
    const source = createSessionSource({ id: "ses_target", title: "Target" }, [], new Error(failureMessage));
    const result = await readSessionContext(source, { sessionID: "ses_target" });

    expect(result.content).toBe(`ERROR: ${failureMessage}`);
  });
});
