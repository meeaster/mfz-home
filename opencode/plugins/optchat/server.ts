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
import { markCache, splitView, type TurnParts, viewPrefix, warmBody } from "./cache-marks.js"
import { completedReply, loadedSkills, messageKey, pendingInput, textKey, toLogged } from "./messages.js"
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
  /** Log each turn's prompt parts to plugin.log, to check that the view only grows at its end. */
  logTurns: z.boolean().default(false),
  /**
   * How a new turn reuses the skills and the earlier view from the backend's cache (see cache-marks.ts): `openai`
   * breakpoints for GPT-5.6 and later on the OpenAI API or Azure, `anthropic` cache_control for Claude through LiteLLM
   * or another OpenAI-compatible proxy, `warm` for OpenAI backends that reject marks, such as the ChatGPT login: view
   * blocks go as separate messages and a warm-up request at each turn's end saves the last complete one.
   */
  viewCache: z.enum(["none", "openai", "anthropic", "warm"]).default("none"),
  /**
   * Bytes per view block, of whole lines. By default 5000 for `openai` and `warm`, since OpenAI saves an entry only
   * at least 1,024 tokens past the previous one, and 2048 for `anthropic`, near the gist's 4-line blocks.
   */
  viewCacheBytes: z.number().int().positive().optional(),
})

/** The prompt of a warm-up request, which only identifies it: the model gets the view in its place. */
const WARM_PROMPT = "OptChat warm-up"

type SessionRole = { readonly kind: "primary" } | { readonly kind: "child"; readonly agent: string; readonly title: string; readonly root: string }

interface Turn {
  readonly chat: string
  /** The key of the turn's first message; everything from it on is sent verbatim after the view. */
  readonly start: string
  /** The view, frozen for the whole turn so every call in it shares one cached prefix. */
  readonly view: string
  /** Skills loaded in earlier turns, sent before the view: they change less often than it does. */
  readonly skills: string | undefined
  /** Per-turn state after the view, frozen with it so the turn's steps stay cached. */
  readonly header: string
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

const digest = (text: string): string => createHash("sha1").update(text).digest("hex").slice(0, 8)

// The bytes two texts share from their start.
const sharedPrefix = (before: string, after: string): number => {
  const length = Math.min(before.length, after.length)
  let index = 0

  while (index < length && before[index] === after[index]) index++

  return Buffer.byteLength(before.slice(0, index))
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
    // The previous turn's view and skills in each chat, for logTurns.
    const lastPrompts = new Map<string, { readonly view: string; readonly skills: string }>()

    // Whether the human wrote any of the pending user messages. A background subagent's result or a plugin's note
    // arrives as a synthetic message, which the model request shows as a plain user message; the session's own record
    // tells them apart.
    const humanSpoke = async (sessionID: string, pending: readonly Message[]): Promise<boolean> => {
      const users = pending.filter((message) => message.role === "user")

      if (users.length === 0) return false

      const types = new Map((await ctx.session.context({ sessionID })).map((message) => [message.id, message.type]))

      return users.some((message) => message.id === undefined || types.get(message.id) !== "synthetic")
    }

    // For `warm`: each session's latest turn request body, the view its warm-up is about to send, and the parts of
    // the warm-up request in flight.
    const templates = new Map<string, string>()
    const warmViews = new Map<string, string>()
    const warmParts = new Map<string, TurnParts>()
    let turnLock: Promise<void> = Promise.resolve()
    let stopped = false

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

      const turn: Turn = {
        chat: chat.info.id,
        start: messageKey(messages[start], start, sessionID),
        view: chat.memory.render(),
        skills: loadedSkills(messages.slice(0, start)),
        header: turnHeader(chat, sessionID),
        startTotal: chat.memory.total,
      }

      if (options.logTurns) logTurn(chat.info.id, sessionID, turn)

      activeTurns.set(chat.info.id, sessionID)
      turns.set(sessionID, turn)
      chats.touch(chat)

      return turn
    }

    // One line per turn: the size and hash of each prompt part, and how much of the previous turn's view this one
    // starts with. The cache holds only while `shared` equals the previous view's size.
    const logTurn = (chatID: string, sessionID: string, turn: Turn): void => {
      const skills = turn.skills ?? ""
      const last = lastPrompts.get(chatID)
      const shared = last === undefined ? 0 : sharedPrefix(last.view, turn.view)
      const previous = last === undefined ? 0 : Buffer.byteLength(last.view)
      const skillsChanged = last !== undefined && last.skills !== skills

      lastPrompts.set(chatID, { view: turn.view, skills })
      warn(
        `turn chat=${chatID} session=${sessionID} skills=${Buffer.byteLength(skills)}:${digest(skills)}${skillsChanged ? " (changed)" : ""} ` +
          `view=${Buffer.byteLength(turn.view)} shared=${shared}/${previous} header=${digest(turn.header)}`,
      )
    }

    // Finds the current turn's first message. A new turn starts when the user spoke after a finished reply, or when
    // the session moved to another chat.
    const currentTurn = async (chat: Chat, sessionID: string, messages: readonly Message[]): Promise<{ turn: Turn; start: number }> => {
      const existing = turns.get(sessionID)
      const existingStart = existing === undefined ? -1 : messages.findIndex((message, position) => messageKey(message, position, sessionID) === existing.start)
      const block = pendingInput(messages)
      // Only the human starts a turn: a synthetic message continues it, so the frozen view keeps its cached prefix
      // and the next warm-up covers the result.
      const userSpoke = await humanSpoke(sessionID, messages.slice(block))
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

      return `<turn date="${new Date().toString()}" session="${sessionID}" chat="${name}" chat_id="${chat.info.id}"/>`
    }

    const notOptchat = "This tool only works in a session of the optchat agent."
    const primaryOnly = "This tool only works in the optchat agent's primary session."

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "zoom",
        description:
          "Open the line id+n of the view into the two lines of n/2 under it; n = 1 gives the message whole. To reread a subagent's result, zoom into its report line with n = 1. Pass agent instead only when you need a subagent's working steps: it returns that subagent's whole chat, by its task title, agent name or session ID, which is much longer than its report.",
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
        description: "List the named chats, newest activity first, with their IDs, size, when they were last active and how they started. Names can repeat; the ID identifies a chat.",
        input: z.object({}),
        options: { codemode: false },
        execute: async (_, context) => ({ content: optchatSessions.has(context.sessionID) ? chats.list(context.sessionID) : primaryOnly }),
      })
      editor.add({
        name: "chat_resume",
        description: "Continue an existing chat in this session. From your next step on, the view is that chat's memory and new messages are added to it.",
        input: z.object({ chat: z.string().describe("The ID of the chat to continue, as chat_list shows it, or its name when no other chat has it") }),
        options: { codemode: false },
        execute: async ({ chat }, context) => {
          if (!optchatSessions.has(context.sessionID)) return { content: primaryOnly }

          const turn = turns.get(context.sessionID)
          const result = chats.resume(context.sessionID, chat, (chatID) => activeTurns.get(chatID), turn?.startTotal)

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

      // The prompt is ordered by how often each part changes, so each call reads the longest prefix from the cache:
      // loaded skills change only when another one loads, the view grows every turn, and the header is per turn.
      const head = [Message.user(turn.view), Message.user(turn.header)]

      if (turn.skills !== undefined) head.unshift(Message.user(turn.skills))

      event.messages.splice(0, event.messages.length, ...head, ...current)
      event.system.splice(0, event.system.length, { type: "text", text: SYSTEM }, ...withoutDate(event.system))
    })

    const blockSize = (): number => options.viewCacheBytes ?? (options.viewCache === "anthropic" ? 2048 : 5000)

    // The request body rewritten for the view cache: a turn's request gets its marks or block messages, and a warm-up
    // request is rebuilt from the session's latest turn request, so it shares that request's prefix byte for byte.
    const rewriteFor = (sessionID: string, kind: string, body: string, transport: string): string | undefined => {
      const mode = options.viewCache

      if (mode === "none" || !optchatSessions.has(sessionID)) return undefined

      const size = blockSize()

      if (kind === "primary") {
        const turn = turns.get(sessionID)

        if (turn === undefined) return undefined

        if (mode === "warm" && transport === "http") templates.set(sessionID, body)

        const rewritten = markCache(body, turn, mode, size)

        if (options.logTurns) warn(`view cache session=${sessionID} via=${transport} mode=${mode} rewritten=${rewritten !== undefined}`)

        return rewritten
      }

      const parts = warmParts.get(sessionID)
      const template = templates.get(sessionID)

      if (kind !== "generate" || parts === undefined || template === undefined || !body.includes(WARM_PROMPT)) return undefined

      warmParts.delete(sessionID)

      const warm = warmBody(template, parts, size)

      if (options.logTurns) warn(`warm-up session=${sessionID} view=${Buffer.byteLength(parts.view)} skills=${Buffer.byteLength(parts.skills ?? "")} sent=${warm !== undefined}`)

      return warm
    }

    // At a turn's end, a warm-up request ending at the last complete view block saves a cache entry there, which the
    // next turn's request shares. It is sent as the session's own generate request, so it carries the session's
    // model, cache key and affinity headers; the `generate` hook and `rewriteFor` give it its content.
    const warmUp = async (sessionID: string): Promise<void> => {
      const chat = chatOfSession(sessionID)

      if (chat === undefined) return

      if (!templates.has(sessionID)) {
        warn(`no HTTP turn request to warm from in session ${sessionID}`)

        return
      }

      // Sent at once, with only the lines whose summaries are written: waiting for the rest would let a quick next
      // turn start first, and the entry serves whichever turn comes.
      const view = viewPrefix(chat.memory.render(), chat.memory.builtLines())

      // A short chat has nothing stable to save yet, unless skills are loaded.
      if (turns.get(sessionID)?.skills === undefined && !splitView(view, blockSize()).some((block) => block.complete)) return

      warmViews.set(sessionID, view)

      try {
        const result = await ctx.session.generate({ sessionID, prompt: WARM_PROMPT })

        if (options.logTurns) warn(`warm-up session=${sessionID} replied ${result.text.length} chars`)
      } catch (error) {
        warn(`warm-up failed in session ${sessionID}: ${String(error)}`)
      } finally {
        warmViews.delete(sessionID)
        warmParts.delete(sessionID)
      }
    }

    await ctx.session.hook("generate", (event) => {
      const view = warmViews.get(event.sessionID)
      const last = event.messages.at(-1)
      const prompt = last?.role === "user" && last.content.length === 1 && last.content[0]?.type === "text" ? last.content[0].text : undefined

      if (view === undefined || prompt !== WARM_PROMPT) return

      // The next turn's skills: everything loaded in the session so far. The body is replaced on the way out, so the
      // history and system prompt needn't be lowered.
      warmParts.set(event.sessionID, { view, skills: loadedSkills(event.messages.slice(0, -1)) })
      event.messages.splice(0, event.messages.length, Message.user(WARM_PROMPT))
      event.system.splice(0, event.system.length)
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

        const rewritten = rewriteFor(event.sessionID, event.kind, event.frame, "ws")

        if (rewritten !== undefined) event.frame = rewritten
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

    // Any provider: at work the model is reached through a LiteLLM provider, not `openai`.
    if (options.viewCache !== "none") {
      await ctx.session.hook(
        "http.request",
        async (event) => {
          const body = rewriteFor(event.sessionID, event.kind, await event.request.clone().text(), "http")

          if (body === undefined) return

          const headers = new Headers(event.request.headers)

          headers.delete("content-length")
          event.request = new Request(event.request, { body, headers })
        },
      )
    }

    // A turn's final reply has no later model call to observe it, and a finished turn frees its chat.
    const iterator = ctx.event.subscribe()[Symbol.asyncIterator]()

    void (async () => {
      try {
        for (let next = await iterator.next(); next.done !== true && !stopped; next = await iterator.next()) {
          const event = next.value

          if (event.type === "session.execution.succeeded" || event.type === "session.execution.failed" || event.type === "session.execution.interrupted") {
            const chatID = turns.get(event.data.sessionID)?.chat

            if (chatID !== undefined && activeTurns.get(chatID) === event.data.sessionID) {
              activeTurns.delete(chatID)

              if (options.viewCache === "warm") void warmUp(event.data.sessionID)
            }

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

    // OpenCode waits for this cleanup before a reload finishes, and the stream's pending next() may wait for another
    // event to arrive. So the loop is told to stop rather than awaited; it exits at its next event, before touching a
    // closed chat.
    return async () => {
      stopped = true
      void iterator.return?.()
      chats.close()
    }
  },
})
