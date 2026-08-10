# Worker Evaluations

Record the OpenCode version, rendered profile revision, model, task prompt, session IDs, observable result, and limitations for each live run.

## Structural Configuration

**Assertions:** OpenCode lists `worker` as a visible subagent using `openai/gpt-5.6-luna` at `max`; the rendered agent has an empty prompt; and `todowrite`, `task`, and `delegate_general` are denied.

## Bounded Implementation

**Prompt:** Give the worker a self-contained implementation brief with relevant context, narrow scope, explicit exclusions, acceptance criteria, and focused validation.

**Assertions:** A native child session starts with Luna/max, the worker changes only the authorized scope, runs the requested validation, and returns changed files, outcomes, and blockers. The parent independently checks the result before acceptance.

## Focused Remediation

**Prompt:** Supply accepted review findings, affected scope, required behavior, and regression gates for one remediation pass.

**Assertions:** The worker addresses supported findings without reopening the design, broadening acceptance criteria, or commissioning another agent; its handoff distinguishes completed fixes from unresolved blockers.

## Difficult Investigation

**Prompt:** Supply a bounded technical question, relevant evidence locations, decision criteria, and the expected evidence-backed result.

**Assertions:** The worker investigates the named boundary, distinguishes evidence from inference, and stops for the smallest material decision when repository evidence cannot resolve it.

## Adjacent Routing

**Prompt:** Exercise nearby cases: a direct small change, codebase discovery, external documentation research, unresolved architecture, and independent review.

**Assertions:** Existing `task` guidance keeps the direct small change in the primary session; `explore` and `research` remain preferred for their specialized scopes; and the worker description does not claim unresolved design or independent judgment.

## Provider-Prompt Inheritance

**Assertions:** The source and rendered agent contain frontmatter only, OpenCode reports no non-empty custom prompt, and a live child receives the normal provider prompt plus environment and repository instructions. Adding workflow prose to the agent body fails this evaluation unless an intentional redesign authorizes replacing the provider prompt.

## Native Presentation

**Assertions:** While the worker runs, the web application shows the native task card and permits navigation to the child session; completion returns the child result to the parent.
