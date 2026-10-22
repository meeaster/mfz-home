// Registers Claude Code as an OpenCode provider. Each model runs a full Claude Code agent turn through the
// Claude Agent SDK, using the local `claude` CLI and its own login, settings and Bedrock or plan access.
import { homedir } from "node:os";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { Model, Plugin, Provider } from "@opencode/plugin";
import { z } from "zod";
import type { Settings } from "./claude-options.js";
import { registerCompaction } from "./compaction.js";
import { MIRROR_MODEL_ID, PROVIDER_ID, registry } from "./registry.js";

const PROVIDER = Provider.ID.make(PROVIDER_ID);

const FACTORY = `aisdk:${new URL("./provider.ts", import.meta.url).href}`;

const DISCOVERY_TIMEOUT_MS = 30_000;

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

const Options = z.object({
  executable: z.string().optional(),
  permissionMode: z.enum(["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk", "auto"]).optional(),
});

// `context` is the window Claude Code reports for the model on this account, when known.
type Discovered = { id: string; name: string; efforts: readonly string[]; context?: number };

type ProviderEditor = Parameters<Parameters<Plugin.Context["provider"]["transform"]>[0]>[0];

type ModelInfo = Parameters<ProviderEditor["add"]>[0]["models"][number];

// Used until the CLI reports the models this account can use.
const FALLBACK: Discovered[] = [
  { id: "opus", name: "Opus", efforts: EFFORTS },
  { id: "fable", name: "Fable", efforts: EFFORTS },
  { id: "sonnet", name: "Sonnet", efforts: EFFORTS },
  { id: "haiku", name: "Haiku", efforts: EFFORTS },
];

export default Plugin.define({
  id: "claude-code",
  async setup(context) {
    const options = Options.parse(context.options ?? {});
    const executable = options.executable ?? join(homedir(), ".local/bin/claude");
    const base = { cwd: context.location.directory, executable };
    // Without an override, Claude Code uses the permission mode from the user's own settings.
    const settings: Settings = options.permissionMode === undefined ? base : { ...base, permissionMode: options.permissionMode };
    let models = FALLBACK;

    registry().context = context;

    const compaction = await registerCompaction(context, settings);

    // A message sent while Claude is working reaches the running turn instead of waiting for it to end. Attachments
    // still go through OpenCode's own delivery.
    const steering = await context.session.hook("prompt", (event) => {
      const runtime = registry().runtimes.get(event.sessionID);

      if (!runtime?.busy || event.delivery !== "steer" || event.prompt.files?.length) return;

      runtime.steer(event.prompt.text);
    });

    const registration = await context.provider.transform((editor) => {
      editor.add({
        info: { ...Provider.Info.empty(PROVIDER), name: "Claude Code", activation: "enabled", package: FACTORY },
        models: [
          ...models.map((model) => modelInfo(model, settings)),
          modelInfo({ id: MIRROR_MODEL_ID, name: "Subagent transcript", efforts: [] }, {}),
        ],
      });
    });

    discoverModels(executable, context.location.directory)
      .then(async (found) => {
        if (found.length === 0) return;

        models = found;
        await context.provider.reload();
      })
      .catch((error) => console.error(`[claude-code] model discovery failed: ${String(error)}`));

    return async () => {
      await steering.dispose();
      await compaction.dispose();
      await registration.dispose();

      for (const runtime of registry().runtimes.values()) runtime.close();

      if (registry().context === context) registry().context = undefined;
    };
  },
});

function modelInfo(model: Discovered, settings: Settings | Record<string, never>): ModelInfo {
  const defaults = Model.Info.default(PROVIDER, Model.ID.make(model.id));

  return {
    ...defaults,
    name: model.name,
    package: FACTORY,
    settings,
    capabilities: { tools: true, input: ["text", "image", "pdf"], output: ["text"] },
    variants: model.efforts.map((effort) => ({ id: Model.VariantID.make(effort), settings: { effort } })),
    limit: model.context === undefined ? defaults.limit : { ...defaults.limit, context: model.context },
  };
}

// Asks the local Claude Code CLI which model aliases, effort levels and context windows this account can use.
async function discoverModels(executable: string, cwd: string): Promise<Discovered[]> {
  const idle = (async function* () {
    await new Promise<never>(() => undefined);
  })();

  const run = query({ prompt: idle, options: { cwd, pathToClaudeCodeExecutable: executable } });
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), DISCOVERY_TIMEOUT_MS);
  });

  const discover = async () => {
    const listed = await run.supportedModels();
    const found: Discovered[] = [];

    for (const model of listed) {
      // `default` duplicates another alias, and dated IDs are pinned snapshots of an alias.
      if (model.value === "default" || /\d{8}$/.test(model.value)) continue;

      // After switching the idle session's model, Claude Code reports that model's context window.
      await run.setModel(model.value);

      const usage = await run.getContextUsage();

      found.push({
        id: model.value,
        name: model.displayName,
        efforts: model.supportedEffortLevels ?? [],
        context: usage.rawMaxTokens,
      });
    }

    return found;
  };

  try {
    return await Promise.race([discover(), timeout]);
  } finally {
    clearTimeout(timer);
    run.close();
  }
}
