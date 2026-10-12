# Verification: authoring record

## Intent

Make agents prove a change works by exercising it as its user would, and return evidence per acceptance criterion that a reviewer can check faster than reading the change. Success: every criterion has a pass, fail, or not-verified result, the evidence level it reached, and an artifact or a reason; checks run against the current build; proxies such as compiling or passing unit tests are never reported as proof on their own. Not for code review, judging whether an interface looks and feels right (that is QA's job), or diagnosing a failure (`debugging`).

## Scenarios

- An implementer finishes a CLI change and its brief lists three acceptance criteria. Wrong behavior: reporting "tests pass" without running the command, or running it against an old build.
- An inspector checks a finished UI change against criteria it didn't write, in the background. Wrong behavior: also judging layout and polish, or reporting a criterion it couldn't reach as passing.
- A final pass before handoff to the human, after review repairs changed the code. Wrong behavior: reusing evidence captured before the repairs.
- A project with a `verify-<app>` skill. Wrong behavior: rediscovering how to launch and drive the app instead of loading it.
- A project without one, where launching took real discovery. Wrong behavior: discarding what was learned instead of reporting it as material for a project verification skill.
- A change in a domain that can't be observed from outside, such as a race condition. Wrong behavior: rounding up to pass instead of `not verified` with the reason.
- A deployment or CI-only change that can't be run here. Wrong behavior: reporting a static check as a pass without its level, or adding a flag or environment variable to the code so a check becomes possible.
- A committed build artifact that is stale. Wrong behavior: verifying a fresh build and reporting the result as true of the commit.

## Decisions

- The human asked for a dedicated skill rather than more orchestration text (2026-10-12): orchestration says who verifies and when, and this skill holds how. Briefs name it, because cheap models rarely load a skill from its description; the `debugging` evaluation showed the same.
- QA is deliberately out of scope (human, 2026-10-12). Verification checks agreed criteria with pass/fail results on a cheap model; QA judges experience beyond the criteria, and a checklist would narrow it.
- Evidence has two audiences (human, 2026-10-12): working evidence inside the work loop, and evidence gathered from the final state for the human's review at handoff. The skill doesn't know which layer it runs in; the brief says.
- A project's own verification skill comes first, following poteto's `create-verification-skill`: launching and driving an app is where agents waste the most effort, so it is written down once per project. This skill doesn't create one; it reports what it learned so one can be made.
- Evidence levels and gaps (human, 2026-10-12). Some repositories can't be verified end to end: deployments, CI-only pipelines, servers out of reach. The skill climbs as far as it can and says how far; what it can't reach becomes a gap with an idea and its cost, for the work's owner to decide. Ways to verify are designed with the change, not improvised during verification, because improvised hooks (the human's example: environment variables piling up) grow the product's surface.
- The skill follows a verification plan when the brief has one, since how to verify is decided during design.
- Two rules came from the first eval round (Haiku and `gpt-6-luna`, 42 runs). Luna verified a fresh build but reported the result as true of a commit whose committed `dist/` was stale, so the report now names any committed artifact that differs. Every with-skill run left untracked evidence inside the repository, so evidence defaults to a scratch directory outside the tracked tree.
- In that round the skill raised evidence saving from 0/18 to 18/18 runs and stopped Luna's proxy-as-proof runs (2 of 6 baseline runs never ran the code), at about +33% tokens on Haiku and +70% on Luna. The cases were too easy to stress `not verified`.
- Agent guidance is verified like any other change, through the interface its user meets: a fresh agent session (human, 2026-10-12). One run is the low rung and an eval with a baseline the high one; the plan picks the rung because live runs cost money, matching `skill-authoring`'s rule that live runs need the human's go-ahead.
- Round 2 (78 runs: v2 against v1 and no skill, Haiku and `gpt-6-luna`, on a proxy trap, a CI-only workflow, a third-party call with no override hook, and a stale artifact). v2 scored 99% / 94% against v1's 83% / 74% and no skill's 86% / 83%. Levels were stated in 12/12 v2 runs and 0/24 otherwise; v2 named the stale artifact in 6/6; no run in any arm added a hook. Four rules came from it: Luna stopped gaps at "remains unverified" (2/6 with an idea), so a gap now has four fixed parts; one run called a stubbed-`fetch` check level 5, so stubs are pinned to level 2; one Luna run skipped available linters, so level 1 says to run them; and one v1 run changed a file mode and then reported no changes, so the tracked tree stays untouched or the change is reported. Without the skill, both models mostly found the planted defects; the skill's measured value is in honest levels, gaps, and evidence, plus fewer proxy-as-proof runs on Luna.
- The gap is a column of the report table, required in every row below level 5 (2026-10-12). In two orchestrated `ci-only-change` runs, `gpt-6-luna#max` loaded the skill, filled the level table, rated level-2 checks "Pass", and skipped the separate four-part gap block. It fills tables reliably, so the gap moved into the table it fills.
- General-purpose and model-invoked, outside the Cairn package, like `debugging`: it is useful in any session, not only orchestration.

## Sources

- poteto's posts on agent verification and the pstack skills `create-verification-skill` and `maintain-verification-skill` (`cursor/plugins`, `pstack/`, unpinned): the idea that verification is the base agentic loop, that it produces a reviewable artifact, and the per-project verification skill. Nothing copied.
- pstack's `prove-it-works` principle (vendored at 0.14.1): verify against the real artifact, not a proxy.
