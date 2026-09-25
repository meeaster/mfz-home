import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { main } from "../cli.ts";

const indexResult = z.union([
  z.object({ indexed: z.literal(false), reason: z.string() }),
  z.object({ indexed: z.literal(true), path: z.string(), mode: z.string(), records_written: z.number() })
]);

const artifactList = z.object({
  artifacts: z.array(z.object({ path: z.string(), category: z.string().nullable(), title: z.string().nullable(), efforts: z.array(z.string()) }))
});

type AssistantPart = { readonly type: "text" | "reasoning" | "tool"; readonly text: string; readonly phase?: string };

type StoredPart = { readonly type: AssistantPart["type"]; readonly text: string; readonly state: { readonly phase?: string } };

// The fields of session_message.data that the adapter reads.
type MessageData = {
  readonly text?: string;
  readonly files?: readonly Record<string, never>[];
  readonly content?: readonly StoredPart[];
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

// A catalog root and an OpenCode database with the columns the adapter reads.
function workspace() {
  const root = mkdtempSync(join(tmpdir(), "cairn-conversation-test-"));
  const source = join(root, "opencode.db");
  const opencode = new DatabaseSync(source);
  let seq = 0;

  roots.push(root);
  opencode.exec(`
    CREATE TABLE session_v2 (id TEXT PRIMARY KEY, title TEXT, parent_id TEXT);
    CREATE TABLE session_message (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, type TEXT NOT NULL, seq INTEGER NOT NULL,
      time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL
    );
  `);

  const message = (session: string, type: string, data: MessageData): number => {
    seq += 1;
    opencode
      .prepare("INSERT INTO session_message VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(`msg_${seq}`, session, type, seq, 1790000000000 + seq, 1790000000000 + seq, JSON.stringify(data));

    return seq;
  };

  const cli = <Parser extends z.ZodType>(parser: Parser, ...args: string[]): z.infer<Parser> => {
    let stdout = "";
    let stderr = "";

    const code = main([...args, "--json"], { CAIRN_ROOT: root }, {
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
      now: () => new Date("2026-09-25T10:00:00")
    });

    if (code !== 0) {
      throw new Error(`cairn ${args.join(" ")} failed: ${stderr}`);
    }

    return parser.parse(JSON.parse(stdout));
  };

  return {
    root,
    cli,
    session: (id: string, title: string, parent: string | null = null) => {
      opencode.prepare("INSERT INTO session_v2 VALUES (?, ?, ?)").run(id, title, parent);
    },
    user: (session: string, text: string, files = 0) => message(session, "user", { text, files: Array.from({ length: files }, () => ({})) }),
    assistant: (session: string, content: readonly AssistantPart[]) =>
      message(session, "assistant", {
        content: content.map((part) => ({ type: part.type, text: part.text, state: part.phase === undefined ? {} : { phase: part.phase } }))
      }),
    other: (session: string, type: string, text: string) => message(session, type, { text }),
    // What a committed revert does: delete the boundary message and everything after it.
    revertTo: (session: string, boundary: number) => {
      opencode.prepare("DELETE FROM session_message WHERE session_id = ? AND seq >= ?").run(session, boundary);
    },
    index: (session: string, ...flags: string[]) => cli(indexResult, "session", "index", session, "--source", source, ...flags)
  };
}

describe("conversation export", () => {
  test("two turns produce an appended export of only the human's messages and the assistant's text", () => {
    const cairn = workspace();

    cairn.session("ses_root", "Log pipeline research");
    cairn.user("ses_root", "Where should the logs go?");
    cairn.assistant("ses_root", [
      { type: "reasoning", text: "PRIVATE REASONING" },
      { type: "text", text: "Checking the retention options.", phase: "commentary" },
      { type: "tool", text: "TOOL OUTPUT" },
      { type: "text", text: "Archive them to S3.", phase: "final_answer" }
    ]);
    cairn.other("ses_root", "synthetic", "SYNTHETIC NOTICE");

    const first = cairn.index("opencode:ses_root");

    expect(first).toMatchObject({ indexed: true, mode: "full", records_written: 3 });

    const path = first.indexed ? first.path : "";
    const afterFirst = readFileSync(path, "utf8");

    cairn.user("ses_root", "Here are the bucket policies.", 2);
    cairn.assistant("ses_root", [{ type: "text", text: "Both buckets need object lock.", phase: "final_answer" }]);

    expect(cairn.index("opencode:ses_root")).toMatchObject({ indexed: true, mode: "append", records_written: 2 });
    expect(cairn.index("opencode:ses_root")).toMatchObject({ indexed: true, mode: "unchanged", records_written: 0 });

    const exported = readFileSync(path, "utf8");

    expect(exported.startsWith(afterFirst)).toBe(true);

    for (const text of ["Where should the logs go?", "Checking the retention options.", "Archive them to S3.", "Both buckets need object lock."]) {
      expect(exported).toContain(`\n${text}\n<!-- body-end -->`);
    }

    expect(exported).toContain("## Assistant · seq 2 · final_answer");
    expect(exported).toContain("Attachments not included: 2.");
    expect(exported).not.toMatch(/PRIVATE REASONING|TOOL OUTPUT|SYNTHETIC NOTICE/);
  });

  test("a revert rewrites the export without the reverted messages", () => {
    const cairn = workspace();

    cairn.session("ses_root", "Log pipeline research");
    cairn.user("ses_root", "Where should the logs go?");
    cairn.assistant("ses_root", [{ type: "text", text: "Archive them to S3." }]);

    const reverted = cairn.user("ses_root", "Use Glacier instead.");

    cairn.assistant("ses_root", [{ type: "text", text: "Switching to Glacier." }]);
    cairn.index("opencode:ses_root");
    cairn.revertTo("ses_root", reverted);
    cairn.user("ses_root", "Keep S3 Standard for a month first.");

    const result = cairn.index("opencode:ses_root");

    expect(result).toMatchObject({ indexed: true, mode: "full", records_written: 3 });

    const exported = readFileSync(result.indexed ? result.path : "", "utf8");

    expect(exported).toContain("Keep S3 Standard for a month first.");
    expect(exported).not.toMatch(/Glacier/);
  });

  test("an export changed outside Cairn is rewritten from the source", () => {
    const cairn = workspace();

    cairn.session("ses_root", "Log pipeline research");
    cairn.user("ses_root", "Where should the logs go?");

    const first = cairn.index("opencode:ses_root");
    const path = first.indexed ? first.path : "";

    appendFileSync(path, "\nA stray edit.\n");
    cairn.user("ses_root", "And for how long?");

    expect(cairn.index("opencode:ses_root")).toMatchObject({ indexed: true, mode: "full", records_written: 2 });
    expect(readFileSync(path, "utf8")).not.toContain("A stray edit.");
  });

  test("child sessions get no export, whether the catalog or only OpenCode knows the parent", () => {
    const cairn = workspace();

    cairn.session("ses_root", "Log pipeline research");
    cairn.session("ses_explore", "Map the AWS accounts", "ses_root");
    cairn.session("ses_general", "Price the buckets", "ses_root");
    cairn.user("ses_explore", "Map the accounts.");
    cairn.user("ses_general", "Price the buckets.");
    cairn.cli(z.unknown(), "session", "start", "opencode:ses_explore", "--parent", "opencode:ses_root");

    expect(cairn.index("opencode:ses_explore")).toMatchObject({ indexed: false, reason: "Only root sessions get a conversation export." });
    expect(cairn.index("opencode:ses_general")).toMatchObject({ indexed: false, reason: "Only root sessions get a conversation export." });
    expect(existsSync(join(cairn.root, "sessions", "opencode", "2026-09", "ses_root", "conversation.md"))).toBe(false);
  });

  test("the export joins the root session's efforts and the effort index links it", () => {
    const cairn = workspace();

    cairn.session("ses_root", "Log pipeline research");
    cairn.user("ses_root", "Where should the logs go?");
    cairn.cli(z.unknown(), "session", "describe", "opencode:ses_root", "--create", "Logs archived to S3");

    const result = cairn.index("opencode:ses_root");
    const path = result.indexed ? result.path : "";
    const { artifacts } = cairn.cli(artifactList, "find", "artifacts", "--effort", "logs-archived-to-s3");
    const index = readFileSync(join(cairn.root, "efforts", "logs-archived-to-s3", "index.md"), "utf8");

    expect(artifacts).toEqual([{ path, category: "conversation", title: "Log pipeline research", efforts: ["logs-archived-to-s3"] }]);
    expect(index).toContain("## Conversations");
    expect(index).toContain("· [conversation](../../sessions/opencode/2026-09/ses_root/conversation.md)");
  });
});
