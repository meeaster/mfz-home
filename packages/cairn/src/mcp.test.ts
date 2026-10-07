import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { main } from "./cli.ts";
import { createCairnServer } from "./mcp.ts";

const toolResult = z.object({
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })),
  isError: z.boolean().optional()
});

const artifactEntry = z.object({
  path: z.string(),
  status: z.string(),
  pointer_type: z.string().nullable(),
  efforts: z.array(z.string())
});

const artifactList = z.object({ artifacts: z.array(artifactEntry) });

const describedSession = z.object({
  session: z.object({ key: z.string(), efforts: z.array(z.string()) }),
  close_matches: z.array(z.object({ requested: z.string(), matches: z.array(z.object({ slug: z.string() })) }))
});

const sessionList = z.object({ sessions: z.array(z.object({ key: z.string(), workstream: z.string().nullable() })) });

const writePath = z.object({ path: z.string() });

const effortView = z.object({
  action: z.literal("show"),
  result: z.object({
    slug: z.string(),
    links: z.array(z.object({ relation: z.string(), slug: z.string() })),
    artifacts: z.array(artifactEntry)
  })
});

const effortList = z.object({ efforts: z.array(z.object({ slug: z.string() })) });

const listedTools = z.object({ tools: z.array(z.object({ name: z.string(), inputSchema: z.object({ type: z.string() }) })) });

const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) {
    await cleanup();
  }
});

async function catalog() {
  const root = mkdtempSync(join(tmpdir(), "cairn-mcp-test-"));
  const now = () => new Date("2026-09-25T10:00:00");
  const server = createCairnServer({ root, now });
  const client = new Client({ name: "cairn-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  cleanups.push(async () => {
    await client.close();
    rmSync(root, { recursive: true, force: true });
  });

  const call = async (name: string, args: Record<string, z.core.util.JSONType>) => {
    const result = toolResult.parse(await client.callTool({ name, arguments: args }));

    return { isError: result.isError === true, text: result.content.map((part) => part.text).join("\n") };
  };

  const json = async <Parser extends z.ZodType>(parser: Parser, name: string, args: Record<string, z.core.util.JSONType>) => {
    const result = await call(name, args);

    if (result.isError) {
      throw new Error(`${name} failed: ${result.text}`);
    }

    return parser.parse(JSON.parse(result.text));
  };

  // The harness plugin records sessions and file writes through the CLI.
  const cli = (...args: string[]) => {
    const code = main(args, { CAIRN_ROOT: root }, { stdout: () => {}, stderr: () => {}, stdin: () => "", now, launchIndex: () => {}, pricing: () => null });

    expect(code).toBe(0);
  };

  const writeEvidence = async (session: string, topic: string) => {
    const { path } = await json(writePath, "catalog_location", { session, topic });

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `# ${topic}\n`);
    cli("capture", path, "--session", session);

    return path;
  };

  const index = (slug: string) => readFileSync(join(root, "efforts", slug, "index.md"), "utf8");

  const cliJson = (...args: string[]): z.core.util.JSONType => {
    let printed = "";

    const code = main([...args, "--json"], { CAIRN_ROOT: root }, {
      stdout: (text) => {
        printed += text;
      },
      stderr: () => {},
      stdin: () => "",
      now,
      launchIndex: () => {},
      pricing: () => null
    });

    expect(code).toBe(0);

    return z.json().parse(JSON.parse(printed));
  };

  return { root, client, call, json, cli, cliJson, writeEvidence, index };
}

describe("MCP tools", () => {
  test("every tool takes an object, which MCP clients require", async () => {
    const cairn = await catalog();
    const { tools } = listedTools.parse(await cairn.client.listTools());

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "catalog_describe",
      "catalog_effort",
      "catalog_find",
      "catalog_link",
      "catalog_location",
      "catalog_origin",
      "catalog_reference",
      "catalog_session"
    ]);
    expect(tools.every((tool) => tool.inputSchema.type === "object")).toBe(true);
  });

  test("an explore subagent's described evidence and a registered PR reach every effort the lead attaches", async () => {
    const cairn = await catalog();

    cairn.cli("session", "start", "opencode:lead");
    cairn.cli("session", "start", "opencode:explore", "--parent", "opencode:lead", "--agent", "explore");

    const accounts = await cairn.writeEvidence("opencode:explore", "AWS account structure");
    const retention = await cairn.writeEvidence("opencode:explore", "S3 retention costs");

    await cairn.json(artifactEntry, "catalog_describe", {
      path: accounts,
      category: "evidence",
      title: "AWS account structure",
      description: "Accounts, VPCs, and who owns them."
    });

    const attached = await cairn.json(describedSession, "catalog_session", {
      session: "opencode:lead",
      title: "Log pipeline research",
      attach: [{ create: { title: "Logs archived to S3" } }, { create: { title: "OPW deployment on AWS" } }]
    });

    expect(attached.session.efforts).toEqual(["logs-archived-to-s3", "opw-deployment-on-aws"]);

    const restricted = await cairn.json(artifactEntry, "catalog_describe", {
      path: retention,
      category: "evidence",
      title: "S3 retention costs",
      efforts: { exclude: ["opw-deployment-on-aws"] }
    });

    expect(restricted.efforts).toEqual(["logs-archived-to-s3"]);

    const pullRequest = await cairn.json(artifactEntry, "catalog_describe", {
      url: "https://github.com/acme/pipeline/pull/42",
      category: "deliverable",
      title: "Archive logs to S3",
      session: "opencode:lead"
    });

    expect(pullRequest.pointer_type).toBe("pull_request");

    const opw = await cairn.json(artifactList, "catalog_find", { target: "artifacts", effort: "opw-deployment-on-aws" });

    expect(opw.artifacts.map((entry) => entry.path).sort()).toEqual([accounts, "https://github.com/acme/pipeline/pull/42"].sort());
    expect(cairn.index("logs-archived-to-s3")).toContain("## Pull requests\n\n- [Archive logs to S3](https://github.com/acme/pipeline/pull/42)");
    expect(cairn.index("logs-archived-to-s3")).toContain("S3 retention costs");
  });

  test("a file written by a shell command at a path from catalog_location is credited to the session it was handed to, and no path is handed out twice", async () => {
    const cairn = await catalog();

    cairn.cli("session", "start", "opencode:lead");
    cairn.cli("session", "start", "opencode:explore", "--parent", "opencode:lead", "--agent", "explore");

    const { path } = await cairn.json(writePath, "catalog_location", { session: "opencode:explore", topic: "AWS account structure" });

    // No capture: the plugin only sees the write, edit, and patch tools.
    writeFileSync(path, "# AWS account structure\n");
    cairn.cli("read", path, "--session", "opencode:lead");

    await cairn.json(describedSession, "catalog_session", { session: "opencode:lead", attach: [{ create: { title: "Logs archived to S3" } }] });

    const described = await cairn.json(artifactEntry, "catalog_describe", { path, category: "evidence", title: "AWS account structure" });

    expect(described.efforts).toEqual(["logs-archived-to-s3"]);

    const unwritten = await cairn.json(writePath, "catalog_location", { session: "opencode:lead", topic: "S3 retention costs" });
    const again = await cairn.json(writePath, "catalog_location", { session: "opencode:lead", topic: "S3 retention costs" });

    expect(again.path).toBe(unwritten.path.replace("s3-retention-costs.md", "s3-retention-costs-2.md"));
  });

  test("a fresh session finds an effort phrased differently and resumes from its view", async () => {
    const cairn = await catalog();

    cairn.cli("session", "start", "opencode:earlier");

    const evidence = await cairn.writeEvidence("opencode:earlier", "AWS account structure");

    await cairn.json(describedSession, "catalog_session", {
      session: "opencode:earlier",
      attach: [{ create: { title: "Logs archived to S3" } }, { create: { title: "OPW deployment on AWS" } }]
    });

    const found = await cairn.json(effortList, "catalog_find", { target: "efforts", text: "archiving logs to S3" });

    expect(found.efforts.map((effort) => effort.slug)).toEqual(["logs-archived-to-s3"]);

    const view = await cairn.json(effortView, "catalog_effort", { action: "show", effort: "logs-archived-to-s3" });

    expect(view.result.artifacts.map((entry) => entry.path)).toEqual([evidence]);

    const resumed = await cairn.json(describedSession, "catalog_session", { session: "opencode:later", attach: ["logs-archived-to-s3"] });

    expect(resumed.session.efforts).toEqual(["logs-archived-to-s3"]);
  });

  test("creating an effort like an existing one returns the match until confirmed", async () => {
    const cairn = await catalog();

    await cairn.json(describedSession, "catalog_session", { session: "opencode:one", attach: [{ create: { title: "Logs archived to S3" } }] });

    const second = await cairn.json(describedSession, "catalog_session", {
      session: "opencode:two",
      attach: [{ create: { title: "Archive logs in S3" } }]
    });

    expect(second.session.efforts).toEqual([]);
    expect(second.close_matches[0]?.matches.map((effort) => effort.slug)).toEqual(["logs-archived-to-s3"]);

    const confirmed = await cairn.json(describedSession, "catalog_session", {
      session: "opencode:two",
      attach: [{ create: { title: "Archive logs in S3" }, confirm_new: true }]
    });

    expect(confirmed.session.efforts).toEqual(["archive-logs-in-s3"]);
  });

  test("a Chief loop finds an existing workstream by subject", async () => {
    const cairn = await catalog();

    cairn.cli("session", "start", "opencode:chief");
    cairn.cli("session", "start", "opencode:orchestrator", "--parent", "opencode:chief");
    await cairn.json(describedSession, "catalog_session", {
      session: "opencode:orchestrator",
      workstream: "review-pr-42",
      subject: "https://github.com/acme/pipeline/pull/42"
    });

    const found = await cairn.json(sessionList, "catalog_find", { target: "sessions", subject: "https://github.com/acme/pipeline/pull/42" });

    expect(found.sessions).toEqual([expect.objectContaining({ key: "opencode:orchestrator", workstream: "review-pr-42" })]);
  });

  test("efforts split and link through the flat effort and link inputs", async () => {
    const cairn = await catalog();

    cairn.cli("session", "start", "opencode:lead");
    await cairn.json(describedSession, "catalog_session", { session: "opencode:lead", attach: [{ create: { title: "Logs archived to S3" } }] });

    await cairn.call("catalog_effort", {
      action: "split",
      effort: "logs-archived-to-s3",
      title: "OPW deployment on AWS",
      sessions: ["opencode:lead"]
    });

    await cairn.call("catalog_link", { kind: "effort", action: "add", src: "logs-archived-to-s3", rel: "depends_on", dst: "opw-deployment-on-aws" });

    const reverse = await cairn.call("catalog_link", {
      kind: "effort",
      action: "add",
      src: "opw-deployment-on-aws",
      rel: "depends_on",
      dst: "logs-archived-to-s3"
    });

    expect(reverse).toEqual({ isError: true, text: expect.stringContaining("logs-archived-to-s3 already depends on opw-deployment-on-aws") });

    const view = await cairn.json(effortView, "catalog_effort", { action: "show", effort: "opw-deployment-on-aws" });

    expect(view.result.links).toEqual([
      expect.objectContaining({ relation: "needed_by", slug: "logs-archived-to-s3" }),
      expect.objectContaining({ relation: "split_from", slug: "logs-archived-to-s3" })
    ]);
  });

  test("invalid input comes back as a tool error naming the field", async () => {
    const cairn = await catalog();

    const missing = await cairn.call("catalog_effort", { action: "rename", effort: "no-such-effort", to: "other" });
    const relative = await cairn.call("catalog_describe", { path: "notes.md", category: "evidence" });
    const incomplete = await cairn.call("catalog_effort", { action: "merge", effort: "anything" });

    expect(missing).toEqual({ isError: true, text: expect.stringContaining("no-such-effort") });
    expect(relative).toEqual({ isError: true, text: expect.stringContaining("absolute path") });
    expect(incomplete).toEqual({ isError: true, text: "into: Invalid input: expected string, received undefined" });
  });
});

const accessList = z.array(z.object({ method: z.string(), detail: z.string() }));

const registeredOrigin = z.object({
  existing: z.boolean(),
  origin: z.object({ key: z.string(), access: accessList }),
  kind: z.object({ name: z.string(), identifier: z.string() })
});

const originKinds = z.object({
  kinds: z.array(z.object({ name: z.string(), identifier: z.string(), description: z.string(), origins: z.number() }))
});

const foundOrigins = z.object({ origins: z.array(z.object({ key: z.string(), articles: z.number(), references: z.number() })) });

const referenceEntry = z.object({
  article: z.string(),
  origin: z.string(),
  locator: z.string(),
  title: z.string(),
  sections: z.array(z.string()),
  observed_at: z.string(),
  version: z.string().nullable()
});

const recordedReference = z.object({ created: z.boolean(), reference: referenceEntry });

const referenceList = z.object({
  references: z.array(referenceEntry),
  origins: z.array(z.object({ key: z.string(), access: accessList }))
});

const checkReport = z.object({ unplaced: z.array(z.object({ article: z.string(), section: z.string() })) });

describe("Origins and references", () => {
  async function withArticle() {
    const cairn = await catalog();
    const article = join(cairn.root, "knowledge", "network-connectivity.md");

    cairn.cli("session", "start", "opencode:writer");
    mkdirSync(dirname(article), { recursive: true });
    writeFileSync(article, "# Network connectivity\n\n## VPN tunnels\n\n## Routing\n");
    cairn.cli("capture", article, "--session", "opencode:writer");
    await cairn.json(artifactEntry, "catalog_describe", {
      path: article,
      category: "knowledge",
      title: "Network connectivity",
      description: "How production reaches on-premises sites."
    });

    await cairn.json(registeredOrigin, "catalog_origin", {
      action: "register",
      origin: "aws:4471-0938-2215",
      title: "Prod network",
      access: [{ method: "AWS CLI", detail: "--profile prod-network-ro" }],
      new_kind: { identifier: "AWS account ID" }
    });

    return { ...cairn, article };
  }

  test("a later agent reuses a registered origin, adding the access method it used, and a new kind must say what its identifiers are", async () => {
    const cairn = await withArticle();

    const again = await cairn.json(registeredOrigin, "catalog_origin", {
      action: "register",
      origin: "aws:4471-0938-2215",
      title: "Production networking account",
      access: [{ method: "AWS MCP" }]
    });

    expect(again.existing).toBe(true);
    expect(again.origin.access).toEqual([
      { method: "AWS CLI", detail: "--profile prod-network-ro" },
      { method: "AWS MCP", detail: "" }
    ]);

    const unknownKind = await cairn.call("catalog_origin", { action: "register", origin: "sentry:acme", title: "Acme Sentry" });

    expect(unknownKind).toEqual({ isError: true, text: expect.stringContaining("new_kind") });

    await cairn.json(registeredOrigin, "catalog_origin", {
      action: "register",
      origin: "sentry:acme",
      title: "Acme Sentry",
      access: [{ method: "Sentry MCP" }],
      new_kind: { identifier: "Sentry org slug" }
    });

    const { kinds } = await cairn.json(originKinds, "catalog_origin", { action: "kinds" });

    expect(kinds).toEqual([
      { name: "aws", identifier: "AWS account ID", description: "", origins: 1 },
      { name: "sentry", identifier: "Sentry org slug", description: "", origins: 1 }
    ]);
  });

  test("an article's references list oldest observed first, and a new look replaces the observation", async () => {
    const cairn = await withArticle();

    await cairn.json(registeredOrigin, "catalog_origin", {
      action: "register",
      origin: "repo:github.com/acme/infra",
      title: "acme/infra",
      new_kind: { identifier: "Repository host and path" }
    });

    const vpn = await cairn.json(recordedReference, "catalog_reference", {
      action: "record",
      article: cairn.article,
      origin: "aws:4471-0938-2215",
      locator: "us-east-1 site-to-site VPN connections",
      title: "Site-to-site VPN connections",
      sections: ["VPN tunnels"],
      observed_at: "2026-10-02"
    });

    await cairn.json(recordedReference, "catalog_reference", {
      action: "record",
      article: cairn.article,
      origin: "repo:github.com/acme/infra",
      locator: "terraform/network/**",
      title: "Network Terraform modules",
      sections: ["Routing"],
      observed_at: "2026-09-28",
      version: "3f2a91c"
    });

    expect(vpn.created).toBe(true);

    const listed = await cairn.json(referenceList, "catalog_reference", { action: "list", article: cairn.article });

    expect(listed.references.map((entry) => entry.title)).toEqual(["Network Terraform modules", "Site-to-site VPN connections"]);
    expect(listed.origins.find((origin) => origin.key === "aws:4471-0938-2215")?.access).toEqual([
      { method: "AWS CLI", detail: "--profile prod-network-ro" }
    ]);

    const relooked = await cairn.json(recordedReference, "catalog_reference", {
      action: "record",
      article: cairn.article,
      origin: "repo:github.com/acme/infra",
      locator: "terraform/network/**",
      observed_at: "2026-10-05",
      version: "9be04d2"
    });

    expect(relooked).toEqual({
      created: false,
      reference: expect.objectContaining({ sections: ["Routing"], observed_at: "2026-10-05", version: "9be04d2" })
    });

    const { origins } = await cairn.json(foundOrigins, "catalog_origin", { action: "find", text: "infra" });

    expect(origins).toEqual([expect.objectContaining({ key: "repo:github.com/acme/infra", articles: 1, references: 1 })]);
  });

  test("references attach only to knowledge articles, and check reports a section whose heading was renamed", async () => {
    const cairn = await withArticle();
    const evidence = await cairn.writeEvidence("opencode:writer", "VPN tunnel status");

    await cairn.json(artifactEntry, "catalog_describe", { path: evidence, category: "evidence" });

    const onEvidence = await cairn.call("catalog_reference", {
      action: "record",
      article: evidence,
      origin: "aws:4471-0938-2215",
      locator: "us-east-1 VPN connections",
      title: "VPN connections"
    });

    expect(onEvidence).toEqual({ isError: true, text: expect.stringContaining("isn't a knowledge article") });

    await cairn.json(recordedReference, "catalog_reference", {
      action: "record",
      article: cairn.article,
      origin: "aws:4471-0938-2215",
      locator: "us-east-1 transit gateway route tables",
      title: "Transit gateway route tables",
      sections: ["Routing"]
    });
    writeFileSync(cairn.article, "# Network connectivity\n\n## VPN tunnels\n\n## Routing and peering\n");

    expect(checkReport.parse(cairn.cliJson("check")).unplaced).toEqual([{ article: cairn.article, section: "Routing" }]);
  });
});
