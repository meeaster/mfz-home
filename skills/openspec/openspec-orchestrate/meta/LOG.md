# Decision Log

## 2026-07-29: Separate Work Packages From Workers

An observed plan converted a 28-task change into fifteen sequential groups, including several
operator and verification checkpoints. This made the group ledger look complete but obscured the
actual delegation plan and multiplied fresh-session rereads.

The workflow now derives cohesive work packages first and packs them into the smallest practical
worker list. The report must lead with actual delegated workers, while coordinator and operator
checkpoints remain separate. More than six implementation workers requires boundary-by-boundary
justification against the adjacent merged-worker alternative.

The change preserves sequential execution, Sol/high planning, Luna/xhigh implementation, exact task
ownership, coordinator-owned checkboxes, and explicit approval gates.

## 2026-08-05: Bound Review And Remediation

An observed implementation accumulated ten remediation passes because each closure review reopened
the whole change and promoted generic hardening, future-worker behavior, and low-probability edge
cases into blockers. Early reviews found genuine strategy, evidence, and persistence defects; later
ones had diminishing acceptance value.

The workflow now defaults to coordinator review. An independent review requires an explicit trigger
and a charter tied to current task IDs and observable criteria. It produces one consolidated
remediation and one scope-locked closure verification. Further reopening requires user authority
unless an evidenced authority, security, or likely immutable-data-loss risk requires a narrow safety
response.
