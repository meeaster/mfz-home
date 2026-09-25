import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { main } from "../cli.ts";

const indexResult = z.union([
  z.object({ indexed: z.literal(false), reason: z.string() }),
  z.object({ indexed: z.literal(true), path: z.string(), mode: z.string(), records_written: z.number() })
]);

const artifactList = z.object({ artifacts: z.array(z.object({ path: z.string(), category: z.string().nullable(), title: z.string().nullable() })) });

type Block = { readonly type: "text" | "thinking" | "tool_use"; readonly text: string };

type ToolResult = { readonly type: "tool_result"; readonly tool_use_id: string; readonly content: string };

// The fields of a transcript line that the adapter reads, besides uuid, parentUuid, and timestamp.
type EntryFields = {
  readonly type: "user" | "assistant" | "system";
  readonly subtype?: string;
  readonly turnOrigin?: string;
  readonly isCompactSummary?: boolean;
  readonly logicalParentUuid?: string | null;
  readonly toolUseResult?: Record<string, never>;
  readonly compactMetadata?: { readonly trigger: string; readonly preTokens: number; readonly postTokens: number };
  readonly message?: {
    readonly id?: string;
    readonly model?: string;
    readonly role: string;
    readonly content: string | readonly (Block | ToolResult)[];
    readonly usage?: { readonly input_tokens: number; readonly cache_read_input_tokens: number; readonly output_tokens: number };
  };
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

// A catalog root and a Claude Code transcript built entry by entry. Each entry's parent is the previous one,
// unless a rewind names an earlier entry.
function workspace() {
  const base = mkdtempSync(join(tmpdir(), "cairn-transcript-test-"));
  const transcript = join(base, "ses-main.jsonl");
  let count = 0;
  let parent: string | null = null;

  roots.push(base);
  writeFileSync(transcript, "");

  const entry = (fields: EntryFields): string => {
    count += 1;

    const uuid = `u${count}`;

    appendFileSync(transcript, `${JSON.stringify({ uuid, parentUuid: parent, timestamp: `2026-09-25T10:00:${String(count).padStart(2, "0")}Z`, ...fields })}\n`);
    parent = uuid;

    return uuid;
  };

  const cli = <Parser extends z.ZodType>(parser: Parser, ...args: string[]): z.infer<Parser> => {
    let stdout = "";
    let stderr = "";

    const code = main([...args, "--json"], { CAIRN_ROOT: join(base, "cairn") }, {
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
      stdin: () => "",
      now: () => new Date("2026-09-25T10:00:00"),
      launchIndex: () => {}
    });

    if (code !== 0) {
      throw new Error(`cairn ${args.join(" ")} failed: ${stderr}`);
    }

    return parser.parse(JSON.parse(stdout));
  };

  const index = (...flags: string[]) => {
    const result = cli(indexResult, "session", "index", "claude-code:ses-main", "--source", transcript, ...flags);

    return { ...result, content: result.indexed ? readFileSync(result.path, "utf8") : "" };
  };

  return {
    cli,
    index,
    // An index run as the Stop hook starts it, with the harness's copy of the final message.
    indexAtStop: (lastMessage: string) => {
      const file = join(base, "last-message.txt");

      writeFileSync(file, lastMessage);

      return index("--last-message", file);
    },
    // A prompt typed in the terminal is human; one given to claude -p is sdk.
    human: (text: string, turnOrigin: "human" | "sdk" = "human") => entry({ type: "user", turnOrigin, message: { role: "user", content: text } }),
    notification: (text: string) => entry({ type: "user", turnOrigin: "task_notification", message: { role: "user", content: text } }),
    toolResult: (text: string) =>
      entry({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: text }] }, toolUseResult: {} }),
    // Each model call reads prompt tokens, most of them cached, and writes 50.
    assistant: (id: string, block: Block, prompt = 1000) =>
      entry({
        type: "assistant",
        message: {
          id,
          model: "claude-opus-5-5",
          role: "assistant",
          content: [block],
          usage: { input_tokens: 10, cache_read_input_tokens: prompt - 10, output_tokens: 50 }
        }
      }),
    compaction: (summary: string, preTokens = 150000, postTokens = 12000) => {
      const before = parent;

      parent = null;
      entry({ type: "system", subtype: "compact_boundary", logicalParentUuid: before, compactMetadata: { trigger: "manual", preTokens, postTokens } });
      entry({ type: "user", isCompactSummary: true, message: { role: "user", content: summary } });
    },
    title: (line: Readonly<Record<string, string>>) => appendFileSync(transcript, `${JSON.stringify(line)}\n`),
    rewindTo: (uuid: string) => {
      parent = uuid;
    }
  };
}

describe("Claude Code conversation export", () => {
  test("turns append across a compaction, keeping only the human's messages and the assistant's text", () => {
    const cairn = workspace();

    cairn.title({ type: "ai-title", aiTitle: "log pipeline" });
    cairn.human("Where should the logs go?");
    cairn.assistant("m1", { type: "thinking", text: "PRIVATE REASONING" });
    cairn.assistant("m1", { type: "text", text: "Checking the retention options." });
    cairn.assistant("m1", { type: "tool_use", text: "TOOL CALL" });
    cairn.toolResult("TOOL OUTPUT");
    cairn.assistant("m2", { type: "text", text: "Archive them to S3." }, 1400);

    const first = cairn.index();

    expect(first).toMatchObject({ indexed: true, mode: "full", records_written: 3 });

    cairn.notification("<task-notification>SUBAGENT DONE</task-notification>");
    cairn.compaction("COMPACTION SUMMARY");
    cairn.title({ type: "custom-title", customTitle: "Log pipeline research" });
    cairn.human('Here are the bucket policies.\n\n<pasted_content id="3a4a">\nBoth buckets have versioning on.\n</pasted_content id="3a4a">');
    cairn.assistant("m3", { type: "text", text: "Both buckets need object lock." }, 20000);

    const second = cairn.index();

    expect(second).toMatchObject({ indexed: true, mode: "append", records_written: 3 });
    expect(second.content.startsWith(first.content)).toBe(true);
    expect(second.content).not.toMatch(/PRIVATE REASONING|TOOL CALL|TOOL OUTPUT|SUBAGENT DONE|COMPACTION SUMMARY|pasted_content/);

    for (const text of [
      "Where should the logs go?",
      "Checking the retention options.",
      "Archive them to S3.",
      "Here are the bucket policies.\n\nBoth buckets have versioning on.",
      "Both buckets need object lock."
    ]) {
      expect(second.content).toContain(`\n\n${text}\n`);
    }

    // A human message joins the prompt of the next model call; an assistant message adds its call's output.
    const headings = second.content.split("\n").filter((line) => line.startsWith("## ")).map((line) => line.replace(/ · \d{4}-.* UTC · seq \d+ · u\d+/, ""));

    expect(headings).toEqual([
      "## User · context 1,000",
      "## Assistant · context 1,050",
      "## Assistant · context 1,450",
      "## Compaction · manual · context 150,000 → 12,000",
      "## User · context 20,000",
      "## Assistant · context 20,050"
    ]);

    const { artifacts } = cairn.cli(artifactList, "find", "artifacts");

    expect(artifacts).toEqual([{ path: second.indexed ? second.path : "", category: "conversation", title: "Log pipeline research" }]);
  });

  test("a final message the transcript lacks is a provisional tail until the transcript holds it", () => {
    const cairn = workspace();

    cairn.human("Where should the logs go?", "sdk");

    const atStop = cairn.indexAtStop("Archive them to S3.");

    expect(atStop).toMatchObject({ indexed: true, mode: "full", records_written: 1 });
    expect(atStop.content).toContain("## Assistant · provisional");
    expect(atStop.content).toMatch(/## Assistant · provisional.*\n\nArchive them to S3\.\n$/);

    cairn.assistant("m1", { type: "text", text: "Archive them to S3." });

    const settled = cairn.indexAtStop("Archive them to S3.");
    const kept = atStop.content.slice(0, atStop.content.indexOf("\n## Assistant · provisional"));

    expect(settled).toMatchObject({ indexed: true, mode: "append", records_written: 1 });
    expect(settled.content.startsWith(kept)).toBe(true);
    expect(settled.content).not.toContain("## Assistant · provisional");
    expect(settled.content.match(/Archive them to S3\./g)).toHaveLength(1);
  });

  test("a rewind rewrites the export from the branch the conversation continued on", () => {
    const cairn = workspace();

    cairn.human("Where should the logs go?");

    const answer = cairn.assistant("m1", { type: "text", text: "Archive them to S3." });

    cairn.human("Use Glacier instead.");
    cairn.assistant("m2", { type: "text", text: "Switching to Glacier." });
    cairn.index();
    cairn.rewindTo(answer);
    cairn.human("Keep S3 Standard for a month first.");

    const result = cairn.index();

    expect(result).toMatchObject({ indexed: true, mode: "full", records_written: 3 });
    expect(result.content).toContain("Keep S3 Standard for a month first.");
    expect(result.content).not.toMatch(/Glacier/);
  });
});
