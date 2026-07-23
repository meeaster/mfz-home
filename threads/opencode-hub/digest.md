# Digest — opencode-hub

## Current State
The foundation lives in `/home/mark/workspace/repos/opencode-hub`. It has an external SQLite ledger as workflow authority, an OpenCode adapter, transcript summarization, a digest-pinned container runtime, persistent background `opencode serve`, Herdr integration, and validation tests. OpenCode sessions retain conversation state and evidence but do not own jobs, acceptance, assignments, deadlines, or authorization.

Interactive agents run as direct OpenCode processes inside their visible Herdr panes. The persistent background server is reserved for optional API and web use and runs without `HERDR_*` variables. `Hub` contains the persistent `Assistant` (`operator`), while `Quick Tasks` contains disposable agents. Interactive sessions still use legacy session endpoints because OpenCode `1.18.4` attached TUIs do not consume V2 history.

The runtime uses OpenCode `1.18.4`, Herdr `0.7.4`, Node `26.5.0`, pnpm `11.14.0`, and Python `3.13.5` on digest-pinned `debian:13-slim`. Remote Tailscale-to-Windows-to-Docker SSH operation was validated. Remote pane dispatch uses `pnpm hub:remote ...` through `docker compose exec`, since `herdr --remote` cannot be combined with pane or tab commands. Duplicate Herdr plugin loading was fixed by giving `/home/hub/.config/opencode` its own directory rather than symlinking it.

## Components
- **Workflow foundation** — SQLite ledger owns jobs, attempts, retries, source identity, watermarks, validation evidence, and acceptance boundaries · implemented in the independent repository.
- **Session ingestion** — retrieves and normalizes transcripts for pre-redaction, token budgeting, message-boundary splitting, stable source identity, and summarization · summarizer implemented; deterministic artifact validation remains outstanding.
- **Interactive agents** — direct OpenCode processes hosted in Herdr panes so agents inherit genuine pane context · persistent operator and disposable quick-task topology established.
- **Background service** — one persistent `opencode serve` instance for optional API and web access · retained outside Herdr and isolated from Herdr environment variables.
- **Remote runtime** — digest-pinned Debian container with SSH-based remote operation and a dedicated dispatch command · validated, with endpoint and key authorization as operational dependencies.
- **Cross-cutting** — human acceptance remains separate from execution, validation, publication, and model-produced summaries; sessions are evidence rather than workflow authority.

## Direction
Implement the deterministic validator for transcript-summary artifacts. Continue using legacy interactive session endpoints until attached TUIs consume V2 history, then reassess migration. Add a cross-process Herdr control bridge only if agents actually require remote pane control. Preserve and verify access through `grif.atlas-chicken.ts.net:2223` and authorization for the `mark@LAPTOP-QI24P2AC` public key. Resume implementation and design work in `/home/mark/workspace/repos/opencode-hub`, with `VISION.md` as the maintained design reference.

## Open Questions
None.

## Key Decisions
- Use OpenCode as the preferred harness to avoid OpenAI-system lock-in. Eve remains a future option only if durable waits, callbacks, checkpointed multi-day state, compensation, or heterogeneous runtimes prove necessary.
- Keep workflow authority in an external SQLite ledger; OpenCode sessions provide evidence and conversation state but do not own jobs or acceptance.
- Keep human acceptance separate from execution, validation, ingestion, and publication.
- Make the transcript summarizer tool-less and directly invocable over caller-supplied transcripts. It must not invent decisions, owners, deadlines, completion, authorization, or acceptance.
- Retain one persistent `opencode serve`, but use it only as a background service for optional API and web access.
- Run interactive agents as direct OpenCode processes in Herdr panes rather than as server-side agents attached through TUIs.
- Use legacy `client.session.create` and `client.session.promptAsync` for interactive sessions until attached TUIs support V2 history.
- Use digest-pinned `debian:13-slim` rather than Alpine for glibc compatibility and general development tooling.
- Dispatch remote workspace operations through `pnpm hub:remote ...` and `docker compose exec`.
- Keep the background server free of `HERDR_*` variables while direct agents inherit their real pane context.
- Use a distinct OpenCode configuration directory to prevent duplicate Herdr plugin discovery.
- Ingest only `opencode:ses_079e814beffeNl4LzJ3kYM1phW` into the `opencode-hub` thread.

## Design
```text
Remote client
    |
    | Tailscale / SSH :2223
    v
Docker runtime: opencode-hub
    |
    +-- Herdr
    |     +-- Hub
    |     |     `-- Assistant (operator)
    |     |           `-- direct OpenCode process
    |     `-- Quick Tasks
    |           `-- disposable direct OpenCode processes
    |
    +-- opencode serve
    |     `-- background API/web service, no HERDR_* context
    |
    +-- pnpm hub:remote
    |     `-- remote pane/tab dispatch via docker compose exec
    |
    +-- Session ingestion
    |     `-- retrieve -> normalize -> redact -> budget/split -> summarize
    |
    `-- SQLite ledger
          `-- jobs, attempts, retries, evidence, watermarks, acceptance

OpenCode sessions ----------------------> conversation state and evidence
Human acceptance ----------------------> separate authority boundary
```

## Intent
The user wants OpenCode sessions exported and summarized at ingestion while retaining control over the agent runner. The system should preserve useful conversational evidence without allowing ingestion or model output to create commitments, assignments, deadlines, authorization, or acceptance. Choosing OpenCode is intended to avoid dependence on an OpenAI-specific orchestration system.

## Vision
The Hub is intended to become a persistent operating environment centered on a personal `Assistant` agent, with separate space for disposable quick tasks and room for longer development work. The topology shifted from interactive sessions attached to a persistent server toward direct pane-local OpenCode processes, while preserving the server as optional background infrastructure. More elaborate orchestration through Eve remains an aspiration only if concrete durability or heterogeneous-runtime requirements emerge.

## Perspective
The user prefers an independently controlled, portable agent runner over an ingestion path optimized around another framework. They value a visible workspace where an agent's process and Herdr context correspond to the pane the operator is actually using. Their questions about whether the OpenCode server should be separate from Herdr led to a clear separation: pane-local processes for interaction and a context-free server for background access. They favor adding orchestration complexity only in response to demonstrated requirements rather than adopting it preemptively.

## Sources
- OpenCode installation documentation — https://opencode.ai/install
- OpenCode repository — https://github.com/anomalyco/opencode.git
- Herdr `0.7.4` Linux release — https://github.com/ogulcancelik/herdr/releases/download/v0.7.4/herdr-linux-x86_64
- Herdr configuration documentation — https://herdr.dev/docs/configuration/
- Herdr repository — https://github.com/ogulcancelik/herdr.git
- AI Harness SDK
- Rivet
- Eve — https://github.com/vercel/eve.git
- Deep Agents — https://github.com/langchain-ai/deepagents.git
- Claude Cowork
- ChatGPT Work
- Codex app server — https://github.com/openai/codex.git
