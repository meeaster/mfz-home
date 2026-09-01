import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createBindingStore,
  discoverLedgers,
  resolveEffectiveBinding,
  resolveOptions,
  type Ledger,
} from "../src/core.js";

describe("Work Ledger core", () => {
  it("validates and expands the configured root", () => {
    expect(resolveOptions({ root: "~/ledgers" }, "/home/test")).toEqual({
      root: "/home/test/ledgers",
    });
    expect(() => resolveOptions({ root: "relative" })).toThrow("absolute path");
    expect(() => resolveOptions({})).toThrow();
  });

  it("discovers only immediate visible directories in lexical order", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "work-ledger-discovery-"));
    await Promise.all([
      mkdir(path.join(root, "zeta", "nested"), { recursive: true }),
      mkdir(path.join(root, "alpha")),
      mkdir(path.join(root, ".hidden")),
      writeFile(path.join(root, "README.md"), "not a ledger\n"),
    ]);

    expect(await discoverLedgers(root)).toEqual([
      { name: "alpha", path: path.join(root, "alpha") },
      { name: "zeta", path: path.join(root, "zeta") },
    ]);
    await expect(discoverLedgers(path.join(root, "missing"))).rejects.toThrow();
    await expect(discoverLedgers(path.join(root, "README.md"))).rejects.toThrow("not a directory");
  });

  it("persists independent bindings atomically and clears them", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "work-ledger-bindings-"));
    const store = createBindingStore(root);

    await Promise.all([store.write("ses_one", "shared"), store.write("ses_two", "shared")]);
    expect(await store.read("ses_one")).toBe("shared");
    expect(await store.read("ses_two")).toBe("shared");
    expect(JSON.parse(await readFile(path.join(root, "ses_one.json"), "utf8"))).toEqual({
      ledger: "shared",
    });
    await store.clear("ses_one");
    expect(await store.read("ses_one")).toBeUndefined();
    await expect(store.write("../escape", "shared")).rejects.toThrow();
    await expect(store.write("ses_three", "../escape")).rejects.toThrow();
  });

  it("rejects malformed binding files at the storage boundary", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "work-ledger-malformed-"));
    await writeFile(path.join(root, "ses_bad.json"), '{"ledger":"../escape"}\n');
    await expect(createBindingStore(root).read("ses_bad")).rejects.toThrow();
  });

  it("resolves explicit, recursive inherited, overridden, and live ancestor bindings", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "work-ledger-resolver-"));
    const store = createBindingStore(root);
    const ledgers: Ledger[] = ["alpha", "beta"].map((name) => ({ name, path: `/ledgers/${name}` }));
    const sessions = new Map([
      ["parent", {}],
      ["child", { parentID: "parent" }],
      ["nested", { parentID: "child" }],
    ]);
    const resolve = (sessionID: string) =>
      resolveEffectiveBinding({
        sessionID,
        ledgers,
        bindings: store,
        getSession: async (id) => sessions.get(id),
      });

    await store.write("parent", "alpha");
    expect(await resolve("parent")).toMatchObject({ status: "bound", source: "explicit" });
    expect(await resolve("nested")).toMatchObject({
      status: "bound",
      source: "inherited",
      sessionID: "parent",
      ledger: { name: "alpha" },
    });
    await store.write("child", "beta");
    expect(await resolve("nested")).toMatchObject({
      status: "bound",
      source: "inherited",
      sessionID: "child",
      ledger: { name: "beta" },
    });
    await store.clear("child");
    await store.write("parent", "beta");
    expect(await resolve("nested")).toMatchObject({ ledger: { name: "beta" } });
  });

  it("stops on stale bindings, missing parents, and cycles", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "work-ledger-resolver-edge-"));
    const store = createBindingStore(root);
    await store.write("grandparent", "alpha");
    await store.write("child", "missing");
    const sessions = new Map([
      ["child", { parentID: "grandparent" }],
      ["cycle-a", { parentID: "cycle-b" }],
      ["cycle-b", { parentID: "cycle-a" }],
    ]);
    const resolve = (sessionID: string) =>
      resolveEffectiveBinding({
        sessionID,
        ledgers: [{ name: "alpha", path: "/ledgers/alpha" }],
        bindings: store,
        getSession: async (id) => sessions.get(id),
      });

    expect(await resolve("child")).toEqual({
      status: "stale",
      ledger: "missing",
      sessionID: "child",
    });
    expect(await resolve("unknown")).toEqual({ status: "unbound" });
    expect(await resolve("cycle-a")).toEqual({ status: "unbound" });
  });
});
