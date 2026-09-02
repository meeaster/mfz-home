# Log

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
