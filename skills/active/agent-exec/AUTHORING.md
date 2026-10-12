# agent-exec

## Intent

Let one agent drive another harness's CLI (Claude Code, OpenCode, Codex): run work or a review on a different harness or model, keep talking to that session, or inspect what models it offers. A common case is planning in one harness and implementing in another without switching tools. Other workflows can build on it; it's a primitive alongside `agent-sessions`.

Not for: making external CLIs the default way to delegate, replacing native subagents, or doing review, planning, or session archaeology itself.

Success: the named harness runs with the requested model, effort, and permissions; the caller gets the final answer and a continuation handle, not the trace; runs don't hang; disposable sessions are cleaned up.

## Scenarios

- **Natural request**: "run Codex with GPT high to implement this" or "have Claude Code with Opus review this". Picks the harness, model, and effort, infers permissions from the verb, and returns the answer and handle.
- **Continue a session**: uses the given handle, not "latest", and keeps the model unless told otherwise.
- **Agent's own CLI test**, such as a scripted multi-turn plugin probe: loads before the first CLI call even though the user never named a CLI.
- **"Use an explore subagent"** or "get another agent's opinion": doesn't invoke; a native subagent is the answer.
- **OpenCode config or skill change to test**: stays in the current session after reload, or uses a native subagent when clean context matters; no CLI.
- **Clean-room run** without the user's config or project config: works with the user's existing logins, keeps the same environment for continuation.
- **Cross-harness chains**: Claude Code calling OpenCode or Codex, and Codex calling the others.
- **Background or scripted run**: completes or fails on its own instead of waiting on stdin.

## Decisions

- **A skill, not a plugin** (human, 2026-07-09). `openai/codex-plugin-cc` bundles agents, commands, and hooks, but the use case is just guiding an agent through another CLI, and a skill stays portable across harnesses.
- **Model-invoked, triggered by the CLI about to run** (human, 2026-07-09; widened 2026-10-10). The human asks in plain language ("run Claude Code with Opus…") and shouldn't have to name the skill. On 2026-10-10 an agent ran `opencode run` without loading it and hung on stdin, so any agent-chosen CLI invocation now triggers it too.
- **Subagent requests must not trigger it.** On 2026-07-09 "use an explore subagent" invoked it and the human had to correct the agent.
- **Named `agent-exec`** (human), chosen over "harness relay", which doesn't match how the human phrases these requests.
- **Say that CLI runs start the target's primary agent** (human, 2026-07-09). Agents described them as subagents.
- **Return only the final answer and handle** (human, 2026-07-09). Early runs streamed every step back into the parent's context.
- **Don't restrict tools by default.** A test with `--tools ""` couldn't load the Claude Code docs skill it needed (2026-07-09).
- **Delete disposable test sessions** (human, 2026-07-10), so probes don't mix into the human's real session history.
- **Clean room means redirected state plus copied auth, not a container** (human, 2026-07-14). The goal is an easy local run that reuses existing logins without API keys. It isn't a security boundary.
- **Harness references aren't named `CLAUDE.md`, `OPENCODE.md`, or `CODEX.md`** (2026-07-14). Harnesses load files with those names as instructions.
- **Portable** (human, 2026-09-12). Usable by a coworker without this setup: no references to Mindframe-Z, say "a temporary directory" rather than a path. Guide and nudge; don't script tool use the model already handles.
- **OpenCode tests stay in the current session first** (human, 2026-08-18). OpenCode V2 hot-reloads skills, agents, and config, and rebuilds reloadable context before each model attempt. An earlier same-day version preferred native subagents and was reversed. A CLI run is justified only when CLI, client startup, connection, isolation, or top-level-session behavior is what's under test.

## Sources

| Source | Revision | Local use |
|---|---|---|
| OpenCode V2 source and [docs](https://opencode.ai/v2/docs) | source `7c5a4d01` (`v2.0.2`); stdin and `serve` behavior rechecked on `v2.0.26`, 2026-10-10 | `references/opencode.md`, `references/opencode-reload.md`. The reload claims carry no pinned source revision; verify them against source on the next version refresh |
| [Claude Code CLI](https://code.claude.com/docs) and model docs | read 2026-07-09, rechecked 2026-10-10 | `references/claude-code.md` |
| Codex CLI ([OpenAI docs](https://developers.openai.com/codex)) | read 2026-07-09 | `references/codex.md` |
| [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) | studied 2026-07-09 | Background for the context-packet and handle design; not adopted |
