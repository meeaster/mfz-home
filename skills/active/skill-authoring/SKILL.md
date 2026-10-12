---
name: skill-authoring
description: Design, create, revise, review, or evaluate an agent skill or explicit command from intended behavior. Use when the user asks for it or a workflow requires it.
metadata:
  opencode/autoinvoke: false
argument-hint: "What skill or command are you authoring, reviewing, or evaluating?"
---

# Skill Authoring

Turn intended agent behavior into economical instructions, and keep one record of why the skill is the way it is so the next author doesn't have to reconstruct it.

## Before changing anything

- Load `writing-for-agents` for writing and packaging guidance.
- Also load `skill-creator` when it's available (in Claude Code it may be listed as `anthropic-skills:skill-creator`) and follow its draft, test, and iterate loop. In OpenCode, read [references/skill-creator-opencode.md](references/skill-creator-opencode.md) first; `skill-creator` is written for Claude Code. This skill adds the authoring record, local writing preferences, and cross-harness mechanics; where the two differ on where files go or when tests run, this skill wins.
- Read the target's runtime files and its authoring record, if one exists. The record holds accepted intent; if a requested change conflicts with it, raise the conflict before editing.
- For review, diagnosis, or evaluation without an edit request, return findings only.
- Ask about choices that change what the skill does or who it acts for. State reversible assumptions and proceed.

## The authoring record

Each skill keeps one record, `AUTHORING.md`, in its own directory beside `SKILL.md`, so the record travels with the skill. Never link to it from `SKILL.md` or its references; harnesses load only `SKILL.md`, so the record stays out of runtime context unless something points the agent to it. Don't add a record to a vendored skill, since updates overwrite it. For a single-file artifact such as a command, use the location the user or repository guidance names, keeping it outside command and agent discovery paths.

The record has exactly these sections, in this order, each only where there is something real to say. Don't add others, such as open questions or assumptions to confirm; raise those with the human in your report instead.

- **Intent**: what the skill is for, what it isn't for, and what success looks like.
- **Scenarios**: the situations the skill must support, including plausible wrong behavior to rule out. These describe intent and can be broader than anything a single test can run.
- **Decisions**: choices whose reason a future author couldn't recover from `SKILL.md` or from the authoring guidance used to write it (this skill, `skill-creator`, `writing-for-agents`, harness docs). Give the reason, and mark which ones the human set. Don't restate rules the skill already states, and don't record choices any author following that guidance would make, such as a one-line description for a user-invoked skill. Good entries: a human preference with its motivation, an interpretation of an ambiguous requirement, and a rule added because a test failed without it.
- **Sources**: upstream URLs or repositories, adopted revision, and local departures.

Extract content from the conversation and the human's stated direction; don't invent requirements to fill a section. Update the record in the same change as the skill. Git holds routine history, so don't log every edit. Keep the record short enough to read in full before each revision.

Runnable tests live separately in `evals/evals.json` beside `SKILL.md`, in `skill-creator`'s format, and only once the human has approved them. Each eval is a concrete, scoped-down proxy for a scenario; name the scenario it approximates in the eval's `expected_output`. A scenario with no eval is fine. `evals.json` is the only test artifact in the skill: runners, fixtures, test repositories, and outputs belong in a temporary directory, so they don't ship with it.

When revising a skill that still has an older multi-file record, merge it into one record as part of that change, pruning anything Git or the skill itself already says.

## Keep it portable

Skills are meant to work on any machine and in any supported harness. Everything in the skill directory, including `AUTHORING.md` and `evals.json`, follows this:

- No absolute paths, home directories, usernames, or this machine's workspace layout. Refer to bundled files by paths relative to the skill directory, and to the user's project by paths relative to its root.
- No dependence on private tools, local services, or other skills that aren't declared as requirements.
- Where a skill needs something environment-specific, such as a configurable location, say what it needs and let the user or repository guidance supply it.
- A skill is environment-specific only when the human says so; then state that boundary in `AUTHORING.md`.

## Writing the skill

Writing for Agents covers most of this. Local preferences:

- Use prose for context and rationale, bullets for independent rules, tables for comparisons, and numbered steps only where order matters.
- Preserve concrete meaning when shortening; don't compress a criterion into a keyword that hides it.
- Treat claims about prompting mechanics (negation, capitals, step hiding) as model-dependent, not settled.
- For each line, ask whether the agent would get the task wrong without it. If not, cut it; don't add handling for edge cases nobody raised.
- Add scripts, references, or assets only when execution needs them, and say when to read each.

### Harness mechanics

- **Claude Code**: `disable-model-invocation: true` hides a skill from the model and blocks every model-initiated load, including one another skill or workflow asks for, so don't set it on a skill that workflows load. `user-invocable: false` hides it from the `/` menu.
- **OpenCode**: `metadata: { opencode/autoinvoke: false }` hides a skill from the model and wins over `disable-model-invocation`. Skill IDs come from the path, not `name`. OpenCode also discovers `~/.claude/skills` and `~/.agents/skills`; use `skill` permission rules to hide one there.
- **Codex**: `agents/openai.yaml` `policy.allow_implicit_invocation: false` blocks implicit use.
- **OpenCode commands**: when a command is the target or a genuine candidate, read [references/opencode-commands.md](references/opencode-commands.md).
- Verify these against current docs before relying on them in a new way.

## Checking the change

Static checks are free: structure, links, frontmatter, and comparing a rewrite with the original by meaning. Live runs cost money, so they need the human's go-ahead.

- Don't run evals or test sessions on your own initiative. Propose them instead: the cases, which scenario each approximates, the models and harness to run them on, and the rough number of runs.
- Run them only when the human asks, on the models they choose. They may want several models compared; a skill meant for cheaper models should be tested on one.
- Run approved evals through `skill-creator`'s full loop when it's available, including its baseline: no skill for a new skill, the previous version for a revision. The baseline shows whether the skill changes anything. Without `skill-creator`, run each case and its baseline in fresh sessions and read the traces, not just the outputs. Include one adjacent prompt that shouldn't trigger the skill.
- Put runners, test repositories, and outputs in one directory under the system's temporary location, outside the repository, and delete it when done. Keep only the static review page, outside the repository, and give its path in your report.
- Wait for every run you start and read its results before finishing. Don't leave runs going in the background.
- When a run exposes a failure, fix the skill, rerun that case, and record the rule and its reason under Decisions.
- Structure, readability, and behavior are separate questions; evidence for one doesn't establish the others. Report what was run, on which models and harness, and what wasn't. Test sessions inherit the human's global instructions; say so when those could have helped the baseline.

## Finishing

Report changed files, the reasoning behind behavior changes, checks run, and open uncertainty. When commits are authorized, commit the skill and its record together.
