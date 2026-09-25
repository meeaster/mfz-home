import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { main } from "../cli.ts";

const sessionList = z.object({
  sessions: z.array(z.object({ key: z.string(), title: z.string().nullable(), agent: z.string().nullable(), parent: z.string().nullable() }))
});

const artifactList = z.object({
  artifacts: z.array(z.object({ path: z.string(), producer: z.object({ session: z.string() }).nullable() }))
});

const hookOutput = z.object({ hookSpecificOutput: z.object({ hookEventName: z.string(), additionalContext: z.string() }) });

type Launch = { readonly session: string; readonly transcript: string; readonly lastMessage: string | null };

type HookEvent = Readonly<Record<string, string | boolean | Readonly<Record<string, string>>>>;

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

// A catalog root, and a Claude Code projects folder beside it that holds the transcript.
function workspace() {
  const base = mkdtempSync(join(tmpdir(), "cairn-hook-test-"));
  const root = join(base, "cairn");
  const transcript = join(base, "projects", "-work", "ses-main.jsonl");
  const launches: Launch[] = [];

  roots.push(base);
  mkdirSync(join(base, "projects", "-work"), { recursive: true });
  writeFileSync(transcript, "");

  const run = (stdin: string, ...args: string[]) => {
    let stdout = "";

    const code = main(args, { CAIRN_ROOT: root }, {
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      stdin: () => stdin,
      now: () => new Date("2026-09-25T10:00:00"),
      launchIndex: (session, path, lastMessage) => {
        launches.push({ session, transcript: path, lastMessage });
      }
    });

    return { code, stdout };
  };

  const hook = (event: HookEvent) =>
    run(JSON.stringify({ session_id: "ses-main", transcript_path: transcript, cwd: base, ...event }), "hook", "claude-code");

  const cli = <Parser extends z.ZodType>(parser: Parser, ...args: string[]): z.infer<Parser> => {
    const result = run("", ...args, "--json");

    if (result.code !== 0) {
      throw new Error(`cairn ${args.join(" ")} failed`);
    }

    return parser.parse(JSON.parse(result.stdout));
  };

  return {
    base,
    root,
    transcript,
    launches,
    run,
    hook,
    cli,
    context: (event: HookEvent) => hookOutput.parse(JSON.parse(hook(event).stdout)).hookSpecificOutput.additionalContext
  };
}

describe("Claude Code hooks", () => {
  test("subagents are child sessions under the agent that spawned them, and a first write is credited with a note", () => {
    const cairn = workspace();
    const subagents = join(cairn.base, "projects", "-work", "ses-main", "subagents");
    const evidence = join(cairn.root, "notes", "bucket-prices.md");
    const outside = join(cairn.base, "elsewhere.md");

    mkdirSync(subagents, { recursive: true });
    mkdirSync(join(cairn.root, "notes"), { recursive: true });
    writeFileSync(evidence, "Standard costs more than Glacier.\n");
    writeFileSync(outside, "Not catalogued.\n");

    expect(cairn.context({ hook_event_name: "SessionStart", source: "startup" })).toBe("This session's catalog ID is claude-code:ses-main.");
    expect(cairn.context({ hook_event_name: "SubagentStart", agent_id: "a17", agent_type: "Explore" })).toBe(
      "This session's catalog ID is claude-code:a17."
    );

    // Claude Code writes a subagent's metadata just after SubagentStart.
    writeFileSync(join(subagents, "agent-a17.meta.json"), JSON.stringify({ agentType: "Explore", description: "Price the buckets", spawnDepth: 1 }));
    cairn.hook({ hook_event_name: "SubagentStart", agent_id: "a18", agent_type: "general-purpose" });
    writeFileSync(
      join(subagents, "agent-a18.meta.json"),
      JSON.stringify({ agentType: "general-purpose", description: "Describe the price note", parentAgentId: "a17", spawnDepth: 2 })
    );

    const write = (tool: string, path: string, agent: Readonly<Record<string, string>>) =>
      cairn.hook({ hook_event_name: "PostToolUse", tool_name: tool, tool_input: { file_path: path }, ...agent });

    const first = hookOutput.parse(JSON.parse(write("Write", evidence, { agent_id: "a17", agent_type: "Explore" }).stdout));

    expect(first.hookSpecificOutput.additionalContext).toContain(`recorded this file: ${evidence}\nfor session claude-code:a17.`);
    expect(write("Edit", evidence, { agent_id: "a17", agent_type: "Explore" }).stdout).toBe("");
    expect(write("Read", evidence, {}).stdout).toBe("");
    expect(write("Write", outside, {}).stdout).toBe("");
    expect(cairn.hook({ hook_event_name: "SubagentStop", agent_id: "a18", agent_type: "general-purpose" }).stdout).toBe("");

    const { sessions } = cairn.cli(sessionList, "find", "sessions");
    const { artifacts } = cairn.cli(artifactList, "find", "artifacts");

    expect(sessions).toContainEqual({ key: "claude-code:a17", title: "Price the buckets", agent: "Explore", parent: "claude-code:ses-main" });
    expect(sessions).toContainEqual({ key: "claude-code:a18", title: "Describe the price note", agent: "general-purpose", parent: "claude-code:a17" });
    expect(artifacts).toEqual([{ path: evidence, producer: { session: "claude-code:a17" } }]);
  });

  test("the main agent's Stop exports the conversation in a detached process, and a resume reconciles it", () => {
    const cairn = workspace();

    cairn.hook({ hook_event_name: "Stop", last_assistant_message: "Archive them to S3.", stop_hook_active: false });
    cairn.hook({ hook_event_name: "Stop", agent_id: "a17", last_assistant_message: "Priced." });
    cairn.hook({ hook_event_name: "SessionStart", source: "resume" });

    expect(cairn.launches).toEqual([
      { session: "claude-code:ses-main", transcript: cairn.transcript, lastMessage: "Archive them to S3." },
      { session: "claude-code:ses-main", transcript: cairn.transcript, lastMessage: null }
    ]);
  });

  test("after a compaction the session's context restates its efforts", () => {
    const cairn = workspace();

    cairn.hook({ hook_event_name: "SessionStart", source: "startup" });
    cairn.cli(z.unknown(), "session", "describe", "claude-code:ses-main", "--create", "Logs archived to S3");

    const note = cairn.context({ hook_event_name: "SessionStart", source: "compact" });

    expect(note).toContain("This session's catalog ID is claude-code:ses-main.");
    expect(note).toContain("Logs archived to S3 (logs-archived-to-s3)");
  });

  test("a failing hook is logged and never fails the harness action", () => {
    const cairn = workspace();

    expect(cairn.run("{ not json", "hook", "claude-code")).toEqual({ code: 0, stdout: "" });
    expect(cairn.hook({ hook_event_name: "Notification", message: "Waiting" })).toEqual({ code: 0, stdout: "" });
    expect(existsSync(join(cairn.root, "logs", "cairn.log"))).toBe(true);
    expect(readFileSync(join(cairn.root, "logs", "cairn.log"), "utf8")).toContain("hook claude-code");
  });
});
