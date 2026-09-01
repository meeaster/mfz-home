import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Context } from "@opencode-ai/plugin/tui/plugin";
import { describe, expect, it, vi } from "vitest";

import { createBindingStore } from "../src/core.js";
import { selectLedger } from "../src/tui/command.js";

function context(input: {
  sessionID?: string;
  selected?: string;
  parents?: Record<string, string | undefined>;
}) {
  const select = vi.fn(async () => input.selected);
  const alert = vi.fn(async () => undefined);
  const show = vi.fn();
  const contextFixture = {
    ui: {
      router: {
        current: () =>
          input.sessionID ? { type: "session", sessionID: input.sessionID } : { type: "home" },
      },
      dialog: { select, alert },
      toast: { show },
    },
    data: {
      session: {
        sync: vi.fn(async () => undefined),
        get: (sessionID: string) => {
          const parentID = input.parents?.[sessionID];
          return parentID === undefined ? {} : { parentID };
        },
      },
    },
  };
  // SAFETY: selectLedger only reads the modeled ui and data members.
  const value = Object.assign(Object.create(null), contextFixture) as Context;
  return {
    value,
    select,
    alert,
    show,
  };
}

describe("Work Ledger TUI command", () => {
  it("does nothing outside a session route", async () => {
    const ui = context({ selected: "alpha" });
    await selectLedger(ui.value, "/missing", createBindingStore("/tmp/unused-work-ledger"));
    expect(ui.select).not.toHaveBeenCalled();
  });

  it("shows ordered choices, current inherited state, and writes a selection", async () => {
    const ledgerRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-picker-ledgers-"));
    const stateRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-picker-state-"));
    await Promise.all([
      mkdir(path.join(ledgerRoot, "zeta")),
      mkdir(path.join(ledgerRoot, "alpha")),
    ]);
    const bindings = createBindingStore(stateRoot);
    await bindings.write("ses_parent", "alpha");
    const ui = context({
      sessionID: "ses_child",
      selected: "zeta",
      parents: { ses_child: "ses_parent" },
    });

    await selectLedger(ui.value, ledgerRoot, bindings);

    expect(ui.select).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Work Ledger: Select",
        placeholder: "Search ledgers",
        current: "alpha",
        options: [
          expect.objectContaining({ title: "No active ledger" }),
          expect.objectContaining({
            title: "alpha",
            description: "Active, inherited from ses_parent",
          }),
          expect.objectContaining({ title: "zeta" }),
        ],
      }),
    );
    expect(await bindings.read("ses_child")).toBe("zeta");
    expect(ui.show).toHaveBeenCalledWith({ variant: "success", message: "Active ledger: zeta" });
  });

  it("clears only the child's explicit binding and reports inherited state", async () => {
    const ledgerRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-clear-ledgers-"));
    const stateRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-clear-state-"));
    await Promise.all([
      mkdir(path.join(ledgerRoot, "alpha")),
      mkdir(path.join(ledgerRoot, "beta")),
    ]);
    const bindings = createBindingStore(stateRoot);
    await bindings.write("ses_parent", "alpha");
    await bindings.write("ses_child", "beta");
    const ui = context({
      sessionID: "ses_child",
      selected: "",
      parents: { ses_child: "ses_parent" },
    });

    await selectLedger(ui.value, ledgerRoot, bindings);

    expect(await bindings.read("ses_child")).toBeUndefined();
    expect(ui.show).toHaveBeenCalledWith({
      variant: "success",
      message: "Using inherited ledger: alpha",
    });
  });

  it("alerts for unavailable roots and stale bindings", async () => {
    const missing = context({ sessionID: "ses_one" });
    await selectLedger(
      missing.value,
      "/missing-work-ledger-root",
      createBindingStore("/tmp/unused"),
    );
    expect(missing.alert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Work Ledger unavailable" }),
    );

    const ledgerRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-stale-ledgers-"));
    const stateRoot = await mkdtemp(path.join(tmpdir(), "work-ledger-stale-state-"));
    const bindings = createBindingStore(stateRoot);
    await bindings.write("ses_one", "missing");
    const stale = context({ sessionID: "ses_one" });
    await selectLedger(stale.value, ledgerRoot, bindings);
    expect(stale.alert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Stale Work Ledger binding" }),
    );
  });
});
