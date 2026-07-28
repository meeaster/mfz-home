import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mfzSourceRoot = "/home/mark/workspace/repos/mindframe-z";
const sessionSource = "opencode";
const timeoutMs = 120_000;
const pollMs = 500;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function display(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function appendOutput(target, chunk) {
  const next = target + chunk.toString();
  return next.length > 4 * 1024 * 1024 ? next.slice(-4 * 1024 * 1024) : next;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error(`${command} ${args.join(" ")} timed out`));
    }, options.timeoutMs ?? timeoutMs);

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) rejectProcess(error);
      else resolveProcess({ ...result, stdout, stderr });
    }

    child.stdout.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.once("error", (error) => finish(error));
    child.once("close", (code, signal) => finish(null, { code, signal }));
  });
}

async function runChecked(command, args, options = {}) {
  const result = await runProcess(command, args, options);
  if (result.code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.code ?? `signal ${result.signal}`}: ${
        result.stderr.trim() || result.stdout.trim()
      }`,
    );
  }
  return result;
}

async function mfz(args) {
  const result = await runChecked("mfz", args, { timeoutMs: 30_000 });
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`mfz returned invalid JSON: ${result.stdout.trim()}`);
  }
}

function requireOk(value, label) {
  assert(value && value.ok === true, `${label} did not return ok=true: ${display(value)}`);
  return value;
}

async function unit(slug) {
  return requireOk(await mfz(["work", "show", slug, "--json"]), "work show");
}

async function context(sessionID) {
  return requireOk(
    await mfz(["work", "context", "--session", `${sessionSource}:${sessionID}`, "--json"]),
    "work context",
  ).context;
}

async function checkpoints(slug) {
  return requireOk(await mfz(["work", "checkpoints", slug, "--json"]), "work checkpoints").checkpoints;
}

async function receipts(slug) {
  return requireOk(await mfz(["work", "receipts", slug, "--json"]), "work receipts").receipts;
}

function parseJsonLines(stdout) {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`opencode emitted invalid JSON on line ${index + 1}: ${line}`);
      }
    });
}

function modelInput(value) {
  if (!value) return undefined;
  const separator = value.indexOf("/");
  assert(separator > 0 && separator < value.length - 1, `Model must be provider/model, got ${value}`);
  return {
    value,
    providerID: value.slice(0, separator),
    modelID: value.slice(separator + 1),
  };
}

function textEvent(events) {
  return events.some(
    (event) => event.type === "text" && event.part && typeof event.part.text === "string" && event.part.text.trim(),
  );
}

async function runOpenCode(prompt, options = {}) {
  const args = ["run", "--format", "json"];
  if (options.attach) args.push("--attach", options.attach);
  if (options.sessionID) args.push("--session", options.sessionID);
  if (options.model) args.push("--model", options.model.value);
  if (options.variant) args.push("--variant", options.variant);
  if (options.title) args.push("--title", options.title);
  args.push(prompt);

  const result = await runChecked("opencode", args);
  const events = parseJsonLines(result.stdout);
  assert(!events.some((event) => event.type === "error"), `opencode reported an error: ${display(events)}`);
  assert(textEvent(events), "opencode did not produce successful text output");
  const sessionIDs = events.map((event) => event.sessionID).filter((value) => typeof value === "string");
  assert(sessionIDs.length > 0, "opencode JSON output did not contain a session id");
  return { events, sessionID: sessionIDs[0] };
}

async function stopServer(server) {
  if (!server || server.child.exitCode !== null) return;
  server.child.kill("SIGTERM");
  const exited = await Promise.race([once(server.child, "close").then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 5_000))]);
  if (!exited && server.child.exitCode === null) {
    server.child.kill("SIGKILL");
    await once(server.child, "close");
  }
}

async function startServer(port) {
  const args = ["serve", "--hostname", "127.0.0.1", "--port", port ?? "0"];
  const child = spawn("opencode", args, {
    cwd: repoRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolveServer, rejectServer) => {
    let output = "";
    let settled = false;
    const timer = setTimeout(() => fail(new Error("opencode serve did not become ready")), 30_000);

    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void stopServer({ child }).finally(() => rejectServer(error));
    }

    function onData(chunk) {
      output = appendOutput(output, chunk);
      const match = output.match(/opencode server listening on (http:\/\/[^\s]+)/);
      if (!match) return;
      settled = true;
      clearTimeout(timer);
      resolveServer({ child, url: match[1] });
    }

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", fail);
    child.once("close", (code) => {
      if (!settled) fail(new Error(`opencode serve exited before readiness with ${code}: ${output.trim()}`));
    });
  });
}

function serverHeaders() {
  return { "x-opencode-directory": encodeURIComponent(repoRoot) };
}

async function getMessages(serverURL, sessionID) {
  const response = await fetch(`${serverURL}/session/${encodeURIComponent(sessionID)}/message`, {
    headers: serverHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  assert(response.ok, `OpenCode message request failed with ${response.status}: ${body}`);
  try {
    const parsed = JSON.parse(body);
    assert(Array.isArray(parsed), "OpenCode message request did not return an array");
    return parsed;
  } catch (error) {
    throw new Error(`OpenCode message request returned invalid JSON: ${error.message}`);
  }
}

async function summarize(serverURL, sessionID, model) {
  // OpenCode 1.18.4 returns 503 for /api/session/:id/compact; use its legacy route.
  const response = await fetch(`${serverURL}/session/${encodeURIComponent(sessionID)}/summarize`, {
    method: "POST",
    headers: { ...serverHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ providerID: model.providerID, modelID: model.modelID, auto: false }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  assert(response.ok, `legacy summarize failed with ${response.status}: ${body}`);
  assert(body.trim() === "true", `legacy summarize returned ${body.trim()}`);
}

async function waitForCompaction(slug, sessionID, previousCheckpointCount) {
  const deadline = Date.now() + timeoutMs;
  let lastState;
  while (Date.now() < deadline) {
    try {
      const [currentContext, currentCheckpoints] = await Promise.all([context(sessionID), checkpoints(slug)]);
      lastState = { currentContext, currentCheckpoints };
      const checkpoint = currentCheckpoints.find(
        (item) =>
          item.boundary === "compaction" &&
          item.session?.source === sessionSource &&
          item.session?.id === sessionID,
      );
      if (
        currentCheckpoints.length > previousCheckpointCount &&
        checkpoint &&
        currentContext.bound === true &&
        currentContext.freshness === "pending" &&
        currentContext.delivery.state === "pending" &&
        currentContext.delivery.boundary === "compaction"
      ) {
        return { currentContext, checkpoint };
      }
    } catch (error) {
      lastState = error;
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, pollMs));
  }
  throw new Error(`Timed out waiting for compaction checkpoint and pending boundary: ${display(lastState)}`);
}

async function runFocusedFailureCoverage() {
  await runChecked("pnpm", ["vitest", "run", "opencode/plugins/work-context/server.test.ts"], { cwd: repoRoot });
  await runChecked("pnpm", ["vitest", "run", "tests/integration/work.test.ts"], { cwd: mfzSourceRoot });
  console.log("Deterministic failure coverage passed: unavailable store, compaction failure, and binding conflict.");
}

async function main() {
  const slug = process.argv[2];
  assert(slug && process.argv.length === 3, "Usage: pnpm smoke:work-context <existing-unit-slug>");

  const requestedModel = modelInput(process.env.OPENCODE_SMOKE_MODEL);
  const variant = process.env.OPENCODE_SMOKE_VARIANT;
  const port = process.env.OPENCODE_SMOKE_PORT;
  const shownUnit = await unit(slug);
  const originalPhase = shownUnit.unit.phase;
  let sessionID;
  let attached = false;
  let server;

  try {
    const first = await runOpenCode(
      "Reply with a short acknowledgement only. This is trivial unbound work; do not use tools or change files.",
      { model: requestedModel, variant, title: "work-context smoke" },
    );
    sessionID = first.sessionID;

    const initialContext = await context(sessionID);
    assert(initialContext.bound === false, `fresh OpenCode session was not unbound: ${display(initialContext)}`);

    requireOk(
      await mfz(["work", "attach", slug, "--session", `${sessionSource}:${sessionID}`, "--json"]),
      "work attach",
    );
    attached = true;
    const attachedContext = await context(sessionID);
    assert(attachedContext.bound === true && attachedContext.unit.slug === slug, "explicit attachment was not persisted");

    await runOpenCode(
      "Continue the active work unit with a relevant read-only planning step. Do not change files; return a concise useful result.",
      { sessionID, model: requestedModel, variant },
    );
    const attachedReceipts = (await receipts(slug)).filter((item) => item.session?.id === sessionID);
    assert(
      attachedReceipts.some((item) => item.outcome === "delivered" && item.orientation),
      "attachment continuation did not persist a delivered orientation receipt",
    );

    const beforeManualCheckpoint = (await checkpoints(slug)).length;
    const checkpointInstructions = requireOk(
      await mfz(["work", "instructions", "checkpoint", slug, "--json"]),
      "work checkpoint instructions",
    );
    const createdAt = new Date().toISOString();
    const checkpointID = `smoke-${Date.now()}-${randomUUID()}`;
    await writeFile(
      join(checkpointInstructions.directory, `${checkpointID}.md`),
      `---
id: ${checkpointID}
session: ${sessionSource}:${sessionID}
boundary: manual
created_at: ${createdAt}
---

Smoke checkpoint before compaction; preserve the active work direction.
`,
      { encoding: "utf8", flag: "wx" },
    );
    requireOk(
      await mfz(["work", "validate", slug, "--json"]),
      "work checkpoint validation",
    );
    assert((await checkpoints(slug)).length > beforeManualCheckpoint, "explicit checkpoint was not appended");

    server = await startServer(port);
    const messages = await getMessages(server.url, sessionID);
    const assistant = messages.find(
      (message) =>
        message?.info?.role === "assistant" &&
        typeof message.info.providerID === "string" &&
        typeof message.info.modelID === "string",
    );
    assert(
      requestedModel || assistant,
      "could not derive provider/model from the session; set OPENCODE_SMOKE_MODEL=provider/model",
    );
    const model = requestedModel ?? modelInput(`${assistant.info.providerID}/${assistant.info.modelID}`);

    await summarize(server.url, sessionID, model);
    const compacted = await waitForCompaction(slug, sessionID, beforeManualCheckpoint + 1);
    assert(compacted.checkpoint.text, "compaction checkpoint had no persisted summary text");

    await runOpenCode(
      "Continue with a commit or pull-request preparation prompt for the active work unit. Do not commit, push, or edit files; summarize the next delivery step.",
      { attach: server.url, sessionID, model, variant },
    );
    await runOpenCode(
      "Now answer an unrelated question about choosing a weekend meal. Do not change files. Surface any scope drift before answering.",
      { attach: server.url, sessionID, model, variant },
    );
    const latestReceipt = (await receipts(slug))
      .filter((item) => item.session?.id === sessionID)
      .at(-1);
    assert(
      latestReceipt?.boundary === "request" &&
        latestReceipt.outcome === "delivered" &&
        latestReceipt.reminder.includes("scope drift"),
      "unrelated continuation did not leave a scope-drift reminder receipt",
    );

    requireOk(await mfz(["work", "phase", slug, "--phase", "design", "--json"]), "reverse phase");
    assert((await unit(slug)).unit.phase === "design", "phase reversal to design was not persisted");
    requireOk(await mfz(["work", "phase", slug, "--phase", originalPhase, "--json"]), "restore phase");
    assert((await unit(slug)).unit.phase === originalPhase, "original phase was not restored");

    await stopServer(server);
    server = undefined;
    await runFocusedFailureCoverage();
    console.log(`Smoke passed for ${slug} in session ${sessionID}.`);
  } finally {
    try {
      if (attached && sessionID) {
        requireOk(
          await mfz(["work", "detach", "--session", `${sessionSource}:${sessionID}`, "--json"]),
          "work detach",
        );
        assert((await context(sessionID)).bound === false, "session remained bound after explicit detach");
      }
    } finally {
      if (server) await stopServer(server);
    }
  }
}

main().catch((error) => {
  console.error(`work-context smoke failed: ${error.message}`);
  process.exitCode = 1;
});
