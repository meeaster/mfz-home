// A small local HTTP server for the viewer: a JSON API over the data directory, plus the static page.

import { readFileSync } from "node:fs"
import { createServer, type Server, type ServerResponse } from "node:http"
import { join } from "node:path"
import { type ChatMessage, type ChatSummary, type ChatTree, chatMessage, chatTree, listChats } from "./data.js"

const STATIC = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/style.css": { file: "style.css", type: "text/css; charset=utf-8" },
} as const satisfies Record<string, { file: string; type: string }>

const isStatic = (path: string): path is keyof typeof STATIC => Object.hasOwn(STATIC, path)

type Reply = ChatMessage | ChatTree | { readonly dataDir: string; readonly chats: ChatSummary[] } | { readonly error: string }

const json = (response: ServerResponse, status: number, body: Reply): void => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" })
  response.end(JSON.stringify(body))
}

export const startServer = (dataDir: string, port: number, host = "127.0.0.1"): Promise<Server> => {
  const staticDirectory = new URL(".", import.meta.url).pathname

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost")
    const path = url.pathname

    if (request.method !== "GET") return json(response, 405, { error: "read-only" })

    if (isStatic(path)) {
      const asset = STATIC[path]

      response.writeHead(200, { "content-type": asset.type, "cache-control": "no-store" })
      response.end(readFileSync(join(staticDirectory, asset.file)))

      return
    }

    if (path === "/api/chats") return json(response, 200, { dataDir, chats: listChats(dataDir) })

    const message = /^\/api\/chats\/([^/]+)\/messages\/(\d+)$/.exec(path)

    if (message !== null) {
      const found = chatMessage(dataDir, decodeURIComponent(message[1] ?? ""), Number(message[2]))

      return found === undefined ? json(response, 404, { error: "no such message" }) : json(response, 200, found)
    }

    const tree = /^\/api\/chats\/([^/]+)$/.exec(path)

    if (tree !== null) {
      const found = chatTree(dataDir, decodeURIComponent(tree[1] ?? ""))

      return found === undefined ? json(response, 404, { error: "no such chat" }) : json(response, 200, found)
    }

    json(response, 404, { error: "not found" })
  })

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, () => resolve(server))
  })
}
