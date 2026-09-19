import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, test } from "vitest";
import * as z from "zod/v4";
import {
  loadConfig,
  resolveDestination,
  type DiscordConfig
} from "./config.js";
import {
  DiscordRestSender,
  type DiscordFetch,
  type DiscordRestSenderOptions
} from "./discord-client.js";
import { DiscordPublicError, errorForDiscordStatus } from "./errors.js";
import { createDiscordMcpServer, type DiscordToolSender } from "./server.js";

const CHANNEL_ID = "123456789012345678";

const MESSAGE_ID = "234567890123456789";

const SYNTHETIC_TOKEN = "synthetic-discord-token";

const CONTENT = "hello @everyone";

const baseEnvironment = {
  DISCORD_BOT_TOKEN: SYNTHETIC_TOKEN,
  DISCORD_DESTINATIONS_JSON: JSON.stringify({ notifications: CHANNEL_ID }),
  DISCORD_DEFAULT_DESTINATION: "notifications"
};

const successfulMessage = {
  id: MESSAGE_ID,
  channel_id: CHANNEL_ID,
  timestamp: "2026-09-19T12:00:00.000Z"
};

afterEach(() => {
  expect.hasAssertions();
});

describe("Discord configuration", () => {
  test("accepts a named destination map and optional default", () => {
    const result = loadConfig(baseEnvironment);

    expect(result).toEqual({
      ok: true,
      config: {
        botToken: SYNTHETIC_TOKEN,
        destinations: { notifications: CHANNEL_ID },
        defaultDestination: "notifications"
      }
    });
  });

  test.each([
    {},
    { DISCORD_BOT_TOKEN: " ", DISCORD_DESTINATIONS_JSON: `{ "notifications": "${CHANNEL_ID}" }` },
    { DISCORD_BOT_TOKEN: SYNTHETIC_TOKEN, DISCORD_DESTINATIONS_JSON: "not-json" },
    { DISCORD_BOT_TOKEN: SYNTHETIC_TOKEN, DISCORD_DESTINATIONS_JSON: `{ "notifications": "123" }` },
    {
      DISCORD_BOT_TOKEN: SYNTHETIC_TOKEN,
      DISCORD_DESTINATIONS_JSON: JSON.stringify({ notifications: CHANNEL_ID }),
      DISCORD_DEFAULT_DESTINATION: "missing"
    }
  ])("fails closed for invalid environment %#", (environment) => {
    const result = loadConfig(environment);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid_config",
        message: "The Discord MCP configuration is invalid."
      }
    });
    expect(JSON.stringify(result)).not.toContain(SYNTHETIC_TOKEN);
  });

  test("resolves only allowlisted names", () => {
    const result = loadConfig(baseEnvironment);

    if (!result.ok) throw new Error("test configuration did not parse");

    expect(resolveDestination(result.config, undefined)).toEqual({
      name: "notifications",
      channelId: CHANNEL_ID
    });
    expect(resolveDestination(result.config, "notifications")).toEqual({
      name: "notifications",
      channelId: CHANNEL_ID
    });
    expect(() => resolveDestination(result.config, CHANNEL_ID)).toThrowError(DiscordPublicError);
    expect(() => resolveDestination(result.config, "missing")).toThrowError(DiscordPublicError);
  });

  test("allows a map without a default when the tool names a destination", () => {
    const result = loadConfig({
      DISCORD_BOT_TOKEN: SYNTHETIC_TOKEN,
      DISCORD_DESTINATIONS_JSON: JSON.stringify({ notifications: CHANNEL_ID })
    });

    if (!result.ok) throw new Error("test configuration did not parse");

    expect(result.config.defaultDestination).toBeUndefined();
    expect(resolveDestination(result.config, "notifications").channelId).toBe(CHANNEL_ID);
    expect(() => resolveDestination(result.config, undefined)).toThrowError(DiscordPublicError);
  });
});

describe("Discord REST sender", () => {
  test("sends the constrained payload and suppresses mentions", async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];

    const fetch: DiscordFetch = async (input, init) => {
      requests.push({ input, init });

      return jsonResponse(successfulMessage);
    };

    const sender = createSender({ fetch, nonceFactory: () => "nonce-for-test" });

    await expect(sender.send(CHANNEL_ID, CONTENT)).resolves.toEqual({
      message_id: MESSAGE_ID,
      channel_id: CHANNEL_ID,
      created_at: successfulMessage.timestamp
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.input).toBe(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`
    );
    expect(requests[0]?.init.headers).toEqual({
      Authorization: `Bot ${SYNTHETIC_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "discord-mcp/0.1.0"
    });
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
      content: CONTENT,
      allowed_mentions: { parse: [] },
      nonce: "nonce-for-test",
      enforce_nonce: true
    });
  });

  test("reuses one nonce across bounded transient retries", async () => {
    const requests: Array<{ body: string; nonce: string }> = [];

    const responses = [
      new Response("temporary", { status: 503 }),
      jsonResponse(successfulMessage)
    ];

    const fetch: DiscordFetch = async (_input, init) => {
      const body = z.object({ nonce: z.string() }).parse(JSON.parse(String(init.body)));
      requests.push({ body: String(init.body), nonce: body.nonce });

      const response = responses.shift();

      if (response === undefined) throw new Error("test response exhausted");

      return response;
    };

    const sleepCalls: number[] = [];

    const sender = createSender({
      fetch,
      nonceFactory: () => "same-nonce",
      sleep: async (milliseconds) => {
        sleepCalls.push(milliseconds);
      },
      random: () => 0
    });

    await expect(sender.send(CHANNEL_ID, "retry me")).resolves.toMatchObject({
      message_id: MESSAGE_ID
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.nonce).toBe("same-nonce");
    expect(requests[1]?.nonce).toBe("same-nonce");
    expect(requests[0]?.body).toBe(requests[1]?.body);
    expect(sleepCalls).toEqual([250]);
  });

  test("honors a bounded 429 retry delay and returns a typed exhaustion error", async () => {
    const responses = [
      new Response(JSON.stringify({ retry_after: 0.001 }), {
        status: 429,
        headers: { "content-type": "application/json" }
      }),
      jsonResponse(successfulMessage)
    ];

    const sleepCalls: number[] = [];

    const fetch: DiscordFetch = async () => {
      const response = responses.shift();

      if (response === undefined) throw new Error("test response exhausted");

      return response;
    };

    const sender = createSender({
      fetch,
      sleep: async (milliseconds) => {
        sleepCalls.push(milliseconds);
      }
    });

    await expect(sender.send(CHANNEL_ID, "rate limited")).resolves.toMatchObject({
      message_id: MESSAGE_ID
    });
    expect(sleepCalls).toEqual([1]);

    const exhausted = createSender({
      fetch: async () =>
        new Response(JSON.stringify({ retry_after: 1 }), {
          status: 429,
          headers: { "content-type": "application/json" }
        }),
      deadlineMs: 100,
      maxAttempts: 3
    });

    await expect(exhausted.send(CHANNEL_ID, "still limited")).rejects.toMatchObject({
      publicError: {
        code: "rate_limited",
        retry_after_ms: 1000
      }
    });
  });

  test("maps HTTP outcomes without exposing response bodies", async () => {
    expect(errorForDiscordStatus(400)).toBe("invalid_input");
    expect(errorForDiscordStatus(401)).toBe("unauthorized");
    expect(errorForDiscordStatus(403)).toBe("forbidden");
    expect(errorForDiscordStatus(404)).toBe("unknown_channel");
    expect(errorForDiscordStatus(429)).toBe("rate_limited");
    expect(errorForDiscordStatus(500)).toBe("temporary_discord_failure");
    expect(errorForDiscordStatus(599)).toBe("temporary_discord_failure");

    const secretBody = "discord response secret";

    const sender = createSender({
      fetch: async () => new Response(secretBody, { status: 401 })
    });

    await expect(sender.send(CHANNEL_ID, "input content")).rejects.toMatchObject({
      publicError: {
        code: "unauthorized",
        message: "Discord rejected the bot authentication."
      }
    });
    await expect(sender.send(CHANNEL_ID, "input content")).rejects.not.toThrow(secretBody);
  });

  test.each([
    [400, "invalid_input"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "unknown_channel"]
  ] as const)("does not retry HTTP %s", async (status, code) => {
    let requestCount = 0;

    const sender = createSender({
      fetch: async () => {
        requestCount += 1;

        return new Response("redacted response body", { status });
      },
      sleep: async () => {
        throw new Error("unexpected retry");
      }
    });

    await expect(sender.send(CHANNEL_ID, "no retry")).rejects.toMatchObject({
      publicError: { code }
    });
    expect(requestCount).toBe(1);
  });

  test("classifies a timed-out POST as an unknown delivery outcome", async () => {
    const sender = createSender({
      fetch: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error(SYNTHETIC_TOKEN)), {
            once: true
          });
        }),
      deadlineMs: 10,
      attemptTimeoutMs: 1,
      maxAttempts: 1
    });

    await expect(sender.send(CHANNEL_ID, "timeout content")).rejects.toMatchObject({
      publicError: {
        code: "delivery_unknown",
        message: "The Discord delivery outcome is unknown."
      }
    });
  });

  test.each([
    ["2xx", stalledSuccessResponse()],
    ["429", stalledRateLimitResponse()]
  ] as const)("bounds a stalled %s response body", async (_name, response) => {
    let requestCount = 0;

    const sender = createSender({
      fetch: async () => {
        requestCount += 1;

        return response;
      },
      deadlineMs: 40,
      attemptTimeoutMs: 200,
      maxAttempts: 1
    });

    await expect(within(sender.send(CHANNEL_ID, "stalled body"), 250)).rejects.toMatchObject({
      publicError: { code: "delivery_unknown" }
    });
    expect(requestCount).toBe(1);
  });

  test("does not post when cancelled before the first attempt", async () => {
    const controller = new AbortController();
    let requestCount = 0;
    controller.abort();

    const sender = createSender({
      fetch: async () => {
        requestCount += 1;

        return jsonResponse(successfulMessage);
      }
    });

    await expect(sender.send(CHANNEL_ID, "cancelled", controller.signal)).rejects.toMatchObject({
      name: "OperationCancelledError"
    });
    expect(requestCount).toBe(0);
  });

  test("cancels a fetch after the POST has started without retrying", async () => {
    const controller = new AbortController();
    let requestCount = 0;
    let resolveStarted: (() => void) | undefined;

    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });

    const sender = createSender({
      fetch: async (_input, init) => {
        requestCount += 1;
        resolveStarted?.();

        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error(SYNTHETIC_TOKEN)), {
            once: true
          });
        });
      }
    });

    const sending = sender.send(CHANNEL_ID, "cancel during fetch", controller.signal);
    await started;
    controller.abort();

    await expect(within(sending, 250)).rejects.toMatchObject({
      publicError: { code: "delivery_unknown" }
    });
    expect(requestCount).toBe(1);
  });

  test("cancels response-body parsing without claiming success or retrying", async () => {
    const controller = new AbortController();
    let requestCount = 0;
    let resolveBodyStarted: (() => void) | undefined;

    const bodyStarted = new Promise<void>((resolve) => {
      resolveBodyStarted = resolve;
    });

    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(stream) {
          stream.enqueue(new TextEncoder().encode(JSON.stringify(successfulMessage)));
          resolveBodyStarted?.();
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

    const sender = createSender({
      fetch: async () => {
        requestCount += 1;

        return response;
      }
    });

    const sending = sender.send(CHANNEL_ID, "cancel during body", controller.signal);
    await bodyStarted;
    controller.abort();

    await expect(within(sending, 250)).rejects.toMatchObject({
      publicError: { code: "delivery_unknown" }
    });
    expect(requestCount).toBe(1);
  });

  test("cancels a retry wait without making a later attempt", async () => {
    const controller = new AbortController();
    let requestCount = 0;
    let resolveSleepStarted: (() => void) | undefined;

    const sleepStarted = new Promise<void>((resolve) => {
      resolveSleepStarted = resolve;
    });

    const sender = createSender({
      fetch: async () => {
        requestCount += 1;

        return new Response("temporary", { status: 503 });
      },
      sleep: async (_milliseconds, signal) => {
        resolveSleepStarted?.();

        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      }
    });

    const sending = sender.send(CHANNEL_ID, "cancel during retry", controller.signal);
    await sleepStarted;
    controller.abort();

    await expect(within(sending, 250)).rejects.toMatchObject({
      publicError: { code: "delivery_unknown" }
    });
    expect(requestCount).toBe(1);
  });
});

describe("Discord MCP tool", () => {
  test("advertises and calls the tool through the official in-memory transport", async () => {
    const calls: Array<{ channelId: string; content: string }> = [];

    const sender: DiscordToolSender = {
      async send(channelId, content) {
        calls.push({ channelId, content });

        return {
          message_id: MESSAGE_ID,
          channel_id: channelId,
          created_at: successfulMessage.timestamp
        };
      }
    };

    const config = requireConfig();
    const server = createDiscordMcpServer({ config, sender });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "discord-mcp-test", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const listed = await client.listTools();

      const result = await client.callTool({
        name: "discord_send_message",
        arguments: { content: CONTENT }
      });

      expect(listed.tools).toHaveLength(1);
      expect(listed.tools[0]).toMatchObject({
        name: "discord_send_message",
        description: "Send plain text to a configured named Discord destination."
      });
      expect(listed.tools[0]?.inputSchema.required).toEqual(["content"]);
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual({
        destination: "notifications",
        message_id: MESSAGE_ID,
        channel_id: CHANNEL_ID,
        created_at: successfulMessage.timestamp
      });
      expect(calls).toEqual([{ channelId: CHANNEL_ID, content: CONTENT }]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("rejects an unallowlisted destination before the sender is called", async () => {
    let callCount = 0;

    const sender: DiscordToolSender = {
      async send() {
        callCount += 1;

        return {
          message_id: MESSAGE_ID,
          channel_id: CHANNEL_ID,
          created_at: successfulMessage.timestamp
        };
      }
    };

    const server = createDiscordMcpServer({ config: requireConfig(), sender });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "discord-mcp-test", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({
        name: "discord_send_message",
        arguments: { content: "not sent", destination: "other" }
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        text: expect.stringContaining('"code":"invalid_input"')
      });
      expect(callCount).toBe(0);
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("redacts sender failures", async () => {
    const leakedValue = "sensitive sender detail";

    const failingSender: DiscordToolSender = {
      async send() {
        throw new Error(leakedValue);
      }
    };

    const server = createDiscordMcpServer({ config: requireConfig(), sender: failingSender });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "discord-mcp-test", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const failed = await client.callTool({
        name: "discord_send_message",
        arguments: { content: leakedValue }
      });

      expect(failed.isError).toBe(true);
      expect(JSON.stringify(failed)).not.toContain(leakedValue);
      expect(failed.content[0]).toMatchObject({
        text: expect.stringContaining('"code":"delivery_unknown"')
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});

function requireConfig(): DiscordConfig {
  const result = loadConfig(baseEnvironment);

  if (!result.ok) throw new Error("test configuration did not parse");

  return result.config;
}

function createSender(options: DiscordRestSenderOptions): DiscordRestSender {
  return new DiscordRestSender(requireConfig(), {
    deadlineMs: 5_000,
    attemptTimeoutMs: 1_000,
    maxAttempts: 3,
    ...options
  });
}

type JsonResponseBody = Record<string, string | number>;

function jsonResponse(value: JsonResponseBody): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function stalledSuccessResponse(): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(new TextEncoder().encode(JSON.stringify(successfulMessage)));
      }
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function stalledRateLimitResponse(): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(new TextEncoder().encode('{"retry_after":0.001'));
      }
    }),
    { status: 429, headers: { "content-type": "application/json" } }
  );
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
