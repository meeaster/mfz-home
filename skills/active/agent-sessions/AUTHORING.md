# agent-sessions

## Intent

The general way to get evidence out of prior agent sessions in any harness: find a session, outline it, answer a question from it, reconstruct what happened, audit it, read it incrementally, or price an OpenCode session tree. Used directly and as the evidence layer for other workflows such as Session Brief.

Not for: current-session work, handoffs, captures, threads, or other artifacts built from the evidence; forcing every harness into one schema; reading hidden reasoning; reproducing provider invoices.

Success: a narrow question gets a bounded answer with native locators; an exhaustive request can't finish with silent gaps; a refreshing consumer gets a deterministic checkpoint and either an append-only delta or an explicit rebuild; cost output is a recursive, per-model estimate labeled as current-catalog pricing.

## Scenarios

- **Locate**: "find my OpenCode session about deployment failures".
- **Reconstruct or audit**: a session and every child that contributed, or whether a prior agent followed its instructions; complete coverage or visible gaps.
- **Narrow investigation** of one failed tool with a supplied database path: read-only, bounded, question-shaped queries; no detour through the snapshot adapter.
- **One parent and all descendants in a multi-GB database**: work stays proportional to the requested scope.
- **No database path**: uses the authenticated API and reports an unavailable service as a gap rather than guessing a path.
- **Decisions across compactions**: separates full projected history from the active context after the latest compaction.
- **Refreshing consumer**: snapshot, no-op delta, append-only delta, and `rebuild_required` for any edit, deletion, child-set, topology, source, or compaction change.
- **Cost of a session and its subagents**, including what reusing a session or resumed subagent cost compared with its first request.
- **Supplied Claude Code store**, then incremental reading after a saved position.
- **Adjacent requests** (continue implementing, write a handoff from current context, create a capture, ingest into a thread): the owning workflow keeps the job.

## Decisions

- **One general skill with modes** (human, 2026-08-08). It should serve any kind of session exploration and analysis, and narrow questions shouldn't pay for a complete audit.
- **Coverage ledger and completion gate.** A live Explore run gave an accurate but incomplete first report to an exhaustive request and presented it as finished (2026-08-08).
- **OpenCode is SQL-first** (human, 2026-08-18 and 2026-08-19). Models compose SQL well, and it gives them room to retrieve what the question needs; the CLI suits only quick session details. An OpenCode V2 revision drifted to CLI-first and was reversed. The API is the fallback when the database path is unknown.
- **Hint, don't script** (human, 2026-09-16). Let models choose their own tool calls; the guidance only points at places where models went wrong. A review of past sessions found SQL that joined across the whole message table before narrowing to the requested sessions. On the live 7 GB store, the scope-first cost query took 0.14 s against roughly 8 s for the message-first join, which is why the skill warns about proportional work without prescribing a query.
- **Cost is broken down by request cycle and compaction window, with child assignments attributed to the parent** (human, 2026-09-23). The human wanted to know what reusing a session or resumed subagent costs compared with starting fresh. Cache use isn't attributed to individual context sources because it can't be measured reliably; delivery lengths are rough estimates only.
- **No environment variables or `$STORE` variable; default `~/.claude`, the user names any other store** (human, 2026-07-09). Variable assignments change the shell text that permission systems match, causing prompts and denials. The only consumer that set the variable, a Mindframe-Z thread pipeline, stopped using this skill.
- **Portable** (human, 2026-07-09 and 2026-09-12). Shared with people who don't use Mindframe-Z: no references to it or to this machine.
- **Harness references aren't named `CLAUDE.md` or `OPENCODE.md`.** Claude Code would load such a file as directory instructions.
- **Session Brief consumes the snapshot and delta checkpoint.** A checkpoint format change needs a matching `session-brief` update before the adapter refresh counts as compatible.
- **OpenCode V2 only since 2026-09-02.** The V1 store is no longer in use; earlier V1 adapter experiments don't validate the current adapter.

## Sources

| Source | Revision | Local use |
|---|---|---|
| OpenCode source: `packages/core/src/session/{sql,history,projector}.ts`, `packages/core/src/database/{schema.gen,database}.ts`, `packages/util/src/global-roots.ts`, `packages/cli/src/{server-process,database-path}.ts`, `packages/cli/src/commands/handlers/{debug/paths,session/delete}.ts`, `packages/protocol/src/groups/{session,message}.ts`, `packages/server/src/handlers/message.ts`, `packages/core/src/bus.ts` | `7c5a4d01` (`v2.0.2`) | `references/opencode.md` and both scripts. Recheck these before changing table or column names, path resolution, pagination, compaction boundaries, update or event semantics, or fork behavior |
| [models.dev](https://models.dev/api.json) catalog | fetched at run time | Cost script pricing; current-catalog estimates, not billing |
| Claude Code JSONL store | observed layout; no published schema | `references/claude-code.md`; confirm live files before relying on the map |
