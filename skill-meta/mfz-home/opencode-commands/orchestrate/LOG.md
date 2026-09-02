# Log

## 2026-09-01 - Initial design

- Added an explicit orchestration mode that pins the coordinator model family to Sol and keeps implementation out of the primary session.
- Routed work by stable agent role rather than naming model families in task briefs.
- Made coordinator verification the default acceptance path and reserved independent Sol review for consequential or hard-to-verify work.
- Required self-contained fresh-child briefs through the existing context-transfer contract.
- Kept the command ephemeral and separate from OpenSpec or other durable workflow state.

## 2026-09-01 - User-controlled model and expensive lanes

- Removed the command model override so orchestration uses whichever model and reasoning effort the user selected for the primary session.
- Allowed read-only `explore`, `research`, and `triage` work to fan out without separate approval.
- Required explicit user authority before every `worker` or `reviewer` dispatch because workers mutate state and reviewers consume an expensive model lane.
- Removed automatic review after worker output; coordinator verification remains the default.

## 2026-09-01 - Current-state inspection and planning artifacts

- Added `inspect` for read-only current state in cloud accounts, deployed environments, runtime systems, and work systems.
- Kept broad file and system evidence gathering in `explore`, `research`, `inspect`, and `triage` so the primary session can focus on conversation and design.
- Allowed the primary to record an accepted design in an explicitly requested OpenSpec or other planning artifact through its owning workflow.
- Kept application, infrastructure, and operational mutations behind an explicitly authorized worker.

## 2026-09-01 - Shared working model and decision packets

- Made the primary session an opinionated collaboration and design partner that challenges assumptions, weighs options, recommends, and states what evidence would change its view.
- Defined the primary session as the effort's shared working model across fresh child contexts.
- Required generous child briefs carrying all accumulated context that could change interpretation or judgment, while preserving the distinction between facts, inference, hypotheses, preferences, and accepted decisions.
- Required compact decision packets back from source-gathering children so raw discovery does not consume the primary context.
- Limited direct source inspection and repeated investigations to focused adjudication, consequential verification, and acceptance checks.

## 2026-09-01 - Operational mutation routing

- Kept agent roles based on purpose and authority rather than adding destination-specific GitHub, Atlassian, Datadog, or deployment agents.
- Routed current-state reads to `inspect`, reported-failure diagnosis to `triage`, and authorized state changes to `worker` using the owning domain skill or workflow.
- Made mutation authority outcome-scoped: commit, push, pull request, merge, publication, deployment, and cross-system updates remain distinct unless one requested transaction inherently requires an operation.
- Preferred separate bounded workers for independent systems so one authorization does not silently expand into another.

## 2026-09-01 - Continuity-aware child reuse

- Made the coordinator responsible for a compact roster of child sessions, prior objectives, explored areas, reusable retained context, and limitations.
- Required source-gathering decision packets to end with continuity metadata so later routing does not require loading full child transcripts.
- Preferred resuming a relevant child when scope and evidence overlap materially, passing only the new objective and context delta.
- Kept fresh children for independent evidence, changed role or authority, materially different scope, stale context, overloaded sessions, or bias risk.
- Treated provider prompt-cache savings as opportunistic rather than guaranteed; useful retained session context is the routing criterion.
