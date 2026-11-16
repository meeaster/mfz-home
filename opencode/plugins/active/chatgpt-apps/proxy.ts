import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { z } from "zod";

import type { CodexAuth } from "./codex-auth.js";

// ChatGPT's apps endpoint: one MCP server carrying the tools of every connector linked to the account.
export const CHATGPT_APPS_URL = "https://chatgpt.com/backend-api/ps/mcp";

// Every OpenCode server asks for its tools at startup; one cached upstream list answers all of them.
const TOOLS_TTL_MS = 5 * 60 * 1000;

const Tool = z.looseObject({
  name: z.string(),
  _meta: z.looseObject({ connector_id: z.string(), connector_name: z.string() }).optional(),
});

type Tool = z.infer<typeof Tool>;

const ToolsPage = z.object({
  result: z.object({ tools: z.array(Tool), nextCursor: z.string().optional() }),
});

const Request = z.looseObject({ jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number()]).optional(), method: z.string() });

export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly tools: number;
}

export interface AppsProxyOptions {
  readonly auth: CodexAuth;
  readonly upstream?: string;
}

// The upstream answers in either JSON or a short SSE stream; collect every JSON-RPC message either way.
function messages(contentType: string, body: string): unknown[] {
  if (!contentType.includes("text/event-stream")) return [JSON.parse(body)];

  const parsed: unknown[] = [];

  for (const event of body.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (data !== "") parsed.push(JSON.parse(data));
  }

  return parsed;
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) chunks.push(Buffer.from(chunk));

  return Buffer.concat(chunks).toString("utf8");
}

type JsonReply =
  | { readonly error: string }
  | { readonly jsonrpc: "2.0"; readonly id: string | number | null; readonly result: { readonly tools: Tool[] } };

function sendJson(response: ServerResponse, status: number, body: JsonReply) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

// Serves one MCP endpoint per ChatGPT connector at /c/<connector_id> on localhost. tools/list is answered from the
// upstream list filtered to that connector; every other message is forwarded to ChatGPT with the Codex login attached.
export class AppsProxy {
  readonly #auth: CodexAuth;

  readonly #upstream: string;

  readonly #server: Server;

  #tools: { readonly at: number; readonly list: Promise<Tool[]> } | undefined;

  constructor(options: AppsProxyOptions) {
    this.#auth = options.auth;
    this.#upstream = options.upstream ?? CHATGPT_APPS_URL;
    this.#server = createServer((request, response) => void this.#serve(request, response));
  }

  async start() {
    await new Promise<void>((resolve) => this.#server.listen(0, "127.0.0.1", resolve));

    // SAFETY: listen() on a TCP port, unlike a pipe, always yields an AddressInfo.
    const { port } = this.#server.address() as AddressInfo;

    return `http://127.0.0.1:${port}`;
  }

  async close() {
    this.#server.closeAllConnections();
    await new Promise<void>((resolve) => this.#server.close(() => resolve()));
  }

  async connectors(): Promise<Connector[]> {
    const byId = new Map<string, { name: string; tools: number }>();

    for (const tool of await this.#allTools()) {
      if (!tool._meta) continue;

      const entry = byId.get(tool._meta.connector_id) ?? { name: tool._meta.connector_name, tools: 0 };

      entry.tools += 1;
      byId.set(tool._meta.connector_id, entry);
    }

    return [...byId].map(([id, { name, tools }]) => ({ id, name, tools }));
  }

  async #post(body: string, headers = new Headers()) {
    const { accessToken, accountId } = await this.#auth.token();

    headers.set("authorization", `Bearer ${accessToken}`);
    headers.set("content-type", "application/json");
    headers.set("accept", "application/json, text/event-stream");

    if (accountId !== undefined) headers.set("chatgpt-account-id", accountId);

    return fetch(this.#upstream, { method: "POST", headers, body });
  }

  #allTools() {
    if (this.#tools && Date.now() - this.#tools.at < TOOLS_TTL_MS) return this.#tools.list;

    const list = this.#fetchTools();

    this.#tools = { at: Date.now(), list };
    // A failed fetch must not stay cached for the whole TTL.
    list.catch(() => {
      if (this.#tools?.list === list) this.#tools = undefined;
    });

    return list;
  }

  async #fetchTools() {
    const tools: Tool[] = [];

    let cursor: string | undefined;

    do {
      const params = cursor === undefined ? {} : { cursor };
      const response = await this.#post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params }));
      const text = await response.text();

      if (!response.ok) throw new Error(`ChatGPT apps tools/list failed with HTTP ${response.status}: ${text.slice(0, 200)}`);

      const page = ToolsPage.parse(messages(response.headers.get("content-type") ?? "", text).at(-1));

      tools.push(...page.result.tools);
      cursor = page.result.nextCursor;
    } while (cursor !== undefined);

    return tools;
  }

  async #serve(request: IncomingMessage, response: ServerResponse) {
    try {
      await this.#handle(request, response);
    } catch (error) {
      if (response.headersSent) response.destroy();
      else sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async #handle(request: IncomingMessage, response: ServerResponse) {
    const connectorId = /^\/c\/([^/?]+)/.exec(request.url ?? "")?.[1];

    if (connectorId === undefined) return sendJson(response, 404, { error: "unknown path" });

    // Stateless upstream: there is no server-initiated stream to open and no session to delete.
    if (request.method !== "POST") return sendJson(response, 405, { error: "method not allowed" });

    const body = await readBody(request);
    const parsed = Request.safeParse(JSON.parse(body));

    if (parsed.success && parsed.data.method === "tools/list") {
      const id = decodeURIComponent(connectorId);
      const tools = (await this.#allTools()).filter((tool) => tool._meta?.connector_id === id);

      return sendJson(response, 200, { jsonrpc: "2.0", id: parsed.data.id ?? null, result: { tools } });
    }

    const forwarded = new Headers();

    for (const name of ["mcp-session-id", "mcp-protocol-version"]) {
      const value = request.headersDistinct[name]?.[0];

      if (value !== undefined) forwarded.set(name, value);
    }

    const upstream = await this.#post(body, forwarded);

    for (const name of ["content-type", "mcp-session-id"]) {
      const value = upstream.headers.get(name);

      if (value !== null) response.setHeader(name, value);
    }

    response.writeHead(upstream.status);

    // Stream rather than buffer, so progress notifications in a long tool call's SSE reply arrive as they happen.
    const reader = upstream.body?.getReader();

    if (reader)
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) response.write(chunk.value);

    response.end();
  }
}
