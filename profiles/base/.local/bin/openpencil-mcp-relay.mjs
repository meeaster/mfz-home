import { spawn } from "node:child_process";
import net from "node:net";

const LISTEN_HOST = "127.0.0.1";

const RELAY_PORT = 7600;

const CONNECT_TIMEOUT_MS = 5_000;

const SHUTDOWN_TIMEOUT_MS = 5_000;

const pairs = new Set();

let gateway;

let nextPairId = 0;

let server;

let shutdownPromise;

function log(message) {
  console.error(`[openpencil-mcp-relay] ${message}`);
}

function formatError(error) {
  const code = error?.code ? ` code=${error.code}` : "";
  const message = error instanceof Error ? error.message : String(error);

  return `${code} message=${message}`;
}

function discoverGateway() {
  return new Promise((resolve, reject) => {
    const route = spawn("ip", ["-4", "route", "show", "default"], { shell: false });
    let output = "";
    let errorOutput = "";

    route.stdout.setEncoding("utf8");
    route.stderr.setEncoding("utf8");
    route.stdout.on("data", (chunk) => {
      output += chunk;
    });
    route.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    route.once("error", reject);
    route.once("close", (code) => {
      if (code !== 0) {
        const detail = errorOutput.trim() || `ip exited with status ${code}`;
        reject(new Error(`gateway discovery failed: ${detail}`));

        return;
      }

      const routeLine = output.split(/\r?\n/).find((line) => {
        const fields = line.trim().split(/\s+/);

        return fields[0] === "default" && fields[1] === "via";
      });

      const address = routeLine?.trim().split(/\s+/)[2];

      if (!address || net.isIP(address) !== 4) {
        reject(new Error("gateway discovery returned no valid IPv4 default route"));

        return;
      }

      resolve(address);
    });
  });
}

function pairAddress(socket) {
  return `${socket.remoteAddress ?? "unknown"}:${socket.remotePort ?? "?"}`;
}

function closePair(pair, reason, error) {
  if (pair.closed) {
    return;
  }

  pair.closed = true;
  pairs.delete(pair);
  clearTimeout(pair.connectTimer);

  if (error) {
    log(`closed pair=${pair.id} reason=${reason}${formatError(error)}`);
  } else {
    log(`closed pair=${pair.id} reason=${reason}`);
  }

  pair.client.destroy();
  pair.upstream?.destroy();
}

function handleClient(client) {
  const pair = {
    id: ++nextPairId,
    client,
    upstream: null,
    connectTimer: null,
    closed: false,
  };

  pairs.add(pair);

  log(`accepted pair=${pair.id} client=${pairAddress(client)} upstream=${gateway}:${RELAY_PORT}`);
  client.once("error", (error) => closePair(pair, "client error", error));
  client.once("close", () => closePair(pair, "client close"));

  pair.upstream = net.createConnection({ host: gateway, port: RELAY_PORT });
  pair.upstream.once("connect", () => {
    if (pair.closed) {
      return;
    }

    clearTimeout(pair.connectTimer);
    pair.connectTimer = null;
    client.pipe(pair.upstream);
    pair.upstream.pipe(client);
    log(`connected pair=${pair.id} gateway=${gateway}:${RELAY_PORT}`);
  });
  pair.upstream.once("error", (error) => closePair(pair, "upstream error", error));
  pair.upstream.once("close", () => closePair(pair, "upstream close"));
  pair.connectTimer = setTimeout(() => {
    const error = new Error(`upstream connect timeout after ${CONNECT_TIMEOUT_MS}ms`);
    error.code = "ETIMEDOUT";
    closePair(pair, "upstream timeout", error);
  }, CONNECT_TIMEOUT_MS);
}

function listenForClients() {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };

    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(RELAY_PORT, LISTEN_HOST);
  });
}

function requestShutdown(reason, exitCode = 0) {
  if (!shutdownPromise) {
    shutdownPromise = shutdown(reason, exitCode);
  }

  return shutdownPromise;
}

async function shutdown(reason, exitCode) {
  log(`shutdown requested reason=${reason} pairs=${pairs.size}`);

  const serverClosed = new Promise((resolve) => {
    if (!server?.listening) {
      resolve();

      return;
    }

    server.close(resolve);
  });

  for (const pair of [...pairs]) {
    closePair(pair, "shutdown");
  }

  let timeout;
  await Promise.race([
    serverClosed,
    new Promise((resolve) => {
      timeout = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timeout);

  if (pairs.size > 0) {
    log(`shutdown timeout pairs=${pairs.size}`);

    for (const pair of [...pairs]) {
      closePair(pair, "shutdown timeout");
    }
  }

  log(`shutdown complete reason=${reason}`);
  process.exitCode = exitCode;
}

async function start() {
  gateway = await discoverGateway();
  log(`selected gateway=${gateway}`);

  server = net.createServer(handleClient);
  process.once("SIGTERM", () => {
    void requestShutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void requestShutdown("SIGINT");
  });

  try {
    await listenForClients();
  } catch (error) {
    log(`listener startup failed${formatError(error)}`);
    process.exitCode = 1;

    return;
  }

  server.on("error", (error) => {
    log(`listener error${formatError(error)}`);
    void requestShutdown("listener error", 1);
  });
  log(`listening on ${LISTEN_HOST}:${RELAY_PORT}`);
}

start().catch((error) => {
  log(`startup failed${formatError(error)}`);
  process.exitCode = 1;
});
