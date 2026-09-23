# Context Transfer delegation experiments

Four paired tasks on 2026-09-22 compared ordinary Sol medium coordinator prompts with prompts prepared after loading Context Transfer and its agent-brief branch. Each coordinator launched a fresh Luna high worker through `opencode run --agent general`. The user accepted this execution method.

## Results

| Task | Default prompting | Context Transfer |
| --- | --- | --- |
| Spending-report CLI | 6/6 executable check groups | 6/6 executable check groups |
| Incremental contact-reconciliation repair | 8/8 executable check groups | 8/8 executable check groups |
| Duplicate-payment incident diagnosis | 7 rubric passes, 1 partial | 8 rubric passes |
| Feature-flag rollout recommendation | 8/8 rubric criteria | 8/8 rubric criteria |

Checks and rubrics were specified before dispatch. A separate Luna high grader assessed condition-unlabeled incident and rollout reports. These rubric scores are model judgments about the artifacts, not independent statistical observations.

Default outputs preserved corrected assumptions, scope, priorities, rejected approaches, and the distinction between proposals and approvals. Treatment outputs supplied two small benefits: atomic output replacement in the repair and an explicit post-fix verification recommendation in the incident report. Interrupted writes were not fault-tested. The incident difference was extra rubric completeness, not a wrong diagnosis or an explicit user requirement missed by the default.

The initial treatment prompt strengthened “rounding has bitten me” into a claim that rounding errors were costly and called its rewritten requirements the implementation authority. Neither caused an observed failure. The follow-up treatment prompts preserved the original task's authority.

## Prompt and source access

| Task | Default prompt words | Treatment prompt words |
| --- | ---: | ---: |
| Spending CLI | 276 | 339 |
| Repair | 179 | 368 |
| Incident | 200 | 416 |
| Rollout | 175 | 412 |

Every worker read the original request. Treatment prompts repeated more available material inline. Word counts describe that difference; length is not a quality score or a billed-token measure.

Other guidance varied. In the rollout pair, the treatment worker loaded Technical Writing and Unslop, while the default coordinator loaded those skills instead. The shorter treatment report cannot be attributed to Context Transfer alone.

## Interpretation and limits

The results support the reversible choice to retire mandatory generic agent-briefing guidance. They do not establish that all context guidance is useless, that the models are equivalent, or that the new Artifact Context skill improves output.

There was one run per condition per task. Original requests were short and accessible. The parent knew the conditions when writing tasks and interpreting results. Direct human-artifact guidance, long-conversation recovery, inaccessible source environments, and specialist-to-implementation preservation were not tested. CLI delegation did not validate native nested-subagent execution.

## Recoverable evidence

Evidence is retained in the local scratch workspace. These paths are evidence locations for this Personal environment, not portable dependencies of the runtime skill.

- `/home/mark/workspace/scratch/context-transfer-pilot-20260922/evidence/results.json`: pilot checks, prompts, models, and tool evidence.
- `/home/mark/workspace/scratch/context-transfer-followup-20260922/summary.md`: detailed follow-up interpretation.
- `/home/mark/workspace/scratch/context-transfer-followup-20260922/evidence/protocol.md`: predeclared protocol and rubric.
- `/home/mark/workspace/scratch/context-transfer-followup-20260922/evidence/results.json`: coordinator and worker IDs, models, loaded skills, source reads, prompt comparisons, and checks.
- `/home/mark/workspace/scratch/context-transfer-followup-20260922/evidence/blind/scores.md`: independent report scores.

The recorded session verification used read-only SQLite and checked actual models, prompts, and skill loads. Recorded worker prompts matched saved files after removing CLI-added outer quotation marks. The grader session was `ses_f34b5b72effeQg68LX0xW7yWOy`; parent reports appear at sequences 1296 and 1535 in `ses_f35094f6bffe0vNBuqHFVYK2oZ`.
