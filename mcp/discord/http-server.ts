import {
  createServer,
  type Server,
  type ServerResponse
} from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createMcpHandler,
  type McpHttpHandler
} from "@modelcontextprotocol/server";
import {
  localhostHostValidation,
  localhostOriginValidation
} from "@modelcontextprotocol/node";
import {
  loadConfig,
  type DiscordConfig
} from "./config.js";
import {
  DiscordRestSender
} from "./discord-client.js";
import {
  createDiscordMcpServer,
  type DiscordToolSender
} from "./server.js";
import {
  createBoundedNodeHandler,
  MAX_REQUEST_BODY_BYTES
} from "./http-adapter.js";

export const DISCORD_MCP_HOST = "127.0.0.1";

export const DISCORD_MCP_PORT = 29980;

const HEALTHY_BODY = '{"status":"ok"}';

const NOT_READY_BODY = '{"status":"unavailable"}';

const INVALID_CONFIGURATION_MESSAGE = "[discord-mcp] invalid configuration; server not started";

const NOT_FOUND_HEADERS = { "content-length": "0" };

export interface DiscordHttpServerOptions {
  readonly config: DiscordConfig;
  readonly sender: DiscordToolSender;
  readonly port?: number;
}

export interface DiscordHttpServer {
  readonly handler: McpHttpHandler;
  readonly server: Server;
  listen(): Promise<number>;
  close(): Promise<void>;
}

export function createDiscordHttpServer(options: DiscordHttpServerOptions): DiscordHttpServer {
  const handler = createMcpHandler(
    () => createDiscordMcpServer({ config: options.config, sender: options.sender }),
    { legacy: "stateless" }
  );

  const nodeHandler = createBoundedNodeHandler(handler, MAX_REQUEST_BODY_BYTES);
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  const port = validatePort(options.port ?? DISCORD_MCP_PORT);
  let accepting = false;
  let closePromise: Promise<void> | undefined;
  let listenPromise: Promise<number> | undefined;

  const server = createServer((request, response) => {
    if (!validateHost(request, response) || !validateOrigin(request, response)) return;

    const pathname = new URL(request.url ?? "/", `http://${DISCORD_MCP_HOST}`).pathname;

    if (pathname === "/healthz" && isHealthMethod(request.method)) {
      serveHealth(request.method, response, accepting);

      return;
    }

    if (pathname === "/healthz") {
      response.writeHead(404, NOT_FOUND_HEADERS);
      response.end();

      return;
    }

    if (pathname !== "/mcp") {
      response.writeHead(404, NOT_FOUND_HEADERS);
      response.end();

      return;
    }

    if (!accepting) {
      serveHealthUnavailable(response);

      return;
    }

    void nodeHandler(request, response);
  });

  return {
    handler,
    server,
    listen: () => {
      if (listenPromise === undefined) {
        listenPromise = new Promise<number>((resolve, reject) => {
          const onError = (error: Error) => {
            server.off("listening", onListening);
            reject(error);
          };

          const onListening = () => {
            server.off("error", onError);
            accepting = true;
            resolve(boundPort(server));
          };

          server.once("error", onError);
          server.once("listening", onListening);
          server.listen(port, DISCORD_MCP_HOST);
        });
      }

      return listenPromise;
    },
    close: () => {
      if (closePromise === undefined) {
        accepting = false;
        closePromise = closeResources(server, handler);
      }

      return closePromise;
    }
  };
}

export async function runDiscordHttpServer(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const configResult = loadConfig(env);
  const port = parsePort(env.DISCORD_MCP_PORT);
  const host = env.DISCORD_MCP_HOST;

  if (!configResult.ok || port === undefined || (host !== undefined && host !== DISCORD_MCP_HOST)) {
    process.stderr.write(`${INVALID_CONFIGURATION_MESSAGE}\n`);
    process.exitCode = 1;

    return;
  }

  const sender = new DiscordRestSender(configResult.config);
  const runtime = createDiscordHttpServer({ config: configResult.config, sender, port });

  await runtime.listen();

  let closing: Promise<void> | undefined;

  const requestShutdown = () => {
    if (closing === undefined) {
      closing = runtime.close().catch(() => {
        process.exitCode = 1;
      });
    }
  };

  process.once("SIGINT", requestShutdown);
  process.once("SIGTERM", requestShutdown);
}

function serveHealth(
  method: string | undefined,
  response: ServerResponse,
  accepting: boolean
): void {
  const body = accepting ? HEALTHY_BODY : NOT_READY_BODY;
  const status = accepting ? 200 : 503;

  response.writeHead(status, {
    "content-length": String(Buffer.byteLength(body)),
    "content-type": "application/json"
  });
  response.end(method === "HEAD" ? undefined : body);
}

function serveHealthUnavailable(response: ServerResponse): void {
  response.writeHead(503, {
    "content-length": String(Buffer.byteLength(NOT_READY_BODY)),
    "content-type": "application/json"
  });
  response.end(NOT_READY_BODY);
}

function isHealthMethod(method: string | undefined): boolean {
  return method === "GET" || method === "HEAD";
}

async function closeResources(server: Server, handler: McpHttpHandler): Promise<void> {
  const serverClose = closeServer(server);
  const handlerClose = handler.close();
  const results = await Promise.allSettled([serverClose, handlerClose]);
  const failure = results.find((result) => result.status === "rejected");

  if (failure?.status === "rejected") throw failure.reason;
}

function closeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
}

function boundPort(server: Server): number {
  const address = server.address();

  // SAFETY: The runtime always binds a TCP listener, never a Unix-domain socket.
  const addressInfo = address as AddressInfo | null;

  if (addressInfo === null) {
    throw new Error("The Discord MCP server did not expose a TCP address.");
  }

  return addressInfo.port;
}

function validatePort(port: number): number {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("The Discord MCP port is invalid.");
  }

  return port;
}

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined) return DISCORD_MCP_PORT;

  if (!/^\d+$/u.test(value)) return undefined;

  const port = Number(value);

  return Number.isInteger(port) && port >= 0 && port <= 65_535 ? port : undefined;
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  void runDiscordHttpServer().catch(() => {
    process.stderr.write(`${INVALID_CONFIGURATION_MESSAGE}\n`);
    process.exitCode = 1;
  });
}
