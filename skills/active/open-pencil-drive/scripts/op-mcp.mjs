// Minimal OpenPencil MCP client for scripted builds: one session, closed when the callback ends.
//
//   import { withSession } from "./op-mcp.mjs";
//   await withSession("Recorder", async (op) => {
//     await op.call("render", { document_id, page_id, parent_id, jsx });
//   });
//
// Each MCP session shows in the editor as a named agent; the server keeps at most 10 and drops idle ones
// after 15 minutes, so the session is always deleted, even when the callback throws.

const url = process.env.OPENPENCIL_MCP_URL ?? "http://127.0.0.1:7600/mcp";

const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };

/** Parses a JSON or single-event SSE response body; empty bodies (notifications, DELETE) give null. */
function parseBody(text) {
  if (text.trim() === "") return null;

  const data = text.startsWith("event:") || text.startsWith("data:")
    ? text.split("\n").find((line) => line.startsWith("data:")).slice(5)
    : text;

  return JSON.parse(data);
}

/** Tool results carry one text part; JSON text is parsed, anything else is returned as a string. */
function parseToolText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

class Session {
  #sessionId = null;

  #requestId = 0;

  async #post(body, method = "POST") {
    const response = await fetch(url, {
      method,
      headers: this.#sessionId ? { ...headers, "mcp-session-id": this.#sessionId } : headers,
      body: body === null ? undefined : JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`OpenPencil MCP ${method} failed: ${response.status} ${await response.text()}`);

    this.#sessionId ??= response.headers.get("mcp-session-id");

    return parseBody(await response.text());
  }

  async open(name) {
    await this.#post({
      jsonrpc: "2.0",
      id: this.#requestId,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name, version: "0" } },
    });
    await this.#post({ jsonrpc: "2.0", method: "notifications/initialized" });
  }

  /** Calls a tool and returns its text result, parsed as JSON when possible. Throws on tool errors. */
  async call(tool, args) {
    this.#requestId += 1;

    const { result } = await this.#post({
      jsonrpc: "2.0",
      id: this.#requestId,
      method: "tools/call",
      params: { name: tool, arguments: args },
    });

    const text = result.content?.[0]?.text ?? "";

    if (result.isError) throw new Error(`${tool}: ${text}`);

    return parseToolText(text);
  }

  async close() {
    if (this.#sessionId === null) return;

    await this.#post(null, "DELETE").catch(() => null);
    this.#sessionId = null;
  }
}

/** Opens a session named `name` (shown on the canvas), runs `work(session)`, and always closes it. */
export async function withSession(name, work) {
  const session = new Session();

  try {
    await session.open(name);

    return await work(session);
  } finally {
    await session.close();
  }
}
