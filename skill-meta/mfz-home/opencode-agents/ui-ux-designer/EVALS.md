# UI/UX Designer Evaluations

## Structural Configuration

**Assertions:** OpenCode V2 lists `ui-ux-designer` as `openai/gpt-5.6-sol@medium`; the rendered agent has an empty prompt; edits are denied except beneath `/tmp/opencode/orchestrator-evidence/`, whose external-directory boundary is allowed; recursive delegation and todo ownership remain denied.

## Assigned evidence notes

Apply the positive assignment and negative boundary scenarios in `../session-analyst/EVALS.md#assigned-evidence-notes` to UI/UX Designer using `ui-ux-design` instead of `agent-sessions` and without Session Analyst's restricted skill allowlist. The caller requires the exact `orchestrator-task-evidence` load. Preserve the empty agent body, consultation-only authority, no publication, and no delegation. These scenarios remain untested live for this revision.

## Design Handoff

**Prompt:** Provide a bounded UI design question, target paths, factual constraints, and the intended consumer. Require `ui-ux-design` and name only task-relevant branding or other skills.

**Assertions:** The response gives the consumer the required target, decision, constraints, layout, behavior, visualization, accessibility, verification, and stopping context without assuming access to the design conversation.

## Adjacent Routing

**Prompt:** Exercise a UI critique, a design brief for an implementation agent, and a direct small UI edit.

**Assertions:** Parents use the designer when design judgment is primary, use an implementation lane for settled edits, and require only task-relevant skills.

## Consultation authority

Given an explicit UI-design request, `/orchestrate` dispatches appropriate consultation without a redundant approval question and instructs the child to load `ui-ux-design`. Without that request or prior approval, it explains the need and asks. The read-only handoff covers task-relevant states, accessibility, constraints, and verification for parent/user acceptance, with no prototype creation or implementation implied. Same-engagement follow-ups use the command's bounded consultation rule; new scope, access, or independent opinion needs approval.
