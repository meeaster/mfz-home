# Session ses_093f4a973ffex1eaAA1LwTTqFM — Routing Mindframe-Z MCP Services through Executor

## Thread Relevance

This session is a direct match for the charter: it covers the evidence gathered on the Executor prototype, the architectural decisions for routing MCP servers through Executor, the implementation of that routing, and the remaining verification gaps (browser OAuth, live harness smoke tests) left at session end.

## Gaps

The dossier summarizes rather than quotes most of the transcript; several bullets (e.g. full task lists, exact code diffs) are reported only as counts or summaries, not verbatim. Timestamps are given to the minute only. The dossier does not state turn numbers, only message ids (`msg_...`), which are used below as part-id citations. The code-review remediation phase is reported as "in progress" with no completion evidence.

## Phases

- [2026-07-16 17:48 → 2026-07-16 19:48] Architecture & decision discovery — evaluated the prototype branch and settled the shared-Executor, catalog-authoritative, apply-owned-reconciliation, OAuth-preservation model.
- [2026-07-16 19:40 → 2026-07-16 19:48] OpenSpec proposal design — authored the `add-executor-mcp-routing` change with proposal, design, specs, and tasks.
- [2026-07-17 01:25 → 2026-07-17 04:42] Implementation — built Executor adapter/reconcile/bridge modules, applied migration to personal-home profile, ran live verification and test suites.
- [2026-07-17 04:45 → 2026-07-17 05:02] Code review & remediation — ran thermo-nuclear review, found 5 P1 and 4 P2 issues, began fixing in dependency order.

## Decisions

- [2026-07-16 19:00] Use one shared Executor daemon with one `executor mcp --scope ... --elicitation-mode browser` bridge per harness, rather than per-agent Executor instances — the user framed Executor as "just another entry in the MCP" whose routing should be configured via catalog settings rather than per-server special-casing. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c4d9727001FJWYk0ntjFC0En)
- [2026-07-16 19:00] Keep the MCP catalog authoritative; Executor is a routing destination, not a replacement for the MCP model — routing decided per-server via a `targets` mapping in profile YAML. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c4d97a2002ctXZPHTPX1b8dS)
- [2026-07-16 19:27] Allow every connected agent to see everything registered in Executor (shared visibility), removing the need for per-agent Executor toolkits or multiple Executor instances. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c65efd6001NtPG1It24D9Agh)
- [2026-07-16 19:32] Have `mfz apply` configure Executor directly rather than requiring a separate reconciliation command — reversed an earlier lean toward a separate command after the user objected that a second command would violate the normal Mindframe-Z workflow, since Executor routing is profile-owned desired state. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c6ac442002QrWfPvHlYmq00G)
- [2026-07-16 19:35] Treat OAuth connections as durable user state that must never be recreated or overwritten during routine reconciliation — driven by the user's concern about not breaking working OAuth-backed MCP servers; apply must identify integrations by stable catalog slug, avoid reading token values, preserve existing connections/clients/tokens/scopes, and block rather than delete an OAuth-backed integration removed from the profile. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c6d1ecb002iAyNvhfvRaWZ5b)
- [2026-07-16 19:40] Use browser-based OAuth only, with no token import from existing harness MCP configs into Executor. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c71cafc001oZmyJRIP7S6z7v)
- [2026-07-16 19:35] For initial migration of an OAuth-backed direct MCP server to Executor, keep the direct config active, register the server in Executor, start a separate OAuth flow, wait for health, and only then switch harness config to Executor — health-gated cutover to avoid dropping a working connection. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c6eb121002CpzcjUbEZ0q7vl)

## Learnings

- [2026-07-16 17:49] The prototype branch (`prototype/executor-mcp`, four commits ahead of its base) proves the core aggregation path works but exposes the main architectural constraint: Executor v1.5.32 cannot preserve per-harness MCP visibility through local toolkits. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c0c9962002p4XnMkiCZJhIOT)
- [2026-07-16 17:49] Five anonymous remote registrations were validated in the prototype (Context7, DeepWiki, OpenAI Docs, AWS Knowledge, X Docs), and `executor mcp --elicitation-mode browser` successfully exposes `execute`, `skills`, and browser-safe `resume` methods. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c0c9962002p4XnMkiCZJhIOT)
- [2026-07-16 18:09] Source inspection of the installed Executor v1.5.33 (reference checkout `13732fe40b3f715ac9b78bb2ef1c3abeffc60885`) indicates the prototype's toolkit/SQLite second-owner issue is still likely present in the production local path. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c1eb16500215URzyeVdjFzR2)
- [2026-07-17 04:34] A profile that removes its last Executor route previously left stale Executor integrations behind; fixed by having reconciliation load prior managed state even with zero desired integrations, safely pruning uncredentialed entries while still blocking durable OAuth-backed removal. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e620354001QZtIkkuQskstqB)
- [2026-07-17 04:27] Live verification against the personal-home profile (`mfz --root /home/mark/code/mindframe-z-personal-home --home /home/mark apply --target all --agent all`) reused all five Executor-routed connections (aws-knowledge, context7, deepwiki, openai-docs, x-docs) without reauthorization or duplication on repeat apply; `claude mcp list` and `codex mcp list` both showed the Executor bridge connected. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)
- [2026-07-17 04:27] Full check suite passed on the implementation: `pnpm check`, `pnpm test:integration` (120 passed), `pnpm test:all` (540 passed), `pnpm schemas`, `pnpm fmt:check`, `openspec validate "add-executor-mcp-routing"`. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)
- [2026-07-16 19:48] The `add-executor-mcp-routing` OpenSpec change was validated with all 4 artifacts complete and marked ready for implementation. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c7900e5002mJ2106DGtWC1DY)

## Issues

- [2026-07-17 04:53] Thermo-nuclear code review found 5 P1 blockers: (1) MCP routing uses an optional `route` field plus a synthetic `executor` identity, creating collision and stale-bridge risk instead of a required discriminated union; (2) OAuth reconciliation cannot converge because auth templates merge instead of replace, durable-state detection is too broad, and removal bypasses MCP cleanup; (3) "non-secret" snapshots accept literal bearer/API-key headers and local environment values; (4) dry-run reports false reuse and ignores removals because it doesn't use stored digests, and planning isn't pure/shared with live reconciliation; (5) Executor reconciliation runs before target selection, risking partial state mutation before a later failure. Also 4 P2 issues: schema validation, adapter concerns mixed together, overly large files, and outdated docs. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e6c34f90011Xq0lOusRFUNHC)
- [2026-07-16 19:32] Earlier design lean toward requiring a separate reconciliation command from `mfz apply` was identified as a workflow violation and reversed (see Decisions). (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c6ac435001ctjRws0WfVzf50)

## Open Questions

- [2026-07-17 04:42] Does browser OAuth acceptance/cancellation work end-to-end against a real provider (dynamic registration, start, completion)? Not yet validated. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e620354001QZtIkkuQskstqB)
- [2026-07-17 04:42] Does the refresh token lifecycle survive repeated `apply` runs? Not yet verified. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e620354001QZtIkkuQskstqB)
- [2026-07-17 04:42] Does a missing OAuth scope correctly block cutover to Executor? Not yet verified. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e620354001QZtIkkuQskstqB)
- [2026-07-17 04:42] Do live three-harness (OpenCode, Claude Code, Codex) smoke tasks succeed with full task execution through the Executor bridge? Not yet run. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e620354001QZtIkkuQskstqB)
- [2026-07-17 04:42] Does OAuth acceptance pass a live integration test, and do broader apply failure scenarios behave safely? Not yet verified. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e620354001QZtIkkuQskstqB)
- [2026-07-17 04:56] Will the code-review remediation (routing union, OAuth convergence, snapshot secrets, dry-run diffs, apply atomicity) resolve all 5 P1 blockers? User asked to make the changes; work was in progress at session end with no completion evidence recorded. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e6f33b1001eAM1GrAZmcd9ct)

## Intent & Vision

- [2026-07-16 17:48] "I have a a branch for a prototype for executore. I want to create a plan to move over to mostly using executor" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c0b569c001wmsXGOykZzy4Nn)
- [2026-07-16 19:00] "Like, if you guys think about it, like, execute layer is just another entry in the MCP. And then really, what we need to do is that we just need to have maybe specific settings on how we configure executor. Because I think, like, trying to sit there and like make put stuff into the MCP servers… the MCP server in the catalog can either go to execute it or go to open code or cloud code." (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c4d9727001FJWYk0ntjFC0En)
- [2026-07-16 19:27] "i am ok if every agent can see what's in executor." (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c65efd6001NtPG1It24D9Agh)
- [2026-07-16 19:32] "Wait, so MSC apply won't actually make any changes to executor to configure it. We have to run something else" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c6ac435001ctjRws0WfVzf50)
- [2026-07-16 19:35] "I want to make sure that like hey for this for the there might be for the MCP servers that use OAuth I want to make sure that I don't overwrite anything with the OAuth to make so that way it continues the work" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c6d1eb4001rc8HsbAt2y4wdT)
- [2026-07-16 19:40] "We don't need to import and we will use browerser auth. Lets create the openspec proposal for this work" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c71cafc001oZmyJRIP7S6z7v)
- [2026-07-17 01:25] "apply the spec" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6daddb99001PBIDsthjzeRH6V)
- [2026-07-17 04:46] "I'll load the thermo-nuclear review workflow" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e65c801001BW2ZOyI0AhnnGE)
- [2026-07-17 04:56] "Lets make the changes" (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e6f312a001UhaZ4wuQPxuRnD)

## Artifacts Touched

- [2026-07-16 19:48] `/home/mark/.mindframe-z/stores/mindframe-z-specs/openspec/changes/add-executor-mcp-routing/proposal.md`, `design.md`, `specs/executor-mcp-routing/spec.md`, `specs/executor-state-reconciliation/spec.md`, `specs/agent-context-footprint/spec.md`, `specs/yaml-schemas/spec.md`, `tasks.md` — OpenSpec change proposal for Executor MCP routing (motivation, design, specs, task checklist). (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c7900e5002mJ2106DGtWC1DY)
- [2026-07-17 04:27] `src/executor/model.ts`, `src/executor/adapter.ts`, `src/executor/reconcile.ts`, `src/executor/index.ts` — new Executor integration modules (schemas, v1.5.33 daemon adapter, apply-time reconciliation, exports). (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)
- [2026-07-17 04:27] Route discriminated union / route-safe inheritance / profile Executor settings schema / resolved route helpers, regenerated schemas — schema and routing-model changes. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)
- [2026-07-17 04:27] Overrides, TUI, CLI, status, doctor, context probing, sandbox boundaries, `ARCHITECTURE.md`, `AGENTS.md`, `mfz guide` — integration and documentation updates for Executor routing. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)
- [2026-07-17 04:27] `/home/mark/code/mindframe-z-personal-home` profile — migrated to Executor routes for Context7, DeepWiki, OpenAI Docs, AWS Knowledge, X Docs, with FFF, QMD, Pine Script, Exa, Exa Research, Home Assistant kept direct; `"npm:executor"` pinned to `1.5.33`. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)
- [2026-07-17 04:27] Test suite additions: direct-only regression tests, fake-loopback adapter tests, reconciliation lifecycle tests, mixed-route dry-run coverage, failed-startup rollback coverage. (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6e54154b001fZIkQG2Kcl34Th)

## Sources

- Prototype branch `prototype/executor-mcp` at commit `c6856b2f5fe73e08b0650684987ad567a4e56412`, repo `/home/mark/code/mindframe-z` (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c0bc631002cPsaKfkZK9qAjZ)
- Executor reference checkout `/home/mark/.mindframe-z/references/executor` at commit `13732fe40b3f715ac9b78bb2ef1c3abeffc60885` (ses_093f4a973ffex1eaAA1LwTTqFM · msg_f6c1eb16500215URzyeVdjFzR2)
