# Vision

## Problem

Some questions about durable agent sessions require more than factual archaeology. Assessing whether a session followed human intent, judging quality or efficiency, explaining behavioral patterns, and recommending workflow changes require stronger evaluative reasoning. Routing every session lookup through that analytical lane wastes capability and blurs facts with judgment.

## Intended Behavior

`session-analyst` is a native OpenCode subagent for evaluative reasoning about prior-session quality, intent adherence, behavior, efficiency, patterns, and recommendations. Ordinary sessions select it only when the requested outcome requires that judgment. Factual lookup, metadata, cost, chronology, comparison, and reconstruction belong to `inspect`. The caller supplies the bounded evaluative question, relevant evidence or session identities, accepted human context, privacy constraints, and expected result.

The agent always loads `agent-sessions`, which owns modes, coverage, harness adapters, privacy, evidence locators, and completion. It starts from supplied Inspect evidence when sufficient and may retrieve focused raw records when analysis exposes a gap. The agent prompt supplies only the specialist role, read-only evidence boundary, fact-versus-interpretation discipline, and handoff shape. Permissions deny edits outside the orchestration-workspace root and deny delegation while allowing adaptive read-only retrieval. This is a trusted analytical role, not a shell sandbox.

The human authorized direct production of explicitly assigned notes under `/tmp/opencode/orchestrator-workspaces/`. The parent requires the exact `orchestrator-task-evidence` skill, which owns note production and reuse. Permission or skill loading alone authorizes no file. Ordinary session analysis remains file-free, and session stores, project files, publication, and durable artifact lifecycles remain outside this exception. Shared-root capability does not enforce per-producer ownership; the brief supplies that boundary.

Sol/medium is the accepted model policy because the role is reserved for consequential evaluative reasoning. Luna/high remains the cost-oriented factual archaeology model through `inspect`.

## Success

Parents can delegate a self-contained evaluative session question and receive a compact judgment grounded in observed facts, accepted human direction, native locators, and explicit gaps without loading large traces into the parent. Factual retrieval remains available through Inspect, while focused missing evidence does not force another handoff when direct retrieval is more efficient.

## Non-Goals

- Replacing `explore` for codebase discovery or `research` for external documentation.
- Editing, deleting, migrating, repairing, vacuuming, or compacting session stores.
- Owning Session Briefs, captures, handoffs, threads, or other artifact lifecycles.
- Recursively delegating work or choosing product and implementation decisions for the parent.
- Using Session Analyst for metadata, cost, chronology, reconstruction, or other factual questions that Inspect can answer without evaluative judgment.
