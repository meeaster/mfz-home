import * as z from "zod/v4";
import { createPublicError, DiscordPublicError, type PublicError } from "./errors.js";

export const destinationNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/u);

export const channelIdSchema = z.string().regex(/^\d{17,20}$/u);

export const contentSchema = z.string().min(1).max(2000);

export const sendMessageInputSchema = z
  .object({
    content: contentSchema,
    destination: destinationNameSchema.optional()
  })
  .strict();

const botTokenSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => value === value.trim() && !/\s/u.test(value));

const destinationMapSchema = z
  .record(destinationNameSchema, channelIdSchema)
  .refine((destinations) => Object.keys(destinations).length > 0);

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export interface DiscordConfig {
  readonly botToken: string;
  readonly destinations: Readonly<Record<string, string>>;
  readonly defaultDestination?: string;
}

export type ConfigResult =
  | { readonly ok: true; readonly config: DiscordConfig }
  | { readonly ok: false; readonly error: PublicError };

export interface ResolvedDestination {
  readonly name: string;
  readonly channelId: string;
}

export function loadConfig(env: NodeJS.ProcessEnv): ConfigResult {
  const token = env.DISCORD_BOT_TOKEN;
  const destinationsJson = env.DISCORD_DESTINATIONS_JSON;

  if (token === undefined || destinationsJson === undefined) return invalidConfig();

  const parsedToken = botTokenSchema.safeParse(token);

  if (!parsedToken.success || destinationsJson.trim() === "") {
    return invalidConfig();
  }

  let rawDestinations: unknown;

  try {
    rawDestinations = JSON.parse(destinationsJson);
  } catch {
    return invalidConfig();
  }

  const parsedDestinations = destinationMapSchema.safeParse(rawDestinations);

  if (!parsedDestinations.success) {
    return invalidConfig();
  }

  const rawDefault = env.DISCORD_DEFAULT_DESTINATION;
  let defaultDestination: string | undefined;

  if (rawDefault !== undefined) {
    const parsedDefault = destinationNameSchema.safeParse(rawDefault);

    if (!parsedDefault.success || !Object.hasOwn(parsedDestinations.data, parsedDefault.data)) {
      return invalidConfig();
    }

    defaultDestination = parsedDefault.data;
  }

  const baseConfig = {
    botToken: parsedToken.data,
    destinations: Object.freeze({ ...parsedDestinations.data })
  };

  if (defaultDestination === undefined) return { ok: true, config: baseConfig };

  return { ok: true, config: { ...baseConfig, defaultDestination } };
}

export function resolveDestination(
  config: DiscordConfig,
  requestedDestination: string | undefined
): ResolvedDestination {
  const name = requestedDestination ?? config.defaultDestination;

  if (name === undefined || !Object.hasOwn(config.destinations, name)) {
    throw new DiscordPublicError("invalid_input");
  }

  const channelId = config.destinations[name];

  if (channelId === undefined) throw new DiscordPublicError("invalid_input");

  return { name, channelId };
}

function invalidConfig(): ConfigResult {
  return { ok: false, error: createPublicError("invalid_config") };
}
