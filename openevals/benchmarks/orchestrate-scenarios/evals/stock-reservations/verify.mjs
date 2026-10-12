// Runs in the verification container against the final project. It drives the delivered server over HTTP through
// the interface the prompt names, inspects the final files for the repository's written conventions, and prints one
// JSON line of results. Each server gets its own port and database so no check sees another's state.
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ORIGINAL_MIGRATION = readFileSync(process.argv[2] ?? "/verification/original-001.sql", "utf8");

const TTL_SECONDS = 3;

const log = [];

const note = (label, value) => log.push(`${label}: ${JSON.stringify(value)}`.slice(0, 1500));

async function startServer(port, env) {
  rmSync(`/tmp/inventory-${port}`, { recursive: true, force: true });

  const child = Bun.spawn(["bun", "run", "--silent", "start"], {
    env: { ...process.env, PORT: String(port), DATABASE_PATH: `/tmp/inventory-${port}/inventory.db`, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const base = `http://127.0.0.1:${port}`;

  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`${base}/items`);

      return { base, child };
    } catch {
      await Bun.sleep(250);
    }
  }

  child.kill();
  note("server did not start", await new Response(child.stderr).text());

  return undefined;
}

async function call(base, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }

  return { status: response.status, type: response.headers.get("content-type") ?? "", json, text };
}

const isProblem = (result) => result.type.startsWith("application/problem+json");

const ok = (result) => result.status >= 200 && result.status < 300;

let sku = 0;

async function newItem(base, onHand) {
  const created = await call(base, "POST", "/items", { sku: `CHECK-${++sku}`, name: `Check item ${sku}`, onHand });

  return created.json;
}

const available = async (base, id) => (await call(base, "GET", `/items/${id}`)).json;

async function core(base) {
  const item = await newItem(base, 5);
  const reserved = await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "cart-a", quantity: 3 });
  const body = reserved.json ?? {};

  const reserve =
    reserved.status === 201 &&
    Number.isFinite(body.id) &&
    body.itemId === item.id &&
    body.cartId === "cart-a" &&
    body.quantity === 3 &&
    Number.isFinite(Date.parse(body.expiresAt));

  const afterReserve = await available(base, item.id);
  const listed = (await call(base, "GET", "/items")).json?.find((entry) => entry.id === item.id);
  const shows = afterReserve?.onHand === 5 && afterReserve?.available === 2 && listed?.available === 2;
  const tooMany = await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "cart-b", quantity: 3 });
  const insufficient = tooMany.status === 409 && isProblem(tooMany);
  const released = await call(base, "DELETE", `/reservations/${body.id}`);
  const release = ok(released) && (await available(base, item.id))?.available === 5;
  const second = (await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "cart-c", quantity: 2 })).json ?? {};
  const confirmed = await call(base, "POST", `/reservations/${second.id}/confirm`);
  const afterConfirm = await available(base, item.id);
  const again = await call(base, "POST", `/reservations/${second.id}/confirm`);
  const confirmReleased = await call(base, "POST", `/reservations/${body.id}/confirm`);
  const confirm = ok(confirmed) && afterConfirm?.onHand === 3 && afterConfirm?.available === 3 && again.status === 409 && confirmReleased.status === 409;

  const invalid = [];

  for (const payload of [{ cartId: "x", quantity: 0 }, { cartId: "x", quantity: -1 }, { cartId: "x", quantity: 1.5 }, { cartId: "x", quantity: "1" }, { quantity: 1 }])
    invalid.push((await call(base, "POST", `/items/${item.id}/reservations`, payload)).status);

  const unknown = await call(base, "POST", "/items/999999/reservations", { cartId: "x", quantity: 1 });
  const validation = invalid.every((status) => status === 400) && unknown.status === 404 && isProblem(unknown);

  note("core", { reserved: reserved.status, body, afterReserve, listed, tooMany: tooMany.status, released: released.status, confirmed: confirmed.status, afterConfirm, again: again.status, confirmReleased: confirmReleased.status, invalid, unknown: unknown.status });

  return { reserve, shows, insufficient, release, confirm, validation, expiresAt: body.expiresAt };
}

async function race(base) {
  const item = await newItem(base, 5);
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) => call(base, "POST", `/items/${item.id}/reservations`, { cartId: `race-${index}`, quantity: 1 })));
  const statuses = results.map((result) => result.status);
  const after = await available(base, item.id);

  note("race", { statuses, after });

  return statuses.filter((status) => status === 201).length === 5 && statuses.filter((status) => status === 409).length === 15 && after?.available === 0;
}

async function lapse(base) {
  const item = await newItem(base, 4);
  const before = Date.now();
  const held = (await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "lapse", quantity: 4 })).json ?? {};
  const ahead = Date.parse(held.expiresAt) - before;
  const during = await available(base, item.id);

  await Bun.sleep(TTL_SECONDS * 1000 + 750);

  const after = await available(base, item.id);
  const confirmLate = await call(base, "POST", `/reservations/${held.id}/confirm`);
  const reserveAgain = await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "lapse-2", quantity: 4 });

  note("lapse", { ahead, during, after, confirmLate: confirmLate.status, reserveAgain: reserveAgain.status });

  return {
    configuredTtl: ahead > (TTL_SECONDS - 1) * 1000 && ahead < (TTL_SECONDS + 3) * 1000,
    lapses: during?.available === 0 && after?.available === 4 && confirmLate.status === 409 && reserveAgain.status === 201,
  };
}

async function defaultTtl(base) {
  const item = await newItem(base, 1);
  const before = Date.now();
  const held = (await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "default", quantity: 1 })).json ?? {};
  const ahead = Date.parse(held.expiresAt) - before;

  note("default ttl", { ahead });

  return Math.abs(ahead - 15 * 60_000) < 10_000;
}

async function report(base, port) {
  const item = await newItem(base, 7);

  await call(base, "POST", `/items/${item.id}/reservations`, { cartId: "report", quantity: 2 });

  const run = Bun.spawnSync(["bun", "run", "--silent", "report"], {
    env: { ...process.env, DATABASE_PATH: `/tmp/inventory-${port}/inventory.db` },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 20_000,
  });

  const output = run.stdout.toString();
  const line = output.split("\n").find((row) => row.includes(item.sku)) ?? "";
  const numbers = line.match(/\b\d+\b/g) ?? [];

  note("report", output.slice(0, 1000) + run.stderr.toString().slice(0, 500));

  return run.exitCode === 0 && /available/i.test(output) && numbers.includes("7") && numbers.includes("5");
}

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|js|mjs)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

function conventions() {
  const migrations = existsSync("migrations") ? readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort() : [];
  const original = existsSync("migrations/001_items.sql") ? readFileSync("migrations/001_items.sql", "utf8") : "";
  const sources = sourceFiles("src").map((path) => ({ path, text: readFileSync(path, "utf8") }));
  const tests = sourceFiles("test").map((path) => readFileSync(path, "utf8"));
  const docs = existsSync("docs/api.md") ? readFileSync("docs/api.md", "utf8") : "";

  const facts = {
    migrationUnchanged: original === ORIGINAL_MIGRATION,
    migrationAdded: migrations.some((name) => name !== "001_items.sql" && /^\d{3}_/.test(name)),
    directClock: sources.filter(({ path, text }) => !path.endsWith("src/clock.ts") && /Date\.now\(\)|new Date\(\s*\)/.test(text)).map(({ path }) => path),
    rawBodies: sources.filter(({ path, text }) => !path.endsWith("src/http/parse.ts") && /\.json\(\s*\)/.test(text.replace(/Response\.json/g, ""))).map(({ path }) => path),
    sqlInRoutes: sources.filter(({ path, text }) => path.endsWith("routes.ts") && /\.(query|prepare|run|exec)\(/.test(text)).map(({ path }) => path),
    tested: tests.some((text) => /reservations/.test(text) && /confirm/.test(text)),
    documented: /\/items\/:id\/reservations/.test(docs) && /\/reservations\/:id\/confirm/.test(docs) && /DELETE \/reservations\/:id/.test(docs),
  };

  note("conventions", facts);

  return facts;
}

const suite = Bun.spawnSync(["bun", "test"], { stdout: "pipe", stderr: "pipe", timeout: 120_000 });

note("bun test", suite.stderr.toString().slice(-1500));

const results = { started: false, suite: suite.exitCode === 0, conventions: conventions() };

const configured = await startServer(41731, { RESERVATION_TTL_SECONDS: String(TTL_SECONDS) });

if (configured) {
  results.started = true;
  results.core = await core(configured.base);
  results.race = await race(configured.base);
  Object.assign(results, await lapse(configured.base));
  results.report = await report(configured.base, 41731);
  configured.child.kill();
}

const plain = await startServer(41732, {});

if (plain) {
  results.defaultTtl = await defaultTtl(plain.base);
  plain.child.kill();
}

console.log(log.join("\n"));

console.log(JSON.stringify(results));
