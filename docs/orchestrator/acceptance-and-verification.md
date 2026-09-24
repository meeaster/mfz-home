# Acceptance and verification

The [2026-09-22 redesign](redesign-2026-09-22.md#agent-vocabulary-authority-and-verification) supersedes earlier mandatory post-worker inspection and gateway assumptions below. This page preserves their rationale and evolution. The [current delivery contract](../../skills/active/orchestrator-mode/references/common/acceptance-and-review.md#verify-the-outcome) uses proportionate verification and distinguishes it from review.

Acceptance is the coordinator's judgment that the evidence supports the agreed outcome. Validation is the work that establishes that evidence. Independent inspection can improve confidence, but its value depends on what it adds beyond the producer's result.

## Current contract and historical baseline

At baseline `fec8a524`, Orchestrator Mode required a fresh read-only inspector after every worker mutation unit. Operators owned immediate verification, with independent inspection added when useful. The current [acceptance contract](../../skills/active/orchestrator-mode/SKILL.md#accept-and-return) and [mutation reference](../../skills/active/orchestrator-mode/references/orchestrator/execution-and-delivery.md) supersede that baseline.

The revised source contract replaces that unconditional worker gate with coordinator-owned, proportionate acceptance. Historical sessions must still be evaluated against their own loaded rules. Activation and behavioral observation are recorded separately from source implementation.

The earlier `chief/split` model had two acceptance layers: the gateway accepted producer packets and returned a checked envelope; the Chief accepted it by default. See the current [acceptance section](../../skills/active/orchestrator-mode/SKILL.md#accept-and-return) for the revised result and evidence contract.

## Completion evidence and validation ownership

For diagrams and HTML explanation pages, the author dispatches `inspect` for routine rendered validation, views selected final captures, interprets the findings, repairs confirmed defects, and requests focused rechecks. The inspector uses the shared browser workflow, normally Browser Control, and saves useful images under the effort's `screenshots/` directory. Selected evidence identifies the exact artifact revision, viewport, relevant state, and an accessible locator. The inspector checks capture completeness, scale, and obscuring browser overlays before returning the images. The author's final image review uses a small coverage-based selection rather than every screenshot or a fixed quota.

The author returns the artifact version, inspector session IDs, selected evidence, and remaining limits through its own handoff. The coordinator handles inspection dispatch only when nested delegation is unavailable and retains final acceptance. A targeted author browser check can resolve a disputed finding or guide a repair; viewing inspector captures does not require another routine browser pass. Reuse unaffected checks and scope rechecks to the affected behavior. Author continuity follows the soft freshness preference and hard non-resumption rule in [Ownership and delegation](ownership-and-delegation.md#freshness-and-continuity-have-different-benefits).

The implementation-owner guidance below applies to ordinary application work. Its completion requirements do not reassign the visual-artifact inspector's work to the author.

A coherent assignment includes its immediate validation and authorized immediate activation where that completes the same outcome. The worker reports what changed, what its checks establish, and what remains unresolved. Finishing the edits is not itself completion.

Validation should exercise the relevant user-facing boundary. Browser interaction can establish UI behavior; launching the executable can establish CLI behavior; a bounded live request can establish an external integration claim. An existing automated test may already exercise the required boundary. A build or internal-function test cannot establish behavior outside its coverage, and a live happy-path check does not replace deterministic failure coverage. Unavailable access or an unexercised environment remains an explicit acceptance limit.

The worker normally owns these checks and fixes defects it finds. Missing completion coverage usually returns to that worker. An inspector independently resolves a factual acceptance question when that independence adds value, or owns substantial bounded validation that benefits from fresh, focused context. This separation can be planned before implementation or chosen when the remaining work becomes clear. Supply intended behavior, current state, completed checks, remaining coverage, environment setup, and known limitations without replaying the implementation history. Findings return to the coordinator for acceptance or authorized repair. An operator owns a distinct authorized operation, such as deployment into another environment, and verifies that operation. Starting a local development server or invoking a CLI during implementation does not by itself justify a separate operator. The coordinator judges the resulting evidence rather than repeating the full interaction.

A useful handoff contains the material delta, validation and interpretation, relevant limits, and side effects the next action must account for. Exact commands and versions belong beside claims when they affect interpretation or reproduction. No fixed template or command diary is required.

For example, this result exposes an acceptance gap clearly:

> The installed executable passes on Node 26.8.2. Support for the declared Node 24 minimum remains unverified.

Listing several successful commands would not establish the missing minimum-runtime claim. A handoff's honesty about limits is more useful than its apparent completeness.

The same obligation applies when evidence changes during implementation. If a worker removes an unstable watch-level test and retains queue-level tests, the packet must say which boundary remains unverified. The coordinator decides whether that substitution satisfies the accepted contract. Passing totals and completed task checkboxes do not turn queue behavior into evidence for combined watch and output behavior.

## Trust applies to consequential claims

The coordinator judges whether the reported checks support the conclusion, cover the relevant boundary, and agree with other evidence. The cost of being wrong also matters. This is a focused acceptance judgment, not a new checklist that must be repeated in every prompt.

A failed check remains unresolved until repaired or accepted as an intentional exception by the authorized decision owner with supporting rationale. A passing summary cannot contradict the measurements. For example, no horizontal page overflow does not establish that SVG text fits its node. Findings identify the affected elements and meaningful extent of a failure rather than selecting the smallest violation. The author resolves conflicting visual evidence before the coordinator accepts the result.

A cheaper model does not automatically require inspection, and a stronger model does not establish correctness. A newer-runtime observation supports that runtime. Repeating it in subsequent notes cannot broaden it into proof of a declared minimum version.

## The smallest sufficient acceptance action

The acceptance model has alternatives rather than mandatory stages:

| Decision | Basis | Result |
| --- | --- | --- |
| Accept | The packet supports the outcome and no material uncertainty remains. | Continue without a separate inspection. |
| Clarify or corroborate | A narrow omission or questionable claim can be resolved directly. | Request a focused follow-up or make a bounded read-only corroboration within the coordinator's role. |
| Inspect independently | Independent factual confirmation adds assurance, or substantial remaining validation benefits from focused context. | Assign the unresolved acceptance question or bounded validation coverage to an inspector. |

A change's size informs this choice but does not decide it. Cross-component effects, contradictory evidence, unexpected mutations, or consequential outcomes can justify independent confirmation. Strong relevant validation can support acceptance without another agent. An explicit human request for inspection remains authoritative.

A missing explanation calls for clarification. A missing check calls for the relevant validation. A concrete defect calls for repair within authority. Unreliable evidence can call for independent confirmation. A design or authority question returns to its decision owner. These distinctions avoid turning every imperfect return into a full repair-and-inspection chain.

The human benefits from a brief explanation when that choice is consequential. For example: "The worker's checks cover normal results; independent inspection will address branch changes under blocked output." This explains why additional work is useful without narrating routine tools or exposing private reasoning. The [root skill](../../skills/active/orchestrator-mode/SKILL.md#think-with-the-human) owns this communication rule across orchestration decisions.

Report who established each conclusion. If an independent reviewer found an issue and the coordinator accepted a worker's repair, say so. Calling that outcome a passed rereview misstates the evidence and creates pressure for an unnecessary additional review.

## Independence does not require duplicate mechanisms

Substantive review is a separate, authorized challenge to correctness and maintainability. Retain thermo-nuclear review guidance when selecting the reviewer for known code work. Strict scrutiny can support inexpensive implementation without requiring review for every small change or inventing findings. The audited reviewer usefully reproduced a minimum-runtime defect after the current suite passed and verified an incorrect README installation claim. Its single aggregate rerun was defensible independent confirmation.

An inspector can examine a regression and execute it independently. A separate custom probe is useful when it addresses a named coverage gap. Repeating the same boundary through a second mechanism can add risk without useful confidence.

The Node CLI audit illustrated both sides. The first inspection found an installed-executable defect that source-level tests missed. A worker added a regression that failed before the repair. Later standalone installation probes duplicated that boundary and twice altered the project by mistake.

Independent verification earned its place; redundant package-install procedures did not. The improved route reused the regression and checked metadata integrity. Details and native evidence locators are available through the [review method's grounding case](session-review.md#grounding-case).

The same principle applies to test commands. Project guidance that names unit, integration, and aggregate commands does not necessarily require separate executions. If the aggregate invokes both lanes, it can establish both. A coordinator should preserve that equivalence in plans and briefs rather than introduce a cumulative command sequence. This works without editing project instructions. Focused red/green runs, later edits, missing coverage, and material independent confirmation can justify reruns; a change of owner alone does not.

For example, a cross-cutting brief can require the aggregate for final coverage and focused checks during development. A narrow repair can reuse prior results for unaffected behavior while checking its regression and applicable final gate. Select by behavior, dependencies, and environment, not changed filenames alone. Existing preparation may already identify the test boundaries; another explorer is useful only for a material gap.

Assess cumulative obligations across the brief, loaded skills, and acceptance stages. Explicit command lists can require redundant work even when each child follows instructions. When a controlling instruction genuinely requires separate stages, follow it or obtain an authorized, scoped exception before substitution. A child brief cannot silently waive it. Development Principles supplies engineering judgment; owning workflows and project policy supply execution requirements. The [mutation reference](../../skills/active/orchestrator-mode/references/common/acceptance-and-review.md#verify-the-outcome) owns the portable selection rule.

## Side effects are part of the result

An inspector's read-only assignment does not prove its commands had no effects. Unexpected changes must remain visible even when writing a final note was interrupted. Ignored files and installed dependencies can survive while Git status appears unchanged.

The acceptance result must account for known side effects or explicitly preserve the unresolved state. Recovery reconciles those effects before another operation repeats. A fresh agent offers a new context, not a clean environment.

An ignored self-installed application copy is more specific than a generic dependency-directory caveat and may affect later executable behavior. Preserve that distinction when observed, without assuming cleanup authority. Likewise, discovery of untracked source requires any checkout decision mandated by the applicable workspace instructions before editing; promising to preserve the files does not substitute for the decision.

## Adoption and evaluation

The root acceptance rule, mutation reference, child contracts, and authoring scenarios now express this direction. Strict-review routing and built-in agent prompt bodies are retained.

The desired result is fewer redundant reads and executions without losing useful independent findings. Subsequent ordinary sessions can show whether worker packets support sound acceptance and whether omitted inspections leave consequential gaps. A synthetic suite is not required merely to adopt the design, and static consistency does not prove behavioral improvement.

During ordinary use, assess whether evidence supports acceptance, retained learnings reach successors, and extra checks answer a missing question. Record consequential failures or useful counterexamples rather than adding automatic monitoring or new files to every effort. New session evidence is needed before claiming improvement.
