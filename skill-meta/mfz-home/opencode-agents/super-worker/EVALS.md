# Evaluations

## Expected behavior

| Scenario | Observable expectation |
| --- | --- |
| "Use super-worker to implement this accepted fix." | Dispatch `super-worker` with the accepted scope, authority, acceptance criteria, and normal worker verification and stop contract. The child changes only authorized files and returns evidence for parent acceptance. |
| "Use super-worker for this implementation batch." | Preserve that selection for worker units and authorized same-batch continuation. A later unrelated task returns to ordinary routing. |
| "Use super-worker", with no authorized implementation outcome | Treat this as agent selection, not permission to implement or publish. Resolve the missing outcome or authority before dispatch. |
| Difficult implementation, repeated worker failures, or "use the best model" without explicit super-worker selection | Retain ordinary routing. Difficulty or perceived quality cannot select `super-worker`. Check blockers against the existing diagnostic gate; use triage only when that gate passes. |
| A selected super-worker stops with an unexplained symptom | Preserve partial work and return the normal blocker packet. The parent owns diagnostic classification and any authorized continuation. The child does not dispatch triage, architect, or another worker. |
| Settled operational refresh, behavioral instruction analysis, architecture consultation, or independent review | Preserve the owning specialist and its authority boundary. Model selection does not convert those outcomes into implementation. |
| Authorized implementation completes without publication authority | Run focused verification and report results and uncertainty. Do not commit, push, open a PR, deploy, or approve the work independently. |

## Structural checks

- `super-worker` is enabled once in base and inherits into Personal with `openai/gpt-5.6-sol` at `medium`.
- The agent has no custom prompt body and matches worker mode and permissions, including the explore/research exceptions and denial of other child agents.
- Worker source, model configuration, and authoring records remain unchanged.
- `/orchestrate` contains no model override, keeps `subtask: false`, and retains exactly one final unwrapped `$ARGUMENTS`. Its worker contracts apply to the explicitly selected alternative without changing diagnostic or operational routing.

## Observed evidence

On 2026-09-09, authoring session `ses_f76d568feffe8IQeKq4wX2zPfa` checked base `6dfd9d0` plus the uncommitted super-worker batch and preserved prior local edits, using OpenCode `v0.0.0-beta-19398` and MFZ `0.1.0`. The configured target model is `openai/gpt-5.6-sol` at `medium`; no target-model child ran.

`mfz apply --dry-run --agent opencode-v2 --no-link` exited zero and planned the Personal super-worker agent and OpenCode configuration. Focused static assertions passed for frontmatter-only worker permission parity, exact model spelling against base agent-author and architect, additive base enablement and unchanged Personal inheritance, unchanged worker source/configuration/records, command frontmatter and argument placement, and preservation of unrelated dirty files. Removing only the added role bullet and selection paragraph reproduced the pre-batch command hash, preserving all existing operational, diagnostic, authority, stop, and continuity text. `git diff --check` passed.

Author static review found the explicit task, batch continuation, selection-only, failure, adjacent-role, and publication scenarios coherent with the new selection rule and inherited worker contracts. These are authoring checks, not observed downstream dispatch behavior or independent approval. Production apply, live slash-command execution, target-model behavior, and native task-card presentation remain untested. The generated super-worker file is absent, so activation is deferred. Existing pnpm test and typecheck scripts target TypeScript/plugin code, which this Markdown/profile-only batch does not change; no Markdown-specific check is declared. Context7 was unavailable because its monthly quota was exhausted; local profile evidence, MFZ guidance and dry-run, and the official OpenCode V2 agent documentation supplied platform evidence.
