# Log

## 2026-08-18 - Initial Session Analyst

- Added a dedicated native subagent instead of granting shell access to built-in `explore`, preserving Explore's read-only code-discovery boundary.
- Selected Luna/high as the initial policy for adapter-backed evidence analysis and made higher effort contingent on matched evaluation evidence.
- Kept `agent-sessions` as the single source of runtime modes, coverage, privacy, and adapter behavior; the agent prompt only requires loading it and defines the parent handoff.
- Denied mutation and recursive delegation while allowlisting the bundled OpenCode adapters, read-only SQLite and API access, and bounded Claude Code JSONL inspection commands.

## 2026-08-18 - Initial Live V2 Cost Evaluation

- Native child `ses_fec336e7affe6hRnJnZd8OBJl1` ran as `session-analyst` with Luna/high after hot reload.
- It loaded `agent-sessions`, executed the rendered cost adapter without reading its source, selected the V2 schema, and traversed one root plus one recursive child.
- It reported 65 persisted model steps, a `$4.698473` current-catalog estimate, `$0` stored cost, body exclusions, and a live-source mutability caveat with no permission friction.
- The result matched the prior parent-run adapter check and established that the dedicated agent fixes the shell-capability gap observed in Explore evaluations.

## 2026-08-18 - Read-Only Command Coverage

- A deeper live analysis exposed permission denials for the skill's documented `sqlite3 -json 'file:...?mode=ro'` form and for quoted V2 API paths carrying pagination parameters.
- Added narrow allowlist forms for SQLite URI read-only mode and single- or double-quoted `/api/session...` GET paths while retaining the default shell deny.
- Kept the earlier `sqlite3 -readonly` and unquoted API forms because both remain valid documented read-only routes.
- Native child `ses_fec2dfaf7ffejKgJzSRBr4L2us` verified both hot-reloaded forms: the SQLite schema-only query returned 20 tables, and the quoted API request returned one message plus bidirectional cursors through a body-free `jq` projection.

## 2026-08-18 - Trusted Read-Only Shell

- A continued multi-session analysis was blocked again when it composed a read-only `for` loop around allowed API and projection commands.
- Reversed the command-string allowlist and enabled shell composition for `session-analyst`; dedicated edit tools and delegation remain denied, while the prompt and `agent-sessions` retain the no-mutation evidence contract.
- Classified syntax-level permission rules as the wrong control for this role: they blocked legitimate adaptation, encouraged documentation sediment, and could not express semantic read-only shell behavior reliably.
- Added a composed multi-session evaluation and shifted maintenance toward observed trace failures rather than pre-authorizing individual command forms.
- Native child `ses_fec29159fffe04wg5etEFoZXaS` validated the hot-reloaded policy by composing a `for` loop with variable interpolation, quoted paginated API paths, pipes, and `jq`; both sampled sessions returned one record and a cursor with no permission friction or body exposure.
