#!/usr/bin/env bun
// optchat-viewer: browse OptChat chats and their memory trees in a local website.
// Usage: bun viewer/cli.ts [--port 4517] [--data-dir <path>] [--open]

import { spawn } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { startServer } from "./server.js"

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "4517" },
    "data-dir": { type: "string" },
    open: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
})

if (values.help) {
  console.log("Usage: optchat-viewer [--port 4517] [--data-dir <path>] [--open]\n\nServes a read-only view of OptChat chats on 127.0.0.1.")
  process.exit(0)
}

// The plugin's default data directory.
const dataDir = values["data-dir"] ?? join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "optchat")

const port = Number(values.port)

const server = await startServer(dataDir, port)

const url = `http://127.0.0.1:${port}/`

console.log(`OptChat viewer for ${dataDir}\n${url}`)

if (values.open) spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore", detached: true }).unref()

process.on("SIGINT", () => server.close(() => process.exit(0)))
