import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { main } from "../cli.ts";
import type { DesignItem, EffortPage, FilePage, SessionListItem, SessionPage, SidebarData, SourceItem } from "./api.ts";
import { startUiServer } from "./server.ts";

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
});

function temporaryFolder(prefix: string): string {
  const folder = mkdtempSync(join(tmpdir(), prefix));

  cleanups.push(() => rmSync(folder, { recursive: true, force: true }));

  return folder;
}

function write(path: string, content: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);

  return path;
}

const design = `<!-- design-docs format 2 -->
# OPW deployment

Where OPW runs in AWS and what it may access.

## Decisions

### D1 · Where do the workers run?
- Status: Decided
- Answer: EC2 in the shared services VPC

### D2 · How does customer traffic arrive?
- Status: Leaning B
- Leaning: A relay through the product server

### D3 · Which region?
- Status: Given
- Source: Security GRC

## Questions

### Q1 · Can the site VPNs carry a route to a new VPC?
- Ask: Network team

### Q2 · Who owns the S3 account?
- Answer: Platform
- Answered by: E2

### Q3 · How many customers in the first year?
- Needed by: Later phase
- Deferred: Only sizes the archive after the first year.
`;

const changes = `# Changes

## 2026-09-20 · meeting 2026-09-20
- D1 decided

## 2026-09-24 · session opencode:ses_root
- Added Q1

## 2026-10-02 · meeting 2026-10-02
- D3 given
`;

const summary = `# Infra working session

## Discussed
- OPW placement

## Intake
- D1 placement: accepted, recorded in effort.md
- Subnet reservation: deferred until the network review
`;

const thread = `# Email · OPW exposure and IAM scope
- Kind: email
- Reviewed through: 2026-10-03

## 2026-10-02 09:14 · Alex (Security GRC)
Customer traffic can't terminate inside Shared Tooling.

## 2026-10-03 16:40 · Priya (platform lead)
Agreed.

## 2026-10-05 08:02 · Alex (Security GRC)
One more question about IAM.
`;

// A catalog built the way agents build one: through the CLI.
function catalog() {
  const root = temporaryFolder("cairn-ui-");
  const now = new Date("2026-10-05T10:00:00Z");

  const run = (...args: string[]): string => {
    let stdout = "";
    let stderr = "";

    const code = main([...args, "--json"], { CAIRN_ROOT: root }, {
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
      stdin: () => "",
      now: () => now,
      launchIndex: () => {}
    });

    if (code !== 0) {
      throw new Error(`cairn ${args.join(" ")} failed: ${stderr}`);
    }

    return stdout;
  };

  const record = (path: string, session: string, ...describeArgs: string[]): string => {
    run("capture", path, "--session", session);
    run("describe", path, ...describeArgs);

    return path;
  };

  run("session", "start", "opencode:ses_root", "--title", "ASA reuse widens OPW scope", "--cwd", "/work/infra");
  run("session", "start", "opencode:ses_child", "--parent", "opencode:ses_root", "--agent", "explore");
  run("session", "describe", "opencode:ses_root", "--create", "OPW deployment on AWS", "--create-tag", "initiative:observability-pipeline");

  const location: { path: string } = JSON.parse(run("location", "--session", "opencode:ses_child", "--topic", "TGW quotas"));
  const evidence = record(write(location.path, "# TGW quotas\n"), "opencode:ses_child", "--category", "evidence", "--title", "TGW quotas");
  const article = record(write(join(root, "knowledge", "aws-environment.md"), "# AWS environment\n"), "opencode:ses_root", "--category", "knowledge", "--title", "AWS environment");

  run("describe", evidence, "--informs", article);

  const designFolder = join(root, "designs", "opw-deployment");

  record(write(join(designFolder, "design.md"), design), "opencode:ses_root", "--category", "record", "--title", "OPW deployment design");
  write(join(designFolder, "changes.md"), changes);
  write(join(designFolder, "doc.html"), '<html lang="en" data-doc="opw">');
  write(join(designFolder, "published", "opw.html"), '<html><head><meta name="design-changes" content="2"></head></html>');

  const meeting = join(root, "sources", "meetings", "2026-10-02-infra-working-session");

  record(write(join(meeting, "summary.md"), summary), "opencode:ses_root", "--category", "synthesis", "--title", "Meeting · Infra working session");
  write(join(root, "sources", "meetings", "2026-09-29-kickoff", "transcript.md"), "# Kickoff\n");
  write(join(root, "sources", "email", "opw-exposure.md"), thread);

  return { root, evidence, article, designFolder };
}

type Response = { readonly status: number; readonly body: string };

async function serve(root: string) {
  const assets = temporaryFolder("cairn-ui-assets-");
  const opened: string[] = [];

  write(join(assets, "index.html"), "<p>app</p>");

  const server: Server = await startUiServer({
    root,
    assets,
    host: "127.0.0.1",
    port: 0,
    now: () => new Date("2026-10-05T10:00:00Z"),
    openFolder: (folder) => opened.push(folder)
  });

  cleanups.push(() => server.close());

  // SAFETY: a server listening on a TCP port reports its address as an AddressInfo, never a pipe name or null.
  const { port } = server.address() as AddressInfo;

  const send = (path: string, options: { method?: string; host?: string; type?: string; body?: string } = {}): Promise<Response> =>
    new Promise((resolve, reject) => {
      const host = options.host ?? `localhost:${port}`;
      const headers = options.type === undefined ? { host } : { host, "content-type": options.type };

      const outgoing = request({ host: "127.0.0.1", port, path, method: options.method ?? "GET", headers }, (incoming) => {
        let body = "";

        incoming.setEncoding("utf8");
        incoming.on("data", (chunk: string) => {
          body += chunk;
        });
        incoming.on("end", () => resolve({ status: incoming.statusCode ?? 0, body }));
      });

      outgoing.on("error", reject);
      outgoing.end(options.body);
    });

  const json = async <Body>(path: string): Promise<Body> => {
    const response = await send(path);

    expect(response.status, response.body).toBe(200);

    return JSON.parse(response.body);
  };

  return { send, json, opened };
}

describe("cairn ui server", () => {
  test("the sidebar counts each part of the catalog and groups efforts by initiative", async () => {
    const { root } = catalog();
    const { json } = await serve(root);
    const sidebar = await json<SidebarData>("/api/sidebar");

    expect(sidebar.counts).toEqual({ efforts: 1, sessions: 1, knowledge: 1, designs: 1, sources: 3 });
    expect(sidebar.initiatives.map((group) => [group.initiative, group.efforts.map((effort) => effort.title)])).toEqual([
      ["initiative:observability-pipeline", ["OPW deployment on AWS"]]
    ]);
  });

  test("an effort's artifacts are grouped in view order and evidence names the article it was written up in", async () => {
    const { root } = catalog();
    const { json } = await serve(root);
    const effort = await json<EffortPage>("/api/efforts/opw-deployment-on-aws");

    expect(effort.groups.map((group) => group.group)).toEqual(["record", "knowledge", "synthesis", "evidence"]);
    expect(effort.groups.find((group) => group.group === "evidence")?.artifacts[0]?.written_up_in.map((article) => article.title)).toEqual([
      "AWS environment"
    ]);
    expect(effort.links).toEqual([]);
  });

  test("sessions list roots with their children and files, and a session page shows its tree", async () => {
    const { root } = catalog();
    const { json } = await serve(root);
    const sessions = await json<SessionListItem[]>("/api/sessions");
    const page = await json<SessionPage>("/api/sessions/opencode%3Ases_root");

    expect(sessions.map((session) => [session.key, session.child_count, session.file_count])).toEqual([["opencode:ses_root", 1, 4]]);
    expect(page.tree.map((node) => [node.session.key, node.depth, node.files.map((file) => file.title)])).toEqual([
      ["opencode:ses_root", 0, ["AWS environment", "OPW deployment design", "Meeting · Infra working session"]],
      ["opencode:ses_child", 1, ["TGW quotas"]]
    ]);
    expect(page.attachments.map((attachment) => attachment.slug)).toEqual(["opw-deployment-on-aws"]);
  });

  test("a design reports its settled decisions, open and deferred questions, and how far its published doc is behind", async () => {
    const { root } = catalog();
    const { json } = await serve(root);
    const [opw] = await json<DesignItem[]>("/api/designs");

    expect(opw).toMatchObject({
      title: "OPW deployment",
      summary: "Where OPW runs in AWS and what it may access.",
      efforts: ["opw-deployment-on-aws"],
      decisions: { total: 3, decided: 2 },
      open_questions: 1,
      deferred_questions: 1,
      published: { state: "behind", changes: 1 },
      doc_url: "/docs/opw-deployment/"
    });
  });

  test("a design's built doc is served at its doc_url, and nothing outside published/ is", async () => {
    const { root } = catalog();
    const { send } = await serve(root);
    const doc = await send("/docs/opw-deployment/");

    expect(doc.status).toBe(200);
    expect(doc.body).toContain('<meta name="design-changes" content="2">');

    for (const path of ["/docs/unbuilt/", "/docs/..%2Fsessions/", "/docs/%E0%A4%A/"]) {
      expect((await send(path)).status, path).toBe(404);
    }
  });

  test("sources are newest first, with each one's intake state", async () => {
    const { root } = catalog();
    const { json } = await serve(root);
    const sources = await json<SourceItem[]>("/api/sources");

    expect(sources.map((source) => [source.kind, source.title, source.date, source.intake])).toEqual([
      ["email", "Email · OPW exposure and IAM scope", "2026-10-05 08:02", { state: "reviewed_through", through: "2026-10-03", newer: 1 }],
      ["meeting", "Meeting · Infra working session", "2026-10-02", { state: "outcomes", accepted: 1, deferred: 1, rejected: 0 }],
      ["meeting", "Kickoff", "2026-09-29", { state: "not_reviewed" }]
    ]);
    expect(sources[1]?.efforts).toEqual(["opw-deployment-on-aws"]);
    expect(sources[2]?.path).toBe(join(root, "sources", "meetings", "2026-09-29-kickoff", "transcript.md"));
  });

  test("the viewer shows files under the root and nothing outside it", async () => {
    const { root, article } = catalog();
    const outside = write(join(temporaryFolder("cairn-outside-"), "secret.md"), "secret");
    const { send, json } = await serve(root);
    const shown = await json<FilePage>(`/api/file?path=${encodeURIComponent(article)}`);

    expect(shown).toMatchObject({ display_path: "knowledge/aws-environment.md", content: "# AWS environment\n", omitted: null });
    expect(shown.artifact?.category).toBe("knowledge");
    expect((await send(`/api/file?path=${encodeURIComponent(outside)}`)).status).toBe(404);
    expect((await send(`/api/file?path=${encodeURIComponent(join(root, "..", outside))}`)).status).toBe(404);
  });

  test("opening a folder takes a JSON request for a place under the root", async () => {
    const { root, designFolder } = catalog();
    const outside = temporaryFolder("cairn-outside-");
    const { send, opened } = await serve(root);
    const body = JSON.stringify({ path: designFolder });

    expect((await send("/api/open", { method: "POST", type: "text/plain", body })).status).toBe(415);
    expect((await send("/api/open", { method: "POST", type: "application/json", body })).status).toBe(200);
    expect((await send("/api/open", { method: "POST", type: "application/json", body: JSON.stringify({ path: outside }) })).status).toBe(404);
    expect(opened).toEqual([designFolder]);
  });

  test("requests addressed to another host are refused, and app routes fall back to the app", async () => {
    const { root } = catalog();
    const { send } = await serve(root);

    expect((await send("/api/sidebar", { host: "attacker.example" })).status).toBe(403);
    expect(await send("/sessions/anything")).toEqual({ status: 200, body: "<p>app</p>" });
  });
});
