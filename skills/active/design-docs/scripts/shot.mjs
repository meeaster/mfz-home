#!/usr/bin/env node
// Screenshot a built design doc in headless Chrome: one page of it, optionally with a reference card open,
// every option in its security view, or dark mode. Uses the Chrome DevTools Protocol directly.
//
// node shot.mjs <built.html> <out.png> [--page overview] [--selector "#overview-system .diagram"] [--card E2] [--view security] [--click "#D1"] [--dark] [--full] [--width 1440] [--height 900]
//
// --click clicks an element first, such as a decision row to capture its modal.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    page: { type: "string" },
    card: { type: "string" },
    click: { type: "string" },
    selector: { type: "string" },
    view: { type: "string" },
    dark: { type: "boolean", default: false },
    full: { type: "boolean", default: false },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "900" },
    chrome: { type: "string", default: process.env.CHROME ?? "google-chrome" },
  },
});

const [pagePath, outPath] = positionals;

if (pagePath === undefined || outPath === undefined) {
  console.error("usage: node shot.mjs <built.html> <out.png> [--page overview] [--selector css] [--card E2] [--view security] [--click css] [--dark] [--full] [--width 1440] [--height 900]");
  process.exit(2);
}

const width = Number.parseInt(values.width, 10);

const height = Number.parseInt(values.height, 10);

const pageUrl = pathToFileURL(resolve(pagePath));

if (values.page !== undefined) pageUrl.searchParams.set("page", values.page);

if (values.card !== undefined) pageUrl.searchParams.set("card", values.card);

if (values.view !== undefined) pageUrl.searchParams.set("view", values.view);

const port = 9300 + Math.floor(Math.random() * 500);

const profile = mkdtempSync(join(tmpdir(), "doc-shot-"));

const chrome = spawn(
  values.chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const findPageSocket = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find((target) => target.type === "page");

      if (page !== undefined) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting; retry.
    }

    await sleep(200);
  }

  throw new Error(`Chrome did not expose a page on port ${port}`);
};

// Wait for Chrome to exit before removing its profile; it keeps writing until then.
const finish = async (code) => {
  const exited = new Promise((done) => chrome.once("exit", done));

  chrome.kill();
  await Promise.race([exited, sleep(3000)]);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  process.exit(code);
};

try {
  const socket = new WebSocket(await findPageSocket());
  const pending = new Map();
  let nextId = 0;

  await new Promise((opened) => socket.addEventListener("open", opened, { once: true }));

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const settle = pending.get(message.id);

    if (settle === undefined) return;
    pending.delete(message.id);
    settle(message);
  });

  const send = (method, params = {}) =>
    new Promise((settle) => {
      nextId += 1;
      pending.set(nextId, settle);
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });

  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  if (values.dark) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  }

  await send("Page.enable");
  await send("Page.navigate", { url: pageUrl.href });
  await sleep(2500);

  const capture = { format: "png" };

  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;

  if (values.click !== undefined) {
    const clicked = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(values.click)}); if (node === null) return false; node.scrollIntoView({ block: "center" }); node.click(); return true; })()`);

    if (!clicked) throw new Error(`nothing matches ${values.click} on this page`);

    await sleep(400);
  }

  if (values.card !== undefined && !(await evaluate("document.querySelector('.ref-card:popover-open, .ref-card.is-open') !== null"))) {
    console.warn(`warning: no visible marker for ${values.card} on this page, so no card is open`);
  }

  if (values.selector !== undefined) {
    // Capture one element at full size, wherever it sits on the page.
    const box = await evaluate(
      `(() => { const node = document.querySelector(${JSON.stringify(values.selector)}); if (node === null) return null; const r = node.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`,
    );

    if (box == null) throw new Error(`nothing matches ${values.selector} on this page`);

    capture.captureBeyondViewport = true;
    capture.clip = { ...box, scale: 1 };
  } else if (values.full) {
    const metrics = await send("Page.getLayoutMetrics");
    const size = metrics.result.cssContentSize;

    capture.captureBeyondViewport = true;
    capture.clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
  }

  const shot = await send("Page.captureScreenshot", capture);

  writeFileSync(outPath, Buffer.from(shot.result.data, "base64"));
  console.log(`wrote ${outPath}`);
  await finish(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await finish(1);
}
