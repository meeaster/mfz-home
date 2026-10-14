import { describe, expect, it } from "vitest";

import { createMessageCache } from "./message-cache.js";
import type { SessionMessage } from "./messages.js";

type ListInput = { sessionID: string; limit: number; order?: "asc" | "desc"; cursor?: string };

/** An in-memory message store that pages the way OpenCode's message list endpoint does. */
function fakeServer(initial: Record<string, SessionMessage[]>) {
  const store = new Map(Object.entries(initial));
  const calls: ListInput[] = [];

  const client = {
    message: {
      async list(input: ListInput) {
        calls.push(input);
        const all = store.get(input.sessionID) ?? [];
        const [cursorOrder, cursorID] = input.cursor?.split(":") ?? [];
        const cursor = cursorID === undefined ? undefined : { id: cursorID, order: cursorOrder === "asc" ? "asc" : "desc" };
        const order = cursor?.order ?? input.order ?? "desc";
        const ordered = order === "asc" ? all : all.toReversed();
        const start = cursor ? ordered.findIndex((message) => message.id === cursor.id) + 1 : 0;
        const data = cursor && start === 0 ? [] : ordered.slice(start, start + input.limit);
        const last = data.at(-1);

        return { data, cursor: { next: last ? `${order}:${last.id}` : undefined } };
      }
    }
  };

  // SAFETY: The fake implements the subset of the generated client the cache uses.
  return { store, calls, fake: client, client: client as never };
}

const done = (id: string, input = 1): SessionMessage => ({
  id,
  type: "assistant",
  model: { providerID: "openai", id: "priced" },
  time: { created: 1, completed: 2 },
  tokens: { input, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
});

const user = (id: string): SessionMessage => ({ id, type: "user", time: { created: 1 } });

const running = (id: string): SessionMessage => ({ id, type: "assistant", model: { providerID: "openai", id: "priced" }, time: { created: 1 } });

const ids = (groups: Array<{ messages: SessionMessage[] }>) => groups.map(({ messages }) => messages.map((message) => message.id));

describe("message cache", () => {
  it("does not read a settled session again until it changes", async () => {
    const server = fakeServer({ root: [user("u1"), done("a1")], child: [user("c1"), done("c2")] });
    const cache = createMessageCache(server.client);

    await cache.load(["root", "child"]);
    server.calls.length = 0;

    expect(ids(await cache.load(["root", "child"]))).toEqual([["u1", "a1"], ["c1", "c2"]]);
    expect(server.calls).toEqual([]);
  });

  it("reads a changed session from its latest assistant message, newest first", async () => {
    const history = Array.from({ length: 50 }, (_, index) => (index % 2 === 0 ? user(`m${index}`) : done(`m${index}`)));
    const server = fakeServer({ root: history });
    const cache = createMessageCache(server.client);

    await cache.load(["root"]);
    const retried = [...history.slice(0, -1), done("m49", 7), user("m50"), done("m51")];

    server.store.set("root", retried);
    server.calls.length = 0;
    cache.invalidate("root");

    const [root] = await cache.load(["root"]);

    expect(root?.messages).toEqual(retried);
    expect(server.calls).toEqual([{ sessionID: "root", limit: 20, order: "desc" }]);
  });

  it("takes the whole session when a revert removed the messages it kept", async () => {
    const server = fakeServer({ root: [user("u1"), done("a1"), user("u2"), done("a2")] });
    const cache = createMessageCache(server.client);

    await cache.load(["root"]);
    server.store.set("root", [user("u1"), done("a3")]);
    cache.invalidate("root");

    expect(ids(await cache.load(["root"]))).toEqual([["u1", "a3"]]);
  });

  it("does not read again from a step an interruption left unfinished", async () => {
    const history = [user("u1"), running("orphan"), user("u2"), done("a1")];
    const server = fakeServer({ root: history });
    const cache = createMessageCache(server.client);

    await cache.load(["root"]);
    server.store.set("root", [...history, user("u3"), done("a2")]);
    server.calls.length = 0;
    cache.invalidate("root");

    expect(ids(await cache.load(["root"]))).toEqual([["u1", "orphan", "u2", "a1", "u3", "a2"]]);
    expect(server.calls).toEqual([{ sessionID: "root", limit: 20, order: "desc" }]);

    server.calls.length = 0;
    await cache.load(["root"]);
    expect(server.calls).toEqual([]);
  });

  it("reads a changed session again after a failed load", async () => {
    const server = fakeServer({ root: [user("u1"), done("a1")] });
    const cache = createMessageCache(server.client);
    const list = server.fake.message.list;

    await cache.load(["root"]);
    server.store.set("root", [user("u1"), done("a1"), user("u2"), done("a2")]);
    cache.invalidate("root");
    server.fake.message.list = () => Promise.reject(new Error("offline"));

    await expect(cache.load(["root"])).rejects.toThrow("offline");

    server.fake.message.list = list;

    expect(ids(await cache.load(["root"]))).toEqual([["u1", "a1", "u2", "a2"]]);
  });
});
