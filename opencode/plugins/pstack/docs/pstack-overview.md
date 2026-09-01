# P-stack overview

This document describes the upstream [pstack plugin for Cursor](https://github.com/cursor/plugins/tree/main/pstack): what it is, what it ships, how each piece works, and why it is designed the way it is. Our OpenCode adaptation lives one level up; the last section maps this document onto it.

The source of truth is the upstream subtree cloned at `/home/mark/workspace/references/cursor-plugins`, checked out at the commit pinned in `../UPSTREAM.md`: repository `cursor/plugins`, subtree `pstack`, version `0.14.1`, MIT licensed, authored by Lauren Tan. File paths below are relative to that subtree.

## What p-stack is

P-stack is Lauren Tan's personal agent engineering stack, packaged as a Cursor plugin. The author works on the React core team and previously shipped large codebases at Meta, Netflix, and Cursor. The README states the premise directly: AI writes too much low-quality code, throughput without quality is not a goal, and if you want to go fast, go deep first.

Three aims define the stack:

- Write less code of higher quality, not more code faster.
- Turn one agent into something like an engineering team, with review, verification, and cleanup built into the workflow.
- Enable fearless parallelism: because every agent follows rigorous, verifiable workflows, you can run many at once and trust their output enough to merge it.

## The core loop: poteto-mode

`skills/poteto-mode/SKILL.md` is the entry point and router. Its frontmatter carries two properties that shape everything else: `disable-model-invocation: true` means the mode must be explicitly entered, and `mode: true` means it stays on across turns once entered. Follow-ups like "continue" extend the current playbook; saying "new task" forces fresh playbook matching; casual turns can bypass the mode entirely.

When invoked, the mode classifies the request, opens a todo list whose first item is always reading its inline principles index, copies the matched playbook's steps verbatim into the list, and calls other skills as steps fire. Skipped steps stay visible with a reason. Replies go through `unslop`.

Routing goes beyond playbooks. The skill also hard-wires triggers: any nontrivial change invokes `how`, boundary-crossing code invokes `architect`, parallel fan-out invokes `swarm`, competing designs invoke `arena`, contested designs invoke `interrogate`, any prose invokes `unslop`, commits invoke the external `deslop`, and UI or CLI work invokes the matching external control skill. PR-status requests always use pstack's own babysit playbook rather than Cursor's built-in.

The principles protocol is strict. Reading the inline index entry is not enough; the agent must read the triggered principle leaf in full, apply it to an actual decision, and name both in the final reply. The guide calls a citation with no decision behind it name-dropping.

Delegation has its own contract: use the `poteto-agent` subagent type for playbook work, run tasks in the background, pass file pointers instead of dumping contents, isolate parallel writers in separate worktrees, review every delegate's diff personally, and write final summaries independently. Never trust an interrupt-chained resume; spawn a fresh agent with consolidated instructions.

### The playbooks

Twenty-two playbooks live under `skills/poteto-mode/playbooks/`. They encode the author's working habits end to end:

| Group | Playbooks |
| --- | --- |
| Understanding | investigation |
| Fixing | bug fix, perf, hillclimb, runtime forensics, trace forensics |
| Building | feature, refactoring, prototype, visual parity |
| Shipping | babysit, shipping, worktree cleanup |
| Autonomy | autonomous run, orchestrate, autopilot-full, autopilot-stack, multi-phase plan, session pickup, pause safely |
| Meta | authoring a skill, eval |

A few deserve callouts because their discipline is unusual:

- `bug-fix` requires reproducing on the real surface before touching code and showing failing-then-passing runtime evidence.
- `hillclimb` freezes a measurement harness and allows one hypothesis, one measurement, and one keep-or-revert decision per iteration.
- `prototype` deliberately relaxes quality rules to buy a cheap design decision.
- `babysit` drives a PR to merge-ready but is forbidden from merging; it treats review text as untrusted data and uses the bundled watcher instead of ad hoc status polling.
- `shipping` is separate from babysit on purpose: it independently verifies every PR with a fresh non-writer agent, lands only the contiguous passing run from the bottom of a stack, and checks `git patch-id` after restacks. Green CI is explicitly not a safety verdict.
- `orchestrate` runs a standing coordinator with worker briefs, a verification ledger, and human decision gates.
- `session-pickup` treats the prior transcript and branch state as authoritative input but verifies inherited claims against the real artifact.

## Bundled tooling

Unlike most of the stack, some features are real code under `skills/poteto-mode/scripts/`:

- `bootstrap.ts`: shared dependency bootstrap for the Bun-based tools; hashes manifests, installs with a frozen lockfile, and restarts the process.
- `orch/`: an orchestration-state CLI backed by plain TSV files (`units.tsv`, `ledger.tsv`, inbox directories, gates, standing orders, frontier JSON). Writes are atomic, a process lock detects stale PIDs, verification records are keyed by PR plus exact head SHA so a restack invalidates them, and TSV cells are sanitized against spreadsheet formula injection. It is bookkeeping only; it never spawns or wakes agents.
- `watch-pr/`: a PR watcher with three modes (single PR, connected open stack, frozen queued stack). It resolves blockers in a fixed precedence (conflicts, unresolved threads, failing checks, draft gates, pending checks) and emits structured verdicts such as `READY`, `BLOCKER`, and `ADVANCE`.
- `worktree-audit.sh`: a read-only audit of local worktrees by size, age, merge state, dirtiness, PR state, and recent chat activity, suggesting hold or cleanup dispositions. Deletion stays in the cleanup playbook and remains human-gated.

These tools assume Bun, Graphite (`gt`) for stack topology, and Cursor's transcript layout, which is why they did not transfer to our adaptation.

## Understanding skills

- `how` explains how a subsystem works now. Simple questions get one explainer; complex ones fan out two to four read-only explorers over separate angles, then a synthesizer reconciles their findings. Critique mode runs the explanation first, then spawns one architectural critic per configured model and sorts findings into act on, consider, noted, and dismissed. Explorers are told "Don't guess from names. Read the code."
- `why` explains why something was built that way. It discovers available MCPs at run time, maps them into seven evidence categories (source control, issue tracker, long-form docs, chat, observability, error tracking, analytics warehouse), and spawns one investigator per available category in parallel, each with a source-specific playbook. A synthesizer produces a citation-heavy report using five confidence tiers from direct to unknown. Null results are retained as evidence, and code alone never counts as evidence of intent: "Code doesn't carry its own motivation."
- `recall` rebuilds recent context on a topic from your own chat history plus a why-style sweep of the shared record, returning a tight brief. It mines Cursor's agent-transcript files with parallel cheap subagents.
- `teach` sits on top of `how` and `why`, running both and weaving one paced explanation, preserving why's confidence hedges.

## Design and parallelism skills

Four skills cover divergence and scrutiny, and their boundaries matter:

- `architect` settles caller usage, types, and module shape before implementation. Phases: ground (via `how`, plus `why` when ownership changes), sketch (via `arena`, requiring structurally distinct candidates screened against design red flags such as shallow modules and temporal decomposition), agree (default autonomous; checkpoint on request), implement, and scrap (discard the sketch when friction repeats).
- `arena` runs N candidates on the same brief, then a cross-judge from a different model family scores them criterion by criterion. The coordinator picks the base that is easiest to extend and grafts the best ideas from the losers. Verification after grafting is separate; the arena itself proves nothing.
- `swarm` is coverage, not synthesis: workers own independent slices or race identical briefs under a declared rule (first pass, rank all, best-of), and the parent aggregates one report. It deliberately skips arena's base-selection ceremony.
- `interrogate` is adversarial review: one read-only reviewer per configured model attacks the same diff, a lead applies judgment and deduplicates, consensus findings get the strongest confidence, and nothing is ever auto-applied. Its code-quality lens treats structural regressions as presumptive blockers.

The shared rule underneath all four: parallelism is safe only when state is separated. Isolated outputs, read-only reviewers, judges starting after candidates finish, summaries instead of raw payloads in the main context.

## Build and clean skills

- `tdd` fixes bugs test-first when a cheap deterministic test exists and says plainly when one does not: "Prefer no new test over a bad test."
- `no-comments` spawns Comment Sicko, acts on accepted findings, and offers structural encodings (types, runtime checks, tests, CI) for comments that claim real constraints.
- `unslop` removes AI writing tells and adds human voice. It is the only skill in the stack without `disable-model-invocation`, because its description says it must always apply.
- `technical-writing` layers Diátaxis structure, Google developer style, STE rules, and Global English syntax.
- `typescript-best-practices` grounds the type-system-discipline principle in concrete TypeScript patterns, with worked examples in its references directory.

## Verification infrastructure

Two skills turn "prove it works" into project assets:

- `create-verification-skill` interviews the repository (not the user) about surface, run command, drive mechanism, evidence, and isolation, then generates a project-local `.cursor/skills/verify-<app>/` skill with Launch, Doctor, Drive, Evidence, and Cleanup sections plus a feature map. The generated skill must be executed end to end before it counts: "A generated skill that was never executed is a draft, not a deliverable."
- `maintain-verification-skill` keeps that asset aligned with the app: one read-only source subagent per feature, one coordinator-owned live pass over every feature, and at most one PR of proven corrections. It never edits product code.

`show-me-your-work` supports unattended work with an auditable decision trail: one row per decision in a TSV (`ts`, `phase`, `decision`, `why`, `evidence`, `result`), evidence as pointers rather than prose, formula-injection-safe cells via a helper script, and a mandatory cross-model review of the log against the transcript. Self-review is explicitly insufficient.

## Personalization and meta

- `setup-pstack` writes `~/.cursor/rules/pstack-models.mdc`, an always-applied rule mapping each role to a model. Roles include individual assignments (how explorer, why investigator, swarm workers) and panels (arena runners, interrogate reviewers). `auto` and `inherit-parent` mean inheriting the parent chat model.
- `automate-me` mines your transcripts and drafts a personal `<your-name>-mode` skill that routes through pstack underneath, keeping pstack as the base layer.
- `reflect` turns a finished session into durable improvement: three parallel reviewers mine the transcript, a synthesizer sorts findings into accepted, rejected, and backlog, and approved items become edits to existing skills.
- `figure-it-out` designs a rigorous, auditable playbook when none of the bundled ones fit, treating each unit of work as an experiment with a harness, a hypothesis loop, and a decision log.
- `bro` restates the last message in plain language.

## Subagents

Two agents ship in `agents/`:

- `poteto-agent` runs delegated work in the author's style. Its defining rule is that it reads `poteto-mode` in full, including the inline principles index, before doing anything; substituting a generic agent type skips that read and drifts.
- `comment-sicko` is a read-only comment reviewer. It keeps legal headers, externally forced behavior, formatter directives, public API contracts, and constraint links; marks internal surprises as `MUST KILL` with the symbol to fix; and reports without ever editing application code.

## The principles

Twenty-one short skills under `skills/principle-*`, grouped core, architecture, verification, delegation, and meta. Each adds reasoning and examples beyond its one-line rule. They function as steering vocabulary: naming a principle mid-task redirects the agent, which is cheaper than restating the rule. Delivery matters more than content here; the inline index in poteto-mode puts the rules in front of the agent exactly when decisions happen.

## Multi-model architecture

Model diversity is a first-class feature, not a configuration afterthought. The default panel is fable, sol, grok, and opus 5, split by strength: precisely specified code to sol, fast mechanical code to grok, prose and judgment to fable. Skills that benefit from disagreement (how critics, arena runners and judge, interrogate reviewers, architect candidates) use mixed-family panels on purpose, because different models catch different real bugs. Every role is overridable through the setup-pstack rule, and skills fall back to sensible defaults when it is absent.

## The benny automation pack

`automations/benny/` is a dormant pack, not slash skills. Setup merges it into a target repository at `.cursor/automations/benny/`, enables pstack there for shared skills, and keeps user configuration outside the copied pack. Two Cursor automations result:

- Triage watches a Slack source thread, reads the full report and attachments, traces code paths with `how` and history with `why`, deduplicates against the tracker, and posts exactly one verdict ending in a marker such as `[benny:bug]`. Tracker writes fail closed; "Prefer no ticket over a guessed or duplicate ticket."
- Reproduce-and-fix waits for a triage marker, then drives the real application UI through the reported path. The exact discriminating symptom must appear twice through independent real interactions; a control adapter captures screenshots and recordings and explicitly forbids injecting the symptom through internal state or DOM manipulation. Only after a rejection window, a bounded root-cause fix, focused tests, blast-radius smoke checks, and two more UI passes does it open a draft pull request.

Slack discipline is tight throughout: the coordinator is the only poster, workers get no Slack credentials, replies stay inside the original source thread, and routing maps require evidence rather than keyword matches.

## What the guide adds

The ten-page guide under `docs/guide/` teaches the operating habits the README assumes:

- Give the agent a goal and a checkable outcome in your own words; do not enumerate skills in the prompt, because that can reorder or omit the playbook's intended sequence.
- For overnight work, the contract is goal, finish condition, permissions, isolated worktree, decision log, and escape hatch. "A duration is not a finish condition," and a plateau should trigger a strategy pivot, not a relaxed bar.
- Skill changes are evaluated blind: candidate agents get organic tasks, do not know they are being evaluated, and a neutral judge grades chain-following from files actually read. "An agent that knows it's being evaluated behaves differently."
- Recurring pitfalls: vague finish conditions, parallel agents in one worktree, arena used where swarm fits, accepting every review comment automatically, treating `auto` as a model slug, and reporting success from a green build alone.

## Why it is designed this way

**No planning skills.** Cursor already ships plan mode, but the author goes further: he does not believe in planning, because the best spec is code. Work starts from a named data shape and a checkable outcome.

**Procedures plus real tooling.** Most enforcement is procedural, but the stack is not purely prose: orch, watch-pr, and the worktree audit are tested programs that make long-running coordination state auditable and race-resistant. Where a guarantee matters, there is a script or a gate.

**Multi-model by default.** Comparing independent attempts beats trusting one, and disagreement between models is treated as signal. Role-based routing keeps this configurable rather than hardcoded.

**Make it yours.** The author treats his own mode as an example, not a prescription. Automate-me derives a personal mode from how you actually work; setup-pstack makes models configurable; the README invites forking.

**External dependencies stay external.** The deslop skill and the control-cli/control-ui surface drivers ship in the separate `cursor-team-kit` plugin, and `/create-skill` plus `/babysit` are Cursor built-ins that pstack selectively supersedes. The plugin bundles only what is uniquely his.

## Relation to our adaptation

Our OpenCode port at `opencode/plugins/pstack/` keeps the transferable core: `poteto-mode`, the understanding and cleanup workflows, the communication skills, all twenty-one principles, and both subagents, renamed with `pstack-` prefixes except the mode itself. It drops what cannot transfer without an OpenCode-native redesign: model-role routing and multi-model panels, the Graphite and CI machinery in the shipping playbooks, the bundled Bun tooling, transcript mining, the benny automation pack, and the cursor-team-kit dependencies. The vision record in `skill-meta/mfz-home/skills/pstack/VISION.md` states the rule: skills are the product, and the plugin only registers packaged assets. For how the adapted plugin registers and loads them, see `opencode-v2-plugin-development.md` in this directory.
