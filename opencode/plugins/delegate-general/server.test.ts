import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import plugin, {
  DELEGATE_GENERAL_CONFIG_RELATIVE_PATH,
  DELEGATE_GENERAL_GLOBAL_CONFIG_RELATIVE_PATH,
  buildChildSessionPermissions,
  buildDelegatedPromptBody,
  buildToolOverrides,
  canAgentUseTask,
  createDelegateGeneralTool,
  extractDelegatedText,
  formatDelegatedResult,
  loadDelegateGeneralConfigWithSource,
  modelCatalogDescription,
  normalizeRequiredStringArg,
  parseDelegateGeneralConfig,
  parseModel,
  resolveCallableAgent,
  resolveGlobalDelegateGeneralConfigPath,
  resolveProjectDelegateGeneralConfigPath,
  validateModelSelection
} from "./server.js";

const models = [
  {
    id: "openai/gpt-5.6-luna",
    variants: ["low", "medium", "high", "xhigh", "max"],
    description: "cost-efficient model"
  },
  {
    id: "openai/gpt-5.6-terra",
    variants: ["low", "medium", "high", "xhigh"],
    description: "balanced model"
  },
  {
    id: "openai/gpt-5.6-sol",
    variants: ["low", "medium", "high", "xhigh"],
    description: "frontier model"
  }
];

describe("agent selection", () => {
  it("only accepts callable agents", () => {
    expect(resolveCallableAgent([{ name: "general", mode: "subagent" }], "general").ok).toBe(true);

    const result = resolveCallableAgent([{ name: "general", mode: "primary" }], "general");
    expect(result).toMatchObject({ ok: false });
  });
});

describe("model catalog", () => {
  it("renders direct IDs and supported reasoning levels", () => {
    expect(modelCatalogDescription(models)).toBe(
      "openai/gpt-5.6-luna (low, medium, high, xhigh, max): cost-efficient model; openai/gpt-5.6-terra (low, medium, high, xhigh): balanced model; openai/gpt-5.6-sol (low, medium, high, xhigh): frontier model"
    );
  });

  it("requires an exact allowlisted model and reasoning level", () => {
    expect(validateModelSelection(models, "openai/gpt-5.6-luna", "max").ok).toBe(true);
    expect(validateModelSelection(models, "openai/gpt-5.6-sol", "high").ok).toBe(true);
    expect(validateModelSelection(models, "opencode-go/glm-5.2", "high")).toMatchObject({ ok: false });
    expect(validateModelSelection(models, "openai/gpt-5.6-luna", "none")).toMatchObject({ ok: false });
    expect(validateModelSelection(models, "openai/gpt-5.6-terra", "none")).toMatchObject({ ok: false });
    expect(validateModelSelection(models, "openai/gpt-5.6-sol", "none")).toMatchObject({ ok: false });
    expect(validateModelSelection(models, "openai/gpt-5.6-terra", "max")).toMatchObject({ ok: false });
    expect(validateModelSelection(models, "openai/gpt-5.6-sol", "max")).toMatchObject({ ok: false });
  });

  it("preserves optional model descriptions from configuration", () => {
    expect(parseDelegateGeneralConfig({ models })).toEqual({ models });
    expect(parseDelegateGeneralConfig({ models: [{ id: "openai/gpt-5.6-terra", variants: ["low"] }] })).toEqual({
      models: [{ id: "openai/gpt-5.6-terra", variants: ["low"] }]
    });
  });
});

describe("delegation helpers", () => {
  it("keeps the existing child permission policy", () => {
    expect(
      buildChildSessionPermissions({ allowTask: false, primaryTools: ["question", "delegate_general"] })
    ).toEqual([
      { permission: "todowrite", pattern: "*", action: "deny" },
      { permission: "todoread", pattern: "*", action: "deny" },
      { permission: "task", pattern: "*", action: "deny" },
      { permission: "question", pattern: "*", action: "allow" },
      { permission: "delegate_general", pattern: "*", action: "allow" },
      { permission: "delegate_general", pattern: "*", action: "deny" }
    ]);
    expect(buildToolOverrides({ allowTask: false, primaryTools: ["question", "delegate_general"] })).toEqual({
      todowrite: false,
      todoread: false,
      task: false,
      delegate_general: false,
      question: false
    });
  });

  it("uses general with the selected direct model and reasoning level", () => {
    expect(
      buildDelegatedPromptBody({
        model: "openai/gpt-5.6-sol",
        variant: "high",
        prompt: "Implement the UI"
      })
    ).toEqual({
      ok: true,
      value: {
        agent: "general",
        model: { providerID: "openai", modelID: "gpt-5.6-sol" },
        variant: "high",
        parts: [{ type: "text", text: "Implement the UI" }]
      }
    });
  });

  it("formats the selected model and reasoning level in the result", () => {
    expect(
      formatDelegatedResult({
        sessionId: "ses_123",
        text: "complete",
        model: "openai/gpt-5.6-sol",
        variant: "high"
      })
    ).toContain("reasoning_level: high");
  });
});

describe("validation helpers", () => {
  it("normalizes required strings and provider model IDs", () => {
    expect(normalizeRequiredStringArg(" openai/gpt-5.6-sol ", "model")).toEqual({
      ok: true,
      value: "openai/gpt-5.6-sol"
    });
    expect(normalizeRequiredStringArg(" ", "model")).toMatchObject({ ok: false });
    expect(parseModel("openai/gpt-5.6-sol")).toEqual({
      providerID: "openai",
      modelID: "gpt-5.6-sol"
    });
  });

  it("keeps child task capability detection", () => {
    expect(
      canAgentUseTask({
        name: "general",
        permission: [{ permission: "task", pattern: "*", action: "allow" }]
      })
    ).toBe(true);
  });
});

describe("configuration", () => {
  it("parses only direct models with non-empty reasoning levels", () => {
    expect(
      parseDelegateGeneralConfig({
        models: [
          { id: "openai/gpt-5.6-sol", variants: ["high"] },
          { id: "openai/gpt-5.6-terra", variants: [] }
        ]
      })
    ).toEqual({ models: [{ id: "openai/gpt-5.6-sol", variants: ["high"] }] });
  });

  it("loads the global configuration before a project configuration", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "delegate-general-project-"));
    const root = path.join(directory, "xdg");
    const globalFile = path.join(root, "opencode", DELEGATE_GENERAL_GLOBAL_CONFIG_RELATIVE_PATH);
    await mkdir(path.dirname(globalFile), { recursive: true });
    await mkdir(path.join(directory, ".opencode"), { recursive: true });
    await writeFile(globalFile, JSON.stringify({ models }));
    await writeFile(
      path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH),
      JSON.stringify({ models: [{ id: "openai/gpt-5.6-terra", variants: ["low"] }] })
    );

    const result = await loadDelegateGeneralConfigWithSource(directory, {
      ...process.env,
      XDG_CONFIG_HOME: root
    });
    expect(result.path).toBe(globalFile);
    expect(result.config.models).toEqual(models);
  });

  it("resolves configuration paths", () => {
    const env = { ...process.env, XDG_CONFIG_HOME: "/tmp/xdg" };
    expect(resolveGlobalDelegateGeneralConfigPath(env)).toBe("/tmp/xdg/opencode/delegate-general.json");
    expect(resolveProjectDelegateGeneralConfigPath("/tmp/project")).toBe(
      "/tmp/project/.opencode/delegate-general.json"
    );
  });
});

describe("response extraction", () => {
  it("uses the final text part", () => {
    expect(
      extractDelegatedText({
        parts: [
          { type: "reasoning", text: "hidden" },
          { type: "text", text: "final" }
        ]
      })
    ).toBe("final");
  });
});

describe("delegate-general plugin", () => {
  it("positions delegation as model-controlled general work", async () => {
    const definition = await createDelegateGeneralTool({ client: {}, directory: "/tmp" });

    expect(definition.description).toBe(
      'Delegate general-purpose complex questions and multi-step work to the general subagent using an explicitly selected allowlisted model and reasoning level. Use this instead of the built-in task tool with subagent_type "general". Prefer a better-fitting specialized subagent when one is available.'
    );
  });

  it("registers the delegate_general tool", async () => {
    const hooks = await plugin.server({ client: {}, directory: "/tmp" } as never);

    expect(plugin.id).toBe("delegate-general");
    expect(hooks.tool?.delegate_general).toBeDefined();
    expect(hooks.tool?.agent_task).toBeUndefined();
  });
});
