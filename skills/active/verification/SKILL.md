---
name: verification
description: Prove a change works by exercising it the way its user would and saving evidence for each acceptance criterion. Use before reporting an implemented change as done, when checking a change against agreed criteria, or when asked to show that something works. Skip it for code review, judging visual quality, or diagnosing a failure.
---

# Verification

Verification observes the built thing doing what was agreed, and leaves **evidence** a reader can check without rerunning anything. Each acceptance **criterion** ends with a result, the evidence behind it, and the **level** that evidence reached.

Agents fail here in predictable ways: a proxy reported as proof ("it compiles", "the tests pass", "the diff looks right"), a check run against a stale build or the wrong instance, a criterion that couldn't be checked reported as passing, and code changed mid-verification just to make a check possible. Each step below guards against one of these.

Scale the work to the change. A one-line fix with one criterion needs one check and one piece of evidence.

## Step 1: Turn criteria into checks

Use the verification plan from the brief: each criterion with how it will be checked and at what level. When a criterion has no planned check, write one: the action a user would take, and the observation that counts as passing. When there are no criteria at all, derive them from the request and label them as derived in the report, so whoever coordinates can confirm them.

Where a criterion implies a failure path, such as invalid input being rejected, check that path too.

Done when every criterion has a check with a stated pass condition.

## Step 2: Choose how to drive it

- **The project's own verification first.** Look for a project-local skill for running and driving the app (often named `verify-<app>`), then documented harnesses: end-to-end suites, dev-server instructions, scripts. Load or follow it before working anything out yourself.
- **Otherwise, drive the interface the user touches:**

| Interface | Drive it with |
| --- | --- |
| Web or desktop UI | Browser or app automation: navigate, act, screenshot |
| CLI or TUI | The command in a real terminal, with its output |
| API or service | Real requests against a running instance, with responses |
| Library | A short script calling the public API |
| Agent guidance: a skill, instructions, an agent prompt | A fresh headless agent session on a realistic prompt, judged from its trace: what it loaded and did, not only its final answer |

- Tests are evidence when they exercise the criterion's behavior through that interface. A unit test that passes supports a result; it doesn't establish one.
- For agent guidance, one session shows an agent *can* behave as intended; an eval, repeated runs against a baseline such as no guidance or the previous version, shows it *does* and that the change caused it. Live sessions cost money, so go only as far as the plan's level, and ask before going further.
- **When the real thing can't be exercised here**, as with a deployment, a CI-only pipeline, or a server you can't reach, climb as high as you can and record the level reached:

| Level | Examples |
| --- | --- |
| 1. Static | Lint, schema or type validation, a workflow linter. Run the linters the project or environment provides when they're on PATH |
| 2. Dry run | A plan, a render, a `--dry-run`, a config check |
| 3. Real pipeline | The workflow run on a branch, the job in CI |
| 4. Non-production target | A staging deploy, a test instance |
| 5. The real thing | The behavior observed where the user meets it |

A check that stubs or mocks a dependency, such as a stubbed `fetch` or a fake `aws` on PATH, is level 2 even when it runs the real command: it shows what the code sends, not what happens where the user meets it.

Use only the ways to drive it that already exist. A flag, an environment variable, or a test-only path added to the code under test changes the product, and choosing one is a design decision for whoever owns the change. When no existing way reaches a criterion, that is a **gap**: report it in Step 5.

When the project had no verification skill and launching or driving the app took discovery, put what you learned in the report: how to launch it, how to reach the feature, and the gotchas. That is the material for one.

Done when each check has a way to run, or a recorded gap.

## Step 3: Run against the real thing

- Confirm you are exercising the change: a fresh build of the current code, the right branch, the instance and port you just started. Record the commit or version.
- Leave the tracked tree as you found it. When a check would change it, even a file mode, run the check in a copy; report any change you did make.
- When a committed artifact such as build output, a bundle, or a generated file differs from your fresh build, say so in the report and what it lacks. Your result describes what you ran; a user running the committed artifact would see something else.
- Run every check and capture what you observe as you go.
- When an observation doesn't match the pass condition, rerun that check once to rule out the environment, then record it as a failure with what you saw against what was expected.

Done when every check has run, or has a recorded reason it couldn't.

## Step 4: Save evidence

For each criterion, save an artifact to a file: a screenshot, a short recording, the command and its output, or the request and its response. Save where the brief says; otherwise in a scratch directory outside the repository's tracked tree, such as the system's temporary directory, so evidence never ends up in a commit.

- Capture the state a reader needs, cropped or trimmed to the criterion, so reviewing the evidence is faster than reading the change.
- Leave secrets, tokens, and personal data out of every artifact.
- Evidence describes the code it ran against. After any further change, recapture the evidence it affects.

The brief says who the evidence is for. Working evidence serves whoever coordinates the work. Evidence for a human's review at handoff is labeled with its criterion and makes sense to someone who never saw the work.

Done when every criterion that ran has an artifact on disk, and the report says where.

## Step 5: Report

Report one row per criterion:

| Criterion | Result | Level | Evidence | How it was checked | Gap: what's unverified, idea to close it, cost |
| --- | --- | --- | --- | --- | --- |

- **Result** is `pass`, `fail`, or `not verified`. A partial pass is a `fail` with the part that failed. A pass at a level below the one planned says so.
- `not verified` carries its reason: missing access, a missing environment, or behavior that can't be observed from here.
- After the table, add the commit or version checked, where the evidence is, any stale committed artifact, anything learned about driving the app, and derived criteria awaiting confirmation.
- **Gap** is required in every row below level 5, a pass included: what couldn't be verified here, an idea that would close it, and what the idea would cost, including any surface it adds to the product. Prefer ideas that add no surface, such as a harness outside the code, fixture data, or a mode that already exists. The idea is a proposal for whoever owns the work to decide on. When the brief says a gap is already recorded, name it instead of repeating it.
