import { Plugin } from "@opencode/plugin";
import { z } from "zod";

const skillInput = z.object({ id: z.string().min(1) });

const stateSchema = z.object({
  version: z.literal(1),
  skills: z.array(z.object({
    id: z.string().min(1),
    loadedAt: z.string().nullable(),
    suggestedAt: z.string().nullable(),
  })),
});

type SessionState = z.infer<typeof stateSchema>;

const mandatory = new Set(["orchestrator-mode", "orchestrator-task-evidence"]);

function readState(value: Awaited<ReturnType<Plugin.Context["storage"]["get"]>>): SessionState {
  if (value === undefined) return { version: 1, skills: [] };

  return stateSchema.parse(value);
}

function latestCheckpoint(messages: Awaited<ReturnType<Plugin.Context["session"]["context"]>>) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.type === "compaction" && message.status === "completed") return message.id;
  }

  return null;
}

function reminder(mandatoryIDs: string[], optionalIDs: string[]) {
  const lines = ["Skill continuity after completed compaction:"];

  if (mandatoryIDs.length > 0) {
    lines.push(`Immediately reload these previously loaded skills with the skill tool: ${mandatoryIDs.join(", ")}. Repeat on subsequent model turns until each skill has successfully reloaded.`);
    lines.push("Preserve the human-selected orchestrator role/mode. Recover it from retained context or effort records; do not infer or recommend a mode from free text. Ask the human only if the selection is genuinely missing.");
  }

  if (optionalIDs.length > 0) {
    lines.push(`Previously loaded skills to reassess for this assignment: ${optionalIDs.join(", ")}. Reload only those still relevant.`);
  }

  return lines.join("\n");
}

export async function setupSkillContinuity(ctx: Plugin.Context) {
  const queues = new Map<string, Promise<void>>();

  function serialize(sessionID: string, work: () => Promise<void>) {
    const previous = queues.get(sessionID) ?? Promise.resolve();

    const next = previous.then(work).catch((error) => {
      console.error("[skill-continuity] unable to update session state", error);
    });

    queues.set(sessionID, next);
    void next.finally(() => {
      if (queues.get(sessionID) === next) queues.delete(sessionID);
    });

    return next;
  }

  async function checkpoint(sessionID: string) {
    return latestCheckpoint(await ctx.session.context({ sessionID }));
  }

  const loadHook = await ctx.tool.hook("execute.after", (event) => {
    if (event.tool !== "skill" || event.status !== "completed") return;

    const parsed = skillInput.safeParse(event.input);

    if (!parsed.success) return;

    const id = parsed.data.id;

    return serialize(event.sessionID, async () => {
      const at = await checkpoint(event.sessionID);
      const key = `session/${encodeURIComponent(event.sessionID)}`;
      const state = readState(await ctx.storage.get(key));
      const existing = state.skills.find((skill) => skill.id === id);

      if (existing) {
        existing.loadedAt = at;
        existing.suggestedAt = null;
      } else {
        state.skills.push({ id, loadedAt: at, suggestedAt: null });
      }

      await ctx.storage.set(key, state);
    });
  });

  try {
    const contextHook = await ctx.session.hook("context", (event) => serialize(event.sessionID, async () => {
      const at = await checkpoint(event.sessionID);

      if (at === null) return;

      const key = `session/${encodeURIComponent(event.sessionID)}`;
      const state = readState(await ctx.storage.get(key));
      const mandatoryIDs: string[] = [];
      const optionalIDs: string[] = [];

      for (const skill of state.skills) {
        if (skill.loadedAt === at) continue;

        if (mandatory.has(skill.id)) {
          mandatoryIDs.push(skill.id);
        } else if (skill.suggestedAt !== at) {
          optionalIDs.push(skill.id);
          skill.suggestedAt = at;
        }
      }

      if (mandatoryIDs.length === 0 && optionalIDs.length === 0) return;

      // Optional notices are at-most-once per request preparation, not acknowledged model deliveries.
      if (optionalIDs.length > 0) await ctx.storage.set(key, state);

      event.system.push({ type: "text", text: reminder(mandatoryIDs, optionalIDs) });
    }));

    return async () => {
      await contextHook.dispose();
      await loadHook.dispose();
      await Promise.all(queues.values());
    };
  } catch (error) {
    await loadHook.dispose();
    throw error;
  }
}

export default Plugin.define({
  id: "skill-continuity",
  setup: setupSkillContinuity,
});
