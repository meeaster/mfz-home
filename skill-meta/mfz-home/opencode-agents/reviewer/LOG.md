# Log

## 2026-08-28 - Inherited Inspection Permissions

- Replaced the deny-by-default allowlist with inherited global permissions plus explicit denies for `apply_patch`, `edit`, and `write`.
- Allowed shell access so the reviewer can inspect diffs, run focused checks, and gather repository evidence without routing every command through the parent.
- Accepted that OpenCode permissions do not sandbox shell commands; the reviewer remains behaviorally read-only, while file-editing tools are mechanically denied.

## 2026-08-08 - Initial Reviewer Design

- Chose the role-based name `reviewer` so independent judgment remains the stable behavior while Sol/high remains replaceable configuration policy.
- Chose Sol/high as the initial quality-first review model.
- Kept the agent promptless so it inherits OpenCode's standard GPT provider prompt and receives its review charter from the caller.
- Assigned review cadence and acceptance to the parent or owning workflow rather than automatically pairing one review with every worker result.
- Chose deny-by-default permissions with explicit read and search capabilities so current and future mutation tools remain unavailable without review.
- Grounded the initial role in a read-only analysis of OpenCode sessions through child session `ses_020050c84ffe37i7ktpQFmSABS`, which found Sol/high concentrated in independent review and verification while Luna/max handled bounded implementation and remediation.

## 2026-08-08 - Initial Live Validation

- OpenCode 1.18.15 loaded the rendered Personal profile from Git revision `5374e46` plus the uncommitted agent and profile changes under evaluation.
- The validation prompt asked the child to inspect `opencode/agents/worker.md` against five explicit structural requirements and return findings without edits; it did not exercise a supported defect or native web presentation.
- `mfz apply` rendered a frontmatter-only agent, and `opencode debug agent reviewer` resolved `prompt: ""`, Sol/high, denied editing, and denied task, `delegate_general`, and todo tools.
- Fresh parent session `ses_01fc2f2cdffeg2iZZfYH2AR8Pk` invoked the native task tool and created reviewer child `ses_01fc2d293ffev4t4ecRxulwadB`.
- The session store confirmed `openai/gpt-5.6-sol@high`; the child reviewed the worker definition, returned an evidence-backed no-findings verdict, and made no edits.

## 2026-08-08 - Read-Only Boundary Review

- Reviewer child `ses_01fc1b10fffee0ErjuoK6o0csw` found that denying edit tools alone left mutation paths through inherited shell and code-mode execution.
- Denied shell, code-mode execution, and advisor calls; the parent now owns diff discovery and validation evidence as part of the review brief.
- Restricted reviewer child `ses_01fbc518bffeIVzKf0hDdaUcKt` then found that default-allow permissions still exposed unlisted mutating MCP or future plugin tools.
- Replaced enumerated mutation denies with a default deny and a narrow read/search allowlist.
- `opencode debug agent reviewer` confirmed mutation, shell, code-mode execution, advisor, todo, and delegation tools disabled while read and search tools remained available.
- Fresh deny-by-default reviewer child `ses_01fb96250ffeDT2SgWkYrnsglx` read only the runtime definition and vision, confirmed their agreement, and completed without shell or edits.
- Restated credential and Mindframe-Z secret-path denies after broad read allowances when Research refactoring exposed the per-agent permission merge-order hazard.
