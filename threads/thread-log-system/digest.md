# Digest — thread-log-system

## Current State

The thread has one founding session: a long design/grilling brain-dump that set the whole direction. **Nothing is built yet** — this is a settled design, not an implementation. The shape is locked: thread-log evolves from a Claude-Code-only skill into a standalone, **CLI-orchestrated** thread-management system, built **inside mindframe-z** (its emerging "all-one" of config/skill/MCP/reference/sandbox management). The existing skill keeps working untouched while the new core is built alongside it — no rip-and-replace.

The core is a **lightweight custom orchestrator** (off-the-shelf engines were ruled out — see below). The CLI is its first interface, with an MCP server and eventually a UI designed-for but deferred. v1 ingests Claude Code + OpenCode sessions through a source-adapter port; ChatGPT is designed-for, deferred to v2+. Observability is a v1 cross-cutting requirement, not a feature. Evals are deferred to a post-v1 dev-time regression suite. Several structural questions — thread relationships, higher-level grouping, cross-machine sync — are deliberately parked with their constraints written down.

## Design

```
                    ┌─────────────────────────────────────────────┐
   user / Claude    │            CLI  (first interface)            │
   Code / OpenCode ─┤   MCP server ···· web/desktop UI  (deferred) │
                    └───────────────────────┬─────────────────────┘
                                            │ same core
                          ┌─────────────────▼──────────────────┐
                          │   CORE — lightweight orchestrator   │
                          │   (custom; dispatches agents,       │
                          │    not a determinism engine)        │
                          │                                     │
                          │   gather (Haiku) → synthesize (cap.) │
                          │   + observability: run registry,    │
                          │     per-run logs, cost, model history│
                          └───┬──────────────┬──────────────┬────┘
                              │              │              │
                ┌─────────────▼──┐   ┌───────▼───────┐   ┌──▼────────────────┐
                │ SessionSource  │   │  thread store │   │  backup dests      │
                │ adapter port   │   │  (sensitive,  │   │  (multiple, 1 per  │
                │  • claude-code │   │   separate    │   │   thread; git sync)│
                │  • opencode    │   │   from config)│   └────────────────────┘
                │  • chatgpt (v2)│   └───────────────┘
                └────────────────┘        ▲
                                          │  config stays PUBLIC in mindframe-z;
                                          │  threads stay PRIVATE in their dests
   portable readers ────────────────────►│
   (claude-code-sessions / opencode-sessions skills:
    "how to read a session" only — never archival/storage)
```

## Key Decisions

- **Evolve to a CLI-driven orchestration layer**, keeping the existing skill working in parallel — a skill is locked to Claude Code; a CLI gives programmatic control and multi-harness dispatch. (0af0f6b3 · turn 7)
- **The CLI orchestrates agent workflows; it is not a determinism engine** — judgment steps stay agent dispatches, deterministic work wraps around them, harness is choosable per step. (0af0f6b3 · turn 68)
- **Build a custom lightweight orchestrator**, not an off-the-shelf engine — every framework needs an API key for its own reasoning and can't drive subscription-harness agents as the reasoner. (0af0f6b3 · turn 73)
- **Build the system inside mindframe-z**, the emerging all-in-one, rather than a standalone repo. (0af0f6b3 · turn 7)
- **Keep the existing skill as the working path; build the new core separately alongside** — zero risk to what works; observability lives in the new core. (0af0f6b3 · turn 134)
- **Observability is a v1 cross-cutting requirement** — run registry (PID-keyed), per-run logs, cost surfaced everywhere, and a history of which model did which action. (0af0f6b3 · turn 110)
- **Separate thread storage from config; config public, threads sensitive** — mindframe-z holds multiple backup destinations, one assigned per thread (work → private repo, personal → personal/shared). (0af0f6b3 · turn 115)
- **One-session-to-one-thread is a soft default, not a hard rule** — a session spanning two threads earns two different per-charter extractions. (0af0f6b3 · turn 129)
- **Session-reader skills stay pure, portable readers** — all archival/storage logic lives in the CLI/core; skills may expose an alternative source path but never own where to archive. (0af0f6b3 · turn 147)
- **Dispatched research/gather agents run on Haiku 4.5**; the capable model is reserved for synthesis. (0af0f6b3 · turn 86)
- **Accept ~$1–2/session** as the baseline ingestion cost. (0af0f6b3 · turn 55)
- **Design for an MCP-server interface over the same core, defer it from v1.** (0af0f6b3 · turn 134)
- **Design for ChatGPT ingestion via a source-adapter port, build it in v2+** — v1 is Claude Code + OpenCode. (0af0f6b3 · turn 138)
- **Defer evals to a post-v1 dev-time regression suite** — when built, wrap the CLI with Inspect or DeepEval. (0af0f6b3 · turn 105)

## Open Questions

- **Thread relationships** — one- vs. bi-directional, parent/child, what "read related threads" means. Deferred until a real use case (a thread split or cross-reference need) forces it. (0af0f6b3 · turn 124)
- **Higher-level grouping above threads** — a "project"-like layer (the user resists "project"/"loud groupings"), plus thread compaction (archiving obsolete sessions past ~15–20) and what bubbles into a parent/group digest. (0af0f6b3 · turn 7)
- **Cross-machine session sourcing and refresh** — raw transcripts live on one machine, so a refresh can't re-read them from another. The decision: record `source_machine`/`source_path` provenance and make refresh **machine-aware** (warn/refuse when the raw source isn't local). Raw transcripts are archived **locally only, never in git** (size + sensitive-data leak risk). Cross-machine refresh is **avoided by design** — keep threads small so a rebuild is rare and runs on the source machine — not engineered around. (0af0f6b3 · turn 138)
- **Shared work/personal thread sync** — a thread reachable from two machines with different destinations; is there a canonical destination? Single-machine flow first. (0af0f6b3 · turn 115)
- **A "Principles" / "Guiding Principles" digest section** — to record principles and check alignment (or detect deliberate negation) in later sessions. Proposed, undecided. (0af0f6b3 · turn 7)
- **The eventual MCP server's surface** — which thread operations it exposes. (0af0f6b3 · turn 134)
- **Eval "faithfulness" definition and ground truth** — original vs. extracted decisions. Deferred to the eval-design phase. (0af0f6b3 · turn 105)
- **The ChatGPT capture mechanism** — browser extension vs. headless logged-in browser scrape. (0af0f6b3 · turn 7)

## Intent

The seed is a recurring, concrete pain: the user designs heavily in a session, nears the context limit, and can't write a summary without either losing information or compacting it away. The reframe that started everything — *the session details are already on disk, so read them after the fact instead of squashing context*. That makes thread management a **separate process layer that sits on top of the models** rather than living inside them.

This is a memory system, but an **inverted** one. The user explicitly rejects the auto-memory pattern where the AI pushes to memory and rewrites CLAUDE.md files. Here the AI **sits on top and watches**, appending to an immutable source — the session files, where "what's already written stays written but things can be added." The motivation is shared and real: the user's manager hits the same context-juggling problem across ChatGPT, Claude Code, and OpenCode, which is what pushes toward multi-harness, multi-source support. The deeper goal is a **knowledge layer that evolves over time alongside the work** — and cost-consciousness runs through all of it, with "levers" (cheaper synthesis model, subset of info) to trade fidelity against spend.

## Vision

Where the user currently sees this heading — **aspirational, not committed**: start with a CLI as the interaction surface, then grow into an MCP server and eventually a web or desktop UI where threads are managed and synthesis is kicked off from a dashboard. Further out, **automations** — detect a new session, recognize it as part of ongoing work, and offer to integrate it into the right thread ("I think this would be really cool to build if we can pull this off"). Synthesis would ideally run **isolated/sandboxed** (the synthesizer shouldn't have access to anything), building on mindframe-z's existing sandbox work and possibly Agent Vault for credential proxying. The user is explicit that the UI and automation layers are long-term — "right now we need to start with baby steps."

## Direction

- Build the core orchestrator as a pure library inside mindframe-z, with the CLI as its first interface, leaving the existing skill untouched as the working path.
- Implement the SessionSource adapter port for Claude Code + OpenCode; stub the ChatGPT adapter shape without building it.
- Bake in observability from day one: run registry (PID-keyed), per-run logs, cost surfacing, model-action history.
- Stand up the storage model: thread data separate from public config, with configurable backup destinations and git sync; defer cross-machine sync.
- Wire the two-stage pipeline (Haiku gather → capable synthesize) through the orchestrator with model/effort as configurable levers.
- Leave thread relationships, higher-level grouping, the MCP server, ChatGPT ingestion, and evals as written-down deferred specs — revisit each when a concrete use case forces it.

## Sources

- **Orchestration frameworks researched** (Haiku subagent): Vercel AI SDK, LangGraph, Mastra, Eve, OpenAI Codex, Inngest, LangChain, Claude Code subagents.
- **Eval frameworks researched** (Haiku subagent): OpenAI Evals, Braintrust, Inspect, LangSmith, promptfoo, DeepEval, Ragas.
- **Skills:** `grilling` (facilitation), `thread-log`, `claude-code-sessions` / `opencode-sessions` (portable readers).
- **mindframe-z browser-engine project** — future ChatGPT capture mechanism (deferred).
- **Agent Vault** — candidate for credential proxying in sandboxed synthesis.
- **Prior threads:** `thread-log-build`, `thread-log-usage` — digests read for economics and continuity.
