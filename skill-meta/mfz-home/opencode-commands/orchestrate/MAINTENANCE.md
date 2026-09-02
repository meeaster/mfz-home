# Maintenance

## Runtime dependencies

- OpenCode must expose native `explore`, `research`, `inspect`, `triage`, `architect`, `agent-author`, `prototype`, `worker`, `reviewer`, and `pr-reviewer` subagents.
- The primary session owns coordinator model and reasoning-effort selection; the command must not override either.
- `context-transfer` owns the parent-to-agent brief contract.
- The root-owned `session-analyst` supplies targeted reconstruction from durable OpenCode session history when active context has a material continuity gap.
- The `prototype` skill owns the native prototype agent's logic, state-model, and UI artifact procedures.
- The `pr-review` skill owns holistic merge due diligence; the native `pr-reviewer` owns its read-only execution boundary.
- Each agent's definition and authoring record own its model, permissions, and role boundary.

## Change procedure

1. Read this record and the records for every affected agent before changing routing, acceptance, or authority behavior.
2. Keep the command generic. Put project, OpenSpec, review-method, and domain-specific procedure in the owning workflow or child brief.
3. Preserve explicit user authority for every `agent-author`, `prototype`, `worker`, `reviewer`, and `pr-reviewer` dispatch. Read-only `explore`, `research`, `inspect`, and `triage` fan-out remains coordinator-owned.
4. Preserve the narrow planning exception: the primary may record an explicitly requested accepted design through its owning workflow, but that authority does not include implementation.
5. Preserve asymmetric context transfer: rich decision-relevant context goes to fresh children, while compact evidence packets return to the primary session.
6. Keep judgment with the coordinator. Children gather bounded evidence; the coordinator challenges, weighs, recommends, synthesizes, and accepts.
7. Select source gatherers by evidence source and required operation: static local file evidence uses `explore`, authoritative external documentation and upstream-source facts use `research`, and current or command-derived repository, runtime, cloud, deployment, or work-system facts use `inspect`. Read-only evidence gathering that requires command execution never goes to `explore` or `research`; split materially different evidence classes into bounded units. Keep `triage` goal-oriented around one reported symptom rather than using it for generic shell work.
8. Keep mutation authority outcome-scoped; do not silently expand commit into push, push into pull request or merge, draft into publication, or one system change into another.
9. Preserve continuity-aware routing. Maintain a compact child roster, resume when retained context has material value, and start fresh when independence, authority, scope, staleness, or bias requires it.
10. Treat provider cache reuse as opportunistic. Do not make correctness or routing depend on cache behavior that the runtime does not guarantee.
11. Keep code-heavy architecture synthesis with `architect` while user dialogue and final decisions remain with the coordinator. Require credible options where they exist, not an artificial quota.
12. Keep all architecture-specific `explore`, `research`, and `inspect` sessions root-owned. Assess every single or batched architect request for materiality, duplication, accepted scope, read authority, and existing-child overlap; run independent authorized units concurrently and dependent units serially.
13. Preserve the transport boundary: detailed evidence stays in gatherer sessions; do not replay transcripts, add a custom session-result tool, or teach the architect to retrieve sessions through OpenCode CLI or API.
14. Preserve recursive architect delegation denial. Reconsider it only when repeated live evidence shows material root-mediation delay or primary-context bloat that outweighs shared evidence ownership and simpler topology.
15. Preserve phase-aware guidance: recommend one next step, classify OpenSpec proportionally, and make risk-based review recommendations only after implementation. Agent-author completion receives coordinator verification without a review recommendation; a reviewer remains available only by independent user request. Recommendations never grant authority.
16. Route explicitly authorized AI-consumed instruction changes to `agent-author`, keep general application mechanics with `worker`, and preserve their interface when mixed work is split.
17. Keep agent authoring outcome-scoped; it does not imply publication, source-control operations, unrelated application changes, or independent approval. Inspect its artifacts, run focused validation, report uncertainty, and complete coordinator acceptance without recommending review.
18. Preserve proportional build preflight: `inspect` owns read-only readiness, the authorized prototype or implementation agent owns trivial or inherent setup, and an explicitly authorized worker may own substantial mechanically separable preparation.
19. After substantial preparation, require parent verification and normally start a fresh prototype or implementation agent with a narrow accepted-state brief. Serialize agents that share mutable checkout or external state.
20. Preserve dirty state before Git topology or synchronization mutations, resolve "get latest" into a specific operation, and keep Git, Jira, and environment authority separate unless one requested transaction inherently combines them.
21. Keep the preparation handoff fields and narrowed build brief aligned with `EVALS.md`; they are the observable boundary that prevents setup context from leaking into the artifact build.
22. Keep durable OpenCode session history as the sole continuity and trace-evidence backbone. The active summary and context are the default continuation path after compaction.
23. Preserve proportional recovery. Assess whether spanning work has a material continuity gap before dispatching `session-analyst`; new post-compaction work and same-work continuation with a sufficient summary require no reconstruction.
24. Keep analyst requests phase-targeted and question-led. Cross the relevant compaction boundary, follow a multi-compaction phase from its meaningful start when needed, and reject routine or whole-session reconstruction.
25. Require the compact packet fields in `EVALS.md`, then treat the packet as evidence: check active context, resolve conflicts or bounded gaps through focused follow-up, and synthesize only what changes continuation.
26. Keep persistent artifacts behind separately requested owning workflows. Session reconstruction itself does not create a handoff, Session Brief, work-context checkpoint, OpenSpec artifact, or parallel continuity record.
27. Check all relevant packets, then resume the same architect once when practical with compact packets, session IDs, results, gaps, and material delta rather than forcing one resume per gatherer.
28. Keep `prototype` limited to explicitly authorized runnable artifacts for one bounded unsettled logic, state-model, or UI question. Discussion and generic technical-feasibility spikes remain outside the mutation lane.
29. Keep prototype procedure in the owning skill, interpretation and decisions with the coordinator, and production implementation behind separate worker authority. Prototype creation never implies commit, push, pull request, publication, Jira updates, deployment, or productionization.
30. Route reviews by evidence contract, not authorship provenance: known accepted design, implementation brief, and validation history use focused `reviewer`; unknown or unobserved rationale, implementation, or validation requiring reconstruction and challenge uses `pr-reviewer` through `pr-review`.
31. Keep broad PR gathering root-owned. Reuse existing evidence and retained sessions, select only materially needed source-gatherer roles, keep traces in child sessions, and brief the reviewer with compact packets, session IDs, confidence, gaps, constraints, charter, authority, and stop conditions.
32. Preserve the complete missing-evidence request cycle: assess every unit, reuse or resume before dispatch, parallelize independent units, serialize dependencies, check packets, and normally resume the same reviewer once with compact results and delta. Packet conclusions remain evidence rather than acceptance.
33. Keep reviewer tool use focused and keep source/current/external evidence requests distinct from architect consultation, user decisions, mutation, expanded access, and publication authority. Retain merge and design decisions in the coordinator and do not run architect routinely before PR review.
34. Keep both review lanes explicitly authorized and parent-adjudicated.
35. Update affected scenarios in `EVALS.md` and record consequential decisions or reversals in `LOG.md`.

## Validation

1. Run plain `mfz apply` from the Personal home when the current source state is ready to render.
2. Confirm the rendered command has no model override, has `subtask: false`, and remains one runtime Markdown file.
3. Compare the rendered command byte-for-byte with its source and run `mfz doctor`.
4. Inspect resolved architect permissions and confirm recursive delegation remains denied.
5. Invoke `/orchestrate` with representative prototype authority, architect evidence-request, and proportional reconstruction scenarios after behavioral changes.

## Environment boundary

This command is specific to OpenCode and this Mindframe-Z home. It inherits the current primary session's model and reasoning effort.
