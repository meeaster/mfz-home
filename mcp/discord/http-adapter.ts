import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export const MAX_REQUEST_BODY_BYTES = 64 * 1024;

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

const REQUEST_TOO_LARGE_BODY = '{"error":"Request body too large."}';

export interface FetchHandler {
  fetch(request: Request): Promise<Response>;
}

export interface NodeResponse {
  setHeader(name: string, value: string): void;
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  write(chunk: Uint8Array): boolean;
  end(chunk?: string | Uint8Array): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  destroyed: boolean;
  writableEnded: boolean;
  shouldKeepAlive: boolean;
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("The request body is too large.");
    this.name = "RequestBodyTooLargeError";
  }
}

export class RequestAbortedError extends Error {
  constructor() {
    super("The request was aborted.");
    this.name = "RequestAbortedError";
  }
}

export function createBoundedNodeHandler(
  handler: FetchHandler,
  maxBodyBytes = MAX_REQUEST_BODY_BYTES
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
    const abortController = new AbortController();
    const cleanup = connectAbortSignals(request, response, abortController);

    try {
      const webRequest = await readBoundedRequest(request, abortController.signal, maxBodyBytes);
      const webResponse = await handler.fetch(webRequest);

      await writeWebResponse(response, webResponse, abortController.signal);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        sendRequestTooLarge(request, response);
      } else if (!abortController.signal.aborted && !response.destroyed) {
        sendInternalServerError(response);
      }
    } finally {
      cleanup();
    }
  };
}

export async function readBoundedRequest(
  request: IncomingMessage,
  signal: AbortSignal,
  maxBodyBytes = MAX_REQUEST_BODY_BYTES
): Promise<Request> {
  const method = (request.method ?? "GET").toUpperCase();
  const headers = copyRequestHeaders(request);
  let body: Buffer | undefined;

  if (!BODYLESS_METHODS.has(method)) {
    const declaredLength = declaredContentLength(request);

    if (declaredLength !== undefined && declaredLength > maxBodyBytes) {
      throw new RequestBodyTooLargeError();
    }

    const chunks: Buffer[] = [];
    let bodyBytes = 0;

    for await (const chunk of request) {
      if (signal.aborted) throw new RequestAbortedError();

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const nextBodyBytes = bodyBytes + buffer.byteLength;

      if (nextBodyBytes > maxBodyBytes) throw new RequestBodyTooLargeError();

      chunks.push(buffer);
      bodyBytes = nextBodyBytes;
    }

    body = Buffer.concat(chunks, bodyBytes);
  }

  if (signal.aborted) throw new RequestAbortedError();

  // SAFETY: Node's Buffer is a byte-preserving BodyInit accepted by the web Request runtime.
  const requestBody = body !== undefined && body.byteLength > 0 ? (body as BodyInit) : undefined;

  const requestInit: RequestInit = { method, headers, signal };

  if (requestBody !== undefined) requestInit.body = requestBody;

  return new Request(requestUrl(request), requestInit);
}

export async function writeWebResponse(
  response: NodeResponse,
  webResponse: Response,
  signal: AbortSignal
): Promise<void> {
  for (const [name, value] of webResponse.headers) response.setHeader(name, value);

  response.writeHead(webResponse.status);

  if (webResponse.body === null) {
    response.end();

    return;
  }

  const reader = webResponse.body.getReader();

  try {
    while (!signal.aborted && !response.destroyed) {
      const result = await readWithAbort(reader, signal);

      if (result.done) break;

      if (!response.write(result.value)) await waitForDrain(response, signal);
    }
  } catch (error) {
    if (!signal.aborted && !response.destroyed) throw error;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  if (!signal.aborted && !response.destroyed && !response.writableEnded) response.end();
}

function declaredContentLength(request: IncomingMessage): number | undefined {
  const header = request.headers["content-length"];
  const value = Array.isArray(header) ? header[0] : header;

  if (value === undefined || !/^\d+$/u.test(value)) return undefined;

  const length = Number(value);

  return Number.isSafeInteger(length) ? length : Number.MAX_SAFE_INTEGER;
}

function copyRequestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name)) continue;

    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }

  return headers;
}

function requestUrl(request: IncomingMessage): string {
  const host = headerValue(request.headers.host) ?? "127.0.0.1";

  return new URL(request.url ?? "/", `http://${host}`).toString();
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function connectAbortSignals(
  request: IncomingMessage,
  response: NodeResponse,
  controller: AbortController
): () => void {
  const abort = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  const onRequestClose = () => {
    if (!request.complete) abort();
  };

  const onResponseClose = () => {
    if (!response.writableEnded) abort();
  };

  request.once("aborted", abort);
  request.once("error", abort);
  request.once("close", onRequestClose);
  response.once("close", onResponseClose);
  response.once("error", abort);

  return () => {
    request.off("aborted", abort);
    request.off("error", abort);
    request.off("close", onRequestClose);
    response.off("close", onResponseClose);
    response.off("error", abort);
  };
}

function sendRequestTooLarge(request: IncomingMessage, response: NodeResponse): void {
  request.pause();
  response.shouldKeepAlive = false;
  response.writeHead(413, {
    connection: "close",
    "content-length": String(Buffer.byteLength(REQUEST_TOO_LARGE_BODY)),
    "content-type": "application/json"
  });
  response.end(REQUEST_TOO_LARGE_BODY);
}

function sendInternalServerError(response: NodeResponse): void {
  const body = '{"error":"Internal server error."}';

  response.writeHead(500, {
    connection: "close",
    "content-length": String(Buffer.byteLength(body)),
    "content-type": "application/json"
  });
  response.end(body);
}

async function readWithAbort(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) throw new RequestAbortedError();

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new RequestAbortedError());

    signal.addEventListener("abort", onAbort, { once: true });

    void reader.read().then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function waitForDrain(response: NodeResponse, signal: AbortSignal): Promise<void> {
  if (signal.aborted || response.destroyed) return Promise.reject(new RequestAbortedError());

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      response.off("drain", onDrain);
      response.off("close", onClose);
      response.off("error", onError);
      signal.removeEventListener("abort", onAbort);
    };

    const onDrain = () => {
      cleanup();
      resolve();
    };

    const onClose = () => {
      cleanup();
      reject(new RequestAbortedError());
    };

    const onError = () => {
      cleanup();
      reject(new RequestAbortedError());
    };

    const onAbort = () => {
      cleanup();
      reject(new RequestAbortedError());
    };

    response.once("drain", onDrain);
    response.once("close", onClose);
    response.once("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
