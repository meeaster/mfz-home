# Session ses_064c97922ffeFxcXJtbcNkFpvD — Designing a skill-writing skill

## Thread Relevance

Belongs: this is the admitted development session for designing, packaging, evaluating, revising, and maintaining `skill-authoring`; disposable CLI tests were excluded as members but their evidence informed the work.

## Gaps

The dossier reports outcomes and selected artifacts but does not provide complete diffs, all generated file names, or confirmation that the final thread refresh completed after its timeout.

## Phases

- [2026-07-25 21:37 → 2026-07-26 03:33] Initial Design and Package Shape — designed the workflow, process-artifact convention, portability stance, and initial package. (parts prt_f9b367fb0001U3LtHidZFqO4cT–prt_f9c7bf82d0010Wb82QEAcrnPIo)
- [2026-07-26 07:28 → 08:35] Naming, Review, Bundling, and First Evaluations — renamed and bundled the package, addressed review findings, and dogfooded creation and assessment behavior. (parts prt_f9d52dbb0001IM1fTqT28f82QL–prt_f9d906277001t2V8mjJ8oVOYFO)
- [2026-07-26 08:36 → 16:20] Thread Membership and PR Narrative — established the dedicated thread and refined evidence-first PR prose. (parts prt_f9d9183540016Er61IEqPFbArH–prt_f9f39f848001OtE3qd1d9k4twB)
- [2026-07-26 18:17 → 18:34] Reference Flattening and Naming Conventions — simplified bundled references and set local provenance conventions. (parts prt_f9fa50c790013yVQgbPKKPsrKL–prt_f9fb563ab001wiAyZTW8cBGMUg)
- [2026-07-26 18:38 → 18:57] Flattened Dogfooding and Evaluation Findings — tested the flattened package and identified bounded evaluation improvements. (parts prt_f9fb894dd001mA6Trvbapj2ydf–prt_f9fc9d3bc001sy3yMR3mIT3RJe)
- [2026-07-26 18:59 → 19:23] External Comparisons — compared external skill-creation and evaluation approaches. (parts prt_f9fcbd220001Um4IUvYcLBaSGh–prt_f9fe17bb6001q6pNvuiLMCxXBI)
- [2026-07-26 19:41 → 20:01] Handoff, Personal Doctrine, and Refresh Attempt — synthesized personal concerns with external approaches and attempted a thread refresh. (parts prt_f9ff2503d001MowcM2SlX43j4C–prt_fa00450d3001bE1J3SwojVh0SU)

## Decisions

- [2026-07-25 21:50] Use behavior-first design and consult pattern references only when useful, rather than letting patterns constrain creativity. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9b4230c8001aJ8xMX5IP6706C)
- [2026-07-25 22:06] Use `meta/` for process artifacts instead of the initially considered `development/` convention. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9b507f6c001TgmTsQ40hwUYqj)
- [2026-07-26 03:28] Expect the required skill to be loaded rather than adding portability complexity. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9c77c3d90016FyUY3JW9FFdOh)
- [2026-07-26 07:29] Name the package `skill-authoring` because it covers design, creation, revision, evaluation, packaging, and maintenance. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d53c889001oVzklNAcI4YUod)
- [2026-07-26 07:45] Bundle Writing Great Skills and pattern material into this package rather than rely on multiple skills. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d62c6290017S90yb1kp3PNqY)
- [2026-07-26 07:50] Add bundled doctrine and glossary, patterns and skeletons, explicit assessment-versus-implementation routing, a consequential-decision gate, and testing guidance. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d67cbbc001M5NUmD5U5tkhGe)
- [2026-07-26 08:22] Keep `meta/DOGFOODING.md` as a bounded synthesis with coverage, observations, hypotheses, promotion, and pruning rules, rather than a session log. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d84e9f7001hQ7GD0QT0IAvwG)
- [2026-07-26 08:41] Make this the sole member of the dedicated `skill-authoring` thread; retain disposable CLI-test evidence without admitting those sessions. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d9602ee001pY6F73T5iKqZIc)
- [2026-07-26 18:02] Restore evidence-first prose as claim, concrete evidence, then interpretation; restrict Humanizer and audit guidance to prose-level AI-pattern removal. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f980420001Qbg3gjtju83jkk)
- [2026-07-26 18:26] Use flattened, descriptively named references: `writing-great-skills.md`, `writing-great-skills-glossary.md`, `matt-pocock-skill-patterns.md`, `matt-pocock-skill-skeletons.md`, and `testing-workflow.md`. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fad5dcb001tdvEkVIzKoPdm5)
- [2026-07-26 18:30] Keep ordinary references lowercase, reserve uppercase for `SKILL.md` and `meta/` artifacts, and remove frontmatter from adapted references. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fb19ae50012AfviJ8u1VaErP)
- [2026-07-26 18:30] Treat bundling rationale as local to `skill-authoring`, not as a general dependency pattern. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fb0f1ff0013J74uxCPPwbVrJ)
- [2026-07-26 18:57] Narrow evaluation improvements to hash and parent-CLI-event capture, decisive fixtures, and machine-readable results. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fc9d3bc001sy3yMR3mIT3RJe)

## Learnings

- [2026-07-26 07:35] Review found an assessment-mode mutation risk and a reachability problem caused by Writing Great Skills being user-invoked. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d59edc1001o6lr4sb6mK9K)
- [2026-07-26 08:13] Three creation runs showed references were initially loaded too early, then testing guidance loaded unnecessarily; the final run passed context-boundary assertions. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d7c6149001t3srYoaLHc1Z4A)
- [2026-07-26 08:35] An end-to-end test generated and executed `api-contract-change-review`, whose non-mutative assessment returned `DO NOT PROCEED`, five findings, migration guidance, and unchanged fixture hashes. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d906277001t2V8mjJ8oVOYFO)
- [2026-07-26 18:06] The audit-ai-writing version was preferred to Humanizer because it kept evidence nearer to claims and sounded less like finished product documentation. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f9bbe90001EBCL3DwH0ON2BT)
- [2026-07-26 18:44] Flattened-package creation loaded only `skill-authoring` and `writing-great-skills.md`, generated six files, and added `references/risk-criteria.md`. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fbe4035001oJfymZLJ10RU6U)
- [2026-07-26 18:46] Fresh execution discovered `migration-risk-review`, loaded only its relevant reference and plan, returned `BLOCKED`, and made no writes. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fbfa3500013idcC5neQSM3m5)
- [2026-07-26 19:07] The comparison characterized OpenAI as structurally simple, Anthropic as strongest in iterative evaluation, Sentry as strongest in package architecture and regression testing, and the local package as strongest in behavior-first design, authority boundaries, selective loading, trace evidence, portability, and bounded dogfooding. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fd35fc1001ja15EtvUjXmkYO)
- [2026-07-26 19:22] No direct successor to OpenAI's `skill-creator` was found; creation and evaluation were split between `plugin-creator` and `plugin-eval`. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fe0bd01001zEEvcKgbuuI4hc)
- [2026-07-26 19:48] Personal-source synthesis identified recurring concerns about triggering, overloaded references, leaked development context, source drift, weak self-reported evidence, harness reload behavior, and portable evaluation definitions. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9ff8a0d9001MTlzbG0C8XlJW7)

## Mistakes Fixed

- [2026-07-26 07:50] Corrected the assessment-mode mutation and doctrine reachability risks by bundling material and explicitly routing assessment versus implementation behavior. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d67cbbc001M5NUmD5U5tkhGe)
- [2026-07-26 18:02] Corrected automated PR-prose rewrites that removed evidence-first structure by requiring claim-to-evidence-to-interpretation ordering. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f980420001Qbg3gjtju83jkk)

## Issues

- [2026-07-26 18:48] Evaluation found a runtime classification defect, an underdetermined retry scenario, missing direct non-execution coverage, stale maintenance text, and CLI warning evidence absent from the session trace. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fc2426f001R3hitfTBlSbBEu)
- [2026-07-26 20:01] The thread-refresh command exceeded the local timeout, leaving completion unestablished. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_fa00450d3001bE1J3SwojVh0SU)

## Open Questions

- [2026-07-26 18:57] Should evaluation fixtures require stronger distinguishing evidence when multiple severity or outcome levels are acceptable? (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fc9d3bc001sy3yMR3mIT3RJe)
- [2026-07-26 19:07] Should the package gain a reusable structural validator, baseline system, or machine-readable result format? (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fd35fc1001ja15EtvUjXmkYO)
- [2026-07-26 19:41] How much of Anthropic's heavier evaluation loop and Sentry's regression machinery should be adopted without making the package operationally heavy? (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9ff2b235001XNvRtbBLvEMzAQ)
- [2026-07-26 18:48] How should harness-level warnings absent from the OpenCode session trace be captured? (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fc2426f001R3hitfTBlSbBEu)
- [2026-07-26 20:01] Did the thread refresh complete after the timeout? (ses_064c97922ffeFxcXJtbcNkFpvD · prt_fa00450d3001bE1J3SwojVh0SU)

## Intent & Vision

- [2026-07-25 21:37] "create a skill that I will use for skill writing," using Writing Great Skills as a base while incorporating voice-note and topic material. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9b367fb0001U3LtHidZFqO4cT)
- [2026-07-26 03:28] "tbh I think we shouldn't overcomplicate this and just say load the skill and expect we will have the skill." (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9c77c3d90016FyUY3JW9FFdOh)
- [2026-07-26 07:45] "I think it's silly to have multiple skills." (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d62c6290017S90yb1kp3PNqY)
- [2026-07-26 08:16] "I just want to make sure we keep track of this because it will be important as we dog food more." (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d71f51d6001ROLvDtjOPO6EAI)
- [2026-07-26 18:17] "I don't want to make reference folder too complicated. thinking we flatten." (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fa50c790013yVQgbPKKPsrKL)
- [2026-07-26 19:46] The user wanted their own "flavor" identified from personal wiki, voice notes, and related material, layered on external systems rather than reinventing them. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9ff7010e001zRMH3oCPjsAHgD)

## Artifacts Touched

- [2026-07-26 03:33] Created `skill-workbench` with `SKILL.md`, `agents/openai.yaml`, and `meta/VISION.md`, `meta/EVALS.md`, `meta/MAINTENANCE.md`, and `meta/LOG.md`; enabled it for OpenCode, Claude Code, and Codex. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9c7bf82d0010Wb82QEAcrnPIo)
- [2026-07-26 08:22] Added `meta/DOGFOODING.md`. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9d84e9f7001hQ7GD0QT0IAvwG)
- [2026-07-26 18:34] Recorded flattened references and naming conventions in commit `94de104`. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fb563ab001wiAyZTW8cBGMUg)
- [2026-07-26 18:44] Generated `references/risk-criteria.md` during flattened-package dogfooding. (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fbe4035001oJfymZLJ10RU6U)

## Sources

- [2026-07-26 16:14] Humanizer — https://github.com/blader/humanizer (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f3482970014gaIXEqwUUMWBz)
- [2026-07-26 16:14] Pull request — https://github.com/meeaster/mfz-home/pull/1 (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f3482970014gaIXEqwUUMWBz)
- [2026-07-26 16:14] Pull request comment — https://github.com/meeaster/mfz-home/pull/1#issuecomment-5084323893 (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f3482970014gaIXEqwUUMWBz)
- [2026-07-26 16:14] Pull request comment — https://github.com/meeaster/mfz-home/pull/1#issuecomment-5084326666 (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f3482970014gaIXEqwUUMWBz)
- [2026-07-26 16:14] Vision and design workflow learnings — `/home/mark/workspace/scratch/2026-07-25-vision-design-workflow-learnings.md` (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9f3482970014gaIXEqwUUMWBz)
- [2026-07-26 19:00] OpenAI skills — https://github.com/openai/skills (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fcc80e5001PQALhXcS4p1tID)
- [2026-07-26 19:17] OpenAI plugins — https://github.com/openai/plugins/tree/main/plugins (ses_064c97922ffeFxcXJtbcNkFpvD · prt_f9fdca907001ytMiT4tMW8ROw3)
