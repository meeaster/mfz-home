import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { DatabaseSync } from "node:sqlite"
import { once } from "node:events"
import { spawn } from "node:child_process"
import { join, resolve } from "node:path"

const ACCESS = "synthetic-access-token"
const ACCOUNT = "synthetic-account-id"
const ENABLED = "connector_enabled"
const CALENDAR = "connector_calendar"
const DISABLED = "connector_disabled"
const executable = resolve(import.meta.dirname, "../../mcp/chatgpt-connectors/server.mjs")
const requests: Array<{ method?: string; name?: string; authorized: boolean; account: boolean }> = []
let directory: string
let databaseFile: string
let upstream: string

const tools = [
  { name: "mail.search", inputSchema: { type: "object" }, annotations: { readOnlyHint: true }, _meta: { connector_id: ENABLED } },
  { name: "mail.send", inputSchema: { type: "object" }, _meta: { connector_id: ENABLED } },
  {
    name: "mail.list_chats",
    inputSchema: { type: "object" },
    outputSchema: {
      type: "object",
      properties: { result: { type: "object", properties: { chats: { type: "array" } }, required: ["chats"] } },
      required: ["result"],
    },
    _meta: { connector_id: ENABLED },
  },
  { name: "calendar.search", inputSchema: { type: "object" }, _meta: { connector_id: CALENDAR } },
]

const server = createServer(async (request, response) => {
  const body = JSON.parse(await readBody(request))
  requests.push({
    method: body.method,
    name: body.params?.name,
    authorized: request.headers.authorization === `Bearer ${ACCESS}`,
    account: request.headers["chatgpt-account-id"] === ACCOUNT,
  })

  if (request.url === "/unauthorized") return void respond(response, {}, 401)
  if (request.url === "/timeout") return
  if (request.url === "/invalid") {
    response.writeHead(200, { "content-type": "application/json" })
    response.end("not-json")
    return
  }
  if (body.method === "notifications/initialized") return void respond(response, undefined, 202)
  if (body.method === "initialize") {
    return void respond(response, {
      jsonrpc: "2.0",
      id: body.id,
      result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "fake-upstream", version: "1" } },
    })
  }
  if (body.method === "tools/list") {
    if (request.url === "/bad-prefix") {
      return void respond(response, { jsonrpc: "2.0", id: body.id, result: { tools: [{ ...tools[0], name: "wrong.search" }] } })
    }
    if (request.url === "/mcp-error") {
      return void respond(response, { jsonrpc: "2.0", id: body.id, error: { code: -32000, message: "synthetic upstream error" } })
    }
    if (request.url === "/ambiguous") {
      return void respond(response, {
        jsonrpc: "2.0",
        id: body.id,
        result: { tools: [tools[0], { ...tools[0], _meta: { connector_id: ENABLED } }] },
      })
    }
    const result = body.params?.cursor ? { tools: tools.slice(1) } : { tools: tools.slice(0, 1), nextCursor: "page-2" }
    const payload = { jsonrpc: "2.0", id: body.id, result }
    if (request.url === "/sse") {
      response.writeHead(200, { "content-type": "text/event-stream", "mcp-session-id": "fake-session" })
      response.end(`event: message\ndata: ${JSON.stringify(payload)}\n\n`)
      return
    }
    return void respond(response, payload, 200, { "mcp-session-id": "fake-session" })
  }
  if (body.method === "tools/call") {
    if (body.params?.name === "mail.list_chats") {
      return void respond(response, {
        jsonrpc: "2.0",
        id: body.id,
        result: { content: [{ type: "text", text: "ok" }], structuredContent: { chats: [] } },
      })
    }
    return void respond(response, {
      jsonrpc: "2.0",
      id: body.id,
      result: { content: [{ type: "text", text: "ok" }], structuredContent: { preserved: true }, _meta: { preserved: true } },
    })
  }
  respond(response, { jsonrpc: "2.0", id: body.id, result: {} })
})

beforeAll(async () => {
  await mkdir("/tmp/opencode", { recursive: true })
  directory = await mkdtemp("/tmp/opencode/chatgpt-connectors-mcp-")
  databaseFile = join(directory, "opencode.db")
  writeCredentialDatabase(databaseFile)
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Fake upstream did not bind")
  upstream = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  server.close()
  await once(server, "close")
  await rm(directory, { recursive: true, force: true })
})

describe("chatgpt-connectors-mcp", () => {
  test("filters paginated tools by exact connector ID and forwards notifications without a response", async () => {
    requests.length = 0
    const result = await runMcp("/json", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    ])

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toContain("listening on")
    expect(result.responses).toHaveLength(2)
    expect(result.responses[1].result.tools).toEqual(tools.slice(0, 3).map((tool) => ({ ...tool, name: tool.name.slice(5) })))
    expect(requests.every((request) => request.authorized && request.account)).toBe(true)
  })

  test("forwards enabled calls and preserves structured results and metadata", async () => {
    requests.length = 0
    const result = await runMcp("/json", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "send", arguments: { body: "synthetic" } } },
    ])

    expect(result.responses[2].result.structuredContent).toEqual({ preserved: true })
    expect(result.responses[2].result._meta).toEqual({ preserved: true })
    expect(requests.some((request) => request.method === "tools/call" && request.name === "mail.send")).toBe(true)
  })

  test("wraps malformed upstream structured content when the advertised schema requires result", async () => {
    const result = await runMcp("/json", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_chats", arguments: { top: 1 } } },
    ])

    expect(result.responses[1].result.structuredContent).toEqual({ result: { chats: [] } })
  })

  test.each(["calendar.search", "missing.tool"])("rejects disabled or unknown tool %s before forwarding", async (name) => {
    requests.length = 0
    const result = await runMcp("/json", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: {} } },
    ])

    expect(result.responses[1].error.message).toBe("Tool is unknown, disabled, or stale")
    expect(requests.some((request) => request.method === "tools/call")).toBe(false)
  })

  test("rejects ambiguous enabled tool names before forwarding", async () => {
    requests.length = 0
    const result = await runMcp("/ambiguous", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search", arguments: {} } },
    ])

    expect(result.responses[1].error.message).toBe("upstream_tool_name_collision")
    expect(requests.some((request) => request.method === "tools/call")).toBe(false)
  })

  test("handles SSE responses", async () => {
    const result = await runMcp("/sse", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    ])
    expect(result.responses[1].result.tools).toEqual(tools.slice(0, 3).map((tool) => ({ ...tool, name: tool.name.slice(5) })))
  })

  test("routes endpoints independently and rejects the legacy aggregate route", async () => {
    requests.length = 0
    const args = [...baseArgs("/json"), "--connector", `calendar=${CALENDAR}`]
    const result = await run(args, [
      { route: "/mcp/mail?codemode=false", message: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} } },
      { route: "/mcp/calendar", message: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} } },
      { route: "/mcp", message: { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} } },
    ])
    expect(result.responses[0].result.tools.map((tool: { name: string }) => tool.name)).toEqual(["search", "send", "list_chats"])
    expect(result.responses[1].result.tools.map((tool: { name: string }) => tool.name)).toEqual(["search"])
    expect(result.responses[2]).toEqual({ error: "not_found" })
  })

  test("fails only the endpoint with a matching tool missing its alias prefix", async () => {
    const bad = await run([...baseArgs("/bad-prefix"), "--connector", `calendar=${CALENDAR}`], [
      { route: "/mcp/mail", message: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} } },
      { route: "/mcp/calendar", message: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} } },
    ])
    expect(bad.responses[0].error.message).toBe("upstream_tool_prefix_mismatch")
    expect(bad.responses[1].result.tools).toEqual([])
  })

  test("reports redacted probe information", async () => {
    const result = await run(["--probe", ...baseArgs("/json")], [])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain(ACCESS)
    expect(result.stdout).not.toContain(ACCOUNT)
    expect(JSON.parse(result.stdout)).toMatchObject({
      initialize: "succeeded",
      endpoints: [{ alias: "mail", serverName: "fake-upstream", exposedToolCount: 3 }],
      enabledConnectors: [{ alias: "mail", id: ENABLED }],
    })
  })

  test("classifies upstream authentication failures without exposing credentials", async () => {
    const result = await run(baseArgs("/unauthorized"), [{ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }])
    expect(result.responses[0].error.message).toBe("upstream_authentication_failed")
    expect(result.stdout + result.stderr).not.toContain(ACCESS)
    expect(result.stdout + result.stderr).not.toContain(ACCOUNT)
  })

  test.each([
    ["/invalid", "upstream_invalid_response", []],
    ["/mcp-error", "upstream_tools_list_failed", []],
    ["/timeout", "upstream_timeout", ["--timeout-ms", "25"]],
  ])("classifies failure from %s", async (path, expected, extraArgs) => {
    const result = await run([...baseArgs(path), ...extraArgs], [
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    ])
    expect(result.responses[0].error.message).toBe(expected)
  })

  test("rejects malformed V2 credentials", async () => {
    updateCredential({ type: "api", key: "not-used" })
    const malformed = await run(baseArgs("/json"), [])
    expect(malformed.exitCode).toBe(1)
    expect(malformed.stderr).toContain("opencode_oauth_not_found")
    updateCredential(v2Credential())
  })
})

function baseArgs(path: string) {
  return ["--database-file", databaseFile, "--upstream", `${upstream}${path}`, "--connector", `mail=${ENABLED}`]
}

async function runMcp(path: string, messages: unknown[]) {
  return run(baseArgs(path), messages, "/mcp/mail")
}

async function run(args: string[], messages: unknown[], route = "/mcp/mail") {
  const port = 18765
  const child = spawn(process.execPath, [executable, ...args, "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] })
  let stdout = ""
  let stderr = ""
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk))
  child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk))
  const exitPromise = once(child, "exit") as Promise<[number]>
  if (args.includes("--probe")) {
    const [exitCode] = await exitPromise
    return { exitCode, stdout, stderr, responses: [] }
  }
  if (!(await waitForServer(port, child, route))) {
    const [exitCode] = await exitPromise
    return { exitCode, stdout, stderr, responses: [] }
  }
  const responses = []
  for (const message of messages) {
    const entry = message as { message?: unknown; route?: string }
    const response = await fetch(`http://127.0.0.1:${port}${entry.route ?? route}`, {
      method: "POST",
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
      body: JSON.stringify(entry.message ?? message),
    })
    if (response.status !== 202) responses.push(await response.json())
  }
  child.kill()
  const [exitCode] = await exitPromise
  return { exitCode: exitCode ?? 0, stdout, stderr, responses }
}

async function waitForServer(port: number, child: ReturnType<typeof spawn>, route: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) return false
    try {
      await fetch(`http://127.0.0.1:${port}${route}`, { method: "GET" })
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  throw new Error("MCP server did not start")
}

function writeCredentialDatabase(path: string) {
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TABLE credential (
      id TEXT PRIMARY KEY,
      integration_id TEXT,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      connector_id TEXT,
      method_id TEXT,
      active INTEGER,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    )
  `)
  const now = Date.now()
  database
    .prepare(
      "INSERT INTO credential (id, integration_id, label, value, active, time_created, time_updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("credential-1", "openai", "default", JSON.stringify(v2Credential()), 1, now, now)
  database.close()
}

function updateCredential(value: unknown) {
  const database = new DatabaseSync(databaseFile)
  database.prepare("UPDATE credential SET value = ?, time_updated = ? WHERE id = ?").run(JSON.stringify(value), Date.now(), "credential-1")
  database.close()
}

function v2Credential() {
  return { type: "oauth", methodID: "chatgpt-browser", refresh: "unused", access: ACCESS, expires: Date.now() + 60_000, metadata: { accountID: ACCOUNT } }
}

async function readBody(request: IncomingMessage) {
  request.setEncoding("utf8")
  let body = ""
  for await (const chunk of request) body += chunk
  return body
}

function respond(response: ServerResponse, body?: unknown, status = 200, headers: Record<string, string> = {}) {
  if (body === undefined) {
    response.writeHead(status, headers)
    response.end()
    return
  }
  response.writeHead(status, { "content-type": "application/json", ...headers })
  response.end(JSON.stringify(body))
}
