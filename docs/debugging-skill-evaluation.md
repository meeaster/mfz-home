# Debugging skill evaluation

## Why we ran it

Cindy Sridharan's [How to effectively debug when you no longer understand the code](https://copyconstruct.medium.com/how-to-effectively-debug-when-you-no-longer-understand-the-code-bd3dcb2c5f7b) describes a method for agentic debugging. Facts constrain, hypotheses are inferred, a control separates signal from noise, and the cause is the hypothesis that fits every fact. We turned it into the [`debugging` skill](../skills/active/debugging/SKILL.md) and measured whether it changes how agents diagnose bugs, and on which models.

The question changed as results came in. Strong models already followed the method, so the useful question became whether the skill lets a cheap model reach the same diagnosis. That question decided the `triage` routing in [orchestrate](orchestrate/design.md).

## What we compared

Each run gave one prompt to a fresh session, once with the skill available and once without. Claude models ran in Claude Code (`claude -p`). OpenAI models ran in OpenCode (`opencode run`). The skill was installed as a project skill in the run's fixture copy. The global install was switched off for the duration, so the baseline could not see it.

The five cases are in [`evals/evals.json`](../skills/active/debugging/evals/evals.json):

| Case | What it tests |
| --- | --- |
| `latency-flag` | A feature flag raises server p99. The agent has to compare flag-on with flag-off in a load harness, turn on debug logging to see connection counts, and ignore a suspicious certificate-reload function. |
| `auth-leak` | An OOM after an upgrade has two causes that only explain every fact together. The bug report rules out the obvious hypotheses. |
| `syncd-hang` | A teammate's reproduction matches the symptom but not the packet captures, thread samples, or IPC tables. The agent has to refuse to ship her patch. |
| `trivial-typeerror` | A rename broke two callers. The agent should fix them in one quick pass and keep the rename. |
| `adjacent-regression-test` | "Write a regression test." The skill should not load. |

Iteration 1 used smaller fixtures with pre-labeled data. Iteration 2 made `latency-flag` and `syncd-hang` harder: no flag-off log was provided, and the diagnostics were unlabeled and noisy. Every later round used the iteration 2 fixtures and 19 assertions per configuration.

## Results

| Model | Harness | Runs per case | With skill | Without skill | Cost per run |
| --- | --- | --- | --- | --- | --- |
| Opus 5.5, medium | Claude Code | 1 | 95% | 95% | $0.35 |
| Sonnet 5.5, high | Claude Code | 1 | 95% | 95% | $0.18 |
| `gpt-6.1-sol`, high | OpenCode | 1 | 80% | 79% | $0.12 |
| Haiku 5.5 | Claude Code | 3 | 95% | 95% | $0.012 |
| `gpt-6-luna`, high, told to load the skill | OpenCode | 1 | 17 of 19 | 16 of 19 | $0.007 |
| `gpt-6-luna`, max, told to load the skill | OpenCode | 1 | 18 of 19 | 15 of 19 | $0.011 |

Costs use [models.dev](https://models.dev/api.json) prices. Claude Code writes one-hour cache entries, which cost twice the input price. models.dev lists the five-minute rate, so Claude costs here use the one-hour rate and match what Claude Code reported for each run. OpenCode recorded $0 for the OpenAI runs because they bill through a ChatGPT subscription, so those figures are what the API would have charged. All rounds together cost about $13.50.

## What we learned

Every model diagnosed every case. All of them found the 412-address connection churn, both leak causes, and the mismatched reproduction. At this difficulty the method is already in the models, and the skill does not change Claude's pass rate.

Haiku matched Opus at about a thirtieth of the cost. Haiku saw the skill in its list in all 15 runs where it was available and loaded it once. Description-based loading does not work for it.

The skill helped the OpenAI models in two specific places:

- **Reverting the change instead of fixing it.** Without the skill, Sol and Luna high each "fixed" the trivial bug by reverting the rename. That happened in 2 of 3 OpenAI runs without the skill and 0 of 3 with it. The rule that a control locates the cause but isn't the fix came from this failure.
- **Using the last good version as a control.** Both Luna runs with the skill compared against version 2.3.2 in the leak case. Neither Luna run without it did.

Luna was told to load the skill and did so every time. It never loaded the skill for the regression-test case, which had no such instruction.

One assertion failed almost everywhere. Few runs offered the human a choice between leak fixes with different trade-offs, and the skill's rule asking for that was not reliably followed.

## Decisions

- Keep the `debugging` skill, and have the orchestrator name it in the `triage` brief rather than relying on its description.
- Route default `triage` to `openai/gpt-6-luna#max`, and escalate to `openai/gpt-6.1-sol#high` when the case is weak. Luna max scored best of the OpenAI configurations, and both Luna variants cost about a cent per run.
- Let `triage` gather its own evidence by default. In these cases the evidence fit in one context, so a separate gathering step would have added coordination cost and a chance of losing the deciding detail in a summary.

## Limits

- Most configurations ran once per case. The Luna and Sol differences rest on one or two runs each.
- The fixtures are small. Every model passed them, so none of the runs show where a model starts to fail.
- The cases never test whether gathering evidence before triage pays off. That needs a case with evidence too large or too scattered for one context.
- All runs were single prompts. The article's failures happened in long sessions, where an agent that can do the work does not bother.

The next useful test is a case that cheap models fail, followed by a comparison of Luna triage alone, Luna gatherers with Luna triage, and Luna gatherers with Sol triage.
