---
name: orchestration
description: Reusable coordination procedures loaded by an explicitly selected orchestrate or orchestrate-chief workflow, or an explicitly assigned delegated orchestrator. Task complexity and capture alone do not select it.
user-invocable: false
slash: false
metadata:
  opencode/autoinvoke: false
---

# Orchestration

## Establish the selected role

Use only within the human-selected workflow or an explicit delegated coordination assignment. Reading these instructions to author or assess them does not activate the workflow.

| Role | Responsibility | Delegation |
| --- | --- | --- |
| `direct` | Human-facing thinking and delivery coordination at the effort root | Appropriate evidence and execution agents |
| `chief` | Human-facing high-level dialogue, decisions, and cross-workstream state | Orchestrators for outcomes; direct Scribe when supported |
| `delegated` | Integrated outcome within the assigned workstream and authority | Appropriate agents; record settled items directly where they land |

Before coordination, load `effort-context` for its effort rules, assigned maintenance, and storage. Human-facing roles attach the session to an effort before the first decision: the one the human named or approved, otherwise a new provisional effort, with a recommendation of what it should become. Delegated orchestrators work within their parent's efforts. Read [assignments](references/assignments-and-dependencies.md), [acceptance](references/acceptance-and-review.md), and the active harness reference: [OpenCode](references/harnesses/opencode.md) or [Claude Code](references/harnesses/claude-code.md).

- Chief reads [workstreams](references/chief-workstreams.md). It need not load producer execution procedures merely to ask for an outcome.
- Direct and delegated orchestrators read [routing](references/routing-and-roles.md), [execution](references/execution-and-delivery.md), and [child continuity](references/child-continuity.md) before dispatch.
- Human-facing roles read the shared [design collaboration method](../design-partner/references/collaboration.md) directly. This composes design partnership without invoking its human-only entry. Delegated orchestrators return decision-ready proposals to the parent unless design selection was delegated; they do not take over human dialogue.
- A producer's final message is its result. In OpenCode, Cairn also saves that result to a file for later sessions. The file holds the same text you already received, so it needs no second read. A brief states the information needed, not the form of the reply. Storage and design collaboration retain their separate owners.

## Authority and judgment

- Establish accepted direction and execution authority before implementation. A request to implement an accepted direction, or explicit delegation of design selection and delivery, authorizes proportionate necessary work without repeated approval of ordinary steps.
- Gather useful evidence proactively within the request and reuse sufficient current evidence. Find earlier material with `catalog_find` (by effort, session, category, or text); a knowledge article on the subject is the first material to read and to give a brief. Register PRs and published pages you create or rely on with `catalog_describe` and their URL. During exploration, recommend costly consultation or authoring before dispatch; authorized delivery can include necessary assistance and review.
- Agent selection, writable paths, background artifacts, and findings do not expand scope. Return consequential choices outside delegated authority with a recommendation and evidence.
- Carry scoped authorizations and waivers forward while goals, access, cost, risk, design commitments, and acceptance remain materially consistent. Keep commit, push, PR, merge, deployment, and separate-system updates within expressly authorized scope.
- Optimize total model-priced effort, including briefing, acceptance, and repair, while preserving quality and latency. Model configuration owns routine selection; honor explicit human choices. Context size alone does not establish waste.

## Human-facing work

- Retain reasoning, advice, and consequential decisions here. Delegate source-heavy investigation and execution according to the selected role. Directly read identified instruction, design, or prose artifacts whose wording is under judgment; delegate unknown-location discovery and implementation-source investigation, even for one code file.
- Read each result in full before acting on it, along with any learnings file Cairn names. Accept an investigation from the locators and excerpts its result cites. Send a gap, a contradiction, or a doubtful claim back to the same producer session as a focused follow-up; re-reading the investigated sources here repeats the investigation in the context delegation was meant to keep lean.
- Small settled instruction edits may remain here under authoring guidance. Use an authoring agent when its separate context benefits the authorized outcome; Chief routes such work through its orchestrator.
- Explain material findings, tradeoffs, blockers, and uncertainty using selected results. Routine maintenance needs no separate announcement.

## Transitions and completion

- Only the human selects or changes the human-facing role. Do not switch or recommend switching based on complexity, file capture, or a skill's presence in history.
- On an explicit exit, stop new dispatch under this workflow. Reconcile in-flight assignments and finish or transfer pending writes; keep authorized work's state and remaining obligations visible. Do not cancel or broaden active work implicitly.
- On an explicit role change, preserve evidence and authority, reconcile active ownership, and load the new role's procedures before new dispatch. State the latest selection or exit in the conversation; create no effort or record merely to record a mode.
- Previously loaded instructions apply only while their role remains selected. Reloading guidance after compaction does not re-enter a mode. Recover the latest selection, including exits, from retained context or current records; ask only when genuinely missing.
- Return when the outcome is complete or progress requires a decision, authority, or unavailable evidence. State established results, remaining work, exact mutation/publication state, and useful pointers. Distinguish producer completion, coordinator acceptance, independent review, and human acceptance.
