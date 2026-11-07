import { createHmac } from "node:crypto";

export interface GatewayMessage {
  readonly id: string;
  readonly channel_id: string;
  readonly content: string;
  readonly author: { readonly id: string; readonly bot?: boolean | undefined };
  readonly mentions: readonly { readonly id: string }[];
}

export interface Filter {
  readonly channelID: string;
  readonly ownerID: string;
}

// Only the owner's mentions of the bot in the watched channel leave this machine.
export function shouldForward(message: GatewayMessage, filter: Filter, botID: string): boolean {
  return (
    message.channel_id === filter.channelID &&
    message.author.id === filter.ownerID &&
    message.author.bot !== true &&
    message.mentions.some((mentioned) => mentioned.id === botID)
  );
}

// The body the Executor webhook parses: only the fields it reads.
export function deliveryBody(message: GatewayMessage, botID: string): string {
  return JSON.stringify({
    botID,
    message: {
      id: message.id,
      channel_id: message.channel_id,
      content: message.content,
      author: { id: message.author.id, bot: message.author.bot === true },
      mentions: message.mentions.map((mentioned) => ({ id: mentioned.id })),
    },
  });
}

// The webhook verifies HMAC-SHA256 over `<timestamp>.<body>` and refuses old timestamps.
export function signatureHeaders(body: string, secret: string, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  return { "x-relay-timestamp": timestamp, "x-relay-signature": signature };
}
