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

function currentSkillID(id: string) {
  if (id === "orchestrator-mode") return "orchestration";

  if (id === "orchestrator-task-evidence" || id === "task-evidence") return "task-output";

  return id;
}

function reminder(ids: string[]) {
  return [
    "Skill continuity after completed compaction:",
    `Previously loaded skills to reassess for this assignment: ${ids.join(", ")}. Reload only those still relevant.`,
    "Recover the latest explicit human workflow selection, including any exit, from retained context or current effort records. Skill history is not mode selection. Reload reusable procedures for a continuing role; do not replay human-only entry skills or restart completed capture and storage operations. Ask only if a required selection is genuinely missing.",
  ].join("\n");
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
      const pendingIDs = new Set<string>();

      for (const skill of state.skills) {
        if (skill.loadedAt === at) continue;

        if (skill.suggestedAt !== at) {
          pendingIDs.add(currentSkillID(skill.id));
          skill.suggestedAt = at;
        }
      }

      if (pendingIDs.size === 0) return;

      // Notices are at-most-once per request preparation, not acknowledged model deliveries.
      await ctx.storage.set(key, state);

      event.system.push({ type: "text", text: reminder([...pendingIDs]) });
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
