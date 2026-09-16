# Recovery and continuity

## Reconcile the same effort

A genuinely new unit after deliberate manual compaction needs no recovery of the completed phase. For continuing work, including a new session resuming an earlier effort, begin with available conversation context. Before the next external action or creating/replacing coordinator files:

1. Find the effort under `/tmp/opencode/orchestrator-workspaces/` by the supplied effort name/path, available context, or a `sessions/<session-id>.md` marker for the current or named previous session. Reuse that directory. Ask only if the intended effort is ambiguous; no match means missing temporary state, not missing session history.
2. Read `context.md` first and compare it with the current request and available conversation context. Then consult coordination state, the evidence index, and selected notes as needed for the next action. Check index coverage against surviving evidence when relying on it.
3. Check relevant mutable source/runtime state. Identify absent, partial, stale, or contradictory information rather than silently choosing an account. Continue when context, workspace, and current state support the same next action and authority.

Add an empty `sessions/<current-session-id>.md` if absent, preserving all previous markers and working files. Resuming the effort does not rename its directory or require a separate binding or takeover procedure.

The index is a derived catalog. If missing or inconsistent, rebuild from completed notes and known handoffs; when full recovery is disproportionate or impossible, label coverage partial with unresolved ranges. Never initialize a normal-looking newest-note-only index while older evidence survives.

If `context.md` is missing, reconstruct it from available conversation and effort files after reconciliation, marking uncertainty and reconstruction accurately. Missing context alone does not require session-history inspection. Maintain it under [Workspace and coordination](workspace-and-coordination.md).

An interrupted response is not compaction. Reconcile pending tools, children, and possible effects before retrying; inspect state before repeating a side effect. Continue a durably available accepted request without requiring repetition from the human. Return the exact blocker if context or state cannot support continuation.

## Recover missing session meaning

Resume from the effort's working files and relevant current state. A new session, compaction, incomplete historical context, or a session marker alone does not justify reconstruction. Recover only enough context for the next bounded action.

Dispatch `inspect` for prior-session history only when a specific material gap blocks the next action and available conversation, effort files, and current state cannot resolve it, or when the human explicitly requests historical investigation. Name the missing fact and the action it controls. Supply session/known child IDs, objective/phase, relevant boundary, exclusions, and the smallest sufficient result. For multi-compaction work, follow the relevant phase rather than replay the whole history. Parent-facing coordinators return missing parent context to their parent rather than retrieving it without authority.

Require only facts affecting continuation: decisions, useful evidence and locators, child continuity, mutations and verification, unresolved state, freshness, and next action. Check against current context, resolve material conflicts, and synthesize. Use `session-analyst` only if evaluation, rather than factual reconstruction, is needed. Persistent handoffs or knowledge require their separately requested owning workflows.

## Choose child continuity

Authority is independent of session reuse. Apply these defaults within the authorized engagement:

| Role | Continue or start fresh |
| --- | --- |
| `explore`, `research`, `inspect` | Fresh for each bounded unit. Resume only the same unresolved investigation and downstream decision, in the same role and overlapping evidence family, without an independence need, when retained state adds value a compact note cannot preserve. Topic/repository overlap alone is insufficient. |
| `architect`, `ui-ux-designer` | Resume within the same decision and system boundary, including correction, disagreement, reframing, new evidence, or bounded extension. Start fresh for a materially new decision, unavailable/unusable session, or an authorized independent opinion. For suspected anchoring, first try explicit correction and reconsideration; a separately approved second opinion supplements prior work using verified constraints. |
| `triage` | Fresh after a looping mutation blocker passes the diagnostic gate. Otherwise resume the same symptom/incident, including new evidence or eliminated hypotheses; fresh for a different symptom, incident, environment, or independent diagnosis. |
| `agent-author`, `prototype`, `operator`, `worker` | Fresh for a distinct accepted unit. Resume a clean stop for one decision when the answer preserves the underlying objective/artifact, relevant checkout and useful context, sufficient authority, and safely preserved state. Corrected implementation route, mechanism, provenance, or placement alone need not make a new unit. |
| `artifact-author` | Fresh for a distinct artifact/set; resume feedback, correction, or approved publication in the same editorial lifecycle. Start fresh when audience, destination, artifact set, authority, or outcome materially changes. |
| `reviewer`, `pr-reviewer` | Fresh for independent initial judgment; resume only missing evidence or conflict adjudication within an unconcluded review. Repairs use another owner; a separately approved independent rereview starts fresh. |

Across roles, stale/overloaded/looping context, a distinct acceptance contract or ownership boundary, independence, and substantial preparation with no useful build context favor freshness. A checked looping-worker diagnosis or separate remediation unit normally goes to a fresh worker. A diagnosed operator problem requiring novel troubleshooting also goes to worker, not a resumed operator. Select the owner before continuity: an instruction task becoming a mechanical refresh belongs to operator despite retained author context.

Known trace burden, retries, and compaction can inform judgment without numeric thresholds. Missing telemetry is neutral; cache savings alone never justify resume. Do not commission session archaeology to estimate routine dispatch cost. Preserve continuity rules as revisable defaults and use explicitly requested post-hoc assessment, not automatic monitoring, to evaluate them.
