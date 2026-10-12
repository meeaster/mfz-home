---
date: 2026-10-12
evals: [ci-only-change]
criterion: gap_reported, gap_recorded, article_gap
skill: orchestrate
file: SKILL.md
change: placement
outcome: no-effect
environment: live
preset: budget
models:
  primary: { agent: build, model: openai/gpt-6.1-sol, variant: medium }
  subagents:
    explorer: { model: openai/gpt-6-luna, variant: high }
    implementer: { model: openai/gpt-6-luna, variant: max }
  judge: { model: openai/gpt-6.1-sol, variant: high }
runs: { before: "0/1", after: "0/1" }
---

## Behavior targeted

Three gap criteria failed while the other eight passed (behavior, levels, no hooks, scope). The implementer reported per-criterion results with evidence levels (static for the manual trigger, stub for the script) but no gap entries with an idea and cost. The lead's final message said "GitHub Actions runtime remains unverified" without an idea for closing it. The lead never wrote the repository's verification article; its only Cairn write was a session learning note about stubbing `aws`.

## Change

Three edits in the orchestrate skill:

- **Hand off:** added "Before handing off, record new facts about verifying the repository, and every verification gap the work reported, in the repository's verification article (`knowledge/<repo>-verification.md`) with `effort-context`; a gap's status changes only when the human decides." and changed "any verification gaps" to "each verification gap with its idea and what the idea would cost".
- **Record:** removed the verification-article sentence, now owned by Hand off.
- **implementer:** "including what you couldn't verify and any gaps" became "plus a gap entry (gap, evidence, idea, cost) for each criterion that didn't reach level 5".

Placed the recording at Hand off because the lead acts there with the gaps in hand; Record reads as the writer's stage and was skipped. The implementer line repeats the verification skill's four parts because the brief, built from this line, is what a cheap model follows.

## Result

One rerun (`2026-10-12T22-24-18.097Z-05614e96`): the same three criteria failed; the other eight passed again. The lead's brief now said "Load verification skill" and "Return ... evidence and gaps", and both implementers loaded `verification`, yet neither returned four-part gap entries: each rated every criterion "Pass, Level 2" (a stubbed `aws`, a local tag fixture) and stopped, one adding only "closing that gap would require an authorized test target". The lead never loaded `effort-context`, wrote no verification article, and relayed no idea. With no gap entries returned, the Hand off instruction to record "every verification gap the work reported" had nothing to act on.

## Interpretation

The chain breaks at the implementer: `gpt-6-luna#max` treats a level-2 pass as finished and skips the gap entry, even with the skill loaded and the brief naming gaps. The lead then reads "gaps the work reported" literally. Original hypothesis, now refuted for the brief: the lead treats Record as optional writer work after the report, and the implementer's return list in the brief overrides the loaded skill's report format on `gpt-6-luna#max`. Confirmed if a rerun writes the article before the final message and the implementer returns four-part gaps; refuted if the article is written but the implementer still omits gap entries, which would point at the skill rather than the brief.

## Locators

mfz-home `c0df510` with a dirty working tree. Result: `benchmarks/orchestrate-scenarios/results/2026-10-12T22-11-07.460Z-a2ed5fbc` (rejudged after the check's executable-bit fix).
