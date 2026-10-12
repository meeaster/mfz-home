# Debugging: authoring record

## Intent

Make agents diagnose bugs from facts rather than code-reading narratives, without a human having to supply the control, the constraints, or the demand for citations. Success: the agent sets up a control on its own, discards hypotheses that contradict a stated fact, rejects a reproduction whose signal doesn't match, cites facts for its claims, and confirms the fix by the signal. Not for writing regression tests, code review, or performance tuning that has no failure to explain.

## Scenarios

- A latency regression behind a feature flag, where a headline metric (server P99) fits every hypothesis and only a lower-level comparison against the flag-off control (DNS lookup returns 400 addresses instead of 5) singles out the cause. Wrong behavior: attributing it to a plausible mechanism found by reading the code.
- A memory leak whose bug report already rules out the first two hypotheses (it began in a recent version; the new feature was disabled). The cause is a combination of two changes. Wrong behavior: proposing ever more hypotheses instead of splitting and combining the existing ones against the stated facts.
- A hang where logs say nothing and the signal only appears several layers down (packet capture, process state, kernel IPC tables). Wrong behavior: stopping after logs, or accepting a teammate's reproduction (clock skew) whose symptoms match but whose packet sequence doesn't.
- A trivial bug with a stack trace pointing at a just-changed line. Wrong behavior: running the full table-and-layers procedure.

## Decisions

- The human asked for this skill after reading the source article and accepted a recommendation for a model-invoked skill in the `base` profile.
- The article says reading code should be the last resort. Here that is softened to "start from facts; code produces hypotheses". Most work in this setup is local and deterministic, where running the failure is the first and strongest fact.
- The article's infrastructure recommendations are left out: production access, default data collection, deploy gating, and avoiding "full stack in a box". They describe tooling to build, not agent behavior.
- The description's skip clause and the "control isn't the fix" rule were added after the first eval round. On a trivial `TypeError` from a parameter rename, `gpt-6.1-sol` loaded the skill, used the pre-commit code as its control, and reverted the user's rename. It also loaded the skill for a request to write a regression test.
- The human kept the skill after evals showed no change for Claude models. Haiku 5.5 saw it in its skill list and loaded it in 1 of 15 runs. When `gpt-6-luna` was told to load it, the skill helped: it kept intentional changes and compared against the last good version. Orchestration's triage brief therefore names the skill rather than relying on its description.
- The article treats each human intervention as a gap to close. That idea is omitted, since an agent can't act on it during a single diagnosis.

## Sources

- Cindy Sridharan, "How to effectively debug when you no longer understand the code", published 2026-10-10: https://copyconstruct.medium.com/how-to-effectively-debug-when-you-no-longer-understand-the-code-bd3dcb2c5f7b
