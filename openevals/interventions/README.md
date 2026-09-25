# Intervention log

One file per guidance change made to fix an eval result, including changes that had no effect. Over time, the entries show how instruction changes move different models, so compare them across models, placements, and wording.

Name each file `<date>-<eval>-<short-change>.md`. Record a separate entry for each attempt, even when several attempts target the same failure.

## Entry format

Start with frontmatter so entries can be compared mechanically:

```yaml
date: 2026-09-24
evals: [explore-evidence]
criterion: coordinator_lean
skill: orchestration
file: SKILL.md                # file changed, relative to the skill
change: placement             # placement, wording, addition, removal, or restructure
outcome: effective            # effective, no-effect, partial, regression, or inconclusive
environment: live            # add no-instructions or no-extra-skills when staged with those flags
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-astra, variant: medium }
runs: { before: "0/4", after: "4/4" }
```

Take models from the recordings, not only from the preset, and list only subagents that actually ran.

Then these sections:

- **Behavior targeted:** the criterion, what the agent did, and the trace evidence that showed it.
- **Change:** the exact text added or removed and where it sits. Include the reason for choosing that placement and wording.
- **Result:** pass counts before and after, how the behavior changed in the trace, and neighbouring evals checked for regression.
- **Interpretation:** what this suggests about how the model follows instructions. Label it as a hypothesis, and name what would confirm or refute it.
- **Locators:** the source commit (and whether the working tree was dirty) plus local result directories. Result directories are not versioned, so the counts above must stand on their own.
