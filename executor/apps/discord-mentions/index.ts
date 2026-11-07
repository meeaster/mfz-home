import {
  NonRetryableError,
  appInterval,
  defineApp,
  mutation,
  object,
  router,
  string,
  workflow,
  type MutationContext,
  type Webhook,
  type WebhookContext,
  type WorkflowContext,
  type WorkflowStepContext,
} from "apps";
import {
  messageFields,
  messagesAfter,
  me,
  post,
  react,
  threadOn,
  typing,
  type Discord,
  type DiscordMessage,
} from "./discord.js";
import { sessionResult, startSession, type Client } from "./opencode.js";
import { discord, opencode } from "./providers.js";

// #opencode in the chewy-notifications server, and the only person whose mentions start a session:
// a session runs with full access to this machine.
const channelID = "1550738885615554621";
const ownerID = "94119099977695232";

// Sessions use the OpenCode client's default model.
const session = { directory: "/home/mark/workspace" };

// Appended to each prompt so replies arrive in Markdown that Discord renders.
const discordFormatting =
  "(This request came from Discord, and your final reply is posted there. Format it for Discord: no tables, so use lists instead; headings no deeper than ###; keep it concise.)";

const pollInterval = "5 seconds";
const maxPolls = 360; // Thirty minutes at the poll interval.

// App accounts, so the schedule and the workflows it starts run without a caller.
const requirements = { app: { accounts: { discord, opencode } } };

type Context =
  | MutationContext<typeof requirements, "app">
  | WorkflowStepContext<typeof requirements, "app">;

function discordClient(ctx: Context): Discord {
  const account = ctx.app.accounts.discord;
  const authorization =
    account.method === "oauth"
      ? `Bearer ${account.fields.access_token}`
      : `Bot ${account.fields.token}`;

  return { fetch: ctx.fetch, signal: ctx.signal, authorization };
}

function opencodeClient(ctx: Context): Client {
  return {
    fetch: ctx.fetch,
    signal: ctx.signal,
    password: ctx.app.accounts.opencode.fields.password,
  };
}

const Mention = object({ messageID: string(), prompt: string() });

const reply = workflow(
  {
    description:
      "Answer one Discord mention: start a thread on it, run OpenCode with its text, and post the reply in the thread.",
    input: Mention,
  },
  async ({ step }: WorkflowContext<typeof requirements, "app">, mention) => {
    // Creating a thread or a session twice would duplicate it, so these steps never retry.
    const once = { retries: { limit: 0, delay: "1 second" } } as const;

    // 👀 on the mention says it was picked up; the thread shows "typing…" while OpenCode works.
    await step.do("seen", async (ctx) => {
      await react(discordClient(ctx), channelID, mention.messageID, "👀", true);

      return null;
    });

    const threadID = await step.do("thread", once, async (ctx) => {
      const discord = discordClient(ctx);
      const thread = await threadOn(discord, channelID, mention.messageID, mention.prompt || "OpenCode");

      await typing(discord, thread);

      return thread;
    });

    // Swaps 👀 for the final mark once the thread has its answer.
    const finish = (mark: string) =>
      step.do(`finish ${mark}`, async (ctx) => {
        const discord = discordClient(ctx);

        await react(discord, channelID, mention.messageID, "👀", false);
        await react(discord, channelID, mention.messageID, mark, true);

        return null;
      });

    const { sessionID } = await step.do("session", once, async (ctx) =>
      startSession(opencodeClient(ctx), {
        ...session,
        prompt: `${mention.prompt}\n\n${discordFormatting}`,
        title: `Discord: ${mention.prompt.slice(0, 60)}`,
      }),
    );

    for (let poll = 1; poll <= maxPolls; poll += 1) {
      await step.sleep(`wait ${poll}`, pollInterval);

      // Each check renews "typing…", which lasts about ten seconds, so it stays on between checks.
      const result = await step.do(`check ${poll}`, async (ctx) => {
        const status = await sessionResult(opencodeClient(ctx), sessionID);

        if (status.running) await typing(discordClient(ctx), threadID);

        return status;
      });

      if (result.running) continue;

      const text =
        result.reply ??
        `OpenCode finished (${result.outcome ?? "unknown"}) without a reply${result.error === undefined ? "." : `: ${result.error}`}`;

      await step.do("reply", once, async (ctx) => {
        await post(discordClient(ctx), threadID, text);

        return null;
      });
      await finish(result.outcome === "succeeded" ? "✅" : "❌");

      return null;
    }

    await step.do("timeout", once, async (ctx) => {
      await post(
        discordClient(ctx),
        threadID,
        `OpenCode session ${sessionID} was still running after thirty minutes; check it in OpenCode.`,
      );

      return null;
    });
    await finish("⏳");

    throw new NonRetryableError(`OpenCode session ${sessionID} was still running after thirty minutes`);
  },
);

// Starts a reply when the message mentions the bot in #opencode and comes from the owner. The
// message ID is the run key, so the poller and the relay find the same run instead of starting two.
async function answer(
  ctx: MutationContext<typeof requirements, "app"> | WebhookContext<typeof requirements, "app">,
  message: DiscordMessage,
  messageChannelID: string,
  botID: string,
): Promise<boolean> {
  const mentionsBot =
    messageChannelID === channelID &&
    message.author.id === ownerID &&
    message.author.bot !== true &&
    message.mentions.some((mentioned) => mentioned.id === botID);

  if (!mentionsBot) return false;

  await ctx.workflows.start({
    workflow: "reply",
    key: `mention-${message.id}`,
    input: {
      messageID: message.id,
      prompt: message.content.replaceAll(new RegExp(`<@!?${botID}>`, "g"), "").trim(),
    },
  });

  return true;
}

// Reads #opencode since the last poll and starts one reply per new mention from the owner. The
// Discord relay delivers mentions as they happen; this catches any it missed.
const poll = mutation(
  { description: "Check #opencode for new mentions of the bot and answer each one.", input: object({}) },
  async (ctx: MutationContext<typeof requirements, "app">) => {
    const client = discordClient(ctx);
    const cursor = ctx.sql
      .exec<{ last_message_id: string }>(
        "SELECT last_message_id FROM cursors WHERE channel_id = ?",
        channelID,
      )
      .toArray()[0]?.last_message_id;

    const messages = await messagesAfter(client, channelID, cursor);
    const newest = messages.at(-1)?.id;

    // The first poll only records where the channel is, so old messages never get answered.
    if (cursor === undefined) {
      ctx.sql.exec(
        "INSERT INTO cursors (channel_id, last_message_id) VALUES (?, ?)",
        channelID,
        newest ?? "0",
      );

      return { started: 0 };
    }

    const bot = await me(client);
    let started = 0;

    for (const message of messages) {
      if (await answer(ctx, message, channelID, bot.id)) started += 1;
    }

    if (newest !== undefined)
      ctx.sql.exec(
        "UPDATE cursors SET last_message_id = ? WHERE channel_id = ?",
        newest,
        channelID,
      );

    return { started };
  },
);

const empty = object({});

const Delivery = object({
  botID: string(),
  message: object({ ...messageFields, channel_id: string() }),
});

// Deliveries older than this are refused, so a captured request cannot be replayed later.
const maxDeliveryAgeSeconds = 300;

async function signedByRelay(request: Request, body: string, secret: string): Promise<boolean> {
  const timestamp = request.headers.get("x-relay-timestamp");
  const signature = request.headers.get("x-relay-signature");

  if (timestamp === null || signature === null || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > maxDeliveryAgeSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(signature.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

  // subtle.verify compares in constant time.
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${timestamp}.${body}`));
}

// Mentions pushed by the local Discord relay (relays/discord in the home), which holds a Gateway
// connection that an app cannot. The relay signs `<timestamp>.<body>` with this subscription's secret.
const relay = {
  account: { app: "discord" },
  config: empty,
  state: empty,
  setup: {
    instructions:
      "Put the signing secret in ~/.mindframe-z/secrets/zsh.env as DISCORD_RELAY_SECRET and this callback URL in discord-relay.service as DISCORD_RELAY_URL, then restart discord-relay.service.",
    signingSecret: "executor",
  },
  handle: async (ctx, { request, secret }) => {
    const body = await request.text();

    if (!(await signedByRelay(request, body, secret))) return new Response(null, { status: 401 });

    const delivery = Delivery.parse(JSON.parse(body));

    await answer(ctx, delivery.message, delivery.message.channel_id, delivery.botID);

    return new Response(null, { status: 204 });
  },
} satisfies Webhook<WebhookContext<typeof requirements, "app">, typeof empty, typeof empty>;

export default defineApp(requirements, {
  tools: router(
    { poll },
    {
      title: "Discord mentions",
      description: "Answers mentions of the bot in #opencode with OpenCode, in a thread.",
    },
  ),
  workflows: { reply },
  schedules: { poll: appInterval({ minutes: 10 }, poll, {}) },
  webhooks: { relay },
});
