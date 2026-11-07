import { array, boolean, decodeJson, object, string, type Infer } from "apps";

const api = "https://discord.com/api/v10";

// Discord rejects longer message content.
const messageLimit = 2000;

export interface Discord {
  readonly fetch: typeof fetch;
  readonly signal?: AbortSignal | undefined;
  readonly authorization: string;
}

const Me = object({ id: string() });

const Message = object({
  id: string(),
  content: string(),
  author: object({ id: string(), bot: boolean().optional() }),
  mentions: array(object({ id: string() })),
});

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

// Posts text in as many messages as Discord's length limit needs, without pinging anyone.
export async function post(discord: Discord, channelID: string, text: string) {
  for (let start = 0; start < text.length; start += messageLimit) {
    const response = await request(discord, "POST", `/channels/${channelID}/messages`, {
      content: text.slice(start, start + messageLimit),
      allowed_mentions: { parse: [] },
    });

    if (!response.ok) throw new Error(`Discord refused the message with status ${response.status}`);
  }
}
