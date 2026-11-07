import { array, boolean, decodeJson, object, string, type Infer } from "apps";
import { splitForDiscord, toDiscordMarkdown } from "./markdown.js";

const api = "https://discord.com/api/v10";

export interface Discord {
  readonly fetch: typeof fetch;
  readonly signal?: AbortSignal | undefined;
  readonly authorization: string;
}

const Me = object({ id: string() });

export const messageFields = {
  id: string(),
  content: string(),
  author: object({ id: string(), bot: boolean().optional() }),
  mentions: array(object({ id: string() })),
};

const Message = object(messageFields);

export type DiscordMessage = Infer<typeof Message>;

const Channel = object({ id: string() });

function request(discord: Discord, method: string, path: string, body?: unknown) {
  return discord.fetch(`${api}${path}`, {
    method,
    ...(discord.signal === undefined ? {} : { signal: discord.signal }),
    headers: {
      authorization: discord.authorization,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function me(discord: Discord) {
  return decodeJson(await request(discord, "GET", "/users/@me"), Me);
}

// Messages after `after`, oldest first. Discord returns the newest first and at most 100.
export async function messagesAfter(discord: Discord, channelID: string, after?: string) {
  const query = after === undefined ? "limit=1" : `after=${after}&limit=100`;
  const messages = await decodeJson(
    await request(discord, "GET", `/channels/${channelID}/messages?${query}`),
    array(Message),
  );

  return [...messages].sort((left, right) => (BigInt(left.id) < BigInt(right.id) ? -1 : 1));
}

// Starts a public thread on a message and returns the thread's channel ID.
export async function threadOn(discord: Discord, channelID: string, messageID: string, name: string) {
  const thread = await decodeJson(
    await request(discord, "POST", `/channels/${channelID}/messages/${messageID}/threads`, {
      name: name.slice(0, 100),
      auto_archive_duration: 1440,
    }),
    Channel,
  );

  return thread.id;
}

// Shows "typing…" in a channel for about ten seconds, or until the next message. Cosmetic, so a
// failure never stops the caller.
export async function typing(discord: Discord, channelID: string) {
  await request(discord, "POST", `/channels/${channelID}/typing`).catch(() => undefined);
}

// Posts Markdown as Discord renders it, in as many messages as its length limit needs, without
// pinging anyone.
export async function post(discord: Discord, channelID: string, markdown: string) {
  for (const content of splitForDiscord(toDiscordMarkdown(markdown))) {
    const response = await request(discord, "POST", `/channels/${channelID}/messages`, {
      content,
      allowed_mentions: { parse: [] },
    });

    if (!response.ok) throw new Error(`Discord refused the message with status ${response.status}`);
  }
}
