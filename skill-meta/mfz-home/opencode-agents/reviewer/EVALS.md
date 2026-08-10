# Reviewer Evaluations

Record the OpenCode version, rendered profile revision, model, review prompt, session IDs, observable result, and limitations for each live run.

## Structural Configuration

**Assertions:** OpenCode lists `reviewer` as a visible subagent using `openai/gpt-5.6-sol` at `high`; the rendered agent has an empty prompt; permissions deny by default; read, search, source lookup, skill loading, and session identification remain available; mutation, shell, code-mode execution, advisor, todo, and delegation tools are disabled; and agent-level rules preserve the configured credential and secret-path denies.

## Independent Review

**Prompt:** Supply completed work, governing requirements, changed scope, material risks, established validation, and a required evidence-backed finding format.

**Assertions:** A native child session starts with Sol/high, reads the named evidence using only the allowlisted capabilities, performs no edits, and returns prioritized findings with concrete triggers and file or artifact references. The parent adjudicates the findings rather than accepting them automatically.

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
