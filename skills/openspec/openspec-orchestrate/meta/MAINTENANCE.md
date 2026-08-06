# Maintenance

The skill depends on the OpenSpec CLI JSON contracts for `status` and `instructions apply`, and on
OpenCode `delegate_general` supporting explicit Sol/high planning and Luna/xhigh implementation
routes. Recheck command fields and model allowlists when either dependency changes.

Worker-budget calibration is empirical. Review it when observed Luna/xhigh sessions repeatedly run
out of useful context or when plans create fresh sessions that reread the same core files. Evaluate
both per-worker payload and total duplicated payload; lowering one worker's estimate is not an
improvement when total uncached reads and handoffs rise materially.

After behavioral changes, run the scenarios in `meta/EVALS.md` against at least one small local
change and one cross-cutting standalone-store change. Inspect the returned task mapping, worker count,
worker boundaries, exact writes, and checkpoint separation. A planner self-report is insufficient.

For review-route changes, inspect an execution trace for false blockers, future-task escalation,
remediation count, task reopening, and independent-review frequency. The desired result is evidence-
backed acceptance without turning each closure into a new discovery pass.

Edit this source package in the Mindframe-Z home, then activate it with
`mfz apply --target all --agent all`. Do not edit rendered skill snapshots.
