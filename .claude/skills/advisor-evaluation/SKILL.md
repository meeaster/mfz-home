---
name: advisor-evaluation
description: Evaluate advisor models from real session evidence and recommend cost-effective routing. User-invoked.
disable-model-invocation: true
---

# Advisor Evaluation

An **advisor evaluation** measures whether a reviewer earns its realized cost on real work.

Run `/agent-sessions` first to locate and read the OpenCode session store. Treat its database guidance as the source of truth for schema and read-only extraction.

## 1. Fix The Dataset

Inventory every `advisor` call before reading outputs. Classify each parent session from its first user message:

- **Real work**: a user-directed task with a substantive outcome.
- **Fixture**: a seed, eval, probe, benchmark, test, `/tmp` run, or subagent session.
- **Ambiguous**: insufficient evidence to classify; exclude from scorecards and name it as a gap.

Then separate records into:

- **Paired**: both advisors reviewed the same parent call and their outputs are attributable through target metadata or labeled output sections.
- **Single-model**: useful for advisor adoption and cost history, but not a head-to-head comparison.
- **Failed**: preserve the failure as availability evidence; never silently discard it.

- [ ] Every advisor call in scope has a session classification and a paired, single-model, or failed status.

## 2. Compare Paired Reviews

Read every paired result in the selected real-work scope. For each pair, record:

- agreement or material disagreement;
- a unique, actionable catch from either advisor;
- unsupported claim, false alarm, or premature approval;
- later parent action that adopted, rejected, or left the advice untested.

Treat later action as **inferred uptake**, not proof that an advisor caused it. Prefer the smallest evidence-backed finding over response length or confidence language.

- [ ] Every paired call is accounted for, including pairs where both reviewers merely agreed to proceed.

## 3. Analyze Realized Cost

Compare like with like before ranking models:

- total and per-call reported cost, when available;
- input, output, cache-read, and cache-write tokens per target;
- transcript size and call position, especially unusually large tool output or full-transcript retransmission;
- completion, failure, and retry rates.

Do not treat an unreported cost as zero. Do not call one model intrinsically cheaper from one workload: distinguish published price from realized cost in this harness. Cache-write volume and weak reuse can explain an expensive path without establishing a model-price ranking.

- [ ] Each cost claim identifies its data source, comparison scope, and material confounders.

## 4. Control The Confounders

Before recommending a model, identify whether paired targets differed in:

- system prompt or prompt variant;
- transcript state, compaction, child-session reuse, or cache strategy;
- provider harness, tool access, effort, or model resolution;
- task type and risk.

Do not attribute brevity, thoroughness, or cost solely to the model when any of these differ. A useful next experiment holds the target transcript, prompt, and task type fixed.

- [ ] Every model-quality claim is either evidence-backed or explicitly limited by a named confounder.

## 5. Make A Routing Decision

Recommend one of:

- one default advisor;
- a default plus an escalation reviewer for named high-risk work;
- continued A/B collection with a precise stopping criterion;
- removal of a reviewer whose incremental findings do not justify its realized cost.

Value is per **high-risk call**, not per invocation. Avoid parallel calls at routine checkpoints and repeated calls without new evidence. Name the task categories, call timing, and evidence that would change the recommendation.

Report:

1. Scope: session IDs, dates, real-work/fixture counts, paired and single-model call counts.
2. Findings: strongest unique catches, misses, agreement, and inferred uptake, with part IDs.
3. Cost and cache: per-target totals and averages with confounders.
4. Recommendation: default, escalation conditions, and next controlled comparison.
5. Gaps: missing attribution, uninspected or ambiguous sessions, and limits on causal claims.

- [ ] The report separates observed evidence from inference and names the next decision the evidence supports.
