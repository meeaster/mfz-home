# Scheduled OpenCode jobs design

## Status

This note records the research, implementation, and verification of recurring `opencode2 run` jobs managed by `mfz` and systemd. The first daily job is active.

The source lives in `/home/mark/workspace/repos/mfz-home`. The disposable prototype worktree is clean.

## Goal

Run bounded OpenCode jobs on a schedule without building a scheduler, adding Windows infrastructure, or filling the normal OpenCode session list with one top-level session per run.

The first job is a daily report of pull requests opened against `anomalyco/opencode`'s `v2` branch during the previous local 08:00-to-08:00 window. It uses `build`, `--auto`, and `openai/gpt-5.6-luna#high`. Mutation guardrails remain in the job prompt.

The design should also support implementation workers that gather bounded local or external evidence through `explore` and `research` children.

## Current implementation

The implementation adds these job files:

```text
profiles/personal/.config/opencode/jobs/opencode-v2-pr-review.md
profiles/personal/.config/opencode/jobs/opencode-v2-pr-review-task.md
profiles/personal/.config/systemd/user/opencode-v2-pr-review.service
profiles/personal/.config/systemd/user/opencode-v2-pr-review.timer
```

The shared profile sets `experimental.subagent_depth: 2`, enables the body-free `scheduled-worker`, and allows `worker` and `scheduled-worker` to delegate only to `explore` and `research`.

The timer runs daily at 08:00 in the machine's local timezone and uses `Persistent=true`. It is enabled under `timers.target`. The oneshot service reads the root prompt from standard input and runs:

```sh
opencode2 run \
  --auto \
  --session ses_fc3c5bf1fffejuszN98FNWiG1K \
  --model openai/gpt-5.6-luna#high \
  --agent build
```

The root prompt delegates one fresh child and does no PR work itself. The child reads the separate task prompt, performs the bounded review, and returns one Markdown report.

The child report is a human-facing digest capped at 900 words. It does not include an exhaustive pull request or commit table. The root emits that digest without a preface or second synthesis so each scheduled response contains only the report the human should read.

The root, scheduled worker, and review children receive complete prompts and are told not to load skills. This keeps skill instructions out of the persistent root and disposable review contexts.

## Prototype evidence

The scheduling and rendering path works:

- `systemd-analyze --user verify` accepted the units.
- The timer resolved to the next local 08:00 occurrence.
- An isolated `mfz apply` rendered the prompt, service, and timer.
- The live profile renders both prompts, both units, the agent definitions, and nesting configuration.

The first live prompt requested diffs, reviews, and checks for every pull request. The reporting window contained 99 pull requests, and the run did not finish within 15 minutes. This was a prompt-scope failure, not a scheduling failure.

The bounded prompt reviews metadata for every matching pull request and inspects changed files or diffs only when needed to explain an unclear change, overlap, or likely conflict. That probe:

- created session `ses_fc69e6651ffefVswHuN96s2Ew7`;
- covered all 99 matching pull requests;
- grouped the main changes and identified overlaps;
- finished in about 11 minutes;
- used no subagents;
- made no repository or GitHub changes.

The probe also exposed a timezone ambiguity. The prompt now captures each local 08:00 boundary first and converts it to UTC before querying GitHub. It does not treat 08:00 as UTC and does not need a state file or previous report.

The first production run used persistent root `ses_fc3c5bf1fffejuszN98FNWiG1K` and fresh child `ses_fc3c4817affeKFRmX23dk266kg`. The child recorded `agent: scheduled-worker` and inherited `openai/gpt-5.6-luna#high`. It covered 101 pull requests, created no grandchildren, returned the complete report, and left both sessions uncompacted. The service exited successfully.

## Why systemd timers

WSL runs continuously on this machine, so Windows Task Scheduler and keepalive tools add no value. A systemd user timer is the smallest native fit because `mfz` already manages user units and systemd supplies status, journal output, missed-run catch-up, and non-overlapping activation of the same oneshot service.

Literal cron would save one unit file but would require new crontab management in `mfz`. That is more machinery than this use case needs.

## Session design

The initial prototype used a new session per run. A direct fixed-session design was considered next, with automatic compaction managing old reports. That would stop top-level session growth, but a large daily task could still force compaction between evidence gathering and synthesis.

The current direction separates durable history from disposable working context:

```text
systemd timer
    |
    v
persistent Build session
one visible top-level session
    |
    v
fresh worker child
owns one complete scheduled run
    |
    +-- explore child for local source evidence
    +-- research child for external evidence
    |
    v
bounded synthesized result returned to the root
```

The persistent root should receive only the scheduling prompt, the worker's bounded result, and its own final response. Raw discovery and tool transcripts stay in child sessions. Child sessions are durable, but normal top-level lists exclude them because they have a `parentID`.

This structure also fits OpenSpec application work. A fresh implementation worker can own the accepted task and ask `explore` or `research` children bounded questions without loading all discovery into the coordinator.

## Compaction behavior

OpenCode V2 enables automatic compaction by default. Before a model request, the runner checks whether the active context is too large. Compaction replaces old model-visible history with a lossy summary and recent tail, while preserving the full durable transcript.

Compaction does not interrupt a model request or a running tool. The important worker boundary is after child results enter the worker context and before the worker's next synthesis request:

```text
children finish
    |
child summaries enter worker context
    |
compaction check
    |
worker synthesis
```

Fan-in must therefore be bounded. Each child should answer one narrow question or fixed batch, return structured findings rather than raw transcripts, and keep its result short enough that all child results fit comfortably in the worker's input budget.

The root has a different risk profile. Its old reports are history, not working evidence, so lossy compaction is acceptable. The active job starts with normal automatic compaction. Manual pre-run compaction would require a small runner because `opencode2 run` has no `--compact-first` flag:

```text
POST /api/session/<root>/compact
POST /api/session/<root>/wait
opencode2 run --session <root> ...
```

Unconditional pre-run compaction would give the root maximum headroom, but it adds a model call and still preserves a summary and recent tail. Add it only if repeated runs show stale-context behavior or insufficient root headroom.

Relevant source:

- `/home/mark/workspace/references/opencode/packages/core/src/session/runner/llm.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/session/compaction.ts`
- `/home/mark/workspace/references/opencode/packages/protocol/src/groups/session.ts`

## Worker system prompt

Keep the scheduled worker's Markdown body empty.

A non-empty custom-agent body becomes `agent.system`. OpenCode uses that value instead of its provider-specific default system prompt. An empty body leaves `agent.system` unset, so the normal system prompt remains active. The agent description should explain when to select it, permissions should define its delegation boundary, and the scheduled user prompt should define batching, synthesis, output, and mutation constraints.

The existing `worker.md` is body-free. The existing `research.md` is not body-free; it has a focused read-only research system prompt. The production change should preserve that distinction rather than assume both agents currently use the default prompt.

Relevant source:

- `/home/mark/workspace/references/opencode/packages/core/src/config/plugin/agent.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/session/model-request.ts`

## Model selection and environment configuration

Do not use `OPENCODE_CONFIG_CONTENT` to pass per-job agent configuration when `opencode2 run` connects to the shared background service.

The server reads `OPENCODE_CONFIG_CONTENT` when the server process starts. For a managed-service run, the CLI sends its environment as session shell environment. That environment can affect commands launched for the session, but it does not rebuild the server's location-scoped agent configuration.

A child with no configured model inherits its parent's session model:

```text
child model = configured agent model ?? parent session model
```

This means a body-free scheduled worker with no model entry can inherit `openai/gpt-5.6-luna#high` from the persistent root selected by the timer command. The subagent tool does not accept a per-call model override.

The existing implementation `worker` is configured as Luna `max` in the Personal profile. It will not inherit Luna `high`. The implementation uses the first option:

1. Add a separate model-free `scheduled-worker` that inherits each job's root model.
2. Reuse `worker` and accept its configured Luna `max` model for scheduled jobs.
3. Remove the fixed `worker` model so every use inherits its parent, which would also change OpenSpec implementation routing.

This keeps existing implementation behavior and lets each scheduled job select its root and child model with `--model`.

Relevant source:

- `/home/mark/workspace/references/opencode/packages/cli/src/run/run.ts`
- `/home/mark/workspace/references/opencode/packages/cli/src/server-process.ts`
- `/home/mark/workspace/references/opencode/packages/core/src/tool/plugin/subagent.ts`

## Nesting and permissions

Set the maximum nesting depth once in the shared base profile:

```yaml
opencode_v2:
  config:
    experimental:
      subagent_depth: 2
```

Depth `2` permits `root -> worker -> child`. It does not grant delegation permission. The subagent tool checks the depth limit and the calling agent's permission independently.

Use deny-first rules for narrowly constrained custom subagents. The implementation `worker` may delegate only to `explore` and `research`. If the design adds `scheduled-worker`, it needs the same narrow exception. `research`, `prototype`, and `session-analyst` must not delegate. The reviewer inherits global inspection capabilities but denies file-editing tools. The built-in `explore` and `general` agents already deny further delegation in the current runtime.

Do not set a global subagent deny unless the Build root receives an explicit allow rule for the worker it must launch.

Conceptual body-free worker definition:

```md
---
description: Executes one isolated scheduled job and may delegate bounded discovery to explore and research agents.
mode: subagent
permission:
  subagent:
    "*": deny
    explore: allow
    research: allow
---
```

The exact rendered permission shape must be checked with `mfz guide` and the effective `/api/agent` response before production use.

Relevant source:

- `/home/mark/workspace/references/opencode/packages/core/src/tool/plugin/subagent.ts`
- `/home/mark/workspace/references/opencode/packages/schema/src/config/experimental.ts`

## PR fan-out limitation

The desired allowlist and the PR job's data source do not yet line up.

`explore` is suited to local codebase discovery. `research` is suited to public documentation and upstream-source facts. Neither is the natural owner for authenticated `gh` queries over batches of pull requests. The built-in `general` agent can run `gh`, but it also has broad mutation permissions and is outside the requested worker allowlist.

The successful bounded probe did not need fan-out. Keep direct `gh` collection in the worker unless runtime evidence shows that the worker cannot gather and synthesize the reporting window safely. If PR batching becomes necessary, prefer a dedicated read-only GitHub inspection agent over granting the worker access to broad `general` children.

## Delta evidence

The scheduled worker creates a blob-filtered clone under `/tmp/opencode` and compares the `origin/v2` commits at the UTC window boundaries. Git log, changed paths, statistics, and targeted diffs establish what reached the branch. The worker removes the clone before returning.

GitHub supplies merged pull request metadata and a short list of open pull requests likely to affect `v2` soon. The worker reads comments only when discussion changes a short-listed pull request's meaning, risk, dependency, or likelihood of merging. It does not inspect every pull request, comment, or diff.

After collection, the worker materializes metadata, changed-file lists, and patches for every merged pull request plus up to ten short-listed open pull requests. It balances those packets by changed-line count across three to five manifests. Parallel `explore` children read the manifests and return findings capped at 500 words each. Raw patches and child transcripts remain outside the persistent root.

## Verification

Completed verification:

- `mfz apply --agent opencode-v2` rendered and linked the live configuration.
- The effective config reports `experimental.subagent_depth: 2`.
- The effective agent list reports an empty system prompt and no configured model for `scheduled-worker`.
- Effective worker permissions deny all subagents before allowing `explore` and `research`.
- `systemd-analyze --user verify` accepts both units.
- A manual service run exited with `Result=success`.
- The child inherited Luna high and remained hidden from top-level session lists.
- The root had five active-context messages and no completed compaction after the run.
- The reference checkout remained clean and the job reported no GitHub mutations.
- `opencode-v2-pr-review.timer` is enabled and active.
- A temporary prompt check produced the capped digest without an exhaustive table, used Git-derived branch evidence, removed its disposable clone, and was deleted with its child session after verification.
- A nested prompt check used one scheduled worker and five parallel `explore` children at depth two. It made no skill calls, inherited Luna high throughout, cleaned its packet directory, and was deleted recursively after verification.

## Reusable guidance

The engine now exposes `mfz guide cron` as the detailed source for scheduled OpenCode jobs. The engine-owned `mindframe-z` skill and managed home guidance point to that topic instead of copying its mechanics into always-loaded context.

The guide covers prompt placement, unit naming, Build plus `--auto`, prompt-owned guardrails, direct and delegated session policies, session-list behavior, model inheritance, compaction boundaries, bounded fan-in, `mfz apply`, timer activation, manual runs, status, and journal inspection.

Do not build a generic job schema, wrapper framework, or compact-before-run option from one example. Add shared machinery only after another real job exposes stable repetition.

## Current operating choices

- The persistent root is `ses_fc3c5bf1fffejuszN98FNWiG1K`.
- Scheduled runs use the separate model-free `scheduled-worker`.
- Automatic compaction remains enabled without a pre-run compaction wrapper.
- The scheduled worker owns the disposable Git comparison and selective `gh` collection directly.
- The scheduled worker fans completed review packets out to three to five parallel `explore` children after Git and GitHub collection finishes.
- Scheduled root, worker, and child prompts prohibit skill loading.
- The visible response is capped at 900 words and prioritizes day-to-day OpenCode impact.
- Reports remain in the durable root transcript and the systemd journal. The job does not publish them elsewhere.
