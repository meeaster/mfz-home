import { randomUUID } from "node:crypto";
import * as z from "zod/v4";
import {
  channelIdSchema,
  contentSchema,
  type DiscordConfig
} from "./config.js";
import {
  DiscordPublicError,
  errorForDiscordStatus
} from "./errors.js";

const DISCORD_API_URL = "https://discord.com/api/v10";

const USER_AGENT = "discord-mcp/0.1.0";

const DEFAULT_CALL_DEADLINE_MS = 10_000;

const DEFAULT_ATTEMPT_TIMEOUT_MS = 5_000;

const DEFAULT_MAX_ATTEMPTS = 3;

const TRANSIENT_BACKOFF_BASE_MS = 250;

const TRANSIENT_BACKOFF_JITTER_MS = 100;

const MAX_RETRY_AFTER_MS = 300_000;

const discordMessageSchema = z
  .object({
    id: channelIdSchema,
    channel_id: channelIdSchema,
    timestamp: z.string().min(1)
  })
  .passthrough();

const rateLimitResponseSchema = z.object({ retry_after: z.number().finite().nonnegative().optional() });

export interface DiscordMessageReceipt {
  readonly message_id: string;
  readonly channel_id: string;
  readonly created_at: string;
}

export type DiscordFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface DiscordRestSenderOptions {
  readonly fetch?: DiscordFetch;
  readonly deadlineMs?: number;
  readonly attemptTimeoutMs?: number;
  readonly maxAttempts?: number;
  readonly sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  readonly now?: () => number;
  readonly random?: () => number;
  readonly nonceFactory?: () => string;
}

interface DiscordRequestBody {
  readonly content: string;
  readonly allowed_mentions: { readonly parse: [] };
  readonly nonce: string;
  readonly enforce_nonce: true;
}

type RequestResult =
  | { readonly kind: "response"; readonly response: ResponseResult; readonly attempted: true }
  | { readonly kind: "network"; readonly attempted: boolean }
  | { readonly kind: "cancelled"; readonly attempted: boolean };

type ResponseResult =
  | { readonly kind: "success"; readonly receipt: DiscordMessageReceipt }
  | { readonly kind: "retry_rate_limit"; readonly retryAfterMs: number | undefined }
  | { readonly kind: "error"; readonly error: DiscordPublicError }
  | { readonly kind: "transient" };

export class DiscordRestSender {
  private readonly fetch: DiscordFetch;

  private readonly deadlineMs: number;

  private readonly attemptTimeoutMs: number;

  private readonly maxAttempts: number;

  private readonly sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;

  private readonly now: () => number;

  private readonly random: () => number;

  private readonly nonceFactory: () => string;

  constructor(
    private readonly config: DiscordConfig,
    options: DiscordRestSenderOptions = {}
  ) {
    this.fetch = options.fetch ?? defaultFetch;
    this.deadlineMs = positiveInteger(options.deadlineMs, DEFAULT_CALL_DEADLINE_MS);
    this.attemptTimeoutMs = positiveInteger(
      options.attemptTimeoutMs,
      DEFAULT_ATTEMPT_TIMEOUT_MS
    );
    this.maxAttempts = positiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS);
    this.sleep = options.sleep ?? delay;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    this.nonceFactory = options.nonceFactory ?? createNonce;
  }

  async send(
    channelId: string,
    content: string,
    callerSignal?: AbortSignal
  ): Promise<DiscordMessageReceipt> {
    if (!channelIdSchema.safeParse(channelId).success || !contentSchema.safeParse(content).success) {
      throw new DiscordPublicError("invalid_input");
    }

    if (callerSignal?.aborted) throw cancellationError(false);

    const nonce = this.nonceFactory();

    if (nonce.length === 0 || nonce.length > 25) {
      throw new DiscordPublicError("delivery_unknown");
    }

    const body: DiscordRequestBody = {
      content,
      allowed_mentions: { parse: [] },
      nonce,
      enforce_nonce: true
    };

    const deadline = this.now() + this.deadlineMs;
    const operationController = new AbortController();
    const onCallerAbort = () => operationController.abort();

    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
    const deadlineTimer = setTimeout(() => operationController.abort(), this.deadlineMs);
    let attemptedPost = false;

    try {
      for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
        if (operationController.signal.aborted) {
          throw cancellationError(attemptedPost);
        }

        const remaining = deadline - this.now();

        if (remaining <= 0) throw cancellationError(attemptedPost);

        const request = await this.post(
          channelId,
          body,
          Math.min(remaining, this.attemptTimeoutMs),
          operationController.signal
        );

        attemptedPost ||= request.attempted;

        if (request.kind === "cancelled") throw cancellationError(attemptedPost);

        if (request.kind === "network") {
          if (attempt === this.maxAttempts || !this.canWait(deadline, attempt)) {
            throw new DiscordPublicError("delivery_unknown");
          }

          await this.waitForTransientRetry(
            deadline,
            attempt,
            "delivery_unknown",
            operationController.signal
          );
          continue;
        }

        if (operationController.signal.aborted) throw cancellationError(attemptedPost);

        const response = request.response;

        if (response.kind === "success") return response.receipt;

        if (response.kind === "error") throw response.error;

        if (response.kind === "retry_rate_limit") {
          const retryAfterMs = response.retryAfterMs;

          if (
            retryAfterMs === undefined ||
            attempt === this.maxAttempts ||
            retryAfterMs >= deadline - this.now()
          ) {
            throw new DiscordPublicError("rate_limited", retryAfterMs);
          }

          await this.sleepWithSignal(retryAfterMs, operationController.signal);
          continue;
        }

        if (attempt === this.maxAttempts || !this.canWait(deadline, attempt)) {
          throw new DiscordPublicError("temporary_discord_failure");
        }

        await this.waitForTransientRetry(
          deadline,
          attempt,
          "temporary_discord_failure",
          operationController.signal
        );
      }

      throw new DiscordPublicError("delivery_unknown");
    } catch (error) {
      if (operationController.signal.aborted) {
        throw cancellationError(attemptedPost);
      }

      throw error;
    } finally {
      clearTimeout(deadlineTimer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    }
  }

  private async post(
    channelId: string,
    body: DiscordRequestBody,
    timeoutMs: number,
    operationSignal: AbortSignal
  ): Promise<RequestResult> {
    if (operationSignal.aborted) return { kind: "cancelled", attempted: false };

    const controller = new AbortController();
    const onOperationAbort = () => controller.abort();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let attempted = false;

    operationSignal.addEventListener("abort", onOperationAbort, { once: true });

    try {
      attempted = true;

      const response = await this.fetch(
        `${DISCORD_API_URL}/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${this.config.botToken}`,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
          },
          body: JSON.stringify(body),
          signal: controller.signal
        }
      );

      const classified = await this.classifyResponse(response, channelId, controller.signal);

      if (operationSignal.aborted) return { kind: "cancelled", attempted };

      if (controller.signal.aborted) return { kind: "network", attempted };

      return { kind: "response", response: classified, attempted: true };
    } catch {
      if (operationSignal.aborted) return { kind: "cancelled", attempted };

      return { kind: "network", attempted };
    } finally {
      clearTimeout(timeout);
      operationSignal.removeEventListener("abort", onOperationAbort);
    }
  }

  private async classifyResponse(
    response: Response,
    channelId: string,
    signal: AbortSignal
  ): Promise<ResponseResult> {
    if (response.status >= 200 && response.status <= 299) {
      return this.parseSuccessfulResponse(response, channelId, signal);
    }

    if (response.status === 429) {
      return {
        kind: "retry_rate_limit",
        retryAfterMs: await retryAfterMilliseconds(response, signal)
      };
    }

    if (response.status >= 500 && response.status <= 599) return { kind: "transient" };

    return {
      kind: "error",
      error: new DiscordPublicError(errorForDiscordStatus(response.status))
    };
  }

  private async parseSuccessfulResponse(
    response: Response,
    expectedChannelId: string,
    signal: AbortSignal
  ): Promise<ResponseResult> {
    let body: unknown;

    try {
      body = JSON.parse(await readResponseText(response, signal));
    } catch {
      if (signal.aborted) throw new OperationCancelledError();

      return { kind: "error", error: new DiscordPublicError("delivery_unknown") };
    }

    const parsedMessage = discordMessageSchema.safeParse(body);

    if (!parsedMessage.success) {
      return { kind: "error", error: new DiscordPublicError("delivery_unknown") };
    }

    if (parsedMessage.data.channel_id !== expectedChannelId) {
      return { kind: "error", error: new DiscordPublicError("delivery_unknown") };
    }

    return {
      kind: "success",
      receipt: {
        message_id: parsedMessage.data.id,
        channel_id: parsedMessage.data.channel_id,
        created_at: parsedMessage.data.timestamp
      }
    };
  }

  private canWait(deadline: number, attempt: number): boolean {
    return attempt < this.maxAttempts && deadline - this.now() > 0;
  }

  private async waitForTransientRetry(
    deadline: number,
    attempt: number,
    exhaustedCode: "delivery_unknown" | "temporary_discord_failure",
    signal: AbortSignal
  ): Promise<void> {
    const remaining = deadline - this.now();

    const base = Math.min(
      TRANSIENT_BACKOFF_BASE_MS * 2 ** (attempt - 1),
      DEFAULT_ATTEMPT_TIMEOUT_MS
    );

    const jitter = Math.floor(Math.max(0, Math.min(0.999, this.random())) * TRANSIENT_BACKOFF_JITTER_MS);
    const delayMs = base + jitter;

    if (delayMs >= remaining) throw new DiscordPublicError(exhaustedCode);

    await this.sleepWithSignal(delayMs, signal);
  }

  private async sleepWithSignal(milliseconds: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new OperationCancelledError();

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        signal.removeEventListener("abort", onAbort);
      };

      const onAbort = () => {
        if (settled) return;

        settled = true;
        cleanup();
        reject(new OperationCancelledError());
      };

      signal.addEventListener("abort", onAbort, { once: true });

      let sleepPromise: Promise<void>;

      try {
        sleepPromise = this.sleep(milliseconds, signal);
      } catch (error) {
        settled = true;
        cleanup();
        reject(error);

        return;
      }

      void sleepPromise.then(
        () => {
          if (settled) return;

          settled = true;
          cleanup();
          resolve();
        },
        (error) => {
          if (settled) return;

          settled = true;
          cleanup();
          reject(error);
        }
      );
    });
  }
}

class OperationCancelledError extends DiscordPublicError {
  constructor() {
    super("delivery_unknown");
    this.name = "OperationCancelledError";
  }
}

function cancellationError(attemptedPost: boolean): Error {
  return attemptedPost ? new DiscordPublicError("delivery_unknown") : new OperationCancelledError();
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback;

  return Math.max(1, Math.floor(value));
}

function defaultFetch(input: string, init: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(new OperationCancelledError());
    };

    if (signal.aborted) {
      onAbort();

      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function createNonce(): string {
  return randomUUID().replaceAll("-", "").slice(0, 25);
}

async function retryAfterMilliseconds(
  response: Response,
  signal: AbortSignal
): Promise<number | undefined> {
  let body: unknown;

  try {
    body = JSON.parse(await readResponseText(response, signal));
  } catch {
    if (signal.aborted) throw new OperationCancelledError();

    body = undefined;
  }

  const parsedBody = rateLimitResponseSchema.safeParse(body);

  if (parsedBody.success && parsedBody.data.retry_after !== undefined) {
    return secondsToMilliseconds(parsedBody.data.retry_after);
  }

  const header = response.headers.get("retry-after");

  if (header === null) return undefined;

  const seconds = Number(header);

  return Number.isFinite(seconds) && seconds >= 0 ? secondsToMilliseconds(seconds) : undefined;
}

async function readResponseText(response: Response, signal: AbortSignal): Promise<string> {
  if (response.body === null) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const result = await readResponseChunk(reader, signal);

      if (result.done) break;

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  let bodyBytes = 0;

  for (const chunk of chunks) bodyBytes += chunk.byteLength;

  const body = new Uint8Array(bodyBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

async function readResponseChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) throw new OperationCancelledError();

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      void reader.cancel().catch(() => undefined);
      reject(new OperationCancelledError());
    };

    signal.addEventListener("abort", onAbort, { once: true });

    void reader.read().then(
      (result) => {
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

function secondsToMilliseconds(seconds: number): number {
  return Math.min(Math.ceil(seconds * 1000), MAX_RETRY_AFTER_MS);
}
