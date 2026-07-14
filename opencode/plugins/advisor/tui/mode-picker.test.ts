import { describe, expect, it, vi } from "vitest";

import {
  ADVISOR_MODE_DEFAULT_COMMAND,
  advisorModePickerLayer,
  advisorModePickerOptions,
  createAdvisorModePickerActions,
  createAdvisorModePickerBindingController,
} from "./mode-picker.js";
import type { AdvisorMode } from "../state.js";

describe("advisor mode picker", () => {
  it("marks the current and default modes independently", () => {
    expect(advisorModePickerOptions("auto", "on").map((option) => option.title)).toEqual([
      "manual",
      "auto [current]",
      "on [default]",
    ]);
  });

  it("marks both scopes when they match", () => {
    expect(advisorModePickerOptions("manual", "manual")[0]?.title).toBe("manual [current, default]");
  });

  it("describes the three policy choices", () => {
    const options = advisorModePickerOptions("on", "on");
    expect(options.map((option) => option.value)).toEqual(["manual", "auto", "on"]);
    expect(options[0]?.description).toContain("/consult-advisor");
    expect(options[1]?.description).toContain("workload-aware");
    expect(options[2]?.description).toContain("standard");
  });

  it("defines the default binding for a picker-scoped layer", () => {
    const run = () => undefined;
    const layer = advisorModePickerLayer(run);
    expect(layer.commands[0]).toMatchObject({ name: ADVISOR_MODE_DEFAULT_COMMAND, hidden: true });
    expect(layer.bindings).toEqual([
      { key: "shift+d", cmd: ADVISOR_MODE_DEFAULT_COMMAND, desc: "Set global advisor default" },
    ]);
  });

  it("keeps the picker open for default changes, closes on Enter, and cancels without writes", async () => {
    const savedSessions: string[] = [];
    const savedDefaults: string[] = [];
    let closed = 0;
    let current: AdvisorMode = "auto";
    let defaultMode: AdvisorMode = "on";
    const actions = createAdvisorModePickerActions({
      initial: { mode: current, defaultMode, explicit: false },
      saveSession: async (mode) => {
        savedSessions.push(mode);
      },
      saveDefault: async (mode) => {
        savedDefaults.push(mode);
      },
      onCurrentChange: (mode) => (current = mode),
      onDefaultChange: (mode) => (defaultMode = mode),
      onChanged: () => undefined,
      onClose: () => (closed += 1),
    });

    actions.move("manual");
    await actions.setDefault();
    expect(savedDefaults).toEqual(["manual"]);
    expect(savedSessions).toEqual([]);
    expect(defaultMode).toBe("manual");
    expect(current).toBe("manual");
    expect(closed).toBe(0);

    await actions.select("on");
    expect(savedSessions).toEqual(["on"]);
    expect(current).toBe("on");
    expect(closed).toBe(1);

    actions.cancel();
    expect(savedDefaults).toEqual(["manual"]);
    expect(savedSessions).toEqual(["on"]);
    expect(closed).toBe(2);
  });

  it("keeps session state and picker open when persistence fails", async () => {
    let changed = 0;
    let closed = 0;
    const actions = createAdvisorModePickerActions({
      initial: { mode: "auto", defaultMode: "on", explicit: false },
      saveSession: async () => {
        throw new Error("disk full");
      },
      saveDefault: async () => undefined,
      onCurrentChange: () => (changed += 1),
      onDefaultChange: () => undefined,
      onChanged: () => (changed += 1),
      onClose: () => (closed += 1),
    });

    await expect(actions.select("manual")).rejects.toThrow("disk full");
    expect(changed).toBe(0);
    expect(closed).toBe(0);
  });

  it("does not move the default marker when default persistence fails", async () => {
    let changed = 0;
    const actions = createAdvisorModePickerActions({
      initial: { mode: "auto", defaultMode: "on", explicit: false },
      saveSession: async () => undefined,
      saveDefault: async () => {
        throw new Error("read only");
      },
      onCurrentChange: () => (changed += 1),
      onDefaultChange: () => (changed += 1),
      onChanged: () => (changed += 1),
      onClose: () => undefined,
    });

    actions.move("manual");
    await expect(actions.setDefault()).rejects.toThrow("read only");
    expect(changed).toBe(0);
  });

  it("registers and unregisters the D binding only for the picker lifetime", () => {
    const unregister = vi.fn();
    const register = vi.fn((layer: ReturnType<typeof advisorModePickerLayer>) => {
      expect(layer.bindings[0]?.key).toBe("shift+d");
      return unregister;
    });
    const controller = createAdvisorModePickerBindingController(register, () => undefined);

    controller.open();
    controller.close();
    controller.close();
    expect(register).toHaveBeenCalledOnce();
    expect(unregister).toHaveBeenCalledOnce();
  });
});
