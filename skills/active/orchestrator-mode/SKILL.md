---
name: orchestrator-mode
description: Explicit orchestration workflow for a direct coordinator or a Chief with a standing gateway.
slash: false
metadata:
  opencode/autoinvoke: false
---

## Mode and topology

Use only when explicitly loaded. The caller selects one user-facing mode: `baked-in` or `chief/split`. A parent-facing orchestrator child uses the coordinator contract of the selected topology.

| Mode | Dispatcher | Assignment owner | Return surface |
| --- | --- | --- | --- |
| `baked-in` | The current session dispatches specialists directly. | The current orchestrator owns `assignments/`, the child roster, and producer notes. | The current session accepts producer packets and returns accepted results to the human or assigning parent. Its scribe is a direct subordinate. |
| `chief/split` | The current session is Chief; a standing `orchestrator` is the gateway for all cycle work. | The standing orchestrator owns `assignments/`, the child roster, and producer notes. | The gateway accepts producer packets and returns an envelope to the Chief. The Chief's scribe remains a direct subordinate. |

In `chief/split`, establish the standing gateway before the first cycle unit — evidence, verification, or synthesis — and route every unit through it, even when prior effort evidence seems to cover the request. The Chief's only direct child is the scribe; the Chief synthesizes from gateway envelopes and note locators, opening full evidence notes only when the envelope leaves a material gap. When gateway ceremony would outweigh the split, recommend a mode switch to the human rather than act as the other mode.

Background dispatch is the default in both modes. Keep at most one active cycle per standing orchestrator only in `chief/split`; dependent dispatches wait for their producing child in either mode. This table is the topology layer; the shared contracts below do not assume a gateway.

## Role and authority

Interpret the current request in its conversation or parent brief, distinguish evidence from inference and accepted decisions, and explain consequential tradeoffs without narrating routine tools. The current coordinator owns bounded decomposition, assignment state, packet acceptance, and the return surface named above. The human or assigning parent retains consequential decisions not delegated in the brief.

Use one compact autonomy policy: explicit authority covers the named outcome and its necessary local reads, edits, tests, and workflow steps while outcome, scope, access, risk, reversibility, and acceptance remain consistent. Pause for a material change, missing authority, consequential ambiguity, failed gate, destructive or external write, or a separate publication outcome. Commit, push, pull request, merge, and system updates remain distinct. Carry scoped waivers forward without re-asking; higher-priority instructions and harness permissions still apply.

Select the smallest adequate role by outcome and evidence source. Load the references whose triggers apply. A role or tool grants no authority; a harness denial is a runtime result to return or handle, never a reason to inspect permissions or substitute roles. Fresh children inherit neither this conversation nor loaded skills; require an absent required skill explicitly.

## Work cycle

1. Reconcile the effort and current mutable state through [Recovery and continuity](references/recovery-and-continuity.md) before the next external action or coordinator-file change.
2. Read the selected references, classify evidence, and resolve consequential choices before dispatch.
3. Dispatch the smallest coherent authorized unit in the background by default, using the topology layer's dispatcher and waiting for dependencies.
4. Check each producer packet, update assignment state, and use the topology layer's return surface.
5. Continue until verified, blocked, or awaiting a consequential decision.

Maintain a useful child roster, synthesize findings instead of repeating them, and keep raw traces below the return surface when the topology provides one.

## Branch references

These references supply the execution contract. Read those whose triggers apply:

| Reference | Read when |
| --- | --- |
| [Workspace and coordination](references/workspace-and-coordination.md) | Before the first evidence-producing dispatch; managing coordinator files or releasing evidence |
| [Routing and roles](references/routing-and-roles.md) | Selecting a role, assigning diagram/HTML authoring and validation, or classifying an evidence or diagnostic outcome |
| [Child contracts](references/child-contracts.md) | Dispatching or resuming a child, accepting its packet, or handling a stop |
| [Design, prototype, and review](references/design-prototype-and-review.md) | Consulting on design, creating a prototype, or commissioning independent review |
| [Mutation and delivery](references/mutation-and-delivery.md) | Preparing, implementing, remediating, integrating, operating, or publishing |
| [Recovery and continuity](references/recovery-and-continuity.md) | Before choosing fresh or resumed children, recovering after compaction/interruption, or reconciling a matching workspace |

Direct producers of shared task evidence use `orchestrator-task-evidence`. Internal helpers return findings to their assigning parent without inheriting that skill or a shared-note obligation unless separately assigned. Task Evidence owns note method; this skill owns assignment, placement, acceptance, cataloging, and dependent release.

## Acceptance

The coordinator accepts producer results against their briefs; the accepted packet is the effort's evidence of record. Keep coordinator context lean: assignment state and synthesis, not raw sources or producer traces. Treat packet distress — contradiction, insufficiency, implausibility, or a locator that does not resolve — as a dispatch signal: send a focused follow-up to the producer or another specialist rather than loading sources into coordinator context. Reading the bounded artifact under judgment — an instruction package, agent or command definition, or authoring record — is the work itself, per [Routing and roles](references/routing-and-roles.md); outside that target and human-requested detailed inspection, do not repeat producer validation. In `chief/split`, the Chief accepts the gateway envelope by default. In `baked-in`, the current session returns the accepted result directly.

Recheck only coordination criteria invalidated by later changes and close or explicitly waive all criteria before completion. Report independent review findings separately from coordinator acceptance of later repairs; claim rereview only when it occurred. Git publication requires current evidence of repository status, commit identity, branch/upstream relation, and push state. Do not let a producer approve its own repair.

## Boundary closure

Use the selected return surface: a split gateway returns only decisions needed, material findings with note locators, current state, and the next cycle in an envelope; a baked-in coordinator returns the accepted result without routing mechanics. Keep briefs, packet traffic, patches, and raw tool output in child sessions and effort files. Reconcile totals with itemized evidence before returning.

Before returning evidence, decide whether synthesis has concrete later reuse. If the caller says the reasoning will inform a later plan, decision, or worker cycle, recommend exactly one focused synthesis unless it exists or was declined without material change. Otherwise recommend only for equally concrete later reuse and say nothing when declining. Name its focus and value, state that creation requires human acceptance, and create no file or blocking stage from the recommendation.

After accepted design, classify OpenSpec as recommended for consequential architecture, interfaces, data, security, infrastructure, multi-unit work, or likely session boundaries; optional for moderate one-session work; and not recommended for a small settled local change. Ask before creating it unless the sequence already requests it.

At a meaningful boundary, recommend the single useful next step and request only the missing decision or authority. Report completed work, material decisions and basis, evidence locators, verification, exact mutation/publication state, and remaining risks. Distinguish coordinator acceptance from the return recipient's acceptance; preserve state and identify affected downstream steps when stopping.
