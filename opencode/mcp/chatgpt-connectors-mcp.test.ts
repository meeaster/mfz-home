import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { once } from "node:events"
import { spawn } from "node:child_process"
import { join, resolve } from "node:path"

const ACCESS = "synthetic-access-token"
const ACCOUNT = "synthetic-account-id"
const ENABLED = "connector_enabled"
const DISABLED = "connector_disabled"
const executable = resolve(import.meta.dirname, "../../mcp/chatgpt-connectors/server.mjs")
const requests: Array<{ method?: string; name?: string; authorized: boolean; account: boolean }> = []
let directory: string
let authFile: string
let upstream: string

const tools = [
  { name: "mail.search", inputSchema: { type: "object" }, annotations: { readOnlyHint: true }, _meta: { connector_id: ENABLED } },
  { name: "mail.send", inputSchema: { type: "object" }, _meta: { connector_id: ENABLED } },
  {
    name: "teams.list_chats",
    inputSchema: { type: "object" },
    outputSchema: {
      type: "object",
      properties: { result: { type: "object", properties: { chats: { type: "array" } }, required: ["chats"] } },
      required: ["result"],
    },
    _meta: { connector_id: ENABLED },
  },
  { name: "calendar.search", inputSchema: { type: "object" }, _meta: { connector_id: DISABLED } },
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
    if (body.params?.name === "teams.list_chats") {
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
  authFile = join(directory, "auth.json")
  await writeAuth(authFile)
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
    expect(result.responses[1].result.tools).toEqual(tools.slice(0, 3))
    expect(requests.every((request) => request.authorized && request.account)).toBe(true)
  })

  test("forwards enabled calls and preserves structured results and metadata", async () => {
    requests.length = 0
    const result = await runMcp("/json", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "mail.send", arguments: { body: "synthetic" } } },
    ])

    expect(result.responses[2].result.structuredContent).toEqual({ preserved: true })
    expect(result.responses[2].result._meta).toEqual({ preserved: true })
    expect(requests.some((request) => request.method === "tools/call" && request.name === "mail.send")).toBe(true)
  })

  test("wraps malformed upstream structured content when the advertised schema requires result", async () => {
    const result = await runMcp("/json", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "teams.list_chats", arguments: { top: 1 } } },
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
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "mail.search", arguments: {} } },
    ])

    expect(result.responses[1].error.message).toBe("Tool name is ambiguous")
    expect(requests.some((request) => request.method === "tools/call")).toBe(false)
  })

  test("handles SSE responses", async () => {
    const result = await runMcp("/sse", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    ])
    expect(result.responses[1].result.tools).toEqual(tools.slice(0, 3))
  })

  test("reports redacted probe information", async () => {
    const result = await run(["--probe", ...baseArgs("/json")], [])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).not.toContain(ACCESS)
    expect(result.stdout).not.toContain(ACCOUNT)
    expect(JSON.parse(result.stdout)).toMatchObject({
      initialize: "succeeded",
      serverName: "fake-upstream",
      exposedToolCount: 3,
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

  test("rejects insecure auth file permissions and malformed auth", async () => {
    await chmod(authFile, 0o644)
    const insecure = await run(baseArgs("/json"), [])
    expect(insecure.exitCode).toBe(1)
    expect(insecure.stderr).toContain("auth_file_permissions_too_open")

    await chmod(authFile, 0o600)
    await writeFile(authFile, JSON.stringify({ openai: { type: "api" } }))
    const malformed = await run(baseArgs("/json"), [])
    expect(malformed.exitCode).toBe(1)
    expect(malformed.stderr).toContain("opencode_oauth_not_found")
    await writeAuth(authFile)
  })
})

function baseArgs(path: string) {
  return ["--auth-file", authFile, "--upstream", `${upstream}${path}`, "--connector", `mail=${ENABLED}`]
}

async function runMcp(path: string, messages: unknown[]) {
  return run(baseArgs(path), messages)
}

async function run(args: string[], messages: unknown[]) {
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
  if (!(await waitForServer(port, child))) {
    const [exitCode] = await exitPromise
    return { exitCode, stdout, stderr, responses: [] }
  }
  const responses = []
  for (const message of messages) {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
      body: JSON.stringify(message),
    })
    if (response.status !== 202) responses.push(await response.json())
  }
  child.kill()
  const [exitCode] = await exitPromise
  return { exitCode: exitCode ?? 0, stdout, stderr, responses }
}

async function waitForServer(port: number, child: ReturnType<typeof spawn>) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) return false
    try {
      await fetch(`http://127.0.0.1:${port}/mcp`, { method: "GET" })
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  throw new Error("MCP server did not start")
}

async function writeAuth(path: string) {
  await writeFile(
    path,
    JSON.stringify({ openai: { type: "oauth", access: ACCESS, refresh: "unused", expires: Date.now() + 60_000, accountId: ACCOUNT } }),
    { mode: 0o600 },
  )
  await chmod(path, 0o600)
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
