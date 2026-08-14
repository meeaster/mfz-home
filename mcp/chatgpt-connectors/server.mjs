#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { resolve } from "node:path"

const DEFAULT_UPSTREAM = "https://chatgpt.com/backend-api/ps/mcp"
const DEFAULT_AUTH_FILE = "~/.local/share/opencode/auth.json"
const PROTOCOL_VERSION = "2025-06-18"
const CLIENT_INFO = { name: "chatgpt-connectors-mcp", version: "0.1.0" }
const MAX_TOOL_PAGES = 100
const MAX_REQUEST_BYTES = 4 * 1024 * 1024

class ProxyError extends Error {}

class UpstreamClient {
  #sessionId
  #requestId = 1_000_000

  constructor(options, credential) {
    this.options = options
    this.credential = credential
  }

  nextRequestId() {
    return this.#requestId++
  }

  async send(message) {
    const headers = new Headers({
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.credential.access}`,
      "ChatGPT-Account-Id": this.credential.accountId,
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
  #toolsByName = new Map()

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

    await this.#discoverTools()
    const matches = this.#toolsByName.get(name) ?? []
    if (matches.length === 0) return rpcError(request.id, -32602, "Tool is unknown, disabled, or stale")
    if (matches.length > 1) return rpcError(request.id, -32602, "Tool name is ambiguous")

    return normalizeToolResult(requireResponse(await this.upstream.send(request)), matches[0])
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

    const enabledTools = allTools.filter((tool) => {
      const connectorId = connectorIdFor(tool)
      return connectorId !== undefined && this.options.connectors.has(connectorId)
    })
    const toolsByName = new Map()
    for (const tool of enabledTools) {
      if (!isRecord(tool) || typeof tool.name !== "string") continue
      const matches = toolsByName.get(tool.name) ?? []
      matches.push(tool)
      toolsByName.set(tool.name, matches)
    }
    this.#toolsByName = toolsByName
    return { tools: enabledTools, template }
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const credential = await loadCredential(options.authFile)
  const upstream = new UpstreamClient(options, credential)

  if (options.probe) {
    await runProbe(options, upstream)
    return
  }

  const proxy = new ConnectorProxy(options, upstream)
  const server = createServer((request, response) => {
    void handleHttpRequest(request, response, proxy)
  })
  await new Promise((resolveServer, reject) => {
    server.once("error", reject)
    server.listen(options.port, options.host, resolveServer)
  })
  process.stderr.write(`chatgpt-connectors-mcp: listening on http://${options.host}:${options.port}/mcp\n`)
}

async function handleHttpRequest(request, response, proxy) {
  if (request.method !== "POST" || request.url !== "/mcp") {
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
    const result = await proxy.handle(parsed)
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

async function runProbe(options, upstream) {
  const initialize = requireResponse(
    await upstream.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
    }),
  )
  if (initialize.error) throw new ProxyError("upstream_initialize_failed")
  await upstream.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })

  const proxy = new ConnectorProxy(options, upstream)
  const listed = await proxy.handle({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
  if (listed?.error || !isRecord(listed?.result) || !Array.isArray(listed.result.tools)) {
    throw new ProxyError("upstream_tools_list_failed")
  }
  const serverInfo = isRecord(initialize.result) && isRecord(initialize.result.serverInfo) ? initialize.result.serverInfo : {}
  process.stdout.write(
    `${JSON.stringify(
      {
        initialize: "succeeded",
        protocolVersion: isRecord(initialize.result) ? initialize.result.protocolVersion : undefined,
        serverName: serverInfo.name,
        enabledConnectors: [...options.connectorAliases.entries()].map(([alias, id]) => ({ alias, id })),
        exposedToolCount: listed.result.tools.length,
      },
      null,
      2,
    )}\n`,
  )
}

async function loadCredential(authFile) {
  let metadata
  try {
    metadata = await lstat(authFile)
  } catch (error) {
    if (error?.code === "ENOENT") throw new ProxyError("auth_file_not_found")
    throw new ProxyError("auth_file_unreadable")
  }
  if (!metadata.isFile()) throw new ProxyError("auth_path_not_regular_file")
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) throw new ProxyError("auth_file_wrong_owner")
  if ((metadata.mode & 0o077) !== 0) throw new ProxyError("auth_file_permissions_too_open")

  let parsed
  try {
    parsed = JSON.parse(await readFile(authFile, "utf8"))
  } catch {
    throw new ProxyError("auth_file_invalid_json")
  }
  const auth = isRecord(parsed) ? parsed.openai : undefined
  if (!isRecord(auth) || auth.type !== "oauth") throw new ProxyError("opencode_oauth_not_found")
  if (typeof auth.access !== "string" || auth.access.length === 0) throw new ProxyError("opencode_access_not_found")
  if (typeof auth.accountId !== "string" || auth.accountId.length === 0) throw new ProxyError("opencode_account_not_found")
  if (typeof auth.expires !== "number") throw new ProxyError("opencode_expiry_not_found")
  if (auth.expires <= Date.now()) throw new ProxyError("opencode_access_expired_reauthenticate")
  return { access: auth.access, accountId: auth.accountId }
}

function parseOptions(args) {
  const connectorAliases = new Map()
  let authFile = DEFAULT_AUTH_FILE
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
    if (argument === "--auth-file") authFile = value
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
    authFile: expandHome(authFile),
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
