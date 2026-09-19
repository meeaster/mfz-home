import { EventEmitter, once } from "node:events";
import { createServer, request as httpRequest, type IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, expect, test } from "vitest";
import {
  createBoundedNodeHandler,
  MAX_REQUEST_BODY_BYTES,
  type NodeResponse,
  readBoundedRequest,
  RequestBodyTooLargeError,
  writeWebResponse
} from "./http-adapter.js";

describe("bounded Node HTTP adapter", () => {
  test("accepts exactly the configured byte limit", async () => {
    const body = Buffer.alloc(MAX_REQUEST_BODY_BYTES, "a");
    const request = readableRequest([body]);
    const controller = new AbortController();

    const webRequest = await readBoundedRequest(request, controller.signal);

    expect(new Uint8Array(await webRequest.arrayBuffer())).toHaveLength(MAX_REQUEST_BODY_BYTES);
  });

  test("rejects one byte over the configured byte limit without appending the chunk", async () => {
    const request = readableRequest([Buffer.alloc(MAX_REQUEST_BODY_BYTES + 1, "a")]);
    const controller = new AbortController();

    await expect(readBoundedRequest(request, controller.signal)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError
    );
  });

  test("fast-rejects an oversized declared content length before reading", async () => {
    let read = false;
    const request = readableRequest([], { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) });
    request.on("data", () => {
      read = true;
    });

    await expect(readBoundedRequest(request, new AbortController().signal)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError
    );
    expect(read).toBe(false);
  });

  test("reads chunked and absent-length bodies as raw bytes", async () => {
    const request = readableRequest(["a", Buffer.from("b")]);
    const webRequest = await readBoundedRequest(request, new AbortController().signal);

    await expect(webRequest.text()).resolves.toBe("ab");
  });

  test("streams response chunks while respecting drain backpressure", async () => {
    const response = new FakeServerResponse();

    const webResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("first"));
          controller.enqueue(new TextEncoder().encode("second"));
          controller.close();
        }
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } }
    );

    await writeWebResponse(response, webResponse, new AbortController().signal);

    expect(response.statusCode).toBe(200);
    expect(response.writes.map((chunk) => Buffer.from(chunk).toString())).toEqual(["first", "second"]);
    expect(response.writableEnded).toBe(true);
  });

  test("aborts the handler and cancels the response stream when the client disconnects", async () => {
    let resolveHandlerAborted: (() => void) | undefined;
    let resolveStreamCancelled: (() => void) | undefined;
    let streamWasCancelled = false;

    const handlerAborted = new Promise<void>((resolve) => {
      resolveHandlerAborted = resolve;
    });

    const streamCancelled = new Promise<void>((resolve) => {
      resolveStreamCancelled = resolve;
    });

    let interval: NodeJS.Timeout | undefined;

    const handler = {
      fetch(request: Request): Promise<Response> {
        request.signal.addEventListener("abort", () => resolveHandlerAborted?.(), { once: true });

        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("data: first\n\n"));
            interval = setInterval(() => {
              controller.enqueue(new TextEncoder().encode("data: next\n\n"));
            }, 10);
          },
          cancel() {
            if (interval !== undefined) clearInterval(interval);
            streamWasCancelled = true;
            resolveStreamCancelled?.();
          }
        });

        return Promise.resolve(new Response(body, { headers: { "content-type": "text/event-stream" } }));
      }
    };

    const server = createServer(createBoundedNodeHandler(handler));

    await listen(server);

    try {
      const clientRequest = httpRequest({ host: "127.0.0.1", port: serverPort(server), path: "/stream" });
      clientRequest.end();
      // SAFETY: The response event is emitted with Node's IncomingMessage instance.
      const response = await once(clientRequest, "response").then(([value]) => value as IncomingMessage);

      await once(response, "data");
      response.destroy();

      await handlerAborted;
      await streamCancelled;
      expect(streamWasCancelled).toBe(true);
    } finally {
      await closeServer(server);

      if (interval !== undefined) clearInterval(interval);
    }
  });
});

function readableRequest(
  chunks: readonly (Buffer | string)[],
  headers: Record<string, string> = {}
): IncomingMessage {
  // SAFETY: Readable supplies the request stream methods; Object.assign supplies the HTTP fields used by the adapter.
  const request = Readable.from(chunks) as IncomingMessage;

  Object.assign(request, {
    method: "POST",
    url: "/mcp",
    headers: { host: "127.0.0.1", ...headers }
  });

  return request;
}

async function listen(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);

    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
}

function serverPort(server: ReturnType<typeof createServer>): number {
  const address = server.address();

  // SAFETY: The test server always binds a TCP listener, never a Unix-domain socket.
  const addressInfo = address as { port: number } | null;

  if (addressInfo === null) throw new Error("test server has no port");

  return addressInfo.port;
}

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
}

class FakeServerResponse extends EventEmitter implements NodeResponse {
  readonly writes: Uint8Array[] = [];

  readonly headers = new Map<string, string>();

  statusCode = 0;

  writableEnded = false;

  destroyed = false;

  shouldKeepAlive = true;

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);

    return this;
  }

  writeHead(statusCode: number, _headers?: Record<string, string>): this {
    this.statusCode = statusCode;

    return this;
  }

  write(chunk: Uint8Array): boolean {
    this.writes.push(chunk);
    queueMicrotask(() => this.emit("drain"));

    return false;
  }

  end(): void {
    this.writableEnded = true;
  }
}
