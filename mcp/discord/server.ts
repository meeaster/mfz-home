import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  resolveDestination,
  sendMessageInputSchema,
  type DiscordConfig,
  type SendMessageInput
} from "./config.js";
import {
  type DiscordMessageReceipt
} from "./discord-client.js";
import { publicErrorText } from "./errors.js";

export const sendMessageOutputSchema = z
  .object({
    destination: z.string(),
    message_id: z.string(),
    channel_id: z.string(),
    created_at: z.string()
  })
  .strict();

export type SendMessageOutput = z.infer<typeof sendMessageOutputSchema>;

export interface DiscordToolSender {
  send(channelId: string, content: string, signal?: AbortSignal): Promise<DiscordMessageReceipt>;
}

export interface DiscordMcpServerOptions {
  readonly config: DiscordConfig;
  readonly sender: DiscordToolSender;
}

export function createDiscordMcpServer(options: DiscordMcpServerOptions): McpServer {
  const server = new McpServer({ name: "discord-mcp", version: "0.1.0" });

  server.registerTool(
    "discord_send_message",
    {
      title: "Send Discord message",
      description: "Send plain text to a configured named Discord destination.",
      inputSchema: sendMessageInputSchema,
      outputSchema: sendMessageOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false
      }
    },
    async ({ content, destination }: SendMessageInput, context) => {
      try {
        const resolved = resolveDestination(options.config, destination);
        const receipt = await options.sender.send(resolved.channelId, content, context.mcpReq.signal);

        const output: SendMessageOutput = {
          destination: resolved.name,
          message_id: receipt.message_id,
          channel_id: receipt.channel_id,
          created_at: receipt.created_at
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
          structuredContent: output
        };
      } catch (error) {
        const caughtError = error instanceof Error ? error : new Error("unknown error");

        return {
          content: [{ type: "text" as const, text: publicErrorText(caughtError) }],
          isError: true
        };
      }
    }
  );

  return server;
}

export { loadConfig, resolveDestination } from "./config.js";

export { DiscordRestSender } from "./discord-client.js";

export { errorForDiscordStatus, toPublicError } from "./errors.js";
