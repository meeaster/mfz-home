# Child contracts

Read this reference before dispatching or resuming a child, handling a stop or missing-evidence request, or accepting a returned packet.

### Outbound Child Contract

- The `context-transfer` contract governs outbound briefs and returned packets: carry complete decision-relevant meaning not reliably supplied by the destination, rather than maximizing self-containment.
- Fresh children do not share this conversation.
- Supply the objective and why it matters, downstream decision, relevant user priorities and tradeoffs, accepted facts and constraints, uncertainty and competing evidence, exact scope, authority, expected result, verification, and stop conditions.
- Include selected evidence and workspace-context paths with their actual status, applicability, and material version or freshness limits.
- For a mutation child, make the one current work unit and its completion boundary explicit; broader context or design remains background.
- Include terminology or system boundaries when they affect interpretation; omit unrelated accumulated context and reliably supplied host instructions.

- Preserve meaning rather than copying the transcript.
- In briefs and return packets, include exact critical evidence or excerpts where details matter and accessible supporting locators for verification or omitted detail.
- A session ID is not a substitute for evidence when the recipient cannot retrieve that session.
- Label inferences, ask children to test working hypotheses, and identify accepted decisions they must preserve.
- Keep packets proportional to their intended use without losing priorities or material uncertainty.
- Describe the desired result and consequential constraints without prescribing investigative mechanics unless safety, correctness, repeatability, or a settled decision requires a specific method.

- Require each owning specialist to keep its destination- or role-specific skills and references, full source and media, iteration history, and detailed validation or tool traces in its session.
- Its compact acceptance packet gives the coordinator the result first: locator, outcome or change, material decisions, validation result, unresolved issues, and publication or current state when applicable.
- Include a representative preview only when the packet otherwise cannot support the coordinator-owned decision; preserve exact critical evidence in the packet rather than hiding it behind an unexplained pointer.

- Before asking an evidence child to load a skill, check that role's permissions and guidance.
- Research may load any materially relevant skill.
- When `explore` cannot load one, load it in this session and transfer its operative instructions and constraints through the shared transfer contract.
- Apply the child skill-load rule and do not infer one role's capabilities from another's.

### Source-Gatherer Return Contract

Require each source-gathering child to return a compact decision packet: the direct answer, only material findings, exact critical evidence where details matter, accessible supporting locators, conflicts or gaps, uncertainty and coverage, and what the evidence means for the stated downstream decision and its priorities.

- The completed producer note is the reusable handoff.
- Preserve decision-relevant findings, qualification, and lessons there under `orchestrator-task-evidence`; return its path plus only the material result, blocker, or decision the coordinator needs.
- Include topic or heading cues only when they materially help navigation.
- If writing is blocked, return file-ready findings for the coordinator-owned attributed fallback before releasing dependent readers.

- A related fresh successor receives the latest applicable memory in its prompt or relevant shared-note paths, including across roles.
- Replace stale summaries rather than appending memory chains.
- A missing memory field does not favor resume; request a bounded repair only when the omission affects the downstream decision.
- Fresh transfer preserves semantic continuity, not lossless provider, execution, or session state.
- Raw discovery logs and transcripts remain in child sessions for focused follow-up; shared notes retain the useful findings, exact critical excerpts, and execution lessons under the task evidence contract.
- Durable memory promotion requires a separately requested owning workflow.

### Operator and Worker Stop Contracts

- In each operator brief, permit only bounded correction while evidence keeps narrowing within the settled procedure and accepted outcome.
- Require the operator to stop with preserved state and the same compact blocker-packet fields used below when the procedure no longer applies, attempts repeat, uncertainty stops shrinking, troubleshooting becomes novel or difficult, software behavior becomes the primary outcome, or broader scope or authority is needed.
- The operator does not redesign, convert operational authority into application implementation, or silently continue as a worker.
- The coordinator checks the packet against the diagnostic gate before using fresh `triage`; a checked bounded procedural cause may continue through a fresh operator, while novel troubleshooting or difficult remediation within the unchanged authorized outcome goes to a fresh worker.

- In each implementation-worker brief, supply the bounded troubleshooting contract for that unit.
- Allow focused in-unit discovery, inspection of the immediate error, materially distinct hypotheses, focused validation, and a bounded correction when the understood cause remains in scope.
- Tell the worker to continue while discovery or attempts produce new evidence or narrow uncertainty, then stop before diagnosis becomes open-ended when attempts repeat, uncertainty stops shrinking, diagnosis dominates implementation, an accepted design assumption appears contradicted, acceptance criteria cannot be reconciled, broader gathering, unavailable access, scope, or authority is needed, delegation is blocked by depth, another specialist owns the problem, the unit reveals multiple independent outcomes, or discovery keeps expanding without narrowing implementation.
- For a broad or inaccessible evidence gap, require the bounded missing-evidence request defined by the readiness contract so the coordinator can gather and resume without converting an ordinary focused lookup into a stop.

- Compaction alone does not require a stop: a narrow coherent unit may complete after compaction.
- Treat compaction while the active plan remains broad, repeated post-compaction discovery, multiple unrelated active streams, or approach to another compaction without a validated intermediate outcome as qualitative pressure to stop and hand off.

- On stop, require preservation of partial work and a compact blocker packet containing the accepted objective, design, or implementation contract; completed mutations and exact current state; exact symptom and reproduction if a failure occurred, otherwise the state or decision preventing continuation; distinct approaches attempted and what each established; current hypotheses and uncertainty; validation results; suspected category as a hypothesis among implementation mechanics, environment or runtime, requirement or authority, and possible design-assumption conflict; and the smallest missing evidence or human decision.
- State that the worker does not dispatch triage, architect, another worker, or remediation and does not treat implementation difficulty as proof that the design is invalid.
- Use no hard token, context, turn, tool, compaction, retry, or troubleshooting threshold.

### Triage, Remediation, and Design-Conflict Return

- When a worker stops under that contract, check its blocker packet and classify the smallest next evidence need under the diagnostic gate.
- Only when that gate passes, start a fresh read-only `triage` session with the packet and relevant current state, excluding the worker's raw failed-command history.
- A blocker label alone does not establish a diagnostic need.

- In that brief, require reproduction or falsification, impact and affected scope, likely root cause and confidence, whether worker changes contributed, contradicted assumptions as evidence, unresolved uncertainty, recommended disposition, and whether the issue appears resolvable within the accepted implementation contract.
- State that triage treats the packet as evidence, keeps source and external state read-only apart from any explicitly assigned task note, flags rather than resolves possible design conflict, and does not decide architecture validity, redesign, change requirements or authority, or become the remediation worker.

- Check the returned diagnosis packet before routing remediation.
- If triage identifies a bounded implementation or environmental cause within the unchanged accepted design, scope, and authority, existing implementation authority may continue through a fresh worker.
- Give that worker the accepted brief, current repository state and partial diff, checked diagnosis and evidence, approaches not to repeat, exact remediation objective, focused acceptance criteria, and verification history.
- Prefer freshness because files and the checked packets carry the useful state from a looping worker.

The bounded-continuation rule in [Recovery and continuity](recovery-and-continuity.md) still permits resuming a child that stopped cleanly for one decision; it does not turn a looping implementer into its own diagnostician or remediation reviewer. Triage never implements the fix.

- Treat requirement, scope, access, and authority changes as human decisions, routed through the assigning parent in parent-facing context.
- When worker or triage evidence may contradict an accepted design assumption, treat it as evidence rather than proof and return it to this session.
- Gather the smallest necessary coordinator-owned `explore`, `research`, or `inspect` architecture evidence under the existing source-gathering rules.
- Surface the worker, triage, and source evidence to the decision recipient, explain the pending decision and why another architect turn would add value, and apply the bounded-engagement and material-change authority rules.
- Resume the existing architect with checked evidence and any human correction when the turn remains authorized; otherwise obtain the smallest fresh approval needed.
- Implementation or environment failures that fit the accepted design do not involve architect, and no worker or triage session routes directly to architect.
