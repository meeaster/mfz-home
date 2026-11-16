import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CodexAuth } from "./codex-auth.js";
import { AppsClient, AppsProxy } from "./proxy.js";

function jwt(expiresInSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).toString("base64url");

  return `e30.${payload}.sig`;
}

const tool = (name: string, connectorId: string, connectorName: string) => ({
  name,
  inputSchema: { type: "object" },
  _meta: { connector_id: connectorId, connector_name: connectorName },
});

async function body(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) chunks.push(Buffer.from(chunk));

  return Buffer.concat(chunks).toString("utf8");
}

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

interface Seen {
  readonly authorizations: string[];
  readonly refreshes: string[];
}

// A stand-in for ChatGPT: the apps endpoint at /mcp (SSE replies, like the real one) and the token endpoint at /token.
async function fakeChatGpt(refreshed: string) {
  const seen: Seen = { authorizations: [], refreshes: [] };

  const server = createServer(async (request, response) => {
    const text = await body(request);

    if (request.url === "/token") {
      seen.refreshes.push(new URLSearchParams(text).get("refresh_token") ?? "");
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ access_token: refreshed, refresh_token: "rt-2", id_token: "id-2" }));

      return;
    }

    seen.authorizations.push(request.headers.authorization ?? "");

    const message = JSON.parse(text);

    const result =
      message.method === "tools/list"
        ? { tools: [tool("github.search", "c_gh", "GitHub"), tool("gmail.send", "c_gm", "Gmail"), tool("github.pr", "c_gh", "GitHub")] }
        : { content: [{ type: "text", text: `called ${message.params.name}` }] };

    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n\n`);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  closers.push(() => new Promise((resolve) => server.close(() => resolve())));

  // SAFETY: listen() on a TCP port, unlike a pipe, always yields an AddressInfo.
  const { port } = server.address() as AddressInfo;

  return { url: `http://127.0.0.1:${port}`, seen };
}

async function authFile(accessToken: string) {
  const path = join(await mkdtemp(join(tmpdir(), "chatgpt-apps-")), "auth.json");

  await writeFile(
    path,
    JSON.stringify({ auth_mode: "chatgpt", tokens: { id_token: "id-1", access_token: accessToken, refresh_token: "rt-1", account_id: "acct" } }),
  );

  return path;
}

async function startProxy(path: string, upstream: string) {
  const client = new AppsClient({ auth: new CodexAuth({ path, tokenUrl: `${upstream}/token` }), upstream: `${upstream}/mcp` });
  const proxy = new AppsProxy(client);
  const base = await proxy.start();

  closers.push(() => proxy.close());

  const rpc = async (connector: string, method: string, params: { name?: string; arguments?: Record<string, string> } = {}) => {
    const response = await fetch(`${base}/c/${connector}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 7, method, params }),
    });

    return { contentType: response.headers.get("content-type"), text: await response.text() };
  };

  return { client, rpc };
}

describe("AppsProxy", () => {
  it("gives each connector only its own tools and forwards calls with the Codex login", async () => {
    const access = jwt(3600);
    const chatgpt = await fakeChatGpt("unused");
    const { client, rpc } = await startProxy(await authFile(access), chatgpt.url);

    expect(await client.connectors()).toEqual([
      { id: "c_gh", name: "GitHub", tools: 2 },
      { id: "c_gm", name: "Gmail", tools: 1 },
    ]);

    const listed = JSON.parse((await rpc("c_gh", "tools/list")).text);

    expect(listed.result.tools.map((t: { name: string }) => t.name)).toEqual(["github.search", "github.pr"]);

    const called = await rpc("c_gh", "tools/call", { name: "github.search", arguments: {} });

    expect(called.contentType).toBe("text/event-stream");
    expect(called.text).toContain("called github.search");
    expect(new Set(chatgpt.seen.authorizations)).toEqual(new Set([`Bearer ${access}`]));
  });

  it("refreshes an expired login and writes it back in Codex's format", async () => {
    const refreshed = jwt(3600);
    const chatgpt = await fakeChatGpt(refreshed);
    const path = await authFile(jwt(-60));
    const { rpc } = await startProxy(path, chatgpt.url);

    await Promise.all([rpc("c_gh", "tools/call", { name: "github.search" }), rpc("c_gm", "tools/call", { name: "gmail.send" })]);

    expect(chatgpt.seen.refreshes).toEqual(["rt-1"]);
    expect(chatgpt.seen.authorizations).toEqual([`Bearer ${refreshed}`, `Bearer ${refreshed}`]);

    const saved = JSON.parse(await readFile(path, "utf8"));

    expect(saved).toMatchObject({
      auth_mode: "chatgpt",
      tokens: { id_token: "id-2", access_token: refreshed, refresh_token: "rt-2", account_id: "acct" },
      last_refresh: expect.any(String),
    });
  });
});
