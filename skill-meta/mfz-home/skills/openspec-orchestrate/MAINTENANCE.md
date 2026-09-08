# Maintenance

## Source and availability

On 2026-09-07, `skills/openspec/openspec-orchestrate/SKILL.md` exists and `catalog/skills.yml` still declares it. No profile YAML under `profiles/` names `openspec-orchestrate`. This establishes source presence, not active discovery or retirement. Confirm the intended status before any activation or redesign.

The source still requires OpenCode `delegate_general`, Sol/high planning, and Luna/xhigh implementation, and depends on OpenSpec `status` and `instructions apply` JSON contracts. Those dependencies were not executed in this record-only pass. Recheck tool availability, model allowlists, and planning-store fields before attempting the workflow; do not infer compatibility from a catalog entry.

## Calibration and failure history

Worker-budget bands are empirical rather than model limits. Revisit them when workers exhaust useful context or fresh sessions repeatedly reread the same core files. Compare total duplicated payload as well as each worker's payload.

[Historical failures](LOG.md) explain the worker-packing and bounded-review rules. A future evaluation should inspect task mapping and actual worker boundaries on both a small change and a cross-cutting standalone-store change. For review changes, inspect false blockers, future-task escalation, remediation count, and task reopening rather than relying on planner self-report.
