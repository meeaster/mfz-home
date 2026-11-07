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
  type WorkflowContext,
  type WorkflowStepContext,
} from "apps";
import { messagesAfter, me, post, threadOn, type Discord } from "./discord.js";
import { sessionResult, startSession, type Client } from "./opencode.js";
import { discord, opencode } from "./providers.js";

// #opencode in the chewy-notifications server, and the only person whose mentions start a session:
// a session runs with full access to this machine.
const channelID = "1550738885615554621";
const ownerID = "94119099977695232";

// Sessions use the OpenCode client's default model.
const session = { directory: "/home/mark/workspace" };

const pollInterval = "15 seconds";
const maxPolls = 120; // Thirty minutes at the poll interval.

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

    const threadID = await step.do("thread", once, async (ctx) =>
      threadOn(discordClient(ctx), channelID, mention.messageID, mention.prompt || "OpenCode"),
    );

    const { sessionID } = await step.do("session", once, async (ctx) =>
      startSession(opencodeClient(ctx), {
        ...session,
        prompt: mention.prompt,
        title: `Discord: ${mention.prompt.slice(0, 60)}`,
      }),
    );

    for (let poll = 1; poll <= maxPolls; poll += 1) {
      await step.sleep(`wait ${poll}`, pollInterval);

      const result = await step.do(`check ${poll}`, async (ctx) =>
        sessionResult(opencodeClient(ctx), sessionID),
      );

      if (result.running) continue;

      const text =
        result.reply ??
        `OpenCode finished (${result.outcome ?? "unknown"}) without a reply${result.error === undefined ? "." : `: ${result.error}`}`;

      await step.do("reply", once, async (ctx) => post(discordClient(ctx), threadID, text));

      return null;
    }

    await step.do("timeout", once, async (ctx) =>
      post(
        discordClient(ctx),
        threadID,
        `OpenCode session ${sessionID} was still running after thirty minutes; check it in OpenCode.`,
      ),
    );

    throw new NonRetryableError(`OpenCode session ${sessionID} was still running after thirty minutes`);
  },
);

// Reads #opencode since the last poll and starts one reply per new mention from the owner.
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
    const mentions = messages.filter(
      (message) =>
        message.author.id === ownerID &&
        message.author.bot !== true &&
        message.mentions.some((mentioned) => mentioned.id === bot.id),
    );

    // The message ID as the run key makes a repeated poll find the same run instead of starting another.
    for (const message of mentions) {
      await ctx.workflows.start({
        workflow: "reply",
        key: `mention-${message.id}`,
        input: {
          messageID: message.id,
          prompt: message.content.replaceAll(new RegExp(`<@!?${bot.id}>`, "g"), "").trim(),
        },
      });
    }

    if (newest !== undefined)
      ctx.sql.exec(
        "UPDATE cursors SET last_message_id = ? WHERE channel_id = ?",
        newest,
        channelID,
      );

    return { started: mentions.length };
  },
);

export default defineApp(requirements, {
  tools: router(
    { poll },
    {
      title: "Discord mentions",
      description: "Answers mentions of the bot in #opencode with OpenCode, in a thread.",
    },
  ),
  workflows: { reply },
  schedules: { poll: appInterval({ minutes: 1 }, poll, {}) },
});
