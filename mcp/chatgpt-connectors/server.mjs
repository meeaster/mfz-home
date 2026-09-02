#!/usr/bin/env node

import { lstat } from "node:fs/promises"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

const DEFAULT_UPSTREAM = "https://chatgpt.com/backend-api/ps/mcp"
const DEFAULT_DATABASE_FILE = "~/.local/share/opencode/opencode.db"
const OPENAI_INTEGRATION_ID = "openai"
const PROTOCOL_VERSION = "2025-06-18"
const CLIENT_INFO = { name: "chatgpt-connectors-mcp", version: "0.1.0" }
const MAX_TOOL_PAGES = 100
const MAX_REQUEST_BYTES = 4 * 1024 * 1024

class ProxyError extends Error {}

class UpstreamClient {
  #sessionId
  #requestId = 1_000_000

  constructor(options, credentialStore) {
    this.options = options
    this.credentialStore = credentialStore
  }

  nextRequestId() {
    return this.#requestId++
  }

  async send(message) {
    const credential = this.credentialStore.read()
    const headers = new Headers({
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${credential.access}`,
      "ChatGPT-Account-Id": credential.accountId,
      "X-OpenAI-Product-Sku": "codex",
      originator: "chatgpt-connectors-mcp",
    })
    if (this.#sessionId) headers.set("mcp-session-id", this.#sessionId)

    let response
    try {
      response = await fetch(this.options.upstream, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") throw new ProxyError("upstream_timeout")
      throw new ProxyError("upstream_unreachable")
    }

    this.#sessionId = response.headers.get("mcp-session-id") ?? this.#sessionId
    if (response.status === 401) throw new ProxyError("upstream_authentication_failed")
    if (response.status === 403) throw new ProxyError("upstream_access_forbidden")
    if (!response.ok) throw new ProxyError(`upstream_http_${response.status}`)
    if (response.status === 202 || response.status === 204) return undefined

    const text = await response.text()
    if (!text) return undefined
    const contentType = response.headers.get("content-type") ?? ""
    const payloads = contentType.includes("text/event-stream") ? extractSsePayloads(text) : [text]
    for (const payload of payloads) {
      let parsed
      try {
        parsed = JSON.parse(payload)
      } catch {
        throw new ProxyError("upstream_invalid_response")
      }
      if (message.id === undefined || parsed?.id === message.id) return parsed
    }
    throw new ProxyError("upstream_response_id_mismatch")
  }
}

class ConnectorProxy {
  constructor(options, upstream) {
    this.options = options
    this.upstream = upstream
  }

  async handle(request) {
    if (!isRecord(request) || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
      return rpcError(request?.id ?? null, -32600, "Invalid JSON-RPC request")
    }

    try {
      if (request.method === "initialize") {
        const response = await this.upstream.send({
          ...request,
          params: {
            ...(isRecord(request.params) ? request.params : {}),
            protocolVersion: request.params?.protocolVersion ?? PROTOCOL_VERSION,
            clientInfo: request.params?.clientInfo ?? CLIENT_INFO,
          },
        })
        return request.id === undefined ? undefined : requireResponse(response)
      }

      if (request.method === "tools/list") return await this.#listTools(request)
      if (request.method === "tools/call") return await this.#callTool(request)

      const response = await this.upstream.send(request)
      return request.id === undefined ? undefined : requireResponse(response)
    } catch (error) {
      if (request.id === undefined) return undefined
      return rpcError(request.id, -32603, classifyError(error))
    }
  }

  async #listTools(request) {
    const { tools, template } = await this.#discoverTools()
    return {
      ...template,
      id: request.id,
      result: { ...template.result, tools, nextCursor: undefined },
    }
  }

  async #callTool(request) {
    const name = isRecord(request.params) && typeof request.params.name === "string" ? request.params.name : ""
    if (!name) return rpcError(request.id, -32602, "Tool name is required")

    const discovered = await this.#discoverTools()
    const mapping = discovered.toolsByName.get(name)
    if (!mapping) return rpcError(request.id, -32602, "Tool is unknown, disabled, or stale")

    return normalizeToolResult(
      requireResponse(
        await this.upstream.send({
          ...request,
          params: { ...request.params, name: mapping.upstreamName },
        }),
      ),
      mapping.tool,
    )
  }

  async #discoverTools() {
    const allTools = []
    let cursor
    let template
    const seenCursors = new Set()

    for (let page = 0; page < MAX_TOOL_PAGES; page++) {
      const id = this.upstream.nextRequestId()
      const response = requireResponse(
        await this.upstream.send({ jsonrpc: "2.0", id, method: "tools/list", params: cursor ? { cursor } : {} }),
      )
      if (response.error) throw new ProxyError("upstream_tools_list_failed")
      if (!isRecord(response.result) || !Array.isArray(response.result.tools)) {
        throw new ProxyError("upstream_invalid_tools_list")
      }
      template ??= response
      allTools.push(...response.result.tools)
      const nextCursor = response.result.nextCursor
      if (nextCursor === undefined || nextCursor === null || nextCursor === "") break
      if (typeof nextCursor !== "string" || seenCursors.has(nextCursor)) throw new ProxyError("upstream_invalid_tool_pagination")
      seenCursors.add(nextCursor)
      cursor = nextCursor
      if (page === MAX_TOOL_PAGES - 1) throw new ProxyError("upstream_tool_page_limit")
    }

    const enabledTools = allTools.filter((tool) => connectorIdFor(tool) === this.options.connectorId)
    const toolsByName = new Map()
    for (const tool of enabledTools) {
      if (!isRecord(tool) || typeof tool.name !== "string" || !tool.name.startsWith(`${this.options.alias}.`)) {
        throw new ProxyError("upstream_tool_prefix_mismatch")
      }
      const name = tool.name.slice(this.options.alias.length + 1)
      if (!name || toolsByName.has(name)) throw new ProxyError("upstream_tool_name_collision")
      toolsByName.set(name, { tool, upstreamName: tool.name })
    }
    const tools = enabledTools.map((tool) => ({ ...tool, name: tool.name.slice(this.options.alias.length + 1) }))
    const discovered = { tools, toolsByName, template }
    return discovered
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const credentialStore = await openCredentialStore(options.databaseFile)
  credentialStore.read()
  if (options.probe) {
    await runProbe(options, credentialStore)
    return
  }

  const endpoints = new Map(
    [...options.connectorAliases].map(([alias, connectorId]) => {
      const endpoint = createEndpoint(options, credentialStore, alias, connectorId)
      return [endpoint.path, endpoint]
    }),
  )
  const server = createServer((request, response) => {
    void handleHttpRequest(request, response, endpoints)
  })
  await new Promise((resolveServer, reject) => {
    server.once("error", reject)
    server.listen(options.port, options.host, resolveServer)
  })
  process.stderr.write(`chatgpt-connectors-mcp: listening on http://${options.host}:${options.port}/mcp/<connector-alias>\n`)
}

async function handleHttpRequest(request, response, endpoints) {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname
  const endpoint = endpoints.get(pathname)
  if (request.method !== "POST" || !endpoint) {
    response.writeHead(404, { "content-type": "application/json" })
    response.end(JSON.stringify({ error: "not_found" }))
    return
  }
  if (!isLocalHost(request.headers.host) || !isLocalOrigin(request.headers.origin)) {
    response.writeHead(403, { "content-type": "application/json" })
    response.end(JSON.stringify({ error: "forbidden_origin" }))
    return
  }

  try {
    const body = await readRequestBody(request)
    const parsed = JSON.parse(body)
    const result = await endpoint.proxy.handle(parsed)
    if (result === undefined) {
      response.writeHead(202)
      response.end()
      return
    }
    response.writeHead(200, { "content-type": "application/json" })
    response.end(JSON.stringify(result))
  } catch (error) {
    const message = error instanceof ProxyError ? error.message : "invalid_request"
    response.writeHead(message === "request_body_too_large" ? 413 : 400, { "content-type": "application/json" })
    response.end(JSON.stringify(rpcError(null, -32700, message)))
  }
}

function readRequestBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = ""
    let size = 0
    request.setEncoding("utf8")
    request.on("data", (chunk) => {
      size += Buffer.byteLength(chunk)
      if (size > MAX_REQUEST_BYTES) {
        reject(new ProxyError("request_body_too_large"))
        request.destroy()
        return
      }
      body += chunk
    })
    request.on("end", () => resolveBody(body))
    request.on("error", reject)
  })
}

function isLocalHost(value) {
  if (typeof value !== "string") return false
  const host = value.replace(/^\[/, "").replace(/\](:\d+)?$/, "").replace(/:\d+$/, "")
  return host === "127.0.0.1" || host === "localhost" || host === "::1"
}

function isLocalOrigin(value) {
  if (value === undefined) return true
  try {
    const origin = new URL(value)
    return ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
  } catch {
    return false
  }
}

async function runProbe(options, credentialStore) {
  const endpoints = [...options.connectorAliases].map(([alias, connectorId]) => createEndpoint(options, credentialStore, alias, connectorId))
  const results = []
  for (const endpoint of endpoints) {
    const initialize = requireResponse(
      await endpoint.upstream.send({
        jsonrpc: "2.0",
        id: endpoint.upstream.nextRequestId(),
        method: "initialize",
        params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
      }),
    )
    if (initialize.error) throw new ProxyError("upstream_initialize_failed")
    await endpoint.upstream.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })
    const listed = await endpoint.proxy.handle({ jsonrpc: "2.0", id: endpoint.upstream.nextRequestId(), method: "tools/list", params: {} })
    if (listed?.error || !isRecord(listed?.result) || !Array.isArray(listed.result.tools)) throw new ProxyError("upstream_tools_list_failed")
    const serverInfo = isRecord(initialize.result) && isRecord(initialize.result.serverInfo) ? initialize.result.serverInfo : {}
    results.push({
      alias: endpoint.alias,
      serverName: serverInfo.name,
      exposedToolCount: listed.result.tools.length,
      protocolVersion: isRecord(initialize.result) ? initialize.result.protocolVersion : undefined,
    })
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        initialize: "succeeded",
        protocolVersion: results[0]?.protocolVersion,
        endpoints: results,
        enabledConnectors: [...options.connectorAliases.entries()].map(([alias, id]) => ({ alias, id })),
      },
      null,
      2,
    )}\n`,
  )
}

function createEndpoint(options, credentialStore, alias, connectorId) {
  const endpointOptions = { ...options, alias, connectorId }
  const upstream = new UpstreamClient(options, credentialStore)
  return { alias, path: `/mcp/${alias}`, upstream, proxy: new ConnectorProxy(endpointOptions, upstream) }
}

async function openCredentialStore(databaseFile) {
  let metadata
  try {
    metadata = await lstat(databaseFile)
  } catch (error) {
    if (error?.code === "ENOENT") throw new ProxyError("opencode_database_not_found")
    throw new ProxyError("opencode_database_unreadable")
  }
  if (!metadata.isFile()) throw new ProxyError("opencode_database_not_regular_file")
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) throw new ProxyError("opencode_database_wrong_owner")

  try {
    return new CredentialStore(databaseFile)
  } catch {
    throw new ProxyError("opencode_database_unreadable")
  }
}

class CredentialStore {
  #database
  #select

  constructor(databaseFile) {
    let database
    try {
      database = new DatabaseSync(databaseFile, { readOnly: true, timeout: 5_000 })
      this.#select = database.prepare(
        "SELECT value FROM credential WHERE integration_id = ? ORDER BY active ASC, time_created ASC, id ASC",
      )
    } catch {
      database?.close()
      throw new ProxyError("opencode_database_unreadable")
    }
    this.#database = database
  }

  read() {
    let row
    try {
      row = this.#select.all(OPENAI_INTEGRATION_ID).at(-1)
    } catch {
      throw new ProxyError("opencode_database_query_failed")
    }
    if (!row || typeof row.value !== "string") throw new ProxyError("opencode_oauth_not_found")

    let value
    try {
      value = JSON.parse(row.value)
    } catch {
      throw new ProxyError("opencode_credential_invalid_json")
    }
    if (typeof value !== "object" || value === null || Array.isArray(value) || value.type !== "oauth")
      throw new ProxyError("opencode_oauth_not_found")
    if (typeof value.access !== "string" || value.access.length === 0) throw new ProxyError("opencode_access_not_found")
    const accountId =
      typeof value.metadata === "object" && value.metadata !== null && !Array.isArray(value.metadata)
        ? value.metadata.accountID
        : undefined
    if (typeof accountId !== "string" || accountId.length === 0) throw new ProxyError("opencode_account_not_found")
    if (typeof value.expires !== "number") throw new ProxyError("opencode_expiry_not_found")
    if (value.expires <= Date.now()) throw new ProxyError("opencode_access_expired_reauthenticate")
    return { access: value.access, accountId }
  }
}

function parseOptions(args) {
  const connectorAliases = new Map()
  let databaseFile = process.env.OPENCODE_DB ?? DEFAULT_DATABASE_FILE
  let upstream = DEFAULT_UPSTREAM
  let timeoutMs = 30_000
  let probe = false
  let host = "127.0.0.1"
  let port = 8765

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === "--probe") {
      probe = true
      continue
    }
    const value = args[++index]
    if (value === undefined) throw new ProxyError(`missing_value_for_${argument.slice(2).replaceAll("-", "_")}`)
    if (argument === "--database-file") databaseFile = value
    else if (argument === "--upstream") upstream = value
    else if (argument === "--timeout-ms") timeoutMs = Number(value)
    else if (argument === "--host") host = value
    else if (argument === "--port") port = Number(value)
    else if (argument === "--connector") {
      const separator = value.indexOf("=")
      const alias = separator === -1 ? value : value.slice(0, separator)
      const id = separator === -1 ? value : value.slice(separator + 1)
      if (!alias || !id || connectorAliases.has(alias)) throw new ProxyError("invalid_connector_configuration")
      connectorAliases.set(alias, id)
    } else throw new ProxyError("unknown_option")
  }

  if (connectorAliases.size === 0) throw new ProxyError("no_connectors_enabled")
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new ProxyError("invalid_timeout")
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ProxyError("invalid_port")
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") throw new ProxyError("invalid_listen_host")
  return {
    databaseFile: expandHome(databaseFile),
    upstream,
    timeoutMs,
    probe,
    host,
    port,
    connectorAliases,
    connectors: new Set(connectorAliases.values()),
  }
}

function connectorIdFor(tool) {
  return isRecord(tool) && isRecord(tool._meta) && typeof tool._meta.connector_id === "string"
    ? tool._meta.connector_id
    : undefined
}

function normalizeToolResult(response, tool) {
  if (!isRecord(response.result) || !isRecord(response.result.structuredContent)) return response
  if (!isRecord(tool) || !isRecord(tool.outputSchema)) return response
  const required = tool.outputSchema.required
  const properties = tool.outputSchema.properties
  if (!Array.isArray(required) || !required.includes("result") || !isRecord(properties) || !("result" in properties)) return response
  if ("result" in response.result.structuredContent) return response
  return {
    ...response,
    result: {
      ...response.result,
      structuredContent: { result: response.result.structuredContent },
    },
  }
}

function extractSsePayloads(text) {
  const payloads = []
  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
    if (data && data !== "[DONE]") payloads.push(data)
  }
  if (payloads.length === 0) throw new ProxyError("upstream_invalid_sse")
  return payloads
}

function expandHome(path) {
  if (path === "~") return homedir()
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2))
  return resolve(path)
}

function requireResponse(response) {
  if (!isRecord(response)) throw new ProxyError("upstream_missing_response")
  return response
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

function classifyError(error) {
  return error instanceof ProxyError ? error.message : "proxy_internal_error"
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

main().catch((error) => {
  process.stderr.write(`chatgpt-connectors-mcp: ${classifyError(error)}\n`)
  process.exitCode = 1
})
