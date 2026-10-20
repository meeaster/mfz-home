import { describe, expect, it } from "vitest";
import type { RunClient } from "./run-client.ts";
import { backgroundReturn, createCairn, type CompletedTool, type SessionFacts } from "./server.ts";
import { layoutAt } from "../core/root.ts";

const root = "/home/user/.local/state/cairn";

// Every session is told where designs live; this root has no knowledge base, so nothing names one.
const contentLine = `Designs live in ${root}/designs/<slug>/.`;

const sessionFolder = `${root}/sessions/opencode/2026-09/ses_lead`;

const exploreFolder = `${sessionFolder}/subagents/ses_explore`;

// runs maps a root session to the opencode run process that created it. The fake CLI places a subagent's folder in its
// parent's, as the catalog does.
function harness(sessions: ReadonlyMap<string, SessionFacts>, runs: ReadonlyMap<string, RunClient> = new Map()) {
  const fired: string[][] = [];
  const ran: string[][] = [];
  const logged: string[] = [];
  const written = new Map<string, string>();
  let printed: Promise<string> = Promise.resolve(JSON.stringify({ note: "Attached efforts: logs-archived-to-s3." }));

  const cairn = createCairn({
    layout: layoutAt(root),
    cli: {
      fire: (args) => {
        fired.push([...args]);
      },
      output: async (args) => {
        ran.push([...args]);

        if (args[1] === "start") {
          const id = (args[2] ?? "").replace("opencode:", "");
          const folder = args.includes("--parent") ? `${sessionFolder}/subagents/${id}` : `${root}/sessions/opencode/2026-09/${id}`;

          return JSON.stringify({ key: args[2], folder });
        }

        return args[1] === "context" ? printed : "";
      }
    },
    files: {
      write: async (path, text) => {
        written.set(path, text);
      },
      read: async (path) => written.get(path) ?? null
    },
    directory: "/home/user/repo",
    session: async (sessionID) => {
      const facts = sessions.get(sessionID);

      if (facts === undefined) {
        throw new Error(`no session ${sessionID}`);
      }

      return facts;
    },
    runClient: (session) => runs.get(session.id) ?? null,
    log: (message) => {
      logged.push(message);
    }
  });

  const tool = (sessionID: string, name: string, input: CompletedTool["input"], output: CompletedTool["output"], content?: CompletedTool["content"]) =>
    cairn.afterTool({ tool: name, sessionID, input, output, content });

  return {
    cairn,
    fired,
    ran,
    logged,
    written,
    tool,
    printNote: (value: Promise<string>) => {
      printed = value;
    }
  };
}

const created = Date.parse("2026-09-25T10:00:00Z");

const lead: SessionFacts = { agent: "build", title: "New session", directory: "/home/user/repo", created };

const explore: SessionFacts = { parentID: "ses_lead", agent: "explore", title: "Map the AWS accounts", directory: "/home/user/repo", created };

const sessions = new Map([
  ["ses_lead", lead],
  ["ses_explore", explore]
]);

const described = "---\ntitle: AWS accounts\ndescription: Lists the accounts.\n---\n\n# AWS accounts\n";

describe("cairn plugin", () => {
  it("registers each session once on first sight and tells it its catalog ID and folder", async () => {
    const app = harness(sessions);

    expect(await app.cairn.context("ses_lead")).toBe(`This session's catalog ID is opencode:ses_lead. Its folder is ${sessionFolder}.\n\n${contentLine}`);
    await app.cairn.context("ses_lead");
    expect(await app.cairn.context("ses_explore")).toBe(
      `This session's catalog ID is opencode:ses_explore. Its folder is ${exploreFolder}.\n\n${contentLine}`
    );
    await app.cairn.context("ses_explore");

    expect(app.ran).toEqual([
      ["session", "start", "opencode:ses_lead", "--cwd", "/home/user/repo", "--json", "--agent", "build", "--origin", "interactive"],
      [
        "session",
        "start",
        "opencode:ses_explore",
        "--cwd",
        "/home/user/repo",
        "--json",
        "--parent",
        "opencode:ses_lead",
        "--agent",
        "explore",
        "--title",
        "Map the AWS accounts"
      ]
    ]);
  });

  it("registers a root session that an opencode run created as a CLI run, linked to the session that ran it", async () => {
    const app = harness(
      new Map([
        ["ses_run", lead],
        ["ses_script", lead]
      ]),
      new Map<string, RunClient>([
        ["ses_run", { spawnedBy: { harness: "claude-code", nativeId: "lead-session" } }],
        ["ses_script", { spawnedBy: undefined }]
      ])
    );

    await app.cairn.context("ses_run");
    await app.cairn.context("ses_script");

    expect(app.ran).toEqual([
      [
        "session",
        "start",
        "opencode:ses_run",
        "--cwd",
        "/home/user/repo",
        "--json",
        "--agent",
        "build",
        "--origin",
        "cli",
        "--spawned-by",
        "claude-code:lead-session"
      ],
      ["session", "start", "opencode:ses_script", "--cwd", "/home/user/repo", "--json", "--agent", "build", "--origin", "cli"]
    ]);
  });

  it("captures written files under the root and notes a Markdown file without front matter once", async () => {
    const app = harness(sessions);
    const notes = `${sessionFolder}/aws-notes.md`;
    const evidence = `${sessionFolder}/aws-accounts.md`;
    const export_ = `${sessionFolder}/accounts.json`;

    app.written.set(notes, "# AWS notes\n");
    app.written.set(evidence, described);
    app.written.set(export_, "[]");

    const bare = await app.tool("ses_lead", "write", { path: notes }, { target: notes, existed: false }, "Created file successfully");
    const again = await app.tool("ses_lead", "edit", { path: notes }, { files: [{ file: notes }] });

    expect(bare).toEqual([
      { type: "text", text: "Created file successfully" },
      { type: "text", text: expect.stringContaining(`recorded this file: ${notes}\nfor session opencode:ses_lead. It has no front matter`) }
    ]);
    expect(again).toBeNull();
    expect(await app.tool("ses_lead", "write", { path: evidence }, { target: evidence }, "ok")).toBeNull();
    expect(await app.tool("ses_lead", "write", { path: export_ }, { target: export_ }, "ok")).toBeNull();
    expect(app.fired).toEqual([
      ["capture", notes, "--session", "opencode:ses_lead"],
      ["capture", notes, "--session", "opencode:ses_lead"],
      ["capture", evidence, "--session", "opencode:ses_lead"],
      ["capture", export_, "--session", "opencode:ses_lead"]
    ]);
  });

  it("resolves relative paths against the session's directory", async () => {
    const app = harness(new Map([["ses_lead", { ...lead, directory: sessionFolder }]]));

    app.written.set(`${sessionFolder}/a.md`, "a");
    app.written.set(`${sessionFolder}/notes/b.md`, "b");

    const patched = await app.tool("ses_lead", "patch", {}, { files: [{ file: "a.md" }, { file: "notes/b.md" }] }, []);

    expect(app.fired).toEqual([
      ["capture", `${sessionFolder}/a.md`, "--session", "opencode:ses_lead"],
      ["capture", `${sessionFolder}/notes/b.md`, "--session", "opencode:ses_lead"]
    ]);
    expect(patched?.[0]).toEqual({ type: "text", text: JSON.stringify({ files: [{ file: "a.md" }, { file: "notes/b.md" }] }) });
    expect(patched?.[1]).toEqual({ type: "text", text: expect.stringContaining(`these files:\n- ${sessionFolder}/a.md\n- ${sessionFolder}/notes/b.md`) });
  });

  it("leaves files outside the root, Cairn's own files, and effort records without a note", async () => {
    const app = harness(sessions);
    const record = `${root}/efforts/logs-archived-to-s3/effort.md`;

    app.written.set(record, "# Logs archived to S3\n");

    for (const path of ["/home/user/repo/src/app.ts", `${root}/efforts/logs-archived-to-s3/index.md`, `${root}/catalog.db`, record]) {
      expect(await app.tool("ses_lead", "write", { path }, { target: path }, "ok")).toBeNull();
    }

    expect(app.fired).toEqual([["capture", record, "--session", "opencode:ses_lead"]]);
  });

  it("records reads under the root without changing the result", async () => {
    const app = harness(sessions);
    const evidence = `${sessionFolder}/aws-accounts.md`;

    expect(await app.tool("ses_explore", "read", { path: evidence }, "file text")).toBeNull();
    expect(await app.tool("ses_explore", "read", { path: "/home/user/repo/README.md" }, "file text")).toBeNull();
    expect(await app.tool("ses_explore", "bash", { command: `cat > ${evidence}` }, "")).toBeNull();
    expect(app.fired).toEqual([["read", evidence, "--session", "opencode:ses_explore"]]);
  });

  it("gives the compaction note, which restates the catalog ID, in every request after a compaction", async () => {
    const app = harness(sessions);

    app.cairn.compactionEnded("ses_lead");

    const expected = `Attached efforts: logs-archived-to-s3.\n\n${contentLine}`;

    expect(await app.cairn.context("ses_lead")).toBe(expected);
    expect(await app.cairn.context("ses_lead")).toBe(expected);
    expect(await app.cairn.context("ses_explore")).not.toContain("Attached efforts");
  });

  it("updates the conversation export after each turn of a root session, and never for a subagent", async () => {
    const app = harness(sessions);

    await app.cairn.turnCompleted("ses_lead");
    await app.cairn.turnCompleted("ses_explore");
    await app.cairn.turnCompleted("ses_lead");

    expect(app.fired.filter((args) => args[1] === "index")).toEqual([
      ["session", "index", "opencode:ses_lead"],
      ["session", "index", "opencode:ses_lead"]
    ]);
  });

  it("saves a foreground subagent's response in its folder, titled from the task, and credits the subagent", async () => {
    const app = harness(sessions);
    const saved = `${exploreFolder}/result.md`;
    const output = { sessionID: "ses_explore", status: "completed", output: "Three accounts, one VPC each." };

    const content = await app.tool("ses_lead", "subagent", { agent: "explore", description: "Map the AWS accounts", prompt: "..." }, output, "<subagent>");

    expect(content).toEqual([
      { type: "text", text: "<subagent>" },
      { type: "text", text: `Cairn saved this response to ${saved}.` }
    ]);
    expect(app.written.get(saved)).toBe("---\ntitle: Map the AWS accounts\ncategory: evidence\n---\n\nThree accounts, one VPC each.\n");
    expect(app.fired).toEqual([["capture", saved, "--session", "opencode:ses_explore"]]);
  });

  it("keeps the front matter a subagent gave its own response", async () => {
    const app = harness(sessions);

    const saved = await app.cairn.subagentReturned({ childID: "ses_explore", description: "Map the AWS accounts", text: described });

    expect(app.written.get(saved?.response ?? "")).toBe(`${described}\n`);
  });

  it("appends a follow-up to a subagent's saved response and captures its learnings", async () => {
    const app = harness(sessions);
    const learnings = `${exploreFolder}/learnings.md`;

    app.written.set(learnings, "---\ncategory: learning\n---\n\naws sts needs --region in this account.\n");

    const first = await app.cairn.subagentReturned({ childID: "ses_explore", description: "Map the AWS accounts", text: "Draft." });
    const second = await app.cairn.subagentReturned({ childID: "ses_explore", description: "Check the VPCs too", text: "Final." });

    expect(second).toEqual({ response: first?.response, learnings });
    // The same completion arriving again by another route changes nothing.
    await app.cairn.subagentReturned({ childID: "ses_explore", description: "Check the VPCs too", text: "Final." });
    expect(app.fired.filter((args) => args[1] === first?.response)).toHaveLength(2);
    expect(app.fired.filter((args) => args[1] === learnings)).toHaveLength(2);
    expect(app.written.get(first?.response ?? "")).toBe(
      "---\ntitle: Map the AWS accounts\ncategory: evidence\n---\n\nDraft.\n\n---\n\n## Follow-up\n\nFinal.\n"
    );
  });

  it("tells the parent where a subagent's learnings are", async () => {
    const app = harness(sessions);
    const learnings = `${exploreFolder}/learnings.md`;
    const output = { sessionID: "ses_explore", status: "completed", output: "Done." };

    app.written.set(learnings, "aws sts needs --region in this account.");

    const content = await app.tool("ses_lead", "subagent", { agent: "explore", description: "Map the AWS accounts", prompt: "..." }, output, "<subagent>");

    expect(content?.[1]).toEqual({
      type: "text",
      text: `Cairn saved this response to ${exploreFolder}/result.md. The subagent also wrote learnings to ${learnings}.`
    });
  });

  it("acts only on sessions in its own location", async () => {
    const app = harness(new Map([...sessions, ["ses_other", { ...lead, directory: "/home/user/other" }]]));

    expect(await app.cairn.owns("ses_lead")).toBe(true);
    expect(await app.cairn.owns("ses_other")).toBe(false);
    expect(await app.cairn.owns("ses_missing")).toBe(false);
  });

  it("saves nothing for a subagent that ended without text", async () => {
    const app = harness(sessions);
    const output = { sessionID: "ses_explore", status: "completed", output: "Subagent completed without a text response." };

    expect(await app.tool("ses_lead", "subagent", { agent: "explore", description: "Map the AWS accounts", prompt: "..." }, output, "x")).toBeNull();
    expect(app.written.size).toBe(0);
  });

  it("reads a background subagent's response out of its completion message", () => {
    const data = {
      description: "Map the AWS accounts",
      text: '<subagent sessionID="ses_explore" state="completed" description="Map the AWS accounts">\nLine one.\n\nLine two.\n</subagent>',
      metadata: { source: "subagent", childID: "ses_explore", agent: "Explore", state: "completed" }
    };

    expect(backgroundReturn(data)).toEqual({ childID: "ses_explore", description: "Map the AWS accounts", text: "Line one.\n\nLine two." });
    expect(backgroundReturn({ ...data, metadata: { ...data.metadata, state: "error" } })).toBeNull();
    expect(backgroundReturn({ text: "A reminder." })).toBeNull();
  });

  it("adds where a background result was saved to the result itself, the same way in every request", async () => {
    const app = harness(sessions);
    const saved = `${exploreFolder}/result.md`;
    const result = '<subagent sessionID="ses_explore" state="completed" description="Map the AWS accounts">\nThree accounts.\n</subagent>';

    const pending = [
      { role: "user", content: [{ type: "text", text: "Map the accounts." }] },
      { role: "assistant", content: [{ type: "text", text: "Started a subagent." }] },
      { role: "user", content: [{ type: "text", text: result }] }
    ];

    const first = await app.cairn.noteResults("ses_lead", pending);

    expect(first).toEqual(new Map([[2, `${result}\n\nCairn saved the result of "Map the AWS accounts" to ${saved}.`]]));
    expect(app.written.get(saved)).toContain("Three accounts.\n");

    const answered = [...pending, { role: "assistant", content: [{ type: "text", text: "Three accounts." }] }];

    expect(await app.cairn.noteResults("ses_lead", answered)).toEqual(first);
    expect(await harness(sessions).cairn.noteResults("ses_lead", answered)).toEqual(new Map());
  });

  it("keeps the harness working when the session or the CLI fails", async () => {
    const app = harness(sessions);

    app.printNote(Promise.reject(new Error("catalog locked")));
    app.cairn.compactionEnded("ses_lead");

    expect(await app.cairn.context("ses_lead")).toBe(`This session's catalog ID is opencode:ses_lead. Its folder is ${sessionFolder}.\n\n${contentLine}`);
    expect(await app.cairn.context("ses_gone")).toBe(`This session's catalog ID is opencode:ses_gone.\n\n${contentLine}`);
    expect(await app.tool("ses_gone", "write", {}, { target: `${sessionFolder}/x.md` }, "ok")).toBeNull();
    expect(app.logged).toEqual(["unable to read the compaction note", "unable to register the session", "unable to register the session"]);
  });
});
