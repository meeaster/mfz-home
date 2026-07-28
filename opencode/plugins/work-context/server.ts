import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Hooks, PluginModule } from "@opencode-ai/plugin";
import { z } from "zod";

import { runMfz, type MfzRunner } from "./mfz.js";

const MAX_REMINDER_CHARACTERS = 280;

const orientationSchema = z.object({
  revision: z.number().int().positive(),
  outcome: z.string(),
  direction: z.string(),
  constraints: z.array(z.string()),
  questions: z.array(z.string()),
  next_action: z.string(),
});

const sessionSchema = z.object({ source: z.string(), id: z.string() });
const deliverySchema = z.object({
  state: z.enum(["pending", "delivered", "stale", "failed"]),
  orientation_revision: z.number().int().positive(),
  boundary: z.string(),
  updated_at: z.string(),
  error: z.string().optional(),
});
const unboundContextSchema = z.object({ session: sessionSchema, bound: z.literal(false), reminder: z.string() });
const boundContextSchema = z.object({
  session: sessionSchema,
  bound: z.literal(true),
  unit: z.object({ slug: z.string(), phase: z.string(), orientation: orientationSchema }),
  freshness: z.enum(["pending", "delivered", "stale", "failed"]),
  reminder: z.string(),
  pending_orientation: orientationSchema.nullable(),
  delivery: deliverySchema,
});
const contextSchema = z.union([unboundContextSchema, boundContextSchema]);
const successfulContextOutputSchema = z.object({ ok: z.literal(true), context: contextSchema });
const successfulOutputSchema = z.object({ ok: z.literal(true) }).passthrough();
const checkpointInstructionsSchema = z.object({
  ok: z.literal(true),
  directory: z.string().min(1),
});

type WorkContext = z.infer<typeof contextSchema>;
type BoundWorkContext = z.infer<typeof boundContextSchema>;

type SessionMessagesClient = {
  messages(input: { path: { id: string }; query?: { directory?: string } }): Promise<{ data?: unknown[]; error?: unknown }>;
};

export type WorkContextServerDependencies = {
  client: { session?: SessionMessagesClient };
  directory?: string;
  runner?: MfzRunner;
};

export function boundedReminder(reminder: string): string {
  const normalized = reminder.replace(/\s+/g, " ").trim();
  return normalized.length <= MAX_REMINDER_CHARACTERS
    ? normalized
    : `${normalized.slice(0, MAX_REMINDER_CHARACTERS - 3)}...`;
}

export function formatOrientation(orientation: z.infer<typeof orientationSchema>): string {
  const lines = [
    `Work orientation (revision ${orientation.revision})`,
    `Outcome: ${orientation.outcome}`,
    `Direction: ${orientation.direction}`,
    `Constraints: ${orientation.constraints.join("; ") || "None recorded."}`,
    `Unresolved questions: ${orientation.questions.join("; ") || "None recorded."}`,
    `Next useful action: ${orientation.next_action || "None recorded."}`,
  ];
  return lines.join("\n");
}

export function latestCompletedCompactionSummary(messages: readonly unknown[]): string | undefined {
  for (const message of [...messages].reverse()) {
    const parsed = z
      .object({
        info: z.object({ role: z.string(), summary: z.boolean().optional(), finish: z.unknown().optional(), error: z.unknown().optional() }),
        parts: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
      })
      .safeParse(message);
    if (!parsed.success) continue;
    const { info, parts = [] } = parsed.data;
    if (info.role !== "assistant" || info.summary !== true || !info.finish || info.error) continue;
    const text = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n")
      .trim();
    if (text) return text;
  }
  return undefined;
}

function sessionArgument(sessionID: string): string {
  return `opencode:${sessionID}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function resolveContext(runner: MfzRunner, sessionID: string): Promise<WorkContext> {
  return successfulContextOutputSchema.parse(
    await runner(["work", "context", "--session", sessionArgument(sessionID), "--json"]),
  ).context;
}

async function command(runner: MfzRunner, arguments_: string[]): Promise<void> {
  successfulOutputSchema.parse(await runner(arguments_));
}

export async function writeCompactionCheckpoint(
  runner: MfzRunner,
  context: BoundWorkContext,
  summary: string,
): Promise<void> {
  const { directory } = checkpointInstructionsSchema.parse(
    await runner(["work", "instructions", "checkpoint", context.unit.slug, "--json"]),
  );
  const createdAt = new Date().toISOString();
  const id = `compaction-${Date.now()}-${randomUUID()}`;
  const file = path.join(directory, `${id}.md`);
  const content = `---
id: ${id}
session: ${context.session.source}:${context.session.id}
boundary: compaction
created_at: ${createdAt}
---

${summary.trim()}
`;
  await writeFile(file, content, { encoding: "utf8", flag: "wx" });
  await command(runner, ["work", "validate", context.unit.slug, "--json"]);
}

async function appendReceipt(
  runner: MfzRunner,
  context: BoundWorkContext,
  input: { boundary: string; reminder: string; orientation: string | null; outcome: "delivered" | "failed"; error: string | null },
): Promise<void> {
  const arguments_ = [
    "work",
    "receipt",
    "--session",
    sessionArgument(context.session.id),
    "--boundary",
    input.boundary,
    "--orientation-revision",
    String(context.unit.orientation.revision),
    "--reminder",
    input.reminder,
    "--outcome",
    input.outcome,
    "--json",
  ];
  if (input.orientation !== null) arguments_.push("--orientation", input.orientation);
  if (input.error !== null) arguments_.push("--error", input.error);
  await command(runner, arguments_);
}

async function appendFailure(
  runner: MfzRunner,
  context: BoundWorkContext,
  boundary: string,
  error: unknown,
  orientation: string | null = null,
): Promise<void> {
  try {
    await appendReceipt(runner, context, {
      boundary,
      reminder: boundedReminder(context.reminder),
      orientation,
      outcome: "failed",
      error: errorText(error),
    });
  } catch {
    // The work store itself may be unavailable; request handling still fails open.
  }
}

function eventSessionID(event: unknown): string | undefined {
  const parsed = z
    .object({
      type: z.string(),
      properties: z.object({ sessionID: z.string().optional() }).optional(),
      data: z.object({ sessionID: z.string().optional() }).optional(),
    })
    .safeParse(event);
  if (!parsed.success || parsed.data.type !== "session.compacted") return undefined;
  return parsed.data.properties?.sessionID ?? parsed.data.data?.sessionID;
}

export function createWorkContextServer(dependencies: WorkContextServerDependencies): Hooks {
  const runner = dependencies.runner ?? runMfz;
  const observedBindings = new Set<string>();

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return;
      let context: WorkContext;
      try {
        context = await resolveContext(runner, input.sessionID);
      } catch {
        return;
      }

      const reminder = boundedReminder(context.reminder);
      if (!context.bound) {
        output.system.push(reminder);
        return;
      }

      const firstObservation = !observedBindings.has(input.sessionID);
      observedBindings.add(input.sessionID);
      const orientation = context.pending_orientation ?? (firstObservation ? context.unit.orientation : null);
      const boundary = context.pending_orientation
        ? context.delivery.boundary
        : firstObservation
          ? "resume"
          : "request";
      const orientationText = orientation ? formatOrientation(orientation) : null;
      output.system.push(reminder);
      if (orientationText) output.system.push(orientationText);

      try {
        await appendReceipt(runner, context, {
          boundary,
          reminder,
          orientation: orientationText,
          outcome: "delivered",
          error: null,
        });
      } catch (error) {
        await appendFailure(runner, context, boundary, error, orientationText);
      }
    },
    event: async ({ event }) => {
      const sessionID = eventSessionID(event);
      if (!sessionID) return;

      let context: WorkContext;
      try {
        context = await resolveContext(runner, sessionID);
      } catch {
        return;
      }
      if (!context.bound) return;

      try {
        const response = await dependencies.client.session?.messages({
          path: { id: sessionID },
          query: dependencies.directory ? { directory: dependencies.directory } : undefined,
        });
        if (!response || response.error) throw new Error(`OpenCode could not load compaction messages: ${String(response?.error ?? "unavailable")}`);
        const summary = latestCompletedCompactionSummary(response.data ?? []);
        if (!summary) throw new Error("OpenCode did not retain a completed compaction summary");
        await writeCompactionCheckpoint(runner, context, summary);
      } catch (error) {
        await appendFailure(runner, context, "compaction", error);
      } finally {
        try {
          await command(runner, [
            "work",
            "reload",
            "--session",
            sessionArgument(sessionID),
            "--boundary",
            "compaction",
            "--json",
          ]);
        } catch (error) {
          await appendFailure(runner, context, "compaction-reload", error);
        }
      }
    },
  };
}

const plugin: PluginModule & { id: string } = {
  id: "work-context",
  server: async ({ client, directory }) => createWorkContextServer({ client, directory }),
};

export default plugin;
