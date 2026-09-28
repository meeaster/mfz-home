# Child continuity

Use `effort-context` for effort resume and harness-specific history recovery. A delegated orchestrator uses assigned workstream records and does not pull its parent's session unless explicitly assigned a named-session read.

## Choose child continuity

Authority is independent of session reuse. Choose the owner first, then decide whether its retained context helps the next assignment.

The retained human-selected cost limit still applies: do not resume `artifact-author`, `agent-author`, or a child explicitly known from the human's selection to use Sol when its latest recorded request-input context exceeds 150,000 tokens. Start fresh in the same authorized role. This does not interrupt an active call. Unknown telemetry remains unknown; cumulative processed input is not the current context size. Do not inspect configured defaults or commission archaeology to infer coverage.

| Role | Continuity preference |
| --- | --- |
| `orchestrator` | Reuse within a coherent workstream, with one active execution. The Chief applies its workstream guidance for related follow-ups and approval of additional orchestrators. Replace stale or looping context with a workspace-backed handoff. |
| `scribe` | Reuse with incremental pulls until parent compaction, then complete the continuity check and rotate. |
| `explore`, `research`, `inspect` | Fresh for a new bounded unit. Resume an unresolved investigation when retained state helps and independence is not needed. Shared repository or topic alone is insufficient. |
| `architect`, `ui-ux-designer` | Resume the same decision and system boundary for corrections or new evidence. Start fresh for a distinct decision or authorized independent opinion. |
| `worker`, `operator`, `agent-author`, `prototype` | Fresh for a distinct unit, including a separate feature after acceptance. Immediate repairs or continuation after a clean stop may reuse useful context within the same objective, authority, and safe state. |
| `artifact-author` | Continue a useful unresolved revision below the hard limit. After a validated revision, prefer fresh context around 100,000 request-input tokens when the artifact and handoff preserve understanding. This is a soft role-specific preference. |
| `reviewer`, `pr-reviewer` | Fresh initial independent judgment. Resume missing evidence or adjudication within an unconcluded review, or a warranted focused repair check under the [review guidance](acceptance-and-review.md#independent-review). Use a fresh reviewer for a fresh independent judgment. Repairs have another owner. |
| `triage` | Fresh for a looping mutation blocker; resume within the same authorized incident as evidence develops. |

- Preserve current artifacts, accepted decisions, relevant evidence, exact remaining work, and safely retained state in a fresh handoff. Report material gaps instead of resuming past the hard limit.
- A changed implementation mechanism alone need not create a new unit. A new ownership boundary, independent judgment, obsolete revisions, or looping investigation favors fresh context.
- Keep focused lookups and procedural corrections with the current authorized owner. Novel troubleshooting belongs to a worker, not a resumed operator merely because it has history. A standalone mechanical refresh belongs to operator even when an author previously owned the artifact; coupled worker delivery follows execution ownership.
- Compare useful retained context with the cost of carrying the remaining history through the expected work. Include fresh-child briefing, likely rediscovery, and verification in that comparison; preserve sufficient understanding and quality.
- Use available request-context and model-priced usage evidence when it can materially change the choice. A routine dispatch does not require a cost audit. Unknown telemetry remains unknown rather than creating a session-archaeology requirement.
- Cached input still occupies context and costs money; fresh sessions do not guarantee cache hits. Treat cost savings as estimates unless measured. Do not invent further retry, turn, or compaction thresholds.
