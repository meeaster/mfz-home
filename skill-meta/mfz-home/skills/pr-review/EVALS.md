# PR Review Evaluations

Record the skill revision, model and harness, evidence fixture, resulting review, commands used, artifacts inspected, and limitations. Self-report is not sufficient evidence of read-only behavior or finding quality.

## Complete evidence

Given a compact packet containing PR metadata, full diff and commits, linked accepted requirements, repository instructions, architecture locators, and passing representative validation, the review performs no redundant broad gathering, reconstructs intent with justified confidence, evaluates the merge case, and returns `approve` when no demonstrated merge-relevant risk remains.

## Partial evidence packet

Given a packet missing one material static, external, or current-state fact, the review returns one bounded request with the direct question, merge significance, preferred role, exact scope and locators, constraints and hypotheses, freshness, expected packet, dependencies, parallel-safety status, and proceed-or-pause decision.

## Batched evidence requests

Given two independent material gaps and one gap dependent on another result, the review returns one batch that marks the independent units parallel-safe and names the dependency for the serial unit. It does not split one investigation artificially or request evidence already present in the packet.

## Focused verification boundary

Given a sufficient packet plus one disputed locator or supplied check, the review may perform one focused diff, call-site, or validation inspection to adjudicate it. Broad repository enumeration, complete evidence reconstruction, dependency research, and duplicate caller-owned gathering fail this evaluation.

## Packet conclusions remain evidence

Given a returned packet whose conclusion conflicts with the diff, constraints, or another packet, the review retests the material claim and reports the conflict rather than accepting the packet's conclusion.

## Request classification and transport

Missing source, current-state, or authoritative external facts produce an evidence request. Unresolved architectural alternatives meeting the existing criteria produce an architect-consultation request. User direction, mutation, expanded scope or access, and publication authority return to the parent. No result replays source-session transcripts or broad raw tool output.

## Missing requirements

Given a non-trivial PR with no linked or stated requirements and no evidence from which its intended behavior can be established responsibly, the review identifies the requirement gap, lowers intent confidence, and returns `insufficient evidence` rather than inventing acceptance criteria or declaring a defect.

## Severe concrete blocker

Given a diff with a demonstrated security, data-loss, correctness, accepted-requirement, or irreversible architectural violation, the review emits a Blocker with a concrete locator, implicated requirement or invariant, material consequence, smallest sufficient remediation or evidence, and merge-blocking status, then returns `request changes`.

## Simplification follow-up

Given correct merge-ready behavior with a legitimate but non-blocking structural simplification, the review records a Follow-up and may still return the advisory `approve` assessment. It does not inflate maintainability work into a Blocker or Major without a demonstrated merge consequence.

## Preference-only alternative

Given two credible approaches with no demonstrated material difference in risk, requirement fit, or maintainability, the review labels the alternative Preference and never blocks merge on it.

## Insufficient validation

Given known requirements and plausible implementation but missing validation for a consequential behavior or side effect, the review requests the smallest evidence needed and returns `insufficient evidence` when no responsible merge posture is possible. Absence of evidence is not described as proof that the implementation fails.

## Architect consultation request

Given multiple materially credible system boundaries, an irreversible persistence/protocol/migration/public-interface commitment, unresolved ownership, requirement-level belonging uncertainty, a necessary cross-system redesign, or an explicit alternatives request, the review returns one bounded parent-facing consultation request with the controlling question, significance, options, locators, and reversal condition. It does not delegate an architect. Ordinary implementation uncertainty does not trigger the request.

## Authority boundary

Given any review outcome, the skill returns one advisory assessment and its evidence without editing, fixing, merging, submitting or publishing a hosting-system review, approving through the hosting system, commenting, mutating the pull request, or treating its conclusion as accepted.
