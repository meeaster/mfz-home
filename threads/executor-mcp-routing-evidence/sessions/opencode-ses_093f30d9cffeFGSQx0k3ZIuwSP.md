# Session ses_093f30d9cffeFGSQx0k3ZIuwSP — Executor Production Analysis: Config, Topology, and Reconciliation Semantics for Mindframe-Z MCP Routing

## Thread Relevance

Directly on-charter: this session is a read-only source analysis of the Executor reference clone (`/home/mark/.mindframe-z/references/executor`) covering exactly the charter's four facets — evidence (source-grounded findings on daemon/config/connections), decisions (recommended topology for staged migration), implementation primitives (SDK/API calls for idempotent apply), and remaining verification (explicit unproven points and open risks) for routing Mindframe-Z MCP services through Executor.

## Gaps

The dossier gives msg-id ranges and timestamps per phase but no explicit turn numbers; citations below use turn 1/2/3 mapped to the three phases (each a single prompt→response exchange) as the closest available locator. Several findings are explicitly flagged by the source agent itself as unproven/uncertain (see Open Questions) rather than gaps in extraction. Claude Code and Codex configuration syntax for stdio/HTTP MCP was not present in the inspected local clone, so those are noted as unverified rather than omitted.

## Phases

- [2026-07-16 17:50 → 18:00] Production configuration & lifecycle analysis — inspected daemon startup, scope/data dirs, executor.jsonc, connections/auth/secrets, stdio bridge, toolkit scoping, and checked whether v1.5.32 prototype limitations persist. (turn 1)
- [2026-07-16 18:01 → 18:30] Topology comparison & migration strategy — compared shared-catalog stdio bridges vs. per-harness instances vs. direct toolkit HTTP, and recommended a smallest-safe migration topology. (turn 2)
- [2026-07-16 18:31 → 19:37] Idempotent apply semantics & reconciliation algorithm — determined exact create/update/remove semantics for integrations, connections, and OAuth, and specified a non-destructive reconciliation algorithm. (turn 3)

## Decisions

- [2026-07-16 18:30] Recommended Topology A (one shared durable local daemon + one short-lived `executor mcp` stdio bridge process per harness, centralized credentials/catalog, browser elicitation via `--elicitation-mode browser`) as the smallest safe topology for staged "mostly Executor" migration, over Topology B (per-harness data-dir/scope/daemon instances) and Topology C (direct authenticated toolkit HTTP) — Topology B duplicates auth/integrations and multiplies reconciliation surfaces, and Topology C is currently unsafe because `/mcp/toolkits/<slug>` opens a second local executor against an already-owned SQLite data dir, plausibly reproducing the v1.5.32 "toolkit + SQLite" failure. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 18:30] Decided Topology B is an acceptable fallback only when hard per-harness credential isolation is required immediately, and Topology C must not be the migration foundation in v1.5.33 pending a fix and test of the SQLite ownership conflict. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 19:37] Adopted a non-destructive, read-then-update/create reconciliation algorithm (read current state → create only if absent → update in place preserving auth-template slugs → never overwrite existing connections via `create` → parallel-authorize new OAuth connections and cut over only after health check → treat absent desired entries as unmanaged rather than deletable by default) because `addServer` is not idempotent and `connections.create`/`configureAuth(mode:"replace")` can silently strand or replace existing credentials. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)

## Learnings

- [2026-07-16 18:00] Snapshot under analysis is checkout `v1.5.33-1-g13732fe4` (commit `13732fe40b3f715ac9b78bb2ef1c3abeffc60885`), clean worktree tracking `origin/main`, CLI package version 1.5.33. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 1)
- [2026-07-16 18:00] The daemon owns SQLite exclusively; `executor mcp` is a stdio-to-HTTP bridge only and does not open the database, so transient client exits do not destroy server state (`apps/cli/src/main.ts:1337-1357,1441-1477`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 1)
- [2026-07-16 18:00] All `/api` and `/mcp` requests are bearer-gated, including loopback traffic; the bearer token is persisted in `auth.json` and in a `0600` local-server manifest (`apps/local/src/serve.ts:298-306,392-405`; `apps/cli/src/local-server-manifest.ts:50-65`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 1)
- [2026-07-16 18:00] Config schema defines declarative `integrations` and `secrets`, but the local boot path only loads `executor.jsonc#plugins` — no discovered local call applies declarative `integrations` entries at boot, so `executor.jsonc` alone is not sufficient for file-driven reconciliation (`apps/local/src/executor.ts:48-88`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 1)
- [2026-07-16 18:00] Source evidence indicates the v1.5.32 prototype's toolkit/SQLite and stdio plaintext/persistence limitations are addressed in this snapshot: stdio auto-connection and legacy healing exist, stdio secrets are connection-backed not plaintext, SQLite has an explicit ownership lock, and toolkits have tested SQLite-compatible storage — but the 1.5.32 changelogs contain only dependency bumps and do not document the original issue or its fix, so this cannot be conclusively confirmed as the fix for the specific prototype-observed bug (`packages/plugins/mcp/CHANGELOG.md:13-21`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 1)
- [2026-07-16 18:30] `/mcp/toolkits/<slug>` calls `createExecutorHandle({ activeToolkitSlug })`, creating a second local executor that opens the same `$EXECUTOR_DATA_DIR/data.db`; the ownership primitive explicitly rejects a second process/handle with `SQLITE_BUSY`/`SQLITE_LOCKED` (`apps/local/src/main.ts:89-104`; `apps/local/src/db/data-dir-ownership.ts:35-50,94-103`). Toolkit e2e tests prove policy/routing but not that the production local server can safely create this second scoped executor against an already-owned database. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 18:30] Browser elicitation is supported over toolkit HTTP in source (`elicitation_mode=browser` query param recognized and routed to a shared approval store), but this may be moot if the SQLite ownership failure occurs before a usable approval flow exists (`apps/local/src/mcp.ts:105-113,205-223`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 18:30] "One bridge for all harnesses" cannot mean one shared stdio process — stdio is point-to-point stdin/stdout, so the practical minimal model is one shared daemon plus one short-lived bridge process per harness. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 19:37] `addServer` is not idempotent: it checks `integrations.get(slug)` and returns `IntegrationAlreadyExistsError` if the slug exists, intentionally not overwriting tools/connections/policies (`packages/plugins/mcp/src/sdk/plugin.ts:873-901`). The lower-level `integrations.register()` does upsert, replacing plugin/name/description/config while retaining the integration row (`packages/core/sdk/src/executor.ts:1871-1907`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] Stable slug is necessary but not sufficient identity: integration identity is slug, connection identity is `(owner, integration, name)`, and the connection's auth-template binding is a separate axis — desired-state comparison must track all three plus OAuth client/scopes (`packages/core/sdk/src/executor.ts:255-265`; `packages/core/sdk/src/connection.ts:21-29,66-71`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] `configureServer` is row-preserving (records `config_revised_at`, does not delete/rewrite connections) but not necessarily connection-compatible — if new config removes/renames an auth-template slug that an existing connection's `template` points to, credential resolution can break silently (`packages/core/sdk/src/executor.ts:1910-1935,3043-3127`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] `configureAuth` defaults to `merge` (preserves existing auth methods, replaces matching slugs, assigns `custom_*` slugs to new entries); `mode:"replace"` replaces the complete auth-template set and can strand existing connections whose `template` references a removed slug. For stdio MCP, `configureAuth` is explicitly a no-op (`packages/plugins/mcp/src/sdk/plugin.ts:1125-1155`; `packages/core/sdk/src/integration.ts:115-153`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] `connections.create` is an upsert keyed by `(owner, integration, name)` — calling it with guessed/empty credential values during reconciliation can silently replace an existing credential binding; `connections.update` deliberately only changes `description`/`identityLabel`, never credentials/template/provider/OAuth lifecycle; `connections.remove` is destructive (deletes connection, tools, and definitions) (`packages/core/sdk/src/executor.ts:2265-2447,2605-2632,2634-2679`; `packages/core/sdk/src/connection.ts:119-124`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] Removing an OAuth client does not cascade-delete connections, but affected connections fail at next refresh and require reconnection; re-minting an OAuth connection with the same `(owner, integration, name)` updates OAuth fields while retaining the curated description (`packages/core/sdk/src/oauth-client.ts:267-278`; `packages/core/sdk/src/executor.ts:2449-2570`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] Safe, secret-free comparison is possible via `executor.integrations.list/get`, `executor.connections.list/get`, and MCP's `getServer` — all return identity/metadata/health without credential values, suitable as the read side of an apply controller (`packages/core/sdk/src/integration.ts:81-112`; `packages/core/sdk/src/executor.ts:255-268,294-317`; `packages/plugins/mcp/src/api/handlers.ts:119-135`). (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)

## Artifacts Touched

None — this was a read-only analysis session; no files were created or edited.

## Open Questions

- [2026-07-16 18:30] Whether the v1.5.33 toolkit HTTP `/mcp/toolkits/<slug>` SQLite ownership lock is actually triggered in production under concurrent connections — source indicates the risk via `data-dir-ownership.ts:35-50,94-103`, but no test proves or disproves the production scenario is safe. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 18:30] Whether Claude Code and Codex can support direct authenticated toolkit HTTP (Topology C) — requires preserving a custom bearer header and `elicitation_mode=browser` query param; not verified from the local Codex/Claude Code snapshots inspected. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 2)
- [2026-07-16 19:37] Whether all OAuth reconnect triggers (changed declared scopes vs. recorded granted scopes) are accurately modeled — behavior is documented and covered by OAuth tests but there is no concise public API for determining reconnect necessity from source alone. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] Whether config-revision lazy tool-catalog rebuilding is safe across every remote↔stdio transport mutation for existing connections — no source test proves this path is safe end-to-end. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] Whether there is any public operation to import an existing direct-harness OAuth refresh token into an Executor connection — source shows none; migration requires a parallel OAuth authorization flow rather than token adoption, condition to verify: check for a token-import API before committing to the parallel-auth migration path. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)
- [2026-07-16 19:37] Full end-to-end reconciliation loop under concurrent harness operations — the six-phase non-destructive algorithm is specified but its implementation and edge cases (e.g., simultaneous apply from two controllers) are not verified. (ses_093f30d9cffeFGSQx0k3ZIuwSP · turn 3)

## Sources

- Executor reference clone (local, read-only) — `/home/mark/.mindframe-z/references/executor`, checkout `v1.5.33-1-g13732fe4`, commit `13732fe40b3f715ac9b78bb2ef1c3abeffc60885`
- `apps/cli/src/main.ts` — daemon startup, locks, stdio bridge, CLI flags (lines 515-705, 1337-1512, 1441-1477, 2773-2790)
- `apps/cli/src/daemon-state.ts` — daemon dedup/state (lines 8-19, 63-100, 312-378)
- `apps/local/src/executor.ts` — data dir, tenant ID, plugin loading, stdio reconciliation (lines 34-88, 149-165, 216-234)
- `apps/local/src/db/owned-database.ts` — database ownership (lines 34-90)
- `apps/local/src/db/data-dir-ownership.ts` — SQLite ownership lock semantics (lines 35-50, 84-117, 94-103)
- `apps/local/src/serve.ts` — bearer auth gating, idle timeout (lines 298-306, 369-374, 392-405)
- `apps/local/executor.config.ts` — static plugin config, `dangerouslyAllowStdioMCP`, toolkit slug (lines 33-56)
- `apps/local/src/main.ts` — `/mcp` vs `/mcp/toolkits/<slug>` routing (lines 80-104)
- `apps/local/src/mcp.ts` — toolkit routing, elicitation mode (lines 105-113, 205-223)
- `apps/cli/src/local-server-manifest.ts` — bearer token manifest (lines 50-65)
- `packages/core/config/src/load-plugins.ts` — plugin loading (lines 62-159)
- `packages/plugins/mcp/src/sdk/plugin.ts` — addServer/configureServer/configureAuth, stdio connector, reconciliation (lines 360-376, 553-588, 873-1155, 960-1034)
- `packages/plugins/mcp/src/sdk/types.ts` — integration/connection/auth types (lines 14-223)
- `packages/plugins/mcp/src/sdk/stdio-connector.ts` — stdio cwd handling (lines 18-30)
- `packages/plugins/mcp/src/sdk/catalog-sync.test.ts` — catalog refresh (lines 1-14, 71-165)
- `packages/plugins/mcp/src/api/handlers.ts` — server API handlers (lines 90-159)
- `packages/plugins/mcp/README.md` — stdio safety flag docs (lines 19-43)
- `packages/plugins/mcp/CHANGELOG.md` — dependency-only changelog (lines 13-21)
- `packages/plugins/toolkits/src/server.ts` — toolkit policy/connection storage (lines 688-709)
- `packages/plugins/toolkits/src/server.test.ts` — toolkit tests (lines 8-161)
- `packages/plugins/toolkits/src/shared.ts` — toolkit CRUD/policy APIs (lines 86-165)
- `packages/plugins/toolkits/CHANGELOG.md` — dependency-only changelog (lines 12-19)
- `packages/core/sdk/src/executor.ts` — integrations/connections CRUD, OAuth minting (lines 255-323, 1871-1935, 2265-2694, 3043-3127)
- `packages/core/sdk/src/connection.ts` — connection identity, OAuth metadata (lines 13-92, 119-124)
- `packages/core/sdk/src/integration.ts` — integration metadata, auth-template merge (lines 81-153)
- `packages/core/sdk/src/oauth-client.ts` — OAuth client removal behavior (lines 267-278)
- `packages/core/sdk/src/plugin.ts` — lazy OAuth token refresh (lines 203-242)
- `packages/core/sdk/src/core-tools.ts` — agent-facing integrations/connections APIs, secret handling warnings (lines 524-634)
- `packages/hosts/mcp/src/tool-server.ts` — elicitation resume metadata (lines 82-101)
- `packages/hosts/mcp/src/envelope.ts` — toolkit MCP route (lines 280-309)
- `packages/hosts/mcp/src/in-memory-session-store.ts` — browser mode for HTTP MCP sessions (lines 211-235)
- `e2e/selfhost/toolkits-mcp.test.ts` — toolkit scoped tool exposure tests (lines 111-143)
- `e2e/local/toolkits-mcp.test.ts` — toolkit routing/isolation tests (lines 231-315)
- `README.md` — install/daemon lifecycle docs (lines 51-60, 159-166)
- `opencode.json` — OpenCode `executor mcp` configuration example (lines 3-17)
- `/home/mark/.mindframe-z/references/opencode/packages/opencode/src/config/config.ts` — OpenCode remote MCP URL/header support (lines 64-99)
