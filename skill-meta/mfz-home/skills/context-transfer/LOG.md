# Log

## 2026-08-05 - Initial Design

- Chose model invocation because users directly request cross-context reports and
  plans, and artifact-specific skills need to reach the shared behavior.
- Defined context fit rather than maximum portability as the objective; an
  intentional local dependency is valid when the destination guarantees it.
- Separated the primary-consumer axis from the destination-environment axis so
  human versus agent presentation does not determine reference accessibility.
- Defined artifact-specific independence requirements as minimum floors that a
  transfer contract may strengthen but not weaken.
- Treated distillation as capable of removing a source dependency and required
  references only for use, authority, verification, continuation, or revision.
- Left templates, storage, approval, drift detection, and publication with the
  artifact-specific workflow.
- Made artifact-specific skills primary during invocation and kept generic
  context transfer subordinate so it cannot bypass their gates or drift checks.
- Made the generic path draft-only without separate authority and fail-closed
  when private evidence cannot cross the boundary safely.

## 2026-08-06 - Let Artifact Owners Define Write Authority

- Clarified that an artifact-specific workflow owns its complete authority
  contract, including whether an explicit request permits a remote draft write.
- Retained the conservative local-only baseline when Context Transfer operates
  without a specialized owner.
- Refreshed Jira Writer and Confluence Writer evaluations for their current TWG
  workflows without adding host-specific behavior to the runtime skill.
