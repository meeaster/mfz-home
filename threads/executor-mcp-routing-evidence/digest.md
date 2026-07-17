# Digest — executor-mcp-routing-evidence

## Current State
Mindframe-Z's MCP routing through Executor has moved from prototype to a real, applied implementation. The settled architecture keeps Mindframe-Z's `catalog/mcp.yml` and profile MCP selection canonical, with Executor as a routing destination selected per-server, one shared durable Executor daemon serving a short-lived `executor mcp --scope <harness> --elicitation-mode browser` stdio bridge per harness, and full shared visibility across agents (no per-harness Executor toolkits or instances — that path was tried and rejected). `mfz apply` was extended to reconcile Executor state directly, using a non-destructive read-then-create/update algorithm that never overwrites or deletes existing OAuth-backed connections. This was implemented, applied live to the personal-home profile (five remote servers now routed through Executor, reused without reauthorization across repeat applies), and passed the full check/test suite. However, a subsequent thorough code review found 5 P1 blockers (routing model not a required discriminated union, OAuth reconciliation that can't converge, secret leakage in "non-secret" snapshots, an incorrect dry-run, and non-atomic apply ordering) plus 4 P2 issues. Remediation was requested and started but not confirmed complete as of the last session. Several verification items — live browser OAuth, refresh-token lifecycle, scope-based reconnect blocking, and full three-harness (OpenCode/Claude Code/Codex) smoke tests — remain unrun.

## Components
- **Topology & routing model** — one shared Executor daemon + one per-harness `executor mcp` stdio bridge, with per-server routing decided via a route field in profile YAML · design settled and implemented, but code review flagged the routing field as an optional/collision-prone shape needing conversion to a required discriminated union — fix in progress, not confirmed done.
- **Reconciliation / apply integration** — non-destructive create/update algorithm for integrations, connections, and OAuth, folded into `mfz apply` rather than a separate command · implemented and live-verified for non-OAuth reuse (no duplication/reauth on repeat apply), but review found OAuth reconciliation doesn't actually converge (auth-template merge vs. replace, overbroad durable-state detection, removal bypassing MCP cleanup) and dry-run/apply have correctness and atomicity gaps — fix in progress.
- **OAuth / credential preservation** — browser-only OAuth, health-gated cutover (register in Executor, start OAuth, wait for health, then switch harness config), no token import from existing harness configs · design settled and coded; live end-to-end OAuth flow, refresh-token survival across repeated applies, and scope-triggered reconnect blocking are all still unverified, and review found literal secrets leaking into "non-secret" state snapshots.
- **Server migration (personal-home profile)** — Context7, DeepWiki, OpenAI Docs, AWS Knowledge, X Docs routed through Executor; FFF, QMD, Pine Script, Exa, Exa Research, and Home Assistant kept direct · applied and passing tests; FFF is considered architecturally incompatible (Executor's fixed global cwd vs. FFF's project-scoped stdio) rather than pending, the rest are staged for later migration.
- **Toolkit-based per-harness isolation** — using Executor toolkit slugs (`/mcp/toolkits/<slug>`) as an access-control boundary per harness · rejected: prototype (v1.5.32) hit a SQLite data-store lock on toolkit-scoped serving, and production-snapshot (v1.5.33) source analysis indicates the same second-owner SQLite ownership conflict likely still applies, so this is not a safe migration path; shared-catalog visibility was adopted instead.
- **Cross-cutting** — routing must never silently touch OAuth-backed credentials (no overwrite, no delete, no plaintext import), and every reconciliation comparison must work from non-secret identity/metadata only (`integrations.list/get`, `connections.list/get`), never reading credential values.

## Direction
- Finish the code-review remediation: convert routing to a required discriminated union, fix OAuth reconciliation convergence (replace-not-merge semantics where needed, tighten durable-state detection, wire removal through MCP cleanup), stop secret leakage in snapshots, make dry-run diff off stored digests and share planning logic with live apply, and reorder apply so Executor reconciliation can't partially mutate state ahead of a later failure.
- Work is filed in the OpenSpec change `add-executor-mcp-routing` (proposal/design/specs/tasks) — resume there.
- Run the still-open live verifications: browser OAuth accept/cancel against a real provider, refresh-token lifecycle across repeated `apply`, missing-scope reconnect blocking, and full three-harness (OpenCode, Claude Code, Codex) smoke tasks through the Executor bridge.
- Once the OAuth path is trusted, extend migration to the deferred credentialed/local servers (Exa, Exa Research, Home Assistant) and confirm actual upstream tool invocation (not just connection) for stdio servers kept on Executor (Pine Script, QMD).

## Open Questions
- Does browser OAuth acceptance/cancellation work end-to-end against a real provider (dynamic registration, start, completion)?
- Does the refresh-token lifecycle survive repeated `apply` runs?
- Does a missing OAuth scope correctly block cutover to Executor?
- Do live three-harness (OpenCode, Claude Code, Codex) smoke tasks succeed with full task execution through the Executor bridge?
- Will the in-progress remediation resolve all 5 P1 blockers and 4 P2 issues from the thermo-nuclear code review?
- Is the `/mcp/toolkits/<slug>` SQLite ownership lock actually triggered in production under concurrent connections, or is the risk merely plausible from source inspection?
- Can Claude Code and Codex support direct authenticated toolkit HTTP (the rejected Topology C), preserving a bearer header and `elicitation_mode=browser`? (Low priority given Topology C is not the chosen foundation.)
- Are all OAuth reconnect triggers (declared vs. recorded granted scopes) accurately modeled?
- Is config-revision lazy tool-catalog rebuilding safe across every remote↔stdio transport mutation for existing connections?
- Does actual upstream tool invocation (not just connection) succeed for Pine Script and QMD through Executor's stdio bridge?
- Do Exa, Exa Research, and Home Assistant work through Executor once credentials/OAuth are configured (Home Assistant's secret-in-URL-path scheme still has no confirmed Executor-compatible encoding)?

## Key Decisions
- Topology: one shared, durable local Executor daemon plus one short-lived `executor mcp --scope <harness> --elicitation-mode browser` stdio bridge per harness, with centralized credentials/catalog — chosen over per-harness Executor instances (acceptable only as a fallback for hard credential isolation) and direct authenticated toolkit HTTP (unsafe as a foundation due to the SQLite ownership conflict).
- Mindframe-Z's `catalog/mcp.yml` and profile MCP selection stay canonical; Executor is a routing destination, not a catalog replacement, selected per-server via a routing field in profile YAML.
- Every connected agent sees everything registered in Executor (shared visibility) — no per-agent Executor toolkits or separate instances.
- `mfz apply` configures Executor directly as part of the normal apply workflow, rather than requiring a separate `mfz executor sync`/`status` command (an earlier design that introduced a second command was reversed as a workflow violation).
- OAuth connections are durable user state: reconciliation must never recreate or overwrite them — identify integrations by stable catalog slug, never read token values, preserve existing connections/clients/tokens/scopes, and block (never delete) removal of an OAuth-backed integration still present in Executor but absent from the profile.
- OAuth is browser-based only; no import of existing harness OAuth tokens into Executor connections.
- For migrating an OAuth-backed direct MCP server, keep the direct config active, register the server in Executor, run a separate OAuth flow, wait for health, and only then cut the harness over — never drop a working connection mid-migration.
- FFF stays on direct MCP rather than Executor — Executor's fixed global cwd is incompatible with FFF's project-scoped stdio requirement.
- Toolkit-based per-harness isolation is rejected for now; retain the single shared Executor catalog exposed via the unscoped stdio bridge.

## Design
```
      Mindframe-Z catalog/profile (canonical desired state)
                        │
               per-server "route" field
                        │
        ┌───────────────┴────────────────┐
        │                                  │
   route: executor                    route: direct
        │                                  │
        ▼                                  ▼
 ┌───────────────────┐            harness-native MCP
 │  Executor daemon   │            (FFF; staged: QMD, Pine
 │ (shared, owns       │            Script, Exa, Exa Research,
 │  SQLite + auth)     │            Home Assistant)
 └─────────┬───────────┘
           │ executor mcp --scope <harness> --elicitation-mode browser
   ┌───────┼────────┬─────────────┐
   ▼       ▼        ▼
OpenCode  Claude   Codex     (one short-lived stdio bridge per harness,
                              full shared visibility into Executor's catalog)
```

## Intent
The user wants to move Mindframe-Z's MCP routing "mostly" onto Executor rather than replacing it entirely — starting from a working prototype branch, they want a staged migration that proves reliability before cutover. The recurring, non-negotiable driver is credential safety: any reconciliation must never break or overwrite a working OAuth-backed MCP connection. Equally important to them is that this integrate into the existing `mfz apply` workflow rather than bolt on a new command, and that Executor be treated as just one more routing option in the catalog rather than a special-cased subsystem.

## Vision
The user sees Executor as an aggregation layer that should eventually carry most of Mindframe-Z's MCP traffic — remote/global integrations first (Context7, DeepWiki, OpenAI Docs, AWS Knowledge, X Docs, Exa/Exa Research), then credentialed and local-stdio servers, with per-harness selection still expressible even though Executor exposes one shared catalog. FFF and (currently) Home Assistant are understood as likely permanent or long-term exceptions rather than gaps to close. The vision has firmed from "replace all MCP servers" (initial framing) to a bounded, catalog-authoritative, apply-integrated routing layer with OAuth durability as a hard constraint.

## Perspective
The user thinks of Executor as "just another entry in the MCP" — configuration should flow through normal profile/catalog mechanics, not a parallel system, and they pushed back when the design drifted toward a second command (`mfz executor sync`) or toward Executor owning state outside the catalog. They are comfortable with full shared visibility across agents (dropping earlier instinct toward per-harness isolation) once toolkit-based isolation proved technically broken. Their strongest and most consistently repeated concern is OAuth safety — they explicitly want assurance that reconciliation logic will not silently recreate, replace, or strand a working OAuth connection, and they're willing to accept a slower, health-gated, re-authorize-then-cutover migration path to get that guarantee rather than importing tokens. They're rigorous about verification: after implementation "worked," they still requested a "thermo-nuclear" adversarial code review rather than treating passing tests as sufficient, and immediately asked for the resulting P1 issues to be fixed rather than deferred.

## Sources
- executor — https://github.com/rhyssullivan/executor.git
- opencode — https://github.com/anomalyco/opencode.git
