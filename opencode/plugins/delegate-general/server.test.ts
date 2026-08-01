import { describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import plugin, {
  DELEGATE_GENERAL_CONFIG_RELATIVE_PATH,
  DELEGATE_GENERAL_GLOBAL_CONFIG_RELATIVE_PATH,
  MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS,
  buildChildSessionPermissions,
  buildDelegatedPromptBody,
  buildToolOverrides,
  canAgentUseTask,
  createDelegateGeneralTool,
  extractDelegatedText,
  formatDelegatedContextStatus,
  formatDelegatedResult,
  getDelegatedSessionContextStatus,
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

describe("session context status", () => {
  it("reports context-window usage, compaction headroom, and the next pricing tier", async () => {
    const status = await getDelegatedSessionContextStatus({
      tokens: {
        input: 200_000,
        output: 1_000,
        cache: { read: 50_000, write: 0 }
      },
      provider: {
        list: async () => ({
          data: {
            all: [
              {
                id: "openai",
                models: {
                  "gpt-5.6-terra": {
                    id: "gpt-5.6-terra",
                    limit: { context: 1_050_000, input: 922_000, output: 128_000 },
                    cost: { tiers: [{ tier: { type: "context", size: 272_000 } }] }
                  }
                }
              }
            ]
          }
        })
      },
      directory: "/tmp",
      model: { providerID: "openai", modelID: "gpt-5.6-terra" },
      config: {}
    });

    expect(status).toMatchObject({
      contextTokens: 250_000,
      contextWindow: 1_050_000,
      autoCompactionThreshold: 902_000,
      tokensUntilAutoCompaction: 651_000,
      nextPricingTier: 272_000
    });
    expect(status?.contextWindowPercent).toBeCloseTo(23.8095, 4);
    expect(formatDelegatedContextStatus(status)).toEqual([
      "<context_status>",
      "current_context: 250,000 / 1,050,000 tokens (23.8% of window)",
      "auto_compaction: estimated at 902,000 tokens; 651,000 tokens remaining",
      "pricing: higher context pricing starts at 272,000 tokens (22,000 tokens away)",
      "session_reuse: blocked: context meets the 250,000-token cutoff; start a new session.",
      "</context_status>"
    ]);
  });

  it("keeps the exact pricing-tier boundary non-elevated", async () => {
    const provider = {
      list: async () => ({
        data: {
          all: [
            {
              id: "openai",
              models: {
                "gpt-5.6-terra": {
                  id: "gpt-5.6-terra",
                  limit: { context: 1_050_000, input: 922_000, output: 128_000 },
                  cost: { tiers: [{ tier: { type: "context" as const, size: 250_000 } }] }
                }
              }
            }
          ]
        }
      })
    };
    const tokens = (input: number) => ({
      input,
      output: 0,
      cache: { read: 0, write: 0 }
    });

    const atBoundary = await getDelegatedSessionContextStatus({
      tokens: tokens(250_000),
      provider,
      directory: "/tmp",
      model: { providerID: "openai", modelID: "gpt-5.6-terra" },
      config: {}
    });
    const aboveBoundary = await getDelegatedSessionContextStatus({
      tokens: tokens(250_001),
      provider,
      directory: "/tmp",
      model: { providerID: "openai", modelID: "gpt-5.6-terra" },
      config: {}
    });

    expect(atBoundary).toMatchObject({
      contextTokens: 250_000,
      currentPricingTier: undefined,
      nextPricingTier: 250_000
    });
    expect(aboveBoundary).toMatchObject({
      contextTokens: 250_001,
      currentPricingTier: 250_000,
      nextPricingTier: undefined
    });
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
      'Delegate general-purpose complex questions and multi-step work to the general subagent using an explicitly selected allowlisted model and reasoning level. Give the child a self-contained task prompt; when relevant, name a work unit only as supplemental background and tell the child to load it. Use this instead of the built-in task tool with subagent_type "general". Prefer a better-fitting specialized subagent when one is available. Reuse a child only for a direct continuation with useful prior context; start fresh for unrelated work or a different subsystem.'
    );
  });

  it("registers the delegate_general tool", async () => {
    const hooks = await plugin.server({ client: {}, directory: "/tmp" } as never);

    expect(plugin.id).toBe("delegate-general");
    expect(hooks.tool?.delegate_general).toBeDefined();
    expect(hooks.tool?.agent_task).toBeUndefined();
  });

  it("returns the delegated child session metadata", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "delegate-general-result-"));
    const previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(directory, "xdg");
    await mkdir(path.join(directory, ".opencode"), { recursive: true });
    await writeFile(path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH), JSON.stringify({ models }));

    try {
      const definition = await createDelegateGeneralTool({
        directory,
        client: {
          app: {
            agents: async () => ({ data: [{ name: "general", mode: "subagent" }] })
          },
          config: {
            get: async () => ({ data: {} })
          },
          session: {
            create: async () => ({ data: { id: "ses_child" } }),
            prompt: async () => ({ data: { parts: [{ type: "text", text: "complete" }] } })
          }
        }
      });

      await expect(
        definition.execute(
          {
            description: "Delegate work",
            prompt: "Complete the work.",
            model: "openai/gpt-5.6-terra",
            variant: "medium"
          },
          {
            sessionID: "ses_parent",
            directory,
            ask: async () => {},
            metadata: () => {}
          } as never
        )
      ).resolves.toEqual({
        title: "Delegate work",
        output: formatDelegatedResult({
          sessionId: "ses_child",
          text: "complete",
          model: "openai/gpt-5.6-terra",
          variant: "medium"
        }),
        metadata: {
          sessionId: "ses_child",
          agent: "general",
          model: "openai/gpt-5.6-terra",
          variant: "medium"
        }
      });
    } finally {
      if (previousXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
      }
    }
  });

  it("blocks a resume when cache.write reaches the delegated-session context cutoff", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "delegate-general-resume-limit-"));
    const previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(directory, "xdg");
    await mkdir(path.join(directory, ".opencode"), { recursive: true });
    await writeFile(path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH), JSON.stringify({ models }));

    const ask = vi.fn();
    const prompt = vi.fn();

    try {
      const definition = await createDelegateGeneralTool({
        directory,
        client: {
          app: {
            agents: async () => ({ data: [{ name: "general", mode: "subagent" }] })
          },
          config: {
            get: async () => ({ data: {} })
          },
          provider: {
            list: async () => ({
              data: {
                all: [
                  {
                    id: "openai",
                    models: {
                      "gpt-5.6-terra": {
                        id: "gpt-5.6-terra",
                        limit: { context: 1_050_000, input: 922_000, output: 128_000 }
                      }
                    }
                  }
                ]
              }
            })
          },
          session: {
            get: async () => ({ data: { id: "ses_existing" } }),
            messages: async () => ({
              data: [
                {
                  info: {
                    role: "assistant",
                    tokens: {
                      input: MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS - 1,
                      output: 0,
                      cache: { read: 0, write: 1 }
                    }
                  }
                }
              ]
            }),
            prompt
          }
        }
      });

      await expect(
        definition.execute(
          {
            description: "Continue work",
            prompt: "Continue the work.",
            model: "openai/gpt-5.6-terra",
            variant: "medium",
            task_id: "ses_existing"
          },
          {
            sessionID: "ses_parent",
            directory,
            ask,
            metadata: () => {}
          } as never
        )
      ).resolves.toContain("Cannot resume delegated session \"ses_existing\"");
      expect(ask).not.toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
    } finally {
      if (previousXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
      }
    }
  });

  it("fails closed when the existing assistant has no token usage", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "delegate-general-missing-tokens-"));
    const previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(directory, "xdg");
    await mkdir(path.join(directory, ".opencode"), { recursive: true });
    await writeFile(path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH), JSON.stringify({ models }));

    const ask = vi.fn();
    const prompt = vi.fn();

    try {
      const definition = await createDelegateGeneralTool({
        directory,
        client: {
          app: {
            agents: async () => ({ data: [{ name: "general", mode: "subagent" }] })
          },
          config: {
            get: async () => ({ data: {} })
          },
          session: {
            get: async () => ({ data: { id: "ses_existing" } }),
            messages: async () => ({ data: [{ info: { role: "assistant" } }] }),
            prompt
          }
        }
      });

      await expect(
        definition.execute(
          {
            description: "Continue work",
            prompt: "Continue the work.",
            model: "openai/gpt-5.6-terra",
            variant: "medium",
            task_id: "ses_existing"
          },
          {
            sessionID: "ses_parent",
            directory,
            ask,
            metadata: () => {}
          } as never
        )
      ).resolves.toContain("Cannot safely resume delegated session \"ses_existing\"");
      expect(ask).not.toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
    } finally {
      if (previousXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
      }
    }
  });

  it("allows a below-cutoff resume when provider metadata is unavailable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "delegate-general-missing-provider-"));
    const previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(directory, "xdg");
    await mkdir(path.join(directory, ".opencode"), { recursive: true });
    await writeFile(path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH), JSON.stringify({ models }));

    const ask = vi.fn();
    const prompt = vi.fn().mockResolvedValue({
      data: {
        info: {
          role: "assistant",
          tokens: { input: 100, output: 10, cache: { read: 0, write: 0 } }
        },
        parts: [{ type: "text", text: "continued" }]
      }
    });

    try {
      const definition = await createDelegateGeneralTool({
        directory,
        client: {
          app: {
            agents: async () => ({ data: [{ name: "general", mode: "subagent" }] })
          },
          config: {
            get: async () => ({ data: {} })
          },
          provider: {
            list: async () => ({ data: { all: [] } })
          },
          session: {
            get: async () => ({ data: { id: "ses_existing" } }),
            messages: async () => ({
              data: [
                {
                  info: {
                    role: "assistant",
                    tokens: { input: 100, output: 10, cache: { read: 0, write: 0 } }
                  }
                }
              ]
            }),
            prompt
          }
        }
      });

      const result = await definition.execute(
        {
          description: "Continue work",
          prompt: "Continue the work.",
          model: "openai/gpt-5.6-terra",
          variant: "medium",
          task_id: "ses_existing"
        },
        {
          sessionID: "ses_parent",
          directory,
          ask,
          metadata: () => {}
        } as never
      );

      expect(result).toMatchObject({ title: "Continue work" });
      expect((result as { output: string }).output).toContain(
        "unavailable: OpenCode did not return the session token or model metadata needed to assess reuse safely."
      );
      expect(ask).toHaveBeenCalledOnce();
      expect(prompt).toHaveBeenCalledOnce();
    } finally {
      if (previousXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
      }
    }
  });

  it("uses bounded history for the guard and prompt tokens for final status", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "delegate-general-token-reuse-"));
    const previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = path.join(directory, "xdg");
    await mkdir(path.join(directory, ".opencode"), { recursive: true });
    await writeFile(path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH), JSON.stringify({ models }));

    const ask = vi.fn();
    const messages = vi.fn().mockResolvedValue({
      data: [
        {
          info: {
            role: "assistant",
            tokens: { input: 100, output: 10, cache: { read: 0, write: 0 } }
          }
        }
      ]
    });
    const prompt = vi.fn().mockResolvedValue({
      data: {
        info: {
          role: "assistant",
          tokens: { input: 200_000, output: 0, cache: { read: 40_000, write: 10_000 } }
        },
        parts: [{ type: "text", text: "continued" }]
      }
    });
    const providerList = vi.fn().mockResolvedValue({
      data: {
        all: [
          {
            id: "openai",
            models: {
              "gpt-5.6-terra": {
                id: "gpt-5.6-terra",
                limit: { context: 1_050_000, input: 922_000, output: 128_000 }
              }
            }
          }
        ]
      }
    });

    try {
      const definition = await createDelegateGeneralTool({
        directory,
        client: {
          app: {
            agents: async () => ({ data: [{ name: "general", mode: "subagent" }] })
          },
          config: {
            get: async () => ({ data: {} })
          },
          provider: { list: providerList },
          session: {
            get: async () => ({ data: { id: "ses_existing" } }),
            messages,
            prompt
          }
        }
      });

      const result = await definition.execute(
        {
          description: "Continue work",
          prompt: "Continue the work.",
          model: "openai/gpt-5.6-terra",
          variant: "medium",
          task_id: "ses_existing"
        },
        {
          sessionID: "ses_parent",
          directory,
          ask,
          metadata: () => {}
        } as never
      );

      expect((result as { output: string }).output).toContain(
        "current_context: 250,000 / 1,050,000 tokens (23.8% of window)"
      );
      expect(messages).toHaveBeenCalledOnce();
      expect(messages).toHaveBeenCalledWith({
        path: { id: "ses_existing" },
        query: { directory, limit: 1 }
      });
      expect(providerList).toHaveBeenCalledOnce();
      expect(prompt).toHaveBeenCalledOnce();
    } finally {
      if (previousXdgConfigHome === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
      }
    }
  });
});
