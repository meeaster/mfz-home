// Shared core for commands that expose a Windows app's Chrome DevTools Protocol port to WSL
// so agent-browser can drive and record it: `agent-browser connect <port>`.
//
// WSL runs in NAT mode here (mirrored networking breaks Docker), so Windows loopback is not
// reachable from WSL. Instead of a port proxy or firewall rule, each connection to WSL
// 127.0.0.1:<port> is bridged through a Windows node.exe launched over WSL interop, which
// dials Windows 127.0.0.1:<port>. Nothing listens on a network interface.
// Start the app before binding the WSL relay: localhost forwarding can otherwise claim the
// Windows port and route the bridge back to the WSL listener.
//
// Windows node.exe is taken from mise's install directory, never from its shims: running a
// Windows mise shim from WSL triggers a full install of the Windows toolset.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { homedir } from "node:os";
import path from "node:path";

const POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";

const LAUNCH_TIMEOUT_MS = 30_000;

export function powershell(command) {
  return execFileSync(POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8" }).replace(/\r/g, "").trim();
}

function windowsLocalAppData() {
  const windowsPath = powershell("$env:LOCALAPPDATA");

  return execFileSync("wslpath", ["-u", windowsPath], { encoding: "utf8" }).trim();
}

function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }

  return 0;
}

/** Newest exact-version node.exe under Windows mise installs; aliases like `lts` are skipped. */
function findWindowsNode(app) {
  const override = process.env[`${app.envPrefix}_WINDOWS_NODE`];

  if (override) {
    return override;
  }

  const installs = path.join(windowsLocalAppData(), "mise", "installs", "node");

  const versions = existsSync(installs)
    ? readdirSync(installs).filter((name) => /^\d+\.\d+\.\d+$/.test(name) && existsSync(path.join(installs, name, "node.exe")))
    : [];

  if (versions.length === 0) {
    throw new Error(`no Windows node.exe found under ${installs}; set ${app.envPrefix}_WINDOWS_NODE`);
  }

  const newest = versions.sort(compareVersions).at(-1);

  return path.join(installs, newest, "node.exe");
}

function parsePort(args, defaultPort) {
  const index = args.indexOf("--port");

  if (index === -1) {
    return defaultPort;
  }

  const port = Number(args[index + 1]);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`invalid --port value: ${args[index + 1]}`);
  }

  return port;
}

function stateDir(app) {
  return path.join(process.env.XDG_STATE_HOME ?? path.join(homedir(), ".local", "state"), app.name);
}

function pidFile(app, port) {
  return path.join(stateDir(app), `relay-${port}.pid`);
}

function logFile(app, port) {
  return path.join(stateDir(app), `relay-${port}.log`);
}

function runningRelayPid(app, port) {
  const file = pidFile(app, port);

  if (!existsSync(file)) {
    return undefined;
  }

  const pid = Number(readFileSync(file, "utf8"));

  try {
    process.kill(pid, 0);

    return pid;
  } catch {
    rmSync(file, { force: true });

    return undefined;
  }
}

/** Resolves with the DevTools version payload, or undefined when nothing answers. */
async function probe(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(20_000) });

    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
}

function probeWindows(port) {
  try {
    const response = powershell(`
try {
  $version = Invoke-RestMethod -Uri 'http://127.0.0.1:${port}/json/version' -TimeoutSec 3 -ErrorAction Stop
  $version | ConvertTo-Json -Compress
} catch {}
    `);

    return response ? JSON.parse(response) : undefined;
  } catch {
    return undefined;
  }
}

async function waitFor(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const version = await check();

    if (version) {
      return version;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return undefined;
}

function windowsPortState(port) {
  const result = powershell(`
$port = ${port}
$portproxyRules = @()
foreach ($type in @('v4tov4', 'v4tov6', 'v6tov4', 'v6tov6')) {
  $output = & netsh.exe interface portproxy show $type 2>$null
  foreach ($line in $output) {
    if ($line -match '^\\s*(\\S+)\\s+(\\d+)\\s+(\\S+)\\s+(\\d+)\\s*$') {
      if ([int]$Matches[2] -eq $port) {
        $portproxyRules += [pscustomobject]@{
          type = $type
          listenAddress = $Matches[1]
        }
      }
    }
  }
}
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
  $owner = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{
    address = $_.LocalAddress
    pid = $_.OwningProcess
    process = if ($owner) { $owner.ProcessName } else { $null }
  }
})
[pscustomobject]@{
  portproxyRules = @($portproxyRules)
  listeners = @($listeners)
} | ConvertTo-Json -Compress -Depth 3
  `);

  return JSON.parse(result);
}

function assertWindowsPortAvailable(app, port) {
  const { listeners, portproxyRules } = windowsPortState(port);
  const conflicts = [];

  for (const rule of portproxyRules) {
    conflicts.push(
      `portproxy rule ${rule.type} holds Windows port ${rule.listenAddress}:${port}. ` +
        `Remove it from an elevated PowerShell with: netsh interface portproxy delete ${rule.type} ` +
        `listenaddress=${rule.listenAddress} listenport=${port}`,
    );
  }

  for (const listener of listeners) {
    if (listener.process?.toLowerCase() === app.processName) {
      continue;
    }

    const owner = listener.process ? `${listener.process}.exe (PID ${listener.pid})` : `unknown process (PID ${listener.pid})`;
    conflicts.push(
      `Windows TCP listener on port ${port} (address ${listener.address}) is owned by ${owner}. ` +
        "Stop the owning process/service or rerun with an unused --port.",
    );
  }

  if (conflicts.length > 0) {
    throw new Error(`Windows debug port ${port} is unavailable:\n${conflicts.map((conflict) => `  - ${conflict}`).join("\n")}`);
  }
}

/** Foreground relay; `start` runs this detached. */
function relay(app, port) {
  const windowsNode = findWindowsNode(app);

  const bridge = [
    `const socket = require("net").connect(${port}, "127.0.0.1");`,
    "process.stdin.pipe(socket);",
    "socket.pipe(process.stdout);",
    "socket.on('close', () => process.exit(0));",
    "socket.on('error', () => process.exit(1));",
  ].join("");

  const server = net.createServer((client) => {
    const child = spawn(windowsNode, ["-e", bridge], { stdio: ["pipe", "pipe", "ignore"] });

    client.pipe(child.stdin);
    child.stdout.pipe(client);
    child.on("exit", () => client.destroy());
    child.on("error", () => client.destroy());
    client.on("close", () => child.kill());
    client.on("error", () => child.kill());
  });

  server.listen(port, "127.0.0.1", () => console.error(`relay listening on 127.0.0.1:${port} via ${windowsNode}`));

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
}

async function start(app, script, port) {
  assertWindowsPortAvailable(app, port);
  const relayAlreadyRunning = runningRelayPid(app, port) !== undefined;

  if (!relayAlreadyRunning) {
    findWindowsNode(app);
  }

  let version = probeWindows(port);

  if (!version) {
    if (app.running()) {
      throw new Error(
        `${app.label} is running without remote debugging on port ${port}. Quit it, then rerun start; ` +
          "a second launch only hands its arguments to the running instance.",
      );
    }

    app.launch(port);
    version = await waitFor(() => probeWindows(port), LAUNCH_TIMEOUT_MS);
  }

  if (!version) {
    throw new Error(`Windows DevTools endpoint did not answer on port ${port}; ${app.label} did not open its debugging port`);
  }

  if (!relayAlreadyRunning) {
    mkdirSync(stateDir(app), { recursive: true });

    const log = openSync(logFile(app, port), "a");

    const child = spawn(process.execPath, [script, "relay", "--port", String(port)], {
      detached: true,
      stdio: ["ignore", log, log],
    });

    child.unref();
    writeFileSync(pidFile(app, port), String(child.pid));
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  version = await waitFor(() => probe(port), LAUNCH_TIMEOUT_MS);

  if (!version) {
    throw new Error(`DevTools endpoint did not answer through the WSL relay on port ${port}; see ${logFile(app, port)}`);
  }

  console.log(`ready: ${version["User-Agent"]}`);
  console.log(`connect: agent-browser connect ${port}`);
}

function stop(app, port) {
  const pid = runningRelayPid(app, port);

  if (pid === undefined) {
    console.log("relay is not running");

    return;
  }

  process.kill(pid, "SIGTERM");
  rmSync(pidFile(app, port), { force: true });
  console.log(`stopped relay pid ${pid}; ${app.label} keeps its debugging port until restarted`);
}

async function status(app, port) {
  const pid = runningRelayPid(app, port);
  const version = pid === undefined ? undefined : await probe(port);

  console.log(`relay: ${pid === undefined ? "stopped" : `running (pid ${pid})`}`);
  console.log(`devtools: ${version ? version["User-Agent"] : "not reachable"}`);
}

function usage(app) {
  return `Usage: ${app.name} <start|stop|status> [--port ${app.defaultPort}]

  start   Start the WSL relay, launch ${app.label} with remote debugging if the port
          is not answering yet, and wait until the DevTools endpoint responds.
  stop    Stop the relay. ${app.label} keeps running; restart it normally to close
          the debugging port on Windows.
  status  Show relay and DevTools endpoint state.

Environment overrides:
${app.envHelp}
  ${`${app.envPrefix}_WINDOWS_NODE`.padEnd(28)} WSL path to a Windows node.exe`;
}

/**
 * Runs the start/stop/status/relay CLI for one Windows app.
 *
 * `app` supplies `name` (command and state directory), `label`, `envPrefix`, `envHelp`,
 * `defaultPort`, `processName` (lowercase, allowed to hold the port), `running()`, which
 * reports an instance that would swallow a new launch, and `launch(port)`.
 * `script` is the entry point's path, re-run detached as the relay.
 */
export function runCli(app, script) {
  async function main() {
    const [command, ...args] = process.argv.slice(2);
    const port = parsePort(args, app.defaultPort);

    switch (command) {
      case "start":
        return start(app, script, port);
      case "stop":
        return stop(app, port);
      case "status":
        return status(app, port);
      case "relay":
        return relay(app, port);
      default:
        console.log(usage(app));
        process.exitCode = command === undefined || command === "--help" || command === "-h" ? 0 : 2;
    }
  }

  main().catch((error) => {
    console.error(`${app.name}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
