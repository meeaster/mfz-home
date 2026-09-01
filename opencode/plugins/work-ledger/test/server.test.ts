import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Plugin } from "@opencode-ai/plugin";
import { describe, expect, it, vi } from "vitest";

import { createBindingStore } from "../src/core.js";
import plugin, { ledgerContext, setupWorkLedger } from "../src/server.js";

describe("Work Ledger server plugin", () => {
  it("injects only effective ledger identity, path, and source", async () => {
    const ledgerRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-server-ledgers-"));
    const stateRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-server-state-"));
    await mkdir(path.join(ledgerRoot, "active"));
    await createBindingStore(stateRoot).write("ses_parent", "active");
    let hook:
      | ((event: {
          sessionID: string;
          system: Array<{ type: "text"; text: string }>;
        }) => Promise<void>)
      | undefined;
    const contextFixture = {
      options: { root: ledgerRoot },
      session: {
        hook: vi.fn(async (_name, callback) => {
          hook = callback;
        }),
        get: vi.fn(async ({ sessionID }: { sessionID: string }) =>
          sessionID === "ses_child" ? { parentID: "ses_parent" } : {},
        ),
      },
    };

    // SAFETY: The fixture implements the options and session methods setupWorkLedger reads.
    const context = Object.assign(Object.create(null), contextFixture) as Plugin.Context;
    await setupWorkLedger(context, createBindingStore(stateRoot));
    const event = {
      sessionID: "ses_child",
      system: new Array<{ type: "text"; text: string }>(),
    };
    await hook?.(event);
    expect(event.system).toEqual([
      {
        type: "text",
        text: ledgerContext("active", path.join(ledgerRoot, "active"), "inherited"),
      },
    ]);
    expect(event.system[0]?.text).not.toContain("ledger contents");
  });

  it("fails open when configuration or resolution is unavailable", async () => {
    const hook = vi.fn();
    const contextFixture = { options: {}, session: { hook } };
    // SAFETY: Invalid options return before the plugin reads any other context fields.
    const context = Object.assign(Object.create(null), contextFixture) as Plugin.Context;
    await expect(plugin.setup(context)).resolves.toBeUndefined();
    expect(hook).not.toHaveBeenCalled();
  });
});
