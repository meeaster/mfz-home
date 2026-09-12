# Evaluations

## Expected behavior

- From a Location and project outside the evidence root, the configured edit exception matches any file beneath that root, including index/context and non-Markdown paths. Producer ownership remains a dispatch constraint, not a permission restriction. Paths outside the root receive no allow from this exception.
- A patch that mixes an allowed root path with a denied outside path fails. Relative resources receive no grant from the absolute exception. These are permission expectations, not proof that built-in explore may follow a write request.
- From a Location or project containing the root, the caller or producer returns the placement blocker rather than changing permissions or bypassing the tool policy.
- The enabled same-name explore file supplies the complete upstream prompt with exactly one changed guideline and an exact `orchestrator-task-evidence` skill allow. Existing profile model/variant and edit permissions survive materialization; omitted built-in fields remain inherited.
- An ordinary search, a permitted path without an assignment, or skill loading alone produces no file. An explicit user or parent request for an owned evidence file beneath the external root permits its creation or update through edit tools, with no other writes or shell changes.
- A genuine higher-priority prohibition, unavailable tool, or unsupported placement yields the exact conflict and file-ready findings. The coordinator owns an attributed fallback note and completes it after the producer returns before downstream reads. An outdated no-files expectation is not success for the revised assigned-write case.
- A downstream agent reads explicitly required headings, reuses applicable findings, and asks only for materially missing, stale, or conflicting evidence. The producer returns material delta and headings rather than replaying its note.

## Evidence classification

The current source-backed merge, prompt-diff, MFZ materialization, skill-access, and static behavior checks are recorded in `../../skills/orchestrator-task-evidence/EVALS.md`, including the failed native-decoder probe and remaining live gaps.

Static source and materialization checks are authoring evidence, not independent approval or proof of model behavior. Live execution remains for the separately authorized parent-led test. Record its session IDs, exact rendered artifact revision, model, Location/project, actual tool trace, note contents, and denied-write behavior before claiming the workflow works live.

## Ordinary-session selection

**Scenario:** A current task needs bounded static local evidence that would materially reduce uncertainty. Ordinary routing may select `explore` proactively. A request that does not need local evidence stays in the current session.
