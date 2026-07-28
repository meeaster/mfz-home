import { z } from "zod";

const orientationSchema = z.object({ revision: z.number().int().positive() });
const sessionSchema = z.object({ source: z.string(), id: z.string() });
const receiptSchema = z.object({
  unit: z.string(),
  session: sessionSchema,
  boundary: z.string(),
  orientation_revision: z.number().int().positive(),
  reminder: z.string(),
  orientation: z.string().nullable(),
  outcome: z.enum(["delivered", "failed"]),
  error: z.string().nullable(),
  created_at: z.string(),
});
const checkpointSchema = z.object({ created_at: z.string() });

export const workContextSchema = z.union([
  z.object({ session: sessionSchema, bound: z.literal(false), reminder: z.string() }),
  z.object({
    session: sessionSchema,
    bound: z.literal(true),
    unit: z.object({ slug: z.string(), phase: z.string(), orientation: orientationSchema }),
    freshness: z.enum(["pending", "delivered", "stale", "failed"]),
    reminder: z.string(),
    delivery: z.object({ boundary: z.string(), error: z.string().optional() }),
  }),
]);

export type WorkContext = z.infer<typeof workContextSchema>;
export type WorkReceipt = z.infer<typeof receiptSchema>;

export function parseContextOutput(value: unknown): WorkContext {
  return z.object({ ok: z.literal(true), context: workContextSchema }).parse(value).context;
}

export function parseReceiptsOutput(value: unknown): WorkReceipt[] {
  return z.object({ ok: z.literal(true), receipts: z.array(receiptSchema) }).parse(value).receipts;
}

export function parseCheckpointsOutput(value: unknown): Array<z.infer<typeof checkpointSchema>> {
  return z.object({ ok: z.literal(true), checkpoints: z.array(checkpointSchema) }).parse(value).checkpoints;
}

export function compactStatus(context: WorkContext): string | undefined {
  return context.bound ? `${context.unit.slug} ${context.unit.phase} ${context.freshness}` : undefined;
}

export function latestByCreated<T extends { created_at: string }>(items: readonly T[]): T | undefined {
  return items.reduce<T | undefined>((latest, item) => (!latest || item.created_at > latest.created_at ? item : latest), undefined);
}

export function receiptsForSession(receipts: readonly WorkReceipt[], sessionID: string): WorkReceipt[] {
  return receipts.filter((receipt) => receipt.session.id === sessionID);
}

export function inspectionLines(input: {
  context?: WorkContext;
  receipts?: readonly WorkReceipt[];
  checkpoints?: readonly { created_at: string }[];
  error?: string;
}): string[] {
  if (!input.context) return ["Work context unavailable", `Error: ${input.error ?? "Unavailable"}`];
  if (!input.context.bound) {
    return ["Work context: unbound", `Reminder: ${input.context.reminder}`, ...(input.error ? [`Error: ${input.error}`] : [])];
  }

  const receipt = latestByCreated(input.receipts ?? []);
  const checkpoint = latestByCreated(input.checkpoints ?? []);
  return [
    `Unit: ${input.context.unit.slug}`,
    `Phase: ${input.context.unit.phase}`,
    `Freshness: ${input.context.freshness}`,
    `Boundary: ${receipt?.boundary ?? input.context.delivery.boundary}`,
    `Orientation revision: ${receipt?.orientation_revision ?? input.context.unit.orientation.revision}`,
    `Reminder: ${receipt?.reminder ?? input.context.reminder}`,
    `Orientation: ${receipt?.orientation ?? "Not delivered in the latest receipt."}`,
    `Latest checkpoint: ${checkpoint?.created_at ?? "None"}`,
    `Error: ${input.error ?? receipt?.error ?? input.context.delivery.error ?? "None"}`,
  ];
}
