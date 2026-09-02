---
name: pr-review
description: Perform holistic merge due diligence on an unfamiliar or unobserved pull request. Use when intent or design rationale must be reconstructed, the approach and architecture need challenge, material simplification may exist, validation history is uncertain, or the question is whether the PR is merge-ready beyond conformance to an already accepted design. Use focused reviewer workflows instead when the accepted design, implementation brief, and validation history are already known.
---

# PR Review

Review the pull request as an unknown design and implementation process whose merge case must be established from evidence. Return an advisory merge assessment to the parent; do not submit or publish a hosting-system review, approve through the hosting system, merge, comment, fix code, or make the final design decision.

## Establish the evidence boundary

Account for:

- PR metadata, full diff, and commits;
- linked requirements, issue, design, or explicit requirement gaps;
- repository instructions and conventions;
- relevant architecture and source locators;
- CI, tests, and other validation evidence;
- the parent's evidence packet, accepted constraints, and stated uncertainty.

Start from the smallest sufficient compact evidence packet. Keep detailed gathering traces in their source sessions when the caller provides session-backed packets. State what is absent rather than inventing intent, requirements, or validation. Missing evidence lowers confidence or creates a bounded verification request; it is not proof of failure.

Load `development-principles` and `thermo-nuclear-code-quality-review` before evaluating the change. Use Development Principles for general design quality and stable validation boundaries. Use Thermo-Nuclear Review for strict structural maintainability and simplification. This skill owns their composition into merge due diligence and the finding discipline below; do not restate their full rubrics.

## Evidence packets and missing evidence

Broad PR context gathering belongs to the caller. When available, use caller-owned source gatherers for:

- current PR metadata, commits, CI or check status, current Git or runtime state, command-derived facts, and external work-system facts;
- static source, relevant call sites, tests, conventions, ownership, architecture files, and change surface; and
- authoritative external API, library, or upstream documentation when materially relevant.

Do not require every evidence class mechanically. Reuse existing packets and retained sessions, and request only evidence that could materially change a finding, confidence, or merge posture.

Within the review session, use read or shell tools only for a bounded focused verification, one supplied test or check, one diff or call-site inspection, or adjudication of conflicting evidence. Do not broadly enumerate the repository, reconstruct the complete PR evidence corpus, research dependencies, or duplicate caller-owned gathering.

When material evidence is missing, return one complete request or a batch. Each unit must include:

- the direct question and why it materially affects the review or merge posture;
- the preferred caller-owned role: `explore` for static local evidence, `research` for authoritative external evidence, or `inspect` for current or command-derived facts;
- exact scope and evidence locators or targets;
- accepted constraints and hypotheses to test rather than assume;
- freshness requirement and expected compact packet;
- dependencies and whether the unit is parallel-safe; and
- whether review can proceed with reduced confidence or must pause.

Do not dispatch gatherers. Treat returned packets as evidence to retest against the diff and constraints, not conclusions to accept. Missing source, current-state, or external facts use this request shape. Keep unresolved architectural alternatives under **Architect consultation**. Return user decisions, mutation, expanded scope or access, and publication authority to the parent rather than disguising them as evidence requests.

## Reconstruct and challenge the merge case

1. Reconstruct the intended user or system outcome, requirements, constraints, and claimed validation. Assign `high`, `medium`, or `low` confidence and identify the evidence that controls that rating.
2. Decide whether the demonstrated requirement justifies the chosen machinery. Distinguish necessary capability from speculative flexibility, accidental complexity, and implementation preference.
3. Assess architecture and ownership: boundaries, interfaces, state, invariants, dependency direction, coupling, reversibility, and operational side effects.
4. Identify materially simpler credible approaches. Compare their capability, migration or rewrite cost, operational risk, and effect on future change; omit alternatives that are merely stylistic.
5. Assess correctness, security, compatibility, maintainability, regression risk, and validation adequacy against the reconstructed intent and repository evidence.
6. Determine a merge posture from demonstrated evidence, not review intensity or missing context alone.

## Finding discipline

- **Blocker**: demonstrated correctness, security, data-loss, accepted-requirement, or irreversible architectural risk that must be resolved before merge.
- **Major**: material merge-relevant risk that normally requires correction; state the rationale if deferral is credible.
- **Follow-up**: legitimate maintainability or simplification work that need not block merge.
- **Preference**: an alternative without demonstrated material consequence; never merge-blocking.
- **Insufficient evidence**: missing requirements or validation that prevents a responsible conclusion.

Every Blocker and Major finding must include a concrete locator, the implicated requirement, invariant, or boundary, the material consequence, and the smallest sufficient remediation or evidence. Keep speculative concerns out of blocking severities. Consolidate findings that share one cause, and prioritize a few consequential findings over cosmetic volume.

Use one merge assessment:

- `approve` when the merge case is adequately supported and no blocking finding remains;
- `request changes` when demonstrated Blocker or Major findings require correction before merge;
- `insufficient evidence` when missing requirements or validation prevents a responsible posture.

## Architect consultation

Return a bounded consultation request to the parent only when:

- multiple materially credible system boundaries remain;
- an irreversible persistence, protocol, migration, or public-interface commitment exists;
- ownership cannot be resolved;
- requirements cannot establish whether the capability belongs;
- a substantial cross-system redesign is necessary; or
- the user explicitly requested alternatives analysis.

State the unresolved architecture question, why it affects merge posture, relevant options and evidence locators, and what answer would change the review. Do not delegate the architect or turn ordinary review uncertainty into an escalation.

## Return the review

Keep findings primary and return:

1. **Merge assessment**: `approve`, `request changes`, or `insufficient evidence`, with concise rationale.
2. **Prioritized findings**: severity, locator, implicated requirement/invariant/boundary, consequence, minimum remediation or evidence, and whether merge-blocking.
3. **Reconstructed intent and confidence**: intended outcome, requirements, constraints, evidence, and confidence.
4. **Requirement and approach fit**: whether the demonstrated need justifies the machinery.
5. **Architecture and boundaries**: ownership, interfaces, state, invariants, dependency direction, coupling, reversibility, and operational effects.
6. **Simplification analysis**: credible materially simpler alternatives and their costs.
7. **Correctness, security, compatibility, and side effects**.
8. **Validation adequacy**: what the available CI, tests, and checks establish or leave open.
9. **Assumptions and unresolved questions**, including any missing-evidence request or bounded architect-consultation request.

Return the advisory `approve`, `request changes`, or `insufficient evidence` assessment and its evidence to the parent. Do not submit or publish a hosting-system review, approve through the hosting system, merge, comment, fix, mutate the pull request, or accept your own conclusion.
