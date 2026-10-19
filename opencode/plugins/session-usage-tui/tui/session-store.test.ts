import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createSessionStore } from "./session-store.js";

const session = {
  sessionID: "ses_one",
  fingerprint: "1:2:3:4:5:6:7",
  messages: [{ id: "m1", type: "assistant", time: { created: 1, completed: 2 }, tokens: { input: 3, cache: { read: 4 } } }]
};

describe("session store", () => {
  it("reads back what it wrote", async () => {
    const store = createSessionStore(await mkdtemp(join(tmpdir(), "session-store-test-")));

    await store.write(session);

    expect(await store.read("ses_one")).toEqual(session);
  });

  it("treats a truncated or foreign file as missing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "session-store-test-"));
    const store = createSessionStore(directory);

    await writeFile(join(directory, "ses_one.json"), '{"cacheVersion":1,"sessionID":"ses_one","fingerprint":"1","messages":[{"id"');
    await writeFile(join(directory, "ses_two.json"), JSON.stringify({ ...session, cacheVersion: 1 }));

    expect(await store.read("ses_one")).toBeUndefined();
    expect(await store.read("ses_two")).toBeUndefined();
  });

  it("never touches a path outside its folder", async () => {
    const directory = await mkdtemp(join(tmpdir(), "session-store-test-"));
    const store = createSessionStore(join(directory, "cache"));

    await store.write({ ...session, sessionID: "../escape" });

    expect(await readdir(directory)).toEqual([]);
    expect(await store.read("../escape")).toBeUndefined();
  });
});
