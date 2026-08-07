# Skill Testing

Use this loop to test a skill's actual behavior rather than its apparent prose.

## 1. Fix The Test Contract

Select one scenario from the resolved authoring record's `EVALS.md` or define a missing representative scenario. Record:

- the skill revision;
- the invocation surface under test;
- the harness, model, effort or variant, and relevant configuration;
- the fixture or starting workspace;
- the observable assertions;
- the files and systems the run may modify.

Test one behavioral claim at a time. Preserve the same scenario across a before-and-after comparison.

When the question is whether a skill or revision adds value, define a baseline under the same test contract:

- for a new skill, run the same task without the skill;
- for a revision, run the same task with the previous revision;
- keep the harness, model, effort, fixture, assertions, and relevant configuration aligned.

Skip the baseline when the test only needs to verify an explicit behavioral contract or its extra cost would not change the decision.

Complete this step when pass, fail, and out-of-scope behavior are distinguishable before the run begins.

## 2. Isolate The Workspace

Create a fresh disposable directory for task files and mutable artifacts. Copy or create only the fixture the scenario needs. Keep authoritative repositories and user data outside the write scope.

Retain the configured skill registry when testing real invocation or installed behavior; workspace isolation does not require hiding the skill under test. Use a clean harness configuration only when configuration independence is itself the claim being tested.

Complete this step when all authorized task writes are confined to the disposable workspace and any unavoidable harness state is identified.

## 3. Exercise The Intended Invocation

For a model-invoked skill, use realistic positive, negative, and adjacent prompts without naming or preloading the skill. For a user-invoked skill, invoke it explicitly with a representative request. Confirm that the harness has discovered the revision under test.

Run a fresh process of the target harness with the tested skill available. Capture the session identifier, parent CLI event stream when available, final response, created artifacts, and command-level failures or retries. Use available environment guidance to operate the harness rather than embedding its commands here.

Complete this step when the run can be reconstructed without relying on the final response alone.

## 4. Inspect Artifacts And Trace

Inspect every produced artifact and the session record. Establish:

- whether the intended skill loaded and whether it loaded early enough;
- whether required references were read before dependent work;
- whether conditional references loaded only after their conditions fired;
- whether development-only or irrelevant context leaked into runtime;
- which tools ran, failed, retried, or touched files;
- whether writes stayed inside the authorized boundary;
- whether the final claims match the successful checks;
- whether the observed behavior satisfies `VISION.md` and the scenario assertions in `EVALS.md`.

When a baseline applies, compare behavior, artifacts, trace efficiency, and assertion results. An acceptable candidate that does not improve the motivating dimension has not established incremental value.

Prefer the harness's durable structured session record or export. Use available environment guidance to locate and inspect it rather than duplicating session-store instructions here. Treat self-report as a claim to verify, not evidence.

Complete this step when every pass or failure claim cites an artifact or trace event and uninspected evidence is named.

## 5. Classify The Result

Classify each observation as one of:

- **Pass** — the assertion is supported by trace and artifact evidence.
- **Behavioral defect** — the skill predictably steered the agent away from intended behavior.
- **Evaluation defect** — the scenario or assertion did not measure the intended behavior.
- **Environment noise** — tooling, credentials, network, model availability, or harness state prevented a meaningful result.
- **Untested** — the available evidence cannot decide the assertion.

Separate skill defects from ordinary tool recovery and one-run model variance. Recommend instruction changes only when the evidence identifies a steering problem.

Complete this step when each observation has a classification, confidence, and expected value.

## 6. Revise And Rerun

When implementation is authorized, make the smallest change that targets the supported behavioral defect. Update affected `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md` artifacts together. When implementation is not authorized, present the proposed change without editing.

Rerun the same scenario with the same harness, model, effort, fixture, and assertions. Then run the nearest adjacent scenario that could regress. Compare traces, not only final outputs. Repeat the aligned baseline only when the candidate or test contract changed enough to invalidate the earlier comparison.

Complete the loop when the target assertion passes, the result remains explicitly untested or noisy, or the user accepts the residual limitation. Clean up disposable sessions after capturing evidence; retain test artifacts only when they remain useful for review.
