# Log

## 2026-09-14 - Analysis-Only Routing

- Accepted Sol/medium for Session Analyst and narrowed selection to evaluative reasoning about session quality, intent adherence, behavior, efficiency, patterns, and recommendations.
- Moved factual session lookup, metadata, cost, chronology, comparison, and reconstruction to Luna/high Inspect. Session Analyst may still retrieve focused raw records when an analytical question exposes an evidence gap.
- Reinterpreted the earlier Luna/Sol run: it mixed factual archaeology with evaluation. Future model comparisons must hold cognitive task shape constant.

## 2026-09-14 - Sol Medium Comparison

- Changed the native agent assignment from Luna/high to Sol/medium for a matched evaluation requested by the human after observing that the role combines bounded retrieval with consequential behavioral analysis and recommendations.
- Kept Luna/high as the baseline rather than treating the change as a proven promotion. The comparison reuses the same completed session corpus, brief, privacy boundary, and output contract, then evaluates coverage, decision preservation, unsupported claims, parent rework, tools, tokens, latency, and estimated cost.
- No role, permission, prompt, evidence, or authority boundary changed.
- A fresh child after `mfz apply` still ran Luna/high even though source, rendered, and watched files matched Sol/medium. Restarting `opencode-serve.service` was required; the next child metadata confirmed Sol/medium.
- In the matched full-workspace analysis, Sol/medium completed in 19 model steps, 36 tool calls, and 4m22s with 87,126 input, 9,083 output, 2,455 reasoning, and 909,056 cache-read tokens. Luna/high used 22 steps, 39 calls, and 4m45s with 107,894 input, 7,977 output, 5,967 reasoning, and 876,544 cache-read tokens.
- Sol produced a 17,237-byte note versus Luna's 12,245 bytes. It supplied denser coverage and locators and correctly identified the expected failed Git probe that Luna had incorrectly summarized as no tool-call failure.
- Both runs recommended weakening the accepted mandatory post-first-producer index policy because the matched prompt did not carry that human decision. Sol argued for the conflicting change more strongly. This case therefore supports better Sol factual coverage but does not yet establish better decision preservation or justify a permanent promotion by itself.

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
