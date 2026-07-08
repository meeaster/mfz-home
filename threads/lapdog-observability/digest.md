# Digest — lapdog-observability

## Current State

All four instrumentation surfaces are implemented and passing quality gates (236/236 tests on the final debug session run). The two production bugs discovered at runtime are resolved: sessions never closing in lapdog (terminal hook events made synchronous to survive `docker run --rm` container reap) and all cost traces collapsing into an unattributed session (session_id now extracted from stream-json and threaded into cost span context via JSONL backfill replay). The backfill-from-transcript mechanism (`claude-backfill.ts`) serves as the attribution channel for Bedrock-routed dispatches, which route through `bedrock-runtime.<region>.amazonaws.com` via SigV4 and cannot be intercepted via the Anthropic Messages API.

Wire-contract E2E is verified against the local lapdog test agent: `GET /info` reachable, `POST /claude/hooks` accepted with events visible in `/claude/hooks/raw`, and a 624-byte msgpack cost span accepted at `POST /v0.4/traces`. Local LLMObs UI surface cannot be verified because the test agent runs with `llmobs_data_forwarding: false`. Three tasks (4.3, 5.5, 7.2) are documented as intentional operational gaps requiring a live Datadog backend. The commit state after the mmm3 + debug-fix work is unconfirmed in the session record.

## Components

- **Cost-span emitter** (`src/thread/cost-span.ts`) — builds and POSTs msgpack traces to `/v0.4/traces`; fail-open with 3-second AbortSignal; `sessionId` threaded in from runner · complete
- **Backfill module** (`src/thread/claude-backfill.ts`) — replays on-disk JSONL transcripts to `/claude/hooks/backfill_session` for Bedrock-routed session attribution; idempotent; bundles subagent transcripts; skips truncated trailing lines · complete, added in final debug session
- **Container lifecycle** (`src/thread/lapdog.ts` + `src/cli/mfz.ts`) — `mfz thread observe up/down/status` own the lapdog container and `mfz-net`; Docker DNS addressing; health-check before reporting ready · complete
- **Claude hooks** (`src/thread/hooks.json` + `src/thread/claude-hooks.ts`) — twelve hook events; `Stop` and `SessionEnd` set `async: false`, all others `async: true`; baked into `Dockerfile.tools` · complete
- **OpenCode plugin** (`opencode/plugins/lapdog.ts`) — translates all twelve OpenCode plugin events to `/claude/hooks`; subagent events forwarded as `Notification` best-effort; baked into `Dockerfile.tools` · complete; real event-shape validation against live OpenCode payloads still needed
- **Cross-cutting** — purely additive and fail-open throughout; `DockerAgentRunner.run` probes `GET /info` before any instrumentation; absence of a running lapdog container is the disabled state; `runs.json` remains the portable truth and lapdog never sits in the model path

## Direction

- Validate OpenCode event mapping against real OpenCode event samples — session_id extraction uses the best-available shape inference; tests against live event payloads are absent
- Pin `ddapm-test-agent:latest` to a specific image digest or tag (flagged as a blocker in the code review; not confirmed resolved in any subsequent session)
- Complete operational checks for tasks 4.3, 5.5, and 7.2 when a live Datadog backend is reachable
- Clean up the duplicate OpenSpec change directory (`openspec/changes/lapdog-thread-observability-mmm3`) — the canonical change directory is `openspec/changes/lapdog-thread-observability`; tasks live in its `tasks.md`
- Confirm or create the commit for the mmm3 + debug-fix work

## Open Questions

None.

## Key Decisions

- **Backfill-from-transcript for Bedrock session attribution** — `CLAUDE_CODE_USE_BEDROCK=1` routes all LLM calls through `bedrock-runtime.<region>.amazonaws.com` via SigV4-signed Converse/InvokeModel; the Anthropic Messages API proxy intercept does not apply. JSONL transcripts on disk carry real timestamps while stream-json carries none; lapdog's backfill converter requires timestamps. `backfillClaudeTranscript` replays the JSONL to lapdog's idempotent `/claude/hooks/backfill_session` endpoint after each dispatch. This reversed the prior "no proxy — parked as Phase 3" stance: the question closed with a Bedrock-specific technical constraint, not a Phase 3 deferral. (46037a58)
- **Terminal hooks synchronous, all others async** — `docker run --rm` reaps the container immediately on process exit; fire-and-forget curl calls inside the container have no delivery guarantee before reap. `Stop` and `SessionEnd` set `async: false` in `claude-hooks.ts`; every other event remains `async: true`. (46037a58)
- **Cost span and hook agent span accepted in separate llmobs traces** — single-trace unification via proxy bridging not pursued; per-session cost attribution is achieved through session_id extraction and backfill replay; the separation is by design given the Bedrock constraint. (46037a58)
- **Cost spans as msgpack `encode([[span]])` with int32 IDs** — int64 IDs lose precision past 2^53 in JavaScript (IEEE 754 double ceiling); `readInt32(randomBytes(4))` keeps IDs in the safe range. Single-span traces array, resource named `"dispatch"`. (ses_0eef5b33)
- **Cost derived from harness-reported `total_cost_usd`** — earlier dsv4pro attempt hardcoded cost to 0; the correct source is the field reported by the harness. (ses_0eef5b33)
- **Full cost attributed to output in `nanodollarSplit`** — all dispatch cost assigned to `estimated_output_cost`, zero to `estimated_input_cost`. (ses_0eef5b33)
- **Cache tokens zeroed for OpenCode metrics, preserved for Claude metrics** — Claude reports `cache_read_input_tokens` and `cache_write_input_tokens` meaningfully; OpenCode does not; `buildOpenCodeMetrics` zeros them, `buildClaudeMetrics` preserves the split. (ses_0eef5b33)
- **Subagent events forwarded as `Notification`** — OpenCode has no dedicated `SubagentStart`/`SubagentStop` event type; best-effort `Notification` forwarding is the accepted mechanism. (ses_0eef5b33)
- **Two capture channels: events + cost** — hook events (rich session view) and msgpack cost spans (token/price numbers) are both harness-symmetric and neither sits in the model path. (e8a9a49e)
- **OpenCode adapter masquerades as `/claude/hooks`** — chosen over a native `/opencode/hooks` endpoint for fastest time-to-dashboard; reversible later. (e8a9a49e)
- **lapdog in its own container on `mfz-net`** — container-native; addressable by name via Docker DNS (`http://lapdog:8126` from dispatch container, `http://localhost:8126` from host); ports `-p 8126:8126 -p 8080:8080`. (e8a9a49e)
- **Purely additive, fail-open** — `--max-time 2 || true` on hook curls; `DockerAgentRunner.run` probes `GET /info` before instrumentation; the running container is the enabled state, no separate flag. (e8a9a49e)
- **`runs.json` remains the portable truth** — lapdog never replaces it and never sits in the model path. (e8a9a49e)
- **`hooks.json` baked into `Dockerfile.tools` offline** — not generated at dispatch time. (e8a9a49e)

## Design

```
dispatch container (on mfz-net)
  ├── claude process → Bedrock (SigV4, bedrock-runtime.<region>.amazonaws.com)
  │     ├── hooks.json → async POST /claude/hooks → lapdog:8126
  │     │     └── Stop / SessionEnd → sync POST (blocks before container reap)
  │     └── <session-id>.jsonl  (on-disk transcript, real timestamps)
  └── claude-backfill.ts → POST /claude/hooks/backfill_session → lapdog:8126
        (runs after dispatch; replays JSONL for Bedrock session attribution)

opencode/plugins/lapdog.ts (inside tools image)
  └── 12 events → async POST /claude/hooks → lapdog:8126

host (mfz node process)
  ├── emitCostSpan → msgpack POST /v0.4/traces → localhost:8126
  └── mfz thread observe up / down / status → lapdog container lifecycle

lapdog container (mfz-net)
  ├── :8126  APM/hooks intake  (Docker DNS: http://lapdog:8126)
  └── :8080  dashboard         (host: http://localhost:8080)

Cost span and hook-agent span remain in separate llmobs traces by design.
```

## Intent

The user wants live APM observability of thread dispatch runs — session lifecycles opening and closing in lapdog as dispatches proceed, with per-session cost attribution showing real token and price counts rather than one aggregate unattributed bucket. The operational motivation is that as the thread system grows, a dashboard showing what sessions are running, for how long, and what they cost is the missing introspective layer. The design must not risk the dispatch itself: instrumentation is a bystander, not a participant, and the system must work identically with lapdog absent.

## Vision

A lapdog dashboard covering the full lifecycle of every thread dispatch — session start to close, tool spans in sequence, cost per dispatch — extended symmetrically to OpenCode sessions so the same lapdog intake handles both harnesses without separate dashboard treatment. Subagent visibility at `SubagentStart`/`SubagentStop` granularity is a recognized gap that the current `Notification` forwarding only partially covers; the user left it as best-effort rather than blocking the implementation.

## Perspective

The user came in adversarially (`/grill-me`), preferring weak points surfaced before code was written rather than after. This produced a lean, additive design rather than a comprehensive one. The user's early unease with the proxy approach ("I don't know how I feel about the proxy stuff") proved well-founded — the Bedrock constraint later ruled it out on technical grounds matching that instinct. After the Bedrock constraint surfaced mid-investigation, the user briefly floated keeping a proxy for Claude Code while building something custom for OpenCode, then accepted the Bedrock rationale without pressing further and moved forward with backfill. The user's taste is consistently fail-open and portable-truth-first: lapdog is never a dependency, `runs.json` is never displaced, and cost observability must not block or crash a dispatch under any conditions.

## Sources

- OpenCode: `packages/plugin/src/index.ts` (interface Hooks), `packages/schema/src/plugin.ts`, `packages/schema/src/event-manifest.ts`
- dd-apm-test-agent: `claude_hooks.py`, `claude_proxy.py`, `agent.py`, `plugins/lapdog/hooks/hooks.json`, `lapdog/cli.py`, `lapdog/pi_lapdog_extension.ts`
- Docker image: `ghcr.io/datadog/dd-apm-test-agent/ddapm-test-agent:latest`
- `@msgpack/msgpack` npm package (v3.1.3)
