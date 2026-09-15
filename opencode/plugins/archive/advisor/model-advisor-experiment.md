# Model Advisor Experiment

Date: 2026-07-16

## Question

This experiment asked which model process gives the best implementation quality for the cost:

- one main model working alone;
- the same main model with an implementation-stage advisor;
- different advisor models;
- a strong post-implementation review;
- a cheaper closure review after remediation.

The work item was deliberately difficult: implement the repository-local portion of the Mindframe-Z `vendor-and-audit-skills` OpenSpec change. It crossed manifest schemas, hostile Git input, candidate evidence, promotion transactions, rendered snapshots, shared harness directories, migration behavior, documentation, and integration tests.

## Experimental Method

### Implementation stage

Each candidate received an isolated Git worktree based on the same `main` commit and the same implementation prompt. The prompt:

- treated the OpenSpec artifacts as authoritative;
- limited work to repository-local tasks;
- excluded personal-home migration tasks 6.4 and 6.5;
- prohibited live-home changes and commits;
- required isolated tests and uncommitted output.

Main model variants were selected in the regular OpenCode TUI. Advisor and subagent usage differed by arm.

### Review and remediation stage

After implementation, each main session was compacted. A read-only `delegate_general` subagent using Sol high loaded `thermo-nuclear-code-quality-review` and reviewed the complete diff against the OpenSpec. The original main session then evaluated the findings, implemented supported fixes, and reran verification.

Some arms invoked additional configured advisors during remediation. Their costs are included.

### Final evaluation stage

The first exploratory comparisons used Luna explore agents. Those findings helped orient the analysis but do not determine the final scores.

For the final comparison:

1. Six independent Sol-high general agents audited the six final worktrees with the same rubric.
2. A seventh Sol-high comparison chair read all six reports and selectively inspected disputed code.
3. The chair normalized scores to the agreed repository-local scope, excluding tasks 6.4 and 6.5 from deductions.
4. Verification was rerun serially where concurrent test execution caused shared `/tmp` interference or known timeout flakes.

The normalized rubric was:

- security and trust boundaries: 30 points;
- correctness and repository-local OpenSpec compliance: 25 points;
- tests: 20 points;
- architecture and maintainability: 15 points;
- verification and readiness: 10 points.

No candidate was release-ready. Scores compare unfinished implementations; they are not percentages of objective completeness.

## Results

| Rank | Process | Score | Implementation cost |
| ---: | --- | ---: | ---: |
| 1 | Luna xhigh + Terra advisor, then Sol review | 71 | $17.3741 |
| 2 | Luna xhigh + Sol advisor, then Sol review | 59 | $19.6360 |
| 3 | Terra high + Sol advisor, then Sol review | 58 | $15.3867 |
| 4 | Luna xhigh alone, then Sol review | 53 | $10.2498 |
| 5 | Sol low orchestrator, then Sol review | 52 | $23.5569 |
| 6 | Terra high alone, then Sol review | 34 | $8.5204 |

The Luna-plus-Terra arm produced the best absolute implementation. The Luna-alone arm produced the best current score per implementation dollar. Luna-plus-Sol cost more than Luna-plus-Terra while scoring lower.

### Why Luna plus Terra led

Terra made several recommendations that survived into the strongest implementation:

- derive one unambiguous promotion target instead of trusting mutable source metadata;
- revalidate catalog, lock, accepted source, and candidate under the promotion lock;
- bound Git blob extraction rather than spawning unbounded processes;
- reject non-round-trippable Git path bytes;
- add real-Git tests for explicit commits, ref movement, executable and binary content, and unavailable remotes.

The final implementation also benefited from work not attributable to Terra:

- Luna spent substantially more implementation effort in that run;
- the Sol review found a broader set of defects;
- remediation introduced separate Git, tree-integrity, transaction, and snapshot modules;
- run-to-run model variance produced different architectures and test depth.

### Advisor attribution

A Sol-high causal analysis estimated the 18-point gap between Luna-plus-Terra and Luna-alone as:

| Source | Central estimate | Plausible range |
| --- | ---: | ---: |
| Terra advisor contribution | 5 points | 3-7 |
| Luna run variance and additional effort | 6 points | 4-9 |
| Differential Sol-review remediation | 7 points | 5-9 |

This is suggestive, not causal proof. The runs were independent stochastic generations, not randomized continuations from one frozen draft.

## Cost Method

Costs were reconstructed from OpenCode per-message token records rather than session cost fields, which were zero. Prices came from `https://models.dev/api.json` on 2026-07-16.

- Reasoning tokens were priced as output tokens.
- Cache reads and writes used their model-specific rates.
- The 272,000-token long-context tier was applied per request.
- Abandoned and restarted sessions attributable to an arm were included.
- Main sessions, advisors, implementation subagents, and review subagents were separated before aggregation.

Tracked spend:

| Category | Cost |
| --- | ---: |
| Six implementation and remediation arms | $94.7239 |
| Earlier exploratory reviews | $2.2139 |
| Six final Sol-high audits | $19.6416 |
| Sol-high comparison chair | $1.0624 |
| Sol-high advisor-attribution analysis | $2.0331 |
| **Total tracked experiment spend** | **$119.6750** |

This total excludes the primary conversational model's API cost.

## Recommended Process

### Small, local, reversible work

Use Luna xhigh with focused tests. Skip advisors unless uncertainty appears.

### Normal nontrivial work

Use Luna xhigh with one bounded Terra-high preflight before editing. Ask for:

- core invariants;
- ownership and boundary decisions;
- likely failure modes;
- required tests;
- architectural seams to preserve.

The preflight should return a concrete checklist, not a generic review.

### High-risk or cross-cutting work

After implementation, delegate a read-only Sol-high thermo-nuclear review when the change involves hostile input, permissions, concurrency, transactions, recovery, migrations, generated schemas, multiple harnesses, or a broad multi-file diff. The main implementer owns judgment and remediation.

### Closure review

Run a focused Terra-high closure review only when remediation materially changes the state model, transaction order, permissions, ownership boundaries, or architecture. Its job is not to repeat the broad audit. It verifies that every accepted finding is actually closed and that the fixes introduced no regressions.

Maintain a finding ledger throughout remediation:

- original finding;
- accepted or rejected disposition;
- implemented location;
- proof or test;
- closure status after refactoring.

The portable `closure-review` skill defines this gate. A future process may delegate Terra high to load that skill; this experiment does not define or install that orchestration.

## Threats To Validity

- Only one independent run represented each process arm.
- Arms differed in token use, patch count, elapsed time, compaction context, and tool trajectory.
- Advisor advice, main-model variance, and remediation effort interacted.
- Some agents invoked additional advisors or subagents.
- Concurrent Vitest runs interfered through fixed temporary paths; serial reruns were used for final verification.
- Scoring remained expert judgment, even after one-model normalization.
- The implementations remained uncommitted and not release-ready.
- Personal-home migration was deliberately excluded from implementation scoring.

## Better Follow-Up Experiment

To measure advisor causality, generate several frozen Luna drafts, then randomly assign identical copies to:

- no advisor;
- Terra feedback;
- Sol feedback;
- placebo continuation with the same token and time budget.

Use at least eight seeds per arm, prohibit extra advisors, apply the same remediation budget, and have blinded reviewers score every result. Record each recommendation, whether it was adopted, whether it survived later refactoring, and whether it removed a blinded-audit finding.
