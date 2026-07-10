import { createHash } from "node:crypto";
import { appendFile, chmod, mkdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type { PluginModule } from "@opencode-ai/plugin";

const OUTPUT_DIR = process.env.OPENCODE_EXECUTOR_CONTEXT_PROBE_DIR;
const RECORD_INVENTORIES = process.env.OPENCODE_EXECUTOR_CONTEXT_PROBE_INVENTORIES === "1";

type ProbeClient = {
  app: { agents(input: { query: { directory: string } }): Promise<unknown> };
  tool: {
    ids(input: { query: { directory: string } }): Promise<unknown>;
    list(input: { query: { directory: string; provider: string; model: string } }): Promise<unknown>;
  };
};

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]")
      .replace(/((?:api[_ -]?key|token|password|secret)\s*(?:=|:)\s*)[^\s,;]+/gi, "$1[REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /api[_-]?key|token|password|secret|authorization|reasoningencryptedcontent/i.test(key)
          ? "[REDACTED]"
          : redact(entry),
      ]),
    );
  }
  return value;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fileName(sessionID: string | undefined): string {
  return `${(sessionID ?? "global").replace(/[^a-zA-Z0-9._-]/g, "_")}.jsonl`;
}

async function record(hook: string, payload: Record<string, unknown>, sessionID?: string): Promise<void> {
  if (!OUTPUT_DIR) return;
  const observation = {
    at: new Date().toISOString(),
    hook,
    sessionID: sessionID ?? null,
    payload: redact(payload),
  };
  try {
    const path = join(OUTPUT_DIR, fileName(sessionID));
    await mkdir(OUTPUT_DIR, { recursive: true, mode: 0o700 });
    await chmod(OUTPUT_DIR, 0o700);
    await appendFile(path, `${JSON.stringify(observation)}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(path, 0o600);
  } catch {
    // A diagnostic recorder must never interrupt the executor.
  }
}

async function inventories(client: ProbeClient, directory: string, sessionID: string, provider?: string, model?: string): Promise<void> {
  const requests: Record<string, Promise<unknown>> = {
    agents: client.app.agents({ query: { directory } }),
    toolIDs: client.tool.ids({ query: { directory } }),
  };
  if (provider && model) {
    requests.defaultAgentTools = client.tool.list({ query: { directory, provider, model } });
  }
  const settled = await Promise.allSettled(Object.values(requests));
  await record(
    "sdk.inventories",
    {
      fidelity: {
        agents: "global configured agents; not proof of the active session agent",
        toolIDs: "global registry IDs; not proof of availability in this session",
        defaultAgentTools: "default-agent approximation; not proof of the active session tool set",
      },
      inventories: Object.fromEntries(
        Object.keys(requests).map((name, index) => {
          const result = settled[index]!;
          if (result.status === "rejected") return [name, { error: String(result.reason) }];
          const data = (result.value as { data?: unknown }).data;
          const entries = Array.isArray(data) ? data : [];
          return [
            name,
            {
              responseHash: digest(result.value),
              count: entries.length,
              ids: entries.flatMap((entry) => {
                const item = entry as { id?: unknown; name?: unknown };
                return typeof entry === "string" ? [entry] : typeof item.id === "string" ? [item.id] : typeof item.name === "string" ? [item.name] : [];
              }),
            },
          ];
        }),
      ),
    },
    sessionID,
  );
}

const ExecutorContextProbe: PluginModule = {
  id: "executor-context-probe",
  server: async ({ client, directory }) => {
    if (!OUTPUT_DIR) return {};
    const probeClient = client as unknown as ProbeClient;
    return {
      config: async (config) => {
        await record("config", {
          fidelity: "global merged configuration; no session ID",
          configHash: digest(config),
          topLevelKeys: Object.keys(config),
        });
      },
      "chat.message": async (input, output) => {
        await record(
          "chat.message",
          {
            fidelity: "exact session-scoped user-message hook",
            agent: input.agent,
            model: input.model,
            partTypes: output.parts.map((part) => part.type),
          },
          input.sessionID,
        );
      },
      "chat.params": async (input, output) => {
        await record(
          "chat.params",
          {
            fidelity: "exact session/agent/model request metadata; no final tools",
            agent: input.agent,
            modelID: input.model.id,
            providerID: (input.provider as unknown as { id?: string }).id ?? input.model.providerID,
            parameterKeys: Object.keys(output),
          },
          input.sessionID,
        );
        // The runtime passes ProviderContext with `id`; the published hook type
        // currently advertises an `info` wrapper that is not present here.
        const provider = (input.provider as unknown as { id?: string }).id ?? input.model.providerID;
        if (RECORD_INVENTORIES) void inventories(probeClient, directory, input.sessionID, provider, input.model.id);
      },
      "experimental.chat.messages.transform": async (input, output) => {
        await record("experimental.chat.messages.transform", {
          fidelity: "assembled transcript but no session ID in the plugin contract",
          inputKeys: Object.keys(input),
          messageCount: output.messages.length,
          sessionIDs: [...new Set(output.messages.map((message) => message.info.sessionID))],
        });
      },
      "experimental.chat.system.transform": async (input, output) => {
        await record(
          "experimental.chat.system.transform",
          {
            fidelity: "assembled system prompt, session-scoped when sessionID is present",
            systemHash: digest(output.system),
            systemCharacters: output.system.join("\n").length,
            hasAvailableSkills: output.system.join("\n").includes("available_skills"),
            hasAgentInstructions: output.system.join("\n").includes("AGENTS.md"),
            modelID: input.model.id,
          },
          input.sessionID,
        );
      },
      "tool.definition": async (input, output) => {
        await record("tool.definition", {
          fidelity: "tool schema observed during request construction; no session ID, may precede final filtering",
          toolID: input.toolID,
          descriptionHash: digest(output.description),
          parametersHash: digest(output.parameters),
        });
      },
      "tool.execute.before": async (input, output) => {
        await record("tool.execute.before", { fidelity: "exact executed tool", tool: input.tool, callID: input.callID, argKeys: Object.keys(output.args) }, input.sessionID);
      },
      "tool.execute.after": async (input, output) => {
        await record("tool.execute.after", { fidelity: "exact completed tool", tool: input.tool, callID: input.callID, outputCharacters: output.output.length }, input.sessionID);
      },
      event: async (input) => {
        const event = input.event as { properties?: { sessionID?: string; info?: { id?: string } } };
        const sessionID = event.properties?.sessionID ?? event.properties?.info?.id;
        await record("event", { fidelity: "event type; session ID depends on event type", type: input.event.type }, sessionID);
      },
    };
  },
};

export default ExecutorContextProbe;
