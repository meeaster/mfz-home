import { existsSync } from "node:fs";
import { once } from "node:events";
import { request as httpRequest, createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, test } from "vitest";
import {
  createDiscordHttpServer,
  DISCORD_MCP_HOST,
  type DiscordHttpServer
} from "./http-server.js";
import { MAX_REQUEST_BODY_BYTES } from "./http-adapter.js";
import { loadConfig, type DiscordConfig } from "./config.js";
import { type DiscordToolSender } from "./server.js";

const CHANNEL_ID = "123456789012345678";

const MESSAGE_ID = "234567890123456789";

const SYNTHETIC_TOKEN = "synthetic-discord-token";

const baseEnvironment = {
  DISCORD_BOT_TOKEN: SYNTHETIC_TOKEN,
  DISCORD_DESTINATIONS_JSON: JSON.stringify({ notifications: CHANNEL_ID }),
  DISCORD_DEFAULT_DESTINATION: "notifications"
};

const successfulMessage = {
  message_id: MESSAGE_ID,
  channel_id: CHANNEL_ID,
  created_at: "2026-09-19T12:00:00.000Z"
};

const runtimes: DiscordHttpServer[] = [];

afterEach(async () => {
  while (runtimes.length > 0) {
    await runtimes.pop()?.close();
  }
});

describe("Discord HTTP server", () => {
  test("serves health, discovers tools, accepts query strings, and sends concurrent calls", async () => {
    const calls: Array<{ channelId: string; content: string }> = [];
    const { url } = await startRuntime(calls);

    const health = await fetch(`${url}/healthz`);
    const head = await fetch(`${url}/healthz`, { method: "HEAD" });
    const client = new Client({ name: "discord-mcp-http-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp?codemode=false`));

    try {
      await client.connect(transport);

      const listed = await client.listTools();

      const sent = await client.callTool({
        name: "discord_send_message",
        arguments: { content: "hello from HTTP" }
      });

      const concurrent = await Promise.all([
        client.callTool({ name: "discord_send_message", arguments: { content: "one" } }),
        client.callTool({ name: "discord_send_message", arguments: { content: "two" } })
      ]);

      expect(health.status).toBe(200);
      await expect(health.json()).resolves.toEqual({ status: "ok" });
      expect(head.status).toBe(200);
      await expect(head.text()).resolves.toBe("");
      expect(listed.tools.map((tool) => tool.name)).toEqual(["discord_send_message"]);
      expect(sent.structuredContent).toEqual({
        destination: "notifications",
        ...successfulMessage
      });
      expect(concurrent.every((result) => result.isError !== true)).toBe(true);
      expect(calls).toEqual([
        { channelId: CHANNEL_ID, content: "hello from HTTP" },
        { channelId: CHANNEL_ID, content: "one" },
        { channelId: CHANNEL_ID, content: "two" }
      ]);
    } finally {
      await client.close();
    }
  });

  test("keeps route and method errors at the HTTP boundary", async () => {
    const { url, port } = await startRuntime([]);

    const wrongPath = await fetch(`${url}/not-mcp`);

    const wrongMethod = await fetch(`${url}/mcp`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{}"
    });

    const invalidHost = await requestRaw(port, {
      path: "/healthz",
      headers: { host: "attacker.example" }
    });

    const invalidOrigin = await requestRaw(port, {
      path: "/healthz",
      headers: { origin: "https://attacker.example" }
    });

    expect(wrongPath.status).toBe(404);
    expect(wrongMethod.status).toBe(405);
    expect(invalidHost.status).toBe(403);
    expect(invalidOrigin.status).toBe(403);
  });

  test("enforces the raw-byte body limit for declared, chunked, and absent lengths", async () => {
    const { port } = await startRuntime([]);

    const validNotification = JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized"
    });

    const exactBody = validNotification.padEnd(MAX_REQUEST_BODY_BYTES, " ");
    const tooLargeBody = `${exactBody} `;

    const exactDeclared = await requestRaw(
      port,
      {
        method: "POST",
        path: "/mcp",
        headers: {
          "content-length": String(Buffer.byteLength(exactBody)),
          "content-type": "application/json"
        }
      },
      [exactBody]
    );

    const declaredTooLarge = await requestRaw(port, {
      method: "POST",
      path: "/mcp",
      headers: {
        "content-length": String(Buffer.byteLength(tooLargeBody)),
        "content-type": "application/json"
      }
    });

    const exactChunked = await requestRaw(
      port,
      {
        method: "POST",
        path: "/mcp",
        headers: { "content-type": "application/json", "transfer-encoding": "chunked" }
      },
      [exactBody.slice(0, 17), exactBody.slice(17)]
    );

    const chunkedTooLarge = await requestRaw(
      port,
      {
        method: "POST",
        path: "/mcp",
        headers: { "content-type": "application/json", "transfer-encoding": "chunked" }
      },
      [tooLargeBody.slice(0, MAX_REQUEST_BODY_BYTES), tooLargeBody.slice(MAX_REQUEST_BODY_BYTES)]
    );

    const absentLength = await requestRaw(
      port,
      {
        method: "POST",
        path: "/mcp",
        headers: { "content-type": "application/json" }
      },
      [exactBody]
    );

    expect(exactDeclared.status).not.toBe(413);
    expect(exactChunked.status).not.toBe(413);
    expect(absentLength.status).not.toBe(413);
    expect(declaredTooLarge.status).toBe(413);
    expect(chunkedTooLarge.status).toBe(413);
    expect(declaredTooLarge.headers.connection).toBe("close");
    expect(chunkedTooLarge.headers.connection).toBe("close");
  });

  test("closes readiness and the listener gracefully", async () => {
    const { runtime, url } = await startRuntime([]);

    await runtime.close();

    expect(runtime.server.listening).toBe(false);
    await expect(fetch(`${url}/healthz`)).rejects.toThrow();
  });

  test("propagates a disconnected MCP request to the Discord sender", async () => {
    let resolveSenderStarted: (() => void) | undefined;
    let resolveSenderAborted: (() => void) | undefined;

    const senderStarted = new Promise<void>((resolve) => {
      resolveSenderStarted = resolve;
    });

    const senderAborted = new Promise<void>((resolve) => {
      resolveSenderAborted = resolve;
    });

    const sender: DiscordToolSender = {
      async send(_channelId, _content, signal) {
        if (signal === undefined) throw new Error("sender signal was not propagated");

        resolveSenderStarted?.();

        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve();

            return;
          }

          signal.addEventListener("abort", () => resolve(), { once: true });
        });
        resolveSenderAborted?.();

        throw new Error("synthetic cancellation");
      }
    };

    const { runtime, url } = await startRuntimeWithSender(sender);
    const client = new Client({ name: "discord-mcp-cancellation-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp`));

    try {
      await client.connect(transport);

      const call = client.callTool(
        {
          name: "discord_send_message",
          arguments: { content: "disconnect me" }
        }
      );

      void call.catch(() => undefined);

      await senderStarted;
      await transport.close();
      await within(senderAborted, 250);
    } finally {
      await client.close().catch(() => undefined);
      await runtime.close();
    }
  });
});

const processTest = existsSync(resolve(import.meta.dirname, "dist/http-server.js")) ? test : test.skip;

processTest("serves the built process with the official HTTP client", async () => {
  const port = await freePort();

  const child = spawn(process.execPath, [resolve(import.meta.dirname, "dist/http-server.js")], {
    env: {
      ...process.env,
      ...baseEnvironment,
      DISCORD_MCP_HOST: DISCORD_MCP_HOST,
      DISCORD_MCP_PORT: String(port)
    },
    stdio: "ignore"
  });

  const url = `http://${DISCORD_MCP_HOST}:${port}`;
  const client = new Client({ name: "discord-mcp-process-test", version: "1.0.0" });

  try {
    await waitForHealth(`${url}/healthz`);
    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp?codemode=false`)));

    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
      "discord_send_message"
    ]);
  } finally {
    await client.close();
    await stopProcess(child);
  }
});

processTest("fails before listening when required configuration is invalid", async () => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DISCORD_DESTINATIONS_JSON: baseEnvironment.DISCORD_DESTINATIONS_JSON
  };

  delete env.DISCORD_BOT_TOKEN;

  const child = spawn(process.execPath, [resolve(import.meta.dirname, "dist/http-server.js")], {
    env,
    stdio: ["ignore", "ignore", "pipe"]
  });

  const stderr: Buffer[] = [];

  child.stderr?.on("data", (chunk: Buffer) => stderr.push(Buffer.from(chunk)));

  const [exitCode] = await once(child, "exit");

  expect(exitCode).not.toBe(0);
  expect(Buffer.concat(stderr).toString()).toBe(
    "[discord-mcp] invalid configuration; server not started\n"
  );
});

async function startRuntime(
  calls: Array<{ channelId: string; content: string }>
): Promise<{ runtime: DiscordHttpServer; url: string; port: number }> {
  return startRuntimeWithSender(createFakeSender(calls));
}

async function startRuntimeWithSender(
  sender: DiscordToolSender
): Promise<{ runtime: DiscordHttpServer; url: string; port: number }> {
  const runtime = createDiscordHttpServer({
    config: requireConfig(),
    sender,
    port: 0
  });

  const port = await runtime.listen();

  runtimes.push(runtime);

  return { runtime, port, url: `http://${DISCORD_MCP_HOST}:${port}` };
}

function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("test promise did not settle")), timeoutMs);

    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function requireConfig(): DiscordConfig {
  const result = loadConfig(baseEnvironment);

  if (!result.ok) throw new Error("test configuration did not parse");

  return result.config;
}

function createFakeSender(calls: Array<{ channelId: string; content: string }>): DiscordToolSender {
  return {
    async send(channelId, content) {
      calls.push({ channelId, content });

      return successfulMessage;
    }
  };
}

interface RawResponse {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
}

function requestRaw(
  port: number,
  options: {
    readonly method?: string;
    readonly path: string;
    readonly headers?: Record<string, string>;
  },
  chunks: readonly (Buffer | string)[] = []
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: DISCORD_MCP_HOST,
        port,
        method: options.method ?? "GET",
        path: options.path,
        headers: options.headers
      },
      (response) => {
        const body: Buffer[] = [];

        response.on("data", (chunk: Buffer) => body.push(Buffer.from(chunk)));
        response.once("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(body)
          });
        });
      }
    );

    request.once("error", reject);

    for (const chunk of chunks) request.write(chunk);

    request.end();
  });
}

async function freePort(): Promise<number> {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, DISCORD_MCP_HOST, () => resolve());
  });

  const address = server.address();

  // SAFETY: The test server always binds a TCP listener, never a Unix-domain socket.
  const addressInfo = address as { port: number } | null;

  if (addressInfo === null) throw new Error("test server has no port");

  const port = addressInfo.port;
  await closeServer(server);

  return port;
}

async function waitForHealth(url: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.status === 200) return;
    } catch {
      // The child may still be binding its listener.
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("built Discord MCP server did not become healthy");
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");
  await once(child, "exit");
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
}
