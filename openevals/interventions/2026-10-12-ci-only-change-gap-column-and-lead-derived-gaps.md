---
date: 2026-10-12
evals: [ci-only-change]
criterion: gap_reported, gap_recorded, article_gap
skill: verification, orchestrate
file: SKILL.md
change: restructure
outcome: partial
environment: live
preset: budget
models:
  primary: { agent: build, model: openai/gpt-6.1-sol, variant: medium }
  subagents:
    explorer: { model: openai/gpt-6-luna, variant: high }
    researcher: { model: openai/gpt-6-luna, variant: high }
    implementer: { model: openai/gpt-6-luna, variant: max }
  judge: { model: openai/gpt-6.1-sol, variant: high }
runs: { before: "0/2", after: "0/1" }
---

## Behavior targeted

After [gaps at handoff](2026-10-12-ci-only-change-gaps-at-handoff.md) had no effect: implementers with `verification` loaded rated level-2 checks "Pass" and returned no gap entries, and the lead recorded and relayed nothing because no gaps were "reported".

## Change

- **verification, Step 5:** the report table gained a column "Gap: what's unverified, idea to close it, cost", and the separate four-part gap block became one bullet: "**Gap** is required in every row below level 5, a pass included: …".
- **orchestrate, Hand off:** "every verification gap the work reported" became "treat every criterion reported below level 5 as a verification gap, whether or not the subagent named one, and record it"; the relay now ends "supplying the idea yourself when the subagent gave none".
- **orchestrate, implementer:** the return line now asks for "the verification skill's report table, with the gap column filled for every criterion below level 5".

Structure over wording: the implementer fills tables reliably, and the lead already sees each level, so the record no longer depends on the implementer naming a gap.

## Result

One rerun (`2026-10-12T22-55-06.597Z-fafe1466`): the three gap criteria still failed, the other eight passed. The behavior changed: the lead loaded `effort-context` for the first time and continued the implementer with "orchestration requires recording below-level-5 gaps … in knowledge/<repo>-verification.md", and the implementer this time named non-production runs as ideas. The write was then refused: the lead's brief added "only if an owned accessible knowledge location [is] established", the implementer found no `knowledge/` folder under the empty Cairn root, and reported "Knowledge recording is blocked." The lead accepted that ("the shared knowledge location was unavailable") and relayed no idea.

## Interpretation

Deriving gaps at the lead worked as a trigger; the record failed on where and by whom. Two gaps remain: the guidance never says the Cairn root's `knowledge/` may be created when absent, and Hand off doesn't say which role writes it (the lead picked the implementer, though knowledge write-ups are the writer's). Original hypothesis: a required table column survives on `gpt-6-luna#max` where a separate list does not, and deriving gaps at the lead removes the dependency entirely. Confirmed if the article is written and the final message carries an idea even when the implementer's gap column is empty.

## Locators

mfz-home `c0df510` with a dirty working tree. Prior results: `2026-10-12T22-11-07.460Z-a2ed5fbc`, `2026-10-12T22-24-18.097Z-05614e96`.
