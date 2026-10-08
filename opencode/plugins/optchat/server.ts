// OptChat for OpenCode: an `optchat` primary agent whose sessions run on a chat that never ends. Each turn starts
// from a bounded view of one-line summaries of the whole chat instead of its full history; a cheap model writes
// the summaries in the background, and the agent zooms into them for detail.

import { appendFileSync, mkdirSync } from "node:fs"
import { createHash } from "node:crypto"
import { homedir } from "node:os"
import { join } from "node:path"
import { Message } from "@opencode/ai"
import { Plugin } from "@opencode/plugin"
import { z } from "zod"
import { type Chat, Chats } from "./chats.js"
import { Memory } from "./memory.js"
import { completedReply, messageKey, textKey, toLogged } from "./messages.js"
import { SUBAGENT, SYSTEM } from "./prompt.js"

const AGENT = "optchat"

/** Tools for optchat sessions and their subagents; the chat tools are for the primary session only. */
const VIEW_TOOLS = ["zoom", "date"]

const CHAT_TOOLS = ["chat_rename", "chat_list", "chat_resume"]

const Options = z.object({
  /** Where chats are stored; defaults to `$XDG_DATA_HOME/optchat` (`~/.local/share/optchat`). */
  dataDir: z.string().optional(),
  /** The model that writes summaries. */
  compactor: z
    .object({ providerID: z.string(), id: z.string(), variant: z.string().optional() })
    .default({ providerID: "openai", id: "gpt-6-luna", variant: "high" }),
  /** The view grows to `viewHigh` bytes, then one batch of merges brings it back to `viewLow`. */
  viewHigh: z.number().int().positive().default(128_000),
  viewLow: z.number().int().positive().default(64_000),
  /** The smaller view summary calls (and, by default, subagents) see. */
  compactionHigh: z.number().int().positive().default(32_000),
  compactionLow: z.number().int().positive().default(16_000),
  /** Summary calls in flight at once. */
  concurrency: z.number().int().positive().default(8),
  /** How long a turn waits for earlier messages to be summarized before it starts anyway. */
  waitMs: z.number().int().positive().default(120_000),
  /** What subagents of an optchat session start from. */
  subagentView: z.enum(["compaction", "full", "none"]).default("compaction"),
})

type SessionRole = { readonly kind: "primary" } | { readonly kind: "child"; readonly agent: string; readonly title: string; readonly root: string }

interface Turn {
  readonly chat: string
  /** The key of the turn's first message; everything from it on is sent verbatim after the view. */
  readonly start: string
  /** The view, frozen for the whole turn so every call in it shares one cached prefix. */
  readonly view: string
  /** Messages in the chat when the turn started. */
  readonly startTotal: number
}

interface RequestParts {
  system: { type: "text"; text: string }[]
  messages: Message[]
}

const CacheKeyed = z.looseObject({ prompt_cache_key: z.string() })

// OpenCode's system prompt carries today's date; the view's cached prefix must not change daily.
const DATE_LINE = /^Today's date: .*$\n?/m

const withoutDate = (system: readonly { type: "text"; text: string }[]) => system.map((part) => ({ ...part, text: part.text.replace(DATE_LINE, "") }))

const hide = <Tool>(tools: Record<string, Tool>, names: readonly string[]): void => {
  for (const name of names) delete tools[name]
}

const defaultDataDir = (): string => join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "optchat")

export default Plugin.define({
  id: "optchat",
  async setup(ctx) {
    const options = Options.parse(ctx.options)
    const directory = options.dataDir ?? defaultDataDir()

    mkdirSync(directory, { recursive: true })

    const warn = (message: string): void => appendFileSync(join(directory, "plugin.log"), `${new Date().toISOString()} ${message}\n`)

    // Editor updates create a missing agent from OpenCode's defaults.
    await ctx.agent.transform((editor) => {
      editor.update(AGENT, (agent) => {
        agent.mode = "primary"
        agent.description = "A chat that never ends: each turn starts from a bounded summary view of the whole chat instead of its full history."
      })
    })

    const { providerID, id, variant } = options.compactor
    const compactor = variant === undefined ? { providerID, id } : { providerID, id, variant }

    const chats = new Chats(directory, (store) =>
      new Memory({
        store,
        budget: { viewHigh: options.viewHigh, viewLow: options.viewLow, compactionHigh: options.compactionHigh, compactionLow: options.compactionLow },
        concurrency: options.concurrency,
        generate: async (prompt) => (await ctx.generate.text({ prompt, model: compactor })).text,
        report: warn,
      }),
    )

    const sessions = new Map<string, SessionRole>()
    const optchatSessions = new Set<string>()
    const turns = new Map<string, Turn>()
    // One active turn per chat: chat ID -> the session running a turn in it.
    const activeTurns = new Map<string, string>()
    const subagentViews = new Map<string, string>()
    let turnLock: Promise<void> = Promise.resolve()

    const roleOf = async (sessionID: string): Promise<SessionRole> => {
      const known = sessions.get(sessionID)

      if (known !== undefined) return known

      const session = await ctx.session.get({ sessionID })
      let root = session

      while (root.parentID !== undefined) root = await ctx.session.get({ sessionID: root.parentID })

      const role: SessionRole =
        session.parentID === undefined
          ? { kind: "primary" }
          : { kind: "child", agent: session.agent ?? "subagent", title: session.title ?? sessionID, root: root.id }

      sessions.set(sessionID, role)

      return role
    }

    /** The chat a session reads: its own for an optchat session, its root's for a subagent of one. */
    const chatOfSession = (sessionID: string): Chat | undefined => {
      const role = sessions.get(sessionID)
      const owner = role?.kind === "child" ? role.root : sessionID

      return optchatSessions.has(owner) ? chats.forSession(owner, ctx.location.directory) : undefined
    }

    const labelIn = (chat: Chat) => (sessionID: string): string | undefined => chat.subagents.label(sessionID)

    const log = (chat: Chat, messages: readonly Message[], from: number, to: number, sessionID: string): void => {
      for (let position = from; position < to; position++) {
        const message = messages[position]

        if (message === undefined) continue

        for (const entry of toLogged(message, position, sessionID, labelIn(chat))) {
          if (!chat.memory.has(entry.source)) chat.memory.append(entry.kind, entry.text, entry.source)
        }
      }
    }

    const startTurn = async (chat: Chat, sessionID: string, messages: readonly Message[], start: number): Promise<Turn> => {
      log(chat, messages, 0, start, sessionID)

      const ready = await chat.memory.waitFor(chat.memory.total, options.waitMs)

      if (!ready) warn(`a turn in ${chat.info.id} started before ${chat.memory.total} messages were all summarized`)

      const turn: Turn = { chat: chat.info.id, start: messageKey(messages[start], start, sessionID), view: chat.memory.render(), startTotal: chat.memory.total }

      activeTurns.set(chat.info.id, sessionID)
      turns.set(sessionID, turn)
      chats.touch(chat)

      return turn
    }

    // Finds the current turn's first message. A new turn starts when the user spoke after a finished reply, or when
    // the session moved to another chat.
    const currentTurn = async (chat: Chat, sessionID: string, messages: readonly Message[]): Promise<{ turn: Turn; start: number }> => {
      const existing = turns.get(sessionID)
      const existingStart = existing === undefined ? -1 : messages.findIndex((message, position) => messageKey(message, position, sessionID) === existing.start)
      let block = messages.length

      while (block > 0 && messages[block - 1]?.role === "user") block--

      const userSpoke = block < messages.length
      const fresh = existing === undefined || existing.chat !== chat.info.id || existingStart < 0 || (userSpoke && block > existingStart && completedReply(messages[block - 1]))

      if (existing !== undefined && !fresh) return { turn: existing, start: existingStart }

      const start = userSpoke ? block : Math.max(0, messages.findLastIndex((message) => message.role === "user"))
      const run = turnLock.then(() => startTurn(chat, sessionID, messages, start))

      turnLock = run.then(
        () => undefined,
        () => undefined,
      )

      return { turn: await run, start }
    }

    // Per-turn state goes after the view, never in the system prompt, so the prompt stays cached.
    const turnHeader = (chat: Chat, sessionID: string): string => {
      const name = chat.info.name ?? "unnamed: once its topic is clear, give it a short name with chat_rename"

      return `<turn date="${new Date().toString()}" session="${sessionID}" chat="${name}"/>`
    }

    const notOptchat = "This tool only works in a session of the optchat agent."
    const primaryOnly = "This tool only works in the optchat agent's primary session."

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "zoom",
        description:
          "Open the line id+n of the view into the two lines of n/2 under it; n = 1 gives the message whole. Pass agent instead to get a subagent's whole chat, by its task title, agent name or session ID.",
        input: z.object({
          id: z.number().int().min(0).optional().describe("First message of the line"),
          n: z.number().int().min(1).optional().describe("Messages the line covers, a power of 2"),
          agent: z.string().optional().describe("A subagent's task title, agent name or session ID"),
        }),
        options: { codemode: false },
        execute: async ({ id, n, agent }, context) => {
          const chat = chatOfSession(context.sessionID)

          if (chat === undefined) return { content: notOptchat }

          if (agent !== undefined) return { content: chat.subagents.render(agent) }

          if (id === undefined || n === undefined) return { content: "zoom: pass id and n, or agent" }

          return { content: chat.memory.zoom(id, n) }
        },
      })
      editor.add({
        name: "date",
        description: "The date and time of message id.",
        input: z.object({ id: z.number().int().min(0) }),
        options: { codemode: false },
        execute: async ({ id }, context) => {
          const chat = chatOfSession(context.sessionID)

          return { content: chat === undefined ? notOptchat : chat.memory.date(id) }
        },
      })
      editor.add({
        name: "chat_rename",
        description: "Name or rename the current chat. Use a short, descriptive name (2 to 5 words) once the chat's topic is clear, or when the user asks.",
        input: z.object({ name: z.string().describe("The chat's new name") }),
        options: { codemode: false },
        execute: async ({ name }, context) => ({ content: optchatSessions.has(context.sessionID) ? chats.rename(context.sessionID, name) : primaryOnly }),
      })
      editor.add({
        name: "chat_list",
        description: "List the named chats, newest activity first, with their size, when they were last active and how they started.",
        input: z.object({}),
        options: { codemode: false },
        execute: async (_, context) => ({ content: optchatSessions.has(context.sessionID) ? chats.list(context.sessionID) : primaryOnly }),
      })
      editor.add({
        name: "chat_resume",
        description: "Continue an existing named chat in this session. From your next step on, the view is that chat's memory and new messages are added to it.",
        input: z.object({ name: z.string().describe("The name of the chat to continue, as chat_list shows it") }),
        options: { codemode: false },
        execute: async ({ name }, context) => {
          if (!optchatSessions.has(context.sessionID)) return { content: primaryOnly }

          const turn = turns.get(context.sessionID)
          const result = chats.resume(context.sessionID, name, (chatID) => activeTurns.get(chatID), turn?.startTotal)

          if (turn !== undefined && chats.chatIdOf(context.sessionID) !== turn.chat) activeTurns.delete(turn.chat)

          return { content: result }
        },
      })
    })

    // A subagent is a fresh call that starts with the view, frozen when it spawned, then its own task and steps.
    const subagentRequest = (chat: Chat, sessionID: string, role: SessionRole & { kind: "child" }, request: RequestParts): void => {
      chat.subagents.register(sessionID, role.agent, role.title)

      request.messages.forEach((message, position) => {
        for (const entry of toLogged(message, position, sessionID, labelIn(chat))) chat.subagents.append(sessionID, entry)
      })

      const view = subagentViews.get(sessionID) ?? (options.subagentView === "full" ? chat.memory.render() : chat.memory.renderCompaction())

      subagentViews.set(sessionID, view)
      request.messages.unshift(Message.user(view))
      request.system.splice(0, request.system.length, { type: "text", text: SUBAGENT }, ...withoutDate(request.system))
    }

    await ctx.session.hook("context", async (event) => {
      const role = await roleOf(event.sessionID)

      if (role.kind === "child") {
        const chat = optchatSessions.has(role.root) ? chatOfSession(event.sessionID) : undefined

        if (chat === undefined || options.subagentView === "none") {
          hide(event.tools, [...VIEW_TOOLS, ...CHAT_TOOLS])

          return
        }

        hide(event.tools, CHAT_TOOLS)
        subagentRequest(chat, event.sessionID, role, event)

        return
      }

      if (event.agent !== AGENT) {
        hide(event.tools, [...VIEW_TOOLS, ...CHAT_TOOLS])

        return
      }

      optchatSessions.add(event.sessionID)

      const chat = chats.forSession(event.sessionID, ctx.location.directory)

      if (chat === undefined) {
        warn(`the chat for session ${event.sessionID} is open in another OpenCode process; this request ran without OptChat`)
        hide(event.tools, [...VIEW_TOOLS, ...CHAT_TOOLS])

        return
      }

      const { turn, start } = await currentTurn(chat, event.sessionID, event.messages)

      log(chat, event.messages, start, event.messages.length, event.sessionID)

      const current = event.messages.slice(start)

      event.messages.splice(0, event.messages.length, Message.user(turn.view), Message.user(turnHeader(chat, event.sessionID)), ...current)
      event.system.splice(0, event.system.length, { type: "text", text: SYSTEM }, ...withoutDate(event.system))
    })

    // OpenAI's prompt cache, and the ChatGPT backend's session affinity, should follow the chat rather than the
    // OpenCode session, so a resumed chat reuses its cached view. Both hooks are experimental OpenCode APIs.
    const cacheKeyFor = (sessionID: string, kind: string): string | undefined => {
      const chatID = kind === "primary" && optchatSessions.has(sessionID) ? chats.chatIdOf(sessionID) : undefined

      return chatID === undefined ? undefined : `optchat-${createHash("sha1").update(chatID).digest("hex").slice(0, 24)}`
    }

    await ctx.session.hook(
      "experimental.ws.send",
      (event) => {
        const key = cacheKeyFor(event.sessionID, event.kind)

        if (key === undefined) return

        const frame = CacheKeyed.safeParse(JSON.parse(event.frame))

        if (frame.success) event.frame = JSON.stringify({ ...frame.data, prompt_cache_key: key })
      },
      { providerID: "openai" },
    )

    await ctx.session.hook(
      "experimental.ws.handshake",
      (event) => {
        const key = cacheKeyFor(event.sessionID, event.kind)

        if (key === undefined) return

        for (const name of ["x-session-affinity", "session-id", "x-session-id"]) {
          if (name in event.headers) event.headers[name] = key
        }
      },
      { providerID: "openai" },
    )

    // A turn's final reply has no later model call to observe it, and a finished turn frees its chat.
    const iterator = ctx.event.subscribe()[Symbol.asyncIterator]()

    const consumer = (async () => {
      try {
        for (let next = await iterator.next(); next.done !== true; next = await iterator.next()) {
          const event = next.value

          if (event.type === "session.execution.succeeded" || event.type === "session.execution.failed" || event.type === "session.execution.interrupted") {
            const chatID = turns.get(event.data.sessionID)?.chat

            if (chatID !== undefined && activeTurns.get(chatID) === event.data.sessionID) activeTurns.delete(chatID)

            continue
          }

          if (event.type !== "session.text.ended") continue

          const chat = chatOfSession(event.data.sessionID)

          if (chat === undefined) continue

          const source = textKey(event.data.assistantMessageID, event.data.text)

          if (sessions.get(event.data.sessionID)?.kind === "child") chat.subagents.append(event.data.sessionID, { kind: "agent", text: event.data.text, source })
          else if (!chat.memory.has(source)) chat.memory.append("agent", event.data.text, source)
        }
      } catch (error) {
        warn(`event stream ended: ${String(error)}`)
      }
    })()

    return async () => {
      await iterator.return?.()
      await consumer
      chats.close()
    }
  },
})
