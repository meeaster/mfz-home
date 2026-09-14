# Log

## 2026-09-14 - Factual Session Archaeology

- Extended Inspect's evidence scope to factual prior-session lookup, metadata, cost, chronology, comparison, and reconstruction while retaining Luna/high and the read-only boundary.
- Routed session work by requested cognitive outcome rather than data source: Inspect owns facts; Session Analyst owns evaluative judgment about quality, intent adherence, behavior, efficiency, patterns, and recommendations.
- Kept Inspect's inherited prompt and existing skill access. Session work loads `agent-sessions`; analytical requests may use its packet or allow Session Analyst to retrieve focused missing evidence.
- After `mfz apply`, native Inspect child `ses_f6152df8effe242nF3q5urUC7d` loaded `agent-sessions` and compared two sessions' models, outcomes, steps, calls, durations, and token aggregates from read-only SQLite metadata. It returned native locators and a stable boundary without evaluating model quality or recommending a winner.

## 2026-09-01 - Initial design

- Added a current-state inspection lane between static source gathering and issue triage.
- Chose Luna/high for bounded retrieval and synthesis across cloud, runtime, and work systems.
- Kept the agent promptless so caller briefs and owning skills provide system-specific procedure.
- Allowed Bash for read-only CLIs while denying source mutation and recursive delegation.
- Kept diagnosis with `triage` and every external or source mutation behind explicit authority.

## 2026-09-01 - Initial live validation

- `mfz apply` rendered the active Work profile, and `opencode2 debug agents` resolved `inspect` with an empty system prompt, Luna/high, denied file mutation, and denied recursive delegation.
- Fresh child session `ses_fa16ca81dffeLJ5vcalZbS5vGe` inspected the current runtime configuration for `inspect`, `triage`, and `worker` without writes.
- The result reported inspection time, target, query coverage, current facts, evidence locators, exclusions, and uncertainty without drifting into diagnosis or recommendations.
