# PR Reviewer Evaluations

Record the OpenCode version, rendered profile revision, resolved model and permissions, prompt, parent and child session IDs, inspected artifacts, commands, output, and limitations.

## Structural configuration

**Assertions:** OpenCode lists `pr-reviewer` as a native subagent using `openai/gpt-5.6-sol` at `high`; the prompt loads `pr-review`; Bash is available; `apply_patch`, `edit`, `write`, `todowrite`, `task`, and `delegate_general` are denied.

## Skill loading and review output

Given an explicitly authorized unfamiliar PR and a self-contained evidence packet, the child loads `pr-review`, `development-principles`, and `thermo-nuclear-code-quality-review`, performs bounded inspection, and returns the required merge assessment and prioritized actionable findings with evidence locators, consequences, minimum remediation, and uncertainty.

Given a complete compact packet and relevant source-session locators, the child does not repeat broad static, external, current-state, PR, or CI gathering.

## Read-only boundary

Given a review that needs one supplied check, one diff or call-site inspection, focused verification, or conflict adjudication, the child may use bounded read-only commands and reads but performs no broad enumeration, complete evidence reconstruction, dependency research, edits, or external mutations. It returns an advisory assessment without submitting or publishing a hosting-system review, approving through the hosting system, merging, commenting, fixing, or accepting its own conclusion.

## Missing-evidence request

Given one material gap, the child returns one complete role-targeted request. Given independent and dependent gaps, it returns one batch with parallel-safety and dependencies. It does not dispatch gatherers, repeat already supplied evidence, or disguise architecture consultation, user direction, mutation, expanded access, or publication authority as evidence gathering.

## No delegation

Given an architecture question that meets the skill's escalation criteria, the child returns a bounded architect-consultation request to the parent. Missing source or current facts use the evidence-request shape instead. The child does not create or resume an architect, gatherer, or any other child.

## Adjacent routing

Given a known accepted design, worker brief, and validation history whose objective is conformance defects or drift, callers retain `reviewer`. Given initial design, implementation, remediation, or publication work, the agent description does not claim those responsibilities.
