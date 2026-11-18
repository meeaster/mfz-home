# The conductor command

Working record for `/conductor-reviewed` (`opencode/commands/conductor-reviewed.md`) and its two simpler siblings, `/conductor-opus` and `/conductor-terra`. It holds what the command is for, Mark's preferences, the principles behind each line and where they came from, the evidence from every test run, and the methods used to test it, so development and testing can continue in a new session.

**Status:** as of 2026-11-15. The command supports tracked and untracked work, loading `tracks-v2` for the former. The dev-personal OpenCode configuration enables v2 and denies v1. Changes are uncommitted. Historical delivery results below do not establish the new tracks integration's behavior.

## Contents

- [Vision](#vision)
- [The command today](#the-command-today)
- [Mark's preferences](#marks-preferences)
- [Principles agreed with Mark](#principles-agreed-with-mark)
- [Principles from references](#principles-from-references)
- [Writing style](#writing-style)
- [Evidence: every test run](#evidence-every-test-run)
- [How the command evolved](#how-the-command-evolved)
- [Testing method](#testing-method)
- [Instruction interpretation method](#instruction-interpretation-method)
- [Open questions and next steps](#open-questions-and-next-steps)
- [References](#references)
- [Artifacts and locations](#artifacts-and-locations)

## Vision

A short command Mark types at the start of a session that turns the session into a **conductor**: a lead that brainstorms and designs with him, delegates the reading and the building to cheaper models, gets the plan and the code checked by other model families, and stops for him at the points that need his judgment.

What it is for:

- **Mark's work, not just toy apps.** Designs there span several repositories and pull evidence from Datadog, AWS, Confluence and other systems. Putting all of that in one session costs too much and hits compaction (GPT-6.1 leads compact at about 250k tokens). The conductor keeps its own context for the conversation and the plan, and sends the raw material to workers, accepting that handoffs are a bit lossy.
- **A lighter alternative to Cairn's `orchestrate` and `roles`** for tracked and untracked work. The models are capable delegators on their own; the command names the models and states the few rules that matter instead of loading a role catalog. (See [roles](#principles-agreed-with-mark).)
- **Quality from review, cost from model choice.** Expensive models go where judgment matters (the lead's design, the reviews); cheap models gather and build.

The conductor owns the conversation, design, planning, coordination, reviews and delivery gates. `tracks-v2` owns durable records, approval state, dependencies and publishing mechanics. Naming a track or slice, or asking to track work, selects those records; ordinary work uses the conversation and session files. Gathering, implementation and review are assignments, not a catalog of specialist roles.

## The command today

`opencode/commands/conductor-reviewed.md`, rendered by `mfz apply` into `~/.mindframe-z/configs/dev-personal/opencode/commands/`. Profile: `profiles/dev-personal/profile.yml` under `opencode.commands` (`conductor-opus`, `conductor-terra`, `conductor-reviewed`).

```markdown
- you're the conductor. you do the thinking: the brainstorming, the plan, the architecture, the strategy
- when i name a track or slice, or ask to track the work, load tracks-v2. use its records as the starting point and keep the agreements, decisions and evidence current so another session can continue
- while brainstorming, planning and architecting, also consider dependencies, side effects, what existing code can now do through the change, who and what consumes it, and how the work will be verified
- send exploration, research, knowledge lookups and evidence gathering (code, docs, cli, mcp) to gpt 6.1 terra medium workers (`openai/gpt-6.1-terra#medium`). a worker is a general subagent. ask them for facts, evidence and unknowns, not recommendations, since the design calls are yours and mine
- size the gathering to the job. use one worker for a small, connected investigation; fan out when there are independent areas to investigate, so raw material stays out of your context
- have each gatherer write its findings, evidence sources and unknowns to a single file in the session's working folder, then return a short summary and the file path. pass that path to reviewers and builders when relevant so they can read the evidence directly
- write the plan yourself, since you hold the conversation, using what the workers gathered
- split the job into tasks. give each one to its own gpt 6.1 terra worker (`openai/gpt-6.1-terra#high`). run independent tasks in parallel, hand out dependent ones as their inputs land
- while workers run, don't do their work for them. keep checking their reports, unblocking and nudging them
- before building, have the plan reviewed by two fresh subagents, separately, since different models catch different gaps:
  - fable 5.2 (`claude-agent/fable#medium`)
  - astra 6 (`openai/gpt-6-astra#medium`)
- settle everything they bring up. fix what you can, bring me what needs a decision
- once the plan's reviewed and settled, show it to me and wait for my explicit go before building anything. reading, gathering and writing the plan are fine before that
- after building, have the code reviewed by three fresh general subagents on gpt 6.1 terra xhigh (`openai/gpt-6.1-terra#xhigh`) that didn't build it, separately, so none carries the builder's assumptions. give each a different focus:
  - bugs and regressions: incorrect behavior, broken paths, data loss, lifecycle issues, compatibility and plausible races
  - security: unauthorized access, disclosure and exploitable behavior, including new consequences of existing weaknesses. state the attacker's prerequisites and what you reproduced
  - requirements and usability: the plan and what i approved, including later decisions, nothing missing or extra. exercise the user journeys in the intended environment, check failure recovery and pr claims, and whether tests prove the important promises
- give all three the same approved requirements and evidence paths. keep their reviews independent until they finish, then deduplicate and judge the findings yourself. each owns its focus but should still report a serious finding outside it
- each reviewer runs the feature where possible, locally or in staging, never against prod or shared data, not just reads the diff. list the data and contracts the change reads, writes or exposes, then trace every path, new or existing, that can read, change or expose them, including ones that never call the new code, and check the effect through the feature
- each reviewer follows its focus and says what it ran, what it only read, and what it couldn't check
- major means it breaks existing or planned behavior, leaks data or breaks a policy. everything else is minor. nits are style only, cap them at five
- one post-build review round, since more rounds mostly find polish. builders test every fix; only major findings get one re-check of just the fix. if a major still fails, bring it to me. minor ones get fixed or listed in each pr
- handle anything that doesn't need me. don't merge, deploy or change anything live without asking. stop when you need a decision from me or the work is done

$ARGUMENTS
```

The lead's model isn't in the command: the session's selected model is the conductor. Tested leads are Opus 5.5 medium (`claude-agent/opus#medium`) and GPT-6.1 Sol medium (`openai/gpt-6.1-sol#medium`).

**Siblings.** `/conductor-opus` and `/conductor-terra` are the original one-paragraph prompt ("you're the conductor… only stop when you need a decision from me") with workers on `claude-agent/opus#medium` and `openai/gpt-6.1-terra#high` respectively. They have none of the review, gathering or approval rules.

**Known mechanical issue.** The command body starts with `- `, so pasting it into `opencode run` as a message without `--` makes the CLI treat it as a flag and print help. Typing `/conductor-reviewed` in the TUI is unaffected.

## Mark's preferences

How Mark wants this command, and agents generally, to behave. Each was stated by Mark in the session that built the command (`ses_e28465fb3ffe4j7Jaui0uCmHFh`).

**Role and flow**

- The conductor does the thinking: brainstorming, planning, architecture, strategy. Considering dependencies, side effects and consumers is part of its job while it brainstorms and plans, not only something written into the plan.
- He puts real time into the intent and spec (design) phase and wants to work back and forth with the conductor there; a strong model earns its cost in that phase.
- Nothing is built until he explicitly approves, after design and plan review. Design decisions come to him.
- The conductor writes the plan itself, because it holds the conversation; briefing a worker to write it costs output tokens and loses intent.
- Size gathering to the job: one worker for a small connected investigation; fan out for independent areas. Mark mostly works in large projects. Terra medium is the current gathering model.
- He accepts some loss in handoffs to keep the conductor's context small.

**Review**

- Side effects matter in both planning and review.
- One post-build review round, then fixes, with only major fixes re-checked once. More rounds were mostly polish.
- Two reviewers from different model families at each stage, separately.

**Models and cost**

- Cost matters and is measured with models.dev pricing. Claude-agent sessions are priced as Anthropic API models for comparison.
- Fable leading Opus workers is not worth its cost for this kind of work.

**Cairn**

- `roles` should not load just because a session delegates; it's hidden from auto-invocation and loads when he or `orchestrate` asks. For ad-hoc work, be explicit about subagents and models, like this command.
- He worried Cairn tries too hard to change model behavior when the models already delegate sensibly.

**Writing and communication**

- Commands and prompts in his casual style: lowercase, short bullets, no essays (see [Writing style](#writing-style)).
- Don't put word or length limits in skills or prompts; describe the level of detail by purpose instead.
- When he reads on mobile, avoid wide tables; use bullets and nested bullets.
- Recommendations should be opinionated; when he's thinking aloud, recommend and wait.

## Principles agreed with Mark

Principles that came out of this work and that Mark agreed to. Evidence is in [Evidence](#evidence-every-test-run).

1. **Name the models; don't load a role catalog.** Every lead used the named worker model on every call. Loading `roles` added stages without improving results (Sol, 11-11) or only renamed workers (Astra, 11-13). Hiding `roles` from auto-invocation stopped Astra loading it even with its name in the prompt.
2. **The lead mostly sets cost, not quality.** Leads with Terra workers cost $1–3 and scored within a point of each other; Fable leading Opus workers cost $10–13 for no better result.
3. **Front-loaded design saves Mark's time.** Opus and Fable proposed complete designs in turn 1 and settled in 2–3 turns; Sol and Astra asked one question per turn and took 5–7 until the gathering bullets were added (Sol v3: 3–4 turns).
4. **Plan review is worth more than code review.** The real improvements (merge rules, emptied shared tags, crash risks, weak leak tests) came from Fable and Astra reviewing the plan before code existed.
5. **What reviewers look at matters more than how many reviewers or rounds.** A reviewer finds what its brief points it at: the cross-site write was missed by four in-run model passes whose brief didn't mention it, and found by blind reviewers whose brief did.
6. **Trace from data, including paths that never call the new code.** The defects that recurred (import publishing private bookmarks to a share; renaming onto an empty tag name killing a link) were existing paths interacting with the new feature.
7. **One review round; re-check only major fixes, once.** Re-checks earned their place (fixes introduced regressions several times); further rounds mostly polished messages.
8. **Approval before building is explicit.** Without the bullet, Opus built straight after its plan reviews.
9. **The conductor writes the plan; workers gather.** Claude leads naturally write plans and read code themselves; GPT leads naturally delegate both. The command now standardises: gather by worker, plan by conductor.
10. **Explain why on the rules a model might bend.** Four bullets carry a short reason: facts not recommendations, separate plan reviewers, separate code reviewers, one review round.
11. **Reviewers never touch prod or shared data, and the conductor never merges, deploys or changes anything live without asking.**
12. **Recurring defects belong in the repo's guidance, not in more review.** Not yet acted on; see [Open questions](#open-questions-and-next-steps).

## Principles from references

What outside sources say, and which line of the command each one shaped. Quotes were checked against the pages on 2026-11-13 and 2026-11-14 unless marked as reported by the researcher.

**Anthropic: prompting best practices and model pages**

- "Prefer general instructions over prescriptive steps… Claude's reasoning frequently exceeds what a human would prescribe." → the command states outcomes and rules, not procedures.
- Explain why a constraint exists; "Claude can generalize from the explanation." → the reasons on four bullets.
- Fable 5.2 follows instructions closely, including accumulated cautions. How much it delegates "depends on your harness and tasks": with a minimal subagent tool it "rarely started a subagent"; where prompts invite delegation it "delegated readily". A description of subagent cost and when it's worth it "roughly halved the number of subagents" at high effort. → keep delegation instructions targeted; watch over-delegation from "be aggressive".
- Opus self-verifies well; repeated verification prompts make it over-verify. → one review round.
- Claude Code: "Delegate, don't dictate."

**OpenAI: GPT-6 family guide and latest-model guide**

- "Models have gotten much better at understanding nuance and ambiguity, so overly specific guidance can now hinder results." State the result, constraints and what counts as done. → concise bullets.
- Astra "may delegate less often than desired… Specify when and how much it should use subagents." → the explicit gathering and fan-out bullets.
- Astra "can be more sensitive to instructions contained in skills and other files, such as AGENTS.md." → why hiding `roles` mattered.
- No vendor guidance exists for GPT-6.1 Terra as lead or worker (as of 2026-11-13).

**Anthropic: AI-native SDLC playbook** (review)

- Review is a set of gates across stages: intent, spec and plan are reviewed before code; plan review asks "what the change could break, which step is most risky, and what other options Claude chose not to do", until a stranger could implement from the plan.
- A feedback loop and a fresh-context verifier check behavior against the plan before review.
- PR review runs in passes (bugs; security; compliance with spec, plan and design principles), defines Important versus nit, caps nits at five, skips generated and CI-enforced code. Findings inform; a human approves; the agent that wrote the code can't approve it. → the three passes, severities and nit cap.
- A mistake flagged twice goes into `CLAUDE.md`. → principle 12.

**Anthropic: Skill authoring best practices** (skills are instructions too)

- Concise: "Claude is already very smart"; only add what it doesn't know.
- Match degrees of freedom to fragility: exact rules on the "narrow bridge", general direction in the "open field". → brainstorming is open; model IDs, approval, prod safety and outward actions are exact.
- Avoid unexplained values ("voodoo constants"). → reasons on the rules.
- Test with every model you'll use; use consistent terms; build evaluations on real tasks; iterate with one Claude writing and another using. → the interpretation tests and the conductor runs.

**`writing-for-agents` skill** (local)

- A pointer's wording decides when material is reached; front-load the leading word; one trigger per branch.
- Negation drags the forbidden behavior into context; prompt the positive and pair any guardrail with it.
- Prune no-ops: a line the model already obeys costs load for nothing.

**Independent measurements** (reported by the researcher on 2026-11-13; spot-check before relying on them)

- WorkflowArena (arXiv, 145 long-horizon tasks): Opus 5.5's plans raised weaker executors by about 6.4 points; Astra's plans helped or hurt about equally. Claude in Claude Code delegated rarely but in large groups; Astra and Sol in Codex delegated often in groups of at most four. One run per setup; model confounded with harness.
- Vals AI Vibe Code Bench: lead-plus-subagent teams cost 1.8–5.1× a single agent; one of four comparisons improved significantly; more effort on a single agent often gained more.

## Writing style

The command is written in Mark's style, modeled on a skill he shared as an example of how he likes agent instructions to read (a PR-writing skill, shown as a screenshot):

```markdown
---
name: Writing a PR body/title
description: Use when writing or editing a pull request title or body.
---

dont write essays, dont include that you ran tests. rather, write a concise body. focus on mermaid codeblock diagrams, code samples/snippets (this can be internals, or even sample usage). use bullet points for the text you do write. 'validation/i ran tests' is not needed
for visual changes (either directly or indirectly) show a table of before and after with uploaded images/videos.
for benchmarks, always show tables of before/after (baseline from target branch, candidate from the PR)
dont at intermidate PR details - e.g. if we reduced PR size from +6k lines to +1k lines, dont even mention it lol. if we refactored from one commit to another it doesnt matter. only the final aggregate squash merge commit is what matters for commentary
for truely impressive, difficult, or high risk/wide scoped changes you might write the body like a technical blog (again with context, storytelling, code samples/before/after etc diagrams, images whatever.
feel free to use code refs
```

What to take from it:

- lowercase, plain, direct; bullets; no ceremony
- say what to do and what to leave out, with a short reason when it isn't obvious
- concrete nouns over abstractions

Keep new bullets in this voice. When a bullet grows, check each clause earns its place (see the interpretation tests below) rather than adding more qualifiers.

## Evidence: every test run

All costs use models.dev prices; claude-agent `fable` is priced as `anthropic/claude-fable-5-2` ($8/$40 per million in/out, $0.20 cache read, $10 cache write) and `opus` as `claude-opus-5-5` ($4/$20, $0.20, $5). Terra is $1/$5, Sol $2/$10, Astra $10/$50. One run per setup throughout; treat small score differences as noise.

### 1. Conductor comparison on a small slice (2026-11-11)

tracks-sim-app `report-select` slice, intent given, plain conductor prompt. Full write-up: Cairn `docs/orchestrate/research/2026-11-11-lean-delivery.md`.

- Fable→Opus $6.36; Opus→Opus $3.08; Fable→Terra $2.48; Opus→Terra $1.67; Sol→Terra with `roles` $0.96; Sol→Terra with skills blocked $0.76.
- Every lead decided the open design questions alone, two different ways across runs.
- Reviewer grid: Sol high found the most serious race bugs at about half Opus medium's cost; one combined reviewer was enough.

### 2. Activity log with undo, intent given (2026-11-13)

`scratch/2026-11/conductor-compare-2/`. Blind reviews in `activity-review/` (Sol high) and `activity-review-opus/` (Opus high).

| Run | Cost | Sol high | Opus high |
|---|---|---|---|
| Fable→Opus | $10.89 | 7 | 8.5 |
| Opus→Terra high | $2.98 | 8 | 7 |
| Astra→Terra high, loaded `roles` | $2.06 | 8 | 6 |
| Sol→Terra high | $1.60 | 8.5 | 7 |
| Astra→Terra high, `roles` hidden | $2.01 | 9 | 8 |

- The first Astra branch made a one-bookmark import into 50,000 take 15.8 s (every import snapshotted the whole collection).
- The two reviewers disagreed on ranking: Opus high focused on undo refusing when safe (id reuse); Sol high on undo touching the wrong data. Each may favor its own family's code.

### 3. Share bookmarks, designed together (2026-11-14)

`scratch/2026-11/conductor-compare-3/`, runs `fable-opus`, `opus-terra`, `astra-terra`, `sol-terra`. This session played Mark from a private answer key; plan → compact → build.

| Run | Design / build | Total | Sol high | Opus high | Design turns |
|---|---|---|---|---|---|
| Fable→Opus | $2.85 / $10.25 | $13.10 | 8 | 8 | 2 + plan |
| Opus→Terra | $0.82 / $0.84 | $1.65 | 7.5 | 7 | 2 + plan |
| Astra→Terra | $1.46 / $1.83 | $3.29 | 8 | 8 | 6 + plan |
| Sol→Terra | $0.39 / $0.61 | $1.00 | 7 | 8 | 6 + plan |

- Fable and Opus raised network exposure and token leaks unprompted in turn 1; Astra and Sol reached the network question on turn 4.
- Defects: Sol's new route accepted cross-site form posts; Opus's share page had no mobile viewport and a merge rule that published private bookmarks; emptied shared tags became unmanageable on two branches.
- Claude leads read code and wrote plans themselves; GPT leads delegated both.

### 4. `/conductor-reviewed` v1 (2026-11-14)

Plan review by Fable and Astra; code review by Sol high and Opus high; no approval bullet yet.

| Run | Total | Sol high | Opus high |
|---|---|---|---|
| Opus | $8.22 | 7.5 | 8 |
| Sol | $4.65 | 7 | 7.5 |

- Opus built without waiting for approval.
- Review cost more than building (plan review ~$1.8–2.3, code review ~$1.5–2.4).
- Sol's cross-site write recurred, missed by both plan reviewers and both code reviewers.

### 5. `/conductor-reviewed` v2 (2026-11-14)

Added approval, "also consider" planning bullet, review passes with severities, one round.

| Run | Total | Sol high | Opus high |
|---|---|---|---|
| Opus | $7.46 | 7 | 7 |
| Sol | $5.88 | 8.5 | 7.5 |

- Both waited for approval and raised verification during design.
- Sol's new write routes rejected cross-site requests for the first time.
- Opus's review caught a cross-site merge, share-id reuse and a main-port crash, but missed that the existing import route could still tag a private bookmark into a share, and its PR description said import couldn't reveal anything.
- Renaming onto an old empty tag name still killed links on both branches.

### 6. `/conductor-reviewed` v3 (2026-11-14, stopped)

The current command minus nothing. Design phase completed for both leads; stopped during build because compaction loses the command's exact wording (see below).

- Opus fanned out 3 then 2 Terra-medium gatherers; Sol fanned out 2. Sol wrote its own plan for the first time (22 KB). Sol settled the design in 3–4 turns.
- Plan reviews caught: share port reachable on the LAN, trailing-slash links, stale shares after downgrade, stale counts, missing tests, and the `GET //` crash (Opus); empty shared tags undiscoverable, API error contract, test scratch paths (Sol).
- Compaction summaries kept the model IDs, the review round rules and the approval gate, but flattened the trace to "trace all data consumers", dropped "never against prod or shared data" to "locally", and dropped the reasons.

### Instruction interpretation results (2026-11-14)

- The trace bullet: Opus, Sol and Terra (high, then medium) each found import and rename/merge without being pointed at them, and in a multi-repo queue example traced consumers, backfill, replays and dashboards. All suggested anchoring the trace to data, bounding it to paths that touch that data, and reporting coverage.
- The full command: all three read every bullet as intended; their fixes became the 12 edits of 2026-11-14 (sit idle, approval timing and boundary, fan-out bound, round scope, failed re-check, nit and major definitions, staging only, outward actions).

## How the command evolved

All on 2026-11-13 and 2026-11-14.

1. `/conductor` → `/conductor-opus` and `/conductor-terra`: the original paragraph with the worker model named.
2. `/conductor-reviewed` created: bullets; plan review by Fable and Astra; code review by Sol high and Opus high.
3. Approval before building (Opus built without it).
4. "also consider dependencies, who and what consumes the change, and how it will be verified"; "brainstorming" added to the conductor's role.
5. Review passes (bugs, security, plan match), severity definition with nit cap, one review round.
6. Gathering to Terra medium, facts not recommendations; fan out aggressively; conductor writes the plan. A production-only Sol line was added then removed at Mark's request.
7. Side effects and "what existing code can now do through the change" in planning; the data-and-path trace in review, wording refined through two rounds of interpretation tests; web-specific examples ("routes, ui, imports") removed because Mark's work isn't web apps.
8. Twelve edits from the full-command interpretation test (see above).
9. Reasons added to four bullets, following Anthropic's "explain why".
10. Gathering-size comparisons favored the simpler sizing wording over coverage-first wording; neither established protection against context overflow. The command now sizes gathering to independent areas.
11. On 2026-11-15, added one tracks-v2 integration bullet. The same conductor serves tracked and untracked work; v2 keeps format-1 records and bundles its own scripts and assets. Personal OpenCode selects it through Cairn's `skills.enabled`; a skill permission denies `tracks`.

## Testing method

Two kinds of test: **end-to-end runs** (does the command produce good work at a sensible cost?) and **interpretation tests** (does each model read the words as meant? see the next section).

### End-to-end runs

The harness lives in `~/workspace/scratch/2026-11/conductor-compare-3/`.

- **Target:** tracks-sim-app (about 5.7k lines, Node and Chromium suites, schema-compatibility rule in `AGENTS.md`), fresh clone per run on its own branch from `main` at `ec8c21e`, with the push URL set to `no-push`. Baseline: 113 Node and 43 Chromium tests.
- **Feature:** "share bookmarks", opened as a rough idea in Mark's voice (`opening.template.md`) so the design phase matters. Any feature with real design choices and security edges works; the feature must be held constant across runs being compared.
- **Driver:** `driver.mjs` (`setup [run…]`, `say <run> <message-file>`, `compact <run>`). Each run keeps its own `state.json` with its session ID. It calls `opencode run --format json --auto --model <lead> [--session <id>] -- <message>` against the shared server and writes each reply next to its message under `turns/`.
- **Playing Mark:** this session answers each conductor from a private `answer-key.md` (outside every run's allowed folder), in Mark's voice, giving every conductor the same answers and only answering what's asked. Every run gets the same question that ends design ("anything else we need to figure out or are we good?") and the same build message ("plan looks good. go build it from <path>").
- **Protocol:** design turns → ask for `plan.md` (and, for `/conductor-reviewed`, its review) → `compact` and confirm the compaction completed → "go build it" → finished branch.
- **Isolation:** every prompt bans reading other runs, the main checkout, other sessions and the session database, Cairn's source, tracks records and GitHub. Check tool inputs for banned paths afterwards; ban lists copied into worker briefs are false positives.
- **Quality:** rerun both suites with `TMPDIR=/tmp` (long scratch paths break Chromium's socket path). Then blind review: `blind-review.mjs map <file> <runs…>` assigns random letters; `run <folder> <model> <map-file>` copies each branch (no remote) with `requirements.md` and a redacted PR description into `scratch/2026-11/<folder>/<letter>/` and runs a fresh reviewer per branch. Use **both** Sol high and Opus high: they found different defects and may favor their own family. The reviewer brief lists what to check (data exposure, revocation, live updates, rename and merge, escaping, token leaks, cross-site writes, schema compatibility, UI, mutation-testing the new tests).
- **Redaction:** PR descriptions and plans can name models or run folders; give reviewers `requirements.md` (the owner's decisions, written from the answer key) and a `pr-description.blind.md` with names removed, never the plans.
- **Cost:** `agent-sessions` skill's `scripts/opencode-session-cost.py` with `--models-file conductor-compare-2/models-mapped.json` (models.dev snapshot plus a `claude-agent` provider; rebuild with `conductor-compare-2/catalog.mjs`). `phase-cost.mjs` splits a run into design and build at the compaction point and lists design-phase workers.
- **Delegation metrics:** `conductor-compare-2/delegation-metrics.mjs` counts fresh workers, resumes, the lead's own reads and brief lengths.
- **Cleanup:** archive every test session and its descendants (`opencode api patch /api/session/<id> -d '{"archived":true}'`), walking `parent_id` recursively. Interrupt with `opencode api post /api/session/<id>/interrupt --data '{}'`; repeat until `opencode api get /api/session/active` shows none, since an interrupted child can wake its parent.

### Pitfalls met

- Parallel `say` processes sharing one manifest overwrote each other's session IDs and silently started new sessions. Per-run state files fixed it.
- A message starting with `-` is parsed as a flag; pass `--` before it.
- Waiting on several runs in one shell call hides a run that finished early; send each run's turns separately.
- A conductor that uses the interactive question tool can't be answered in `opencode run`; it falls back to writing questions with defaults.
- Reviewers can't check files you don't give them (they reported "security note missing" when PR descriptions weren't copied in).

## Instruction interpretation method

Cheap and fast; run it after any wording change, before an end-to-end run.

1. Spawn fresh subagents, one per model that will read the instruction: the conductor models (Opus medium, Sol medium) and the worker model (Terra), at the effort they'll run at. No tools, no files: "answer from the text below only".
2. Give the exact text, framed as instructions from the lead (for review bullets) or the full command with `$ARGUMENTS` (for the whole thing).
3. Ask:
   1. what each line asks, in their own words, with one example of following it and one of getting it wrong
   2. what they'd do step by step, and what they'd treat as out of scope
   3. apply it to a concrete example **without hinting at the answer** (for the trace: the share-a-tag feature with the app's existing routes listed; does it name import and rename/merge?) and to a second example from a different domain (a multi-repo queue schema change with consumers, a backfill and dashboards)
   4. conflicts between bullets (seed likely ones)
   5. ambiguities, with better wording only where needed, in the same style
4. Compare: where all models read it as intended, leave it. Where they converge on a fix, take it, but keep the user's intent: models soften strong wording ("relevant", "where practical", "materially", "where it helps"); reject softeners that would give a reviewer a reason to skip things.

The full-command prompt used on 2026-11-14 is saved in the building session's folder as `command-interpretation-prompt.md` (`~/.local/state/cairn/sessions/2026-11/ses_e28465fb3ffe4j7Jaui0uCmHFh/`).

## Current reviewer experiment

After v5, Mark first replaced Opus high with Terra xhigh for code review. Following the broad Terra blind review, he approved three independent Terra xhigh reviewers with separate focuses: bugs and regressions, security, and requirements and usability. Fable medium and Astra medium remain the plan reviewers. This supersedes the earlier preference for two model families at both stages.

The single broad Terra reviewer cost $0.49 across both completed v5 branches and reproduced the cross-site disclosure on the Sol-led branch. The focused trio is now being tested against those same branches. All focused reviewers receive the same branch-specific approved decisions, including later clarifications omitted from the earlier blind brief. This is fixed-code reviewer testing, not a full delivery run; the corrected inputs also mean it is not a perfectly isolated comparison of specialization alone. Historical model references describe the reviewers used at the time.

## Open questions and next steps

1. **Compaction loses the command's wording.** Summaries keep decisions and drop exact rules and reasons; the review trace was flattened to "trace all data consumers". Options: paste the command (at least its post-build bullets) into the "go build it" message; or an OpenCode plugin that re-adds the session's original command after each compaction (hook availability not yet checked). This matters most for long gathering phases that compact mid-design.
2. **Rerun v3 with the command re-included after compaction**, then blind-review with both reviewers and compare with v2. The v3 clones (`opus-reviewed-3`, `sol-reviewed-3`) hold stopped, partial builds; start fresh ones.
3. **Repeat runs.** Everything so far is one run per setup; rankings in the middle are within noise. Two or three runs of the final command per lead would show its real spread.
4. **Is the second reviewer at each stage worth its cost?** Each reviewer caught things the other missed, but that was before fixed passes and the trace. Test one reviewer per stage (for example Fable for the plan, Sol high for code) against two.
5. **Recurring defects into the target repo's guidance.** Cross-site checks on write routes, wrapping long URLs on phone layouts, and renaming onto an empty tag name recurred across runs. Per the playbook, put them in tracks-sim-app's `AGENTS.md` (issue #49 covers cross-site writes) so builders apply them.
6. **Tracks integration.** Compare creating a slice, resuming approved work and recording review/closeout with v1 and v2, plus an untracked request. Static checks passed for the draft; paid behavioral runs await approval.
7. **Luna high for gathering** at work; swap the model in the gathering bullet.
8. **PR claims.** Opus v2's PR stated something false as reassurance. Consider a line asking reviewers to check the PR description's claims against the code.
9. **Commit.** mfz-home: the three conductor commands, the profile change and this document. Cairn: the `roles` change (`skills/roles/SKILL.md`, `AUTHORING.md`, `src/opencode/skills.test.ts`).

## References

- Anthropic, Claude prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic, Prompting Fable 5.2: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2
- Anthropic, Prompting Opus 5.5: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- Anthropic, Skill authoring best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Anthropic, The AI-native SDLC playbook: https://claude.com/resources/articles/the-ai-native-sdlc-playbook
- Claude Code, How Claude Code works: https://code.claude.com/docs/en/how-claude-code-works ; subagents: https://code.claude.com/docs/en/sub-agents
- OpenAI, Practical guide to building with GPT-6: https://openai.com/index/practical-guide-building-gpt-6/
- OpenAI, Latest model guide: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI, Rethinking skills and prompts for GPT-6 Astra: https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra
- OpenAI, Responses multi-agent guide: https://developers.openai.com/api/docs/guides/responses-multi-agent
- Local skill: `writing-for-agents` (in the dev-personal profile's skills)
- Research notes: `model-delegation-research.md` in the building session's folder (vendor and independent evidence on delegation, with labels for vendor statement, measurement and inference); Cairn `docs/orchestrate/research/2026-11-11-lean-delivery.md` (the 11-11 experiments and vendor prompting guidance)

## Artifacts and locations

- Command: `mfz-home/opencode/commands/conductor-reviewed.md` (siblings `conductor-opus.md`, `conductor-terra.md`); profile `profiles/dev-personal/profile.yml`.
- Building session: `ses_e28465fb3ffe4j7Jaui0uCmHFh`, folder `~/.local/state/cairn/sessions/2026-11/ses_e28465fb3ffe4j7Jaui0uCmHFh/`.
- Harness and runs: `~/workspace/scratch/2026-11/conductor-compare-2/` (activity log, catalog, cost scripts) and `~/workspace/scratch/2026-11/conductor-compare-3/` (share bookmarks: `driver.mjs`, `answer-key.md`, `opening.template.md`, `requirements.md`, `blind-review.mjs`, `phase-cost.mjs`, `blind-map*.json`, `cost/`, one folder per run with `turns/`, `plan.md`, `pr-description.md`).
- Blind reviews: `~/workspace/scratch/2026-11/activity-review/`, `activity-review-opus/`, `share-review-sol/`, `share-review-opus/`, `share-review2-*`, `share-review3-*`; each letter folder has `report.md`.
- Pricing snapshot: `conductor-compare-2/models-dev.json` and `models-mapped.json`.
- All test sessions are archived, not deleted; their transcripts are in the OpenCode session database.
