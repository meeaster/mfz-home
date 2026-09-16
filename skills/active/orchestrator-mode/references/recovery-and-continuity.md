# Recovery and continuity

Read this reference when continuing work that began before a compaction or interrupted response, when an existing orchestration workspace may need reconciliation, or when deciding whether to resume or replace a child.

## Resume the same effort

First decide whether the next unit is new work or continues work that began before the latest compaction or interrupted response.

- A genuinely new unit after deliberate manual compaction does not recover the completed prior phase.
- Same-effort continuation starts from the active summary and current context.
- Compaction alone does not require session reconstruction, but it does require reconciliation with external working state that the continuing unit still depends on.

### Locate the workspace

For same-effort continuation:

1. Recover the workspace locator from active context when available.
2. Otherwise, look for a matching orchestration workspace under `/tmp/opencode/orchestrator-workspaces/` whose name ends with this coordinator session ID.
3. Resume one matching workspace rather than initializing another workspace or coordinator file.
4. Treat zero matches as missing temporary working state, not missing session history.
5. Treat multiple matches as a continuity gap and reconcile ownership before writing.

Inventory coordinator files and evidence filenames before creating or replacing anything. A directory listing establishes presence only; it does not establish freshness or authority.

### Reconcile the working state

- Read `context.md` first when it exists.
- Compare its objective, phase, accepted decisions, authority, invariants, open questions, and next move with the active summary.
- Read `coordination.md` when current unit or acceptance status matters.
- Check `index.md` against the surviving `evidence/` inventory before relying on it.
- Read only the producer notes needed for the next decision.
- Compare mutable repository, runtime, or external state when the next action depends on it.
- Classify absent, partial, stale, or contradictory files as named continuity gaps rather than silently choosing one account.

Do not treat temporary files as the trace authority. Durable session history remains the sole trace-evidence backbone, and current source or runtime state remains authoritative for mutable external facts.

Reconciliation is complete when active context, selected workspace state, and relevant current source or runtime state support the same next action and authority boundary.

### Recover coordinator files

Treat `index.md` as a derived catalog.

- If it is unexpectedly absent, truncated, or inconsistent with `evidence/`, inventory completed producer notes and returned handoffs before writing it.
- Rebuild a complete-enough catalog from surviving notes and known producer returns, preserving material freshness, gaps, conflicts, and supersession.
- If complete recovery is disproportionate or impossible, label catalog coverage as partial and identify unindexed files or unresolved ranges.
- Never create a normal-looking index containing only the newest note when older completed notes survive.

Treat `context.md` as a semantic checkpoint, not a transcript.

- Create or refresh it when shared priorities, accepted decisions and rationale, phase state, authority, invariants, or open questions will evolve or would otherwise be lossy or expensive across later dispatches.
- A material phase transition, consequential mutation or rollback, or deliberate handoff or compaction is a positive checkpoint trigger when current state would otherwise be expensive to reconstruct.
- Replace stale current-state text rather than appending an activity history.
- Record a reconstructed checkpoint as reconstructed with its evidence boundary; do not present it as a historical file that previously existed.

### Recover an interrupted response

An empty, aborted, or interrupted assistant response is not a compaction.

- Reconcile whether pending tools, children, or external mutations completed before retrying.
- Inspect current state before repeating a possible side effect.
- Continue the accepted request when it remains present in durable active context; do not require the user to repeat it merely because the response was interrupted.
- Report the exact blocker when durable context or current state cannot support safe continuation.

## Reconstruct a material session gap

- Treat durable OpenCode session history as the sole trace-evidence backbone.
- After compaction, continue from the active summary and context by default.
- Consider reconstruction only when the current unit of work began before the latest completed compaction and still depends on material decisions, evidence, child results, user corrections, authority, or unresolved state that the active context does not preserve adequately.
- A genuinely new unit after deliberate manual compaction needs no recovery of the prior phase.
- Continuing the same work after manual or automatic compaction also does not trigger recovery when the active summary is sufficient.

- When a material continuity gap remains, dispatch a coordinator-owned `inspect` unit with this coordinator's session ID, current objective and phase, latest relevant compaction boundary when known, specific missing facts, known relevant child IDs and roles, privacy or exclusion limits, and the expected compact decision packet.
- Request the smallest targeted reconstruction that crosses the relevant boundary; for work spanning multiple compactions, recover the relevant phase from its meaningful start rather than mechanically reading one prior segment or replaying the whole session.
- A parent-facing orchestrator returns gaps in the assigning parent's context to that parent rather than retrieving its history without supplied authority.
- Escalate the reconstructed packet to `session-analyst` only when continuation depends on evaluative judgment rather than missing facts.

- The packet should contain only what changes continuation: accepted user decisions and corrections, the current working model, consequential evidence and locators, child contributions and reusable session IDs, completed mutations and validation, unresolved questions, authority boundaries, freshness or mutable-state gaps, and the exact next move.
- Treat it as evidence: check it against active context, resolve conflicts or bounded gaps with focused follow-up, and synthesize it into the live working model.
- Create a persistent artifact only through a separately requested owning workflow such as a handoff, Session Brief, work-context checkpoint, or OpenSpec artifact.

## Choose source-gatherer continuity

- Start a fresh `explore`, `research`, or `inspect` session for each bounded source-gathering unit by default.
- A shared topic, repository, role, or vocabulary is not continuity.
- Resume only when the unit directly continues the same unresolved investigation for the same downstream decision, keeps the same role and materially overlapping evidence family, needs no independent judgment, and would materially benefit from retained state that a compact message cannot preserve.
- Exact conversational or execution state can be that benefit when it matters.
- Context burden, staleness, compaction, verbose traces, failures, retries, and unrelated work favor freshness when known; do not perform session archaeology merely to estimate them.
- Visible high context utilization is advisory rather than a cutoff, missing telemetry says nothing about context size, and prompt-cache savings never independently justify resume.

## Choose role-specific continuity

- For non-source roles, base continuity on the context each role accumulates.
- Resume `architect` or `ui-ux-designer` throughout the same authorized downstream design engagement, including human correction, rejected assumptions, reframing, option refinement, new checked evidence, explanation, and bounded extension within the same decision and system boundary.
- Disagreement alone favors continuity because rationale and tradeoff history remain useful.
- Start fresh for a materially new downstream decision or system boundary, an explicitly authorized independent second opinion, an unavailable or unusable prior session, or context that remains stale, overloaded, or assumption-contaminated after attempted correction.
- Apply bounded consultation authority separately from this continuity choice: replacing an unavailable or unusable session does not itself require new authority for the same approved engagement.
- When anchoring is suspected, resume the existing consultant with the human correction and ask it to reconsider rather than defend when the engagement still supplies authority; otherwise seek approval first.
- If anchoring persists, propose a separately authorized fresh opinion that supplements the prior engagement and receives verified constraints and evidence without disputed conclusions presented as accepted.

- After an operator or worker blocker passes the diagnostic gate in [Routing and roles](routing-and-roles.md), start `triage` fresh so diagnosis does not inherit the looping mutation trace.
- Otherwise resume `triage` for the same reported symptom or incident when continuing reproduction, carrying forward eliminated hypotheses, correcting a hypothesis, or adding evidence about that incident.
- Start fresh for a materially different symptom, incident, environment, or independent diagnosis.
- Triage remains read-only and never becomes the remediation agent.

- Start `agent-author`, `prototype`, `operator`, and `worker` fresh for each genuinely distinct accepted instruction-analysis or revision batch, prototype question or artifact, operational unit, or implementation unit.
- Resume a child that stopped cleanly on one bounded decision or incompatibility when the user's answer continues the same underlying objective and artifact or work unit, the checkout and artifact context remain relevant, authority is sufficient, prior mutations are absent or safely preserved, and retained evidence, setup, generated material, or working context has material value.
- A corrected mechanism, provenance model, implementation route, placement choice, or resolved blocker does not by itself create a new unit; state the correction explicitly when resuming.
- Select the owning role before continuity: if a generated-skill task becomes a settled upstream refresh as supplied, use `operator` with retained evidence rather than resuming `agent-author` solely because it has that evidence.
- Resume the author when authorized behavioral instruction analysis or adaptation remains the same work unit.

- Start `artifact-author` fresh for each distinct artifact or coherent artifact set.
- Resume it for feedback or correction on the same artifact and for an explicitly approved publication step in the same owning editorial lifecycle.
- Start fresh when the audience, destination, artifact set, authority, or outcome materially changes.

Start fresh when the accepted outcome, primary ownership boundary, artifact set, authority, system boundary, or validation contract creates a genuinely distinct unit; when prior context is stale, overloaded, looping, or assumption-contaminated; after substantial separate preparation whose setup history has no build value; or when independence is the purpose.

- After triage diagnoses a looping operator whose correction requires novel troubleshooting, route the authorized unchanged outcome to a fresh worker with the checked diagnosis and current state.
- After triage diagnoses a looping worker, prefer a fresh worker with the checked diagnosis and current state.
- Review findings that define a separate remediation unit also go to a fresh authorized worker with the accepted brief, evidence, exact repository state, and verification history; never send repair work to triage or the reviewer.

- Start `reviewer` and `pr-reviewer` fresh for independent initial judgment.
- Resume only to complete bounded missing evidence or conflict adjudication within the same unconcluded review engagement while its judgment remains relevant.
- Do not resume a reviewer to implement findings, approve its own repair, conduct a materially different review, or treat changed scope as the original diff.
- Coordinator verification remains the default after remediation.
- If the user separately approves another independent review, start a fresh reviewer.
- Authority gates always take precedence over continuity.
