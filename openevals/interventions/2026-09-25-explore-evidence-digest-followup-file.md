---
date: 2026-09-25
evals: [explore-evidence]
criterion: producer_return_digest
skill: task-evidence
file: SKILL.md                # also orchestration/SKILL.md
change: wording
outcome: no-effect
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "0/1", after: "0/1" }
---

# Follow-ups extend the evidence file and return a digest

## Behavior targeted

After [the first digest attempt](2026-09-25-explore-evidence-digest-return.md), the coordinator's follow-up brief still asked `explore` to "return short verbatim quoted lines" and the return was a titled excerpt report, failing `producer_return_digest`.

## Change

- `task-evidence/SKILL.md`, "Complete the return": the digest became concrete, "Return a short digest: the answer or resulting-state delta in a paragraph or a few bullets, the few locators or excerpts that decide it, …", and the next bullet gained "further excerpts" in what stays in the file plus "A follow-up on the same investigation extends the file and returns a digest of the addition."
- `orchestration/SKILL.md`, "Human-facing work": the follow-up rule now reads "back to the producer as focused follow-up that extends its evidence file and returns a digest of the addition".

## Result

Still 0/1. Returns shrank again (2.9k and 2.6k characters, from 5.3k and 3.9k before any change), but each cited about ten locators. The briefs still set the return: the first asked to "Ground every claim with checkout path, line numbers and decisive exact quotes … Return concise full answer and pointer", and the follow-up asked to "Extend same evidence file … Return digest with excerpts sufficient for concise cited answer". `single-source-file` passed every criterion under the same guidance.

## Interpretation

Hypothesis: the coordinator writes return requirements into briefs because it wants citations for its own grounded answer, and the producer follows the brief over the skill. Telling the coordinator what the follow-up should return is itself a return format in the brief. Moving the return contract wholly into `task-evidence`, with briefs stating only the needed information and the coordinator taking excerpts from the file, should pass; briefs that still specify a return shape would refute it.

## Locators

Source commit `e39141b` with a dirty working tree. Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`: after `eval_80a3abf2-7336-4a58-80b9-fef3665fa4c0` (`single-source-file`: `eval_07646c0c-cd01-4e85-8694-b25eb694b419`).
