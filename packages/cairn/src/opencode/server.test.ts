import { describe, expect, it, vi } from "vitest";
import type { RunClient } from "./run-client.ts";
import { backgroundReturn, createCairn, type CompletedTool, type SessionFacts } from "./server.ts";

const root = "/home/user/workspace/artifacts/cairn";

const sessionFolder = `${root}/sessions/opencode/2026-09/ses_lead`;

// runs maps a root session to the opencode run process that created it.
function topicPath(topic: string): string {
  return `${sessionFolder}/${topic.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.md`;
}

function harness(sessions: ReadonlyMap<string, SessionFacts>, runs: ReadonlyMap<string, RunClient> = new Map()) {
  const fired: string[][] = [];
  const ran: string[][] = [];
  const logged: string[] = [];
  const written = new Map<string, string>();
  const prompts: string[] = [];
  let printed: Promise<string> = Promise.resolve(JSON.stringify({ note: "Attached efforts: logs-archived-to-s3." }));
  let generated: Promise<string> = Promise.resolve('{"title": "AWS account map", "description": "Lists the accounts and their VPCs."}');

  const cairn = createCairn({
    root,
    cli: {
      fire: (args) => {
        fired.push([...args]);
      },
      output: async (args) => {
        ran.push([...args]);

        if (args[0] === "location") {
          return JSON.stringify({ path: topicPath(args[4] ?? "") });
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
    generate: async (prompt) => {
      prompts.push(prompt);

      return generated;
    },
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
    prompts,
    tool,
    printNote: (value: Promise<string>) => {
      printed = value;
    },
    generateWith: (value: Promise<string>) => {
      generated = value;
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

describe("cairn plugin", () => {
  it("registers each session once on first sight and gives it its catalog ID", async () => {
    const app = harness(sessions);

    expect(await app.cairn.context("ses_lead")).toBe("This session's catalog ID is opencode:ses_lead.");
    await app.cairn.context("ses_lead");
    expect(await app.cairn.context("ses_explore")).toMatch(/^This session's catalog ID is opencode:ses_explore\.\n\n/);
    await app.cairn.context("ses_explore");

    expect(app.fired).toEqual([
      ["session", "start", "opencode:ses_lead", "--cwd", "/home/user/repo", "--agent", "build", "--origin", "interactive"]
    ]);
    // A subagent's registration finishes before it asks for a path, so its parent decides the folder.
    expect(app.ran).toEqual([
      [
        "session",
        "start",
        "opencode:ses_explore",
        "--cwd",
        "/home/user/repo",
        "--parent",
        "opencode:ses_lead",
        "--agent",
        "explore",
        "--title",
        "Map the AWS accounts"
      ],
      ["location", "--session", "opencode:ses_explore", "--topic", "learnings ses_explore", "--json"]
    ]);
  });

  it("tells a subagent where its result is saved and where to write its learnings", async () => {
    const app = harness(sessions);

    expect(await app.cairn.context("ses_explore")).toBe(
      "This session's catalog ID is opencode:ses_explore.\n\n" +
        "You are working for another session. Your final message is returned to it as your complete result and " +
        `saved in ${sessionFolder}, so make it complete on its own. If you learn something reusable about tools, ` +
        `commands, or this codebase, write it to ${sessionFolder}/learnings-ses-explore.md.`
    );
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

    expect(app.fired).toEqual([
      [
        "session",
        "start",
        "opencode:ses_run",
        "--cwd",
        "/home/user/repo",
        "--agent",
        "build",
        "--origin",
        "cli",
        "--spawned-by",
        "claude-code:lead-session"
      ],
      ["session", "start", "opencode:ses_script", "--cwd", "/home/user/repo", "--agent", "build", "--origin", "cli"]
    ]);
  });

  it("captures written files under the root and appends the capture note once per file", async () => {
    const app = harness(sessions);
    const evidence = `${sessionFolder}/aws-accounts.md`;

    const written = await app.tool("ses_lead", "write", { path: evidence }, { target: evidence, existed: false }, "Created file successfully");
    const edited = await app.tool("ses_lead", "edit", { path: evidence }, { files: [{ file: evidence }] });

    expect(written).toEqual([
      { type: "text", text: "Created file successfully" },
      { type: "text", text: expect.stringContaining(`recorded this file: ${evidence}\nfor session opencode:ses_lead`) }
    ]);
    expect(written?.[1]).toEqual({ type: "text", text: expect.stringContaining("catalog_describe") });
    expect(edited).toBeNull();
    expect(app.fired.slice(1)).toEqual([
      ["capture", evidence, "--session", "opencode:ses_lead"],
      ["capture", evidence, "--session", "opencode:ses_lead"]
    ]);
  });

  it("captures a subagent's learnings without asking it to describe them, and asks about its other files", async () => {
    const app = harness(sessions);
    const learnings = `${sessionFolder}/learnings-ses-explore.md`;
    const article = `${root}/knowledge/aws-environment.md`;

    await app.cairn.context("ses_explore");

    expect(await app.tool("ses_explore", "write", { path: learnings }, { target: learnings }, "ok")).toBeNull();
    expect(await app.tool("ses_explore", "write", { path: article }, { target: article }, "ok")).toEqual([
      { type: "text", text: "ok" },
      { type: "text", text: expect.stringContaining(`recorded this file: ${article}`) }
    ]);
    expect(app.fired).toEqual([
      ["capture", learnings, "--session", "opencode:ses_explore"],
      ["capture", article, "--session", "opencode:ses_explore"]
    ]);
  });

  it("resolves relative paths against the session's directory", async () => {
    const app = harness(new Map([["ses_lead", { ...lead, directory: sessionFolder }]]));

    const patched = await app.tool("ses_lead", "patch", {}, { files: [{ file: "a.md" }, { file: "notes/b.md" }] }, []);

    expect(app.fired.slice(1)).toEqual([
      ["capture", `${sessionFolder}/a.md`, "--session", "opencode:ses_lead"],
      ["capture", `${sessionFolder}/notes/b.md`, "--session", "opencode:ses_lead"]
    ]);
    expect(patched?.[0]).toEqual({ type: "text", text: JSON.stringify({ files: [{ file: "a.md" }, { file: "notes/b.md" }] }) });
    expect(patched?.[1]).toEqual({ type: "text", text: expect.stringContaining(`these files:\n- ${sessionFolder}/a.md\n- ${sessionFolder}/notes/b.md`) });
  });

  it("leaves files outside the root, Cairn's own files, and effort records without a note", async () => {
    const app = harness(sessions);
    const record = `${root}/efforts/logs-archived-to-s3/effort.md`;

    for (const path of ["/home/user/repo/src/app.ts", `${root}/efforts/logs-archived-to-s3/index.md`, `${root}/catalog.db`, record]) {
      expect(await app.tool("ses_lead", "write", { path }, { target: path }, "ok")).toBeNull();
    }

    expect(app.fired.slice(1)).toEqual([["capture", record, "--session", "opencode:ses_lead"]]);
  });

  it("records reads under the root without changing the result", async () => {
    const app = harness(sessions);
    const evidence = `${sessionFolder}/aws-accounts.md`;

    expect(await app.tool("ses_explore", "read", { path: evidence }, "file text")).toBeNull();
    expect(await app.tool("ses_explore", "read", { path: "/home/user/repo/README.md" }, "file text")).toBeNull();
    expect(await app.tool("ses_explore", "bash", { command: `cat > ${evidence}` }, "")).toBeNull();
    expect(app.fired).toEqual([["read", evidence, "--session", "opencode:ses_explore"]]);
  });

  it("adds the compaction note to every request after a compaction", async () => {
    const app = harness(sessions);

    app.cairn.compactionEnded("ses_lead");

    const expected = "This session's catalog ID is opencode:ses_lead.\n\nAttached efforts: logs-archived-to-s3.";

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

  it("saves a foreground subagent's response, credits the subagent, and describes it in the background", async () => {
    const app = harness(sessions);
    const saved = `${sessionFolder}/map-the-aws-accounts.md`;
    const output = { sessionID: "ses_explore", status: "completed", output: "Three accounts, one VPC each." };

    const content = await app.tool("ses_lead", "subagent", { agent: "explore", description: "Map the AWS accounts", prompt: "..." }, output, "<subagent>");

    expect(content).toEqual([
      { type: "text", text: "<subagent>" },
      { type: "text", text: `Cairn saved this response to ${saved}.` }
    ]);
    expect(app.written.get(saved)).toBe("Three accounts, one VPC each.\n");
    expect(app.prompts[0]).toContain("<document>\nThree accounts, one VPC each.\n</document>");
    await vi.waitFor(() =>
      expect(app.fired).toContainEqual([
        "describe",
        saved,
        "--category",
        "evidence",
        "--title",
        "AWS account map",
        "--description",
        "Lists the accounts and their VPCs.",
        "--session",
        "opencode:ses_explore"
      ])
    );
    expect(app.fired).toContainEqual(["capture", saved, "--session", "opencode:ses_explore"]);
  });

  it("replaces a subagent's saved response when a follow-up returns, and describes its learnings", async () => {
    const app = harness(sessions);
    const learnings = `${sessionFolder}/learnings-ses-explore.md`;

    await app.cairn.context("ses_explore");
    app.written.set(learnings, "aws sts needs --region in this account.");

    const first = await app.cairn.subagentReturned({ childID: "ses_explore", description: "Map the AWS accounts", text: "Draft." });
    const second = await app.cairn.subagentReturned({ childID: "ses_explore", description: "Check the VPCs too", text: "Final." });

    expect(second).toEqual({ response: first?.response, learnings });
    // The same completion arriving again by another route changes nothing.
    await app.cairn.subagentReturned({ childID: "ses_explore", description: "Check the VPCs too", text: "Final." });
    expect(app.fired.filter((args) => args[0] === "capture")).toHaveLength(2);
    expect(app.written.get(first?.response ?? "")).toBe("Final.\n");
    await vi.waitFor(() =>
      expect(app.fired.filter((args) => args[0] === "describe" && args[1] === learnings && args[3] === "learning")).toHaveLength(2)
    );
  });

  it("tells the parent where a subagent's learnings are", async () => {
    const app = harness(sessions);
    const learnings = `${sessionFolder}/learnings-ses-explore.md`;
    const output = { sessionID: "ses_explore", status: "completed", output: "Done." };

    await app.cairn.context("ses_explore");
    app.written.set(learnings, "aws sts needs --region in this account.");

    const content = await app.tool("ses_lead", "subagent", { agent: "explore", description: "Map the AWS accounts", prompt: "..." }, output, "<subagent>");

    expect(content?.[1]).toEqual({
      type: "text",
      text: `Cairn saved this response to ${sessionFolder}/map-the-aws-accounts.md. The subagent also wrote learnings to ${learnings}.`
    });
  });

  it("saves nothing for a subagent that ended without text", async () => {
    const app = harness(sessions);
    const output = { sessionID: "ses_explore", status: "completed", output: "Subagent completed without a text response." };

    expect(await app.tool("ses_lead", "subagent", { agent: "explore", description: "Map the AWS accounts", prompt: "..." }, output, "x")).toBeNull();
    expect(app.written.size).toBe(0);
  });

  it("sends the model only the start of a very long response", async () => {
    const app = harness(sessions);

    await app.cairn.subagentReturned({ childID: "ses_explore", description: "Map the AWS accounts", text: "a".repeat(50_000) });

    expect(app.prompts[0]).toContain("[truncated]");
    expect(app.prompts[0]?.length).toBeLessThan(41_000);
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

  it("keeps a saved response when the model can't describe it", async () => {
    const app = harness(sessions);

    app.generateWith(Promise.resolve("I can't help with that."));

    const saved = await app.cairn.subagentReturned({ childID: "ses_explore", description: "Map the AWS accounts", text: "Done." });

    expect(app.written.get(saved?.response ?? "")).toBe("Done.\n");
    await vi.waitFor(() => expect(app.logged).toEqual(["unable to describe a subagent's file"]));
    expect(app.fired.some((args) => args[0] === "describe")).toBe(false);
  });

  it("keeps the harness working when the session or the CLI fails", async () => {
    const app = harness(sessions);

    app.printNote(Promise.reject(new Error("catalog locked")));
    app.cairn.compactionEnded("ses_lead");

    expect(await app.cairn.context("ses_lead")).toBe("This session's catalog ID is opencode:ses_lead.");
    expect(await app.cairn.context("ses_gone")).toBe("This session's catalog ID is opencode:ses_gone.");
    expect(await app.tool("ses_gone", "write", {}, { target: `${sessionFolder}/x.md` }, "ok")).toBeNull();
    expect(app.logged).toEqual(["unable to read the compaction note", "unable to register the session", "unable to register the session"]);
  });
});
