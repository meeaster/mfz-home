# Execution and delivery

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
- Keep substantial source gathering out of the coordinator's context. Focused in-unit discovery remains with workers; broad or non-narrowing gaps return under the [stop contract](#mutation-stop-contract).
- Parallelize demonstrably independent work when useful. Serialize overlap or unknown shared state, including lockfiles, checkout/index operations, generated outputs, installation, caches, services, and external resources.
- Use only authorized isolation. Coordinate rendering, shared probes, and integration after affected source work is ready. Different directories alone do not prove independent effects.
- Assign procedural integration to operator and substantive code integration to worker. Keep final shared verification with the last mutation owner when coherent; do not add an integration agent without a distinct outcome.

## Arrange verification

Apply [acceptance and review](../common/acceptance-and-review.md) when choosing coverage and accepting results. Workers own immediate validation. A fresh inspector can handle substantial browser or environment checks when focused context or independence helps; return defects to the mutation owner.

## Scope changes and publication

Apply the shared [scope and publication boundaries](../common/acceptance-and-review.md#scope-changes-and-publication).
- Use operator for settled Git or operational publication under the active workflow. Follow each repository's instructions, history, validation, and authority. Report commit identity, branch/upstream relation, push state, and remaining changes when applicable.
- One sequential operator can perform an authorized multi-repository operation. Preserve separate commits and histories. If publication partly succeeds, report it and a recovery action rather than attempting destructive rollback.
- Pass prepared state, branch/base, local changes, external IDs, performed mutations, validation, blockers, and assumptions to the next owner. Avoid copying setup history that adds no useful constraint.

## External operations

Send narrow, understood operations to operator with evidence proportional to uncertainty and impact. Production scope alone does not create a fixed approval or investigation ceremony.

1. Establish the exact target, intended effects, semantics, affected dependencies, recovery, and must-preserve invariants. Distinguish required outcome probes from optional diagnostics.
2. Capture minimal safely available pre-change state needed to identify, verify, and restore configuration. Exclude secrets and unrelated data. Explain missing meaningful recovery information before mutation.
3. Revalidate consequential assumptions immediately before the narrow mutation. Stop if target, impact, recovery, procedure, or authority materially differs.
4. Read resulting state and check the outcome and invariants. Report residual irreversible effects such as notifications or downstream events.
5. Apply the shared asynchronous-completion rule before releasing dependent work.

- On-demand backups, snapshots, or exports need authority when not already included; explain material cost, time, retention, and effects. Do not create backup infrastructure as an unsolicited precaution. A backup's existence does not prove restorability, and absence alone does not block responsible work.
- Operators may correct within a settled procedure. Novel troubleshooting or a software-behavior problem belongs to a worker. Preserve state and return the exact blocker when the procedure stops applying.

## Mutation stop contract

Include the applicable boundary in mutation briefs.

| Owner | Continue | Stop and return |
| --- | --- | --- |
| Operator | Bounded corrections within a settled procedure while evidence narrows | The procedure no longer fits, attempts repeat, uncertainty stops shrinking, or novel troubleshooting or software behavior becomes the task |
| Worker | Immediate in-unit investigation, distinct useful hypotheses, and bounded repairs | Open-ended or non-narrowing discovery, contradicted accepted assumptions, incompatible acceptance, multiple independent outcomes, or broader authority and evidence needs |

- A focused lookup alone is not a stop. Compaction alone does not invalidate a coherent active assignment.
- Repeated broad discovery or little validated progress can justify a proposed handoff. Compare remaining work with retained useful context; do not invent retry, turn, or compaction quotas. Apply [child continuity](../common/recovery-and-continuity.md#choose-child-continuity) on the next dispatch.
- On stop, preserve partial changes and return the accepted contract, exact state, symptom or decision, distinct attempts and results, hypotheses, verification, and smallest missing evidence or authority.
- The child does not dispatch its own replacement, architect, or triage. Difficulty alone does not invalidate the design.

## Diagnosis and remediation

- Use [routing guidance](routing-and-roles.md#investigation-and-diagnosis) to choose the next owner. A new agent needs a better evidence basis or approach, not another copy of the failed assignment.
- A settled procedural correction belongs to operator. Bounded diagnosis or novel troubleshooting belongs to worker within authority. Use authorized triage when its diagnostic value warrants it.
- Require reproduction or falsification, impact, likely cause and confidence, contribution of existing changes, contradicted assumptions, remaining uncertainty, and whether repair fits the accepted contract.
- Triage diagnoses without repairing or deciding architecture. A fresh worker can remediate within existing implementation authority; a cleanly stopped worker may resume when retained context helps.
- Supply partial state, checked diagnosis, approaches not to repeat, required correction, and verification history. Return consequential design or requirement conflicts to the decision owner; ordinary implementation failures need no architect by default.
