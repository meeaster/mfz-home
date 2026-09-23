# Mutation and delivery

## Ground the assignment

An explicit delivery request covers the necessary proportionate workflow while its outcome, scope, access, consequential cost, risk, reversibility, design assumptions, and acceptance remain materially consistent.

- Reuse current evidence first. Gather missing or conflicting facts likely to change the approach. A simple settled operation need not pass through a separate research agent.
- Before dispatch, establish either a clear local implementation pattern or checked evidence resolving material ambiguity. External APIs, unfamiliar CLIs, version-sensitive contracts, and non-obvious integrations need applicable evidence, not a promise that the worker will discover everything later.
- Keep ordinary instruction discovery, Git status and topology checks, dirty-state preservation, immediate preflight, and validation selection with the mutation owner. Separate preparation only for a useful independent outcome or materially different access, state, or context needs.
- Preserve unrecognized local changes. Respect repository and worktree rules. Clarify ambiguous requests such as "get latest" when the interpretation changes effects.
- Give the owner the accepted outcome, authority, selected context, exact targets, constraints, and verification needs. Working files supply background, not a new assignment or approval.

## Decompose and schedule

- Split by coherent outcome, ownership, mutable state, dependencies, and acceptance. Keep tightly coupled changes together; file counts do not determine task boundaries.
- Aim for units that fit useful implementation and validation into a manageable context. Allow room for debugging without inventing token quotas or mandatory resets.
- Keep substantial source gathering out of the coordinator's context. Focused in-unit discovery remains with workers; broad or non-narrowing gaps return under the [stop contract](child-contracts.md#mutation-stop-contract).
- Parallelize demonstrably independent work when useful. Serialize overlap or unknown shared state, including lockfiles, checkout/index operations, generated outputs, installation, caches, services, and external resources.
- Use only authorized isolation. Coordinate rendering, shared probes, and integration after affected source work is ready. Different directories alone do not prove independent effects.
- Assign procedural integration to operator and substantive code integration to worker. Keep final shared verification with the last mutation owner when coherent; do not add an integration agent without a distinct outcome.

## Verify the outcome

| Situation | Default |
| --- | --- |
| Straightforward change or routine operation with concrete checks | Accept adequate worker or operator verification after checking the returned evidence. |
| Specific evidence gap, contradiction, or independence requirement | Obtain focused follow-up from the owner, or assign bounded independent factual verification when a separate verifier is needed. |
| Deeper correctness, maintainability, or design concerns | Use authorized review under [Design, prototype, and review](design-prototype-and-review.md). |

- Specify coverage and consequential environments. An aggregate run can satisfy several required lanes; examples are not cumulative mandatory commands. Preserve explicit execution requirements or obtain a scoped exception.
- Exercise the relevant user boundary: CLI invocation, UI interaction, or live integration when that claim requires it. Existing tests can suffice when they actually cover the boundary. Report unexercised behavior and why.
- Reuse valid checks until changes, missing coverage, contradictions, or a real independence need justify more. Select coverage by affected behavior and dependencies, not changed filenames alone.
- For routine commit and push operations, accept the operator's concrete verification of the requested outcome, including commit identity, target branch, push result, and remaining changes as applicable. Do not add a post-operation inspector merely because publication changed remote state. Name the unresolved question before requesting another check.
- Workers own immediate validation. A fresh inspector can handle substantial browser or environment checks when focused context or independence helps; return defects to the mutation owner.
- Failed checks remain unresolved until repaired or accepted as an intentional exception with rationale. Coordinator acceptance of repairs is not an independent rereview.
- Record useful operational lessons separately from execution results so later agents can reuse working methods without reading the whole validation history.

## Scope changes and publication

- Continue ordinary implementation details within authority. Pause for changed goals or design commitments, broader access, material risk, unusually costly expansion, or an unresolved consequential choice. Return affected downstream steps and the smallest needed decision.
- Investigation alone does not authorize implementation. Review findings remain proposals until remediation is authorized or covered by the delivery request.
- Keep commit, push, PR, merge, deployment, and separate system updates distinct. A PR request can include necessary in-scope commits and branch push, but not merge, deployment, or unrelated tracker changes. Drafting does not authorize publication.
- Use operator for settled Git or operational publication under the active workflow. Follow each repository's instructions, history, validation, and authority. Report commit identity, branch/upstream relation, push state, and remaining changes when applicable.
- One sequential operator can perform an authorized multi-repository operation. Preserve separate commits and histories. If publication partly succeeds, report it and a recovery action rather than attempting destructive rollback.
- Pass prepared state, branch/base, local changes, external IDs, performed mutations, validation, blockers, and assumptions to the next owner. Avoid copying setup history that adds no useful constraint.

## External operations

Send narrow, understood operations to operator with evidence proportional to uncertainty and impact. Production scope alone does not create a fixed approval or investigation ceremony.

1. Establish the exact target, intended effects, semantics, affected dependencies, recovery, and must-preserve invariants. Distinguish required outcome probes from optional diagnostics.
2. Capture minimal safely available pre-change state needed to identify, verify, and restore configuration. Exclude secrets and unrelated data. Explain missing meaningful recovery information before mutation.
3. Revalidate consequential assumptions immediately before the narrow mutation. Stop if target, impact, recovery, procedure, or authority materially differs.
4. Read resulting state and check the outcome and invariants. Report residual irreversible effects such as notifications or downstream events.
5. For asynchronous work, preserve current state and an authoritative readiness or completion signal. Launch is not completion. Follow applicable tool waiting rules and release dependencies only after completion is established.

- On-demand backups, snapshots, or exports need authority when not already included; explain material cost, time, retention, and effects. Do not create backup infrastructure as an unsolicited precaution. A backup's existence does not prove restorability, and absence alone does not block responsible work.
- Operators may correct within a settled procedure. Novel troubleshooting or a software-behavior problem belongs to a worker. Preserve state and return the exact blocker when the procedure stops applying.
