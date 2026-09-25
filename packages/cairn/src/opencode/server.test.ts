import { describe, expect, it } from "vitest";
import { createCairn, type CompletedTool, type SessionFacts } from "./server.ts";

const root = "/home/user/workspace/artifacts/cairn";

const sessionFolder = `${root}/sessions/opencode/2026-09/ses_lead`;

function harness(sessions: ReadonlyMap<string, SessionFacts>) {
  const fired: string[][] = [];
  const logged: string[] = [];
  let printed: Promise<string> = Promise.resolve(JSON.stringify({ note: "Attached efforts: logs-archived-to-s3." }));

  const cairn = createCairn({
    root,
    cli: {
      fire: (args) => {
        fired.push([...args]);
      },
      output: () => printed
    },
    session: async (sessionID) => {
      const facts = sessions.get(sessionID);

      if (facts === undefined) {
        throw new Error(`no session ${sessionID}`);
      }

      return facts;
    },
    log: (message) => {
      logged.push(message);
    }
  });

  const tool = (sessionID: string, name: string, input: CompletedTool["input"], output: CompletedTool["output"], content?: CompletedTool["content"]) =>
    cairn.afterTool({ tool: name, sessionID, input, output, content });

  return {
    cairn,
    fired,
    logged,
    tool,
    printNote: (value: Promise<string>) => {
      printed = value;
    }
  };
}

const lead: SessionFacts = { agent: "build", title: "New session", directory: "/home/user/repo" };

const explore: SessionFacts = { parentID: "ses_lead", agent: "explore", title: "Map the AWS accounts", directory: "/home/user/repo" };

const sessions = new Map([
  ["ses_lead", lead],
  ["ses_explore", explore]
]);

describe("cairn plugin", () => {
  it("registers each session once on first sight and gives it its catalog ID", async () => {
    const app = harness(sessions);

    expect(await app.cairn.context("ses_explore")).toBe("This session's catalog ID is opencode:ses_explore.");
    await app.cairn.context("ses_explore");
    await app.cairn.context("ses_lead");

    expect(app.fired).toEqual([
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
      ["session", "start", "opencode:ses_lead", "--cwd", "/home/user/repo", "--agent", "build"]
    ]);
  });

  it("captures written files under the root and appends the capture note once per file", async () => {
    const app = harness(sessions);
    const evidence = `${sessionFolder}/aws-accounts.md`;

    const written = await app.tool("ses_explore", "write", { path: evidence }, { target: evidence, existed: false }, "Created file successfully");
    const edited = await app.tool("ses_explore", "edit", { path: evidence }, { files: [{ file: evidence }] });

    expect(written).toEqual([
      { type: "text", text: "Created file successfully" },
      { type: "text", text: expect.stringContaining(`recorded this file: ${evidence}\nfor session opencode:ses_explore`) }
    ]);
    expect(written?.[1]).toEqual({ type: "text", text: expect.stringContaining("catalog_describe") });
    expect(edited).toBeNull();
    expect(app.fired.slice(1)).toEqual([
      ["capture", evidence, "--session", "opencode:ses_explore"],
      ["capture", evidence, "--session", "opencode:ses_explore"]
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
    const record = `${root}/efforts/logs-archived-to-s3/context.md`;

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
    expect(app.fired.slice(1)).toEqual([["read", evidence, "--session", "opencode:ses_explore"]]);
  });

  it("adds the compaction note to every request after a compaction", async () => {
    const app = harness(sessions);

    app.cairn.compactionEnded("ses_lead");

    const expected = "This session's catalog ID is opencode:ses_lead.\n\nAttached efforts: logs-archived-to-s3.";

    expect(await app.cairn.context("ses_lead")).toBe(expected);
    expect(await app.cairn.context("ses_lead")).toBe(expected);
    expect(await app.cairn.context("ses_explore")).toBe("This session's catalog ID is opencode:ses_explore.");
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
