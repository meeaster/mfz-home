export type PublicErrorCode =
  | "invalid_input"
  | "invalid_config"
  | "unauthorized"
  | "forbidden"
  | "unknown_channel"
  | "rate_limited"
  | "temporary_discord_failure"
  | "delivery_unknown";

export interface PublicError {
  readonly code: PublicErrorCode;
  readonly message: string;
  readonly retry_after_ms?: number;
}

const publicMessages: Record<PublicErrorCode, string> = {
  invalid_input: "The message input is invalid.",
  invalid_config: "The Discord MCP configuration is invalid.",
  unauthorized: "Discord rejected the bot authentication.",
  forbidden: "The bot is not permitted to send to the Discord destination.",
  unknown_channel: "The Discord destination is unavailable.",
  rate_limited: "Discord rate limiting prevented delivery within the call deadline.",
  temporary_discord_failure: "Discord is temporarily unavailable.",
  delivery_unknown: "The Discord delivery outcome is unknown."
};

export class DiscordPublicError extends Error {
  readonly publicError: PublicError;

  constructor(code: PublicErrorCode, retryAfterMs?: number) {
    const publicError = createPublicError(code, retryAfterMs);

    super(publicError.message);
    this.name = "DiscordPublicError";
    this.publicError = publicError;
  }
}

export function createPublicError(code: PublicErrorCode, retryAfterMs?: number): PublicError {
  const publicError: PublicError = {
    code,
    message: publicMessages[code]
  };

  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return { ...publicError, retry_after_ms: Math.ceil(retryAfterMs) };
  }

  return publicError;
}

export function toPublicError(error: Error): PublicError {
  if (error instanceof DiscordPublicError) return error.publicError;

  return createPublicError("delivery_unknown");
}

export function publicErrorText(error: Error): string {
  return JSON.stringify(toPublicError(error));
}

export function errorForDiscordStatus(status: number): PublicErrorCode {
  if (status === 400) return "invalid_input";

  if (status === 401) return "unauthorized";

  if (status === 403) return "forbidden";

  if (status === 404) return "unknown_channel";

  if (status === 429) return "rate_limited";

  if (status >= 500 && status <= 599) return "temporary_discord_failure";

  return "temporary_discord_failure";
}
