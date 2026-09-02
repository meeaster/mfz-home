# Log

## 2026-09-01 - Initial design

- Added a role-based triage lane for one reported issue or symptom.
- Chose Luna/max for bounded diagnosis that needs deeper synthesis than routine exploration or retrieval.
- Kept the agent promptless so it inherits the provider prompt and receives task-specific behavior from the caller's brief.
- Made triage read-only and left implementation, remediation, acceptance, and independent review with their existing roles.

## 2026-09-01 - Initial live validation

- `mfz apply` rendered the active Work profile, and `opencode2 debug agents` resolved `triage` with an empty system prompt, Luna/max, denied file mutation, and denied recursive delegation.
- Fresh child session `ses_fa181db50ffeudx4hSI1PoGUkf` diagnosed one bounded configuration-precedence issue without writes.
- The result reported inspected scope, direct evidence, root cause, impact, uncertainty, and the smallest next action. It correctly found that Work extends `personal/base` and explicitly assigns `worker` to Luna/high, while the new triage assignment remains Luna/max.
