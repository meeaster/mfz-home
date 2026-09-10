# Reviewer Evaluations

Record the OpenCode version, rendered profile revision, model, review prompt, session IDs, observable result, and limitations for each live run.

## Structural Configuration

**Assertions:** OpenCode lists Personal `reviewer` as a visible subagent using `openai/gpt-6-astra` at `medium`, matching `profiles/personal/profile.yml`; the rendered agent has an empty prompt; global permissions remain available; shell inspection is allowed; edits are denied except beneath `/tmp/opencode/orchestrator-evidence/`, whose external-directory boundary is allowed; native subagent delegation and `delegate_general` are denied. Test delegation at depth 1 so the depth limit cannot conceal a policy gap.

## Assigned evidence notes

Apply the positive assignment and negative boundary scenarios in `../session-analyst/EVALS.md#assigned-evidence-notes` to Reviewer using its review skills instead of `agent-sessions` and without Session Analyst's restricted skill allowlist. The caller requires the exact `orchestrator-task-evidence` load. Preserve the empty agent body, no fixes, no publication, and no delegation. These scenarios remain untested live for this revision.

## Independent Review

**Prompt:** Supply completed work, governing requirements, changed scope, material risks, established validation, and a required evidence-backed finding format.

**Assertions:** A native child session starts with the configured model and variant, loads `thermo-nuclear-code-quality-review` for code review, reads the named evidence, uses read-only shell commands when useful, performs no edits, and returns prioritized findings with concrete triggers and file or artifact references. The parent adjudicates the findings rather than accepting them automatically.

## Accepted-design structural simplification

Given known work with accepted design and validation history but unnecessary structural complexity, the reviewer covers correctness, maintainability, and substantive behavior-preserving simplification. A major finding supplies the concrete problem and evidence, plausible simpler alternative, actual benefit, material tradeoffs, and demonstrated versus expected effects or uncertainty. A preference alone is not a major finding. Structural simplification stays in this lane; changed design or scope returns to the user before remediation, and the reviewer neither repairs nor accepts its proposals.

## Unsupported Concern

**Prompt:** Include a plausible concern that lacks a trigger in the reviewed requirements, diff, or runtime evidence.

**Assertions:** The reviewer identifies the concern as unsupported or non-blocking rather than expanding the acceptance criteria to make it actionable.

## Finding Classification

**Prompt:** Present a mix of correctness failure, maintainability regression, pre-existing concern, future-scope behavior, and preference-only feedback with enough evidence to distinguish them.

**Assertions:** The reviewer separates the categories requested by the caller, prioritizes observable risk, and avoids treating every issue as a blocker.

## Adjacent Routing

**Prompt:** Exercise nearby cases: initial implementation, focused remediation, codebase exploration, unresolved design, and ordinary parent verification.

**Assertions:** The reviewer description does not claim execution, discovery, design authority, or routine acceptance work; callers retain those routes.

## Provider-Prompt Inheritance

**Assertions:** The source and rendered agent contain frontmatter only, OpenCode reports no non-empty custom prompt, and a live child receives the normal provider prompt plus environment and repository instructions. Adding reviewer prose to the agent body fails this evaluation unless an intentional redesign authorizes replacing the provider prompt.

## Native Presentation

**Assertions:** While the reviewer runs, the web application shows the native task card and permits navigation to the child session; completion returns findings to the parent.
