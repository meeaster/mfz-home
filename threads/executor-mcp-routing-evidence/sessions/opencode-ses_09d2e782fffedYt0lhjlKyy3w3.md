# Session ses_09d2e782fffedYt0lhjlKyy3w3 — OpenSpec executor replacing MCP servers

## Thread Relevance

This session is the primary evidence, decision, and implementation record for routing Mindframe-Z's MCP services through Executor: it explores the architecture, prototypes an OpenCode bridge, migrates the active MCP catalog, tests local stdio and toolkit scoping, and lands a settled architecture with an explicit list of remaining verification.

## Gaps

The dossier gives message IDs and timestamps for most bullets but not turn numbers in the Claude Code `(session-id · turn N)` sense; citations below use the message IDs as recorded in the dossier. Some entries (e.g. the 2026-07-15 04:29/04:30 user prompts) are marked "implied" in the dossier rather than directly quoted — carried as such. No raw transcript was available, so only what the dossier states is retained.

## Phases

- [2026-07-14 22:48 → 2026-07-15 00:27] Initial Exploration — surveyed Executor's architecture and MCP server fit, identified security/authentication/visibility issues, recommended a hybrid boundary. (msg_f62d187d8001tUIOOBy0T0aPie–msg_f632c455c001zPYugtZvKogjHq)
- [2026-07-15 00:34 → 2026-07-15 04:30] Prototype Setup & OpenCode End-to-End — created branch, isolated Executor scope tooling, validated direct MCP-to-Executor bridge and OpenCode integration. (msg_f6331f35a001RqJa0HXz2fiLk6–msg_f640a4214001NX2DYoqgvipOMa)
- [2026-07-15 16:11 → 2026-07-15 16:57] Model Comparison Testing — compared GPT-5.6 Luna/Terra/Sol under Executor on discovery and two-execution tasks. (msg_f669461ca001NBzibUo941Y0C8–msg_f66b5e157001XjwBsQXFnMUtN5)
- [2026-07-15 16:20 → 2026-07-15 20:43] Active MCP Server Migration & Slot Fix — migrated active MCP catalog through Executor, fixed slug normalization, tested Pine Script stdio, weighed configuration-sharing design. (msg_f673e13a8001gcxuPkDdeSKCei onwards)
- [2026-07-15 21:45 → 2026-07-15 23:58] Toolkit Scoping Investigation & Verdict — proved/disproved the two toolkit contracts, rejected toolkit-based per-harness isolation, committed all findings. (msg_f6825b0f1001qh8m1edqQkkDIC–msg_f683763b9001Z7M3bItae8eGRv)

## Decisions

- [2026-07-14 22:51] Recommended boundary: route OpenCode/Claude Code/Codex remote and global integrations through Executor, while FFF (project-scoped) stays direct MCP — do not attempt full server replacement. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-14 22:52] Adopt Executor-owned state initially (Mindframe-Z renders only the outer Executor MCP endpoint) to avoid duplicating Executor's management surface before operational validation. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-14 22:52] Adopt a staged pilot: start with context7, deepwiki, openai-docs on one harness, compare reliability/latency/context/approval, then expand to Exa/public remotes, then stdio, then resolve HA separately, keeping FFF direct. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-15 00:29] Default OpenCode Executor bridge config uses `type: local`, `command: ["executor", "mcp", "--scope", "<temporary-scope>", "--elicitation-mode", "browser"]`, `timeout: 60000` — browser elicitation overrides the CLI's model-approval default for write-capable integrations. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f632d6be8001X7CGtLlwnXh9iK)
- [2026-07-15 16:57] Recommend Luna or Terra for the initial production pilot; Sol usable for two-execution tasks but flagged for further investigation on simple single-shot discovery. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f66a010b4001CzvZg3aDHWlOXl)
- [2026-07-15 21:45] Adopt a configuration design where Mindframe-Z's `catalog/mcp.yml` and profile MCP selection remain canonical; Executor state is generated/synced from the resolved profile rather than shared directly, with a new `executor:` block per server (`agents`, `trusted_stdio`), one rendered toolkit per harness, explicit `mfz executor sync`/`status` commands, and integration into `mfz apply` deferred until approval/failure/idempotency behavior is proven. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f67c43f40001GHk9jbXWBY3pG0)
- [2026-07-15 23:38] Reject toolkit-based per-harness isolation for now — keep one Executor catalog for the active profile exposed via the existing local stdio bridge, and retain current direct MCP renderers until Executor aggregation proves enough practical benefit to justify migration. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f68347d84001kA4qRHoY9EWucK)

## Learnings

- [2026-07-14 22:48] Executor does not expose upstream tools as individual MCP tools; it exposes `execute`, `skills`, and conditionally `resume`, with agents writing sandboxed TypeScript to search the catalog and invoke tools — confirmed at `packages/hosts/mcp/src/tool-server.ts:931` and `packages/core/execution/src/skills.ts:28`. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d2ad05001DF38OO4PX8Sd1L)
- [2026-07-14 22:51] Of Mindframe-Z's 11 active MCP integrations, 7 (context7, deepwiki, openai-docs, aws-knowledge, x-docs, exa, exa-research) are strong fits, pinescript-docs/qmd are good-with-caveats, homeassistant is conditional on credential handling, and fff is a poor fit since Executor's global service has a fixed cwd. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-14 22:52] Through Executor, harness-level permission reasoning collapses to one `execute` call that may invoke several inner tools, making Executor's own policies the authoritative safety boundary instead of the harness. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-14 22:52] Home Assistant's endpoint embeds its secret in the URL path (`http://192.168.30.39:9583/{env:HA_MCP_SECRET_PATH}`); Executor can store credentials in headers, query params, OAuth, or stdio env vars, but cannot interpolate credentials into a URL path. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-14 22:52] A single Executor endpoint exposes the same catalog to every harness, conflicting with Mindframe-Z's design where several servers are Claude-only; Executor toolkits were considered as a per-harness access-control boundary but would require one outer catalog entry per harness. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-15 03:57] Observed result: an isolated end-to-end run showed Executor exposing exactly `execute`, `skills`, and browser-gated `resume`, with `execute` successfully searching the DeepWiki catalog and returning a correct React API answer. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f63ee7a530015bB570mlBzY4FC)
- [2026-07-15 04:02] Observed result: an isolated OpenCode agent called `executor_skills` then `executor_execute`, queried DeepWiki through Executor, returned the correct answer, and confirmed the browser approval mechanism works. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f64222425001luaRL8CFYwEHin)
- [2026-07-15 03:54–04:27] Operational constraints for isolated testing: piped `opencode run` needs stdin EOF (prototype closes `child.stdin` immediately); the Executor daemon auto-starts and scopes to a temp data dir via `EXECUTOR_DATA_DIR`; clean-room runs need `OPENCODE_DISABLE_PROJECT_CONFIG=true` and `OPENCODE_DISABLE_EXTERNAL_SKILLS=true`; OpenCode built-in plugins must not be disabled or startup breaks. (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase II probe, 2026-07-15 03:54–04:27)
- [2026-07-15 16:57] Observed result (medium reasoning, six isolated OpenCode sessions): Luna and Terra passed both simple discovery and two-execution tasks; Sol failed simple discovery (correct answer but zero upstream calls) yet passed the two-execution task. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f66a010b4001CzvZg3aDHWlOXl)
- [2026-07-15 16:57] A measurement flaw in the initial scorer counted bracket-path invocation style (`tools.deepwiki` vs `tools["deepwiki"]`) as failure; the corrected scorer recognizes success by Executor's result envelope instead. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f669a81bf0010exvhpt1QOoXE8)
- [2026-07-15 19:25] Observed result: Luna and Terra each made 4 Executor calls with 3 successful upstream calls; Sol made 4 Executor calls with 2 successful upstream calls but recovered on the two-execution task. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f66b5e224001wUH91SQ9VYeDzt)
- [2026-07-15 16:57] Executor derives default slugs by converting hyphens to underscores (e.g. `aws-knowledge` → `aws_knowledge`), which caused `IntegrationNotFoundError` on connection until slugs were explicitly set to match Mindframe-Z's hyphenated catalog keys. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f675da1ac001OLLCUgmgX189kT)
- [2026-07-15 20:43] Observed result: after the slug fix, aws-knowledge, context7, deepwiki, openai-docs, and x-docs registered successfully as anonymous remotes; exa, exa-research, and homeassistant were deferred pending secrets; fff, qmd, and pinescript-docs were deferred as local stdio. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f67bdf0b9001kSosKp7eQUI1Ab)
- [2026-07-15 20:43] Observed result: Executor launched the Pine Script stdio server and created a live connection, exposing `pinescript-docs` in `skills({ name: "execute" })`, though no upstream tool was actually invoked (proof-of-connection only). (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f67bdf0b9001kSosKp7eQUI1Ab)
- [2026-07-15 20:43] Local Executor stdio requires `dangerouslyAllowStdioMCP: true`; stdio launches inherit Executor's environment, so only trusted commands should be used — the tested Pine Script command (`npx -y pinescript-mcp-server`) is currently unpinned. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f67bdf0b9001kSosKp7eQUI1Ab)
- [2026-07-15 21:50] A toolkit in Executor is a named, scoped view of the tool catalog (stable slug, connection-pattern membership, optional policy rules) exposed at `/mcp/toolkits/<slug>`; it is Executor-specific terminology, not an MCP protocol feature. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f682f0fc4001gRanQBSGjdYMZG)
- [2026-07-15 23:38] Prototype-limited finding: toolkit records and connection-pattern membership can be created via Executor's authenticated local HTTP API (Contract 1 proven), but toolkit-scoped serving is not usable locally in Executor v1.5.32 — `POST /mcp/toolkits/<slug>` fails on init with a SQLite data-store lock, and `executor mcp` accepts only `--scope`/`--elicitation-mode` with no toolkit selector, serving only the unscoped default catalog (Contract 2 failed). (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f682df3c80012k9w7Os2o13575)

## Issues

- [2026-07-14 22:52] Home Assistant authentication cannot be routed through Executor as-is because its secret is embedded in the URL path, which Executor cannot interpolate — open until resolved via OAuth reconfiguration, a stored complete secret URL, or keeping HA direct. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- [2026-07-15 23:38] A single local Executor instance cannot currently preserve Mindframe-Z's per-harness MCP selections since toolkit-scoped serving doesn't work in v1.5.32; the union Executor catalog cannot yet replace direct per-harness MCP rendering. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f68347d84001kA4qRHoY9EWucK)

## Open Questions

- [2026-07-15 20:43] Whether authenticated/OAuth servers (Exa, Exa Research, Home Assistant) work through Executor — not yet tested; requires credential setup, and HA's URL-path encoding is unresolved. (ses_09d2e782fffedYt0lhjlKyy3w3 · dossier Remaining Verification table)
- [2026-07-15 20:43] Whether QMD's cwd-dependent behavior works correctly as a local stdio server through Executor — cataloged as "probably good" but not yet invoked. (ses_09d2e782fffedYt0lhjlKyy3w3 · dossier Remaining Verification table)
- [2026-07-15 20:43] Whether FFF can be run through Executor at all, given the local stdio/project-cwd handling conflict with Executor's fixed global cwd — deferred as architecturally incompatible. (ses_09d2e782fffedYt0lhjlKyy3w3 · dossier Remaining Verification table)
- [2026-07-15 20:43] Whether the Executor MCP endpoint renders and invokes tools correctly under Claude Code and under Codex — prototype only exercised OpenCode. (ses_09d2e782fffedYt0lhjlKyy3w3 · dossier Remaining Verification table)
- [2026-07-15 20:43] Whether write-capable tool approval behaves correctly in browser vs. model elicitation mode for destructive actions — browser mode verified only for read-only calls. (ses_09d2e782fffedYt0lhjlKyy3w3 · dossier Remaining Verification table)
- [2026-07-15 20:43] Whether Pine Script's actual upstream tool invocation (catalog search/tool execution, not just connection) succeeds through Executor's stdio bridge. (ses_09d2e782fffedYt0lhjlKyy3w3 · dossier Remaining Verification table)
- [2026-07-15 21:45] Whether `mfz executor sync --dry-run`, `mfz executor sync`, and `mfz executor status` behave correctly (approval, failure, idempotency) once implemented — design approved, implementation deferred. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f67c43f40001GHk9jbXWBY3pG0)
- [2026-07-15 23:58] Whether a per-profile-harness isolated-Executor-instance fallback is worth building if per-harness isolation becomes a hard requirement again, given it duplicates registrations. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f683763b9001Z7M3bItae8eGRv)

## Intent & Vision

- [2026-07-14 22:48] "Openspec explore. I want to look into using executor to replace all my mcp servers." (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d187d8001tUIOOBy0T0aPie)
- [2026-07-15 00:27] "Let's create an handoff so we can do a prototype with executor" — shift from exploration to implementation/prototyping. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f632c455c001zPYugtZvKogjHq)
- [2026-07-15 00:34] "Can you fetch latest and commit local changes and push then create a branch and then create the prototype" (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f63e90fa8001eMzTrHonBM2cYt)
- [2026-07-15 03:54] "Keep going with proving configuration with opencode... use an isolated instance" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase II user prompt)
- [2026-07-15 04:29] "load agent-exec" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase II user prompt)
- [2026-07-15 16:20] "Could we try testing using executor with open code with the different GPT 5.6 models? So try testing with Luna, Terra, and Seoul" (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f669461ca001NBzibUo941Y0C8)
- [2026-07-15 16:20] "Can we include in this prototype moving over all my skills I support... MCP servers" (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f673e13a8001gcxuPkDdeSKCei)
- [2026-07-15 16:57] "The ones with Connection-stage Executor failures shouldnt fail. can you figure out why" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase IV user prompt)
- [2026-07-15 19:56] "does it support local stdio and should we use it? maybe test pinescript" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase IV user prompt)
- [2026-07-15 20:43] "How do you think we can be able to easily configure executor to support the way we can easily share configuration" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase IV user prompt)
- [2026-07-15 21:45] "Let's prove those two contracts" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase V user prompt)
- [2026-07-15 21:50] "what are toolkits?" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase V user prompt)
- [2026-07-15 23:38] "Ok good to know but i don't think we need this feature" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase V user prompt)
- [2026-07-15 23:49] "Alright let's commit everything we found during this prototype" (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase V user prompt)

## Artifacts Touched

- [2026-07-15 00:34] Branch `prototype/executor-mcp` created off `main` @ `b20789a`, after committing an advisor model evaluation doc on `main`. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f63e90fa8001eMzTrHonBM2cYt)
- [2026-07-15 03:57] `pnpm prototype:executor` — creates isolated Executor data/scope, registers unauthenticated DeepWiki, validates the MCP surface; committed as `6458fc6`. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f63ee7a530015bB570mlBzY4FC)
- [2026-07-15 04:02] `pnpm prototype:executor:opencode` — runs isolated `opencode run --format json` against only the Executor MCP bridge; committed as `25db3e1`. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f64222425001luaRL8CFYwEHin)
- [2026-07-15 04:35] `sandbox/prototypes/executor-mcp/FINDINGS.md` (verdict-focused) and `sandbox/prototypes/executor-mcp/learnings.md` (continuation-focused, operational constraints/failed approaches/setup rules); committed as `84eedc8`. (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase II documentation)
- [2026-07-15 16:57] `pnpm prototype:executor:opencode:models` — runs Luna/Terra/Sol at medium reasoning across simple-discovery and two-execution tasks. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f66a010b4001CzvZg3aDHWlOXl)
- [2026-07-15 20:43] `pnpm prototype:executor:migrate-active-mcp` — reads the merged active profile selection, classifies all 11 servers, registers remote endpoints safely. (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase IV implementation)
- [2026-07-15 20:43] `pnpm prototype:executor:test-pinescript-stdio` — verifies Executor can launch and connect to the local Pine Script stdio MCP server. (ses_09d2e782fffedYt0lhjlKyy3w3 · Phase IV implementation)
- [2026-07-15 23:38] `pnpm prototype:executor:test-toolkit-scoping` — attempts to prove Executor toolkit creation and toolkit-scoped endpoint selection. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f682df3c80012k9w7Os2o13575)
- [2026-07-15 23:58] Final commit `c6856b2 chore(prototype): expand executor MCP evaluation`, bundling model comparison, active-catalog migration, Pine Script stdio success, and the toolkit-scoping limitation. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f683763b9001Z7M3bItae8eGRv)

## Sources

- Executor source — `packages/hosts/mcp/src/tool-server.ts:931` (execute/skills/resume surface). (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d2ad05001DF38OO4PX8Sd1L)
- Executor source — `packages/core/execution/src/skills.ts:28` (skills catalog search). (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d2ad05001DF38OO4PX8Sd1L)
- Mindframe-Z active MCP profile / catalog inventory (`catalog/mcp.yml`) — used to classify the 11 active integrations by fit. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
- Home Assistant MCP endpoint config — `http://192.168.30.39:9583/{env:HA_MCP_SECRET_PATH}`. (ses_09d2e782fffedYt0lhjlKyy3w3 · msg_f62d5614a001Fkl3QdxzhAnTkz)
