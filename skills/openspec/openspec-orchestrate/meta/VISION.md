# Vision

OpenSpec Orchestrate turns a completed change contract into an execution-ready implementation route.
Its primary planning artifact is the smallest practical sequential list of bounded worker sessions,
not a restatement of OpenSpec sections or a worker for every lifecycle checkpoint.

The Sol/high planner understands the complete change and repository, derives cohesive work packages,
and packs them into workers by semantic area, file ownership, authority boundary, and context cost.
Fresh workers are valuable when they leave a completed area behind; they are wasteful when they reread
the same core files. The coordinator validates the result, delegates each accepted worker to
Luna/xhigh, and retains task-ledger and operator authority.

Success means every pending task has one owner, implementation workers are few enough to avoid
unnecessary uncached rereads but bounded enough to avoid expensive late-context work, and operator or
coordinator checkpoints are visible without masquerading as delegated agents.

Parallel implementation, implicit worktree isolation, speculative write paths, worker-owned task
checkboxes, and irreversible operations without approval remain outside the workflow.
