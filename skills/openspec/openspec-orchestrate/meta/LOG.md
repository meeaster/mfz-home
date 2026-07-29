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
