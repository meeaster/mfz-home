# Child contracts

## Brief and return

A fresh child needs the decision-relevant meaning its own context does not supply:

- Objective, why it matters, downstream use, and relevant human priorities or tradeoffs.
- Accepted facts and decisions, uncertainty, competing evidence, and must-preserve constraints.
- One bounded assignment, authority and waivers, expected result, verification, and stop conditions.
- Selected accessible evidence/working paths and applicable learnings, with status, freshness, and exact critical details where a pointer is insufficient.
- Its owned note path, placement confirmation, required skills, and this session's role as its coordinator.

Describe outcomes and consequential constraints; prescribe mechanics only for correctness, safety, repeatability, or an accepted choice. Preserve relevant terminology and system boundaries. Omit transcript replay and instructions reliably supplied by the destination. Session IDs cannot substitute for inaccessible evidence. For a resumed unit, send only the next objective, material delta, relevant readings, authority changes, and stop condition.

This shared-note contract covers the coordinating orchestrator's direct children. Internal helpers receive bounded briefs and return results to their immediate parent without automatically loading Task Evidence or receiving shared-note paths. Their parent owns the shared handoff unless a separate helper evidence assignment is explicit. Load `context-transfer` when audience, access, privacy, portability, publication, or lossless specialist handoff materially changes what must cross the boundary. Routine dispatch alone does not require it. Load `writing-for-agents` for actual instruction authoring, not routine briefs or coordinator notes.

When useful, suggest likely relevant skills from available descriptions without loading their bodies. Label these as hints: the child checks applicability and selects any other skills needed. Distinguish hints from skills required by the human, applicable instructions, or the delegation contract, including `orchestrator-task-evidence` for assigned evidence production/reuse under the root skill's active-context load rule. Check role permissions; if an evidence role cannot load required guidance, transfer the necessary instructions yourself.

The return leads with the completed note locator and material result, decisions, what validation establishes and its limits, uncertainty, unresolved side effects, blocker, and exact current/publication state as applicable. Preserve critical evidence needed for acceptance without duplicating the note. Full source, media, domain references, iteration history, and tool traces stay with the specialist. The shared note carries reusable findings and lessons; a related successor receives the latest relevant notes rather than accumulated summary chains. Reassess a note's recommended procedure against remaining coverage before making it a new assignment requirement.

Identify observed residual state that can affect later behavior, such as an ignored installed application copy, specifically enough for a successor to recognize it. A clean Git status does not resolve that state or authorize cleanup. Omit copied metadata that does not support acceptance or reuse.

A failed check remains unresolved until repaired or accepted as an intentional exception by the authorized decision owner with supporting rationale. A passing summary must agree with its measurements. Report the affected elements and meaningful extent of failures, not only the mildest example. For diagrams, page-level no-overflow does not establish text containment inside a node.

## Screenshot evidence

When validation produces screenshots, save useful captures under the effort's `screenshots/` directory or the caller's designated evidence location. Associate each selected image with the exact artifact revision, viewport, relevant state, and a locator the recipient can open. Verify access across machines rather than assuming a browser-local path is available to the author.

Inspect the captures before returning them. They must show the intended content at a useful scale without inspection overlays obscuring it. Choose overviews and details by coverage, not a fixed image count. Return concrete findings and relevant measurements alongside the selected images. Use the existing owner note or direct helper return for this mapping; screenshots do not require another note or manifest.

## Missing evidence

Require a bounded request identifying the question, why it blocks the unit, evidence family and known locators, required version/freshness, and smallest sufficient result. Check materiality, scope, access, duplication, and overlap with existing children. Reuse available evidence and gather only the missing part; parallelize independent requests and serialize dependencies. Check every returned packet, then normally resume the same specialist once with the combined material delta when its engagement remains valid.

Source facts belong in this cycle. Decisions, consultation, expanded access/scope, and mutation remain with their owning authority. At the depth limit, the coordinator owns additional gathering.

## Mutation stop contract

Include the applicable contract in mutation briefs:

- Operators may make bounded corrections while evidence narrows within the settled procedure. Stop when it no longer applies, attempts repeat, uncertainty stops shrinking, troubleshooting becomes novel/difficult, or software behavior becomes the primary outcome.
- Workers may investigate immediate in-unit errors, try materially distinct hypotheses, and validate bounded corrections. Stop when diagnosis becomes open-ended, discovery expands without narrowing implementation, attempts repeat, an accepted assumption appears contradicted, acceptance cannot be reconciled, multiple independent outcomes emerge, or broader scope/access/evidence or another specialist is needed. A focused lookup alone is not a stop.
- Compaction alone permits continued execution of a coherent active unit. A still-broad plan, repeated post-compaction discovery, unrelated streams, or another approaching compaction without validated progress favors a handoff. Reassess remaining implementation and validation against retained useful context and fresh-agent reconstruction cost; return a proposed boundary to the coordinator when separation would help. The coordinator applies [Recovery and continuity](recovery-and-continuity.md#choose-child-continuity) before a subsequent dispatch, including its non-resumption limit. Do not invent additional retry, turn, or compaction thresholds.

On stop, preserve partial work and return the accepted contract, completed mutations and exact state, symptom/reproduction or blocking decision, distinct attempts and findings, current hypotheses, validation, and smallest missing evidence or decision. Label suspected implementation, environment, requirement/authority, or design-assumption causes as hypotheses. The child does not dispatch triage, architect, replacement workers, or remediation; difficulty alone does not invalidate the design.

## Diagnosis and remediation

Apply the diagnostic and authorization gate in [Routing and roles](routing-and-roles.md). Check existing evidence and gather specific missing facts before choosing the next useful investigation. A known procedural correction belongs to operator; bounded diagnosis or novel implementation troubleshooting belongs to worker within explicit authority. Resume useful context or use a fresh worker when overload or prior looping warrants it, following [Recovery and continuity](recovery-and-continuity.md). A new child needs a changed evidence basis or investigation approach, not another copy of the failed assignment. When triage is warranted, recommend it and obtain any missing authorization before dispatch; supply the checked packet and relevant state rather than raw failed-command history.

Require reproduction or falsification, impact/scope, likely cause and confidence, contribution of worker changes, contradicted assumptions, uncertainty, disposition, and whether correction fits the accepted contract. Triage diagnoses and flags design conflicts; it neither repairs nor decides architecture or requirements.

After checked diagnosis, a fresh worker may remediate within existing implementation authority. Supply the accepted brief, partial diff/current state, diagnosis, approaches not to repeat, exact correction, acceptance, and verification history. A child that stopped cleanly for one decision may instead resume under [Recovery and continuity](recovery-and-continuity.md).

For possible design conflict, gather the smallest coordinator-owned architecture evidence, surface it with the pending choice, and explain the value of another architect turn. Resume a still-authorized engagement or obtain new authority. Requirement, access, scope, and authority changes go to the decision recipient. Ordinary implementation/environment failures that fit the design need no architect.
